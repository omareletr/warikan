/**
 * Platform abstraction layer — re-exports all platform utilities.
 *
 * Import from here rather than the individual sub-modules:
 *   import { hapticTap, isNative, APP_URL, apiUrl } from "@/lib/platform";
 */

export { APP_URL, apiUrl, isNative } from "./config";
export { readFileAsBase64, takeNativePhoto, pickNativePhoto } from "./camera";
export type { CapturedPhoto } from "./camera";
export { hapticTap } from "./haptics";
export { isAppleOCRAvailable, scanReceiptWithAppleOCR } from "./receipt-ocr";
export type { AppleReceiptOCRResult } from "./receipt-ocr";
