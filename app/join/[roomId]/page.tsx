"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle, PartyPopper, RefreshCw, Wifi, WifiOff, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AVATAR_COLORS } from "@/components/split/person-avatar";
import {
  formatCurrency,
  initials,
  inlineInitials,
} from "@/lib/calculate";
import { cn } from "@/lib/utils";
import {
  subscribeToRoom,
  sendRoomAction,
  getLocalRoomPersonId,
  setLocalRoomPersonId,
} from "@/lib/room-client";
import type { RoomState, LineItem } from "@/lib/types";

// ─── State machine ────────────────────────────────────────────────────────────

type PageState =
  | { phase: "loading" }
  | { phase: "error"; message: string; retryable: boolean }
  | { phase: "pick_name"; room: RoomState }
  | { phase: "assigning"; room: RoomState; myPersonId: string }
  | { phase: "done" };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function personColorByIndex(index: number, covered?: boolean) {
  if (covered) {
    return {
      bg: "bg-amber-500/15",
      text: "text-amber-400",
      ring: "ring-amber-400",
      activeBg: "bg-amber-500",
    };
  }
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function countClaimedDishes(room: RoomState): number {
  return room.lineItems.filter((item) => {
    const assigned = room.assignments[item.id] ?? [];
    return assigned.length > 0;
  }).length;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ShakeItemProps {
  shaking: boolean;
  children: React.ReactNode;
}

function ShakeItem({ shaking, children }: ShakeItemProps) {
  return (
    <motion.div
      animate={shaking ? { x: [0, -8, 8, -6, 6, -4, 4, 0] } : {}}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  );
}

// ─── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-border border-t-primary" />
        <p className="text-muted-foreground">Loading session…</p>
      </div>
    </div>
  );
}

// ─── Error screen ─────────────────────────────────────────────────────────────

interface ErrorScreenProps {
  message: string;
  retryable: boolean;
  onRetry: () => void;
}

function ErrorScreen({ message, retryable, onRetry }: ErrorScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <WifiOff className="h-7 w-7 text-destructive" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold">Session unavailable</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {retryable && (
        <Button onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}

// ─── Done screen ──────────────────────────────────────────────────────────────

function DoneScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden px-6 text-center"
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 60%, hsl(160 64% 52% / 0.4), transparent)",
        }}
      />

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15"
      >
        <PartyPopper className="h-9 w-9 text-primary" />
      </motion.div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">You&apos;re all set!</h1>
        <p className="text-muted-foreground">
          The host will tally up everyone&apos;s totals.
        </p>
      </div>
    </motion.div>
  );
}

// ─── Name picker screen ───────────────────────────────────────────────────────

interface NamePickerProps {
  room: RoomState;
  onJoin: (personId: string) => void;
  joining: boolean;
}

function NamePicker({ room, onJoin, joining }: NamePickerProps) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-dvh flex-col pb-8"
    >
      {/* Header */}
      <div className="px-6 pt-14 pb-8 text-center">
        <p className="mb-1 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Warikan
        </p>
        <h1 className="text-2xl font-bold">
          {room.restaurantName ?? "Who are you?"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick your name to start claiming your dishes
        </p>
      </div>

      {/* People list */}
      <div className="flex flex-col gap-3 px-6">
        {room.people.map((person, i) => {
          const color = personColorByIndex(i, person.covered);
          const isClaimed = Boolean(room.claimedBy[person.id]);

          return (
            <motion.button
              key={person.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => {
                if (!isClaimed && !joining) onJoin(person.id);
              }}
              disabled={isClaimed || joining}
              className={cn(
                "flex min-h-[56px] items-center gap-4 rounded-2xl border px-4 py-3 text-left transition-all duration-150",
                isClaimed
                  ? "cursor-default border-emerald-500/25 bg-emerald-500/5 opacity-60"
                  : "cursor-pointer border-border/50 bg-card active:scale-[0.98] active:opacity-75"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  isClaimed
                    ? "bg-emerald-500/20 text-emerald-400"
                    : `${color.bg} ${color.text}`
                )}
              >
                {person.covered ? (
                  <Gift className="h-5 w-5" />
                ) : (
                  initials(person.name)
                )}
              </div>

              {/* Name */}
              <span className="flex-1 text-base font-medium">{person.name}</span>

              {/* Claimed badge */}
              {isClaimed && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Joined
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      {joining && (
        <div className="mt-6 flex justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      )}
    </motion.main>
  );
}

// ─── Assigning screen ─────────────────────────────────────────────────────────

interface AssigningProps {
  room: RoomState;
  myPersonId: string;
  onBack: () => void;
  onRoomUpdate: (room: RoomState) => void;
}

function AssigningView({ room, myPersonId, onBack, onRoomUpdate }: AssigningProps) {
  const [shakingItemId, setShakingItemId] = useState<string | null>(null);
  const [takenItemId, setTakenItemId] = useState<string | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myPerson = room.people.find((p) => p.id === myPersonId);
  const myIndex = room.people.findIndex((p) => p.id === myPersonId);
  const myColor = myPerson ? personColorByIndex(myIndex, myPerson.covered) : AVATAR_COLORS[0];

  const claimedCount = countClaimedDishes(room);
  const totalCount = room.lineItems.length;
  const allClaimed = claimedCount === totalCount && totalCount > 0;

  function personColorForId(personId: string) {
    const person = room.people.find((p) => p.id === personId);
    const idx = room.people.findIndex((p) => p.id === personId);
    return personColorByIndex(idx, person?.covered);
  }

  async function handleItemTap(item: LineItem) {
    const assigned = room.assignments[item.id] ?? [];
    const isMultiQty = (item.quantity ?? 1) > 1;
    const myClaims = assigned.filter((id) => id === myPersonId).length;

    let actionType: "claim_item" | "unclaim_item";

    if (isMultiQty) {
      const unclaimed = item.quantity - assigned.length;
      if (unclaimed > 0) {
        // There are open slots — always claim one more
        actionType = "claim_item";
      } else if (myClaims > 0) {
        // Fully claimed and I hold some — remove one of my claims
        actionType = "unclaim_item";
      } else {
        // Fully claimed by others — shake
        triggerShake(item.id, true);
        return;
      }
    } else {
      if (myClaims > 0) {
        actionType = "unclaim_item";
      } else {
        actionType = "claim_item";
      }
    }

    // Optimistic update
    const optimisticRoom = applyOptimisticUpdate(room, item.id, myPersonId, actionType);
    onRoomUpdate(optimisticRoom);

    try {
      const updated = await sendRoomAction(room.roomId, {
        type: actionType,
        personId: myPersonId,
        itemId: item.id,
      });
      onRoomUpdate(updated);
    } catch (err: unknown) {
      const apiErr = err as { code?: string };
      if (apiErr?.code === "409" || apiErr?.code === "already_claimed") {
        // Revert optimistic update and shake
        onRoomUpdate(room);
        triggerShake(item.id, true);
      } else {
        // For other errors, revert silently
        onRoomUpdate(room);
      }
    }
  }

  // Avatar badge taps always remove one claim — never add.
  async function handleUnclaim(item: LineItem) {
    const optimisticRoom = applyOptimisticUpdate(room, item.id, myPersonId, "unclaim_item");
    onRoomUpdate(optimisticRoom);
    try {
      const updated = await sendRoomAction(room.roomId, {
        type: "unclaim_item",
        personId: myPersonId,
        itemId: item.id,
      });
      onRoomUpdate(updated);
    } catch {
      onRoomUpdate(room);
    }
  }

  // Share button taps: add my claim to an item already held by others.
  async function handleShare(item: LineItem) {
    const optimisticRoom = applyOptimisticUpdate(room, item.id, myPersonId, "claim_item");
    onRoomUpdate(optimisticRoom);
    try {
      const updated = await sendRoomAction(room.roomId, {
        type: "claim_item",
        personId: myPersonId,
        itemId: item.id,
      });
      onRoomUpdate(updated);
    } catch {
      onRoomUpdate(room);
    }
  }

  function triggerShake(itemId: string, taken: boolean) {
    setShakingItemId(itemId);
    if (taken) setTakenItemId(itemId);
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
    shakeTimerRef.current = setTimeout(() => {
      setShakingItemId(null);
      setTakenItemId(null);
    }, 800);
  }

  return (
    <motion.main
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex min-h-dvh flex-col pb-40"
    >
      {/* Sticky header */}
      <div className="sticky-header px-6 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back to name picker"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold leading-tight">
              {myPerson?.name ?? "You"}
            </h1>
            <p className="text-xs text-muted-foreground">Assign your dishes</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: totalCount > 0 ? `${(claimedCount / totalCount) * 100}%` : "0%" }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="flex-shrink-0 text-xs tabular-nums text-muted-foreground">
            {claimedCount}/{totalCount} claimed
          </span>
        </div>
      </div>

      {/* Dish list */}
      <div className="px-6">
        <p className="mb-3 mt-4 text-sm font-medium text-muted-foreground">
          Tap a dish to claim it
        </p>

        <div className="flex flex-col gap-2">
          {room.lineItems.map((item) => {
            const assigned = room.assignments[item.id] ?? [];
            const isMultiQty = (item.quantity ?? 1) > 1;
            const myClaims = assigned.filter((id) => id === myPersonId).length;
            const isClaimedByMe = myClaims > 0;
            const isShaking = shakingItemId === item.id;
            const isTaken = takenItemId === item.id;

            if (isMultiQty) {
              const totalClaims = assigned.length;
              const unclaimed = item.quantity - totalClaims;
              const isFullyClaimed = unclaimed <= 0;

              const claimsByPerson: Record<string, number> = {};
              for (const pid of assigned) {
                claimsByPerson[pid] = (claimsByPerson[pid] ?? 0) + 1;
              }

              return (
                <ShakeItem key={item.id} shaking={isShaking}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => handleItemTap(item)}
                    onKeyDown={(e) => e.key === "Enter" && handleItemTap(item)}
                    className={cn(
                      "flex flex-col gap-2 rounded-xl border p-4 transition-all duration-150 select-none",
                      isClaimedByMe
                        ? "cursor-pointer border-primary/40 bg-primary/5 active:opacity-75"
                        : isFullyClaimed && !isClaimedByMe
                        ? "cursor-default border-transparent opacity-40"
                        : "cursor-pointer border-transparent active:scale-[0.98]"
                    )}
                  >
                    {isTaken && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="mb-1 self-start rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive"
                      >
                        Taken!
                      </motion.span>
                    )}

                    <div className="flex items-start justify-between">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <span className="flex h-6 w-8 flex-shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-medium tabular-nums">
                          ×{item.quantity}
                        </span>
                        <span className="text-base">{item.name}</span>
                      </div>
                      <span className="ml-3 flex-shrink-0 font-mono text-base font-medium tabular-nums">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Dot progress */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-1">
                          {Array.from({ length: item.quantity }, (_, dotIdx) => (
                            <div
                              key={dotIdx}
                              className={cn(
                                "h-2 w-2 rounded-full transition-colors",
                                dotIdx < totalClaims ? "bg-primary" : "bg-muted"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {totalClaims}/{item.quantity}
                        </span>
                      </div>

                      {/* Avatar badges */}
                      <div className="flex gap-1.5">
                        {Object.entries(claimsByPerson).map(([pid, count]) => {
                          const person = room.people.find((p) => p.id === pid);
                          if (!person) return null;
                          const color = personColorForId(pid);
                          const isMe = pid === myPersonId;

                          return (
                            <button
                              key={pid}
                              onClick={(e) => {
                                if (!isMe) return;
                                e.stopPropagation();
                                void handleUnclaim(item);
                              }}
                              className={cn(
                                "flex h-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                                color.bg,
                                color.text,
                                count > 1 && "gap-0.5 px-2",
                                isMe ? "active:opacity-70" : "cursor-default"
                              )}
                            >
                              {person.covered ? (
                                <Gift className="h-3 w-3" />
                              ) : (
                                inlineInitials(person.name)
                              )}
                              {count > 1 && (
                                <span className="tabular-nums">×{count}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                        {formatCurrency(item.price)}/ea
                      </span>
                    </div>
                  </div>
                </ShakeItem>
              );
            }

            // Single-quantity item
            const claimedByOther =
              assigned.length > 0 && !assigned.includes(myPersonId);

            return (
              <ShakeItem key={item.id} shaking={isShaking}>
                <button
                  onClick={() => !claimedByOther && handleItemTap(item)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all duration-150",
                    isClaimedByMe
                      ? "border-primary/40 bg-primary/5 active:opacity-75"
                      : claimedByOther
                      ? "cursor-default border-transparent"
                      : "border-transparent active:scale-[0.98]"
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    {isClaimedByMe && (
                      <div className="h-2 w-2 flex-shrink-0 rounded-full bg-primary shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                    )}
                    <span className="text-base">
                      {item.name}
                      {assigned.length > 0 && (
                        <span className="ml-1.5 inline-flex gap-1 align-middle">
                          {assigned.map((pid, aidx) => {
                            const person = room.people.find((p) => p.id === pid);
                            if (!person) return null;
                            const color = personColorForId(pid);
                            return (
                              <motion.span
                                key={`${pid}-${aidx}`}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{
                                  type: "spring",
                                  stiffness: 400,
                                  damping: 20,
                                }}
                                className={cn(
                                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                                  color.bg,
                                  color.text
                                )}
                              >
                                {person.covered ? (
                                  <Gift className="h-3 w-3" />
                                ) : (
                                  inlineInitials(person.name)
                                )}
                              </motion.span>
                            );
                          })}
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    {claimedByOther && (
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); void handleShare(item); }}
                        className="rounded-full border border-border/50 bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground active:opacity-70"
                      >
                        Share
                      </button>
                    )}
                    <div className="text-right">
                      <span className="font-mono text-base font-medium tabular-nums">
                        {formatCurrency(item.price)}
                      </span>
                      {assigned.length > 1 && (
                        <p className="font-mono text-xs tabular-nums text-muted-foreground">
                          {formatCurrency(item.price / assigned.length)} ea
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              </ShakeItem>
            );
          })}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {allClaimed ? (
                <CheckCircle className="h-4 w-4 text-primary" />
              ) : (
                <Wifi className="h-4 w-4 text-muted-foreground" />
              )}
              <span
                className={cn(
                  "text-sm font-medium",
                  allClaimed ? "text-primary" : "text-muted-foreground"
                )}
              >
                {allClaimed
                  ? "All dishes claimed! 🎉"
                  : "Waiting for others…"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "h-2 w-2 rounded-full",
                  allClaimed ? "bg-primary" : "animate-pulse bg-muted-foreground"
                )}
              />
              <span className="text-xs tabular-nums text-muted-foreground">
                {room.connectedPeople.length} online
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.main>
  );
}

// ─── Optimistic update helper ─────────────────────────────────────────────────

function applyOptimisticUpdate(
  room: RoomState,
  itemId: string,
  personId: string,
  action: "claim_item" | "unclaim_item"
): RoomState {
  const current = room.assignments[itemId] ?? [];
  let updated: string[];

  if (action === "claim_item") {
    updated = [...current, personId];
  } else {
    const idx = current.indexOf(personId);
    if (idx === -1) return room;
    updated = [...current.slice(0, idx), ...current.slice(idx + 1)];
  }

  return {
    ...room,
    assignments: {
      ...room.assignments,
      [itemId]: updated,
    },
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function JoinPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [pageState, setPageState] = useState<PageState>({ phase: "loading" });

  // Fetch initial room state
  const fetchRoom = useCallback(async () => {
    setPageState({ phase: "loading" });
    try {
      const res = await fetch(`/api/room/${roomId}`);
      if (res.status === 404) {
        setPageState({
          phase: "error",
          message: "This session has expired or doesn't exist.",
          retryable: false,
        });
        return;
      }
      if (!res.ok) {
        setPageState({
          phase: "error",
          message: "Couldn't connect to the session. Check your connection and try again.",
          retryable: true,
        });
        return;
      }
      const room = (await res.json()) as RoomState;

      // Check if we already have a claimed identity for this room
      const existingPersonId = getLocalRoomPersonId(roomId);
      if (existingPersonId && room.claimedBy[existingPersonId]) {
        if (room.status === "done") {
          setPageState({ phase: "done" });
        } else {
          setPageState({ phase: "assigning", room, myPersonId: existingPersonId });
        }
        return;
      }

      if (room.status === "done") {
        setPageState({ phase: "done" });
        return;
      }

      setPageState({ phase: "pick_name", room });
    } catch {
      setPageState({
        phase: "error",
        message: "Couldn't connect to the session. Check your connection and try again.",
        retryable: true,
      });
    }
  }, [roomId]);

  useEffect(() => {
    void fetchRoom();
  }, [fetchRoom]);

  // SSE subscription when in assigning phase
  useEffect(() => {
    if (pageState.phase !== "assigning") return;

    const { room, myPersonId } = pageState;

    const unsubscribe = subscribeToRoom(
      roomId,
      room.version,
      (updatedRoom) => {
        if (updatedRoom.status === "done") {
          setPageState({ phase: "done" });
          return;
        }
        setPageState((prev) => {
          if (prev.phase !== "assigning") return prev;
          return { ...prev, room: updatedRoom };
        });
      },
      () => {
        // Room not found — expired
        setPageState({
          phase: "error",
          message: "This session has expired.",
          retryable: false,
        });
      }
    );

    return unsubscribe;
  }, [roomId, pageState.phase === "assigning" ? pageState.myPersonId : null, pageState.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // SSE subscription when in pick_name phase (to update claimed slots in real-time)
  useEffect(() => {
    if (pageState.phase !== "pick_name") return;

    const { room } = pageState;

    const unsubscribe = subscribeToRoom(
      roomId,
      room.version,
      (updatedRoom) => {
        if (updatedRoom.status === "done") {
          setPageState({ phase: "done" });
          return;
        }
        setPageState((prev) => {
          if (prev.phase !== "pick_name") return prev;
          return { phase: "pick_name", room: updatedRoom };
        });
      },
      () => {
        setPageState({
          phase: "error",
          message: "This session has expired.",
          retryable: false,
        });
      }
    );

    return unsubscribe;
  }, [roomId, pageState.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle join
  const [joining, setJoining] = useState(false);

  async function handleJoin(personId: string) {
    if (pageState.phase !== "pick_name") return;
    setJoining(true);

    try {
      const updatedRoom = await sendRoomAction(roomId, {
        type: "join",
        personId,
      });
      setLocalRoomPersonId(roomId, personId);
      setJoining(false);

      if (updatedRoom.status === "done") {
        setPageState({ phase: "done" });
      } else {
        setPageState({ phase: "assigning", room: updatedRoom, myPersonId: personId });
      }
    } catch {
      setJoining(false);
      // Could show inline error but don't disrupt picker
    }
  }

  function handleBackToNamePicker() {
    if (pageState.phase !== "assigning") return;
    const { room } = pageState;
    setPageState({ phase: "pick_name", room });
  }

  function handleRoomUpdate(updatedRoom: RoomState) {
    setPageState((prev) => {
      if (prev.phase !== "assigning") return prev;
      return { ...prev, room: updatedRoom };
    });
  }

  return (
    <AnimatePresence mode="wait">
      {pageState.phase === "loading" && (
        <motion.div key="loading" exit={{ opacity: 0 }}>
          <LoadingScreen />
        </motion.div>
      )}

      {pageState.phase === "error" && (
        <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ErrorScreen
            message={pageState.message}
            retryable={pageState.retryable}
            onRetry={fetchRoom}
          />
        </motion.div>
      )}

      {pageState.phase === "pick_name" && (
        <motion.div key="pick_name" exit={{ opacity: 0, y: -8 }}>
          <NamePicker
            room={pageState.room}
            onJoin={handleJoin}
            joining={joining}
          />
        </motion.div>
      )}

      {pageState.phase === "assigning" && (
        <motion.div key="assigning" exit={{ opacity: 0 }}>
          <AssigningView
            room={pageState.room}
            myPersonId={pageState.myPersonId}
            onBack={handleBackToNamePicker}
            onRoomUpdate={handleRoomUpdate}
          />
        </motion.div>
      )}

      {pageState.phase === "done" && (
        <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <DoneScreen />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
