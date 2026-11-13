#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

rm -rf public
mkdir -p public/assets/images public/assets/sections public/assets/monks/dance

for file in index.html styles.css layout-fix.css scroll-scenes.js performer-motion.js performer-settings.js app.js favicon.svg robots.txt sitemap.xml vercel.json; do
  [[ -s "$file" ]] || { echo "Missing source file: $file" >&2; exit 1; }
  cp "$file" public/"$file"
done

[[ -s assets/images/monjes-frame.webp ]] || { echo "Missing Open Graph frame" >&2; exit 1; }
[[ -s assets/monks/monjes-frame-desktop.webp ]] || { echo "Missing transparent performer frame" >&2; exit 1; }
cp assets/images/monjes-frame.webp public/assets/images/monjes-frame.webp
cp assets/monks/*.webp public/assets/monks/
cp assets/monks/dance/*.webp public/assets/monks/dance/
cp assets/monks/dance/*.gif public/assets/monks/dance/
cp assets/monks/dance/manifest.json public/assets/monks/dance/manifest.json
cp assets/sections/*.webp public/assets/sections/
cp assets/sections/manifest.json public/assets/sections/manifest.json

for file in assets/sections/*.webp; do
  [[ -s "$file" ]] || { echo "Empty scene asset: $file" >&2; exit 1; }
done

for file in index.html styles.css layout-fix.css scroll-scenes.js performer-motion.js performer-settings.js app.js favicon.svg robots.txt sitemap.xml vercel.json assets/images/monjes-frame.webp assets/monks/monjes-frame-desktop.webp assets/monks/dance/monje-left-dance.webp assets/monks/dance/monje-right-dance.webp assets/monks/dance/monje-left-poster.webp assets/monks/dance/monje-right-poster.webp assets/monks/dance/monje-left-dance.gif assets/monks/dance/monje-right-dance.gif assets/monks/dance/manifest.json; do
  [[ -s "public/$file" ]] || { echo "Build output missing: $file" >&2; exit 1; }
done

printf 'Static output ready: %s
' "$ROOT/public"
printf 'Scene assets: %s
' "$(find public/assets/sections -maxdepth 1 -name '*.webp' | wc -l | tr -d ' ')"
