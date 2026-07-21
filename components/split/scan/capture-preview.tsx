import { ImagePlus, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { photoToDataUrl } from "@/lib/receipt-capture/capture-frame";
import type { ImageQualityResult } from "@/lib/receipt-capture/image-quality";
import type { CapturedPhoto } from "@/lib/platform/camera";

interface CapturePreviewProps {
  photo: CapturedPhoto;
  quality: ImageQualityResult | null;
  onUse: () => void;
  onRetake: () => void;
  onUpload: () => void;
}

export function CapturePreview({ photo, quality, onUse, onRetake, onUpload }: CapturePreviewProps) {
  const warning = quality && quality.status !== "ready" ? quality.reasons[0] : null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black">
      <div className="relative flex-1 overflow-hidden">
        <img src={photoToDataUrl(photo)} alt="Captured receipt preview" className="h-full w-full object-contain" />
        <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-5 pb-10 pt-12">
          <p className="text-sm font-medium text-white/70">Preview</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">Use this photo?</h1>
          {warning && <p className="mt-2 text-sm text-amber-200">{warning}. You can still use it if the receipt is readable.</p>}
        </div>
      </div>
      <div className="border-t border-white/10 bg-black/70 p-4 backdrop-blur-xl">
        <div className="rounded-3xl border border-white/10 bg-white/10 p-4 shadow-lg shadow-black/30">
          <Button className="h-14 w-full rounded-2xl text-base font-semibold" onClick={onUse}>
            <Sparkles className="mr-2 h-5 w-5" />
            Use Photo
          </Button>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={onRetake}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake
            </Button>
            <Button variant="outline" className="h-12 rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10" onClick={onUpload}>
              <ImagePlus className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
