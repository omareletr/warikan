"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { SplitFlowProvider } from "@/lib/split-flow-context";
import { NavigationProvider, useNavigation } from "@/lib/navigation-context";

const EASE = [0.32, 0.72, 0, 1] as const;
const DURATION = 0.32;

type Custom = { dir: 1 | -1; skip: boolean };

// "Reveal" model — the iOS swipe-back mental model applied in both directions:
//
//   - The OUTGOING page does the big motion (slides fully off-screen).
//   - The INCOMING page is layered UNDER it and just parallaxes a small
//     offset into position as the outgoing page exposes it.
//
//   Forward push: outgoing slides off LEFT, incoming parallaxes from +25% to 0.
//   Back pop:     outgoing slides off RIGHT, incoming parallaxes from -25% to 0.
//   Popstate (iOS swipe-back, browser back): skip — Safari already animated it.
const slideVariants: Variants = {
  enter: ({ dir, skip }: Custom) => ({
    x: skip ? "0%" : dir === 1 ? "25%" : "-25%",
    zIndex: 1,
  }),
  center: ({ skip }: Custom) => ({
    x: "0%",
    zIndex: 1,
    transition: { duration: skip ? 0 : DURATION, ease: EASE, zIndex: { duration: 0 } },
  }),
  exit: ({ dir, skip }: Custom) => ({
    x: skip ? "0%" : dir === 1 ? "-100%" : "100%",
    opacity: skip ? 0 : 1,
    zIndex: 2,
    transition: { duration: skip ? 0 : DURATION, ease: EASE, zIndex: { duration: 0 } },
  }),
};

function Stage({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { direction, skipAnim } = useNavigation();
  const custom: Custom = { dir: direction.current, skip: skipAnim.current };

  return (
    <div className="relative h-dvh w-screen overflow-hidden">
      <AnimatePresence mode="sync" initial={false} custom={custom}>
        <motion.div
          key={pathname}
          custom={custom}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 bg-background"
          style={{
            willChange: "transform",
            // Two-sided shadow: the trailing edge of whichever page is
            // sliding off has a soft shadow that falls onto the page being
            // revealed underneath. Off-screen edges get clipped by the
            // stage's overflow-hidden.
            boxShadow:
              "-14px 0 32px rgba(0, 0, 0, 0.55), 14px 0 32px rgba(0, 0, 0, 0.55)",
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NavigationProvider>
      <SplitFlowProvider>
        <Stage>{children}</Stage>
      </SplitFlowProvider>
    </NavigationProvider>
  );
}
