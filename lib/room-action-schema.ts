import { z } from "zod";
import { MAX_ITEM_QUANTITY } from "@/lib/line-items";

// Limits for what anyone holding a room code can send. Generous for a real table,
// small enough that one request can't bloat a room past what Redis and every guest's phone handle.
export const MAX_PEOPLE = 30;
export const MAX_ITEMS = 200;
export const MAX_NAME_LENGTH = 60;
export const MAX_BODY_CHARS = 200_000;

const Id = z.string().max(64);
const Ids = z.array(Id).max(MAX_PEOPLE);
const Text = z.string().max(300); // names are trimmed to MAX_NAME_LENGTH where they're stored, not rejected

const LineItem = z.looseObject({
  id: Id,
  name: Text,
  price: z.number().min(-1_000_000).max(1_000_000),
  quantity: z.number().optional(),
  assignedToIds: Ids.optional(),
  portions: z.array(z.looseObject({ id: Id.optional(), assignedToIds: Ids.optional() })).max(MAX_ITEM_QUANTITY).optional(),
});

const Person = z.looseObject({ id: Id, name: Text, covered: z.boolean().optional() });

export const RoomActionSchema = z.looseObject({
  type: z.string(),
  hostToken: z.string().max(200).optional(),
  participantToken: z.string().max(200).optional(),
  personId: Id.optional(),
  name: Text.optional(),
  guest: z.boolean().optional(),
  covered: z.boolean().optional(),
  itemId: Id.optional(),
  lineItems: z.array(LineItem).max(MAX_ITEMS).optional(),
  people: z.array(Person).max(MAX_PEOPLE).optional(),
  entryMode: z.enum(["roster", "self_serve"]).optional(),
  restaurantName: Text.optional(),
  assignedToIds: Ids.optional(),
  portionIndex: z.number().int().min(0).max(MAX_ITEM_QUANTITY).optional(),
  assignments: z.record(Id, Ids).optional(),
  portionAssignments: z.record(Id, z.array(Ids).max(MAX_ITEM_QUANTITY)).optional(),
  payUrl: z.string().max(8000).optional(),
});
