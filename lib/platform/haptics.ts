/**
 * Platform haptics abstraction.
 *
 * On web:  uses navigator.vibrate (best-effort, ignored if unsupported).
 * On native: uses @capacitor/haptics for a proper native taptic engine hit.
 */

import { isNative } from "./config";

/**
 * Fire a light haptic tap. Safe to call unconditionally — silently
 * no-ops on platforms where haptics are unavailable.
 */
export async function hapticTap(): Promise<void> {
  if (isNative()) {
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Haptics plugin not available — ignore
    }
  } else {
    navigator.vibrate?.(10);
  }
}
