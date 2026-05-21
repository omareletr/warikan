"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ChevronDown, Gift, Trash2, Pencil, CreditCard, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSplitFlow } from "@/lib/split-flow-context";
import { consumePopFlag } from "@/lib/nav-flag";
import { getSplitById, deleteSplit } from "@/lib/splits";
import { calculateSplit, formatCurrency, initials } from "@/lib/calculate";
import { AVATAR_COLORS } from "@/components/split/person-avatar";
import type { Split } from "@/lib/types";

export default function SplitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { loadSplit } = useSplitFlow();
  const [fromPop] = useState(() => consumePopFlag());
  const [split, setSplit] = useState<Split | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setSplit(getSplitById(id));
    setLoaded(true);
  }, [id]);

  if (!loaded) return (
    <main className="flex min-h-dvh items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </main>
  );

  if (!split) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="text-xl font-bold">Split not found</p>
        <p className="mt-2 text-base text-muted-foreground">This split may have been deleted.</p>
        <Button className="mt-6" asChild><Link href="/">Go Home</Link></Button>
      </main>
    );
  }

  const totals = calculateSplit(split.people, split.lineItems, split.taxAmount, split.tipAmount, split.fees);
  const date = new Date(split.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  function handleEdit() {
    if (!split) return;
    loadSplit(split);
    router.push("/split/review");
  }

  function handleEditAssignments() {
    if (!split) return;
    loadSplit(split);
    router.push("/split/assign");
  }

  function handlePayments() {
    if (!split) return;
    loadSplit(split);
    router.push("/split/payment");
  }

  function handleDelete() {
    if (!split) return;
    deleteSplit(split.id);
    router.push("/");
  }

  return (
    <>
      <motion.main initial={fromPop ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-dvh flex-col px-6 pb-48">
        <div className="sticky-header -mx-6 px-6 pt-10 pb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild aria-label="Go back">
              <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <h1 className="flex-1 text-xl font-bold">Split details</h1>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete split</DialogTitle>
                  <DialogDescription asChild>
                    <div>
                      <p className="font-medium text-foreground">{split.restaurantName ?? "Split"} · {date} · {formatCurrency(split.totalAmount)}</p>
                      <p className="mt-1">This will be permanently removed and cannot be undone.</p>
                    </div>
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mt-8 text-center">
          {split.restaurantName && <p className="text-xl font-semibold">{split.restaurantName}</p>}
          <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-gradient">{formatCurrency(split.totalAmount)}</p>
          <p className="mt-2 text-base text-muted-foreground">{date} &middot; {split.people.length} people</p>
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
                <motion.div key={pt.person.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-0 transition-all duration-150 active:scale-[0.98]">
                    <button className="flex w-full items-center gap-4 p-5" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : pt.person.id)}>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold ${color.bg} ${color.text}`}>
                        {pt.person.covered ? <Gift className="h-5 w-5" /> : initials(pt.person.name)}
                      </div>
                      <span className="flex-1 text-left text-base font-medium">{pt.person.name}</span>
                      {pt.person.covered ? (
                        <span className="text-sm font-medium text-amber-400">Covered</span>
                      ) : (
                        <span className="font-mono text-lg font-semibold tabular-nums text-primary">{formatCurrency(pt.total)}</span>
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
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.main>

      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <Button variant="outline" className="h-12 flex-1 gap-2 rounded-2xl text-sm font-semibold" onClick={handleEdit}>
                <Pencil className="h-4 w-4" />
                Edit Items
              </Button>
              <Button variant="outline" className="h-12 flex-1 gap-2 rounded-2xl text-sm font-semibold" onClick={handleEditAssignments}>
                <Users className="h-4 w-4" />
                Edit Assignments
              </Button>
            </div>
            <Button className="h-14 w-full gap-2 rounded-2xl text-base font-semibold" onClick={handlePayments}>
              <CreditCard className="h-4 w-4" />
              Payments
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
