"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SplitCard } from "@/components/split/split-card";
import { getSplits } from "@/lib/splits";

const INITIAL_SHOW = 10;

interface HistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HistorySheet({ open, onOpenChange }: HistorySheetProps) {
  const [showAll, setShowAll] = useState(false);
  const splits = getSplits();
  const visible = showAll ? splits : splits.slice(0, INITIAL_SHOW);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8 pt-6 max-h-[75dvh]">
        <SheetHeader className="mb-4 text-left">
          <SheetTitle>Recent Splits</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-full">
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
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
