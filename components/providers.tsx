"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { SplitFlowProvider } from "@/lib/split-flow-context";
import { NavigationProvider, useNavigationDirection } from "@/lib/navigation-context";

const EASE = [0.32, 0.72, 0, 1] as const;
const DURATION = 0.32;

const slideVariants: Variants = {
  enter: (dir: 1 | -1) => ({ x: `${dir * 100}%`, opacity: 1 }),
  center: { x: "0%", opacity: 1, transition: { duration: DURATION, ease: EASE } },
  exit: (dir: 1 | -1) => ({ x: `${dir * -25}%`, opacity: 0.6, transition: { duration: DURATION, ease: EASE } }),
};

function Stage({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const direction = useNavigationDirection();
  const [transitioning, setTransitioning] = useState(false);

  return (
    <div
      className="relative h-dvh w-screen overflow-hidden"
      data-nav-transitioning={transitioning ? "true" : undefined}
    >
      <AnimatePresence
        mode="sync"
        initial={false}
        custom={direction.current}
        onExitComplete={() => setTransitioning(false)}
      >
        <motion.div
          key={pathname}
          custom={direction.current}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          onAnimationStart={() => setTransitioning(true)}
          className="absolute inset-0 overflow-y-auto overscroll-contain"
          style={{ willChange: "transform, opacity" }}
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
