#!/usr/bin/env bash
#
# Signature locale des bundles macOS produits par `tauri build`
# (Eventages QrCode Studio — app .app et image .dmg).
#
# Tauri signe les builds macOS en ad-hoc par défaut : l'app démarre sur la
# machine qui l'a compilée, mais Gatekeeper la bloque ailleurs. Ce script
# applique un vrai certificat quand il en existe un, sinon il refait une
# signature ad-hoc propre.
#
# Résolution de l'identité de signature, dans l'ordre :
#   1. --identity <nom-ou-hash>, ou la variable d'environnement SIGN_IDENTITY
#   2. si plusieurs certificats de codesigning sont disponibles, un menu propose
#      de choisir celui à utiliser (Developer ID d'abord, puis Apple
#      Development) — Entrée sélectionne le premier de la liste ; sans terminal
#      interactif (CI, pipe), ou avec --no-prompt, le premier est pris d'office
#   3. signature ad-hoc
#
# Le runtime durci (`--options runtime`) et l'horodatage TSA sont activés
# automatiquement pour un certificat Developer ID (prérequis de la
# notarisation), et à la demande avec --hardened.
#
# Usage :
#   scripts/sign-macos.sh                        signe la .app la plus récente
#   scripts/sign-macos.sh --all                  signe toutes les .app (multi-cibles)
#   scripts/sign-macos.sh --app chemin/app.app   signe un bundle précis
#   scripts/sign-macos.sh --dmg                  signe aussi la .dmg la plus récente
#   scripts/sign-macos.sh --adhoc                force la signature ad-hoc
#   scripts/sign-macos.sh --hardened             force le runtime durci + horodatage
#   scripts/sign-macos.sh --identity "Apple Development: ..."
#   scripts/sign-macos.sh --no-prompt            pas de menu (premier certificat)
#   scripts/sign-macos.sh --entitlements fichier.plist
#
# Via bun/npm : `bun run macos:sign`

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MACOS_DIR="$ROOT/src-tauri/target/release/bundle/macos"
DMG_DIR="$ROOT/src-tauri/target/release/bundle/dmg"

APP_PATH=""
IDENTITY="${SIGN_IDENTITY:-}"
ADHOC=0
HARDENED=0
SIGN_DMG=0
SIGN_ALL=0
NO_PROMPT=0
ENTITLEMENTS=""

die() { printf 'error: %s\n' "$1" >&2; exit 1; }
info() { printf '%s\n' "$1"; }

help() {
  grep '^#' "$0" | sed 's/^# \{0,1\}//' | sed '1,2d'
  exit 0
}

while [ $# -gt 0 ]; do
  case "$1" in
    --app) APP_PATH="${2:-}"; shift 2 ;;
    --identity) IDENTITY="${2:-}"; shift 2 ;;
    --entitlements) ENTITLEMENTS="${2:-}"; shift 2 ;;
    --adhoc) ADHOC=1; shift ;;
    --hardened) HARDENED=1; shift ;;
    --no-prompt) NO_PROMPT=1; shift ;;
    --dmg) SIGN_DMG=1; shift ;;
    --all) SIGN_ALL=1; shift ;;
    -h | --help) help ;;
    *) die "option inconnue : $1 (voir --help)" ;;
  esac
done

# --- Résolution de l'identité de signature -----------------------------------

IDENT_NAME=""

if [ "$ADHOC" -eq 1 ]; then
  SIGNER="-"
else
  LIST="$(security find-identity -v -p codesigning 2>/dev/null |
    sed -E 's/^[[:space:]]*[0-9]+\)[[:space:]]+([0-9A-F]{40})[[:space:]]+"(.*)"$/\1|\2/' |
      grep -E '^[0-9A-F]{40}\|' || true)"

  # Candidats triés : Developer ID d'abord (distribution), puis Apple
  # Development (tests locaux), puis le reste.
  CAND="$(printf '%s\n' "$LIST" | awk -F'|' '
    $2 ~ /Developer ID Application/ { d[++dc] = $0; next }
    $2 ~ /Apple Development/        { a[++ac] = $0; next }
    NF                              { o[++oc] = $0 }
    END {
      for (i = 1; i <= dc; i++) print d[i]
      for (i = 1; i <= ac; i++) print a[i]
      for (i = 1; i <= oc; i++) print o[i]
    }')"
  CNT="$(printf '%s\n' "$CAND" | grep -c . || true)"

  # Terminal interactif disponible ? Sinon (CI, pipe) pas de menu.
  TTY_IN=""
  if [ "$NO_PROMPT" -eq 0 ]; then
    if [ -t 0 ]; then
      TTY_IN="/dev/stdin"
    elif [ -r /dev/tty ]; then
      TTY_IN="/dev/tty"
    fi
  fi

  if [ -n "$IDENTITY" ]; then
    SIGNER="$IDENTITY"
  elif [ "$CNT" -eq 0 ]; then
    info 'warning: aucun certificat de codesigning disponible, repli sur la signature ad-hoc.'
    SIGNER="-"
  elif [ "$CNT" -eq 1 ] || [ -z "$TTY_IN" ]; then
    ROW="$(printf '%s\n' "$CAND" | head -1)"
    SIGNER="${ROW%%|*}"
    IDENT_NAME="${ROW#*|}"
    case "$IDENT_NAME" in
      *'Developer ID Application'*) HARDENED=1 ;;

    esac
  else
    # Plusieurs certificats : menu de sélection.
    info 'Plusieurs identités de signature disponibles :'
    N=0
    while IFS= read -r row; do
      [ -n "$row" ] || continue
      N=$((N + 1))
      info "  ${N}) ${row#*|}"
      info "     (${row%%|*})"
    done <<EOF
$CAND
EOF

    IDX=1
    while :; do
      printf 'Identité à utiliser [1-%s, Entrée = 1] : ' "$CNT" >&2
      REPLY=""
      if ! read -r REPLY < "$TTY_IN" 2>/dev/null || [ -z "$REPLY" ]; then
        break  # Entrée à vide ou flux fermé : premier de la liste
      fi
      case "$REPLY" in
        *[!0-9]*)
          info 'error: entrée invalide, entre un numéro.' >&2
          continue
          ;;
      esac
      if [ "$REPLY" -ge 1 ] && [ "$REPLY" -le "$CNT" ]; then
        IDX="$REPLY"
        break
      fi
      info "error: numéro hors limites (1-$CNT)." >&2
    done
    ROW="$(printf '%s\n' "$CAND" | sed -n "${IDX}p")"
    SIGNER="${ROW%%|*}"
    IDENT_NAME="${ROW#*|}"
    case "$IDENT_NAME" in
      *'Developer ID Application'*) HARDENED=1 ;;

    esac
  fi
fi

if [ "$SIGNER" = "-" ]; then
  MODE='ad-hoc (aucun certificat — Gatekeeper bloquera l’app hors de la machine de build)'
elif [ "$HARDENED" -eq 1 ]; then
  MODE='distribution (runtime durci + horodatage TSA, prêt pour la notarisation)'
else
  MODE='développement (l’app tourne sur cette machine et les machines de confiance)'
fi

# --- Options codesign ---------------------------------------------------------

CS_RUNTIME=()
CS_STAMP=()
CS_ENT=()

if [ "$SIGNER" != "-" ] && [ "$HARDENED" -eq 1 ]; then
  CS_RUNTIME=(--options runtime)
  CS_STAMP=(--timestamp)
fi

if [ -n "$ENTITLEMENTS" ]; then
  [ -f "$ENTITLEMENTS" ] || die "fichier d'entitlements introuvable : $ENTITLEMENTS"
  CS_ENT=(--entitlements "$ENTITLEMENTS")
fi

# --- Signature ----------------------------------------------------------------

# Signe d'abord tout le code embarqué (frameworks, helpers, dylibs), du plus
# profond au plus haut, puis scelle le bundle lui-même. `codesign --verify
# --strict` échouerait sur un bundle dont le code interne n'est pas signé.
sign_app() {
  app="$1"
  inner=()

  while IFS= read -r -d '' t; do
    inner=("${inner[@]}" "$t")
  done < <(find "$app/Contents" -depth -type d \( -name '*.framework' -o -name '*.app' -o -name '*.xpc' \) -print0)

  while IFS= read -r -d '' t; do
    inner=("${inner[@]}" "$t")
  done < <(find "$app/Contents" -type f \( -name '*.dylib' -o -name '*.so' \) -print0)

  for t in "${inner[@]+"${inner[@]}"}"; do
    info "  · $(basename "$t")"
    codesign --force --sign "$SIGNER" \
      "${CS_RUNTIME[@]+"${CS_RUNTIME[@]}"}" \
      "${CS_STAMP[@]+"${CS_STAMP[@]}"}" \
      "$t" >/dev/null
  done

  info "  · $(basename "$app") (bundle)"
  codesign --force --sign "$SIGNER" \
    "${CS_RUNTIME[@]+"${CS_RUNTIME[@]}"}" \
    "${CS_STAMP[@]+"${CS_STAMP[@]}"}" \
    "${CS_ENT[@]+"${CS_ENT[@]}"}" \
    "$app" >/dev/null

  # Vérification stricte (inclut le code interne), puis résumé de la signature.
  codesign --verify --strict --verbose=2 "$app" >/dev/null
  codesign -dv "$app" 2>&1 | sed -n '1,5p' | sed 's/^/    /'
}

# --- Bundle(s) .app ------------------------------------------------------------

if [ -n "$APP_PATH" ]; then
  [ -d "$APP_PATH" ] || die ".app introuvable : $APP_PATH"
  APPS="$APP_PATH"
else
  [ -d "$MACOS_DIR" ] || die "aucun bundle macOS : lance d'abord « bun run desktop:build » ($MACOS_DIR)"
  APPS="$(find "$MACOS_DIR" -maxdepth 1 -type d -name '*.app' -exec stat -f '%m|%N' {} + | sort -rn | cut -d'|' -f2- || true)"
  [ -n "$APPS" ] || die "aucune .app dans $MACOS_DIR"
  if [ "$SIGN_ALL" -ne 1 ]; then
    APPS="$(printf '%s\n' "$APPS" | head -1)"
  fi
fi

info "» signature macOS — identité : ${IDENT_NAME:-$SIGNER}"
info "  mode : $MODE"
info ""

while IFS= read -r app; do
  [ -n "$app" ] || continue
  info "» ${app#"$ROOT"/}"
  sign_app "$app"
  info ""
done <<EOF
$APPS
EOF

# --- Image .dmg ----------------------------------------------------------------

if [ "$SIGN_DMG" -eq 1 ]; then
  [ -d "$DMG_DIR" ] || die "aucun dossier dmg : $DMG_DIR"
  DMG="$(ls -t "$DMG_DIR"/*.dmg 2>/dev/null | head -1 || true)"
  [ -n "$DMG" ] || die "aucune .dmg trouvée dans $DMG_DIR"

  info "» ${DMG#"$ROOT"/}"
  codesign --force --sign "$SIGNER" "${CS_STAMP[@]+"${CS_STAMP[@]}"}" "$DMG" >/dev/null
  codesign --verify --verbose=2 "$DMG" >/dev/null
  info ""
fi

info "✔ signature terminée (identité : ${IDENT_NAME:-$SIGNER})"
info "  contrôle : codesign --verify --strict <app>"
