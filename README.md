# Warikan — Receipt Splitting

> *割り勘 (warikan)* — "going dutch" in Japanese

A mobile web app for splitting restaurant receipts fairly. Photograph a receipt, let AI extract the line items, assign each dish to people, and get everyone's exact share including tax and tip.

**Live app:** [warikan0.netlify.app](https://warikan0.netlify.app)

---

## How It Works

1. **Scan** — Take a photo or upload an image of your receipt
2. **Review** — AI extracts line items; correct any mistakes and set tax & tip
3. **People** — Add the names of everyone splitting the bill
4. **Assign** — Tap a person, tap their dishes
5. **Summary** — See each person's itemized total
6. **Payment** — Copy amounts or send deep links via Venmo, Cash App, or PayPal

Everything runs in the browser. No account required. Splits are saved to `localStorage`.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui (Radix UI primitives) |
| Animations | Framer Motion |
| Receipt Parsing | Google Gemini Flash (multimodal) |
| Real-time Collab | Firebase (Firestore) |
| API Rate Limiting | Upstash Redis |
| API Validation | Zod |
| Deployment | Netlify |

---

## Features

- **AI receipt parsing** — Receipt photo sent directly to Gemini Flash; returns structured line items with no separate OCR step
- **Advanced receipt scanner** — Full-screen auto-detecting scanner with edge detection, perimeter trace animation, and bracket UI; or upload a photo from your library
- **Live collaborative splitting** — Host shares a QR code or invite link; guests join on their own device, pick their name, and assign their own dishes in real time. Firebase-backed, no account needed
- **Flexible tip & tax** — Quick-select tip percentages (15/18/20/25%) or enter a custom amount; tax and tip are prorated proportionally
- **Fees support** — Extra line fees (service charge, delivery fee, etc.) split proportionally
- **Birthday / covered mode** — Mark someone as "covered" and their share is redistributed equally among the rest of the group
- **Multi-payment app support** — Deep links for Venmo, Cash App, and PayPal; shareable QR code encodes all amounts in the URL fragment (no server needed)
- **Split history** — Recent splits saved locally with full per-person breakdown
- **Mobile-first** — Designed for 390px, dark theme only

---

## Project Structure

```
/app
  /page.tsx                        — Home (recent splits list)
  /join/[roomId]/page.tsx          — Guest join page for collab sessions
  /split/scan/page.tsx             — Camera / photo upload
  /split/review/page.tsx           — Edit line items, set tax & tip
  /split/people/page.tsx           — Add people, toggle birthday mode
  /split/assign/page.tsx           — Assign dishes to people
  /split/summary/page.tsx          — Per-person itemized totals
  /split/payment/page.tsx          — Copy amounts, payment app deep links, QR
  /split/[id]/page.tsx             — View a saved split
  /pay/page.tsx                    — QR pay landing page
  /api/parse-receipt/route.ts      — Gemini API endpoint (server-side)
  /api/room/[roomId]/route.ts      — Room state API (collab)
/components
  /ui/                             — shadcn/ui components
  /split/                          — App-specific components
/lib
  /gemini.ts                       — Gemini API client + receipt parsing prompt
  /calculate.ts                    — Split calculation logic (pure functions)
  /payment-apps.ts                 — Venmo / Cash App / PayPal deep link builders
  /room-client.ts                  — Real-time room client utilities (collab)
  /firebase.ts                     — Firebase init
  /firestore-splits.ts             — Firestore splits persistence
  /split-flow-context.tsx          — React Context for split flow state
  /splits.ts                       — localStorage read/write for splits
  /types.ts                        — TypeScript interfaces
```

---

## Split Calculation

- Each dish's cost is divided equally among the people assigned to it
- Tax, tip, and fees are prorated: `(person_subtotal / total_subtotal) × (tax + tip + fees)`
- **Covered person:** their total is redistributed equally among all non-covered payers; their own total becomes $0

---

## Deployment

Deployed to Netlify via `@netlify/plugin-nextjs`. Pushing to `staging` deploys to the staging environment. The Gemini API key is set as an environment variable in Netlify and is never exposed to the client.

---

## Security

- **Rate limiting** — `/api/parse-receipt` is rate-limited via Upstash Redis to prevent abuse
- **Input validation** — Gemini API responses are validated with Zod before reaching the client
- **Origin gating** — API routes reject requests from unknown origins
- **MIME & size checks** — Image uploads are validated by type and capped at 10 MB
- **Response headers** — Security headers set via `netlify.toml`

---

## Roadmap (V2+)

- Cloud sync for splits
- Friends system
- Light mode
