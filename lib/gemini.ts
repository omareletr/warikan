export interface ParsedReceipt {
  restaurantName: string | null;
  lineItems: { name: string; price: number }[];
  taxAmount: number | null;
  fees: { name: string; amount: number }[];
  tipAmount: number | null;
}

export async function parseReceiptImage(
  base64Image: string,
  mimeType: string
): Promise<ParsedReceipt> {
  const response = await fetch("/api/parse-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64Image, mimeType }),
  });

  if (!response.ok) {
    throw new Error(`Receipt parsing failed: ${response.statusText}`);
  }

  return response.json() as Promise<ParsedReceipt>;
}
