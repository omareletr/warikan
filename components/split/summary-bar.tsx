"use client";

import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/calculate";

interface SummaryBarProps {
  subtotal: number;
  tax: number;
  tip: number;
  fees: number;
}

export function SummaryBar({ subtotal, tax, tip, fees }: SummaryBarProps) {
  const total = subtotal + tax + tip + fees;
  const t = useTranslations("common");

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{t("subtotal")}</span>
        <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
      </div>
      <div className="my-0.5 border-t border-border/20" />
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{t("tax")}</span>
        <span className="font-mono tabular-nums">{formatCurrency(tax)}</span>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{t("tip")}</span>
        <span className="font-mono tabular-nums">{formatCurrency(tip)}</span>
      </div>
      {fees > 0 && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{t("fees")}</span>
          <span className="font-mono tabular-nums">{formatCurrency(fees)}</span>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between border-t border-border/50 pt-2.5">
        <span className="text-base font-semibold">{t("total")}</span>
        <span className="font-mono text-lg font-bold tabular-nums text-primary">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
