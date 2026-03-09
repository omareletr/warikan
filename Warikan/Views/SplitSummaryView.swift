//
//  SplitSummaryView.swift
//  Warikan
//

import SwiftUI

struct SplitSummaryView: View {
    var flowVM: SplitFlowViewModel
    var authViewModel: AuthViewModel

    @State private var expandedPersonId: String?

    /// All people in the split.
    private var allPeople: [(id: String, name: String)] {
        let participantPeople = flowVM.participants.map { (id: $0.id, name: $0.displayName) }
        let guestPeople = flowVM.guests.map { (id: $0.id, name: $0.name) }
        return participantPeople + guestPeople
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Color("Background").ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Header block
                    headerBlock
                        .padding(.top, 16)

                    Spacer().frame(height: 24)

                    // Each person owes
                    sectionLabel("EACH PERSON OWES")
                    hairlineDivider()

                    ForEach(allPeople, id: \.id) { person in
                        participantRow(person: person)
                    }

                    Spacer().frame(height: 24)

                    // Share links (account holders only)
                    if !authViewModel.isGuest {
                        shareLinksSection
                    }

                    Spacer().frame(height: 120)
                }
                .padding(.horizontal, 20)
            }

            // Send Requests CTA
            sendRequestsCTA
        }
        .navigationTitle("Summary")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    // Export as photo — placeholder
                } label: {
                    Image(systemName: "square.and.arrow.up")
                        .font(.system(size: 16, weight: .thin))
                        .foregroundStyle(Color("SecondaryText"))
                }
            }
        }
    }

    // MARK: - Header Block

    private var headerBlock: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(flowVM.restaurantName ?? "Your Split")
                .font(.displayMedium)
                .foregroundStyle(Color("PrimaryText"))

            Text(flowVM.grandTotal, format: .currency(code: "USD"))
                .font(.displayLarge)
                .monospacedDigit()
                .foregroundStyle(Color.vermillion)

            Spacer().frame(height: 4)

            HStack(spacing: 8) {
                Text("\(allPeople.count) people")
                    .font(.footnote)
                    .foregroundStyle(Color("SecondaryText"))

                Text("·")
                    .font(.footnote)
                    .foregroundStyle(Color("SecondaryText"))

                Text(Date(), format: .dateTime.month(.abbreviated).day().year())
                    .font(.footnote)
                    .foregroundStyle(Color("SecondaryText"))
            }
        }
    }

    // MARK: - Participant Row

    private func participantRow(person: (id: String, name: String)) -> some View {
        let share = flowVM.shareFor(personId: person.id)
        let isExpanded = expandedPersonId == person.id
        let assignedItems = flowVM.lineItems.filter { $0.assignedToIds.contains(person.id) }

        return VStack(spacing: 0) {
            // Collapsed row
            Button {
                withAnimation(.spring(duration: 0.3)) {
                    expandedPersonId = isExpanded ? nil : person.id
                }
            } label: {
                HStack(spacing: 12) {
                    // Avatar
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

            // Expanded breakdown
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

                    // Tax/tip/fee proration
                    let personSubtotal = assignedItems.reduce(0.0) { total, item in
                        total + item.price / Double(max(item.assignedToIds.count, 1))
                    }
                    let ratio = flowVM.subtotal > 0 ? personSubtotal / flowVM.subtotal : 0

                    if flowVM.taxAmount > 0 {
                        prorationRow("Tax", flowVM.taxAmount * ratio)
                    }
                    if flowVM.tipAmount > 0 {
                        prorationRow("Tip", flowVM.tipAmount * ratio)
                    }
                    if flowVM.feesTotal > 0 {
                        prorationRow("Fees", flowVM.feesTotal * ratio)
                    }
                }
                .padding(.leading, 56)
                .padding(.bottom, 12)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }

            hairlineDivider()
        }
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

    // MARK: - Share Links Section

    private var shareLinksSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionLabel("SHARE WITH EACH PERSON")
            hairlineDivider()

            ForEach(allPeople, id: \.id) { person in
                // Skip creator
                if person.id != authViewModel.userId {
                    HStack(spacing: 12) {
                        Circle()
                            .fill(Color.vermillion.opacity(0.08))
                            .frame(width: 32, height: 32)
                            .overlay(
                                Text(initials(for: person.name))
                                    .font(.caption)
                                    .foregroundStyle(Color.vermillion)
                            )

                        Text(person.name)
                            .font(.body)
                            .foregroundStyle(Color("PrimaryText"))

                        Spacer()

                        ShareLink(
                            item: URL(string: "warikan://split/\(flowVM.splitId)?token=\(flowVM.shareToken)&participant=\(person.id)")!
                        ) {
                            Image(systemName: "square.and.arrow.up")
                                .font(.system(size: 16))
                                .foregroundStyle(Color.vermillion)
                        }
                    }
                    .padding(.vertical, 8)

                    hairlineDivider()
                }
            }

            // Share all ghost link
            Button {
                // Share all at once — placeholder
            } label: {
                Text("Share all at once")
                    .font(.subheadline)
                    .foregroundStyle(Color("SecondaryText"))
            }
            .padding(.top, 12)
        }
    }

    // MARK: - Send Requests CTA

    private var sendRequestsCTA: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color("Separator"))
                .frame(height: 0.5)

            Button {
                flowVM.currentStep = 6
            } label: {
                Text("Send Requests →")
                    .font(.body.bold())
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(Color.vermillion)
                    .clipShape(RoundedRectangle(cornerRadius: 32))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
        }
        .background(Color("Background"))
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

#Preview {
    NavigationStack {
        SplitSummaryView(
            flowVM: {
                let vm = SplitFlowViewModel()
                vm.restaurantName = "Nobu"
                vm.lineItems = [
                    LineItem(name: "Salmon Roll", price: 14.50, assignedToIds: ["1"]),
                    LineItem(name: "Ramen", price: 16.00, assignedToIds: ["2"]),
                    LineItem(name: "Edamame", price: 6.50, assignedToIds: ["1", "2"]),
                ]
                vm.taxAmount = 3.70
                vm.tipAmount = 7.40
                vm.guests = [
                    Guest(id: "1", name: "Omar"),
                    Guest(id: "2", name: "Sarah"),
                ]
                return vm
            }(),
            authViewModel: AuthViewModel()
        )
    }
}
