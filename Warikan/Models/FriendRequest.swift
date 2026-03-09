//
//  FriendRequest.swift
//  Warikan
//

import Foundation

struct FriendRequest: Codable, Identifiable {
    let id: String
    var fromUserId: String
    var fromDisplayName: String
    var status: String  // "pending", "accepted", "declined"
    var createdAt: Date

    init(
        id: String = UUID().uuidString,
        fromUserId: String,
        fromDisplayName: String,
        status: String = "pending",
        createdAt: Date = Date()
    ) {
        self.id = id
        self.fromUserId = fromUserId
        self.fromDisplayName = fromDisplayName
        self.status = status
        self.createdAt = createdAt
    }
}
