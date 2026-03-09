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
            return OCRResult(lineItems: [], fees: [], taxAmount: 0, tipAmount: 0)
        }

        let recognizedStrings = await performOCR(on: cgImage)
        return parseReceipt(lines: recognizedStrings)
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
        var lineItems: [LineItem] = []
        var fees: [Fee] = []
        var taxAmount: Double = 0
        var tipAmount: Double = 0
        var restaurantName: String?

        // First non-price line is likely the restaurant name
        if let firstLine = lines.first, extractPrice(from: firstLine) == nil {
            restaurantName = firstLine
        }

        for line in lines {
            let lower = line.lowercased()

            // Skip lines that are likely headers/footers
            if lower.contains("thank you") || lower.contains("receipt") ||
               lower.contains("visa") || lower.contains("mastercard") ||
               lower.contains("change") || lower.contains("cash") ||
               lower.contains("subtotal") || lower.contains("total") && !lower.contains("fee") {
                // Check for tax/tip in total-like lines
                if lower.contains("tax") {
                    if let price = extractPrice(from: line) {
                        taxAmount = price
                    }
                }
                if lower.contains("tip") || lower.contains("gratuity") {
                    if let price = extractPrice(from: line) {
                        tipAmount = price
                    }
                }
                continue
            }

            // Check for tax line
            if lower.contains("tax") {
                if let price = extractPrice(from: line) {
                    taxAmount = price
                }
                continue
            }

            // Check for tip/gratuity
            if isGratuity(lower) {
                if let price = extractPrice(from: line) {
                    tipAmount += price
                }
                continue
            }

            // Check for fees
            if isFee(lower) {
                if let price = extractPrice(from: line) {
                    let name = line.replacingOccurrences(
                        of: "\\$?[\\d,]+\\.\\d{2}",
                        with: "",
                        options: .regularExpression
                    ).trimmingCharacters(in: .whitespaces)
                    fees.append(Fee(name: name.isEmpty ? "Fee" : name, amount: price))
                }
                continue
            }

            // Regular line item: try to extract name + price
            if let price = extractPrice(from: line) {
                let name = line.replacingOccurrences(
                    of: "\\$?[\\d,]+\\.\\d{2}",
                    with: "",
                    options: .regularExpression
                ).trimmingCharacters(in: .whitespaces)

                if !name.isEmpty {
                    lineItems.append(LineItem(name: name, price: price))
                }
            }
        }

        return OCRResult(
            lineItems: lineItems,
            fees: fees,
            taxAmount: taxAmount,
            tipAmount: tipAmount,
            restaurantName: restaurantName
        )
    }

    // MARK: - Helpers

    private static func extractPrice(from text: String) -> Double? {
        let pattern = "\\$?([\\d,]+\\.\\d{2})"
        guard let regex = try? NSRegularExpression(pattern: pattern),
              let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
              let range = Range(match.range(at: 1), in: text) else {
            return nil
        }
        let priceString = String(text[range]).replacingOccurrences(of: ",", with: "")
        return Double(priceString)
    }

    private static func isGratuity(_ text: String) -> Bool {
        gratuityPatterns.contains { text.contains($0) }
    }

    private static func isFee(_ text: String) -> Bool {
        feePatterns.contains { text.contains($0) }
    }
}
