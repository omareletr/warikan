"use client";

import dynamic from "next/dynamic";

const SlotCounter = dynamic(() => import("react-slot-counter"), { ssr: false });

export function AnimatedTotal({ amount }: { amount: number }) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount).replace("$", "");

  return (
    <div className="mt-2 flex items-center justify-center text-4xl font-bold tabular-nums text-emerald-400">
      <span>$</span>
      <SlotCounter
        value={formatted}
        duration={0.5}
        dummyCharacters={["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"]}
        dummyCharacterCount={7}
        charClassName="text-emerald-400"
      />
    </div>
  );
}
