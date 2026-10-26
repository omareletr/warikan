"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MyDishRow } from "@/components/split/my-dish-row";
import { useSplitFlow } from "@/lib/split-flow-context";
import { consumePopFlag } from "@/lib/nav-flag";
import { usePageEnter, staggerDelay } from "@/lib/motion";
import { calculateMyShare, formatCurrency } from "@/lib/calculate";
import type { MyPick } from "@/lib/types";

export default function MyDishesPage() {
  const router = useRouter();
  const { state, loaded, setMyPicks } = useSplitFlow();
  const [fromPop] = useState(() => consumePopFlag());
  const pageEnter = usePageEnter(fromPop);

  useEffect(() => {
    if (loaded && state.lineItems.length === 0) router.replace("/");
  }, [loaded, state.lineItems.length, router]);

  const share = calculateMyShare(state.lineItems, state.myPicks, state.taxAmount, state.tipAmount, state.fees);
  const hasPicks = share.items.length > 0;

  function updatePick(itemId: string, pick: MyPick | null) {
    const next = { ...state.myPicks };
    if (pick) next[itemId] = pick;
    else delete next[itemId];
    setMyPicks(next);
  }

  return (
    <motion.main {...pageEnter} className="flex min-h-dvh flex-col px-6 pb-40">
      <div className="sticky-header -mx-6 px-6 pt-10 pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Go back"><Link href="/split/review"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-xl font-bold">What did you have?</h1>
        </div>
      </div>

      <p className="mt-4 text-base text-muted-foreground">Tap your dishes. If you shared one, tap Shared to set how many people split it.</p>

      <div className="mt-6 flex flex-col gap-1">
        {state.lineItems.map((item, i) => (
          <motion.div key={item.id} initial={fromPop ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: staggerDelay(i) }}>
            <MyDishRow item={item} pick={state.myPicks[item.id]} onChange={(pick) => updatePick(item.id, pick)} />
          </motion.div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-base text-muted-foreground">You owe</span>
            <span className="font-mono text-2xl font-bold tabular-nums text-primary">{formatCurrency(share.total)}</span>
          </div>
          <Button className="h-14 w-full rounded-2xl text-base font-semibold" disabled={!loaded || !hasPicks} onClick={() => router.push("/split/mine/total")}>
            See breakdown
          </Button>
        </div>
      </div>
    </motion.main>
  );
}
