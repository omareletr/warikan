"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, ImagePlus, FlaskConical, History } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ReceiptIllustration } from "@/components/split/receipt-illustration";
import { HistorySheet } from "@/components/split/history-sheet";
import { useSplitFlow } from "@/lib/split-flow-context";
import { getSplits } from "@/lib/splits";

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

  const [phase, setPhase] = useState<Phase>("torn");
  const [mounted, setMounted] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [splitCount, setSplitCount] = useState(0);

  useEffect(() => {
    const alreadyPlayed = sessionStorage.getItem("warikan_intro_played") === "1";
    if (!alreadyPlayed) setPhase("intact");
    setSplitCount(getSplits().length);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || phase !== "intact") return;
    const t1 = setTimeout(() => setPhase("tearing"), 900);
    return () => clearTimeout(t1);
  }, [mounted, phase]);

  useEffect(() => {
    if (phase !== "tearing") return;
    const t2 = setTimeout(() => {
      setPhase("torn");
      sessionStorage.setItem("warikan_intro_played", "1");
    }, 700);
    return () => clearTimeout(t2);
  }, [phase]);

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

  const isTorn = phase === "tearing" || phase === "torn";
  const showButtons = phase === "torn";

  return (
    <main className="flex min-h-full flex-col px-6 pb-10">
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
          {/* Receipt illustration */}
          <ReceiptIllustration phase={phase} />

          {/* Action buttons — fade in between torn halves */}
          <motion.div
            className="mt-6 flex w-full max-w-[220px] flex-col gap-3"
            animate={{
              opacity: showButtons ? 1 : 0,
              y: showButtons ? 0 : 10,
            }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
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
          </motion.div>
        </div>
      </div>

      {/* Demo link */}
      <motion.div
        className="flex justify-center"
        animate={{ opacity: showButtons ? 1 : 0 }}
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
    </main>
  );
}
