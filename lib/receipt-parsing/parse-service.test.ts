import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseReceipt } from "./parse-service";

const receipt = (lineItems: { name: string; quantity: number; price: number }[]) => ({
  restaurantName: null, lineItems, subtotalAmount: null, taxAmount: null, fees: [], tipAmount: null, totalAmount: null, warnings: [],
});
const geminiReply = (text: string) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200 });

// Each fake Gemini call "takes" `seconds` by moving the clock, then answers.
function fakeGemini(...calls: { seconds: number; text: string }[]) {
  const fetchMock = vi.fn(async () => {
    const call = calls[fetchMock.mock.calls.length - 1];
    vi.setSystemTime(Date.now() + call.seconds * 1000);
    return geminiReply(call.text);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const input = { kind: "text" as const, text: "Ramen 12.00", source: "apple_ocr" as const };
const empty = JSON.stringify(receipt([])); // no items → low confidence → would normally trigger a repair pass
const good = JSON.stringify(receipt([{ name: "Ramen", quantity: 1, price: 12 }]));

describe("parseReceipt time budget", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("runs the repair pass when there is time", async () => {
    const fetchMock = fakeGemini({ seconds: 5, text: empty }, { seconds: 5, text: good });
    const result = await parseReceipt(input);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.lineItems).toHaveLength(1);
  });

  it("skips the repair pass near Netlify's limit and returns the first read", async () => {
    const fetchMock = fakeGemini({ seconds: 45, text: empty });
    const result = await parseReceipt(input);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.confidence).toBe("low");
  });

  it("turns an unreadable late answer into a timeout instead of a second call", async () => {
    const fetchMock = fakeGemini({ seconds: 45, text: "not json" });
    await expect(parseReceipt(input)).rejects.toMatchObject({ code: "timeout" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
