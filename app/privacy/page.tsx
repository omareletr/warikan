import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CONTACT_EMAIL } from "@/lib/contact";

const LAST_UPDATED = "October 25, 2026";

const SECTIONS: { title: string; body: React.ReactNode }[] = [
  {
    title: "The short version",
    body: "Warikan has no accounts, ads, analytics or tracking, and never sells data. Your splits stay on your device. The only things that leave it are the receipt you ask us to read and any live split or payment link you choose to share.",
  },
  {
    title: "Splits on your device",
    body: "Splits, names and amounts are saved only in the app's storage on your device. Deleting the app, or clearing this site's data in your browser, removes them.",
  },
  {
    title: "Reading receipts with AI",
    body: (
      <>
        With your permission, Warikan sends the receipt photo, or on iPhone the text your phone read
        from it, through our server to Google Gemini to pull out items and prices. We don&apos;t store
        the receipt. Google processes it under the{" "}
        <a href="https://ai.google.dev/gemini-api/terms" className="text-primary underline-offset-4 hover:underline">
          Gemini API terms
        </a>
        . You can always skip this and type items yourself.
      </>
    ),
  },
  {
    title: "Live splits with friends",
    body: "When you invite friends to a live split, the restaurant, items, prices and names in it are stored on our server so everyone can see them. Anyone with the invite link can view the split. It is deleted 30 minutes after the last change.",
  },
  {
    title: "Payment links",
    body: "Payment links and QR codes carry names and amounts inside the link itself, so anyone you share them with can see those. Opening Venmo, Cash App or PayPal hands you to that app; Warikan never handles payments.",
  },
  {
    title: "Server logs and abuse limits",
    body: "To stop abuse, our server uses your IP address to count receipt scans for about an hour. Our host, Netlify, keeps standard server logs, which can include your IP address and short diagnostic excerpts of a parsed receipt.",
  },
  {
    title: "Children",
    body: "Warikan isn't directed at children under 13 and doesn't knowingly collect their information.",
  },
  {
    title: "Changes and contact",
    body: (
      <>
        We&apos;ll update this page if anything changes. Questions or requests:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline-offset-4 hover:underline">
          {CONTACT_EMAIL}
        </a>
        .
      </>
    ),
  },
];

export const metadata = { title: "Privacy Policy · Warikan" };

export default function PrivacyPage() {
  return (
    <main className="flex min-h-dvh flex-col px-6 pb-8">
      <div className="sticky-header -mx-6 px-6 pt-10 pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
            <Link href="/" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-xl font-bold">Privacy Policy</h1>
        </div>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">Last updated {LAST_UPDATED}</p>

      <div className="mt-6 flex flex-col gap-6">
        {SECTIONS.map((section, i) => (
          <section key={section.title} className="flex flex-col gap-2">
            {i > 0 && <Separator className="mb-4" />}
            <h2 className="text-base font-semibold">{section.title}</h2>
            <p className="text-base leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
