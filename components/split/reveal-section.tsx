"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT, staggerDelay } from "@/lib/motion";

// Fades a block of freshly parsed receipt content up into place. `play` is
// false when the content was already there (e.g. navigating back), so it
// renders without animating; the wrapper stays either way to keep the DOM stable.
export function RevealSection({ index, play, children }: { index: number; play: boolean; children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={play ? { opacity: 0, transform: reduce ? "none" : "translateY(8px)" } : false}
      animate={{ opacity: 1, transform: "translateY(0px)", transitionEnd: { transform: "none" } }}
      transition={{ duration: 0.25, ease: EASE_OUT, delay: staggerDelay(index) }}
    >
      {children}
    </motion.div>
  );
}
