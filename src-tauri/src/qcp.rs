//! Format de fichier projet « .qcp » : une archive zip contenant un
//! `manifest.json` (tous les paramètres permettant de reconstruire le projet)
//! et un dossier `assets/` avec les fichiers média associés (logo, visuels,
//! documents…). Tout est traité localement, aucun réseau.

use base64::Engine as _;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::io::{Read, Write};

const MANIFEST_NAME: &str = "manifest.json";
const ASSETS_PREFIX: &str = "assets/";
/// Garde-fou : une archive projet ne contient que des actifs raisonnables.
const MAX_ASSETS: usize = 64;
/// Plafond de décompression à la lecture (défense contre les zips piégés).
const MAX_ASSET_BYTES: u64 = 256 * 1024 * 1024;

/// Fichier média à embarquer dans l'archive, tel qu'envoyé par l'interface.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetInput {
    pub path: String,
    pub data_base64: String,
}

/// Fichier média extrait de l'archive, renvoyé à l'interface.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetOutput {
    pub path: String,
    pub data_base64: String,
}

/// Contenu complet d'une archive `.qcp`.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QcpContents {
    pub manifest: String,
    pub assets: Vec<AssetOutput>,
}

/// Valide un chemin d'actif : uniquement `assets/<nom>` à plat, sans remontée
/// ni séparateur exotique — protège contre les archives piégées (zip-slip).
fn sanitize_asset_path(raw: &str) -> Result<String, String> {
    let path = raw.trim();
    if !path.starts_with(ASSETS_PREFIX) || path == ASSETS_PREFIX {
        return Err(format!("Chemin d'actif invalide : {raw:?}"));
    }
    let name = &path[ASSETS_PREFIX.len()..];
    let valid = !name.is_empty()
        && !name.contains(['/', '\\'])
        && !name.contains("..")
        && !name.starts_with('.')
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | '_' | ' '));
    if !valid {
        return Err(format!("Chemin d'actif invalide : {raw:?}"));
    }
    Ok(path.to_string())
}

/// Écrit l'archive `.qcp` : `manifest.json` puis les actifs sous `assets/`.
pub fn save_project(path: &str, manifest: &str, assets: &[AssetInput]) -> Result<(), String> {
    if assets.len() > MAX_ASSETS {
        return Err(format!(
            "Trop de fichiers média ({}) : la limite est de {MAX_ASSETS}.",
            assets.len()
        ));
    }
    // Le manifeste doit être du JSON valide : on refuse d'écrire une archive
    // que l'application ne saurait pas rouvrir.
    serde_json::from_str::<serde_json::Value>(manifest)
        .map_err(|_| "Manifeste du projet invalide (JSON illisible).".to_string())?;

    // Extension imposée, même si la boîte de dialogue a été contournée.
    let mut target = std::path::PathBuf::from(path);
    if !target.to_string_lossy().to_lowercase().ends_with(".qcp") {
        let mut name = target.as_os_str().to_owned();
        name.push(".qcp");
        target = std::path::PathBuf::from(name);
    }

    let file = std::fs::File::create(&target)
        .map_err(|error| format!("Création du fichier projet impossible : {error}"))?;
    let mut zip = zip::ZipWriter::new(std::io::BufWriter::new(file));
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let mut write_entry = |name: &str, data: &[u8]| -> Result<(), String> {
        zip.start_file(name, options.clone())
            .map_err(|error| format!("Écriture de l'archive impossible : {error}"))?;
        zip.write_all(data)
            .map_err(|error| format!("Écriture de l'archive impossible : {error}"))
    };

    write_entry(MANIFEST_NAME, manifest.as_bytes())?;

    let mut seen = BTreeMap::new();
    for asset in assets {
        let asset_path = sanitize_asset_path(&asset.path)?;
        let data = base64::engine::general_purpose::STANDARD
            .decode(asset.data_base64.trim())
            .map_err(|_| format!("Fichier média illisible (base64 invalide) : {asset_path}"))?;
        if seen.insert(asset_path.clone(), data).is_some() {
            return Err(format!("Fichier média dupliqué dans l'archive : {asset_path}"));
        }
    }
    for (asset_path, data) in &seen {
        write_entry(asset_path, data)?;
    }

    zip.finish()
        .map_err(|error| format!("Fermeture de l'archive impossible : {error}"))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_MANIFEST: &str = r#"{
        "format": "qcp",
        "version": 1,
        "app": "qrcode-studio",
        "savedAt": 1760000000000,
        "project": {
            "name": "Menu du soir",
            "typeId": "url",
            "valuesByType": { "url": { "url": "https://exemple.com/menu" } },
            "design": { "frameId": "f13" },
            "mockupId": "poster",
            "saveSize": 2048
        },
        "assets": []
    }"#;

    fn temp_path(name: &str) -> String {
        std::env::temp_dir()
            .join(format!("qcp-test-{}-{name}", std::process::id()))
            .to_string_lossy()
            .to_string()
    }

    #[test]
    fn archive_round_trip() {
        let path = temp_path("round-trip.qcp");
        let assets = vec![AssetInput {
            path: "assets/logo.png".to_string(),
            data_base64: base64::engine::general_purpose::STANDARD.encode(b"logo-bytes"),
        }];

        save_project(&path, SAMPLE_MANIFEST, &assets).expect("écriture réussie");

        let contents = open_project(&path).expect("lecture réussie");
        assert_eq!(contents.manifest, SAMPLE_MANIFEST);
        assert_eq!(contents.assets.len(), 1);
        assert_eq!(contents.assets[0].path, "assets/logo.png");
        assert_eq!(
            base64::engine::general_purpose::STANDARD
                .decode(&contents.assets[0].data_base64)
                .unwrap(),
            b"logo-bytes"
        );

        std::fs::remove_file(&path).unwrap();
    }

    #[test]
    fn chemin_actif_rejeté() {
        let result = sanitize_asset_path("assets/../../etc/passwd");
        assert!(result.is_err());
        let result = sanitize_asset_path("outside/evil.png");
        assert!(result.is_err());
        let result = sanitize_asset_path("assets/.hidden");
        assert!(result.is_err());
        assert_eq!(sanitize_asset_path("assets/logo.png").unwrap(), "assets/logo.png");
    }

    #[test]
    fn archive_sans_manifeste_rejetée() {
        let path = temp_path("sans-manifeste.qcp");
        let file = std::fs::File::create(&path).unwrap();
        let mut zip = zip::ZipWriter::new(file);
        zip.start_file("autre.txt", zip::write::SimpleFileOptions::default())
            .unwrap();
        zip.write_all(b"rien").unwrap();
        zip.finish().unwrap();

        let result = open_project(&path);
        assert!(result.is_err());
        std::fs::remove_file(&path).unwrap();
    }
}

/// Lit une archive `.qcp` et renvoie le manifeste plus les fichiers média.
pub fn open_project(path: &str) -> Result<QcpContents, String> {
    let file = std::fs::File::open(path)
        .map_err(|error| format!("Ouverture du fichier impossible : {error}"))?;
    let mut archive = zip::ZipArchive::new(std::io::BufReader::new(file))
        .map_err(|_| "Ce fichier n'est pas une archive projet (.qcp) lisible.".to_string())?;

    let mut manifest: Option<String> = None;
    let mut assets: BTreeMap<String, Vec<u8>> = BTreeMap::new();
    for index in 0..archive.len() {
        let mut entry = archive
            .by_index(index)
            .map_err(|error| format!("Archive corrompue : {error}"))?;
        if !entry.is_file() {
            continue;
        }
        let name = entry
            .name()
            .map_err(|error| format!("Archive corrompue : {error}"))?
            .to_string();
        if name == MANIFEST_NAME {
            let mut text = String::new();
            entry
                .read_to_string(&mut text)
                .map_err(|error| format!("Manifeste illisible : {error}"))?;
            manifest = Some(text);
        } else if let Ok(asset_path) = sanitize_asset_path(&name) {
            if entry.size() > MAX_ASSET_BYTES {
                return Err(format!("Fichier média trop volumineux : {asset_path}"));
            }
            let mut data = Vec::new();
            entry
                .read_to_end(&mut data)
                .map_err(|error| format!("Fichier média illisible : {error}"))?;
            assets.insert(asset_path, data);
        }
        // Les autres entrées (dossiers, métadonnées macOS…) sont ignorées.
    }

    let manifest = manifest
        .ok_or_else(|| "Archive projet invalide : manifest.json est manquant.".to_string())?;
    Ok(QcpContents {
        manifest,
        assets: assets
            .into_iter()
            .map(|(path, data)| AssetOutput {
                data_base64: base64::engine::general_purpose::STANDARD.encode(data),
                path,
            })
            .collect(),
    })
}
