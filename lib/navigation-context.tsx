"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type Direction = 1 | -1;

const STORAGE_KEY = "warikan_nav_stack";

type NavInfo = {
  direction: { current: Direction };
  skipAnim: { current: boolean };
};

const NavigationContext = createContext<NavInfo>({
  direction: { current: 1 },
  skipAnim: { current: false },
});

// Depth in the linear split flow. Lower number = closer to root.
function flowDepth(path: string): number | null {
  if (path === "/") return 0;
  if (path === "/pay") return 0;
  if (path === "/split/scan") return 1;
  if (path === "/split/review") return 2;
  if (path === "/split/people") return 3;
  if (path === "/split/assign") return 4;
  if (path === "/split/summary") return 5;
  if (path === "/split/payment") return 6;
  if (path.startsWith("/split/") && path.length > "/split/".length) return 1;
  return null;
}

function loadStack(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveStack(stack: string[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stack));
  } catch {
    // private mode etc — direction tracking still works in-memory
  }
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const direction = useRef<Direction>(1);
  const skipAnim = useRef(false);
  const stackRef = useRef<string[] | null>(null);
  const popFlag = useRef(false);

  if (stackRef.current === null) {
    stackRef.current = loadStack();
  }

  useEffect(() => {
    const onPop = () => {
      popFlag.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const stack = stackRef.current;
  const currentTop = stack[stack.length - 1];

  if (stack.length === 0) {
    stack.push(pathname);
    direction.current = 1;
    skipAnim.current = false;
    saveStack(stack);
  } else if (currentTop !== pathname) {
    const oldDepth = currentTop ? flowDepth(currentTop) : null;
    const newDepth = flowDepth(pathname);
    const prevIdx = stack.lastIndexOf(pathname);

    // popstate = browser/iOS handled this navigation natively (swipe-back,
    // browser back button) — we must skip our animation to avoid layering
    // on top of the native one.
    const camefromPopstate = popFlag.current;

    let isBack: boolean;
    if (camefromPopstate) {
      isBack = true;
    } else if (oldDepth !== null && newDepth !== null && oldDepth !== newDepth) {
      isBack = newDepth < oldDepth;
    } else {
      isBack = prevIdx !== -1 && prevIdx < stack.length - 1;
    }

    direction.current = isBack ? -1 : 1;
    skipAnim.current = camefromPopstate;

    if (isBack) {
      if (prevIdx !== -1) {
        stackRef.current = stack.slice(0, prevIdx + 1);
      } else {
        stackRef.current = [pathname];
      }
    } else {
      stackRef.current = [...stack, pathname];
    }
    popFlag.current = false;
    saveStack(stackRef.current);
  }

  return (
    <NavigationContext.Provider value={{ direction, skipAnim }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}

// Back-compat alias retained for components that imported the old hook name.
export function useNavigationDirection() {
  return useContext(NavigationContext).direction;
}
