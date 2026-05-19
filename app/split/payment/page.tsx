"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Check, Copy, X, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSplitFlow } from "@/lib/split-flow-context";
import { calculateSplit, formatCurrency, initials } from "@/lib/calculate";
import { saveSplit } from "@/lib/splits";
import { getVenmoUsername, saveVenmoUsername, buildVenmoDeepLink, encodePayData } from "@/lib/venmo";
import type { Split } from "@/lib/types";

export default function PaymentPage() {
  const router = useRouter();
  const { state, reset } = useSplitFlow();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [venmoUsername, setVenmoUsername] = useState("");
  const [showQR, setShowQR] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVenmoUsername(getVenmoUsername());
  }, []);

  const totals = calculateSplit(state.people, state.lineItems, state.taxAmount, state.tipAmount, state.fees);

  function handleVenmoChange(value: string) {
    setVenmoUsername(value);
    saveVenmoUsername(value);
  }

  async function copyAmount(personId: string, amount: number) {
    await navigator.clipboard.writeText(amount.toFixed(2));
    setCopiedId(personId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function openVenmo(amount: number) {
    const note = state.restaurantName ? `${state.restaurantName} split` : "Warikan split";
    const url = buildVenmoDeepLink(venmoUsername, amount, note);
    window.location.href = url;
  }

  function getQRUrl(): string {
    const encoded = encodePayData(
      venmoUsername,
      totals.map((pt) => ({ name: pt.person.name, amount: pt.total })),
      state.restaurantName || undefined
    );
    return `${window.location.origin}/pay#${encoded}`;
  }

  async function handleDone() {
    setSaving(true);
    const split: Split = {
      id: state.editingSplitId ?? crypto.randomUUID(),
      date: new Date().toISOString(),
      restaurantName: state.restaurantName || undefined,
      lineItems: state.lineItems,
      fees: state.fees,
      taxAmount: state.taxAmount,
      tipAmount: state.tipAmount,
      totalAmount: state.lineItems.reduce((s, i) => s + i.price * i.quantity, 0) + state.taxAmount + state.tipAmount + state.fees.reduce((s, f) => s + f.amount, 0),
      people: state.people,
    };
    saveSplit(split);
    reset();
    router.push("/");
  }

  return (
    <>
      <motion.main initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex min-h-dvh flex-col px-6 pb-40 pt-14">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={state.editingSplitId ? `/split/${state.editingSplitId}` : "/split/summary"}><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-xl font-bold">Payment</h1>
        </div>
        <p className="mt-2 text-base text-muted-foreground">Copy amounts or pay directly with Venmo.</p>

        <div className="mt-6">
          <label className="mb-2 block text-base text-muted-foreground">Venmo username</label>
          <Input
            value={venmoUsername}
            onChange={(e) => handleVenmoChange(e.target.value)}
            placeholder="@yourvenmo"
          />
        </div>

        <div className="mt-8 flex flex-col gap-4">
          {totals.map((pt, i) => (
            <motion.div key={pt.person.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">{initials(pt.person.name)}</div>
                  <div className="flex-1">
                    <p className="text-base font-medium">{pt.person.name}</p>
                    <p className="text-2xl font-semibold tabular-nums text-primary">{formatCurrency(pt.total)}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-3">
                  <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => copyAmount(pt.person.id, pt.total)}>
                    {copiedId === pt.person.id ? (
                      <><Check className="h-3.5 w-3.5 text-primary" />Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" />Copy</>
                    )}
                  </Button>
                  {venmoUsername && (
                    <Button size="sm" className="flex-1 gap-1.5" onClick={() => openVenmo(pt.total)}>
                      Venmo {formatCurrency(pt.total)}
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.main>

      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
          <div className="flex gap-3">
            {venmoUsername && (
              <Button variant="outline" className="h-14 flex-1 gap-2 rounded-2xl text-base font-semibold" onClick={() => setShowQR(true)}>
                <QrCode className="h-5 w-5" />
                Share QR
              </Button>
            )}
            <Button className="h-14 flex-1 rounded-2xl text-base font-semibold" disabled={saving} onClick={handleDone}>{saving ? "Saving..." : "All Done"}</Button>
          </div>
        </div>
      </div>

      {showQR && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm px-6"
        >
          <Button variant="ghost" size="icon" className="absolute right-4 top-4" onClick={() => setShowQR(false)}>
            <X className="h-6 w-6" />
          </Button>
          <p className="mb-2 text-xl font-bold">Scan to Pay</p>
          <p className="mb-8 text-base text-muted-foreground">Everyone scans this code, picks their name, and pays on Venmo.</p>
          <div className="rounded-3xl bg-white p-6">
            <QRCodeSVG value={getQRUrl()} size={240} />
          </div>
          <p className="mt-6 text-sm text-muted-foreground">Paying @{venmoUsername}</p>
        </motion.div>
      )}
    </>
  );
}
