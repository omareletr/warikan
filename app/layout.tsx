import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono, Noto_Sans_Arabic } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Import all locale messages at build time (server component)
import enMessages from "@/messages/en.json";
import frMessages from "@/messages/fr.json";
import arMessages from "@/messages/ar.json";
import type { AbstractIntlMessages } from "next-intl";
import type { Locale } from "@/lib/locale-context";

const allMessages: Record<Locale, AbstractIntlMessages> = {
  en: enMessages as AbstractIntlMessages,
  fr: frMessages as AbstractIntlMessages,
  ar: arMessages as AbstractIntlMessages,
};

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-syne",
});

// Noto Sans Arabic — loaded for Arabic locale UI text
const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-arabic",
});

const jetbrainsMono = JetBrains_Mono({
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
  userScalable: false,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // lang and dir are set dynamically on the client via LocaleProvider
    // suppressHydrationWarning prevents mismatch warnings
    <html lang="en" dir="ltr" className={`dark ${manrope.variable} ${jetbrainsMono.variable} ${notoSansArabic.variable}`} suppressHydrationWarning>
      <body className={`${manrope.className} min-h-dvh`} suppressHydrationWarning>
        <Providers messages={allMessages}>{children}</Providers>
      </body>
    </html>
  );
}
