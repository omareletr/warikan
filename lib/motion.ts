"use client";

import { useReducedMotion, type MotionProps } from "framer-motion";

// Strong ease-out for UI entering the screen
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

// List entrances: 40ms apart, capped so long lists don't keep you waiting
export function staggerDelay(index: number) {
  return Math.min(index, 6) * 0.04;
}

// Small confirmations (checkmarks, badges): grow from 0.6, never from nothing
export const popIn = {
  initial: { scale: 0.6, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  transition: { type: "spring", duration: 0.3, bounce: 0.2 },
} as const;

type PageEnter = Pick<MotionProps, "initial" | "animate" | "transition">;

// Forward navigation: short slide + fade. A full transform string runs on the
// GPU (x/y shorthands don't), but MotionConfig's Reduce Motion doesn't cover
// it, so the preference is checked here. transitionEnd clears the transform so
// fixed bottom bars position against the viewport again.
export function usePageEnter(skip: boolean): PageEnter {
  const reduce = useReducedMotion();
  const transition = { duration: 0.2, ease: EASE_OUT };
  if (reduce) {
    return { initial: skip ? false : { opacity: 0 }, animate: { opacity: 1 }, transition };
  }
  return {
    initial: skip ? false : { opacity: 0, transform: "translateX(12px)" },
    animate: { opacity: 1, transform: "translateX(0px)", transitionEnd: { transform: "none" } },
    transition,
  };
}
