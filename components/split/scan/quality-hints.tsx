import { Loader2 } from "lucide-react";
import type { ImageQualityResult, QualityStatus } from "@/lib/receipt-capture/image-quality";

interface QualityHintsProps {
  quality: ImageQualityResult | null;
  status: QualityStatus;
}

const labels: Record<QualityStatus, string> = {
  searching: "Point at receipt",
  too_dark: "More light needed",
  too_bright: "Reduce glare",
  blurry: "Hold still",
  too_far: "Move closer",
  hold_steady: "Hold steady",
  ready: "Ready",
  capturing: "Capturing",
  processing: "Processing",
};

export function QualityHints({ quality, status }: QualityHintsProps) {
  const label = status === quality?.status ? quality.reasons[0] ?? labels[status] : labels[status];
  const ready = status === "ready";
  const waiting = status === "hold_steady" || status === "capturing";

  return (
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-2 text-sm font-medium text-white/85 backdrop-blur-xl">
      {status === "processing" ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-white/80" />
      ) : (
        <span className={`h-2 w-2 rounded-full ${ready ? "bg-primary" : waiting ? "bg-white/80" : "bg-white/35"}`} />
      )}
      <span>{label}</span>
    </div>
  );
}
