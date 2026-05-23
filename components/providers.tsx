"use client";

import { AuthProvider } from "@/lib/auth-context";
import { SplitFlowProvider } from "@/lib/split-flow-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <SplitFlowProvider>{children}</SplitFlowProvider>
    </AuthProvider>
  );
}
