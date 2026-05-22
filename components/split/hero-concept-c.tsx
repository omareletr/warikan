"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

/* ─── Types ─────────────────────────────────────────────── */

interface HeroConceptCProps {
  onReady?: () => void;
}

type Phase =
  | "hidden"
  | "aurora"
  | "wireframe"
  | "split"
  | "text"
  | "shimmer"
  | "done";

/* ─── Constants ─────────────────────────────────────────── */

const EMERALD = "hsl(160 64% 52%)";
const EMERALD_HEX = "#10B981";
const RECEIPT_VB_W = 160;
const RECEIPT_VB_H = 224;
const RECEIPT_RENDER_W = 120;
const RECEIPT_RENDER_H = 168;

/* ─── Phase helper ──────────────────────────────────────── */

const PHASE_ORDER: Phase[] = [
  "hidden",
  "aurora",
  "wireframe",
  "split",
  "text",
  "shimmer",
  "done",
];

function phaseGte(current: Phase, target: Phase): boolean {
  return PHASE_ORDER.indexOf(current) >= PHASE_ORDER.indexOf(target);
}

/* ─── Text data ─────────────────────────────────────────── */

const LINE_1_WORDS = ["Pay", "your", "share."];
const LINE_2_WORDS = ["Keep", "your", "friends."];
const ALL_WORDS = [...LINE_1_WORDS, ...LINE_2_WORDS];

/* ─── Component ─────────────────────────────────────────── */

export function HeroConceptC({ onReady }: HeroConceptCProps) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  /* Stable noise filter ID */
  const noiseId = useMemo(() => "hero-c-noise", []);
  const glowId = useMemo(() => "hero-c-glow", []);

  /* Phase sequencing */
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const t = (fn: () => void, ms: number) => {
      timers.push(setTimeout(fn, ms));
    };

    t(() => setPhase("aurora"), 50); // Phase 1: aurora fade in
    t(() => setPhase("wireframe"), 400); // Phase 2: wireframe draws
    t(() => setPhase("split"), 1400); // Phase 3: receipt splits
    t(() => setPhase("text"), 1800); // Phase 4: text reveal
    t(() => setPhase("shimmer"), 2700); // Phase 4b: shimmer sweep
    t(() => {
      setPhase("done");
      onReadyRef.current?.();
    }, 3300);

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className="hero-c-root relative flex flex-col items-center justify-center overflow-hidden"
      style={{ width: 320, height: 360 }}
    >
      {/* ── SVG definitions (noise filter + glow) ──────── */}
      <svg
        className="absolute"
        width="0"
        height="0"
        aria-hidden="true"
      >
        <defs>
          <filter id={noiseId}>
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves="4"
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* ── Aurora background layer ────────────────────── */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={phaseGte(phase, "aurora") ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {/* Primary aurora orb — rotating conic gradient */}
        <div
          className="absolute"
          style={{
            width: 400,
            height: 400,
            top: "50%",
            left: "50%",
            marginLeft: -200,
            marginTop: -220,
          }}
        >
          <motion.div
            className="h-full w-full rounded-full"
            style={{
              background: `conic-gradient(
                from 0deg,
                hsl(160 64% 15%),
                hsl(175 50% 10%),
                hsl(150 25% 4%),
                hsl(185 40% 12%),
                hsl(160 64% 15%)
              )`,
              filter: "blur(100px)",
              opacity: 0.4,
            }}
            animate={{ rotate: [0, 360] }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </div>

        {/* Secondary pulsing orb */}
        <div
          className="absolute"
          style={{
            width: 200,
            height: 200,
            top: "30%",
            left: "65%",
            marginLeft: -100,
            marginTop: -100,
          }}
        >
          <motion.div
            className="h-full w-full rounded-full"
            style={{
              background: `radial-gradient(circle, hsl(175 50% 15%) 0%, transparent 70%)`,
              filter: "blur(60px)",
            }}
            animate={{
              scale: [0.8, 1.2, 0.8],
              opacity: [0.1, 0.2, 0.1],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        {/* Noise texture overlay */}
        <div
          className="absolute inset-0"
          style={{
            filter: `url(#${noiseId})`,
            opacity: 0.04,
            mixBlendMode: "overlay",
          }}
        />
      </motion.div>

      {/* ── Receipt wireframe area ─────────────────────── */}
      <div className="relative" style={{ marginTop: -20 }}>
        {/* Center light pulse on split */}
        {phaseGte(phase, "split") && (
          <motion.div
            className="pointer-events-none absolute"
            style={{
              width: 40,
              height: 40,
              top: "50%",
              left: "50%",
              marginLeft: -20,
              marginTop: -20,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${EMERALD_HEX}44 0%, transparent 70%)`,
            }}
            initial={{ scale: 0, opacity: 0.25 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        )}

        <div className="flex items-center justify-center">
          {/* Left half */}
          <motion.div
            animate={
              phaseGte(phase, "split")
                ? { x: -20, rotate: -1.5 }
                : { x: 0, rotate: 0 }
            }
            transition={{
              type: "spring",
              stiffness: 80,
              damping: 20,
            }}
          >
            <motion.div
              animate={
                phaseGte(phase, "done")
                  ? { y: [0, -2, 0, 2, 0] }
                  : {}
              }
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <ReceiptWireframe
                phase={phase}
                half="left"
                noiseId={noiseId}
                glowId={glowId}
              />
            </motion.div>
          </motion.div>

          {/* Right half */}
          <motion.div
            style={{ marginLeft: -RECEIPT_RENDER_W }}
            animate={
              phaseGte(phase, "split")
                ? { x: 20, rotate: 1.5 }
                : { x: 0, rotate: 0 }
            }
            transition={{
              type: "spring",
              stiffness: 80,
              damping: 20,
            }}
          >
            <motion.div
              animate={
                phaseGte(phase, "done")
                  ? { y: [0, 2, 0, -2, 0] }
                  : {}
              }
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <ReceiptWireframe
                phase={phase}
                half="right"
                noiseId={noiseId}
                glowId={glowId}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Scissor icon at center split line */}
        <motion.div
          className="pointer-events-none absolute"
          style={{
            top: "50%",
            left: "50%",
            marginLeft: -8,
            marginTop: -8,
          }}
          initial={{ opacity: 0 }}
          animate={
            phaseGte(phase, "wireframe") && !phaseGte(phase, "split")
              ? { opacity: 0.5 }
              : { opacity: 0 }
          }
          transition={{ duration: 0.3 }}
        >
          <ScissorIcon />
        </motion.div>
      </div>

      {/* ── Text reveal — the star of the show ─────────── */}
      <div className="relative mt-6 text-center" style={{ minHeight: 64 }}>
        {/* Line 1 */}
        <div className="flex justify-center gap-[0.3em]">
          {LINE_1_WORDS.map((word, i) => (
            <WordReveal
              key={`l1-${i}`}
              word={word}
              show={phaseGte(phase, "text")}
              delay={i * 0.12}
            />
          ))}
        </div>

        {/* Line 2 */}
        <div className="mt-1 flex justify-center gap-[0.3em]">
          {LINE_2_WORDS.map((word, i) => (
            <WordReveal
              key={`l2-${i}`}
              word={word}
              show={phaseGte(phase, "text")}
              delay={(LINE_1_WORDS.length + i) * 0.12}
            />
          ))}
        </div>

        {/* Shimmer sweep overlay */}
        {phaseGte(phase, "shimmer") && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, black 20%, black 80%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black 20%, black 80%, transparent 100%)",
            }}
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ────────────────────────────────────── */

/** Minimal wireframe receipt SVG with pathLength draw animation */
function ReceiptWireframe({
  phase,
  half,
  noiseId,
  glowId,
}: {
  phase: Phase;
  half: "left" | "right";
  noiseId: string;
  glowId: string;
}) {
  const clipId = `hero-c-clip-${half}`;
  const showOutline = phaseGte(phase, "wireframe");
  const showInterior = phaseGte(phase, "wireframe");

  /* Interior lines fade in staggered after outline starts drawing */
  const interiorLines = useMemo(
    () => [
      { y: 52, x2: 110 },
      { y: 78, x2: 110 },
      { y: 104, x2: 110 },
      { y: 140, x2: 90 },
    ],
    [],
  );

  return (
    <svg
      width={RECEIPT_RENDER_W}
      height={RECEIPT_RENDER_H}
      viewBox={`0 0 ${RECEIPT_VB_W} ${RECEIPT_VB_H}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{
        overflow: "visible",
        filter: `drop-shadow(0 0 20px rgba(52,211,153,0.15))`,
      }}
    >
      <defs>
        <clipPath id={clipId}>
          {half === "left" ? (
            <rect x="-10" y="-10" width="90" height="244" />
          ) : (
            <rect x="80" y="-10" width="90" height="244" />
          )}
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        {/* Scalloped outline — draws itself via pathLength */}
        <motion.path
          d="M0,16 Q10,4 20,16 Q30,4 40,16 Q50,4 60,16 Q70,4 80,16 Q90,4 100,16 Q110,4 120,16 Q130,4 140,16 Q150,4 160,16 L160,208 Q150,220 140,208 Q130,220 120,208 Q110,220 100,208 Q90,220 80,208 Q70,220 60,208 Q50,220 40,208 Q30,220 20,208 Q10,220 0,208 Z"
          fill="none"
          stroke={EMERALD}
          strokeWidth={0.75}
          strokeOpacity={0.3}
          initial={{ pathLength: 0 }}
          animate={showOutline ? { pathLength: 1 } : {}}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />

        {/* Interior lines */}
        {interiorLines.map((line, i) => (
          <motion.line
            key={`line-${i}`}
            x1={16}
            y1={line.y}
            x2={line.x2}
            y2={line.y}
            stroke={EMERALD}
            strokeWidth={0.5}
            strokeOpacity={0.25}
            initial={{ opacity: 0 }}
            animate={showInterior ? { opacity: 1 } : {}}
            transition={{
              duration: 0.3,
              delay: 0.4 + i * 0.08,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Total line — thicker */}
        <motion.line
          x1={16}
          y1={160}
          x2={144}
          y2={160}
          stroke={EMERALD}
          strokeWidth={1.5}
          strokeOpacity={0.25}
          initial={{ opacity: 0 }}
          animate={showInterior ? { opacity: 1 } : {}}
          transition={{
            duration: 0.3,
            delay: 0.7,
            ease: "easeOut",
          }}
        />

        {/* Dashed scissor line at center */}
        <motion.line
          x1={0}
          y1={112}
          x2={160}
          y2={112}
          stroke={EMERALD}
          strokeWidth={0.5}
          strokeOpacity={0.3}
          strokeDasharray="4 4"
          initial={{ opacity: 0 }}
          animate={
            phaseGte(phase, "wireframe") && !phaseGte(phase, "split")
              ? { opacity: 1 }
              : { opacity: 0 }
          }
          transition={{ duration: 0.3, delay: 0.6 }}
        />
      </g>
    </svg>
  );
}

/** Small scissors icon — two circles with crossing blades */
function ScissorIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Left handle */}
      <circle
        cx={4}
        cy={4}
        r={2.5}
        stroke={EMERALD}
        strokeWidth={0.8}
        strokeOpacity={0.5}
      />
      {/* Right handle */}
      <circle
        cx={4}
        cy={12}
        r={2.5}
        stroke={EMERALD}
        strokeWidth={0.8}
        strokeOpacity={0.5}
      />
      {/* Left blade */}
      <line
        x1={6}
        y1={5}
        x2={14}
        y2={11}
        stroke={EMERALD}
        strokeWidth={0.8}
        strokeOpacity={0.5}
        strokeLinecap="round"
      />
      {/* Right blade */}
      <line
        x1={6}
        y1={11}
        x2={14}
        y2={5}
        stroke={EMERALD}
        strokeWidth={0.8}
        strokeOpacity={0.5}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A single word that fades in with blur-up effect */
function WordReveal({
  word,
  show,
  delay,
}: {
  word: string;
  show: boolean;
  delay: number;
}) {
  return (
    <motion.span
      className="hero-c-text inline-block bg-gradient-to-r from-emerald-300 via-white to-emerald-300 bg-clip-text text-2xl font-semibold tracking-tight text-transparent"
      initial={{ opacity: 0, filter: "blur(10px)", y: 12 }}
      animate={
        show
          ? { opacity: 1, filter: "blur(0px)", y: 0 }
          : {}
      }
      transition={{
        type: "spring",
        stiffness: 150,
        damping: 25,
        delay,
      }}
    >
      {word}
    </motion.span>
  );
}
