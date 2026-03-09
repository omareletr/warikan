//
//  AppUser.swift
//  Warikan
//

import Foundation

struct AppUser: Codable, Identifiable {
    let id: String
    var displayName: String
    var username: String
    var email: String
    var venmoHandle: String?
    var cashAppCashtag: String?
    var paypalUsername: String?
    var zelleContact: String?
    var preferredPaymentMethod: String?
    var friendIds: [String]
    var createdAt: Date

    init(
        id: String,
        displayName: String,
        username: String,
        email: String,
        venmoHandle: String? = nil,
        cashAppCashtag: String? = nil,
        paypalUsername: String? = nil,
        zelleContact: String? = nil,
        preferredPaymentMethod: String? = nil,
        friendIds: [String] = [],
        createdAt: Date = Date()
    ) {
        self.id = id
        self.displayName = displayName
        self.username = username
        self.email = email
        self.venmoHandle = venmoHandle
        self.cashAppCashtag = cashAppCashtag
        self.paypalUsername = paypalUsername
        self.zelleContact = zelleContact
        self.preferredPaymentMethod = preferredPaymentMethod
        self.friendIds = friendIds
        self.createdAt = createdAt
    }
}
