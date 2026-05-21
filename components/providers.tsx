"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { SplitFlowProvider } from "@/lib/split-flow-context";
import { NavigationProvider, useNavigationDirection } from "@/lib/navigation-context";

const EASE = [0.32, 0.72, 0, 1] as const;
const DURATION = 0.32;

// iOS UINavigationController semantics:
//   Forward push: new card slides in from the right OVER the old card,
//                 which parallaxes 25% left under a dim overlay.
//   Back pop:     current card slides off to the right, revealing the
//                 previous card that was parked 25% left underneath.
// Z-ordering flips with direction so the appropriate card covers.
const slideVariants: Variants = {
  enter: (dir: 1 | -1) => ({
    x: dir === 1 ? "100%" : "-25%",
    zIndex: dir === 1 ? 2 : 1,
  }),
  center: (dir: 1 | -1) => ({
    x: "0%",
    zIndex: dir === 1 ? 2 : 1,
    transition: { duration: DURATION, ease: EASE, zIndex: { duration: 0 } },
  }),
  exit: (dir: 1 | -1) => ({
    x: dir === 1 ? "-25%" : "100%",
    zIndex: dir === 1 ? 1 : 2,
    transition: { duration: DURATION, ease: EASE, zIndex: { duration: 0 } },
  }),
};

const dimVariants: Variants = {
  enter: (dir: 1 | -1) => ({ opacity: dir === 1 ? 0 : 0.35 }),
  center: { opacity: 0, transition: { duration: DURATION, ease: EASE } },
  exit: (dir: 1 | -1) => ({ opacity: dir === 1 ? 0.35 : 0, transition: { duration: DURATION, ease: EASE } }),
};

function Stage({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const direction = useNavigationDirection();

  return (
    <div className="relative h-dvh w-screen overflow-hidden">
      <AnimatePresence mode="sync" initial={false} custom={direction.current}>
        <motion.div
          key={pathname}
          custom={direction.current}
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
            custom={direction.current}
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
