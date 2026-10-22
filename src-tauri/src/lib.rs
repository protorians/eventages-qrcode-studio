mod cli;
mod export;
mod i18n;
mod import;
mod import_design;
mod qcp;
mod share;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            set_ui_locale,
            share_image,
            save_project_qcp,
            open_project_qcp,
            import_qr_from_file,
            save_export_file,
            cli_status,
            cli_install,
            cli_uninstall
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Pose la langue de l'interface, utilisée pour traduire les messages
/// renvoyés au webview (catalogue src-tauri/src/i18n.rs). Appelée par
/// l'I18nProvider au démarrage, puis à chaque changement de langue.
#[tauri::command]
fn set_ui_locale(locale: String) {
    i18n::set_locale(&locale);
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

/// Écrit le projet actif dans un fichier `.qrd` (archive zip : manifest.json
/// + dossier assets/). Renvoie le chemin réel utilisé. Traitement hors thread
/// principal : les médias volumineux ne doivent pas geler la fenêtre.
#[tauri::command]
async fn save_project_qcp(
    path: String,
    manifest: String,
    assets: Vec<qcp::AssetInput>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || qcp::save_project(&path, &manifest, &assets))
        .await
        .map_err(|error| i18n::tr("cmd.save.interrupted", &[("error", &error.to_string())]))?
}

/// Lit un fichier `.qrd` et renvoie le manifeste plus les fichiers média.
/// Traitement hors thread principal (déchiffrement zip + base64 lourds).
#[tauri::command]
async fn open_project_qcp(path: String) -> Result<qcp::QcpContents, String> {
    tauri::async_runtime::spawn_blocking(move || qcp::open_project(&path))
        .await
        .map_err(|error| i18n::tr("cmd.open.interrupted", &[("error", &error.to_string())]))?
}

/// Décode un QR code ou un code-barres existant depuis une image, un SVG ou
/// un PDF, entièrement en local. Renvoie le contenu encodé, le format détecté
/// et le niveau de correction ; la progression est poussée sur le canal.
///
/// La commande est `async` et le travail part sur `spawn_blocking` : une
/// commande synchrone s'exécuterait sur le thread principal et gèlerait la
/// fenêtre pendant tout le décodage.
#[tauri::command]
async fn import_qr_from_file(
    path: String,
    on_progress: tauri::ipc::Channel<import::ImportProgress>,
) -> Result<import::QrImport, String> {
    let decoded = tauri::async_runtime::spawn_blocking(move || {
        import::import_qr(&path, &on_progress)
    })
    .await;
    match decoded {
        Ok(result) => result,
        Err(error) => Err(i18n::tr("cmd.import.interrupted", &[("error", &error.to_string())])),
    }
}

/// Écrit le fichier exporté (image ou SVG) à l'emplacement choisi côté
/// interface : le webview ne sait pas télécharger par ancre `blob:`.
/// Traitement hors thread principal (fichiers potentiellement volumineux).
#[tauri::command]
async fn save_export_file(path: String, data_base64: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || export::save_file(&path, &data_base64))
        .await
        .map_err(|error| i18n::tr("cmd.export.interrupted", &[("error", &error.to_string())]))?
}

/// État de disponibilité du CLI `eventages-qr` (script source, liens posés).
#[tauri::command]
fn cli_status() -> cli::CliStatus {
    cli::status()
}

/// Installe les commandes `eventages-qr` et `eqr` dans le PATH.
#[tauri::command]
fn cli_install() -> Result<cli::CliStatus, String> {
    cli::install()
}

/// Retire les commandes `eventages-qr` et `eqr` du PATH.
#[tauri::command]
fn cli_uninstall() -> Result<cli::CliStatus, String> {
    cli::uninstall()
}
