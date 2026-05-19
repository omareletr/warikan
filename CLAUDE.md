# Warikan — Receipt Splitting Web App

## What This App Does
Warikan helps groups split restaurant receipts fairly. A user photographs a receipt, the app extracts line items using AI, users assign each dish to people, and the app calculates each person's share including tax and tip. The name means "going dutch" in Japanese.

## Current State
This project was originally built as a SwiftUI iOS app. It is being pivoted to a Next.js web app. The Swift files in /Warikan/ are the old iOS codebase — do not modify or delete them. The web app lives in the project root.

Firebase Auth is already configured — the Firebase project exists and GoogleService-Info.plist (iOS config) is in /Warikan/. The web app needs the Firebase web config from the same project (see /lib/firebase.ts).

## Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui as base, customized to match design system
- **Auth:** Firebase Authentication (Google, Apple, Email — optional, app works without account)
- **Receipt Parsing:** Google Gemini Flash API (multimodal — send receipt image directly, returns structured JSON, no separate OCR step)
- **Deployment:** Netlify
- **Package Manager:** npm

## V1 Scope — Core Split Loop Only
Build ONLY these screens in this order. Nothing else until these are solid:

1. **HomePage** — "Start Split" button + list of past splits (localStorage for now)
2. **ScanPage** — Camera capture or photo upload (browser MediaDevices API / file input)
3. **ReviewPage** — Display parsed line items from Gemini, let user correct mistakes, enter tax & tip
4. **PeoplePage** — Add names of people splitting the bill (simple text input, no friends system)
5. **AssignPage** — Assign each dish to one or more people (tap person, tap dishes)
6. **SummaryPage** — Show each person's total with itemized breakdown
7. **PaymentPage** — Show amounts owed with copy-to-clipboard for each person

### Explicitly NOT in V1 Web
- No Firebase Auth (add in V2 — for now everything is local/anonymous)
- No friends system
- No collaborative QR sessions
- No deep links to Venmo/Cash App/PayPal/Zelle (just copy amount)
- No share links
- No profile or account system
- No cloud sync (splits saved to localStorage only)

## Core User Flow
```
HomePage → ScanPage → ReviewPage → PeoplePage → AssignPage → SummaryPage → PaymentPage → HomePage
```
Linear flow. Each step has a back button. Cancel at any point discards everything.

## Data Models (TypeScript)
```typescript
interface LineItem {
  id: string;
  name: string;
  price: number;
  assignedToIds: string[];
}

interface Fee {
  id: string;
  name: string;
  amount: number;
}

interface Person {
  id: string;
  name: string;
}

interface Split {
  id: string;
  date: string;
  restaurantName?: string;
  lineItems: LineItem[];
  fees: Fee[];
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  people: Person[];
}
```

## Gemini Integration
Receipt parsing is a single API call. Send the photo as a base64 image to Gemini Flash (multimodal). The prompt and parsing logic live in /lib/gemini.ts.

The prompt should ask Gemini to return JSON in this shape:
```json
{
  "restaurantName": "string or null",
  "lineItems": [{ "name": "string", "price": number }],
  "taxAmount": number or null,
  "fees": [{ "name": "string", "amount": number }],
  "tipAmount": number or null
}
```

Gemini API key goes in .env.local as GEMINI_API_KEY. Never commit it.
The API call happens server-side via a Next.js API route at /app/api/parse-receipt/route.ts.

## Split Calculation Logic
- Each dish's cost is divided equally among all people assigned to it
- Tax is prorated proportionally based on each person's subtotal vs overall subtotal
- Tip is prorated the same way
- Fees are prorated the same way
- Formula per person: (their_subtotal / overall_subtotal) × (tax + tip + total_fees) + their_subtotal

## Design System

### Philosophy
shadcn/ui defaults with an emerald green accent. Clean, modern, functional. Let the component library do the heavy lifting — minimal custom styling.

### Colors
Driven by CSS variables in `app/globals.css` using the standard shadcn/ui system:
- **Primary (accent):** Emerald green `#10B981` — used for primary buttons, links, active states, key amounts
- **Neutrals:** shadcn slate defaults for background, foreground, muted, card, border, input
- **Destructive:** Standard red for errors and delete actions
- Dark mode: defer to V2. Build light mode only.

### Typography
- **Font:** Inter (Google Fonts) — loaded via `next/font/google` in root layout
- Use standard Tailwind text sizes: `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, etc.
- Use `text-muted-foreground` for secondary/helper text
- Monospaced digits for monetary values: use `tabular-nums` font-feature

### shadcn/ui Components Available
All components follow shadcn/ui defaults with no custom overrides:
- **Button** — default (emerald primary), outline, secondary, ghost, destructive, link variants
- **Card** — with CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- **Input** — standard text input
- **Dialog** — for confirmations
- **Sheet** — bottom drawer (default side), tip picker, etc.
- **Separator** — dividers
- **Badge** — default, secondary, destructive, outline variants
- **ScrollArea** — for scrollable lists
- **Toggle** — for tip percentage pills

### Screen-by-Screen Design Notes

**HomePage:**
- "Warikan" heading in `text-2xl font-semibold`
- Empty state: Lucide `utensils-crossed` icon, description in `text-muted-foreground`
- Primary "Start Split" Button below empty state
- Recent splits as Card list

**ScanPage:**
- Near full-screen camera viewfinder or upload area
- Two options: "Take Photo" (camera icon) and "Upload Photo" (image icon)

**ReviewPage:**
- Line items in a Card, each row editable
- "Add Item" ghost button
- Tax & tip inputs, tip quick-select Toggle pills (15%/18%/20%/25%)
- Summary bar above primary "Continue" button

**PeoplePage:**
- Input + "Add" button at top
- Person list with avatar + name + remove button
- Primary "Continue with N people" button, disabled until ≥2

**AssignPage:**
- Horizontal scroll of person avatars, selected gets primary ring
- Dish list: tap to assign, assigned dishes get primary left border + Badge
- Primary "Continue" when all dishes assigned

**SummaryPage:**
- Restaurant name, grand total in primary color
- Per-person expandable rows with itemized breakdown
- Primary "Done" button

**PaymentPage:**
- Card per person with amount in primary color
- "Copy $X.XX" outline button per person
- Primary "All Done" button → saves to localStorage, returns to HomePage

### Mobile-First
- Design for 390px width first
- Touch targets minimum 44px
- Bottom-pinned CTAs with safe area padding
- Full-height pages: use `min-h-dvh` not `min-h-screen`

## File Structure
```
/app
  /page.tsx                    — HomePage
  /split
    /scan/page.tsx             — ScanPage
    /review/page.tsx           — ReviewPage
    /people/page.tsx           — PeoplePage
    /assign/page.tsx           — AssignPage
    /summary/page.tsx          — SummaryPage
    /payment/page.tsx          — PaymentPage
  /api
    /parse-receipt/route.ts    — Gemini API endpoint
  /layout.tsx                  — Root layout with Inter font import
  /globals.css                 — Tailwind base + custom properties
/components
  /ui/                         — shadcn/ui components
  /split/                      — Split flow components (LineItemRow, PersonAvatar, etc.)
/lib
  /gemini.ts                   — Gemini API client + receipt parsing prompt
  /splits.ts                   — localStorage read/write for splits
  /calculate.ts                — Split calculation logic (pure functions, no side effects)
  /types.ts                    — TypeScript interfaces (from Data Models above)
/public
  /fonts/                      — (reserved for future custom fonts if needed)
```

## Rules for Claude Code
- Mobile-first: always design for 390px width, then scale up
- Use Tailwind exclusively — no CSS modules, no styled-components
- All state management via React hooks (useState, useContext) — no external state library
- Keep components small: if a file exceeds 150 lines, split it
- Monetary values always displayed with 2 decimal places and $ prefix
- All Gemini API calls go through the Next.js API route, never client-side
- Never store API keys in client code
- Use crypto.randomUUID() for generating IDs
- Test the camera/photo flow on a real phone browser, not just desktop
- When in doubt about design, add more whitespace rather than more elements
