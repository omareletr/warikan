"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { SplitCard } from "@/components/split/split-card";
import { getSplits, clearAllSplits } from "@/lib/splits";
import type { Split } from "@/lib/types";

const INITIAL_SHOW = 10;

interface HistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistorySheet({ open, onOpenChange }: HistorySheetProps) {
  const [showAll, setShowAll] = useState(false);
  const [splits, setSplits] = useState<Split[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const visible = showAll ? splits : splits.slice(0, INITIAL_SHOW);
  const t = useTranslations("history");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (open) setSplits(getSplits());
  }, [open]);

  function handleClearAll() {
    clearAllSplits();
    setSplits([]);
    setShowAll(false);
    setShowConfirm(false);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-6 max-h-[75dvh] flex flex-col gap-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="mb-4 flex items-center gap-3 shrink-0">
            <SheetTitle>{t("title")}</SheetTitle>
            {splits.length > 0 && (
              <Button variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => setShowConfirm(true)}>
                {t("clearAll")}
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {splits.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("noSplits")}</p>
            ) : (
              <div className="flex flex-col gap-3 pb-4">
                {visible.map((split) => (
                  <SplitCard key={split.id} split={split} />
                ))}
                {!showAll && splits.length > INITIAL_SHOW && (
                  <Button
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => setShowAll(true)}
                  >
                    {t("showMore", { n: splits.length - INITIAL_SHOW })}
                  </Button>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("clearConfirmTitle")}</DialogTitle>
            <DialogDescription asChild>
              <div>
                <p className="font-medium text-foreground">{splits.length !== 1 ? t("savedSplits_plural", { n: splits.length }) : t("savedSplits", { n: splits.length })}</p>
                <p className="mt-1">{t("clearConfirmDesc")}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleClearAll}>{t("clearAll")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
