//
//  GuestUpsellBanner.swift
//  Warikan
//

import SwiftUI

/// Dismissible banner shown to guests after completing a split.
/// "Save this split to your account" — taps navigate to sign-up flow.
struct GuestUpsellBanner: View {
    var onCreateAccount: () -> Void
    var onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: "icloud.and.arrow.up")
                .font(.system(size: 20, weight: .thin))
                .foregroundStyle(Color.vermillion)

            VStack(alignment: .leading, spacing: 2) {
                Text("Save this split to your account")
                    .font(.subheadline)
                    .foregroundStyle(Color("PrimaryText"))

                Text("Sync across devices with a free account.")
                    .font(.caption)
                    .foregroundStyle(Color("SecondaryText"))
            }

            Spacer()

            Button(action: onDismiss) {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .light))
                    .foregroundStyle(Color("TertiaryText"))
            }
        }
        .padding(16)
        .background(Color("Surface"))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .onTapGesture {
            onCreateAccount()
        }
    }
}

#Preview {
    ZStack {
        Color("Background").ignoresSafeArea()
        GuestUpsellBanner(
            onCreateAccount: {},
            onDismiss: {}
        )
        .padding(.horizontal, 20)
    }
}
