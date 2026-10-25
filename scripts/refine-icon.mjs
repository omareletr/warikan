// Refine the chosen "split-arrows" direction into a few tighter variations.
// Run: node --env-file=.env.local scripts/refine-icon.mjs
// Output: branding/icon-refined/*.png + index.html contact sheet.

import { writeFile, mkdir } from "node:fs/promises";
import { generate, download } from "./lib/recraft.mjs";

const OUT_DIR = "branding/icon-refined";

const BRAND =
  "single centered emblem on a dark near-black background (#0A0F0D), vivid emerald green (#10B981), " +
  "subtle soft glow, clean modern minimal flat design, crisp high contrast, no text, no letters, " +
  "generous negative space, centered, iOS app icon";

// Tightened takes on split-arrows-2 (rounded arrows/chevrons meeting at center, forming an X / split).
const VARIANTS = [
  `Two pairs of rounded emerald arrows pointing inward and outward from the center, forming a clean symmetric X that suggests splitting evenly, rounded line caps, balanced geometry. ${BRAND}`,
  `A bold minimal X made of four rounded chevrons radiating from a small central dot, money split fairly four ways, confident thick strokes. ${BRAND}`,
  `Two opposing arrows diverging from a single center point into equal halves, simple two-stroke split mark, very minimal and iconic. ${BRAND}`,
  `An abstract split emblem: a vertical seam down the middle with rounded arrows fanning outward on each side, even division, clean fintech app icon. ${BRAND}`,
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const saved = [];

  for (let i = 0; i < VARIANTS.length; i++) {
    process.stdout.write(`Refining variant ${i + 1}/${VARIANTS.length}... `);
    try {
      const [url] = await generate({
        prompt: VARIANTS[i],
        model: "recraftv4",
        size: "1024x1024",
        n: 1,
      });
      const file = `arrows-v${i + 1}.png`;
      await download(url, `${OUT_DIR}/${file}`);
      saved.push(file);
      console.log("ok");
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
  }

  const cards = saved
    .map(
      (f) => `    <figure><img src="${f}" alt="${f}"/><figcaption>${f}</figcaption></figure>`
    )
    .join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Warikan icon — refined</title>
<style>body{background:#0A0F0D;color:#E6E6E6;font-family:system-ui;margin:0;padding:32px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:24px}
figure{margin:0;text-align:center}img{width:100%;border-radius:22%;box-shadow:0 8px 30px rgba(0,0,0,.5);background:#000}
figcaption{margin-top:8px;font-size:13px;color:#10B981;font-family:ui-monospace,monospace}</style></head>
<body><h1>Refined split-arrows variants (${saved.length})</h1><div class="grid">
${cards}
</div></body></html>`;
  await writeFile(`${OUT_DIR}/index.html`, html);
  console.log(`\nDone. ${saved.length} refined icons in ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
