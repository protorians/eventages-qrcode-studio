//! Partage natif : l'image générée côté interface est déposée dans un fichier
//! temporaire, puis le menu de partage du système prend le relais — macOS ouvre
//! la feuille de partage (`NSSharingServicePicker`), les autres plateformes
//! révèlent le fichier dans le gestionnaire de fichiers. Aucun serveur.

use base64::Engine as _;

/// Écrit l'image dans un fichier temporaire et déclenche le partage natif.
/// Renvoie la méthode utilisée : `"sheet"` (menu de partage) ou `"reveal"`.
pub fn share_image(
    window: &tauri::WebviewWindow,
    name: &str,
    data_base64: &str,
) -> Result<String, String> {
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_base64.trim())
        .map_err(|_| "Image illisible : base64 invalide.".to_string())?;
    if bytes.is_empty() {
        return Err("Image vide : le rendu a échoué.".to_string());
    }

    let file_path = temp_file_path(name)?;
    std::fs::write(&file_path, bytes).map_err(|error| error.to_string())?;

    #[cfg(target_os = "macos")]
    {
        macos::present_share_sheet(window, file_path)?;
        Ok("sheet".to_string())
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window; // la révélation ne dépend pas de la fenêtre
        tauri_plugin_opener::reveal_item_in_dir(&file_path).map_err(|error| error.to_string())?;
        Ok("reveal".to_string())
    }
}

/// Chemin temporaire sûr : `TMPDIR/qrcode-studio/<nom nettoyé>`.
fn temp_file_path(name: &str) -> Result<std::path::PathBuf, String> {
    let cleaned: String = name
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_') {
                c
            } else {
                '-'
            }
        })
        .collect();
    let cleaned = cleaned.trim_matches('-');
    let file_name = if cleaned.is_empty() {
        "qr-code.png".to_string()
    } else {
        cleaned.to_string()
    };
    let dir = std::env::temp_dir().join("qrcode-studio");
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    Ok(dir.join(file_name))
}

#[cfg(target_os = "macos")]
mod macos {
    use std::path::Path;

    /// Présente la feuille de partage macOS, ancrée à la fenêtre principale.
    /// L'AppKit exige le fil principal : la présentation y est programmée.
    pub fn present_share_sheet(
        window: &tauri::WebviewWindow,
        file_path: std::path::PathBuf,
    ) -> Result<(), String> {
        let handle = window.clone();
        window
            .run_on_main_thread(move || {
                if let Err(error) = show_picker(&handle, &file_path) {
                    eprintln!("Partage natif impossible : {error}");
                }
            })
            .map_err(|error| error.to_string())
    }

    fn show_picker(window: &tauri::WebviewWindow, path: &Path) -> Result<(), String> {
        use objc2::AnyThread;
        use objc2::rc::Retained;
        use objc2::runtime::AnyObject;
        use objc2_app_kit::{NSSharingServicePicker, NSView, NSWindow};
        use objc2_foundation::{NSArray, NSString, NSURL, NSRect, NSRectEdge};

        unsafe {
            let ns_path = NSString::from_str(&path.to_string_lossy());
            let file_url = NSURL::fileURLWithPath(&ns_path);
            let url_ref: &AnyObject = &*(&*file_url as *const NSURL as *const AnyObject);
            let items = NSArray::from_slice(&[url_ref]);

            let picker: Retained<NSSharingServicePicker> =
                NSSharingServicePicker::initWithItems(NSSharingServicePicker::alloc(), &items);

            let window_ptr = window.ns_window().map_err(|error| error.to_string())?;
            let ns_window: &NSWindow = (window_ptr as *mut NSWindow)
                .as_ref()
                .ok_or_else(|| "Fenêtre native introuvable.".to_string())?;
            let content_view: Retained<NSView> = ns_window
                .contentView()
                .ok_or_else(|| "Vue de la fenêtre introuvable.".to_string())?;

            picker.showRelativeToRect_ofView_preferredEdge(
                NSRect::ZERO,
                &content_view,
                NSRectEdge::NSMinYEdge,
            );
            // Le sélecteur reste en vie pendant l'affichage du menu.
            std::mem::forget(picker);
        }
        Ok(())
    }
}
