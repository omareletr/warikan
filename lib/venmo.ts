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
  return `venmo://paycharge?${params.toString()}`;
}

interface PayPerson {
  n: string;
  a: number;
}

interface PayData {
  v: string;
  r?: string;
  p: PayPerson[];
}

export function encodePayData(
  venmoUsername: string,
  people: { name: string; amount: number }[],
  restaurantName?: string
): string {
  const data: PayData = {
    v: venmoUsername,
    p: people.map((p) => ({ n: p.name, a: p.amount })),
  };
  if (restaurantName) data.r = restaurantName;
  return btoa(JSON.stringify(data));
}

export function decodePayData(hash: string): {
  venmoUsername: string;
  people: { name: string; amount: number }[];
  restaurantName?: string;
} | null {
  try {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    if (!raw) return null;
    const data: PayData = JSON.parse(atob(raw));
    return {
      venmoUsername: data.v,
      people: data.p.map((p) => ({ name: p.n, amount: p.a })),
      restaurantName: data.r,
    };
  } catch {
    return null;
  }
}
