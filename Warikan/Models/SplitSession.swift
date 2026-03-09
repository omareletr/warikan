//
//  SplitSession.swift
//  Warikan
//

import Foundation

struct SplitSession: Codable, Identifiable {
    let id: String
    var createdBy: String
    var participantIds: [String]
    var guests: [Guest]
    var date: Date
    var restaurantName: String?
    var lineItems: [LineItem]
    var fees: [Fee]
    var taxAmount: Double
    var tipAmount: Double
    var totalAmount: Double
    var settled: Bool
    var settledAt: Date?
    var shareToken: String

    init(
        id: String = UUID().uuidString,
        createdBy: String,
        participantIds: [String] = [],
        guests: [Guest] = [],
        date: Date = Date(),
        restaurantName: String? = nil,
        lineItems: [LineItem] = [],
        fees: [Fee] = [],
        taxAmount: Double = 0,
        tipAmount: Double = 0,
        totalAmount: Double = 0,
        settled: Bool = false,
        settledAt: Date? = nil,
        shareToken: String = UUID().uuidString
    ) {
        self.id = id
        self.createdBy = createdBy
        self.participantIds = participantIds
        self.guests = guests
        self.date = date
        self.restaurantName = restaurantName
        self.lineItems = lineItems
        self.fees = fees
        self.taxAmount = taxAmount
        self.tipAmount = tipAmount
        self.totalAmount = totalAmount
        self.settled = settled
        self.settledAt = settledAt
        self.shareToken = shareToken
    }
}
