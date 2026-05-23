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
import { SplitCard } from "@/components/split/split-card";
import { getSplits, clearAllSplits } from "@/lib/splits";
import { subscribeToSplits, deleteFirestoreSplit } from "@/lib/firestore-splits";
import { useAuth } from "@/lib/auth-context";
import type { Split } from "@/lib/types";

const INITIAL_SHOW = 10;

interface HistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistorySheet({ open, onOpenChange }: HistorySheetProps) {
  const { user } = useAuth();
  const [showAll, setShowAll] = useState(false);
  const [splits, setSplits] = useState<Split[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const visible = showAll ? splits : splits.slice(0, INITIAL_SHOW);

  useEffect(() => {
    if (!user) {
      setSplits(getSplits());
      return () => {};
    }
    return subscribeToSplits(user.uid, setSplits);
  }, [user]);

  async function handleClearAll() {
    clearAllSplits();
    if (user) {
      await Promise.all(splits.map((s) => deleteFirestoreSplit(user.uid, s.id)));
    }
    setSplits([]);
    setShowAll(false);
    setShowConfirm(false);
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-6 max-h-[75dvh] flex flex-col gap-0" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="mb-4 flex items-center gap-3 shrink-0">
            <SheetTitle>Recent splits</SheetTitle>
            {splits.length > 0 && (
              <Button variant="ghost" size="sm" className="text-destructive h-8 px-2" onClick={() => setShowConfirm(true)}>
                Clear all
              </Button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {splits.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No splits yet.</p>
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
                    Show {splits.length - INITIAL_SHOW} more
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
            <DialogTitle>Clear all splits?</DialogTitle>
            <DialogDescription asChild>
              <div>
                <p className="font-medium text-foreground">{splits.length} saved split{splits.length !== 1 ? "s" : ""}</p>
                <p className="mt-1">This will be permanently removed and cannot be undone.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="destructive" onClick={handleClearAll}>Clear all</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
