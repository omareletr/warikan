"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSplits } from "@/lib/splits";
import type { Split } from "@/lib/types";
import { SplitCard } from "@/components/split/split-card";

export default function HomePage() {
  const [splits, setSplits] = useState<Split[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSplits(getSplits());
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex min-h-dvh flex-col px-6 pt-14 pb-8"
    >
      <h1 className="text-3xl font-bold tracking-tight text-gradient">
        Warikan
      </h1>

      {splits.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <div className="rounded-2xl bg-primary/10 p-5">
            <UtensilsCrossed className="h-12 w-12 text-primary" />
          </div>
          <div>
            <p className="text-xl font-semibold">Your first split starts here.</p>
            <p className="mt-2 text-base text-muted-foreground">
              Scan a receipt and stop doing math in your head.
            </p>
          </div>
          <Button asChild className="mt-4 h-14 w-full max-w-xs rounded-2xl text-base font-semibold">
            <Link href="/split/scan">Start Split</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 flex flex-1 flex-col gap-8">
          <Button asChild className="h-14 w-full rounded-2xl text-base font-semibold">
            <Link href="/split/scan">Start Split</Link>
          </Button>
          <div>
            <p className="mb-4 text-base font-semibold text-muted-foreground">
              Recent Splits
            </p>
            <div className="flex flex-col gap-4">
              {splits.map((split, i) => (
                <motion.div
                  key={split.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <SplitCard split={split} />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.main>
  );
}
