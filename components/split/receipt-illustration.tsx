"use client";

import { motion } from "framer-motion";

interface ReceiptIllustrationProps {
  phase: "intact" | "tearing" | "torn";
}

const CLIP_LEFT = "receipt-clip-left";
const CLIP_RIGHT = "receipt-clip-right";

const torn = (phase: string) => phase === "tearing" || phase === "torn";

export function ReceiptIllustration({ phase }: ReceiptIllustrationProps) {
  const isTorn = torn(phase);
  const transition = { type: "tween" as const, duration: 0.6, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

  return (
    <svg
      viewBox="0 0 160 224"
      width="160"
      height="224"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        {/* Left half clip: everything left of center */}
        <clipPath id={CLIP_LEFT}>
          <rect x="0" y="0" width="80" height="224" />
        </clipPath>
        {/* Right half clip: everything right of center */}
        <clipPath id={CLIP_RIGHT}>
          <rect x="80" y="0" width="80" height="224" />
        </clipPath>
      </defs>

      {/* Left half */}
      <motion.g
        clipPath={`url(#${CLIP_LEFT})`}
        animate={{ x: isTorn ? -26 : 0, rotate: isTorn ? -1.5 : 0 }}
        transition={transition}
        style={{ originX: "50%", originY: "50%" }}
        className={isTorn ? "tear-glow-left" : ""}
      >
        <ReceiptBody />
      </motion.g>

      {/* Right half */}
      <motion.g
        clipPath={`url(#${CLIP_RIGHT})`}
        animate={{ x: isTorn ? 26 : 0, rotate: isTorn ? 1.5 : 0 }}
        transition={transition}
        style={{ originX: "50%", originY: "50%" }}
        className={isTorn ? "tear-glow-right" : ""}
      >
        <ReceiptBody />
      </motion.g>

      {/* Tear line — fades out when torn */}
      <motion.line
        x1="80" y1="8" x2="80" y2="200"
        stroke="hsl(160 64% 52%)"
        strokeWidth="1"
        strokeDasharray="4 6"
        animate={{ opacity: isTorn ? 0 : 0.2 }}
        transition={{ duration: 0.3 }}
      />
    </svg>
  );
}

function ReceiptBody() {
  // Perforation dots — avoid x=80 (tear line), use same positions as concept-a
  const perfDots = [7, 20, 33, 46, 59, 72, 88, 101, 114, 127, 140, 153];

  return (
    <>
      {/* ── Main receipt body — glassmorphism fill ── */}
      <rect
        x="0" y="8" width="160" height="192"
        rx="8"
        fill="hsl(155 18% 11% / 0.6)"
      />

      {/* ── Outer border glow — emerald at low opacity ── */}
      <rect
        x="0.5" y="8.5" width="159" height="191"
        rx="7.5"
        fill="none"
        stroke="hsl(160 64% 52%)"
        strokeWidth="1"
        strokeOpacity="0.15"
      />

      {/* ── Inner white border — glass edge highlight ── */}
      <rect
        x="1" y="9" width="158" height="190"
        rx="7"
        fill="none"
        stroke="white"
        strokeWidth="0.5"
        strokeOpacity="0.05"
      />

      {/* ── Top inner highlight ── */}
      <rect
        x="8" y="10" width="144" height="1"
        rx="0.5"
        fill="white"
        fillOpacity="0.06"
      />

      {/* ── Perforation line ── */}
      <line
        x1="0" y1="176" x2="160" y2="176"
        stroke="white"
        strokeOpacity="0.06"
        strokeWidth="0.5"
        strokeDasharray="3 3"
      />

      {/* ── Perforation dots ── */}
      {perfDots.map((cx) => (
        <circle
          key={cx}
          cx={cx} cy="192" r="2.5"
          fill="hsl(155 18% 4%)"
          stroke="hsl(160 64% 52%)"
          strokeWidth="0.5"
          strokeOpacity="0.18"
        />
      ))}

      {/* ── Restaurant name bar ── */}
      <rect x="16" y="30" width="90" height="7" rx="3.5" fill="hsl(160 64% 52%)" fillOpacity="0.25" />

      {/* ── Line items — emerald tint ── */}
      <rect x="16" y="52" width="76" height="5" rx="2.5" fill="hsl(160 64% 52%)" fillOpacity="0.10" />
      <rect x="110" y="52" width="34" height="5" rx="2.5" fill="hsl(160 64% 52%)" fillOpacity="0.08" />

      <rect x="16" y="65" width="60" height="5" rx="2.5" fill="hsl(160 64% 52%)" fillOpacity="0.10" />
      <rect x="110" y="65" width="34" height="5" rx="2.5" fill="hsl(160 64% 52%)" fillOpacity="0.08" />

      <rect x="16" y="78" width="68" height="5" rx="2.5" fill="hsl(160 64% 52%)" fillOpacity="0.10" />
      <rect x="110" y="78" width="34" height="5" rx="2.5" fill="hsl(160 64% 52%)" fillOpacity="0.08" />

      <rect x="16" y="91" width="52" height="5" rx="2.5" fill="hsl(160 64% 52%)" fillOpacity="0.10" />
      <rect x="110" y="91" width="34" height="5" rx="2.5" fill="hsl(160 64% 52%)" fillOpacity="0.08" />

      <rect x="16" y="104" width="72" height="5" rx="2.5" fill="hsl(160 64% 52%)" fillOpacity="0.10" />
      <rect x="110" y="104" width="34" height="5" rx="2.5" fill="hsl(160 64% 52%)" fillOpacity="0.08" />

      {/* ── Divider — dashed ── */}
      <line
        x1="16" y1="120" x2="144" y2="120"
        stroke="white" strokeOpacity="0.12" strokeWidth="1"
        strokeDasharray="4 3"
      />

      {/* ── Tax / tip rows ── */}
      <rect x="16" y="128" width="44" height="4" rx="2" fill="white" fillOpacity="0.06" />
      <rect x="110" y="128" width="34" height="4" rx="2" fill="white" fillOpacity="0.06" />
      <rect x="16" y="138" width="28" height="4" rx="2" fill="white" fillOpacity="0.06" />
      <rect x="110" y="138" width="34" height="4" rx="2" fill="white" fillOpacity="0.06" />

      {/* ── Total bar — emerald + pulsing overlay ── */}
      <rect x="16" y="155" width="128" height="8" rx="4" fill="hsl(160 64% 52%)" fillOpacity="0.15" />
      <rect
        x="14" y="153" width="132" height="12" rx="6"
        fill="hsl(160 64% 52%)"
        fillOpacity="0.07"
        className="receipt-total-pulse"
      />
    </>
  );
}
