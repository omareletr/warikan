/**
 * Returns a slide offset value that respects RTL direction.
 * In LTR: slide in from the right (positive x).
 * In RTL: slide in from the left (negative x).
 */
export function slideOffset(isRTL: boolean, amount = 20): number {
  return isRTL ? -amount : amount;
}
