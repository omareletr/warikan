//
//  SplitFlowView.swift
//  Warikan
//

import SwiftUI

/// Modal container for the entire split flow.
/// Linear step-by-step progression: Scan → Review → People → Assign → Summary → Payment.
/// Dismissal via back/cancel shows discard alert after ScanView.
struct SplitFlowView: View {
    var authViewModel: AuthViewModel
    var onDismiss: () -> Void

    @State private var flowVM = SplitFlowViewModel()
    @State private var showDiscardAlert = false

    var body: some View {
        NavigationStack {
            ZStack(alignment: .top) {
                Color("Background").ignoresSafeArea()

                VStack(spacing: 0) {
                    // Progress bar (hidden on step 6 / PaymentView)
                    if flowVM.currentStep <= 5 {
                        StepProgressBar(currentStep: flowVM.currentStep)
                            .padding(.top, 4)
                    }

                    // Step content
                    Group {
                        switch flowVM.currentStep {
                        case 1:
                            ScanView(flowVM: flowVM)
                        case 2:
                            ReceiptReviewView(flowVM: flowVM)
                        case 3:
                            PeopleSetupView(flowVM: flowVM, authViewModel: authViewModel)
                        case 4:
                            AssignView(flowVM: flowVM)
                        case 5:
                            SplitSummaryView(flowVM: flowVM, authViewModel: authViewModel)
                        case 6:
                            PaymentView(flowVM: flowVM, authViewModel: authViewModel, onComplete: onDismiss)
                        default:
                            EmptyView()
                        }
                    }
                }
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if flowVM.currentStep < 6 {
                        Button {
                            handleBack()
                        } label: {
                            Image(systemName: "chevron.left")
                                .font(.system(size: 16, weight: .light))
                                .foregroundStyle(Color("SecondaryText"))
                        }
                    }
                }
            }
            .navigationBarTitleDisplayMode(.inline)
        }
        .interactiveDismissDisabled(true)
        .alert("Discard this split?", isPresented: $showDiscardAlert) {
            Button("Discard", role: .destructive) { onDismiss() }
            Button("Keep editing", role: .cancel) {}
        } message: {
            Text("Your progress will be lost.")
        }
    }

    private func handleBack() {
        if flowVM.currentStep == 1 {
            // At ScanView — dismiss immediately, no confirmation
            onDismiss()
        } else {
            // Past ScanView — show discard alert
            showDiscardAlert = true
        }
    }
}

// MARK: - Step Progress Bar

struct StepProgressBar: View {
    let currentStep: Int
    private let totalSteps = 5

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Rectangle()
                    .fill(Color("Raised"))
                    .frame(height: 2)
                Rectangle()
                    .fill(Color.vermillion)
                    .frame(width: geo.size.width * CGFloat(currentStep) / CGFloat(totalSteps), height: 2)
                    .animation(.easeOut(duration: 0.3), value: currentStep)
            }
        }
        .frame(height: 2)
        .padding(.horizontal, 20)
    }
}
