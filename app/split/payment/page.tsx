"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Gift, X, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSplitFlow } from "@/lib/split-flow-context";
import { consumePopFlag } from "@/lib/nav-flag";
import { calculateSplit, formatCurrency, initials } from "@/lib/calculate";
import { AVATAR_COLORS } from "@/components/split/person-avatar";
import { saveSplit } from "@/lib/splits";
import {
  PAYMENT_APPS,
  getPaymentApp,
  getPaymentPreference,
  savePaymentPreference,
  encodePayData,
} from "@/lib/payment-apps";
import type { PaymentAppId } from "@/lib/payment-apps";
import { ShareSheet } from "@/components/split/share-sheet";
import type { Split } from "@/lib/types";

export default function PaymentPage() {
  const router = useRouter();
  const { state, loaded, reset } = useSplitFlow();
  const [fromPop] = useState(() => consumePopFlag());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<PaymentAppId>("venmo");
  const [handles, setHandles] = useState<Partial<Record<PaymentAppId, string>>>({});
  const [showQR, setShowQR] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [venmoFailed, setVenmoFailed] = useState(false);

  useEffect(() => {
    const pref = getPaymentPreference();
    if (pref) {
      setSelectedAppId(pref.appId);
      setHandles(pref.handles);
    }
  }, []);

  useEffect(() => {
    if (loaded && state.lineItems.length === 0) router.replace("/");
  }, [loaded, state.lineItems.length, router]);

  const totals = loaded
    ? calculateSplit(state.people, state.lineItems, state.taxAmount, state.tipAmount, state.fees)
    : [];

  const currentApp = getPaymentApp(selectedAppId);
  const handle = handles[selectedAppId] ?? "";

  function handleAppSelect(appId: PaymentAppId) {
    setSelectedAppId(appId);
    setVenmoFailed(false);
  }

  function handleHandleChange(value: string) {
    // Strip any leading prefix characters the user may type
    const stripped = value.replace(/^[@$]+/, "");
    setHandles((prev) => ({ ...prev, [selectedAppId]: stripped }));
    savePaymentPreference(selectedAppId, stripped);
  }

  async function copyAmount(personId: string, amount: number) {
    try {
      await navigator.clipboard.writeText(amount.toFixed(2));
      setCopiedId(personId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  function openPayApp(amount: number) {
    const note = state.restaurantName ? `${state.restaurantName} split` : "Warikan split";
    const url = currentApp.buildPayLink(handle, amount, note);
    if (selectedAppId === "venmo") {
      // Custom URL scheme — detect open failure
      setVenmoFailed(false);
      window.location.href = url;
      setTimeout(() => {
        if (!document.hidden) setVenmoFailed(true);
      }, 1500);
    } else {
      // HTTPS link — always works (web fallback if app not installed)
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  function getShareUrl(): string {
    const encoded = encodePayData(
      handle ? selectedAppId : null,
      handle || null,
      totals.map((pt) => ({ name: pt.person.name, amount: pt.total })),
      state.restaurantName || undefined
    );
    return `${window.location.origin}/pay#${encoded}`;
  }

  function qrFooter(): string {
    const prefix = currentApp.handlePrefix;
    return `Pay via ${currentApp.name} ${prefix}${handle}`;
  }

  async function handleDone() {
    setSaving(true);
    setSaveError(null);
    const split: Split = {
      id: state.editingSplitId ?? crypto.randomUUID(),
      date: new Date().toISOString(),
      restaurantName: state.restaurantName || undefined,
      lineItems: state.lineItems,
      fees: state.fees,
      taxAmount: state.taxAmount,
      tipAmount: state.tipAmount,
      totalAmount:
        state.lineItems.reduce((s, i) => s + i.price * i.quantity, 0) +
        state.taxAmount +
        state.tipAmount +
        state.fees.reduce((s, f) => s + f.amount, 0),
      people: state.people,
    };
    try {
      saveSplit(split);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ["#10B981", "#34D399", "#ffffff", "#6EE7B7"],
      });
      reset();
      router.push("/");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Could not save split.");
      setSaving(false);
    }
  }

  return (
    <>
      <motion.main
        initial={fromPop ? false : { opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex min-h-dvh flex-col px-6 pb-40"
      >
        <div className="sticky-header -mx-6 px-6 pt-10 pb-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild aria-label="Go back">
              <Link href={state.editingSplitId ? `/split/${state.editingSplitId}` : "/split/summary"}>
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="flex-1 text-xl font-bold">Payment</h1>
            {handle && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Show QR code"
                onClick={() => setShowQR(true)}
              >
                <QrCode className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Payment app selector */}
        <div className="mt-6">
          <label className="mb-2 block text-base text-muted-foreground">Payment app</label>
          <div className="flex gap-2">
            {PAYMENT_APPS.map((app) => (
              <button
                key={app.id}
                onClick={() => handleAppSelect(app.id)}
                className={`flex-1 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  selectedAppId === app.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/50 bg-card text-muted-foreground"
                }`}
              >
                {app.name}
              </button>
            ))}
          </div>
        </div>

        {/* Handle input */}
        <div className="mt-4">
          <label className="mb-2 block text-base text-muted-foreground">
            {currentApp.name} username
          </label>
          <div className="relative flex items-center">
            {currentApp.handlePrefix && (
              <span className="pointer-events-none absolute left-3 text-muted-foreground">
                {currentApp.handlePrefix}
              </span>
            )}
            <Input
              value={handle}
              onChange={(e) => handleHandleChange(e.target.value)}
              placeholder={currentApp.handlePlaceholder}
              className={currentApp.handlePrefix ? "pl-7" : ""}
              autoCapitalize="none"
            />
          </div>
        </div>

        {/* Person cards */}
        <div className="mt-8 flex flex-col gap-4">
          {totals.map((pt, i) => (
            <motion.div
              key={pt.person.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`p-5 ${pt.person.covered ? "opacity-50" : ""}`}>
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full text-base font-semibold ${
                      pt.person.covered
                        ? "bg-amber-500/15 text-amber-400"
                        : `${AVATAR_COLORS[i % AVATAR_COLORS.length].bg} ${AVATAR_COLORS[i % AVATAR_COLORS.length].text}`
                    }`}
                  >
                    {pt.person.covered ? <Gift className="h-5 w-5" /> : initials(pt.person.name)}
                  </div>
                  <div className="flex-1">
                    <p className="truncate text-base font-medium">{pt.person.name}</p>
                    {pt.person.covered ? (
                      <p className="text-base text-amber-400">Covered by group</p>
                    ) : (
                      <p className="font-mono text-2xl font-semibold tabular-nums text-primary">
                        {formatCurrency(pt.total)}
                      </p>
                    )}
                  </div>
                </div>
                {!pt.person.covered && (
                  <div className="mt-4 flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => copyAmount(pt.person.id, pt.total)}
                    >
                      {copiedId === pt.person.id ? (
                        <>
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 20 }}
                          >
                            <Check className="h-3.5 w-3.5 text-primary" />
                          </motion.span>
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Copy
                        </>
                      )}
                    </Button>
                    {handle && (
                      <Button
                        size="sm"
                        className="flex-1 gap-1.5"
                        onClick={() => openPayApp(pt.total)}
                      >
                        {currentApp.name} {formatCurrency(pt.total)}
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>
          ))}
        </div>

        {venmoFailed && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Venmo not found — make sure the app is installed.
          </p>
        )}
      </motion.main>

      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
          {saveError && (
            <p className="mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {saveError}
            </p>
          )}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="h-14 flex-1 gap-2 rounded-2xl text-base font-semibold"
              onClick={() => setShowShareSheet(true)}
            >
              Share
            </Button>
            <Button
              className="h-14 flex-1 rounded-2xl text-base font-semibold"
              disabled={!loaded || saving}
              onClick={handleDone}
            >
              {!loaded ? "Loading..." : saving ? "Saving..." : "All Done"}
            </Button>
          </div>
        </div>
      </div>

      <ShareSheet
        open={showShareSheet}
        onClose={() => setShowShareSheet(false)}
        url={loaded ? getShareUrl() : ""}
        title={state.restaurantName ? `${state.restaurantName} split` : "Warikan split"}
        onShowQR={handle ? () => setShowQR(true) : undefined}
      />

      {showQR && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md px-4"
          onClick={() => setShowQR(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            role="dialog"
            aria-labelledby="qr-title"
            className="relative w-full max-w-sm rounded-3xl border border-border/30 bg-card p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 text-muted-foreground"
              aria-label="Close"
              onClick={() => setShowQR(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <p id="qr-title" className="mb-1 text-xl font-bold">Scan to pay</p>
            <p className="mb-7 text-sm text-muted-foreground">
              Everyone scans this, picks their name, and pays via {currentApp.name}.
            </p>
            <div className="flex justify-center">
              <div className="rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.5)] ring-2 ring-primary/30">
                <div className="rounded-2xl bg-white p-5">
                  <QRCodeSVG value={getShareUrl()} size={220} />
                </div>
              </div>
            </div>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {qrFooter()}
            </p>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
