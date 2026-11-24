import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAllSplits, getSplits, saveSplit } from "./splits";
import type { Split } from "./types";

const split = (id: string): Split => ({
  id, date: "2026-11-23", lineItems: [{ id: "i", name: "Ramen", price: 12, assignedToIds: ["p"] } as Split["lineItems"][number]],
  fees: [], taxAmount: 0, tipAmount: 0, totalAmount: 12, people: [{ id: "p", name: "Ann" }],
});

let store: Map<string, string>;
beforeEach(() => {
  store = new Map();
  vi.stubGlobal("window", {});
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

describe("saved split history", () => {
  it("keeps the good splits when one entry is broken", () => {
    store.set("warikan_splits", JSON.stringify([split("a"), { id: 42 }, split("b")]));
    expect(getSplits().map((s) => s.id)).toEqual(["a", "b"]);
    expect(store.get("warikan_splits_unreadable")).toContain('"id":42');
  });

  it("never deletes history it can't parse, even after a new save", () => {
    store.set("warikan_splits", "{not json");
    expect(getSplits()).toEqual([]);
    saveSplit(split("new"));
    expect(store.get("warikan_splits_unreadable")).toBe("{not json");
    expect(getSplits().map((s) => s.id)).toEqual(["new"]);
  });

  it("keeps a later corruption too, once each", () => {
    store.set("warikan_splits", "{first");
    getSplits();
    getSplits();
    store.set("warikan_splits", "{second");
    getSplits();
    expect(store.get("warikan_splits_unreadable")).toBe("{first\n{second");
  });

  it("Clear all removes the backup as well", () => {
    store.set("warikan_splits", "{not json");
    getSplits();
    clearAllSplits();
    expect(store.has("warikan_splits")).toBe(false);
    expect(store.has("warikan_splits_unreadable")).toBe(false);
  });
});
