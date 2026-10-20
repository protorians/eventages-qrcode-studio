//! Export local : écrit le fichier rendu côté interface (image ou SVG) à
//! l'emplacement choisi via le dialogue natif. Aucun serveur.

use base64::Engine as _;

/// Écrit les octets (base64) du rendu exporté à l'emplacement transmis.
/// Renvoie le chemin réel utilisé.
pub fn save_file(path: &str, data_base64: &str) -> Result<String, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_base64.trim())
        .map_err(|_| "Fichier illisible : base64 invalide.".to_string())?;
    if bytes.is_empty() {
        return Err("Export vide : le rendu a échoué.".to_string());
    }
    std::fs::write(path, &bytes).map_err(|error| error.to_string())?;
    Ok(path.to_string())
}
