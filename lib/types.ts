export interface LineItemPortion {
  id: string;
  assignedToIds: string[];
}

export interface LineItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  portions?: LineItemPortion[];
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
  items: { name: string; quantity: number; price: number; splitCount: number; mixedSplits?: boolean }[];
}

// ─── Collaborative Room Types ─────────────────────────────────────────────

export interface RoomState {
  roomId: string;
  entryMode?: "roster" | "self_serve";
  restaurantName?: string;
  lineItems: LineItem[];         // full item list from host
  people: Person[];              // full people list from host
  assignments: Record<string, string[]>; // itemId → assignedToIds
  portionAssignments?: Record<string, string[][]>; // itemId → portionIndex → assignedToIds
  connectedPeople: string[];     // array of personIds currently "present"
  donePeople: string[];          // personIds who tapped "I'm done" (offline but slot stays claimed)
  claimedBy: Record<string, string>;   // personId → name (who has claimed that identity slot)
  status: "waiting" | "assigning" | "done";
  payUrl?: string;               // set by host when they share payment — guests auto-redirect here
  createdAt: number;             // Date.now() — for TTL awareness
  version: number;               // incremented on every mutation — clients use for reconciliation
}

export type RoomActionType =
  | "create"
  | "add_person"
  | "join"
  | "leave"
  | "rename_person"
  | "remove_person"
  | "update_person"
  | "claim_item"
  | "unclaim_item"
  | "host_assign"         // host assigns a single item (override)
  | "host_bulk_assign"    // host replaces the entire assignments map atomically
  | "guest_done"
  | "guest_back"          // guest undoes "I'm done" to return to assigning
  | "close"
  | "finalize_payment";   // host publishes the pay URL so guests auto-redirect

export interface RoomAction {
  type: RoomActionType;
  hostToken?: string;
  participantToken?: string;
  personId?: string;
  name?: string;
  guest?: boolean;
  covered?: boolean;
  itemId?: string;
  // For "create" — host sends the full snapshot
  lineItems?: LineItem[];
  people?: Person[];
  entryMode?: "roster" | "self_serve";
  restaurantName?: string;
  // For "host_assign" — host sends the full resulting assignment array for one item
  assignedToIds?: string[];
  portionIndex?: number;
  // For "host_bulk_assign" — host sends the complete assignments map
  assignments?: Record<string, string[]>;
  portionAssignments?: Record<string, string[][]>;
  // For "finalize_payment" — host sends the shareable /pay#<encoded> URL
  payUrl?: string;
}

export interface RoomIdentity {
  personId: string;
  participantToken: string;
}

export interface RoomJoinResult {
  room: RoomState;
  personId: string;
  participantToken: string;
}
