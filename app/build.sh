#!/bin/bash
# Build the OmnigenVault.app menu-bar bundle.
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$APP_DIR/.." && pwd)"
NODE_BIN="$(command -v node || echo /opt/homebrew/bin/node)"
SQLITE_BIN="$(command -v sqlite3 || echo /usr/bin/sqlite3)"
VAULT_ROOT="${OMNIGEN_VAULT_ROOT:-/Volumes/ezBackup/omnigen-vault}"
DB_PATH="$VAULT_ROOT/index.sqlite"

BUNDLE="$APP_DIR/OmnigenVault.app"
MACOS="$BUNDLE/Contents/MacOS"
RES="$BUNDLE/Contents/Resources"
mkdir -p "$MACOS" "$RES"

# Embed the app icon (generate it if missing).
if [ ! -f "$APP_DIR/AppIcon.icns" ] && [ -f "$APP_DIR/make-icon.mjs" ]; then
  "$NODE_BIN" "$APP_DIR/make-icon.mjs" "$APP_DIR/icon-1024.png" >/dev/null 2>&1 || true
fi
[ -f "$APP_DIR/AppIcon.icns" ] && cp "$APP_DIR/AppIcon.icns" "$RES/AppIcon.icns"

# Resolved absolute paths, baked in at build time.
cat > "$APP_DIR/Paths.swift" <<EOF
import Foundation
enum Paths {
  static let projectDir = "$PROJECT_DIR"
  static let nodePath = "$NODE_BIN"
  static let sqlitePath = "$SQLITE_BIN"
  static let defaultVaultRoot = "$VAULT_ROOT"  // fallback; runtime vault is user-selectable
}
EOF

echo "compiling…"
swiftc -O -o "$MACOS/OmnigenVault" "$APP_DIR/OmnigenVault.swift" "$APP_DIR/Paths.swift" -framework Cocoa

cat > "$BUNDLE/Contents/Info.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>OmnigenVault</string>
  <key>CFBundleDisplayName</key><string>Omnigen Vault</string>
  <key>CFBundleIdentifier</key><string>com.omnigen.vault</string>
  <key>CFBundleExecutable</key><string>OmnigenVault</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>0.1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSUIElement</key><true/>
  <key>LSMinimumSystemVersion</key><string>13.0</string>
  <key>NSHighResolutionCapable</key><true/>
  <key>CFBundleIconFile</key><string>AppIcon</string>
  <key>CFBundleIconName</key><string>AppIcon</string>
</dict>
</plist>
EOF

# Code-sign with the first available identity (falls back to ad-hoc).
SIGN_ID="$(security find-identity -v -p codesigning 2>/dev/null | awk 'NR==1{print $2}')"
if [ -n "${SIGN_ID:-}" ]; then
  codesign --force --deep --sign "$SIGN_ID" "$BUNDLE" && echo "signed with $SIGN_ID"
else
  codesign --force --deep --sign - "$BUNDLE" && echo "ad-hoc signed (no identity found)"
fi

echo "built: $BUNDLE"
echo "  project: $PROJECT_DIR"
echo "  node:    $NODE_BIN"
echo "  vault:   $VAULT_ROOT"
