"use client";

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface HeroConceptBProps {
  onReady?: () => void;
}

interface LineItemDef {
  nameX: number;
  nameY: number;
  nameW: number;
  priceX: number;
  priceW: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  isStreak: boolean;
  length: number;
  rotation: number;
  opacity: number;
  dx: number;
  dy: number;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const EMERALD = "hsl(160 64% 52%)";
const EMERALD_HEX = "#10B981";
const RECEIPT_BG = "hsl(155 18% 9%)";

const LINE_ITEMS: LineItemDef[] = [
  { nameX: 16, nameY: 52, nameW: 76, priceX: 110, priceW: 34 },
  { nameX: 16, nameY: 65, nameW: 60, priceX: 110, priceW: 34 },
  { nameX: 16, nameY: 78, nameW: 68, priceX: 110, priceW: 34 },
  { nameX: 16, nameY: 91, nameW: 52, priceX: 110, priceW: 34 },
  { nameX: 16, nameY: 104, nameW: 72, priceX: 110, priceW: 34 },
];

const RECEIPT_OUTLINE =
  "M0,16 Q10,4 20,16 Q30,4 40,16 Q50,4 60,16 Q70,4 80,16 Q90,4 100,16 Q110,4 120,16 Q130,4 140,16 Q150,4 160,16 L160,208 Q150,220 140,208 Q130,220 120,208 Q110,220 100,208 Q90,220 80,208 Q70,220 60,208 Q50,220 40,208 Q30,220 20,208 Q10,220 0,208 Z";

/* Seeded random for stable memoized values */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function HeroConceptB({ onReady }: HeroConceptBProps) {
  const [phase, setPhase] = useState<0 | 1 | 2 | 3 | 4 | 5>(0);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  /* Stable random data for scattered positions & particles */
  const scatterData = useMemo(() => {
    const rand = seededRandom(42);
    const itemScatter = LINE_ITEMS.map(() => ({
      x: (rand() - 0.5) * 160,
      y: (rand() - 0.5) * 120,
      rotate: (rand() - 0.5) * 30,
    }));

    const particles: Particle[] = Array.from({ length: 22 }, (_, i) => {
      const angle = (i / 22) * Math.PI * 2 + (rand() - 0.5) * 0.6;
      const speed = 40 + rand() * 80;
      const isStreak = rand() > 0.5;
      return {
        id: i,
        x: 80,
        y: 112,
        isStreak,
        length: isStreak ? 8 + rand() * 4 : 0,
        rotation: (angle * 180) / Math.PI,
        opacity: 0.3 + rand() * 0.5,
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed + 20 * rand(),
      };
    });

    return { itemScatter, particles };
  }, []);

  /* Phase sequencing */
  useEffect(() => {
    setPhase(1);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 2000);
    const t4 = setTimeout(() => setPhase(4), 3000);
    const t5 = setTimeout(() => {
      setPhase(5);
      onReadyRef.current?.();
    }, 4200);

    return () => {
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  return (
    <div
      className="hero-b-container"
      style={{
        position: "relative",
        width: 320,
        height: 400,
        overflow: "hidden",
        margin: "0 auto",
      }}
    >
      {/* Background mesh gradient blobs */}
      <MeshGradient />

      {/* Main receipt SVG area */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ReceiptAnimation
          phase={phase}
          scatterData={scatterData}
        />

        {/* Text reveal */}
        {phase >= 4 && (
          <TextReveal phase={phase} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mesh Gradient Background                                           */
/* ------------------------------------------------------------------ */

function MeshGradient() {
  return (
    <div
      className="hero-b-mesh"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* Blob 1: Emerald */}
      <motion.div
        style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${EMERALD_HEX}44 0%, transparent 70%)`,
          filter: "blur(80px)",
          opacity: 0.18,
          top: "10%",
          left: "10%",
        }}
        animate={{
          x: [0, 40, 20, -20, -40, 0],
          y: [0, -30, 20, 40, -10, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Blob 2: Teal */}
      <motion.div
        style={{
          position: "absolute",
          width: 160,
          height: 160,
          borderRadius: "50%",
          background: "radial-gradient(circle, #14b8a644 0%, transparent 70%)",
          filter: "blur(80px)",
          opacity: 0.14,
          top: "50%",
          right: "5%",
        }}
        animate={{
          x: [0, -30, -50, -10, 30, 0],
          y: [0, 30, -20, -40, 10, 0],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Blob 3: Dark cyan */}
      <motion.div
        style={{
          position: "absolute",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "radial-gradient(circle, #0891b244 0%, transparent 70%)",
          filter: "blur(80px)",
          opacity: 0.12,
          bottom: "10%",
          left: "30%",
        }}
        animate={{
          x: [0, 35, -15, -35, 15, 0],
          y: [0, -25, -45, 15, 35, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Receipt Animation                                                  */
/* ------------------------------------------------------------------ */

interface ReceiptAnimationProps {
  phase: number;
  scatterData: {
    itemScatter: { x: number; y: number; rotate: number }[];
    particles: Particle[];
  };
}

function ReceiptAnimation({ phase, scatterData }: ReceiptAnimationProps) {
  const { itemScatter, particles } = scatterData;
  const isSplit = phase >= 3;
  const showParticles = phase >= 3;

  return (
    <div
      className="hero-b-receipt-area"
      style={{ position: "relative", width: 160, height: 224 }}
    >
      {/* Scan flash (phase 2 end) */}
      {phase >= 2 && phase < 4 && <ScanFlash />}

      {/* Energy burst flash (phase 3) */}
      {phase >= 3 && <EnergyBurst />}

      {/* Energy particles (phase 3) */}
      {showParticles &&
        particles.map((p) => (
          <EnergyParticle key={p.id} particle={p} />
        ))}

      {/* Receipt SVG */}
      <svg
        viewBox="0 0 160 224"
        width="160"
        height="224"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ position: "relative", zIndex: 2 }}
      >
        <defs>
          <clipPath id="hero-b-clip-left">
            <rect x="0" y="0" width="80" height="224" />
          </clipPath>
          <clipPath id="hero-b-clip-right">
            <rect x="80" y="0" width="80" height="224" />
          </clipPath>
          {/* Glow filter for scan line */}
          <filter id="hero-b-scan-glow" x="-50%" y="-400%" width="200%" height="900%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ---- Left Half ---- */}
        <motion.g
          clipPath={isSplit ? "url(#hero-b-clip-left)" : undefined}
          animate={{
            x: isSplit ? -35 : 0,
            rotate: isSplit ? -3 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 180,
            damping: 24,
          }}
          style={{ originX: "50%", originY: "50%" }}
        >
          <ReceiptBodyAnimated
            phase={phase}
            scatterData={itemScatter}
            side="full"
          />
        </motion.g>

        {/* ---- Right Half (only visible when split) ---- */}
        {isSplit && (
          <motion.g
            clipPath="url(#hero-b-clip-right)"
            initial={{ x: 0, rotate: 0 }}
            animate={{ x: 35, rotate: 3 }}
            transition={{
              type: "spring",
              stiffness: 180,
              damping: 24,
            }}
            style={{ originX: "50%", originY: "50%" }}
          >
            <ReceiptBodyAnimated
              phase={phase}
              scatterData={itemScatter}
              side="full"
            />
          </motion.g>
        )}

        {/* Scan line (phase 2) */}
        {phase >= 2 && phase < 3 && <ScanLine />}

        {/* Tear line before split */}
        {!isSplit && phase >= 1 && (
          <motion.line
            x1="80" y1="16" x2="80" y2="208"
            stroke={EMERALD}
            strokeWidth="0.75"
            strokeDasharray="3 5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          />
        )}
      </svg>

      {/* Person icons (phase 3+) */}
      {phase >= 3 && <PersonIcons phase={phase} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Receipt Body with animated line items                              */
/* ------------------------------------------------------------------ */

interface ReceiptBodyAnimatedProps {
  phase: number;
  scatterData: { x: number; y: number; rotate: number }[];
  side: "full";
}

function ReceiptBodyAnimated({ phase, scatterData }: ReceiptBodyAnimatedProps) {
  const showOutline = phase >= 1;
  const showStaticElements = phase >= 1;

  return (
    <>
      {/* Receipt outline — draws in via pathLength */}
      <motion.path
        d={RECEIPT_OUTLINE}
        fill={RECEIPT_BG}
        stroke={EMERALD}
        strokeWidth="0.75"
        strokeOpacity={0.25}
        initial={{ pathLength: 0, fillOpacity: 0 }}
        animate={
          showOutline
            ? { pathLength: 1, fillOpacity: 1 }
            : { pathLength: 0, fillOpacity: 0 }
        }
        transition={{
          pathLength: { delay: 0.9, duration: 0.4, ease: "easeOut" },
          fillOpacity: { delay: 0.7, duration: 0.3 },
        }}
      />

      {/* Restaurant name bar */}
      <motion.rect
        x="16" y="30" width="90" height="7" rx="3.5"
        fill={EMERALD}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={
          showStaticElements
            ? { opacity: 0.25, scale: 1 }
            : { opacity: 0, scale: 0.6 }
        }
        transition={{ delay: 0.85, duration: 0.35, type: "spring", stiffness: 200, damping: 22 }}
      />

      {/* Animated line items */}
      {LINE_ITEMS.map((item, i) => (
        <AnimatedLineItem
          key={i}
          item={item}
          index={i}
          scatter={scatterData[i]}
          phase={phase}
        />
      ))}

      {/* Divider */}
      <motion.line
        x1="16" y1="120" x2="144" y2="120"
        stroke="white"
        strokeWidth="1"
        initial={{ opacity: 0 }}
        animate={showStaticElements ? { opacity: 0.08 } : { opacity: 0 }}
        transition={{ delay: 1.0, duration: 0.3 }}
      />

      {/* Tax/tip rows */}
      <motion.rect
        x="16" y="128" width="44" height="4" rx="2"
        fill="white"
        initial={{ opacity: 0 }}
        animate={showStaticElements ? { opacity: 0.06 } : { opacity: 0 }}
        transition={{ delay: 1.05, duration: 0.25 }}
      />
      <motion.rect
        x="110" y="128" width="34" height="4" rx="2"
        fill="white"
        initial={{ opacity: 0 }}
        animate={showStaticElements ? { opacity: 0.06 } : { opacity: 0 }}
        transition={{ delay: 1.05, duration: 0.25 }}
      />
      <motion.rect
        x="16" y="138" width="28" height="4" rx="2"
        fill="white"
        initial={{ opacity: 0 }}
        animate={showStaticElements ? { opacity: 0.06 } : { opacity: 0 }}
        transition={{ delay: 1.1, duration: 0.25 }}
      />
      <motion.rect
        x="110" y="138" width="34" height="4" rx="2"
        fill="white"
        initial={{ opacity: 0 }}
        animate={showStaticElements ? { opacity: 0.06 } : { opacity: 0 }}
        transition={{ delay: 1.1, duration: 0.25 }}
      />

      {/* Total bar */}
      <motion.rect
        x="16" y="155" width="128" height="8" rx="4"
        fill={EMERALD}
        initial={{ opacity: 0 }}
        animate={showStaticElements ? { opacity: 0.15 } : { opacity: 0 }}
        transition={{ delay: 1.15, duration: 0.3 }}
      />

      {/* Bottom dots */}
      {[48, 80, 112].map((cx) => (
        <motion.circle
          key={cx}
          cx={cx} cy="190" r="2"
          fill="white"
          initial={{ opacity: 0 }}
          animate={showStaticElements ? { opacity: 0.06 } : { opacity: 0 }}
          transition={{ delay: 1.2, duration: 0.2 }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Single animated line item                                          */
/* ------------------------------------------------------------------ */

interface AnimatedLineItemProps {
  item: LineItemDef;
  index: number;
  scatter: { x: number; y: number; rotate: number };
  phase: number;
}

function AnimatedLineItem({ item, index, scatter, phase }: AnimatedLineItemProps) {
  const delay = index * 0.08;
  const isAssembled = phase >= 1;

  /* Each item has a landing pulse ring */
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    if (phase >= 1) {
      const t = setTimeout(() => setShowPulse(true), (delay + 0.35) * 1000);
      return () => clearTimeout(t);
    }
  }, [phase, delay]);

  /* Scan glow: briefly glow brighter when scan line passes */
  const scanGlowDelay = phase >= 2 ? 0.1 + index * 0.1 : 0;
  const isScanPhase = phase >= 2 && phase < 3;

  return (
    <g>
      {/* Name bar */}
      <motion.rect
        x={item.nameX}
        y={item.nameY}
        width={item.nameW}
        height="5"
        rx="2.5"
        fill="white"
        initial={{
          opacity: 0,
          x: scatter.x,
          y: scatter.y,
          rotate: scatter.rotate,
          scale: 0.6,
        }}
        animate={
          isAssembled
            ? {
                opacity: isScanPhase
                  ? [0.08, 0.35, 0.08]
                  : 0.08,
                x: 0,
                y: 0,
                rotate: 0,
                scale: 1,
              }
            : {
                opacity: 0,
                x: scatter.x,
                y: scatter.y,
                rotate: scatter.rotate,
                scale: 0.6,
              }
        }
        transition={
          isScanPhase
            ? {
                opacity: {
                  times: [0, 0.5, 1],
                  duration: 0.3,
                  delay: scanGlowDelay,
                },
                x: { type: "spring", stiffness: 200, damping: 22, delay },
                y: { type: "spring", stiffness: 200, damping: 22, delay },
                rotate: { type: "spring", stiffness: 200, damping: 22, delay },
                scale: { type: "spring", stiffness: 200, damping: 22, delay },
              }
            : {
                type: "spring",
                stiffness: 200,
                damping: 22,
                delay,
              }
        }
      />

      {/* Price bar */}
      <motion.rect
        x={item.priceX}
        y={item.nameY}
        width={item.priceW}
        height="5"
        rx="2.5"
        fill="white"
        initial={{
          opacity: 0,
          x: scatter.x + 20,
          y: scatter.y - 10,
          rotate: -scatter.rotate,
          scale: 0.6,
        }}
        animate={
          isAssembled
            ? {
                opacity: isScanPhase
                  ? [0.08, 0.35, 0.08]
                  : 0.08,
                x: 0,
                y: 0,
                rotate: 0,
                scale: 1,
              }
            : {
                opacity: 0,
                x: scatter.x + 20,
                y: scatter.y - 10,
                rotate: -scatter.rotate,
                scale: 0.6,
              }
        }
        transition={
          isScanPhase
            ? {
                opacity: {
                  times: [0, 0.5, 1],
                  duration: 0.3,
                  delay: scanGlowDelay,
                },
                x: { type: "spring", stiffness: 200, damping: 22, delay: delay + 0.03 },
                y: { type: "spring", stiffness: 200, damping: 22, delay: delay + 0.03 },
                rotate: { type: "spring", stiffness: 200, damping: 22, delay: delay + 0.03 },
                scale: { type: "spring", stiffness: 200, damping: 22, delay: delay + 0.03 },
              }
            : {
                type: "spring",
                stiffness: 200,
                damping: 22,
                delay: delay + 0.03,
              }
        }
      />

      {/* Landing pulse ring */}
      {showPulse && (
        <motion.ellipse
          cx={item.nameX + item.nameW / 2}
          cy={item.nameY + 2.5}
          rx="6"
          ry="4"
          fill="none"
          stroke={EMERALD}
          strokeWidth="0.5"
          initial={{ scale: 1, opacity: 0.3 }}
          animate={{ scale: 2.5, opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      )}
    </g>
  );
}

/* ------------------------------------------------------------------ */
/*  Scan Line                                                          */
/* ------------------------------------------------------------------ */

function ScanLine() {
  return (
    <motion.g
      initial={{ y: 16 }}
      animate={{ y: 208 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      {/* Glow halo */}
      <rect
        x="0"
        y="-10"
        width="160"
        height="20"
        fill="url(#hero-b-scan-grad)"
        filter="url(#hero-b-scan-glow)"
        opacity="0.25"
      />
      {/* Core scan line */}
      <rect
        x="0"
        y="-2"
        width="160"
        height="4"
        fill="url(#hero-b-scan-grad)"
        opacity="0.9"
      />
      {/* Gradient definition inside SVG */}
      <defs>
        <linearGradient id="hero-b-scan-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="20%" stopColor={EMERALD} />
          <stop offset="50%" stopColor="white" />
          <stop offset="80%" stopColor={EMERALD} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </motion.g>
  );
}

/* ------------------------------------------------------------------ */
/*  Scan Flash (center pulse after scan)                               */
/* ------------------------------------------------------------------ */

function ScanFlash() {
  return (
    <motion.div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 80,
        height: 80,
        marginLeft: -40,
        marginTop: -40,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${EMERALD_HEX}66 0%, transparent 70%)`,
        pointerEvents: "none",
        zIndex: 3,
      }}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: [0, 0.4, 0], scale: [0.5, 1.5, 1.5] }}
      transition={{
        duration: 0.4,
        delay: 0.65,
        times: [0, 0.5, 1],
        ease: "easeOut",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Energy Burst (phase 3 center flash)                                */
/* ------------------------------------------------------------------ */

function EnergyBurst() {
  return (
    <motion.div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: 120,
        height: 120,
        marginLeft: -60,
        marginTop: -60,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${EMERALD_HEX}88 0%, ${EMERALD_HEX}22 40%, transparent 70%)`,
        pointerEvents: "none",
        zIndex: 5,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 0.6, 0], scale: [0, 2, 2.5] }}
      transition={{
        duration: 0.4,
        times: [0, 0.4, 1],
        ease: "easeOut",
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Energy Particle                                                    */
/* ------------------------------------------------------------------ */

function EnergyParticle({ particle }: { particle: Particle }) {
  const size = particle.isStreak ? particle.length : 3;

  return (
    <motion.div
      style={{
        position: "absolute",
        left: particle.x,
        top: particle.y,
        width: particle.isStreak ? particle.length : size,
        height: particle.isStreak ? 1 : size,
        borderRadius: particle.isStreak ? 0.5 : "50%",
        background: EMERALD_HEX,
        transformOrigin: "center center",
        rotate: `${particle.rotation}deg`,
        pointerEvents: "none",
        zIndex: 6,
      }}
      initial={{ opacity: particle.opacity, x: 0, y: 0, scale: 1 }}
      animate={{
        x: particle.dx,
        y: particle.dy,
        opacity: 0,
        scale: 0.3,
      }}
      transition={{
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Person Icons (appear between torn receipt halves)                   */
/* ------------------------------------------------------------------ */

function PersonIcons({ phase }: { phase: number }) {
  const isComplete = phase >= 5;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: 160,
        height: 224,
        pointerEvents: "none",
        zIndex: 4,
      }}
    >
      {/* Left person */}
      <motion.div
        style={{
          position: "absolute",
          left: 56,
          top: 88,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 18,
          delay: 0.25,
        }}
      >
        <motion.div
          animate={isComplete ? { y: [0, -3, 0, 3, 0] } : {}}
          transition={
            isComplete
              ? { duration: 3, repeat: Infinity, ease: "easeInOut" }
              : {}
          }
        >
          <PersonSVG />
        </motion.div>
      </motion.div>

      {/* Right person */}
      <motion.div
        style={{
          position: "absolute",
          left: 86,
          top: 88,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 18,
          delay: 0.35,
        }}
      >
        <motion.div
          animate={isComplete ? { y: [0, 3, 0, -3, 0] } : {}}
          transition={
            isComplete
              ? { duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
              : {}
          }
        >
          <PersonSVG />
        </motion.div>
      </motion.div>

      {/* Dashed connection lines */}
      <svg
        viewBox="0 0 160 224"
        width="160"
        height="224"
        style={{ position: "absolute", top: 0, left: 0 }}
        aria-hidden="true"
      >
        {/* Left person → left receipt half */}
        <motion.line
          x1="62"
          y1="108"
          x2="40"
          y2="130"
          stroke={EMERALD}
          strokeWidth="0.75"
          strokeDasharray="2 3"
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: 0.4, pathLength: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        />
        {/* Right person → right receipt half */}
        <motion.line
          x1="98"
          y1="108"
          x2="120"
          y2="130"
          stroke={EMERALD}
          strokeWidth="0.75"
          strokeDasharray="2 3"
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: 0.4, pathLength: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Person SVG icon (circle head + shoulders arc)                      */
/* ------------------------------------------------------------------ */

function PersonSVG() {
  return (
    <svg
      width="18"
      height="20"
      viewBox="0 0 18 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Subtle glow */}
      <circle
        cx="9"
        cy="7"
        r="8"
        fill={EMERALD_HEX}
        opacity="0.08"
      />
      {/* Head */}
      <circle
        cx="9"
        cy="7"
        r="4.5"
        stroke={EMERALD}
        strokeWidth="1.2"
        fill="none"
      />
      {/* Shoulders */}
      <path
        d="M1,19 Q1,14 9,14 Q17,14 17,19"
        stroke={EMERALD}
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Text Reveal — per-character animation                              */
/* ------------------------------------------------------------------ */

function TextReveal({ phase }: { phase: number }) {
  const line1 = "Pay your share.";
  const line2 = "Keep your friends.";

  const charOffsets = useMemo(() => {
    const rand = seededRandom(99);
    return [...line1, ...line2].map(() => ({
      x: (rand() - 0.5) * 40,
      y: (rand() - 0.5) * 30,
    }));
  }, []);

  return (
    <div
      className="hero-b-text"
      style={{
        marginTop: 20,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Line 1 */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: "white",
          letterSpacing: "-0.01em",
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {line1.split("").map((char, i) => (
          <motion.span
            key={`l1-${i}`}
            style={{
              display: "inline-block",
              whiteSpace: char === " " ? "pre" : undefined,
            }}
            initial={{
              opacity: 0,
              x: charOffsets[i].x,
              y: charOffsets[i].y,
              scale: 0.5,
            }}
            animate={{
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 20,
              delay: i * 0.025,
            }}
          >
            {char}
          </motion.span>
        ))}
      </div>

      {/* Line 2 */}
      <div
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: EMERALD,
          letterSpacing: "-0.01em",
          marginTop: 4,
          display: "flex",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {line2.split("").map((char, i) => {
          const globalIndex = line1.length + i;
          return (
            <motion.span
              key={`l2-${i}`}
              style={{
                display: "inline-block",
                whiteSpace: char === " " ? "pre" : undefined,
              }}
              initial={{
                opacity: 0,
                x: charOffsets[globalIndex].x,
                y: charOffsets[globalIndex].y,
                scale: 0.5,
              }}
              animate={{
                opacity: 1,
                x: 0,
                y: 0,
                scale: 1,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 20,
                delay: 0.2 + i * 0.025,
              }}
            >
              {char}
            </motion.span>
          );
        })}
      </div>

      {/* Emerald shimmer sweep across text */}
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: `linear-gradient(90deg, transparent 0%, ${EMERALD_HEX}22 45%, ${EMERALD_HEX}44 50%, ${EMERALD_HEX}22 55%, transparent 100%)`,
          pointerEvents: "none",
        }}
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          delay: 0.8,
          duration: 0.6,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
