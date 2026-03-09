//
//  ProfileSetupViewModel.swift
//  Warikan
//

import Foundation
import FirebaseFirestore

@Observable
class ProfileSetupViewModel {
    var isCheckingUsername = false
    var usernameAvailable: Bool?
    var isLoading = false
    var errorMessage: String?

    private var usernameCheckTask: Task<Void, Never>?

    /// Debounced username availability check against Firestore /usernames collection.
    func checkUsername(_ username: String, isValid: Bool) {
        usernameCheckTask?.cancel()
        usernameAvailable = nil

        guard isValid else { return }

        isCheckingUsername = true
        usernameCheckTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }

            do {
                let doc = try await Firestore.firestore()
                    .collection("usernames")
                    .document(username)
                    .getDocument()
                if Task.isCancelled { return }
                usernameAvailable = !doc.exists
            } catch {
                if !Task.isCancelled { usernameAvailable = nil }
            }
            isCheckingUsername = false
        }
    }

    /// Atomic write of AppUser document + username reservation.
    func saveProfile(user: AppUser, authViewModel: AuthViewModel) async {
        isLoading = true
        errorMessage = nil

        do {
            let db = Firestore.firestore()
            let batch = db.batch()

            let userRef = db.collection("users").document(user.id)
            try batch.setData(from: user, forDocument: userRef)

            let usernameRef = db.collection("usernames").document(user.username)
            batch.setData(["uid": user.id], forDocument: usernameRef)

            try await batch.commit()
            authViewModel.appUser = user
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
