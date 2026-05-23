# Icon Export Guide

Convert `icon.svg` to PNG for app store submission.

## Required Sizes

| Use | Size |
|---|---|
| iOS App Store | 1024×1024 |
| iOS Home Screen (3x) | 180×180 |
| iOS Spotlight (3x) | 120×120 |
| Android Play Store | 512×512 |
| Android launcher (xxxhdpi) | 192×192 |

## macOS — Built-in Tools

### rsvg-convert (Homebrew)

```sh
brew install librsvg

rsvg-convert -w 1024 -h 1024 icon.svg -o icon-1024.png
rsvg-convert -w 512  -h 512  icon.svg -o icon-512.png
rsvg-convert -w 192  -h 192  icon.svg -o icon-192.png
rsvg-convert -w 180  -h 180  icon.svg -o icon-180.png
rsvg-convert -w 120  -h 120  icon.svg -o icon-120.png
```

### qlmanage (Preview)

```sh
qlmanage -t -s 1024 -o . icon.svg
```

Then open the output in Preview and export via **File → Export…** as PNG.

## macOS / Linux — Inkscape CLI

```sh
inkscape --export-type=png --export-width=1024 --export-height=1024 icon.svg -o icon-1024.png
inkscape --export-type=png --export-width=512  --export-height=512  icon.svg -o icon-512.png
inkscape --export-type=png --export-width=192  --export-height=192  icon.svg -o icon-192.png
inkscape --export-type=png --export-width=180  --export-height=180  icon.svg -o icon-180.png
inkscape --export-type=png --export-width=120  --export-height=120  icon.svg -o icon-120.png
```

## Node.js — sharp

> Requires `librsvg` on the system (`brew install librsvg`).

```sh
npm install sharp
```

```sh
node -e "
const sharp = require('sharp');
const sizes = [1024, 512, 192, 180, 120];
sizes.forEach(s => sharp('icon.svg').resize(s, s).png().toFile(\`icon-\${s}.png\`));
"
```

## Recommended Workflow

1. Export the master at **1024×1024** first.
2. Scale down from that master PNG (not from SVG) for all smaller sizes to ensure consistent rendering.

```sh
# Scale down from master PNG using sips (macOS built-in)
for size in 512 192 180 120; do
  sips -z $size $size icon-1024.png --out icon-${size}.png
done
```
