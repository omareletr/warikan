import type { Split } from "./types";

const STORAGE_KEY = "warikan_splits";

export function getSplits(): Split[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Split[];
    if (!Array.isArray(parsed)) throw new Error("invalid");
    return parsed;
  } catch {
    console.error("Warikan: split history corrupted — clearing storage.");
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    return [];
  }
}

export function saveSplit(split: Split): void {
  const splits = getSplits();
  const idx = splits.findIndex((s) => s.id === split.id);
  if (idx >= 0) {
    splits[idx] = split;
  } else {
    splits.unshift(split);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(splits));
  } catch {
    throw new Error("Could not save split — storage may be full.");
  }
}

export function getSplitById(id: string): Split | null {
  return getSplits().find((s) => s.id === id) ?? null;
}

export function deleteSplit(id: string): void {
  const splits = getSplits().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(splits));
}

export function clearAllSplits(): void {
  localStorage.removeItem(STORAGE_KEY);
}
