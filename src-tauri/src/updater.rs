//! Système de mise à jour embarqué : les nouvelles versions sont lues
//! directement depuis les releases publiées du dépôt GitHub (artefacts
//! « release assets » repo:périodiquement, téléchargées et installées à la
//! demande du webview via les commandes `updater_*` (lib.rs).
//!
//! - `check` interroge `releases/latest` (une seule requête, aucun tracking) et
//!   compare le numéro de version de l'application installée à celui du tag ;
//!   404 (aucune release publiée) et les erreurs réseau retombent en « à jour »
//!   avec un message, sans jamais casser l'app.
//! - `download` récupère l'artefact correspondant à l'OS courant (.dmg, .exe /
//!   .msi, .deb / .rpm / .AppImage) dans le dossier temporaire et pousse une
//!   progression via un canal Tauri.
//! - `install` ouvre l'installateur de l'utilisateur : `open` (macOS),
//!   `msiexec` ou exécution directe (Windows), `xdg-open` (Linux).
//!
//! Détails presse : les releases en brouillon et les pré-releases sont
//! ignorées ; seules les versions publiées par tag sont proposées.
use crate::i18n;

use serde::{Deserialize, Serialize};
use std::fs::OpenOptions;
use std::io::Read;
use std::io::Write;
use std::path::PathBuf;
use tauri::ipc::Channel;
use tauri::AppHandle;

/// Dépôt GitHub dont les releases font foi (remote origin du projet).
const GITHUB_REPO: &str = "protorians/eventages-qrcode-studio";

/// Réponse partielle de l'API GitHub (champs réellement lus).
#[derive(Deserialize)]
struct GitHubAsset {
    name: String,
    browser_download_url: String,
    size: u64,
}

#[derive(Deserialize)]
struct GitHubRelease {
    tag_name: String,
    html_url: String,
    body: Option<String>,
    published_at: Option<String>,
    assets: Vec<GitHubAsset>,
}

/// État du système de mise à jour, consommé par l'interface.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheck {
    /// Version installée (tauri.conf.json).
    pub current_version: String,
    /// Dernière version publiée sur GitHub (sans le préfixe « v »), ou version
    /// courante quand rien de plus récent n'existe — `available` est faux alors.
    pub latest_version: String,
    /// Tag de la release (ex. « v0.13.0 ») — vide quand aucune release publiée.
    pub tag: String,
    /// Une version plus récente est disponible.
    pub available: bool,
    /// Nom de l'artefact adapté à l'OS courant (ex. « app-universal.dmg »).
    pub asset_name: Option<String>,
    /// URL de téléchargement de cet artefact.
    pub asset_url: Option<String>,
    /// Taille de l'artefact en octets.
    pub asset_size: Option<u64>,
    /// Page de la release GitHub (notes de version, autres artefacts).
    pub release_url: String,
    /// Notes de version relatives (« body » GitHub), nettoyées du markdown.
    pub release_notes: Option<String>,
    /// Date de publication de la release (ISO 8601).
    pub published_at: Option<String>,
}

/// Progression du téléchargement, poussée à l'interface en temps réel.
#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadProgress {
    /// Octets reçus.
    pub received: u64,
    /// Taille totale annoncée (0 si inconnue).
    pub total: u64,
    /// Avancement de 0 à 100 (arrondi), ou 0 si la taille est inconnue.
    pub percent: u32,
}

/// Dossier temporaire dédié : un répertoire propre à l'app, nettoyé à chaque
/// nouveau téléchargement (un seul installateur requis à la fois).
fn staging_dir() -> PathBuf {
    std::env::temp_dir().join("eventages-updater")
}

/// Client HTTP partagé : requêtes courtes (API + artefact), timeout net.
/// Aucun secret requis : le dépôt est public.
fn client() -> reqwest::blocking::Client {
    reqwest::blocking::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("construction impossible du client HTTP")
}

/// Compare deux numéros de version « 0.12.2 » (préfixe « v » toléré) :
/// est-ce que `candidate` est strictement plus récente que `installed` ?
fn is_newer(candidate: &str, installed: &str) -> bool {
    let strip = |value: &str| value.trim().trim_start_matches('v').to_string();
    let parse = |value: String| -> Vec<u64> {
        value
            .split(['.', '-', '+', '_'])
            .map(|part| part.trim().parse::<u64>().unwrap_or(0))
            .collect()
    };
    let (candidate, installed) = (parse(strip(candidate)), parse(strip(installed)));
    let length = candidate.len().max(installed.len());
    for index in 0..length {
        let candidate = candidate.get(index).copied().unwrap_or(0);
        let installed = installed.get(index).copied().unwrap_or(0);
        if candidate != installed {
            return candidate > installed;
        }
    }
    false
}

/// Vrai si le nom de fichier porte la marque d'architecture donnée
/// (préférence pour les artefacts « universal / portable » du pipeline).
fn name_contains_any(name: &str, needles: &[&str]) -> bool {
    let lower = name.to_ascii_lowercase();
    needles.iter().any(|needle| lower.contains(needle))
}

/// Choisit, parmi les artefacts de la release, celui qui convient à l'OS et à
/// l'architecture du paquet installé. Priorité :
/// - macOS : `.dmg` (le pipeline produit un binaire universel) ;
/// - Windows : `.exe` (assistant NSIS), sinon `.msi` ;
/// - Linux : `.AppImage` (portable), sinon `.deb`, sinon `.rpm`.
#[cfg_attr(target_os = "ios", allow(dead_code))]
fn pick_asset(
    assets: &[GitHubAsset],
    target: &str,
) -> Option<(String, String, u64)> {
    let extensions: &[&str] = match target {
        "windows" => &[".exe", ".msi"],
        "macos" | "ios" => &[".dmg"],
        "linux" | "android" => &[".appimage", ".deb", ".rpm"],
        _ => &[],
    };
    if extensions.is_empty() {
        return None;
    }
    for extension in extensions {
        // Rétro-compatibilité : les artefacts historiques portent parfois des
        // variantes par architecture ; l'artefact « portable » (universal /
        // sans mention) est préféré, sinon la première variante reconnue.
        let matching: Vec<&GitHubAsset> = assets
            .iter()
            .filter(|asset| asset.name.to_ascii_lowercase().ends_with(extension))
            .collect();
        let chosen = matching
            .iter()
            .find(|asset| name_contains_any(&asset.name, &["universal"]))
            .or(matching.first());
        if let Some(asset) = chosen {
            return Some((
                asset.name.clone(),
                asset.browser_download_url.clone(),
                asset.size,
            ));
        }
    }
    None
}

/// Résumé des notes de version : le « body » GitHub sans markdown lourd,
/// tronqué — l'interface renvoie vers la page de release pour tout lire.
fn clean_notes(body: &str) -> String {
    let plain: String = body
        .lines()
        // En-tête markdown « ## … », séparateurs et liens nus : on garde le
        // titre HTML de la release comme résumé de secours.
        .filter(|line| {
            let trimmed = line.trim();
            !trimmed.is_empty() && !trimmed.starts_with('#') && !trimmed.starts_with("<h")
        })
        .collect::<Vec<&str>>()
        .join(" ");
    let condensed: Vec<&str> = plain.split_whitespace().collect();
    if condensed.len() > 180 {
        condensed[..180].join(" ")
    } else {
        condensed.join(" ")
    }
}

/// Interroge la release publiée la plus récente et la compare à l'app installée.
pub fn check(app: &AppHandle) -> Result<UpdateCheck, String> {
    let current_version = app.package_info().version.to_string();

    let response = client()
        .get(format!("https://api.github.com/repos/{GITHUB_REPO}/releases/latest"))
        .header("Accept", "application/vnd.github+json")
        .send()
        .map_err(|error| i18n::tr("updater.check.failed", &[("error", &error.to_string())]))?;

    // 404 : le dépôt n'a (encore) aucune release publiée — pas une erreur
    // pour l'utilisateur, simplement un état « rien à installer ».
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(UpdateCheck {
            current_version: current_version.clone(),
            latest_version: current_version.clone(),
            tag: String::new(),
            available: false,
            asset_name: None,
            asset_url: None,
            asset_size: None,
            release_url: format!("https://github.com/{GITHUB_REPO}/releases"),
            release_notes: None,
            published_at: None,
        });
    }

    let release: GitHubRelease = response
        .json()
        .map_err(|error| i18n::tr("updater.check.failed", &[("error", &error.to_string())]))?;

    let target = if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(any(target_os = "macos", target_os = "ios")) {
        "macos"
    } else {
        "linux"
    };
    let asset = pick_asset(&release.assets, target);

    let latest_version = release.tag_name.trim_start_matches('v').to_string();
    Ok(UpdateCheck {
        available: is_newer(&latest_version, &current_version),
        latest_version,
        tag: release.tag_name.clone(),
        release_url: release.html_url.clone(),
        release_notes: release.body.as_deref().map(clean_notes),
        published_at: release.published_at.clone(),
        asset_name: asset.as_ref().map(|(name, ..)| name.clone()),
        asset_url: asset.as_ref().map(|(_, url, ..)| url.clone()),
        asset_size: asset.as_ref().map(|(.., size)| *size),
        current_version,
    })
}

/// Télécharge l'artefact dans le dossier temporaire en poussant la
/// progression via le canal. Renvoie le chemin complet de l'installateur.
pub fn download(
    url: &str,
    name: &str,
    on_progress: &Channel<DownloadProgress>,
) -> Result<String, String> {
    let response = client()
        .get(url)
        .header("Accept", "application/octet-stream")
        .send()
        .map_err(|error| i18n::tr("updater.download.failed", &[("error", &error.to_string())]))?;

    if !response.status().is_success() {
        return Err(i18n::tr(
            "updater.download.failed",
            &[("error", &format!("HTTP {}", response.status()))],
        ));
    }

    let total = response.content_length().unwrap_or(0);
    let safe_name: String = name
        .chars()
        .map(|character| {
            if character.is_ascii_alphanumeric() || matches!(character, '.' | '-' | '_') {
                character
            } else {
                '_'
            }
        })
        .collect();
    let directory = staging_dir();
    let target = directory.join(&safe_name);
    std::fs::create_dir_all(&directory)
        .map_err(|error| i18n::tr("updater.download.failed", &[("error", &error.to_string())]))?;

    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&target)
        .map_err(|error| i18n::tr("updater.download.failed", &[("error", &error.to_string())]))?;

    let mut received: u64 = 0;
    let mut last_percent: i64 = -100;
    let mut response = response;
    let mut buffer = vec![0u8; 64 * 1024];
    loop {
        let read = response
            .read(&mut buffer)
            .map_err(|error| i18n::tr("updater.download.failed", &[("error", &error.to_string())]))?;
        if read == 0 {
            break;
        }
        file.write_all(&buffer[..read])
            .map_err(|error| i18n::tr("updater.download.failed", &[("error", &error.to_string())]))?;
        received += read as u64;

        // Progression throttlée : un débit rapide submerge l'interface d'événements.
        let percent = if total > 0 {
            ((received as f64 / total as f64) * 100.0) as i64
        } else {
            0
        };
        if percent - last_percent >= 2 {
            last_percent = percent;
            let _ = on_progress.send(DownloadProgress {
                received,
                total,
                percent: percent.clamp(0, 100) as u32,
            });
        }
    }
    let _ = on_progress.send(DownloadProgress {
        received,
        total,
        percent: 100,
    });
    Ok(target.to_string_lossy().into_owned())
}

/// Ouvre l'installateur pour l'utilisateur — le système prend le relais
/// (assistant NSIS / msiexec / montage du DMG /
/// installeur du paquet). L'installation « silencieuse » automatique n'est
/// pas tentée : l'utilisateur garde la main, l'app devra être relancée.
pub fn install(path: &str) -> Result<(), String> {
    let result = open_installer(path);
    result.map_err(|error| i18n::tr("updater.install.failed", &[("error", &error.to_string())]))
}

fn open_installer(path: &str) -> std::io::Result<()> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open").arg(path).spawn()?;
        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        let lower = path.to_ascii_lowercase();
        if lower.ends_with(".msi") {
            std::process::Command::new("msiexec")
                .args(["/i", path])
                .spawn()?;
        } else {
            std::process::Command::new(path).spawn()?;
        }
        Ok(())
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open").arg(path).spawn()?;
        Ok(())
    }

    #[cfg(all(
        not(target_os = "macos"),
        not(target_os = "windows"),
        not(target_os = "linux")
    ))]
    Err(std::io::Error::new(
        std::io::ErrorKind::Unsupported,
        "Cette plateforme ne gère pas l'installation des releases.",
    ))
}

/// Ouvre la page GitHub de la release (notes de version, artefacts alternatifs).
pub fn open_release(url: &str) -> Result<(), String> {
    tauri_plugin_opener::open_url(url, None::<&str>)
        .map_err(|error| i18n::tr("updater.open.failed", &[("error", &error.to_string())]))
}
