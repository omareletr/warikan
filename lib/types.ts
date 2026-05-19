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
  total: number;
  items: { name: string; quantity: number; price: number; splitCount: number }[];
}
