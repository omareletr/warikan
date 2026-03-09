//
//  PeopleSetupView.swift
//  Warikan
//

import SwiftUI
import FirebaseFirestore

struct PeopleSetupView: View {
    var flowVM: SplitFlowViewModel
    var authViewModel: AuthViewModel

    @State private var searchText = ""
    @State private var searchResults: [AppUser] = []
    @State private var isSearching = false

    private var totalPeople: Int {
        flowVM.participants.count + flowVM.guests.count
    }

    /// The creator is always "in the split" — they need at least 1 other person.
    private var canContinue: Bool {
        totalPeople >= 2
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Color("Background").ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Search / add field
                    searchField
                        .padding(.top, 16)
                        .padding(.bottom, 16)

                    // Search results dropdown
                    if !searchResults.isEmpty {
                        searchResultsList
                            .padding(.bottom, 16)
                    }

                    // In this split section
                    if totalPeople > 0 {
                        sectionLabel("IN THIS SPLIT")
                        hairlineDivider()

                        participantsList
                    } else if !authViewModel.isGuest {
                        emptyState
                    }

                    // Import from contacts (account holders only)
                    if !authViewModel.isGuest {
                        Button {
                            // v1: placeholder — contacts import
                        } label: {
                            Text("Import from Contacts")
                                .font(.subheadline)
                                .foregroundStyle(Color("SecondaryText"))
                        }
                        .padding(.top, 16)
                    }

                    Spacer().frame(height: 120)
                }
                .padding(.horizontal, 20)
            }

            // Continue CTA
            continueCTA
        }
        .navigationTitle("Who's splitting?")
        .onAppear {
            addCreatorIfNeeded()
        }
    }

    // MARK: - Search Field

    private var searchField: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 16, weight: .light))
                .foregroundStyle(Color("TertiaryText"))

            TextField("Search friends or add a guest", text: $searchText)
                .font(.body)
                .foregroundStyle(Color("PrimaryText"))
                .autocorrectionDisabled()
                .textInputAutocapitalization(.words)
                .onChange(of: searchText) { _, newValue in
                    handleSearchChange(newValue)
                }

            if !searchText.isEmpty {
                Button {
                    addGuestFromSearch()
                } label: {
                    Text("Add")
                        .font(.subheadline)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.vermillion)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding(14)
        .background(Color("Raised"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Search Results

    private var searchResultsList: some View {
        VStack(spacing: 0) {
            ForEach(searchResults.prefix(5)) { user in
                Button {
                    addParticipant(user)
                } label: {
                    HStack(spacing: 12) {
                        // Avatar
                        Circle()
                            .fill(Color.vermillion.opacity(0.08))
                            .frame(width: 36, height: 36)
                            .overlay(
                                Text(initials(for: user.displayName))
                                    .font(.caption)
                                    .foregroundStyle(Color.vermillion)
                            )

                        VStack(alignment: .leading, spacing: 2) {
                            Text(user.displayName)
                                .font(.body)
                                .foregroundStyle(Color("PrimaryText"))
                            Text("@\(user.username)")
                                .font(.caption)
                                .foregroundStyle(Color("SecondaryText"))
                        }

                        Spacer()

                        if flowVM.participants.contains(where: { $0.id == user.id }) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 16))
                                .foregroundStyle(.green)
                        }
                    }
                    .padding(.vertical, 8)
                }
                .disabled(flowVM.participants.contains(where: { $0.id == user.id }))

                hairlineDivider()
            }
        }
        .padding(12)
        .background(Color("Surface"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Participants List

    private var participantsList: some View {
        VStack(spacing: 0) {
            // Creator row (always first, not removable)
            if let appUser = authViewModel.appUser {
                personRow(
                    name: appUser.displayName,
                    isCreator: true,
                    onRemove: nil
                )
                hairlineDivider()
            } else if authViewModel.isGuest {
                // Guest creator — show "You"
                personRow(
                    name: "You",
                    isCreator: true,
                    onRemove: nil
                )
                hairlineDivider()
            }

            // Participants (app users, removable)
            ForEach(flowVM.participants) { participant in
                // Skip the creator
                if participant.id != authViewModel.userId {
                    personRow(
                        name: participant.displayName,
                        isCreator: false,
                        onRemove: {
                            flowVM.participants.removeAll { $0.id == participant.id }
                        }
                    )
                    hairlineDivider()
                }
            }

            // Guests (removable)
            ForEach(flowVM.guests) { guest in
                personRow(
                    name: guest.name,
                    isCreator: false,
                    onRemove: {
                        flowVM.guests.removeAll { $0.id == guest.id }
                    }
                )
                hairlineDivider()
            }
        }
    }

    // MARK: - Person Row

    private func personRow(name: String, isCreator: Bool, onRemove: (() -> Void)?) -> some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color.vermillion.opacity(0.08))
                .frame(width: 44, height: 44)
                .overlay(
                    Text(initials(for: name))
                        .font(.subheadline)
                        .foregroundStyle(Color.vermillion)
                )

            VStack(alignment: .leading, spacing: 2) {
                Text(name)
                    .font(.body)
                    .foregroundStyle(Color("PrimaryText"))
                if isCreator {
                    Text("You")
                        .font(.caption)
                        .foregroundStyle(Color("SecondaryText"))
                }
            }

            Spacer()

            if let onRemove {
                Button(action: onRemove) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 20))
                        .foregroundStyle(Color("SecondaryText"))
                }
            }
        }
        .padding(.vertical, 8)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 8) {
            Text("No friends yet. Add by name or import from Contacts.")
                .font(.footnote)
                .foregroundStyle(Color("SecondaryText"))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 32)
    }

    // MARK: - Continue CTA

    private var continueCTA: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color("Separator"))
                .frame(height: 0.5)

            Button {
                flowVM.currentStep = 4
            } label: {
                Text("Continue with \(totalPeople) people")
                    .font(.body.bold())
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(canContinue ? Color.vermillion : Color.vermillion.opacity(0.4))
                    .clipShape(RoundedRectangle(cornerRadius: 32))
            }
            .disabled(!canContinue)
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

    private func addCreatorIfNeeded() {
        // Add the creator as the first participant if account holder
        if let appUser = authViewModel.appUser {
            if !flowVM.participants.contains(where: { $0.id == appUser.id }) {
                flowVM.participants.insert(appUser, at: 0)
            }
        }
    }

    private func addGuestFromSearch() {
        let name = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }

        let guest = Guest(name: name)
        flowVM.guests.append(guest)
        searchText = ""
        searchResults = []
    }

    private func addParticipant(_ user: AppUser) {
        guard !flowVM.participants.contains(where: { $0.id == user.id }) else { return }
        flowVM.participants.append(user)
        searchText = ""
        searchResults = []
    }

    private func handleSearchChange(_ query: String) {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard !trimmed.isEmpty, !authViewModel.isGuest else {
            searchResults = []
            return
        }

        isSearching = true
        Task {
            do {
                let snapshot = try await Firestore.firestore()
                    .collection("users")
                    .whereField("username", isGreaterThanOrEqualTo: trimmed)
                    .whereField("username", isLessThanOrEqualTo: trimmed + "\u{f8ff}")
                    .limit(to: 5)
                    .getDocuments()

                let users = snapshot.documents.compactMap { doc in
                    try? doc.data(as: AppUser.self)
                }.filter { user in
                    // Exclude self
                    user.id != authViewModel.userId
                }

                searchResults = users
            } catch {
                searchResults = []
            }
            isSearching = false
        }
    }
}

#Preview {
    NavigationStack {
        PeopleSetupView(
            flowVM: SplitFlowViewModel(),
            authViewModel: AuthViewModel()
        )
    }
}
