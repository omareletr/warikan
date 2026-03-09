//
//  SplitDetailView.swift
//  Warikan
//
//  Drill-in from HomeView to see full details of a past split.

import SwiftUI

struct SplitDetailView: View {
    let restaurantName: String?
    let totalAmount: Double
    let date: Date
    let lineItems: [LineItem]
    let fees: [Fee]
    let taxAmount: Double
    let tipAmount: Double
    let guests: [Guest]
    let settled: Bool
    let splitId: String
    let shareToken: String

    @State private var expandedPersonId: String?
    @State private var exportImage: UIImage?
    @State private var showShareSheet = false

    private var subtotal: Double {
        lineItems.reduce(0) { $0 + $1.price }
    }

    private var feesTotal: Double {
        fees.reduce(0) { $0 + $1.amount }
    }

    private var grandTotal: Double {
        subtotal + taxAmount + tipAmount + feesTotal
    }

    private var allPeople: [(id: String, name: String)] {
        guests.map { (id: $0.id, name: $0.name) }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(restaurantName ?? "Split")
                            .font(.displayMedium)
                            .foregroundStyle(Color("PrimaryText"))

                        Spacer()

                        if settled {
                            Text("Settled")
                                .font(.caption)
                                .foregroundStyle(.green)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(.green.opacity(0.1))
                                .clipShape(Capsule())
                        }
                    }

                    Text(grandTotal, format: .currency(code: "USD"))
                        .font(.displayLarge)
                        .monospacedDigit()
                        .foregroundStyle(Color.vermillion)

                    HStack(spacing: 8) {
                        Text("\(allPeople.count) people")
                            .font(.footnote)
                            .foregroundStyle(Color("SecondaryText"))

                        Text("\u{00B7}")
                            .font(.footnote)
                            .foregroundStyle(Color("SecondaryText"))

                        Text(date, format: .dateTime.month(.abbreviated).day().year())
                            .font(.footnote)
                            .foregroundStyle(Color("SecondaryText"))
                    }
                }
                .padding(.top, 16)
                .padding(.bottom, 24)

                // People
                sectionLabel("EACH PERSON OWES")
                hairlineDivider()

                ForEach(allPeople, id: \.id) { person in
                    participantRow(person: person)
                }

                Spacer().frame(height: 24)

                // Line items
                sectionLabel("ALL ITEMS")
                hairlineDivider()

                ForEach(lineItems) { item in
                    HStack {
                        Text(item.name)
                            .font(.body)
                            .foregroundStyle(Color("PrimaryText"))
                        Spacer()
                        Text(item.price, format: .currency(code: "USD"))
                            .font(.body)
                            .monospacedDigit()
                            .foregroundStyle(Color("SecondaryText"))
                    }
                    .padding(.vertical, 8)
                    hairlineDivider()
                }

                Spacer().frame(height: 16)

                // Summary
                if !fees.isEmpty {
                    ForEach(fees) { fee in
                        summaryRow(fee.name, fee.amount)
                    }
                }
                summaryRow("Tax", taxAmount)
                summaryRow("Tip", tipAmount)

                Spacer().frame(height: 40)
            }
            .padding(.horizontal, 20)
        }
        .background(Color("Background"))
        .navigationTitle("Split Details")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    Task { await exportAsPhoto() }
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 16, weight: .thin))
                        .foregroundStyle(Color("SecondaryText"))
                }
            }
        }
        .sheet(isPresented: $showShareSheet) {
            if let exportImage {
                ShareSheetView(image: exportImage)
            }
        }
    }

    // MARK: - Participant Row

    private func participantRow(person: (id: String, name: String)) -> some View {
        let assignedItems = lineItems.filter { $0.assignedToIds.contains(person.id) }
        let personSub = assignedItems.reduce(0.0) { total, item in
            total + item.price / Double(max(item.assignedToIds.count, 1))
        }
        let ratio = subtotal > 0 ? personSub / subtotal : 0
        let share = personSub + (taxAmount + tipAmount + feesTotal) * ratio
        let isExpanded = expandedPersonId == person.id

        return VStack(spacing: 0) {
            Button {
                withAnimation(.spring(duration: 0.3)) {
                    expandedPersonId = isExpanded ? nil : person.id
                }
            } label: {
                HStack(spacing: 12) {
                    Circle()
                        .fill(Color.vermillion.opacity(0.08))
                        .frame(width: 44, height: 44)
                        .overlay(
                            Text(initials(for: person.name))
                                .font(.subheadline)
                                .foregroundStyle(Color.vermillion)
                        )

                    Text(person.name)
                        .font(.body)
                        .foregroundStyle(Color("PrimaryText"))

                    Spacer()

                    Text(share, format: .currency(code: "USD"))
                        .font(.body)
                        .monospacedDigit()
                        .foregroundStyle(Color.vermillion)

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .light))
                        .foregroundStyle(Color("TertiaryText"))
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                        .animation(.easeOut(duration: 0.2), value: isExpanded)
                }
                .padding(.vertical, 12)
            }

            if isExpanded {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(assignedItems) { item in
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
                    }

                    if taxAmount * ratio > 0.005 {
                        prorationRow("Tax", taxAmount * ratio)
                    }
                    if tipAmount * ratio > 0.005 {
                        prorationRow("Tip", tipAmount * ratio)
                    }
                    if feesTotal * ratio > 0.005 {
                        prorationRow("Fees", feesTotal * ratio)
                    }
                }
                .padding(.leading, 56)
                .padding(.bottom, 12)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            hairlineDivider()
        }
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
        .padding(.vertical, 2)
    }

    private func prorationRow(_ label: String, _ amount: Double) -> some View {
        HStack {
            Text(label)
                .font(.footnote)
                .foregroundStyle(Color("TertiaryText"))
            Spacer()
            Text(amount, format: .currency(code: "USD"))
                .font(.footnote)
                .monospacedDigit()
                .foregroundStyle(Color("TertiaryText"))
        }
    }

    private func initials(for name: String) -> String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }

    // MARK: - Export

    @MainActor
    private func exportAsPhoto() async {
        let exportView = SplitExportView(
            restaurantName: restaurantName,
            grandTotal: grandTotal,
            people: allPeople,
            lineItems: lineItems,
            taxAmount: taxAmount,
            tipAmount: tipAmount,
            feesTotal: feesTotal,
            subtotal: subtotal
        )
        .frame(width: 390)

        let renderer = ImageRenderer(content: exportView)
        renderer.scale = 3.0
        if let image = renderer.uiImage {
            exportImage = image
            showShareSheet = true
        }
    }
}
