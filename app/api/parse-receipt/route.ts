import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { parseReceipt } from "@/lib/receipt-parsing/parse-service";
import { ReceiptParseError } from "@/lib/receipt-parsing/types";
import { corsHeaders, isAllowedOrigin } from "@/lib/cors";

const MAX_BASE64_LENGTH = 13_400_000;
const MAX_OCR_TEXT_LENGTH = 50_000;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn("[parse-receipt] Upstash env vars missing - rate limiting is disabled");
}

const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "warikan:rl" })
    : null;

// Preflight for the Capacitor app, which calls this route cross-origin.
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin, "POST, OPTIONS") });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const referer = request.headers.get("referer") ?? "";
  const cors = corsHeaders(origin, "POST, OPTIONS");
  if (!isAllowedOrigin(origin) && !isAllowedOrigin(referer)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers: cors });
  }

  if (ratelimit) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? request.headers.get("x-real-ip") ?? "anonymous";
    const { success, reset } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { ...cors, "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) } });
    }
  }

  let body: { image?: string; mimeType?: string; text?: string; source?: string };
  try {
    body = (await request.json()) as { image?: string; mimeType?: string; text?: string; source?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: cors });
  }

  const { image, mimeType, text, source } = body;
  const hasText = typeof text === "string" && text.trim().length > 0;
  if (hasText) {
    if (source !== "apple_ocr") return NextResponse.json({ error: "unsupported_text_source" }, { status: 400, headers: cors });
    if (text.length > MAX_OCR_TEXT_LENGTH) return NextResponse.json({ error: "text_too_large" }, { status: 413, headers: cors });
  } else {
    if (!image || !mimeType) return NextResponse.json({ error: "image and mimeType are required" }, { status: 400, headers: cors });
    if (!ALLOWED_MIME_TYPES.has(mimeType)) return NextResponse.json({ error: "unsupported_media_type" }, { status: 415, headers: cors });
    if (image.length > MAX_BASE64_LENGTH) return NextResponse.json({ error: "image_too_large" }, { status: 413, headers: cors });
  }

  try {
    const result = await parseReceipt(hasText ? { kind: "text", text: text.trim(), source: "apple_ocr" } : { kind: "image", image: image!, mimeType: mimeType! });
    return NextResponse.json(result, { headers: cors });
  } catch (error) {
    if (error instanceof ReceiptParseError) {
      if (error.message === "missing_api_key") return NextResponse.json({ error: "server_error" }, { status: 500, headers: cors });
      const status = error.code === "timeout" ? 504 : error.code === "network_error" || error.code === "upstream_error" ? 502 : 502;
      return NextResponse.json({ error: error.code, detail: error.status }, { status, headers: cors });
    }
    console.error("[parse-receipt] Unexpected parser error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500, headers: cors });
  }
}
