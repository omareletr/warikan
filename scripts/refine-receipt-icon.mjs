// Refine the "torn-receipt" direction toward the reference: a clean rounded
// app-tile receipt, green + white line items, dashed divider, vertical jagged
// tear down the middle, perforated bottom edge, dimensional but NOT glassy,
// and absolutely NO text. Run:
//   node --env-file=.env.local scripts/refine-receipt-icon.mjs
// Output: branding/icon-receipt-refined/*.png + index.html

import { writeFile, mkdir } from "node:fs/promises";
import { generate, download } from "./lib/recraft.mjs";

const OUT_DIR = "branding/icon-receipt-refined";

// Hard no-text + tile-filling + tasteful depth.
const NEGATIVE =
  "absolutely no text, no words, no letters, no numbers, no typography, no title, " +
  "no labels — only abstract horizontal line-item bars";
const LOOK =
  "iOS app icon, the receipt fills most of the square and is centered, dark forest-green " +
  "gradient background, emerald green (#10B981) and clean off-white line-item bars, a dashed " +
  "subtotal divider, soft realistic drop shadow and gentle paper depth (matte, not overly glassy), " +
  "premium modern flat-dimensional style, polished, app store quality";

const VARIANTS = [
  "A single restaurant receipt with rounded corners, ripped cleanly in half down the center with " +
    "a jagged vertical tear, the two halves slightly offset, neat rows of emerald and white bars, " +
    "a dashed divider near the bottom, and a perforated tear-off bottom edge with small holes.",
  "A tidy receipt card torn straight down the middle into two equal halves, a strong emerald total " +
    "bar at the bottom above a perforated edge, evenly spaced green and white line-item bars, subtle " +
    "shadow between the two halves to show depth.",
  "A receipt split vertically into two halves pulling slightly apart, clean rounded corners, three " +
    "emerald and three white line-item bars, one dashed divider, perforated bottom edge, soft and " +
    "tasteful depth, minimal and confident.",
  "A bold centered receipt ripped in half down a crisp jagged seam, generous emerald and white " +
    "bars, dashed subtotal line, perforated bottom, slight upward paper curl at the torn edges for " +
    "dimension, clean and premium.",
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const saved = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  for (let i = 0; i < VARIANTS.length; i++) {
    process.stdout.write(`Refining receipt v${i + 1}/${VARIANTS.length}... `);
    try {
      const [url] = await generate({
        prompt: `${VARIANTS[i]} ${LOOK}. ${NEGATIVE}.`,
        model: "recraftv4",
        size: "1024x1024",
        n: 1,
      });
      const file = `receipt-v${i + 1}.png`;
      await download(url, `${OUT_DIR}/${file}`);
      saved.push(file);
      console.log("ok");
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
    await sleep(2500);
  }

  const cards = saved
    .map((f) => `    <figure><img src="${f}" alt="${f}"/><figcaption>${f}</figcaption></figure>`)
    .join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Warikan icon — receipt refined</title>
<style>body{background:#0A0F0D;color:#E6E6E6;font-family:system-ui;margin:0;padding:32px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:24px}
figure{margin:0;text-align:center}img{width:100%;border-radius:22%;box-shadow:0 8px 30px rgba(0,0,0,.5);background:#000}
figcaption{margin-top:8px;font-size:13px;color:#10B981;font-family:ui-monospace,monospace}</style></head>
<body><h1>Refined torn-receipt (${saved.length})</h1><div class="grid">
${cards}
</div></body></html>`;
  await writeFile(`${OUT_DIR}/index.html`, html);
  console.log(`\nDone. ${saved.length} refined receipts in ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
