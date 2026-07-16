"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowLeft, Gift, Trash2, UserPlus } from "lucide-react";
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
import {
  applyPortionAssignments,
  countAssignedPortions,
  flattenPortionAssignments,
  isLineItemFullyAssigned,
  legacyAssignmentsToPortionAssignments,
  lineItemsToPortionAssignments,
  normalizeLineItem,
} from "@/lib/line-items";
import { cn } from "@/lib/utils";
import { hapticTap } from "@/lib/platform";
import {
  generateRoomId,
  getRoomJoinUrl,
  createRoom,
  fetchRoom,
  generateRoomToken,
  sendRoomAction,
  sendRoomJoinAction,
  subscribeToRoom,
  setLocalRoomIdentity,
  ROOM_AUTO_INVITE_KEY,
  ROOM_HOST_PERSON_KEY,
  ROOM_HOST_TOKEN_KEY,
  ROOM_SESSION_KEY,
} from "@/lib/room-client";
import type { LineItem, RoomState } from "@/lib/types";

export default function AssignPage() {
  const router = useRouter();
  const { state, loaded, updateLineItems, setPeople } = useSplitFlow();
  const [fromPop] = useState(() => consumePopFlag());
  const [selectedPersonId, setSelectedPersonId] = useState<string>(state.people[0]?.id ?? "");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  // Collaborative room state
  // Restore roomId from sessionStorage so navigating back and returning keeps
  // the same QR code / room alive rather than generating a new one.
  const [roomId, setRoomId] = useState<string | null>(() => {
    if (typeof sessionStorage === "undefined") return null;
    return sessionStorage.getItem(ROOM_SESSION_KEY);
  });
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [hostToken, setHostToken] = useState<string>(() => {
    if (typeof sessionStorage === "undefined") return "";
    return sessionStorage.getItem(ROOM_HOST_TOKEN_KEY) ?? "";
  });
  const [hostPersonId, setHostPersonId] = useState<string>(() => {
    if (typeof sessionStorage === "undefined") return "";
    return sessionStorage.getItem(ROOM_HOST_PERSON_KEY) ?? "";
  });
  const [hostName, setHostName] = useState("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  // Keep a ref to the latest lineItems so the SSE callback never reads a stale closure.
  // Two-part strategy:
  //   1. useEffect keeps the ref in sync whenever the context value changes (covers the
  //      initial load-from-localStorage case where lineItems goes from [] to the real list).
  //   2. setLineItems updates the ref synchronously BEFORE calling updateLineItems, so
  //      a second rapid SSE event never reads the pre-render stale value.
  const lineItemsRef = useRef(state.lineItems);
  useEffect(() => {
    lineItemsRef.current = state.lineItems;
  }, [state.lineItems]);

  // Track whether the context has finished loading from localStorage.
  // The SSE callback must not apply server assignments before the local list
  // is available — if lineItemsRef is still [] (pre-load), the map() would
  // produce an empty array and wipe out all items.
  const loadedRef = useRef(loaded);
  useEffect(() => {
    loadedRef.current = loaded;
  }, [loaded]);

  // Wrapper that keeps ref and context in sync atomically for write paths.
  // useCallback with a stable dep (updateLineItems is already a useCallback)
  // makes the stability explicit so the SSE closure never captures a stale version.
  const setLineItems = useCallback((items: LineItem[]) => {
    lineItemsRef.current = items;
    updateLineItems(items);
  }, [updateLineItems]);

  useEffect(() => {
    if (loaded && state.lineItems.length === 0) router.replace("/");
  }, [loaded, state.lineItems.length, router]);

  useEffect(() => {
    if (selectedPersonId || state.people.length === 0) return;
    setSelectedPersonId(state.people[0].id);
  }, [selectedPersonId, state.people]);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") return;
    if (sessionStorage.getItem(ROOM_AUTO_INVITE_KEY) !== "1") return;
    sessionStorage.removeItem(ROOM_AUTO_INVITE_KEY);
    setShowInvite(true);
  }, []);

  // If roomId was restored from sessionStorage on mount, fetch the current
  // room state from Redis so the UI (invite drawer, QR code, guest count) is
  // populated immediately without waiting for the first SSE push.
  useEffect(() => {
    if (!roomId || roomState) return;
    fetchRoom(roomId).then((existing) => {
      if (existing) {
        setRoomState(existing);
        setPeople(existing.people);
      } else {
        // Room expired on the server — discard the stale ID.
        setRoomId(null);
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem(ROOM_SESSION_KEY);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

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
        setPeople(updatedRoom.people);

        // Guard: don't apply server assignments until the context has finished
        // loading line items from localStorage. Until then, lineItemsRef.current
        // is the empty initial state and mapping over it would produce an empty
        // array, wiping out all items from the context.
        if (!loadedRef.current) return;

        // Merge server assignments into local lineItems.
        // pendingAssignmentsRef holds the full assignments map the host last
        // sent. If every item in the server update matches that snapshot, this
        // is just the echo of our own write — keep local state and clear the
        // pending marker. If any item diverges, a guest changed it — accept
        // the server value for that item.
        const pending = pendingAssignmentsRef.current;
        const hasPending = Object.keys(pending).length > 0;

        const serverPortionAssignments = updatedRoom.portionAssignments
          ?? legacyAssignmentsToPortionAssignments(updatedRoom.lineItems, updatedRoom.assignments ?? {});
        const updatedLineItems = lineItemsRef.current.map((item) => {
          const serverPortions = serverPortionAssignments[item.id] ?? [];
          if (hasPending) {
            const sentIds = pending[item.id];
            // sentIds may be undefined for items not in the snapshot (shouldn't
            // happen after a bulk write, but guard anyway).
            if (sentIds !== undefined &&
                JSON.stringify([...sentIds].sort()) === JSON.stringify(flattenPortionAssignments(serverPortions.map((assignedToIds, index) => ({ id: `${item.id}-${index}`, assignedToIds }))).sort())) {
              return item; // echo of our write — keep local
            }
          }
          // No pending write, or server diverged (guest changed it) — accept server.
          return applyPortionAssignments([item], { [item.id]: serverPortions })[0];
        });

        // Clear pending only once we've confirmed the echo arrived
        if (hasPending) {
          pendingAssignmentsRef.current = {};
        }

        setLineItems(updatedLineItems);
      },
      () => {
        // Room expired — fall back to solo mode
        setRoomId(null);
        setRoomState(null);
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem(ROOM_SESSION_KEY);
        }
      }
    );
    return unsubscribe;
  }, [roomId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Send a beacon on tab close / refresh / navigate-away so the Redis room is
  // closed promptly even when the host doesn't use the normal Continue path.
  // sendBeacon survives page unload; fetch/XHR do not.
  // Intentionally fires even after handleContinue() — the server's close action
  // is idempotent, so a double-close on an already-done room is harmless.
  useEffect(() => {
    if (!roomId) return;
    function handleBeforeUnload() {
      if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
      navigator.sendBeacon(
        `/api/room/${roomId}`,
        new Blob([JSON.stringify({ type: "close", hostToken })], { type: "application/json" }),
      );
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [roomId, hostToken]);

  async function handleInvite() {
    if (roomId) {
      setShowInvite(true);
      return;
    }
    setIsCreatingRoom(true);
    try {
      const newRoomId = generateRoomId();
      const newHostToken = hostToken || generateRoomToken();
      const room = await createRoom(newRoomId, {
        type: "create",
        hostToken: newHostToken,
        entryMode: state.people.length > 0 ? "roster" : "self_serve",
        lineItems: state.lineItems,
        people: state.people,
        restaurantName: state.restaurantName || undefined,
      });
      setRoomId(newRoomId);
      setRoomState(room);
      setHostToken(newHostToken);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(ROOM_SESSION_KEY, newRoomId);
        sessionStorage.setItem(ROOM_HOST_TOKEN_KEY, newHostToken);
      }
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
  function sendBulkAssign(updatedItems: LineItem[]) {
    if (!roomId) return;
    const assignments: Record<string, string[]> = {};
    const portionAssignments = lineItemsToPortionAssignments(updatedItems);
    for (const item of updatedItems) {
      assignments[item.id] = item.assignedToIds;
    }
    // Record what we're sending so the SSE echo doesn't revert our local state.
    pendingAssignmentsRef.current = assignments;
    sendRoomAction(roomId, {
      type: "host_bulk_assign",
      hostToken,
      assignments,
      portionAssignments,
    }).catch(() => {
      // On failure, clear pending so the next SSE push restores truth.
      pendingAssignmentsRef.current = {};
    });
  }

  function toggleAssignment(itemId: string) {
    void hapticTap();
    const updatedItems = state.lineItems.map((item) => {
      if (item.id !== itemId) return item;

      const normalized = normalizeLineItem(item);
      if (normalized.quantity <= 1) {
        const assigned = (normalized.portions?.[0]?.assignedToIds ?? []).includes(selectedPersonId);
        const portions = [{
          ...(normalized.portions?.[0] ?? { id: crypto.randomUUID() }),
          assignedToIds: assigned
            ? (normalized.portions?.[0]?.assignedToIds ?? []).filter((id) => id !== selectedPersonId)
            : [...(normalized.portions?.[0]?.assignedToIds ?? []), selectedPersonId],
        }];
        return {
          ...normalized,
          portions,
          assignedToIds: flattenPortionAssignments(portions),
        };
      }
      return normalized;
    });

    setLineItems(updatedItems);
    sendBulkAssign(updatedItems);
  }

  function toggleQuickPortionAssignment(itemId: string) {
    if (selectedPersonIsOnline) return;
    void hapticTap();
    let changed = false;
    const updatedItems = state.lineItems.map((item) => {
      if (item.id !== itemId) return item;
      const normalized = normalizeLineItem(item);
      if (normalized.quantity <= 1) return normalized;

      const portions = [...(normalized.portions ?? [])];
      const soloPortionIndex = portions.findLastIndex((portion) => (
        portion.assignedToIds.length === 1 && portion.assignedToIds[0] === selectedPersonId
      ));

      if (soloPortionIndex >= 0) {
        portions[soloPortionIndex] = { ...portions[soloPortionIndex], assignedToIds: [] };
        changed = true;
        return normalizeLineItem({ ...normalized, portions });
      }

      const firstUnassignedIndex = portions.findIndex((portion) => portion.assignedToIds.length === 0);
      if (firstUnassignedIndex >= 0) {
        portions[firstUnassignedIndex] = { ...portions[firstUnassignedIndex], assignedToIds: [selectedPersonId] };
        changed = true;
        return normalizeLineItem({ ...normalized, portions });
      }

      return normalized;
    });

    if (!changed) return;
    setLineItems(updatedItems);
    sendBulkAssign(updatedItems);
  }

  function togglePortionAssignment(itemId: string, portionIndex: number) {
    void hapticTap();
    const updatedItems = state.lineItems.map((item) => {
      if (item.id !== itemId) return item;
      const normalized = normalizeLineItem(item);
      const portions = [...(normalized.portions ?? [])];
      const portion = portions[portionIndex];
      if (!portion) return normalized;
      const assigned = portion.assignedToIds.includes(selectedPersonId);
      portions[portionIndex] = {
        ...portion,
        assignedToIds: assigned
          ? portion.assignedToIds.filter((id) => id !== selectedPersonId)
          : [...portion.assignedToIds, selectedPersonId],
      };
      return normalizeLineItem({ ...normalized, portions });
    });

    setLineItems(updatedItems);
    sendBulkAssign(updatedItems);
  }

  function removeClaim(itemId: string, portionIndex: number, personId: string) {
    void hapticTap();
    const updatedItems = state.lineItems.map((item) => {
      if (item.id !== itemId) return item;
      const normalized = normalizeLineItem(item);
      const portions = [...(normalized.portions ?? [])];
      const portion = portions[portionIndex];
      if (!portion) return normalized;
      portions[portionIndex] = {
        ...portion,
        assignedToIds: portion.assignedToIds.filter((id) => id !== personId),
      };
      return normalizeLineItem({ ...normalized, portions });
    });

    setLineItems(updatedItems);
    sendBulkAssign(updatedItems);
  }

  function getClaimsByPerson(portions: NonNullable<LineItem["portions"]>) {
    return portions.reduce<Record<string, number>>((claims, portion) => {
      for (const personId of portion.assignedToIds) {
        claims[personId] = (claims[personId] ?? 0) + 1;
      }
      return claims;
    }, {});
  }

  const dropdownMotion = shouldReduceMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.12 },
      }
    : {
        initial: { height: 0, opacity: 0, y: -6 },
        animate: { height: "auto", opacity: 1, y: 0 },
        exit: { height: 0, opacity: 0, y: -6 },
        transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
      };

  function runningTotal(personId: string): number {
    return state.lineItems.reduce((sum, item) => {
      const normalized = normalizeLineItem(item);
      const share = (normalized.portions ?? []).reduce((portionSum, portion) => {
        if (!portion.assignedToIds.includes(personId) || portion.assignedToIds.length === 0) return portionSum;
        return portionSum + item.price / portion.assignedToIds.length;
      }, 0);
      return sum + share;
    }, 0);
  }

  const hasAnyAssigned = state.lineItems.some((item) => {
    return countAssignedPortions(item) > 0;
  });

  function clearAllAssignments() {
    const updatedItems = state.lineItems.map((item) => normalizeLineItem({
      ...item,
      portions: (normalizeLineItem(item).portions ?? []).map((portion) => ({ ...portion, assignedToIds: [] })),
      assignedToIds: [],
    }));
    setLineItems(updatedItems);
    sendBulkAssign(updatedItems);
  }

  function assignRestToSelected() {
    // Use roomState.assignments as the base so we don't clobber guest claims
    // that arrived since the last SSE update.
    const updatedItems = state.lineItems.map((item) => {
      const normalized = normalizeLineItem(item);
      const portions = (normalized.portions ?? []).map((portion) => (
        portion.assignedToIds.length > 0 ? portion : { ...portion, assignedToIds: [selectedPersonId] }
      ));
      return normalizeLineItem({ ...normalized, portions });
    });

    setLineItems(updatedItems);
    // One atomic bulk write — no N-concurrent-request race.
    sendBulkAssign(updatedItems);
  }

  async function addHostParticipant() {
    if (!roomId || !hostToken) return;
    const trimmed = hostName.trim();
    if (!trimmed) return;
    try {
      const result = await sendRoomJoinAction(roomId, {
        type: "add_person",
        hostToken,
        name: trimmed,
      });
      setRoomState(result.room);
      setPeople(result.room.people);
      setSelectedPersonId(result.personId);
      setHostPersonId(result.personId);
      setHostName("");
      setLocalRoomIdentity(roomId, { personId: result.personId, participantToken: result.participantToken });
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem(ROOM_HOST_PERSON_KEY, result.personId);
      }
    } catch {
      // Keep host in current state; room TTL handles stale sessions.
    }
  }

  async function toggleSelectedCovered() {
    if (!roomId || !hostToken || !selectedPersonId) return;
    const person = state.people.find((p) => p.id === selectedPersonId);
    if (!person) return;
    try {
      const updated = await sendRoomAction(roomId, {
        type: "update_person",
        hostToken,
        personId: selectedPersonId,
        covered: !person.covered,
      });
      setRoomState(updated);
      setPeople(updated.people);
    } catch {
      // Invalid covered states are blocked server-side.
    }
  }

  async function renameSelectedPerson() {
    if (!roomId || !hostToken || !selectedPersonId) return;
    const person = state.people.find((p) => p.id === selectedPersonId);
    if (!person) return;
    const nextName = window.prompt("Rename participant", person.name)?.trim();
    if (!nextName) return;
    try {
      const updated = await sendRoomAction(roomId, {
        type: "rename_person",
        hostToken,
        personId: selectedPersonId,
        name: nextName,
      });
      setRoomState(updated);
      setPeople(updated.people);
    } catch {
      // Ignore transient failures.
    }
  }

  async function removeSelectedPerson() {
    if (!roomId || !hostToken || !selectedPersonId) return;
    const person = state.people.find((p) => p.id === selectedPersonId);
    if (!person) return;
    if (!window.confirm(`Remove ${person.name} from this split? Their dish claims will be unassigned.`)) return;
    try {
      const updated = await sendRoomAction(roomId, {
        type: "remove_person",
        hostToken,
        personId: selectedPersonId,
      });
      setRoomState(updated);
      setPeople(updated.people);
      const nextSelected = updated.people[0]?.id ?? "";
      setSelectedPersonId(nextSelected);
      if (selectedPersonId === hostPersonId) {
        setHostPersonId("");
        if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(ROOM_HOST_PERSON_KEY);
      }
      const updatedItems = applyPortionAssignments(lineItemsRef.current, updated.portionAssignments ?? {});
      setLineItems(updatedItems);
    } catch {
      // Ignore transient failures.
    }
  }

  async function handleContinue() {
    if (state.people.filter((person) => !person.covered).length < 2) return;
    if (roomId) {
      // Close the room so guests immediately receive a "status: done" push and
      // transition to the "You're all set!" screen — stopping further claiming.
      // We intentionally do NOT remove ROOM_SESSION_KEY here, because the
      // Payment page still needs it to send finalize_payment (which stores payUrl
      // on the already-closed room and triggers the guest redirect).
      // The payment page's finalizeAndCloseRoom() removes the key when done.
      sendRoomAction(roomId, { type: "close", hostToken }).catch(() => {});
    }
    router.push("/split/summary");
  }

  // In collaborative mode use roomState.assignments (server truth) so the
  // button unlocks as soon as guests finish claiming, without waiting for
  // the SSE update to propagate back through updateLineItems.
  const allAssigned = state.lineItems.every((item) => {
    return isLineItemFullyAssigned(item);
  });
  const nonCoveredPayerCount = state.people.filter((person) => !person.covered).length;
  const canContinue = allAssigned && nonCoveredPayerCount >= 2;

  // Admin override is only allowed when the selected person is NOT actively
  // connected (never joined, or has tapped "I'm done"). While they are online
  // (green dot) the host cannot assign OR unassign on their behalf.
  const selectedPersonIsOnline = roomState?.connectedPeople.includes(selectedPersonId) ?? false;

  const hasUnclaimed = state.lineItems.some((item) => {
    return !isLineItemFullyAssigned(item);
  });

  const totalSlots = state.lineItems.reduce((sum, item) => sum + Math.max(item.quantity, 1), 0);
  const assignedSlots = state.lineItems.reduce((sum, item) => sum + countAssignedPortions(item), 0);

  const springValue = useSpring(assignedSlots, { stiffness: 120, damping: 20, mass: 0.8 });
  useEffect(() => { springValue.set(assignedSlots); }, [assignedSlots, springValue]);
  const displaySlots = useTransform(springValue, (v) => Math.round(v));

  return (
    <motion.main initial={fromPop ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-dvh flex-col pb-40">
      <div className="sticky-header px-6 pt-10 pb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Go back"><Link href="/split/people"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-xl font-bold shrink-0">Assign dishes</h1>
          {roomState && roomState.connectedPeople.length > 0 && (
            <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400 whitespace-nowrap">
                {roomState.entryMode === "self_serve"
                  ? `${state.people.length} joined`
                  : `${roomState.connectedPeople.length} of ${state.people.length} joined`}
              </span>
            </div>
          )}
          {loaded && (state.people.length >= 2 || roomId) && (
            <Button
              variant="outline"
              size="sm"
              aria-label="Start a live split session"
              disabled={isCreatingRoom}
              onClick={handleInvite}
              className="ml-auto h-8 gap-1.5 rounded-full border-emerald-500/40 px-3 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-400"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Live Split
            </Button>
          )}
        </div>

        {loaded && (
          <div className="mt-4 -mx-3 rounded-3xl border border-border/30 bg-card/80 shadow-md shadow-black/10">
            {state.people.length > 0 ? (
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
                    done={roomState?.donePeople?.includes(person.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="px-6 py-5 text-center">
                <p className="text-base font-semibold">Invite your table to join</p>
                <p className="mt-1 text-sm text-muted-foreground">Guests can type their names or join as Guest.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-6">
        {roomId && !hostPersonId && (
          <div className="mt-6 rounded-3xl border border-border/40 bg-card/70 p-4">
            <p className="text-base font-semibold">Eating too?</p>
            <p className="mt-1 text-sm text-muted-foreground">Add yourself without scanning the invite link.</p>
            <div className="mt-4 flex gap-3">
              <input
                value={hostName}
                onChange={(event) => setHostName(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") void addHostParticipant(); }}
                placeholder="Your name"
                className="flex h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <Button className="h-11 rounded-xl" disabled={!hostName.trim()} onClick={addHostParticipant}>Add me</Button>
            </div>
          </div>
        )}

        <div className="mb-3 mt-6 flex items-center justify-between gap-3">
          {state.people.length === 0 ? (
            <p className="text-base font-semibold text-muted-foreground">Waiting for people to join</p>
          ) : selectedPersonIsOnline ? (
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-base font-semibold text-muted-foreground truncate">
                {state.people.find((p) => p.id === selectedPersonId)?.name ?? ""} is claiming dishes…
              </p>
            </div>
          ) : (
            <>
              <p className="text-base font-semibold text-muted-foreground truncate min-w-0">
                {loaded ? `Assigning to ${state.people.find((p) => p.id === selectedPersonId)?.name ?? ""}` : ""}
              </p>
              <div className="flex items-center gap-2 shrink-0">
                {roomId && selectedPersonId && (
                  <>
                    <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-xs font-medium" onClick={renameSelectedPerson}>
                      Rename
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full px-3 text-xs font-medium border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-400"
                      onClick={toggleSelectedCovered}
                    >
                      <Gift className="mr-1 h-3 w-3" />
                      {state.people.find((p) => p.id === selectedPersonId)?.covered ? "Covered" : "Cover"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-full px-2 text-xs font-medium border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove selected participant"
                      onClick={removeSelectedPerson}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                {hasAnyAssigned && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 rounded-full px-3 text-xs font-medium border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive animate-in fade-in slide-in-from-right-2 duration-200">
                        Clear all
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader className="text-left">
                        <DialogTitle>Clear all assignments?</DialogTitle>
                        <DialogDescription className="mt-1">
                          All dish assignments will be removed. You&apos;ll need to start over.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter className="mt-2 flex-row gap-3">
                        <DialogClose asChild>
                          <Button variant="outline" className="h-12 flex-1 rounded-2xl text-base">Cancel</Button>
                        </DialogClose>
                        <DialogClose asChild>
                          <Button variant="destructive" className="h-12 flex-1 rounded-2xl text-base" onClick={clearAllAssignments}>Clear all</Button>
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
            </>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {state.lineItems.map((item) => {
            const normalizedItem = normalizeLineItem(item);
            if (normalizedItem.quantity > 1) {
              const portions = normalizedItem.portions ?? [];
              const assignedPortions = portions.filter((portion) => portion.assignedToIds.length > 0).length;
              const isAssignedToMe = portions.some((portion) => portion.assignedToIds.includes(selectedPersonId));
              const expanded = expandedItemId === item.id;
              const claimsByPerson = getClaimsByPerson(portions);
              const claimEntries = Object.entries(claimsByPerson);
              const hasRemovableChips = portions.some((portion) => (
                portion.assignedToIds.some((pid) => !roomState?.connectedPeople.includes(pid))
              )) && !selectedPersonIsOnline;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex flex-col gap-2 rounded-xl border p-4 transition-all duration-150 select-none",
                    selectedPersonIsOnline
                      ? "border-transparent opacity-60 cursor-default"
                      : isAssignedToMe
                      ? "border-primary/40 bg-primary/5"
                      : "border-transparent"
                  )}
                >
                  <div
                    role="button"
                    tabIndex={selectedPersonIsOnline ? -1 : 0}
                    className={cn(
                      "flex flex-col gap-3 text-left",
                      selectedPersonIsOnline ? "cursor-default" : "cursor-pointer active:opacity-75"
                    )}
                    onClick={() => toggleQuickPortionAssignment(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleQuickPortionAssignment(item.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <span className="flex h-6 w-8 flex-shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-medium tabular-nums">×{normalizedItem.quantity}</span>
                        <div className="min-w-0">
                          <span className="block truncate text-base">{normalizedItem.name}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{assignedPortions}/{normalizedItem.quantity} portions assigned</span>
                        </div>
                      </div>
                      <span className="flex-shrink-0 font-mono text-base font-medium tabular-nums">{formatCurrency(normalizedItem.price * normalizedItem.quantity)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-1">
                          {portions.map((portion) => (
                            <div
                              key={portion.id}
                              className={cn(
                                "h-2 w-2 rounded-full transition-colors",
                                portion.assignedToIds.length > 0 ? "bg-primary" : "bg-muted"
                              )}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">{assignedPortions}/{normalizedItem.quantity}</span>
                      </div>
                      {claimEntries.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {claimEntries.map(([pid, count]) => {
                            const person = state.people.find((p) => p.id === pid);
                            if (!person) return null;
                            const color = personColor(pid);
                            return (
                              <span key={pid} className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold", color.bg, color.text)}>
                                {person.covered ? <Gift className="h-3 w-3" /> : inlineInitials(person.name)}
                                {count > 1 && <span className="font-mono tabular-nums">×{count}</span>}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {assignedPortions > 0 && !selectedPersonIsOnline && (
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedItemId(expanded ? null : item.id);
                          }}
                          className="ml-auto rounded-full border border-border/50 bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground active:opacity-70"
                        >
                          Share
                        </button>
                      )}
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">{formatCurrency(normalizedItem.price)}/ea</span>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {expanded && (
                      <motion.div
                        key={`${item.id}-share`}
                        className="overflow-hidden"
                        {...dropdownMotion}
                      >
                        <div className="mt-2 flex flex-col gap-2 border-t border-border/40 pt-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-xs font-medium text-muted-foreground">Choose a portion to share</p>
                            {hasRemovableChips && <p className="text-xs text-muted-foreground">Tap a name to remove</p>}
                          </div>
                          {portions.map((portion, portionIndex) => {
                            const selected = portion.assignedToIds.includes(selectedPersonId);
                            return (
                              <div
                                key={portion.id}
                                role="button"
                                tabIndex={selectedPersonIsOnline ? -1 : 0}
                                onClick={() => !selectedPersonIsOnline && togglePortionAssignment(item.id, portionIndex)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    if (!selectedPersonIsOnline) togglePortionAssignment(item.id, portionIndex);
                                  }
                                }}
                                className={cn(
                                  "flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                                  selected ? "bg-primary/10" : "bg-secondary/50",
                                  selectedPersonIsOnline ? "cursor-default opacity-70" : "cursor-pointer active:opacity-75"
                                )}
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium">Portion {portionIndex + 1}</p>
                                  <div className="mt-1 flex flex-wrap gap-1.5">
                                    {portion.assignedToIds.length === 0 ? (
                                      <span className="text-xs text-muted-foreground">Unassigned</span>
                                    ) : portion.assignedToIds.map((pid) => {
                                      const person = state.people.find((p) => p.id === pid);
                                      if (!person) return null;
                                      const color = personColor(pid);
                                      const removable = !roomState?.connectedPeople.includes(pid) && !selectedPersonIsOnline;
                                      const chipClassName = cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold", color.bg, color.text);
                                      if (!removable) {
                                        return (
                                          <span key={pid} className={chipClassName}>
                                            {person.covered ? <Gift className="h-3 w-3" /> : inlineInitials(person.name)}
                                          </span>
                                        );
                                      }
                                      return (
                                        <button
                                          key={pid}
                                          aria-label={`Remove ${person.name} from Portion ${portionIndex + 1}`}
                                          onPointerDown={(e) => e.stopPropagation()}
                                          onClick={(e) => { e.stopPropagation(); removeClaim(item.id, portionIndex, pid); }}
                                          className={chipClassName}
                                        >
                                          {person.covered ? <Gift className="h-3 w-3" /> : inlineInitials(person.name)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <span className="font-mono text-sm tabular-nums text-muted-foreground">
                                  {portion.assignedToIds.length > 1 ? formatCurrency(normalizedItem.price / portion.assignedToIds.length) : formatCurrency(normalizedItem.price)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            // Single-quantity item
            const singleAssignedIds = normalizedItem.portions?.[0]?.assignedToIds ?? [];
            const isAssignedToMe = singleAssignedIds.includes(selectedPersonId);
            const claimedByOthers = singleAssignedIds.length > 0 && !isAssignedToMe;
            // In collab mode the host can override only when the selected person is not
            // actively online. If they are connected (green dot), block all changes.
            const effectivelyClaimedByOthers = (roomId && !selectedPersonIsOnline) ? false : claimedByOthers;

            return (
              <button
                key={item.id}
                onClick={() => !selectedPersonIsOnline && !effectivelyClaimedByOthers && toggleAssignment(item.id)}
                className={cn(
                  "flex items-center justify-between rounded-xl border p-4 text-left transition-all duration-150",
                  selectedPersonIsOnline
                    ? "cursor-default border-transparent opacity-60"
                    : isAssignedToMe
                    ? "border-primary/40 bg-primary/5 active:opacity-75"
                    : effectivelyClaimedByOthers
                    ? "cursor-default border-transparent"
                    : "border-transparent active:scale-[0.98]"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {isAssignedToMe && <div className="h-2 w-2 flex-shrink-0 rounded-full bg-primary shadow-[0_0_6px_rgba(52,211,153,0.5)]" />}
                  <span className="text-base">
                    {item.name}
                    {singleAssignedIds.length > 0 && (
                      <span className="inline-flex gap-1.5 ml-1.5 align-middle">
                        {singleAssignedIds.map((pid) => {
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
                  {/* Share button is for guests only — hidden on the host's assign page */}
                  {claimedByOthers && !roomId && (
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
                    {singleAssignedIds.length > 1 && (
                      <p className="font-mono text-xs text-muted-foreground tabular-nums">{formatCurrency(item.price / singleAssignedIds.length)} ea</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4">
        {!loaded ? (
          <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
            <Button className="h-14 w-full rounded-2xl text-base font-semibold" disabled>
              Loading...
            </Button>
          </div>
        ) : canContinue ? (
          <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
            <Button className="h-14 w-full rounded-2xl text-base font-semibold" onClick={handleContinue}>
              Continue
            </Button>
          </div>
        ) : allAssigned ? (
          <div className="flex justify-center pb-1">
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 backdrop-blur-xl shadow-lg shadow-black/20 px-4 py-2 text-sm text-amber-400">
              Need at least 2 payers
            </span>
          </div>
        ) : (
          <div className="flex justify-center pb-1">
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl shadow-lg shadow-black/20 px-4 py-2 text-sm text-emerald-400">
              <motion.span>{displaySlots}</motion.span>
              {` of ${totalSlots} ${totalSlots === 1 ? "portion" : "portions"} assigned`}
            </span>
          </div>
        )}
      </div>

      {roomId && (
        <InviteDrawer
          open={showInvite}
          onClose={() => setShowInvite(false)}
          roomId={roomId}
          joinUrl={getRoomJoinUrl(roomId)}
          peopleCount={state.people.length}
          connectedCount={roomState?.connectedPeople.length ?? 0}
          selfServe={roomState?.entryMode === "self_serve"}
        />
      )}
    </motion.main>
  );
}
