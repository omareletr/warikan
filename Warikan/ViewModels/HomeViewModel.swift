//
//  HomeViewModel.swift
//  Warikan
//

import Foundation
import FirebaseFirestore

@Observable
class HomeViewModel {
    var splits: [SplitSession] = []
    var isLoading = true

    var recentSplits: [SplitSession] {
        splits.filter { !$0.settled }
    }

    var pastSplits: [SplitSession] {
        splits.filter { $0.settled }
    }

    /// Total amount owed to the current user across all unsettled splits they created.
    func amountOwed(userId: String) -> Double {
        let createdUnsettled = splits.filter { $0.createdBy == userId && !$0.settled }
        var total: Double = 0
        for split in createdUnsettled {
            let creatorShare = calculatePersonShare(split: split, personId: userId)
            total += split.totalAmount - creatorShare
        }
        return total
    }

    func fetchSplits(for userId: String) async {
        isLoading = true
        do {
            let snapshot = try await Firestore.firestore()
                .collection("splits")
                .whereField("participantIds", arrayContains: userId)
                .order(by: "date", descending: true)
                .getDocuments()

            self.splits = snapshot.documents.compactMap { doc in
                try? doc.data(as: SplitSession.self)
            }
        } catch {
            self.splits = []
        }
        isLoading = false
    }

    /// Calculate a single person's share of a split (subtotal + prorated tax/tip/fees).
    private func calculatePersonShare(split: SplitSession, personId: String) -> Double {
        var personSubtotal: Double = 0
        var overallSubtotal: Double = 0

        for item in split.lineItems {
            overallSubtotal += item.price
            if item.assignedToIds.contains(personId) {
                personSubtotal += item.price / Double(max(item.assignedToIds.count, 1))
            }
        }

        guard overallSubtotal > 0 else { return 0 }

        let ratio = personSubtotal / overallSubtotal
        let feeTotal = split.fees.reduce(0) { $0 + $1.amount }
        let prorated = (split.taxAmount + split.tipAmount + feeTotal) * ratio

        return personSubtotal + prorated
    }
}
