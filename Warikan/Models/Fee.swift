//
//  Fee.swift
//  Warikan
//

import Foundation

struct Fee: Codable, Identifiable {
    let id: String
    var name: String
    var amount: Double

    init(id: String = UUID().uuidString, name: String, amount: Double) {
        self.id = id
        self.name = name
        self.amount = amount
    }
}
