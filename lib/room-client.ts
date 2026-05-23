/**
 * room-client.ts
 *
 * Pure TypeScript (no React) client utilities for the collaborative
 * real-time receipt-splitting feature.
 */

import { APP_URL } from "@/lib/platform";
import type { RoomAction, RoomState } from "@/lib/types";

// ─── ID / URL helpers ─────────────────────────────────────────────────────────

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Returns a 6-character uppercase alphanumeric room ID drawn from an
 * unambiguous charset (no 0/O/I/1).
 */
export function generateRoomId(): string {
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => CHARSET[b % CHARSET.length])
    .join("");
}

/**
 * Returns the full join URL for the given roomId.
 * Uses APP_URL (set per-environment via NEXT_PUBLIC_APP_URL) on all Netlify
 * deployments. Falls back to window.location.origin only in local dev so
 * the QR code is scannable against a local dev server.
 */
export function getRoomJoinUrl(roomId: string): string {
  const base =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? window.location.origin
      : APP_URL;
  return `${base}/join/${roomId}`;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

interface ApiError extends Error {
  code: string;
}

function buildApiError(code: string, message: string): ApiError {
  const err = new Error(message) as ApiError;
  err.code = code;
  return err;
}

async function postRoomAction(roomId: string, action: RoomAction): Promise<RoomState> {
  const res = await fetch(`/api/room/${roomId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action),
  });

  const json = await res.json();

  if (!res.ok) {
    throw buildApiError(
      String(json?.code ?? res.status),
      String(json?.message ?? `Request failed with status ${res.status}`),
    );
  }

  return json as RoomState;
}

/**
 * Creates a room by POSTing the initial action to the server.
 * Throws an error with a `.code` property on non-OK responses.
 */
export async function createRoom(roomId: string, action: RoomAction): Promise<RoomState> {
  return postRoomAction(roomId, action);
}

/**
 * Sends any room action to the server and returns the updated RoomState.
 * Throws an error with a `.code` property on non-OK responses.
 */
export async function sendRoomAction(roomId: string, action: RoomAction): Promise<RoomState> {
  return postRoomAction(roomId, action);
}

/**
 * Fetches the current state of an existing room via GET.
 * Returns null if the room does not exist (404) or on any error.
 */
export async function fetchRoom(roomId: string): Promise<RoomState | null> {
  try {
    const res = await fetch(`/api/room/${roomId}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as RoomState;
  } catch {
    return null;
  }
}

// ─── SSE subscription ─────────────────────────────────────────────────────────

/**
 * Opens an SSE connection to the room's subscribe endpoint.
 *
 * - `onState`    — called with the full RoomState whenever the server pushes one.
 * - `onNotFound` — called when the room no longer exists; the connection is closed.
 *
 * Returns a cleanup function that tears down the connection and prevents
 * any further reconnect attempts.
 */
export function subscribeToRoom(
  roomId: string,
  since: number,
  onState: (state: RoomState) => void,
  onNotFound: () => void,
): () => void {
  let es: EventSource | null = null;
  let lastVersion = since;
  let destroyed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function cleanup() {
    destroyed = true;
    if (reconnectTimer !== null) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (es) {
      es.close();
      es = null;
    }
  }

  function connect(version: number) {
    if (destroyed) return;

    const url = `/api/room/${roomId}/subscribe?since=${version}`;
    const source = new EventSource(url);
    es = source;

    source.addEventListener("state", (e: MessageEvent) => {
      if (destroyed) return;
      try {
        const state = JSON.parse(e.data) as RoomState;
        lastVersion = state.version;
        onState(state);
      } catch {
        // Malformed data — ignore and wait for the next event.
      }
    });

    source.addEventListener("timeout", () => {
      // Server closed the connection gracefully; reconnect immediately.
      source.close();
      if (!destroyed) {
        connect(lastVersion);
      }
    });

    source.addEventListener("not_found", () => {
      source.close();
      if (!destroyed) {
        onNotFound();
        destroyed = true;
      }
    });

    // The "ping" event is intentionally ignored — it's just a heartbeat.

    // Use addEventListener (not onerror =) so we can call stopPropagation().
    // Without it, the browser fires the error Event on window, which Next.js's
    // dev overlay catches and renders as "[object Event]".
    source.addEventListener("error", (e: Event) => {
      e.stopPropagation();
      source.close();
      if (!destroyed) {
        // Short delay before reconnecting to avoid hammering the server on
        // rapid connection failures, while keeping perceived latency low.
        reconnectTimer = setTimeout(() => {
          reconnectTimer = null;
          connect(lastVersion);
        }, 500);
      }
    });
  }

  connect(lastVersion);

  return cleanup;
}

// ─── Per-device identity persistence ─────────────────────────────────────────

const storageKey = (roomId: string) => `warikan_room_person_${roomId}`;

/**
 * Returns the personId this device has claimed for the given room, or null.
 */
export function getLocalRoomPersonId(roomId: string): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(storageKey(roomId));
}

/**
 * Persists the personId claimed by this device for the given room.
 */
export function setLocalRoomPersonId(roomId: string, personId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(storageKey(roomId), personId);
}

/**
 * Removes the stored personId for the given room (e.g. on leave/cleanup).
 */
export function clearLocalRoomPersonId(roomId: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(storageKey(roomId));
}
