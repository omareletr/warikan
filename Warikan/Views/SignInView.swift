//
//  SignInView.swift
//  Warikan
//

import SwiftUI

struct SignInView: View {
    var authViewModel: AuthViewModel
    var onComplete: () -> Void
    var onSwitchToSignUp: () -> Void

    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    private var isFormValid: Bool {
        !email.isEmpty && !password.isEmpty
    }

    var body: some View {
        ZStack {
            Color("Background").ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Spacer().frame(height: 32)

                    Text("Welcome back.")
                        .font(.displaySmall)
                        .foregroundStyle(Color("PrimaryText"))
                        .padding(.bottom, 32)

                    // Email
                    fieldLabel("EMAIL")
                    TextField("you@example.com", text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                        .inputFieldStyle()
                        .padding(.bottom, 16)

                    // Password
                    fieldLabel("PASSWORD")
                    SecureField("Enter your password", text: $password)
                        .textContentType(.password)
                        .inputFieldStyle()

                    if let error = errorMessage {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .padding(.top, 12)
                    }

                    Spacer().frame(height: 32)

                    // Primary CTA
                    Button {
                        Task { await signIn() }
                    } label: {
                        Group {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Sign In")
                            }
                        }
                        .font(.body.bold())
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(isFormValid ? Color.vermillion : Color.vermillion.opacity(0.4))
                        .clipShape(RoundedRectangle(cornerRadius: 32))
                    }
                    .disabled(!isFormValid || isLoading)

                    Spacer().frame(height: 16)

                    // Ghost link
                    HStack {
                        Spacer()
                        Button(action: onSwitchToSignUp) {
                            Text("Don't have an account? Create one")
                                .font(.subheadline)
                                .foregroundStyle(Color("SecondaryText"))
                        }
                        Spacer()
                    }
                }
                .padding(.horizontal, 20)
            }
        }
    }

    private func fieldLabel(_ title: String) -> some View {
        Text(title)
            .font(.caption)
            .foregroundStyle(Color("SecondaryText"))
            .kerning(1.5)
            .padding(.bottom, 8)
    }

    private func signIn() async {
        isLoading = true
        errorMessage = nil
        do {
            try await authViewModel.signIn(email: email, password: password)
            onComplete()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

#Preview {
    SignInView(
        authViewModel: AuthViewModel(),
        onComplete: {},
        onSwitchToSignUp: {}
    )
}
