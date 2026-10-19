mod import;
mod qcp;
mod share;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            share_image,
            save_project_qcp,
            open_project_qcp,
            import_qr_from_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Ouvre le partage natif du système pour une image rendue côté interface.
/// Renvoie la méthode utilisée : `sheet` (menu de partage) ou `reveal` (fichier).
#[tauri::command]
fn share_image(
    window: tauri::WebviewWindow,
    name: String,
    data_base64: String,
) -> Result<String, String> {
    share::share_image(&window, &name, &data_base64)
}

/// Écrit le projet actif dans un fichier `.qcp` (archive zip : manifest.json
/// + dossier assets/). Renvoie le chemin réel utilisé.
#[tauri::command]
fn save_project_qcp(
    path: String,
    manifest: String,
    assets: Vec<qcp::AssetInput>,
) -> Result<String, String> {
    qcp::save_project(&path, &manifest, &assets)?;
    Ok(path)
}

/// Lit un fichier `.qcp` et renvoie le manifeste plus les fichiers média.
#[tauri::command]
fn open_project_qcp(path: String) -> Result<qcp::QcpContents, String> {
    qcp::open_project(&path)
}

/// Décode un QR code existant depuis une image, un SVG ou un PDF, entièrement
/// en local. Renvoie le contenu encodé et le niveau de correction détecté.
#[tauri::command]
fn import_qr_from_file(path: String) -> Result<import::QrImport, String> {
    import::import_qr(&path)
}
