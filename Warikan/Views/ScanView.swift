//
//  ScanView.swift
//  Warikan
//

import SwiftUI
import VisionKit
import PhotosUI
import PDFKit
import Vision

struct ScanView: View {
    var flowVM: SplitFlowViewModel

    @State private var selectedSource: ImportSource = .camera
    @State private var showDocumentScanner = false
    @State private var showPhotoPicker = false
    @State private var showFilePicker = false
    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var isProcessing = false

    enum ImportSource {
        case camera, photos, files
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            // Placeholder viewfinder area
            RoundedRectangle(cornerRadius: 16)
                .fill(Color("Raised"))
                .overlay(
                    VStack(spacing: 16) {
                        Image(systemName: "camera.viewfinder")
                            .font(.system(size: 48, weight: .thin))
                            .foregroundStyle(Color("TertiaryText"))

                        if isProcessing {
                            ProgressView("Scanning receipt...")
                                .font(.subheadline)
                                .foregroundStyle(Color("SecondaryText"))
                        } else {
                            Text("Capture or import a receipt")
                                .font(.subheadline)
                                .foregroundStyle(Color("SecondaryText"))
                        }
                    }
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Color.vermillion.opacity(0.3), lineWidth: 1.5)
                )
                .padding(.horizontal, 20)

            Spacer()

            // Source picker
            HStack(spacing: 32) {
                sourceButton(icon: "camera", label: "Camera", source: .camera) {
                    showDocumentScanner = true
                }

                PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                    sourceButtonLabel(icon: "photo", label: "Photos", isSelected: selectedSource == .photos)
                }
                .onChange(of: selectedPhotoItem) { _, newItem in
                    guard let newItem else { return }
                    selectedSource = .photos
                    Task { await loadPhoto(from: newItem) }
                }

                sourceButton(icon: "folder", label: "Files", source: .files) {
                    showFilePicker = true
                }
            }
            .padding(.bottom, 16)

            // Shutter button (camera only)
            Button {
                showDocumentScanner = true
            } label: {
                Circle()
                    .fill(Color.vermillion)
                    .frame(width: 64, height: 64)
                    .overlay(
                        Circle()
                            .stroke(.white, lineWidth: 3)
                            .frame(width: 54, height: 54)
                    )
            }
            .padding(.bottom, 32)
        }
        .navigationTitle("Scan Receipt")
        .fullScreenCover(isPresented: $showDocumentScanner) {
            DocumentScannerView { images in
                showDocumentScanner = false
                guard let image = images.first else { return }
                processImage(image)
            } onCancel: {
                showDocumentScanner = false
            }
        }
        .sheet(isPresented: $showFilePicker) {
            DocumentPickerView { image in
                processImage(image)
            }
        }
    }

    // MARK: - Source Button

    private func sourceButton(icon: String, label: String, source: ImportSource, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            sourceButtonLabel(icon: icon, label: label, isSelected: selectedSource == source)
        }
    }

    private func sourceButtonLabel(icon: String, label: String, isSelected: Bool) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 20, weight: .thin))
            Text(label)
                .font(.caption)
        }
        .foregroundStyle(isSelected ? Color.vermillion : Color("SecondaryText"))
    }

    // MARK: - Image Processing

    private func loadPhoto(from item: PhotosPickerItem) async {
        guard let data = try? await item.loadTransferable(type: Data.self),
              let image = UIImage(data: data) else { return }
        processImage(image)
    }

    private func processImage(_ image: UIImage) {
        flowVM.capturedImage = image
        isProcessing = true

        Task {
            let results = await OCRService.recognizeText(in: image)
            flowVM.lineItems = results.lineItems
            flowVM.fees = results.fees
            flowVM.taxAmount = results.taxAmount
            flowVM.tipAmount = results.tipAmount
            flowVM.restaurantName = results.restaurantName
            flowVM.currentStep = 2
            isProcessing = false
        }
    }
}

// MARK: - VisionKit Document Scanner

struct DocumentScannerView: UIViewControllerRepresentable {
    var onScan: ([UIImage]) -> Void
    var onCancel: () -> Void

    func makeUIViewController(context: Context) -> VNDocumentCameraViewController {
        let scanner = VNDocumentCameraViewController()
        scanner.delegate = context.coordinator
        return scanner
    }

    func updateUIViewController(_ uiViewController: VNDocumentCameraViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onScan: onScan, onCancel: onCancel)
    }

    class Coordinator: NSObject, VNDocumentCameraViewControllerDelegate {
        let onScan: ([UIImage]) -> Void
        let onCancel: () -> Void

        init(onScan: @escaping ([UIImage]) -> Void, onCancel: @escaping () -> Void) {
            self.onScan = onScan
            self.onCancel = onCancel
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
            var images: [UIImage] = []
            for i in 0..<scan.pageCount {
                images.append(scan.imageOfPage(at: i))
            }
            onScan(images)
        }

        func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
            onCancel()
        }

        func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
            onCancel()
        }
    }
}

// MARK: - Document Picker (Files app — images + PDFs)

struct DocumentPickerView: UIViewControllerRepresentable {
    var onImageSelected: (UIImage) -> Void

    func makeUIViewController(context: Context) -> UIDocumentPickerViewController {
        let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.image, .pdf])
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIDocumentPickerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onImageSelected: onImageSelected)
    }

    class Coordinator: NSObject, UIDocumentPickerDelegate {
        let onImageSelected: (UIImage) -> Void

        init(onImageSelected: @escaping (UIImage) -> Void) {
            self.onImageSelected = onImageSelected
        }

        func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
            guard let url = urls.first else { return }

            let accessing = url.startAccessingSecurityScopedResource()
            defer { if accessing { url.stopAccessingSecurityScopedResource() } }

            if url.pathExtension.lowercased() == "pdf" {
                guard let pdfDoc = PDFDocument(url: url),
                      let page = pdfDoc.page(at: 0) else { return }
                let pageRect = page.bounds(for: .mediaBox)
                let renderer = UIGraphicsImageRenderer(size: pageRect.size)
                let image = renderer.image { ctx in
                    UIColor.white.setFill()
                    ctx.fill(pageRect)
                    ctx.cgContext.translateBy(x: 0, y: pageRect.height)
                    ctx.cgContext.scaleBy(x: 1, y: -1)
                    page.draw(with: .mediaBox, to: ctx.cgContext)
                }
                onImageSelected(image)
            } else if let data = try? Data(contentsOf: url),
                      let image = UIImage(data: data) {
                onImageSelected(image)
            }
        }
    }
}
