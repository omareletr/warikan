"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, ImagePlus, FlaskConical } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HistorySheet } from "@/components/split/history-sheet";
import { SplitCard } from "@/components/split/split-card";
import { useSplitFlow } from "@/lib/split-flow-context";
import { consumePopFlag } from "@/lib/nav-flag";
import { closeRoomIfActive } from "@/lib/room-client";
import { getSplits } from "@/lib/splits";
import { createId } from "@/lib/id";
import type { Split } from "@/lib/types";

const RECENT_COUNT = 3;

function createDemoReceipt() {
  return {
    restaurantName: "Helmand Palace",
    lineItems: [
      { id: createId(), name: "Qabelee", quantity: 1, price: 19.99, assignedToIds: [] },
      { id: createId(), name: "Mourgh Kabab", quantity: 2, price: 16.99, assignedToIds: [] },
      { id: createId(), name: "Banjan", quantity: 3, price: 8.99, assignedToIds: [] },
      { id: createId(), name: "Kofta Kabab", quantity: 1, price: 17.99, assignedToIds: [] },
      { id: createId(), name: "Kaddo", quantity: 1, price: 8.99, assignedToIds: [] },
      { id: createId(), name: "Bread", quantity: 1, price: 3.99, assignedToIds: [] },
      { id: createId(), name: "Rice Pudding", quantity: 4, price: 6.99, assignedToIds: [] },
    ],
    fees: [] as { id: string; name: string; amount: number }[],
    taxAmount: 12.07,
    tipAmount: 25.18,
  };
}

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

  const [fromPop] = useState(() => consumePopFlag());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [splits, setSplits] = useState<Split[]>([]);

  useEffect(() => {
    setSplits(getSplits());
  }, []);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    try {
      const base64 = await readFileAsBase64(file);
      closeRoomIfActive();
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

  return (
    <motion.main
      initial={fromPop ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex min-h-dvh flex-col px-6 pb-8 pt-16"
    >
      <div className="flex flex-1 flex-col justify-center">
        <header>
          <p lang="ja" className="text-base text-muted-foreground">割り勘</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">Warikan</h1>
          <p className="mt-3 text-lg text-muted-foreground">Pay your share. Keep your friends.</p>
        </header>

        <div className="mt-10 flex flex-col gap-3">
          <Button className="h-14 gap-3 text-base font-semibold" asChild>
            <Link href="/split/scan">
              <Camera className="h-5 w-5" />
              Scan receipt
            </Link>
          </Button>
          <Button
            variant="outline"
            className="h-14 gap-3 text-base font-semibold"
            onClick={() => uploadInputRef.current?.click()}
          >
            <ImagePlus className="h-5 w-5" />
            Upload photo
          </Button>
          <Button
            variant="ghost"
            className="gap-2 text-sm text-muted-foreground"
            onClick={() => {
              closeRoomIfActive();
              reset();
              setReceiptData(createDemoReceipt());
              router.push("/split/review");
            }}
          >
            <FlaskConical className="h-4 w-4" />
            Try a demo receipt
          </Button>
        </div>
      </div>

      {splits.length > 0 && (
        <section className="mt-12">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-muted-foreground">Recent splits</h2>
            {splits.length > RECENT_COUNT && (
              <Button variant="ghost" className="-mr-3 text-sm text-primary" onClick={() => setHistoryOpen(true)}>
                See all {splits.length}
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {splits.slice(0, RECENT_COUNT).map((split) => (
              <SplitCard key={split.id} split={split} />
            ))}
          </div>
        </section>
      )}

      <Link
        href="/privacy"
        className="mx-auto mt-8 flex h-11 items-center px-3 text-xs text-muted-foreground underline-offset-4 hover:underline"
      >
        Privacy
      </Link>

      {/* Hidden file input for gallery upload */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />

      <HistorySheet
        open={historyOpen}
        onOpenChange={(open) => {
          setHistoryOpen(open);
          if (!open) setSplits(getSplits()); // "Clear all" in the sheet must update this list
        }}
      />
    </motion.main>
  );
}
