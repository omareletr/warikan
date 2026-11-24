"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface AiConsentSheetProps {
  open: boolean;
  onAllow: () => void;
  onDecline: () => void;
}

export function AiConsentSheet({ open, onAllow, onDecline }: AiConsentSheetProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onDecline(); }}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-10">
        <SheetHeader className="mb-6 mt-2 items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <SheetTitle className="text-xl font-semibold">Read this receipt with AI?</SheetTitle>
          <SheetDescription className="text-base">
            To pull out the items and prices, Warikan sends your receipt photo (or the text
            your phone read from it) to Google Gemini. Warikan doesn&apos;t keep it.
          </SheetDescription>
          <Link href="/privacy" className="text-sm text-primary underline-offset-4 hover:underline">
            How your data is handled
          </Link>
        </SheetHeader>

        <div className="flex flex-col gap-3">
          <Button className="h-14 rounded-2xl text-base font-semibold" onClick={onAllow}>
            Allow
          </Button>
          <Button variant="ghost" className="h-12 rounded-2xl text-muted-foreground" onClick={onDecline}>
            Enter items myself
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
