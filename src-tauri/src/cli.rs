//! Mise à disposition du CLI `eventages-qr` : crée (ou retire) dans un dossier
//! du PATH les liens symboliques `eventages-qr` et `eqr`, pointant vers
//! le script du dépôt (`cli/eventages-qr.ts`, shebang `bun`). Aucun réseau,
//! aucune copie de binaire : désinstaller revient à supprimer les liens. Le
//! reste de la machine est inchangé — un fichier réel déjà en place est refusé,
//! jamais écrasé.

use serde::Serialize;
use std::path::{Path, PathBuf};

/// Commandes exposées : le nom complet et son alias court, même script.
const COMMANDS: [&str; 2] = ["eventages-qr", "eqr"];

/// État de disponibilité du CLI, consommé par la section « CLI » des paramètres.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CliStatus {
    /// Le script CLI du dépôt est présent (app lancée depuis le dépôt).
    pub available: bool,
    /// Les deux commandes sont posées dans le dossier du PATH.
    pub installed: bool,
    /// Chemin du script source, si disponible.
    pub script_path: Option<String>,
    /// Dossier du PATH où les commandes sont (ou seraient) posées.
    pub bin_dir: Option<String>,
    /// Noms de commande exposés.
    pub commands: Vec<&'static str>,
    /// Message lisible expliquant l'état ou l'échec.
    pub message: String,
}

/// État courant, sans effet de bord : lu à l'ouverture des paramètres.
pub fn status() -> CliStatus {
    let script = script_path();
    let bin = bin_dir();
    let installed = bin
        .as_ref()
        .is_some_and(|dir| COMMANDS.iter().all(|name| is_linked(&dir.join(name))));

    let message = if bin.is_none() {
        "La mise à disposition du CLI n'est pas prise en charge sur ce système.".to_string()
    } else if script.is_none() && installed {
        "Commandes posées, mais le script source est introuvable : lancez l'app depuis le dépôt du projet.".to_string()
    } else if script.is_none() {
        "CLI indisponible : lancez l'app depuis le dépôt du projet pour installer les commandes."
            .to_string()
    } else if installed {
        format!(
            "Commandes disponibles dans {} : {}",
            bin.as_ref().unwrap().to_string_lossy(),
            COMMANDS.join(", ")
        )
    } else {
        "Commandes absentes du PATH : activez la disponibilité pour les installer.".to_string()
    };

    CliStatus {
        available: script.is_some(),
        installed,
        script_path: script.as_ref().map(|path| path.to_string_lossy().into_owned()),
        bin_dir: bin.as_ref().map(|path| path.to_string_lossy().into_owned()),
        commands: COMMANDS.to_vec(),
        message,
    }
}

/// Crée les liens de commande (remplace un lien existant, refuse un fichier réel).
pub fn install() -> Result<CliStatus, String> {
    let script = script_path()
        .ok_or_else(|| "Script CLI introuvable : lancez l'app depuis le dépôt du projet.".to_string())?;
    let dir = bin_dir()
        .ok_or_else(|| "La mise à disposition du CLI n'est pas prise en charge sur ce système.".to_string())?;
    std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
    make_executable(&script)?;
    place_links(&dir, &script)?;
    Ok(status())
}

/// Retire les liens de commande posés par `install` — jamais un fichier réel.
pub fn uninstall() -> Result<CliStatus, String> {
    if let Some(dir) = bin_dir() {
        remove_links(&dir)?;
    }
    Ok(status())
}

/// Script CLI du dépôt : le binaire est compilé depuis `src-tauri`, donc le
/// dépôt est le dossier parent du manifeste Cargo (chemin figé à la compile —
/// absent d'une app empaquetée installée ailleurs, d'où l'état « indisponible »).
fn script_path() -> Option<PathBuf> {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()?
        .join("cli")
        .join("eventages-qr.ts");
    path.is_file().then_some(path)
}

/// Dossier d'installation dans le PATH : `/usr/local/bin` sur macOS (groupe
/// admin, convention des outils installés par l'utilisateur), `~/.local/bin`
/// ailleurs sur Unix.
#[cfg(target_os = "macos")]
fn bin_dir() -> Option<PathBuf> {
    Some(PathBuf::from("/usr/local/bin"))
}

#[cfg(all(unix, not(target_os = "macos")))]
fn bin_dir() -> Option<PathBuf> {
    std::env::var_os("HOME").map(|home| Path::new(&home).join(".local").join("bin"))
}

#[cfg(windows)]
fn bin_dir() -> Option<PathBuf> {
    None
}

/// Vrai si le chemin est un lien symbolique vers un `eventages-qr.ts`
/// (cible par nom de fichier : le dépôt peut avoir été déplacé).
#[cfg(unix)]
fn is_linked(link: &Path) -> bool {
    std::fs::read_link(link)
        .map(|target| target.file_name().is_some_and(|name| name == "eventages-qr.ts"))
        .unwrap_or(false)
}

#[cfg(windows)]
fn is_linked(_link: &Path) -> bool {
    false
}

/// Rend le script exécutable (le shebang `bun` est évalué par le noyau).
#[cfg(unix)]
fn make_executable(script: &Path) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    let mut permissions = std::fs::metadata(script)
        .map_err(|error| error.to_string())?
        .permissions();
    permissions.set_mode(0o755);
    std::fs::set_permissions(script, permissions).map_err(|error| error.to_string())
}

/// Pose les liens : un lien existant est remplacé, un fichier réel est refusé.
#[cfg(unix)]
fn place_links(dir: &Path, script: &Path) -> Result<(), String> {
    use std::os::unix::fs::symlink;

    for name in COMMANDS {
        let link = dir.join(name);
        match std::fs::symlink_metadata(&link) {
            Ok(metadata) => {
                if !metadata.file_type().is_symlink() {
                    return Err(format!(
                        "« {} » existe déjà et n'est pas un lien : laissez-le en place.",
                        link.to_string_lossy()
                    ));
                }
                std::fs::remove_file(&link).map_err(|error| error.to_string())?;
            }
            // Absent : rien à nettoyer. Toute autre erreur remonte.
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.to_string()),
        }
        symlink(script, &link).map_err(|error| error.to_string())?;
    }
    Ok(())
}

/// Retire uniquement les liens qui pointent vers le script du CLI.
#[cfg(unix)]
fn remove_links(dir: &Path) -> Result<(), String> {
    for name in COMMANDS {
        let link = dir.join(name);
        if is_linked(&link) {
            std::fs::remove_file(&link).map_err(|error| error.to_string())?;
        }
    }
    Ok(())
}

#[cfg(windows)]
fn make_executable(_script: &Path) -> Result<(), String> {
    Ok(())
}

#[cfg(windows)]
fn place_links(_dir: &Path, _script: &Path) -> Result<(), String> {
    Err("La mise à disposition du CLI n'est pas prise en charge sur ce système.".to_string())
}

#[cfg(windows)]
fn remove_links(_dir: &Path) -> Result<(), String> {
    Err("La mise à disposition du CLI n'est pas prise en charge sur ce système.".to_string())
}

#[cfg(all(test, unix))]
mod tests {
    use super::*;

    /// Aller-retour des liens dans un dossier temporaire : pose, détection,
    /// retrait — sans toucher au dossier du PATH.
    #[test]
    fn links_roundtrip() {
        let script = script_path().expect("script CLI du dépôt présent en test");
        let dir = std::env::temp_dir().join("eventages-qr-cli-links-test");
        // Repart d'un dossier vide, puis le garde pour toute la durée du test.
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).expect("dossier temporaire");

        // Rien de posé avant installation.
        assert!(!is_linked(&dir.join("eventages-qr")));
        assert!(!is_linked(&dir.join("eqr")));

        place_links(&dir, &script).expect("pose des liens");
        assert!(is_linked(&dir.join("eventages-qr")));
        assert!(is_linked(&dir.join("eqr")));

        // Re-pose : remplace les liens existants sans erreur.
        place_links(&dir, &script).expect("re-pose idempotente");

        // Un fichier réel bloque plutôt que d'être écrasé.
        let busy = dir.join("eventages-qr");
        std::fs::remove_file(&busy).expect("retrait du lien");
        std::fs::write(&busy, b"not a link").expect("fichier réel");
        assert!(place_links(&dir, &script).is_err());
        std::fs::remove_file(&busy).expect("retrait du fichier réel");

        // Désinstallation : plus rien.
        remove_links(&dir).expect("retrait des liens");
        assert!(!is_linked(&dir.join("eventages-qr")));
        assert!(!is_linked(&dir.join("eqr")));
        std::fs::remove_dir_all(&dir).expect("nettoyage");
    }
}
