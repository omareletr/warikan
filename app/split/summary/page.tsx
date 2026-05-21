"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Copy, Check, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useSplitFlow } from "@/lib/split-flow-context";
import { calculateSplit, formatCurrency, initials } from "@/lib/calculate";
import { AnimatedTotal } from "@/components/split/animated-total";
import { AVATAR_COLORS } from "@/components/split/person-avatar";

export default function SummaryPage() {
  const router = useRouter();
  const { state, loaded } = useSplitFlow();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (loaded && state.lineItems.length === 0) router.replace("/");
  }, [loaded, state.lineItems.length, router]);

  const totals = loaded ? calculateSplit(state.people, state.lineItems, state.taxAmount, state.tipAmount, state.fees) : [];
  const grandTotal = state.lineItems.reduce((s, i) => s + i.price * i.quantity, 0) + state.taxAmount + state.tipAmount + state.fees.reduce((s, f) => s + f.amount, 0);

  return (
    <main className="flex min-h-dvh flex-col px-6 pb-40">
      <div className="sticky-header -mx-6 px-6 pt-10 pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Go back"><Link href="/split/assign"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="text-xl font-bold">Summary</h1>
        </div>
      </div>

      <div className="mt-8 text-center">
        {state.restaurantName && <p className="line-clamp-1 text-xl font-semibold">{state.restaurantName}</p>}
        <AnimatedTotal amount={grandTotal} />
        <p className="mt-1 text-xs text-muted-foreground/60">incl. tax & tip</p>
        <p className="mt-2 text-base text-muted-foreground">Split between {state.people.length} people</p>
      </div>

      <div className="mt-10">
        <p className="mb-4 text-base font-semibold text-muted-foreground">Each person owes</p>
        <div className="flex flex-col gap-3">
          {totals.map((pt, i) => {
            const expanded = expandedId === pt.person.id;
            const color = pt.person.covered
              ? { bg: "bg-amber-500/15", text: "text-amber-400" }
              : AVATAR_COLORS[i % AVATAR_COLORS.length];
            return (
              <div key={pt.person.id}>
                <Card className="p-0 transition-all duration-150 active:scale-[0.98]">
                  <button className="flex w-full items-center gap-4 p-5" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : pt.person.id)}>
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full text-base font-semibold ${color.bg} ${color.text}`}>
                      {pt.person.covered ? <Gift className="h-5 w-5" /> : initials(pt.person.name)}
                    </div>
                    <span className="flex-1 truncate text-left text-base font-medium">{pt.person.name}</span>
                    {pt.person.covered ? (
                      <span className="text-sm font-medium text-amber-400">Covered</span>
                    ) : pt.total > 0 ? (
                      <span className="font-mono text-lg font-semibold tabular-nums text-primary">{formatCurrency(pt.total)}</span>
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">Not splitting</span>
                    )}
                    <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.22, ease: "easeInOut" }}>
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div key="content" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: "easeInOut" }} className="overflow-hidden">
                      <div className="border-t border-border/50 px-5 pb-5 pt-4">
                      {pt.items.map((item, j) => (
                        <div key={j} className="flex justify-between py-2 text-base text-muted-foreground">
                          <span>{item.quantity > 1 && <span className="mr-1">{item.quantity}×</span>}{item.name}{item.splitCount > 1 && <span className="ml-1 text-sm text-muted-foreground/60">split {item.splitCount} ways</span>}</span>
                          <span className="font-mono tabular-nums">{formatCurrency(item.price)}</span>
                        </div>
                      ))}
                      <Separator className="my-3" />
                      <div className="flex justify-between py-2 text-base text-muted-foreground"><span>Tax</span><span className="font-mono tabular-nums">{formatCurrency(pt.taxShare)}</span></div>
                      <div className="flex justify-between py-2 text-base text-muted-foreground"><span>Tip</span><span className="font-mono tabular-nums">{formatCurrency(pt.tipShare)}</span></div>
                      {pt.feesShare > 0 && <div className="flex justify-between py-2 text-base text-muted-foreground"><span>Fees</span><span className="font-mono tabular-nums">{formatCurrency(pt.feesShare)}</span></div>}
                      {pt.coveredExtra > 0 && (
                        <div className="flex justify-between py-2 text-base text-amber-400">
                          <span className="flex items-center gap-1.5"><Gift className="h-3.5 w-3.5" />Covering {totals.filter((t) => t.person.covered).map((t) => t.person.name).join(", ")}&apos;s share</span>
                          <span className="font-mono tabular-nums">{formatCurrency(pt.coveredExtra)}</span>
                        </div>
                      )}
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
          <div className="flex gap-3">
            <Button variant="outline" className="h-14 flex-1 gap-2 rounded-2xl text-sm font-semibold" onClick={async () => {
              const text = totals.map((pt) => `${pt.person.name}: ${formatCurrency(pt.total)}`).join("\n");
              try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                // clipboard unavailable — silently ignore, no false feedback
              }
            }}>
              {copied ? <><motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 20 }}><Check className="h-4 w-4 text-primary" /></motion.span>Copied</> : <><Copy className="h-4 w-4" />Copy All</>}
            </Button>
            <Button className="h-14 flex-1 rounded-2xl text-base font-semibold" onClick={() => router.push("/split/payment")}>Payment</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
