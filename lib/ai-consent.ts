// Records the user's permission to send receipts to Google Gemini.
// App Store guideline 5.1.2(i) requires asking before personal data
// reaches a third-party AI service. Bump the key if what we send changes.
const KEY = "warikan:ai-consent-v1";

export function hasAiConsent(): boolean {
  try {
    return localStorage.getItem(KEY) === "granted";
  } catch {
    return false;
  }
}

export function saveAiConsent(): void {
  try {
    localStorage.setItem(KEY, "granted");
  } catch {
    // Storage unavailable: the user is asked again next time
  }
}
