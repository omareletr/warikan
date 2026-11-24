"use client";

import { useState } from "react";
import { isIOSNativePlatform, pickNativePhoto, scanReceiptWithAppleOCR, takeNativePhoto } from "@/lib/platform";
import { preprocessBase64Photo } from "@/lib/receipt-capture/image-preprocess";
import { closeRoomIfActive } from "@/lib/room-client";
import { useSplitFlow } from "@/lib/split-flow-context";

const isCancel = (msg: string) => /cancelled|scan_cancelled|user cancelled/i.test(msg);

function appleOCRErrorMessage(message: string): string {
  if (/no readable receipt text|ocr_empty/i.test(message)) {
    return "No readable receipt text was found. Try Upload Photo instead.";
  }
  return "Apple document scanning is unavailable. Try Upload Photo instead.";
}

/**
 * Native (Capacitor) receipt capture: opens the system scanner or photo picker
 * straight away and loads the result into a fresh split. Resolves true when the
 * caller should go on to the Review page.
 */
export function useNativeCapture() {
  const { setImage, setReceiptText, reset } = useSplitFlow();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(capture: () => Promise<void>, toMessage: (msg: string) => string): Promise<boolean> {
    setError(null);
    setLoading(true);
    try {
      await capture();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!isCancel(msg)) setError(toMessage(msg));
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function loadPhoto(photo: Parameters<typeof preprocessBase64Photo>[0]) {
    const processed = await preprocessBase64Photo(photo);
    closeRoomIfActive();
    reset();
    setImage(processed.base64, processed.mimeType);
  }

  function scan() {
    const isIOS = isIOSNativePlatform();
    return run(async () => {
      if (!isIOS) return loadPhoto(await takeNativePhoto());
      const result = await scanReceiptWithAppleOCR();
      if (!result.text.trim()) throw new Error("No readable receipt text was found.");
      closeRoomIfActive();
      reset();
      setReceiptText(result.text, "apple_ocr");
    }, isIOS ? appleOCRErrorMessage : (msg) => msg);
  }

  function pickPhoto() {
    return run(async () => loadPhoto(await pickNativePhoto()), (msg) => msg);
  }

  return { loading, error, scan, pickPhoto };
}
