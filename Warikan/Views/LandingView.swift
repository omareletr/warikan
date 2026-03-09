//
//  LandingView.swift
//  Warikan
//

import SwiftUI

/// Ceremonial screen — shown only when user explicitly taps "Sign In / Create Account".
/// Never shown on cold launch.
struct LandingView: View {
    var onCreateAccount: () -> Void
    var onSignIn: () -> Void
    var onContinueAsGuest: () -> Void

    @State private var appeared = false

    var body: some View {
        ZStack {
            // Ceremonial background — dark gradient (swap for Image asset later)
            LinearGradient(
                colors: [Color(red: 0.1, green: 0.1, blue: 0.1),
                         Color(red: 0.04, green: 0.04, blue: 0.04)],
                startPoint: .init(x: 0.3, y: 0),
                endPoint: .init(x: 0.7, y: 1)
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()
                    .frame(height: 64)

                // Wordmark
                Text("Warikan")
                    .font(.wordmark)
                    .foregroundStyle(.white)
                    .kerning(1.5)

                Spacer()
                    .frame(height: 48)

                // Frosted glass card
                VStack(spacing: 0) {
                    Text("Start here.")
                        .font(.displaySmall)
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)

                    Spacer().frame(height: 24)

                    // Primary CTA
                    Button(action: onCreateAccount) {
                        Text("Create Account")
                            .font(.body.bold())
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 54)
                            .background(Color.vermillion)
                            .clipShape(RoundedRectangle(cornerRadius: 32))
                    }

                    Spacer().frame(height: 12)

                    // Secondary CTA
                    Button(action: onSignIn) {
                        Text("Sign In")
                            .font(.body)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 54)
                            .overlay(
                                RoundedRectangle(cornerRadius: 32)
                                    .stroke(Color.white.opacity(0.4), lineWidth: 1)
                            )
                    }

                    Spacer().frame(height: 16)

                    // Ghost link
                    Button(action: onContinueAsGuest) {
                        Text("Continue without account")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                }
                .padding(24)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 24))
                .shadow(color: .black.opacity(0.18), radius: 24, x: 0, y: 8)
                .padding(.horizontal, 20)

                Spacer()
            }
            .opacity(appeared ? 1 : 0)
            .offset(y: appeared ? 0 : 12)
            .animation(.easeOut(duration: 0.6).delay(0.1), value: appeared)
        }
        .onAppear { appeared = true }
    }
}

#Preview {
    LandingView(
        onCreateAccount: {},
        onSignIn: {},
        onContinueAsGuest: {}
    )
}
