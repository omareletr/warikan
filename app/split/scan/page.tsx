"use client";

import { useEffect } from "react";
import { NativeScanPage } from "@/components/split/scan/native-scan-page";
import { WebScanPage } from "@/components/split/scan/web-scan-page";
import { useSplitFlow } from "@/lib/split-flow-context";
import { isNative } from "@/lib/platform";
import { closeRoomIfActive } from "@/lib/room-client";

export default function ScanPage() {
  const { setImage, reset } = useSplitFlow();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { closeRoomIfActive(); reset(); }, []);

  if (isNative()) return <NativeScanPage setImage={setImage} />;
  return <WebScanPage setImage={setImage} />;
}
