//! Export local : écrit le fichier rendu côté interface (image ou SVG) à
//! l'emplacement choisi via le dialogue natif. Aucun serveur.
use crate::i18n;

use base64::Engine as _;

/// Écrit les octets (base64) du rendu exporté à l'emplacement transmis.
/// Renvoie le chemin réel utilisé.
pub fn save_file(path: &str, data_base64: &str) -> Result<String, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_base64.trim())
        .map_err(|_| i18n::tr("export.badBase64", &[]))?;
    if bytes.is_empty() {
        return Err(i18n::tr("export.empty", &[]));
    }
    std::fs::write(path, &bytes).map_err(|error| error.to_string())?;
    Ok(path.to_string())
}
