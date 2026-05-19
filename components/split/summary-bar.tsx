import { formatCurrency } from "@/lib/calculate";

interface SummaryBarProps {
  subtotal: number;
  tax: number;
  tip: number;
  fees: number;
}

export function SummaryBar({ subtotal, tax, tip, fees }: SummaryBarProps) {
  const total = subtotal + tax + tip + fees;

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-card/40 px-5 py-4">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>Subtotal <span className="tabular-nums">{formatCurrency(subtotal)}</span></span>
        <span>Tax <span className="tabular-nums">{formatCurrency(tax)}</span></span>
        <span>Tip <span className="tabular-nums">{formatCurrency(tip)}</span></span>
        {fees > 0 && <span>Fees <span className="tabular-nums">{formatCurrency(fees)}</span></span>}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">Total</span>
        <span className="text-lg font-bold tabular-nums text-primary">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
