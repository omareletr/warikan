//
//  HomeView.swift
//  Warikan
//

import SwiftUI
import SwiftData

struct HomeView: View {
    var authViewModel: AuthViewModel
    @State var homeViewModel = HomeViewModel()

    @Query(sort: \LocalSplitSession.date, order: .reverse)
    private var localSplits: [LocalSplitSession]

    @State private var showSplitFlow = false

    // MARK: - Guest computed splits

    private var guestRecentSplits: [LocalSplitSession] {
        localSplits.filter { !$0.settled }
    }

    private var guestPastSplits: [LocalSplitSession] {
        localSplits.filter { $0.settled }
    }

    // MARK: - Account computed values

    private var owedAmount: Double {
        guard let userId = authViewModel.currentUser?.uid else { return 0 }
        return homeViewModel.amountOwed(userId: userId)
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            Color("Background")
                .ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    greetingSection
                    if authViewModel.isGuest {
                        guestSplitsList
                    } else {
                        accountSplitsList
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 80)
            }

            floatingAddButton
        }
        .task {
            guard !authViewModel.isGuest,
                  let userId = authViewModel.currentUser?.uid else { return }
            await homeViewModel.fetchSplits(for: userId)
        }
    }

    // MARK: - Greeting

    @ViewBuilder
    private var greetingSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            if authViewModel.isGuest {
                Text("Hey there.")
                    .font(.displayMedium)
                    .foregroundStyle(Color("PrimaryText"))

                Text("Splits you create are saved on this device.")
                    .font(.body)
                    .foregroundStyle(Color("SecondaryText"))
            } else if let firstName = authViewModel.firstName {
                Text("Hey, \(firstName).")
                    .font(.displayMedium)
                    .foregroundStyle(Color("PrimaryText"))

                if owedAmount > 0 {
                    HStack(spacing: 0) {
                        Text("You're owed ")
                            .font(.body)
                            .foregroundStyle(Color("SecondaryText"))
                        Text(owedAmount, format: .currency(code: "USD"))
                            .font(.body)
                            .monospacedDigit()
                            .foregroundStyle(Color.vermillion)
                    }
                }
            } else {
                Text("Hey there.")
                    .font(.displayMedium)
                    .foregroundStyle(Color("PrimaryText"))
            }
        }
        .padding(.top, 24)
        .padding(.bottom, 24)
    }

    // MARK: - Guest Splits List

    @ViewBuilder
    private var guestSplitsList: some View {
        if localSplits.isEmpty {
            emptyState
        } else {
            if !guestRecentSplits.isEmpty {
                sectionHeader("Recent")
                ForEach(guestRecentSplits) { split in
                    SplitRow(
                        restaurantName: split.restaurantName,
                        totalAmount: split.totalAmount,
                        date: split.date,
                        peopleCount: split.participantIds.count + split.guests.count,
                        settled: split.settled,
                        isMuted: false
                    )
                }
            }
            if !guestPastSplits.isEmpty {
                sectionHeader("Past")
                    .padding(.top, guestRecentSplits.isEmpty ? 0 : 24)
                ForEach(guestPastSplits) { split in
                    SplitRow(
                        restaurantName: split.restaurantName,
                        totalAmount: split.totalAmount,
                        date: split.date,
                        peopleCount: split.participantIds.count + split.guests.count,
                        settled: split.settled,
                        isMuted: true
                    )
                }
            }
        }
    }

    // MARK: - Account Splits List

    @ViewBuilder
    private var accountSplitsList: some View {
        if homeViewModel.isLoading {
            skeletonRows
        } else if homeViewModel.splits.isEmpty {
            emptyState
        } else {
            if !homeViewModel.recentSplits.isEmpty {
                sectionHeader("Recent")
                ForEach(homeViewModel.recentSplits) { split in
                    SplitRow(
                        restaurantName: split.restaurantName,
                        totalAmount: split.totalAmount,
                        date: split.date,
                        peopleCount: split.participantIds.count + split.guests.count,
                        settled: split.settled,
                        isMuted: false
                    )
                }
            }
            if !homeViewModel.pastSplits.isEmpty {
                sectionHeader("Past")
                    .padding(.top, homeViewModel.recentSplits.isEmpty ? 0 : 24)
                ForEach(homeViewModel.pastSplits) { split in
                    SplitRow(
                        restaurantName: split.restaurantName,
                        totalAmount: split.totalAmount,
                        date: split.date,
                        peopleCount: split.participantIds.count + split.guests.count,
                        settled: split.settled,
                        isMuted: true
                    )
                }
            }
        }
    }

    // MARK: - Skeleton Loading

    private var skeletonRows: some View {
        VStack(spacing: 12) {
            sectionHeader("Recent")
            ForEach(0..<3, id: \.self) { _ in
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color("Raised"))
                    .frame(height: 72)
                    .shimmering()
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "fork.knife")
                .font(.system(size: 32, weight: .thin))
                .foregroundStyle(Color.vermillion)

            Text("Your first split starts here.")
                .font(.title3)
                .foregroundStyle(Color("PrimaryText"))

            Text("Scan a receipt and stop doing math in your head.")
                .font(.body.weight(.light))
                .foregroundStyle(Color("SecondaryText"))
                .multilineTextAlignment(.center)

            Button {
                showSplitFlow = true
            } label: {
                Text("Scan a Receipt")
                    .font(.body.bold())
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(Color.vermillion)
                    .clipShape(RoundedRectangle(cornerRadius: 32))
            }
            .padding(.top, 8)
        }
        .padding(.top, 48)
        .padding(.horizontal, 20)
    }

    // MARK: - Section Header

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.caption)
            .foregroundStyle(Color("SecondaryText"))
            .textCase(.uppercase)
            .kerning(1.5)
            .padding(.bottom, 8)
    }

    // MARK: - Floating Add Button

    private var floatingAddButton: some View {
        Button {
            showSplitFlow = true
        } label: {
            Image(systemName: "plus")
                .font(.title2.weight(.light))
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(Color.vermillion)
                .clipShape(Circle())
        }
        .padding(.trailing, 20)
        .padding(.bottom, 20)
    }
}

// MARK: - Split Row

struct SplitRow: View {
    let restaurantName: String?
    let totalAmount: Double
    let date: Date
    let peopleCount: Int
    let settled: Bool
    let isMuted: Bool

    private var displayName: String {
        restaurantName ?? "Split"
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        if !isMuted {
                            Circle()
                                .fill(settled ? Color.green : Color.orange)
                                .frame(width: 6, height: 6)
                        }
                        Text(displayName)
                            .font(.body)
                            .foregroundStyle(isMuted ? Color("SecondaryText") : Color("PrimaryText"))
                    }

                    HStack {
                        Text(date, format: .dateTime.month(.abbreviated).day().year())
                            .font(.caption)
                            .foregroundStyle(Color("SecondaryText"))
                        Spacer()
                        Text("\(peopleCount) people")
                            .font(.caption)
                            .foregroundStyle(Color("SecondaryText"))
                    }
                }

                Spacer()

                Text(totalAmount, format: .currency(code: "USD"))
                    .font(.body)
                    .monospacedDigit()
                    .foregroundStyle(isMuted ? Color("TertiaryText") : Color("SecondaryText"))
            }
            .padding(.vertical, 12)

            Rectangle()
                .fill(Color("Separator"))
                .frame(height: 0.5)
                .padding(.leading, 20)
        }
    }
}

#Preview {
    HomeView(authViewModel: AuthViewModel())
        .modelContainer(for: LocalSplitSession.self, inMemory: true)
}
