import type { Metadata, Viewport } from "next";
import { Syne, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
});

export const metadata: Metadata = {
  title: "Warikan",
  description: "Split restaurant bills fairly. Scan a receipt, assign dishes, done.",
};

export const viewport: Viewport = {
  themeColor: "#0A0F0D",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${syne.variable} ${ibmPlexMono.variable}`}>
      <body className={`${syne.className} min-h-dvh`} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
