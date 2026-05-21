"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type Direction = 1 | -1;

const STORAGE_KEY = "warikan_nav_stack";

const NavigationDirectionContext = createContext<{ current: Direction }>({ current: 1 });

// Depth in the linear split flow. Lower number = closer to root.
// When navigating between two known-depth routes, the depth comparison is
// the source of truth (handles deep links, refreshes, and router.replace).
function flowDepth(path: string): number | null {
  if (path === "/") return 0;
  if (path === "/pay") return 0;
  if (path === "/split/scan") return 1;
  if (path === "/split/review") return 2;
  if (path === "/split/people") return 3;
  if (path === "/split/assign") return 4;
  if (path === "/split/summary") return 5;
  if (path === "/split/payment") return 6;
  // /split/[id] — saved split detail, reached from Home
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
    // session storage can fail in private mode; direction tracking still works in-memory
  }
}

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const direction = useRef<Direction>(1);
  const stackRef = useRef<string[] | null>(null);
  const popFlag = useRef(false);

  // Lazy-init stack from sessionStorage so refreshes preserve history
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
    saveStack(stack);
  } else if (currentTop !== pathname) {
    const oldDepth = currentTop ? flowDepth(currentTop) : null;
    const newDepth = flowDepth(pathname);
    const prevIdx = stack.lastIndexOf(pathname);

    let isBack: boolean;
    if (popFlag.current) {
      isBack = true;
    } else if (oldDepth !== null && newDepth !== null && oldDepth !== newDepth) {
      // Both routes are in the known flow — depth comparison is authoritative
      isBack = newDepth < oldDepth;
    } else {
      // Unknown route or same depth — fall back to stack lookup
      isBack = prevIdx !== -1 && prevIdx < stack.length - 1;
    }

    direction.current = isBack ? -1 : 1;

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
    <NavigationDirectionContext.Provider value={direction}>
      {children}
    </NavigationDirectionContext.Provider>
  );
}

export function useNavigationDirection() {
  return useContext(NavigationDirectionContext);
}
