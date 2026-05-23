/**
 * Platform configuration.
 *
 * APP_URL is the canonical production URL used to build absolute links
 * (e.g. QR share URLs). In Capacitor, window.location.origin is "file://"
 * or "capacitor://localhost" — neither works for shareable links. Always
 * use APP_URL instead of window.location.origin.
 */

export const APP_URL = "https://warikan0.netlify.app";

/**
 * Returns true when running inside a Capacitor native shell (iOS or Android).
 * Safe to call on the server (always returns false there).
 */
export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  // Capacitor injects window.Capacitor when running inside a native shell.
  return !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor?.isNativePlatform?.();
}
