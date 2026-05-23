"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Camera, ImagePlus, FlaskConical, History } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { HeroConceptA } from "@/components/split/hero-concept-a";
import { HistorySheet } from "@/components/split/history-sheet";
import { UserMenu } from "@/components/auth/user-menu";
import { useSplitFlow } from "@/lib/split-flow-context";
import { consumePopFlag } from "@/lib/nav-flag";
import { closeRoomIfActive } from "@/lib/room-client";
import { getSplits } from "@/lib/splits";
import { subscribeToSplits } from "@/lib/firestore-splits";
import { useAuth } from "@/lib/auth-context";

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
  const { user } = useAuth();
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [fromPop] = useState(() => consumePopFlag());
  const [heroReady, setHeroReady] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [splitCount, setSplitCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setSplitCount(getSplits().length);
      return () => {};
    }
    return subscribeToSplits(user.uid, (splits) => setSplitCount(splits.length));
  }, [user]);

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
    <motion.main
      initial={fromPop ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      className="flex min-h-dvh flex-col px-6 pb-10"
    >
      {/* Top bar */}
      <div className="sticky-header -mx-6 px-6 pt-10 pb-3">
        <div className="flex items-center justify-between">
          <UserMenu />
          <div className="flex items-center">
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
      </div>

      {/* Center content */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative flex flex-col items-center">
          <HeroConceptA onReady={() => setHeroReady(true)} />

          {/* Action buttons — fade in when hero animation completes */}
          <motion.div
            className="mt-6 flex w-full max-w-[220px] flex-col gap-3"
            animate={{ opacity: heroReady ? 1 : 0, y: heroReady ? 0 : 10 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            {actionButtons}
          </motion.div>
        </div>
      </div>

      {/* Demo link */}
      <motion.div
        className="flex justify-center"
        animate={{ opacity: heroReady ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <Button
          variant="ghost"
          className="h-10 gap-2 text-sm text-muted-foreground"
          onClick={() => {
            closeRoomIfActive();
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
