//
//  FriendProfileView.swift
//  Warikan
//
//  Shows a friend's profile and shared split history.

import SwiftUI
import FirebaseFirestore

struct FriendProfileView: View {
    let friend: AppUser
    let currentUserId: String

    @State private var sharedSplits: [SplitSession] = []
    @State private var isLoading = true

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Profile header
                profileHeader
                    .padding(.top, 16)
                    .padding(.bottom, 24)

                // Payment handles
                if hasPaymentHandles {
                    paymentHandlesSection
                        .padding(.bottom, 24)
                }

                // Shared splits
                sharedSplitsSection
            }
            .padding(.horizontal, 20)
        }
        .background(Color("Background"))
        .navigationTitle(friend.displayName)
        .task {
            await fetchSharedSplits()
        }
    }

    // MARK: - Profile Header

    private var profileHeader: some View {
        HStack(spacing: 16) {
            Circle()
                .fill(Color.vermillion.opacity(0.08))
                .frame(width: 64, height: 64)
                .overlay(
                    Text(initials(for: friend.displayName))
                        .font(.title2)
                        .foregroundStyle(Color.vermillion)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(friend.displayName)
                    .font(.title3)
                    .foregroundStyle(Color("PrimaryText"))

                Text("@\(friend.username)")
                    .font(.subheadline)
                    .foregroundStyle(Color("SecondaryText"))
            }

            Spacer()
        }
    }

    // MARK: - Payment Handles

    private var hasPaymentHandles: Bool {
        friend.venmoHandle != nil || friend.cashAppCashtag != nil ||
        friend.paypalUsername != nil || friend.zelleContact != nil
    }

    private var paymentHandlesSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionLabel("PAYMENT HANDLES")
            hairlineDivider()

            if let venmo = friend.venmoHandle, !venmo.isEmpty {
                handleRow("Venmo", "@\(venmo)")
            }
            if let cashApp = friend.cashAppCashtag, !cashApp.isEmpty {
                handleRow("Cash App", "$\(cashApp)")
            }
            if let paypal = friend.paypalUsername, !paypal.isEmpty {
                handleRow("PayPal", paypal)
            }
            if let zelle = friend.zelleContact, !zelle.isEmpty {
                handleRow("Zelle", zelle)
            }
        }
    }

    private func handleRow(_ label: String, _ value: String) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text(label)
                    .font(.body)
                    .foregroundStyle(Color("PrimaryText"))
                Spacer()
                Text(value)
                    .font(.body)
                    .foregroundStyle(Color("SecondaryText"))
            }
            .padding(.vertical, 10)
            hairlineDivider()
        }
    }

    // MARK: - Shared Splits

    private var sharedSplitsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionLabel("SHARED SPLITS")
            hairlineDivider()

            if isLoading {
                ForEach(0..<2, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color("Raised"))
                        .frame(height: 56)
                        .shimmering()
                        .padding(.vertical, 4)
                }
            } else if sharedSplits.isEmpty {
                Text("No splits together yet.")
                    .font(.body)
                    .foregroundStyle(Color("SecondaryText"))
                    .padding(.vertical, 24)
                    .frame(maxWidth: .infinity, alignment: .center)
            } else {
                ForEach(sharedSplits) { split in
                    NavigationLink {
                        SplitDetailView(
                            restaurantName: split.restaurantName,
                            totalAmount: split.totalAmount,
                            date: split.date,
                            lineItems: split.lineItems,
                            fees: split.fees,
                            taxAmount: split.taxAmount,
                            tipAmount: split.tipAmount,
                            guests: split.guests,
                            settled: split.settled,
                            splitId: split.id,
                            shareToken: split.shareToken
                        )
                    } label: {
                        sharedSplitRow(split)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func sharedSplitRow(_ split: SplitSession) -> some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(split.restaurantName ?? "Split")
                        .font(.body)
                        .foregroundStyle(Color("PrimaryText"))
                    Text(split.date, format: .dateTime.month(.abbreviated).day().year())
                        .font(.caption)
                        .foregroundStyle(Color("SecondaryText"))
                }

                Spacer()

                Text(split.totalAmount, format: .currency(code: "USD"))
                    .font(.body)
                    .monospacedDigit()
                    .foregroundStyle(Color("SecondaryText"))
            }
            .padding(.vertical, 10)

            hairlineDivider()
        }
    }

    // MARK: - Fetch

    private func fetchSharedSplits() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let db = Firestore.firestore()
            // Query splits where both users are participants
            let snapshot = try await db.collection("splits")
                .whereField("participantIds", arrayContains: currentUserId)
                .order(by: "date", descending: true)
                .limit(to: 50)
                .getDocuments()

            sharedSplits = snapshot.documents.compactMap { doc in
                guard let split = try? doc.data(as: SplitSession.self),
                      split.participantIds.contains(friend.id) else { return nil }
                return split
            }
        } catch {
            // Silent fail
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

    private func initials(for name: String) -> String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}
