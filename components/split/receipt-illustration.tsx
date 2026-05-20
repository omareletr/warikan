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
        x1="80" y1="12" x2="80" y2="212"
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
  return (
    <>
      {/* Scalloped top edge */}
      <path
        d="M0,16 Q10,4 20,16 Q30,4 40,16 Q50,4 60,16 Q70,4 80,16 Q90,4 100,16 Q110,4 120,16 Q130,4 140,16 Q150,4 160,16 L160,208 Q150,220 140,208 Q130,220 120,208 Q110,220 100,208 Q90,220 80,208 Q70,220 60,208 Q50,220 40,208 Q30,220 20,208 Q10,220 0,208 Z"
        fill="hsl(155 18% 9%)"
        stroke="hsl(160 64% 52%)"
        strokeWidth="0.75"
        strokeOpacity="0.25"
      />

      {/* Restaurant name bar — wide */}
      <rect x="16" y="30" width="90" height="7" rx="3.5" fill="hsl(160 64% 52%)" fillOpacity="0.25" />

      {/* Line items */}
      <rect x="16" y="52" width="76" height="5" rx="2.5" fill="white" fillOpacity="0.08" />
      <rect x="110" y="52" width="34" height="5" rx="2.5" fill="white" fillOpacity="0.08" />

      <rect x="16" y="65" width="60" height="5" rx="2.5" fill="white" fillOpacity="0.08" />
      <rect x="110" y="65" width="34" height="5" rx="2.5" fill="white" fillOpacity="0.08" />

      <rect x="16" y="78" width="68" height="5" rx="2.5" fill="white" fillOpacity="0.08" />
      <rect x="110" y="78" width="34" height="5" rx="2.5" fill="white" fillOpacity="0.08" />

      <rect x="16" y="91" width="52" height="5" rx="2.5" fill="white" fillOpacity="0.08" />
      <rect x="110" y="91" width="34" height="5" rx="2.5" fill="white" fillOpacity="0.08" />

      <rect x="16" y="104" width="72" height="5" rx="2.5" fill="white" fillOpacity="0.08" />
      <rect x="110" y="104" width="34" height="5" rx="2.5" fill="white" fillOpacity="0.08" />

      {/* Divider */}
      <line x1="16" y1="120" x2="144" y2="120" stroke="white" strokeOpacity="0.08" strokeWidth="1" />

      {/* Tax / tip rows */}
      <rect x="16" y="128" width="44" height="4" rx="2" fill="white" fillOpacity="0.06" />
      <rect x="110" y="128" width="34" height="4" rx="2" fill="white" fillOpacity="0.06" />

      <rect x="16" y="138" width="28" height="4" rx="2" fill="white" fillOpacity="0.06" />
      <rect x="110" y="138" width="34" height="4" rx="2" fill="white" fillOpacity="0.06" />

      {/* Total bar — prominent */}
      <rect x="16" y="155" width="128" height="8" rx="4" fill="hsl(160 64% 52%)" fillOpacity="0.15" />

      {/* Bottom decorative dots */}
      <circle cx="48" cy="190" r="2" fill="white" fillOpacity="0.06" />
      <circle cx="80" cy="190" r="2" fill="white" fillOpacity="0.06" />
      <circle cx="112" cy="190" r="2" fill="white" fillOpacity="0.06" />
    </>
  );
}
