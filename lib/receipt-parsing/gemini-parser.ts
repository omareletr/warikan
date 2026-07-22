import { ReceiptParseError, ReceiptSchema, type ParsedReceipt, type ReceiptParseInput, type ReceiptParser } from "@/lib/receipt-parsing/types";

const GEMINI_MODEL = "gemini-2.5-flash";

const BASE_PROMPT = `Extract receipt data as JSON only.

Schema:
{
  "restaurantName": "string or null",
  "lineItems": [{ "name": "string", "quantity": number, "price": number }],
  "subtotalAmount": number or null,
  "taxAmount": number or null,
  "fees": [{ "name": "string", "amount": number }],
  "tipAmount": number or null,
  "totalAmount": number or null,
  "warnings": ["string"]
}

Rules:
- Return ONLY valid JSON, no markdown fences, no explanation.
- lineItems must be individual dishes, drinks, or products only.
- Exclude subtotal, tax, total, balance due, payment, card, cash, change, and suggested tip rows from lineItems.
- quantity defaults to 1 if not shown.
- price is the per-unit price, not the line total. If the receipt shows "2x Burger $25.98", return quantity: 2, price: 12.99.
- Prices must be numbers, not strings.
- subtotalAmount is the visible subtotal before tax/tip/fees when shown, otherwise null.
- taxAmount is the tax line if present, otherwise null.
- fees are service charges, automatic gratuity, delivery fees, or similar non-tax charges.
- tipAmount is a written or printed tip already on the receipt, otherwise null.
- totalAmount is the visible final receipt total when shown, otherwise null.
- Add warnings for unreadable rows, uncertain prices, partial receipts, glare, blur, or totals that do not appear to reconcile.`;

const IMAGE_PROMPT = `Analyze this receipt image.\n\n${BASE_PROMPT}`;

const TEXT_PROMPT = `${BASE_PROMPT}

Input source: Apple Vision OCR recognized text from a receipt.

OCR-specific rules:
- The text may contain OCR mistakes, wrapped lines, duplicated page headers/footers, and missing decimal separators.
- Infer obvious price formats conservatively, but add warnings for uncertain rows.
- Preserve item names as clean menu/product names, not OCR artifacts.
- Exclude merchant address, phone number, server, table, order number, timestamps, payment card lines, and suggested tip blocks from lineItems.
- If multiple pages are present, parse them as one receipt in page order.`;

function cleanJsonText(rawText: string) {
  return rawText.replace(/```json\n?|```\n?/g, "").trim();
}

function extractResponseText(geminiData: unknown) {
  const candidate = (geminiData as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[] })?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const rawText = parts
    .filter((part) => !part.thought)
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  return { rawText, finishReason: candidate?.finishReason };
}

export class GeminiReceiptParser implements ReceiptParser {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async parse(input: ReceiptParseInput): Promise<ParsedReceipt> {
    return this.parseWithPrompt(input, input.kind === "text" ? TEXT_PROMPT : IMAGE_PROMPT);
  }

  async repair(input: ReceiptParseInput, previousRawText?: string): Promise<ParsedReceipt> {
    const basePrompt = input.kind === "text" ? TEXT_PROMPT : IMAGE_PROMPT;
    const repairPrompt = `${basePrompt}\n\nRepair pass: the previous extraction was malformed or suspicious. Re-read the receipt carefully and return a corrected JSON object. Previous raw response excerpt: ${previousRawText?.slice(0, 1000) ?? "none"}`;
    return this.parseWithPrompt(input, repairPrompt);
  }

  private async parseWithPrompt(input: ReceiptParseInput, prompt: string): Promise<ParsedReceipt> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    let response: Response;

    try {
      response = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: this.buildParts(input, prompt) }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        }),
      });
    } catch (error) {
      clearTimeout(timeout);
      throw new ReceiptParseError(error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error");
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error("[parse-receipt] Upstream API error:", response.status, errText.slice(0, 500));
      throw new ReceiptParseError("upstream_error", "upstream_error", { status: response.status });
    }

    const geminiData = await response.json();
    const { rawText, finishReason } = extractResponseText(geminiData);
    console.log("[parse-receipt] finishReason:", finishReason, "rawText length:", rawText.length, "preview:", rawText.slice(0, 120));

    try {
      const parsed = JSON.parse(cleanJsonText(rawText));
      const validated = ReceiptSchema.safeParse(parsed);
      if (!validated.success) {
        console.error("[parse-receipt] Zod validation failed:", JSON.stringify(validated.error.issues).slice(0, 500));
        throw new ReceiptParseError("parse_error", "validation_failed", { rawText });
      }
      return validated.data;
    } catch (error) {
      if (error instanceof ReceiptParseError) throw error;
      console.error("[parse-receipt] JSON.parse failure. finishReason:", finishReason, "rawText:", rawText.slice(0, 500));
      throw new ReceiptParseError("parse_error", "json_parse_failed", { rawText });
    }
  }

  private buildParts(input: ReceiptParseInput, prompt: string) {
    if (input.kind === "text") {
      return [{ text: `${prompt}\n\nRecognized receipt text:\n${input.text}` }];
    }
    return [{ inlineData: { mimeType: input.mimeType, data: input.image } }, { text: prompt }];
  }
}
