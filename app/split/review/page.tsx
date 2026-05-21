"use client";

import { useEffect, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LineItemRow } from "@/components/split/line-item-row";
import { TipSelector } from "@/components/split/tip-selector";
import { SummaryBar } from "@/components/split/summary-bar";
import { ReceiptSkeleton } from "@/components/split/receipt-skeleton";
import { useSplitFlow } from "@/lib/split-flow-context";
import { consumePopFlag } from "@/lib/nav-flag";
import { saveSplit } from "@/lib/splits";
import type { LineItem } from "@/lib/types";

export default function ReviewPage() {
  const router = useRouter();
  const { state, loaded, setReceiptData, updateLineItems, updateRestaurantName, updateTax, updateTip } = useSplitFlow();
  const [fromPop] = useState(() => consumePopFlag());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [itemsRef] = useAutoAnimate<HTMLDivElement>();

  useEffect(() => {
    if (loaded && !state.image && state.lineItems.length === 0) router.replace("/");
  }, [loaded, state.image, state.lineItems.length, router]);

  useEffect(() => {
    if (!state.image || state.lineItems.length > 0) return;
    async function parseReceipt() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/parse-receipt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: state.image, mimeType: state.imageMimeType }),
        });
        if (!res.ok) {
          if (res.status === 504 || res.status === 524) throw new Error("timeout");
          const err = await res.json().catch(() => ({}));
          const code = (err as { error?: string }).error;
          if (code === "timeout") throw new Error("timeout");
          throw new Error("parse_failed");
        }
        const data = await res.json();
        setReceiptData({
          restaurantName: data.restaurantName ?? "",
          lineItems: (data.lineItems ?? []).map(
            (item: { name: string; quantity?: number; price: number }) => ({
              id: crypto.randomUUID(), name: item.name, quantity: item.quantity ?? 1, price: item.price, assignedToIds: [],
            })
          ),
          fees: (data.fees ?? []).map(
            (fee: { name: string; amount: number }) => ({ id: crypto.randomUUID(), name: fee.name, amount: fee.amount })
          ),
          taxAmount: data.taxAmount ?? 0,
          tipAmount: data.tipAmount ?? 0,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        setError(msg === "timeout" ? "timeout" : "parse_failed");
      } finally {
        setLoading(false);
      }
    }
    parseReceipt();
  }, [state.image, state.imageMimeType, state.lineItems.length, setReceiptData, retryKey]);

  function addItem() {
    const newItem: LineItem = { id: crypto.randomUUID(), name: "", quantity: 1, price: 0, assignedToIds: [] };
    updateLineItems([...state.lineItems, newItem]);
  }

  function updateItem(updated: LineItem) {
    updateLineItems(state.lineItems.map((i) => (i.id === updated.id ? updated : i)));
  }

  function removeItem(id: string) {
    updateLineItems(state.lineItems.filter((i) => i.id !== id));
  }

  function handleContinue() {
    if (state.editingSplitId) {
      const totalAmount =
        state.lineItems.reduce((s, i) => s + i.price * i.quantity, 0) +
        state.taxAmount + state.tipAmount +
        state.fees.reduce((s, f) => s + f.amount, 0);
      saveSplit({
        id: state.editingSplitId,
        date: new Date().toISOString(),
        restaurantName: state.restaurantName || undefined,
        lineItems: state.lineItems,
        fees: state.fees,
        taxAmount: state.taxAmount,
        tipAmount: state.tipAmount,
        totalAmount,
        people: state.people,
      });
    }
    router.push("/split/people");
  }

  const subtotal = state.lineItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalFees = state.fees.reduce((s, f) => s + f.amount, 0);

  return (
    <motion.main initial={fromPop ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-dvh flex-col px-6 pb-72">
      <div className="sticky-header -mx-6 px-6 pt-10 pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild aria-label="Go back">
            <Link href={state.editingSplitId ? `/split/${state.editingSplitId}` : "/"}><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-xl font-bold">Review items</h1>
        </div>
      </div>

      {(!loaded || loading) && <ReceiptSkeleton />}

      {error && (
        <div className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-5">
          <p className="text-base font-medium text-destructive">
            {error === "timeout" ? "Receipt parsing timed out." : "We couldn't read this receipt."}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error === "timeout"
              ? "The request took too long. Try again or add items manually."
              : "Try a clearer photo with better lighting, or add items manually below."}
          </p>
          <div className="mt-4 flex gap-3">
            <Button variant="outline" size="sm" onClick={() => { setError(null); setRetryKey((k) => k + 1); }}>
              Try again
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setError(null)}>
              Add items manually
            </Button>
          </div>
        </div>
      )}

      {loaded && !loading && (
        <div className="mt-8 flex flex-col gap-8">
          <section>
            <label className="mb-2 block text-base font-semibold text-muted-foreground">Restaurant</label>
            <Input
              value={state.restaurantName}
              onChange={(e) => updateRestaurantName(e.target.value)}
              placeholder="Restaurant name (optional)"
            />
          </section>

          <section>
            <p className="mb-3 text-base font-semibold text-muted-foreground">Items</p>
            {state.lineItems.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No items yet — tap Add Item to get started.</p>
            )}
            <div ref={itemsRef} className="divide-y divide-border/40">
              {state.lineItems.map((item) => (
                <LineItemRow key={item.id} item={item} onUpdate={updateItem} onRemove={() => removeItem(item.id)} />
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-3 text-muted-foreground" onClick={addItem}>
              <Plus className="mr-1.5 h-4 w-4" />Add Item
            </Button>
          </section>

          {state.fees.length > 0 && (
            <section>
              <p className="mb-3 text-base font-semibold text-muted-foreground">Fees</p>
              <div className="divide-y divide-border/40">
                {state.fees.map((fee) => (
                  <div key={fee.id} className="flex items-center justify-between py-3.5 text-base">
                    <span>{fee.name}</span>
                    <span className="font-mono font-medium tabular-nums">${fee.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-4 flex items-center gap-2">
              <p className="text-base font-semibold text-muted-foreground">Tax & Tip</p>
              {state.image && (state.taxAmount > 0 || state.tipAmount > 0) && (
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">From receipt</span>
              )}
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <label className="mb-2 block text-base text-muted-foreground">Tax</label>
                <div className="relative flex items-center">
                  <span className="pointer-events-none absolute left-3 text-muted-foreground">$</span>
                  <Input type="number" step="0.01" min="0" value={state.taxAmount || ""} placeholder="0.00" className="h-11 pl-6" onChange={(e) => updateTax(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-base text-muted-foreground">Tip</label>
                <TipSelector subtotal={subtotal} tipAmount={state.tipAmount} onTipChange={updateTip} />
                <div className="relative mt-3 flex items-center">
                  <span className="pointer-events-none absolute left-3 text-muted-foreground">$</span>
                  <Input type="number" step="0.01" min="0" value={state.tipAmount || ""} placeholder="Custom amount" className="h-11 pl-6" onChange={(e) => updateTip(Math.max(0, parseFloat(e.target.value) || 0))} />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
          {state.lineItems.length > 0 && <SummaryBar subtotal={subtotal} tax={state.taxAmount} tip={state.tipAmount} fees={totalFees} />}
          <Button className={`${state.lineItems.length > 0 ? "mt-4" : ""} h-14 w-full rounded-2xl text-base font-semibold`} disabled={state.lineItems.length === 0} onClick={handleContinue}>Continue</Button>
        </div>
      </div>
    </motion.main>
  );
}
