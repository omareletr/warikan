//
//  ProfileView.swift
//  Warikan
//

import SwiftUI
import FirebaseFirestore

struct ProfileView: View {
    var authViewModel: AuthViewModel

    @State private var displayName: String = ""
    @State private var username: String = ""
    @State private var venmoHandle: String = ""
    @State private var cashAppCashtag: String = ""
    @State private var paypalUsername: String = ""
    @State private var zelleContact: String = ""
    @State private var isSaving = false
    @State private var showSignOutAlert = false
    @State private var hasUnsavedChanges = false

    private var user: AppUser? { authViewModel.appUser }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Profile header
                    profileHeader
                        .padding(.top, 16)
                        .padding(.bottom, 32)

                    // Account info
                    sectionLabel("ACCOUNT")
                    hairlineDivider()

                    editableRow("Display Name", text: $displayName)
                    editableRow("Username", text: $username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    if let email = authViewModel.userEmail {
                        staticRow("Email", value: email)
                    }

                    Spacer().frame(height: 24)

                    // Payment handles
                    sectionLabel("PAYMENT HANDLES")
                    hairlineDivider()

                    editableRow("Venmo", text: $venmoHandle, placeholder: "@username")
                    editableRow("Cash App ($)", text: $cashAppCashtag, placeholder: "cashtag")
                        .textInputAutocapitalization(.never)
                    editableRow("PayPal", text: $paypalUsername, placeholder: "username")
                        .textInputAutocapitalization(.never)
                    editableRow("Zelle", text: $zelleContact, placeholder: "email or phone")
                        .textInputAutocapitalization(.never)

                    Spacer().frame(height: 24)

                    // Friends
                    sectionLabel("SOCIAL")
                    hairlineDivider()

                    NavigationLink {
                        FriendsView(authViewModel: authViewModel)
                    } label: {
                        HStack {
                            Text("Friends")
                                .font(.body)
                                .foregroundStyle(Color("PrimaryText"))
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.system(size: 12, weight: .light))
                                .foregroundStyle(Color("TertiaryText"))
                        }
                        .padding(.vertical, 14)
                    }
                    hairlineDivider()

                    Spacer().frame(height: 40)

                    // Sign out
                    Button {
                        showSignOutAlert = true
                    } label: {
                        Text("Sign Out")
                            .font(.body)
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                    }
                }
                .padding(.horizontal, 20)
            }
            .background(Color("Background"))
            .navigationTitle("Profile")
            .toolbar {
                if hasUnsavedChanges {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button {
                            Task { await saveProfile() }
                        } label: {
                            if isSaving {
                                ProgressView()
                            } else {
                                Text("Save")
                                    .font(.body.bold())
                                    .foregroundStyle(Color.vermillion)
                            }
                        }
                        .disabled(isSaving)
                    }
                }
            }
            .alert("Sign Out", isPresented: $showSignOutAlert) {
                Button("Cancel", role: .cancel) {}
                Button("Sign Out", role: .destructive) {
                    try? authViewModel.signOut()
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
            .onAppear { loadUserData() }
            .onChange(of: displayName) { _, _ in checkForChanges() }
            .onChange(of: username) { _, _ in checkForChanges() }
            .onChange(of: venmoHandle) { _, _ in checkForChanges() }
            .onChange(of: cashAppCashtag) { _, _ in checkForChanges() }
            .onChange(of: paypalUsername) { _, _ in checkForChanges() }
            .onChange(of: zelleContact) { _, _ in checkForChanges() }
        }
    }

    // MARK: - Profile Header

    private var profileHeader: some View {
        HStack(spacing: 16) {
            Circle()
                .fill(Color.vermillion.opacity(0.08))
                .frame(width: 64, height: 64)
                .overlay(
                    Text(initials(for: user?.displayName ?? ""))
                        .font(.title2)
                        .foregroundStyle(Color.vermillion)
                )

            VStack(alignment: .leading, spacing: 4) {
                Text(user?.displayName ?? "")
                    .font(.title3)
                    .foregroundStyle(Color("PrimaryText"))

                Text("@\(user?.username ?? "")")
                    .font(.subheadline)
                    .foregroundStyle(Color("SecondaryText"))
            }

            Spacer()
        }
    }

    // MARK: - Rows

    private func editableRow(_ label: String, text: Binding<String>, placeholder: String = "") -> some View {
        VStack(spacing: 0) {
            HStack {
                Text(label)
                    .font(.body)
                    .foregroundStyle(Color("PrimaryText"))
                    .frame(width: 110, alignment: .leading)

                TextField(placeholder.isEmpty ? label : placeholder, text: text)
                    .font(.body)
                    .foregroundStyle(Color("PrimaryText"))
                    .multilineTextAlignment(.trailing)
            }
            .padding(.vertical, 12)

            hairlineDivider()
        }
    }

    private func staticRow(_ label: String, value: String) -> some View {
        VStack(spacing: 0) {
            HStack {
                Text(label)
                    .font(.body)
                    .foregroundStyle(Color("PrimaryText"))
                    .frame(width: 110, alignment: .leading)

                Spacer()

                Text(value)
                    .font(.body)
                    .foregroundStyle(Color("SecondaryText"))
            }
            .padding(.vertical, 12)

            hairlineDivider()
        }
    }

    // MARK: - Logic

    private func loadUserData() {
        guard let user else { return }
        displayName = user.displayName
        username = user.username
        venmoHandle = user.venmoHandle ?? ""
        cashAppCashtag = user.cashAppCashtag ?? ""
        paypalUsername = user.paypalUsername ?? ""
        zelleContact = user.zelleContact ?? ""
    }

    private func checkForChanges() {
        guard let user else { return }
        hasUnsavedChanges = (
            displayName != user.displayName ||
            username != user.username ||
            venmoHandle != (user.venmoHandle ?? "") ||
            cashAppCashtag != (user.cashAppCashtag ?? "") ||
            paypalUsername != (user.paypalUsername ?? "") ||
            zelleContact != (user.zelleContact ?? "")
        )
    }

    private func saveProfile() async {
        guard let userId = authViewModel.userId else { return }
        isSaving = true
        defer { isSaving = false }

        let db = Firestore.firestore()
        let trimmedUsername = username.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()

        // Determine preferred payment method
        var preferred: String? = authViewModel.appUser?.preferredPaymentMethod
        if preferred == nil {
            if !venmoHandle.isEmpty { preferred = "venmo" }
            else if !cashAppCashtag.isEmpty { preferred = "cashapp" }
            else if !paypalUsername.isEmpty { preferred = "paypal" }
            else if !zelleContact.isEmpty { preferred = "zelle" }
        }

        do {
            // Check username change
            let oldUsername = authViewModel.appUser?.username ?? ""
            if trimmedUsername != oldUsername {
                // Check uniqueness
                let existing = try await db.collection("usernames").document(trimmedUsername).getDocument()
                if existing.exists, let data = existing.data(), data["uid"] as? String != userId {
                    // Username taken — silently revert (could show error)
                    return
                }

                // Batch: update user doc + username doc
                let batch = db.batch()

                let userRef = db.collection("users").document(userId)
                batch.updateData([
                    "displayName": displayName,
                    "username": trimmedUsername,
                    "venmoHandle": venmoHandle.isEmpty ? NSNull() : venmoHandle,
                    "cashAppCashtag": cashAppCashtag.isEmpty ? NSNull() : cashAppCashtag,
                    "paypalUsername": paypalUsername.isEmpty ? NSNull() : paypalUsername,
                    "zelleContact": zelleContact.isEmpty ? NSNull() : zelleContact,
                    "preferredPaymentMethod": preferred as Any
                ], forDocument: userRef)

                // Delete old username doc
                if !oldUsername.isEmpty {
                    batch.deleteDocument(db.collection("usernames").document(oldUsername))
                }
                // Create new username doc
                batch.setData(["uid": userId], forDocument: db.collection("usernames").document(trimmedUsername))

                try await batch.commit()
            } else {
                // No username change — just update user doc
                try await db.collection("users").document(userId).updateData([
                    "displayName": displayName,
                    "venmoHandle": venmoHandle.isEmpty ? NSNull() : venmoHandle,
                    "cashAppCashtag": cashAppCashtag.isEmpty ? NSNull() : cashAppCashtag,
                    "paypalUsername": paypalUsername.isEmpty ? NSNull() : paypalUsername,
                    "zelleContact": zelleContact.isEmpty ? NSNull() : zelleContact,
                    "preferredPaymentMethod": preferred as Any
                ])
            }

            // Update local appUser
            authViewModel.appUser?.displayName = displayName
            authViewModel.appUser?.username = trimmedUsername
            authViewModel.appUser?.venmoHandle = venmoHandle.isEmpty ? nil : venmoHandle
            authViewModel.appUser?.cashAppCashtag = cashAppCashtag.isEmpty ? nil : cashAppCashtag
            authViewModel.appUser?.paypalUsername = paypalUsername.isEmpty ? nil : paypalUsername
            authViewModel.appUser?.zelleContact = zelleContact.isEmpty ? nil : zelleContact
            authViewModel.appUser?.preferredPaymentMethod = preferred

            hasUnsavedChanges = false
        } catch {
            // Could show error banner
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
