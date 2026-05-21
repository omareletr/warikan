"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SplitFlowProvider } from "@/lib/split-flow-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <SplitFlowProvider>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
          style={{ display: "contents" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </SplitFlowProvider>
  );
}
