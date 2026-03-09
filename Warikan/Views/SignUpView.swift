//
//  SignUpView.swift
//  Warikan
//

import SwiftUI

struct SignUpView: View {
    var authViewModel: AuthViewModel
    var onComplete: () -> Void
    var onSwitchToSignIn: () -> Void

    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    private var isFormValid: Bool {
        !email.isEmpty && password.count >= 6 && password == confirmPassword
    }

    var body: some View {
        ZStack {
            Color("Background").ignoresSafeArea()

            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Spacer().frame(height: 32)

                    Text("Create your account")
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
                    SecureField("At least 6 characters", text: $password)
                        .textContentType(.newPassword)
                        .inputFieldStyle()
                        .padding(.bottom, 16)

                    // Confirm password
                    fieldLabel("CONFIRM PASSWORD")
                    SecureField("Re-enter your password", text: $confirmPassword)
                        .textContentType(.newPassword)
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
                        Task { await signUp() }
                    } label: {
                        Group {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Create Account")
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
                        Button(action: onSwitchToSignIn) {
                            Text("Already have an account? Sign in")
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

    private func signUp() async {
        isLoading = true
        errorMessage = nil
        do {
            try await authViewModel.signUp(email: email, password: password)
            onComplete()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}

// MARK: - Input Field Style

struct InputFieldModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(.body)
            .padding(14)
            .background(Color("Raised"))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color("Separator"), lineWidth: 1)
            )
    }
}

extension View {
    func inputFieldStyle() -> some View {
        modifier(InputFieldModifier())
    }
}

#Preview {
    SignUpView(
        authViewModel: AuthViewModel(),
        onComplete: {},
        onSwitchToSignIn: {}
    )
}
