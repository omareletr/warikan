export const SAMPLE_W = 160;
export const SAMPLE_H = 90;
export const CHECKS_REQUIRED = 3;
export const DETECTION_INTERVAL_MS = 600;
export const AUTO_CAPTURE_COOLDOWN_MS = 1800;

const EDGE_DENSITY_MIN = 0.055;
const EDGE_DENSITY_MAX = 0.38;
const RECEIPT_CANDIDATE_EDGE_MIN = 0.095;
const RECEIPT_CANDIDATE_EDGE_MAX = 0.3;
const RECEIPT_CANDIDATE_SHARPNESS_MIN = 0.42;
const READY_SCORE = 0.72;
const HOLD_STEADY_SCORE = 0.58;

export type QualityStatus =
  | "searching"
  | "too_dark"
  | "too_bright"
  | "blurry"
  | "too_far"
  | "hold_steady"
  | "ready"
  | "capturing"
  | "processing";

export interface ImageQualityResult {
  score: number;
  status: QualityStatus;
  reasons: string[];
  edgeDensity: number;
  brightness: number;
  darkPixelRatio: number;
  glarePixelRatio: number;
  sharpness: number;
  stability: number;
  gray: Uint8Array;
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function scoreRange(value: number, min: number, idealMin: number, idealMax: number, max: number) {
  if (value < min || value > max) return 0;
  if (value >= idealMin && value <= idealMax) return 1;
  if (value < idealMin) return (value - min) / (idealMin - min);
  return (max - value) / (max - idealMax);
}

export function toGrayscale(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const gray = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    gray[i] = (0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]) | 0;
  }
  return gray;
}

function analyzeEdges(gray: Uint8Array, width: number, height: number) {
  let edgeCount = 0;
  let gradientSum = 0;
  let gradientSqSum = 0;
  let samples = 0;
  const x0 = Math.floor(width * 0.18);
  const x1 = Math.floor(width * 0.82);
  const y0 = Math.floor(height * 0.14);
  const y1 = Math.floor(height * 0.86);

  for (let y = y0 + 1; y < y1 - 1; y += 1) {
    for (let x = x0 + 1; x < x1 - 1; x += 1) {
      const gx =
        -gray[(y - 1) * width + (x - 1)] +
        gray[(y - 1) * width + (x + 1)] -
        2 * gray[y * width + (x - 1)] +
        2 * gray[y * width + (x + 1)] -
        gray[(y + 1) * width + (x - 1)] +
        gray[(y + 1) * width + (x + 1)];
      const gy =
        -gray[(y - 1) * width + (x - 1)] -
        2 * gray[(y - 1) * width + x] -
        gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] +
        2 * gray[(y + 1) * width + x] +
        gray[(y + 1) * width + (x + 1)];
      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > 30) edgeCount += 1;
      gradientSum += mag;
      gradientSqSum += mag * mag;
      samples += 1;
    }
  }

  const mean = samples ? gradientSum / samples : 0;
  const variance = samples ? gradientSqSum / samples - mean * mean : 0;
  return { density: samples ? edgeCount / samples : 0, sharpness: clamp01(Math.sqrt(Math.max(0, variance)) / 85) };
}

function compareStability(gray: Uint8Array, previousGray?: Uint8Array) {
  if (!previousGray || previousGray.length !== gray.length) return 0.65;
  let diff = 0;
  for (let i = 0; i < gray.length; i += 4) diff += Math.abs(gray[i] - previousGray[i]);
  return clamp01(1 - diff / (gray.length / 4) / 32);
}

export function analyzeImageQuality(imageData: ImageData, previousGray?: Uint8Array, barcodeFound = false): ImageQualityResult {
  const { width, height, data } = imageData;
  const gray = toGrayscale(data, width, height);
  const { density, sharpness } = analyzeEdges(gray, width, height);
  const stability = compareStability(gray, previousGray);
  let brightnessSum = 0;
  let darkPixels = 0;
  let glarePixels = 0;

  for (let i = 0; i < gray.length; i += 1) {
    const value = gray[i];
    brightnessSum += value;
    if (value < 48) darkPixels += 1;
    if (value > 238) glarePixels += 1;
  }

  const brightness = brightnessSum / gray.length / 255;
  const darkPixelRatio = darkPixels / gray.length;
  const glarePixelRatio = glarePixels / gray.length;
  const exposureScore = scoreRange(brightness, 0.2, 0.36, 0.72, 0.9);
  const darkScore = clamp01(1 - darkPixelRatio / 0.42);
  const glareScore = clamp01(1 - glarePixelRatio / 0.18);
  const edgeScore = barcodeFound ? 1 : scoreRange(density, 0.025, EDGE_DENSITY_MIN, 0.26, EDGE_DENSITY_MAX);
  const score = clamp01(edgeScore * 0.28 + sharpness * 0.24 + exposureScore * 0.2 + stability * 0.16 + darkScore * 0.07 + glareScore * 0.05);
  const hasReceiptCandidate =
    barcodeFound ||
    (density >= RECEIPT_CANDIDATE_EDGE_MIN &&
      density <= RECEIPT_CANDIDATE_EDGE_MAX &&
      sharpness >= RECEIPT_CANDIDATE_SHARPNESS_MIN);
  const reasons: string[] = [];
  let status: QualityStatus = "searching";

  if (brightness < 0.24 || darkPixelRatio > 0.48) {
    status = "too_dark";
    reasons.push("More light needed");
  } else if (brightness > 0.86 || glarePixelRatio > 0.2) {
    status = "too_bright";
    reasons.push("Reduce glare");
  } else if (!hasReceiptCandidate) {
    status = density >= EDGE_DENSITY_MIN ? "searching" : "too_far";
    reasons.push(density >= EDGE_DENSITY_MIN ? "Find the receipt" : "Move closer");
  } else if (sharpness < 0.34) {
    status = "blurry";
    reasons.push("Hold still");
  } else if (score >= READY_SCORE && stability > 0.58) {
    status = "ready";
    reasons.push("Ready");
  } else if (score >= HOLD_STEADY_SCORE) {
    status = "hold_steady";
    reasons.push("Hold steady");
  } else {
    reasons.push("Find the receipt");
  }

  return { score, status, reasons, edgeDensity: density, brightness, darkPixelRatio, glarePixelRatio, sharpness, stability, gray };
}

export function isQualityReady(result: ImageQualityResult) {
  return result.status === "ready" && result.score >= READY_SCORE && result.stability > 0.58;
}
