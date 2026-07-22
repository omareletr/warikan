import Capacitor
import ImageIO
import UIKit
import Vision
import VisionKit

@objc(ReceiptOCRPlugin)
public class ReceiptOCRPlugin: CAPPlugin, CAPBridgedPlugin, VNDocumentCameraViewControllerDelegate {
    public let identifier = "ReceiptOCRPlugin"
    public let jsName = "ReceiptOCR"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scanReceipt", returnType: CAPPluginReturnPromise)
    ]

    private var activeCall: CAPPluginCall?

    @objc func scanReceipt(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard VNDocumentCameraViewController.isSupported else {
                call.reject("Apple document scanning is not available on this device.", "scanner_unavailable")
                return
            }

            guard self.activeCall == nil else {
                call.reject("A receipt scan is already in progress.", "scan_in_progress")
                return
            }

            guard let presentingViewController = self.bridge?.viewController else {
                call.reject("Scanner could not be presented.", "scanner_unavailable")
                return
            }

            self.activeCall = call
            let scanner = VNDocumentCameraViewController()
            scanner.delegate = self
            presentingViewController.present(scanner, animated: true)
        }
    }

    public func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
        controller.dismiss(animated: true) {
            self.activeCall?.reject("Scan cancelled", "scan_cancelled")
            self.activeCall = nil
        }
    }

    public func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
        controller.dismiss(animated: true) {
            self.activeCall?.reject(error.localizedDescription, "scan_failed")
            self.activeCall = nil
        }
    }

    public func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
        controller.dismiss(animated: true) {
            self.recognizeText(in: scan)
        }
    }

    private func recognizeText(in scan: VNDocumentCameraScan) {
        guard let call = activeCall else { return }

        DispatchQueue.global(qos: .userInitiated).async {
            var pageTexts: [String] = []
            var warnings: [String] = []
            var confidenceTotal: Float = 0
            var confidenceCount = 0

            for pageIndex in 0..<scan.pageCount {
                let image = scan.imageOfPage(at: pageIndex)
                guard let cgImage = image.cgImage else {
                    warnings.append("Page \(pageIndex + 1) could not be processed.")
                    continue
                }

                let request = VNRecognizeTextRequest()
                request.recognitionLevel = .accurate
                request.usesLanguageCorrection = true
                request.minimumTextHeight = 0.01

                let handler = VNImageRequestHandler(cgImage: cgImage, orientation: self.cgImageOrientation(for: image.imageOrientation), options: [:])

                do {
                    try handler.perform([request])
                } catch {
                    warnings.append("Page \(pageIndex + 1) OCR failed.")
                    continue
                }

                let observations = (request.results ?? [])
                    .sorted { first, second in
                        let yDelta = abs(first.boundingBox.minY - second.boundingBox.minY)
                        if yDelta > 0.015 { return first.boundingBox.minY > second.boundingBox.minY }
                        return first.boundingBox.minX < second.boundingBox.minX
                    }

                let lines = observations.compactMap { observation -> String? in
                    guard let candidate = observation.topCandidates(1).first else { return nil }
                    confidenceTotal += candidate.confidence
                    confidenceCount += 1
                    return candidate.string.trimmingCharacters(in: .whitespacesAndNewlines)
                }.filter { !$0.isEmpty }

                if lines.isEmpty {
                    warnings.append("Page \(pageIndex + 1) did not contain readable text.")
                } else {
                    pageTexts.append("--- Page \(pageIndex + 1) ---\n" + lines.joined(separator: "\n"))
                }
            }

            let text = pageTexts.joined(separator: "\n\n").trimmingCharacters(in: .whitespacesAndNewlines)
            DispatchQueue.main.async {
                if text.isEmpty {
                    call.reject("No readable receipt text was found.", "ocr_empty")
                } else {
                    var result: [String: Any] = [
                        "text": text,
                        "pages": scan.pageCount,
                        "warnings": warnings
                    ]
                    if confidenceCount > 0 {
                        result["confidence"] = Double(confidenceTotal / Float(confidenceCount))
                    }
                    call.resolve(result)
                }
                self.activeCall = nil
            }
        }
    }

    private func cgImageOrientation(for imageOrientation: UIImage.Orientation) -> CGImagePropertyOrientation {
        switch imageOrientation {
        case .up: return .up
        case .down: return .down
        case .left: return .left
        case .right: return .right
        case .upMirrored: return .upMirrored
        case .downMirrored: return .downMirrored
        case .leftMirrored: return .leftMirrored
        case .rightMirrored: return .rightMirrored
        @unknown default: return .up
        }
    }
}
