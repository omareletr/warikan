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

const FALLBACK_POLL_INTERVAL_MS = 10_000; // safety net in case pub/sub drops a message
const MAX_DURATION_MS = 30_000;           // max SSE connection lifetime
const PING_INTERVAL_MS = 10_000;          // heartbeat frequency

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

  // AbortController scoped outside ReadableStream so cancel() can call abort()
  const abortCtrl = new AbortController();
  let closed = false;
  let pingTimer: ReturnType<typeof setInterval> | undefined;
  let fallbackTimer: ReturnType<typeof setInterval> | undefined;
  let maxDurationTimer: ReturnType<typeof setTimeout> | undefined;

  const stream = new ReadableStream({
    async start(streamCtrl) {
      const enc = new TextEncoder();

      function send(chunk: string): boolean {
        try {
          streamCtrl.enqueue(enc.encode(chunk));
          return true;
        } catch {
          // Controller already closed (client disconnected)
          return false;
        }
      }

      function close(): void {
        try {
          streamCtrl.close();
        } catch {
          // Already closed — ignore
        }
      }

      function closeAll(): void {
        if (closed) return;
        closed = true;
        abortCtrl.abort();
        clearTimeout(maxDurationTimer);
        clearInterval(pingTimer);
        clearInterval(fallbackTimer);
        close();
      }

      // Check if room exists at all before starting listeners
      let initialState: RoomState | null = null;
      try {
        initialState = await redis!.get<RoomState>(roomKey);
      } catch (err) {
        console.error("[subscribe] Redis error on initial fetch:", err);
        send(sseEvent("not_found", {}));
        closeAll();
        return;
      }

      if (!initialState) {
        send(sseEvent("not_found", {}));
        closeAll();
        return;
      }

      // If the client has never seen this room (since === -1), send the
      // current state immediately so they don't have to wait for the first event.
      if (since === -1) {
        if (!send(sseEvent("state", initialState))) {
          closeAll();
          return;
        }
        since = initialState.version;
      }

      // ── Max duration timeout ─────────────────────────────────────────────
      maxDurationTimer = setTimeout(() => {
        send(sseEvent("timeout", {}));
        closeAll();
      }, MAX_DURATION_MS - (Date.now() - startedAt));

      // ── Heartbeat ping ───────────────────────────────────────────────────
      pingTimer = setInterval(() => {
        if (!send(sseEvent("ping", {}))) closeAll();
      }, PING_INTERVAL_MS);

      // ── Helper: fetch room and push to client if newer ───────────────────
      async function pushIfNewer(): Promise<void> {
        if (closed) return;
        let state: RoomState | null = null;
        try {
          state = await redis!.get<RoomState>(roomKey);
        } catch (err) {
          console.error("[subscribe] Redis error during fetch:", err);
          return; // transient — try again next time
        }
        if (!state) {
          send(sseEvent("not_found", {}));
          closeAll();
          return;
        }
        if (state.version > since) {
          if (!send(sseEvent("state", state))) {
            closeAll();
            return;
          }
          since = state.version;
        }
      }

      // ── Fallback poll (safety net for dropped pub/sub messages) ──────────
      let pollInFlight = false;
      fallbackTimer = setInterval(async () => {
        if (pollInFlight || closed) return;
        pollInFlight = true;
        try { await pushIfNewer(); } finally { pollInFlight = false; }
      }, FALLBACK_POLL_INTERVAL_MS);

      // ── Upstash pub/sub listener ─────────────────────────────────────────
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

      if (redisUrl && redisToken) {
        const channel = `room:${roomId}`;
        const pubsubUrl = `${redisUrl}/subscribe/${encodeURIComponent(channel)}`;

        (async () => {
          try {
            const pubsubRes = await fetch(pubsubUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${redisToken}`,
                Accept: "text/event-stream",
              },
              signal: abortCtrl.signal,
            });

            if (!pubsubRes.ok || !pubsubRes.body) {
              console.error(
                `[subscribe] Upstash pub/sub response not ok: ${pubsubRes.status}`
              );
              // Fall through — fallback poll will handle it
              return;
            }

            const reader = pubsubRes.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (!closed) {
              let result: ReadableStreamReadResult<Uint8Array>;
              try {
                result = await reader.read();
              } catch {
                // AbortError or network error — exit cleanly
                break;
              }

              if (result.done) break;

              buffer += decoder.decode(result.value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? ""; // keep incomplete last line

              for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const raw = line.slice(6).trim(); // strip "data: "
                // Upstash SSE format: "type,channel,payload"
                const commaIdx = raw.indexOf(",");
                const commaIdx2 = raw.indexOf(",", commaIdx + 1);
                if (commaIdx === -1 || commaIdx2 === -1) continue;
                const msgType = raw.slice(0, commaIdx);
                const payload = raw.slice(commaIdx2 + 1);

                if (msgType === "message") {
                  const publishedVersion = parseInt(payload, 10);
                  if (!isNaN(publishedVersion) && publishedVersion > since) {
                    await pushIfNewer();
                  }
                }
                // "subscribe" lines are confirmations — ignore
              }
            }
          } catch (err) {
            // Only log if it's not an intentional abort
            if ((err as Error)?.name !== "AbortError") {
              console.error("[subscribe] Upstash pub/sub error:", err);
            }
            // Fall through — fallback poll still running
          }
        })();
      } else {
        console.warn("[subscribe] Upstash env vars missing — using fallback poll only");
      }
    },
    cancel() {
      // Client disconnected — abort the Upstash pub/sub fetch and clear timers
      abortCtrl.abort();
      clearTimeout(maxDurationTimer);
      clearInterval(pingTimer);
      clearInterval(fallbackTimer);
      closed = true;
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
