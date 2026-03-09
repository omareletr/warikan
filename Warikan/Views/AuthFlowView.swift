//
//  AuthFlowView.swift
//  Warikan
//

import SwiftUI

/// Container for the full auth flow: Landing → SignUp/SignIn → ProfileSetup.
/// Presented as a sheet from ContentView.
struct AuthFlowView: View {
    var authViewModel: AuthViewModel
    var onDismiss: () -> Void

    enum AuthScreen {
        case landing
        case signUp
        case signIn
        case profileSetup
    }

    @State private var currentScreen: AuthScreen = .landing

    var body: some View {
        Group {
            switch currentScreen {
            case .landing:
                LandingView(
                    onCreateAccount: { currentScreen = .signUp },
                    onSignIn: { currentScreen = .signIn },
                    onContinueAsGuest: onDismiss
                )

            case .signUp:
                NavigationStack {
                    SignUpView(
                        authViewModel: authViewModel,
                        onComplete: {
                            if authViewModel.needsProfileSetup {
                                currentScreen = .profileSetup
                            } else {
                                onDismiss()
                            }
                        },
                        onSwitchToSignIn: { currentScreen = .signIn }
                    )
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button {
                                currentScreen = .landing
                            } label: {
                                Image(systemName: "chevron.left")
                                    .foregroundStyle(Color("SecondaryText"))
                            }
                        }
                    }
                }

            case .signIn:
                NavigationStack {
                    SignInView(
                        authViewModel: authViewModel,
                        onComplete: {
                            if authViewModel.needsProfileSetup {
                                currentScreen = .profileSetup
                            } else {
                                onDismiss()
                            }
                        },
                        onSwitchToSignUp: { currentScreen = .signUp }
                    )
                    .toolbar {
                        ToolbarItem(placement: .navigationBarLeading) {
                            Button {
                                currentScreen = .landing
                            } label: {
                                Image(systemName: "chevron.left")
                                    .foregroundStyle(Color("SecondaryText"))
                            }
                        }
                    }
                }

            case .profileSetup:
                ProfileSetupView(
                    authViewModel: authViewModel,
                    onComplete: onDismiss
                )
            }
        }
    }
}

#Preview {
    AuthFlowView(
        authViewModel: AuthViewModel(),
        onDismiss: {}
    )
}
