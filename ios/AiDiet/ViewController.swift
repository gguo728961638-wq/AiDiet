import UIKit
import WebKit
import AVFoundation

class ViewController: UIViewController, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandler {

    private var webView: WKWebView!
    private var progressObservation: NSKeyValueObservation?
    private var imagePickerCompletion: (([URL]?) -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 244 / 255, green: 241 / 255, blue: 234 / 255, alpha: 1)

        AVCaptureDevice.requestAccess(for: .video) { _ in }

        setupWebView()
        setupConstraints()
        loadHTML()
    }

    override var prefersStatusBarHidden: Bool { true }
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

        /* 在页面脚本执行前注入原生存储数据，供 loadState() 读取 */
        var storageJSON = "null"
        if let data = try? Data(contentsOf: storageFileURL),
           let json = String(data: data, encoding: .utf8) {
            storageJSON = "'" + json.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'") + "'"
        }
        let storageScript = WKUserScript(
            source: "window.__nativeStorageData = \(storageJSON);",
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(storageScript)

        config.userContentController.add(self, name: "hapticHandler")
        config.userContentController.add(self, name: "storageHandler")

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
        guard let htmlURL = Bundle.main.url(forResource: "index", withExtension: "html") else {
            showError("无法加载应用资源")
            return
        }
        var html = (try? String(contentsOf: htmlURL, encoding: .utf8)) ?? ""
        /* 将 src / data-photo 的相对路径转为绝对 file:// URL，确保图片在 WKWebView 中可加载 */
        let bundlePath = htmlURL.deletingLastPathComponent().path
        html = html.replacingOccurrences(of: "src=\"assets/", with: "src=\"file://\(bundlePath)/assets/")
        html = html.replacingOccurrences(of: "src='assets/", with: "src='file://\(bundlePath)/assets/")
        html = html.replacingOccurrences(of: "data-photo=\"assets/", with: "data-photo=\"file://\(bundlePath)/assets/")
        /* JS 数据中的 "assets/ 路径（如 image 字段）也转为绝对路径 */
        html = html.replacingOccurrences(of: "\"assets/", with: "\"file://\(bundlePath)/assets/")
        html = html.replacingOccurrences(of: "'assets/", with: "'file://\(bundlePath)/assets/")

        /*
         * 写入临时文件后用 loadFileURL 加载，让页面获得 file:// origin，
         * 这样 JS 中的 fetch(file://) 和 <img src="file://"> 都能正常工作。
         * loadHTMLString 的 about:blank origin 会阻止 file:// 资源加载。
         */
        let tempDir = FileManager.default.temporaryDirectory
        let tempHTML = tempDir.appendingPathComponent("aiDiet_\(ProcessInfo.processInfo.processIdentifier).html")
        try? html.write(to: tempHTML, atomically: true, encoding: .utf8)

        /* 保持与原始 bundle 相同的目录层级，确保相对路径解析一致 */
        let baseURL = htmlURL.deletingLastPathComponent()
        webView.loadFileURL(tempHTML, allowingReadAccessTo: baseURL)
    }

    // MARK: - Progress

    private func updateProgress() {
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Page is visible, no opacity tricks needed
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

        if url.scheme == "http" || url.scheme == "https" || url.scheme == "file" {
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
        } else if message.name == "storageHandler" {
            guard let body = message.body as? [String: Any],
                  let action = body["action"] as? String else { return }
            handleStorage(action: action, body: body)
        }
    }

    // MARK: - Native Storage

    private var storageFileURL: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return docs.appendingPathComponent("aiDietAppState.json")
    }

    private func handleStorage(action: String, body: [String: Any]) {
        switch action {
        case "save":
            if var json = body["data"] as? String {
                /* 将 base64 图片存为文件，避免状态数据过大被截断 */
                json = extractAndSaveImages(from: json)
                try? json.write(to: storageFileURL, atomically: true, encoding: .utf8)
                let js = "window.__storageCallback && window.__storageCallback(true)"
                webView.evaluateJavaScript(js)
            }
        case "load":
            if let data = try? Data(contentsOf: storageFileURL),
               let json = String(data: data, encoding: .utf8) {
                let escaped = json.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "'", with: "\\'")
                let js = "window.__storageCallback && window.__storageCallback('\(escaped)')"
                webView.evaluateJavaScript(js)
            } else {
                let js = "window.__storageCallback && window.__storageCallback(null)"
                webView.evaluateJavaScript(js)
            }
        default:
            break
        }
    }

    /// 扫描 JSON 中的 base64 图片数据，保存为文件后替换为 file:// 路径
    private func extractAndSaveImages(from json: String) -> String {
        guard var obj = try? JSONSerialization.jsonObject(with: Data(json.utf8)) as? [String: Any] else { return json }

        let imagesDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("meal_images")
        try? FileManager.default.createDirectory(at: imagesDir, withIntermediateDirectories: true)

        let imageKeys = ["image"]
        var result = json

        func processItem(_ item: inout [String: Any]) {
            for key in imageKeys {
                guard let value = item[key] as? String,
                      value.hasPrefix("data:image/") else { continue }
                let ts = Int(Date().timeIntervalSince1970 * 1000)
                let filename = "\(ts)_\(Int.random(in: 1000...9999)).jpg"
                let fileURL = imagesDir.appendingPathComponent(filename)
                if let data = Data(base64Encoded: String(value.dropFirst(value.firstIndex(of: ",")!.utf16Offset(in: value) + 1))) {
                    try? data.write(to: fileURL)
                    let path = fileURL.absoluteString
                    result = result.replacingOccurrences(of: value, with: path)
                }
            }
        }

        if var pending = obj["pendingRecognition"] as? [String: Any] { processItem(&pending); obj["pendingRecognition"] = pending }
        if var meals = obj["meals"] as? [[String: Any]] {
            for i in meals.indices { processItem(&meals[i]) }
            obj["meals"] = meals
        }
        if var history = obj["mealHistory"] as? [String: [[String: Any]]] {
            for (day, var dayMeals) in history {
                for i in dayMeals.indices { processItem(&dayMeals[i]) }
                history[day] = dayMeals
            }
            obj["mealHistory"] = history
        }
        if let newData = try? JSONSerialization.data(withJSONObject: obj),
           let newJSON = String(data: newData, encoding: .utf8) { return newJSON }
        return result
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
        initiatedByFrame frame: WKFrameInfo,
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
