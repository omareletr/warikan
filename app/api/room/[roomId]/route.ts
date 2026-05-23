import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import type { RoomState, RoomAction, LineItem, Person } from "@/lib/types";

// Room actions mutate Redis state — always dynamic.
export const dynamic = "force-dynamic";

// ─── Redis ────────────────────────────────────────────────────────────────

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

if (!redis) {
  console.warn("[room] Upstash env vars missing — room API will return 503");
}

// ─── Constants ────────────────────────────────────────────────────────────

const ROOM_TTL = 1800; // 30 minutes
// Matches the generator charset (ABCDEFGHJKLMNPQRSTUVWXYZ23456789) — no 0/O/1/I.
const ROOM_ID_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
const VALID_ACTION_TYPES = new Set<RoomAction["type"]>([
  "create",
  "join",
  "leave",
  "claim_item",
  "unclaim_item",
  "host_assign",
  "close",
]);

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
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function roomKey(roomId: string): string {
  return `room:${roomId}`;
}

function versionKey(roomId: string): string {
  return `room:${roomId}:version`;
}

async function getRoom(roomId: string): Promise<RoomState | null> {
  if (!redis) return null;
  const data = await redis.get<RoomState>(roomKey(roomId));
  return data ?? null;
}

async function saveRoom(state: RoomState): Promise<RoomState> {
  if (!redis) return state;
  // Build a new object with the incremented version so we never mutate the
  // caller's reference before the Redis write succeeds.
  const newState: RoomState = { ...state, version: state.version + 1 };
  await Promise.all([
    redis.set(roomKey(newState.roomId), newState, { ex: ROOM_TTL }),
    redis.set(versionKey(newState.roomId), newState.version, { ex: ROOM_TTL }),
  ]);
  return newState;
}

function jsonError(
  message: string,
  code: string,
  status: number,
  extraHeaders?: Record<string, string>
): NextResponse {
  return NextResponse.json(
    { error: code, message },
    { status, headers: extraHeaders }
  );
}

// ─── Route params ─────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ roomId: string }>;
}

// ─── GET — fetch current room state ───────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { roomId } = await context.params;
  const origin = request.headers.get("origin") ?? "";
  const cors = corsHeaders(origin);

  if (!ROOM_ID_RE.test(roomId)) {
    return jsonError("Invalid room ID format", "invalid_room_id", 400, cors);
  }

  if (!redis) {
    return jsonError("Storage unavailable", "storage_unavailable", 503, cors);
  }

  const state = await getRoom(roomId);
  if (!state) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: cors });
  }

  return NextResponse.json(state, { headers: cors });
}

// ─── OPTIONS — preflight ───────────────────────────────────────────────────

export async function OPTIONS(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { roomId: _roomId } = await context.params;
  const origin = request.headers.get("origin") ?? "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

// ─── POST — process a RoomAction ──────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  const { roomId } = await context.params;
  const origin = request.headers.get("origin") ?? "";
  const cors = corsHeaders(origin);

  if (!ROOM_ID_RE.test(roomId)) {
    return jsonError("Invalid room ID format", "invalid_room_id", 400, cors);
  }

  if (!redis) {
    return jsonError("Storage unavailable", "storage_unavailable", 503, cors);
  }

  let action: RoomAction;
  try {
    action = (await request.json()) as RoomAction;
  } catch {
    return jsonError("Invalid JSON body", "invalid_body", 400, cors);
  }

  if (!action.type || !VALID_ACTION_TYPES.has(action.type)) {
    return jsonError(
      `Unknown action type: ${action.type}`,
      "unknown_action",
      400,
      cors
    );
  }

  // ── create ──────────────────────────────────────────────────────────────
  if (action.type === "create") {
    const existing = await getRoom(roomId);
    if (existing) {
      return jsonError("Room already exists", "room_exists", 409, cors);
    }

    const lineItems: LineItem[] = (action.lineItems ?? []).map((item) => ({
      ...item,
      assignedToIds: item.assignedToIds ?? [],
    }));

    // Seed assignments from any existing assignedToIds on the line items
    const assignments: Record<string, string[]> = {};
    for (const item of lineItems) {
      assignments[item.id] = [...item.assignedToIds];
    }

    const newState: RoomState = {
      roomId,
      restaurantName: action.restaurantName,
      lineItems,
      people: action.people ?? [],
      assignments,
      connectedPeople: [],
      claimedBy: {},
      status: "waiting",
      createdAt: Date.now(),
      version: 0, // saveRoom will increment to 1
    };

    const savedState = await saveRoom(newState);
    return NextResponse.json(savedState, { status: 201, headers: cors });
  }

  // All other actions require an existing room
  const state = await getRoom(roomId);
  if (!state) {
    return NextResponse.json({ error: "not_found" }, { status: 404, headers: cors });
  }

  // ── join ─────────────────────────────────────────────────────────────────
  if (action.type === "join") {
    const { personId } = action;
    if (!personId) {
      return jsonError("personId is required for join", "missing_field", 400, cors);
    }

    // Look up the person's name from the people list
    const person: Person | undefined = state.people.find((p) => p.id === personId);
    const personName = person?.name ?? personId;

    // Check if already claimed by a different session (same personId is idempotent)
    const existingClaim = state.claimedBy[personId];
    if (existingClaim !== undefined && existingClaim !== personName) {
      return jsonError(
        "Identity already claimed",
        "identity_claimed",
        409,
        cors
      );
    }

    const updatedJoinState: RoomState = {
      ...state,
      connectedPeople: state.connectedPeople.includes(personId)
        ? state.connectedPeople
        : [...state.connectedPeople, personId],
      claimedBy: { ...state.claimedBy, [personId]: personName },
    };

    const savedJoinState = await saveRoom(updatedJoinState);
    return NextResponse.json(savedJoinState, { headers: cors });
  }

  // ── leave ─────────────────────────────────────────────────────────────────
  if (action.type === "leave") {
    const { personId } = action;
    if (!personId) {
      return jsonError("personId is required for leave", "missing_field", 400, cors);
    }

    const updatedLeaveState: RoomState = {
      ...state,
      connectedPeople: state.connectedPeople.filter((id) => id !== personId),
    };

    const savedLeaveState = await saveRoom(updatedLeaveState);
    return NextResponse.json(savedLeaveState, { headers: cors });
  }

  // ── claim_item ────────────────────────────────────────────────────────────
  if (action.type === "claim_item") {
    const { personId, itemId } = action;
    if (!personId || !itemId) {
      return jsonError(
        "personId and itemId are required for claim_item",
        "missing_field",
        400,
        cors
      );
    }

    const lineItem = state.lineItems.find((i) => i.id === itemId);
    if (!lineItem) {
      return jsonError("Item not found", "item_not_found", 404, cors);
    }

    // quantity: 0 items are not claimable
    if (lineItem.quantity === 0) {
      return jsonError("Item is not available", "item_unavailable", 409, cors);
    }

    const current = state.assignments[itemId] ?? [];
    const qty = lineItem.quantity <= 1 ? 1 : lineItem.quantity;
    let newAssignment: string[];

    if (qty <= 1) {
      // Single-quantity item — sharing is allowed (multiple people can split it)
      if (current.includes(personId)) {
        // Already sharing — toggle off (unclaim)
        newAssignment = current.filter((id) => id !== personId);
      } else {
        // Unclaimed or claimed by others — add this person (share)
        newAssignment = [...current, personId];
      }
    } else {
      // Multi-quantity item
      const personClaimCount = current.filter((id) => id === personId).length;
      const slotsRemaining = qty - current.length;

      if (slotsRemaining > 0) {
        // There are open slots — add one claim for this person
        newAssignment = [...current, personId];
      } else if (personClaimCount > 0) {
        // Fully claimed and this person has claims — remove all their claims
        newAssignment = current.filter((id) => id !== personId);
      } else {
        // Fully claimed and person has no claims
        return jsonError("Item already claimed", "already_claimed", 409, cors);
      }
    }

    const claimState: RoomState = {
      ...state,
      assignments: { ...state.assignments, [itemId]: newAssignment },
    };
    const savedClaimState = await saveRoom(claimState);
    return NextResponse.json(savedClaimState, { headers: cors });
  }

  // ── unclaim_item ──────────────────────────────────────────────────────────
  if (action.type === "unclaim_item") {
    const { personId, itemId } = action;
    if (!personId || !itemId) {
      return jsonError(
        "personId and itemId are required for unclaim_item",
        "missing_field",
        400,
        cors
      );
    }

    // Remove one occurrence of personId immutably
    const unclaimCurrent = state.assignments[itemId] ?? [];
    const unclaimIdx = unclaimCurrent.indexOf(personId);
    const unclaimAssignment =
      unclaimIdx !== -1
        ? [...unclaimCurrent.slice(0, unclaimIdx), ...unclaimCurrent.slice(unclaimIdx + 1)]
        : unclaimCurrent;

    const unclaimState: RoomState = {
      ...state,
      assignments: { ...state.assignments, [itemId]: unclaimAssignment },
    };
    const savedUnclaimState = await saveRoom(unclaimState);
    return NextResponse.json(savedUnclaimState, { headers: cors });
  }

  // ── host_assign ───────────────────────────────────────────────────────────
  if (action.type === "host_assign") {
    const { itemId, assignedToIds } = action;
    if (!itemId) {
      return jsonError(
        "itemId is required for host_assign",
        "missing_field",
        400,
        cors
      );
    }

    // Host sends the full resulting assignedToIds array — use it verbatim.
    // This preserves guest claims alongside host changes without any server-side
    // toggle logic that could race with the client's optimistic update.
    const hostAssignState: RoomState = {
      ...state,
      assignments: { ...state.assignments, [itemId]: assignedToIds ?? [] },
    };
    const savedHostState = await saveRoom(hostAssignState);
    return NextResponse.json(savedHostState, { headers: cors });
  }

  // ── close ─────────────────────────────────────────────────────────────────
  if (action.type === "close") {
    const closeState: RoomState = { ...state, status: "done" };
    const savedCloseState = await saveRoom(closeState);
    return NextResponse.json(savedCloseState, { headers: cors });
  }

  // Should be unreachable given the VALID_ACTION_TYPES guard above
  return jsonError("Unhandled action", "unhandled_action", 500, cors);
}
