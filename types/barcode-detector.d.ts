// Ambient type declaration for the Shape Detection API / BarcodeDetector
// https://wicg.github.io/shape-detection-api/#barcode-detection-api
interface BarcodeDetectorOptions {
  formats?: string[];
}

interface DetectedBarcode {
  boundingBox: DOMRectReadOnly;
  rawValue: string;
  format: string;
  cornerPoints: ReadonlyArray<{ x: number; y: number }>;
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  detect(image: ImageBitmapSource | HTMLCanvasElement): Promise<DetectedBarcode[]>;
  static getSupportedFormats(): Promise<string[]>;
}
