import { GeminiReceiptParser } from "@/lib/receipt-parsing/gemini-parser";
import { ReceiptParseError, type ReceiptParseInput, type ReceiptParseResult } from "@/lib/receipt-parsing/types";
import { isSuspiciousReceipt, validateReceipt } from "@/lib/receipt-parsing/validate-receipt";

// A repair pass is a full second Gemini call; don't start one that can't finish in time.
const MIN_REPAIR_MS = 10_000;

export async function parseReceipt(input: ReceiptParseInput): Promise<ReceiptParseResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ReceiptParseError("upstream_error", "missing_api_key", { status: 500 });

  const parser = new GeminiReceiptParser(apiKey);
  let receipt;
  let repairRawText: string | undefined;

  try {
    receipt = await parser.parse(input);
    if (isSuspiciousReceipt(receipt) && parser.msLeft() >= MIN_REPAIR_MS) {
      repairRawText = receipt.warnings.join("; ");
      receipt = await parser.repair(input, repairRawText);
    }
  } catch (error) {
    if (!(error instanceof ReceiptParseError)) throw error;
    if (error.code !== "parse_error") throw error;
    if (parser.msLeft() < MIN_REPAIR_MS) throw new ReceiptParseError("timeout");
    receipt = await parser.repair(input, error.rawText);
  }

  const { confidence, warnings } = validateReceipt(receipt);
  return { ...receipt, confidence, warnings, source: input.kind === "text" ? "apple_ocr_gemini" : "gemini" };
}
