"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSplitFlow } from "@/lib/split-flow-context";
import { calculateSplit, formatCurrency, initials } from "@/lib/calculate";

export default function SummaryPage() {
  const router = useRouter();
  const { state } = useSplitFlow();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totals = calculateSplit(state.people, state.lineItems, state.taxAmount, state.tipAmount, state.fees);
  const grandTotal = state.lineItems.reduce((s, i) => s + i.price * i.quantity, 0) + state.taxAmount + state.tipAmount + state.fees.reduce((s, f) => s + f.amount, 0);

  return (
    <motion.main initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-dvh flex-col px-6 pb-32 pt-14">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link href="/split/assign"><ArrowLeft className="h-5 w-5" /></Link></Button>
        <h1 className="text-xl font-bold">Summary</h1>
      </div>

      <div className="mt-8 text-center">
        {state.restaurantName && <p className="text-xl font-semibold">{state.restaurantName}</p>}
        <p className="mt-2 text-4xl font-bold tabular-nums text-gradient">{formatCurrency(grandTotal)}</p>
        <p className="mt-2 text-base text-muted-foreground">Split between {state.people.length} people</p>
      </div>

      <div className="mt-10">
        <p className="mb-4 text-base font-semibold text-muted-foreground">Each Person Owes</p>
        <div className="flex flex-col gap-3">
          {totals.map((pt, i) => {
            const expanded = expandedId === pt.person.id;
            return (
              <motion.div key={pt.person.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-0 overflow-hidden">
                  <button className="flex w-full items-center gap-4 p-5" onClick={() => setExpandedId(expanded ? null : pt.person.id)}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">{initials(pt.person.name)}</div>
                    <span className="flex-1 text-left text-base font-medium">{pt.person.name}</span>
                    <span className="text-lg font-semibold tabular-nums text-primary">{formatCurrency(pt.total)}</span>
                    {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  {expanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-t border-border/50 px-5 pb-5 pt-4">
                      {pt.items.map((item, j) => (
                        <div key={j} className="flex justify-between py-2 text-base text-muted-foreground">
                          <span>{item.quantity > 1 && <span className="mr-1">{item.quantity}×</span>}{item.name}{item.splitCount > 1 && <span className="ml-1 text-sm">(÷{item.splitCount})</span>}</span>
                          <span className="tabular-nums">{formatCurrency(item.price)}</span>
                        </div>
                      ))}
                      <Separator className="my-3" />
                      <div className="flex justify-between py-2 text-base text-muted-foreground"><span>Tax</span><span className="tabular-nums">{formatCurrency(pt.taxShare)}</span></div>
                      <div className="flex justify-between py-2 text-base text-muted-foreground"><span>Tip</span><span className="tabular-nums">{formatCurrency(pt.tipShare)}</span></div>
                      {pt.feesShare > 0 && <div className="flex justify-between py-2 text-base text-muted-foreground"><span>Fees</span><span className="tabular-nums">{formatCurrency(pt.feesShare)}</span></div>}
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/80 backdrop-blur-lg p-5">
        <Button className="h-14 w-full rounded-2xl text-base font-semibold" onClick={() => router.push("/split/payment")}>Done</Button>
      </div>
    </motion.main>
  );
}
