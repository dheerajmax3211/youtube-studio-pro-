#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP="$ROOT/build/YouTube Studio Pro.app"
DMG_DIR="$ROOT/build/dmg_staging"
DMG_OUT="$ROOT/build/YouTube-Studio-Pro-macOS.dmg"

if [[ ! -d "$APP" ]]; then
  echo "Error: $APP not found. Run ./build.sh first."
  exit 1
fi

echo "📦 Packaging YouTube Studio Pro into single installable DMG..."
rm -rf "$DMG_DIR" "$DMG_OUT"
mkdir -p "$DMG_DIR"

# Copy App into staging
cp -R "$APP" "$DMG_DIR/"

# Create symlink to /Applications
ln -s /Applications "$DMG_DIR/Applications"

# Create beautiful read-only compressed DMG
hdiutil create \
  -volname "YouTube Studio Pro" \
  -srcfolder "$DMG_DIR" \
  -ov \
  -format UDZO \
  "$DMG_OUT"

rm -rf "$DMG_DIR"

echo "🎉 Installable DMG created: $DMG_OUT"
ls -lh "$DMG_OUT"
