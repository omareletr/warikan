// Render every app icon, favicon and splash screen from public/icon.svg (the waribashi mark).
// Run after editing the SVG:  node scripts/export-icons.mjs
// Other variant (jade ground, black mark):  node scripts/export-icons.mjs public/icon-green.svg
// Uses sharp, which Next.js already installs; nothing to add.

import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";
import { readdirSync, existsSync } from "node:fs";

const svg = await readFile(process.argv[2] ?? "public/icon.svg", "utf8");
const GROUND = svg.match(/<rect width="1024" height="1024" fill="([^"]+)"/)[1];
const MARK = svg.match(/<polygon[^>]* fill="([^"]+)"/)[1];
// The mark alone, on transparent: the icon minus its full-bleed background square.
const markSvg = (color) =>
  svg.replace(/<rect width="1024" height="1024" fill="[^"]+"\/>/, "").replaceAll(MARK, color);

const png = (input, size) => sharp(Buffer.from(input), { density: 72 * (size / 1024) * 4 }).resize(size, size);

// Full square icon, no alpha (App Store rejects icons with an alpha channel).
async function icon(size, out) {
  await png(svg, size).removeAlpha().png().toFile(out);
}

// Mark centred on a solid background, `scale` of the shorter side.
async function onGround(w, h, scale, ground, color, out) {
  const m = Math.round(Math.min(w, h) * scale);
  const mark = await png(markSvg(color), m).png().toBuffer();
  await sharp({ create: { width: w, height: h, channels: 3, background: ground } })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toFile(out);
}

// Web and PWA
for (const s of [1024, 512, 192, 180, 120]) await icon(s, `public/icon-${s}.png`);
await icon(180, "public/apple-icon.png");

// favicon.ico holding 16, 32 and 48 px PNGs
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map((s) => png(svg, s).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((s, i) => {
  const e = 6 + 16 * i;
  header.writeUInt8(s, e);
  header.writeUInt8(s, e + 1);
  header.writeUInt16LE(1, e + 4); // colour planes
  header.writeUInt16LE(32, e + 6); // bits per pixel
  header.writeUInt32LE(pngs[i].length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += pngs[i].length;
});
await writeFile("public/favicon.ico", Buffer.concat([header, ...pngs]));

// iOS: the 1024 App Store icon, and the launch screen (the icon's ground and mark, sized for aspect-fill on a phone)
await icon(1024, "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png");
for (const f of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  await onGround(2732, 2732, 0.16, GROUND, MARK, `ios/App/App/Assets.xcassets/Splash.imageset/${f}`);
}

// Android: legacy icons, adaptive foreground (mark inside the 66dp safe circle of a 108dp canvas), splashes
const RES = "android/app/src/main/res";
const densities = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(densities)) {
  const legacy = Math.round(48 * k);
  const fg = Math.round(108 * k);
  const tile = await png(svg, legacy).png().toBuffer();
  const r = Math.round(legacy * 0.18);
  const rounded = Buffer.from(`<svg width="${legacy}" height="${legacy}"><rect width="${legacy}" height="${legacy}" rx="${r}"/></svg>`);
  const circle = Buffer.from(`<svg width="${legacy}" height="${legacy}"><circle cx="${legacy / 2}" cy="${legacy / 2}" r="${legacy / 2}"/></svg>`);
  await sharp(tile).composite([{ input: rounded, blend: "dest-in" }]).png().toFile(`${RES}/mipmap-${d}/ic_launcher.png`);
  await sharp(tile).composite([{ input: circle, blend: "dest-in" }]).png().toFile(`${RES}/mipmap-${d}/ic_launcher_round.png`);
  // The mark's farthest point is 410 units from centre in a 1024 box; fit that inside the 33dp safe radius.
  const markPx = Math.round(((33 * k) / 410) * 1024);
  const mark = await png(markSvg(MARK), markPx).png().toBuffer();
  await sharp({ create: { width: fg, height: fg, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mark, gravity: "centre" }])
    .png()
    .toFile(`${RES}/mipmap-${d}/ic_launcher_foreground.png`);
}
for (const dir of readdirSync(RES).filter((d) => d.startsWith("drawable"))) {
  const f = `${RES}/${dir}/splash.png`;
  if (!existsSync(f)) continue;
  const { width, height } = await sharp(f).metadata();
  await onGround(width, height, 0.22, GROUND, MARK, f);
}

await writeFile(
  `${RES}/values/ic_launcher_background.xml`,
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${GROUND}</color>\n</resources>`,
);

console.log("Icons, favicon and splash screens written.");
