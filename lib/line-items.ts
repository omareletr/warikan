import type { LineItem, LineItemPortion } from "./types";

function makePortion(assignedToIds: string[] = []): LineItemPortion {
  return { id: crypto.randomUUID(), assignedToIds };
}

export function normalizeLineItem(item: LineItem): LineItem {
  const quantity = Math.max(1, Math.floor(item.quantity || 1));
  const legacyIds = item.assignedToIds ?? [];
  let portions: LineItemPortion[];

  if (item.portions?.length) {
    portions = item.portions.map((portion) => ({
      id: portion.id || crypto.randomUUID(),
      assignedToIds: portion.assignedToIds ?? [],
    }));
  } else if (quantity <= 1) {
    portions = [makePortion([...legacyIds])];
  } else {
    portions = legacyIds.slice(0, quantity).map((id) => makePortion([id]));
  }

  if (portions.length > quantity) {
    portions = portions.slice(0, quantity);
  }

  while (portions.length < quantity) {
    portions.push(makePortion());
  }

  return {
    ...item,
    quantity,
    portions,
    assignedToIds: flattenPortionAssignments(portions),
  };
}

export function normalizeLineItems(items: LineItem[]): LineItem[] {
  return items.map(normalizeLineItem);
}

export function flattenPortionAssignments(portions: LineItemPortion[]): string[] {
  return portions.flatMap((portion) => portion.assignedToIds);
}

export function getLineItemAssignedIds(item: LineItem): string[] {
  return flattenPortionAssignments(normalizeLineItem(item).portions ?? []);
}

export function isLineItemFullyAssigned(item: LineItem): boolean {
  return (normalizeLineItem(item).portions ?? []).every((portion) => portion.assignedToIds.length > 0);
}

export function countAssignedPortions(item: LineItem): number {
  return (normalizeLineItem(item).portions ?? []).filter((portion) => portion.assignedToIds.length > 0).length;
}

export function lineItemsToPortionAssignments(items: LineItem[]): Record<string, string[][]> {
  const assignments: Record<string, string[][]> = {};
  for (const item of normalizeLineItems(items)) {
    assignments[item.id] = (item.portions ?? []).map((portion) => [...portion.assignedToIds]);
  }
  return assignments;
}

export function applyPortionAssignments(items: LineItem[], assignments: Record<string, string[][]>): LineItem[] {
  return normalizeLineItems(items).map((item) => {
    const itemAssignments = assignments[item.id];
    if (!itemAssignments) return item;
    const portions = (item.portions ?? []).map((portion, index) => ({
      ...portion,
      assignedToIds: itemAssignments[index] ?? [],
    }));
    return normalizeLineItem({ ...item, portions });
  });
}

export function legacyAssignmentsToPortionAssignments(items: LineItem[], assignments: Record<string, string[]>): Record<string, string[][]> {
  const portionAssignments: Record<string, string[][]> = {};
  for (const item of items) {
    const normalized = normalizeLineItem({ ...item, assignedToIds: assignments[item.id] ?? item.assignedToIds ?? [] });
    portionAssignments[item.id] = (normalized.portions ?? []).map((portion) => [...portion.assignedToIds]);
  }
  return portionAssignments;
}

export function portionAssignmentsToLegacy(assignments: Record<string, string[][]>): Record<string, string[]> {
  const legacy: Record<string, string[]> = {};
  for (const [itemId, portions] of Object.entries(assignments)) {
    legacy[itemId] = portions.flat();
  }
  return legacy;
}
