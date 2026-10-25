// Thin Recraft API client for the local branding scripts.
// No SDK — plain fetch, matching the codebase convention (see lib/gemini.ts).
// Run scripts with: node --env-file=.env.local scripts/<name>.mjs

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const BASE_URL = "https://external.api.recraft.ai/v1";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** fetch() with exponential backoff on 429 (rate limit) and 5xx. */
async function fetchWithRetry(url, opts, { retries = 4, baseDelay = 3000 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, opts);
    if (res.status !== 429 && res.status < 500) return res;
    if (attempt >= retries) return res;
    const wait = baseDelay * 2 ** attempt;
    console.log(`  ${res.status} — backing off ${wait}ms (attempt ${attempt + 1}/${retries})`);
    await sleep(wait);
  }
}

function apiKey() {
  const key = process.env.RECRAFT_API_KEY;
  if (!key || key === "your_recraft_api_key_here") {
    throw new Error(
      "RECRAFT_API_KEY is missing. Add it to .env.local and run with " +
        "`node --env-file=.env.local scripts/<name>.mjs`."
    );
  }
  return key;
}

/**
 * Generate one or more images from a text prompt.
 * @param {object} opts
 * @param {string} opts.prompt
 * @param {string} [opts.model='recraftv4']  recraftv4 | recraftv4_vector | recraftv4_pro | recraftv4_pro_vector
 * @param {string} [opts.size='1024x1024']
 * @param {number} [opts.n=1]                1–6
 * @param {string} [opts.style]              e.g. 'icon' | 'digital_illustration' | 'vector_illustration'
 * @param {string} [opts.style_id]           custom brand style id (overrides style)
 * @param {object} [opts.controls]           e.g. { colors: [{ rgb: [16,185,129] }] }
 * @returns {Promise<string[]>} image URLs
 */
export async function generate({
  prompt,
  model = "recraftv4",
  size = "1024x1024",
  n = 1,
  style,
  style_id,
  controls,
}) {
  const body = { prompt, model, size, n, response_format: "url" };
  if (style_id) body.style_id = style_id;
  else if (style) body.style = style;
  if (controls) body.controls = controls;

  const res = await fetchWithRetry(`${BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Recraft generate failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  return (json.data ?? []).map((d) => d.url).filter(Boolean);
}

/**
 * Create a reusable brand style from up to 5 reference images.
 * @param {object} opts
 * @param {string} opts.style  base style: any | realistic_image | digital_illustration | vector_illustration | icon
 * @param {string[]} opts.files  paths to reference PNG/JPG/WEBP (≤5, ≤5MB total)
 * @returns {Promise<string>} style_id
 */
export async function createStyle({ style, files }) {
  const { readFile } = await import("node:fs/promises");
  const { basename } = await import("node:path");
  const form = new FormData();
  form.set("style", style);
  for (const path of files) {
    const buf = await readFile(path);
    form.append("file", new Blob([buf]), basename(path));
  }
  const res = await fetch(`${BASE_URL}/styles`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Recraft createStyle failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  return json.id;
}

/** Download a URL to a local file (creates parent dirs). */
export async function download(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, buf);
  return outPath;
}
