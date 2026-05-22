"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";

/* ─── Types ─────────────────────────────────────────────── */

interface HeroConceptAProps {
  onReady?: () => void;
}

type Phase = "hidden" | "receipt" | "scanning" | "tearing" | "text" | "done";

/* ─── Constants ─────────────────────────────────────────── */

const EMERALD = "hsl(160 64% 52%)";
const EMERALD_HEX = "#10B981";
const RECEIPT_W = 160;
const RECEIPT_H = 224;

/** Y positions of the 5 line-item rows inside the receipt SVG */
const LINE_ITEM_YS = [52, 65, 78, 91, 104];

/**
 * Irregular tear line — fine, densely-spaced waypoints around x=80.
 * Deterministic (seeded) so both clip paths are always identical.
 * Y range: 8→200 (192px), ~32 segments spaced ~6px apart, ±2–5px deviation.
 */
const TEAR_PTS: { x: number; y: number }[] = (() => {
  // Simple deterministic sequence — no import needed
  const vals = [
    0.61, 0.28, 0.74, 0.19, 0.83, 0.42, 0.67, 0.11, 0.55, 0.88,
    0.33, 0.76, 0.22, 0.59, 0.91, 0.38, 0.64, 0.15, 0.47, 0.80,
    0.26, 0.71, 0.09, 0.53, 0.86, 0.30, 0.68, 0.44, 0.95, 0.17,
    0.62, 0.39,
  ];
  const pts: { x: number; y: number }[] = [{ x: 80, y: 8 }];
  const steps = vals.length;
  for (let i = 0; i < steps; i++) {
    const y = 8 + ((i + 1) / (steps + 1)) * 192;
    // Alternate sides with small deviation ±2–5px
    const deviation = 2 + vals[i] * 3;
    const x = 80 + (i % 2 === 0 ? deviation : -deviation);
    pts.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 });
  }
  pts.push({ x: 80, y: 200 });
  return pts;
})();

/** SVG path for the left clip: region left of (and through) the zigzag.
 *  Start top-left → follow tear top→bottom → go to bottom-left → close. */
const TEAR_CLIP_LEFT = [
  `M -40,-10`,
  ...TEAR_PTS.map((p) => `L ${p.x},${p.y}`),
  `L -40,210 Z`,
].join(" ");

/** SVG path for the right clip: region right of (and through) the zigzag.
 *  Start from tear bottom → follow tear bottom→top → go to top-right → bottom-right → close. */
const TEAR_CLIP_RIGHT = [
  `M ${TEAR_PTS[TEAR_PTS.length - 1].x},${TEAR_PTS[TEAR_PTS.length - 1].y}`,
  ...TEAR_PTS.slice().reverse().slice(1).map((p) => `L ${p.x},${p.y}`),
  `L 200,-10 L 200,210 Z`,
].join(" ");

/* ─── Helpers: stable random particle data ──────────────── */

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface FloatingParticle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

interface TearParticle {
  id: number;
  xOffset: number;
  yOffset: number;
  rotation: number;
  size: number;
}

/* ─── Component ─────────────────────────────────────────── */

const HERO_SEEN_KEY = "warikan_hero_seen";

export function HeroConceptA({ onReady }: HeroConceptAProps) {
  // useLayoutEffect fires synchronously after DOM mutation but before paint,
  // so skipIntro is set before the browser renders — no flash, no mismatch.
  // SSR: useLayoutEffect is nooped server-side, so skipIntro stays false there.
  const [skipIntro, setSkipIntro] = useState(false);
  const [phase, setPhase] = useState<Phase>("hidden");
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Runs before first paint (client-only) — sets skipIntro so the JSX below
  // can render the static final state without framer-motion animating in.
  useLayoutEffect(() => {
    if (sessionStorage.getItem(HERO_SEEN_KEY)) {
      setSkipIntro(true);
    }
  }, []);

  /* Stable random floating particles (background ambience) */
  const floatingParticles = useMemo<FloatingParticle[]>(() => {
    const rand = seededRandom(42);
    return Array.from({ length: 10 }, () => ({
      x: rand() * 320 - 160,
      y: rand() * 380,
      size: 2 + rand(),
      opacity: 0.1 + rand() * 0.2,
      duration: 10 + rand() * 10,
      delay: rand() * -20,
    }));
  }, []);

  /* Stable random tear particles (emitted at tear moment) */
  const tearParticles = useMemo<TearParticle[]>(() => {
    const rand = seededRandom(99);
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      xOffset: (rand() - 0.5) * 60,
      yOffset: (rand() - 0.5) * 60,
      rotation: (rand() - 0.5) * 360,
      size: 1 + rand() * 1.5,
    }));
  }, []);

  /* Phase sequencing — plays only once per browser session */
  useEffect(() => {
    if (sessionStorage.getItem(HERO_SEEN_KEY)) {
      // skipIntro already set by useLayoutEffect before paint.
      // Just fire onReady and bail — no animation.
      setPhase("done");
      onReadyRef.current?.();
      return;
    }

    // Mark seen immediately so navigating away mid-animation still counts.
    sessionStorage.setItem(HERO_SEEN_KEY, "1");

    const timers: ReturnType<typeof setTimeout>[] = [];
    const t = (fn: () => void, ms: number) => {
      timers.push(setTimeout(fn, ms));
    };

    // Kick off
    t(() => setPhase("receipt"), 50);
    t(() => setPhase("scanning"), 600);
    t(() => setPhase("tearing"), 1200);
    t(() => setPhase("text"), 2000);
    t(() => {
      setPhase("done");
      onReadyRef.current?.();
    }, 3200);

    return () => timers.forEach(clearTimeout);
  }, []);

  const phaseGte = useCallback(
    (target: Phase) => {
      const order: Phase[] = [
        "hidden",
        "receipt",
        "scanning",
        "tearing",
        "text",
        "done",
      ];
      return order.indexOf(phase) >= order.indexOf(target);
    },
    [phase],
  );

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: 320, height: 380 }}
    >
      {/* ── Ambient gradient orb ─────────────────────────── */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 280,
          height: 280,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -55%)",
        }}
      >
        <motion.div
          className="h-full w-full rounded-full"
          style={{
            background: `radial-gradient(circle, ${EMERALD_HEX}33 0%, transparent 70%)`,
          }}
          animate={{
            scale: [0.9, 1.1, 0.9],
            rotate: [0, 360],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      </div>

      {/* ── Floating particles ───────────────────────────── */}
      {floatingParticles.map((p, i) => (
        <motion.div
          key={`float-${i}`}
          className="pointer-events-none absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: EMERALD_HEX,
            left: "50%",
            bottom: 0,
            opacity: 0,
          }}
          animate={{
            x: [p.x, p.x + 10, p.x],
            y: [0, -380],
            opacity: [0, p.opacity, p.opacity, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear",
          }}
        />
      ))}

      {/* ── Receipt SVG area ─────────────────────────────── */}
      <motion.div
        initial={skipIntro ? false : { opacity: 0, scale: 0.9, filter: "blur(8px)" }}
        animate={
          phaseGte("receipt")
            ? { opacity: 1, scale: 1, filter: "blur(0px)" }
            : {}
        }
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="relative"
      >
        <svg
          viewBox={`0 0 ${RECEIPT_W} ${RECEIPT_H}`}
          width={RECEIPT_W}
          height={RECEIPT_H}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          style={{ overflow: "visible" }}
        >
          <defs>
            {/* Inner glow gradient */}
            <radialGradient id="hero-a-inner-glow" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor={EMERALD_HEX} stopOpacity="0.08" />
              <stop offset="100%" stopColor={EMERALD_HEX} stopOpacity="0" />
            </radialGradient>

            {/* Frosted glass light diffusion overlay */}
            <radialGradient id="hero-a-glass-diffuse" cx="50%" cy="30%" r="55%">
              <stop offset="0%" stopColor="white" stopOpacity="0.04" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </radialGradient>

            {/* Drop shadow filter for receipt floating effect */}
            <filter id="hero-a-drop-shadow" filterUnits="userSpaceOnUse" x="-20" y="-10" width="200" height="260">
              <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="black" floodOpacity="0.35" />
            </filter>

            {/* Scan line glow filter */}
            <filter id="hero-a-scan-glow" x="-20%" y="-200%" width="140%" height="500%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Clip paths for tearing — irregular zigzag boundary */}
            <clipPath id="hero-a-clip-left">
              <path d={TEAR_CLIP_LEFT} />
            </clipPath>
            <clipPath id="hero-a-clip-right">
              <path d={TEAR_CLIP_RIGHT} />
            </clipPath>
          </defs>

          {/* ── Left half ── */}
          <motion.g
            clipPath="url(#hero-a-clip-left)"
            animate={
              phaseGte("tearing")
                ? { x: -30, rotate: -2 }
                : { x: 0, rotate: 0 }
            }
            transition={{
              type: "tween",
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ originX: "50%", originY: "50%" }}
          >
            <ReceiptBody />
            {/* Inner glow overlay */}
            <rect
              x="0"
              y="8"
              width={RECEIPT_W}
              height={200}
              fill="url(#hero-a-inner-glow)"
              rx="8"
            />
            {/* Glass diffuse overlay */}
            <rect
              x="0"
              y="8"
              width={RECEIPT_W}
              height={200}
              fill="url(#hero-a-glass-diffuse)"
              rx="8"
            />
          </motion.g>

          {/* ── Right half ── */}
          <motion.g
            clipPath="url(#hero-a-clip-right)"
            animate={
              phaseGte("tearing")
                ? { x: 30, rotate: 2 }
                : { x: 0, rotate: 0 }
            }
            transition={{
              type: "tween",
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            style={{ originX: "50%", originY: "50%" }}
          >
            <ReceiptBody />
            <rect
              x="0"
              y="8"
              width={RECEIPT_W}
              height={200}
              fill="url(#hero-a-inner-glow)"
              rx="8"
            />
            {/* Glass diffuse overlay */}
            <rect
              x="0"
              y="8"
              width={RECEIPT_W}
              height={200}
              fill="url(#hero-a-glass-diffuse)"
              rx="8"
            />
          </motion.g>

          {/* ── Scan line ── */}
          <ScanLine active={phase === "scanning"} />

          {/* ── Line item brightness bumps during scan ── */}
          {LINE_ITEM_YS.map((y, i) => (
            <ScanHighlightRow
              key={y}
              y={y}
              index={i}
              active={phase === "scanning"}
            />
          ))}


        </svg>

        {/* ── Tear particles (HTML overlay for easier spring physics) ── */}
        {phaseGte("tearing") && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{ overflow: "visible" }}
          >
            {tearParticles.map((p) => (
              <TearParticleEl key={p.id} particle={p} />
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Tagline text ─────────────────────────────────── */}
      <div className="mt-6 text-center">
        <TaglineLine
          text="Pay your share."
          show={phaseGte("text")}
          delayOffset={0}
          skipIntro={skipIntro}
        />
        <TaglineLine
          text="Keep your friends."
          show={phaseGte("text")}
          delayOffset={0.3}
          skipIntro={skipIntro}
        />
      </div>
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────── */

/** The receipt body SVG shapes — glassmorphism + perforated bottom */
function ReceiptBody() {
  // Perforation dots: 12 dots spaced 13px apart, centred on x=6.5..156.5
  // Avoid x=80 (would be split right at tear line), shift slightly
  // Dots at: 7, 20, 33, 46, 59, 72, 88, 101, 114, 127, 140, 153
  const perfDots = [7, 20, 33, 46, 59, 72, 88, 101, 114, 127, 140, 153];

  return (
    <>
      {/* ── Drop shadow (rendered first so it sits beneath) ── */}
      <rect
        x="0" y="8" width={RECEIPT_W} height={192}
        rx="8"
        fill="black"
        fillOpacity="0"
        filter="url(#hero-a-drop-shadow)"
      />

      {/* ── Main receipt body — glassmorphism fill ── */}
      <rect
        x="0" y="8" width={RECEIPT_W} height={192}
        rx="8"
        fill="hsl(155 18% 11% / 0.6)"
      />

      {/* ── Outer border glow — emerald at low opacity ── */}
      <rect
        x="0.5" y="8.5" width={RECEIPT_W - 1} height={191}
        rx="7.5"
        fill="none"
        stroke="hsl(160 64% 52%)"
        strokeWidth="1"
        strokeOpacity="0.15"
      />

      {/* ── Inner white border — glass edge highlight ── */}
      <rect
        x="1" y="9" width={RECEIPT_W - 2} height={190}
        rx="7"
        fill="none"
        stroke="white"
        strokeWidth="0.5"
        strokeOpacity="0.05"
      />

      {/* ── Top inner highlight — simulates light on glass surface ── */}
      <rect
        x="8" y="10" width={RECEIPT_W - 16} height="1"
        rx="0.5"
        fill="white"
        fillOpacity="0.06"
      />

      {/* ── Perforation line at y=176 ── */}
      <line
        x1="0" y1="176" x2={RECEIPT_W} y2="176"
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

      {/* ── Line items — slightly higher opacity + emerald tint on name bars ── */}
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

      {/* ── Divider — dashed, slightly more visible ── */}
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

      {/* ── Total bar — emerald base + pulsing glow overlay ── */}
      <rect x="16" y="155" width="128" height="8" rx="4" fill="hsl(160 64% 52%)" fillOpacity="0.15" />
      {/* Pulsing glow overlay: animates opacity 0→1→0, fillOpacity=0.07 adds ~+0.07 at peak */}
      <rect
        x="14" y="153" width="132" height="12" rx="6"
        fill="hsl(160 64% 52%)"
        fillOpacity="0.07"
        className="receipt-total-pulse"
      />
    </>
  );
}

/** Emerald horizontal scan line that sweeps top→bottom */
function ScanLine({ active }: { active: boolean }) {
  const controls = useAnimationControls();

  useEffect(() => {
    if (active) {
      controls.start({
        y: [10, 198],
        opacity: [1, 1, 0],
        transition: { duration: 0.6, ease: "easeInOut" },
      });
    }
  }, [active, controls]);

  return (
    <motion.rect
      x="12"
      width={RECEIPT_W - 24}
      height="2"
      rx="1"
      fill={EMERALD}
      filter="url(#hero-a-scan-glow)"
      initial={{ y: 10, opacity: 0 }}
      animate={controls}
    />
  );
}

/** Brightness bump overlay for a single line-item row during scanning */
function ScanHighlightRow({
  y,
  active,
}: {
  y: number;
  index: number;
  active: boolean;
}) {
  const controls = useAnimationControls();

  useEffect(() => {
    if (active) {
      // Each row lights up as the scan line passes it
      // The scan takes 600ms to cover y:10→198 (range 188px)
      // Delay proportional to the row's position
      const progress = (y - 10) / 188;
      const delay = progress * 0.6;
      controls.start({
        fillOpacity: [0, 0.12, 0],
        transition: { duration: 0.25, delay, ease: "easeOut" },
      });
    }
  }, [active, controls, y]);

  return (
    <motion.rect
      x="14"
      y={y - 2}
      width={RECEIPT_W - 28}
      height="9"
      rx="2"
      fill={EMERALD}
      initial={{ fillOpacity: 0 }}
      animate={controls}
    />
  );
}

/** A single tear particle that flies outward from center */
function TearParticleEl({ particle }: { particle: TearParticle }) {
  // Particles originate from the center tear line of the receipt
  // Receipt is 160×224, centered in the motion.div
  const originX = RECEIPT_W / 2;
  const originY = RECEIPT_H / 2;

  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: particle.size,
        height: particle.size,
        backgroundColor: EMERALD_HEX,
        left: originX,
        top: originY,
        boxShadow: `0 0 4px ${EMERALD_HEX}`,
      }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{
        x: particle.xOffset,
        y: particle.yOffset,
        opacity: 0,
        scale: 0.3,
        rotate: particle.rotation,
      }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 15,
        opacity: { duration: 0.8, ease: "easeOut" },
      }}
    />
  );
}

/** A tagline line that reveals word-by-word with blur-in from below */
function TaglineLine({
  text,
  show,
  delayOffset,
  skipIntro = false,
}: {
  text: string;
  show: boolean;
  delayOffset: number;
  skipIntro?: boolean;
}) {
  const words = text.split(" ");

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        delayChildren: delayOffset,
        staggerChildren: 0.1,
      },
    },
  };

  const wordVariants = {
    hidden: {
      opacity: 0,
      y: 8,
      filter: "blur(4px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: {
        duration: 0.4,
        ease: [0.22, 1, 0.36, 1] as const,
      },
    },
  };

  return (
    <motion.p
      className="flex justify-center gap-[0.3em] text-lg font-medium tracking-tight text-white/90"
      variants={containerVariants}
      initial={skipIntro ? "visible" : "hidden"}
      animate={show ? "visible" : "hidden"}
    >
      {words.map((word, i) => (
        <motion.span key={i} variants={wordVariants}>
          {word}
        </motion.span>
      ))}
    </motion.p>
  );
}
