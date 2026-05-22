"use client";

import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { Share2, Copy, QrCode, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ShareSheetProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
  onShowQR?: () => void;
}

export function ShareSheet(props: ShareSheetProps) {
  return (
    <AnimatePresence>
      {props.open && <ShareSheetContent {...props} />}
    </AnimatePresence>
  );
}

function ShareSheetContent({ onClose, url, title, onShowQR }: ShareSheetProps) {
  const y = useMotionValue(0);
  const [copied, setCopied] = useState(false);

  function handleDragEnd(_: PointerEvent, info: PanInfo) {
    if (info.velocity.y > 500 || info.offset.y > 180) {
      onClose();
    } else {
      animate(y, 0, { type: "spring", damping: 30, stiffness: 300 });
    }
  }

  async function handleShare() {
    onClose();
    if (navigator.share) {
      try { await navigator.share({ url, title }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(url); } catch { /* ignore */ }
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(onClose, 900);
    } catch { /* ignore */ }
  }

  function handleQR() {
    onClose();
    onShowQR?.();
  }

  const options = [
    {
      id: "share",
      icon: Share2,
      label: "Share link",
      sublabel: "Opens share sheet",
      action: handleShare,
      highlight: false,
    },
    {
      id: "copy",
      icon: copied ? Check : Copy,
      label: copied ? "Copied!" : "Copy link",
      sublabel: "Copies to clipboard",
      action: handleCopy,
      highlight: copied,
    },
    ...(onShowQR ? [{
      id: "qr",
      icon: QrCode,
      label: "Show QR code",
      sublabel: "For Venmo payments",
      action: handleQR,
      highlight: false,
    }] : []),
  ];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />
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
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border/30 bg-card px-5 pt-3 pb-12 touch-none"
      >
        <div className="mx-auto mb-6 h-1.5 w-10 rounded-full bg-muted" />
        <div className="flex flex-col">
          {options.map((option, i) => {
            const Icon = option.icon;
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 + 0.08, type: "spring", damping: 22, stiffness: 300 }}
              >
                {i > 0 && <Separator />}
                <button
                  className="flex w-full items-center gap-4 py-4 text-left transition-opacity active:opacity-60"
                  onClick={option.action}
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className={`text-base font-medium ${option.highlight ? "text-primary" : ""}`}>{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.sublabel}</p>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}
