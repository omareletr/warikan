# Warikan — Roadmap

Items are grouped by theme and loosely ordered by priority within each section. Nothing here is committed — this is a living document.

---

## Native Apps (Capacitor)

The web app is already wrapped in Capacitor and running on iOS. These are the remaining native milestones.

### Ready to do
- [ ] **App Store submission** — Requires Apple Developer Program ($99/yr). Bundle ID `com.warikan.app` is already registered; swap it back in `capacitor.config.ts` and `project.pbxproj` when ready.
- [ ] **Google Play submission** — Android project is set up. Requires a Google Play Developer account ($25 one-time). Open in Android Studio → Generate Signed Bundle → upload to Play Console.
- [ ] **App icon + splash screen** — Replace Capacitor defaults with Warikan branding. Use `@capacitor/assets` to generate all required sizes from a single 1024×1024 source image.
- [ ] **Live camera viewfinder on native** — Currently the native scan screen shows two buttons (Take Photo / Choose from Library). A richer experience would use `@capacitor/camera-preview` to render a native camera layer behind the WebView, preserving the corner-bracket UI. Medium effort.

### V2 native features
- [ ] **Live Updates (OTA deploys)** — Instead of rebundling the web build on every release, the app fetches the latest build from Netlify on launch and hot-swaps it. JS/HTML/CSS changes would ship instantly without App Store review. Use `@capawesome/capacitor-live-update` or build a lightweight custom version. Only worth doing once there are real App Store users. See notes below.
- [ ] **Push notifications** — Requires a paid Apple developer account and a backend. Useful for reminding people to pay. Use `@capacitor/push-notifications` + Firebase Cloud Messaging.
- [ ] **Haptics on more interactions** — Currently only on dish assignment. Add subtle feedback to: person selection, covered toggle, tip pill selection, copy/done confirmations.
- [ ] **Share extension (iOS)** — Let users share a receipt photo from the Photos app directly into Warikan, bypassing the scan screen.

---

## Auth & Sync (V2)

Currently everything is local — splits live in `localStorage` on one device.

- [ ] **Firebase Authentication** — Google, Apple, Email/password. Auth should be optional: the app works without an account, but signing in unlocks sync and history across devices.
- [ ] **Cloud sync for splits** — Store splits in Firestore, keyed by user ID. Merge strategy: last-write-wins per split ID is fine for V1 sync.
- [ ] **Cross-device history** — View and re-share old splits on any device.

---

## Social & Collaboration

- [ ] **Friends system** — Save frequent dining companions so you don't re-type names every time.
- [ ] **Collaborative real-time splitting** — Generate a QR code others can scan to join the same split session and see assignments update live. Requires a WebSocket backend or Firebase Realtime Database.
- [ ] **Deep links to payment apps** — Currently Venmo uses a custom URL scheme (fragile). Add proper Universal Links / App Links for Cash App and PayPal so they open the right screen directly.

---

## Receipt Parsing Improvements

- [ ] **Retry / manual correction flow** — If Gemini misreads the receipt badly, currently the user edits item by item. A "re-scan" button that re-submits the image (or lets you crop/rotate) would help.
- [ ] **Multi-page receipts** — Long receipts sometimes need two photos. Allow uploading multiple images for a single parse pass.
- [ ] **Receipt language support** — Gemini handles non-English receipts reasonably well already, but the UI strings are English-only. Internationalisation is a longer project.

---

## UX & Design

- [ ] **Light mode** — The app is dark-only. Add a light theme via CSS variables and respect `prefers-color-scheme`.
- [ ] **Tablet / iPad layout** — Currently locked to 390px mobile. A two-column layout for iPad would be nice but is low priority.
- [ ] **Undo on item deletion** — A brief toast with an undo action when a line item is deleted in the Review screen.
- [ ] **Drag to reorder line items** — Let users reorder items in the Review screen for easier assignment.
- [ ] **Onboarding / empty state walkthrough** — First-time users see the scan screen cold. A one-time tooltip sequence would reduce drop-off.

---

## Infrastructure

- [ ] **End-to-end tests** — Playwright tests covering the core split flow (scan → review → people → assign → summary → payment).
- [ ] **Rate limiting tuning** — Current limit is 10 requests/hour per IP via Upstash. Monitor usage and adjust.
- [ ] **Error tracking** — Add Sentry (or similar) to catch runtime errors in production, both web and native.
- [ ] **README update** — Update project structure section to reflect the Capacitor migration (`/lib/platform/`, `/app/split/detail/`, `ios/`, `android/`).
- [ ] **Concurrent claim revert race (known, low risk)** — `handleItemTap`, `handleUnclaim`, and `handleShare` in `app/join/[roomId]/page.tsx` all close over the `room` prop at render time. If an SSE update arrives between the optimistic update and the API response, the `catch` revert calls `onRoomUpdate(room)` with a slightly stale snapshot (missing the SSE delta). In practice this is rare and self-correcting (the next SSE push restores truth), but a clean fix would be to revert via a functional state updater or re-fetch the room on error rather than reverting to the closed-over snapshot.

---

## Live Updates — Design Notes

When this is built, the architecture should be:

1. `npm run build` produces `out/` as usual
2. Netlify deploy publishes `out/` and also writes `out/update-manifest.json`:
   ```json
   { "version": "1.0.4", "buildTime": "2026-05-22T23:00:00Z" }
   ```
3. On native app launch, a Capacitor plugin checks `https://warikan0.netlify.app/update-manifest.json`
4. If `version` is newer than the bundled version, download the new build as a zip, extract to a local path, and set it as the active bundle on next launch
5. Fall back to bundled build if offline or download fails

**Apple App Store rules:** Live updates are permitted for web content (JS/HTML/CSS) but not for new native code or new plugin APIs. Warikan's architecture is clean for this — all business logic is in the web layer; native plugins are stable and don't change with feature updates.

**Rollback:** Keep the previous bundle on disk. If the app crashes on launch after an update, detect it on the next launch attempt and revert to the previous bundle.
