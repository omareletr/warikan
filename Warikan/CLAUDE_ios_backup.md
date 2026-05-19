# Warikan – Project Context for Claude

## What This App Does
Warikan is an iOS app that:
1. Works instantly without an account — anyone can scan a receipt and split a bill as a guest
2. Imports a receipt via camera scan, photo library, or Files app
3. Parses individual line items (dishes + prices) from the receipt via OCR
4. Lets the user assign each dish to one or more people in their group
5. Calculates each person's share (including tax and tip, prorated)
6. Deep-links to Venmo, Cash App, PayPal, or Zelle to pre-fill payment requests
7. Saves guest splits locally on device; account holders sync splits to the cloud across devices
8. Lets account holders add friends with saved payment handles for faster future splits
9. Generates a personal share link per participant so guests can view their specific bill share without an account

## User Modes
Warikan has two user modes. All core functionality is available to both.

### Guest Mode (no account required)
- Full split flow: scan → assign → calculate → send payment requests
- Splits saved locally on device using SwiftData (persists across sessions until app is deleted)
- Can view their share of a split via a personal share link sent by the split creator
- Cannot access splits from another device
- Cannot maintain a friends list or saved payment handles across sessions
- Prompted (never forced) to create an account at natural moments: after completing a split, when they'd benefit from saved handles

### Account Mode
Everything in guest mode, plus:
- Splits synced to Firestore — accessible across all devices
- Persistent friends list with saved Venmo/Cash App/PayPal/Zelle handles
- Friends' payment handles pre-fill automatically on PaymentView
- Split history shared with friends (queryable)
- Profile with username, searchable by friends

## Tech Stack
- **Language**: Swift
- **UI Framework**: SwiftUI
- **Authentication**: Firebase Auth (Sign in with Apple, Google, Email/password) — optional, not required to use the app
- **Local Storage**: SwiftData (iOS 17+) — for guest splits saved on device
- **Database**: Firebase Firestore (cloud storage for account holders: users, friends, split history)
- **Receipt Scanning & Import**: Apple Vision + VisionKit (OCR), PhotosUI (photo library), UIDocumentPickerViewController (Files), PDFKit (PDF rendering)
- **Contacts Import**: Apple Contacts framework (CNContactStore)
- **Payment Deep Linking**: Venmo, Cash App, PayPal, and Zelle via URL schemes
- **Minimum iOS Target**: iOS 17+
- **Architecture**: MVVM (Model-View-ViewModel)
- **Package Manager**: Swift Package Manager (SPM) for Firebase SDK

## Firebase Setup Notes
- Firebase project must be created at console.firebase.google.com
- `GoogleService-Info.plist` must be added to the Xcode project root
- Firestore security rules must restrict reads/writes to authenticated users only
- Firebase SDK installed via SPM: https://github.com/firebase/firebase-ios-sdk
- Required Firebase modules: FirebaseAuth, FirebaseFirestore (FirebaseFirestoreSwift is merged into FirebaseFirestore in SDK 10+ — do NOT import it separately)

## Navigation Architecture

Warikan uses a **two-tab structure** for account holders. Guests see the same Tab 1 but Tab 2 shows an account upsell instead of a full profile.

```
App Launch
├── Guest (no account) → directly into HomeView (guest mode)
└── Account holder → HomeView (full mode)

TabView
├── Tab 1: Home (SF Symbol: house.fill)
│   └── HomeView — recent splits feed + start new split
│       ├── → ScanView (full-screen modal sheet, starts split flow)
│       │   └── → ReceiptReviewView
│       │       ├── [regular flow] → PeopleSetupView
│       │       │   └── → AssignView
│       │       │       └── → SplitSummaryView
│       │       │           └── → PaymentView
│       │       └── [collaborative flow] → PeopleSetupView
│       │           └── → QR Display Screen
│       │               └── → CollaborativeSessionView (real-time, all devices)
│       │                   └── [on creator close] → AssignView (creator's dishes only)
│       │                       └── → SplitSummaryView
│       │                           └── → PaymentView (creator) / read-only + pay button (participants)
│       └── → SplitDetailView (drill-in from history list)
│
└── Tab 2: Profile (SF Symbol: person.crop.circle.fill)
    ├── If guest → GuestUpsellView ("Save splits across devices. Create a free account.")
    │   └── → LandingView (sign up / sign in)
    └── If account holder → ProfileView
        ├── → FriendsView (drill-in)
        │   └── → FriendProfileView (drill-in)
        └── → Edit profile fields inline

Share Link Flow (no tab, opens from deep link):
warikan://split/{splitId}?token={shareToken}&participant={participantId}
└── → ShareSplitView — shows recipient's name, itemized share, total owed, payment button
    (no auth required — token in URL is the access key)

Collaborative Session Flow (no tab, opens from deep link):
warikan://session/{sessionId}
└── → CollaborativeSessionView — name entry sheet, then real-time claiming
    (no account required — name entry is the only gate)
```

The split flow (Scan → Review → People → Assign → Summary → Payment) is a
**linear modal sheet** presented over Tab 1. The user moves top-to-bottom
and is returned to HomeView on completion or cancellation. Each step has
a back button and a visible step progress indicator at the top.

## App Screens

### Launch Flow
1. **LandingView** – Shown only when user explicitly taps "Sign In / Create Account" from GuestUpsellView or HomeView. NOT shown on cold launch — guests go straight to HomeView.
2. **SignUpView** – Email/password registration + Sign in with Apple + Google
3. **SignInView** – Login with same providers
4. **ProfileSetupView** – After first sign-up: set display name, username, and optional payment handles (Venmo, Cash App, PayPal, Zelle)

### HomeView
5. **HomeView** – Recent splits feed + prominent "Start Split" button. Guests see locally stored splits; account holders see Firestore-synced splits. The greeting "Hey, [name]." derives the first word of `AppUser.displayName` only — "Omar El-Etr" → "Hey, Omar." Guests see "Hey there." Skeleton loading rows (3 shimmer rows) are shown only for account holders while Firestore loads — SwiftData is synchronous so guests never see skeletons.
6. **SplitDetailView** – Full detail view of any past split (drill-in from HomeView list)

### Split Flow (modal sheet over HomeView, linear step-by-step progression)
7. **ScanView** – Camera interface to capture receipt (VisionKit document scanner)
8. **ReceiptReviewView** – Parsed line items; user corrects OCR mistakes + enters tax and tip manually if not detected
9. **PeopleSetupView** – Select friends (account holders) or add guests for this split
10. **AssignView** – Assign each dish to one or more people
11. **SplitSummaryView** – Each person's total with expandable itemized breakdown + share link generation per participant
12. **PaymentView** – Send payment requests per person via their preferred app (Venmo, Cash App, PayPal, or Zelle), ceremonial completion state on finish

### Tab 2: Profile
13. **GuestUpsellView** – Shown to guests in Tab 2. Simple screen: icon, "Save your splits across devices", two buttons: "Create Account" | "Sign In"
14. **ProfileView** – Display name, username, payment handles (Venmo/Cash App/PayPal/Zelle), Friends entry point, sign out
15. **FriendsView** – Friends list, search by username, contacts import, pending requests
16. **FriendProfileView** – A friend's profile + split history shared with current user

### Share Link View (no auth required)
17. **ShareSplitView** – Opens via deep link `warikan://split/{splitId}?token={shareToken}&participant={participantId}`. Shows: recipient's name, their itemized dishes, their share of tax/tip/fees, total owed, and a payment button pre-filled with the split creator's preferred payment handle. Read-only. No account required.

### Collaborative Session Views
18. **QR Display Screen** – Full-screen QR code shown to creator after PeopleSetupView in collaborative flow. Shows session code text fallback, participant join list, and "Start Claiming" CTA.
19. **CollaborativeSessionView** – Real-time dish-claiming screen. Creator and participants all see the same receipt; each claims their dishes by tapping. Creator has "Done — Close Session" pinned to bottom. Opens from QR scan deep link for participants.
20. **Unclaimed Dishes Sheet** – Bottom sheet shown to creator on session close. Lists all unclaimed dishes; creator assigns them using avatar-tap before finalizing.

## Firestore Data Models

### Cash App Cashtag Rule
`cashAppCashtag` is stored and handled **without the `$` prefix** throughout — in the model, in Firestore, and in deep links. The `$` is a static UI label only: shown in the ProfileSetupView field label ("Cash App ($)"), in the PaymentView placeholder ("Enter $Cashtag"), and prepended when displaying a saved cashtag. Never store or pass the `$` in the actual value.

### Users Collection: `/users/{userId}`
```swift
struct AppUser: Codable, Identifiable {
    let id: String                      // Firebase Auth UID
    var displayName: String
    var username: String                // unique, lowercase, used for search
    var email: String
    var venmoHandle: String?
    var cashAppCashtag: String?         // stored without $ prefix — UI prepends $ as a display label only
    var paypalUsername: String?
    var zelleContact: String?           // email or phone number
    var preferredPaymentMethod: String? // "venmo" | "cashapp" | "paypal" | "zelle"
    var friendIds: [String]             // array of user IDs
    var createdAt: Date
}
```

### Splits Collection: `/splits/{splitId}` (account holders only)
```swift
struct SplitSession: Codable, Identifiable {
    let id: String              // Firestore document ID (or local UUID for guest splits)
    var createdBy: String       // userId of creator (or "guest" for local splits)
    var participantIds: [String]// userIds of all participants (app users only)
    var guests: [Guest]         // non-app users in this split
    var date: Date
    var restaurantName: String?
    var lineItems: [LineItem]
    var fees: [Fee]             // service charges, corkage, surcharges etc.
    var taxAmount: Double
    var tipAmount: Double
    var totalAmount: Double     // sum of all line items + fees + tax + tip
    var settled: Bool           // true when all participants have paid
    var settledAt: Date?        // timestamp when settled was set to true
    var shareToken: String      // random UUID generated at split creation, used in share links
}
```

### Local Split Storage (guest mode)
Guest splits are stored on-device using **SwiftData**. The SwiftData model mirrors `SplitSession` exactly so that if a guest later creates an account, their local splits can be uploaded to Firestore without data transformation. Mark the SwiftData model class with `@Model` and store it in the default SwiftData container.

**Guest-to-account migration is deferred to v2.** In v1, when a guest creates an account their local SwiftData splits are not automatically uploaded. The upgrade prompt ("Save this split to your account") is shown but tapping it only navigates to the sign-up flow — no migration logic runs. Add a v2 checklist item for the actual upload. Do not implement migration logic in v1.

```swift
@Model
class LocalSplitSession {
    // Same fields as SplitSession above
    // id, createdBy, participantIds, guests, date, restaurantName,
    // lineItems, fees, taxAmount, tipAmount, totalAmount, settled, settledAt, shareToken
}
```

### Fee (embedded in SplitSession)
```swift
struct Fee: Codable, Identifiable {
    let id: String
    var name: String            // e.g. "Service Charge", "Corkage Fee"
    var amount: Double
    // always prorated proportionally across all participants — never assigned individually
}
```

### Line Items (embedded in SplitSession)
```swift
struct LineItem: Codable, Identifiable {
    let id: String
    var name: String
    var price: Double
    var assignedToIds: [String] // userIds or guest identifiers
}
```

### Guests (for non-app users in a split)
```swift
struct Guest: Codable, Identifiable {
    let id: String                      // local UUID, not a Firebase user
    var name: String
    var venmoHandle: String?
    var cashAppCashtag: String?         // stored without $ prefix (see Cash App Cashtag Rule above)
    var paypalUsername: String?
    var zelleContact: String?
    var preferredPaymentMethod: String? // "venmo" | "cashapp" | "paypal" | "zelle"
}
```

### Friend Requests Subcollection: `/users/{userId}/friendRequests/{requestId}`
```swift
struct FriendRequest: Codable, Identifiable {
    let id: String
    var fromUserId: String
    var fromDisplayName: String
    var status: String          // "pending", "accepted", "declined"
    var createdAt: Date
}
```

## Core Business Logic

### Split Calculation
- **Proration of tax/tip**: Distributed proportionally based on each person's subtotal vs. overall subtotal
- **Shared dishes**: Price divided equally among all assigned people
- **Guests**: Treated the same as app users for calculation; Venmo deep link uses their handle if provided

### Tax & Tip Input (ReceiptReviewView)
- OCR attempts to detect tax amount from the receipt automatically
- If detected, pre-fill the tax field—user can always correct it
- Tip is never assumed from the receipt—always entered manually by the user
- Tip entry offers four quick-select buttons: **15% / 18% / 20% / 25%** + a custom freeform input field
- Both tax and tip fields are always visible and editable before proceeding
- If tax is not detected by OCR, field is empty with placeholder "Enter tax amount"
- Subtotal, tax, tip, and grand total are shown as a live-updating summary at the bottom of ReceiptReviewView

### Error & Offline Handling
These states must be handled explicitly—never show a blank screen or silent failure:

- **No internet on launch**: Show a non-blocking banner "You're offline. Recent splits may not load." Allow the user to still start a new split (save locally, sync when back online is a v2 feature—for now show an error if save fails)
- **OCR finds no line items**: Show an empty state on ReceiptReviewView: "We couldn't read this receipt. Try better lighting or add items manually." Provide an "Add Item" button to enter line items by hand
- **OCR finds items but prices are missing**: Pre-fill the row with $0.00, highlight it in coral, prompt user to fill in manually before proceeding
- **Payment app not installed**: On PaymentView, detect if the selected payment app's URL scheme is unavailable. Automatically show the next available option (Venmo → Cash App → PayPal → Zelle → copyable text fallback). Never dead-end the user. For Zelle specifically, always show the manual entry tooltip regardless of whether the app is installed.
- **Firestore/SwiftData save fails on "All Done →"**: show an error banner on the completion screen: "Couldn't save your split. Tap to retry." with a retry button. Do not silently drop the split or navigate away until the save succeeds.
- **Friend search returns no results**: Show the FriendsView empty search state—never a blank list

### Username Uniqueness Enforcement
Firestore has no native unique constraint. Enforce username uniqueness using a
dedicated collection:

```
/usernames/{username} → { uid: String }
```

On ProfileSetupView and profile edit:
1. Before writing the AppUser document, check if `/usernames/{username}` exists
2. If it exists and belongs to a different UID → show error "Username already taken"
3. If available → write both `/users/{uid}` and `/usernames/{username}` in a
   Firestore batch write (atomic — both succeed or both fail)
4. On username change: delete the old `/usernames/{oldUsername}` document and
   create the new one in the same batch

Username rules (enforce client-side before write):
- Lowercase only, no spaces
- 3–20 characters
- Letters, numbers, underscores, and hyphens only
- Cannot start or end with an underscore or hyphen

### Friends System
- Search by username (exact or prefix match via Firestore query)
- Import from iOS Contacts: match phone/email against Firestore user records
- Send/accept/decline friend requests via subcollection
- Split history between two friends: query splits where both userIds appear in `participantIds`

### Payment Deep Link Formats
Each person can be sent a request via their preferred payment app. On PaymentView,
each person card shows a payment method picker: Venmo / Cash App / PayPal / Zelle.
The app remembers each person's preferred payment method from their profile or last use.

**Venmo** (full deep link — pre-fills recipient, amount, and note):
```
venmo://paycharge?txn=pay&recipients=HANDLE&amount=AMOUNT&note=Warikan%20-%20RESTAURANT
```

**Cash App** (full deep link — pre-fills recipient and amount):
```
cashme://cash.app/pay/CASHTAG?amount=AMOUNT&note=Warikan
```

**PayPal** (web URL — opens in PayPal app if installed, Safari if not):
```
https://paypal.me/USERNAME/AMOUNT
```

**Zelle** (limited — no public deep link API; cannot pre-fill recipient or amount):
```
Behavior: copy amount to clipboard, then open Zelle app via zelle:// URL scheme
Show a tooltip: "Amount copied — paste it into Zelle when the app opens."
```
Zelle should be presented in the picker with a "⚠️ Manual entry required" label
so users understand upfront it works differently from the other options.

**Fallback** (if no payment app is installed or user has no handle saved):
Display amount as copyable text with a "Copy $X.XX" button. Never dead-end the user.

### Payment Handle Instrumentation
Warikan uses **manual handle entry only** — no OAuth or API connections to
payment apps. This is intentional and matches how every competitor in this
space works. Reasons:

- Venmo, Cash App, and PayPal OAuth APIs are restricted to approved partners
  and not accessible to indie developers without a lengthy approval process
- Deep linking keeps all payment authentication inside the trusted payment app,
  never inside Warikan — users prefer this
- No payment credentials are ever stored beyond the user's own Firestore document

**How handles are collected:**

For app users (friends):
- During ProfileSetupView, users optionally enter their Venmo handle,
  Cash App cashtag, PayPal username, and Zelle email/phone
- These are stored on their AppUser Firestore document (see data models above)
- When friends are added to a split, their saved handles pre-fill automatically
  on PaymentView — no manual entry needed at payment time

For guests (non-app users):
- On PaymentView, if a guest has no handle saved, an inline text field
  appears under their card: "Enter Venmo / Cash App / PayPal / Zelle handle"
- The entered handle is saved to the Guest record for this split session only
  (not persisted to Firestore permanently)

### Receipt Import Sources (ScanView)
ScanView presents three import options before entering the camera:

```
1. Camera (default)     — Live camera with VisionKit document scanner
2. Photo Library        — PHPickerViewController (no full Photos access needed)
3. Files app            — UIDocumentPickerViewController, accepts images + PDFs
```

All three sources feed into the same OCR pipeline (VNRecognizeTextRequest).
For PDFs from Files: render the first page as a UIImage, then run OCR on the image.
The import source picker appears as three icon buttons at the bottom of ScanView,
below the camera viewfinder. Camera is always the pre-selected default.

Required Info.plist keys:
- `NSCameraUsageDescription` — for camera capture
- `NSPhotoLibraryUsageDescription` — for photo library import (read-only)
Files app import requires no special permissions.

### Auto-Gratuity & Included Tips (ReceiptReviewView)
Many restaurants automatically include gratuity for parties of 6 or more.
These appear on the receipt as a line item, not in the tip field, so OCR
will parse them as a regular dish if not handled explicitly.

Detection: after OCR, scan all line item names for patterns that suggest
included gratuity. Common patterns to match (case-insensitive):
```
"auto grat", "auto gratuity", "gratuity", "service charge",
"mandatory gratuity", "included gratuity", "grat %", "svc chg"
```

Behavior when detected:
- Remove the line item from the assignable dishes list
- Move its dollar amount into the tip field automatically
- Show a banner on ReceiptReviewView: "We detected an included gratuity
  of $X and added it to your tip. Tap to adjust."
- The user can always move it back to a regular line item if the detection
  was wrong

### Other Fees (ReceiptReviewView)
Receipts regularly include fees beyond tax and tip:
- Delivery / service fees
- Corkage fees
- Split plate fees
- Credit card surcharges
- Venue fees

These should NOT be treated as assignable dishes. They should be prorated
across all participants proportionally (same logic as tax).

ReceiptReviewView has a dedicated **Fees** section below the line items list,
separate from tax and tip. OCR-detected fees are moved here automatically
using pattern matching on line item names:
```
"delivery fee", "service fee", "corkage", "split plate",
"surcharge", "cc fee", "credit card fee", "venue fee", "convenience fee"
```

The Fees section works like tax:
- Each detected fee appears as an editable row (name + amount)
- User can edit the amount, rename it, or delete it
- User can add a custom fee manually via an "Add Fee" button
- All fees are prorated proportionally across participants at calculation time

### AssignView Interaction Model
AssignView uses an **avatar-centric** model:
1. The creator taps a **person avatar** in the strip at the top — this "selects" that person (avatar gets a vermillion ring highlight)
2. With a person selected, the creator taps **dish rows** to assign that person to each dish. Each tapped dish row gets a vermillion left border and the person's initials badge.
3. To assign a different person: tap a different avatar. The previous person's avatar deselects; the new one becomes active.
4. A dish can be assigned to multiple people by selecting each person and tapping the dish — each tap adds that person to the dish's `assignedToIds`.
5. Tapping a dish that already has the currently-selected person assigned to it removes them from that dish (toggle).
6. Swipe left on any dish row: "All" shortcut (SF Symbol: person.2) assigns the dish to everyone in one tap, regardless of who is currently selected.
7. "Continue" CTA activates once every dish has at least one person assigned.
The split flow is a linear modal sheet. If the user cancels at any point:
- **No data is persisted** — partial splits are never saved to Firestore or SwiftData
- The in-progress split state is held in a `SplitFlowViewModel` scoped to the modal sheet lifetime only
- When the sheet is dismissed (back to HomeView), `SplitFlowViewModel` is deallocated and all in-progress state is discarded
- No drafts, no recovery — the user simply starts over
- **Swipe-to-dismiss**: the modal sheet must use `.interactiveDismissDisabled(true)` so users cannot accidentally swipe it away. The only dismissal paths are the back button and the explicit cancel/discard flow.
- **Discard confirmation alert**: shown when the user taps the back button or a cancel control at any step after ScanView (i.e. from ReceiptReviewView onward — any progress past the scan warrants a warning):
  - "Discard this split? Your progress will be lost."
  - Buttons: "Discard" (destructive) | "Keep editing"
- At ScanView itself (before any OCR has run): back button dismisses immediately with no confirmation alert.

### SplitFlowViewModel
`SplitFlowViewModel` is the single stateful owner of all in-progress split data. It is created when the split flow modal opens and deallocated when it closes. It must be passed through the entire flow — never re-created per step.

**Fields it holds:**
```swift
@Observable class SplitFlowViewModel {
    var capturedImage: UIImage?           // from ScanView
    var lineItems: [LineItem]             // from OCR, editable in ReceiptReviewView
    var fees: [Fee]                       // detected or manually added
    var taxAmount: Double
    var tipAmount: Double
    var participants: [AppUser]           // from PeopleSetupView (account holders)
    var guests: [Guest]                   // from PeopleSetupView (guests)
    var restaurantName: String?           // OCR-detected or user-entered
    var currentStep: Int                  // drives the progress indicator
}
```

This ViewModel is injected into every step view. Views read from and write to it directly — no inter-view data passing via init parameters.

### "You're Owed" Summary (HomeView — Account Holders)
The summary line below the greeting shows the total outstanding amount owed to the current user across all their unsettled splits where they are the creator.

**Calculation:**
- Query all `SplitSession` documents where `createdBy == currentUser.id` and `settled == false`
- For each such split: sum the amounts owed by all other participants (total split amount minus the creator's own share)
- Display the running total as "You're owed $X.XX"
- If $0 or no unsettled splits as creator: omit the line entirely — don't show "You're owed $0.00"

**Rationale:** Warikan's model is that the creator covers the bill upfront and collects from others. "You're owed" reflects exactly what's still outstanding to the person who paid. There is no "you owe" concept — participants pay the creator directly via the payment apps.

### Split Save Timing
The split is saved to Firestore (account holders) or SwiftData (guests) **when the user taps "All Done →" on PaymentView**, after all payment requests have been sent.

- Before "All Done →" is tapped: no data is written anywhere. SplitFlowViewModel holds all state in memory.
- Tapping "All Done →": write the split, set `settled = true`, record `settledAt`, then navigate to the completion screen.
- This means PaymentView itself has **no back button**. Once the user reaches PaymentView, there is no going back — the flow can only complete forward or be abandoned (which discards everything, same as cancelling mid-flow). The nav bar on PaymentView has no back chevron.
- If the Firestore/SwiftData write fails: show an error banner on the completion screen and provide a "Retry" button. Do not silently drop the split.
- For the re-send flow (opened from SplitDetailView): split is already saved — "All Done →" only updates `settled` and `settledAt`, it does not re-write the split document.
When PaymentView is opened from `SplitDetailView` via "Resend Requests":
- The split is already saved — do not re-save to Firestore on completion
- "All Done →" still marks the split as `settled = true` and updates `settledAt` in Firestore
- The payment method picker and per-person amounts are identical to the original flow
- Visual treatment is the same — rows, send buttons, completion ceremony all apply
`settled: Bool` on SplitSession indicates all participants have been sent
payment requests. It does NOT indicate payment has been confirmed (Venmo/
Cash App have no callback API for this).

- `settled` is set to `true` when the user taps "All Done" on PaymentView
  after sending all requests
- `settledAt` is recorded at the same time
- On HomeView, settled splits are shown in a separate "Past" section with
  a muted visual treatment vs. active/recent splits
- Any participant can manually mark a split as settled from SplitDetailView
  via a "Mark as settled" button — useful if payment happened outside the app
- Settled status is stored per-split, not per-person (v1 simplification)

### Auth Flow Logic
- On app launch: check `Auth.auth().currentUser`
- If nil → show HomeView in **guest mode** (do NOT show LandingView on cold launch)
- If authenticated but no Firestore user doc → show ProfileSetupView
- If fully set up → show HomeView in **account mode**

**Guest-to-account upgrade prompts** (soft, never forced):
- After completing a split: show a dismissible banner "Save this split to your account"
- When tapping Tab 2: show GuestUpsellView
- Never block the user from continuing as a guest

### Share Link Deep Link Handling
- URL scheme: `warikan://split/{splitId}?token={shareToken}&participant={participantId}`
- On deep link open: fetch the split from Firestore using `splitId`
- Verify `shareToken` matches `split.shareToken` — if mismatch, show "Invalid link" error
- Find the participant matching `participantId` (from `participantIds` or `guests` array)
- Show ShareSplitView with that participant's itemized share
- No authentication required — the shareToken is the access key
- ShareSplitView is read-only — no editing, no account creation required to view

### Share Link Generation (SplitSummaryView)
Share links are generated on SplitSummaryView and presented to the creator before they proceed to PaymentView. At this point the split has not yet been saved — links are pre-generated using a UUID that will become the Firestore document ID when the split is eventually written on "All Done →". The `shareToken` is also generated at this point and embedded in `SplitFlowViewModel`.

- Only generate share links for account holders in v1 (guest-created splits aren't in Firestore yet so links can't resolve)
- Format: `warikan://split/{splitId}?token={shareToken}&participant={participantId}`
- Present as a share sheet (iOS native `ShareLink`) so the creator can send via iMessage, WhatsApp, etc.

### Export Split as Photo (SplitSummaryView + SplitDetailView)

The creator can export the split as a static image using the iOS native share sheet. Available in two places: **SplitSummaryView** (immediately after a split is finalized) and **SplitDetailView** (for reviewing and re-sharing past splits).

**What the exported image shows:**
- Warikan wordmark top-left, date top-right (SF Pro `.footnote`, secondary color)
- Restaurant name in `displaySmall` (Cormorant Garamond SemiBold 24pt), `#111111`
- Grand total in `displayLarge` (Cormorant Bold 40pt), `Color.vermillion`
- Horizontal hairline divider
- Each participant as a row: initials avatar (36pt) + name + their total amount right-aligned in `Color.vermillion`
- Expanded breakdown for each person below their row in `.footnote`, secondary color (all items shown, not collapsed)
- Bottom row: tax, tip, and fees totals in secondary color
- Bottom-right: "Split with Warikan" watermark in SF Pro `.caption`, tertiary color

**Implementation:**
Use SwiftUI's `ImageRenderer` to render a dedicated `SplitExportView` off-screen to a `UIImage`, then pass to `ShareLink` or `UIActivityViewController`. Always set an explicit `.frame(width: 390)` on the view passed to `ImageRenderer` — without this, the renderer uses the natural view size which varies by device and will produce incorrect output on iPads or large iPhones.

```swift
@MainActor
func exportSplitImage(split: SplitSession) async -> UIImage? {
    let renderer = ImageRenderer(
        content: SplitExportView(split: split)
            .frame(width: 390)  // required — fixes width regardless of device screen size
    )
    renderer.scale = 3.0  // 3x for crisp output on all devices
    return renderer.uiImage
}
```

`SplitExportView` is a standalone SwiftUI view used only for rendering — never shown directly in the app. It renders at a fixed width of 390pt (iPhone 15 canvas width) with white background and 24pt horizontal padding.

**Trigger:**
- SplitSummaryView: share icon button in top-right nav bar area (SF Symbol: `square.and.arrow.up`, 20pt, secondary color)
- SplitDetailView: same share icon in the navigation bar

**Account requirement:** Available to both guests and account holders.

---

### Collaborative QR Session

A real-time session where every person at the table scans a single QR code and claims their own dishes on their own phone. The creator scans the receipt, then generates a session QR code. Everyone scans in, sees the receipt, and taps their items. When everyone is done the creator closes the session and all shares finalize instantly.

**When to build:** After all other v1 features are complete and stable. If the collaborative session is not stable or is causing regressions, cut to v2. It is the last feature before ship, not a core dependency.

#### Flow Overview

```
ReceiptReviewView
  └── "Start Collaborative Session" button
        └── PeopleSetupView (pre-add guests who won't scan)
              └── QR Display Screen (creator waits, others join)
                    └── [Creator taps "Start Claiming"]
                          └── CollaborativeSessionView (all devices, real-time)
                                └── [Creator taps "Done — Close Session"]
                                      └── Unclaimed Dishes Sheet (creator assigns remainder)
                                            └── [Creator taps "Finalize"]
                                                  └── AssignView (creator's own portion only)
                                                        └── SplitSummaryView (all devices)
                                                              └── PaymentView (creator only)
```

Participants follow a parallel path:
```
QR scan → Name Entry Sheet → CollaborativeSessionView (claiming) → SplitSummaryView (read-only, with payment button)
```

#### Data Model

```swift
// Firestore: /collaborativeSessions/{sessionId}
struct CollaborativeSession: Codable, Identifiable {
    let id: String
    var createdBy: String              // userId of session creator
    var splitId: String                // references the SplitSession being built
    var sessionCode: String            // 6-character uppercase alphanumeric e.g. "X7K2MR"
    var participants: [SessionParticipant]
    var lineItems: [CollaborativeLineItem]
    var status: String                 // "open" | "closed"
    var createdAt: Date
    var closedAt: Date?
}

struct SessionParticipant: Codable, Identifiable {
    let id: String                     // UUID assigned when they join
    var displayName: String            // name entered at join screen
    var joinedAt: Date
    var isCreator: Bool
    var isDone: Bool                   // true when participant has marked themselves finished claiming
}

struct CollaborativeLineItem: Codable, Identifiable {
    let id: String
    var name: String
    var price: Double
    var claimedBy: [String]            // array of SessionParticipant IDs
    var conflictPending: Bool          // true when simultaneous tap detected, resolves to split
}
```

**Note:** `CollaborativeSession` is a separate temporary document used only during the live session. When the creator closes the session, the claimed assignments are written back into the permanent `SplitSession.lineItems` (`assignedToIds`). The `CollaborativeSession` document is not deleted — keep it for debugging and potential v2 replay features, but it plays no role after `status = "closed"`.

#### PeopleSetupView in Collaborative Flow

Before generating the QR code, the creator is shown PeopleSetupView — the same screen as in the regular split flow. This lets them pre-add guests who won't be scanning (e.g. a friend who only uses Zelle and doesn't want to install the app, or someone who left early). Pre-added guests appear in the participant list on all devices during the session and are included in proration even if they never join.

After PeopleSetupView, the creator proceeds to the QR display screen.

#### Joining a Session

**QR code format:** `warikan://session/{sessionId}` — same `warikan://` scheme already registered for share links.

**If app not installed:** Deep link redirects to the Warikan App Store page. After install, the user must re-scan the QR code. No web fallback in v1 — install is required to claim dishes.

**QR code display screen (creator):**
- Full-screen white background, no navigation chrome
- "Everyone scan this" in `displaySmall` (Cormorant SemiBold 24pt), centered, 48pt top padding
- 16pt gap
- QR code: 240×240pt, centered, no border
- 12pt gap
- Session code in SF Pro `.title.bold()`, `#111111`, monospaced, letter-spacing +4 — e.g. `X7K2MR`
- 8pt gap
- "Or enter this code" in SF Pro `.caption`, secondary color
- 32pt gap
- Participant list: each joiner appears as an avatar row with staggered fade-in as they join. Pre-added guests from PeopleSetupView appear immediately with a muted "Not joined yet" label.
- Creator row shows "You" badge, secondary color
- Pinned to bottom: vermillion "Start Claiming" button, 54pt, full width. **Enabled immediately** — the creator does not need to wait for anyone else to join before tapping. Tapping transitions the creator to `CollaborativeSessionView`.

**Join flow (participant):**
1. Scan QR → app opens (or deep link fires if app already open)
2. `CollaborativeSessionView` loads with a bottom sheet immediately overlaid
3. Bottom sheet: "What's your name?" — single text field, auto-focused, vermillion "Join" CTA disabled until ≥1 character. `interactiveDismissDisabled(true)` — cannot dismiss without entering a name.
4. After name entry: participant added to `CollaborativeSession.participants` in Firestore, bottom sheet dismisses, receipt visible for claiming

**Account requirement to join:** None. Name entry only.

**Participant limit:** None in v1. Do not add a cap speculatively.

#### Real-Time Claiming

All participants (including the creator) see the same receipt in `CollaborativeSessionView`. Firestore real-time listeners (`addSnapshotListener`) keep every device in sync.

**Dish row states:**
- **Unclaimed**: plain row, dish name + price, `#111111`
- **Claimed by me**: vermillion left border (1.5pt), my initials badge on right
- **Claimed by someone else**: secondary color text, their name badge on right, still tappable (to add yourself as a split)
- **Conflict (resolved)**: split icon badge showing both claimers' initials, amount shown as per-person share

**Tap behavior:**
- Tap unclaimed dish → instantly claimed by me (optimistic UI, Firestore write fires in background)
- Tap my claimed dish → unclaims it
- Tap someone else's dish → adds me as a co-claimer, dish splits equally between us

**Mark as Done:**
Each participant (excluding the creator) has a "I'm done" button pinned above the dish list. Tapping it sets `isDone = true` on their `SessionParticipant` record in Firestore.

- `isDone` defaults to `false` on join for all non-creator participants
- The creator's `SessionParticipant` record has `isDone` initialized to `true` at session creation — they signal readiness by closing the session, not by tapping done
- The ready-count denominator (the `5` in "3/5 ready") is the count of non-creator participants only — creator is excluded from both numerator and denominator
- Marking done does NOT lock the participant's claims — they can still tap dishes to claim or unclaim while marked done
- When a participant marks done, the creator receives a nudge (see Closing section)
- The creator's own `isDone` is always `true` implicitly — they control closing, so no done button for them

**Simultaneous tap conflict resolution:**
Both users tap the same unclaimed dish within the same Firestore write window. Resolution: **split equally between both tappers** — no dialog, no friction. The `claimedBy` array ends up with both participant IDs. `conflictPending` is set to `true` on the optimistic local update when the second tap is detected client-side, then resolved to `false` immediately after the Firestore write for that dish succeeds (i.e. once the server confirms the `claimedBy` array contains both IDs). Both users see a brief haptic + their initials badge appearing alongside the other person's.

#### Closing the Session (Creator Only)

Only the creator sees a "Done — Close Session" button, pinned to the bottom of `CollaborativeSessionView`. Participants do not see this button.

**Creator nudge:**
When the number of participants with `isDone = true` changes, the creator's "Done — Close Session" button shows a live count badge: "Done — Close Session (3/5 ready)" where the numerator is participants with `isDone = true` and the denominator is total non-creator participants. When all non-creator participants have marked done, the button pulses once with a `.spring` scale animation (`1.0 → 1.04 → 1.0`) and a `.success` haptic fires — a clear signal without being pushy. The creator still decides when to tap it.

**Unclaimed dishes when closing:**
Creator taps "Done" → a bottom sheet slides up listing all unclaimed dishes. The creator assigns each one using the same avatar-tap mechanic as AssignView. Once all dishes are assigned, the "Finalize" button activates.

**Creator's own dishes:**
After finalizing unclaimed dishes, the creator is taken to a condensed **AssignView** scoped to their own portion only — showing only the dishes not yet assigned to anyone else. The creator taps their own name/avatar to claim dishes normally. This is the creator's version of what everyone else did via tap-to-claim during the live session.

**On close:**
1. `CollaborativeSession.status` set to `"closed"` and `closedAt` recorded in Firestore
2. Claimed assignments (from all participants + creator's AssignView) written into `SplitSession.lineItems` (`assignedToIds` mapped from `SessionParticipant.id` to actual user or guest IDs)
3. All participants' devices receive the Firestore snapshot update (`status = "closed"`)
4. All screens immediately transition to `SplitSummaryView` — creator sees full summary and proceeds to PaymentView as normal
5. Each participant's `SplitSummaryView` is read-only but includes a **payment button** — a vermillion CTA showing "Pay [Creator Name]" that deep-links to the creator's preferred payment app with the participant's amount pre-filled. The creator's preferred payment handle is pulled from `AppUser.preferredPaymentMethod` and the corresponding handle field.

**Participant SplitSummaryView payment button:**
- Shows creator's preferred payment method: e.g. "Pay via Venmo" 
- Uses the same deep-link format as regular PaymentView, but pre-filled to pay the creator
- If creator has no payment handle saved: shows "Copy $X.XX" fallback button
- Below the CTA: ghost link "View breakdown" toggles the itemized list (collapsed by default)

**What participants see on close:**
Session view immediately replaces with `SplitSummaryView` — their amount in `displayLarge` + `Color.vermillion`, their name, restaurant name, one payment CTA. Read-only. No "waiting" screen.

#### Firestore Rules
See the canonical Firestore Security Rules section at the bottom of this document — `collaborativeSessions` rules are included there.

#### Error States
- **Session already closed**: joining a closed session shows "This session has ended." with a ghost link "Get Warikan" — no further action
- **Session not found**: invalid QR or expired link → "Session not found." error screen
- **Name field empty on join**: "Done" button disabled until at least 1 character entered
- **Firestore write fails on claim**: retry silently once, then show a brief banner "Couldn't claim — tap again"
- **Creator loses connection during session**: show "You're offline" banner, claiming pauses for all participants until reconnected

#### Build Checklist Items (Collaborative Session)
- [ ] `CollaborativeSession`, `SessionParticipant` (with `isDone`), `CollaborativeLineItem` Firestore models + Codable
- [ ] `CollaborativeSessionViewModel` with real-time Firestore listener (`addSnapshotListener`)
- [ ] QR code generation (use `CoreImage.CIFilter.qrCodeGenerator` — no third-party library)
- [ ] "Start Collaborative Session" button on ReceiptReviewView → routes through PeopleSetupView first
- [ ] QR Display Screen (session code fallback, participant join list, "Start Claiming" CTA enabled immediately)
- [ ] Deep link handler for `warikan://session/{sessionId}` → `CollaborativeSessionView`
- [ ] `CollaborativeSessionView` (receipt list with real-time claim states: unclaimed / mine / theirs / split)
- [ ] Name entry bottom sheet (join flow, `interactiveDismissDisabled(true)`)
- [ ] "I'm done" / "Undo" toggle button for participants (writes `isDone` to Firestore, does not lock claims)
- [ ] Creator "Done — Close Session" button shows live ready count badge (N/total ready)
- [ ] All-ready pulse animation + `.success` haptic on creator's button when last participant marks done
- [ ] Conflict resolution logic (simultaneous tap → split equally, `conflictPending` flag)
- [ ] Creator "Done — Close Session" flow with unclaimed dishes assignment bottom sheet
- [ ] Creator proceeds to scoped AssignView for their own dishes after unclaimed sheet
- [ ] Write all assignments back to `SplitSession.lineItems` on finalize
- [ ] Transition all participant devices to `SplitSummaryView` on Firestore `status = "closed"` snapshot
- [ ] Participant `SplitSummaryView`: read-only + "Pay [Creator Name]" payment button using creator's preferred handle
- [ ] App Store redirect for QR scans when Warikan is not installed
- [ ] Error states: closed session, session not found, offline banner, claim write failure

---

## Firestore Security Rules (reference)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /usernames/{username} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /splits/{splitId} {
      // Authenticated participants and creator can read/write
      allow read, write: if request.auth != null &&
                         (request.auth.uid in resource.data.participantIds
                         || request.auth.uid == resource.data.createdBy);
      // Anyone with the correct shareToken can read (for share links — no auth required)
      allow read: if request.query.token == resource.data.shareToken;
      // Any authenticated user can create a split
      allow create: if request.auth != null;
    }
    match /collaborativeSessions/{sessionId} {
      // Any user (authenticated or not) can read an open session
      allow read: if resource.data.status == "open";
      // Only authenticated users can create a session
      allow create: if request.auth != null;
      // Any user can update an open session (participants join without an account and write
      // their name, isDone flag, and dish claims); only the authenticated creator can close it
      allow update: if resource.data.status == "open" ||
                    (request.auth != null && request.auth.uid == resource.data.createdBy);
    }
  }
}
```

## App Identity

- **App Name**: Warikan
- **Bundle ID**: com.omareletr.warikan
- **Version**: 1.0.0 (build 1)
- **Deployment Target**: iOS 17.0+

## Push Notifications (v1 scope)

Push notifications are **out of scope for v1**. Do not implement FCM or request
notification permissions in v1. The following are planned for v2:
- Friend request received
- Added to a split by someone else
- Reminder when you owe someone money

For v1, all social feedback is visible only when the user opens the app.
Do NOT add `FCMToken` to the AppUser Firestore model in v1.

## Development Rules
- Always use SwiftUI, never UIKit unless absolutely required by a framework
- Keep views lightweight—move all business logic into ViewModels
- Use `@Observable` macro (requires iOS 17+) for ViewModels, not `ObservableObject`
- Wrap all Firebase calls in async/await, never use completion handlers
- Every new view must have a SwiftUI Preview with mock data
- Handle OCR edge cases: receipts may have noise, misread characters, or missing prices
- Always handle Firebase errors gracefully with user-facing error messages
- Never expose Firebase credentials or API keys in code—use GoogleService-Info.plist only
- Camera access requires `NSCameraUsageDescription` in Info.plist
- Photo library access requires `NSPhotoLibraryUsageDescription` in Info.plist (read-only via PHPickerViewController)
- Contacts access requires `NSContactsUsageDescription` in Info.plist
- Files app access via `UIDocumentPickerViewController` requires **no usage description key** in Info.plist — the system handles access automatically. Do not add `NSDocumentsFolderUsageDescription` (that key is for direct filesystem access, not document picker).

## Build Checklist

### Pre-Xcode Setup
- [ ] Apple Developer account created ($99/year at developer.apple.com)
- [ ] Firebase project created at console.firebase.google.com
- [ ] iOS app added in Firebase console + GoogleService-Info.plist downloaded
- [ ] Bundle ID decided: com.omareletr.warikan
- [ ] URL scheme registered in Xcode: `warikan` (for deep links)

### Guest Mode & Local Storage
- [ ] SwiftData container set up with LocalSplitSession model
- [ ] HomeView loads from SwiftData when in guest mode
- [ ] HomeView loads from Firestore when in account mode
- [ ] GuestUpsellView (Tab 2 for guests)
- [ ] Soft upsell banner after split completion (dismissible)

### Auth & Account
- [ ] Firebase SDK installed via SPM
- [ ] LandingView (only shown when user explicitly requests sign in/up)
- [ ] SignUpView (email + Apple + Google)
- [ ] SignInView
- [ ] ProfileSetupView
- [ ] Auth state management (AuthViewModel)
- [ ] Firestore user document creation on sign-up

### Core Split Flow
- [ ] `SplitFlowViewModel` — single stateful owner of in-progress split data, scoped to modal sheet lifetime
- [ ] HomeView (recent splits feed + skeleton loading)
- [ ] ScanView (camera + VisionKit + photo library import + Files app import)
- [ ] OCR parsing logic (Vision framework)
- [ ] ReceiptReviewView (line item correction + tax/tip input with 15/18/20/25% quick select)
- [ ] Auto-gratuity detection + migration to tip field
- [ ] Fees section in ReceiptReviewView (detect, edit, add, delete)
- [ ] PeopleSetupView (friends + guests)
- [ ] AssignView (tap to assign, long press multi-assign, live running totals)
- [ ] Split calculation logic (proration of tax/tip + fee proration)
- [ ] SplitSummaryView (expandable cards + share link generation per participant)
- [ ] ShareSplitView (deep link target, no auth required)
- [ ] URL scheme deep link handler in app entry point
- [ ] PaymentView (Venmo + Cash App + PayPal + Zelle deep linking + per-person payment method picker + fallback to copyable text)
- [ ] Save split to Firestore (account holders) or SwiftData (guests) on "All Done →" tap in PaymentView
- [ ] Export split as photo (ImageRenderer → SplitExportView → ShareLink), available on SplitSummaryView + SplitDetailView
- [ ] Error handling: OCR failure, payment app not installed, Firestore save failure

### Social & Friends
- [ ] FriendsView (with empty states)
- [ ] Username search (Firestore query)
- [ ] Contacts import + matching
- [ ] Friend request send/accept/decline
- [ ] FriendProfileView + shared split history
- [ ] SplitDetailView

### Tab 2: Profile & Settings
- [ ] ProfileView (edit inline + sign out)
- [ ] Navigation to FriendsView from ProfileView

## V2 Roadmap (explicitly out of scope for v1)
Do NOT implement any of the following in v1. They are documented here so
Claude Agent does not add them speculatively during v1 development.

- **Push notifications** — FCM integration for friend requests, split invites, payment reminders
- **Android support** — v1 is iOS only
- **Offline sync** — save splits locally when offline and sync when back online
- **Activity feed** — a tab showing friend requests, recent splits, payment updates
- **Equal split toggle** — option to skip itemization and split the total evenly
- **Split templates** — save a group of people for recurring dinners
- **Recurring splits** — for roommate bills and subscriptions
- **Multi-currency support** — for international use cases
- **Export to CSV / PDF** — for expense reporting
- **In-app payment status tracking** — marking individual people as paid within the app

## Known Constraints
- Venmo, Cash App, and PayPal have no public APIs—all payment integration is deep linking only
- Cash App deep link format may change—verify against latest Cash App developer docs before building
- PayPal uses a web URL (paypal.me) not a native URL scheme—will open in Safari if PayPal app is not installed, which is acceptable
- Zelle has no public deep link API for pre-filling amounts or recipients—clipboard copy + app open is the only available integration
- Auto-gratuity pattern matching is best-effort; always let users override detected fees and gratuity
- Payment handles are stored in plaintext in Firestore—they are not sensitive (all are public-facing usernames) but document this clearly in the privacy policy
- PDF receipt import requires rendering page 1 as UIImage before OCR—use PDFKit for this
- Photo library import uses PHPickerViewController (no full Photos permission required in iOS 14+)
- OCR accuracy depends on receipt quality and lighting; always allow manual correction
- Contacts matching is best-effort; not all contacts will have matching Firestore accounts
- Firestore queries on `participantIds` array require a composite index—create in Firebase console when prompted by Xcode logs
- Testing camera on simulator is not possible—use a real device for ScanView testing
- Sign in with Apple requires an Apple Developer account and specific capability entitlements in Xcode
- Google Sign-In requires SHA-1 fingerprint registered in Firebase console
- SwiftData requires iOS 17+—this is already the minimum deployment target so no conflict
- Share links from guest-created splits cannot be resolved via Firestore (split not uploaded yet)—in v1 only generate share links for account holders
- The `shareToken` Firestore security rule uses `request.query.token` which requires the token to be passed as a query parameter in the Firestore SDK call, not just in the URL — Claude Agent must implement this correctly in ShareSplitViewModel when fetching the split
