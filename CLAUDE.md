# Warikan — Receipt Splitting Web App

## README Maintenance Rule
After completing any meaningful change to the app, always assess whether `README.md` needs updating. A change is "meaningful enough" if it affects any of:
- Features (new, removed, or significantly changed)
- Tech stack (new dependencies, swapped libraries)
- Project structure (new pages, routes, or lib files)
- Deployment setup
- Roadmap items that have shipped

If an update is needed, draft the proposed README changes and ask the user for approval **before** committing them. Never silently update or commit the README.

## What This App Does
Warikan helps groups split restaurant receipts fairly. A user photographs a receipt, the app extracts line items using AI, users assign each dish to people, and the app calculates each person's share including tax and tip. The name means "going dutch" in Japanese.

## Current State
V1 web app is complete and deployed to https://warikan0.netlify.app. All 7 core screens are built and polished (47-item UI audit resolved). The "covered person" birthday feature is shipped.

The web app lives in the project root. (The old iOS/Swift codebase was removed in a repo cleanup — it exists only in git history.)

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
  covered?: boolean; // Birthday mode: share redistributed to others
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
- **Covered person (birthday mode):** A person marked `covered` has their entire total redistributed equally among all non-covered payers. Covered person's total becomes $0. The extra amount each payer absorbs is tracked as `coveredExtra` on `PersonTotal`.

## Design System

### Philosophy
shadcn/ui defaults with an emerald green accent. Clean, modern, functional. Let the component library do the heavy lifting — minimal custom styling.

### Colors
Driven by CSS variables in `app/globals.css` using the standard shadcn/ui system:
- **Primary (accent):** Emerald green `#10B981` — used for primary buttons, links, active states, key amounts
- **Neutrals:** shadcn slate defaults for background, foreground, muted, card, border, input
- **Destructive:** Standard red for errors and delete actions
- **Covered/Birthday:** Amber (`amber-400`, `amber-500/15`) — used for Gift icon, badges, and highlights on covered people
- **Dark mode only.** The app uses a dark theme exclusively. Light mode is deferred to V2.

### Avatar Color Palette
Person avatars cycle through 6 colors via `colorIndex` (defined in `components/split/person-avatar.tsx`):
1. Emerald, 2. Sky, 3. Violet, 4. Amber, 5. Rose, 6. Cyan
Covered people always use amber regardless of their index.

### Typography
- **Font:** Geist Sans — loaded via `next/font/google` in root layout
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
- Input + "Add" button at top (auto-disambiguates duplicate names: "John" → "John (2)")
- Person list with avatar + name + Gift toggle (birthday mode) + remove button
- Covered people show amber border, Gift icon avatar, "Covered" badge
- Primary "Continue with N people" button, disabled until ≥2

**AssignPage:**
- Horizontal scroll of person avatars with gradient fade mask, selected gets primary ring
- Covered people show Gift icon avatar with amber color and "Covered" label instead of running total
- Dish list: tap to assign, assigned dishes get highlight + Badge initials
- "Assign All" button, per-item "ea" split amounts, haptic feedback on tap
- Primary "Continue" when all dishes assigned

**SummaryPage:**
- Restaurant name, grand total in primary color with "incl. tax & tip" hint
- Per-person expandable rows with itemized breakdown, "split N ways" notation
- Covered people show "Covered" in amber instead of amount; payers see "Covering [name]" line
- "Copy All" button + primary "Done" button

**PaymentPage:**
- Card per person with amount in primary color
- Covered people's cards are greyed out (opacity-50) with "Covered by group" label, no action buttons
- "Copy $X.XX" outline button + optional Venmo deep link per person
- "Share QR" button (generates a pay link with all amounts encoded in URL fragment)
- Primary "All Done" button → saves to localStorage, returns to HomePage

**SplitDetailPage** (`/split/[id]`):
- View a saved split with per-person breakdown (same covered indicators as Summary)
- 2-row bottom bar: [Edit Items][Edit Assignments] / [Payments]
- Delete confirmation via Dialog

### Mobile-Only
- This app is mobile-only — no keyboard shortcuts or desktop-specific considerations
- Design for 390px width
- Touch targets minimum 44px
- Full-height pages: use `min-h-dvh` not `min-h-screen`

### Bottom Navigation Bar Pattern
All pages with a fixed bottom CTA use a consistent floating bar:
```
<div className="fixed bottom-0 left-0 right-0 p-4">
  <div className="rounded-3xl border border-border/30 bg-card/80 backdrop-blur-xl p-5 shadow-lg shadow-black/20">
    {/* buttons here */}
  </div>
</div>
```
Content padding to clear the bar:
- `pb-40` — standard (single button row): People, Assign, Summary, Payment
- `pb-48` — tall (2 button rows): Split Detail
- `pb-80` — extra tall (summary breakdown + button): Review
- `pb-8` — pages without a bottom bar: Home, Scan

## File Structure
```
/app
  /page.tsx                    — HomePage (paginated split list)
  /pay/page.tsx                — QR pay landing page
  /split
    /scan/page.tsx             — ScanPage
    /review/page.tsx           — ReviewPage
    /people/page.tsx           — PeoplePage (with covered/birthday toggle)
    /assign/page.tsx           — AssignPage
    /summary/page.tsx          — SummaryPage
    /payment/page.tsx          — PaymentPage (Venmo + QR)
    /[id]/page.tsx             — SplitDetailPage (view/edit saved split)
  /api
    /parse-receipt/route.ts    — Gemini API endpoint
  /layout.tsx                  — Root layout with Geist Sans font, dark class
  /globals.css                 — Tailwind base + dark theme CSS variables
/components
  /ui/                         — shadcn/ui components
  /split/
    /line-item-row.tsx         — Editable line item (2-row mobile layout)
    /person-avatar.tsx         — Avatar with 6-color palette + covered state
    /summary-bar.tsx           — Receipt-style subtotal/tax/tip/fees breakdown
    /tip-selector.tsx          — Tip % toggles (15/18/20/25/None)
    /split-card.tsx            — Split card for home page list
/lib
  /gemini.ts                   — Gemini API client + receipt parsing prompt
  /splits.ts                   — localStorage read/write for splits
  /calculate.ts                — Split calculation (pure functions, handles covered redistribution)
  /types.ts                    — TypeScript interfaces (Person, LineItem, Fee, Split, PersonTotal)
  /split-flow-context.tsx      — React Context for split flow state management
  /venmo.ts                    — Venmo deep link builder + QR pay data encoding
  /utils.ts                    — cn() utility (clsx + tailwind-merge)
/netlify.toml                  — Netlify build config with @netlify/plugin-nextjs
/public                        — Static assets (currently empty)
```

## Rules for Claude Code
- Mobile-only: design for 390px width, no desktop/keyboard considerations
- Use Tailwind exclusively — no CSS modules, no styled-components
- All state management via React hooks (useState, useContext) — no external state library
- Keep components small: if a file exceeds 150 lines, split it
- Monetary values always displayed with 2 decimal places and $ prefix
- All Gemini API calls go through the Next.js API route, never client-side
- Never store API keys in client code
- Use crypto.randomUUID() for generating IDs
- Test the camera/photo flow on a real phone browser, not just desktop
- When in doubt about design, add more whitespace rather than more elements
- After completing any meaningful code change, ask the user if they want to commit before moving on
