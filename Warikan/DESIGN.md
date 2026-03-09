# Warikan – Design System

## Design Philosophy
Warikan's aesthetic is Japanese-influenced modern fintech. The name means "going dutch" in Japanese — the design should feel like it earns that name. Quiet, considered, and unhurried.

The guiding principle is **restraint as sophistication**. Space is not empty — it is intentional. Color is not decoration — it is signal. Every element on screen should justify its presence. When in doubt, remove something rather than add it.

The app has two visual registers. **Ceremonial screens** — LandingView, GuestUpsellView, ShareSplitView, and the PaymentView completion state — use full-bleed photography or dark gradient backgrounds with frosted glass cards floating above. These are the moments of arrival, invitation, and resolution. **Functional screens** — all split flow steps, profile, friends, history — use a clean white canvas. These screens hold dense information and demand legibility above all else.

The result is an app that feels calm, deep, and occasionally beautiful — not an app that tries to look beautiful at the cost of being usable.

Typography is the primary identity carrier. One vermillion accent — the color of torii gates and traditional hanko seals — appears very sparingly, only where it genuinely marks something important. In functional screens it should feel almost surprising when it appears, which makes each instance feel like a deliberate emphasis.

---

## Color System

### Single Accent Color
One accent color. Used only for: the single primary CTA per screen, active assignment states, hero amounts on functional screens, and the completion moment. Nothing else. It should feel rare.

```swift
// Define once in ColorTokens.swift
extension Color {
    static let vermillion = Color("AccentColor") // Shu — vermillion, torii gate orange
}
```

Maximum 2 instances visible on any functional screen at once. On ceremonial screens (full-bleed background), vermillion is used only on the primary CTA button — nowhere else, as it competes with the background. Never as a large background fill. Never on text smaller than `.subheadline`.

### Backgrounds — Functional Screens
```
Light mode (primary):
  Base:      #FAFAFA  — Warm off-white (main screen backgrounds)
  Surface:   #FFFFFF  — Cards, sheets
  Raised:    #F0F0F0  — Input fields, secondary surfaces

Dark mode (supported):
  Base:      #0F0F0F  — Near black
  Surface:   #1A1A1A  — Cards, sheets
  Raised:    #242424  — Input fields, secondary surfaces
```

### Backgrounds — Ceremonial Screens
Ceremonial screens (LandingView, GuestUpsellView, ShareSplitView, PaymentView completion) use one of two background treatments:

**Option A — Full-bleed photography:**
A single high-quality nature or texture photograph fills the entire screen edge to edge, behind a dark scrim overlay (`rgba(0,0,0,0.35)`). The scrim ensures text and cards remain legible regardless of image brightness. Images should feel calm and atmospheric — not busy. Good examples: still water, sand, fog, stone texture, soft bokeh. No people, no food, no clichés.

**Option B — Dark gradient:**
For screens where no photo is available or suitable:
```
Linear gradient, 160° angle:
  Top:    #1A1A1A
  Bottom: #0A0A0A
```

Both options use the same frosted glass card treatment floating above.

**Implementation:**
```swift
// Full-bleed background + scrim
ZStack {
    Image("landing-bg") // asset name
        .resizable()
        .scaledToFill()
        .ignoresSafeArea()
    Color.black.opacity(0.35)
        .ignoresSafeArea()
    // content above
}
```

### Frosted Glass Cards (Ceremonial Screens Only)
Cards on ceremonial screens use iOS native `.ultraThinMaterial` — never fake it manually. This gives the correct adaptive frosted glass appearance automatically.

```swift
// Frosted glass card — ceremonial screens only
VStack(spacing: 0) {
    // content
}
.padding(24)
.background(.ultraThinMaterial)
.clipShape(RoundedRectangle(cornerRadius: 24))
.shadow(color: .black.opacity(0.18), radius: 24, x: 0, y: 8)
```

On functional screens, use standard `Color("Surface")` cards — no blur, no material. Frosted glass on data-dense screens is illegible and must never be used there.

### Text — Functional Screens
```
Light mode:
  Primary:   #111111  — Headings, key values
  Secondary: #6B6B6B  — Subtext, labels, metadata
  Tertiary:  #B0B0B0  — Placeholder text, disabled states

Dark mode:
  Primary:   #F0F0F0
  Secondary: #8A8A8A
  Tertiary:  #444444
```

### Text — Ceremonial Screens
On full-bleed or dark gradient backgrounds, all text is white or near-white. Do not use the functional text tokens on these screens.
```
Primary:   #FFFFFF                   — Headings, hero amounts
Secondary: rgba(255,255,255,0.65)    — Subtext, labels
Tertiary:  rgba(255,255,255,0.4)     — Fine print, ghost elements
```

### Semantic Colors
```
Success:   #34C759  — Settled splits, confirmed sends (Apple system green)
Warning:   #FF9F0A  — Pending states (Apple system orange)
Error:     #FF3B30  — Failures, validation errors (Apple system red)
Separator: #E8E8E8 (light) / #2A2A2A (dark) — hairline dividers
```

### What Color Is NOT Used For
- No gradients on functional screens — ever
- No colored backgrounds on cards or sections in functional screens
- No multi-color schemes — one accent, full stop
- No tinted navigation bars or tab bars
- Accent color never appears on text smaller than `.subheadline`
- Vermillion never appears on ceremonial screens except the primary CTA

---

## Typography

Warikan uses a **mixed type system**: Cormorant Garamond for display, SF Pro for everything functional. Two fonts with strictly defined roles — never interchangeable.

### The Two Fonts

**Cormorant Garamond** (display only)
A high-contrast elegant serif with razor-thin strokes and extraordinary presence at large sizes. Used exclusively for screen titles, hero numbers, and the wordmark. Its hairline weight is a feature — it forces restraint on where it appears, which makes every instance feel deliberate.

Bundle the `.ttf` files directly in the Xcode project (download free from fonts.google.com/specimen/Cormorant+Garamond). Required weights: Regular (400), SemiBold (600), Bold (700).

```swift
// Define once in FontTokens.swift
extension Font {
    // Cormorant Garamond — display use only, always ≥20pt
    static let displayLarge  = Font.custom("CormorantGaramond-Bold", size: 40)
    static let displayMedium = Font.custom("CormorantGaramond-SemiBold", size: 32)
    static let displaySmall  = Font.custom("CormorantGaramond-SemiBold", size: 24)
    static let wordmark      = Font.custom("CormorantGaramond-SemiBold", size: 28)
}
```

**SF Pro** (all functional text)
Apple's system font for all body copy, labels, navigation, buttons, input fields, and any text below 20pt. Use lighter weights throughout — `.regular` and `.light` in preference to `.medium` and `.semibold` except where emphasis is essential. The lighter weights reinforce the delicacy of the overall system.

### Type Scale
```
Display (Cormorant Garamond):
  displayLarge  40pt Bold      — Hero amounts (total owed, split total)
  displayMedium 32pt SemiBold  — Screen titles (HomeView, SplitSummaryView)
  displaySmall  24pt SemiBold  — Section titles, modal headers
  wordmark      28pt SemiBold  — App wordmark only

Functional (SF Pro — prefer lighter weights):
  .title3       — Card headers (SF Pro Regular, not SemiBold)
  .body         — Primary content, list items (SF Pro Light or Regular)
  .callout      — Receipt line items, supporting info (SF Pro Light)
  .subheadline  — Labels, tags, metadata (SF Pro Regular, not Medium)
  .footnote     — Timestamps, fine print (SF Pro Light)
  .caption      — Smallest labels (SF Pro Light)
```

### Typography Rules
- Cormorant only at 20pt and above — SF Pro below. No exceptions.
- Hero amounts on functional screens: `displayLarge` + `Color.vermillion` — the hanko moment
- Hero amounts on ceremonial screens: `displayLarge`, white — vermillion competes with the background
- Screen titles: `displayMedium`, primary text color for that screen type
- Button labels: SF Pro `.body` — never Cormorant on interactive elements. Use `.semibold` weight only on primary CTAs, `.regular` everywhere else.
- Monetary values: always right-aligned, always `.monospacedDigit()`
- Names and labels: always left-aligned
- Line height: `.lineSpacing(6)` on multi-line SF Pro blocks
- Section labels: SF Pro `.caption`, secondary color, letter-spacing +1.5, all caps — used sparingly. Should feel like a whisper.
- Never use Cormorant below 20pt — the strokes disappear

### Typography as Identity
The wordmark "Warikan" is set in Cormorant Garamond SemiBold 28pt, letter-spacing +1.5, primary text color. No color treatment. On ceremonial screens: white. The serif alone is the statement.

---

## Spacing & Layout

Base unit: 8pt grid. All spacing multiples of 4 or 8. Err strongly on the side of more space. If a screen looks sparse, that is almost always correct.

```
4pt   — Tight gaps (icon-to-label, badge internal padding)
8pt   — Default internal padding
16pt  — Card internal padding
20pt  — Screen horizontal margins
24pt  — Between sections
32pt  — Major section breaks, bottom padding before CTAs
48pt  — Top spacing on hero/ceremonial screens
64pt  — Extra breathing room on near-empty ceremonial screens
```

### Screen Margins
```swift
.padding(.horizontal, 20)
```

### Corner Radii
```
4pt   — Tags, subtle rounding
8pt   — Small chips, badges
12pt  — Input fields, small cards
16pt  — Standard cards, list rows
24pt  — Frosted glass cards, bottom sheets, modals
32pt  — Primary CTA buttons (pill-shaped)
```

### The Japanese Spacing Principle
Ma (間) — the Japanese concept of negative space — is not emptiness but meaningful pause. A screen with 60% content and 40% space feels more premium than one that fills every pixel. On ceremonial screens, push this further: 70% space, 30% content. The photo does the heavy lifting. Let it.

---

## Component Specs

### Primary CTA Button — Functional Screens
```swift
Text("Start Split")
    .font(.body.bold())
    .foregroundStyle(.white)
    .frame(maxWidth: .infinity)
    .frame(height: 54)
    .background(Color.vermillion)
    .clipShape(RoundedRectangle(cornerRadius: 32))
```

### Primary CTA Button — Ceremonial Screens
```swift
// Vermillion still — reads well on dark backgrounds, one accent allowed.
Text("Create Account")
    .font(.body.bold())
    .foregroundStyle(.white)
    .frame(maxWidth: .infinity)
    .frame(height: 54)
    .background(Color.vermillion)
    .clipShape(RoundedRectangle(cornerRadius: 32))
```

### Secondary Button — Functional Screens
```swift
// Separator stroke + PrimaryText — not vermillion. Vermillion is reserved for primary CTA.
Text("Sign In")
    .font(.body)
    .foregroundStyle(Color("PrimaryText"))
    .frame(maxWidth: .infinity)
    .frame(height: 54)
    .overlay(
        RoundedRectangle(cornerRadius: 32)
            .stroke(Color("Separator"), lineWidth: 1)
    )
```

### Secondary Button — Ceremonial Screens
```swift
Text("Sign In")
    .font(.body)
    .foregroundStyle(.white)
    .frame(maxWidth: .infinity)
    .frame(height: 54)
    .overlay(
        RoundedRectangle(cornerRadius: 32)
            .stroke(Color.white.opacity(0.4), lineWidth: 1)
    )
```

### Ghost Button
```swift
// Functional: secondary color. Ceremonial: white opacity.
Text("Continue without account")
    .font(.subheadline)
    .foregroundStyle(Color("SecondaryText")) // or Color.white.opacity(0.6) on ceremonial
```

### Standard Card — Functional Screens
```swift
VStack(alignment: .leading, spacing: 8) {
    // content
}
.padding(16)
.background(Color("Surface"))
.clipShape(RoundedRectangle(cornerRadius: 16))
// No shadow. Elevation through background color contrast only.
```

### Frosted Glass Card — Ceremonial Screens
```swift
VStack(alignment: .leading, spacing: 16) {
    // content
}
.padding(24)
.background(.ultraThinMaterial)
.clipShape(RoundedRectangle(cornerRadius: 24))
.shadow(color: .black.opacity(0.18), radius: 24, x: 0, y: 8)
```

### Amount Display — Functional Screens
```swift
Text("$24.50")
    .font(.displayLarge)
    .monospacedDigit()
    .foregroundStyle(Color.vermillion)
```

### Amount Display — Ceremonial Screens
```swift
Text("$24.50")
    .font(.displayLarge)
    .monospacedDigit()
    .foregroundStyle(.white)
```

### Person Avatar
```swift
// Functional: vermillion tint. Ceremonial: white opacity.
Circle()
    .fill(Color.vermillion.opacity(0.08)) // or Color.white.opacity(0.15) on ceremonial
    .frame(width: 44, height: 44)
    .overlay(
        Text("JD")
            .font(.subheadline)
            .foregroundStyle(Color.vermillion) // or .white on ceremonial
    )
```

### Input Field
```swift
TextField("Username", text: $username)
    .font(.body)
    .padding(14)
    .background(Color("Raised"))
    .clipShape(RoundedRectangle(cornerRadius: 12))
    .overlay(
        RoundedRectangle(cornerRadius: 12)
            .stroke(Color("Separator"), lineWidth: 1)
    )
// Active/focused: stroke becomes Color.vermillion
// Error: stroke becomes system red
```

### Hairline Divider
```swift
Rectangle()
    .fill(Color("Separator"))
    .frame(height: 0.5)
    .padding(.leading, 20)
```

### Skeleton Loading
```swift
RoundedRectangle(cornerRadius: 12)
    .fill(Color("Raised"))
    .frame(height: 72)
    .shimmering() // ViewModifier with moving LinearGradient mask
// 3 rows on HomeView while Firestore loads — account holders only
```

---

## Icons
- SF Symbols exclusively — no third-party libraries
- Filled variant for active/selected states, outlined for inactive
- Size: 20pt for list rows, 24pt for tab bar, 32pt for hero empty states
- Weight: `.thin` or `.light` throughout. Use `.regular` only if the symbol becomes illegible at thin weight.
- Functional screens: `Color.vermillion` for the single active icon, `Color("SecondaryText")` for all others
- Ceremonial screens: `Color.white.opacity(0.9)` active, `Color.white.opacity(0.5)` inactive

### Key SF Symbols per screen
```
Scan receipt:       camera.viewfinder
Receipt review:     doc.text.magnifyingglass
People setup:       person.2
Assign dishes:      fork.knife
Split summary:      equal.circle
Payment:            arrow.up.circle
Friends:            person.2.circle
Search:             magnifyingglass
Profile:            person.crop.circle
Settings:           gearshape
Share link:         square.and.arrow.up
Cloud sync:         icloud.and.arrow.up
Checkmark:          checkmark.circle.fill
Chevron:            chevron.right / chevron.down
QR code:            qrcode
Session live:       dot.radiowaves.left.and.right
Claim dish:         hand.tap
Export photo:       photo.on.rectangle.angled
```

---

## Motion & Interaction

Motion is purposeful and minimal. Animations exist to communicate state change, not to decorate. Every animation has a clear start, middle, and end — nothing loops.

### Timing Principles
- Short interactions: `0.2s easeOut` — button presses, toggles, small state changes
- Medium transitions: `0.3s spring` — sheet presentations, card expansions
- Meaningful moments: `0.4–0.5s spring` — completion screens, first reveal
- Ceremonial screen entrances: `0.6s easeOut` — content surfaces softly from below

### Ceremonial Screen Entrance Animation
Content on ceremonial screens should feel like it surfaces from beneath — not a slide, not a pop. Soft upward drift with fade:

```swift
VStack { ... }
    .opacity(appeared ? 1 : 0)
    .offset(y: appeared ? 0 : 12)
    .animation(.easeOut(duration: 0.6).delay(0.1), value: appeared)
```

### Haptics
Use SwiftUI's `sensoryFeedback` modifier. Always paired with a visible UI change.

```swift
.sensoryFeedback(.impact(weight: .light), trigger: assignmentChanged)
.sensoryFeedback(.impact(weight: .medium), trigger: allAssigned)
.sensoryFeedback(.success, trigger: requestSent)
.sensoryFeedback(.warning, trigger: errorOccurred)
.sensoryFeedback(.selection, trigger: selectedPerson)
.sensoryFeedback(.success, trigger: friendAdded)
```

### Receipt Scan → Parse Transition
1. After capture: scanning line animates top-to-bottom (vermillion, 1.5pt, easeInOut repeat, ~1.5s)
2. OCR complete: line fades `.easeOut(0.2)`
3. Line items appear staggered — each row 60ms after previous:

```swift
ForEach(Array(lineItems.enumerated()), id: \.element.id) { index, item in
    LineItemRow(item: item)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 6)
        .animation(
            .easeOut(duration: 0.25).delay(Double(index) * 0.06),
            value: appeared
        )
}
```

4. `.impact(weight: .light)` haptic as first item appears

### Collaborative Session — Participant Join
Fade in + slide up 8pt, `.easeOut(0.25)`. `.impact(weight: .light)` haptic on creator's device.

### Collaborative Session — Dish Claim Feedback
- Haptic immediately: `.impact(weight: .light)`
- Left border: `0 → 1.5pt`, `.easeOut(0.15)`
- Badge scales in: `0.6 → 1.0`, `.spring(response: 0.3, dampingFraction: 0.7)`
- Unclaiming reverses same animation

### Collaborative Session — Mark as Done
- To done: fill crossfades → system green, `.spring(response: 0.3, dampingFraction: 0.7)`. `.success` haptic.
- Green checkmark badge on avatar: `0.5 → 1.0`, `.spring(response: 0.25, dampingFraction: 0.6)`
- All-ready creator pulse: once only. `1.0 → 1.04 → 1.0`, `.spring(response: 0.3, dampingFraction: 0.5)`. `.success` haptic. Never repeats.

### Collaborative Session — Session Close → SplitSummaryView
- `CollaborativeSessionView` fades out: `.easeIn(0.2)`
- `SplitSummaryView` fades + scales in: `.opacity.combined(with: .scale(scale: 0.97))`, `.spring(duration: 0.35)`
- No intermediate loading screen

### AssignView Interactions
- **Tap avatar**: scale `1.05`, 2pt vermillion ring. `.spring(response: 0.2, dampingFraction: 0.7)`. `.selection` haptic.
- **Tap dish**: vermillion left border (1.5pt, `.easeOut(0.2)`) + badge `0.6 → 1.0`. `.impact(weight: .light)`.
- **Tap assigned dish**: reverse-animate border and badge.
- **Swipe left**: "Assign to all". All badges simultaneously. `.impact(weight: .medium)`.
- **Live totals**: `.contentTransition(.numericText())`.
- **All assigned**: `.impact(weight: .medium)`. CTA slides in from bottom, `.spring(duration: 0.4)`.

### Payment Send Sequence
1. "Send All" tapped:
   - Rows slide out left one by one, 150ms apart, `.easeIn(0.2)`
   - Vermillion checkmark fades in per row
   - `.success` haptic per send
2. Completion — ceremonial treatment:
   - Full-bleed background + dark scrim (same as LandingView)
   - Frosted glass card centered:
     - checkmark.circle.fill, white, 72pt, scales `0.6 → 1.05 → 1.0`, `.spring(response: 0.5, dampingFraction: 0.65)`
     - "All done." in `displaySmall`, white, centered
     - Total sent in `displayLarge`, white, centered
   - Confetti: dots in `#E8471A`, `#FFFFFF`, `rgba(255,255,255,0.3)` — 30 particles, 1.5s, one-shot
   - `.success` haptic on entry
   - "Back to Home" ghost button below card, white opacity 0.6

### SplitSummaryView — Expandable Rows
```swift
.animation(.spring(duration: 0.3), value: isExpanded)
Image(systemName: "chevron.down")
    .rotationEffect(.degrees(isExpanded ? 180 : 0))
    .animation(.easeOut(duration: 0.2), value: isExpanded)
```

### Number Animations
```swift
.contentTransition(.numericText())
.animation(.spring(duration: 0.25), value: amount)
```

### Button Press States
```swift
.scaleEffect(isPressed ? 0.97 : 1.0)
.animation(.easeOut(duration: 0.1), value: isPressed)
```

### Screen Transitions
```swift
// Forward navigation
.transition(.asymmetric(
    insertion: .move(edge: .trailing),
    removal: .move(edge: .leading)
))
// Modal sheets — native .sheet()
// Ceremonial / completion
.transition(.opacity.combined(with: .scale(scale: 0.97)))
.animation(.spring(duration: 0.35), value: showSuccess)
```

---

## Screen-by-Screen Design Notes

### LandingView — CEREMONIAL
Only shown when user explicitly requests sign in/up — never on cold launch.

- Full-bleed background photo + dark scrim (`rgba(0,0,0,0.35)`), ignoring safe area
- Content centered vertically, 64pt top padding
- Wordmark "Warikan" in Cormorant Garamond SemiBold 28pt, white, letter-spacing +1.5, centered — entrance animation (fade + drift up, `.easeOut(0.6)`)
- 48pt gap
- Frosted glass card (`.ultraThinMaterial`, 24pt corner radius, 24pt padding, soft shadow):
  - Title: "Welcome back." or "Start here." in `displaySmall` (Cormorant SemiBold 24pt), white, centered
  - 12pt gap
  - Vermillion "Create Account" CTA, full width, 54pt
  - 12pt gap
  - Outlined "Sign In" secondary button, white stroke opacity, full width, 54pt
  - 16pt gap
  - Ghost link "Continue without account" — white opacity 0.6, SF Pro `.subheadline`, centered
- No illustrations — photo and typography carry everything

### ProfileSetupView — FUNCTIONAL
First impression after sign-up. White canvas, warm and unhurried.

- Navigation bar: no back button. "Set up your profile" in SF Pro `.title3`, centered. Regular weight.
- 32pt top padding
- **Display name field**: label "YOUR NAME" in SF Pro `.caption`, secondary color, letter-spacing +1.5. Input field below. Placeholder: "How should we call you?". Required.
- 16pt gap
- **Username field**: label "USERNAME" same style. Placeholder: "e.g. omar". Real-time availability check — checkmark.circle (system green) when available, xmark.circle (system red) when taken, progress indicator while checking. Rules in SF Pro `.caption`, tertiary: "3–20 characters · lowercase · letters, numbers, _ and - only". Required.
- 24pt gap
- **Section label**: "PAYMENT HANDLES" in SF Pro `.caption`, secondary, letter-spacing +1.5 + ghost link "Skip for now" right-aligned.
- 12pt gap
- Four payment handle fields: platform label left (SF Pro `.subheadline`, secondary, light weight) + compact input right (40pt height). Labels: "Venmo" · "Cash App ($)" · "PayPal" · "Zelle". All optional.
- 32pt gap
- Vermillion "Continue →" CTA, full width, 54pt, pinned to bottom. Disabled until display name and valid username filled.

### GuestUpsellView (Tab 2 for guests) — CEREMONIAL
- Full-bleed background photo + dark scrim, ignoring safe area
- Content centered vertically, 64pt top padding
- Wordmark Cormorant SemiBold 28pt, white, centered — entrance animation
- 48pt gap
- Frosted glass card (`.ultraThinMaterial`, 24pt corner radius, 24pt padding):
  - Icon: icloud.and.arrow.up, 28pt, white opacity 0.9, centered
  - 12pt gap
  - Title: "Your splits, everywhere." in `displaySmall` (Cormorant SemiBold 24pt), white, centered
  - 8pt gap
  - Body: "Create a free account to sync splits across devices and save your friends' payment info." — SF Pro `.body`, white opacity 0.7, centered, generous line height
  - 24pt gap
  - Vermillion "Create Account" CTA, full width, 54pt
  - 12pt gap
  - Outlined "Sign In" button, white stroke opacity, full width, 54pt
  - 16pt gap
  - Ghost link "Continue without account" — white opacity 0.5, centered

### HomeView — FUNCTIONAL

**Account holder view:**
- White canvas. Tab bar visible.
- Top: greeting "Hey, [firstName]." in `displayMedium` (Cormorant Garamond SemiBold 32pt), `#111111`. [firstName] = first word of `AppUser.displayName` only — "Omar El-Etr" → "Hey, Omar."
- 4pt gap
- "You're owed $X.XX" in SF Pro `.body`, secondary color, amount inline in `Color.vermillion`. Only shown when unsettled splits exist where user is creator. Omit entirely if $0.
- 24pt space, then section label "RECENT" in SF Pro `.caption`, secondary, letter-spacing +1.5
- Split rows with hairline dividers:
  - Restaurant name (or "Split") in SF Pro `.body`, `#111111`, left — regular weight, not bold
  - Grand total in SF Pro `.body`, secondary color, right, `.monospacedDigit()`
  - Below: date in SF Pro `.caption`, secondary left · people count right
  - Settlement dot: 6pt filled circle. System green if settled, warning orange if pending.
  - Hairline divider below each row
- Floating vermillion "+" button bottom-right, 56pt circle, white plus symbol, no shadow
- Skeleton: 3 shimmer rows while Firestore loads — account holders only
- **"PAST" section**: settled splits below, same label style. Name in secondary, total in tertiary, no dot.

**Guest view:**
- Greeting: "Hey there." in `displayMedium`, `#111111`
- 4pt gap
- "Splits you create are saved on this device." SF Pro `.body`, secondary color
- Same "RECENT" section and row layout, pulling from SwiftData. Same "+" button. No skeleton.

### ScanView — FUNCTIONAL
- Near full-screen camera viewfinder, minimal chrome
- Thin vermillion rectangular crop guide overlay
- Vermillion circular shutter button, bottom center, 64pt
- Source picker (Camera / Photos / Files): three small labeled icon buttons above shutter, secondary color, `.thin` symbol weight

### ReceiptReviewView — FUNCTIONAL
Most data-dense screen. White canvas. Scannable, not overwhelming.

**Structure (ScrollView):**
- Navigation bar: back chevron, "Review Receipt" in SF Pro `.title3`, `#111111`, centered. Step indicator.
- 16pt padding
- **Section label**: "ITEMS" in SF Pro `.caption`, secondary, letter-spacing +1.5. Hairline divider.
- **Line item rows**: dish name (SF Pro `.body`, `#111111`, left) + price (SF Pro `.body`, `#111111`, right, `.monospacedDigit()`). Tappable to edit inline. Missing/zero price: red left border (1.5pt), price in system red.
- Swipe-left-to-delete (SF Symbol: trash, system red).
- "Add Item" ghost button below list (SF Pro `.subheadline`, secondary, `+` prefix).
- 24pt gap
- **Section label**: "FEES". Only shown if fees detected or added. Hairline divider.
- Fee rows: same layout. Editable. Swipe-to-delete. "Add Fee" ghost button.
- 24pt gap
- **Section label**: "TAX & TIP". Hairline divider.
- Tax row: "Tax" left + amount field right (SF Pro `.body`, `.monospacedDigit()`, `Color("Raised")` pill, 8pt corner radius). Pre-filled from OCR if detected.
- 12pt gap
- Tip row: "Tip" left + amount field right. Below: four quick-select pills — **15% / 18% / 20% / 25%** (SF Pro `.footnote`, secondary stroke, 8pt radius, 8pt padding). Active pill: vermillion fill, white text. Custom state when freeform value entered.
- 24pt gap
- **Live Summary bar**: sticky, pinned above CTA. Subtotal · Tax · Tip · Total — SF Pro `.footnote` labels, `.body` amounts, `.monospacedDigit()`. Live update with `.contentTransition(.numericText())`.
- **"Continue" CTA**: vermillion, full width, 54pt, pinned to bottom. Disabled (opacity 0.4) if any price is $0.00. Tooltip: "Fix prices marked in red before continuing."
- **"Start Collaborative Session"**: ghost button, SF Pro `.subheadline`, secondary, qrcode symbol prefix, 12pt above "Continue". Only shown after OCR produces ≥1 item.

**Inline editing:** tap name or price → TextField, keyboard appears, Return or tap-outside commits.

**Auto-gratuity banner:** dismissible, below nav bar. "We detected an included gratuity of $X and added it to Tip. Tap to adjust." — SF Pro `.footnote`, `#111111`, white background, 1pt vermillion left border, 12pt horizontal padding, 8pt vertical padding.

### PeopleSetupView — FUNCTIONAL
- Navigation bar: back chevron, "Who's splitting?" in SF Pro `.title3`, centered. Step indicator.
- 16pt padding
- Search/add field: full-width, `Color("Raised")` background, 12pt corner radius. Placeholder: "Search friends or add a guest". magnifyingglass icon left. Vermillion "Add" button right when text present.
  - Account holders: live Firestore friend search, dropdown (max 5 rows, hairline dividers). Tap adds to split.
  - Guests/non-friends: "Add" creates a Guest record.
- 16pt gap
- **Section label**: "IN THIS SPLIT" in SF Pro `.caption`, secondary, letter-spacing +1.5. Hidden if empty.
- Added people: avatar (44pt) + name (SF Pro `.body`, `#111111`) + xmark.circle.fill remove button (secondary, 20pt). Creator first with "You" label — not removable. Hairline dividers.
- 16pt gap
- "Import from Contacts" ghost link (account holders only).
- **"Continue" CTA**: vermillion, full width, 54pt, pinned to bottom. Disabled until ≥1 other person added. Label: "Continue with [N] people".

**Empty state:** "No friends yet. Add by name or import from Contacts." SF Pro `.footnote`, secondary, centered.

### PaymentView — FUNCTIONAL
Terminal screen. No back button.

- Navigation bar: no back button. "Send Requests" in SF Pro `.title3`, centered. No step indicator.
- 16pt padding
- **Person rows** (white card, 16pt corner radius, 1pt `#E8E8E8` stroke):
  - Left: avatar (44pt) + name (SF Pro `.body`, `#111111`) + amount below (SF Pro `.subheadline`, `Color.vermillion`, `.monospacedDigit()`)
  - Right: "Send" vermillion pill (SF Pro `.footnote`, white, 8pt radius, 32pt height). After tap: replaced by checkmark.circle.fill system green, `.spring` scale-in.
  - Below: payment method picker — Venmo / Cash App / PayPal / Zelle as small text buttons. Active in `Color.vermillion`, others in secondary.
  - No handle: inline compact text field below picker.
  - Zelle: "⚠️ Manual entry required" in SF Pro `.caption`, warning orange, always shown.
- 24pt gap between rows
- **"Send All" CTA**: vermillion, full width, 54pt, pinned to bottom. After all sent: label changes to "All Done →".

**Handle pre-fill:** friends auto-filled from Firestore. Guests per-split only. No-handle guests show inline entry immediately.

**Re-send mode** (from SplitDetailView → "Resend Requests"): identical appearance. Split already saved — no re-write. "All Done →" only updates `settled` and `settledAt`.

### PaymentView Completion — CEREMONIAL
After "All Done →" is tapped:

- Full-bleed background (same photo asset as LandingView, or dark gradient)
- Dark scrim `rgba(0,0,0,0.35)`
- Frosted glass card centered (`.ultraThinMaterial`, 24pt corner radius, 32pt padding):
  - checkmark.circle.fill, white, 72pt — scales `0.6 → 1.05 → 1.0`, `.spring(response: 0.5, dampingFraction: 0.65)`
  - 16pt gap
  - "All done." in `displaySmall` (Cormorant SemiBold 24pt), white, centered
  - 4pt gap
  - Total sent in `displayLarge` (Cormorant Bold 40pt), white, centered
- Confetti: dots in `#E8471A`, `#FFFFFF`, `rgba(255,255,255,0.3)` — 30 particles, 1.5s, one-shot
- `.success` haptic on entry
- "Back to Home" ghost button below card, white opacity 0.6

### SplitDetailView — FUNCTIONAL
- Navigation bar: back chevron, restaurant name (or "Split") in SF Pro `.title3`, centered. Share icon (square.and.arrow.up, thin weight) top-right — triggers export-as-photo.
- 20pt padding
- **Header block**:
  - Date in SF Pro `.footnote`, secondary
  - 4pt gap
  - Grand total in `displayMedium` (Cormorant SemiBold 32pt), `#111111` — one step down from SplitSummaryView's displayLarge. History is reference, not moment.
  - 4pt gap
  - Settlement pill: "Settled" (system green fill, white `.caption` text) or "Pending" (warning orange, white), 8pt corner radius
- 24pt gap
- **Section label**: "SPLIT BETWEEN" in SF Pro `.caption`, secondary, letter-spacing +1.5. Hairline divider.
- **Participant rows** (expandable):
  - Collapsed: avatar + name (SF Pro `.body`, `#111111`) + amount in `Color.vermillion` + chevron.right
  - Expanded: indented itemized list (SF Pro `.footnote`, secondary): dish + price. Tax/tip/fee in tertiary. Chevron rotates 180°.
- 24pt gap
- **Actions** (hairline divider above):
  - Unsettled: "Mark as Settled" outlined button (full width, separator stroke, SF Pro `.body`, `#111111`). Confirmation: "Mark Settled" (vermillion) | "Cancel."
  - Settled: timestamp in SF Pro `.footnote`, secondary. "Mark as Unsettled" ghost link.
  - "Resend Requests" ghost link — re-opens PaymentView in re-send mode.

### Progress Indicator (Split Flow Steps) — FUNCTIONAL
Thin horizontal bar below nav bar title. No numbers, no labels.

```swift
// totalSteps = 5. Steps: Scan(1) → Review(2) → People(3) → Assign(4) → Summary(5)
// PaymentView: no progress bar.
let totalSteps = 5
GeometryReader { geo in
    ZStack(alignment: .leading) {
        Rectangle()
            .fill(Color("Raised"))
            .frame(height: 2)
        Rectangle()
            .fill(Color.vermillion)
            .frame(width: geo.size.width * CGFloat(currentStep) / CGFloat(totalSteps), height: 2)
            .animation(.easeOut(duration: 0.3), value: currentStep)
    }
}
.frame(height: 2)
.padding(.horizontal, 20)
```

### AssignView — FUNCTIONAL
Core interaction. Fast, tactile, satisfying.

**Interaction model:** select a person first, then tap dishes to assign them.

- Navigation bar: back chevron, "Assign Dishes" in SF Pro `.title3`, centered. Step indicator.
- **Person avatar strip**: horizontal scroll below nav. Each avatar 44pt (vermillion tint, vermillion initials). Name in SF Pro `.caption`, secondary, below. Running total in SF Pro `.caption`, `Color.vermillion`, below name — `.contentTransition(.numericText())`. Selected: 2pt vermillion ring, scale 1.05. Hairline divider below strip.
- **Dish list**: full-width ScrollView. Each row:
  - Name (SF Pro `.body`, `#111111`) + price (SF Pro `.body`, `#111111`, `.monospacedDigit()`) — regular weight
  - Assigned: 1.5pt vermillion left border + initials badges (32pt, -8pt overlap if multiple)
  - Tap assigns/removes (toggle). Hairline divider below.
  - Swipe left: "All" shortcut (person.2, secondary)
- **"Continue" CTA**: vermillion, full width, 54pt, pinned to bottom. Slides in from bottom, `.spring(duration: 0.4)`, once all dishes assigned.

### SplitSummaryView — FUNCTIONAL
- Navigation bar: "Summary" in SF Pro `.title3`, centered. Share icon (square.and.arrow.up, thin weight, secondary) top-right — export-as-photo only. Step indicator (5/5, bar full).
- 20pt padding
- **Header block**:
  - Restaurant name (or "Your Split") in `displayMedium` (Cormorant SemiBold 32pt), `#111111`
  - 4pt gap
  - Grand total in `displayLarge` (Cormorant Bold 40pt), `Color.vermillion`, `.monospacedDigit()`
  - 8pt gap
  - Metadata in SF Pro `.footnote`, secondary: people count · date
- 24pt gap
- **Section label**: "EACH PERSON OWES". Hairline divider.
- **Participant rows** (expandable):
  - Collapsed: avatar (44pt) + name (SF Pro `.body`, `#111111`) + amount (`Color.vermillion`, SF Pro `.body`, `.monospacedDigit()`) + chevron.right. Hairline divider.
  - Expanded: chevron rotates 180°. Indented itemized list (SF Pro `.footnote`, secondary): dish + share. Tax/tip/fee in tertiary.
  - One expanded at a time.
- 24pt gap
- **Share links** (account holders only):
  - Section label: "SHARE WITH EACH PERSON". Hairline divider.
  - One row per participant: avatar (32pt) + name + share icon (square.and.arrow.up, 16pt, `Color.vermillion`) right. Tap fires iOS `ShareLink`.
  - Ghost link below: "Share all at once."
- 32pt gap
- **"Send Requests →" CTA**: vermillion, full width, 54pt, pinned to bottom.

### ShareSplitView (deep link, no auth required) — CEREMONIAL
Recipient may be seeing Warikan for the first time. Make it beautiful.

- Full-bleed background photo + dark scrim, ignoring safe area
- No nav bar, no tab bar — fully standalone
- 64pt top padding
- Wordmark Cormorant SemiBold 28pt, white, centered — entrance animation
- 48pt gap
- Frosted glass card (`.ultraThinMaterial`, 24pt corner radius, 24pt padding):
  - Recipient initials avatar (44pt, white opacity fill) centered
  - 8pt gap
  - Recipient name in `displaySmall` (Cormorant SemiBold 24pt), white, centered
  - 4pt gap
  - "your share" in SF Pro `.footnote`, white opacity 0.6, centered, lowercase
  - 8pt gap
  - Amount in `displayLarge` (Cormorant Bold 40pt), white, centered — the hero
  - 24pt gap
  - Expandable itemized breakdown (hairline rows, SF Pro `.footnote`, white opacity 0.7, collapsed by default)
  - 24pt gap
  - Vermillion "Pay via Venmo" CTA, full width, 54pt
  - 12pt gap
  - If no handle: outlined "Copy $X.XX" (white stroke opacity)
- 24pt gap below card
- Ghost link "Get Warikan" — white opacity 0.4, SF Pro `.caption`, centered

### ProfileView — FUNCTIONAL
- Navigation bar: "Profile" in SF Pro `.title3`, centered. "Sign Out" ghost link top-right (SF Pro `.subheadline`, secondary). Confirmation alert on tap.
- 24pt top padding
- **Identity block** (centered):
  - Avatar (64pt, vermillion tint, initials)
  - 12pt gap
  - Display name in `displaySmall` (Cormorant SemiBold 24pt), `#111111`, centered. Tap to edit inline.
  - 4pt gap
  - Username in SF Pro `.subheadline`, secondary, `@username`. Tap opens edit bottom sheet (`detents: [.medium]`).
- 32pt gap
- **Section label**: "PAYMENT HANDLES". Hairline divider.
- Handle rows: platform label left (SF Pro `.body`, `#111111`, light weight) + value right (secondary if set, tertiary + "Add" if not). Tap to edit inline.
- 8pt gap below handles
- **Preferred method row**: "Preferred method" left (SF Pro `.body`, `#111111`) + selected method right (`Color.vermillion`). Tap opens picker.
- 32pt gap
- **Section label**: "FRIENDS". Hairline divider.
- Friends row: "Friends" (SF Pro `.body`, `#111111`) + count (secondary) + chevron.right → FriendsView. Vermillion dot badge if pending requests.

### FriendsView — FUNCTIONAL
- Navigation bar: "Friends" in SF Pro `.title3`, centered. Back chevron.
- Native iOS search bar at top
- Segmented control: All / Pending / Contacts
- **All tab**: avatar (44pt) + display name (SF Pro `.body`, `#111111`) + username (SF Pro `.subheadline`, secondary) + hairline divider. Tap → FriendProfileView.
- **Pending tab**: incoming requests top, sent below. avatar + name + "Accept" vermillion pill + "Decline" ghost link.
- **Contacts tab**: matched show "Add" vermillion pill. Unmatched not shown.

### FriendProfileView — FUNCTIONAL
- Navigation bar: friend's display name in SF Pro `.title3`, centered. Back chevron.
- 24pt top padding
- Avatar (64pt, vermillion tint) centered. 12pt gap.
- Display name in `displaySmall` (Cormorant SemiBold 24pt), `#111111`, centered. 4pt gap.
- Username in SF Pro `.subheadline`, secondary, `@username`. 32pt gap.
- **Section label**: "SHARED SPLITS". Hairline divider.
- Splits where both users appear in `participantIds`. Same row style as HomeView. Tap → SplitDetailView.
- Empty state: "No shared splits yet." SF Pro `.footnote`, secondary, centered.

### SignUpView / SignInView — FUNCTIONAL
Standard Firebase Auth patterns. White canvas, generous spacing, SF Pro throughout. No Cormorant. Use Input Field, Primary CTA (functional), Ghost Button from component library.

### CollaborativeSessionView (QR Screen — Creator) — FUNCTIONAL
- White canvas, no navigation chrome except bottom CTA
- 48pt top padding
- "Everyone scan this" in `displaySmall` (Cormorant SemiBold 24pt), `#111111`, centered
- 16pt gap
- QR code: 240×240pt, centered, no border
- 12pt gap
- Session code in SF Pro `.title`, `#111111`, monospaced, letter-spacing +4 (e.g. `X7K2MR`). Regular weight.
- 8pt gap
- "Or enter this code" in SF Pro `.caption`, secondary, centered
- 32pt gap
- **Participant list**: staggered fade-in (60ms between). Pre-added guests: "Not joined yet" in `.caption`, tertiary. Joined: avatar (36pt, vermillion tint) + name. Creator row: "You" badge, secondary. Hairline dividers.
- **"Start Claiming" CTA**: vermillion, full width, 54pt, pinned to bottom. Enabled immediately.

### CollaborativeSessionView (Claiming — All Devices) — FUNCTIONAL
White canvas. Real-time Firestore.

- Navigation bar: "Claiming" in SF Pro `.title3`, centered. Participants: no back. Creator: back/close only before any claiming.
- Top strip: participant avatars (horizontal scroll). Name in `.caption`, secondary below. "Claimed so far" count in `.caption`, tertiary below name. `isDone = true` → green checkmark badge bottom-right of avatar.
- Dish rows (hairline dividers):
  - Unclaimed: name (`.body`, `#111111`) + price (`.body`, `#111111`, `.monospacedDigit()`)
  - Mine: 1.5pt vermillion left border + my initials badge (32pt) + price in `Color.vermillion`
  - Someone else's: secondary name + their badge. Still tappable.
  - Co-claimed: two overlapping badges (-8pt) + "÷[N]" in `.caption`, secondary, below full price

**"I'm done" button** (participants only): full width, 40pt, pinned above dish list.
- Default: outlined secondary pill, "I'm done"
- Done: filled system green, "✓ Done — tap to undo". Reversible. Does not lock claims.

**"Done — Close Session"** (creator only): vermillion, full width, 54pt, pinned to bottom. Live count: "Done — Close Session  ·  2/4 ready" when ≥1 done. All-ready: single pulse + `.success` haptic — never repeats.

**Waiting label** (participants, shown when all claimed + marked done): "Waiting for [Creator] to close the session" — SF Pro `.footnote`, secondary, centered, pinned to bottom above safe area.

### CollaborativeSessionView — Name Entry Sheet — FUNCTIONAL
- Bottom sheet, `detents: [.medium]`, `interactiveDismissDisabled(true)`
- "What's your name?" in `displaySmall` (Cormorant SemiBold 24pt), `#111111`, centered, 32pt top padding
- 8pt gap
- Single text field: SF Pro `.body`, `Color("Raised")` background, 12pt radius, 14pt padding, auto-focuses
- 16pt gap
- Vermillion "Join" CTA, full width, 54pt, disabled until ≥1 character

### SplitExportView (off-screen render only) — FUNCTIONAL
Rendered by `ImageRenderer`, never shown in app. Fixed width 390pt, white background, 24pt horizontal padding, 32pt vertical padding.

- Row: "Warikan" wordmark (Cormorant SemiBold 20pt, `#111111`) left + date (SF Pro `.footnote`, secondary) right
- 16pt gap → restaurant name in `displaySmall`, `#111111`
- 4pt gap → grand total in `displayLarge`, `Color.vermillion`
- 20pt gap → hairline divider (`#E8E8E8`, 0.5pt)
- 16pt gap → participant blocks:
  - avatar (36pt, vermillion tint) + name `.body` + total `Color.vermillion` right
  - indented itemized list: item `.footnote` + price `.footnote`, secondary, 4pt between
  - 12pt between participants, hairline divider between
- 12pt after last participant → totals row: Tax · Tip · Fees, SF Pro `.footnote`, secondary, right-aligned
- 24pt gap → "Split with Warikan" SF Pro `.caption`, tertiary, right-aligned

Render at `renderer.scale = 3.0`.

---

## Light/Dark Mode Implementation

Always use semantic Asset Catalog color names — never hardcoded hex in functional views.

```swift
// Assets.xcassets (light / dark):
// "Background"    → #FAFAFA / #0F0F0F
// "Surface"       → #FFFFFF / #1A1A1A
// "Raised"        → #F0F0F0 / #242424
// "PrimaryText"   → #111111 / #F0F0F0
// "SecondaryText" → #6B6B6B / #8A8A8A
// "TertiaryText"  → #B0B0B0 / #444444
// "Separator"     → #E8E8E8 / #2A2A2A

Color("Background")
Color("Surface")
Color("PrimaryText")
Color("SecondaryText")
```

`Color.vermillion` (`#E8471A`) is identical in both modes.

`.ultraThinMaterial` adapts automatically — no manual handling needed.

Ceremonial screens use hardcoded white text and white opacity values. These are intentional overrides of the semantic system, not errors.

---

## What to Avoid
- No gradients on functional screens
- No frosted glass / `.ultraThinMaterial` on functional screens — legibility first
- No drop shadows on functional screens
- No colored section backgrounds on functional screens
- No third-party icon or illustration libraries
- No illustrations or decorative imagery on functional screens
- No more than 2 instances of `Color.vermillion` on any functional screen at once
- No vermillion on ceremonial screens except the primary CTA
- No looping animations
- No haptics without a paired visible UI change
- Never show a blank screen during loading
- Never show confetti more than once per session
- No busy layouts — remove elements before reducing spacing
- Prefer SF Pro regular and light weights — avoid bold unless essential
- Accent color never used as a large background fill

---

## Empty States

**HomeView — no splits yet:**
```
Icon:    fork.knife, 32pt, Color.vermillion, .thin symbol weight
Title:   "Your first split starts here."  — SF Pro .title3, #111111, regular weight
Body:    "Scan a receipt and stop doing math in your head."  — SF Pro .body, secondary, light
CTA:     Vermillion "Scan a Receipt" button
```

**FriendsView — no friends yet:**
```
Icon:    person.2.circle, 32pt, Color.vermillion, .thin symbol weight
Title:   "Add your usual crew."  — SF Pro .title3, #111111, regular weight
Body:    "Import from contacts or search by username."  — SF Pro .body, secondary
CTA:     "Import Contacts" (vermillion) | "Search" (outlined, separator stroke)
```

**FriendsView — search no results:**
```
Icon:    magnifyingglass, 28pt, secondary color, .thin symbol weight
Title:   "No one found."  — SF Pro .title3, #111111, regular weight
Body:    "Try their username or invite them to join Warikan."  — SF Pro .body, secondary
CTA:     Ghost link: "Send an invite"
```
