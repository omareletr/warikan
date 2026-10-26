"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Minus, Plus, Users } from "lucide-react";
import { EASE_OUT, popIn } from "@/lib/motion";
import { formatCurrency } from "@/lib/calculate";
import { hapticTap } from "@/lib/platform";
import { cn } from "@/lib/utils";
import type { LineItem, MyPick } from "@/lib/types";

const MAX_WAYS = 5;

interface MyDishRowProps {
  item: LineItem;
  pick?: MyPick;
  onChange: (pick: MyPick | null) => void;
}

export function MyDishRow({ item, pick, onChange }: MyDishRowProps) {
  const picked = !!pick && pick.count > 0;
  const myCost = picked ? (item.price * pick.count) / pick.ways : 0;

  function toggle() {
    hapticTap();
    onChange(picked ? null : { count: 1, ways: 1 });
  }

  function setCount(count: number) {
    if (!pick) return;
    hapticTap();
    onChange(count <= 0 ? null : { ...pick, count: Math.min(count, item.quantity) });
  }

  function cycleWays() {
    if (!pick) return;
    hapticTap();
    onChange({ ...pick, ways: pick.ways >= MAX_WAYS ? 1 : pick.ways + 1 });
  }

  // A div, not a <button>, because the row contains the stepper and Shared buttons.
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={picked}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      }}
      className={cn(
        "cursor-pointer rounded-xl border p-4 transition-[transform,border-color,background-color] duration-150 ease-out-strong",
        picked ? "border-primary/40 bg-primary/5 active:opacity-75" : "border-transparent active:scale-[0.98]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className={cn("flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border", picked ? "border-primary bg-primary" : "border-border")}>
            {picked && <motion.span {...popIn}><Check className="h-3.5 w-3.5 text-primary-foreground" /></motion.span>}
          </span>
          <span className="text-base">
            {item.quantity > 1 && <span className="mr-1 text-muted-foreground">{item.quantity}×</span>}
            {item.name}
          </span>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="font-mono text-base font-medium tabular-nums">{formatCurrency(item.price * item.quantity)}</span>
          {item.quantity > 1 && <p className="font-mono text-xs text-muted-foreground tabular-nums">{formatCurrency(item.price)} ea</p>}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {picked && (
          <motion.div
            key="controls"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 pt-3">
              {item.quantity > 1 && (
                <div className="flex items-center rounded-full border border-border/50 bg-secondary">
                  <button aria-label="Fewer" className="flex h-11 w-11 items-center justify-center active:opacity-70" onClick={(e) => { e.stopPropagation(); setCount(pick.count - 1); }}>
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-12 text-center text-sm font-medium tabular-nums">{pick.count} of {item.quantity}</span>
                  <button aria-label="More" className="flex h-11 w-11 items-center justify-center active:opacity-70 disabled:opacity-30" disabled={pick.count >= item.quantity} onClick={(e) => { e.stopPropagation(); setCount(pick.count + 1); }}>
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}
              <button
                className={cn(
                  "flex h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium active:opacity-70",
                  pick.ways > 1 ? "border-primary/40 bg-primary/10 text-primary" : "border-border/50 bg-secondary text-muted-foreground"
                )}
                onClick={(e) => { e.stopPropagation(); cycleWays(); }}
              >
                <Users className="h-4 w-4" />
                {pick.ways > 1 ? `Shared ÷${pick.ways}` : "Shared?"}
              </button>
              <span className="ml-auto font-mono text-sm font-semibold tabular-nums text-primary">{formatCurrency(myCost)}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
