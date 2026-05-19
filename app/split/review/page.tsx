"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { LineItemRow } from "@/components/split/line-item-row";
import { TipSelector } from "@/components/split/tip-selector";
import { SummaryBar } from "@/components/split/summary-bar";
import { useSplitFlow } from "@/lib/split-flow-context";
import type { LineItem } from "@/lib/types";

export default function ReviewPage() {
  const router = useRouter();
  const { state, setReceiptData, updateLineItems, updateRestaurantName, updateTax, updateTip } = useSplitFlow();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        if (!res.ok) throw new Error("Failed to parse receipt");
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
      } catch {
        setError("Couldn't parse the receipt. You can add items manually.");
      } finally {
        setLoading(false);
      }
    }
    parseReceipt();
  }, [state.image, state.imageMimeType, state.lineItems.length, setReceiptData]);

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

  const subtotal = state.lineItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalFees = state.fees.reduce((s, f) => s + f.amount, 0);

  return (
    <motion.main initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-dvh flex-col px-6 pb-72 pt-14">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={state.editingSplitId ? `/split/${state.editingSplitId}` : "/split/scan"}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-xl font-bold">Review Items</h1>
      </div>

      {loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-base text-muted-foreground">Parsing your receipt...</p>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-base text-destructive">{error}</p>
      )}

      {!loading && (
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
            <div className="divide-y divide-border/40">
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
                    <span className="font-medium tabular-nums">${fee.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <p className="mb-4 text-base font-semibold text-muted-foreground">Tax & Tip</p>
            <div className="flex flex-col gap-5">
              <div>
                <label className="mb-2 block text-base text-muted-foreground">Tax</label>
                <Input type="number" step="0.01" min="0" value={state.taxAmount || ""} placeholder="0.00" onChange={(e) => updateTax(parseFloat(e.target.value) || 0)} />
              </div>
              <div>
                <label className="mb-2 block text-base text-muted-foreground">Tip</label>
                <TipSelector subtotal={subtotal} tipAmount={state.tipAmount} onTipChange={updateTip} />
                <Input type="number" step="0.01" min="0" value={state.tipAmount || ""} placeholder="0.00" className="mt-3" onChange={(e) => updateTip(parseFloat(e.target.value) || 0)} />
              </div>
            </div>
          </section>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-border/50 bg-background/80 backdrop-blur-lg p-5">
        <SummaryBar subtotal={subtotal} tax={state.taxAmount} tip={state.tipAmount} fees={totalFees} />
        <Button className="mt-4 h-14 w-full rounded-2xl text-base font-semibold" disabled={state.lineItems.length === 0} onClick={() => router.push("/split/people")}>Continue</Button>
      </div>
    </motion.main>
  );
}
