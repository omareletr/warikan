"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Camera, ImagePlus, ArrowLeft, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSplitFlow } from "@/lib/split-flow-context";

const DEMO_RECEIPT = {
  restaurantName: "Helmand Palace",
  lineItems: [
    { id: crypto.randomUUID(), name: "Qabelee", quantity: 1, price: 19.99, assignedToIds: [] },
    { id: crypto.randomUUID(), name: "Mourgh Kabab", quantity: 2, price: 16.99, assignedToIds: [] },
    { id: crypto.randomUUID(), name: "Banjan", quantity: 3, price: 8.99, assignedToIds: [] },
    { id: crypto.randomUUID(), name: "Kofta Kabab", quantity: 1, price: 17.99, assignedToIds: [] },
    { id: crypto.randomUUID(), name: "Kaddo", quantity: 1, price: 8.99, assignedToIds: [] },
    { id: crypto.randomUUID(), name: "Bread", quantity: 1, price: 3.99, assignedToIds: [] },
    { id: crypto.randomUUID(), name: "Rice Pudding", quantity: 4, price: 6.99, assignedToIds: [] },
  ],
  fees: [] as { id: string; name: string; amount: number }[],
  taxAmount: 12.07,
  tipAmount: 25.18,
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ScanPage() {
  const router = useRouter();
  const { setImage, setReceiptData } = useSplitFlow();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    try {
      if (!file.type.startsWith("image/")) {
        setError("Please select an image file.");
        return;
      }
      const base64 = await readFileAsBase64(file);
      setImage(base64, file.type);
      router.push("/split/review");
    } catch {
      setError("Couldn't read that file. Try uploading a different photo.");
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <motion.main
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex min-h-dvh flex-col px-6 pt-14 pb-8"
    >
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <h1 className="text-xl font-bold">Scan Receipt</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <p className="text-center text-base text-muted-foreground">
          Take a photo of your receipt or upload one from your gallery.
        </p>
        {error && (
          <p className="w-full max-w-xs rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">{error}</p>
        )}
        <div className="mt-4 flex w-full max-w-xs flex-col gap-4">
          <Button className="h-16 gap-3 rounded-2xl text-base font-semibold" onClick={() => cameraInputRef.current?.click()}>
            <Camera className="h-5 w-5" />
            Take Photo
          </Button>
          <Button variant="outline" className="h-16 gap-3 rounded-2xl text-base font-semibold" onClick={() => uploadInputRef.current?.click()}>
            <ImagePlus className="h-5 w-5" />
            Upload Photo
          </Button>
          <Button
            variant="ghost"
            className="h-12 gap-2 text-base text-muted-foreground"
            onClick={() => {
              setReceiptData(DEMO_RECEIPT);
              router.push("/split/review");
            }}
          >
            <FlaskConical className="h-4 w-4" />
            Load Demo Receipt
          </Button>
        </div>
      </div>

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />
      <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
    </motion.main>
  );
}
