"use client";

import { motion } from "framer-motion";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-muted/40 ${className}`}>
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
        }}
        animate={{ backgroundPosition: ["200% 0%", "-200% 0%"] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }}
      />
    </div>
  );
}

function LineItemSkeleton({ nameWidth }: { nameWidth: string }) {
  return (
    <div className="flex items-center justify-between py-3.5">
      <SkeletonBlock className={`h-4 ${nameWidth}`} />
      <SkeletonBlock className="h-4 w-14" />
    </div>
  );
}

const LINE_ITEMS = [
  { nameWidth: "w-36" },
  { nameWidth: "w-28" },
  { nameWidth: "w-44" },
  { nameWidth: "w-32" },
  { nameWidth: "w-40" },
];

const DOT_DURATION = 1.2;

function TypingDots() {
  return (
    <p className="mb-6 text-xl font-semibold text-foreground">
      Parsing receipt
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ opacity: [0, 1, 0] }}
          transition={{
            repeat: Infinity,
            duration: DOT_DURATION,
            delay: i * (DOT_DURATION / 3),
            ease: "easeInOut",
          }}
        >
          .
        </motion.span>
      ))}
    </p>
  );
}

export function ReceiptSkeleton() {
  return (
    <div className="mt-8 flex flex-col gap-8">
      <TypingDots />
      {/* Restaurant */}
      <section>
        <SkeletonBlock className="mb-2 h-4 w-24" />
        <SkeletonBlock className="h-11 w-full rounded-md" />
      </section>

      {/* Items */}
      <section>
        <SkeletonBlock className="mb-3 h-4 w-10" />
        <div className="divide-y divide-border/40">
          {LINE_ITEMS.map((item, i) => (
            <LineItemSkeleton key={i} nameWidth={item.nameWidth} />
          ))}
        </div>
      </section>

      {/* Tax & Tip */}
      <section>
        <SkeletonBlock className="mb-4 h-4 w-20" />
        <div className="flex flex-col gap-5">
          <div>
            <SkeletonBlock className="mb-2 h-4 w-8" />
            <SkeletonBlock className="h-11 w-full rounded-md" />
          </div>
          <div>
            <SkeletonBlock className="mb-2 h-4 w-6" />
            <SkeletonBlock className="h-10 w-full rounded-full" />
            <SkeletonBlock className="mt-3 h-11 w-full rounded-md" />
          </div>
        </div>
      </section>
    </div>
  );
}
