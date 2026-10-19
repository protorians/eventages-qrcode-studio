mod share;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![share_image])
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
