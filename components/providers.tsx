"use client";

import { AuthProvider } from "@/lib/auth-context";
import { SplitFlowProvider } from "@/lib/split-flow-context";
import { LocaleProvider } from "@/lib/locale-context";
import type { Locale } from "@/lib/locale-context";
import type { AbstractIntlMessages } from "next-intl";

interface ProvidersProps {
  children: React.ReactNode;
  messages: Record<Locale, AbstractIntlMessages>;
}

export function Providers({ children, messages }: ProvidersProps) {
  return (
    <LocaleProvider messages={messages}>
      <AuthProvider>
        <SplitFlowProvider>{children}</SplitFlowProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
