"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

interface SignInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Google "G" logo as inline SVG — no extra dependency needed
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export function SignInSheet({ open, onOpenChange }: SignInSheetProps) {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      await signInWithGoogle();
      onOpenChange(false);
    } catch {
      // user cancelled or error — just reset
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-10">
        <SheetHeader className="mb-8 mt-2 text-center">
          <SheetTitle className="text-3xl font-bold tracking-tight">
            Warikan
          </SheetTitle>
          <SheetDescription className="text-base">
            Sign in to back up your splits and access them on any device.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3">
          <Button
            className="h-14 gap-3 rounded-2xl bg-white text-base font-semibold text-gray-900 hover:bg-gray-100"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <GoogleLogo />
            {loading ? "Signing in…" : "Continue with Google"}
          </Button>

          <SheetClose asChild>
            <Button
              variant="ghost"
              className="h-12 rounded-2xl text-muted-foreground"
            >
              Continue without account
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
