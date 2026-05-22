// Payment app registry and utilities for Warikan multi-app support.

export type PaymentAppId = "venmo" | "cashapp" | "paypal";

export interface PaymentAppConfig {
  id: PaymentAppId;
  name: string;
  /** Displayed prefix in the handle input (e.g. "@", "$", or "") */
  handlePrefix: string;
  /** Placeholder shown inside the input field */
  handlePlaceholder: string;
  /** Validate the raw handle (without prefix) */
  handlePattern: RegExp;
  /** Build the pay link given a raw handle, amount, and note */
  buildPayLink: (handle: string, amount: number, note: string) => string;
}

export const PAYMENT_APPS: PaymentAppConfig[] = [
  {
    id: "venmo",
    name: "Venmo",
    handlePrefix: "@",
    handlePlaceholder: "yourvenmo",
    handlePattern: /^[\w.-]{1,50}$/,
    buildPayLink(handle, amount, note) {
      const params = new URLSearchParams({
        txn: "pay",
        recipients: handle,
        amount: amount.toFixed(2),
        note,
      });
      return `venmo://paycharge?${params.toString().replace(/\+/g, "%20")}`;
    },
  },
  {
    id: "cashapp",
    name: "Cash App",
    handlePrefix: "$",
    handlePlaceholder: "yourcashtag",
    // Cash App $cashtags: 1–20 chars, letters/numbers/underscores
    handlePattern: /^[\w]{1,20}$/,
    buildPayLink(handle, amount) {
      return `https://cash.app/$${handle}/${amount.toFixed(2)}`;
    },
  },
  {
    id: "paypal",
    name: "PayPal",
    handlePrefix: "@",
    handlePlaceholder: "yourpaypal",
    handlePattern: /^[\w.-]{1,50}$/,
    buildPayLink(handle, amount) {
      return `https://paypal.me/${handle}/${amount.toFixed(2)}`;
    },
  },
];

export function getPaymentApp(id: PaymentAppId): PaymentAppConfig {
  return PAYMENT_APPS.find((a) => a.id === id) ?? PAYMENT_APPS[0];
}

// ---------------------------------------------------------------------------
// localStorage persistence
// ---------------------------------------------------------------------------

const PREF_KEY = "warikan_payment_pref";
const LEGACY_VENMO_KEY = "warikan_venmo_username";

export interface SavedPaymentPreference {
  appId: PaymentAppId;
  handle: string;
}

/** Read saved payment preference, auto-migrating legacy Venmo-only key. */
export function getPaymentPreference(): SavedPaymentPreference | null {
  if (typeof window === "undefined") return null;
  // Migrate old key
  const legacy = localStorage.getItem(LEGACY_VENMO_KEY);
  if (legacy) {
    const pref: SavedPaymentPreference = { appId: "venmo", handle: legacy };
    localStorage.setItem(PREF_KEY, JSON.stringify(pref));
    localStorage.removeItem(LEGACY_VENMO_KEY);
    return pref;
  }
  const raw = localStorage.getItem(PREF_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedPaymentPreference;
  } catch {
    return null;
  }
}

/** Persist payment preference. Pass null to clear. */
export function savePaymentPreference(pref: SavedPaymentPreference | null): void {
  if (typeof window === "undefined") return;
  if (pref) {
    localStorage.setItem(PREF_KEY, JSON.stringify(pref));
  } else {
    localStorage.removeItem(PREF_KEY);
  }
}

// ---------------------------------------------------------------------------
// Encode / decode pay data for QR / shared links
// ---------------------------------------------------------------------------

interface PayPerson {
  n: string;
  a: number;
}

export interface PayData {
  /** payment app id — defaults to "venmo" for backward compat */
  app?: PaymentAppId;
  /** handle (used for all apps in new format) */
  h?: string;
  /** DEPRECATED: venmo username in old format — kept for backward compat */
  v?: string;
  /** restaurant name */
  r?: string;
  /** people */
  p: PayPerson[];
}

export interface DecodedPayData {
  appId: PaymentAppId;
  handle: string | null;
  people: { name: string; amount: number }[];
  restaurantName?: string;
}

const SAFE_TEXT = /^[\w\s'.,&!?():/-]{1,200}$/;
// Allow word chars, dots, hyphens — same as before but also used for handles
const SAFE_HANDLE = /^[\w.-]{1,50}$/;
// Cash App cashtags: just word chars (letters, digits, _)
const SAFE_CASHTAG = /^[\w]{1,20}$/;

function isHandleValid(appId: PaymentAppId, handle: string): boolean {
  if (appId === "cashapp") return SAFE_CASHTAG.test(handle);
  return SAFE_HANDLE.test(handle);
}

export function encodePayData(
  appId: PaymentAppId | null | undefined,
  handle: string | null | undefined,
  people: { name: string; amount: number }[],
  restaurantName?: string
): string {
  const data: PayData = { p: people.map((p) => ({ n: p.name, a: p.amount })) };
  if (appId) data.app = appId;
  if (handle) data.h = handle;
  if (restaurantName) data.r = restaurantName;
  return btoa(JSON.stringify(data));
}

export function decodePayData(hash: string): DecodedPayData | null {
  try {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw) return null;
    const data: PayData = JSON.parse(atob(raw));

    if (
      !Array.isArray(data.p) ||
      data.p.length === 0 ||
      data.p.length > 50 ||
      data.p.some(
        (p) =>
          typeof p.n !== "string" ||
          !SAFE_TEXT.test(p.n) ||
          typeof p.a !== "number" ||
          p.a < 0 ||
          p.a > 99999
      )
    )
      return null;

    // Determine app and handle — support both old (v) and new (app + h) formats
    let appId: PaymentAppId = "venmo";
    let handle: string | null = null;

    if (data.app && data.h) {
      // New format
      appId = data.app;
      const candidateHandle = data.h;
      if (isHandleValid(appId, candidateHandle)) {
        handle = candidateHandle;
      }
    } else if (data.v) {
      // Legacy Venmo-only format
      appId = "venmo";
      if (SAFE_HANDLE.test(data.v)) {
        handle = data.v;
      }
    }

    return {
      appId,
      handle,
      people: data.p.map((p) => ({ name: p.n, amount: p.a })),
      restaurantName: data.r && SAFE_TEXT.test(data.r) ? data.r : undefined,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Backward-compat helpers (used by legacy imports)
// ---------------------------------------------------------------------------

/** @deprecated Use getPaymentPreference() */
export function getVenmoUsername(): string {
  return getPaymentPreference()?.handle ?? "";
}

/** @deprecated Use savePaymentPreference() */
export function saveVenmoUsername(username: string): void {
  if (username) {
    savePaymentPreference({ appId: "venmo", handle: username });
  }
}

/** @deprecated Use getPaymentApp("venmo").buildPayLink() */
export function buildVenmoDeepLink(recipient: string, amount: number, note: string): string {
  return getPaymentApp("venmo").buildPayLink(recipient, amount, note);
}
