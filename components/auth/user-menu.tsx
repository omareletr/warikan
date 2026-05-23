"use client";

import { useState } from "react";
import { UserCircle2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { SignInSheet } from "@/components/auth/sign-in-sheet";

function UserAvatar({
  photoURL,
  displayName,
  size = 32,
}: {
  photoURL: string | null;
  displayName: string | null;
  size?: number;
}) {
  const initials = displayName
    ? displayName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "?";

  const style = { width: size, height: size, minWidth: size, minHeight: size };

  if (photoURL) {
    return (
      <div
        style={style}
        className="rounded-full ring-2 ring-primary/40 overflow-hidden flex-shrink-0"
      >
        <img
          src={photoURL}
          alt={displayName ?? "User"}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      style={style}
      className="flex items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary ring-2 ring-primary/40"
    >
      {initials}
    </div>
  );
}

export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [signInOpen, setSignInOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Don't render anything while auth state is loading
  if (loading) {
    return <div className="h-11 w-11" />;
  }

  // Signed out — ghost person icon opens sign-in sheet
  if (!user) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => setSignInOpen(true)}
          aria-label="Sign in"
        >
          <UserCircle2 className="h-6 w-6 text-muted-foreground" />
        </Button>
        <SignInSheet open={signInOpen} onOpenChange={setSignInOpen} />
      </>
    );
  }

  // Signed in — avatar opens account sheet
  return (
    <>
      <button
        className="flex h-11 w-11 items-center justify-center rounded-full"
        onClick={() => setMenuOpen(true)}
        aria-label="Account"
      >
        <UserAvatar photoURL={user.photoURL} displayName={user.displayName} />
      </button>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          <SheetHeader className="mb-6 mt-2">
            <div className="flex items-center gap-4">
              <UserAvatar photoURL={user.photoURL} displayName={user.displayName} size={44} />
              <div className="flex flex-col text-left">
                <SheetTitle className="text-base font-semibold">
                  {user.displayName ?? "Signed in"}
                </SheetTitle>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
          </SheetHeader>

          <Separator className="mb-4" />

          <Button
            variant="ghost"
            className="h-12 w-full justify-start gap-3 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={async () => {
              setMenuOpen(false);
              await signOut();
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </SheetContent>
      </Sheet>
    </>
  );
}
