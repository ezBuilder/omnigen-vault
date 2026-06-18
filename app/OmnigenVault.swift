// OmnigenVault — native macOS menu-bar controller for the omnigen-vault generator.
//
// Lean menu for quick actions (start/stop toggle, word generation,
// gallery, open folder) + a Settings window for configuration (save location,
// concurrency, resolution, OCR, disk ceiling, launch-at-login, auto-start).
// The generator runs as a child node process and is always stopped when the app
// quits. Settings persist in UserDefaults; the save location uses a plain
// bookmark (the app is non-sandboxed, so no security-scoped bookmarks).
import Cocoa
import Darwin
import ServiceManagement

final class AppDelegate: NSObject, NSApplicationDelegate, NSMenuDelegate, NSWindowDelegate {
  // MARK: state
  private var statusItem: NSStatusItem!
  private var worker: Process?
  private var workerLog = "" // bounded capture of generate output to surface auth/disk failures
  private var activeCount = -1
  private var theme: String?
  private var lastMilestone = -1
  private var pollTimer: Timer?

  // settings (persisted)
  private var vaultRoot = Paths.defaultVaultRoot
  private var concurrency = 16
  private var size = "auto-category"
  private var ocr = true
  private var maxDisk = 90
  private var autoStartGeneration = false
  private var showCountInTray = true
  private var publicHostname = "" // Cloudflare custom domain for the gallery (named tunnel)
  private let namedTunnelName = "omnigen"

  private let concurrencyChoices = [4, 8, 16, 24, 32, 48, 64]
  private let diskChoices = [80, 85, 90, 95]
  private let sizeChoices: [(label: String, value: String)] = [
    ("카테고리 자동", "auto-category"), ("정사각 1024", "square"), ("가로 3:2", "landscape"),
    ("세로 2:3", "portrait"), ("HD 16:9", "hd"), ("FHD 16:9", "fhd"),
    ("QHD 16:9", "qhd"), ("UHD 4K", "uhd"), ("세로 4K", "uhd-portrait")
  ]

  // web server / public tunnel
  private var serverProc: Process?
  private var tunnelProc: Process?
  private var publicURL: String?
  private let servePort = 8787

  // menu item refs
  private var statusRow: NSMenuItem!
  private var toggleItem: NSMenuItem!
  private var themeItem: NSMenuItem!
  private var serverItem: NSMenuItem!
  private var urlItem: NSMenuItem!

  // settings window + controls
  private var settingsWC: NSWindowController?
  private var vaultPathField: NSTextField?
  private var concurrencyPop: NSPopUpButton?
  private var sizePop: NSPopUpButton?
  private var ocrCheck: NSButton?
  private var diskPop: NSPopUpButton?
  private var loginCheck: NSButton?
  private var autoStartCheck: NSButton?
  private var showCountCheck: NSButton?
  private var hostField: NSTextField?

  // derived paths
  private var dbPath: String { vaultRoot + "/index.sqlite" }
  private var galleryPath: String { vaultRoot + "/gallery.html" }

  // MARK: lifecycle
  func applicationDidFinishLaunching(_ notification: Notification) {
    UserDefaults.standard.register(defaults: [
      "concurrency": 16, "size": "auto-category", "ocr": true, "maxDisk": 90, "autoStartGen": false,
      "showCount": true, "publicHostname": ""
    ])
    loadSettings()
    vaultRoot = resolveVaultRoot()

    statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    buildMenu()
    refreshCount()
    pollTimer = Timer.scheduledTimer(withTimeInterval: 2.0, repeats: true) { [weak self] _ in self?.refreshCount() }
    updateUI()

    if autoStartGeneration && vaultReachable() {
      startAll()
    }
  }

  // MARK: settings persistence
  private func loadSettings() {
    let d = UserDefaults.standard
    concurrency = d.integer(forKey: "concurrency")
    if !concurrencyChoices.contains(concurrency) { concurrency = 16 }
    size = d.string(forKey: "size") ?? "auto-category"
    ocr = d.bool(forKey: "ocr")
    maxDisk = d.integer(forKey: "maxDisk"); if maxDisk == 0 { maxDisk = 90 }
    autoStartGeneration = d.bool(forKey: "autoStartGen")
    showCountInTray = d.bool(forKey: "showCount")
    publicHostname = d.string(forKey: "publicHostname") ?? ""
  }

  private func saveSettings() {
    let d = UserDefaults.standard
    d.set(concurrency, forKey: "concurrency")
    d.set(size, forKey: "size")
    d.set(ocr, forKey: "ocr")
    d.set(maxDisk, forKey: "maxDisk")
    d.set(autoStartGeneration, forKey: "autoStartGen")
    d.set(showCountInTray, forKey: "showCount")
    d.set(publicHostname, forKey: "publicHostname")
  }

  private func resolveVaultRoot() -> String {
    guard let data = UserDefaults.standard.data(forKey: "vaultBookmark") else { return Paths.defaultVaultRoot }
    var stale = false
    if let url = try? URL(resolvingBookmarkData: data, options: [], relativeTo: nil, bookmarkDataIsStale: &stale) {
      if stale, let fresh = try? url.bookmarkData() { UserDefaults.standard.set(fresh, forKey: "vaultBookmark") }
      return url.path
    }
    return Paths.defaultVaultRoot
  }

  private func vaultReachable() -> Bool {
    // the parent mount must exist (external disk may be unplugged)
    let mount = (vaultRoot as NSString).deletingLastPathComponent
    return FileManager.default.fileExists(atPath: mount)
  }

  // MARK: SF Symbol helper
  private func sym(_ name: String, _ a11y: String) -> NSImage? {
    let cfg = NSImage.SymbolConfiguration(pointSize: 14, weight: .regular)
    let img = NSImage(systemSymbolName: name, accessibilityDescription: a11y)?.withSymbolConfiguration(cfg)
    img?.isTemplate = true
    return img
  }

  // MARK: menu
  private func buildMenu() {
    let menu = NSMenu()
    menu.delegate = self

    statusRow = NSMenuItem(title: "정지됨", action: nil, keyEquivalent: "")
    statusRow.isEnabled = false
    menu.addItem(statusRow)
    menu.addItem(.separator())

    toggleItem = NSMenuItem(title: "시작 (전체 종류)", action: #selector(toggleGeneration), keyEquivalent: "s")
    toggleItem.target = self
    toggleItem.image = sym("play.fill", "시작")
    menu.addItem(toggleItem)

    themeItem = NSMenuItem(title: "단어로 생성…", action: #selector(promptForTheme), keyEquivalent: "")
    themeItem.target = self
    themeItem.image = sym("character.textbox", "단어로 생성")
    menu.addItem(themeItem)

    menu.addItem(.separator())

    let galleryItem = NSMenuItem(title: "갤러리 만들기 / 열기", action: #selector(makeGallery), keyEquivalent: "g")
    galleryItem.target = self
    galleryItem.image = sym("photo.on.rectangle.angled", "갤러리")
    menu.addItem(galleryItem)

    let openItem = NSMenuItem(title: "저장 폴더 열기", action: #selector(openVaultFolder), keyEquivalent: "o")
    openItem.target = self
    openItem.image = sym("folder", "저장 폴더 열기")
    menu.addItem(openItem)

    menu.addItem(.separator())

    serverItem = NSMenuItem(title: "외부 웹 공개 시작", action: #selector(toggleServer), keyEquivalent: "")
    serverItem.target = self
    serverItem.image = sym("globe", "외부 웹 공개")
    menu.addItem(serverItem)

    urlItem = NSMenuItem(title: "공개 URL 복사", action: #selector(copyPublicURL), keyEquivalent: "")
    urlItem.target = self
    urlItem.image = sym("link", "URL 복사")
    urlItem.isHidden = true
    menu.addItem(urlItem)

    menu.addItem(.separator())

    let settingsItem = NSMenuItem(title: "설정…", action: #selector(openSettings), keyEquivalent: ",")
    settingsItem.target = self
    settingsItem.image = sym("gearshape", "설정")
    menu.addItem(settingsItem)

    let quitItem = NSMenuItem(title: "종료", action: #selector(quitApp), keyEquivalent: "q")
    quitItem.target = self
    quitItem.image = sym("power", "종료")
    menu.addItem(quitItem)

    statusItem.menu = menu
  }

  func menuWillOpen(_ menu: NSMenu) { refreshCount() }

  // MARK: generation control
  @objc private func toggleGeneration() {
    if worker?.isRunning ?? false { stopGeneration() } else { startAll() }
  }

  @objc private func startAll() {
    theme = nil
    startGeneration()
  }

  @objc private func promptForTheme() {
    guard worker == nil else { return }
    let alert = NSAlert()
    alert.messageText = "단어/문구로 생성"
    alert.informativeText = "예: a cute cat, 고양이, neon city — 쉼표로 여러 개. 그 단어를 온갖 스타일로 무한 생성합니다."
    alert.addButton(withTitle: "생성 시작")
    alert.addButton(withTitle: "취소")
    let field = NSTextField(frame: NSRect(x: 0, y: 0, width: 260, height: 24))
    alert.accessoryView = field
    NSApp.activate(ignoringOtherApps: true)
    if alert.runModal() == .alertFirstButtonReturn {
      let t = field.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
      if !t.isEmpty { theme = t; startGeneration() }
    }
  }

  private func nodeProcess(_ subArgs: [String]) -> Process {
    let proc = Process()
    proc.executableURL = URL(fileURLWithPath: Paths.nodePath)
    proc.arguments = ["\(Paths.projectDir)/bin/omnigen"] + subArgs
    proc.currentDirectoryURL = URL(fileURLWithPath: Paths.projectDir)
    var env = ProcessInfo.processInfo.environment
    env["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:" + (env["PATH"] ?? "")
    proc.environment = env
    proc.standardOutput = FileHandle.nullDevice
    proc.standardError = FileHandle.nullDevice
    return proc
  }

  private func startGeneration() {
    guard worker == nil else { return }
    guard vaultReachable() else {
      notify("저장 디스크를 찾을 수 없습니다: \(vaultRoot)")
      return
    }
    var args = ["generate", "--vault", vaultRoot, "--concurrency", String(concurrency),
                "--size", size, "--max-disk", String(maxDisk)]
    if let t = theme { args += ["--theme", t] }
    if !ocr { args.append("--no-ocr") }
    let proc = nodeProcess(args)
    // Capture output (the generator exits 0 even when every request is 401, printing
    // "UNAUTHORIZED" to stdout); without this the app would silently flip back to stopped.
    let outPipe = Pipe()
    proc.standardOutput = outPipe
    proc.standardError = outPipe
    workerLog = ""
    outPipe.fileHandleForReading.readabilityHandler = { [weak self] h in
      let data = h.availableData
      guard !data.isEmpty, let s = String(data: data, encoding: .utf8) else { return }
      DispatchQueue.main.async {
        guard let self = self else { return }
        if self.workerLog.utf8.count < 64_000 { self.workerLog += s }
      }
    }
    proc.terminationHandler = { [weak self] _ in
      DispatchQueue.main.async {
        guard let self = self else { return }
        self.worker = nil
        outPipe.fileHandleForReading.readabilityHandler = nil
        if self.workerLog.contains("UNAUTHORIZED") {
          self.notify("Codex 인증 만료 — 생성을 시작하지 못했습니다. 터미널에서 'codex login' 후 다시 시작하세요.")
        } else if self.diskUsedPercent() ?? 0 >= Double(self.maxDisk) {
          self.notify("디스크 사용 상한(\(self.maxDisk)%) 도달로 생성을 멈췄습니다.")
        }
        self.updateUI()
      }
    }
    do { try proc.run(); worker = proc } catch {
      let a = NSAlert(); a.messageText = "시작 실패"; a.informativeText = error.localizedDescription; a.runModal()
    }
    updateUI()
  }

  @objc private func stopGeneration() {
    guard let proc = worker, proc.isRunning else { return }
    proc.interrupt() // SIGINT → fast abort of in-flight requests + cursor save
    DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in
      if let p = self?.worker, p.isRunning { p.interrupt() } // 2nd signal forces exit
    }
    updateUI()
  }

  private func stopGenerationSync() {
    guard let proc = worker, proc.isRunning else { return }
    proc.interrupt()
    let deadline = Date().addingTimeInterval(8)
    while proc.isRunning && Date() < deadline { RunLoop.current.run(until: Date().addingTimeInterval(0.1)) }
    if proc.isRunning { proc.interrupt(); RunLoop.current.run(until: Date().addingTimeInterval(0.5)) }
  }

  // MARK: gallery / folder
  @objc private func makeGallery() {
    let p = nodeProcess(["gallery", "--vault", vaultRoot])
    p.terminationHandler = { [weak self] _ in
      DispatchQueue.main.async { self?.openIfExists(self?.galleryPath) }
    }
    try? p.run()
  }

  private func openIfExists(_ path: String?) {
    guard let path = path, FileManager.default.fileExists(atPath: path) else { return }
    NSWorkspace.shared.open(URL(fileURLWithPath: path))
  }

  @objc private func openVaultFolder() {
    NSWorkspace.shared.open(URL(fileURLWithPath: vaultRoot, isDirectory: true))
  }

  // MARK: web server + public Cloudflare tunnel
  private func findExecutable(_ name: String) -> String? {
    let candidates = ["\(NSHomeDirectory())/.local/bin/\(name)", "/opt/homebrew/bin/\(name)", "/usr/local/bin/\(name)", "/usr/bin/\(name)"]
    return candidates.first { FileManager.default.isExecutableFile(atPath: $0) }
  }

  @objc private func toggleServer() {
    if serverProc?.isRunning ?? false { stopServer() } else { startServer() }
  }

  private func startServer() {
    guard serverProc == nil else { return }
    guard vaultReachable() else { notify("저장 디스크를 찾을 수 없습니다."); return }
    // 1) hardened public server — READ-ONLY (no public write-back; ratings are owner-only, set locally)
    let s = nodeProcess(["serve", "--public", "--port", String(servePort), "--vault", vaultRoot])
    s.terminationHandler = { [weak self] _ in DispatchQueue.main.async { self?.serverProc = nil; self?.stopServer(); self?.updateUI() } }
    do { try s.run(); serverProc = s } catch { notify("웹 서버 시작 실패: \(error.localizedDescription)"); return }

    // 2) Cloudflare tunnel for external access. A configured custom domain uses a
    //    named tunnel (stable hostname, immune to the Mac's public IP changing);
    //    otherwise a quick tunnel with an ephemeral trycloudflare.com URL.
    if let cf = findExecutable("cloudflared") {
      let host = publicHostname.trimmingCharacters(in: .whitespacesAndNewlines)
      if host.isEmpty {
        runQuickTunnel(cf)
      } else if cloudflaredLoggedIn() {
        runNamedTunnel(cf, host: host)
      } else {
        notify("Cloudflare 로그인이 필요합니다 — 터미널에서 'cloudflared tunnel login' 후 다시 시작하세요. 임시 URL로 공개합니다.")
        runQuickTunnel(cf)
      }
    } else {
      notify("cloudflared가 없어 로컬만 공개됩니다. 'brew install cloudflared' 후 다시 시작하세요. (http://localhost:\(servePort))")
    }
    updateUI()
  }

  private func cloudflaredLoggedIn() -> Bool {
    FileManager.default.fileExists(atPath: "\(NSHomeDirectory())/.cloudflared/cert.pem")
  }

  // Quick tunnel: ephemeral random trycloudflare.com hostname, parsed from stdout.
  private func runQuickTunnel(_ cf: String) {
    let t = Process()
    t.executableURL = URL(fileURLWithPath: cf)
    t.arguments = ["tunnel", "--url", "http://localhost:\(servePort)"]
    let pipe = Pipe()
    t.standardOutput = pipe
    t.standardError = pipe
    pipe.fileHandleForReading.readabilityHandler = { [weak self] h in
      let s = String(data: h.availableData, encoding: .utf8) ?? ""
      if let r = s.range(of: "https://[a-z0-9-]+\\.trycloudflare\\.com", options: .regularExpression) {
        let url = String(s[r])
        DispatchQueue.main.async {
          if self?.publicURL != url {
            self?.publicURL = url
            self?.updateUI()
            self?.openWhenReady(url) // open the browser only once the tunnel actually serves
          }
        }
      }
    }
    t.terminationHandler = { [weak self] _ in DispatchQueue.main.async { self?.tunnelProc = nil; self?.publicURL = nil; self?.updateUI() } }
    do { try t.run(); tunnelProc = t } catch { notify("cloudflared 실행 실패") }
  }

  // Named tunnel: routes the configured custom domain to localhost. The hostname is
  // fixed by DNS, so it stays valid even when the Mac's public IP changes.
  private func runNamedTunnel(_ cf: String, host: String) {
    let t = Process()
    t.executableURL = URL(fileURLWithPath: cf)
    t.arguments = ["tunnel", "run", "--url", "http://localhost:\(servePort)", namedTunnelName]
    t.standardOutput = FileHandle.nullDevice
    t.standardError = FileHandle.nullDevice
    t.terminationHandler = { [weak self] _ in DispatchQueue.main.async { self?.tunnelProc = nil; self?.publicURL = nil; self?.updateUI() } }
    do {
      try t.run(); tunnelProc = t
      let url = "https://\(host)"
      publicURL = url
      updateUI()
      openWhenReady(url) // poll the domain until tunnel + DNS are live, then open
    } catch { notify("cloudflared 실행 실패") }
  }

  // The trycloudflare hostname is printed before the edge can route to the origin;
  // opening it immediately lands on a Cloudflare error page. Poll the URL and open the
  // browser only once it returns a real response. Give up and open anyway after ~60s.
  private func openWhenReady(_ urlString: String, attempt: Int = 0) {
    guard let url = URL(string: urlString) else { return }
    // Bail if the tunnel was stopped or replaced while we were waiting.
    guard publicURL == urlString, tunnelProc != nil else { return }
    if attempt >= 40 { NSWorkspace.shared.open(url); return }
    var req = URLRequest(url: url)
    req.timeoutInterval = 6
    req.cachePolicy = .reloadIgnoringLocalCacheData
    URLSession.shared.dataTask(with: req) { [weak self] _, resp, err in
      DispatchQueue.main.async {
        guard let self = self, self.publicURL == urlString, self.tunnelProc != nil else { return }
        if err == nil, let http = resp as? HTTPURLResponse, (200..<400).contains(http.statusCode) {
          NSWorkspace.shared.open(url) // tunnel is live — open the gallery once
        } else {
          DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            self.openWhenReady(urlString, attempt: attempt + 1)
          }
        }
      }
    }.resume()
  }

  private func stopServer() {
    tunnelProc?.terminate(); tunnelProc = nil
    serverProc?.interrupt(); serverProc?.terminate(); serverProc = nil
    publicURL = nil
    updateUI()
  }

  private func stopServerSync() {
    tunnelProc?.terminate(); serverProc?.terminate()
    tunnelProc = nil; serverProc = nil; publicURL = nil
  }

  @objc private func copyPublicURL() {
    let url = publicURL ?? "http://localhost:\(servePort)"
    NSPasteboard.general.clearContents()
    NSPasteboard.general.setString(url, forType: .string)
    notify("URL 복사됨: \(url)")
  }

  // MARK: settings window
  @objc private func openSettings() {
    if settingsWC == nil { settingsWC = makeSettingsWindow() }
    syncSettingsControls()
    NSApp.setActivationPolicy(.regular)
    if #available(macOS 14, *) { NSApp.activate() } else { NSApp.activate(ignoringOtherApps: true) }
    DispatchQueue.main.async { [weak self] in
      self?.settingsWC?.window?.makeKeyAndOrderFront(nil)
      self?.settingsWC?.window?.orderFrontRegardless()
    }
  }

  private func appVersionString() -> String {
    let info = Bundle.main.infoDictionary
    let short = (info?["CFBundleShortVersionString"] as? String) ?? "?"
    let build = (info?["CFBundleVersion"] as? String) ?? "?"
    return "\(short) (build \(build))"
  }

  private func row(_ label: String, _ control: NSView) -> NSStackView {
    let l = NSTextField(labelWithString: label)
    l.alignment = .right
    l.translatesAutoresizingMaskIntoConstraints = false
    l.widthAnchor.constraint(equalToConstant: 150).isActive = true
    let s = NSStackView(views: [l, control])
    s.orientation = .horizontal
    s.spacing = 10
    s.alignment = .centerY
    return s
  }

  private func makeSettingsWindow() -> NSWindowController {
    let win = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 460, height: 432),
                       styleMask: [.titled, .closable, .miniaturizable],
                       backing: .buffered, defer: false)
    win.title = "Omnigen 설정"
    win.isReleasedWhenClosed = false // default true crashes on 2nd open
    win.setFrameAutosaveName("OmnigenSettings")
    win.delegate = self
    win.center()

    let vaultField = NSTextField(labelWithString: vaultRoot)
    vaultField.lineBreakMode = .byTruncatingMiddle
    vaultField.translatesAutoresizingMaskIntoConstraints = false
    vaultField.widthAnchor.constraint(equalToConstant: 200).isActive = true
    self.vaultPathField = vaultField
    let chooseBtn = NSButton(title: "변경…", target: self, action: #selector(chooseVault))
    let vaultStack = NSStackView(views: [vaultField, chooseBtn]); vaultStack.spacing = 8

    let cPop = NSPopUpButton(); cPop.addItems(withTitles: concurrencyChoices.map { "\($0)개 동시" })
    cPop.target = self; cPop.action = #selector(changeConcurrency(_:)); self.concurrencyPop = cPop

    let sPop = NSPopUpButton(); sPop.addItems(withTitles: sizeChoices.map { $0.label })
    sPop.target = self; sPop.action = #selector(changeSize(_:)); self.sizePop = sPop

    let oCheck = NSButton(checkboxWithTitle: "글자 검사 (OCR) 사용", target: self, action: #selector(changeOCR(_:)))
    self.ocrCheck = oCheck

    let dPop = NSPopUpButton(); dPop.addItems(withTitles: diskChoices.map { "\($0)% 까지 사용" })
    dPop.target = self; dPop.action = #selector(changeDisk(_:)); self.diskPop = dPop

    let lCheck = NSButton(checkboxWithTitle: "로그인 시 자동 실행", target: self, action: #selector(toggleLoginItem(_:)))
    self.loginCheck = lCheck

    let aCheck = NSButton(checkboxWithTitle: "앱 시작 시 생성 자동 시작", target: self, action: #selector(toggleAutoStart(_:)))
    self.autoStartCheck = aCheck

    let scCheck = NSButton(checkboxWithTitle: "트레이에 이미지 장수 표시", target: self, action: #selector(changeShowCount(_:)))
    self.showCountCheck = scCheck

    let hField = NSTextField(string: publicHostname)
    hField.placeholderString = "gallery.example.com"
    hField.target = self; hField.action = #selector(changePublicHostname(_:))
    hField.translatesAutoresizingMaskIntoConstraints = false
    hField.widthAnchor.constraint(equalToConstant: 220).isActive = true
    self.hostField = hField

    let verLabel = NSTextField(labelWithString: appVersionString())
    verLabel.textColor = .secondaryLabelColor

    let stack = NSStackView(views: [
      row("저장 위치", vaultStack),
      row("동시 생성 수", cPop),
      row("해상도", sPop),
      row("", oCheck),
      row("디스크 사용 상한", dPop),
      row("", lCheck),
      row("", aCheck),
      row("", scCheck),
      row("공개 도메인", hField),
      row("버전", verLabel)
    ])
    stack.orientation = .vertical
    stack.alignment = .leading
    stack.spacing = 12
    stack.translatesAutoresizingMaskIntoConstraints = false

    let content = NSView()
    content.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: 20),
      stack.trailingAnchor.constraint(lessThanOrEqualTo: content.trailingAnchor, constant: -20),
      stack.topAnchor.constraint(equalTo: content.topAnchor, constant: 20)
    ])
    win.contentView = content
    return NSWindowController(window: win)
  }

  private func syncSettingsControls() {
    vaultPathField?.stringValue = vaultRoot
    concurrencyPop?.selectItem(at: concurrencyChoices.firstIndex(of: concurrency) ?? 2)
    sizePop?.selectItem(at: sizeChoices.firstIndex(where: { $0.value == size }) ?? 0)
    ocrCheck?.state = ocr ? .on : .off
    diskPop?.selectItem(at: diskChoices.firstIndex(of: maxDisk) ?? 2)
    autoStartCheck?.state = autoStartGeneration ? .on : .off
    loginCheck?.state = loginEnabled() ? .on : .off
    showCountCheck?.state = showCountInTray ? .on : .off
    hostField?.stringValue = publicHostname
  }

  @objc private func changeConcurrency(_ s: NSPopUpButton) { concurrency = concurrencyChoices[s.indexOfSelectedItem]; saveSettings() }
  @objc private func changeSize(_ s: NSPopUpButton) { size = sizeChoices[s.indexOfSelectedItem].value; saveSettings() }
  @objc private func changeOCR(_ b: NSButton) { ocr = (b.state == .on); saveSettings() }
  @objc private func changeDisk(_ s: NSPopUpButton) { maxDisk = diskChoices[s.indexOfSelectedItem]; saveSettings(); updateUI() }
  @objc private func toggleAutoStart(_ b: NSButton) { autoStartGeneration = (b.state == .on); saveSettings() }
  @objc private func changeShowCount(_ b: NSButton) { showCountInTray = (b.state == .on); saveSettings(); updateUI() }
  @objc private func changePublicHostname(_ f: NSTextField) { publicHostname = f.stringValue.trimmingCharacters(in: .whitespacesAndNewlines); saveSettings() }

  @objc private func chooseVault() {
    let panel = NSOpenPanel()
    panel.canChooseDirectories = true
    panel.canChooseFiles = false
    panel.allowsMultipleSelection = false
    panel.canCreateDirectories = true
    panel.prompt = "선택"
    panel.message = "이미지를 저장할 폴더를 선택하세요 (외장 디스크 권장)."
    NSApp.activate(ignoringOtherApps: true)
    guard panel.runModal() == .OK, let url = panel.url else { return }
    if let err = validateVault(url) {
      let a = NSAlert(); a.messageText = "사용할 수 없는 폴더"; a.informativeText = err; a.runModal(); return
    }
    if let data = try? url.bookmarkData() { UserDefaults.standard.set(data, forKey: "vaultBookmark") }
    vaultRoot = url.path
    vaultPathField?.stringValue = vaultRoot
    updateUI()
  }

  private func validateVault(_ url: URL) -> String? {
    if let rv = try? url.resourceValues(forKeys: [.volumeIsReadOnlyKey]), rv.volumeIsReadOnly == true {
      return "읽기 전용 볼륨입니다."
    }
    var sVault = stat(), sRoot = stat()
    if stat(url.path, &sVault) == 0, stat("/", &sRoot) == 0, sVault.st_dev == sRoot.st_dev {
      return "시스템(부팅) 볼륨에는 저장할 수 없습니다. 외장 디스크를 선택하세요."
    }
    let probe = url.appendingPathComponent(".omnigen-write-probe-\(UUID().uuidString)")
    do { try Data().write(to: probe); try FileManager.default.removeItem(at: probe) } catch { return "쓰기 권한이 없습니다." }
    return nil
  }

  // MARK: launch at login (SMAppService — macOS 13+)
  private func loginEnabled() -> Bool {
    if #available(macOS 13, *) { return SMAppService.mainApp.status == .enabled }
    return false
  }

  @objc private func toggleLoginItem(_ b: NSButton) {
    guard #available(macOS 13, *) else {
      b.state = .off
      let a = NSAlert(); a.messageText = "지원되지 않음"; a.informativeText = "로그인 항목은 macOS 13 이상이 필요합니다."; a.runModal()
      return
    }
    do {
      if b.state == .on { try SMAppService.mainApp.register() } else { try SMAppService.mainApp.unregister() }
    } catch {
      NSLog("login item error: \(error)")
      let a = NSAlert(); a.messageText = "로그인 항목 변경 실패"
      a.informativeText = "\(error.localizedDescription)\n\n로컬 빌드(미서명) 앱은 로그인 항목이 불안정할 수 있습니다."
      a.runModal()
    }
    if SMAppService.mainApp.status == .requiresApproval {
      SMAppService.openSystemSettingsLoginItems()
    }
    b.state = loginEnabled() ? .on : .off
  }

  // MARK: notifications (osascript — UNUserNotificationCenter crashes in unsigned apps)
  private func notify(_ message: String) {
    let safe = message.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"")
    let p = Process()
    p.executableURL = URL(fileURLWithPath: "/usr/bin/osascript")
    p.arguments = ["-e", "display notification \"\(safe)\" with title \"Omnigen Vault\""]
    try? p.run()
  }

  // MARK: status
  private func diskUsedPercent() -> Double? {
    var s = statfs()
    if statfs(vaultRoot, &s) == 0 {
      let total = Double(s.f_blocks) * Double(s.f_bsize)
      let avail = Double(s.f_bavail) * Double(s.f_bsize)
      if total > 0 { return (total - avail) / total * 100 }
    }
    return nil
  }

  private func refreshCount() {
    let path = dbPath
    DispatchQueue.global(qos: .utility).async { [weak self] in
      let count = AppDelegate.readActiveCount(path)
      DispatchQueue.main.async {
        guard let self = self else { return }
        self.activeCount = count
        self.checkMilestone(count)
        self.updateUI()
      }
    }
  }

  private func checkMilestone(_ count: Int) {
    guard count >= 0 else { return }
    let step = 1000
    let m = (count / step) * step
    if lastMilestone < 0 { lastMilestone = m; return } // baseline, don't fire on launch
    if m > lastMilestone && m >= step {
      lastMilestone = m
      notify("\(m.formatted())장 생성 완료 🎉")
    }
  }

  private static func readActiveCount(_ dbPath: String) -> Int {
    guard FileManager.default.fileExists(atPath: dbPath) else { return 0 }
    let proc = Process()
    proc.executableURL = URL(fileURLWithPath: Paths.sqlitePath)
    proc.arguments = ["-cmd", "PRAGMA busy_timeout=2000;", dbPath, "SELECT COUNT(*) FROM images WHERE status='active';"]
    let pipe = Pipe(); proc.standardOutput = pipe; proc.standardError = FileHandle.nullDevice
    do {
      try proc.run()
      let data = pipe.fileHandleForReading.readDataToEndOfFile()
      proc.waitUntilExit()
      // `-cmd "PRAGMA ..."` prints the pragma's value on its own line before the
      // query result, so take the LAST integer line, not the whole output.
      if let text = String(data: data, encoding: .utf8) {
        let nums = text.split(whereSeparator: { $0 == "\n" || $0 == "\r" })
          .compactMap { Int($0.trimmingCharacters(in: .whitespaces)) }
        if let n = nums.last { return n }
      }
    } catch {}
    return -1
  }

  private func updateUI() {
    let running = (worker?.isRunning ?? false)
    let fmt = NumberFormatter(); fmt.numberStyle = .decimal
    let countStr = activeCount >= 0 ? (fmt.string(from: NSNumber(value: activeCount)) ?? "\(activeCount)") : "—"
    let diskPct = diskUsedPercent()
    let overDisk = (diskPct ?? 0) >= Double(maxDisk)

    if let button = statusItem.button {
      let glyph = running ? "wand.and.rays" : (overDisk ? "exclamationmark.triangle" : "wand.and.stars")
      let cfg = NSImage.SymbolConfiguration(pointSize: 14, weight: .regular).applying(.init(scale: .medium))
      let img = NSImage(systemSymbolName: glyph, accessibilityDescription: "Omnigen")?.withSymbolConfiguration(cfg)
      img?.isTemplate = true
      button.image = img
      button.title = (showCountInTray && activeCount >= 0) ? " \(countStr)" : ""
      button.imagePosition = .imageLeft
    }
    var diskTag = ""
    if let d = diskPct { diskTag = " · 디스크 \(Int(d))%/\(maxDisk)%" }
    let themeTag = (running && theme != nil) ? " · ‘\(theme!)’" : ""
    statusRow?.title = running ? "생성 중\(themeTag) · 총 \(countStr)장\(diskTag)" : "정지됨 · 총 \(countStr)장\(diskTag)"
    toggleItem?.title = running ? "중지" : "시작 (전체 종류)"
    toggleItem?.image = sym(running ? "stop.fill" : "play.fill", running ? "중지" : "시작")
    themeItem?.isEnabled = !running

    let serving = serverProc?.isRunning ?? false
    serverItem?.title = serving ? (publicURL != nil ? "외부 웹 공개 중지 (공개됨)" : "외부 웹 공개 중지") : "외부 웹 공개 시작"
    serverItem?.image = sym(serving ? "globe.badge.chevron.backward" : "globe", "외부 웹")
    if let u = publicURL, serving {
      urlItem?.isHidden = false
      urlItem?.title = "공개 URL 복사 — \(u.replacingOccurrences(of: "https://", with: ""))"
    } else if serving {
      urlItem?.isHidden = false
      urlItem?.title = "로컬 URL 복사 — localhost:\(servePort)"
    } else {
      urlItem?.isHidden = true
    }
  }

  // MARK: quit / window
  @objc private func quitApp() {
    stopServerSync()
    stopGenerationSync()
    NSApp.terminate(nil)
  }

  func applicationWillTerminate(_ notification: Notification) { stopServerSync(); stopGenerationSync() }

  func windowWillClose(_ notification: Notification) {
    // Commit any text field still being edited (NSTextField only fires its action on
    // Return/Tab) so typing a value and closing the window persists it.
    (notification.object as? NSWindow)?.makeFirstResponder(nil)
    if let h = hostField?.stringValue.trimmingCharacters(in: .whitespacesAndNewlines), h != publicHostname {
      publicHostname = h
      saveSettings()
    }
    // back to menu-bar-only once Settings closes
    DispatchQueue.main.async { NSApp.setActivationPolicy(.accessory) }
  }
}

@main
enum OmnigenApp {
  static let delegate = AppDelegate()
  static func main() {
    let app = NSApplication.shared
    app.delegate = delegate
    app.setActivationPolicy(.accessory)
    app.run()
  }
}
