//! Import d'un QR code ou d'un code-barres existant : l'utilisateur fournit
//! une image (PNG, JPEG, WebP, GIF, BMP, TIFF), un fichier vectoriel SVG ou
//! un PDF ; le backend le décode nativement — aucun réseau — et renvoie le
//! contenu encodé, le format détecté et le niveau de correction d'erreur.
//!
//! - Images : décodage direct après aplanissement sur fond blanc.
//! - SVG : rasterisation hors ligne (usvg + resvg) puis décodage.
//! - PDF : extraction des images embarquées (JPEG ou échantillons bruts),
//!   de la plus grande à la plus petite, puis décodage.
//!
//! Chaque étape émet une progression (nom d'étape + pourcentage) via un canal
//! Tauri : l'interface affiche une barre d'avancement au lieu de geler. La
//! commande est par ailleurs exécutée hors du thread principal
//! (`spawn_blocking`, voir lib.rs) — un décodage long ne bloque ni la
//! fenêtre ni le rendu.
//!
//! Décodage : rqrr lit le QR ; en repli, rxing (port Rust de ZXing) lit les
//! codes-barres 1D (EAN, UPC, Code 128/39/93, ITF, Codabar…) et les autres
//! matrices 2D (Data Matrix, Aztec, PDF417…).
use crate::i18n;

use crate::import_design::{self, GridData, ImportedDesign};
use image::DynamicImage;
use serde::Serialize;
use tauri::ipc::Channel;

/// Résultat d'un import réussi.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QrImport {
    pub payload: String,
    /// Niveau de correction détecté : « L », « M », « Q » ou « H » (QR seul).
    pub error_correction: Option<String>,
    /// Format détecté : « QR_CODE » ou symbologie rxing (« EAN_13 »…).
    pub code_format: String,
    /// Origine du décodage : « image », « svg » ou « pdf ».
    pub source_kind: String,
    /// Indices de design reconstruits de l'image (couleurs, angles, logo…).
    pub design: Option<ImportedDesign>,
}

/// Progression d'une étape d'import, poussée à l'interface en temps réel.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportProgress {
    /// Étape en cours : « read » (lecture du fichier) ou « decode » (détection).
    pub stage: String,
    /// Avancement de l'étape, de 0 à 100.
    pub percent: u32,
}

/// Émetteur de progression : (nom d'étape, pourcentage 0-100 de l'étape).
type ProgressEmit<'a> = &'a (dyn Fn(&str, u32) + 'a);

struct Decoded {
    payload: String,
    /// Indicateur brut de correction d'erreur du format QR (2 bits) ; absent
    /// pour les autres symbologies.
    ecc_level: Option<u16>,
    /// Format du code lu : « QR_CODE » ou nom de symbologie rxing.
    format: String,
    /// Matrice de modules du QR décodé et sa position dans l'image ;
    /// absente pour les décodages sans grille (repli rxing).
    grid: Option<GridData>,
    /// Facteur pixels-grille → pixels-couleur (le décodeur peut avoir
    /// agrandi une petite image avant de la lire).
    color_rescale: f64,
    /// Région rectangulaire approximative du code (repli rxing, sans grille).
    region: Option<[f64; 4]>,
}

impl Decoded {
    fn new(payload: String, ecc_level: Option<u16>, format: String) -> Self {
        Decoded {
            payload,
            ecc_level,
            format,
            grid: None,
            color_rescale: 1.0,
            region: None,
        }
    }
}

/// Format déclaré pour tout décodage QR (rqrr en priorité, rxing en repli).
const QR_CODE_FORMAT: &str = "QR_CODE";

/// Dimension de rendu cible pour la détection.
const DECODE_TARGET: u32 = 1024;
/// Au-delà, l'image est réduite avant détection.
const MAX_DIMENSION: u32 = 2400;
/// Plafond de décompression d'un flux PDF (défense contre les bombes).
const MAX_PDF_DECOMPRESS: usize = 128 * 1024 * 1024;
/// Nombre maximal d'images PDF à essayer.
const MAX_PDF_CANDIDATES: usize = 8;

/// Point d'entrée de la commande Tauri : décode avec progression sur canal.
pub fn import_qr(path: &str, on_progress: &Channel<ImportProgress>) -> Result<QrImport, String> {
    import_qr_with_progress(path, &|stage, percent| {
        // Un canal indisponible ne doit jamais faire échouer l'import.
        let _ = on_progress.send(ImportProgress {
            stage: stage.to_string(),
            percent,
        });
    })
}

/// Traitement complet, avec émetteur de progression injectable (les tests
/// passent une fonction neutre).
pub fn import_qr_with_progress(path: &str, emit: ProgressEmit) -> Result<QrImport, String> {
    emit("read", 0);
    let bytes = std::fs::read(path)
        .map_err(|error| i18n::tr("import.readFailed", &[("error", &error.to_string())]))?;
    if bytes.is_empty() {
        return Err(i18n::tr("import.emptyFile", &[]));
    }
    emit("read", 100);

    emit("decode", 0);
    let result = match detect_kind(&bytes, path) {
        SourceKind::Svg => import_svg(&bytes, emit),
        SourceKind::Pdf => import_pdf(&bytes, emit),
        SourceKind::Image => import_image(&bytes, emit),
    };
    emit("decode", 100);
    result
}

enum SourceKind {
    Image,
    Svg,
    Pdf,
}

/// Détection par signatures (magic bytes) puis par extension.
fn detect_kind(bytes: &[u8], path: &str) -> SourceKind {
    if bytes.starts_with(b"%PDF-") {
        return SourceKind::Pdf;
    }
    let extension = path
        .rsplit('.')
        .next()
        .unwrap_or("")
        .to_ascii_lowercase();
    match extension.as_str() {
        "pdf" => return SourceKind::Pdf,
        "svg" => return SourceKind::Svg,
        _ => {}
    }
    // Certains SVG n'ont pas l'extension : on inspecte l'en-tête.
    let head = String::from_utf8_lossy(&bytes[..bytes.len().min(1024)]);
    let trimmed = head.trim_start();
    if trimmed.starts_with("<?xml") || trimmed.starts_with("<svg") {
        return SourceKind::Svg;
    }
    SourceKind::Image
}

// ---------------------------------------------------------------------------
// Décodage : rqrr (QR) puis rxing en repli (codes-barres 1D, matrices 2D)
// ---------------------------------------------------------------------------

/// Inverse les niveaux de gris (QR clair sur fond sombre).
fn inverted(gray: &image::GrayImage) -> image::GrayImage {
    image::ImageBuffer::from_fn(gray.width(), gray.height(), |x, y| {
        let mut value = gray.get_pixel(x, y).0;
        value[0] = 255 - value[0];
        image::Luma(value)
    })
}

/// Tente le décodage QR, puis réessaie en négatif.
fn try_decode(gray: image::GrayImage) -> Option<Decoded> {
    decode_once(gray.clone()).or_else(|| decode_once(inverted(&gray)))
}

fn decode_once(gray: image::GrayImage) -> Option<Decoded> {
    use rqrr::BitGrid as _;
    let mut prepared = rqrr::PreparedImage::prepare(gray);
    for grid in prepared.detect_grids() {
        if let Ok((meta, payload)) = grid.decode() {
            // Copie la matrice et les coins : la grille référence l'image
            // préparée, empruntée jusqu'à la fin de la boucle.
            let size = grid.grid.size();
            let mut bits = Vec::with_capacity(size * size);
            for y in 0..size {
                for x in 0..size {
                    bits.push(grid.grid.bit(y, x));
                }
            }
            let mut decoded = Decoded::new(
                payload,
                Some(meta.ecc_level),
                QR_CODE_FORMAT.to_string(),
            );
            decoded.grid = Some(GridData {
                size,
                bits,
                bounds: grid.bounds.map(|point| [point.x as f64, point.y as f64]),
            });
            return Some(decoded);
        }
    }
    None
}

/// Repli multi-formats via rxing : rqrr ne sait lire que le QR. Décode les
/// codes-barres 1D (EAN-13, UPC, Code 128/39/93, ITF, Codabar…) et les
/// autres matrices 2D (Data Matrix, Aztec, PDF417…). Le tampon luma8 est
/// passé brut : aucune conversion via la crate `image` (versions divergentes).
fn decode_with_rxing(gray: &image::GrayImage) -> Option<Decoded> {
    let result = rxing::helpers::detect_in_luma_slice(
        gray.as_raw(),
        gray.width(),
        gray.height(),
        None,
    )
    .ok()?;
    // Points caractéristiques du code (extrémités pour un 1D, angles pour un
    // 2D) : servent de région pour les couleurs dominantes.
    let points = result.getPoints();
    let region = if points.len() >= 2 {
        let mut min_x = f64::MAX;
        let mut min_y = f64::MAX;
        let mut max_x = f64::MIN;
        let mut max_y = f64::MIN;
        for point in points {
            let (x, y) = (point.x as f64, point.y as f64);
            min_x = min_x.min(x);
            min_y = min_y.min(y);
            max_x = max_x.max(x);
            max_y = max_y.max(y);
        }
        // Un code 1D ne couvre que la ligne de balayage : marge verticale.
        let margin = (max_x - min_x).max(max_y - min_y) * 0.4;
        Some([
            (min_x - margin).max(0.0),
            (min_y - margin).max(0.0),
            max_x + margin,
            max_y + margin,
        ])
    } else {
        None
    };
    let mut decoded = Decoded::new(
        result.getText().to_string(),
        None,
        rxing_format_name(*result.getBarcodeFormat()),
    );
    decoded.region = region;
    Some(decoded)
}

/// Nom de symbologie stable transmis à l'interface (nomenclature ZXing).
fn rxing_format_name(format: rxing::BarcodeFormat) -> String {
    use rxing::BarcodeFormat as F;
    match format {
        F::QR_CODE => "QR_CODE",
        F::MICRO_QR_CODE => "MICRO_QR_CODE",
        F::RECTANGULAR_MICRO_QR_CODE => "RECTANGULAR_MICRO_QR_CODE",
        F::EAN_13 => "EAN_13",
        F::EAN_8 => "EAN_8",
        F::UPC_A => "UPC_A",
        F::UPC_E => "UPC_E",
        F::CODE_39 => "CODE_39",
        F::CODE_93 => "CODE_93",
        F::CODE_128 => "CODE_128",
        F::ITF => "ITF",
        F::CODABAR => "CODABAR",
        F::TELEPEN => "TELEPEN",
        F::RSS_14 => "RSS_14",
        F::RSS_EXPANDED => "RSS_EXPANDED",
        F::DATA_MATRIX => "DATA_MATRIX",
        F::PDF_417 => "PDF_417",
        F::AZTEC => "AZTEC",
        _ => "UNSUPPORTED",
    }
    .to_string()
}

/// Aplatit sur fond blanc puis convertit en niveaux de gris (Rec. 601).
/// L'image couleur d'origine sert ensuite à l'extraction du design : les
/// coordonnées de la grille rqrr s'y appliquent telles quelles.
fn flatten_to_gray(rgba: &image::RgbaImage) -> image::GrayImage {
    let mut gray = image::GrayImage::new(rgba.width(), rgba.height());
    for (x, y, output) in gray.enumerate_pixels_mut() {
        let pixel = rgba.get_pixel(x, y);
        let [r, g, b, a] = pixel.0;
        let over_white = |channel: u8| {
            (channel as u32 * a as u32 + 255 * (255 - a as u32)) / 255
        };
        let value = (299 * over_white(r) + 587 * over_white(g) + 114 * over_white(b)) / 1000;
        *output = image::Luma([value as u8]);
    }
    gray
}

fn cap_dimension(image: DynamicImage) -> DynamicImage {
    let (width, height) = (image.width(), image.height());
    let largest = width.max(height);
    if largest == 0 || largest <= MAX_DIMENSION {
        return image;
    }
    let scale = MAX_DIMENSION as f64 / largest as f64;
    image.resize_exact(
        ((width as f64 * scale).round().max(1.0)) as u32,
        ((height as f64 * scale).round().max(1.0)) as u32,
        image::imageops::FilterType::Lanczos3,
    )
}

/// Pipeline complet : cadrage, aplanissement, détection (avec retentes) puis
/// repli multi-formats. La progression suit les tentatives, de la plus rapide
/// à la plus coûteuse. Renvoie aussi l'image couleur (même dimensions que la
/// grille décodée) pour l'extraction du design.
fn decode_dynamic(image: DynamicImage, emit: ProgressEmit) -> Option<(Decoded, image::RgbaImage)> {
    let capped = cap_dimension(image);
    let rgba = capped.to_rgba8();
    let gray = flatten_to_gray(&rgba);
    if let Some(decoded) = try_decode(gray.clone()) {
        emit("decode", 75);
        return Some((decoded, rgba));
    }
    emit("decode", 35);
    // Les petites images (QR extraits d'un PDF) gagnent à être agrandies.
    let largest = gray.width().max(gray.height());
    if largest < 400 {
        let scale = 400.0 / largest as f64;
        let upscaled_width = ((gray.width() as f64 * scale).round().max(1.0)) as u32;
        let upscaled_height = ((gray.height() as f64 * scale).round().max(1.0)) as u32;
        let upscaled = DynamicImage::ImageLuma8(gray.clone()).resize_exact(
            upscaled_width,
            upscaled_height,
            image::imageops::FilterType::Nearest,
        );
        if let Some(mut decoded) = try_decode(upscaled.to_luma8()) {
            // La grille vit dans l'espace agrandi : un facteur la ramène vers
            // les pixels de l'image couleur.
            decoded.color_rescale = gray.width() as f64 / upscaled.width() as f64;
            emit("decode", 75);
            return Some((decoded, rgba));
        }
    }
    emit("decode", 55);
    // rqrr n'a rien vu : repli rxing sur l'image puis sur son négatif.
    if let Some(decoded) = decode_with_rxing(&gray) {
        emit("decode", 75);
        return Some((decoded, rgba));
    }
    decode_with_rxing(&inverted(&gray)).map(|decoded| (decoded, rgba))
}

fn no_qr_found() -> String {
    i18n::tr("import.noCodeFound", &[])
}

/// rqrr renvoie l'indicateur brut de 2 bits du format (spec QR) :
/// 0 = M, 1 = L, 2 = H, 3 = Q.
fn error_correction_label(level: u16) -> Option<String> {
    match level {
        0 => Some("M"),
        1 => Some("L"),
        2 => Some("H"),
        3 => Some("Q"),
        _ => None,
    }
    .map(String::from)
}

fn to_import(mut decoded: Decoded, source_kind: &str, rgba: &image::RgbaImage) -> QrImport {
    // Design : analyse complète avec la grille du QR, sinon les couleurs
    // dominantes de la région détectée (codes-barres, repli rxing).
    let design = decoded
        .grid
        .take()
        .and_then(|grid| import_design::extract(rgba, &grid, decoded.color_rescale))
        .or_else(|| {
            decoded
                .region
                .and_then(|region| import_design::colors_from_region(rgba, region))
        });
    QrImport {
        payload: decoded.payload,
        error_correction: decoded.ecc_level.and_then(error_correction_label),
        code_format: decoded.format,
        source_kind: source_kind.to_string(),
        design,
    }
}

// ---------------------------------------------------------------------------
// Images matricielles
// ---------------------------------------------------------------------------

fn import_image(bytes: &[u8], emit: ProgressEmit) -> Result<QrImport, String> {
    let image = image::load_from_memory(bytes)
        .map_err(|_| "Image illisible : format non pris en charge.".to_string())?;
    decode_dynamic(image, emit)
        .map(|(decoded, rgba)| to_import(decoded, "image", &rgba))
        .ok_or_else(no_qr_found)
}

// ---------------------------------------------------------------------------
// SVG : rasterisation hors ligne puis décodage
// ---------------------------------------------------------------------------

fn import_svg(bytes: &[u8], emit: ProgressEmit) -> Result<QrImport, String> {
    let options = usvg::Options::default();
    let tree = usvg::Tree::from_data(bytes, &options)
        .map_err(|_| "SVG illisible : le fichier est corrompu.".to_string())?;
    let size = tree.size();
    let svg_width = size.width().max(1.0);
    let svg_height = size.height().max(1.0);
    let scale = DECODE_TARGET as f32 / svg_width.max(svg_height);
    let out_width = ((svg_width * scale) as u32).clamp(1, 4096);
    let out_height = ((svg_height * scale) as u32).clamp(1, 4096);

    let mut pixmap = tiny_skia::Pixmap::new(out_width, out_height)
        .ok_or_else(|| "Rendu du SVG impossible.".to_string())?;
    resvg::render(
        &tree,
        tiny_skia::Transform::from_scale(scale, scale),
        &mut pixmap.as_mut(),
    );
    emit("decode", 25);

    let rgba = image::RgbaImage::from_fn(out_width, out_height, |x, y| {
        match pixmap.pixel(x, y) {
            Some(color) => {
                let color = color.demultiply();
                image::Rgba([color.red(), color.green(), color.blue(), color.alpha()])
            }
            None => image::Rgba([255, 255, 255, 255]),
        }
    });

    decode_dynamic(DynamicImage::ImageRgba8(rgba), emit)
        .map(|(decoded, rgba)| to_import(decoded, "svg", &rgba))
        .ok_or_else(no_qr_found)
}

// ---------------------------------------------------------------------------
// PDF : extraction des images embarquées puis décodage
// ---------------------------------------------------------------------------

fn import_pdf(bytes: &[u8], emit: ProgressEmit) -> Result<QrImport, String> {
    let doc = lopdf::Document::load_mem(bytes)
        .map_err(|_| "PDF illisible : le fichier est corrompu.".to_string())?;
    emit("decode", 10);

    // Collecte des XObject image, de la plus grande à la plus petite.
    let mut candidates: Vec<(lopdf::ObjectId, u64)> = Vec::new();
    for (id, object) in &doc.objects {
        let Ok(stream) = object.as_stream() else {
            continue;
        };
        let is_image = stream
            .dict
            .get(b"Subtype")
            .ok()
            .and_then(|object| object_name(object))
            .is_some_and(|name| name.eq_ignore_ascii_case(b"Image"));
        if !is_image {
            continue;
        }
        let width = stream
            .dict
            .get(b"Width")
            .ok()
            .and_then(object_i64)
            .unwrap_or(0);
        let height = stream
            .dict
            .get(b"Height")
            .ok()
            .and_then(object_i64)
            .unwrap_or(0);
        if width > 0 && height > 0 {
            candidates.push((*id, width as u64 * height as u64));
        }
    }

    if candidates.is_empty() {
        return Err(
            "Ce PDF ne contient aucune image exploitable (QR purement vectoriel non pris en \
             charge). Exportez-le plutôt en image ou en SVG."
                .to_string(),
        );
    }
    candidates.sort_by(|a, b| b.1.cmp(&a.1));

    let total = candidates.len().min(MAX_PDF_CANDIDATES) as u32;
    for (attempt, (id, _)) in candidates.into_iter().take(MAX_PDF_CANDIDATES).enumerate() {
        emit("decode", 30 + (attempt as u32 * 40 / total.max(1)));
        let Some(image) = extract_pdf_image(&doc, id) else {
            continue;
        };
        if let Some(decoded) = decode_dynamic(image, emit) {
            let (decoded, rgba) = decoded;
            return Ok(to_import(decoded, "pdf", &rgba));
        }
    }
    Err(i18n::tr("import.pdfNoCode", &[]))
}

/// Reconstruit une image depuis un XObject PDF (JPEG direct ou échantillons).
fn extract_pdf_image(doc: &lopdf::Document, id: lopdf::ObjectId) -> Option<DynamicImage> {
    let stream = doc.get_object(id).ok()?.as_stream().ok()?;
    let dict = &stream.dict;

    let width = dict.get(b"Width").ok().and_then(object_i64)? as u32;
    let height = dict.get(b"Height").ok().and_then(object_i64)? as u32;
    let is_mask = matches!(dict.get(b"ImageMask"), Ok(lopdf::Object::Boolean(true)));

    let filters: Vec<String> = stream
        .filters()
        .unwrap_or_default()
        .iter()
        .map(|filter| String::from_utf8_lossy(filter).to_ascii_lowercase())
        .collect();
    // Formats que la crate image ne sait pas décoder : on passe à la suivante.
    if filters
        .iter()
        .any(|filter| filter.contains("jpx") || filter.contains("ccitt"))
    {
        return None;
    }
    // JPEG (DCTDecode) : le contenu brut du flux est un fichier JPEG complet.
    if filters.iter().any(|filter| filter.contains("dct")) {
        return image::load_from_memory(&stream.content).ok();
    }

    // Sinon : échantillons bruts décompressés (FlateDecode…).
    let raw = stream
        .decompressed_content_with_limit(MAX_PDF_DECOMPRESS)
        .ok()?;
    let invert = decode_array_inverts(dict);
    let bits = if is_mask {
        1
    } else {
        dict.get(b"BitsPerComponent")
            .ok()
            .and_then(object_i64)
            .unwrap_or(8) as u32
    };
    let color_space = if is_mask {
        PdfColorSpace::Stencil
    } else {
        dict.get(b"ColorSpace")
            .ok()
            .and_then(|object| resolve_color_space(doc, object, 0))
            .unwrap_or_else(|| guess_color_space(&raw, width, height))
    };

    build_image(&raw, width, height, bits, &color_space, invert, is_mask)
}

enum PdfColorSpace {
    /// 1 bit par pixel : dans un masque, 1 = encre.
    Stencil,
    DeviceGray,
    DeviceRgb,
    DeviceCmyk,
    /// Palette RGB résolue (3 octets par entrée).
    Indexed(Vec<u8>),
}

fn object_i64(object: &lopdf::Object) -> Option<i64> {
    match object {
        lopdf::Object::Integer(value) => Some(*value),
        lopdf::Object::Real(value) => Some(*value as i64),
        _ => None,
    }
}

fn object_name(object: &lopdf::Object) -> Option<&[u8]> {
    match object {
        lopdf::Object::Name(value) => Some(value.as_slice()),
        _ => None,
    }
}

fn object_reference(object: &lopdf::Object) -> Option<lopdf::ObjectId> {
    match object {
        lopdf::Object::Reference(id) => Some(*id),
        _ => None,
    }
}

/// /Decode [1 0 …] : les composants sont inversés.
fn decode_array_inverts(dict: &lopdf::Dictionary) -> bool {
    let Ok(lopdf::Object::Array(items)) = dict.get(b"Decode") else {
        return false;
    };
    let first = items.first().and_then(object_i64);
    let last = items.last().and_then(object_i64);
    match (first, last) {
        (Some(first), Some(last)) => first > last,
        _ => false,
    }
}

/// Résout un espace colorimétrique PDF (Device*, ICCBased, Indexed).
fn resolve_color_space(
    doc: &lopdf::Document,
    object: &lopdf::Object,
    depth: u32,
) -> Option<PdfColorSpace> {
    if depth > 4 {
        return None;
    }
    match object {
        lopdf::Object::Name(name) => match name.as_slice() {
            b"DeviceGray" | b"CalGray" | b"G" => Some(PdfColorSpace::DeviceGray),
            b"DeviceRGB" | b"CalRGB" | b"RGB" | b"RG" => Some(PdfColorSpace::DeviceRgb),
            b"DeviceCMYK" | b"CMYK" | b"K" => Some(PdfColorSpace::DeviceCmyk),
            _ => None,
        },
        lopdf::Object::Array(items) if !items.is_empty() => {
            let kind = object_name(&items[0])?;
            match kind {
                b"ICCBased" => {
                    let stream = doc
                        .get_object(object_reference(&items[1])?)
                        .ok()?
                        .as_stream()
                        .ok()?;
                    match stream.dict.get(b"N").ok().and_then(object_i64)? {
                        1 => Some(PdfColorSpace::DeviceGray),
                        3 => Some(PdfColorSpace::DeviceRgb),
                        4 => Some(PdfColorSpace::DeviceCmyk),
                        _ => None,
                    }
                }
                b"Indexed" | b"I" => {
                    if items.len() < 4 {
                        return None;
                    }
                    let base = resolve_color_space(doc, &items[1], depth + 1)?;
                    let lookup = doc
                        .get_object(object_reference(&items[3])?)
                        .ok()?
                        .as_stream()
                        .ok()?;
                    let data = lookup
                        .decompressed_content_with_limit(MAX_PDF_DECOMPRESS)
                        .ok()?;
                    expand_palette(base, &data).map(PdfColorSpace::Indexed)
                }
                _ => None,
            }
        }
        _ => None,
    }
}

/// Convertit une palette (gris, RGB ou CMYK) en triplets RGB.
fn expand_palette(base: PdfColorSpace, data: &[u8]) -> Option<Vec<u8>> {
    let mut palette = Vec::new();
    match base {
        PdfColorSpace::DeviceGray => {
            for value in data {
                palette.extend_from_slice(&[*value, *value, *value]);
            }
        }
        PdfColorSpace::DeviceRgb => palette.extend_from_slice(data),
        PdfColorSpace::DeviceCmyk => {
            for chunk in data.chunks_exact(4) {
                palette.extend_from_slice(&cmyk_to_rgb(chunk));
            }
        }
        _ => return None,
    }
    Some(palette)
}

fn cmyk_to_rgb(chunk: &[u8]) -> [u8; 3] {
    let c = chunk[0] as u32;
    let m = chunk[1] as u32;
    let y = chunk[2] as u32;
    let k = chunk[3] as u32;
    let convert = |component: u32| ((255 - component) * (255 - k) / 255) as u8;
    [convert(c), convert(m), convert(y)]
}

/// Devine l'espace colorimétrique à partir de la taille des données.
fn guess_color_space(raw: &[u8], width: u32, height: u32) -> PdfColorSpace {
    let pixels = width as usize * height as usize;
    if pixels == 0 {
        return PdfColorSpace::DeviceGray;
    }
    match raw.len() / pixels {
        3 => PdfColorSpace::DeviceRgb,
        4 => PdfColorSpace::DeviceCmyk,
        _ => PdfColorSpace::DeviceGray,
    }
}

/// Reconstruit une image depuis des échantillons PDF (1 ou 8 bits/composant).
fn build_image(
    raw: &[u8],
    width: u32,
    height: u32,
    bits: u32,
    color_space: &PdfColorSpace,
    invert: bool,
    is_mask: bool,
) -> Option<DynamicImage> {
    if width == 0 || height == 0 || raw.is_empty() {
        return None;
    }
    let w = width as usize;
    let h = height as usize;

    if bits == 1 {
        let row_bytes = w.div_ceil(8);
        let mut gray = image::GrayImage::new(width, height);
        for y in 0..h {
            let row_start = y.checked_mul(row_bytes).unwrap_or(usize::MAX);
            if row_start >= raw.len() {
                break;
            }
            for x in 0..w {
                let offset = row_start + x / 8;
                if offset >= raw.len() {
                    break;
                }
                let bit = (raw[offset] >> (7 - (x % 8))) & 1;
                let value = if is_mask {
                    if bit == 1 { 0 } else { 255 }
                } else {
                    let base: u8 = if bit == 1 { 255 } else { 0 };
                    if invert { 255 - base } else { base }
                };
                gray.put_pixel(x as u32, y as u32, image::Luma([value]));
            }
        }
        return Some(DynamicImage::ImageLuma8(gray));
    }
    if bits != 8 {
        return None;
    }

    let components: usize = match color_space {
        PdfColorSpace::DeviceGray => 1,
        PdfColorSpace::DeviceRgb => 3,
        PdfColorSpace::DeviceCmyk => 4,
        PdfColorSpace::Indexed(_) => 1,
        PdfColorSpace::Stencil => return None,
    };
    let mut rgb = image::RgbImage::new(width, height);
    let mut cursor = 0usize;
    for y in 0..h {
        for x in 0..w {
            if cursor + components > raw.len() {
                // Données tronquées : on restitue ce qui reste décodable.
                return Some(DynamicImage::ImageRgb8(rgb));
            }
            let samples = &raw[cursor..cursor + components];
            cursor += components;
            rgb.put_pixel(x as u32, y as u32, image::Rgb(to_rgb(samples, color_space, invert)));
        }
    }
    Some(DynamicImage::ImageRgb8(rgb))
}

fn to_rgb(samples: &[u8], color_space: &PdfColorSpace, invert: bool) -> [u8; 3] {
    let adjusted = |value: u8| if invert { 255 - value } else { value };
    match color_space {
        PdfColorSpace::DeviceGray => {
            let value = adjusted(samples[0]);
            [value, value, value]
        }
        PdfColorSpace::DeviceRgb => [
            adjusted(samples[0]),
            adjusted(samples[1]),
            adjusted(samples[2]),
        ],
        PdfColorSpace::DeviceCmyk => {
            let mut chunk = [0, 0, 0, 0];
            for (index, value) in chunk.iter_mut().enumerate() {
                *value = adjusted(samples[index]);
            }
            cmyk_to_rgb(&chunk)
        }
        PdfColorSpace::Indexed(palette) => {
            let index = samples[0] as usize * 3;
            if index + 3 <= palette.len() {
                [
                    adjusted(palette[index]),
                    adjusted(palette[index + 1]),
                    adjusted(palette[index + 2]),
                ]
            } else {
                [255, 255, 255]
            }
        }
        PdfColorSpace::Stencil => [0, 0, 0],
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use base64::Engine as _;
    use lopdf::dictionary;

    const PAYLOAD: &str = "https://exemple.com/menu-du-soir";

    /// Génère une image QR (noir sur blanc, zone de silence incluse).
    fn qr_gray(payload: &str, scale: u32) -> image::GrayImage {
        let code = qrcode::QrCode::with_error_correction_level(
            payload.as_bytes(),
            qrcode::EcLevel::Q,
        )
        .unwrap();
        let modules = code.width() as u32;
        let quiet = 4u32;
        let dimension = (modules + quiet * 2) * scale;
        let mut gray = image::GrayImage::from_pixel(dimension, dimension, image::Luma([255]));
        for (index, color) in code.to_colors().into_iter().enumerate() {
            if !matches!(color, qrcode::types::Color::Dark) {
                continue;
            }
            let x = (index as u32 % modules + quiet) * scale;
            let y = (index as u32 / modules + quiet) * scale;
            for dy in 0..scale {
                for dx in 0..scale {
                    gray.put_pixel(x + dx, y + dy, image::Luma([0]));
                }
            }
        }
        gray
    }

    fn png_bytes(gray: &image::GrayImage) -> Vec<u8> {
        let mut buffer = std::io::Cursor::new(Vec::new());
        DynamicImage::ImageLuma8(gray.clone())
            .write_to(&mut buffer, image::ImageFormat::Png)
            .unwrap();
        buffer.into_inner()
    }

    fn temp_file(name: &str, bytes: &[u8]) -> String {
        let path = std::env::temp_dir().join(format!("qr-import-{}-{name}", std::process::id()));
        std::fs::write(&path, bytes).unwrap();
        path.to_string_lossy().to_string()
    }

    #[test]
    fn décode_un_png() {
        let path = temp_file("qr.png", &png_bytes(&qr_gray(PAYLOAD, 8)));
        let imported = import_qr_with_progress(&path, &|_, _| {}).expect("décodage réussi");
        assert_eq!(imported.payload, PAYLOAD);
        assert_eq!(imported.code_format, "QR_CODE");
        assert_eq!(imported.error_correction.as_deref(), Some("Q"));
        assert_eq!(imported.source_kind, "image");
        std::fs::remove_file(&path).unwrap();
    }

    #[test]
    fn décode_un_code_barres_ean13() {
        use rxing::Writer;
        // EAN-13 « 400638133393(1) » : clé de contrôle incluse par le writer.
        let matrix = rxing::oned::EAN13Writer::default()
            .encode(
                "4006381333931",
                &rxing::BarcodeFormat::EAN_13,
                300,
                80,
            )
            .expect("encodage EAN-13");
        // Marge blanche autour du code : la zone de silence est requise.
        let margin = 40u32;
        let width = matrix.width() + margin * 2;
        let height = matrix.height() + margin * 2;
        let mut gray = image::GrayImage::from_pixel(width, height, image::Luma([255]));
        for y in 0..matrix.height() {
            for x in 0..matrix.width() {
                if matrix.get(x, y) {
                    gray.put_pixel(x + margin, y + margin, image::Luma([0]));
                }
            }
        }
        let path = temp_file("ean13.png", &png_bytes(&gray));
        let imported = import_qr_with_progress(&path, &|_, _| {}).expect("décodage réussi");
        assert_eq!(imported.payload, "4006381333931");
        assert_eq!(imported.code_format, "EAN_13");
        assert_eq!(imported.source_kind, "image");
        std::fs::remove_file(&path).unwrap();
    }

    #[test]
    fn décode_un_qr_inversé() {
        let normal = qr_gray(PAYLOAD, 8);
        let inverted = image::ImageBuffer::from_fn(normal.width(), normal.height(), |x, y| {
            image::Luma([255 - normal.get_pixel(x, y)[0]])
        });
        let path = temp_file("qr-inverted.png", &png_bytes(&inverted));
        let imported = import_qr_with_progress(&path, &|_, _| {}).expect("décodage réussi");
        assert_eq!(imported.payload, PAYLOAD);
        std::fs::remove_file(&path).unwrap();
    }

    #[test]
    fn décode_un_svg() {
        let png = png_bytes(&qr_gray(PAYLOAD, 8));
        let svg = format!(
            r#"<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><image href="data:image/png;base64,{}" width="512" height="512"/></svg>"#,
            base64::engine::general_purpose::STANDARD.encode(png)
        );
        let path = temp_file("qr.svg", svg.as_bytes());
        let imported = import_qr_with_progress(&path, &|_, _| {}).expect("décodage réussi");
        assert_eq!(imported.payload, PAYLOAD);
        assert_eq!(imported.source_kind, "svg");
        std::fs::remove_file(&path).unwrap();
    }

    #[test]
    fn décode_un_pdf() {
        let gray = qr_gray(PAYLOAD, 4);
        let (width, height) = (gray.width(), gray.height());

        let mut doc = lopdf::Document::with_version("1.4");
        let pages_id = doc.new_object_id();
        let image_id = doc.add_object(lopdf::Stream::new(
            dictionary! {
                "Type" => "XObject",
                "Subtype" => "Image",
                "Width" => width as i64,
                "Height" => height as i64,
                "ColorSpace" => "DeviceGray",
                "BitsPerComponent" => 8,
            },
            gray.into_raw(),
        ));
        let content_id = doc.add_object(lopdf::Stream::new(
            dictionary! {},
            format!("q {width} 0 0 {height} 0 0 cm /Im0 Do Q").into_bytes(),
        ));
        let page_id = doc.add_object(dictionary! {
            "Type" => "Page",
            "Parent" => pages_id,
            "Resources" => dictionary! {
                "XObject" => dictionary! { "Im0" => image_id },
            },
            "Contents" => content_id,
        });
        doc.objects.insert(
            pages_id,
            lopdf::Object::Dictionary(dictionary! {
                "Type" => "Pages",
                "Kids" => vec![lopdf::Object::Reference(page_id)],
                "Count" => 1,
            }),
        );
        let catalog_id = doc.add_object(dictionary! {
            "Type" => "Catalog",
            "Pages" => pages_id,
        });
        doc.trailer.set("Root", catalog_id);

        let mut bytes = Vec::new();
        doc.save_to(&mut bytes).unwrap();
        let path = temp_file("qr.pdf", &bytes);

        let imported = import_qr_with_progress(&path, &|_, _| {}).expect("décodage réussi");
        assert_eq!(imported.payload, PAYLOAD);
        assert_eq!(imported.source_kind, "pdf");
        std::fs::remove_file(&path).unwrap();
    }
}
