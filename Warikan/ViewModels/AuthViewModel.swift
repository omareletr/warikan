//
//  AuthViewModel.swift
//  Warikan
//

import Foundation
import FirebaseAuth
import FirebaseFirestore

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

    /// First name derived from AppUser.displayName for the greeting.
    var firstName: String? {
        appUser?.displayName.components(separatedBy: " ").first
    }

    private var authStateHandle: AuthStateDidChangeListenerHandle?

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
}
