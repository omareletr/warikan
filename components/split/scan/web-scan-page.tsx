"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CapturePreview } from "@/components/split/scan/capture-preview";
import { ScanOverlay } from "@/components/split/scan/scan-overlay";
import { captureVideoFrame } from "@/lib/receipt-capture/capture-frame";
import {
  AUTO_CAPTURE_COOLDOWN_MS,
  CHECKS_REQUIRED,
  DETECTION_INTERVAL_MS,
  SAMPLE_H,
  SAMPLE_W,
  analyzeImageQuality,
  isQualityReady,
  type ImageQualityResult,
  type QualityStatus,
} from "@/lib/receipt-capture/image-quality";
import { preprocessImageFile } from "@/lib/receipt-capture/image-preprocess";
import type { CapturedPhoto } from "@/lib/platform/camera";

interface WebScanPageProps {
  setImage: (base64: string, mimeType: string) => void;
}

export function WebScanPage({ setImage }: WebScanPageProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const consecutiveRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const previousGrayRef = useRef<Uint8Array | undefined>();
  const barcodeDetectorRef = useRef<BarcodeDetector | null>(null);

  const [quality, setQuality] = useState<ImageQualityResult | null>(null);
  const [status, setStatus] = useState<QualityStatus>("searching");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [preview, setPreview] = useState<{ photo: CapturedPhoto; quality: ImageQualityResult | null } | null>(null);

  useEffect(() => {
    if (typeof BarcodeDetector !== "undefined") {
      try {
        barcodeDetectorRef.current = new BarcodeDetector({ formats: ["ean_13", "upc_a", "qr_code", "code_128", "code_39"] });
      } catch {
        barcodeDetectorRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    let stream: MediaStream | undefined;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } })
      .then((s) => {
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setPermissionDenied(true));
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || preview || status === "capturing" || status === "processing") return;
    setStatus("capturing");
    try {
      setPreview({ photo: captureVideoFrame(video), quality });
      cooldownUntilRef.current = Date.now() + AUTO_CAPTURE_COOLDOWN_MS;
    } catch {
      setStatus("searching");
    }
  }, [preview, quality, status]);

  useEffect(() => {
    if (permissionDenied || preview) return;

    const interval = setInterval(async () => {
      const video = videoRef.current;
      const canvas = sampleCanvasRef.current;
      if (!video || !canvas || video.readyState < 2 || video.videoWidth === 0 || Date.now() < cooldownUntilRef.current) return;

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, SAMPLE_W, SAMPLE_H);

      let barcodeFound = false;
      if (barcodeDetectorRef.current) {
        try {
          const codes = await barcodeDetectorRef.current.detect(canvas);
          barcodeFound = codes.length > 0;
        } catch {
          barcodeFound = false;
        }
      }

      const result = analyzeImageQuality(ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H), previousGrayRef.current, barcodeFound);
      previousGrayRef.current = result.gray;
      setQuality(result);
      setStatus(result.status);

      if (isQualityReady(result)) {
        consecutiveRef.current += 1;
        if (consecutiveRef.current >= CHECKS_REQUIRED) capture();
      } else {
        consecutiveRef.current = 0;
      }
    }, DETECTION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [capture, permissionDenied, preview]);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Photo too large. Please upload a photo under 10 MB.");
      e.target.value = "";
      return;
    }
    try {
      setStatus("processing");
      const photo = await preprocessImageFile(file);
      setImage(photo.base64, photo.mimeType);
      router.push("/split/review");
    } catch {
      setStatus("searching");
    } finally {
      e.target.value = "";
    }
  }

  function usePreviewPhoto() {
    if (!preview) return;
    setStatus("processing");
    setImage(preview.photo.base64, preview.photo.mimeType);
    router.push("/split/review");
  }

  function retake() {
    setPreview(null);
    consecutiveRef.current = 0;
    cooldownUntilRef.current = Date.now() + AUTO_CAPTURE_COOLDOWN_MS;
    setStatus("searching");
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      <video ref={videoRef} autoPlay playsInline muted width={1920} height={1080} className="absolute inset-0 h-full w-full object-cover" />
      <canvas ref={sampleCanvasRef} width={SAMPLE_W} height={SAMPLE_H} className="hidden" />
      <ScanOverlay status={status} quality={quality} permissionDenied={permissionDenied} />

      <AnimatePresence>
        {permissionDenied && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/90 px-8 text-center">
            <p className="text-base text-white/70">Camera access is required to scan receipts.</p>
            <Button className="h-14 w-full max-w-xs gap-3 rounded-2xl text-base font-semibold" onClick={() => uploadInputRef.current?.click()}>
              <ImagePlus className="h-5 w-5" />
              Upload a Photo Instead
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute left-0 right-0 top-0 flex items-center px-4 pb-4 pt-12">
        <button aria-label="Go back" className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-xl transition-transform active:scale-95" onClick={() => router.push("/")}>
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      {!permissionDenied && (
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-8">
          <div className="mx-auto flex max-w-sm items-center justify-between rounded-[2rem] border border-white/10 bg-black/40 px-6 py-4 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <button aria-label="Upload photo" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/75 transition-transform active:scale-95" onClick={() => uploadInputRef.current?.click()}>
              <ImagePlus className="h-5 w-5" />
            </button>
            <motion.button
              aria-label="Take photo"
              className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-4 border-white/70 bg-white/15"
              whileTap={{ scale: 0.9 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              onClick={capture}
              disabled={status === "capturing" || status === "processing"}
            >
              <span className="h-12 w-12 rounded-full bg-white" />
            </motion.button>
            <div className="h-12 w-12" aria-hidden="true" />
          </div>
        </div>
      )}

      {preview && <CapturePreview photo={preview.photo} quality={preview.quality} onUse={usePreviewPhoto} onRetake={retake} onUpload={() => uploadInputRef.current?.click()} />}
      <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
    </div>
  );
}
