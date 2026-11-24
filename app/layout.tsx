import type { Metadata, Viewport } from "next";
// Fonts are bundled rather than fetched from Google Fonts at build time:
// next/font/google crashes when Google serves font URLs without an extension,
// which failed production builds on Netlify.
import "@fontsource-variable/manrope";
import "@fontsource-variable/jetbrains-mono";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://warikan.eat"),
  title: "Warikan",
  description: "Split restaurant bills fairly. Scan a receipt, assign dishes, done.",
  applicationName: "Warikan",
  appleWebApp: { capable: true, title: "Warikan", statusBarStyle: "black-translucent" },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0F0D",
  // Lets CSS read the iPhone's safe areas (env(safe-area-inset-*)); layout already clears the status bar.
  viewportFit: "cover",
  // Pinch-zoom stays on for the web (low-vision users); the iOS app locks it so it feels native.
  ...(process.env.NEXT_PUBLIC_NATIVE_BUILD === "true" && { userScalable: false, maximumScale: 1 }),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans min-h-dvh" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
