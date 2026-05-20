import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { Providers } from "@/components/providers";
import "./globals.css";

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
    <html lang="en" className={`dark ${GeistSans.variable}`}>
      <body className={`${GeistSans.className} min-h-dvh`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
