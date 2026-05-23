/**
 * Platform abstraction layer — re-exports all platform utilities.
 *
 * Import from here rather than the individual sub-modules:
 *   import { hapticTap, isNative, APP_URL } from "@/lib/platform";
 */

export { APP_URL, isNative } from "./config";
export { readFileAsBase64, takeNativePhoto, pickNativePhoto } from "./camera";
export type { CapturedPhoto } from "./camera";
export { hapticTap } from "./haptics";
