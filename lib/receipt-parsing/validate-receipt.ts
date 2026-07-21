import type { ParsedReceipt, ParseConfidence } from "@/lib/receipt-parsing/types";

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function closeEnough(a: number, b: number, tolerance: number) {
  return Math.abs(a - b) <= tolerance;
}

function hasGenericDuplicateItems(receipt: ParsedReceipt) {
  const seen = new Map<string, number>();
  for (const item of receipt.lineItems) {
    const normalized = item.name.trim().toLowerCase();
    if (!normalized || /^(item|food|dish|misc|unknown|unreadable)$/i.test(normalized)) {
      const key = `${normalized}:${item.price.toFixed(2)}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
      if ((seen.get(key) ?? 0) >= 2) return true;
    }
  }
  return false;
}

export function validateReceipt(receipt: ParsedReceipt): { confidence: ParseConfidence; warnings: string[] } {
  const warnings = [...receipt.warnings];
  const itemSubtotal = round2(receipt.lineItems.reduce((sum, item) => sum + item.price * (item.quantity ?? 1), 0));
  const tax = receipt.taxAmount ?? 0;
  const tip = receipt.tipAmount ?? 0;
  const fees = receipt.fees.reduce((sum, fee) => sum + fee.amount, 0);

  if (receipt.lineItems.length === 0) warnings.push("No receipt items were detected.");
  if (itemSubtotal === 0 && receipt.lineItems.length > 0) warnings.push("Detected items total $0.00.");
  if (tax > itemSubtotal * 0.35 && itemSubtotal > 0) warnings.push("Tax looks unusually high.");
  if (tip > itemSubtotal * 0.5 && itemSubtotal > 0) warnings.push("Tip looks unusually high.");
  if (fees > itemSubtotal * 0.5 && itemSubtotal > 0) warnings.push("Fees look unusually high.");
  if (hasGenericDuplicateItems(receipt)) warnings.push("Some item names look uncertain or duplicated.");

  if (receipt.subtotalAmount && itemSubtotal > 0 && !closeEnough(itemSubtotal, receipt.subtotalAmount, Math.max(1.5, receipt.subtotalAmount * 0.12))) {
    warnings.push("Item subtotal does not match the visible subtotal.");
  }

  if (receipt.totalAmount && itemSubtotal > 0) {
    const calculatedTotal = round2(itemSubtotal + tax + tip + fees);
    if (!closeEnough(calculatedTotal, receipt.totalAmount, Math.max(2, receipt.totalAmount * 0.15))) {
      warnings.push("Calculated total does not match the visible receipt total.");
    }
  }

  const uniqueWarnings = [...new Set(warnings)].slice(0, 20);
  const confidence: ParseConfidence = uniqueWarnings.length === 0 ? "high" : uniqueWarnings.length <= 2 && receipt.lineItems.length > 0 ? "medium" : "low";
  return { confidence, warnings: uniqueWarnings };
}

export function isSuspiciousReceipt(receipt: ParsedReceipt) {
  return validateReceipt(receipt).confidence === "low";
}
