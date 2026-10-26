"use client";

import { MotionConfig } from "framer-motion";
import { AuthProvider } from "@/lib/auth-context";
import { SplitFlowProvider } from "@/lib/split-flow-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // "user" follows the device's Reduce Motion setting: movement is dropped, fades stay
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <SplitFlowProvider>{children}</SplitFlowProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
