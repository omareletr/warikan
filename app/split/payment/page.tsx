"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
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

/* ── Payment app logo SVGs ────────────────────────────────────────────────── */

function VenmoLogo({ className }: { className?: string }) {
  // Venmo "V" icon mark — bold italic chevron, viewBox tightly cropped to path bounds
  return (
    <svg role="img" viewBox="6.6 0 12.94 15.38" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M18.84 2c.48.8.7 1.62.7 2.68 0 3.33-2.84 7.66-5.15 10.7h-5.3L6.6 2.6l4.67-.45 1.27 10.15c1.18-1.98 2.65-5.1 2.65-7.22 0-1.16-.2-1.96-.5-2.6z" fill="currentColor" />
    </svg>
  );
}

function CashAppLogo({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M23.59 3.475a5.1 5.1 0 00-3.05-3.05c-1.31-.42-2.5-.42-4.92-.42H8.36c-2.4 0-3.61 0-4.9.4a5.1 5.1 0 00-3.05 3.06C0 4.765 0 5.965 0 8.365v7.27c0 2.41 0 3.6.4 4.9a5.1 5.1 0 003.05 3.05c1.3.41 2.5.41 4.9.41h7.28c2.41 0 3.61 0 4.9-.4a5.1 5.1 0 003.06-3.06c.41-1.3.41-2.5.41-4.9v-7.25c0-2.41 0-3.61-.41-4.91zm-6.17 4.63l-.93.93a.5.5 0 01-.67.01 5 5 0 00-3.22-1.18c-.97 0-1.94.32-1.94 1.21 0 .9 1.04 1.2 2.24 1.65 2.1.7 3.84 1.58 3.84 3.64 0 2.24-1.74 3.78-4.58 3.95l-.26 1.2a.49.49 0 01-.48.39H9.63l-.09-.01a.5.5 0 01-.38-.59l.28-1.27a6.54 6.54 0 01-2.88-1.57v-.01a.48.48 0 010-.68l1-.97a.49.49 0 01.67 0c.91.86 2.13 1.34 3.39 1.32 1.3 0 2.17-.55 2.17-1.42 0-.87-.88-1.1-2.54-1.72-1.76-.63-3.43-1.52-3.43-3.6 0-2.42 2.01-3.6 4.39-3.71l.25-1.23a.48.48 0 01.48-.38h1.78l.1.01c.26.06.43.31.37.57l-.27 1.37c.9.3 1.75.77 2.48 1.39l.02.02c.19.2.19.5 0 .68z" fill="currentColor" />
    </svg>
  );
}

function PayPalLogo({ className }: { className?: string }) {
  return (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M15.607 4.653H8.941L6.645 19.251H1.82L4.862 0h7.995c3.754 0 6.375 2.294 6.473 5.513-.648-.478-2.105-.86-3.722-.86m6.57 5.546c0 3.41-3.01 6.853-6.958 6.853h-2.493L11.595 24H6.74l1.845-11.538h3.592c4.208 0 7.346-3.634 7.153-6.949a5.24 5.24 0 0 1 2.848 4.686M9.653 5.546h6.408c.907 0 1.942.222 2.363.541-.195 2.741-2.655 5.483-6.441 5.483H8.714Z" fill="currentColor" />
    </svg>
  );
}

const APP_LOGOS: Record<PaymentAppId, (props: { className?: string }) => React.JSX.Element> = {
  venmo: VenmoLogo,
  cashapp: CashAppLogo,
  paypal: PayPalLogo,
};

/* ── Payment app selector with sliding pill ──────────────────────────────── */

function PaymentAppSelector({
  selected,
  onSelect,
}: {
  selected: PaymentAppId;
  onSelect: (id: PaymentAppId) => void;
}) {
  return (
    <LayoutGroup>
      <div className="flex gap-2">
        {PAYMENT_APPS.map((app) => {
          const Logo = APP_LOGOS[app.id];
          const active = selected === app.id;
          return (
            <button
              key={app.id}
              onClick={() => onSelect(app.id)}
              className="relative flex flex-1 flex-col items-center gap-1.5 rounded-2xl border border-border/50 bg-card px-3 py-3"
            >
              {active && (
                <motion.div
                  layoutId="payment-pill"
                  className="absolute inset-0 rounded-2xl border border-primary bg-primary/10"
                  transition={{ type: "spring", stiffness: 450, damping: 32, mass: 0.8 }}
                />
              )}
              <Logo className={`relative h-5 w-5 transition-colors duration-150 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <span className={`relative text-xs font-semibold transition-colors duration-150 ${active ? "text-primary" : "text-muted-foreground"}`}>
                {app.name}
              </span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

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
    // Persist the selected app so other pages pick up the right appId
    savePaymentPreference(appId, handles[appId] ?? "");
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
          <PaymentAppSelector
            selected={selectedAppId}
            onSelect={handleAppSelect}
          />
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
