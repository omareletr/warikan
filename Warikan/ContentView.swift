//
//  ContentView.swift
//  Warikan
//
//  Created by Omar El-Etr on 3/9/26.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @State private var authViewModel = AuthViewModel()
    @State private var showProfileSetup = false

    var body: some View {
        TabView {
            HomeView(authViewModel: authViewModel)
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }

            Group {
                if authViewModel.isGuest {
                    GuestUpsellView(authViewModel: authViewModel)
                } else {
                    ProfileView(authViewModel: authViewModel)
                }
            }
            .tabItem {
                Label("Profile", systemImage: "person.crop.circle.fill")
            }
        }
        .tint(Color.vermillion)
        .fullScreenCover(isPresented: $showProfileSetup) {
            ProfileSetupView(
                authViewModel: authViewModel,
                onComplete: { showProfileSetup = false }
            )
        }
        .onChange(of: authViewModel.needsProfileSetup) { _, needsSetup in
            if needsSetup {
                showProfileSetup = true
            }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: LocalSplitSession.self, inMemory: true)
}
