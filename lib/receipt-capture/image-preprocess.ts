import { readFileAsBase64, type CapturedPhoto } from "@/lib/platform/camera";

const MAX_DIMENSION = 1800;
const JPEG_QUALITY = 0.88;

function dataUrlToPhoto(dataUrl: string): CapturedPhoto {
  const [header, base64] = dataUrl.split(",");
  const mimeType = header.split(":")[1]?.split(";")[0] ?? "image/jpeg";
  return { base64, mimeType };
}

function getTargetSize(width: number, height: number) {
  const largest = Math.max(width, height);
  if (largest <= MAX_DIMENSION) return { width, height };
  const scale = MAX_DIMENSION / largest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function preprocessCanvas(canvas: HTMLCanvasElement): CapturedPhoto {
  const { width, height } = getTargetSize(canvas.width, canvas.height);
  const output = document.createElement("canvas");
  output.width = width;
  output.height = height;
  const ctx = output.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, width, height);
  return dataUrlToPhoto(output.toDataURL("image/jpeg", JPEG_QUALITY));
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

export async function preprocessBase64Photo(photo: CapturedPhoto): Promise<CapturedPhoto> {
  try {
    const image = await loadImage(`data:${photo.mimeType};base64,${photo.base64}`);
    const { width, height } = getTargetSize(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return photo;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, width, height);
    return dataUrlToPhoto(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
  } catch {
    return photo;
  }
}

export async function preprocessImageFile(file: File): Promise<CapturedPhoto> {
  const original = await readFileAsBase64(file);
  return preprocessBase64Photo(original);
}
