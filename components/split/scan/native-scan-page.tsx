"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, ImagePlus, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pickNativePhoto, takeNativePhoto } from "@/lib/platform";
import { preprocessBase64Photo } from "@/lib/receipt-capture/image-preprocess";

interface NativeScanPageProps {
  setImage: (base64: string, mimeType: string) => void;
}

export function NativeScanPage({ setImage }: NativeScanPageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNativeAction(action: "camera" | "library") {
    setError(null);
    setLoading(true);
    try {
      const photo = action === "camera" ? await takeNativePhoto() : await pickNativePhoto();
      const processed = await preprocessBase64Photo(photo);
      setImage(processed.base64, processed.mimeType);
      router.push("/split/review");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/cancelled|user cancelled/i.test(msg)) {
        setLoading(false);
        return;
      }
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex items-center px-4 pb-4 pt-12">
        <Button variant="ghost" size="icon" className="h-11 w-11 rounded-full" aria-label="Go back" onClick={() => router.push("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Receipt className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">Scan Receipt</h1>
        <p className="text-base text-muted-foreground">Use your camera or photo library</p>
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4">
        <div className="flex flex-col gap-3 rounded-3xl border border-border/30 bg-card/80 p-5 shadow-lg shadow-black/20 backdrop-blur-xl">
          {error && <p className="text-center text-sm text-destructive">{error}</p>}
          <Button className="h-14 w-full gap-3 rounded-2xl text-base font-semibold" disabled={loading} onClick={() => handleNativeAction("camera")}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            Take Photo
          </Button>
          <Button variant="outline" className="h-14 w-full gap-3 rounded-2xl text-base font-semibold" disabled={loading} onClick={() => handleNativeAction("library")}>
            <ImagePlus className="h-5 w-5" />
            Choose from Library
          </Button>
        </div>
      </div>
    </div>
  );
}
