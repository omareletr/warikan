import { preprocessCanvas } from "@/lib/receipt-capture/image-preprocess";
import type { CapturedPhoto } from "@/lib/platform/camera";

export const SCAN_FRAME = {
  width: 300,
  height: 480,
  radius: 28,
  topOffset: -24,
} as const;

export function captureVideoFrame(video: HTMLVideoElement): CapturedPhoto {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return preprocessCanvas(canvas);
}

export function photoToDataUrl(photo: CapturedPhoto) {
  return `data:${photo.mimeType};base64,${photo.base64}`;
}
