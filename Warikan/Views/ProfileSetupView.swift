//
//  ProfileSetupView.swift
//  Warikan
//

import SwiftUI

struct ProfileSetupView: View {
    var authViewModel: AuthViewModel
    var onComplete: () -> Void

    @State private var viewModel = ProfileSetupViewModel()
    @State private var displayName = ""
    @State private var username = ""
    @State private var venmoHandle = ""
    @State private var cashAppCashtag = ""
    @State private var paypalUsername = ""
    @State private var zelleContact = ""

    private var isUsernameValid: Bool {
        let pattern = /^[a-z0-9][a-z0-9_-]{1,18}[a-z0-9]$/
        return username.wholeMatch(of: pattern) != nil
    }

    private var canContinue: Bool {
        !displayName.isEmpty && isUsernameValid && viewModel.usernameAvailable == true
    }

    var body: some View {
        ZStack {
            Color("Background").ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Spacer().frame(height: 32)

                    Text("Set up your profile")
                        .font(.title3)
                        .foregroundStyle(Color("PrimaryText"))
                        .frame(maxWidth: .infinity)
                        .multilineTextAlignment(.center)
                        .padding(.bottom, 32)

                    // Display name
                    fieldLabel("YOUR NAME")
                    TextField("How should we call you?", text: $displayName)
                        .textContentType(.name)
                        .inputFieldStyle()
                        .padding(.bottom, 16)

                    // Username
                    fieldLabel("USERNAME")
                    HStack(spacing: 8) {
                        TextField("e.g. omar", text: $username)
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                            .inputFieldStyle()
                            .onChange(of: username) { _, newValue in
                                username = newValue.lowercased()
                                viewModel.checkUsername(username, isValid: isUsernameValid)
                            }

                        if viewModel.isCheckingUsername {
                            ProgressView()
                                .frame(width: 24, height: 24)
                        } else if let available = viewModel.usernameAvailable {
                            Image(systemName: available ? "checkmark.circle" : "xmark.circle")
                                .foregroundStyle(available ? .green : .red)
                                .font(.system(size: 20))
                        }
                    }

                    Text("3–20 characters · lowercase · letters, numbers, _ and - only")
                        .font(.caption)
                        .foregroundStyle(Color("TertiaryText"))
                        .padding(.top, 4)
                        .padding(.bottom, 24)

                    // Payment handles
                    HStack {
                        fieldLabel("PAYMENT HANDLES")
                        Spacer()
                        Text("Skip for now")
                            .font(.subheadline)
                            .foregroundStyle(Color("SecondaryText"))
                    }
                    .padding(.bottom, 12)

                    paymentField(label: "Venmo", text: $venmoHandle)
                    paymentField(label: "Cash App ($)", text: $cashAppCashtag)
                    paymentField(label: "PayPal", text: $paypalUsername)
                    paymentField(label: "Zelle", text: $zelleContact)

                    if let error = viewModel.errorMessage {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .padding(.top, 12)
                    }

                    Spacer().frame(height: 32)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 80)
            }

            // Pinned CTA
            VStack {
                Spacer()
                Button {
                    Task { await save() }
                } label: {
                    Group {
                        if viewModel.isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Text("Continue →")
                        }
                    }
                    .font(.body.bold())
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(canContinue ? Color.vermillion : Color.vermillion.opacity(0.4))
                    .clipShape(RoundedRectangle(cornerRadius: 32))
                }
                .disabled(!canContinue || viewModel.isLoading)
                .padding(.horizontal, 20)
                .padding(.bottom, 8)
            }
        }
        .interactiveDismissDisabled()
    }

    // MARK: - Components

    private func fieldLabel(_ title: String) -> some View {
        Text(title)
            .font(.caption)
            .foregroundStyle(Color("SecondaryText"))
            .kerning(1.5)
            .padding(.bottom, 8)
    }

    private func paymentField(label: String, text: Binding<String>) -> some View {
        HStack(spacing: 12) {
            Text(label)
                .font(.subheadline.weight(.light))
                .foregroundStyle(Color("SecondaryText"))
                .frame(width: 90, alignment: .leading)

            TextField("", text: text)
                .font(.body)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .padding(10)
                .background(Color("Raised"))
                .clipShape(RoundedRectangle(cornerRadius: 8))
                .frame(height: 40)
        }
        .padding(.bottom, 8)
    }

    // MARK: - Save

    private func save() async {
        guard let userId = authViewModel.userId else { return }

        let user = AppUser(
            id: userId,
            displayName: displayName,
            username: username,
            email: authViewModel.userEmail ?? "",
            venmoHandle: venmoHandle.isEmpty ? nil : venmoHandle,
            cashAppCashtag: cashAppCashtag.isEmpty ? nil : cashAppCashtag,
            paypalUsername: paypalUsername.isEmpty ? nil : paypalUsername,
            zelleContact: zelleContact.isEmpty ? nil : zelleContact,
            friendIds: [],
            createdAt: Date()
        )

        await viewModel.saveProfile(user: user, authViewModel: authViewModel)
        if viewModel.errorMessage == nil {
            onComplete()
        }
    }
}

#Preview {
    ProfileSetupView(
        authViewModel: AuthViewModel(),
        onComplete: {}
    )
}
