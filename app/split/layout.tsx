"use client";

import { SplitFlowProvider } from "@/lib/split-flow-context";

export default function SplitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SplitFlowProvider>{children}</SplitFlowProvider>;
}
