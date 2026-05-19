"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, Trash2, Pencil, CreditCard } from "lucide-react";
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
import { getSplitById, deleteSplit } from "@/lib/splits";
import { calculateSplit, formatCurrency, initials } from "@/lib/calculate";
import type { Split } from "@/lib/types";

export default function SplitDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { loadSplit } = useSplitFlow();
  const [split, setSplit] = useState<Split | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setSplit(getSplitById(params.id));
    setLoaded(true);
  }, [params.id]);

  if (!loaded) return null;

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
      <motion.main initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-dvh flex-col px-6 pb-40 pt-14">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="flex-1 text-xl font-bold">Split Details</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Split</DialogTitle>
                <DialogDescription>This will permanently remove this split. This action cannot be undone.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="destructive" onClick={handleDelete}>Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-8 text-center">
          {split.restaurantName && <p className="text-xl font-semibold">{split.restaurantName}</p>}
          <p className="mt-2 text-4xl font-bold tabular-nums text-gradient">{formatCurrency(split.totalAmount)}</p>
          <p className="mt-2 text-base text-muted-foreground">{date} &middot; {split.people.length} people</p>
        </div>

        <div className="mt-10">
          <p className="mb-4 text-base font-semibold text-muted-foreground">Each Person Owes</p>
          <div className="flex flex-col gap-3">
            {totals.map((pt, i) => {
              const expanded = expandedId === pt.person.id;
              return (
                <motion.div key={pt.person.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="overflow-hidden p-0">
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
      </motion.main>

      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
          <div className="flex gap-3">
            <Button variant="outline" className="h-14 flex-1 gap-2 rounded-2xl text-base font-semibold" onClick={handleEdit}>
              <Pencil className="h-4 w-4" />
              Edit Split
            </Button>
            <Button className="h-14 flex-1 gap-2 rounded-2xl text-base font-semibold" onClick={handlePayments}>
              <CreditCard className="h-4 w-4" />
              Payments
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
