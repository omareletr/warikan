"use client";

import { SplitFlowProvider } from "@/lib/split-flow-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SplitFlowProvider>{children}</SplitFlowProvider>;
}
