import type { Split } from "./types";
import { normalizeLineItems } from "./line-items";

const STORAGE_KEY = "warikan_splits";
// History that can't be read in full is copied here before anything rewrites it, so nothing is ever deleted.
const BACKUP_KEY = "warikan_splits_unreadable";

function keepBackup(raw: string) {
  try {
    const existing = localStorage.getItem(BACKUP_KEY);
    // Append each distinct unreadable version, so a later corruption can't be lost behind an earlier one.
    if (!existing) localStorage.setItem(BACKUP_KEY, raw);
    else if (!existing.includes(raw)) localStorage.setItem(BACKUP_KEY, `${existing}\n${raw}`);
  } catch {}
}

function readSplit(value: unknown): Split[] {
  const split = value as Split;
  if (!split || typeof split.id !== "string" || !Array.isArray(split.lineItems) || !Array.isArray(split.people)) return [];
  try {
    return [{ ...split, lineItems: normalizeLineItems(split.lineItems) }];
  } catch {
    return [];
  }
}

export function getSplits(): Split[] {
  if (typeof window === "undefined") return [];
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {}
  if (!Array.isArray(parsed)) {
    console.error("Warikan: split history unreadable — kept a copy, starting empty.");
    keepBackup(raw);
    return [];
  }

  // One broken split shouldn't hide the rest: skip it, keep a copy of the original.
  const splits = parsed.flatMap(readSplit);
  if (splits.length < parsed.length) {
    console.error(`Warikan: skipped ${parsed.length - splits.length} unreadable split(s) — kept a copy.`);
    keepBackup(raw);
  }
  return splits;
}

export function saveSplit(split: Split): void {
  const normalizedSplit = { ...split, lineItems: normalizeLineItems(split.lineItems) };
  const splits = getSplits();
  const idx = splits.findIndex((s) => s.id === split.id);
  if (idx >= 0) {
    splits[idx] = normalizedSplit;
  } else {
    splits.unshift(normalizedSplit);
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
  localStorage.removeItem(BACKUP_KEY); // "Clear all" means gone, backups included
}
