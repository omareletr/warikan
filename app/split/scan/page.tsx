"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSplitFlow } from "@/lib/split-flow-context";

const SAMPLE_W = 160;
const SAMPLE_H = 90;
const BRIGHT_THRESHOLD = 180;
const BRIGHT_PCT_MIN = 0.45;   // receipt paper is very bright; tightened from 0.28
const INSTABILITY_MAX = 8;     // receipts are flat/still; tightened from 18
const CHECKS_REQUIRED = 2;

type DetectionStatus = "searching" | "steady" | "capturing";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const EMERALD = "rgba(52, 211, 153, 1)";
const BRACKET_COLOR_IDLE = "rgba(255, 255, 255, 0.4)";
const BRACKET_COLOR_ACTIVE = EMERALD;

// Frame dimensions
const FRAME_W = 340;
const FRAME_H = 460;

// Corner path definitions (28px arms, origin at 0,0)
const CORNER_PATHS = {
  tl: "M 0,28 L 0,0 L 28,0",
  tr: "M 0,0 L 28,0 L 28,28",
  bl: "M 0,0 L 0,28 L 28,28",
  br: "M 28,0 L 28,28 L 0,28",
} as const;

// Perimeter: (340 + 460) * 2 = 1600px
const PERIMETER = 1600;

// Overlay darkness
const OVERLAY_BG = "rgba(0,0,0,0.60)";

export default function ScanPage() {
  const router = useRouter();
  const { setImage, reset } = useSplitFlow();

  useEffect(() => { reset(); }, []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const prevLumRef = useRef<Float32Array | null>(null);
  const consecutiveRef = useRef(0);
  const capturedRef = useRef(false);

  const [status, setStatus] = useState<DetectionStatus>("searching");
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Start camera
  useEffect(() => {
    let stream: MediaStream;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setPermissionDenied(true));
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const capture = useCallback(() => {
    if (capturedRef.current || !videoRef.current) return;
    capturedRef.current = true;
    setStatus("capturing");
    const video = videoRef.current;
    const canvas = captureCanvasRef.current!;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
    setImage(base64, "image/jpeg");
    setTimeout(() => router.push("/split/review"), 900);
  }, [setImage, router]);

  // Auto-detection loop
  useEffect(() => {
    if (permissionDenied) return;
    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = sampleCanvasRef.current;
      if (!video || !canvas || video.readyState < 2 || capturedRef.current) return;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
      const { data } = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
      const pixelCount = SAMPLE_W * SAMPLE_H;

      const lums = new Float32Array(pixelCount);
      let brightCount = 0;
      for (let i = 0; i < pixelCount; i++) {
        const lum = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
        lums[i] = lum;
        if (lum > BRIGHT_THRESHOLD) brightCount++;
      }

      let instability = 0;
      if (prevLumRef.current) {
        for (let i = 0; i < pixelCount; i++)
          instability += Math.abs(lums[i] - prevLumRef.current[i]);
        instability /= pixelCount;
      }
      prevLumRef.current = lums;

      const detected = brightCount / pixelCount > BRIGHT_PCT_MIN && instability < INSTABILITY_MAX;

      if (detected) {
        consecutiveRef.current += 1;
        setStatus(consecutiveRef.current >= CHECKS_REQUIRED ? "capturing" : "steady");
        if (consecutiveRef.current >= CHECKS_REQUIRED) capture();
      } else {
        consecutiveRef.current = 0;
        setStatus("searching");
      }
    }, 600);

    return () => clearInterval(interval);
  }, [permissionDenied, capture]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Photo too large. Please upload a photo under 10 MB or use the camera to scan directly.");
      return;
    }
    try {
      const base64 = await readFileAsBase64(file);
      setImage(base64, file.type);
      router.push("/split/review");
    } catch { /* ignore */ }
  }

  const isActive = status !== "searching";
  const bracketColor = isActive ? BRACKET_COLOR_ACTIVE : BRACKET_COLOR_IDLE;

  const statusText = {
    searching: "Point camera at receipt",
    steady: "Hold steady...",
    capturing: "Scanning...",
  }[status];

  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      {/* Live camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        width={1920}
        height={1080}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: "translateZ(0)" }}
      />

      {/* Off-screen canvases */}
      <canvas ref={sampleCanvasRef} width={SAMPLE_W} height={SAMPLE_H} className="hidden" />
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* Dark vignette overlay: 4 strips around the clear scan zone.
          All strips are absolutely positioned relative to the page.
          The centre opening is exactly FRAME_W × FRAME_H, centred on screen. */}
      {!permissionDenied && (
        <div className="absolute inset-0 pointer-events-none">
          {/* Top strip */}
          <div
            className="absolute left-0 right-0 top-0"
            style={{
              background: OVERLAY_BG,
              bottom: `calc(50% + ${FRAME_H / 2}px)`,
            }}
          />
          {/* Bottom strip */}
          <div
            className="absolute left-0 right-0 bottom-0"
            style={{
              background: OVERLAY_BG,
              top: `calc(50% + ${FRAME_H / 2}px)`,
            }}
          />
          {/* Left strip (only the middle band height = frame height) */}
          <div
            className="absolute left-0"
            style={{
              background: OVERLAY_BG,
              top: `calc(50% - ${FRAME_H / 2}px)`,
              bottom: `calc(50% - ${FRAME_H / 2}px)`,
              right: `calc(50% + ${FRAME_W / 2}px)`,
            }}
          />
          {/* Right strip */}
          <div
            className="absolute right-0"
            style={{
              background: OVERLAY_BG,
              top: `calc(50% - ${FRAME_H / 2}px)`,
              bottom: `calc(50% - ${FRAME_H / 2}px)`,
              left: `calc(50% + ${FRAME_W / 2}px)`,
            }}
          />
        </div>
      )}

      {/* Shutter flash on capture */}
      <AnimatePresence>
        {status === "capturing" && (
          <motion.div
            className="absolute inset-0 bg-white pointer-events-none"
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Permission denied overlay */}
      <AnimatePresence>
        {permissionDenied && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/90 px-8 text-center"
          >
            <p className="text-base text-white/70">Camera access is required to scan receipts.</p>
            <Button
              className="h-14 w-full max-w-xs gap-3 rounded-2xl text-base font-semibold"
              onClick={() => uploadInputRef.current?.click()}
            >
              <ImagePlus className="h-5 w-5" />
              Upload a Photo Instead
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center px-4 pt-12 pb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full bg-black/30 text-white backdrop-blur-sm"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      {/* Scanner frame — pinned to true screen centre via absolute + translate */}
      {!permissionDenied && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: "50%",
            left: "50%",
            transform: `translate(-50%, -50%)`,
            width: FRAME_W,
            height: FRAME_H,
          }}
        >
          {/* Frame entrance animation */}
          <motion.div
            className="w-full h-full"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Breathing scale — only when receipt detected */}
            <motion.div
              className="w-full h-full"
              animate={{ scale: isActive ? [1, 1.015, 1] : 1 }}
              transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
            >
              {/* Frame box */}
              <div className="relative" style={{ width: FRAME_W, height: FRAME_H }}>

                {/* Corner brackets + perimeter rings — single SVG, overflow visible for glow */}
                <svg
                  width={FRAME_W}
                  height={FRAME_H}
                  className="absolute inset-0"
                  style={{ overflow: "visible" }}
                >
                  {/* Dim base perimeter ring */}
                  <motion.rect
                    x={0.5} y={0.5} width={FRAME_W - 1} height={FRAME_H - 1} rx={15.5}
                    stroke={EMERALD}
                    strokeWidth="1.5"
                    fill="none"
                    animate={{ strokeOpacity: status === "capturing" ? 0.35 : isActive ? 0.25 : 0 }}
                    transition={{ duration: 0.4 }}
                  />

                  {/* Traveling bright segment */}
                  <motion.rect
                    x={0.5} y={0.5} width={FRAME_W - 1} height={FRAME_H - 1} rx={15.5}
                    stroke={EMERALD}
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray={`60 ${PERIMETER}`}
                    animate={isActive
                      ? { strokeDashoffset: [0, -PERIMETER], strokeOpacity: 1 }
                      : { strokeDashoffset: 0, strokeOpacity: 0 }
                    }
                    transition={isActive
                      ? {
                          strokeDashoffset: { duration: 2.5, ease: "linear", repeat: Infinity },
                          strokeOpacity: { duration: 0.3 },
                        }
                      : { duration: 0.3 }
                    }
                  />

                  {/* Corner brackets — pathLength draw-in with stagger */}
                  {(["tl", "tr", "bl", "br"] as const).map((corner, i) => {
                    const pos = {
                      tl: { x: 0, y: 0 },
                      tr: { x: FRAME_W - 28, y: 0 },
                      bl: { x: 0, y: FRAME_H - 28 },
                      br: { x: FRAME_W - 28, y: FRAME_H - 28 },
                    }[corner];
                    return (
                      <motion.path
                        key={corner}
                        d={CORNER_PATHS[corner]}
                        transform={`translate(${pos.x}, ${pos.y})`}
                        stroke={bracketColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        fill="none"
                        style={{ transition: "stroke 0.3s" }}
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{
                          pathLength: { duration: 0.4, ease: "easeOut", delay: i * 0.06 },
                          opacity: { duration: 0.2, delay: i * 0.06 },
                        }}
                      />
                    );
                  })}
                </svg>

                {/* Gradient scan beam — clipped to frame */}
                {/* translateZ forces GPU compositing so iOS Safari respects overflow-hidden */}
                <div
                  className="absolute inset-0 overflow-hidden rounded-sm pointer-events-none"
                  style={{ willChange: "transform", transform: "translateZ(0)" }}
                >
                  <AnimatePresence>
                    {status === "capturing" && (
                      <motion.div
                        className="absolute left-0 right-0"
                        style={{ top: 0 }}
                        initial={{ y: -60 }}
                        animate={{ y: FRAME_H + 60 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.85, ease: "easeInOut", repeat: 1, repeatType: "reverse" }}
                      >
                        {/* Soft glow halo */}
                        <div
                          style={{
                            height: 40,
                            background: "linear-gradient(to bottom, transparent 0%, rgba(52,211,153,0.35) 30%, rgba(52,211,153,0.35) 70%, transparent 100%)",
                          }}
                        />
                        {/* Sharp core line */}
                        <div
                          style={{
                            height: 2,
                            marginTop: -21,
                            background: EMERALD,
                            filter: "blur(0.5px)",
                            boxShadow: "0 0 8px rgba(52,211,153,0.8), 0 0 16px rgba(52,211,153,0.4)",
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      )}

      {/* Status pill — pinned below the frame, absolutely positioned */}
      {!permissionDenied && (
        <div
          className="absolute pointer-events-none flex justify-center"
          style={{
            top: `calc(50% + ${FRAME_H / 2}px + 24px)`,
            left: 0,
            right: 0,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium backdrop-blur-md"
              style={{
                background: "rgba(0,0,0,0.45)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                style={{ background: isActive ? EMERALD : "rgba(255,255,255,0.4)" }}
                animate={isActive ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span style={{ color: isActive ? "rgba(52, 211, 153, 0.95)" : "rgba(255,255,255,0.65)" }}>
                {statusText}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-12">
        <button
          className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-medium text-white backdrop-blur-md active:scale-95 transition-transform"
          onClick={() => uploadInputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          Upload photo instead
        </button>
      </div>

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
