"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { decodePayData, buildVenmoDeepLink } from "@/lib/venmo";

interface PayInfo {
  venmoUsername: string;
  people: { name: string; amount: number }[];
  restaurantName?: string;
}

export default function PayPage() {
  const [data, setData] = useState<PayInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setData(decodePayData(window.location.hash));
    setLoaded(true);
  }, []);

  if (loaded && !data) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="text-xl font-bold">Invalid link</p>
        <p className="mt-2 text-base text-muted-foreground">This payment link is missing or expired. Ask the payer to share a new QR code.</p>
      </main>
    );
  }

  const total = data ? data.people.reduce((s, p) => s + p.amount, 0) : 0;

  function openVenmo(amount: number) {
    if (!data) return;
    const note = data.restaurantName ? `${data.restaurantName} split` : "Warikan split";
    window.location.href = buildVenmoDeepLink(data.venmoUsername, amount, note);
  }

  function formatCurrency(n: number) {
    return "$" + n.toFixed(2);
  }

  function initials(name: string) {
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  }

  return (
    <main className="flex min-h-dvh flex-col px-6 pt-14 pb-8">
      {data && (
        <>
          <div className="text-center">
            {data.restaurantName && <p className="text-xl font-semibold">{data.restaurantName}</p>}
            <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-gradient">{formatCurrency(total)}</p>
            <p className="mt-2 text-base text-muted-foreground">Paying @{data.venmoUsername}</p>
          </div>

          <p className="mb-4 mt-10 text-base font-semibold text-muted-foreground">Tap your name to pay</p>

          <div className="flex flex-col gap-4">
            {data.people.map((person, i) => (
              <Card
                key={i}
                className="flex cursor-pointer items-center gap-4 p-5 transition-all duration-150 active:scale-[0.98]"
                onClick={() => openVenmo(person.amount)}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-base font-semibold text-primary">
                  {initials(person.name)}
                </div>
                <div className="flex-1">
                  <p className="text-base font-medium">{person.name}</p>
                  <p className="font-mono text-2xl font-semibold tabular-nums text-primary">{formatCurrency(person.amount)}</p>
                </div>
                <Button size="sm">Pay</Button>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
              Start your own split
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
