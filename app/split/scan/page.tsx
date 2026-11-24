"use client";

import { useEffect } from "react";
import { WebScanPage } from "@/components/split/scan/web-scan-page";
import { useSplitFlow } from "@/lib/split-flow-context";
import { closeRoomIfActive } from "@/lib/room-client";

// Web only: the native app opens the system scanner straight from Home (lib/use-native-capture.ts).
export default function ScanPage() {
  const { setImage, reset } = useSplitFlow();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { closeRoomIfActive(); reset(); }, []);

  return <WebScanPage setImage={setImage} />;
}
