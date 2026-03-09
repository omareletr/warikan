//
//  FriendsView.swift
//  Warikan
//

import SwiftUI

struct FriendsView: View {
    var authViewModel: AuthViewModel
    @State private var viewModel = FriendsViewModel()
    @State private var isSearchFocused = false

    private var userId: String {
        authViewModel.userId ?? ""
    }

    var body: some View {
        ZStack {
            Color("Background").ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Search bar
                    searchBar
                        .padding(.top, 8)
                        .padding(.bottom, 16)

                    // Search results
                    if !viewModel.searchText.isEmpty {
                        searchResultsSection
                    } else {
                        // Pending requests
                        if !viewModel.pendingRequests.isEmpty {
                            pendingRequestsSection
                                .padding(.bottom, 24)
                        }

                        // Friends list
                        friendsListSection
                    }
                }
                .padding(.horizontal, 20)
            }
        }
        .navigationTitle("Friends")
        .task {
            await viewModel.fetchFriends(userId: userId)
            await viewModel.fetchPendingRequests(userId: userId)
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 14))
                .foregroundStyle(Color("TertiaryText"))

            TextField("Search by username", text: $viewModel.searchText)
                .font(.body)
                .foregroundStyle(Color("PrimaryText"))
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
        }
        .padding(12)
        .background(Color("Raised"))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .onChange(of: viewModel.searchText) { _, newValue in
            Task {
                await viewModel.searchUsers(query: newValue, currentUserId: userId)
            }
        }
    }

    // MARK: - Search Results

    private var searchResultsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionLabel("RESULTS")

            if viewModel.isSearching {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .padding(.vertical, 24)
            } else if viewModel.searchResults.isEmpty && viewModel.searchText.count >= 2 {
                Text("No users found.")
                    .font(.body)
                    .foregroundStyle(Color("SecondaryText"))
                    .padding(.vertical, 24)
            } else {
                ForEach(viewModel.searchResults) { user in
                    searchResultRow(user)
                }
            }
        }
    }

    private func searchResultRow(_ user: AppUser) -> some View {
        let isFriend = viewModel.friends.contains { $0.id == user.id }

        return VStack(spacing: 0) {
            HStack(spacing: 12) {
                Circle()
                    .fill(Color.vermillion.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Text(initials(for: user.displayName))
                            .font(.subheadline)
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

                if isFriend {
                    Text("Friends")
                        .font(.caption)
                        .foregroundStyle(Color("TertiaryText"))
                } else {
                    Button {
                        Task {
                            await viewModel.sendFriendRequest(
                                from: (id: userId, displayName: authViewModel.firstName ?? ""),
                                to: user.id
                            )
                        }
                    } label: {
                        Text("Add")
                            .font(.subheadline.bold())
                            .foregroundStyle(Color.vermillion)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 6)
                            .overlay(
                                RoundedRectangle(cornerRadius: 20)
                                    .stroke(Color.vermillion, lineWidth: 1)
                            )
                    }
                }
            }
            .padding(.vertical, 10)

            hairlineDivider()
        }
    }

    // MARK: - Pending Requests

    private var pendingRequestsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionLabel("PENDING REQUESTS")
            hairlineDivider()

            ForEach(viewModel.pendingRequests) { request in
                VStack(spacing: 0) {
                    HStack(spacing: 12) {
                        Circle()
                            .fill(Color.vermillion.opacity(0.08))
                            .frame(width: 44, height: 44)
                            .overlay(
                                Text(initials(for: request.fromDisplayName))
                                    .font(.subheadline)
                                    .foregroundStyle(Color.vermillion)
                            )

                        Text(request.fromDisplayName)
                            .font(.body)
                            .foregroundStyle(Color("PrimaryText"))

                        Spacer()

                        Button {
                            Task { await viewModel.acceptRequest(request, currentUserId: userId) }
                        } label: {
                            Text("Accept")
                                .font(.subheadline.bold())
                                .foregroundStyle(.white)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 6)
                                .background(Color.vermillion)
                                .clipShape(RoundedRectangle(cornerRadius: 20))
                        }

                        Button {
                            Task { await viewModel.declineRequest(request, currentUserId: userId) }
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 12, weight: .light))
                                .foregroundStyle(Color("TertiaryText"))
                        }
                    }
                    .padding(.vertical, 10)

                    hairlineDivider()
                }
            }
        }
    }

    // MARK: - Friends List

    private var friendsListSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            sectionLabel("YOUR FRIENDS")
            hairlineDivider()

            if viewModel.isLoading {
                ForEach(0..<3, id: \.self) { _ in
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color("Raised"))
                        .frame(height: 56)
                        .shimmering()
                        .padding(.vertical, 4)
                }
            } else if viewModel.friends.isEmpty {
                VStack(spacing: 8) {
                    Text("No friends yet.")
                        .font(.body)
                        .foregroundStyle(Color("PrimaryText"))
                    Text("Search by username to add friends.")
                        .font(.subheadline)
                        .foregroundStyle(Color("SecondaryText"))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 32)
            } else {
                ForEach(viewModel.friends) { friend in
                    NavigationLink {
                        FriendProfileView(
                            friend: friend,
                            currentUserId: userId
                        )
                    } label: {
                        friendRow(friend)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func friendRow(_ user: AppUser) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Circle()
                    .fill(Color.vermillion.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Text(initials(for: user.displayName))
                            .font(.subheadline)
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

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .light))
                    .foregroundStyle(Color("TertiaryText"))
            }
            .padding(.vertical, 10)

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

    private func initials(for name: String) -> String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}
