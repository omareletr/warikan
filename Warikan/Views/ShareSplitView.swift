//
//  ShareSplitView.swift
//  Warikan
//

import SwiftUI
import FirebaseFirestore

struct ShareSplitView: View {
    let splitId: String
    let shareToken: String
    let participantId: String

    @State private var split: SplitSession?
    @State private var isLoading = true
    @State private var errorMessage: String?

    private var participantName: String {
        guard let split else { return "" }
        if let guest = split.guests.first(where: { $0.id == participantId }) {
            return guest.name
        }
        return "You"
    }

    private var assignedItems: [LineItem] {
        guard let split else { return [] }
        return split.lineItems.filter { $0.assignedToIds.contains(participantId) }
    }

    private var personSubtotal: Double {
        assignedItems.reduce(0.0) { total, item in
            total + item.price / Double(max(item.assignedToIds.count, 1))
        }
    }

    private var ratio: Double {
        guard let split, split.lineItems.reduce(0, { $0 + $1.price }) > 0 else { return 0 }
        let subtotal = split.lineItems.reduce(0) { $0 + $1.price }
        return personSubtotal / subtotal
    }

    private var taxShare: Double {
        (split?.taxAmount ?? 0) * ratio
    }

    private var tipShare: Double {
        (split?.tipAmount ?? 0) * ratio
    }

    private var feesShare: Double {
        let feesTotal = split?.fees.reduce(0) { $0 + $1.amount } ?? 0
        return feesTotal * ratio
    }

    private var totalOwed: Double {
        personSubtotal + taxShare + tipShare + feesShare
    }

    var body: some View {
        ZStack {
            Color("Background").ignoresSafeArea()

            if isLoading {
                ProgressView()
            } else if let errorMessage {
                errorState(errorMessage)
            } else if split != nil {
                splitContent
            }
        }
        .task {
            await fetchSplit()
        }
    }

    // MARK: - Content

    private var splitContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Header
                VStack(alignment: .leading, spacing: 4) {
                    Text(split?.restaurantName ?? "Your Split")
                        .font(.displayMedium)
                        .foregroundStyle(Color("PrimaryText"))

                    Text("Your share")
                        .font(.footnote)
                        .foregroundStyle(Color("SecondaryText"))

                    Text(totalOwed, format: .currency(code: "USD"))
                        .font(.displayLarge)
                        .monospacedDigit()
                        .foregroundStyle(Color.vermillion)
                }
                .padding(.top, 24)
                .padding(.bottom, 24)

                // Items
                sectionLabel("YOUR ITEMS")
                hairlineDivider()

                ForEach(assignedItems) { item in
                    let itemShare = item.price / Double(max(item.assignedToIds.count, 1))
                    HStack {
                        Text(item.name)
                            .font(.body)
                            .foregroundStyle(Color("PrimaryText"))
                        Spacer()
                        if item.assignedToIds.count > 1 {
                            Text("split \(item.assignedToIds.count) ways")
                                .font(.caption)
                                .foregroundStyle(Color("TertiaryText"))
                        }
                        Text(itemShare, format: .currency(code: "USD"))
                            .font(.body)
                            .monospacedDigit()
                            .foregroundStyle(Color("PrimaryText"))
                    }
                    .padding(.vertical, 10)
                    hairlineDivider()
                }

                Spacer().frame(height: 16)

                // Proration breakdown
                if taxShare > 0 {
                    prorationRow("Tax", taxShare)
                }
                if tipShare > 0 {
                    prorationRow("Tip", tipShare)
                }
                if feesShare > 0 {
                    prorationRow("Fees", feesShare)
                }

                Spacer().frame(height: 24)

                // Total
                HStack {
                    Text("Total")
                        .font(.body.bold())
                        .foregroundStyle(Color("PrimaryText"))
                    Spacer()
                    Text(totalOwed, format: .currency(code: "USD"))
                        .font(.body.bold())
                        .monospacedDigit()
                        .foregroundStyle(Color.vermillion)
                }
                .padding(.vertical, 12)
                hairlineDivider()

                Spacer().frame(height: 32)

                // Copy amount button
                Button {
                    UIPasteboard.general.string = String(format: "%.2f", totalOwed)
                } label: {
                    Text("Copy $\(totalOwed, specifier: "%.2f")")
                        .font(.body.bold())
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(Color.vermillion)
                        .clipShape(RoundedRectangle(cornerRadius: 32))
                }

                Spacer().frame(height: 16)

                Text("Sent via Warikan")
                    .font(.caption)
                    .foregroundStyle(Color("TertiaryText"))
                    .frame(maxWidth: .infinity, alignment: .center)
            }
            .padding(.horizontal, 20)
        }
    }

    // MARK: - Error State

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 40, weight: .thin))
                .foregroundStyle(Color("TertiaryText"))

            Text(message)
                .font(.body)
                .foregroundStyle(Color("SecondaryText"))
                .multilineTextAlignment(.center)
        }
        .padding(.horizontal, 40)
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

    private func prorationRow(_ label: String, _ amount: Double) -> some View {
        HStack {
            Text(label)
                .font(.footnote)
                .foregroundStyle(Color("SecondaryText"))
            Spacer()
            Text(amount, format: .currency(code: "USD"))
                .font(.footnote)
                .monospacedDigit()
                .foregroundStyle(Color("SecondaryText"))
        }
        .padding(.vertical, 2)
    }

    // MARK: - Fetch

    private func fetchSplit() async {
        do {
            let db = Firestore.firestore()
            let doc = try await db.collection("splits").document(splitId).getDocument()
            guard let data = doc.data() else {
                errorMessage = "Split not found."
                isLoading = false
                return
            }

            let jsonData = try JSONSerialization.data(withJSONObject: data)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .millisecondsSince1970
            let session = try decoder.decode(SplitSession.self, from: jsonData)

            // Verify share token
            guard session.shareToken == shareToken else {
                errorMessage = "Invalid link."
                isLoading = false
                return
            }

            split = session
            isLoading = false
        } catch {
            errorMessage = "Couldn't load this split."
            isLoading = false
        }
    }
}
