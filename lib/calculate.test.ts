import { describe, expect, it } from "vitest";
import { calculateSplit } from "./calculate";
import type { LineItem, Person } from "./types";

const person = (id: string, covered = false): Person => ({ id, name: id, covered });
const item = (name: string, price: number, ...ids: string[]): LineItem => ({
  id: name, name, quantity: 1, price, assignedToIds: ids,
});
const cents = (n: number) => Math.round(n * 100);
const sum = (totals: { total: number }[]) => cents(totals.reduce((s, t) => s + t.total, 0));

describe("calculateSplit", () => {
  it("shares add up to the bill to the cent", () => {
    const people = ["a", "b", "c"].map((id) => person(id));
    const items = [item("ramen", 17.5, "a"), item("gyoza", 9.99, "a", "b", "c"), item("beer", 8, "b")];
    const totals = calculateSplit(people, items, 3.17, 7.01, [{ id: "f", name: "Service", amount: 2 }]);
    expect(sum(totals)).toBe(cents(17.5 + 9.99 + 8 + 3.17 + 7.01 + 2));
  });

  it("covered person pays $0 and the others absorb it", () => {
    const people = [person("bday", true), person("a"), person("b")];
    const items = [item("steak", 40, "bday"), item("salad", 10, "a"), item("pasta", 20, "b")];
    const totals = calculateSplit(people, items, 7, 0, []);
    expect(totals[0].total).toBe(0);
    expect(sum(totals)).toBe(cents(77));
    expect(totals[1].coveredExtra).toBeCloseTo(totals[2].coveredExtra);
  });

  it("friend who ordered nothing still pays for the birthday person", () => {
    const people = [person("bday", true), person("friend")];
    const totals = calculateSplit(people, [item("cake", 30, "bday")], 3, 6, []);
    expect(totals[0].total).toBe(0);
    expect(totals[1].total).toBe(39);
  });

  it("everyone covered means nobody is charged stray cents", () => {
    const people = [person("a", true), person("b", true)];
    const totals = calculateSplit(people, [item("cake", 30, "a", "b")], 3, 0, []);
    expect(totals.map((t) => t.total)).toEqual([0, 0]);
  });
});
