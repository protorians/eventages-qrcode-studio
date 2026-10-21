//! Extraction du design d'un QR décodé : à partir de la matrice de modules
//! fournie par rqrr et de l'image couleur d'origine, déduit les réglages
//! visuels du code (couleurs des modules et du fond, dégradé, forme des
//! angles et de l'œil, style des points, logo centré, cadre).
//!
//! Tout est déduit de l'image telle que l'utilisateur la voit : le code peut
//! avoir été produit par n'importe quel générateur, la conversion restitue ce
//! qui est visible plutôt que ce qui a été demandé au générateur. Les
//! classifications incertaines renvoient `None` : l'interface conserve
//! alors ses valeurs par défaut. Déterministe et entièrement local.

use base64::Engine as _;
use image::{DynamicImage, RgbaImage};
use serde::Serialize;

/// Bits de la matrice d'un QR décodé, avec la correspondance
/// coordonnées-module → pixels de l'image.
pub struct GridData {
    /// Nombre de modules par côté.
    pub size: usize,
    /// `bits[y * size + x]` : module (colonne x, ligne y) sombre.
    pub bits: Vec<bool>,
    /// Coins [haut-gauche, haut-droit, bas-droit, bas-gauche] en pixels,
    /// correspondant aux coordonnées logiques (0,0), (S,0), (S,S), (0,S)
    /// avec S = size + 1 (voir `rqrr::PreparedImage::detect_grids`).
    pub bounds: [[f64; 2]; 4],
}

/// Design reconstruit d'un code importé. Chaque champ est un indice : `None`
/// signifie « non détecté avec assez de confiance ».
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedDesign {
    /// Couleur médiane des modules sombres.
    pub dot_color: Option<String>,
    /// Borne de départ du dégradé détecté (bas du sens de variation).
    pub gradient_from: Option<String>,
    /// Borne d'arrivée du dégradé.
    pub gradient_to: Option<String>,
    /// Angle du dégradé en degrés (0 = horizontal, 90 = vertical).
    pub gradient_rotation: Option<i32>,
    /// Couleur du fond (modules clairs, composite sur blanc).
    pub background: Option<String>,
    /// Fond transparent détecté (alpha moyen < 250 en zone claire).
    pub transparent_background: Option<bool>,
    /// Couleur du contour des angles, si distincte du corps.
    pub corner_square_color: Option<String>,
    /// Couleur de l'œil central, si distincte du corps.
    pub corner_dot_color: Option<String>,
    /// Style du contour d'angle détecté (« square », « rounded »…).
    pub corner_square_type: Option<String>,
    /// Style de l'œil central détecté (« square » ou « dot »).
    pub corner_dot_type: Option<String>,
    /// Style des modules détecté (« square », « rounded », « dots », « classy »).
    pub dots_type: Option<String>,
    /// Logo détecté au centre, recadré et encodé PNG (base64, sans préfixe).
    pub logo_png_base64: Option<String>,
    /// Largeur relative du logo (bloc détecté / modules du code).
    pub logo_size: Option<f64>,
    /// Couleur du cadre détecté autour du code.
    pub frame_color: Option<String>,
    /// Cadre de la bibliothèque le plus proche du cadre détecté.
    pub frame_id: Option<String>,
}

impl ImportedDesign {
    /// Indice minimal : couleurs du code, sans analyse de matrice (repli
    /// multi-formats : codes-barres 1D, QR décodés sans grille).
    pub fn colors_only(dot_color: Option<String>, background: Option<String>) -> Self {
        ImportedDesign {
            dot_color,
            gradient_from: None,
            gradient_to: None,
            gradient_rotation: None,
            background,
            transparent_background: None,
            corner_square_color: None,
            corner_dot_color: None,
            corner_square_type: None,
            corner_dot_type: None,
            dots_type: None,
            logo_png_base64: None,
            logo_size: None,
            frame_color: None,
            frame_id: None,
        }
    }
}

// ---------------------------------------------------------------------------
// Homographie : coordonnées-modules → pixels
// ---------------------------------------------------------------------------

/// Projection perspective 3×3 déterminée par 4 correspondances.
struct Homography {
    m: [f64; 9],
}

impl Homography {
    /// Résout la projection depuis 4 correspondances (DLT 8 inconnues,
    /// élimination de Gauss avec pivot partiel). `None` si dégénérée.
    fn from_correspondences(src: [[f64; 2]; 4], dst: [[f64; 2]; 4]) -> Option<Self> {
        let mut a = [[0.0f64; 8]; 8];
        let mut b = [0.0f64; 8];
        for (i, (source, target)) in src.iter().zip(dst.iter()).enumerate() {
            let [sx, sy] = *source;
            let [dx, dy] = *target;
            let row = 2 * i;
            a[row] = [sx, sy, 1.0, 0.0, 0.0, 0.0, -dx * sx, -dx * sy];
            b[row] = dx;
            a[row + 1] = [0.0, 0.0, 0.0, sx, sy, 1.0, -dy * sx, -dy * sy];
            b[row + 1] = dy;
        }
        let h = solve_linear(&mut a, &mut b)?;
        Some(Homography {
            m: [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1.0],
        })
    }

    /// Projette un point logique sur l'image.
    fn map(&self, x: f64, y: f64) -> [f64; 2] {
        let m = &self.m;
        let w = m[6] * x + m[7] * y + m[8];
        if w.abs() < 1e-9 {
            return [f64::NAN, f64::NAN];
        }
        [
            (m[0] * x + m[1] * y + m[2]) / w,
            (m[3] * x + m[4] * y + m[5]) / w,
        ]
    }

    /// Construit la projection de l'espace-modules : les coins de rqrr
    /// répondent aux coordonnées logiques (0,0), (S,0), (S,S), (0,S).
    fn from_grid(grid: &GridData) -> Option<Self> {
        let s = grid.size as f64 + 1.0;
        Homography::from_correspondences(
            [[0.0, 0.0], [s, 0.0], [s, s], [0.0, s]],
            grid.bounds,
        )
    }
}

/// Élimination de Gauss sur un système carré 8×8 ; `None` si non inversible.
fn solve_linear(a: &mut [[f64; 8]; 8], b: &mut [f64; 8]) -> Option<[f64; 8]> {
    let n = 8;
    for col in 0..n {
        let pivot = (col..n).fold(col, |best, row| {
            if a[row][col].abs() > a[best][col].abs() {
                row
            } else {
                best
            }
        });
        if a[pivot][col].abs() < 1e-12 {
            return None;
        }
        a.swap(col, pivot);
        b.swap(col, pivot);
        let factor = a[col][col];
        for row in 0..n {
            if row == col {
                continue;
            }
            let ratio = a[row][col] / factor;
            if ratio != 0.0 {
                for k in col..n {
                    a[row][k] -= ratio * a[col][k];
                }
                b[row] -= ratio * b[col];
            }
        }
    }
    let mut h = [0.0; 8];
    for (i, slot) in h.iter_mut().enumerate() {
        *slot = b[i] / a[i][i];
    }
    Some(h)
}

// ---------------------------------------------------------------------------
// Échantillonnage de l'image
// ---------------------------------------------------------------------------

/// Couleur composite sur blanc d'un pixel (canal 0-255), niveau d'alpha [0, 1].
fn over_white(rgba: [u8; 4]) -> ([f64; 3], f64) {
    let alpha = rgba[3] as f64 / 255.0;
    let blend = |channel: u8| channel as f64 * alpha + 255.0 * (1.0 - alpha);
    (
        [blend(rgba[0]), blend(rgba[1]), blend(rgba[2])],
        alpha,
    )
}

/// Échantillonne l'image en coordonnées-modules (bilinear, borné).
struct Sampler<'a> {
    rgba: &'a RgbaImage,
    h: Homography,
    /// Facteur appliqué aux pixels projetés (repli décodé sur agrandissement).
    rescale: f64,
}

impl Sampler<'_> {
    fn sample(&self, u: f64, v: f64) -> ([f64; 3], f64) {
        let [px, py] = self.h.map(u, v);
        let [px, py] = [px * self.rescale, py * self.rescale];
        if !px.is_finite() || !py.is_finite() {
            return ([255.0, 255.0, 255.0], 0.0);
        }
        let (w, hh) = (self.rgba.width() as f64, self.rgba.height() as f64);
        if px < -0.5 || py < -0.5 || px > w - 0.5 || py > hh - 0.5 {
            // Hors de l'image : signalé transparent (couleur neutre).
            return ([255.0, 255.0, 255.0], 0.0);
        }
        let (x0, y0) = (px.floor().max(0.0) as u32, py.floor().max(0.0) as u32);
        let (x1, y1) = ((x0 + 1).min(self.rgba.width() - 1), (y0 + 1).min(self.rgba.height() - 1));
        let (fx, fy) = (px - x0 as f64, py - y0 as f64);
        let pick = |x: u32, y: u32| self.rgba.get_pixel(x, y).0;
        let mut out = [0.0f64; 4];
        for c in 0..4 {
            let p00 = pick(x0, y0)[c] as f64;
            let p10 = pick(x1, y0)[c] as f64;
            let p01 = pick(x0, y1)[c] as f64;
            let p11 = pick(x1, y1)[c] as f64;
            out[c] = p00 * (1.0 - fx) * (1.0 - fy)
                + p10 * fx * (1.0 - fy)
                + p01 * (1.0 - fx) * fy
                + p11 * fx * fy;
        }
        let alpha = out[3] / 255.0;
        let blend = |channel: f64| channel * alpha + 255.0 * (1.0 - alpha);
        ([blend(out[0]), blend(out[1]), blend(out[2])], alpha)
    }

    /// Couleur d'un module : médiane des canaux sur son cœur.
    fn module_color(&self, x: usize, y: usize) -> ([f64; 3], f64) {
        let mut samples = [[0.0f64; 3]; 9];
        let mut alphas = [0.0f64; 9];
        let mut index = 0;
        for (i, du) in [0.25, 0.5, 0.75].iter().enumerate() {
            for (j, dv) in [0.25, 0.5, 0.75].iter().enumerate() {
                let (color, alpha) = self.sample(x as f64 + du, y as f64 + dv);
                // i/j inutilisés : l'ordre d'insertion n'importe pas.
                let _ = (i, j);
                samples[index] = color;
                alphas[index] = alpha;
                index += 1;
            }
        }
        (median_color(&samples), median_of(&alphas))
    }

    /// Taux de couverture d'encre d'une cellule-module (4×4 échantillons).
    fn cell_coverage(
        &self,
        x: usize,
        y: usize,
        ink: [f64; 3],
        bg: [f64; 3],
    ) -> f64 {
        let mut covered = 0;
        for du in [0.125, 0.375, 0.625, 0.875] {
            for dv in [0.125, 0.375, 0.625, 0.875] {
                let (color, _) = self.sample(x as f64 + du, y as f64 + dv);
                if dist(color, ink) < dist(color, bg) {
                    covered += 1;
                }
            }
        }
        covered as f64 / 16.0
    }
}

fn dist(a: [f64; 3], b: [f64; 3]) -> f64 {
    ((a[0] - b[0]).powi(2) + (a[1] - b[1]).powi(2) + (a[2] - b[2]).powi(2)).sqrt()
}

/// Médiane par canal d'un lot de couleurs.
fn median_color(samples: &[[f64; 3]; 9]) -> [f64; 3] {
    let mut per = [[0.0f64; 9]; 3];
    for (i, sample) in samples.iter().enumerate() {
        per[0][i] = sample[0];
        per[1][i] = sample[1];
        per[2][i] = sample[2];
    }
    [
        median_of(&per[0]),
        median_of(&per[1]),
        median_of(&per[2]),
    ]
}

fn median_of(values: &[f64]) -> f64 {
    let mut sorted: Vec<f64> = values.to_vec();
    sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    if sorted.is_empty() {
        return 0.0;
    }
    sorted[sorted.len() / 2]
}

fn to_hex(color: [f64; 3]) -> String {
    let clamp = |c: f64| c.round().clamp(0.0, 255.0) as u8;
    format!("#{:02X}{:02X}{:02X}", clamp(color[0]), clamp(color[1]), clamp(color[2]))
}

// ---------------------------------------------------------------------------
// Analyse
// ---------------------------------------------------------------------------

/// Extrait les indices de design d'un QR décodé depuis son image couleur.
/// `rescale` convertit les pixels de la grille vers ceux de `rgba` (le
/// décodeur peut avoir agrandi une petite image avant de la lire).
pub fn extract(
    rgba: &RgbaImage,
    grid: &GridData,
    rescale: f64,
) -> Option<ImportedDesign> {
    let size = grid.size;
    if size < 21 || grid.bits.len() != size * size {
        return None;
    }
    let h = Homography::from_grid(grid)?;
    let sampler = Sampler {
        rgba,
        h,
        rescale,
    };

    // Une couleur fiable exige des modules d'au moins ~1,5 px de côté.
    let [ax, ay] = sampler.h.map(0.0, 0.0);
    let [bx, by] = sampler.h.map(1.0, 0.0);
    let module_px = ((bx - ax).powi(2) + (by - ay).powi(2)).sqrt() * rescale;
    if module_px < 1.5 {
        return None;
    }

    let bit = |x: usize, y: usize| grid.bits[y * size + x];
    let finders = [(0usize, 0usize), (size - 7, 0), (0, size - 7)];

    // --- Passe 1 : couleur de chaque module, références sombre/clair ---
    let mut colors = vec![[0.0f64; 3]; size * size];
    let mut alphas = vec![1.0f64; size * size];
    let mut inks: Vec<[f64; 3]> = Vec::new();
    let mut bgs: Vec<[f64; 3]> = Vec::new();
    for y in 0..size {
        for x in 0..size {
            let (color, alpha) = sampler.module_color(x, y);
            colors[y * size + x] = color;
            alphas[y * size + x] = alpha;
            if bit(x, y) {
                inks.push(color);
            } else {
                bgs.push(color);
            }
        }
    }
    if inks.len() < 16 || bgs.len() < 16 {
        return None;
    }
    let mut ink = median_all(&inks);
    let mut bg = median_all(&bgs);
    if dist(ink, bg) < 30.0 {
        // Contraste insuffisant : analyse trop instable, aucun indice.
        return None;
    }

    // --- Passe 2 : classification (0 encre, 1 fond, 2 autre = logo) ---
    const OTHER_MIN: f64 = 55.0;
    let mut kinds = vec![0u8; size * size];
    for i in 0..size * size {
        let (d_ink, d_bg) = (dist(colors[i], ink), dist(colors[i], bg));
        kinds[i] = if d_ink > OTHER_MIN && d_bg > OTHER_MIN {
            2
        } else if d_ink < d_bg {
            0
        } else {
            1
        };
    }

    // Couleurs affinées : encre du corps hors angles, fond opaque.
    let mut body_inks: Vec<[f64; 3]> = Vec::new();
    let mut bg_opaque: Vec<[f64; 3]> = Vec::new();
    let mut bg_alpha = 0.0f64;
    for y in 0..size {
        for x in 0..size {
            let i = y * size + x;
            match kinds[i] {
                0 if !in_finder(x, y, size) => body_inks.push(colors[i]),
                1 => {
                    if alphas[i] > 0.6 {
                        bg_opaque.push(colors[i]);
                    }
                    bg_alpha += alphas[i];
                }
                _ => {}
            }
        }
    }
    if body_inks.len() >= 16 {
        ink = median_all(&body_inks);
    }
    if bg_opaque.len() >= 16 {
        bg = median_all(&bg_opaque);
    }
    let bg_count = kinds.iter().filter(|kind| **kind == 1).count() as f64;
    let transparent_background = if bg_count > 16.0 && bg_alpha / bg_count < 0.98 {
        Some(true)
    } else {
        None
    };

    // --- Logo central, style des modules, angles, dégradé, cadre ---
    let logo = detect_logo(size, &kinds);
    let dots_type = body_dots_type(&sampler, size, &bit, ink, bg, logo);
    let (corner_square_type, corner_dot_type) = corner_types(&sampler, &finders, ink, bg);
    let corner_square_color = cell_color(&sampler, &finders, false);
    let corner_dot_color = cell_color(&sampler, &finders, true);
    let gradient = gradient_fit(size, &kinds, &colors, logo.as_ref());
    let frame = detect_frame(&sampler, size, bg);

    Some(ImportedDesign {
        dot_color: Some(to_hex(ink)),
        gradient_from: gradient.as_ref().map(|(from, _, _)| to_hex(*from)),
        gradient_to: gradient.as_ref().map(|(_, to, _)| to_hex(*to)),
        gradient_rotation: gradient.as_ref().map(|(_, _, angle)| *angle),
        background: Some(to_hex(bg)),
        transparent_background,
        corner_square_color: corner_square_color.map(to_hex),
        corner_dot_color: corner_dot_color.map(to_hex),
        corner_square_type,
        corner_dot_type,
        dots_type,
        logo_png_base64: logo
            .as_ref()
            .map(|bbox| logo_png(rgba, grid, rescale, bbox)),
        logo_size: logo.map(|bbox| logo_size(bbox, size)),
        frame_color: frame.as_ref().map(|(color, _)| to_hex(*color)),
        frame_id: frame.map(|(_, id)| id.to_string()),
    })
}

/// Vrai si le module appartient à l'un des trois motifs d'angle (7×7).
fn in_finder(x: usize, y: usize, size: usize) -> bool {
    let corners = [(0usize, 0usize), (size - 7, 0), (0, size - 7)];
    corners
        .iter()
        .any(|&(fx, fy)| x >= fx && x < fx + 7 && y >= fy && y < fy + 7)
}

/// Positions (x, y) des cellules d'un motif d'angle : l'anneau extérieur
/// (`eye = false`, 24 cellules) ou le cœur 3×3 (`eye = true`, 9 cellules).
fn finder_cells(fx: usize, fy: usize, eye: bool) -> Vec<(usize, usize)> {
    let mut cells = Vec::new();
    for dy in 0..7 {
        for dx in 0..7 {
            let on_ring = dy == 0 || dy == 6 || dx == 0 || dx == 6;
            let in_eye = (2..5).contains(&dx) && (2..5).contains(&dy);
            if (eye && in_eye) || (!eye && on_ring) {
                cells.push((fx + dx, fy + dy));
            }
        }
    }
    cells
}

/// Détecte un bloc central « ni encre ni fond » : bbox module (incluse).
fn detect_logo(size: usize, kinds: &[u8]) -> Option<(usize, usize, usize, usize)> {
    let (z0, z1) = (size / 4, size * 3 / 4);
    let mut min = (usize::MAX, usize::MAX);
    let mut max = (0usize, 0usize);
    let mut count = 0usize;
    for y in z0..z1.min(size) {
        for x in z0..z1.min(size) {
            if kinds[y * size + x] == 2 {
                count += 1;
                min.0 = min.0.min(x);
                min.1 = min.1.min(y);
                max.0 = max.0.max(x);
                max.1 = max.1.max(y);
            }
        }
    }
    if count == 0 || min.0 == usize::MAX {
        return None;
    }
    let (width, height) = (max.0 - min.0 + 1, max.1 - min.1 + 1);
    // Une poignée de modules au moins, et un bloc centré (les logos le sont).
    if count < 8 || width.min(height) < 3 {
        return None;
    }
    let center = (
        (min.0 + max.0) as f64 / 2.0,
        (min.1 + max.1) as f64 / 2.0,
    );
    if (center.0 - size as f64 / 2.0).abs() > size as f64 / 4.0
        || (center.1 - size as f64 / 2.0).abs() > size as f64 / 4.0
    {
        return None;
    }
    // Marge d'un module autour du bloc (l'anneau clair qui l'entoure).
    Some((
        min.0.saturating_sub(1).max(1),
        min.1.saturating_sub(1).max(1),
        (max.0 + 1).min(size - 2),
        (max.1 + 1).min(size - 2),
    ))
}

/// Largeur relative du logo (bloc détecté / modules du code).
fn logo_size(bbox: (usize, usize, usize, usize), size: usize) -> f64 {
    let width = (bbox.2 - bbox.0 + 1) as f64 / size as f64;
    let height = (bbox.3 - bbox.1 + 1) as f64 / size as f64;
    width.max(height).clamp(0.15, 0.44)
}

/// Recadre le logo depuis l'image d'origine (alpha préservé), en PNG base64.
fn logo_png(
    rgba: &RgbaImage,
    grid: &GridData,
    rescale: f64,
    bbox: &(usize, usize, usize, usize),
) -> String {
    let Some(projection) = Homography::from_grid(grid) else {
        return String::new();
    };
    let corners = [
        projection.map(bbox.0 as f64, bbox.1 as f64),
        projection.map(bbox.2 as f64 + 1.0, bbox.1 as f64),
        projection.map(bbox.2 as f64 + 1.0, bbox.3 as f64 + 1.0),
        projection.map(bbox.0 as f64, bbox.3 as f64 + 1.0),
    ];
    let (mut x0, mut y0, mut x1, mut y1) = (f64::MAX, f64::MAX, f64::MIN, f64::MIN);
    for [px, py] in corners {
        let (px, py) = (px * rescale, py * rescale);
        if !px.is_finite() || !py.is_finite() {
            return String::new();
        }
        x0 = x0.min(px);
        y0 = y0.min(py);
        x1 = x1.max(px);
        y1 = y1.max(py);
    }
    let (width, height) = (rgba.width() as i64, rgba.height() as i64);
    let ix0 = x0.floor().max(0.0) as i64;
    let iy0 = y0.floor().max(0.0) as i64;
    let ix1 = x1.ceil().min(width as f64) as i64;
    let iy1 = y1.ceil().min(height as f64) as i64;
    if ix1 - ix0 < 2 || iy1 - iy0 < 2 {
        return String::new();
    }
    let cropped = image::imageops::crop_imm(
        rgba,
        ix0 as u32,
        iy0 as u32,
        (ix1 - ix0) as u32,
        (iy1 - iy0) as u32,
    )
    .to_image();
    let scaled = if cropped.width().max(cropped.height()) > 320 {
        let scale = 320.0 / cropped.width().max(cropped.height()) as f64;
        let new_width = ((cropped.width() as f64 * scale).round() as u32).max(1);
        let new_height = ((cropped.height() as f64 * scale).round() as u32).max(1);
        image::imageops::resize(&cropped, new_width, new_height, image::imageops::FilterType::Triangle)
    } else {
        cropped
    };
    let mut buffer = std::io::Cursor::new(Vec::new());
    if DynamicImage::ImageRgba8(scaled)
        .write_to(&mut buffer, image::ImageFormat::Png)
        .is_err()
    {
        return String::new();
    }
    base64::engine::general_purpose::STANDARD.encode(buffer.into_inner())
}

/// Style des modules : couverture des cellules isolées (cercles ≈ 3/4, carrés
/// ≈ 1) et des modules en chaîne (formes connectées ≈ 1, points ≈ 3/4).
fn body_dots_type(
    sampler: &Sampler,
    size: usize,
    bit: &dyn Fn(usize, usize) -> bool,
    ink: [f64; 3],
    bg: [f64; 3],
    logo: Option<(usize, usize, usize, usize)>,
) -> Option<String> {
    let neighbors = |x: usize, y: usize| -> usize {
        let mut count = 0;
        if x > 0 && bit(x - 1, y) {
            count += 1;
        }
        if x + 1 < size && bit(x + 1, y) {
            count += 1;
        }
        if y > 0 && bit(x, y - 1) {
            count += 1;
        }
        if y + 1 < size && bit(x, y + 1) {
            count += 1;
        }
        count
    };
    let mut lone: Vec<f64> = Vec::new();
    let mut chained: Vec<f64> = Vec::new();
    for y in 0..size {
        for x in 0..size {
            if !bit(x, y) || in_finder(x, y, size) {
                continue;
            }
            if let Some((x0, y0, x1, y1)) = logo {
                if x >= x0 && x <= x1 && y >= y0 && y <= y1 {
                    continue;
                }
            }
            let count = neighbors(x, y);
            let has_axis_pair = (x > 0 && bit(x - 1, y) && x + 1 < size && bit(x + 1, y))
                || (y > 0 && bit(x, y - 1) && y + 1 < size && bit(x, y + 1));
            if count == 0 {
                lone.push(sampler.cell_coverage(x, y, ink, bg));
            } else if count >= 3 || has_axis_pair {
                chained.push(sampler.cell_coverage(x, y, ink, bg));
            }
        }
    }
    if lone.len() < 8 || chained.len() < 8 {
        return None;
    }
    let (isolated, connected) = (mean(&lone), mean(&chained));
    if connected >= 0.94 && isolated >= 0.96 {
        Some("square".to_string())
    } else if connected >= 0.94 && isolated >= 0.80 {
        Some("classy".to_string())
    } else if connected >= 0.94 {
        Some("rounded".to_string())
    } else if connected <= 0.88 {
        Some("dots".to_string())
    } else {
        None
    }
}

/// Classe le contour et le cœur des motifs d'angle depuis la couverture des
/// cellules : coins de l'anneau, milieux d'arêtes de l'anneau, coins du cœur.
fn corner_types(
    sampler: &Sampler,
    finders: &[(usize, usize); 3],
    ink: [f64; 3],
    bg: [f64; 3],
) -> (Option<String>, Option<String>) {
    let mut ring_corner: Vec<f64> = Vec::new();
    let mut ring_edge: Vec<f64> = Vec::new();
    let mut eye_corner: Vec<f64> = Vec::new();
    for (fx, fy) in finders {
        for (x, y) in finder_cells(*fx, *fy, false) {
            let coverage = sampler.cell_coverage(x, y, ink, bg);
            let outer_corner = (x == *fx || x == fx + 6) && (y == *fy || y == fy + 6);
            if outer_corner {
                ring_corner.push(coverage);
            } else {
                ring_edge.push(coverage);
            }
        }
        for (x, y) in finder_cells(*fx, *fy, true) {
            let eye_corner_cell = (x == fx + 2 || x == fx + 4) && (y == fy + 2 || y == fy + 4);
            if eye_corner_cell {
                eye_corner.push(sampler.cell_coverage(x, y, ink, bg));
            }
        }
    }
    if ring_corner.len() < 12 || ring_edge.len() < 24 || eye_corner.len() < 12 {
        return (None, None);
    }
    let (edges, corners, eye) = (mean(&ring_edge), mean(&ring_corner), mean(&eye_corner));
    // Cœur : carré plein (≈ 1) ou cercle unique (≈ 0,2) — sinon indécis.
    let dot_type = if eye >= 0.92 {
        Some("square".to_string())
    } else if eye <= 0.5 {
        Some("dot".to_string())
    } else {
        None
    };
    // Contour : arêtes ajourées → « dot » ; sinon les coins trahissent
    // l'arrondi (nets = carré, très évidés = cercle).
    let square_type = if edges < 0.7 {
        Some("dot".to_string())
    } else if corners >= 0.90 {
        Some("square".to_string())
    } else if corners >= 0.55 {
        Some("rounded".to_string())
    } else if corners >= 0.30 {
        Some("extra-rounded".to_string())
    } else {
        Some("dot".to_string())
    };
    (square_type, dot_type)
}

/// Couleur médiane des cellules d'un motif d'angle (anneau ou cœur).
fn cell_color(
    sampler: &Sampler,
    finders: &[(usize, usize); 3],
    eye: bool,
) -> Option<[f64; 3]> {
    let mut samples: Vec<[f64; 3]> = Vec::new();
    for (fx, fy) in finders {
        for (x, y) in finder_cells(*fx, *fy, eye) {
            samples.push(sampler.module_color(x, y).0);
        }
    }
    if samples.len() < 24 {
        return None;
    }
    Some(median_all(&samples))
}

/// Ajuste un plan de couleur sur les modules d'encre du corps : renvoie
/// (borne départ, borne arrivée, angle en degrés) si l'écart le justifie.
fn gradient_fit(
    size: usize,
    kinds: &[u8],
    colors: &[[f64; 3]],
    logo: Option<&(usize, usize, usize, usize)>,
) -> Option<([f64; 3], [f64; 3], i32)> {
    let mut selected: Vec<[f64; 3]> = Vec::new();
    for y in 0..size {
        for x in 0..size {
            let i = y * size + x;
            if kinds[i] != 0 {
                continue;
            }
            if let Some((x0, y0, x1, y1)) = logo.copied() {
                if x >= x0 && x <= x1 && y >= y0 && y <= y1 {
                    continue;
                }
            }
            selected.push(colors[i]);
        }
    }
    if selected.len() < 40 {
        return None;
    }
    let mut n = 0.0f64;
    let (mut su, mut sv, mut suu, mut svv, mut suv) = (0.0, 0.0, 0.0, 0.0, 0.0);
    let mut sc = [0.0f64; 3];
    let mut suc = [0.0f64; 3];
    let mut svc = [0.0f64; 3];
    for y in 0..size {
        for x in 0..size {
            let i = y * size + x;
            if kinds[i] != 0 {
                continue;
            }
            if let Some((x0, y0, x1, y1)) = logo.copied() {
                if x >= x0 && x <= x1 && y >= y0 && y <= y1 {
                    continue;
                }
            }
            let (u, v) = (x as f64 + 0.5, y as f64 + 0.5);
            n += 1.0;
            su += u;
            sv += v;
            suu += u * u;
            svv += v * v;
            suv += u * v;
            for c in 0..3 {
                sc[c] += colors[i][c];
                suc[c] += colors[i][c] * u;
                svc[c] += colors[i][c] * v;
            }
        }
    }
    if n < 40.0 {
        return None;
    }
    // Équations normales 3×3 : couleur ≈ a0 + a1·u + a2·v, par canal.
    let mut direction = [0.0f64; 2];
    let mut weight_sum = 0.0f64;
    for c in 0..3 {
        let mut system = [
            [n, su, sv, sc[c]],
            [su, suu, suv, suc[c]],
            [sv, suv, svv, svc[c]],
        ];
        let Some(coef) = solve3(&mut system) else {
            return None;
        };
        let magnitude = (coef[1] * coef[1] + coef[2] * coef[2]).sqrt();
        if magnitude > 1e-9 {
            direction[0] += coef[1];
            direction[1] += coef[2];
            weight_sum += magnitude;
        }
    }
    if weight_sum < 1e-9 {
        return None;
    }
    let norm = (direction[0] * direction[0] + direction[1] * direction[1]).sqrt();
    if norm < 1e-9 {
        return None;
    }
    let direction = [direction[0] / norm, direction[1] / norm];
    // Bornes : médiane des couleurs des tiers extrêmes le long de la direction.
    let mut projected: Vec<(f64, usize)> = Vec::new();
    for y in 0..size {
        for x in 0..size {
            let i = y * size + x;
            if kinds[i] != 0 {
                continue;
            }
            if let Some((x0, y0, x1, y1)) = logo.copied() {
                if x >= x0 && x <= x1 && y >= y0 && y <= y1 {
                    continue;
                }
            }
            projected.push((
                (x as f64 + 0.5) * direction[0] + (y as f64 + 0.5) * direction[1],
                i,
            ));
        }
    }
    projected.sort_by(|a, b| a.0.partial_cmp(&b.0).unwrap_or(std::cmp::Ordering::Equal));
    let third = projected.len() / 3;
    if third < 8 {
        return None;
    }
    let low: Vec<[f64; 3]> = projected[..third].iter().map(|(_, i)| colors[*i]).collect();
    let high: Vec<[f64; 3]> = projected[projected.len() - third..]
        .iter()
        .map(|(_, i)| colors[*i])
        .collect();
    let from = median_all(&low);
    let to = median_all(&high);
    let spread = (0..3).map(|c| (from[c] - to[c]).abs()).fold(0.0, f64::max);
    if spread < 30.0 {
        return None; // variation trop faible : couleur unie
    }
    let mut degrees = direction[1].atan2(direction[0]).to_degrees();
    if degrees < 0.0 {
        degrees += 360.0;
    }
    Some((from, to, degrees.round() as i32 % 360))
}

/// Résout un système 3×3 (élimination de Gauss) ; `None` si non inversible.
fn solve3(system: &mut [[f64; 4]; 3]) -> Option<[f64; 3]> {
    for col in 0..3 {
        let pivot = (col..3).fold(col, |best, row| {
            if system[row][col].abs() > system[best][col].abs() {
                row
            } else {
                best
            }
        });
        if system[pivot][col].abs() < 1e-9 {
            return None;
        }
        system.swap(col, pivot);
        for row in 0..3 {
            if row != col {
                let ratio = system[row][col] / system[col][col];
                for k in col..4 {
                    system[row][k] -= ratio * system[col][k];
                }
            }
        }
    }
    Some([
        system[0][3] / system[0][0],
        system[1][3] / system[1][1],
        system[2][3] / system[2][2],
    ])
}

/// Couleur médiane d'une bande à k modules hors du code (4 côtés). `None`
/// dès qu'un côté sort de l'image, devient transparent ou n'est pas uniforme.
fn band_color(sampler: &Sampler, size: usize, k: usize) -> Option<[f64; 3]> {
    let side = size as f64 + 1.0;
    let mid = -(k as f64) + 0.5;
    let opposite = size as f64 + k as f64 - 0.5;
    let mut samples: Vec<[f64; 3]> = Vec::new();
    for t in [0.15, 0.3, 0.5, 0.7, 0.85] {
        let along = t * side;
        for [u, v] in [
            [mid, along],
            [opposite, along],
            [along, mid],
            [along, opposite],
        ] {
            let (color, alpha) = sampler.sample(u, v);
            if alpha < 0.9 {
                return None;
            }
            samples.push(color);
        }
    }
    let reference = median_all(&samples);
    // Anneau uniforme exigé : un motif quelconque interdit toute conclusion.
    if samples.iter().any(|color| dist(*color, reference) > 50.0) {
        return None;
    }
    Some(reference)
}

/// Cherche un anneau de couleur uniforme autour de la zone de silence.
/// Renvoie (couleur, identifiant du cadre de la bibliothèque le plus proche).
fn detect_frame(
    sampler: &Sampler,
    size: usize,
    bg: [f64; 3],
) -> Option<([f64; 3], &'static str)> {
    let mut ring: Option<[f64; 3]> = None;
    let mut ring_start = 0usize;
    let mut thickness = 0usize;
    for k in 1..=6usize {
        let Some(color) = band_color(sampler, size, k) else {
            break;
        };
        if let Some(reference) = ring {
            if dist(color, reference) < 35.0 {
                thickness = k - ring_start + 1;
            } else {
                break;
            }
        } else if dist(color, bg) > 45.0 {
            ring = Some(color);
            ring_start = k;
            thickness = 1;
        }
    }
    let Some(color) = ring else {
        return None;
    };
    let outer = ring_start + thickness - 1;
    // Coins de la bande la plus externe : encrés → rectangle, vides → cercle.
    let probes = [0.2, 0.35, 0.5, 0.65, 0.8];
    let mut inked = 0usize;
    for corner in [
        [-1.0, -1.0],
        [1.0, -1.0],
        [-1.0, 1.0],
        [1.0, 1.0],
    ] {
        for p in probes {
            let u = if corner[0] < 0.0 {
                -(outer as f64) + p
            } else {
                size as f64 + outer as f64 - p
            };
            let v = if corner[1] < 0.0 {
                -(outer as f64) + p
            } else {
                size as f64 + outer as f64 - p
            };
            let (pixel, alpha) = sampler.sample(u, v);
            if alpha >= 0.9 && dist(pixel, color) < dist(pixel, bg) {
                inked += 1;
            }
        }
    }
    let circular = (inked as f64) / (probes.len() as f64 * 4.0) < 0.5;
    let id: &'static str = if circular {
        "f30"
    } else {
        match thickness {
            1 => "f13",
            2 => "f21",
            _ => "f45",
        }
    };
    Some((color, id))
}

/// Couleurs dominantes d'une région rectangulaire (repli codes-barres et
/// décodages sans grille) : médiane des quarts sombres et clairs.
pub fn colors_from_region(rgba: &RgbaImage, rect: [f64; 4]) -> Option<ImportedDesign> {
    let (width, height) = (rgba.width() as f64, rgba.height() as f64);
    let x0 = rect[0].max(0.0);
    let y0 = rect[1].max(0.0);
    let x1 = rect[2].min(width);
    let y1 = rect[3].min(height);
    if x1 - x0 < 8.0 || y1 - y0 < 8.0 {
        return None;
    }
    let step = (((x1 - x0) * (y1 - y0)) / 4000.0).sqrt().ceil().max(1.0) as usize;
    let mut samples: Vec<([f64; 3], f64)> = Vec::new();
    let mut y = y0 as usize;
    while (y as f64) < y1 {
        let mut x = x0 as usize;
        while (x as f64) < x1 {
            let (color, alpha) = over_white(rgba.get_pixel(x as u32, y as u32).0);
            if alpha > 0.6 {
                let luma = 0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2];
                samples.push((color, luma));
            }
            x += step;
        }
        y += step;
    }
    if samples.len() < 32 {
        return None;
    }
    let mut lumas: Vec<f64> = samples.iter().map(|(_, luma)| *luma).collect();
    lumas.sort_by(f64::total_cmp);
    let dark_cut = lumas[lumas.len() / 4];
    let light_cut = lumas[lumas.len() * 3 / 4];
    if light_cut - dark_cut < 50.0 {
        return None;
    }
    let dark: Vec<[f64; 3]> = samples
        .iter()
        .filter(|(_, luma)| *luma <= dark_cut)
        .map(|(color, _)| *color)
        .collect();
    let light: Vec<[f64; 3]> = samples
        .iter()
        .filter(|(_, luma)| *luma >= light_cut)
        .map(|(color, _)| *color)
        .collect();
    if dark.len() < 8 || light.len() < 8 {
        return None;
    }
    Some(ImportedDesign::colors_only(
        Some(to_hex(median_all(&dark))),
        Some(to_hex(median_all(&light))),
    ))
}

fn mean(values: &[f64]) -> f64 {
    if values.is_empty() {
        return 0.0;
    }
    values.iter().sum::<f64>() / values.len() as f64
}

fn median_all(samples: &[[f64; 3]]) -> [f64; 3] {
    let mut c0: Vec<f64> = samples.iter().map(|s| s[0]).collect();
    let mut c1: Vec<f64> = samples.iter().map(|s| s[1]).collect();
    let mut c2: Vec<f64> = samples.iter().map(|s| s[2]).collect();
    c0.sort_by(f64::total_cmp);
    c1.sort_by(f64::total_cmp);
    c2.sort_by(f64::total_cmp);
    [c0[c0.len() / 2], c1[c1.len() / 2], c2[c2.len() / 2]]
}

#[cfg(test)]
mod tests {
    use super::*;

    const PAYLOAD: &str = "https://exemple.com/menu-du-soir";

    /// Matrice d'un QR de test (échelle, zone de silence) + dimensions.
    struct TestQr {
        size: usize,
        bits: Vec<bool>,
        scale: u32,
        quiet: u32,
    }

    fn build_qr(quiet: u32) -> TestQr {
        let code = qrcode::QrCode::with_error_correction_level(
            PAYLOAD.as_bytes(),
            qrcode::EcLevel::Q,
        )
        .unwrap();
        let size = code.width() as usize;
        let mut bits = vec![false; size * size];
        for (index, color) in code.to_colors().into_iter().enumerate() {
            bits[index] = matches!(color, qrcode::types::Color::Dark);
        }
        TestQr {
            size,
            bits,
            scale: 12,
            quiet,
        }
    }

    impl TestQr {
        /// Dimensions de l'image (modules, silence inclus).
        fn dimension(&self) -> u32 {
            (self.size as u32 + self.quiet * 2) * self.scale
        }

        /// Coordonnée logique du coin haut-gauche (0,0) : le coin du module
        /// (0,0), soit `quiet * scale` pixels dans l'image.
        fn bounds(&self) -> [[f64; 2]; 4] {
            let offset = self.quiet as f64 * self.scale as f64;
            let span = (self.size + 1) as f64 * self.scale as f64;
            [
                [offset, offset],
                [offset + span, offset],
                [offset + span, offset + span],
                [offset, offset + span],
            ]
        }

        fn grid(&self) -> GridData {
            GridData {
                size: self.size,
                bits: self.bits.clone(),
                bounds: self.bounds(),
            }
        }

        /// Image RGBA : chaque module passe par `paint` (coordonnées module).
        fn render(&self, paint: impl Fn(usize, usize) -> [u8; 4]) -> RgbaImage {
            let dimension = self.dimension();
            let mut image = RgbaImage::from_pixel(dimension, dimension, image::Rgba([255, 255, 255, 255]));
            for y in 0..self.size as u32 {
                for x in 0..self.size as u32 {
                    let color = paint(x as usize, y as usize);
                    for dy in 0..self.scale {
                        for dx in 0..self.scale {
                            image.put_pixel(
                                (x * self.scale) + self.quiet * self.scale + dx,
                                (y * self.scale) + self.quiet * self.scale + dy,
                                image::Rgba(color),
                            );
                        }
                    }
                }
            }
            image
        }

        fn black_white(&self) -> RgbaImage {
            self.render(|x, y| {
                if self.bits[y * self.size + x] {
                    [0, 0, 0, 255]
                } else {
                    [255, 255, 255, 255]
                }
            })
        }
    }

    #[test]
    fn extrait_les_couleurs_d_un_qr_standard() {
        let qr = build_qr(4);
        let image = qr.black_white();
        let design = extract(&image, &qr.grid(), 1.0).expect("analyse réussie");
        assert_eq!(design.dot_color.as_deref(), Some("#000000"));
        assert_eq!(design.background.as_deref(), Some("#FFFFFF"));
        assert_eq!(design.dots_type.as_deref(), Some("square"));
        assert_eq!(design.corner_square_type.as_deref(), Some("square"));
        assert_eq!(design.corner_dot_type.as_deref(), Some("square"));
        assert_eq!(design.transparent_background, None);
        assert_eq!(design.logo_png_base64.as_deref(), None);
        assert_eq!(design.frame_id.as_deref(), None);
    }

    #[test]
    fn extrait_un_degrade_horizontal() {
        let qr = build_qr(4);
        let image = qr.render(|x, y| {
            if qr.bits[y * qr.size + x] {
                // Le module sombre passe du noir au bleu, de gauche à droite.
                let t = x as f64 / qr.size as f64;
                [0, 0, (255.0 * t) as u8, 255]
            } else {
                [255, 255, 255, 255]
            }
        });
        let design = extract(&image, &qr.grid(), 1.0).expect("analyse réussie");
        assert!(design.gradient_from.is_some(), "dégradé attendu");
        assert!(design.gradient_rotation.unwrap().abs() < 30);
    }

    #[test]
    fn detecte_un_logo_central() {
        let qr = build_qr(4);
        let mid = qr.size / 2;
        let image = qr.render(|x, y| {
            if x >= mid - 3 && x <= mid + 2 && y >= mid - 3 && y <= mid + 2 {
                [220, 30, 30, 255]
            } else if qr.bits[y * qr.size + x] {
                [0, 0, 0, 255]
            } else {
                [255, 255, 255, 255]
            }
        });
        let design = extract(&image, &qr.grid(), 1.0).expect("analyse réussie");
        let png = design.logo_png_base64.expect("logo attendu");
        assert!(!png.is_empty());
        let size = design.logo_size.expect("taille attendue");
        assert!((0.15..=0.44).contains(&size));
        assert_eq!(design.dot_color.as_deref(), Some("#000000"));
    }

    #[test]
    fn reconnait_des_angles_cercles() {
        let qr = build_qr(4);
        let mut image = qr.black_white();
        // Redessine les trois motifs d'angle en anneau + cœur circulaires
        // (un code réel applique le même style à ses trois angles).
        let scale = qr.scale;
        let offset = qr.quiet * scale;
        let origins = [(0u32, 0u32), (qr.size as u32 - 7, 0), (0, qr.size as u32 - 7)];
        for (ox, oy) in origins {
            for py in 0..7 * scale {
                for px in 0..7 * scale {
                    let u = px as f64 / scale as f64;
                    let v = py as f64 / scale as f64;
                    let d = ((u - 3.5).powi(2) + (v - 3.5).powi(2)).sqrt();
                    let ink = (2.5..=3.5).contains(&d) || d <= 1.5;
                    image.put_pixel(
                        ox * scale + offset + px,
                        oy * scale + offset + py,
                        image::Rgba(if ink { [0, 0, 0, 255] } else { [255, 255, 255, 255] }),
                    );
                }
            }
        }
        let design = extract(&image, &qr.grid(), 1.0).expect("analyse réussie");
        assert_eq!(design.corner_square_type.as_deref(), Some("dot"));
        assert_eq!(design.corner_dot_type.as_deref(), Some("dot"));
    }

    #[test]
    fn reconnait_un_cadre_rectangle() {
        let qr = build_qr(8);
        let mut image = qr.black_white();
        let scale = qr.scale;
        let total = qr.dimension();
        // Anneau bleu de 2 modules, à 4 modules du code (zone de silence).
        for py in 0..total {
            for px in 0..total {
                let u = px as f64 / scale as f64 - qr.quiet as f64;
                let v = py as f64 / scale as f64 - qr.quiet as f64;
                let outside = u < -4.0 || u > qr.size as f64 + 4.0 || v < -4.0 || v > qr.size as f64 + 4.0;
                let inside = u >= -6.0 && u <= qr.size as f64 + 6.0 && v >= -6.0 && v <= qr.size as f64 + 6.0;
                if outside && inside {
                    image.put_pixel(px, py, image::Rgba([29, 78, 216, 255]));
                }
            }
        }
        let design = extract(&image, &qr.grid(), 1.0).expect("analyse réussie");
        assert_eq!(design.frame_color.as_deref(), Some("#1D4ED8"));
        assert_eq!(design.frame_id.as_deref(), Some("f21"));
    }

    #[test]
    fn detecte_un_fond_transparent() {
        let qr = build_qr(4);
        let image = qr.render(|x, y| {
            if qr.bits[y * qr.size + x] {
                [0, 0, 0, 255]
            } else {
                [255, 255, 255, 0]
            }
        });
        let design = extract(&image, &qr.grid(), 1.0).expect("analyse réussie");
        assert_eq!(design.transparent_background, Some(true));
        assert_eq!(design.background.as_deref(), Some("#FFFFFF"));
    }

    #[test]
    fn couleurs_d_une_region_code_barres() {
        // Barres verticales noires sur blanc, comme un code EAN.
        let mut image = RgbaImage::from_pixel(300, 100, image::Rgba([255, 255, 255, 255]));
        for x in (0..300).step_by(6) {
            for dx in 0..3 {
                for y in 0..100 {
                    image.put_pixel(x + dx, y, image::Rgba([0, 0, 0, 255]));
                }
            }
        }
        let design = colors_from_region(&image, [0.0, 0.0, 300.0, 100.0]).expect("couleurs");
        assert_eq!(design.dot_color.as_deref(), Some("#000000"));
        assert_eq!(design.background.as_deref(), Some("#FFFFFF"));
    }
}
