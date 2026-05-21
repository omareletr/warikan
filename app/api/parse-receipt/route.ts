import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { z } from "zod";

const ReceiptSchema = z.object({
  restaurantName: z.string().max(200).nullable(),
  lineItems: z
    .array(
      z.object({
        name: z.string().max(200),
        quantity: z.number().min(0).max(999).optional().default(1),
        price: z.number().min(0).max(99999),
      })
    )
    .max(100),
  taxAmount: z.number().min(0).max(99999).nullable(),
  fees: z
    .array(
      z.object({
        name: z.string().max(200),
        amount: z.number().min(0).max(99999),
      })
    )
    .max(20),
  tipAmount: z.number().min(0).max(99999).nullable(),
});

const MAX_BASE64_LENGTH = 13_400_000; // ~10 MB decoded

const ALLOWED_ORIGINS = [
  "https://warikan0.netlify.app",
  "http://localhost:3000",
  "http://localhost:3001",
];

function isAllowedOrigin(value: string): boolean {
  if (ALLOWED_ORIGINS.some((o) => value.startsWith(o))) return true;
  // Netlify deploy previews: deploy-preview-*--warikan0.netlify.app
  return /^https:\/\/[a-z0-9-]+--warikan0\.netlify\.app/.test(value);
}

const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(10, "1 h"),
        prefix: "warikan:rl",
      })
    : null;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const GEMINI_PROMPT = `Analyze this receipt image and extract the following information as JSON:

{
  "restaurantName": "string or null",
  "lineItems": [{ "name": "string", "quantity": number, "price": number }],
  "taxAmount": number or null,
  "fees": [{ "name": "string", "amount": number }],
  "tipAmount": number or null
}

Rules:
- Each lineItem should be an individual dish, drink, or item on the receipt
- "quantity" is how many of that item were ordered (default 1 if not shown)
- "price" is the per-unit price, NOT the line total. If the receipt shows "2x Burger $25.98", return quantity: 2, price: 12.99
- Prices should be numbers (not strings), e.g. 12.99 not "$12.99"
- taxAmount is the tax line if present, null if not shown
- fees are any additional charges like service charge, gratuity, delivery fee — NOT tax
- tipAmount is the tip if already written on the receipt, null if not shown
- restaurantName from the header of the receipt, null if not visible
- Return ONLY valid JSON, no markdown fences, no explanation`;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const referer = request.headers.get("referer") ?? "";
  if (!isAllowedOrigin(origin) && !isAllowedOrigin(referer)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (ratelimit) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "anonymous";
    const { success, reset } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: "rate_limited" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) },
        }
      );
    }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "server_error" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { image, mimeType } = body as { image: string; mimeType: string };

  if (!image || !mimeType) {
    return NextResponse.json(
      { error: "image and mimeType are required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "unsupported_media_type" },
      { status: 415 }
    );
  }

  if (image.length > MAX_BASE64_LENGTH) {
    return NextResponse.json(
      { error: "image_too_large" },
      { status: 413 }
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let geminiResponse: Response;
  try {
    geminiResponse = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data: image } },
              { text: GEMINI_PROMPT },
            ],
          },
        ],
      }),
    });
  } catch (e) {
    clearTimeout(timeout);
    const isTimeout = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      { error: isTimeout ? "timeout" : "network_error" },
      { status: isTimeout ? 504 : 502 }
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    console.error("Upstream API error:", geminiResponse.status, errText);
    return NextResponse.json(
      { error: "upstream_error" },
      { status: 502 }
    );
  }

  const geminiData = await geminiResponse.json();
  const rawText =
    geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  try {
    const cleaned = rawText.replace(/```json\n?|```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const validated = ReceiptSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("Response validation failed:", validated.error.issues);
      return NextResponse.json({ error: "parse_error" }, { status: 502 });
    }
    return NextResponse.json(validated.data);
  } catch {
    console.error("Response parse failure:", rawText.slice(0, 500));
    return NextResponse.json(
      { error: "parse_error" },
      { status: 502 }
    );
  }
}
