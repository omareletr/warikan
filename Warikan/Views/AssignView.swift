//
//  AssignView.swift
//  Warikan
//

import SwiftUI

struct AssignView: View {
    var flowVM: SplitFlowViewModel

    @State private var selectedPersonId: String?
    @State private var showCTA = false

    /// All people in the split (participants + guests).
    private var allPeople: [(id: String, name: String)] {
        let participantPeople = flowVM.participants.map { (id: $0.id, name: $0.displayName) }
        let guestPeople = flowVM.guests.map { (id: $0.id, name: $0.name) }
        return participantPeople + guestPeople
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Color("Background").ignoresSafeArea()

            VStack(spacing: 0) {
                // Person avatar strip
                avatarStrip
                    .padding(.top, 8)

                hairlineDivider()

                // Dish list
                ScrollView {
                    VStack(spacing: 0) {
                        ForEach(Array(flowVM.lineItems.enumerated()), id: \.element.id) { index, item in
                            dishRow(item: item, index: index)
                        }
                    }
                    .padding(.horizontal, 20)
                    .padding(.bottom, 120)
                }
            }

            // Continue CTA — slides in when all assigned
            if flowVM.allAssigned {
                continueCTA
                    .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .navigationTitle("Assign Dishes")
        .animation(.spring(duration: 0.4), value: flowVM.allAssigned)
        .sensoryFeedback(.impact(weight: .medium), trigger: flowVM.allAssigned)
        .onAppear {
            // Auto-select the first person
            if selectedPersonId == nil, let first = allPeople.first {
                selectedPersonId = first.id
            }
        }
    }

    // MARK: - Avatar Strip

    private var avatarStrip: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 16) {
                ForEach(allPeople, id: \.id) { person in
                    let isSelected = selectedPersonId == person.id
                    let personTotal = flowVM.shareFor(personId: person.id)

                    Button {
                        selectedPersonId = person.id
                    } label: {
                        VStack(spacing: 4) {
                            Circle()
                                .fill(Color.vermillion.opacity(0.08))
                                .frame(width: 44, height: 44)
                                .overlay(
                                    Text(initials(for: person.name))
                                        .font(.subheadline)
                                        .foregroundStyle(Color.vermillion)
                                )
                                .overlay(
                                    Circle()
                                        .stroke(Color.vermillion, lineWidth: isSelected ? 2 : 0)
                                )
                                .scaleEffect(isSelected ? 1.05 : 1.0)
                                .animation(.spring(response: 0.2, dampingFraction: 0.7), value: isSelected)

                            Text(firstName(for: person.name))
                                .font(.caption)
                                .foregroundStyle(Color("SecondaryText"))
                                .lineLimit(1)

                            Text(personTotal, format: .currency(code: "USD"))
                                .font(.caption)
                                .monospacedDigit()
                                .foregroundStyle(Color.vermillion)
                                .contentTransition(.numericText())
                                .animation(.spring(duration: 0.25), value: personTotal)
                        }
                    }
                    .sensoryFeedback(.selection, trigger: selectedPersonId)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
        }
    }

    // MARK: - Dish Row

    private func dishRow(item: LineItem, index: Int) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                // Vermillion left border if assigned
                if !item.assignedToIds.isEmpty {
                    Rectangle()
                        .fill(Color.vermillion)
                        .frame(width: 1.5)
                        .padding(.trailing, 12)
                        .transition(.opacity)
                }

                // Dish info
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(item.name.isEmpty ? "Item" : item.name)
                            .font(.body)
                            .foregroundStyle(Color("PrimaryText"))

                        Spacer()

                        Text(item.price, format: .currency(code: "USD"))
                            .font(.body)
                            .monospacedDigit()
                            .foregroundStyle(Color("PrimaryText"))
                    }

                    // Assigned initials badges
                    if !item.assignedToIds.isEmpty {
                        HStack(spacing: -8) {
                            ForEach(item.assignedToIds, id: \.self) { personId in
                                if let person = allPeople.first(where: { $0.id == personId }) {
                                    Circle()
                                        .fill(Color.vermillion.opacity(0.08))
                                        .frame(width: 28, height: 28)
                                        .overlay(
                                            Text(initials(for: person.name))
                                                .font(.system(size: 10))
                                                .foregroundStyle(Color.vermillion)
                                        )
                                        .overlay(
                                            Circle()
                                                .stroke(Color("Background"), lineWidth: 1.5)
                                        )
                                        .transition(.scale.combined(with: .opacity))
                                }
                            }

                            if item.assignedToIds.count > 1 {
                                Text("÷\(item.assignedToIds.count)")
                                    .font(.caption)
                                    .foregroundStyle(Color("SecondaryText"))
                                    .padding(.leading, 12)
                            }
                        }
                    }
                }
            }
            .contentShape(Rectangle())
            .onTapGesture {
                toggleAssignment(at: index)
            }
            .padding(.vertical, 12)
            .animation(.easeOut(duration: 0.2), value: item.assignedToIds)

            hairlineDivider()
        }
        .swipeActions(edge: .trailing) {
            Button {
                assignToAll(at: index)
            } label: {
                Label("All", systemImage: "person.2")
            }
            .tint(Color("SecondaryText"))
        }
    }

    // MARK: - Continue CTA

    private var continueCTA: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color("Separator"))
                .frame(height: 0.5)

            Button {
                flowVM.currentStep = 5
            } label: {
                Text("Continue")
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

    // MARK: - Actions

    private func toggleAssignment(at index: Int) {
        guard let personId = selectedPersonId,
              flowVM.lineItems.indices.contains(index) else { return }

        if flowVM.lineItems[index].assignedToIds.contains(personId) {
            // Remove assignment
            flowVM.lineItems[index].assignedToIds.removeAll { $0 == personId }
        } else {
            // Add assignment
            flowVM.lineItems[index].assignedToIds.append(personId)
        }
    }

    private func assignToAll(at index: Int) {
        guard flowVM.lineItems.indices.contains(index) else { return }
        flowVM.lineItems[index].assignedToIds = allPeople.map(\.id)
    }

    // MARK: - Helpers

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

    private func firstName(for name: String) -> String {
        String(name.split(separator: " ").first ?? Substring(name))
    }
}

#Preview {
    NavigationStack {
        AssignView(flowVM: {
            let vm = SplitFlowViewModel()
            vm.lineItems = [
                LineItem(name: "Salmon Roll", price: 14.50),
                LineItem(name: "Ramen", price: 16.00),
                LineItem(name: "Edamame", price: 6.50),
            ]
            vm.guests = [
                Guest(name: "Omar"),
                Guest(name: "Sarah"),
            ]
            return vm
        }())
    }
}
