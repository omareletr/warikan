//
//  SplitFlowViewModel.swift
//  Warikan
//

import SwiftUI

/// Single stateful owner of all in-progress split data.
/// Created when the split flow modal opens, deallocated when it closes.
/// Passed through every step — never re-created per step.
@Observable
class SplitFlowViewModel {
    var capturedImage: UIImage?
    var lineItems: [LineItem] = []
    var fees: [Fee] = []
    var taxAmount: Double = 0
    var tipAmount: Double = 0
    var participants: [AppUser] = []
    var guests: [Guest] = []
    var restaurantName: String?
    var currentStep: Int = 1

    /// Pre-generated split ID used for share links and eventual Firestore write.
    let splitId = UUID().uuidString

    /// Pre-generated share token embedded in share links.
    let shareToken = UUID().uuidString

    // MARK: - Computed

    var subtotal: Double {
        lineItems.reduce(0) { $0 + $1.price }
    }

    var feesTotal: Double {
        fees.reduce(0) { $0 + $1.amount }
    }

    var grandTotal: Double {
        subtotal + taxAmount + tipAmount + feesTotal
    }

    /// All people in this split (participants + guests), identified by their IDs.
    var allPersonIds: [String] {
        participants.map(\.id) + guests.map(\.id)
    }

    var allAssigned: Bool {
        lineItems.allSatisfy { !$0.assignedToIds.isEmpty }
    }

    // MARK: - Split Calculation

    /// Calculate a single person's total share including prorated tax, tip, and fees.
    func shareFor(personId: String) -> Double {
        var personSubtotal: Double = 0

        for item in lineItems {
            if item.assignedToIds.contains(personId) {
                personSubtotal += item.price / Double(max(item.assignedToIds.count, 1))
            }
        }

        guard subtotal > 0 else { return 0 }

        let ratio = personSubtotal / subtotal
        let prorated = (taxAmount + tipAmount + feesTotal) * ratio

        return personSubtotal + prorated
    }
}
