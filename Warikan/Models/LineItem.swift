//
//  LineItem.swift
//  Warikan
//

import Foundation

struct LineItem: Codable, Identifiable {
    let id: String
    var name: String
    var price: Double
    var assignedToIds: [String]

    init(id: String = UUID().uuidString, name: String, price: Double, assignedToIds: [String] = []) {
        self.id = id
        self.name = name
        self.price = price
        self.assignedToIds = assignedToIds
    }
}
