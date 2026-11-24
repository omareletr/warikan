import Capacitor

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(ReceiptOCRPlugin())
        // A web page rubber-bands as a whole, dragging the fixed header and bottom bar with it.
        webView?.scrollView.bounces = false
        // Edge swipe goes back one screen, like a native navigation stack.
        webView?.allowsBackForwardNavigationGestures = true
    }
}
