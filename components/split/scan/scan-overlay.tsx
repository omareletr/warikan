import { AnimatePresence, motion } from "framer-motion";
import { SCAN_FRAME } from "@/lib/receipt-capture/capture-frame";
import type { ImageQualityResult, QualityStatus } from "@/lib/receipt-capture/image-quality";
import { QualityHints } from "@/components/split/scan/quality-hints";

interface ScanOverlayProps {
  status: QualityStatus;
  quality: ImageQualityResult | null;
  permissionDenied: boolean;
}

export function ScanOverlay({ status, quality, permissionDenied }: ScanOverlayProps) {
  if (permissionDenied) return null;

  const frameTop = `calc(50% + ${SCAN_FRAME.topOffset - SCAN_FRAME.height / 2}px)`;
  const frameBottom = `calc(50% + ${SCAN_FRAME.topOffset + SCAN_FRAME.height / 2}px)`;
  const frameLeft = `calc(50% - ${SCAN_FRAME.width / 2}px)`;
  const frameRight = `calc(50% + ${SCAN_FRAME.width / 2}px)`;
  const isReady = status === "ready" || status === "capturing" || status === "processing";

  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0">
        <div className="absolute left-0 right-0 top-0 bg-black/55" style={{ height: frameTop }} />
        <div className="absolute bottom-0 left-0 right-0 bg-black/55" style={{ top: frameBottom }} />
        <div className="absolute left-0 bg-black/55" style={{ top: frameTop, height: SCAN_FRAME.height, right: frameRight }} />
        <div className="absolute right-0 bg-black/55" style={{ top: frameTop, height: SCAN_FRAME.height, left: frameLeft }} />
      </div>

      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{
          width: SCAN_FRAME.width,
          height: SCAN_FRAME.height,
          borderRadius: SCAN_FRAME.radius,
          transform: `translate(-50%, calc(-50% + ${SCAN_FRAME.topOffset}px))`,
        }}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22 }}
      >
        <div className="absolute left-0 right-0 top-5 flex justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <QualityHints quality={quality} status={status} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className={`h-full w-full rounded-[28px] border transition-colors duration-200 ${isReady ? "border-white/85" : "border-white/35"}`} />
      </motion.div>

      <AnimatePresence>
        {status === "capturing" && (
          <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.5 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.42 }} />
        )}
      </AnimatePresence>
    </div>
  );
}
