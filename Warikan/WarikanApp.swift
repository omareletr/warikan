//
//  WarikanApp.swift
//  Warikan
//
//  Created by Omar El-Etr on 3/9/26.
//

import SwiftUI
import FirebaseCore

@main
struct WarikanApp: App {
    init() {
        FirebaseApp.configure()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
