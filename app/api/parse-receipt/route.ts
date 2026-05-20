import { NextRequest, NextResponse } from "next/server";

const GEMINI_PROMPT = `Analyze this receipt image and extract the following information as JSON:

{
  "restaurantName": "string or null",
  "lineItems": [{ "name": "string", "quantity": number, "price": number }],
  "taxAmount": number or null,
  "fees": [{ "name": "string", "amount": number }],
  "tipAmount": number or null
}

Rules:
- Each lineItem should be an individual dish, drink, or item on the receipt
- "quantity" is how many of that item were ordered (default 1 if not shown)
- "price" is the per-unit price, NOT the line total. If the receipt shows "2x Burger $25.98", return quantity: 2, price: 12.99
- Prices should be numbers (not strings), e.g. 12.99 not "$12.99"
- taxAmount is the tax line if present, null if not shown
- fees are any additional charges like service charge, gratuity, delivery fee — NOT tax
- tipAmount is the tip if already written on the receipt, null if not shown
- restaurantName from the header of the receipt, null if not visible
- Return ONLY valid JSON, no markdown fences, no explanation`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { image, mimeType } = body as { image: string; mimeType: string };

  if (!image || !mimeType) {
    return NextResponse.json(
      { error: "image and mimeType are required" },
      { status: 400 }
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`;

  const geminiResponse = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { inlineData: { mimeType, data: image } },
            { text: GEMINI_PROMPT },
          ],
        },
      ],
    }),
  });

  if (!geminiResponse.ok) {
    const errText = await geminiResponse.text();
    return NextResponse.json(
      { error: "Gemini API error", details: errText },
      { status: 502 }
    );
  }

  const geminiData = await geminiResponse.json();
  const rawText =
    geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  try {
    const cleaned = rawText.replace(/```json\n?|```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "Failed to parse Gemini response", raw: rawText },
      { status: 502 }
    );
  }
}
