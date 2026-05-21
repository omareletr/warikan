"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type Direction = 1 | -1;

const NavigationDirectionContext = createContext<{ current: Direction }>({ current: 1 });

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const direction = useRef<Direction>(1);
  const stack = useRef<string[]>([]);
  const popFlag = useRef(false);

  useEffect(() => {
    const onPop = () => {
      popFlag.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  if (stack.current.length === 0) {
    stack.current = [pathname];
    direction.current = 1;
  } else if (stack.current[stack.current.length - 1] !== pathname) {
    const prevIdx = stack.current.lastIndexOf(pathname);
    if (popFlag.current || (prevIdx !== -1 && prevIdx < stack.current.length - 1)) {
      direction.current = -1;
      if (prevIdx !== -1) {
        stack.current = stack.current.slice(0, prevIdx + 1);
      } else {
        stack.current = [pathname];
      }
      popFlag.current = false;
    } else {
      direction.current = 1;
      stack.current = [...stack.current, pathname];
    }
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
