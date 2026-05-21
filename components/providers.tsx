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
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] } }}
          exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15, ease: "easeIn" } }}
          className="flex min-h-dvh flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </SplitFlowProvider>
  );
}
