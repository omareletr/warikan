// Generate fresh app-icon concepts for Warikan via Recraft.
// Run: node --env-file=.env.local scripts/generate-icons.mjs
//
// Output: branding/icon-candidates/*.png + index.html (contact sheet).
// Open the contact sheet, pick a winner, then run export-icon.mjs on it.

import { writeFile, mkdir } from "node:fs/promises";
import { generate, download } from "./lib/recraft.mjs";

const OUT_DIR = "branding/icon-candidates";

// Shared brand language baked into every prompt.
const BRAND =
  "iOS app icon, single centered emblem on a dark near-black background (#0A0F0D), " +
  "vivid emerald green accent (#10B981), subtle soft glow, clean modern minimal flat design, " +
  "rounded geometry, crisp high contrast, no text, no words, no letters, generous negative space, " +
  "centered composition, app icon style";

// Fresh concept directions (NOT the current split-receipt icon).
const CONCEPTS = [
  {
    key: "split-coin",
    prompt: `A single coin splitting cleanly into equal shares, division motif. ${BRAND}`,
  },
  {
    key: "divided-plate",
    prompt: `A round dinner plate divided into equal segments like a pie chart, fair sharing. ${BRAND}`,
  },
  {
    key: "chopsticks-receipt",
    prompt: `Minimal chopsticks crossed over a small receipt slip, dining and bill splitting. ${BRAND}`,
  },
  {
    key: "fraction-glyph",
    prompt: `An abstract division glyph, a circle split by a clean diagonal into two halves, fraction motif. ${BRAND}`,
  },
  {
    key: "shared-bowl",
    prompt: `A single rice bowl with a subtle split line down the middle, shared meal going dutch. ${BRAND}`,
  },
  {
    key: "split-arrows",
    prompt: `Two arrows diverging from one point into equal directions, splitting evenly. ${BRAND}`,
  },
];

const PER_CONCEPT = 2; // variations per concept (×6 concepts = 12 candidates ≈ $0.48)
const GAP_MS = 2500; // pause between concepts to stay under the rate limit

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const saved = [];

  for (const concept of CONCEPTS) {
    process.stdout.write(`Generating "${concept.key}" (${PER_CONCEPT})... `);
    try {
      // Recraft V4 doesn't accept a `style` param — the icon look comes from the prompt.
      const urls = await generate({
        prompt: concept.prompt,
        model: "recraftv4",
        size: "1024x1024",
        n: PER_CONCEPT,
      });
      for (let i = 0; i < urls.length; i++) {
        const file = `${concept.key}-${i + 1}.png`;
        await download(urls[i], `${OUT_DIR}/${file}`);
        saved.push({ file, concept: concept.key });
      }
      console.log("ok");
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
    }
    await sleep(GAP_MS);
  }

  // Contact sheet for side-by-side review.
  const cards = saved
    .map(
      (s) => `    <figure>
      <img src="${s.file}" alt="${s.file}" />
      <figcaption>${s.file}</figcaption>
    </figure>`
    )
    .join("\n");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Warikan icon candidates</title>
<style>
  body { background:#0A0F0D; color:#E6E6E6; font-family:system-ui,sans-serif; margin:0; padding:32px; }
  h1 { font-weight:600; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:24px; }
  figure { margin:0; text-align:center; }
  img { width:100%; border-radius:22%; box-shadow:0 8px 30px rgba(0,0,0,.5); background:#000; }
  figcaption { margin-top:8px; font-size:13px; color:#10B981; font-family:ui-monospace,monospace; }
</style></head>
<body>
  <h1>Warikan — icon candidates (${saved.length})</h1>
  <p style="color:#888">Pick a winner, then run:
    <code style="color:#10B981">node --env-file=.env.local scripts/export-icon.mjs branding/icon-candidates/&lt;file&gt;.png</code></p>
  <div class="grid">
${cards}
  </div>
</body></html>`;

  await writeFile(`${OUT_DIR}/index.html`, html);
  console.log(`\nDone. ${saved.length} candidates in ${OUT_DIR}/`);
  console.log(`Open ${OUT_DIR}/index.html to review and pick a winner.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
