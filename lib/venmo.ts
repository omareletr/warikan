const VENMO_KEY = "warikan_venmo_username";

export function getVenmoUsername(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(VENMO_KEY) ?? "";
}

export function saveVenmoUsername(username: string): void {
  localStorage.setItem(VENMO_KEY, username);
}

export function buildVenmoDeepLink(recipient: string, amount: number, note: string): string {
  const params = new URLSearchParams({
    txn: "pay",
    recipients: recipient,
    amount: amount.toFixed(2),
    note,
  });
  return `venmo://paycharge?${params.toString().replace(/\+/g, "%20")}`;
}

interface PayPerson {
  n: string;
  a: number;
}

interface PayData {
  v?: string;
  r?: string;
  p: PayPerson[];
}

export function encodePayData(
  venmoUsername: string | null | undefined,
  people: { name: string; amount: number }[],
  restaurantName?: string
): string {
  const data: PayData = { p: people.map((p) => ({ n: p.name, a: p.amount })) };
  if (venmoUsername) data.v = venmoUsername;
  if (restaurantName) data.r = restaurantName;
  return btoa(JSON.stringify(data));
}

const SAFE_TEXT = /^[\w\s'.,&!?():/-]{1,200}$/;
const SAFE_USERNAME = /^[\w.-]{1,50}$/;

export function decodePayData(hash: string): {
  venmoUsername: string | null;
  people: { name: string; amount: number }[];
  restaurantName?: string;
} | null {
  try {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw) return null;
    const data: PayData = JSON.parse(atob(raw));
    if (
      (data.v !== undefined && (typeof data.v !== "string" || !SAFE_USERNAME.test(data.v))) ||
      !Array.isArray(data.p) ||
      data.p.length === 0 ||
      data.p.length > 50 ||
      data.p.some((p) => typeof p.n !== "string" || !SAFE_TEXT.test(p.n) || typeof p.a !== "number" || p.a < 0 || p.a > 99999)
    ) return null;
    return {
      venmoUsername: data.v ?? null,
      people: data.p.map((p) => ({ name: p.n, amount: p.a })),
      restaurantName: data.r && SAFE_TEXT.test(data.r) ? data.r : undefined,
    };
  } catch {
    return null;
  }
}
