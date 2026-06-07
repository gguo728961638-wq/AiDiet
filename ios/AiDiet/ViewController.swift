import UIKit
import WebKit

class ViewController: UIViewController, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandler {

    private var webView: WKWebView!
    private var progressObservation: NSKeyValueObservation?
    private var imagePickerCompletion: (([URL]?) -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 244 / 255, green: 241 / 255, blue: 234 / 255, alpha: 1)

        setupWebView()
        setupConstraints()
        loadHTML()
    }

    override var preferredStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }

    // MARK: - WebView Setup

    private func setupWebView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsAirPlayForMediaPlayback = true
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let hapticScript = WKUserScript(
            source: """
            (function() {
                window.__ios_bridge = true;
                window.webkit.messageHandlers.hapticHandler.postMessage({pattern: 'ready'});
            })();
            """,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(hapticScript)
        config.userContentController.add(self, name: "hapticHandler")

        webView = WKWebView(frame: .zero, configuration: config)
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 244 / 255, green: 241 / 255, blue: 234 / 255, alpha: 1)
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        view.addSubview(webView)

        progressObservation = webView.observe(\.estimatedProgress) { [weak self] _, _ in
            self?.updateProgress()
        }
    }

    private func setupConstraints() {
        webView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
    }

    // MARK: - Load HTML

    private func loadHTML() {
        guard let htmlURL = Bundle.main.url(forResource: "灵光", withExtension: "html") else {
            showError("无法加载应用资源")
            return
        }
        webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
    }

    // MARK: - Progress

    private func updateProgress() {
        if webView.estimatedProgress >= 1.0 {
            UIView.animate(withDuration: 0.3, delay: 0.1) {
                self.webView.evaluateJavaScript("document.body.style.opacity = '1'")
            }
        }
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        webView.evaluateJavaScript("document.body.style.opacity = '0'; document.body.style.transition = 'opacity 0.3s'")
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if navigationAction.navigationType == .formSubmitted || navigationAction.navigationType == .formResubmitted {
            decisionHandler(.allow)
            return
        }

        guard let url = navigationAction.request.url else {
            decisionHandler(.allow)
            return
        }

        if url.scheme == "http" || url.scheme == "https" {
            decisionHandler(.allow)
        } else {
            decisionHandler(.cancel)
        }
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "hapticHandler" {
            guard let body = message.body as? [String: Any],
                  let pattern = body["pattern"] as? String else { return }
            triggerHaptic(pattern)
        }
    }

    // MARK: - Haptic Feedback

    private func triggerHaptic(_ pattern: String) {
        switch pattern {
        case "light":
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
        case "medium":
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
        case "heavy":
            let generator = UIImpactFeedbackGenerator(style: .heavy)
            generator.impactOccurred()
        case "select":
            let generator = UISelectionFeedbackGenerator()
            generator.selectionChanged()
        case "success":
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.success)
        case "error":
            let generator = UINotificationFeedbackGenerator()
            generator.notificationOccurred(.error)
        case "camera":
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred(intensity: 0.8)
        case "delete":
            let generator = UIImpactFeedbackGenerator(style: .heavy)
            generator.impactOccurred(intensity: 0.6)
        default:
            let generator = UIImpactFeedbackGenerator(style: .light)
            generator.impactOccurred()
        }
    }

    // MARK: - WKUIDelegate (File Chooser)

    #if targetEnvironment(macCatalyst)
    func webView(
        _ webView: WKWebView,
        runOpenPanelWith parameters: WKOpenPanelParameters,
        for initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping ([URL]?) -> Void
    ) {
        let allowMultiple = parameters.allowsMultipleSelection
        let alert = UIAlertController(title: "选择图片", message: nil, preferredStyle: .actionSheet)

        if UIImagePickerController.isSourceTypeAvailable(.camera) {
            alert.addAction(UIAlertAction(title: "拍照", style: .default) { [weak self] _ in
                self?.presentImagePicker(source: .camera, allowMultiple: allowMultiple, completion: completionHandler)
            })
        }

        alert.addAction(UIAlertAction(title: "从相册选择", style: .default) { [weak self] _ in
            self?.presentImagePicker(source: .photoLibrary, allowMultiple: allowMultiple, completion: completionHandler)
        })

        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in
            completionHandler(nil)
        })

        present(alert, animated: true)
    }
    #endif

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "确定", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "确定", style: .default) { _ in completionHandler(true) })
        alert.addAction(UIAlertAction(title: "取消", style: .cancel) { _ in completionHandler(false) })
        present(alert, animated: true)
    }

    // MARK: - Image Picker

    private func presentImagePicker(source: UIImagePickerController.SourceType, allowMultiple: Bool, completion: @escaping ([URL]?) -> Void) {
        imagePickerCompletion = completion
        let picker = UIImagePickerController()
        picker.sourceType = source
        picker.allowsEditing = false
        picker.delegate = self
        present(picker, animated: true)
    }

    // MARK: - Error

    private func showError(_ message: String) {
        let label = UILabel()
        label.text = message
        label.textColor = .red
        label.textAlignment = .center
        label.frame = view.bounds
        view.addSubview(label)
    }
}

// MARK: - UIImagePickerControllerDelegate

extension ViewController: UIImagePickerControllerDelegate, UINavigationControllerDelegate {

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
        picker.dismiss(animated: true) { [weak self] in
            guard let self = self else { return }

            if let imageURL = info[.imageURL] as? URL {
                self.imagePickerCompletion?([imageURL])
            } else if let image = info[.originalImage] as? UIImage {
                let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent("upload_\(Date().timeIntervalSince1970).jpg")
                if let data = image.jpegData(compressionQuality: 0.85) {
                    try? data.write(to: tempURL)
                    self.imagePickerCompletion?([tempURL])
                } else {
                    self.imagePickerCompletion?(nil)
                }
            } else {
                self.imagePickerCompletion?(nil)
            }
            self.imagePickerCompletion = nil
        }
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true) { [weak self] in
            self?.imagePickerCompletion?(nil)
            self?.imagePickerCompletion = nil
        }
    }
}
