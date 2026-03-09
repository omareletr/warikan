//
//  SplitExportView.swift
//  Warikan
//
//  Rendered off-screen by ImageRenderer — never shown directly in the app.
//  Fixed width of 390pt for consistent output across devices.

import SwiftUI

struct SplitExportView: View {
    let restaurantName: String?
    let grandTotal: Double
    let people: [(id: String, name: String)]
    let lineItems: [LineItem]
    let taxAmount: Double
    let tipAmount: Double
    let feesTotal: Double
    let subtotal: Double

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Top bar: wordmark + date
            HStack {
                Text("warikan")
                    .font(.footnote)
                    .foregroundStyle(Color("SecondaryText"))
                Spacer()
                Text(Date(), format: .dateTime.month(.abbreviated).day().year())
                    .font(.footnote)
                    .foregroundStyle(Color("SecondaryText"))
            }
            .padding(.bottom, 16)

            // Restaurant name
            Text(restaurantName ?? "Your Split")
                .font(.displaySmall)
                .foregroundStyle(Color("PrimaryText"))

            // Grand total
            Text(grandTotal, format: .currency(code: "USD"))
                .font(.displayLarge)
                .monospacedDigit()
                .foregroundStyle(Color.vermillion)
                .padding(.bottom, 16)

            // Divider
            Rectangle()
                .fill(Color("Separator"))
                .frame(height: 0.5)
                .padding(.bottom, 16)

            // Each person
            ForEach(people, id: \.id) { person in
                personBlock(person: person)
            }

            // Bottom summary
            Spacer().frame(height: 16)
            Rectangle()
                .fill(Color("Separator"))
                .frame(height: 0.5)
                .padding(.bottom, 12)

            if taxAmount > 0 {
                summaryRow("Tax", taxAmount)
            }
            if tipAmount > 0 {
                summaryRow("Tip", tipAmount)
            }
            if feesTotal > 0 {
                summaryRow("Fees", feesTotal)
            }

            Spacer().frame(height: 16)

            // Watermark
            HStack {
                Spacer()
                Text("Split with Warikan")
                    .font(.caption)
                    .foregroundStyle(Color("TertiaryText"))
            }
        }
        .padding(24)
        .background(Color.white)
    }

    // MARK: - Person Block

    private func personBlock(person: (id: String, name: String)) -> some View {
        let assigned = lineItems.filter { $0.assignedToIds.contains(person.id) }
        let personSub = assigned.reduce(0.0) { total, item in
            total + item.price / Double(max(item.assignedToIds.count, 1))
        }
        let ratio = subtotal > 0 ? personSub / subtotal : 0
        let personTotal = personSub + (taxAmount + tipAmount + feesTotal) * ratio

        return VStack(alignment: .leading, spacing: 4) {
            // Name + total
            HStack(spacing: 10) {
                Circle()
                    .fill(Color.vermillion.opacity(0.08))
                    .frame(width: 36, height: 36)
                    .overlay(
                        Text(initials(for: person.name))
                            .font(.caption)
                            .foregroundStyle(Color.vermillion)
                    )

                Text(person.name)
                    .font(.body)
                    .foregroundStyle(Color("PrimaryText"))

                Spacer()

                Text(personTotal, format: .currency(code: "USD"))
                    .font(.body)
                    .monospacedDigit()
                    .foregroundStyle(Color.vermillion)
            }

            // Item breakdown
            ForEach(assigned) { item in
                let itemShare = item.price / Double(max(item.assignedToIds.count, 1))
                HStack {
                    Text(item.name)
                        .font(.footnote)
                        .foregroundStyle(Color("SecondaryText"))
                    Spacer()
                    Text(itemShare, format: .currency(code: "USD"))
                        .font(.footnote)
                        .monospacedDigit()
                        .foregroundStyle(Color("SecondaryText"))
                }
                .padding(.leading, 46)
            }

            Spacer().frame(height: 12)
        }
    }

    // MARK: - Helpers

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
        }
    }

    private func initials(for name: String) -> String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}
