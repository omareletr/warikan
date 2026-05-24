"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ImagePlus, Camera, Receipt, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSplitFlow } from "@/lib/split-flow-context";
import {
  isNative,
  takeNativePhoto,
  pickNativePhoto,
  readFileAsBase64,
} from "@/lib/platform";
import { closeRoomIfActive } from "@/lib/room-client";

// ── Detection constants ───────────────────────────────────────────────────────
const SAMPLE_W = 160;
const SAMPLE_H = 90;
const CHECKS_REQUIRED = 2;
const DETECTION_INTERVAL_MS = 600;

// Sobel edge density thresholds — receipts: ~0.08–0.22, blank surfaces: <0.04
const EDGE_DENSITY_MIN = 0.055;
const EDGE_DENSITY_MAX = 0.38;
// Aspect ratio guard — receipts are taller than wide
const ASPECT_RATIO_MIN = 1.15;
const ASPECT_RATIO_MAX = 5.5;

// ── Visual constants ──────────────────────────────────────────────────────────
const EMERALD = "rgba(52, 211, 153, 1)";
const EMERALD_DIM = "rgba(52, 211, 153, 0.55)";
const BRACKET_COLOR_IDLE = "rgba(255, 255, 255, 0.35)";
const BRACKET_COLOR_ACTIVE = EMERALD;
const OVERLAY_BG = "rgba(0,0,0,0.62)";

// Frame dimensions
const FRAME_W = 300;
const FRAME_H = 480;
const FRAME_R = 16; // border-radius
// Perimeter of rounded rect (approximation good enough for dash): 2*(W+H)
const PERIMETER = 2 * (FRAME_W + FRAME_H);

// Corner bracket arm length
const ARM = 26;

// Corner bracket SVG paths (origin at 0,0)
const CORNER_PATHS = {
  tl: `M 0,${ARM} L 0,0 L ${ARM},0`,
  tr: `M 0,0 L ${ARM},0 L ${ARM},${ARM}`,
  bl: `M 0,0 L 0,${ARM} L ${ARM},${ARM}`,
  br: `M ${ARM},0 L ${ARM},${ARM} L 0,${ARM}`,
} as const;

// Offset for each corner bracket in the SVG
const CORNER_POS = {
  tl: { x: 0, y: 0 },
  tr: { x: FRAME_W - ARM, y: 0 },
  bl: { x: 0, y: FRAME_H - ARM },
  br: { x: FRAME_W - ARM, y: FRAME_H - ARM },
} as const;

// How far each corner translates outward when locked
const CORNER_LOCK_OFFSET = {
  tl: { x: -4, y: -4 },
  tr: { x: 4, y: -4 },
  bl: { x: -4, y: 4 },
  br: { x: 4, y: 4 },
} as const;

type DetectionStatus = "searching" | "steady" | "capturing" | "processing";

// ── Sobel edge detection helpers ──────────────────────────────────────────────

function toGrayscale(data: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const gray = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    gray[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) | 0;
  }
  return gray;
}

/** Returns {density, aspectRatio} of detected edges in the downsampled frame. */
function analyzeEdges(gray: Uint8Array, w: number, h: number): { density: number; aspectRatio: number } {
  let edgeCount = 0;
  let minX = w, maxX = 0, minY = h, maxY = 0;

  // Only analyze the center 60% of the frame to ignore the vignette boundary
  const x0 = Math.floor(w * 0.2), x1 = Math.floor(w * 0.8);
  const y0 = Math.floor(h * 0.2), y1 = Math.floor(h * 0.8);
  const total = (x1 - x0) * (y1 - y0);

  for (let y = y0 + 1; y < y1 - 1; y++) {
    for (let x = x0 + 1; x < x1 - 1; x++) {
      const gx =
        -gray[(y - 1) * w + (x - 1)] + gray[(y - 1) * w + (x + 1)]
        - 2 * gray[y * w + (x - 1)] + 2 * gray[y * w + (x + 1)]
        - gray[(y + 1) * w + (x - 1)] + gray[(y + 1) * w + (x + 1)];
      const gy =
        -gray[(y - 1) * w + (x - 1)] - 2 * gray[(y - 1) * w + x] - gray[(y - 1) * w + (x + 1)]
        + gray[(y + 1) * w + (x - 1)] + 2 * gray[(y + 1) * w + x] + gray[(y + 1) * w + (x + 1)];
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > 30) {
        edgeCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const density = edgeCount / total;
  const edgeW = maxX > minX ? maxX - minX : 0;
  const edgeH = maxY > minY ? maxY - minY : 0;
  const aspectRatio = edgeW > 4 ? edgeH / edgeW : 0;

  return { density, aspectRatio };
}

// ── Native scan page ──────────────────────────────────────────────────────────

function NativeScanPage({
  setImage,
}: {
  setImage: (base64: string, mimeType: string) => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNativeAction(action: "camera" | "library") {
    setError(null);
    setLoading(true);
    try {
      const photo =
        action === "camera" ? await takeNativePhoto() : await pickNativePhoto();
      setImage(photo.base64, photo.mimeType);
      router.push("/split/review");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/cancelled|user cancelled/i.test(msg)) {
        setLoading(false);
        return;
      }
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <div className="flex items-center px-4 pt-12 pb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Receipt className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Scan Receipt</h1>
        <p className="text-base text-muted-foreground">
          Use your camera or photo library
        </p>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20 flex flex-col gap-3">
          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}
          <Button
            className="h-14 w-full gap-3 rounded-2xl text-base font-semibold"
            disabled={loading}
            onClick={() => handleNativeAction("camera")}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
            Take Photo
          </Button>
          <Button
            variant="outline"
            className="h-14 w-full gap-3 rounded-2xl text-base font-semibold"
            disabled={loading}
            onClick={() => handleNativeAction("library")}
          >
            <ImagePlus className="h-5 w-5" />
            Choose from Library
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Web scan page ─────────────────────────────────────────────────────────────

function WebScanPage({
  setImage,
}: {
  setImage: (base64: string, mimeType: string) => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const consecutiveRef = useRef(0);
  const capturedRef = useRef(false);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // BarcodeDetector progressive enhancement
  const barcodeDetectorRef = useRef<BarcodeDetector | null>(null);

  const [status, setStatus] = useState<DetectionStatus>("searching");
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Init BarcodeDetector if available
  useEffect(() => {
    if (typeof BarcodeDetector !== "undefined") {
      try {
        barcodeDetectorRef.current = new BarcodeDetector({
          formats: ["ean_13", "upc_a", "qr_code", "code_128", "code_39"],
        });
      } catch {
        // Not supported — graceful degradation
      }
    }
  }, []);

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
    const base64 = canvas.toDataURL("image/jpeg", 0.82).split(",")[1];
    setImage(base64, "image/jpeg");
    // Brief pause for the capture animation, then transition to processing state
    captureTimerRef.current = setTimeout(() => {
      setStatus("processing");
      captureTimerRef.current = setTimeout(() => router.push("/split/review"), 600);
    }, 550);
  }, [setImage, router]);

  // Clean up capture timers on unmount
  useEffect(() => {
    return () => {
      if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    };
  }, []);

  // Auto-detection loop
  useEffect(() => {
    if (permissionDenied) return;
    const interval = setInterval(async () => {
      const video = videoRef.current;
      const canvas = sampleCanvasRef.current;
      if (!video || !canvas || video.readyState < 2 || capturedRef.current) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);
      const imageData = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H);
      const gray = toGrayscale(imageData.data, SAMPLE_W, SAMPLE_H);
      const { density, aspectRatio } = analyzeEdges(gray, SAMPLE_W, SAMPLE_H);

      // BarcodeDetector: barcode presence is a high-confidence receipt signal.
      // Still requires CHECKS_REQUIRED consecutive frames before capture fires.
      let barcodeFound = false;
      if (barcodeDetectorRef.current) {
        try {
          const codes = await barcodeDetectorRef.current.detect(canvas);
          barcodeFound = codes.length > 0;
        } catch {
          // Ignore detection errors
        }
      }

      const detected =
        barcodeFound ||
        (density > EDGE_DENSITY_MIN &&
          density < EDGE_DENSITY_MAX &&
          aspectRatio > ASPECT_RATIO_MIN &&
          aspectRatio < ASPECT_RATIO_MAX);

      if (detected) {
        consecutiveRef.current += 1;
        if (consecutiveRef.current >= CHECKS_REQUIRED) {
          capture();
        } else {
          setStatus("steady");
        }
      } else {
        consecutiveRef.current = 0;
        setStatus("searching");
      }
    }, DETECTION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [permissionDenied, capture]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Photo too large. Please upload a photo under 10 MB.");
      return;
    }
    try {
      const { base64, mimeType } = await readFileAsBase64(file);
      setImage(base64, mimeType);
      router.push("/split/review");
    } catch { /* ignore */ }
  }

  const isActive = status === "steady" || status === "capturing" || status === "processing";
  const isLocked = status === "capturing" || status === "processing";
  const bracketColor = isActive ? BRACKET_COLOR_ACTIVE : BRACKET_COLOR_IDLE;

  const statusConfig = {
    searching: {
      text: "Point camera at receipt",
      dotColor: "rgba(255,255,255,0.35)",
      textColor: "rgba(255,255,255,0.60)",
      showSpinner: false,
    },
    steady: {
      text: "Hold steady…",
      dotColor: "rgba(251, 191, 36, 1)", // amber
      textColor: "rgba(251, 191, 36, 0.95)",
      showSpinner: false,
    },
    capturing: {
      text: "Scanning…",
      dotColor: EMERALD,
      textColor: "rgba(52, 211, 153, 0.95)",
      showSpinner: false,
    },
    processing: {
      text: "Processing…",
      dotColor: EMERALD,
      textColor: "rgba(52, 211, 153, 0.95)",
      showSpinner: true,
    },
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
      <canvas
        ref={sampleCanvasRef}
        width={SAMPLE_W}
        height={SAMPLE_H}
        className="hidden"
      />
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* Dark vignette overlay — 4 strips around the clear scan zone */}
      {!permissionDenied && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute left-0 right-0 top-0"
            style={{ background: OVERLAY_BG, bottom: `calc(50% + ${FRAME_H / 2}px)` }}
          />
          <div
            className="absolute left-0 right-0 bottom-0"
            style={{ background: OVERLAY_BG, top: `calc(50% + ${FRAME_H / 2}px)` }}
          />
          <div
            className="absolute left-0"
            style={{
              background: OVERLAY_BG,
              top: `calc(50% - ${FRAME_H / 2}px)`,
              bottom: `calc(50% - ${FRAME_H / 2}px)`,
              right: `calc(50% + ${FRAME_W / 2}px)`,
            }}
          />
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
            initial={{ opacity: 0.45 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
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
            <p className="text-base text-white/70">
              Camera access is required to scan receipts.
            </p>
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

      {/* Top bar — back button left, upload button right */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-4">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm active:scale-90 transition-transform"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {!permissionDenied && (
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur-sm active:scale-90 transition-transform"
            onClick={() => uploadInputRef.current?.click()}
          >
            <ImagePlus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Scanner frame — pinned to screen centre */}
      {!permissionDenied && (
        <div
          className="absolute pointer-events-none"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: FRAME_W,
            height: FRAME_H,
          }}
        >
          {/* Frame entrance */}
          <motion.div
            className="w-full h-full"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Processing conic gradient ring — renders behind SVG */}
            <AnimatePresence>
              {status === "processing" && (
                <motion.div
                  className="absolute pointer-events-none"
                  style={{
                    inset: -3,
                    borderRadius: FRAME_R + 3,
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div
                    className="scan-processing-ring w-full h-full"
                    style={{ borderRadius: FRAME_R + 3 }}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* SVG: perimeter ring + corner brackets */}
            <svg
              width={FRAME_W}
              height={FRAME_H}
              className="absolute inset-0"
              style={{ overflow: "visible" }}
            >
              {/* Full perimeter trace — draws in on detection */}
              <motion.rect
                x={0.5} y={0.5}
                width={FRAME_W - 1} height={FRAME_H - 1}
                rx={FRAME_R - 0.5}
                fill="none"
                stroke={EMERALD}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeDasharray={PERIMETER}
                animate={{
                  strokeDashoffset: isActive ? 0 : PERIMETER,
                  strokeOpacity: isLocked ? 0.85 : isActive ? 0.65 : 0,
                }}
                transition={{
                  strokeDashoffset: isActive
                    ? { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
                    : { duration: 0.25 },
                  strokeOpacity: { duration: 0.3 },
                }}
              />

              {/* Corner brackets — draw in on mount, color + translate on lock */}
              {(["tl", "tr", "bl", "br"] as const).map((corner, i) => {
                const pos = CORNER_POS[corner];
                const lockOffset = CORNER_LOCK_OFFSET[corner];
                return (
                  <motion.path
                    key={corner}
                    d={CORNER_PATHS[corner]}
                    stroke={bracketColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                    style={{ transition: "stroke 0.25s" }}
                    initial={{ pathLength: 0, opacity: 0, x: pos.x, y: pos.y }}
                    animate={{
                      pathLength: 1,
                      opacity: 1,
                      x: isLocked ? pos.x + lockOffset.x : pos.x,
                      y: isLocked ? pos.y + lockOffset.y : pos.y,
                    }}
                    transition={{
                      pathLength: { duration: 0.4, ease: "easeOut", delay: i * 0.055 },
                      opacity: { duration: 0.2, delay: i * 0.055 },
                      x: { duration: 0.15, ease: [0.34, 1.56, 0.64, 1] },
                      y: { duration: 0.15, ease: [0.34, 1.56, 0.64, 1] },
                    }}
                  />
                );
              })}
            </svg>

            {/* Scan beam — single downward pass on capture, clipped to frame */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{
                borderRadius: FRAME_R,
                willChange: "transform",
                transform: "translateZ(0)",
              }}
            >
              <AnimatePresence>
                {status === "capturing" && (
                  <motion.div
                    className="absolute left-0 right-0"
                    initial={{ y: -50 }}
                    animate={{ y: FRAME_H + 50 }}
                    exit={{ opacity: 0, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                  >
                    {/* Soft glow halo */}
                    <div
                      style={{
                        height: 44,
                        background:
                          "linear-gradient(to bottom, transparent 0%, rgba(52,211,153,0.28) 25%, rgba(52,211,153,0.28) 75%, transparent 100%)",
                      }}
                    />
                    {/* Sharp core line */}
                    <div
                      style={{
                        height: 1.5,
                        marginTop: -22.75,
                        background: EMERALD,
                        boxShadow: `0 0 6px ${EMERALD}, 0 0 18px ${EMERALD_DIM}`,
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}

      {/* Status pill — pinned below the frame */}
      {!permissionDenied && (
        <div
          className="absolute pointer-events-none flex justify-center"
          style={{
            top: `calc(50% + ${FRAME_H / 2}px + 20px)`,
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
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
            >
              {statusConfig.showSpinner ? (
                <Loader2
                  className="h-3 w-3 animate-spin flex-shrink-0"
                  style={{ color: statusConfig.dotColor }}
                />
              ) : (
                <motion.div
                  className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                  style={{ background: statusConfig.dotColor }}
                  animate={
                    status === "steady"
                      ? { opacity: [1, 0.4, 1] }
                      : status === "searching"
                      ? { opacity: 1 }
                      : { opacity: [1, 0.5, 1] }
                  }
                  transition={{ duration: status === "steady" ? 0.8 : 1.2, repeat: Infinity }}
                />
              )}
              <span style={{ color: statusConfig.textColor }}>
                {statusConfig.text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Bottom bar — shutter button */}
      {!permissionDenied && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-10">
          <motion.button
            className="flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "3px solid rgba(255,255,255,0.55)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            onClick={capture}
            disabled={status === "capturing" || status === "processing"}
          >
            <div
              className="h-11 w-11 rounded-full"
              style={{ background: "rgba(255,255,255,0.9)" }}
            />
          </motion.button>
        </div>
      )}

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

// ── Main export ───────────────────────────────────────────────────────────────

export default function ScanPage() {
  const { setImage, reset } = useSplitFlow();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { closeRoomIfActive(); reset(); }, []);

  if (isNative()) {
    return <NativeScanPage setImage={setImage} />;
  }

  return <WebScanPage setImage={setImage} />;
}
