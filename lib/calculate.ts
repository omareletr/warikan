import type { LineItem, Fee, Person, PersonTotal } from "./types";

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
      .map((item) => ({
        name: item.name,
        quantity: item.quantity,
        price: (item.price * item.quantity) / item.assignedToIds.length,
        splitCount: item.assignedToIds.length,
      }));

    const subtotal = assignedItems.reduce((sum, item) => sum + item.price, 0);

    const ratio = overallSubtotal > 0 ? subtotal / overallSubtotal : 0;
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
  }

  return totals;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
