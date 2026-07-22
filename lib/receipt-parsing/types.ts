import { z } from "zod";

export const ReceiptSchema = z.object({
  restaurantName: z.string().max(200).nullable(),
  lineItems: z
    .array(
      z.object({
        name: z.string().max(200),
        quantity: z.number().min(0).max(999).optional().default(1),
        price: z.number().min(0).max(99999),
      })
    )
    .max(100),
  subtotalAmount: z.number().min(0).max(99999).nullable().optional(),
  taxAmount: z.number().min(0).max(99999).nullable(),
  fees: z
    .array(
      z.object({
        name: z.string().max(200),
        amount: z.number().min(0).max(99999),
      })
    )
    .max(20),
  tipAmount: z.number().min(0).max(99999).nullable(),
  totalAmount: z.number().min(0).max(99999).nullable().optional(),
  warnings: z.array(z.string().max(200)).max(20).optional().default([]),
});

export type ParsedReceipt = z.infer<typeof ReceiptSchema>;
export type ParseConfidence = "high" | "medium" | "low";
export type ReceiptParserSource = "gemini" | "apple_ocr_gemini";

export type ReceiptParseInput =
  | { kind: "image"; image: string; mimeType: string }
  | { kind: "text"; text: string; source: "apple_ocr" };

export interface ReceiptParseResult extends ParsedReceipt {
  confidence: ParseConfidence;
  warnings: string[];
  source: ReceiptParserSource;
}

export interface ReceiptParser {
  parse(input: ReceiptParseInput): Promise<ParsedReceipt>;
}

export class ReceiptParseError extends Error {
  code: "timeout" | "network_error" | "upstream_error" | "parse_error";
  status?: number;
  rawText?: string;

  constructor(code: ReceiptParseError["code"], message?: string, options?: { status?: number; rawText?: string }) {
    super(message ?? code);
    this.name = "ReceiptParseError";
    this.code = code;
    this.status = options?.status;
    this.rawText = options?.rawText;
  }
}
