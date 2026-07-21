import { NextRequest, NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { parseReceipt } from "@/lib/receipt-parsing/parse-service";
import { ReceiptParseError } from "@/lib/receipt-parsing/types";

const MAX_BASE64_LENGTH = 13_400_000;

const ALLOWED_ORIGINS = [
  "https://warikan0.netlify.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "capacitor://localhost",
  "http://localhost",
];

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function isAllowedOrigin(value: string): boolean {
  if (ALLOWED_ORIGINS.some((origin) => value.startsWith(origin))) return true;
  return /^https:\/\/[a-z0-9-]+--warikan0\.netlify\.app/.test(value);
}

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn("[parse-receipt] Upstash env vars missing - rate limiting is disabled");
}

const ratelimit =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, "1 h"), prefix: "warikan:rl" })
    : null;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const referer = request.headers.get("referer") ?? "";
  if (!isAllowedOrigin(origin) && !isAllowedOrigin(referer)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (ratelimit) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? request.headers.get("x-real-ip") ?? "anonymous";
    const { success, reset } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)) } });
    }
  }

  let body: { image?: string; mimeType?: string };
  try {
    body = (await request.json()) as { image?: string; mimeType?: string };
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { image, mimeType } = body;
  if (!image || !mimeType) return NextResponse.json({ error: "image and mimeType are required" }, { status: 400 });
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return NextResponse.json({ error: "unsupported_media_type" }, { status: 415 });
  if (image.length > MAX_BASE64_LENGTH) return NextResponse.json({ error: "image_too_large" }, { status: 413 });

  try {
    const result = await parseReceipt({ image, mimeType });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ReceiptParseError) {
      if (error.message === "missing_api_key") return NextResponse.json({ error: "server_error" }, { status: 500 });
      const status = error.code === "timeout" ? 504 : error.code === "network_error" || error.code === "upstream_error" ? 502 : 502;
      return NextResponse.json({ error: error.code, detail: error.status }, { status });
    }
    console.error("[parse-receipt] Unexpected parser error:", error);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
