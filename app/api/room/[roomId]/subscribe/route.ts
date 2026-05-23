import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import type { RoomState } from "@/lib/types";

// SSE streams are always dynamic — never cache or statically render.
export const dynamic = "force-dynamic";

// ─── Redis ────────────────────────────────────────────────────────────────

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// ─── Constants ────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 1500;  // how often to check for state changes
const MAX_DURATION_MS = 30_000; // max SSE connection lifetime
const PING_INTERVAL_MS = 10_000; // heartbeat frequency

// Matches the generator charset (ABCDEFGHJKLMNPQRSTUVWXYZ23456789) — no 0/O/1/I.
const ROOM_ID_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

// ─── CORS ─────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://warikan0.netlify.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "capacitor://localhost",
  "http://localhost",
];

function isAllowedOrigin(value: string): boolean {
  if (ALLOWED_ORIGINS.some((o) => value.startsWith(o))) return true;
  return /^https:\/\/[a-z0-9-]+--warikan0\.netlify\.app/.test(value);
}

function corsHeaders(origin: string): Record<string, string> {
  const allowed = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

// ─── SSE helpers ──────────────────────────────────────────────────────────

function sseEvent(event: string, data: unknown): string {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  return `event: ${event}\ndata: ${payload}\n\n`;
}

// ─── Route params ─────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ roomId: string }>;
}

// ─── OPTIONS — preflight ──────────────────────────────────────────────────

export async function OPTIONS(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { roomId: _roomId } = await context.params;
  const origin = request.headers.get("origin") ?? "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

// ─── GET — SSE stream ─────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<Response> {
  const { roomId } = await context.params;
  const origin = request.headers.get("origin") ?? "";
  const cors = corsHeaders(origin);

  if (!ROOM_ID_RE.test(roomId)) {
    return new Response(
      JSON.stringify({ error: "invalid_room_id" }),
      { status: 400, headers: { "Content-Type": "application/json", ...cors } }
    );
  }

  if (!redis) {
    return new Response(
      JSON.stringify({ error: "storage_unavailable" }),
      { status: 503, headers: { "Content-Type": "application/json", ...cors } }
    );
  }

  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since");
  let since = sinceParam !== null ? parseInt(sinceParam, 10) : -1;
  if (isNaN(since)) since = -1;

  const roomKey = `room:${roomId}`;
  const startedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();

      function send(chunk: string): boolean {
        try {
          controller.enqueue(enc.encode(chunk));
          return true;
        } catch {
          // Controller already closed (client disconnected)
          return false;
        }
      }

      function close(): void {
        try {
          controller.close();
        } catch {
          // Already closed — ignore
        }
      }

      // Check if room exists at all before entering the loop
      let initialState: RoomState | null = null;
      try {
        initialState = await redis!.get<RoomState>(roomKey);
      } catch (err) {
        console.error("[subscribe] Redis error on initial fetch:", err);
        send(sseEvent("not_found", {}));
        close();
        return;
      }

      if (!initialState) {
        send(sseEvent("not_found", {}));
        close();
        return;
      }

      // If the client has never seen this room (since === -1), send the
      // current state immediately so they don't have to wait for first poll.
      if (since === -1) {
        if (!send(sseEvent("state", initialState))) {
          close();
          return;
        }
        since = initialState.version;
      }

      let lastPingAt = Date.now();

      // Poll loop
      while (true) {
        const elapsed = Date.now() - startedAt;

        if (elapsed >= MAX_DURATION_MS) {
          send(sseEvent("timeout", {}));
          close();
          return;
        }

        // Wait for next poll interval
        await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

        // Send a heartbeat ping every PING_INTERVAL_MS
        if (Date.now() - lastPingAt >= PING_INTERVAL_MS) {
          if (!send(sseEvent("ping", {}))) {
            close();
            return;
          }
          lastPingAt = Date.now();
        }

        // Fetch latest room state
        let state: RoomState | null = null;
        try {
          state = await redis!.get<RoomState>(roomKey);
        } catch (err) {
          console.error("[subscribe] Redis error during poll:", err);
          // Don't close on transient errors — try again next tick
          continue;
        }

        if (!state) {
          // Room expired or was deleted
          send(sseEvent("not_found", {}));
          close();
          return;
        }

        if (state.version > since) {
          if (!send(sseEvent("state", state))) {
            close();
            return;
          }
          since = state.version;
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      ...cors,
    },
  });
}
