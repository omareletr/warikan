"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Gift, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PersonAvatar, AVATAR_COLORS } from "@/components/split/person-avatar";
import { InviteDrawer } from "@/components/split/invite-drawer";
import { useSplitFlow } from "@/lib/split-flow-context";
import { consumePopFlag } from "@/lib/nav-flag";
import { formatCurrency, initials, inlineInitials } from "@/lib/calculate";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/platform";
import {
  generateRoomId,
  getRoomJoinUrl,
  createRoom,
  sendRoomAction,
  subscribeToRoom,
} from "@/lib/room-client";
import type { RoomState } from "@/lib/types";

export default function AssignPage() {
  const router = useRouter();
  const { state, loaded, updateLineItems } = useSplitFlow();
  const [fromPop] = useState(() => consumePopFlag());
  const [selectedPersonId, setSelectedPersonId] = useState<string>(state.people[0]?.id ?? "");

  // Collaborative room state
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // Keep a ref to the latest lineItems so the SSE callback never reads a stale closure.
  const lineItemsRef = useRef(state.lineItems);
  useEffect(() => {
    lineItemsRef.current = state.lineItems;
  }, [state.lineItems]);

  useEffect(() => {
    if (loaded && state.lineItems.length === 0) router.replace("/");
  }, [loaded, state.lineItems.length, router]);

  // The full assignments snapshot the host most recently sent to the server.
  // The SSE callback uses this to detect whether an incoming update is just
  // the echo of our own write (in which case we keep local state) or a real
  // guest change (in which case we accept the server value).
  const pendingAssignmentsRef = useRef<Record<string, string[]>>({});

  // SSE subscription — sync room assignments back into the split flow context
  useEffect(() => {
    if (!roomId) return;
    const since = roomState?.version ?? -1;
    const unsubscribe = subscribeToRoom(
      roomId,
      since,
      (updatedRoom) => {
        setRoomState(updatedRoom);
        // Merge server assignments into local lineItems.
        // pendingAssignmentsRef holds the full assignments map the host last
        // sent. If every item in the server update matches that snapshot, this
        // is just the echo of our own write — keep local state and clear the
        // pending marker. If any item diverges, a guest changed it — accept
        // the server value for that item.
        const pending = pendingAssignmentsRef.current;
        const hasPending = Object.keys(pending).length > 0;

        const updatedLineItems = lineItemsRef.current.map((item) => {
          const serverIds = updatedRoom.assignments[item.id] ?? [];
          if (hasPending) {
            const sentIds = pending[item.id];
            // sentIds may be undefined for items not in the snapshot (shouldn't
            // happen after a bulk write, but guard anyway).
            if (sentIds !== undefined &&
                JSON.stringify([...sentIds].sort()) === JSON.stringify([...serverIds].sort())) {
              return item; // echo of our write — keep local
            }
          }
          // No pending write, or server diverged (guest changed it) — accept server.
          return { ...item, assignedToIds: serverIds };
        });

        // Clear pending only once we've confirmed the echo arrived
        if (hasPending) {
          pendingAssignmentsRef.current = {};
        }

        updateLineItems(updatedLineItems);
      },
      () => {
        // Room expired — fall back to solo mode
        setRoomId(null);
        setRoomState(null);
      }
    );
    return unsubscribe;
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInvite() {
    if (roomId) {
      setShowInvite(true);
      return;
    }
    setIsCreatingRoom(true);
    try {
      const newRoomId = generateRoomId();
      const room = await createRoom(newRoomId, {
        type: "create",
        lineItems: state.lineItems,
        people: state.people,
        restaurantName: state.restaurantName || undefined,
      });
      setRoomId(newRoomId);
      setRoomState(room);
      setShowInvite(true);
    } catch {
      // silently fail — solo mode continues
    } finally {
      setIsCreatingRoom(false);
    }
  }

  function personColor(personId: string) {
    const person = state.people.find((p) => p.id === personId);
    if (person?.covered) return { bg: "bg-amber-500/15", text: "text-amber-400" };
    const idx = state.people.findIndex((p) => p.id === personId);
    return AVATAR_COLORS[idx % AVATAR_COLORS.length];
  }

  // Send the host's full assignments map in a single atomic write.
  // One HTTP request regardless of how many items changed — no concurrent
  // read-modify-write races on the server.
  function sendBulkAssign(updatedItems: typeof state.lineItems) {
    if (!roomId) return;
    const assignments: Record<string, string[]> = {};
    for (const item of updatedItems) {
      assignments[item.id] = item.assignedToIds;
    }
    // Record what we're sending so the SSE echo doesn't revert our local state.
    pendingAssignmentsRef.current = assignments;
    sendRoomAction(roomId, {
      type: "host_bulk_assign",
      assignments,
    }).catch(() => {
      // On failure, clear pending so the next SSE push restores truth.
      pendingAssignmentsRef.current = {};
    });
  }

  function toggleAssignment(itemId: string) {
    void hapticTap();
    const updatedItems = state.lineItems.map((item) => {
      if (item.id !== itemId) return item;

      if (item.quantity <= 1) {
        const assigned = item.assignedToIds.includes(selectedPersonId);
        return {
          ...item,
          assignedToIds: assigned
            ? item.assignedToIds.filter((id) => id !== selectedPersonId)
            : [...item.assignedToIds, selectedPersonId],
        };
      }

      // Multi-qty: claim-based
      const unclaimed = item.quantity - item.assignedToIds.length;
      const personClaims = item.assignedToIds.filter((id) => id === selectedPersonId).length;

      if (unclaimed > 0) {
        return { ...item, assignedToIds: [...item.assignedToIds, selectedPersonId] };
      }
      if (personClaims > 0) {
        return { ...item, assignedToIds: item.assignedToIds.filter((id) => id !== selectedPersonId) };
      }
      return item;
    });

    updateLineItems(updatedItems);
    sendBulkAssign(updatedItems);
  }

  function removeClaim(itemId: string, personId: string) {
    void hapticTap();
    const updatedItems = state.lineItems.map((item) => {
      if (item.id !== itemId) return item;
      const idx = item.assignedToIds.indexOf(personId);
      if (idx === -1) return item;
      const ids = [...item.assignedToIds];
      ids.splice(idx, 1);
      return { ...item, assignedToIds: ids };
    });

    updateLineItems(updatedItems);
    sendBulkAssign(updatedItems);
  }

  function runningTotal(personId: string): number {
    return state.lineItems.reduce((sum, item) => {
      const personClaims = item.assignedToIds.filter((id) => id === personId).length;
      if (personClaims === 0) return sum;
      return sum + (item.price * item.quantity * personClaims) / item.assignedToIds.length;
    }, 0);
  }

  const hasAnyAssigned = state.lineItems.some((item) => {
    const assigned = roomState
      ? (roomState.assignments[item.id] ?? [])
      : item.assignedToIds;
    return assigned.length > 0;
  });

  function clearAllAssignments() {
    const updatedItems = state.lineItems.map((item) => ({ ...item, assignedToIds: [] }));
    updateLineItems(updatedItems);
    sendBulkAssign(updatedItems);
  }

  function assignRestToSelected() {
    // Use roomState.assignments as the base so we don't clobber guest claims
    // that arrived since the last SSE update.
    const updatedItems = state.lineItems.map((item) => {
      const baseIds: string[] = roomState
        ? (roomState.assignments[item.id] ?? [])
        : item.assignedToIds;

      if (item.quantity <= 1) {
        if (baseIds.length > 0) return { ...item, assignedToIds: baseIds };
        return { ...item, assignedToIds: [selectedPersonId] };
      }
      const unclaimed = item.quantity - baseIds.length;
      if (unclaimed <= 0) return { ...item, assignedToIds: baseIds };
      return { ...item, assignedToIds: [...baseIds, ...Array(unclaimed).fill(selectedPersonId)] };
    });

    updateLineItems(updatedItems);
    // One atomic bulk write — no N-concurrent-request race.
    sendBulkAssign(updatedItems);
  }

  async function handleContinue() {
    if (roomId) {
      sendRoomAction(roomId, { type: "close" }).catch(() => {});
    }
    router.push("/split/summary");
  }

  // In collaborative mode use roomState.assignments (server truth) so the
  // button unlocks as soon as guests finish claiming, without waiting for
  // the SSE update to propagate back through updateLineItems.
  const allAssigned = state.lineItems.every((item) => {
    const assigned = roomState
      ? (roomState.assignments[item.id] ?? [])
      : item.assignedToIds;
    return item.quantity <= 1 ? assigned.length > 0 : assigned.length >= item.quantity;
  });

  const hasUnclaimed = state.lineItems.some((item) => {
    const assigned = roomState
      ? (roomState.assignments[item.id] ?? [])
      : item.assignedToIds;
    return item.quantity <= 1
      ? assigned.length === 0
      : assigned.length < item.quantity;
  });

  return (
    <motion.main initial={fromPop ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-dvh flex-col pb-40">
      <div className="sticky-header px-6 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Go back"><Link href="/split/people"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-xl font-bold">Assign dishes</h1>
          {loaded && state.people.length >= 2 && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Invite people"
              disabled={isCreatingRoom}
              onClick={handleInvite}
              className="ml-auto"
            >
              <Users className="h-5 w-5" />
            </Button>
          )}
        </div>

        {loaded && (
          <div className="mt-4 -mx-3 rounded-3xl border border-border/30 bg-card/80 shadow-md shadow-black/10">
            <div
              className="flex gap-5 overflow-x-auto px-6 py-4"
              style={{ maskImage: "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)" }}
            >
              {state.people.map((person, i) => (
                <PersonAvatar
                  key={person.id}
                  person={person}
                  selected={person.id === selectedPersonId}
                  runningTotal={runningTotal(person.id)}
                  onClick={() => setSelectedPersonId(person.id)}
                  colorIndex={i}
                  online={roomState?.connectedPeople.includes(person.id)}
                />
              ))}
            </div>

            {roomState && (
              <div className="flex justify-end px-4 pb-3">
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-medium text-emerald-400">
                    {roomState.connectedPeople.length} of {state.people.length} joined
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6">
        <div className="mb-3 mt-6 flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-muted-foreground truncate min-w-0">
            {loaded ? `Assigning to ${state.people.find((p) => p.id === selectedPersonId)?.name ?? ""}` : ""}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {hasAnyAssigned && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-xs font-medium border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive animate-in fade-in slide-in-from-right-2 duration-200">
                    Clear all
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Clear all assignments</DialogTitle>
                    <DialogDescription>
                      This will remove all dish assignments. You&apos;ll need to start over.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <DialogClose asChild>
                      <Button variant="destructive" onClick={clearAllAssignments}>Clear all</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            {hasUnclaimed && (
              <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-xs font-medium border-primary/40 text-primary hover:bg-primary/10 hover:text-primary" onClick={assignRestToSelected}>
                Assign rest
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {state.lineItems.map((item) => {
            if (item.quantity > 1) {
              const totalClaims = item.assignedToIds.length;
              const unclaimed = item.quantity - totalClaims;
              const myClaims = item.assignedToIds.filter((id) => id === selectedPersonId).length;
              const isAssignedToMe = myClaims > 0;
              const isFullyClaimed = unclaimed <= 0;

              const claimsByPerson: Record<string, number> = {};
              for (const pid of item.assignedToIds) {
                claimsByPerson[pid] = (claimsByPerson[pid] || 0) + 1;
              }

              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleAssignment(item.id)}
                  onKeyDown={(e) => e.key === "Enter" && toggleAssignment(item.id)}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-4 transition-all duration-150 select-none",
                    isFullyClaimed && !isAssignedToMe
                      ? "border-transparent opacity-40 cursor-default"
                      : isAssignedToMe
                      ? "border-primary/40 bg-primary/5 cursor-pointer active:opacity-75"
                      : "border-transparent cursor-pointer active:scale-[0.98]"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="flex h-6 w-8 items-center justify-center rounded-md bg-secondary text-sm font-medium tabular-nums flex-shrink-0">×{item.quantity}</span>
                      <span className="text-base">{item.name}</span>
                    </div>
                    <span className="flex-shrink-0 ml-3 font-mono text-base font-medium tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-1">
                        {Array.from({ length: item.quantity }, (_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-2 w-2 rounded-full transition-colors",
                              i < totalClaims ? "bg-primary" : "bg-muted"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums">{totalClaims}/{item.quantity}</span>
                    </div>

                    <div className="flex gap-1.5">
                      {Object.entries(claimsByPerson).map(([pid, count]) => {
                        const person = state.people.find((p) => p.id === pid);
                        if (!person) return null;
                        const color = personColor(pid);
                        return (
                          <button
                            key={pid}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => { e.stopPropagation(); removeClaim(item.id, pid); }}
                            className={cn("relative flex h-6 items-center justify-center rounded-full text-xs font-semibold active:opacity-70", color.bg, color.text, count > 1 ? "px-1.5 gap-0.5" : "w-6")}
                          >
                            {person.covered ? <Gift className="h-3 w-3" /> : inlineInitials(person.name)}
                            {count > 1 && <span className="tabular-nums">×{count}</span>}
                          </button>
                        );
                      })}
                    </div>

                    <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">{formatCurrency(item.price)}/ea</span>
                  </div>
                </div>
              );
            }

            // Single-quantity item
            const isAssignedToMe = item.assignedToIds.includes(selectedPersonId);
            const claimedByOthers = item.assignedToIds.length > 0 && !isAssignedToMe;

            return (
              <button
                key={item.id}
                onClick={() => !claimedByOthers && toggleAssignment(item.id)}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-150",
                  isAssignedToMe
                    ? "border-primary/40 bg-primary/5 active:opacity-75"
                    : claimedByOthers
                    ? "cursor-default border-transparent"
                    : "border-transparent active:scale-[0.98]"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {isAssignedToMe && <div className="h-2 w-2 flex-shrink-0 rounded-full bg-primary shadow-[0_0_6px_rgba(52,211,153,0.5)]" />}
                  <span className="text-base">
                    {item.name}
                    {item.assignedToIds.length > 0 && (
                      <span className="inline-flex gap-1.5 ml-1.5 align-middle">
                        {item.assignedToIds.map((pid) => {
                          const person = state.people.find((p) => p.id === pid);
                          if (!person) return null;
                          const color = personColor(pid);
                          return (
                            <motion.span key={pid} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }} className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold", color.bg, color.text)}>
                              {inlineInitials(person.name)}
                            </motion.span>
                          );
                        })}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-3">
                  {claimedByOthers && (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); toggleAssignment(item.id); }}
                      className="rounded-full border border-border/50 bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground active:opacity-70"
                    >
                      Share
                    </button>
                  )}
                  <div className="text-right">
                    <span className="font-mono text-base font-medium tabular-nums">{formatCurrency(item.price)}</span>
                    {item.assignedToIds.length > 1 && (
                      <p className="font-mono text-xs text-muted-foreground tabular-nums">{formatCurrency(item.price / item.assignedToIds.length)} ea</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
          <Button className="h-14 w-full rounded-2xl text-base font-semibold" disabled={!loaded || !allAssigned} onClick={handleContinue}>
            {!loaded ? "Loading..." : allAssigned ? "Continue" : "Assign all dishes to continue"}
          </Button>
        </div>
      </div>

      {roomId && (
        <InviteDrawer
          open={showInvite}
          onClose={() => setShowInvite(false)}
          roomId={roomId}
          joinUrl={getRoomJoinUrl(roomId)}
          peopleCount={state.people.length}
          connectedCount={roomState?.connectedPeople.length ?? 0}
        />
      )}
    </motion.main>
  );
}
