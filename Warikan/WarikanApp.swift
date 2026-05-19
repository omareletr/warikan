//
//  WarikanApp.swift
//  Warikan
//
//  Created by Omar El-Etr on 3/9/26.
//

import SwiftUI
import SwiftData
import FirebaseCore

@main
struct WarikanApp: App {
    @State private var deepLinkSplit: DeepLinkSplit?

    init() {
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .fullScreenCover(item: $deepLinkSplit) { link in
                    NavigationStack {
                        ShareSplitView(
                            splitId: link.splitId,
                            shareToken: link.shareToken,
                            participantId: link.participantId
                        )
                        .toolbar {
                            ToolbarItem(placement: .navigationBarLeading) {
                                Button("Done") {
                                    deepLinkSplit = nil
                                }
                                .foregroundStyle(Color.vermillion)
                            }
                        }
                    }
                }
                .onOpenURL { url in
                    handleDeepLink(url)
                }
        }
        .modelContainer(for: LocalSplitSession.self)
    }

    private func handleDeepLink(_ url: URL) {
        guard url.scheme == "warikan" else { return }

        switch url.host {
        case "split":
            // warikan://split/{splitId}?token={shareToken}&participant={participantId}
            let pathComponents = url.pathComponents.filter { $0 != "/" }
            guard let splitId = pathComponents.first else { return }
            let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
            let token = components?.queryItems?.first(where: { $0.name == "token" })?.value ?? ""
            let participant = components?.queryItems?.first(where: { $0.name == "participant" })?.value ?? ""

            deepLinkSplit = DeepLinkSplit(
                splitId: splitId,
                shareToken: token,
                participantId: participant
            )

        case "session":
            // warikan://session/{sessionId} — collaborative session (v2)
            break

        default:
            break
        }
    }
}

struct DeepLinkSplit: Identifiable {
    let id = UUID()
    let splitId: String
    let shareToken: String
    let participantId: String
}
