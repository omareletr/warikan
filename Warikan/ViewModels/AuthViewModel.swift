//
//  AuthViewModel.swift
//  Warikan
//

import Foundation
import FirebaseAuth
import FirebaseFirestore
import AuthenticationServices
import CryptoKit

@Observable
class AuthViewModel {
    var currentUser: FirebaseAuth.User?
    var appUser: AppUser?
    var isCheckingAuth = true

    /// True when Firebase Auth has no signed-in user.
    var isGuest: Bool {
        currentUser == nil
    }

    /// True when signed in but no Firestore user document exists yet.
    var needsProfileSetup: Bool {
        currentUser != nil && appUser == nil && !isCheckingAuth
    }

    /// Firebase Auth UID of the current user, if signed in.
    var userId: String? {
        currentUser?.uid
    }

    /// Email of the currently signed-in Firebase Auth user.
    var userEmail: String? {
        currentUser?.email
    }

    /// First name derived from AppUser.displayName for the greeting.
    var firstName: String? {
        appUser?.displayName.components(separatedBy: " ").first
    }

    private var authStateHandle: AuthStateDidChangeListenerHandle?

    /// Nonce used for Sign in with Apple — must persist between request and callback.
    private var currentNonce: String?

    init() {
        listenToAuthState()
    }

    deinit {
        if let handle = authStateHandle {
            Auth.auth().removeStateDidChangeListener(handle)
        }
    }

    private func listenToAuthState() {
        authStateHandle = Auth.auth().addStateDidChangeListener { [weak self] _, user in
            guard let self else { return }
            self.currentUser = user
            if let user {
                Task { await self.fetchAppUser(uid: user.uid) }
            } else {
                self.appUser = nil
                self.isCheckingAuth = false
            }
        }
    }

    // MARK: - Auth Actions

    func signUp(email: String, password: String) async throws {
        let result = try await Auth.auth().createUser(withEmail: email, password: password)
        self.currentUser = result.user
    }

    func signIn(email: String, password: String) async throws {
        let result = try await Auth.auth().signIn(withEmail: email, password: password)
        self.currentUser = result.user
    }

    func signOut() throws {
        try Auth.auth().signOut()
        self.currentUser = nil
        self.appUser = nil
    }

    // MARK: - Sign in with Apple

    /// Generates a nonce and returns a configured ASAuthorizationAppleIDRequest.
    func prepareAppleSignInRequest(_ request: ASAuthorizationAppleIDRequest) {
        let nonce = randomNonceString()
        currentNonce = nonce
        request.requestedScopes = [.fullName, .email]
        request.nonce = sha256(nonce)
    }

    /// Handles the ASAuthorizationAppleIDCredential from Sign in with Apple.
    func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) async throws {
        switch result {
        case .success(let authorization):
            guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
                  let identityToken = appleIDCredential.identityToken,
                  let tokenString = String(data: identityToken, encoding: .utf8),
                  let nonce = currentNonce else {
                throw AuthError.appleSignInFailed
            }

            let credential = OAuthProvider.appleCredential(
                withIDToken: tokenString,
                rawNonce: nonce,
                fullName: appleIDCredential.fullName
            )

            let authResult = try await Auth.auth().signIn(with: credential)
            self.currentUser = authResult.user

        case .failure(let error):
            // User cancelled — ASAuthorizationError.canceled
            if (error as NSError).code == ASAuthorizationError.canceled.rawValue {
                return
            }
            throw error
        }
    }

    // MARK: - Sign in with Google

    /// Signs in with Google using Firebase Auth.
    /// Requires GoogleSignIn SPM package: https://github.com/google/GoogleSignIn-iOS
    /// and a valid CLIENT_ID in GoogleService-Info.plist.
    func signInWithGoogle() async throws {
        // GoogleSignIn SDK must be added as SPM dependency.
        // Once added, uncomment the import and implementation below.
        // For now, this throws a descriptive error.
        throw AuthError.googleSignInNotConfigured
    }

    // To enable Google Sign-In:
    // 1. Add GoogleSignIn-iOS SPM package: https://github.com/google/GoogleSignIn-iOS
    // 2. Add CLIENT_ID to GoogleService-Info.plist from Firebase Console
    // 3. Add the reversed client ID as a URL scheme in Info.plist
    // 4. Replace the signInWithGoogle() body above with:
    //    import GoogleSignIn (at file top)
    //    let result = try await GIDSignIn.sharedInstance.signIn(withPresenting: rootVC)
    //    let credential = GoogleAuthProvider.credential(withIDToken:accessToken:)
    //    Auth.auth().signIn(with: credential)

    // MARK: - Auth Errors

    enum AuthError: LocalizedError {
        case appleSignInFailed
        case googleClientIDMissing
        case googleSignInFailed
        case googleSignInNotConfigured

        var errorDescription: String? {
            switch self {
            case .appleSignInFailed:
                return "Sign in with Apple failed. Please try again."
            case .googleClientIDMissing:
                return "Google Sign-In is not configured. Missing client ID."
            case .googleSignInFailed:
                return "Sign in with Google failed. Please try again."
            case .googleSignInNotConfigured:
                return "Google Sign-In requires the GoogleSignIn SDK. Add it via SPM."
            }
        }
    }

    // MARK: - Firestore

    private func fetchAppUser(uid: String) async {
        do {
            let snapshot = try await Firestore.firestore()
                .collection("users")
                .document(uid)
                .getDocument()
            if snapshot.exists {
                self.appUser = try snapshot.data(as: AppUser.self)
            } else {
                self.appUser = nil
            }
        } catch {
            self.appUser = nil
        }
        self.isCheckingAuth = false
    }

    // MARK: - Crypto Helpers

    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if errorCode != errSecSuccess {
            fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
        }
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        return String(randomBytes.map { charset[Int($0) % charset.count] })
    }

    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        return hashedData.compactMap { String(format: "%02x", $0) }.joined()
    }
}
