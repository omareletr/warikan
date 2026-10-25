import type { MetadataRoute } from "next";

export const dynamic = "force-static";

// PWA manifest — served at /manifest.webmanifest. Dark + emerald brand.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Warikan — Split the bill",
    short_name: "Warikan",
    description: "Split restaurant bills fairly. Scan a receipt, assign dishes, done.",
    start_url: "/",
    display: "standalone",
    background_color: "#0A0F0D",
    theme_color: "#0A0F0D",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
