//! Import d'un QR code existant : l'utilisateur fournit une image (PNG, JPEG,
//! WebP, GIF, BMP, TIFF), un fichier vectoriel SVG ou un PDF ; le backend le
//! décode nativement — aucun réseau — et renvoie le contenu encodé plus le
//! niveau de correction d'erreur détecté.
//!
//! - Images : décodage direct après aplani­ssement sur fond blanc.
//! - SVG : rasterisation hors ligne (usvg + resvg) puis décodage.
//! - PDF : extraction des images embarquées (JPEG ou échantillons bruts),
//!   de la plus grande à la plus petite, puis décodage.

use image::DynamicImage;
use serde::Serialize;

/// Résultat d'un import réussi.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QrImport {
    pub payload: String,
    /// Niveau de correction détecté : « L », « M », « Q » ou « H ».
    pub error_correction: Option<String>,
    /// Origine du décodage : « image », « svg » ou « pdf ».
    pub source_kind: String,
}

struct Decoded {
    payload: String,
    ecc_level: u16,
}

/// Dimension de rendu cible pour la détection.
const DECODE_TARGET: u32 = 1024;
/// Au-delà, l'image est réduite avant détection.
const MAX_DIMENSION: u32 = 2400;
/// Plafond de décompression d'un flux PDF (défense contre les bombes).
const MAX_PDF_DECOMPRESS: usize = 128 * 1024 * 1024;
/// Nombre maximal d'images PDF à essayer.
const MAX_PDF_CANDIDATES: usize = 8;

pub fn import_qr(path: &str) -> Result<QrImport, String> {
    let bytes =
        std::fs::read(path).map_err(|error| format!("Lecture du fichier impossible : {error}"))?;
    if bytes.is_empty() {
        return Err("Fichier vide : aucun QR code à décoder.".to_string());
    }

    match detect_kind(&bytes, path) {
        SourceKind::Svg => import_svg(&bytes),
        SourceKind::Pdf => import_pdf(&bytes),
        SourceKind::Image => import_image(&bytes),
    }
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
// Décodage QR
// ---------------------------------------------------------------------------

/// Tente le décodage, puis réessaie en négatif (QR clair sur fond sombre).
fn try_decode(gray: image::GrayImage) -> Option<Decoded> {
    if let Some(decoded) = decode_once(gray.clone()) {
        return Some(decoded);
    }
    let inverted = image::ImageBuffer::from_fn(gray.width(), gray.height(), |x, y| {
        let mut value = gray.get_pixel(x, y).0;
        value[0] = 255 - value[0];
        image::Luma(value)
    });
    decode_once(inverted)
}

fn decode_once(gray: image::GrayImage) -> Option<Decoded> {
    let mut prepared = rqrr::PreparedImage::prepare(gray);
    for grid in prepared.detect_grids() {
        if let Ok((meta, payload)) = grid.decode() {
            return Some(Decoded {
                payload,
                ecc_level: meta.ecc_level,
            });
        }
    }
    None
}

/// Aplatit sur fond blanc puis convertit en niveaux de gris (Rec. 601).
fn flatten_to_gray(image: &DynamicImage) -> image::GrayImage {
    let rgba = image.to_rgba8();
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

/// Pipeline complet : cadrage, aplani­ssement, détection (avec retentes).
fn decode_dynamic(image: DynamicImage) -> Option<Decoded> {
    let gray = flatten_to_gray(&cap_dimension(image));
    if let Some(decoded) = try_decode(gray.clone()) {
        return Some(decoded);
    }
    // Les petites images (QR extraits d'un PDF) gagnent à être agrandies.
    let largest = gray.width().max(gray.height());
    if largest < 400 {
        let scale = 400.0 / largest as f64;
        let upscaled_width = ((gray.width() as f64 * scale).round().max(1.0)) as u32;
        let upscaled_height = ((gray.height() as f64 * scale).round().max(1.0)) as u32;
        let upscaled = DynamicImage::ImageLuma8(gray).resize_exact(
            upscaled_width,
            upscaled_height,
            image::imageops::FilterType::Nearest,
        );
        return try_decode(upscaled.to_luma8());
    }
    None
}

fn no_qr_found() -> String {
    "Aucun QR code détecté. Vérifiez que le QR est net, non rogné et suffisamment grand."
        .to_string()
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

fn to_import(decoded: Decoded, source_kind: &str) -> QrImport {
    QrImport {
        payload: decoded.payload,
        error_correction: error_correction_label(decoded.ecc_level),
        source_kind: source_kind.to_string(),
    }
}

// ---------------------------------------------------------------------------
// Images matricielles
// ---------------------------------------------------------------------------

fn import_image(bytes: &[u8]) -> Result<QrImport, String> {
    let image = image::load_from_memory(bytes)
        .map_err(|_| "Image illisible : format non pris en charge.".to_string())?;
    decode_dynamic(image)
        .map(|decoded| to_import(decoded, "image"))
        .ok_or_else(no_qr_found)
}

// ---------------------------------------------------------------------------
// SVG : rasterisation hors ligne puis décodage
// ---------------------------------------------------------------------------

fn import_svg(bytes: &[u8]) -> Result<QrImport, String> {
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

    let rgba = image::RgbaImage::from_fn(out_width, out_height, |x, y| {
        match pixmap.pixel(x, y) {
            Some(color) => {
                let color = color.demultiply();
                image::Rgba([color.red(), color.green(), color.blue(), color.alpha()])
            }
            None => image::Rgba([255, 255, 255, 255]),
        }
    });

    decode_dynamic(DynamicImage::ImageRgba8(rgba))
        .map(|decoded| to_import(decoded, "svg"))
        .ok_or_else(no_qr_found)
}

// ---------------------------------------------------------------------------
// PDF : extraction des images embarquées puis décodage
// ---------------------------------------------------------------------------

fn import_pdf(bytes: &[u8]) -> Result<QrImport, String> {
    let doc = lopdf::Document::load_mem(bytes)
        .map_err(|_| "PDF illisible : le fichier est corrompu.".to_string())?;

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

    for (id, _) in candidates.into_iter().take(MAX_PDF_CANDIDATES) {
        let Some(image) = extract_pdf_image(&doc, id) else {
            continue;
        };
        if let Some(decoded) = decode_dynamic(image) {
            return Ok(to_import(decoded, "pdf"));
        }
    }
    Err("Aucun QR code détecté dans les images de ce PDF.".to_string())
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
        let imported = import_qr(&path).expect("décodage réussi");
        assert_eq!(imported.payload, PAYLOAD);
        assert_eq!(imported.error_correction.as_deref(), Some("Q"));
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
        let imported = import_qr(&path).expect("décodage réussi");
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
        let imported = import_qr(&path).expect("décodage réussi");
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

        let imported = import_qr(&path).expect("décodage réussi");
        assert_eq!(imported.payload, PAYLOAD);
        assert_eq!(imported.source_kind, "pdf");
        std::fs::remove_file(&path).unwrap();
    }
}
