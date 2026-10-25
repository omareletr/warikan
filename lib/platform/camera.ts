/**
 * Platform camera abstraction.
 *
 * On web:  uses the browser FileReader API (called with a File object from
 *          an <input type="file"> or drag-and-drop).
 * On native: uses @capacitor/camera — dynamically imported so the web bundle
 *            is never bloated with native-only code.
 *
 * Both paths resolve to the same shape: { base64: string; mimeType: string }.
 */

export interface CapturedPhoto {
  /** Raw base64 string — no data: URI prefix. */
  base64: string;
  mimeType: string;
}

function imageMimeType(format: string | undefined): string {
  const normalized = (format ?? "jpeg").toLowerCase();
  if (normalized === "jpg" || normalized === "jpeg") return "image/jpeg";
  if (normalized === "png") return "image/png";
  if (normalized === "webp") return "image/webp";
  if (normalized === "heic") return "image/heic";
  if (normalized === "heif") return "image/heif";
  return `image/${normalized}`;
}

/**
 * Read a browser File object as base64. Used on web for both the
 * camera-permission-denied fallback and the upload path.
 */
export function readFileAsBase64(file: File): Promise<CapturedPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const [header, base64] = result.split(",");
      // Extract mime type from data URI header (e.g. "data:image/jpeg;base64")
      const mimeType = header.split(":")[1]?.split(";")[0] ?? file.type;
      resolve({ base64, mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Open the native OS camera and return a photo.
 * Only call this when isNative() === true.
 */
export async function takeNativePhoto(): Promise<CapturedPhoto> {
  const { Camera, CameraSource, CameraResultType } = await import(
    "@capacitor/camera"
  );
  const photo = await Camera.getPhoto({
    source: CameraSource.Camera,
    resultType: CameraResultType.Base64,
    quality: 80,
    correctOrientation: true,
  });
  return {
    base64: photo.base64String!,
    mimeType: imageMimeType(photo.format),
  };
}

/**
 * Open the native photo library picker and return a photo.
 * Only call this when isNative() === true.
 */
export async function pickNativePhoto(): Promise<CapturedPhoto> {
  const { Camera, CameraSource, CameraResultType } = await import(
    "@capacitor/camera"
  );
  const photo = await Camera.getPhoto({
    source: CameraSource.Photos,
    resultType: CameraResultType.Base64,
    quality: 80,
    correctOrientation: true,
  });
  return {
    base64: photo.base64String!,
    mimeType: imageMimeType(photo.format),
  };
}
