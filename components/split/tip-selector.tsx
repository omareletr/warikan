"use client";

import { Toggle } from "@/components/ui/toggle";

const TIP_OPTIONS = [15, 18, 20, 25] as const;

interface TipSelectorProps {
  subtotal: number;
  tipAmount: number;
  onTipChange: (amount: number) => void;
}

export function TipSelector({
  subtotal,
  tipAmount,
  onTipChange,
}: TipSelectorProps) {
  const activePercent = subtotal > 0
    ? TIP_OPTIONS.find(
        (p) => Math.abs(tipAmount - subtotal * (p / 100)) < 0.01
      )
    : undefined;

  return (
    <div className="flex gap-3">
      {TIP_OPTIONS.map((percent) => (
        <Toggle
          key={percent}
          variant="outline"
          pressed={activePercent === percent}
          onPressedChange={(pressed) => {
            onTipChange(pressed ? Math.round(subtotal * (percent / 100) * 100) / 100 : 0);
          }}
          className="h-11 flex-1 text-base"
        >
          {percent}%
        </Toggle>
      ))}
    </div>
  );
}
