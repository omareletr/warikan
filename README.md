# Warikan — Receipt Splitting

> *割り勘 (warikan)* — "going dutch" in Japanese

A mobile web app for splitting restaurant receipts fairly. Photograph a receipt, let AI extract the line items, assign each dish to people, and get everyone's exact share including tax and tip.

**Live app:** [warikan0.netlify.app](https://warikan0.netlify.app)

---

## How It Works

1. **Scan** — Take a photo or upload an image of your receipt; the iOS app uses Apple's native document scanner and on-device OCR
2. **Review** — AI extracts line items with confidence warnings; correct any mistakes and set tax & tip
3. **People** — Add the names of everyone splitting the bill
4. **Assign** — Tap a person, tap their dishes or split individual quantity portions
5. **Summary** — See each person's itemized total
6. **Payment** — Copy amounts or send deep links via Venmo, Cash App, or PayPal

Everything runs in the browser. No account required. Splits are saved to `localStorage`.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui (Radix UI primitives) |
| Animations | Framer Motion |
| Receipt Parsing | Apple VisionKit/Vision OCR on iOS + Google Gemini Flash for structured parsing |
| Native App | Capacitor |
| Deployment | Netlify |

---

## Features

- **Reliable receipt capture** — Camera auto-capture uses image quality checks for light, glare, blur, text edges, and stability before showing a preview
- **Native iOS receipt scanning** — Capacitor iOS uses Apple VisionKit's document scanner and Vision OCR, then sends recognized text to the backend for structured receipt parsing
- **AI receipt parsing** — Receipt photo sent directly to Gemini Flash; returns structured line items with no separate OCR step, plus parser confidence and warnings
- **Flexible tip & tax** — Quick-select tip percentages (15/18/20/25%) or enter a custom amount; tax and tip are prorated proportionally
- **Fees support** — Extra line fees (service charge, delivery fee, etc.) split proportionally
- **Per-portion quantity sharing** — Multi-quantity dishes can be split portion by portion, so one portion can be shared while another is assigned whole
- **Birthday / covered mode** — Mark someone as "covered" and their share is redistributed equally among the rest of the group
- **Live split sessions** — Guests can join by QR/link and claim or share dishes, including individual portions of quantity-based items
- **Multi-payment app support** — Deep links for Venmo, Cash App, and PayPal; shareable QR code encodes all amounts in the URL fragment (no server needed)
- **Split history** — Recent splits saved locally with full per-person breakdown
- **Mobile-first** — Designed for 390px, dark theme only

---

## Project Structure

```
/app
  /page.tsx                    — Home (recent splits list)
  /join/[roomId]/page.tsx      — Guest live split session
  /split/scan/page.tsx         — Camera / photo upload route shell
  /split/review/page.tsx       — Edit line items, set tax & tip
  /split/people/page.tsx       — Add people, toggle birthday mode
  /split/assign/page.tsx       — Assign dishes to people
  /split/summary/page.tsx      — Per-person itemized totals
  /split/payment/page.tsx      — Copy amounts, payment app deep links, QR
  /split/[id]/page.tsx         — View a saved split
  /pay/page.tsx                — QR pay landing page
  /api/parse-receipt/route.ts  — Gemini API endpoint (server-side)
  /api/room/[roomId]/route.ts  — Live split room API
/components
  /ui/                         — shadcn/ui components
  /split/                      — App-specific components
  /split/scan/                 — Scan UI, quality hints, and capture preview
/lib
  /calculate.ts                — Split calculation logic (pure functions)
  /line-items.ts               — Line item quantity/portion normalization helpers
  /payment-apps.ts             — Venmo / Cash App / PayPal deep link builders
  /receipt-capture/            — Camera frame capture, quality scoring, image preprocessing
  /receipt-parsing/            — Gemini parser service, schemas, confidence validation
  /split-flow-context.tsx      — React Context for split flow state
  /splits.ts                   — localStorage read/write for splits
  /types.ts                    — TypeScript interfaces
/ios/App/App
  /ReceiptOCRPlugin.swift      — Capacitor plugin for Apple VisionKit/Vision receipt OCR
  /MainViewController.swift    — Capacitor bridge controller registering app-local native plugins
```

---

## Native iOS

The Capacitor iOS app uses Apple-native receipt capture on the scan screen:

- `VNDocumentCameraViewController` provides Apple's document scanner UI, edge detection, and crop flow.
- `VNRecognizeTextRequest` performs on-device OCR over captured receipt pages.
- The app sends recognized text, not the raw scan image, to `/api/parse-receipt` so Gemini can convert OCR text into line items, tax, fees, and tip.
- Photo-library fallback still uses the image-based parser.

Capacitor 8 requires Node.js `>=22.0.0` for `npm run cap:sync:ios`.

---

## Split Calculation

- Single dishes are divided equally among the people assigned to them
- Quantity-based dishes are split per portion; each portion can be assigned whole or shared among multiple people
- Tax, tip, and fees are prorated: `(person_subtotal / total_subtotal) × (tax + tip + fees)`
- **Covered person:** their total is redistributed equally among all non-covered payers; their own total becomes $0

---

## Deployment

Deployed to Netlify via `@netlify/plugin-nextjs`. Pushing to `staging` deploys to the staging environment. The Gemini API key is set as an environment variable in Netlify and is never exposed to the client.

---

## Roadmap (V2+)

- Firebase Authentication (Google, Apple, Email)
- Cloud sync for splits
- Friends system
- Collaborative real-time splitting via QR session
- Light mode
