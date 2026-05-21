"use client";

import { motion } from "framer-motion";

function DigitColumn({ digit, delay }: { digit: string; delay: number }) {
  if (!/\d/.test(digit)) {
    return (
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay }}
      >
        {digit}
      </motion.span>
    );
  }

  const n = parseInt(digit, 10);

  return (
    <div style={{ overflow: "hidden", height: "1em", lineHeight: "1em" }}>
      <motion.div
        style={{ display: "flex", flexDirection: "column" }}
        initial={{ y: 0 }}
        animate={{ y: `${-n * 10}%` }}
        transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} style={{ height: "1em", lineHeight: "1em", display: "block" }}>
            {i}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function AnimatedTotal({ amount }: { amount: number }) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);

  return (
    <div className="mt-2 flex items-center justify-center text-4xl font-bold tabular-nums text-emerald-400">
      {formatted.split("").map((char, i) => (
        <DigitColumn key={i} digit={char} delay={i * 0.06} />
      ))}
    </div>
  );
}
