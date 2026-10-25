// Export a chosen 1024x1024 icon PNG into every required output via `sips`
// (macOS built-in — no extra deps). Run AFTER picking a winner:
//   node --env-file=.env.local scripts/export-icon.mjs branding/icon-candidates/<file>.png
//
// Produces:
//   - ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png (1024, the iOS source)
//   - public/icon-1024.png, icon-512.png, icon-192.png, icon-180.png, icon-120.png
//   - public/favicon.ico (32px)
// Note: RECRAFT_API_KEY is not needed here; --env-file is harmless if present.

import { execFileSync } from "node:child_process";
import { mkdir, copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";

const src = process.argv[2];
if (!src) {
  console.error(
    "Usage: node --env-file=.env.local scripts/export-icon.mjs <path-to-1024.png>"
  );
  process.exit(1);
}

const IOS_ICON =
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png";
const WEB_SIZES = [1024, 512, 192, 180, 120];

function sipsResize(input, size, out) {
  // -s format png forces PNG output (Recraft images are WebP under the hood).
  execFileSync(
    "sips",
    ["-s", "format", "png", "-z", String(size), String(size), input, "--out", out],
    { stdio: "ignore" }
  );
}

async function main() {
  await access(src, constants.R_OK);
  await mkdir("public", { recursive: true });

  // iOS app icon — single 1024 source used by Xcode 14+/Capacitor.
  sipsResize(src, 1024, IOS_ICON);
  console.log(`✓ ${IOS_ICON}`);

  // Web/PWA PNGs — scale down from the master for consistent rendering.
  for (const size of WEB_SIZES) {
    const out = `public/icon-${size}.png`;
    sipsResize(src, size, out);
    console.log(`✓ ${out}`);
  }

  // Favicon (32px PNG written with .ico extension — browsers accept PNG favicons).
  sipsResize(src, 32, "public/favicon.ico");
  console.log("✓ public/favicon.ico");

  // Keep a canonical apple-touch alias.
  await copyFile("public/icon-180.png", "public/apple-icon.png");
  console.log("✓ public/apple-icon.png");

  console.log(
    "\nDone. Next: wire metadata.icons in app/layout.tsx + app/manifest.ts, then `npm run dev`."
  );
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
