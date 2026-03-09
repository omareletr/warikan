//
//  FriendsViewModel.swift
//  Warikan
//

import SwiftUI
import FirebaseFirestore

@Observable
class FriendsViewModel {
    var friends: [AppUser] = []
    var pendingRequests: [FriendRequest] = []
    var searchResults: [AppUser] = []
    var searchText = ""
    var isLoading = false
    var isSearching = false
    var errorMessage: String?

    private let db = Firestore.firestore()

    // MARK: - Fetch Friends

    func fetchFriends(userId: String) async {
        isLoading = true
        defer { isLoading = false }

        do {
            let userDoc = try await db.collection("users").document(userId).getDocument()
            guard let data = userDoc.data(),
                  let friendIds = data["friendIds"] as? [String],
                  !friendIds.isEmpty else {
                friends = []
                return
            }

            // Firestore `in` query limited to 30 at a time
            var fetched: [AppUser] = []
            for chunk in friendIds.chunked(into: 30) {
                let snapshot = try await db.collection("users")
                    .whereField(FieldPath.documentID(), in: chunk)
                    .getDocuments()
                for doc in snapshot.documents {
                    if let user = try? doc.data(as: AppUser.self) {
                        fetched.append(user)
                    }
                }
            }
            friends = fetched.sorted { $0.displayName < $1.displayName }
        } catch {
            errorMessage = "Couldn't load friends."
        }
    }

    // MARK: - Fetch Pending Requests

    func fetchPendingRequests(userId: String) async {
        do {
            let snapshot = try await db.collection("users").document(userId)
                .collection("friendRequests")
                .whereField("status", isEqualTo: "pending")
                .getDocuments()

            pendingRequests = snapshot.documents.compactMap { doc in
                try? doc.data(as: FriendRequest.self)
            }
        } catch {
            // Silent fail — pending requests are non-critical
        }
    }

    // MARK: - Search by Username

    func searchUsers(query: String, currentUserId: String) async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard trimmed.count >= 2 else {
            searchResults = []
            return
        }

        isSearching = true
        defer { isSearching = false }

        do {
            let snapshot = try await db.collection("users")
                .whereField("username", isGreaterThanOrEqualTo: trimmed)
                .whereField("username", isLessThan: trimmed + "\u{f8ff}")
                .limit(to: 10)
                .getDocuments()

            searchResults = snapshot.documents.compactMap { doc in
                guard let user = try? doc.data(as: AppUser.self),
                      user.id != currentUserId else { return nil }
                return user
            }
        } catch {
            searchResults = []
        }
    }

    // MARK: - Send Friend Request

    func sendFriendRequest(from currentUser: (id: String, displayName: String), to targetUserId: String) async {
        let request = FriendRequest(
            fromUserId: currentUser.id,
            fromDisplayName: currentUser.displayName
        )

        do {
            try db.collection("users").document(targetUserId)
                .collection("friendRequests").document(request.id)
                .setData(from: request)
        } catch {
            errorMessage = "Couldn't send friend request."
        }
    }

    // MARK: - Accept Friend Request

    func acceptRequest(_ request: FriendRequest, currentUserId: String) async {
        let batch = db.batch()

        // Update request status
        let requestRef = db.collection("users").document(currentUserId)
            .collection("friendRequests").document(request.id)
        batch.updateData(["status": "accepted"], forDocument: requestRef)

        // Add each other as friends
        let currentRef = db.collection("users").document(currentUserId)
        let senderRef = db.collection("users").document(request.fromUserId)
        batch.updateData(["friendIds": FieldValue.arrayUnion([request.fromUserId])], forDocument: currentRef)
        batch.updateData(["friendIds": FieldValue.arrayUnion([currentUserId])], forDocument: senderRef)

        do {
            try await batch.commit()
            pendingRequests.removeAll { $0.id == request.id }
            // Re-fetch friends to reflect the change
            await fetchFriends(userId: currentUserId)
        } catch {
            errorMessage = "Couldn't accept request."
        }
    }

    // MARK: - Decline Friend Request

    func declineRequest(_ request: FriendRequest, currentUserId: String) async {
        do {
            try await db.collection("users").document(currentUserId)
                .collection("friendRequests").document(request.id)
                .updateData(["status": "declined"])
            pendingRequests.removeAll { $0.id == request.id }
        } catch {
            errorMessage = "Couldn't decline request."
        }
    }
}

// MARK: - Array Chunking

private extension Array {
    func chunked(into size: Int) -> [[Element]] {
        stride(from: 0, to: count, by: size).map {
            Array(self[$0..<Swift.min($0 + size, count)])
        }
    }
}
