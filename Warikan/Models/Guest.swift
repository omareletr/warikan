//
//  Guest.swift
//  Warikan
//

import Foundation

struct Guest: Codable, Identifiable {
    let id: String
    var name: String
    var venmoHandle: String?
    var cashAppCashtag: String?
    var paypalUsername: String?
    var zelleContact: String?
    var preferredPaymentMethod: String?

    init(
        id: String = UUID().uuidString,
        name: String,
        venmoHandle: String? = nil,
        cashAppCashtag: String? = nil,
        paypalUsername: String? = nil,
        zelleContact: String? = nil,
        preferredPaymentMethod: String? = nil
    ) {
        self.id = id
        self.name = name
        self.venmoHandle = venmoHandle
        self.cashAppCashtag = cashAppCashtag
        self.paypalUsername = paypalUsername
        self.zelleContact = zelleContact
        self.preferredPaymentMethod = preferredPaymentMethod
    }
}
