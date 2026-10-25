import { Capacitor, registerPlugin } from "@capacitor/core";

export interface AppleReceiptOCRResult {
  text: string;
  pages: number;
  confidence?: number;
  warnings?: string[];
}

interface ReceiptOCRPlugin {
  scanReceipt(): Promise<AppleReceiptOCRResult>;
}

const ReceiptOCR = registerPlugin<ReceiptOCRPlugin>("ReceiptOCR");

export function isIOSNativePlatform(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export function isAppleOCRAvailable(): boolean {
  return isIOSNativePlatform();
}

export async function scanReceiptWithAppleOCR(): Promise<AppleReceiptOCRResult> {
  if (!isIOSNativePlatform()) {
    throw new Error("Apple receipt scanning is only available on iOS.");
  }
  return ReceiptOCR.scanReceipt();
}
