"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { NextIntlClientProvider } from "next-intl";
import type { AbstractIntlMessages } from "next-intl";

export type Locale = "en" | "fr" | "ar";

export const LOCALES: { code: Locale; label: string; nativeLabel: string; dir: "ltr" | "rtl" }[] = [
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" },
  { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" },
];

const LOCALE_KEY = "warikan_locale";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dir: "ltr" | "rtl";
  isRTL: boolean;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  dir: "ltr",
  isRTL: false,
});

export function useLocale() {
  return useContext(LocaleContext);
}

interface LocaleProviderProps {
  children: React.ReactNode;
  messages: Record<Locale, AbstractIntlMessages>;
}

export function LocaleProvider({ children, messages }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (stored && ["en", "fr", "ar"].includes(stored)) {
      setLocaleState(stored);
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_KEY, newLocale);
    // DOM attributes (lang, dir) are updated by the useEffect below when locale changes.
    // No need to mutate them here — setState triggers a re-render which fires the effect.
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const localeInfo = LOCALES.find((l) => l.code === locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = localeInfo?.dir ?? "ltr";
  }, [locale, mounted]);

  const localeInfo = LOCALES.find((l) => l.code === locale)!;

  const contextValue: LocaleContextValue = {
    locale,
    setLocale,
    dir: localeInfo.dir,
    isRTL: localeInfo.dir === "rtl",
  };

  return (
    <LocaleContext.Provider value={contextValue}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages[locale]}
        timeZone="UTC"
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
