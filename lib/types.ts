export interface LineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  assignedToIds: string[];
}

export interface Fee {
  id: string;
  name: string;
  amount: number;
}

export interface Person {
  id: string;
  name: string;
  covered?: boolean;
}

export interface Split {
  id: string;
  date: string;
  restaurantName?: string;
  lineItems: LineItem[];
  fees: Fee[];
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  people: Person[];
}

export interface PersonTotal {
  person: Person;
  subtotal: number;
  taxShare: number;
  tipShare: number;
  feesShare: number;
  coveredExtra: number;
  total: number;
  items: { name: string; quantity: number; price: number; splitCount: number }[];
}

// ─── Collaborative Room Types ─────────────────────────────────────────────

export interface RoomState {
  roomId: string;
  restaurantName?: string;
  lineItems: LineItem[];         // full item list from host
  people: Person[];              // full people list from host
  assignments: Record<string, string[]>; // itemId → assignedToIds
  connectedPeople: string[];     // array of personIds currently "present"
  claimedBy: Record<string, string>;   // personId → name (who has claimed that identity slot)
  status: "waiting" | "assigning" | "done";
  createdAt: number;             // Date.now() — for TTL awareness
  version: number;               // incremented on every mutation — clients use for reconciliation
}

export type RoomActionType =
  | "create"
  | "join"
  | "leave"
  | "claim_item"
  | "unclaim_item"
  | "host_assign"       // host directly assigns (override)
  | "close";

export interface RoomAction {
  type: RoomActionType;
  personId?: string;
  itemId?: string;
  // For "create" — host sends the full snapshot
  lineItems?: LineItem[];
  people?: Person[];
  restaurantName?: string;
}
