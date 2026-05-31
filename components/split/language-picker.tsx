"use client";

import { useState } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useLocale, LOCALES } from "@/lib/locale-context";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function LanguagePicker() {
  const [open, setOpen] = useState(false);
  const { locale, setLocale } = useLocale();
  const t = useTranslations("common");

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-11 w-11"
        aria-label={t("language")}
        onClick={() => setOpen(true)}
      >
        <Globe className="h-5 w-5 text-muted-foreground" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl px-6 pb-10 pt-6"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetTitle className="mb-5">{t("language")}</SheetTitle>
          <div className="flex flex-col gap-2">
            {LOCALES.map((loc) => {
              const isActive = loc.code === locale;
              return (
                <button
                  key={loc.code}
                  onClick={() => {
                    setLocale(loc.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-5 py-4 text-left transition-colors",
                    isActive
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/30 bg-card/40"
                  )}
                  dir={loc.dir}
                >
                  <div className="flex flex-col gap-0.5">
                    <span
                      className={cn(
                        "text-base font-semibold",
                        isActive ? "text-primary" : "text-foreground"
                      )}
                    >
                      {loc.nativeLabel}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {loc.label}
                    </span>
                  </div>
                  {isActive && (
                    <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
