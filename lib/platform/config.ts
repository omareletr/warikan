/**
 * Platform configuration.
 *
 * APP_URL is the canonical URL for the current environment, used to build
 * absolute links (e.g. QR share URLs). Set per-environment via
 * NEXT_PUBLIC_APP_URL in netlify.toml. In Capacitor, window.location.origin
 * is "file://" or "capacitor://localhost" — neither works for shareable
 * links, so always use APP_URL instead of window.location.origin.
 */

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://warikan0.netlify.app";

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
