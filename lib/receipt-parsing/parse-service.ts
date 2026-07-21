import { GeminiReceiptParser } from "@/lib/receipt-parsing/gemini-parser";
import { ReceiptParseError, type ReceiptParseInput, type ReceiptParseResult } from "@/lib/receipt-parsing/types";
import { isSuspiciousReceipt, validateReceipt } from "@/lib/receipt-parsing/validate-receipt";

export async function parseReceipt(input: ReceiptParseInput): Promise<ReceiptParseResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ReceiptParseError("upstream_error", "missing_api_key", { status: 500 });

  const parser = new GeminiReceiptParser(apiKey);
  let receipt;
  let repairRawText: string | undefined;

  try {
    receipt = await parser.parse(input);
    if (isSuspiciousReceipt(receipt)) {
      repairRawText = receipt.warnings.join("; ");
      receipt = await parser.repair(input, repairRawText);
    }
  } catch (error) {
    if (!(error instanceof ReceiptParseError)) throw error;
    if (error.code !== "parse_error") throw error;
    receipt = await parser.repair(input, error.rawText);
  }

  const { confidence, warnings } = validateReceipt(receipt);
  return { ...receipt, confidence, warnings, source: "gemini" };
}
