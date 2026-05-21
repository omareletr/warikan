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
const BRIGHT_PCT_MIN = 0.28;
const INSTABILITY_MAX = 18;
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

const BRACKET_COLOR_IDLE = "rgba(255, 255, 255, 0.4)";
const BRACKET_COLOR_ACTIVE = "rgba(52, 211, 153, 1)";

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
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Off-screen canvases */}
      <canvas ref={sampleCanvasRef} width={SAMPLE_W} height={SAMPLE_H} className="hidden" />
      <canvas ref={captureCanvasRef} className="hidden" />

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

      {/* Scanner frame + status */}
      {!permissionDenied && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-8 pointer-events-none">

          {/* Corner bracket frame — 310×400 */}
          <div className="relative" style={{ width: 310, height: 400 }}>

            {/* Glow pulse wrapper for all 4 corners */}
            {(["tl", "tr", "bl", "br"] as const).map((corner) => (
              <motion.div
                key={corner}
                className="absolute"
                style={{
                  top: corner.startsWith("t") ? 0 : "auto",
                  bottom: corner.startsWith("b") ? 0 : "auto",
                  left: corner.endsWith("l") ? 0 : "auto",
                  right: corner.endsWith("r") ? 0 : "auto",
                }}
                animate={isActive ? {
                  filter: [
                    "drop-shadow(0 0 4px rgba(52,211,153,0.4))",
                    "drop-shadow(0 0 12px rgba(52,211,153,1))",
                    "drop-shadow(0 0 4px rgba(52,211,153,0.4))",
                  ],
                } : { filter: "drop-shadow(0 0 0px transparent)" }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
              >
                <svg width="56" height="56">
                  {corner === "tl" && <path d="M 3 53 L 3 3 L 53 3" fill="none" stroke={bracketColor} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />}
                  {corner === "tr" && <path d="M 3 3 L 53 3 L 53 53" fill="none" stroke={bracketColor} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />}
                  {corner === "bl" && <path d="M 53 53 L 3 53 L 3 3" fill="none" stroke={bracketColor} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />}
                  {corner === "br" && (
                    <>
                      <path d="M 3 53 L 53 53" fill="none" stroke={bracketColor} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />
                      <path d="M 53 3 L 53 53" fill="none" stroke={bracketColor} strokeWidth="3" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />
                    </>
                  )}
                </svg>
              </motion.div>
            ))}

            {/* Gradient scan beam */}
            <AnimatePresence>
              {status === "capturing" && (
                <motion.div
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{
                    height: 44,
                    background: "linear-gradient(to bottom, transparent, rgba(52,211,153,0.55) 40%, rgba(52,211,153,0.55) 60%, transparent)",
                  }}
                  initial={{ top: -44 }}
                  animate={{ top: "100%" }}
                  transition={{ duration: 0.85, ease: "easeInOut", repeat: 1, repeatType: "reverse" }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Status text */}
          <motion.p
            key={status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-medium"
            style={{
              color: isActive ? "rgba(52, 211, 153, 0.95)" : "rgba(255,255,255,0.65)",
            }}
          >
            {statusText}
          </motion.p>
        </div>
      )}

      {/* Bottom bar — liquid glass upload button */}
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
