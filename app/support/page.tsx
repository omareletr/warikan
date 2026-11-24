import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CONTACT_EMAIL } from "@/lib/contact";

const FAQ = [
  {
    q: "The receipt scan got something wrong.",
    a: "You can fix any item, price, tax or tip on the review screen before splitting, or skip the scan and type items yourself.",
  },
  {
    q: "Where are my past splits?",
    a: "Splits are saved only on the device you made them on. Deleting the app, or clearing this site's data in your browser, removes them.",
  },
  {
    q: "A friend can't join my live split.",
    a: "Live splits close 30 minutes after the last change. Start a new one and share the fresh invite link.",
  },
];

export const metadata = { title: "Support · Warikan" };

export default function SupportPage() {
  return (
    <main className="flex min-h-dvh flex-col px-6 pb-8">
      <div className="sticky-header -mx-6 px-6 pt-10 pb-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
            <Link href="/" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <h1 className="text-xl font-bold">Support</h1>
        </div>
      </div>

      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        Found a bug, have a question or an idea? Email me and I&apos;ll get back to you.
      </p>
      <Button className="mt-6 h-12" asChild>
        <a href={`mailto:${CONTACT_EMAIL}?subject=Warikan%20support`}>
          <Mail className="h-5 w-5" /> {CONTACT_EMAIL}
        </a>
      </Button>

      <div className="mt-10 flex flex-col gap-6">
        {FAQ.map((item, i) => (
          <section key={item.q} className="flex flex-col gap-2">
            {i > 0 && <Separator className="mb-4" />}
            <h2 className="text-base font-semibold">{item.q}</h2>
            <p className="text-base leading-relaxed text-muted-foreground">{item.a}</p>
          </section>
        ))}
      </div>

      <Link href="/privacy" className="mt-10 text-sm text-muted-foreground underline-offset-4 hover:underline">
        Privacy Policy
      </Link>
    </main>
  );
}
