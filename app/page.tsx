"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, ImagePlus, FlaskConical, History } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReceiptIllustration } from "@/components/split/receipt-illustration";
import { HeroConceptA } from "@/components/split/hero-concept-a";
import { HeroConceptB } from "@/components/split/hero-concept-b";
import { HeroConceptC } from "@/components/split/hero-concept-c";
import { HistorySheet } from "@/components/split/history-sheet";
import { useSplitFlow } from "@/lib/split-flow-context";
import { consumePopFlag } from "@/lib/nav-flag";
import { getSplits } from "@/lib/splits";
import { cn } from "@/lib/utils";

const DEMO_RECEIPT = {
  restaurantName: "Helmand Palace",
  lineItems: [
    { id: crypto.randomUUID(), name: "Qabelee", quantity: 1, price: 19.99, assignedToIds: [] },
    { id: crypto.randomUUID(), name: "Mourgh Kabab", quantity: 2, price: 16.99, assignedToIds: [] },
    { id: crypto.randomUUID(), name: "Banjan", quantity: 3, price: 8.99, assignedToIds: [] },
    { id: crypto.randomUUID(), name: "Kofta Kabab", quantity: 1, price: 17.99, assignedToIds: [] },
    { id: crypto.randomUUID(), name: "Kaddo", quantity: 1, price: 8.99, assignedToIds: [] },
    { id: crypto.randomUUID(), name: "Bread", quantity: 1, price: 3.99, assignedToIds: [] },
    { id: crypto.randomUUID(), name: "Rice Pudding", quantity: 4, price: 6.99, assignedToIds: [] },
  ],
  fees: [] as { id: string; name: string; amount: number }[],
  taxAmount: 12.07,
  tipAmount: 25.18,
};

type Phase = "intact" | "tearing" | "torn";
type HeroVariant = "original" | "a" | "b" | "c";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function HomePage() {
  const router = useRouter();
  const { setImage, setReceiptData, reset } = useSplitFlow();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const LINE1 = "Pay your share.";
  const LINE2 = "Keep your friends.";
  const TAGLINE_LENGTH = LINE1.length + LINE2.length;

  const [fromPop] = useState(() => consumePopFlag());
  const [phase, setPhase] = useState<Phase>("torn");
  const [mounted, setMounted] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [splitCount, setSplitCount] = useState(0);
  const [taglineChars, setTaglineChars] = useState(0);
  const [variant, setVariant] = useState<HeroVariant>("a");
  const [heroReady, setHeroReady] = useState(false);

  // Read variant from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("warikan_hero_variant");
    if (stored && ["original", "a", "b", "c"].includes(stored)) {
      setVariant(stored as HeroVariant);
    }
  }, []);

  // Reset heroReady when variant changes
  useEffect(() => {
    setHeroReady(false);
  }, [variant]);

  // Sync heroReady with original variant's showButtons
  useEffect(() => {
    if (variant === "original" && phase === "torn") {
      setHeroReady(true);
    }
  }, [variant, phase]);

  useEffect(() => {
    if (variant !== "original") {
      // Skip intro animation for non-original variants
      setSplitCount(getSplits().length);
      setMounted(true);
      return;
    }
    const alreadyPlayed = sessionStorage.getItem("warikan_intro_played") === "1";
    if (!alreadyPlayed) setPhase("intact");
    setSplitCount(getSplits().length);
    setMounted(true);
  }, [variant]);

  useEffect(() => {
    if (variant !== "original") return;
    if (!mounted || phase !== "intact") return;
    const t1 = setTimeout(() => setPhase("tearing"), 900);
    return () => clearTimeout(t1);
  }, [mounted, phase, variant]);

  useEffect(() => {
    if (variant !== "original") return;
    if (phase !== "tearing") return;
    const t2 = setTimeout(() => {
      setPhase("torn");
      sessionStorage.setItem("warikan_intro_played", "1");
    }, 700);
    return () => clearTimeout(t2);
  }, [phase, variant]);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    try {
      const base64 = await readFileAsBase64(file);
      reset();
      setImage(base64, file.type);
      router.push("/split/review");
    } catch {
      // ignore — user can try again
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  const showButtons = phase === "torn";

  useEffect(() => {
    if (variant !== "original") return;
    if (!mounted || !showButtons) return;
    setTaglineChars(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setTaglineChars(i);
      if (i >= TAGLINE_LENGTH) clearInterval(interval);
    }, 38);
    return () => clearInterval(interval);
  }, [mounted, showButtons, variant]);

  const actionButtons = (
    <>
      <Button
        className="h-14 gap-3 rounded-2xl text-base font-semibold glow-sm"
        asChild
      >
        <Link href="/split/scan">
          <Camera className="h-5 w-5" />
          Scan Receipt
        </Link>
      </Button>
      <Button
        variant="outline"
        className="h-14 gap-3 rounded-2xl text-base font-semibold"
        onClick={() => uploadInputRef.current?.click()}
      >
        <ImagePlus className="h-5 w-5" />
        Upload Photo
      </Button>
    </>
  );

  return (
    <motion.main initial={fromPop ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="flex min-h-dvh flex-col px-6 pb-10">
      {/* Variant switcher */}
      <div className="fixed top-12 right-3 z-50 flex gap-1 rounded-full bg-card/90 backdrop-blur-md border border-border/50 p-1 shadow-lg">
        {(["original", "a", "b", "c"] as const).map((v) => (
          <button
            key={v}
            onClick={() => {
              setVariant(v);
              sessionStorage.setItem("warikan_hero_variant", v);
            }}
            className={cn(
              "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              variant === v
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {v === "original" ? "OG" : v.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Top bar */}
      <div className="sticky-header -mx-6 px-6 pt-10 pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-gradient">Warikan</span>
          {process.env.NEXT_PUBLIC_IS_STAGING === "true" && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">staging</span>
          )}
        </div>
        {splitCount > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="relative h-11 w-11"
            onClick={() => setHistoryOpen(true)}
          >
            <History className="h-5 w-5 text-muted-foreground" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {splitCount > 9 ? "9+" : splitCount}
            </span>
          </Button>
        )}
      </div>
      </div>

      {/* Center content */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative flex flex-col items-center">
          {variant === "original" ? (
            <>
              {/* Receipt illustration */}
              <ReceiptIllustration phase={phase} />

              {/* Tagline typewriter */}
              <div className="mt-3 h-12 w-[220px] text-center font-mono text-base text-foreground leading-6">
                <div>
                  {LINE1.slice(0, Math.min(taglineChars, LINE1.length))}
                  {taglineChars > 0 && taglineChars < LINE1.length && (
                    <span className="opacity-70 animate-pulse">|</span>
                  )}
                </div>
                {taglineChars >= LINE1.length && (
                  <div>
                    {LINE2.slice(0, taglineChars - LINE1.length)}
                    {taglineChars < TAGLINE_LENGTH && (
                      <span className="opacity-70 animate-pulse">|</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action buttons — fade in between torn halves */}
              <motion.div
                className="mt-3 flex w-full max-w-[220px] flex-col gap-3"
                animate={{
                  opacity: showButtons ? 1 : 0,
                  y: showButtons ? 0 : 10,
                }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                {actionButtons}
              </motion.div>
            </>
          ) : (
            <>
              {/* Concept hero variant */}
              {variant === "a" && (
                <HeroConceptA onReady={() => setHeroReady(true)} />
              )}
              {variant === "b" && (
                <HeroConceptB onReady={() => setHeroReady(true)} />
              )}
              {variant === "c" && (
                <HeroConceptC onReady={() => setHeroReady(true)} />
              )}

              {/* Action buttons — fade in when hero is ready */}
              <motion.div
                className="mt-6 flex w-full max-w-[220px] flex-col gap-3"
                animate={{ opacity: heroReady ? 1 : 0, y: heroReady ? 0 : 10 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                {actionButtons}
              </motion.div>
            </>
          )}
        </div>
      </div>

      {/* Demo link */}
      <motion.div
        className="flex justify-center"
        animate={{ opacity: variant === "original" ? (showButtons ? 1 : 0) : (heroReady ? 1 : 0) }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <Button
          variant="ghost"
          className="h-10 gap-2 text-sm text-muted-foreground"
          onClick={() => {
            reset();
            setReceiptData(DEMO_RECEIPT);
            router.push("/split/review");
          }}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Try demo receipt
        </Button>
      </motion.div>

      {/* Hidden file input for gallery upload */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      <HistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />
    </motion.main>
  );
}
