"use client";

import { useState, useEffect } from "react";
import NumberFlow from "@number-flow/react";

export function AnimatedTotal({ amount }: { amount: number }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    setValue(amount);
  }, [amount]);

  return (
    <NumberFlow
      value={value}
      format={{ style: "currency", currency: "USD", minimumFractionDigits: 2 }}
      transformTiming={{ duration: 800, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      spinTiming={{ duration: 800, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
      className="mt-2 text-4xl font-bold tabular-nums text-emerald-400"
    />
  );
}
