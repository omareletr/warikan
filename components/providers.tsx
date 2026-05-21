"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { SplitFlowProvider } from "@/lib/split-flow-context";

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <SplitFlowProvider>
      <AnimatePresence mode="sync" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.18, ease: "easeOut" } }}
          exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeIn" } }}
          className="flex min-h-dvh flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </SplitFlowProvider>
  );
}
