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

export default function ScanPage() {
  const router = useRouter();
  const { setImage } = useSplitFlow();
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
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
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
    router.push("/split/review");
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
        const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        lums[i] = lum;
        if (lum > BRIGHT_THRESHOLD) brightCount++;
      }

      const brightPct = brightCount / pixelCount;

      let instability = 0;
      if (prevLumRef.current) {
        for (let i = 0; i < pixelCount; i++) {
          instability += Math.abs(lums[i] - prevLumRef.current[i]);
        }
        instability /= pixelCount;
      }
      prevLumRef.current = lums;

      const detected = brightPct > BRIGHT_PCT_MIN && instability < INSTABILITY_MAX;

      if (detected) {
        consecutiveRef.current += 1;
        setStatus(consecutiveRef.current >= CHECKS_REQUIRED ? "capturing" : "steady");
        if (consecutiveRef.current >= CHECKS_REQUIRED) {
          capture();
        }
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
    try {
      const base64 = await readFileAsBase64(file);
      setImage(base64, file.type);
      router.push("/split/review");
    } catch {
      // ignore
    }
  }

  const bracketColor = status === "steady" || status === "capturing"
    ? "rgba(52, 211, 153, 1)"
    : "rgba(255, 255, 255, 0.4)";

  const statusText = {
    searching: "Point camera at receipt",
    steady: "Hold steady...",
    capturing: "Scanning...",
  }[status];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
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

      {/* Dim vignette */}
      {!permissionDenied && (
        <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black/50 pointer-events-none" />
      )}

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-4">
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 pointer-events-none">
          {/* Corner bracket guide */}
          <div className="relative" style={{ width: 260, height: 340 }}>
            {/* Top-left */}
            <svg style={{ position: "absolute", top: 0, left: 0 }} width="36" height="36">
              <path d="M 2 34 L 2 2 L 34 2" fill="none" stroke={bracketColor} strokeWidth="2.5" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />
            </svg>
            {/* Top-right */}
            <svg style={{ position: "absolute", top: 0, right: 0 }} width="36" height="36">
              <path d="M 2 2 L 34 2 L 34 34" fill="none" stroke={bracketColor} strokeWidth="2.5" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />
            </svg>
            {/* Bottom-left */}
            <svg style={{ position: "absolute", bottom: 0, left: 0 }} width="36" height="36">
              <path d="M 34 34 L 2 34 L 2 2" fill="none" stroke={bracketColor} strokeWidth="2.5" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />
            </svg>
            {/* Bottom-right */}
            <svg style={{ position: "absolute", bottom: 0, right: 0 }} width="36" height="36">
              <path d="M 2 2 L 34 2" fill="none" stroke={bracketColor} strokeWidth="2.5" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />
              <path d="M 34 2 L 34 34" fill="none" stroke={bracketColor} strokeWidth="2.5" strokeLinecap="round" style={{ transition: "stroke 0.3s" }} />
            </svg>

            {/* Scan line when capturing */}
            {status === "capturing" && (
              <motion.div
                className="absolute left-0 right-0 h-px"
                style={{ background: "rgba(52, 211, 153, 0.7)" }}
                initial={{ top: 0 }}
                animate={{ top: "100%" }}
                transition={{ duration: 0.6, ease: "linear" }}
              />
            )}
          </div>

          {/* Status text */}
          <motion.p
            key={status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm font-medium text-white/80"
            style={{
              color: status === "steady" || status === "capturing"
                ? "rgba(52, 211, 153, 0.9)"
                : "rgba(255,255,255,0.7)",
            }}
          >
            {statusText}
          </motion.p>
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center pb-12 pt-6">
        <Button
          variant="ghost"
          className="h-10 gap-2 text-sm text-white/50 hover:text-white/80"
          onClick={() => uploadInputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          Upload photo instead
        </Button>
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
