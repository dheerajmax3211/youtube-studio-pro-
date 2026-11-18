#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
APP="$ROOT/build/YouTube Studio Pro.app"
CONTENTS="$APP/Contents"

echo "🔨 Building YouTube Studio Pro native macOS application..."
mkdir -p "$CONTENTS/MacOS" "$CONTENTS/Resources"

xcrun swiftc \
  -parse-as-library -O -target arm64-apple-macosx13.0 \
  -framework SwiftUI \
  -framework AVKit \
  -framework UniformTypeIdentifiers \
  -framework NaturalLanguage \
  -framework Security \
  "$ROOT/Sources/YouTubeStudioPro/App.swift" \
  -o "$CONTENTS/MacOS/YouTube Studio Pro"

cp "$ROOT/Resources/Info.plist" "$CONTENTS/Info.plist"
cp "$ROOT/Resources/YouTubeStudioLogo.png" "$CONTENTS/Resources/YouTubeStudioLogo.png"

# Icon generation
ICONSET="$ROOT/build/YouTubeStudioPro.iconset"
mkdir -p "$ICONSET"
sips -z 16 16 "$ROOT/Resources/YouTubeStudioLogo.png" --out "$ICONSET/icon_16x16.png" >/dev/null
sips -z 32 32 "$ROOT/Resources/YouTubeStudioLogo.png" --out "$ICONSET/icon_16x16@2x.png" >/dev/null
sips -z 32 32 "$ROOT/Resources/YouTubeStudioLogo.png" --out "$ICONSET/icon_32x32.png" >/dev/null
sips -z 64 64 "$ROOT/Resources/YouTubeStudioLogo.png" --out "$ICONSET/icon_32x32@2x.png" >/dev/null
sips -z 128 128 "$ROOT/Resources/YouTubeStudioLogo.png" --out "$ICONSET/icon_128x128.png" >/dev/null
sips -z 256 256 "$ROOT/Resources/YouTubeStudioLogo.png" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
sips -z 256 256 "$ROOT/Resources/YouTubeStudioLogo.png" --out "$ICONSET/icon_256x256.png" >/dev/null
sips -z 512 512 "$ROOT/Resources/YouTubeStudioLogo.png" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
sips -z 512 512 "$ROOT/Resources/YouTubeStudioLogo.png" --out "$ICONSET/icon_512x512.png" >/dev/null
sips -z 1024 1024 "$ROOT/Resources/YouTubeStudioLogo.png" --out "$ICONSET/icon_512x512@2x.png" >/dev/null
iconutil -c icns "$ICONSET" -o "$CONTENTS/Resources/AppIcon.icns"

# Copy engines into bundle
mkdir -p "$CONTENTS/Resources/engines"
cp -R "$ROOT/engines/." "$CONTENTS/Resources/engines/"

codesign --force --deep --sign - "$APP"
echo "✅ Successfully built: $APP"
