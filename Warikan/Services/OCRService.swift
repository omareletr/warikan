//
//  OCRService.swift
//  Warikan
//

import UIKit
import Vision

struct OCRResult {
    var lineItems: [LineItem]
    var fees: [Fee]
    var taxAmount: Double
    var tipAmount: Double
    var restaurantName: String?
    var detectedGratuityAmount: Double
}

enum OCRService {

    /// Patterns for auto-gratuity detection (case-insensitive).
    private static let gratuityPatterns = [
        "auto grat", "auto gratuity", "gratuity", "service charge",
        "mandatory gratuity", "included gratuity", "grat %", "svc chg"
    ]

    /// Patterns for fee detection (case-insensitive).
    private static let feePatterns = [
        "delivery fee", "service fee", "corkage", "split plate",
        "surcharge", "cc fee", "credit card fee", "venue fee", "convenience fee"
    ]

    /// Recognize text from a receipt image and parse line items, fees, tax, and tip.
    static func recognizeText(in image: UIImage) async -> OCRResult {
        guard let cgImage = image.cgImage else {
            return OCRResult(lineItems: [], fees: [], taxAmount: 0, tipAmount: 0, detectedGratuityAmount: 0)
        }

        let recognizedStrings = await performOCR(on: cgImage)
        print("--- OCR RAW LINES (\(recognizedStrings.count) total) ---")
        for (i, line) in recognizedStrings.enumerated() {
            print("  [\(i)] \"\(line)\"")
        }
        print("--- END OCR RAW LINES ---")
        let result = parseReceipt(lines: recognizedStrings)
        print("--- PARSED RESULT ---")
        print("  Restaurant: \(result.restaurantName ?? "nil")")
        print("  Line items: \(result.lineItems.count)")
        for item in result.lineItems {
            print("    - \"\(item.name)\" → $\(item.price)")
        }
        print("  Fees: \(result.fees.count)")
        print("  Tax: $\(result.taxAmount)")
        print("  Tip: $\(result.tipAmount)")
        print("--- END PARSED ---")
        return result
    }

    // MARK: - Vision OCR

    private static func performOCR(on cgImage: CGImage) async -> [String] {
        await withCheckedContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                guard let observations = request.results as? [VNRecognizedTextObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                let strings = observations.compactMap { observation in
                    observation.topCandidates(1).first?.string
                }
                continuation.resume(returning: strings)
            }
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                continuation.resume(returning: [])
            }
        }
    }

    // MARK: - Receipt Parsing

    private static func parseReceipt(lines: [String]) -> OCRResult {
        var restaurantName: String?

        // Clean up lines
        let cleanLines: [String] = lines.compactMap { line in
            let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }

        // Restaurant name: first non-empty line that has no price and no digits
        for line in cleanLines {
            if extractLastPrice(from: line) == nil && !line.contains(where: \.isNumber) {
                restaurantName = line
                break
            }
            break
        }

        // First pass: classify each line
        enum LineType {
            case itemName(String, Int) // has leading quantity + name, no price on this line; Int = quantity
            case price(Double)         // standalone price only
            case itemWithPrice         // name + price on same line (index into cleanLines)
            case tax(Double)
            case taxLabel              // "TAX:" with no value — next line has the value
            case subtotalLabel         // "SUBTOTAL:" with no value
            case gratuity(Double)
            case fee(String, Double)
            case skip
        }

        /// Does this line look like a receipt item? Pattern: starts with 1-2 digit quantity
        /// followed by a space and at least 2 letters. E.g. "1 QABELEE", "2 MOURGH KABAB".
        /// Returns the quantity if matched, nil otherwise.
        func extractItemQuantity(_ text: String) -> Int? {
            let pattern = "^(\\d{1,2})\\s+[A-Za-z]{2,}"
            guard let regex = try? NSRegularExpression(pattern: pattern),
                  let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
                  let range = Range(match.range(at: 1), in: text),
                  let qty = Int(text[range]) else {
                return nil
            }
            return qty
        }

        /// Is this line purely a number (standalone price, zip code, address number)?
        func isPureNumber(_ text: String) -> Bool {
            // After removing spaces and periods, is everything digits?
            let stripped = text.replacingOccurrences(of: " ", with: "")
                .replacingOccurrences(of: ".", with: "")
                .replacingOccurrences(of: ",", with: "")
            return stripped.allSatisfy(\.isNumber) && !stripped.isEmpty
        }

        var classified: [LineType] = []

        for line in cleanLines {
            let lower = line.lowercased()

            // Skip non-item lines (headers, footers, payment info)
            if isSkippableLine(lower) {
                classified.append(.skip)
                continue
            }

            // "SUBTOTAL:" or "SUBTOTAL" with no price
            if lower.hasPrefix("subtotal") || lower.hasPrefix("sub total") {
                classified.append(.subtotalLabel)
                continue
            }

            // "TOTAL:" lines — skip
            if lower.hasPrefix("total") || lower.contains("total:") ||
               lower.hasPrefix("amount due") || lower.hasPrefix("balance") ||
               lower.hasPrefix("grand total") {
                classified.append(.skip)
                continue
            }

            // Tax label with or without value
            if lower.hasPrefix("tax") || lower.contains("sales tax") ||
               lower.contains("hst") || lower.contains("gst") || lower.contains("vat") {
                if let p = extractLastPrice(from: line) {
                    classified.append(.tax(p))
                } else {
                    classified.append(.taxLabel)
                }
                continue
            }

            // Gratuity with value
            if isGratuity(lower) {
                if let p = extractLastPrice(from: line) {
                    classified.append(.gratuity(p))
                } else {
                    classified.append(.skip)
                }
                continue
            }

            // Fee with value
            if isFee(lower) {
                if let p = extractLastPrice(from: line) {
                    let name = cleanItemName(line)
                    classified.append(.fee(name.isEmpty ? "Fee" : name, p))
                } else {
                    classified.append(.skip)
                }
                continue
            }

            // Check if line matches "quantity + item name" pattern (split-column receipt)
            if let qty = extractItemQuantity(line), extractLastPrice(from: line) == nil {
                let name = cleanItemName(line)
                if !name.isEmpty {
                    classified.append(.itemName(name, qty))
                    continue
                }
            }

            // Pure number line — could be a price, zip code, or address number
            if isPureNumber(line) {
                if let p = extractLastPrice(from: line) {
                    classified.append(.price(p))
                } else {
                    classified.append(.skip)
                }
                continue
            }

            // Line with both name text and a price
            if let p = extractLastPrice(from: line) {
                let name = cleanItemName(line)
                if !name.isEmpty && name.count > 1 {
                    classified.append(.itemWithPrice)
                } else {
                    classified.append(.price(p))
                }
                continue
            }

            // Everything else that doesn't match any pattern — skip it.
            // This catches address lines, single words like "WELCOME", "MANAGER", etc.
            classified.append(.skip)
        }

        // Second pass: pair item names with standalone prices
        var lineItems: [LineItem] = []
        var fees: [Fee] = []
        var taxAmount: Double = 0
        var tipAmount: Double = 0

        var pendingItems: [(name: String, quantity: Int)] = []
        var consumedPriceIndices: Set<Int> = []
        var i = 0

        // Pre-scan: resolve label → price associations for subtotal and tax.
        // This prevents the subtotalLabel lookahead from skipping over taxLabel.
        // Walk sequentially; when we encounter a label, find the next unconsumed price.
        var labelPriceMap: [Int: Int] = [:] // label index → price index
        do {
            var pendingLabels: [(index: Int, kind: String)] = []
            for (idx, entry) in classified.enumerated() {
                switch entry {
                case .subtotalLabel:
                    pendingLabels.append((idx, "subtotal"))
                case .taxLabel:
                    pendingLabels.append((idx, "tax"))
                case .price:
                    if let first = pendingLabels.first {
                        labelPriceMap[first.index] = idx
                        pendingLabels.removeFirst()
                    }
                default:
                    break
                }
            }
        }

        while i < classified.count {
            switch classified[i] {
            case .itemName(let name, let qty):
                pendingItems.append((name: name, quantity: qty))
                i += 1

            case .price(let price):
                // Skip prices already consumed by label resolution
                if consumedPriceIndices.contains(i) {
                    i += 1
                    continue
                }
                if !pendingItems.isEmpty {
                    let item = pendingItems.removeFirst()
                    let qty = max(item.quantity, 1)
                    let unitPrice = price / Double(qty)
                    let roundedUnit = (unitPrice * 100).rounded() / 100
                    for _ in 0..<qty {
                        lineItems.append(LineItem(name: item.name, price: roundedUnit))
                    }
                }
                // Orphan price with no pending name: skip (subtotal/total value)
                i += 1

            case .itemWithPrice:
                // Flush pending items as $0 items
                for item in pendingItems {
                    lineItems.append(LineItem(name: item.name, price: 0))
                }
                pendingItems = []

                if i < cleanLines.count {
                    let line = cleanLines[i]
                    if let p = extractLastPrice(from: line) {
                        let name = cleanItemName(line)
                        if !name.isEmpty {
                            lineItems.append(LineItem(name: name, price: p))
                        }
                    }
                }
                i += 1

            case .tax(let amount):
                taxAmount = amount
                i += 1

            case .taxLabel:
                // Use pre-resolved price association
                if let priceIdx = labelPriceMap[i],
                   case .price(let p) = classified[priceIdx] {
                    taxAmount = p
                    consumedPriceIndices.insert(priceIdx)
                }
                i += 1

            case .subtotalLabel:
                // Use pre-resolved price association — just consume (skip) the subtotal value
                if let priceIdx = labelPriceMap[i] {
                    consumedPriceIndices.insert(priceIdx)
                }
                i += 1

            case .gratuity(let amount):
                tipAmount += amount
                i += 1

            case .fee(let name, let amount):
                fees.append(Fee(name: name, amount: amount))
                i += 1

            case .skip:
                i += 1
            }
        }

        // Remaining pending items → items with $0 price
        for item in pendingItems {
            lineItems.append(LineItem(name: item.name, price: 0))
        }

        return OCRResult(
            lineItems: lineItems,
            fees: fees,
            taxAmount: taxAmount,
            tipAmount: tipAmount,
            restaurantName: restaurantName,
            detectedGratuityAmount: tipAmount // all tip from OCR is detected gratuity
        )
    }

    // MARK: - Helpers

    /// Extract the **last** price on a line. Receipts place the price at the right edge.
    /// Matches formats: $14.50, 14.50, $1,234.50, 9.99, 8. 99 (OCR space in decimals)
    private static func extractLastPrice(from text: String) -> Double? {
        // First, normalize OCR spaces in decimals: "8. 99" → "8.99", "25. 18" → "25.18"
        let normalized = text.replacingOccurrences(
            of: "(\\d)\\. (\\d)",
            with: "$1.$2",
            options: .regularExpression
        )
        let pattern = "\\$?\\s?([\\d,]+\\.\\d{1,2})"
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return nil }
        let matches = regex.matches(in: normalized, range: NSRange(normalized.startIndex..., in: normalized))
        // Take the last match — prices are right-aligned on receipts
        guard let lastMatch = matches.last,
              let range = Range(lastMatch.range(at: 1), in: normalized) else {
            return nil
        }
        let priceString = String(normalized[range]).replacingOccurrences(of: ",", with: "")
        return Double(priceString)
    }

    /// Remove price, dollar signs, leading quantity markers, and extra whitespace from a line
    /// to produce a clean item name.
    private static func cleanItemName(_ text: String) -> String {
        var cleaned = text
        // Remove all price-like patterns (including dollar sign variants)
        cleaned = cleaned.replacingOccurrences(
            of: "\\$?\\s?[\\d,]+\\.\\d{1,2}",
            with: "",
            options: .regularExpression
        )
        // Remove leading quantity markers like "1x", "2 x", "1 ", "02 "
        cleaned = cleaned.replacingOccurrences(
            of: "^\\s*\\d{1,2}\\s*[xX]?\\s+",
            with: "",
            options: .regularExpression
        )
        // Remove stray dollar signs and hash marks
        cleaned = cleaned.replacingOccurrences(of: "$", with: "")
        cleaned = cleaned.replacingOccurrences(of: "#", with: "")
        // Collapse multiple spaces
        cleaned = cleaned.replacingOccurrences(
            of: "\\s{2,}",
            with: " ",
            options: .regularExpression
        )
        return cleaned.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Lines that should never be parsed as items.
    private static func isSkippableLine(_ lower: String) -> Bool {
        let skipPatterns = [
            "thank you", "receipt", "visa", "mastercard", "amex", "american express",
            "discover", "debit", "credit card", "change due", "cash tendered",
            "card #", "card number", "auth code", "authorization",
            "server", "table", "guest", "check", "order #", "order number",
            "date:", "time:", "tel:", "phone:", "fax:", "www.", "http",
            ".com", "dine in", "take out", "takeout", "carry out",
            "loyalty", "points", "reward", "member"
        ]
        return skipPatterns.contains { lower.contains($0) }
    }

    private static func isGratuity(_ text: String) -> Bool {
        gratuityPatterns.contains { text.contains($0) }
    }

    private static func isFee(_ text: String) -> Bool {
        feePatterns.contains { text.contains($0) }
    }
}
