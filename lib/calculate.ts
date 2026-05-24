import type { LineItem, Fee, Person, PersonTotal } from "./types";

// Distributes `total` across `values` so that rounded shares sum exactly to `total`.
function largestRemainder(values: number[], total: number): number[] {
  const floored = values.map((v) => Math.floor(v * 100) / 100);
  const remainder = Math.round((total - floored.reduce((a, b) => a + b, 0)) * 100);
  const order = values
    .map((v, i) => ({ i, frac: (v * 100) % 1 }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder && k < order.length; k++) {
    floored[order[k].i] = Math.round((floored[order[k].i] + 0.01) * 100) / 100;
  }
  return floored;
}

export function calculateSplit(
  people: Person[],
  lineItems: LineItem[],
  taxAmount: number,
  tipAmount: number,
  fees: Fee[]
): PersonTotal[] {
  const overallSubtotal = lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalFees = fees.reduce((sum, fee) => sum + fee.amount, 0);

  const totals = people.map((person) => {
    const assignedItems = lineItems
      .filter((item) => item.assignedToIds.includes(person.id))
      .map((item) => {
        const personClaims = item.assignedToIds.filter((id) => id === person.id).length;
        const totalClaims = item.assignedToIds.length;
        // For multi-quantity items, each claim represents one unit at `item.price`.
        // For single-quantity items (or shared single items), divide total by claimant count.
        const price =
          item.quantity > 1
            ? item.price * personClaims
            : (item.price * personClaims) / totalClaims;
        return {
          name: item.name,
          quantity: personClaims,
          price,
          splitCount: item.quantity <= 1 ? totalClaims : 1,
        };
      });

    const subtotal = assignedItems.reduce((sum, item) => sum + item.price, 0);

    const equalRatio = people.length > 0 ? 1 / people.length : 0;
    const ratio = overallSubtotal > 0 ? subtotal / overallSubtotal : equalRatio;
    const taxShare = taxAmount * ratio;
    const tipShare = tipAmount * ratio;
    const feesShare = totalFees * ratio;

    return {
      person,
      subtotal,
      taxShare,
      tipShare,
      feesShare,
      coveredExtra: 0,
      total: subtotal + taxShare + tipShare + feesShare,
      items: assignedItems,
    };
  });

  const coveredTotal = totals
    .filter((pt) => pt.person.covered)
    .reduce((sum, pt) => sum + pt.total, 0);
  const payerCount = totals.filter((pt) => !pt.person.covered && pt.total > 0).length;

  if (coveredTotal > 0 && payerCount > 0) {
    const extra = coveredTotal / payerCount;
    for (const pt of totals) {
      if (pt.person.covered) {
        pt.total = 0;
      } else if (pt.total > 0) {
        pt.coveredExtra = extra;
        pt.total += extra;
      }
    }
  } else if (coveredTotal > 0 && payerCount === 0) {
    // Everyone is covered — zero out all totals.
    for (const pt of totals) pt.total = 0;
  }

  // Round totals so individual amounts sum exactly to the grand total.
  const grandTotal = overallSubtotal + taxAmount + tipAmount + totalFees;
  const rounded = largestRemainder(totals.map((pt) => pt.total), grandTotal);
  totals.forEach((pt, i) => { pt.total = rounded[i]; });

  return totals;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function initials(name: string): string {
  return name
    .trim()
    .replace(/\s*\(\d+\)$/, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function inlineInitials(name: string): string {
  const match = name.match(/^(.*?)\s*\((\d+)\)$/);
  if (match) return (match[1].trim()[0]?.toUpperCase() ?? "") + match[2];
  return initials(name);
}
