//
//  ReceiptReviewView.swift
//  Warikan
//

import SwiftUI

struct ReceiptReviewView: View {
    var flowVM: SplitFlowViewModel

    @State private var editingItemId: String?
    @State private var showGratuityBanner = false
    @State private var detectedGratuityAmount: Double = 0

    private var hasZeroPriceItems: Bool {
        flowVM.lineItems.contains { $0.price == 0 }
    }

    private let tipPresets: [Double] = [0.15, 0.18, 0.20, 0.25]

    private var activeTipPreset: Double? {
        guard flowVM.subtotal > 0 else { return nil }
        return tipPresets.first { preset in
            abs(flowVM.tipAmount - flowVM.subtotal * preset) < 0.01
        }
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Gratuity banner
                    if showGratuityBanner {
                        gratuityBanner
                            .padding(.bottom, 16)
                    }

                    // Items section
                    sectionLabel("ITEMS")
                    hairlineDivider()

                    ForEach(Array(flowVM.lineItems.enumerated()), id: \.element.id) { index, item in
                        lineItemRow(item: item, index: index)
                    }

                    addButton("Add Item") {
                        flowVM.lineItems.append(LineItem(name: "", price: 0))
                    }
                    .padding(.top, 8)
                    .padding(.bottom, 24)

                    // Fees section
                    if !flowVM.fees.isEmpty {
                        sectionLabel("FEES")
                        hairlineDivider()

                        ForEach(Array(flowVM.fees.enumerated()), id: \.element.id) { index, fee in
                            feeRow(fee: fee, index: index)
                        }

                        addButton("Add Fee") {
                            flowVM.fees.append(Fee(name: "", amount: 0))
                        }
                        .padding(.top, 8)
                        .padding(.bottom, 24)
                    } else {
                        addButton("Add Fee") {
                            flowVM.fees.append(Fee(name: "", amount: 0))
                        }
                        .padding(.bottom, 24)
                    }

                    // Tax & Tip section
                    sectionLabel("TAX & TIP")
                    hairlineDivider()

                    taxRow
                        .padding(.vertical, 12)

                    tipRow
                        .padding(.bottom, 12)

                    tipPresetButtons
                        .padding(.bottom, 24)

                    // Spacer for bottom bar
                    Spacer().frame(height: 160)
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
            }

            // Bottom pinned area
            VStack(spacing: 0) {
                liveSummaryBar
                continueCTA
            }
            .background(Color("Background"))
        }
        .navigationTitle("Review Receipt")
    }

    // MARK: - Gratuity Banner

    private var gratuityBanner: some View {
        HStack(spacing: 0) {
            Rectangle()
                .fill(Color.vermillion)
                .frame(width: 1.5)

            Text("We detected an included gratuity of $\(detectedGratuityAmount, specifier: "%.2f") and added it to Tip. Tap to adjust.")
                .font(.footnote)
                .foregroundStyle(Color("PrimaryText"))
                .padding(.horizontal, 12)
                .padding(.vertical, 8)

            Spacer()

            Button {
                showGratuityBanner = false
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .light))
                    .foregroundStyle(Color("TertiaryText"))
            }
            .padding(.trailing, 12)
        }
        .background(Color("Surface"))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    // MARK: - Line Item Row

    private func lineItemRow(item: LineItem, index: Int) -> some View {
        VStack(spacing: 0) {
            HStack {
                if item.price == 0 {
                    Rectangle()
                        .fill(Color.red)
                        .frame(width: 1.5)
                }

                TextField("Item name", text: Binding(
                    get: { flowVM.lineItems[safe: index]?.name ?? "" },
                    set: { if flowVM.lineItems.indices.contains(index) { flowVM.lineItems[index].name = $0 } }
                ))
                .font(.body)
                .foregroundStyle(Color("PrimaryText"))

                Spacer()

                TextField("$0.00", value: Binding(
                    get: { flowVM.lineItems[safe: index]?.price ?? 0 },
                    set: { if flowVM.lineItems.indices.contains(index) { flowVM.lineItems[index].price = $0 } }
                ), format: .currency(code: "USD"))
                .font(.body)
                .monospacedDigit()
                .foregroundStyle(item.price == 0 ? .red : Color("PrimaryText"))
                .multilineTextAlignment(.trailing)
                .keyboardType(.decimalPad)
                .frame(width: 90)
            }
            .padding(.vertical, 12)

            hairlineDivider()
        }
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                flowVM.lineItems.remove(at: index)
            } label: {
                Image(systemName: "trash")
            }
        }
    }

    // MARK: - Fee Row

    private func feeRow(fee: Fee, index: Int) -> some View {
        VStack(spacing: 0) {
            HStack {
                TextField("Fee name", text: Binding(
                    get: { flowVM.fees[safe: index]?.name ?? "" },
                    set: { if flowVM.fees.indices.contains(index) { flowVM.fees[index].name = $0 } }
                ))
                .font(.body)
                .foregroundStyle(Color("PrimaryText"))

                Spacer()

                TextField("$0.00", value: Binding(
                    get: { flowVM.fees[safe: index]?.amount ?? 0 },
                    set: { if flowVM.fees.indices.contains(index) { flowVM.fees[index].amount = $0 } }
                ), format: .currency(code: "USD"))
                .font(.body)
                .monospacedDigit()
                .foregroundStyle(Color("PrimaryText"))
                .multilineTextAlignment(.trailing)
                .keyboardType(.decimalPad)
                .frame(width: 90)
            }
            .padding(.vertical, 12)

            hairlineDivider()
        }
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                flowVM.fees.remove(at: index)
            } label: {
                Image(systemName: "trash")
            }
        }
    }

    // MARK: - Tax Row

    private var taxRow: some View {
        HStack {
            Text("Tax")
                .font(.body)
                .foregroundStyle(Color("PrimaryText"))

            Spacer()

            TextField("$0.00", value: $flowVM.taxAmount, format: .currency(code: "USD"))
                .font(.body)
                .monospacedDigit()
                .multilineTextAlignment(.trailing)
                .keyboardType(.decimalPad)
                .padding(8)
                .background(Color("Raised"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .frame(width: 110)
        }
    }

    // MARK: - Tip Row

    private var tipRow: some View {
        HStack {
            Text("Tip")
                .font(.body)
                .foregroundStyle(Color("PrimaryText"))

            Spacer()

            TextField("$0.00", value: $flowVM.tipAmount, format: .currency(code: "USD"))
                .font(.body)
                .monospacedDigit()
                .multilineTextAlignment(.trailing)
                .keyboardType(.decimalPad)
                .padding(8)
                .background(Color("Raised"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .frame(width: 110)
        }
    }

    // MARK: - Tip Presets

    private var tipPresetButtons: some View {
        HStack(spacing: 8) {
            ForEach(tipPresets, id: \.self) { preset in
                let percentage = Int(preset * 100)
                let isActive = activeTipPreset == preset

                Button {
                    flowVM.tipAmount = flowVM.subtotal * preset
                } label: {
                    Text("\(percentage)%")
                        .font(.footnote)
                        .foregroundStyle(isActive ? .white : Color("SecondaryText"))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 6)
                        .background(isActive ? Color.vermillion : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .overlay(
                            RoundedRectangle(cornerRadius: 8)
                                .stroke(isActive ? Color.clear : Color("Separator"), lineWidth: 1)
                        )
                }
            }

            Spacer()
        }
    }

    // MARK: - Live Summary

    private var liveSummaryBar: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color("Separator"))
                .frame(height: 0.5)

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    summaryRow("Subtotal", flowVM.subtotal)
                    summaryRow("Tax", flowVM.taxAmount)
                    summaryRow("Tip", flowVM.tipAmount)
                    if flowVM.feesTotal > 0 {
                        summaryRow("Fees", flowVM.feesTotal)
                    }
                }

                Spacer()

                VStack(alignment: .trailing) {
                    Text("Total")
                        .font(.footnote)
                        .foregroundStyle(Color("SecondaryText"))
                    Text(flowVM.grandTotal, format: .currency(code: "USD"))
                        .font(.body)
                        .monospacedDigit()
                        .foregroundStyle(Color("PrimaryText"))
                        .contentTransition(.numericText())
                        .animation(.spring(duration: 0.25), value: flowVM.grandTotal)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
        }
    }

    private func summaryRow(_ label: String, _ value: Double) -> some View {
        HStack {
            Text(label)
                .font(.footnote)
                .foregroundStyle(Color("SecondaryText"))
            Spacer()
            Text(value, format: .currency(code: "USD"))
                .font(.footnote)
                .monospacedDigit()
                .foregroundStyle(Color("SecondaryText"))
                .contentTransition(.numericText())
                .animation(.spring(duration: 0.25), value: value)
        }
    }

    // MARK: - Continue CTA

    private var continueCTA: some View {
        Button {
            flowVM.currentStep = 3
        } label: {
            Text("Continue")
                .font(.body.bold())
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(hasZeroPriceItems ? Color.vermillion.opacity(0.4) : Color.vermillion)
                .clipShape(RoundedRectangle(cornerRadius: 32))
        }
        .disabled(hasZeroPriceItems)
        .padding(.horizontal, 20)
        .padding(.bottom, 8)
    }

    // MARK: - Helpers

    private func sectionLabel(_ title: String) -> some View {
        Text(title)
            .font(.caption)
            .foregroundStyle(Color("SecondaryText"))
            .kerning(1.5)
            .padding(.bottom, 8)
    }

    private func hairlineDivider() -> some View {
        Rectangle()
            .fill(Color("Separator"))
            .frame(height: 0.5)
    }

    private func addButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: "plus")
                    .font(.system(size: 12))
                Text(title)
                    .font(.subheadline)
            }
            .foregroundStyle(Color("SecondaryText"))
        }
    }
}

// MARK: - Safe Collection Access

extension Collection {
    subscript(safe index: Index) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
