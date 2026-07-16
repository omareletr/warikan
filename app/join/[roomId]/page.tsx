"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowLeft, CheckCircle, ExternalLink, PartyPopper, RefreshCw, Wifi, WifiOff, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AVATAR_COLORS } from "@/components/split/person-avatar";
import {
  formatCurrency,
  initials,
  inlineInitials,
} from "@/lib/calculate";
import {
  applyPortionAssignments,
  countAssignedPortions,
  legacyAssignmentsToPortionAssignments,
  normalizeLineItem,
} from "@/lib/line-items";
import { cn } from "@/lib/utils";
import {
  subscribeToRoom,
  sendRoomAction,
  sendRoomJoinAction,
  getLocalRoomPersonId,
  getLocalRoomIdentity,
  setLocalRoomPersonId,
  setLocalRoomIdentity,
  clearLocalRoomPersonId,
} from "@/lib/room-client";
import type { RoomState, LineItem } from "@/lib/types";

// ─── State machine ────────────────────────────────────────────────────────────

type PageState =
  | { phase: "loading" }
  | { phase: "error"; message: string; retryable: boolean }
  | { phase: "pick_name"; room: RoomState }
  | { phase: "assigning"; room: RoomState; myPersonId: string; participantToken: string }
  | { phase: "done"; myPersonId: string | null; myPersonName: string | null; participantToken: string | null; roomClosed: boolean; payUrl?: string };

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

function countClaimedSlots(room: RoomState): number {
  const items = applyPortionAssignments(
    room.lineItems,
    room.portionAssignments ?? legacyAssignmentsToPortionAssignments(room.lineItems, room.assignments ?? {})
  );
  return items.reduce((sum, item) => sum + countAssignedPortions(item), 0);
}

function countTotalSlots(room: RoomState): number {
  return room.lineItems.reduce((sum, item) => sum + Math.max(item.quantity ?? 1, 1), 0);
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

interface DoneScreenProps {
  myPersonId: string | null;
  myPersonName: string | null;
  participantToken: string | null;
  roomClosed: boolean;
  payUrl?: string;
  onEdit: () => Promise<void>;
}

const STATUS_MESSAGES = [
  "Host is splitting the check…",
  "Doing the math so you don't have to…",
  "Your total is almost ready…",
  "Just a moment…",
];

function DoneScreen({ myPersonId, myPersonName, roomClosed, payUrl, onEdit }: DoneScreenProps) {
  const router = useRouter();
  // Once payUrl is set, show a short "Your total is ready" moment then redirect.
  const canEdit = Boolean(myPersonId) && !roomClosed && !payUrl;
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (redirecting) return;
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [redirecting]);

  useEffect(() => {
    if (!payUrl) return;
    setRedirecting(true);
    // Append the guest's name as a query param so /pay can highlight their card.
    const separator = payUrl.includes("?") ? "&" : "?";
    const dest = myPersonName
      ? `${payUrl}${separator}person=${encodeURIComponent(myPersonName)}`
      : payUrl;
    const timer = setTimeout(() => {
      router.push(dest);
    }, 1500);
    return () => clearTimeout(timer);
  }, [payUrl, myPersonName, router]);

  async function handleEditClick() {
    setEditing(true);
    setEditError(false);
    try {
      await onEdit();
    } catch {
      // onEdit rejected — show transient error state, then reset so user can retry
      setEditError(true);
      setTimeout(() => setEditError(false), 2500);
    } finally {
      setEditing(false);
    }
  }

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

      <div className="relative flex items-center justify-center">
        {/* Pulsing ring — hidden once redirecting */}
        {!redirecting && (
          <motion.div
            className="absolute h-20 w-20 rounded-full bg-primary/20"
            animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        {/* Existing icon circle — unchanged */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15"
        >
          <PartyPopper className="h-9 w-9 text-primary" />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {redirecting ? (
          <motion.div
            key="redirecting"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-2"
          >
            <h1 className="text-2xl font-bold">Your total is ready!</h1>
            <p className="text-muted-foreground">Taking you to your payment…</p>
            <div className="mt-2 h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
          </motion.div>
        ) : (
          <motion.div
            key="waiting"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2"
          >
            <h1 className="text-2xl font-bold">You&apos;re all set!</h1>
            <div className="relative h-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={msgIndex}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3 }}
                  className="text-muted-foreground"
                >
                  {STATUS_MESSAGES[msgIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {canEdit && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="flex flex-col items-center gap-2"
        >
          <Button
            variant="outline"
            onClick={handleEditClick}
            disabled={editing}
            className="gap-2 rounded-2xl"
          >
            <ArrowLeft className="h-4 w-4" />
            {editing ? "Going back…" : "Edit my choices"}
          </Button>
          {editError && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-muted-foreground"
            >
              Couldn&apos;t connect — tap to try again
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Manual tap-through once payUrl is set but before auto-redirect fires */}
      {redirecting && payUrl && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
            onClick={() => {
              const separator = payUrl.includes("?") ? "&" : "?";
              const dest = myPersonName
                ? `${payUrl}${separator}person=${encodeURIComponent(myPersonName)}`
                : payUrl;
              router.push(dest);
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Go now
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Name picker screen ───────────────────────────────────────────────────────

interface NamePickerProps {
  room: RoomState;
  myPersonId: string | null;
  onJoin: (personId: string) => void;
  onSelfJoin: (name: string, guest: boolean) => void;
  onResume: (personId: string) => void;
  joining: boolean;
}

function NamePicker({ room, myPersonId, onJoin, onSelfJoin, onResume, joining }: NamePickerProps) {
  const [name, setName] = useState("");
  const [showSelfEntry, setShowSelfEntry] = useState(room.entryMode === "self_serve" || room.people.length === 0);
  const rosterFirst = room.entryMode !== "self_serve" && room.people.length > 0 && !showSelfEntry;

  function submitName() {
    const trimmed = name.trim();
    if (!trimmed || joining) return;
    onSelfJoin(trimmed, false);
  }

  return (
    <main className="flex min-h-dvh flex-col pb-8">
      {/* Header */}
      <div className="px-6 pt-14 pb-8 text-center">
        <p className="mb-1 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Warikan
        </p>
        <h1 className="text-2xl font-bold">
          {room.restaurantName ?? "Who are you?"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {rosterFirst ? "Pick your name to start claiming your dishes" : "Enter your name to claim your dishes"}
        </p>
      </div>

      {/* People list */}
      {rosterFirst ? (
        <div className="flex flex-col gap-3 px-6">
          {room.people.map((person, i) => {
          const color = personColorByIndex(i, person.covered);
          const isClaimed = Boolean(room.claimedBy[person.id]);
          // This device already claimed this slot — let them tap back in
          const isMe = myPersonId === person.id;
          const isClaimedByOther = isClaimed && !isMe;

            return (
            <button
              key={person.id}
              onClick={() => {
                if (joining) return;
                if (isMe) { onResume(person.id); return; }
                if (!isClaimedByOther) onJoin(person.id);
              }}
              disabled={isClaimedByOther || joining}
              className={cn(
                "flex min-h-[56px] items-center gap-4 rounded-2xl border px-4 py-3 text-left text-foreground transition-[border-color,background-color,opacity,transform] duration-150",
                isMe
                  ? "cursor-pointer border-primary/40 bg-primary/5 active:scale-[0.98] active:opacity-75"
                  : isClaimedByOther
                  ? "cursor-default border-emerald-500/25 bg-emerald-500/5 opacity-60"
                  : "cursor-pointer border-border/50 bg-card active:scale-[0.98] active:opacity-75"
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                  isMe
                    ? `${color.bg} ${color.text}`
                    : isClaimed
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
              <span className="flex-1 text-base font-medium text-foreground">{person.name}</span>

              {/* Badge */}
              {isMe && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  You
                </motion.span>
              )}
              {isClaimedByOther && (
                <motion.span
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400"
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Joined
                </motion.span>
              )}
            </button>
            );
          })}

          <Button
            variant="outline"
            className="mt-3 h-12 rounded-2xl"
            disabled={joining}
            onClick={() => setShowSelfEntry(true)}
          >
            Not listed? Enter your name
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 px-6">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") submitName(); }}
            placeholder="Your name"
            className="h-14 rounded-2xl border border-input bg-background px-4 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            autoFocus
          />
          <Button className="h-14 rounded-2xl text-base font-semibold" disabled={!name.trim() || joining} onClick={submitName}>
            Join
          </Button>
          <Button variant="outline" className="h-12 rounded-2xl" disabled={joining} onClick={() => onSelfJoin("", true)}>
            Join as Guest
          </Button>
          {room.entryMode !== "self_serve" && room.people.length > 0 && (
            <Button variant="ghost" className="h-11 rounded-2xl text-muted-foreground" disabled={joining} onClick={() => setShowSelfEntry(false)}>
              Back to names
            </Button>
          )}
        </div>
      )}

      {joining && (
        <div className="mt-6 flex justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" />
        </div>
      )}
    </main>
  );
}

// ─── Assigning screen ─────────────────────────────────────────────────────────

interface AssigningProps {
  room: RoomState;
  myPersonId: string;
  participantToken: string;
  onBack: () => void;
  onDone: () => void;
  onRoomUpdate: (room: RoomState) => void;
}

function AssigningView({ room, myPersonId, participantToken, onBack, onDone, onRoomUpdate }: AssigningProps) {
  const [shakingItemId, setShakingItemId] = useState<string | null>(null);
  const [takenItemId, setTakenItemId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const myPerson = room.people.find((p) => p.id === myPersonId);
  const myIndex = room.people.findIndex((p) => p.id === myPersonId);
  const myColor = myPerson ? personColorByIndex(myIndex, myPerson.covered) : AVATAR_COLORS[0];

  const claimedCount = countClaimedSlots(room);
  const totalCount = countTotalSlots(room);
  const allClaimed = claimedCount === totalCount && totalCount > 0;

  function personColorForId(personId: string) {
    const person = room.people.find((p) => p.id === personId);
    const idx = room.people.findIndex((p) => p.id === personId);
    return personColorByIndex(idx, person?.covered);
  }

  function getItemPortions(item: LineItem): string[][] {
    const portionAssignments = room.portionAssignments
      ?? legacyAssignmentsToPortionAssignments(room.lineItems, room.assignments ?? {});
    return portionAssignments[item.id] ?? normalizeLineItem(item).portions?.map((portion) => portion.assignedToIds) ?? [];
  }

  function getClaimsByPerson(portions: string[][]) {
    return portions.reduce<Record<string, number>>((claims, portion) => {
      for (const personId of portion) {
        claims[personId] = (claims[personId] ?? 0) + 1;
      }
      return claims;
    }, {});
  }

  function findSoloPortionIndexForMe(portions: string[][]) {
    for (let index = portions.length - 1; index >= 0; index -= 1) {
      if (portions[index].length === 1 && portions[index][0] === myPersonId) return index;
    }
    return -1;
  }

  function findFirstUnassignedPortionIndex(portions: string[][]) {
    return portions.findIndex((portion) => portion.length === 0);
  }

  function handleQuickMultiTap(item: LineItem) {
    const portions = getItemPortions(item);
    const soloPortionIndex = findSoloPortionIndexForMe(portions);
    if (soloPortionIndex >= 0) {
      void handleUnclaim(item, soloPortionIndex);
      return;
    }

    const firstUnassignedIndex = findFirstUnassignedPortionIndex(portions);
    if (firstUnassignedIndex >= 0) {
      void handleItemTap(item, firstUnassignedIndex);
      return;
    }

    triggerShake(item.id, true);
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

  async function handleItemTap(item: LineItem, portionIndex: number) {
    const portions = getItemPortions(item);
    const assigned = portions[portionIndex] ?? [];
    const actionType: "claim_item" | "unclaim_item" = assigned.includes(myPersonId)
      ? "unclaim_item"
      : "claim_item";

    // Optimistic update
    const optimisticRoom = applyOptimisticUpdate(room, item.id, portionIndex, myPersonId, actionType);
    onRoomUpdate(optimisticRoom);

    try {
      const updated = await sendRoomAction(room.roomId, {
          type: actionType,
          personId: myPersonId,
          participantToken,
          itemId: item.id,
          portionIndex,
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
  async function handleUnclaim(item: LineItem, portionIndex: number) {
    const optimisticRoom = applyOptimisticUpdate(room, item.id, portionIndex, myPersonId, "unclaim_item");
    onRoomUpdate(optimisticRoom);
    try {
      const updated = await sendRoomAction(room.roomId, {
        type: "unclaim_item",
        personId: myPersonId,
        participantToken,
        itemId: item.id,
        portionIndex,
      });
      onRoomUpdate(updated);
    } catch {
      onRoomUpdate(room);
    }
  }

  // Share button taps: add my claim to an item already held by others.
  async function handleShare(item: LineItem, portionIndex: number) {
    const optimisticRoom = applyOptimisticUpdate(room, item.id, portionIndex, myPersonId, "claim_item");
    onRoomUpdate(optimisticRoom);
    try {
      const updated = await sendRoomAction(room.roomId, {
        type: "claim_item",
        personId: myPersonId,
        participantToken,
        itemId: item.id,
        portionIndex,
      });
      onRoomUpdate(updated);
    } catch {
      onRoomUpdate(room);
    }
  }

  async function renameMe() {
    const nextName = window.prompt("Rename yourself", myPerson?.name ?? "")?.trim();
    if (!nextName) return;
    try {
      const updated = await sendRoomAction(room.roomId, {
        type: "rename_person",
        personId: myPersonId,
        participantToken,
        name: nextName,
      });
      onRoomUpdate(updated);
    } catch {
      // Ignore transient failures.
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
    <main className="flex min-h-dvh flex-col pb-52">
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
            <button className="text-left text-xs text-muted-foreground underline-offset-2 active:opacity-70" onClick={renameMe}>
              Assign your dishes · Rename
            </button>
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
            const normalizedItem = normalizeLineItem(item);
            const portions = getItemPortions(item);
            const assigned = portions[0] ?? [];
            const isMultiQty = normalizedItem.quantity > 1;
            const isClaimedByMe = portions.some((portion) => portion.includes(myPersonId));
            const isShaking = shakingItemId === item.id;

            if (isMultiQty) {
              const assignedPortions = portions.filter((portion) => portion.length > 0).length;
              const expanded = expandedItemId === item.id;
              const claimEntries = Object.entries(getClaimsByPerson(portions));
              const hasMyRemovableChips = portions.some((portion) => portion.includes(myPersonId));

              return (
                <ShakeItem key={item.id} shaking={isShaking}>
                  <div
                    className={cn(
                      "flex flex-col gap-2 rounded-xl border p-4 transition-all duration-150 select-none",
                      isClaimedByMe
                        ? "border-primary/40 bg-primary/5"
                        : "border-transparent"
                    )}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className="flex cursor-pointer flex-col gap-3 text-left active:opacity-75"
                      onClick={() => handleQuickMultiTap(item)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleQuickMultiTap(item);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-2.5">
                          <span className="flex h-6 w-8 flex-shrink-0 items-center justify-center rounded-md bg-secondary text-sm font-medium tabular-nums">
                            ×{normalizedItem.quantity}
                          </span>
                          <div className="min-w-0">
                            <span className="block truncate text-base">{normalizedItem.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">{assignedPortions}/{normalizedItem.quantity} portions claimed</span>
                          </div>
                        </div>
                        <span className="flex-shrink-0 font-mono text-base font-medium tabular-nums">
                          {formatCurrency(normalizedItem.price * normalizedItem.quantity)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <div className="flex gap-1">
                            {portions.map((portion, dotIdx) => (
                              <div
                                key={dotIdx}
                                className={cn(
                                  "h-2 w-2 rounded-full transition-colors",
                                  portion.length > 0 ? "bg-primary" : "bg-muted"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {assignedPortions}/{normalizedItem.quantity}
                          </span>
                        </div>
                        {claimEntries.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {claimEntries.map(([pid, count]) => {
                              const person = room.people.find((p) => p.id === pid);
                              if (!person) return null;
                              const color = personColorForId(pid);
                              return (
                                <span key={pid} className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold", color.bg, color.text, pid === myPersonId && "ring-1 ring-primary/40")}>
                                  {person.covered ? <Gift className="h-3 w-3" /> : inlineInitials(person.name)}
                                  {count > 1 && <span className="font-mono tabular-nums">×{count}</span>}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        {assignedPortions > 0 && (
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
                        <span className="font-mono text-xs tabular-nums text-muted-foreground">
                          {formatCurrency(normalizedItem.price)}/ea
                        </span>
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
                              {hasMyRemovableChips && <p className="text-xs text-muted-foreground">Tap your name to remove</p>}
                            </div>
                            {portions.map((portion, portionIndex) => {
                              const claimedByMe = portion.includes(myPersonId);
                              return (
                                <div
                                  key={portionIndex}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => handleItemTap(item, portionIndex)}
                                  onKeyDown={(event) => {
                                    if (event.key === "Enter" || event.key === " ") {
                                      event.preventDefault();
                                      void handleItemTap(item, portionIndex);
                                    }
                                  }}
                                  className={cn(
                                    "flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                                    claimedByMe ? "bg-primary/10" : "bg-secondary/50",
                                    "active:opacity-75"
                                  )}
                                >
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium">Portion {portionIndex + 1}</p>
                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                      {portion.length === 0 ? (
                                        <span className="text-xs text-muted-foreground">Unassigned</span>
                                      ) : portion.map((pid) => {
                                        const person = room.people.find((p) => p.id === pid);
                                        if (!person) return null;
                                        const color = personColorForId(pid);
                                        const isMe = pid === myPersonId;
                                        const chipClassName = cn("inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-semibold", color.bg, color.text, isMe && "ring-1 ring-primary/40");
                                        if (!isMe) {
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
                                            onClick={(e) => { e.stopPropagation(); void handleUnclaim(item, portionIndex); }}
                                            className={chipClassName}
                                          >
                                            {person.covered ? <Gift className="h-3 w-3" /> : inlineInitials(person.name)}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                  <span className="font-mono text-sm tabular-nums text-muted-foreground">
                                    {portion.length > 1 ? formatCurrency(normalizedItem.price / portion.length) : formatCurrency(normalizedItem.price)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                  onClick={() => !claimedByOther && handleItemTap(item, 0)}
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
                        onClick={(e) => { e.stopPropagation(); void handleShare(item, 0); }}
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
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20 flex flex-col gap-3">
          {/* Status row — hidden when all claimed (button takes its place) */}
          {!allClaimed && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Waiting for others…
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 animate-pulse rounded-full bg-muted-foreground" />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {room.connectedPeople.length} online
                </span>
              </div>
            </div>
          )}

          {/* All-claimed celebration row */}
          {allClaimed && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  All dishes claimed! 🎉
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {room.connectedPeople.length} online
                </span>
              </div>
            </div>
          )}

          {/* I'm done button */}
          <Button
            onClick={onDone}
            className="h-12 w-full rounded-2xl text-base font-semibold"
          >
            I&apos;m done
          </Button>
        </div>
      </div>
    </main>
  );
}

// ─── Optimistic update helper ─────────────────────────────────────────────────

function applyOptimisticUpdate(
  room: RoomState,
  itemId: string,
  portionIndex: number,
  personId: string,
  action: "claim_item" | "unclaim_item"
): RoomState {
  const portionAssignments = room.portionAssignments
    ?? legacyAssignmentsToPortionAssignments(room.lineItems, room.assignments ?? {});
  const itemPortions = portionAssignments[itemId] ?? [];
  const current = itemPortions[portionIndex] ?? [];
  let updatedPortion: string[];

  if (action === "claim_item") {
    updatedPortion = current.includes(personId) ? current : [...current, personId];
  } else {
    updatedPortion = current.filter((id) => id !== personId);
  }
  const updatedItemPortions = itemPortions.map((portion, index) => index === portionIndex ? updatedPortion : portion);
  const updatedPortionAssignments = { ...portionAssignments, [itemId]: updatedItemPortions };

  return {
    ...room,
    portionAssignments: updatedPortionAssignments,
    assignments: { ...room.assignments, [itemId]: updatedItemPortions.flat() },
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
      const existingIdentity = getLocalRoomIdentity(roomId);
      const existingPersonId = existingIdentity?.personId ?? null;
      const existingParticipantToken = existingIdentity?.participantToken ?? "";
      if (existingPersonId && existingParticipantToken && room.claimedBy[existingPersonId]) {
        const existingPersonName = room.people.find((p) => p.id === existingPersonId)?.name ?? null;
        if (room.status === "done") {
          setPageState({ phase: "done", myPersonId: existingPersonId, myPersonName: existingPersonName, participantToken: existingParticipantToken, roomClosed: true, payUrl: room.payUrl });
        } else {
          setPageState({ phase: "assigning", room, myPersonId: existingPersonId, participantToken: existingParticipantToken });
        }
        return;
      }

      if (room.status === "done") {
        setPageState({ phase: "done", myPersonId: null, myPersonName: null, participantToken: null, roomClosed: true, payUrl: room.payUrl });
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

    const { room, myPersonId, participantToken } = pageState;

    const unsubscribe = subscribeToRoom(
      roomId,
      room.version,
      (updatedRoom) => {
        if (updatedRoom.status === "done") {
          const personName = updatedRoom.people.find((p) => p.id === myPersonId)?.name ?? null;
          setPageState({ phase: "done", myPersonId, myPersonName: personName, participantToken, roomClosed: true, payUrl: updatedRoom.payUrl });
          return;
        }
        if (!updatedRoom.people.some((p) => p.id === myPersonId)) {
          clearLocalRoomPersonId(roomId);
          setPageState({ phase: "pick_name", room: updatedRoom });
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
          const identity = getLocalRoomIdentity(roomId);
          const pid = identity?.personId ?? null;
          const pName = pid ? (updatedRoom.people.find((p) => p.id === pid)?.name ?? null) : null;
          setPageState({ phase: "done", myPersonId: pid, myPersonName: pName, participantToken: identity?.participantToken ?? null, roomClosed: true, payUrl: updatedRoom.payUrl });
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

  // Extract payUrl for use as a stable dep — undefined when not in the done phase.
  // This avoids a computed expression in the dependency array below.
  const donePayUrl = pageState.phase === "done" ? pageState.payUrl : undefined;

  // SSE subscription when in done phase — waiting for host to publish payUrl
  useEffect(() => {
    if (pageState.phase !== "done") return;
    // If we already have a payUrl, no need to subscribe
    if (donePayUrl) return;

    // We need a starting version to subscribe from. Fetch current room state first.
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    fetch(`/api/room/${roomId}`)
      .then((res) => {
        if (!res.ok || cancelled) return;
        return res.json() as Promise<RoomState>;
      })
      .then((room) => {
        if (!room || cancelled) return;
        // If payUrl already exists in the fetched room, redirect immediately
        if (room.payUrl) {
          setPageState((prev) =>
            prev.phase === "done" ? { ...prev, payUrl: room.payUrl } : prev
          );
          return;
        }
        unsubscribe = subscribeToRoom(
          roomId,
          room.version,
          (updatedRoom) => {
            if (updatedRoom.payUrl) {
              setPageState((prev) =>
                prev.phase === "done" ? { ...prev, payUrl: updatedRoom.payUrl } : prev
              );
            }
          },
          () => {
            // Room expired — nothing to do, guest stays on done screen
          }
        );
      })
      .catch(() => {
        // Network error — guest stays on done screen, no redirect
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [roomId, pageState.phase, donePayUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle join
  const [joining, setJoining] = useState(false);

  async function handleJoin(personId: string) {
    if (pageState.phase !== "pick_name") return;
    setJoining(true);

    try {
      // If this device already holds a different identity for this room, release
      // it first so that slot becomes available for others to claim.
      const previousIdentity = getLocalRoomIdentity(roomId);
      const previousPersonId = previousIdentity?.personId ?? null;
      if (previousPersonId && previousPersonId !== personId) {
        clearLocalRoomPersonId(roomId);
        // Fire-and-forget: we don't block on this — if it fails the slot stays
        // locked until the 30-min TTL expires, which is acceptable.
        if (previousIdentity?.participantToken) {
          sendRoomAction(roomId, { type: "leave", personId: previousPersonId, participantToken: previousIdentity.participantToken }).catch(() => {});
        }
      }

      const result = await sendRoomJoinAction(roomId, {
        type: "join",
        personId,
      });
      const updatedRoom = result.room;
      setLocalRoomIdentity(roomId, { personId: result.personId, participantToken: result.participantToken });
      setJoining(false);

      if (updatedRoom.status === "done") {
        const personName = updatedRoom.people.find((p) => p.id === result.personId)?.name ?? null;
        setPageState({ phase: "done", myPersonId: result.personId, myPersonName: personName, participantToken: result.participantToken, roomClosed: true, payUrl: updatedRoom.payUrl });
      } else {
        setPageState({ phase: "assigning", room: updatedRoom, myPersonId: result.personId, participantToken: result.participantToken });
      }
    } catch {
      setJoining(false);
      // Could show inline error but don't disrupt picker
    }
  }

  async function handleSelfJoin(name: string, guest: boolean) {
    if (pageState.phase !== "pick_name") return;
    setJoining(true);
    try {
      const previousIdentity = getLocalRoomIdentity(roomId);
      if (previousIdentity?.personId && previousIdentity.participantToken) {
        clearLocalRoomPersonId(roomId);
        sendRoomAction(roomId, {
          type: "leave",
          personId: previousIdentity.personId,
          participantToken: previousIdentity.participantToken,
        }).catch(() => {});
      }

      const result = await sendRoomJoinAction(roomId, {
        type: "add_person",
        name,
        guest,
      });
      setLocalRoomIdentity(roomId, { personId: result.personId, participantToken: result.participantToken });
      setJoining(false);
      if (result.room.status === "done") {
        const personName = result.room.people.find((p) => p.id === result.personId)?.name ?? null;
        setPageState({ phase: "done", myPersonId: result.personId, myPersonName: personName, participantToken: result.participantToken, roomClosed: true, payUrl: result.room.payUrl });
      } else {
        setPageState({ phase: "assigning", room: result.room, myPersonId: result.personId, participantToken: result.participantToken });
      }
    } catch {
      setJoining(false);
    }
  }

  function handleBackToNamePicker() {
    if (pageState.phase !== "assigning") return;
    const { room } = pageState;
    setPageState({ phase: "pick_name", room });
  }

  function handleResume(personId: string) {
    if (pageState.phase !== "pick_name") return;
    const { room } = pageState;
    const identity = getLocalRoomIdentity(roomId);
    if (!identity?.participantToken) return;
    setPageState({ phase: "assigning", room, myPersonId: personId, participantToken: identity.participantToken });
  }

  function handleRoomUpdate(updatedRoom: RoomState) {
    setPageState((prev) => {
      if (prev.phase !== "assigning") return prev;
      return { ...prev, room: updatedRoom };
    });
  }

  async function handleEditFromDone() {
    if (pageState.phase !== "done" || !pageState.myPersonId || !pageState.participantToken) return;
    const personId = pageState.myPersonId;
    const participantToken = pageState.participantToken;
    try {
      const updatedRoom = await sendRoomAction(roomId, {
        type: "guest_back",
        personId,
        participantToken,
      });
      setPageState({ phase: "assigning", room: updatedRoom, myPersonId: personId, participantToken });
    } catch (err: unknown) {
      const apiErr = err as { code?: string };
      if (apiErr?.code === "room_closed") {
        // Host closed the room — update state so the edit button disappears
        setPageState((prev) =>
          prev.phase === "done" ? { ...prev, roomClosed: true } : prev
        );
        return;
      }
      // Network or server error — re-throw so DoneScreen can show a retry hint
      throw err;
    }
  }

  return (
    <AnimatePresence mode="wait">
      {pageState.phase === "loading" && (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
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
        <motion.div key="pick_name" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, y: -8 }}>
          <NamePicker
            room={pageState.room}
            myPersonId={getLocalRoomPersonId(roomId)}
            onJoin={handleJoin}
            onSelfJoin={handleSelfJoin}
            onResume={handleResume}
            joining={joining}
          />
        </motion.div>
      )}

      {pageState.phase === "assigning" && (
        <motion.div key="assigning" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
          <AssigningView
            room={pageState.room}
            myPersonId={pageState.myPersonId}
            participantToken={pageState.participantToken}
            onBack={handleBackToNamePicker}
            onDone={() => {
              const donePersonId = pageState.myPersonId;
              const participantToken = pageState.participantToken;
              const donePersonName = pageState.room.people.find((p) => p.id === donePersonId)?.name ?? null;
              sendRoomAction(roomId, { type: "guest_done", personId: donePersonId, participantToken }).catch(() => {});
              setPageState({ phase: "done", myPersonId: donePersonId, myPersonName: donePersonName, participantToken, roomClosed: false });
            }}
            onRoomUpdate={handleRoomUpdate}
          />
        </motion.div>
      )}

      {pageState.phase === "done" && (
        <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <DoneScreen
            myPersonId={pageState.myPersonId}
            myPersonName={pageState.myPersonName}
            participantToken={pageState.participantToken}
            roomClosed={pageState.roomClosed}
            payUrl={pageState.payUrl}
            onEdit={handleEditFromDone}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
