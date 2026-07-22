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

export function isAppleOCRAvailable(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios";
}

export async function scanReceiptWithAppleOCR(): Promise<AppleReceiptOCRResult> {
  if (!isAppleOCRAvailable()) {
    throw new Error("Apple receipt scanning is only available on iOS.");
  }
  return ReceiptOCR.scanReceipt();
}
