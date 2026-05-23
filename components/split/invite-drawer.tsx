"use client";

import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { Copy, Check, X, Users } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";

interface InviteDrawerProps {
  open: boolean;
  onClose: () => void;
  roomId: string;        // 6-char e.g. "X7K2MN"
  joinUrl: string;       // full URL e.g. "https://warikan0.netlify.app/join/X7K2MN"
  peopleCount: number;   // total people in the split
  connectedCount: number; // how many guests have joined
}

export function InviteDrawer(props: InviteDrawerProps) {
  return (
    <AnimatePresence>
      {props.open && <InviteDrawerContent {...props} />}
    </AnimatePresence>
  );
}

/** Formats a 6-char room code into "XX XX XX" grouped pairs. */
function formatRoomCode(roomId: string): string {
  return roomId
    .toUpperCase()
    .replace(/(.{2})(?=.)/g, "$1 ");
}

const MAX_DOTS = 8;

function ConnectionDots({
  connected,
  total,
}: {
  connected: number;
  total: number;
}) {
  const overflow = total > MAX_DOTS;
  const visibleTotal = overflow ? MAX_DOTS : total;
  const visibleConnected = Math.min(connected, visibleTotal);
  const extraConnected = overflow ? Math.max(0, connected - MAX_DOTS) : 0;

  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: visibleTotal }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
            i < visibleConnected ? "bg-emerald-400" : "bg-muted"
          }`}
        />
      ))}
      {overflow && (
        <span className="ml-0.5 text-xs text-muted-foreground font-medium">
          +{total - MAX_DOTS}
          {extraConnected > 0 && (
            <span className="text-emerald-400"> ({extraConnected} joined)</span>
          )}
        </span>
      )}
    </div>
  );
}

function InviteDrawerContent({
  onClose,
  roomId,
  joinUrl,
  peopleCount,
  connectedCount,
}: InviteDrawerProps) {
  const y = useMotionValue(0);
  const [copied, setCopied] = useState(false);

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    if (info.velocity.y > 500 || info.offset.y > 180) {
      onClose();
    } else {
      animate(y, 0, { type: "spring", damping: 30, stiffness: 300 });
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        style={{ y }}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={{ top: 0.05, bottom: 0.5 }}
        onDragEnd={handleDragEnd}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        role="dialog"
        aria-labelledby="invite-drawer-title"
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border/30 bg-card px-5 pt-3 pb-10 touch-none"
      >
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-muted" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-muted/50 text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: "spring", damping: 22, stiffness: 300 }}
        >
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <p id="invite-drawer-title" className="text-xl font-bold">
              Invite your table
            </p>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">
                {connectedCount} of {peopleCount} joined
              </span>
            </div>
            <ConnectionDots connected={connectedCount} total={peopleCount} />
          </div>
        </motion.div>

        {/* QR Code */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, type: "spring", damping: 22, stiffness: 300 }}
          className="mt-6 flex flex-col items-center gap-3"
        >
          <div className="rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/8">
            <div className="rounded-2xl bg-white p-5">
              <QRCodeSVG value={joinUrl} size={220} />
            </div>
          </div>
        </motion.div>

        {/* Room code */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.20, type: "spring", damping: 22, stiffness: 300 }}
          className="mt-8 flex flex-col items-center gap-1"
        >
          <p className="text-xs text-muted-foreground">can&apos;t scan?</p>
          <p className="font-mono text-xs tabular-nums text-muted-foreground">
            {joinUrl.replace(/^https?:\/\//, "").replace(new RegExp(roomId, "i"), "")}
            <span className="font-semibold text-foreground">
              {formatRoomCode(roomId)}
            </span>
          </p>
          <p className="mt-2 font-mono text-3xl font-bold tabular-nums tracking-[0.25em] text-foreground">
            {formatRoomCode(roomId)}
          </p>
        </motion.div>

        {/* Copy link button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, type: "spring", damping: 22, stiffness: 300 }}
          className="mt-3"
        >
          <Button
            variant="outline"
            className="h-14 w-full gap-2 rounded-2xl text-base font-semibold"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 20 }}
                >
                  <Check className="h-4 w-4 text-primary" />
                </motion.span>
                <span className="text-primary">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy invite link
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </>
  );
}
