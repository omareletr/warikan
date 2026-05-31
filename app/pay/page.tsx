"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { consumePopFlag } from "@/lib/nav-flag";
import { Button } from "@/components/ui/button";
import { decodePayData, getPaymentApp } from "@/lib/payment-apps";
import type { DecodedPayData } from "@/lib/payment-apps";

/**
 * Extracts the ?person= query param from inside the hash fragment.
 * The URL looks like: /pay#<encoded>?person=Alice
 * window.location.hash is "#<encoded>?person=Alice"
 */
function getPersonFromHash(hash: string): string | null {
  const qIdx = hash.indexOf("?");
  if (qIdx === -1) return null;
  const params = new URLSearchParams(hash.slice(qIdx + 1));
  return params.get("person");
}

export default function PayPage() {
  const [fromPop] = useState(() => consumePopFlag());
  const [data, setData] = useState<DecodedPayData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [highlightedPerson, setHighlightedPerson] = useState<string | null>(null);
  const highlightedCardRef = useRef<HTMLDivElement | null>(null);
  const t = useTranslations("pay");

  useEffect(() => {
    const hash = window.location.hash;
    setData(decodePayData(hash));
    setHighlightedPerson(getPersonFromHash(hash));
    setLoaded(true);
  }, []);

  // Scroll the highlighted card into view once the list renders
  useEffect(() => {
    if (!highlightedPerson || !highlightedCardRef.current) return;
    const timer = setTimeout(() => {
      highlightedCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightedPerson, loaded]);

  if (loaded && !data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="text-xl font-bold">{t("invalidLink")}</p>
        <p className="mt-2 text-base text-muted-foreground">
          {t("invalidLinkDesc")}
        </p>
      </main>
    );
  }

  const total = data ? data.people.reduce((s, p) => s + p.amount, 0) : 0;
  const appConfig = data ? getPaymentApp(data.appId) : null;
  const hasHandle = Boolean(data?.handle);

  function openPayApp(amount: number) {
    if (!data?.handle || !appConfig) return;
    const note = data.restaurantName ? `${data.restaurantName} split` : "Warikan split";
    const url = appConfig.buildPayLink(data.handle, amount, note);
    if (data.appId === "venmo") {
      window.location.href = url;
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  async function copyAmount(amount: number, idx: number) {
    try {
      await navigator.clipboard.writeText(amount.toFixed(2));
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch { /* ignore */ }
  }

  function formatCurrency(n: number) {
    return "$" + n.toFixed(2);
  }

  function initials(name: string) {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  function handleLabel(): string {
    if (!appConfig || !data?.handle) return "";
    return `${appConfig.handlePrefix}${data.handle}`;
  }

  return (
    <motion.main
      initial={fromPop ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-dvh flex-col px-6 pt-14 pb-8"
    >
      {data && (
        <>
          <div className="text-center">
            {data.restaurantName && (
              <p className="text-xl font-semibold">{data.restaurantName}</p>
            )}
            <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-gradient">
              {formatCurrency(total)}
            </p>
            {hasHandle && appConfig && (
              <p className="mt-2 text-base text-muted-foreground">
                {t("payingVia", { app: appConfig.name, handle: handleLabel() })}
              </p>
            )}
          </div>

          <p className="mb-4 mt-10 text-base font-semibold text-muted-foreground">
            {highlightedPerson
              ? hasHandle
                ? t("tapNameToPay")
                : t("yourShare")
              : hasHandle
              ? t("tapNameGeneral")
              : t("everyonesShare")}
          </p>

          <div className="flex flex-col gap-4">
            {data.people.map((person, i) => {
              const isHighlighted =
                highlightedPerson !== null &&
                person.name.toLowerCase() === highlightedPerson.toLowerCase();
              return (
                <motion.div
                  key={i}
                  ref={isHighlighted ? (el) => { highlightedCardRef.current = el; } : undefined}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  {hasHandle ? (
                    <Card
                      className={`flex cursor-pointer items-center gap-4 p-5 transition-all duration-150 active:scale-[0.98] ${isHighlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                      onClick={() => openPayApp(person.amount)}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">
                        {initials(person.name)}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium">
                          {person.name}
                          {isHighlighted && (
                            <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                              {t("you")}
                            </span>
                          )}
                        </p>
                        <p className="font-mono text-2xl font-semibold tabular-nums text-primary">
                          {formatCurrency(person.amount)}
                        </p>
                      </div>
                      <Button size="sm">{t("pay")}</Button>
                    </Card>
                  ) : (
                    <Card className={`flex items-center gap-4 p-5 ${isHighlighted ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">
                        {initials(person.name)}
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-medium">
                          {person.name}
                          {isHighlighted && (
                            <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                              {t("you")}
                            </span>
                          )}
                        </p>
                        <p className="font-mono text-2xl font-semibold tabular-nums text-primary">
                          {formatCurrency(person.amount)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => copyAmount(person.amount, i)}
                      >
                        {copiedIdx === i ? (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 20 }}
                          >
                            <Check className="h-3.5 w-3.5 text-primary" />
                          </motion.span>
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {copiedIdx === i ? t("copied") : t("copy")}
                      </Button>
                    </Card>
                  )}
                </motion.div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {t("startYourOwn")}
            </Link>
          </div>
        </>
      )}
    </motion.main>
  );
}
