"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { SplitFlowProvider } from "@/lib/split-flow-context";
import { NavigationProvider, useNavigation } from "@/lib/navigation-context";

const EASE = [0.32, 0.72, 0, 1] as const;
const DURATION = 0.32;

type Custom = { dir: 1 | -1; skip: boolean };

// iOS UINavigationController semantics, with a skip-animation flag for
// navigations the browser already animated (iOS swipe-back, browser back
// button → popstate). For those we land at center with duration 0 so we
// don't replay an animation on top of the native one.
const slideVariants: Variants = {
  enter: ({ dir, skip }: Custom) => ({
    x: skip ? "0%" : dir === 1 ? "100%" : "-25%",
    zIndex: dir === 1 ? 2 : 1,
  }),
  center: ({ dir, skip }: Custom) => ({
    x: "0%",
    zIndex: dir === 1 ? 2 : 1,
    transition: { duration: skip ? 0 : DURATION, ease: EASE, zIndex: { duration: 0 } },
  }),
  exit: ({ dir, skip }: Custom) => ({
    x: skip ? "0%" : dir === 1 ? "-25%" : "100%",
    opacity: skip ? 0 : 1,
    zIndex: dir === 1 ? 1 : 2,
    transition: { duration: skip ? 0 : DURATION, ease: EASE, zIndex: { duration: 0 } },
  }),
};

const dimVariants: Variants = {
  enter: ({ dir, skip }: Custom) => ({ opacity: skip ? 0 : dir === 1 ? 0 : 0.35 }),
  center: ({ skip }: Custom) => ({
    opacity: 0,
    transition: { duration: skip ? 0 : DURATION, ease: EASE },
  }),
  exit: ({ dir, skip }: Custom) => ({
    opacity: skip ? 0 : dir === 1 ? 0.35 : 0,
    transition: { duration: skip ? 0 : DURATION, ease: EASE },
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
            boxShadow: "-12px 0 28px rgba(0, 0, 0, 0.55)",
          }}
        >
          {children}
          <motion.div
            custom={custom}
            variants={dimVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="pointer-events-none absolute inset-0 bg-black"
            style={{ willChange: "opacity" }}
          />
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
