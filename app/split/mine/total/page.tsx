"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AnimatedTotal } from "@/components/split/animated-total";
import { useSplitFlow } from "@/lib/split-flow-context";
import { consumePopFlag } from "@/lib/nav-flag";
import { popIn, usePageEnter } from "@/lib/motion";
import { calculateMyShare, formatCurrency } from "@/lib/calculate";

export default function MyTotalPage() {
  const router = useRouter();
  const { state, loaded, reset } = useSplitFlow();
  const [fromPop] = useState(() => consumePopFlag());
  const pageEnter = usePageEnter(fromPop);
  const [copied, setCopied] = useState(false);

  const share = calculateMyShare(state.lineItems, state.myPicks, state.taxAmount, state.tipAmount, state.fees);

  useEffect(() => {
    if (loaded && share.items.length === 0) router.replace(state.lineItems.length > 0 ? "/split/mine" : "/");
  }, [loaded, share.items.length, state.lineItems.length, router]);

  async function copyAmount() {
    try {
      await navigator.clipboard.writeText(share.total.toFixed(2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently ignore, no false feedback
    }
  }

  const rows = [
    { label: "Tax", amount: share.taxShare },
    { label: "Tip", amount: share.tipShare },
    ...(share.feesShare > 0 ? [{ label: "Fees", amount: share.feesShare }] : []),
  ];

  return (
    <motion.main {...pageEnter} className="flex min-h-dvh flex-col px-6 pb-40">
      <div className="sticky-header -mx-6 px-6 pt-10 pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Go back"><Link href="/split/mine"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-xl font-bold">Your share</h1>
        </div>
      </div>

      <div className="mt-8 text-center">
        {state.restaurantName && <p className="line-clamp-1 text-xl font-semibold">{state.restaurantName}</p>}
        <AnimatedTotal amount={share.total} />
        <p className="mt-1 text-xs text-muted-foreground">incl. tax & tip</p>
        <p className="mt-2 text-base text-muted-foreground">{Math.round(share.ratio * 100)}% of the bill</p>
      </div>

      <Card className="mt-10 p-5">
        {share.items.map((item, i) => (
          <div key={i} className="flex justify-between gap-3 py-2 text-base">
            <span>
              {item.quantity > 1 && <span className="mr-1 text-muted-foreground">{item.quantity}×</span>}
              {item.name}
              {item.splitCount > 1 && <span className="ml-1 text-sm text-muted-foreground">split {item.splitCount} ways</span>}
            </span>
            <span className="font-mono tabular-nums">{formatCurrency(item.price)}</span>
          </div>
        ))}
        <Separator className="my-3" />
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between py-2 text-base text-muted-foreground">
            <span>{row.label}</span>
            <span className="font-mono tabular-nums">{formatCurrency(row.amount)}</span>
          </div>
        ))}
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
          <div className="flex gap-3">
            <Button variant="outline" className="h-14 flex-1 gap-2 rounded-2xl text-sm font-semibold" onClick={copyAmount}>
              {copied ? <><motion.span {...popIn}><Check className="h-4 w-4 text-primary" /></motion.span>Copied</> : <><Copy className="h-4 w-4" />Copy {formatCurrency(share.total)}</>}
            </Button>
            <Button className="h-14 flex-1 rounded-2xl text-base font-semibold" onClick={() => { reset(); router.push("/"); }}>Done</Button>
          </div>
        </div>
      </div>
    </motion.main>
  );
}
