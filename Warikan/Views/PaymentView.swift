//
//  PaymentView.swift
//  Warikan
//

import SwiftUI
import SwiftData
import FirebaseFirestore

struct PaymentView: View {
    var flowVM: SplitFlowViewModel
    var authViewModel: AuthViewModel
    var onComplete: () -> Void

    @Environment(\.modelContext) private var modelContext

    @State private var sentPersonIds: Set<String> = []
    @State private var selectedMethods: [String: String] = [:] // personId → method
    @State private var guestHandles: [String: String] = [:] // personId → handle input
    @State private var showCompletion = false
    @State private var isSaving = false
    @State private var saveError: String?

    private let paymentMethods = ["venmo", "cashapp", "paypal", "zelle"]

    /// People who owe the creator (everyone except the creator).
    private var payees: [(id: String, name: String, share: Double)] {
        let creatorId = authViewModel.userId ?? flowVM.guests.first?.id ?? ""
        var result: [(id: String, name: String, share: Double)] = []

        for p in flowVM.participants where p.id != creatorId {
            result.append((id: p.id, name: p.displayName, share: flowVM.shareFor(personId: p.id)))
        }
        for g in flowVM.guests {
            if g.id != creatorId {
                result.append((id: g.id, name: g.name, share: flowVM.shareFor(personId: g.id)))
            }
        }
        return result
    }

    private var allSent: Bool {
        payees.allSatisfy { sentPersonIds.contains($0.id) }
    }

    var body: some View {
        ZStack {
            if showCompletion {
                completionView
            } else {
                paymentListView
            }
        }
        .navigationTitle(showCompletion ? "" : "Send Requests")
        .navigationBarBackButtonHidden(true)
    }

    // MARK: - Payment List View

    private var paymentListView: some View {
        ZStack(alignment: .bottom) {
            Color("Background").ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    ForEach(payees, id: \.id) { payee in
                        payeeCard(payee: payee)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)
                .padding(.bottom, 120)
            }

            // Send All / All Done CTA
            bottomCTA
        }
    }

    // MARK: - Payee Card

    private func payeeCard(payee: (id: String, name: String, share: Double)) -> some View {
        let isSent = sentPersonIds.contains(payee.id)
        let method = selectedMethods[payee.id] ?? preferredMethod(for: payee.id) ?? "venmo"

        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                // Avatar
                Circle()
                    .fill(Color.vermillion.opacity(0.08))
                    .frame(width: 44, height: 44)
                    .overlay(
                        Text(initials(for: payee.name))
                            .font(.subheadline)
                            .foregroundStyle(Color.vermillion)
                    )

                VStack(alignment: .leading, spacing: 2) {
                    Text(payee.name)
                        .font(.body)
                        .foregroundStyle(Color("PrimaryText"))

                    Text(payee.share, format: .currency(code: "USD"))
                        .font(.subheadline)
                        .monospacedDigit()
                        .foregroundStyle(Color.vermillion)
                }

                Spacer()

                if isSent {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(.green)
                        .transition(.scale.combined(with: .opacity))
                } else {
                    Button {
                        sendPayment(to: payee, method: method)
                    } label: {
                        Text("Send")
                            .font(.footnote)
                            .foregroundStyle(.white)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.vermillion)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }
            }

            // Payment method picker
            if !isSent {
                HStack(spacing: 8) {
                    ForEach(paymentMethods, id: \.self) { m in
                        let isActive = method == m

                        Button {
                            selectedMethods[payee.id] = m
                        } label: {
                            Text(methodLabel(m))
                                .font(.caption)
                                .foregroundStyle(isActive ? Color.vermillion : Color("SecondaryText"))
                        }
                    }
                }

                // Zelle warning
                if method == "zelle" {
                    Text("Manual entry required")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }

                // Handle input for guests without saved handles
                if needsHandleInput(personId: payee.id, method: method) {
                    TextField("Enter \(methodLabel(method)) handle", text: Binding(
                        get: { guestHandles[payee.id] ?? "" },
                        set: { guestHandles[payee.id] = $0 }
                    ))
                    .font(.body)
                    .padding(10)
                    .background(Color("Raised"))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
        }
        .padding(16)
        .background(Color("Surface"))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color("Separator"), lineWidth: 1)
        )
        .animation(.spring(response: 0.3), value: isSent)
    }

    // MARK: - Bottom CTA

    private var bottomCTA: some View {
        VStack(spacing: 0) {
            Rectangle()
                .fill(Color("Separator"))
                .frame(height: 0.5)

            if let error = saveError {
                HStack {
                    Text(error)
                        .font(.footnote)
                        .foregroundStyle(.red)
                    Spacer()
                    Button("Retry") {
                        Task { await saveSplit() }
                    }
                    .font(.footnote.bold())
                    .foregroundStyle(Color.vermillion)
                }
                .padding(.horizontal, 20)
                .padding(.top, 8)
            }

            Button {
                if allSent {
                    Task { await saveSplit() }
                } else {
                    sendAll()
                }
            } label: {
                Text(allSent ? "All Done →" : "Send All")
                    .font(.body.bold())
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(Color.vermillion)
                    .clipShape(RoundedRectangle(cornerRadius: 32))
            }
            .disabled(isSaving)
            .padding(.horizontal, 20)
            .padding(.vertical, 8)
        }
        .background(Color("Background"))
    }

    // MARK: - Completion View (Ceremonial)

    private var completionView: some View {
        ZStack {
            // Dark gradient background
            LinearGradient(
                colors: [Color(red: 0.1, green: 0.1, blue: 0.1), Color(red: 0.04, green: 0.04, blue: 0.04)],
                startPoint: .init(x: 0.3, y: 0),
                endPoint: .init(x: 0.7, y: 1)
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                // Frosted glass card
                VStack(spacing: 16) {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 72))
                        .foregroundStyle(.white)

                    Text("All done.")
                        .font(.displaySmall)
                        .foregroundStyle(.white)

                    Text(flowVM.grandTotal, format: .currency(code: "USD"))
                        .font(.displayLarge)
                        .monospacedDigit()
                        .foregroundStyle(.white)
                }
                .padding(32)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 24))
                .shadow(color: .black.opacity(0.18), radius: 24, x: 0, y: 8)

                Spacer()

                // Back to Home
                Button {
                    onComplete()
                } label: {
                    Text("Back to Home")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.6))
                }
                .padding(.bottom, 48)
            }
            .padding(.horizontal, 32)
        }
        .sensoryFeedback(.success, trigger: showCompletion)
    }

    // MARK: - Payment Logic

    private func sendPayment(to payee: (id: String, name: String, share: Double), method: String) {
        let handle = resolveHandle(personId: payee.id, method: method)
        let amount = String(format: "%.2f", payee.share)
        let restaurant = flowVM.restaurantName ?? "Warikan"

        var url: URL?

        switch method {
        case "venmo":
            if let handle {
                url = URL(string: "venmo://paycharge?txn=pay&recipients=\(handle)&amount=\(amount)&note=Warikan%20-%20\(restaurant.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? restaurant)")
            }
        case "cashapp":
            if let handle {
                url = URL(string: "cashme://cash.app/pay/\(handle)?amount=\(amount)&note=Warikan")
            }
        case "paypal":
            if let handle {
                url = URL(string: "https://paypal.me/\(handle)/\(amount)")
            }
        case "zelle":
            // Copy amount to clipboard, open Zelle
            UIPasteboard.general.string = "$\(amount)"
            url = URL(string: "zelle://")
        default:
            break
        }

        if let url, UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
        } else {
            // Fallback: copy amount
            UIPasteboard.general.string = "$\(amount)"
        }

        withAnimation(.spring(response: 0.3)) {
            sentPersonIds.insert(payee.id)
        }
    }

    private func sendAll() {
        // Mark all as sent — in reality each would open the payment app sequentially.
        // For v1, mark all as sent so user can tap "All Done →".
        for payee in payees {
            let method = selectedMethods[payee.id] ?? preferredMethod(for: payee.id) ?? "venmo"
            sendPayment(to: payee, method: method)
        }
    }

    private func saveSplit() async {
        isSaving = true
        saveError = nil

        let totalAmount = flowVM.grandTotal
        let now = Date()

        if authViewModel.isGuest {
            // Save to SwiftData
            let local = LocalSplitSession(
                createdBy: "guest",
                participantIds: flowVM.participants.map(\.id),
                guests: flowVM.guests,
                date: now,
                restaurantName: flowVM.restaurantName,
                lineItems: flowVM.lineItems,
                fees: flowVM.fees,
                taxAmount: flowVM.taxAmount,
                tipAmount: flowVM.tipAmount,
                totalAmount: totalAmount,
                settled: true,
                settledAt: now,
                shareToken: flowVM.shareToken
            )
            modelContext.insert(local)

            do {
                try modelContext.save()
                showCompletion = true
            } catch {
                saveError = "Couldn't save your split. Tap to retry."
            }
        } else {
            // Save to Firestore
            let split = SplitSession(
                id: flowVM.splitId,
                createdBy: authViewModel.userId ?? "",
                participantIds: flowVM.participants.map(\.id),
                guests: flowVM.guests,
                date: now,
                restaurantName: flowVM.restaurantName,
                lineItems: flowVM.lineItems,
                fees: flowVM.fees,
                taxAmount: flowVM.taxAmount,
                tipAmount: flowVM.tipAmount,
                totalAmount: totalAmount,
                settled: true,
                settledAt: now,
                shareToken: flowVM.shareToken
            )

            do {
                try Firestore.firestore()
                    .collection("splits")
                    .document(flowVM.splitId)
                    .setData(from: split)
                showCompletion = true
            } catch {
                saveError = "Couldn't save your split. Tap to retry."
            }
        }

        isSaving = false
    }

    // MARK: - Helpers

    private func methodLabel(_ method: String) -> String {
        switch method {
        case "venmo": return "Venmo"
        case "cashapp": return "Cash App"
        case "paypal": return "PayPal"
        case "zelle": return "Zelle"
        default: return method
        }
    }

    private func preferredMethod(for personId: String) -> String? {
        if let participant = flowVM.participants.first(where: { $0.id == personId }) {
            return participant.preferredPaymentMethod
        }
        if let guest = flowVM.guests.first(where: { $0.id == personId }) {
            return guest.preferredPaymentMethod
        }
        return nil
    }

    private func resolveHandle(personId: String, method: String) -> String? {
        // Check participants
        if let p = flowVM.participants.first(where: { $0.id == personId }) {
            switch method {
            case "venmo": return p.venmoHandle
            case "cashapp": return p.cashAppCashtag
            case "paypal": return p.paypalUsername
            case "zelle": return p.zelleContact
            default: return nil
            }
        }

        // Check guests
        if let g = flowVM.guests.first(where: { $0.id == personId }) {
            switch method {
            case "venmo": return g.venmoHandle
            case "cashapp": return g.cashAppCashtag
            case "paypal": return g.paypalUsername
            case "zelle": return g.zelleContact
            default: return nil
            }
        }

        // Check manual input
        return guestHandles[personId]
    }

    private func needsHandleInput(personId: String, method: String) -> Bool {
        return resolveHandle(personId: personId, method: method) == nil && method != "zelle"
    }

    private func initials(for name: String) -> String {
        let parts = name.split(separator: " ")
        if parts.count >= 2 {
            return String(parts[0].prefix(1) + parts[1].prefix(1)).uppercased()
        }
        return String(name.prefix(2)).uppercased()
    }
}

#Preview {
    NavigationStack {
        PaymentView(
            flowVM: {
                let vm = SplitFlowViewModel()
                vm.restaurantName = "Nobu"
                vm.lineItems = [
                    LineItem(name: "Salmon Roll", price: 14.50, assignedToIds: ["1"]),
                    LineItem(name: "Ramen", price: 16.00, assignedToIds: ["2"]),
                ]
                vm.taxAmount = 3.05
                vm.tipAmount = 6.10
                vm.guests = [
                    Guest(id: "1", name: "Omar"),
                    Guest(id: "2", name: "Sarah"),
                ]
                return vm
            }(),
            authViewModel: AuthViewModel(),
            onComplete: {}
        )
    }
    .modelContainer(for: LocalSplitSession.self, inMemory: true)
}
