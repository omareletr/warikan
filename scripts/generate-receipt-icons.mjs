// Generate dimensional "torn receipt" app-icon concepts (per the reference:
// a receipt ripped down the middle, green + white line items, perforated bottom edge,
// glossy depth on a dark green gradient). Run:
//   node --env-file=.env.local scripts/generate-receipt-icons.mjs
// Output: branding/icon-receipt/*.png + index.html contact sheet.

import { writeFile, mkdir } from "node:fs/promises";
import { generate, download } from "./lib/recraft.mjs";

const OUT_DIR = "branding/icon-receipt";

// Rich, tactile look — NOT flat. Depth, gloss, soft shadows.
const BRAND =
  "iOS app icon, dimensional and glossy with soft realistic shadows and subtle highlights, " +
  "dark forest-green gradient background with a gentle vignette, emerald green (#10B981) and " +
  "off-white accents, premium tactile look, centered composition, no real text just abstract " +
  "line-item bars, polished, high detail, app store quality";

const VARIANTS = [
  {
    key: "torn-receipt",
    prompt:
      "A single restaurant receipt card with rounded corners, ripped cleanly in half down the " +
      "center with a jagged vertical tear, the two halves slightly separated, rows of emerald " +
      "green and white horizontal bars as line items, a dashed divider line, and a perforated " +
      "bottom edge with a row of small holes. " +
      BRAND,
  },
  {
    key: "torn-receipt-deep",
    prompt:
      "A glossy receipt torn vertically into two halves that cast soft shadows on each other, " +
      "emerald and white line-item bars, dashed subtotal divider, a bold emerald total bar at the " +
      "bottom, perforated tear-off bottom edge with holes, strong sense of depth and paper thickness. " +
      BRAND,
  },
  {
    key: "split-receipt-clean",
    prompt:
      "A minimal but dimensional receipt split down the middle into two equal halves, soft rounded " +
      "corners, a few emerald green and light-grey line-item bars, one dashed divider, perforated " +
      "bottom edge, subtle paper curl and glossy highlight, clean and modern. " +
      BRAND,
  },
  {
    key: "receipt-zigzag",
    prompt:
      "A receipt ripped in half along a sharp zigzag tear down the center, two halves pulling apart, " +
      "emerald green and white line items, dashed separator, perforated holes along the bottom, " +
      "dramatic soft shadows and a glossy sheen, premium and tactile. " +
      BRAND,
  },
];

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const saved = [];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  for (const v of VARIANTS) {
    process.stdout.write(`Generating "${v.key}"... `);
    try {
      const [url] = await generate({
        prompt: v.prompt,
        model: "recraftv4",
        size: "1024x1024",
        n: 1,
      });
      const file = `${v.key}.png`;
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
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Warikan icon — receipt</title>
<style>body{background:#0A0F0D;color:#E6E6E6;font-family:system-ui;margin:0;padding:32px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:24px}
figure{margin:0;text-align:center}img{width:100%;border-radius:22%;box-shadow:0 8px 30px rgba(0,0,0,.5);background:#000}
figcaption{margin-top:8px;font-size:13px;color:#10B981;font-family:ui-monospace,monospace}</style></head>
<body><h1>Torn-receipt icon concepts (${saved.length})</h1><div class="grid">
${cards}
</div></body></html>`;
  await writeFile(`${OUT_DIR}/index.html`, html);
  console.log(`\nDone. ${saved.length} concepts in ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
