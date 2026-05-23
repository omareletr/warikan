"use client";

import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import type { PanInfo } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface QRDrawerProps {
  open: boolean;
  onClose: () => void;
  url: string;
  payAppName: string;  // e.g. "Venmo"
  payHandle: string;   // e.g. "@username" (already prefixed)
}

export function QRDrawer(props: QRDrawerProps) {
  return (
    <AnimatePresence>
      {props.open && <QRDrawerContent {...props} />}
    </AnimatePresence>
  );
}

function QRDrawerContent({ onClose, url, payAppName, payHandle }: QRDrawerProps) {
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
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(onClose, 1500);
    } catch { /* ignore */ }
  }

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
        role="dialog"
        aria-labelledby="qr-drawer-title"
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-border/30 bg-card px-5 pt-3 pb-10 touch-none"
      >
        <div className="mx-auto mb-6 h-1.5 w-10 rounded-full bg-muted" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, type: "spring", damping: 22, stiffness: 300 }}
        >
          <p id="qr-drawer-title" className="text-xl font-bold">Scan to pay</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Everyone picks their name and pays.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14, type: "spring", damping: 22, stiffness: 300 }}
          className="mt-6 flex flex-col items-center gap-3"
        >
          <div className="rounded-2xl shadow-2xl shadow-black/40 ring-1 ring-white/8">
            <div className="rounded-2xl bg-white p-5">
              <QRCodeSVG value={url || "https://warikan0.netlify.app"} size={220} />
            </div>
          </div>
          {payHandle && (
            <div className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
              <span className="text-xs text-muted-foreground">{payAppName}</span>
              <span className="text-xs text-muted-foreground/40">·</span>
              <span className="font-mono text-xs text-foreground">{payHandle}</span>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.20, type: "spring", damping: 22, stiffness: 300 }}
          className="mt-6"
        >
          <Separator className="mb-5" />
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
                Copy link
              </>
            )}
          </Button>
        </motion.div>
      </motion.div>
    </>
  );
}
