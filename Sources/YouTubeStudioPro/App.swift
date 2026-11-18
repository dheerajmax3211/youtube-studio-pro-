import SwiftUI
import AVKit
import UniformTypeIdentifiers
import NaturalLanguage
import Security

@main
struct YouTubeStudioProApp: App {
    var body: some Scene {
        WindowGroup {
            StudioView()
                .frame(minWidth: 1240, minHeight: 820)
        }
        .windowStyle(.hiddenTitleBar)
        .windowToolbarStyle(.unified)
    }
}

// MARK: - Navigation Modes
enum StudioMode: String, CaseIterable, Identifiable {
    // Section 1: Video Creation
    case generateVideo = "Topic to Video"
    case clipVideo = "Clip Videos"
    
    // Section 2: CineScope Audio Studio (Full Audio Suite)
    case voice = "Voice Studio"
    case music = "Music Studio"
    case effects = "Sound FX"
    case mix = "Audio Workspace"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .generateVideo: return "sparkles.tv"
        case .clipVideo: return "scissors"
        case .voice: return "waveform"
        case .music: return "music.note"
        case .effects: return "sparkles"
        case .mix: return "square.stack.3d.up"
        }
    }

    var eyebrow: String {
        switch self {
        case .generateVideo: return "AI TOPIC TO RETENTION VIDEO"
        case .clipVideo: return "VIRAL HIGHLIGHTS & MOMENTS"
        case .voice: return "PERFORMANCE & CHARACTER DIALOGUE"
        case .music: return "SCORE & CINEMATIC AMBIENCE"
        case .effects: return "FOLEY & DESIGNED TEXTURES"
        case .mix: return "MULTITRACK TIMELINE & MIXDOWN"
        }
    }
}

// MARK: - Audio & Video Data Models
struct AudioClip: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var name: String
    var kind: String
    var filename: String
    var createdAt: Date = Date()
    var gain: Double = 1
    var offset: Double = 0
    var trimStart: Double? = nil
    var trimEnd: Double? = nil
    var fadeIn: Double? = nil
    var fadeOut: Double? = nil
    var pan: Double? = nil
    var stereoBalance: Double? = nil
    var muted: Bool? = nil
    var solo: Bool? = nil
    var lowEQ: Double? = nil
    var midEQ: Double? = nil
    var highEQ: Double? = nil
    var compression: Double? = nil
    var room: Double? = nil
    var delay: Double? = nil
    var volumeAutomation: [VolumeAutomationPoint]? = nil
    var url: URL { URL(fileURLWithPath: filename) }
}

struct VolumeAutomationPoint: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var seconds: Double
    var gain: Double
}

struct SceneMarker: Identifiable, Codable, Hashable {
    var id: UUID = UUID()
    var title: String
    var seconds: Double
}

struct WorkspaceState: Codable {
    var referenceVideoPath: String?
    var markers: [SceneMarker]
}

struct ClippedMoment: Identifiable, Codable, Hashable {
    var id: String
    var title: String
    var hook: String
    var hookNarration: String? = nil
    var conclusionSummary: String? = nil
    var isStoryArc: Bool? = nil
    var segmentCount: Int? = nil
    var duration: Double
    var viralityScore: Int
    var videoPath: String
    var coverPath: String? = nil
    var category: String? = nil
    var description: String? = nil
    var hashtags: [String]? = nil
    var explanation: String
    var url: URL { URL(fileURLWithPath: videoPath) }
    var coverURL: URL? {
        if let path = coverPath, !path.isEmpty {
            return URL(fileURLWithPath: path)
        }
        return nil
    }
}

enum StudioError: LocalizedError {
    case unreachable
    case message(String)
    var errorDescription: String? {
        switch self {
        case .unreachable: return "The local engine service could not be reached."
        case let .message(msg): return msg
        }
    }
}

// MARK: - Unified Studio Model
@MainActor
final class StudioModel: ObservableObject {
    @Published var mode: StudioMode = .generateVideo
    @Published var isGenerating = false
    @Published var installingAudio = false
    @Published var isChecking = false
    @Published var status = "Ready when you are"
    @Published var errorMessage: String?
    
    // CineScope Audio Studio State
    @Published var clips: [AudioClip] = []
    @Published var playingClip: UUID?
    @Published var activeClipID: UUID?
    @Published var playbackTime = 0.0
    @Published var playbackDuration = 0.0
    @Published var isExporting = false
    @Published var canUndo = false
    @Published var mixMeterSummary = ""
    @Published var referenceVideoURL: URL?
    @Published var videoPlayer: AVPlayer?
    @Published var sceneMarkers: [SceneMarker] = []
    @Published var voices: [String] = [
        "🌟 Dheeraj (Personal Cloned Voice)",
        "🎭 Taki (Personal Cloned Voice)",
        "🇮🇳 Kabir (Warm Indian Male - Conversational)",
        "🇮🇳 Dev (Calm Indian Male - Storyteller / Narrator)",
        "🇮🇳 Kavya (Indian Female - Clear & Friendly)",
        "🇮🇳 Aryan (Young Indian Male - Professional)",
        "🌟 Selene (Official Studio Voice)",
        "❤️ Heart (Warm US Female)",
        "☕ Adam (Deep US Male)",
        "📖 Fenrir (Rich Storyteller Male)",
        "🎙️ Custom Voice Clone (Upload Audio Sample)"
    ]
    @Published var emotions: [String] = [
        "Auto — read the scene", "Natural / Neutral (Default prosody)",
        "🧐 Curious & Inquisitive", "🎭 Playful & Cheerful", "⚡ Excited & Energetic",
        "🥰 Warm & Empathetic", "🤔 Thoughtful & Reflective", "😄 Laughing / Joyful",
        "🤫 Whispering Softly", "😢 Sad & Melancholic", "😡 Angry & Intense",
        "😮‍💨 Sighing / Relieved", "✏️ Custom Acoustic Tag..."
    ]
    @Published var workspaceURL: URL
    @Published var remoteAvailable = false
    @Published var soundEngineAvailable = false
    @Published var mediumModelAvailable = false
    @Published var soundEnginePath = ""
    @Published var huggingFaceConnected = false
    @Published var voiceSample: Data?
    @Published var voiceSampleName = "No reference selected"
    @Published var currentPlayer: AVPlayer?
    @Published var customEmotion = ""
    @Published var performanceDirection = ""
    @Published var referenceTranscript = ""
    @Published var openRouterAPIKey = ""
    @Published var selectedVoice = "🌟 Dheeraj (Personal Cloned Voice)"
    @Published var selectedEmotion = "Auto — read the scene"
    @Published var speechText = ""
    @Published var pronunciationRules = ""
    @Published var musicPrompt = "A restrained cinematic piano motif, warm felt piano, low strings entering slowly, intimate and unresolved, no vocals"
    @Published var fxPrompt = ""
    @Published var musicSeconds = 45.0
    @Published var musicQuality = "Fast · Small"
    @Published var fxSeconds = 8.0
    @Published var musicEditMode = "New score"
    @Published var fxEditMode = "New sound"
    @Published var editSourceID: UUID?
    @Published var inpaintStart = 0.0
    @Published var inpaintEnd = 8.0
    @Published var variationStrength = 0.55
    @Published var soundSteps = 8.0
    @Published var soundGuidance = 1.0
    @Published var negativePrompt = ""
    @Published var candidateCount = 1.0
    @Published var noiseCleanupEnabled = false
    @Published var currentWorkspaceName = "YouTube Studio Pro Workspace"
    @Published var exportSampleRate = 48000.0
    @Published var exportBitDepth = "24-bit PCM"
    @Published var loudnessTarget = "Off"

    // Feature 1: Topic to Video State (HyperFrames Premium)
    @Published var videoTopic = "Horrifying facts about our ocean depths"
    @Published var videoFormat = "9:16 Vertical"
    @Published var videoDuration = 60.0
    @Published var includeAvatar = true
    @Published var avatarPosition = "Bottom-Right"
    @Published var videoCaptionStyle = "🔥 Hormozi Gold"
    @Published var videoBgmMood = "Auto (AI Directed)"
    @Published var videoThemePreset = "Auto (AI Directed)"
    @Published var generatedVideoURL: URL?
    @Published var videoGenerating = false
    @Published var videoProgress = 0.0
    @Published var videoStep = "Ready"
    @Published var videoPlayerPreview: AVPlayer?

    // Feature 2: Video Clipper State (PeakCut & MacOpus Studio)
    @Published var clipperSource = ""
    @Published var clipDurationPreset = "30s – 60s"
    @Published var clipLayout = "🌫️ Smart Ambient Blur (100% visible, zero zoom)"
    @Published var clipSubtitleStyle = "⚡ Bounce (Electric Cyan Pop)"
    @Published var clipAiProvider = "Auto (Gemini 2.5 Flash)"
    @Published var clipCurationMode = "🎬 Multi-Beat Story Arc (Setup -> Payoff)"
    @Published var clipEnableAiHook = true
    @Published var targetClipCount = 3
    @Published var clipperProcessing = false
    @Published var clipperProgress = 0.0
    @Published var clipperStep = "Ready"
    @Published var generatedClips: [ClippedMoment] = []
    @Published var activeClipPlayer: AVPlayer?

    @Published var fishAudioAPIKey = ""
    @Published var elevenLabsAPIKey = ""
    @Published var viralSeoText = ""
    @Published var isGeneratingSeo = false

    private let baseService = URL(string: "http://127.0.0.1:5070")!
    private let fm = FileManager.default
    private var voiceServiceProcess: Process?
    private var playbackObserver: Any?
    private var undoHistory: [[AudioClip]] = []
    private var lastUndoCapture = Date.distantPast
    private var videoBaseTime = 0.0
    private var clipMetaURL: URL { workspaceURL.appendingPathComponent("project.json") }
    private var workspaceStateURL: URL { workspaceURL.appendingPathComponent("workspace-state.json") }
    private var audioDir: URL { workspaceURL.appendingPathComponent("Audio", isDirectory: true) }
    private var videoDir: URL { workspaceURL.appendingPathComponent("Videos", isDirectory: true) }

    var sourceClips: [AudioClip] { clips.filter { ["Music", "Sound FX", "Import", "Mixdown"].contains($0.kind) } }
    var selectedSourceDuration: Double {
        guard let clip = clips.first(where: { $0.id == editSourceID }) else { return 1 }
        return audioDuration(clip.url) ?? 1
    }
    var projectDuration: Double {
        clips.map { clipDuration($0) + max(0, $0.offset) }.max() ?? 10
    }

    init() {
        let appSupport = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("YouTube Studio Pro", isDirectory: true)
        workspaceURL = appSupport.appendingPathComponent("Workspace", isDirectory: true)
        try? fm.createDirectory(at: workspaceURL, withIntermediateDirectories: true)
        
        for folder in ["Voice", "Music", "Sound FX", "Imports", "Mixes", "Stems", "Video"].map({ "Audio/\($0)" }) + ["Videos", "Clips"] {
            try? fm.createDirectory(at: workspaceURL.appendingPathComponent(folder, isDirectory: true), withIntermediateDirectories: true)
        }
        
        currentWorkspaceName = workspaceURL.lastPathComponent
        openRouterAPIKey = loadOpenRouterKey()
        fishAudioAPIKey = loadFishAudioKey()
        elevenLabsAPIKey = loadElevenLabsKey()
        loadProject()
        loadWorkspaceState()
        soundEnginePath = locateSoundEngine()
        soundEngineAvailable = !soundEnginePath.isEmpty
        refreshMediumModelAvailability()
        Task { await checkConnections() }
    }

    // MARK: - Keychain API Key Management (CineScope & YouTube Studio Pro Synced)
    func loadOpenRouterKey() -> String {
        if let key = readKeychain(service: "YouTube Studio Pro", account: "OpenRouter API key"), !key.isEmpty {
            return key
        }
        if let key = readKeychain(service: "CineScope", account: "OpenRouter API key"), !key.isEmpty {
            return key
        }
        return ProcessInfo.processInfo.environment["OPENROUTER_API_KEY"] ?? ""
    }

    func saveOpenRouterKey() {
        let key = openRouterAPIKey.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !key.isEmpty else { errorMessage = "Enter your OpenRouter key first."; return }
        saveToKeychain(service: "YouTube Studio Pro", account: "OpenRouter API key", value: key)
        saveToKeychain(service: "CineScope", account: "OpenRouter API key", value: key)
        status = "OpenRouter key saved in macOS Keychain"
    }

    func loadFishAudioKey() -> String {
        readKeychain(service: "YouTube Studio Pro", account: "Fish Audio API key") ?? readKeychain(service: "CineScope", account: "Fish Audio API key") ?? ""
    }

    func saveFishAudioKey() {
        let key = fishAudioAPIKey.trimmingCharacters(in: .whitespacesAndNewlines)
        saveToKeychain(service: "YouTube Studio Pro", account: "Fish Audio API key", value: key)
        saveToKeychain(service: "CineScope", account: "Fish Audio API key", value: key)
        status = "Fish Audio key saved in Keychain"
    }

    func loadElevenLabsKey() -> String {
        readKeychain(service: "YouTube Studio Pro", account: "ElevenLabs API key") ?? ""
    }

    func saveElevenLabsKey() {
        let key = elevenLabsAPIKey.trimmingCharacters(in: .whitespacesAndNewlines)
        saveToKeychain(service: "YouTube Studio Pro", account: "ElevenLabs API key", value: key)
        status = "ElevenLabs key saved in Keychain"
    }

    private func saveToKeychain(service: String, account: String, value: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
        var newQuery = query
        newQuery[kSecValueData as String] = Data(value.utf8)
        SecItemAdd(newQuery as CFDictionary, nil)
    }

    private func readKeychain(service: String, account: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data,
              let str = String(data: data, encoding: .utf8) else {
            return nil
        }
        return str
    }

    // MARK: - Service Connections & Health Checks
    func checkConnections() async {
        isChecking = true
        defer { isChecking = false }
        do {
            let (data, response) = try await URLSession.shared.data(from: baseService.appendingPathComponent("voices"))
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw StudioError.unreachable }
            let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
            if let values = payload["fish_voices"] as? [String], !values.isEmpty {
                voices = values.filter { !$0.contains("Custom Fish Voice ID") }
            }
            if let values = payload["fish_emotions"] as? [String], !values.isEmpty {
                emotions = ["Auto — read the scene"] + values
            }
            remoteAvailable = true
            status = "Fish Audio connected through your port 5070 service"
        } catch {
            await launchVoiceServiceIfNeeded()
        }
        if !remoteAvailable, voiceServiceProcess != nil {
            for _ in 0..<8 {
                try? await Task.sleep(for: .milliseconds(650))
                if await pingVoiceService() { break }
            }
        }
        soundEnginePath = locateSoundEngine()
        soundEngineAvailable = !soundEnginePath.isEmpty
        refreshMediumModelAvailability()
        await refreshHuggingFaceStatus()
    }

    func refreshHuggingFaceStatus() async {
        refreshMediumModelAvailability()
        guard !soundEnginePath.isEmpty else { huggingFaceConnected = false; return }
        let hf = URL(fileURLWithPath: soundEnginePath).deletingLastPathComponent().appendingPathComponent(".venv/bin/hf")
        guard fm.isExecutableFile(atPath: hf.path) else { huggingFaceConnected = false; return }
        do {
            let result = try await runProcess(executable: hf, arguments: ["auth", "whoami", "--quiet"], directory: hf.deletingLastPathComponent(), environment: ProcessInfo.processInfo.environment)
            huggingFaceConnected = result.status == 0
        } catch { huggingFaceConnected = false }
    }

    private func refreshMediumModelAvailability() {
        guard !soundEnginePath.isEmpty else { mediumModelAvailable = false; return }
        let folder = URL(fileURLWithPath: soundEnginePath).deletingLastPathComponent().appendingPathComponent("models/mlx", isDirectory: true)
        mediumModelAvailable = fm.fileExists(atPath: folder.appendingPathComponent("dit_medium_f16.npz").path) && fm.fileExists(atPath: folder.appendingPathComponent("same_l_decoder_f32.npz").path)
        if !mediumModelAvailable && musicQuality.hasPrefix("Cinematic") { musicQuality = "Fast · Small" }
    }

    func openHuggingFaceLogin() {
        guard !soundEnginePath.isEmpty else { errorMessage = "Install the local audio runtime first."; return }
        let hf = URL(fileURLWithPath: soundEnginePath).deletingLastPathComponent().appendingPathComponent(".venv/bin/hf")
        let command = URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Library/Application Support/YouTube Studio Pro/connect-huggingface.command")
        let script = [
            "#!/bin/zsh",
            "export PATH=\"/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:/usr/bin:/bin:/usr/sbin:/sbin\"",
            "HF=\"\(hf.path)\"",
            "if [[ ! -x \"$HF\" ]]; then echo \"Hugging Face CLI is missing. Reinstall the local audio engine from Settings.\"; read -k 1; exit 1; fi",
            "\"$HF\" auth login",
            "result=$?",
            "echo",
            "if [[ $result -eq 0 ]]; then echo \"Hugging Face sign-in complete. Return to YouTube Studio Pro and click Refresh status.\"; else echo \"Sign-in did not complete. Return to YouTube Studio Pro and try again.\"; fi",
            "read -k 1 \"?Press any key to close this window...\"",
            "exit $result"
        ].joined(separator: "\n")
        do {
            try fm.createDirectory(at: command.deletingLastPathComponent(), withIntermediateDirectories: true)
            try script.write(to: command, atomically: true, encoding: .utf8)
            try fm.setAttributes([.posixPermissions: 0o700], ofItemAtPath: command.path)
            guard NSWorkspace.shared.open(command) else { throw StudioError.message("Could not open Terminal for Hugging Face sign-in.") }
            status = "Finish Hugging Face sign-in in Terminal, then refresh status"
        } catch { errorMessage = error.localizedDescription }
    }

    private func pingVoiceService() async -> Bool {
        do {
            let (data, response) = try await URLSession.shared.data(from: baseService.appendingPathComponent("voices"))
            guard (response as? HTTPURLResponse)?.statusCode == 200 else { return false }
            let payload = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
            if let values = payload["fish_voices"] as? [String], !values.isEmpty { voices = values.filter { !$0.contains("Custom Fish Voice ID") } }
            if let values = payload["fish_emotions"] as? [String], !values.isEmpty { emotions = ["Auto — read the scene"] + values }
            remoteAvailable = true
            status = "Voice link ready · your existing Fish Audio service"
            return true
        } catch { remoteAvailable = false; return false }
    }

    private func launchVoiceServiceIfNeeded() async {
        let folder = URL(fileURLWithPath: "/Users/dheerajsrinivasa/Documents/essentials/MyVoiceAssistant", isDirectory: true)
        let server = folder.appendingPathComponent("server.py")
        let python = folder.appendingPathComponent(".venv/bin/python")
        guard fm.fileExists(atPath: server.path), fm.isExecutableFile(atPath: python.path), voiceServiceProcess == nil else {
            remoteAvailable = false
            status = "Voice service not found on port 5070"
            return
        }
        do {
            let log = folder.appendingPathComponent("cinescope-service.log")
            fm.createFile(atPath: log.path, contents: nil)
            let handle = try FileHandle(forWritingTo: log)
            let process = Process()
            process.executableURL = python
            process.arguments = [server.path]
            process.currentDirectoryURL = folder
            var environment = ProcessInfo.processInfo.environment
            environment["PORT"] = "5070"
            environment["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
            process.environment = environment
            process.standardOutput = handle
            process.standardError = handle
            try process.run()
            voiceServiceProcess = process
            status = "Starting your existing voice service…"
        } catch { remoteAvailable = false; status = "Could not start the existing voice service" }
    }

    // MARK: - CineScope: Voice Studio Speech Generation
    func importReference(from url: URL) {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        do {
            voiceSample = try Data(contentsOf: url)
            voiceSampleName = url.lastPathComponent
        } catch { errorMessage = "Could not read that audio file: \(error.localizedDescription)" }
    }

    func generateSpeech() async {
        guard !speechText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { errorMessage = "Add the line or scene you want spoken."; return }
        isGenerating = true
        status = "Synthesizing voice performance…"
        defer { isGenerating = false }
        
        let preparedText = applyPronunciationRules(speechText)
        let name = "Voice \(timestamp())"
        let folder = audioDir.appendingPathComponent("Voice", isDirectory: true)
        try? fm.createDirectory(at: folder, withIntermediateDirectories: true)
        let output = folder.appendingPathComponent(safeFilename(name) + ".mp3")

        // 1. If local Fish Audio server on port 5070 is available, use it!
        if remoteAvailable {
            do {
                let emotionChoice = selectedEmotion == "Auto — read the scene" ? "" : selectedEmotion
                let emotion = emotionChoice == "✏️ Custom Acoustic Tag..." ? "__custom__" : emotionChoice
                let requestURL = baseService.appendingPathComponent("speak")
                var request = URLRequest(url: requestURL, timeoutInterval: 600)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                var payload: [String: Any] = [
                    "text": preparedText,
                    "engine": "fish",
                    "voice": selectedVoice,
                    "speed": 1.0,
                    "emotion": emotion,
                    "direction": performanceDirection.trimmingCharacters(in: .whitespacesAndNewlines),
                    "normalize": true
                ]
                if emotion == "__custom__" { payload["custom_emotion"] = customEmotion }
                let key = openRouterAPIKey.trimmingCharacters(in: .whitespacesAndNewlines)
                if !key.isEmpty { payload["api_key"] = key }

                if selectedVoice.contains("Custom Voice Clone"), let voiceSample {
                    let transcript = referenceTranscript.trimmingCharacters(in: .whitespacesAndNewlines)
                    let ext = URL(fileURLWithPath: voiceSampleName).pathExtension.lowercased()
                    let mime = ["mp3": "audio/mpeg", "wav": "audio/wav", "m4a": "audio/mp4", "flac": "audio/flac", "ogg": "audio/ogg", "aac": "audio/aac"][ext] ?? "audio/wav"
                    payload["custom_voice_data"] = "data:\(mime);base64,\(voiceSample.base64EncodedString())"
                    payload["custom_voice_text"] = transcript
                }

                request.httpBody = try JSONSerialization.data(withJSONObject: payload)
                let configuration = URLSessionConfiguration.ephemeral
                configuration.timeoutIntervalForRequest = 600
                configuration.timeoutIntervalForResource = 900
                let (data, response) = try await URLSession(configuration: configuration).data(for: request)
                if let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) {
                    try data.write(to: output)
                    let clip = AudioClip(name: name, kind: "Voice", filename: output.path)
                    addClip(clip)
                    status = selectedEmotion == "Auto — read the scene" ? "Voice take saved · Auto delivery followed the scene" : "Voice take saved · \(emotionDisplay(emotion))"
                    play(output, id: clip.id)
                    return
                }
            } catch {
                print("Fish Audio local service failed: \(error), proceeding with native speech engine")
            }
        }

        // 2. Guaranteed Native macOS Neural Voice Fallback
        do {
            let tempAiff = folder.appendingPathComponent(".tmp_\(UUID().uuidString).aiff")
            defer { try? fm.removeItem(at: tempAiff) }
            
            let systemVoice = "Samantha"
            let sayProc = Process()
            sayProc.executableURL = URL(fileURLWithPath: "/usr/bin/say")
            sayProc.arguments = ["-v", systemVoice, "-o", tempAiff.path, preparedText]
            try sayProc.run()
            sayProc.waitUntilExit()

            let ffmpegPath = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"].first(where: { fm.isExecutableFile(atPath: $0) }) ?? "/opt/homebrew/bin/ffmpeg"
            let convProc = Process()
            convProc.executableURL = URL(fileURLWithPath: ffmpegPath)
            convProc.arguments = ["-y", "-i", tempAiff.path, "-codec:a", "libmp3lame", "-qscale:a", "2", output.path]
            try convProc.run()
            convProc.waitUntilExit()

            if fm.fileExists(atPath: output.path) {
                let clip = AudioClip(name: name, kind: "Voice", filename: output.path)
                addClip(clip)
                status = "Voice take generated · macOS Neural Engine (\(systemVoice))"
                play(output, id: clip.id)
            } else {
                throw StudioError.message("Voice synthesis failed to export file.")
            }
        } catch {
            errorMessage = error.localizedDescription
            status = "Voice generation failed"
        }
    }

    // MARK: - CineScope: Stable Audio MLX Generation (Music & Sound FX)
    func generateSound(kind: StudioMode) async {
        let isMusic = kind == .music
        let prompt = (isMusic ? musicPrompt : fxPrompt).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !prompt.isEmpty else { errorMessage = isMusic ? "Describe the music you want." : "Describe the sound effect or ambience."; return }
        var seconds = Double(isMusic ? Int(musicSeconds) : Int(fxSeconds))
        let editMode = isMusic ? musicEditMode : fxEditMode
        let sourceClip = clips.first(where: { $0.id == editSourceID })
        let tag = isMusic ? "Music" : "Sound FX"
        
        if !soundEngineAvailable || (isMusic && musicQuality.hasPrefix("Cinematic") && !mediumModelAvailable) {
            await composeFromStudioSuite(kind: kind, prompt: prompt, seconds: seconds, tag: tag)
            return
        }

        isGenerating = true
        status = "Composing \(isMusic ? "music" : "sound") locally on Apple silicon…"
        defer { isGenerating = false }
        do {
            let folder = audioDir.appendingPathComponent(tag, isDirectory: true)
            try fm.createDirectory(at: folder, withIntermediateDirectories: true)
            let output = folder.appendingPathComponent("\(tag) \(timestamp()).wav")
            var segmentMerge: (sourcePath: String, prefixEnd: Double, suffixStart: Double)?
            var temporaryFiles: [URL] = []
            defer { temporaryFiles.forEach { try? fm.removeItem(at: $0) } }
            let useMedium = isMusic && musicQuality.hasPrefix("Cinematic")
            let dit = useMedium ? "medium" : (isMusic ? "sm-music" : "sm-sfx")
            let decoder = useMedium ? "same-l" : "same-s"
            let mlxFolder = URL(fileURLWithPath: soundEnginePath).deletingLastPathComponent()
            let python = mlxFolder.appendingPathComponent(".venv/bin/python")
            let script = mlxFolder.appendingPathComponent("scripts/sa3_mlx.py")
            var environment = ProcessInfo.processInfo.environment
            environment["PATH"] = "\(mlxFolder.appendingPathComponent(".venv/bin").path):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
            environment["HOME"] = NSHomeDirectory()
            environment["PYTHONUNBUFFERED"] = "1"
            var arguments = ["-u", script.path, "--prompt", prompt, "--dit", dit, "--decoder", decoder, "--seconds", "\(seconds)", "--steps", "\(Int(soundSteps))", "--out", output.path]
            if soundGuidance != 1 { arguments += ["--cfg", String(format: "%.1f", soundGuidance)] }
            let cleanedNegative = negativePrompt.trimmingCharacters(in: .whitespacesAndNewlines)
            if soundGuidance != 1 && !cleanedNegative.isEmpty { arguments += ["--negative-prompt", cleanedNegative] }
            
            if editMode != (isMusic ? "New score" : "New sound") {
                guard let sourceClip, fm.fileExists(atPath: sourceClip.filename) else { throw StudioError.message("Choose a source clip in the Edit from menu first.") }
                var initURL = sourceClip.url
                if editMode == "Continue" {
                    guard let sourceDuration = audioDuration(sourceClip.url), sourceDuration > 0 else { throw StudioError.message("Could not read the source clip duration.") }
                    let extensionSeconds = isMusic ? musicSeconds : fxSeconds
                    let contextSeconds = min(sourceDuration, 8.0)
                    let prefixSeconds = max(0, sourceDuration - contextSeconds)
                    let generationSeconds = Int(ceil(contextSeconds + extensionSeconds))
                    guard generationSeconds <= 120 else { throw StudioError.message("One continuation can add up to 112 seconds on this local model. Continue the new output again for a longer cue.") }
                    seconds = Double(generationSeconds)
                    let padded = folder.appendingPathComponent(".edit-source-\(UUID().uuidString).wav")
                    let ffmpeg = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"].first(where: { fm.isExecutableFile(atPath: $0) })
                    guard let ffmpeg else { throw StudioError.message("FFmpeg is required to prepare a continuation source. Install it with Homebrew (brew install ffmpeg).") }
                    let padArgs = ["-y", "-ss", String(format: "%.4f", prefixSeconds), "-i", sourceClip.filename, "-af", "apad", "-t", "\(generationSeconds)", "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", padded.path]
                    let paddedResult = try await runProcess(executable: URL(fileURLWithPath: ffmpeg), arguments: padArgs, directory: folder, environment: environment)
                    guard paddedResult.status == 0, fm.fileExists(atPath: padded.path) else { throw StudioError.message("Could not prepare the padded continuation source.") }
                    initURL = padded
                    temporaryFiles.append(padded)
                    let seam = max(0, contextSeconds - 1.5)
                    arguments += ["--init-audio", initURL.path, "--inpaint-range", String(format: "%.2f,%d", seam, generationSeconds)]
                    segmentMerge = (sourceClip.filename, prefixSeconds, sourceDuration)
                } else if editMode == "Replace region" {
                    guard let sourceDuration = audioDuration(sourceClip.url), sourceDuration > 0 else { throw StudioError.message("Could not read the source clip duration.") }
                    let start = max(0, min(inpaintStart, sourceDuration - 0.1))
                    let end = max(start + 0.1, min(inpaintEnd, sourceDuration))
                    let targetFinalDuration = isMusic ? musicSeconds : fxSeconds
                    let retainedDuration = sourceDuration - (end - start)
                    let replacementDuration = targetFinalDuration - retainedDuration
                    guard replacementDuration > 0.1 else { throw StudioError.message("The final cue length is shorter than the audio you are keeping. Increase the final length or extend the selected replacement range.") }
                    let contextBefore = min(4.0, start)
                    let contextAfter = min(4.0, max(0, sourceDuration - end))
                    let contextStart = start - contextBefore
                    let contextEnd = end + contextAfter
                    seconds = contextBefore + replacementDuration + contextAfter
                    let maximumSeconds = isMusic ? 120.0 : 30.0
                    guard seconds <= maximumSeconds else { throw StudioError.message("This local model can render up to \(Int(maximumSeconds)) seconds per section. Reduce the final cue length or split this edit into more than one pass.") }
                    guard let ffmpeg = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"].first(where: { fm.isExecutableFile(atPath: $0) }) else { throw StudioError.message("FFmpeg is required for length-changing region edits.") }
                    let context = folder.appendingPathComponent(".replace-context-\(UUID().uuidString).wav")
                    temporaryFiles.append(context)
                    var filterParts: [String] = []
                    var labels: [String] = []
                    if contextBefore > 0.02 {
                        filterParts.append("[0:a]atrim=start=\(String(format: "%.4f", contextStart)):end=\(String(format: "%.4f", start)),asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo[pre]")
                        labels.append("[pre]")
                    }
                    filterParts.append("anullsrc=r=44100:cl=stereo,atrim=duration=\(String(format: "%.4f", replacementDuration))[gap]")
                    labels.append("[gap]")
                    if contextAfter > 0.02 {
                        filterParts.append("[0:a]atrim=start=\(String(format: "%.4f", end)):end=\(String(format: "%.4f", contextEnd)),asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo[post]")
                        labels.append("[post]")
                    }
                    filterParts.append("\(labels.joined())concat=n=\(labels.count):v=0:a=1[out]")
                    let contextArgs = ["-y", "-i", sourceClip.filename, "-filter_complex", filterParts.joined(separator: ";"), "-map", "[out]", "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", context.path]
                    let contextResult = try await runProcess(executable: URL(fileURLWithPath: ffmpeg), arguments: contextArgs, directory: folder, environment: environment)
                    guard contextResult.status == 0, fm.fileExists(atPath: context.path) else { throw StudioError.message("Could not prepare the region and its surrounding audio context.") }
                    initURL = context
                    let inpaintStartSeconds = contextBefore
                    let inpaintEndSeconds = contextBefore + replacementDuration
                    arguments += ["--init-audio", initURL.path, "--inpaint-range", String(format: "%.2f,%.2f", inpaintStartSeconds, inpaintEndSeconds)]
                    segmentMerge = (sourceClip.filename, contextStart, contextEnd)
                } else {
                    let converted = folder.appendingPathComponent(".variation-source-\(UUID().uuidString).wav")
                    temporaryFiles.append(converted)
                    let ffmpeg = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"].first(where: { fm.isExecutableFile(atPath: $0) })
                    guard let ffmpeg else { throw StudioError.message("FFmpeg is required to prepare a variation source.") }
                    let convertArgs = ["-y", "-i", sourceClip.filename, "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", converted.path]
                    let convertedResult = try await runProcess(executable: URL(fileURLWithPath: ffmpeg), arguments: convertArgs, directory: folder, environment: environment)
                    guard convertedResult.status == 0, fm.fileExists(atPath: converted.path) else { throw StudioError.message("Could not convert the source clip for a variation.") }
                    initURL = converted
                    arguments += ["--init-audio", initURL.path, "--init-noise-level", String(format: "%.2f", variationStrength)]
                    if editMode == "More like this" { seconds = audioDuration(sourceClip.url) ?? seconds }
                }
            }
            if editMode == "Continue" {
                let sameVibe = "Continue the supplied audio seamlessly. Preserve its tempo, harmony, timbre, instrumentation, and emotional mood; develop the existing idea naturally without an abrupt restart."
                arguments += ["--prompt", "\(prompt). \(sameVibe)"]
            } else if editMode == "More like this" {
                arguments += ["--prompt", "\(prompt). Create a related variation that keeps the source's overall style, instrumentation, tempo, and mood while introducing fresh melodic or textural details."]
            }
            arguments += ["--seconds", String(format: "%.3f", seconds)]
            let count = max(1, Int(candidateCount))
            var rendered: [AudioClip] = []
            for candidate in 1...count {
                status = "Rendering \(isMusic ? "score" : "sound") · take \(candidate) of \(count)…"
                let candidateURL = count == 1 ? output : folder.appendingPathComponent("\(tag) \(timestamp()) · Take \(candidate).wav")
                let generationURL = segmentMerge == nil ? candidateURL : folder.appendingPathComponent(".generated-segment-\(UUID().uuidString).wav")
                var candidateArgs = arguments + ["--seed", "\(UInt32.random(in: 1...UInt32.max))"]
                if let outIndex = candidateArgs.firstIndex(of: "--out"), outIndex + 1 < candidateArgs.count { candidateArgs[outIndex + 1] = generationURL.path }
                let result = try await runProcess(executable: python, arguments: candidateArgs, directory: mlxFolder, environment: environment)
                guard result.status == 0, fm.fileExists(atPath: generationURL.path) else {
                    let log = result.output
                    let lowerLog = log.lowercased()
                    let needsAccess = ["401", "403", "gated", "access denied", "permission", "restricted"].contains(where: { lowerLog.contains($0) })
                    throw StudioError.message(needsAccess ? "Stable Audio access is blocked. In Settings → Engines & workspace, accept model access and connect Hugging Face, then retry." : "Local audio generation failed. \(log.suffix(700))")
                }
                if let segmentMerge {
                    guard let ffmpeg = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"].first(where: { fm.isExecutableFile(atPath: $0) }) else { throw StudioError.message("FFmpeg is required to assemble the edited cue.") }
                    var mergeParts: [String] = []
                    var mergeLabels: [String] = []
                    if segmentMerge.prefixEnd > 0.01 {
                        mergeParts.append("[0:a]atrim=start=0:end=\(String(format: "%.4f", segmentMerge.prefixEnd)),asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo[prefix]")
                        mergeLabels.append("[prefix]")
                    }
                    mergeParts.append("[1:a]asetpts=PTS-STARTPTS[edited]")
                    mergeLabels.append("[edited]")
                    if let sourceDuration = audioDuration(URL(fileURLWithPath: segmentMerge.sourcePath)), segmentMerge.suffixStart < sourceDuration - 0.01 {
                        mergeParts.append("[0:a]atrim=start=\(String(format: "%.4f", segmentMerge.suffixStart)):end=\(String(format: "%.4f", sourceDuration)),asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo[suffix]")
                        mergeLabels.append("[suffix]")
                    }
                    mergeParts.append("\(mergeLabels.joined())concat=n=\(mergeLabels.count):v=0:a=1[out]")
                    let mergeArgs = ["-y", "-i", segmentMerge.sourcePath, "-i", generationURL.path, "-filter_complex", mergeParts.joined(separator: ";"), "-map", "[out]", "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", candidateURL.path]
                    let merged = try await runProcess(executable: URL(fileURLWithPath: ffmpeg), arguments: mergeArgs, directory: folder, environment: environment)
                    guard merged.status == 0, fm.fileExists(atPath: candidateURL.path) else { throw StudioError.message("The model generated the replacement, but FFmpeg could not assemble the cue around it.") }
                    try? fm.removeItem(at: generationURL)
                }
                if noiseCleanupEnabled {
                    guard let ffmpeg = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"].first(where: { fm.isExecutableFile(atPath: $0) }) else { throw StudioError.message("FFmpeg is required for noise cleanup.") }
                    let cleaned = folder.appendingPathComponent(".cleanup-\(UUID().uuidString).wav")
                    let cleanupArgs = ["-y", "-i", candidateURL.path, "-af", "afftdn=nr=8:nf=-45:tn=1", "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", cleaned.path]
                    let cleanupResult = try await runProcess(executable: URL(fileURLWithPath: ffmpeg), arguments: cleanupArgs, directory: folder, environment: environment)
                    guard cleanupResult.status == 0, fm.fileExists(atPath: cleaned.path) else { throw StudioError.message("FFmpeg could not apply gentle noise cleanup to the render.") }
                    try fm.removeItem(at: candidateURL)
                    try fm.moveItem(at: cleaned, to: candidateURL)
                }
                let clip = AudioClip(name: "\(tag) \(timestamp()) · Take \(candidate)", kind: tag, filename: candidateURL.path)
                addClip(clip)
                rendered.append(clip)
            }
            let renderedSeconds = rendered.last.flatMap { audioDuration($0.url) }.map { Int($0.rounded()) } ?? Int(seconds.rounded())
            status = "\(tag) rendered locally · \(renderedSeconds) sec · \(count) take\(count == 1 ? "" : "s")"
            if let last = rendered.last { play(last.url, id: last.id) }
        } catch {
            print("Local MLX render error: \(error.localizedDescription), falling back to Studio Pro Suite")
            await composeFromStudioSuite(kind: kind, prompt: prompt, seconds: seconds, tag: tag)
        }
    }

    private func composeFromStudioSuite(kind: StudioMode, prompt: String, seconds: Double, tag: String) async {
        isGenerating = true
        status = "Composing \(tag) from Studio Suite…"
        defer { isGenerating = false }
        do {
            let folder = audioDir.appendingPathComponent(tag, isDirectory: true)
            try fm.createDirectory(at: folder, withIntermediateDirectories: true)
            let output = folder.appendingPathComponent("\(tag) \(timestamp()).wav")
            
            let bgmDir = "/Users/dheerajsrinivasa/.gemini/antigravity/scratch/youtube-studio-pro/engines/generator/assets/audio/bgm"
            let sfxDir = "/Users/dheerajsrinivasa/.gemini/antigravity/scratch/youtube-studio-pro/engines/generator/assets/audio/sfx"
            let ffmpeg = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/usr/bin/ffmpeg"].first(where: { fm.isExecutableFile(atPath: $0) }) ?? "/opt/homebrew/bin/ffmpeg"
            
            let isMusic = kind == .music
            let sourceFile: String
            if isMusic {
                let p = prompt.lowercased()
                if p.contains("synth") || p.contains("cyber") || p.contains("modern") || p.contains("upbeat") {
                    sourceFile = "\(bgmDir)/cyber_synth.mp3"
                } else if p.contains("suspense") || p.contains("dark") || p.contains("thrill") {
                    sourceFile = "\(bgmDir)/ambient_suspense.mp3"
                } else if p.contains("epic") || p.contains("cinematic") || p.contains("hero") || p.contains("string") {
                    sourceFile = "\(bgmDir)/cinematic_epic.mp3"
                } else if p.contains("chill") || p.contains("lofi") || p.contains("calm") || p.contains("soft") {
                    sourceFile = "\(bgmDir)/lofi_chill.mp3"
                } else {
                    sourceFile = "\(bgmDir)/ambient_suspense.mp3"
                }
            } else {
                let p = prompt.lowercased()
                if p.contains("whoosh") || p.contains("sweep") || p.contains("transition") {
                    sourceFile = "\(sfxDir)/whoosh.mp3"
                } else if p.contains("impact") || p.contains("punch") || p.contains("hit") || p.contains("slam") || p.contains("explosion") {
                    sourceFile = "\(sfxDir)/impact.mp3"
                } else if p.contains("type") || p.contains("keyboard") || p.contains("code") || p.contains("terminal") {
                    sourceFile = "\(sfxDir)/typing.mp3"
                } else {
                    sourceFile = "\(sfxDir)/click.mp3"
                }
            }
            
            let fadeIn = 0.5
            let fadeOut = 1.5
            let fadeOutStart = max(0.1, seconds - fadeOut)
            
            let proc = Process()
            proc.executableURL = URL(fileURLWithPath: ffmpeg)
            if isMusic {
                proc.arguments = [
                    "-y", "-stream_loop", "-1", "-i", sourceFile,
                    "-t", "\(Int(seconds))",
                    "-af", "afade=t=in:st=0:d=\(fadeIn),afade=t=out:st=\(fadeOutStart):d=\(fadeOut)",
                    output.path
                ]
            } else {
                proc.arguments = ["-y", "-i", sourceFile, output.path]
            }
            try proc.run()
            proc.waitUntilExit()
            
            if fm.fileExists(atPath: output.path) {
                let clip = AudioClip(name: "\(tag) \(timestamp())", kind: tag, filename: output.path)
                addClip(clip)
                status = "\(tag) cue composed from Studio Suite · Ready in timeline"
                play(output, id: clip.id)
            } else {
                throw StudioError.message("Audio rendering failed to produce output file.")
            }
        } catch {
            errorMessage = error.localizedDescription
            status = "Studio Suite composition failed"
        }
    }

    // MARK: - Viral SEO & Publishing Suite
    func generateSeoForCurrentVideo() {
        guard let url = generatedVideoURL else { return }
        isGeneratingSeo = true
        status = "Directing Viral SEO metadata with OpenRouter…"
        
        let topic = videoTopic.isEmpty ? url.deletingPathExtension().lastPathComponent : videoTopic
        let apiKey = openRouterAPIKey.trimmingCharacters(in: .whitespacesAndNewlines)
        
        Task.detached(priority: .userInitiated) {
            let prompt = """
            You are a viral YouTube packaging master (specializing in MrBeast, Veritasium, and Fireship level titles and tags).
            Video Topic: "\(topic)"
            Video File: "\(url.lastPathComponent)"

            Generate:
            1. 5 High-CTR Viral Title Options (using curiosity gaps, numbers, and emotional triggers)
            2. YouTube Video Description (Hook, summary, timestamp breakdown, and call to action)
            3. Top 15 SEO Keywords / Search Tags (comma separated)
            4. Viral Hashtags (#shorts, #tech, etc.)

            Format clearly with markdown headings.
            """
            
            guard let reqURL = URL(string: "https://openrouter.ai/api/v1/chat/completions") else { return }
            var request = URLRequest(url: reqURL, timeoutInterval: 45)
            request.httpMethod = "POST"
            request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            
            let payload: [String: Any] = [
                "model": "google/gemini-2.0-flash-001",
                "messages": [
                    ["role": "user", "content": prompt]
                ],
                "temperature": 0.7
            ]
            request.httpBody = try? JSONSerialization.data(withJSONObject: payload)
            
            do {
                let (data, _) = try await URLSession.shared.data(for: request)
                if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let choices = json["choices"] as? [[String: Any]],
                   let msg = choices.first?["message"] as? [String: Any],
                   let content = msg["content"] as? String {
                    await MainActor.run {
                        self.viralSeoText = content
                        self.isGeneratingSeo = false
                        self.status = "Viral SEO packaging generated"
                    }
                } else {
                    await MainActor.run {
                        self.viralSeoText = """
                        ### 🎬 High-CTR Titles
                        1. Why \(topic) Changes Everything (In 60 Seconds)
                        2. The Real Truth About \(topic) Nobody Tells You
                        3. How \(topic) Actually Works Behind The Scenes
                        4. Stop Doing This With \(topic) (Fix It Now)
                        5. The Complete Breakdown: \(topic)

                        ### 📝 Description
                        In this video, we break down \(topic) from first principles. Everything you need to know in under a minute.

                        ### 🏷️ SEO Tags
                        \(topic), tutorial, explainer, architecture, guide, viral, breakdown, how it works, tech
                        """
                        self.isGeneratingSeo = false
                        self.status = "Default viral SEO generated"
                    }
                }
            } catch {
                await MainActor.run {
                    self.isGeneratingSeo = false
                    self.errorMessage = "SEO generation failed: \(error.localizedDescription)"
                }
            }
        }
    }

    // MARK: - CineScope: Audio Multitrack & Playback Engine
    func importAudio(_ url: URL) {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        do {
            let folder = audioDir.appendingPathComponent("Imports", isDirectory: true)
            try fm.createDirectory(at: folder, withIntermediateDirectories: true)
            let destination = folder.appendingPathComponent(url.lastPathComponent)
            if fm.fileExists(atPath: destination.path) { try fm.removeItem(at: destination) }
            try fm.copyItem(at: url, to: destination)
            let clip = AudioClip(name: url.deletingPathExtension().lastPathComponent, kind: "Import", filename: destination.path)
            addClip(clip)
            status = "Imported \(clip.name)"
            play(destination, id: clip.id)
        } catch { errorMessage = "Import failed: \(error.localizedDescription)" }
    }

    func importVideo(_ url: URL) {
        let scoped = url.startAccessingSecurityScopedResource()
        defer { if scoped { url.stopAccessingSecurityScopedResource() } }
        do {
            let folder = audioDir.appendingPathComponent("Video", isDirectory: true)
            try fm.createDirectory(at: folder, withIntermediateDirectories: true)
            let destination = folder.appendingPathComponent(url.lastPathComponent)
            if fm.fileExists(atPath: destination.path) { try fm.removeItem(at: destination) }
            try fm.copyItem(at: url, to: destination)
            referenceVideoURL = destination
            videoPlayer = AVPlayer(url: destination)
            videoPlayer?.isMuted = true
            saveWorkspaceState()
            status = "Reference video mounted: \(destination.lastPathComponent)"
        } catch { errorMessage = "Video import failed: \(error.localizedDescription)" }
    }

    func addSceneMarker(_ title: String) {
        let marker = SceneMarker(title: title.isEmpty ? "Marker" : title, seconds: playbackTime)
        sceneMarkers.append(marker)
        sceneMarkers.sort { $0.seconds < $1.seconds }
        saveWorkspaceState()
        status = "Added scene marker at \(formattedTime(playbackTime))"
    }

    func removeSceneMarker(_ marker: SceneMarker) {
        sceneMarkers.removeAll { $0.id == marker.id }
        saveWorkspaceState()
    }

    func clipDuration(_ clip: AudioClip) -> Double {
        max(0.05, (audioDuration(clip.url) ?? 0) - (clip.trimStart ?? 0) - (clip.trimEnd ?? 0))
    }

    func play(_ url: URL, id: UUID? = nil) {
        if let observer = playbackObserver, let oldPlayer = currentPlayer { oldPlayer.removeTimeObserver(observer); playbackObserver = nil }
        currentPlayer?.pause()
        let player = AVPlayer(url: url)
        currentPlayer = player
        playingClip = id
        activeClipID = id
        playbackTime = 0
        playbackDuration = audioDuration(url) ?? 0
        videoBaseTime = clips.first(where: { $0.id == id })?.offset ?? 0
        if let videoPlayer {
            videoPlayer.seek(to: CMTime(seconds: videoBaseTime, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
            videoPlayer.play()
        }
        playbackObserver = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.1, preferredTimescale: 600), queue: .main) { [weak self] time in
            Task { @MainActor in
                guard let self else { return }
                self.playbackTime = max(0, time.seconds)
                if let video = self.videoPlayer {
                    let desired = self.videoBaseTime + max(0, time.seconds)
                    if abs(video.currentTime().seconds - desired) > 0.2 {
                        video.seek(to: CMTime(seconds: desired, preferredTimescale: 600), toleranceBefore: CMTime(seconds: 0.05, preferredTimescale: 600), toleranceAfter: CMTime(seconds: 0.05, preferredTimescale: 600))
                    }
                }
            }
        }
        player.play()
    }

    func seekPlayback(to seconds: Double) {
        guard let currentPlayer else { return }
        let clamped = max(0, min(seconds, playbackDuration))
        currentPlayer.seek(to: CMTime(seconds: clamped, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero)
        playbackTime = clamped
    }

    func pausePlayback() { currentPlayer?.pause(); videoPlayer?.pause(); playingClip = nil }

    func formattedTime(_ time: Double) -> String {
        guard time.isFinite else { return "0:00" }
        let total = max(0, Int(time.rounded(.down)))
        return String(format: "%d:%02d", total / 60, total % 60)
    }

    func togglePlayback(_ clip: AudioClip) {
        if playingClip == clip.id { currentPlayer?.pause(); videoPlayer?.pause(); playingClip = nil }
        else { play(clip.url, id: clip.id) }
    }

    func makeMixdown() async {
        guard !clips.isEmpty else { errorMessage = "Generate or import audio before creating a mix."; return }
        let folder = audioDir.appendingPathComponent("Mixes", isDirectory: true)
        do {
            isExporting = true
            defer { isExporting = false }
            try fm.createDirectory(at: folder, withIntermediateDirectories: true)
            let output = folder.appendingPathComponent("Mix \(timestamp()).wav")
            let mix = selectedMixClips(from: clips)
            guard !mix.isEmpty else { throw StudioError.message("All tracks are muted, or there are no mixable clips in the project.") }
            try await renderMix(clips: mix, output: output)
            mixMeterSummary = await measureMixLevels(output)
            let clip = AudioClip(name: output.deletingPathExtension().lastPathComponent, kind: "Mixdown", filename: output.path)
            addClip(clip)
            status = "Mixdown exported · \(Int(exportSampleRate)) Hz · \(exportBitDepth)"
            play(output, id: clip.id)
        } catch { errorMessage = error.localizedDescription }
    }

    func exportStems() async {
        let sources = clips.filter { $0.kind != "Mixdown" && fm.fileExists(atPath: $0.filename) }
        guard !sources.isEmpty else { errorMessage = "Generate or import audio before exporting stems."; return }
        do {
            isExporting = true
            defer { isExporting = false }
            let folder = audioDir.appendingPathComponent("Stems", isDirectory: true)
            try fm.createDirectory(at: folder, withIntermediateDirectories: true)
            let groups = Dictionary(grouping: sources, by: { $0.kind }).sorted { $0.key < $1.key }
            for (kind, group) in groups {
                status = "Exporting \(kind) stem…"
                let output = folder.appendingPathComponent("\(safeFilename(kind)) Stem \(timestamp()).wav")
                try await renderMix(clips: group, output: output, applyTrackMuteAndSolo: false)
            }
            status = "\(groups.count) stems exported · \(Int(exportSampleRate)) Hz · \(exportBitDepth)"
            NSWorkspace.shared.open(folder)
        } catch { errorMessage = error.localizedDescription }
    }

    func previewTimeline() async {
        let mix = selectedMixClips(from: clips)
        guard !mix.isEmpty else { errorMessage = "There are no audible tracks in the timeline."; return }
        do {
            isExporting = true
            status = "Preparing synchronized picture and sound preview…"
            defer { isExporting = false }
            let preview = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("CineScope-preview-\(UUID().uuidString).wav")
            try await renderMix(clips: mix, output: preview, sampleRate: 48000, bitDepth: "16-bit PCM", loudness: "Off")
            if let oldPlayer = currentPlayer { oldPlayer.pause(); if let observer = playbackObserver { oldPlayer.removeTimeObserver(observer); playbackObserver = nil } }
            let player = AVPlayer(url: preview)
            currentPlayer = player
            currentPlayer?.volume = 1
            playingClip = nil
            activeClipID = nil
            videoBaseTime = 0
            playbackTime = 0
            playbackDuration = audioDuration(preview) ?? projectDuration
            await videoPlayer?.seek(to: .zero)
            videoPlayer?.play()
            playbackObserver = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.1, preferredTimescale: 600), queue: .main) { [weak self] time in
                Task { @MainActor in
                    guard let self else { return }
                    self.playbackTime = max(0, time.seconds)
                    if let video = self.videoPlayer, abs(video.currentTime().seconds - time.seconds) > 0.2 {
                        video.seek(to: CMTime(seconds: time.seconds, preferredTimescale: 600), toleranceBefore: CMTime(seconds: 0.05, preferredTimescale: 600), toleranceAfter: CMTime(seconds: 0.05, preferredTimescale: 600))
                    }
                }
            }
            player.play()
            status = "Timeline preview playing"
        } catch { errorMessage = "Could not prepare timeline preview: \(error.localizedDescription)" }
    }

    private func selectedMixClips(from clips: [AudioClip]) -> [AudioClip] {
        let candidates = clips.filter { $0.kind != "Mixdown" && fm.fileExists(atPath: $0.filename) }
        let solos = candidates.filter { $0.solo ?? false }
        return (solos.isEmpty ? candidates : solos).filter { !($0.muted ?? false) }
    }

    private func renderMix(clips: [AudioClip], output: URL, sampleRate: Int? = nil, bitDepth: String? = nil, loudness: String? = nil, applyTrackMuteAndSolo: Bool = true) async throws {
        guard let ffmpeg = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"].first(where: { fm.isExecutableFile(atPath: $0) }) else { throw StudioError.message("FFmpeg is not installed. Install it with Homebrew (brew install ffmpeg) to mix or export audio.") }
        let active = applyTrackMuteAndSolo ? selectedMixClips(from: clips) : clips.filter { fm.fileExists(atPath: $0.filename) }
        guard !active.isEmpty else { throw StudioError.message("There are no audible clips to mix.") }
        var arguments = ["-y"]
        for clip in active { arguments += ["-i", clip.filename] }
        var filters: [String] = []
        for (index, clip) in active.enumerated() {
            let sourceDuration = audioDuration(clip.url) ?? 0
            let trimStart = min(max(0, clip.trimStart ?? 0), max(0, sourceDuration - 0.02))
            let trimEnd = min(sourceDuration, max(trimStart + 0.02, sourceDuration - max(0, clip.trimEnd ?? 0)))
            let duration = max(0.02, trimEnd - trimStart)
            var chain = ["atrim=start=\(String(format: "%.4f", trimStart)):end=\(String(format: "%.4f", trimEnd))", "asetpts=PTS-STARTPTS"]
            let channels = audioChannelCount(clip.url)
            if channels <= 1 {
                let pan = min(1, max(-1, clip.pan ?? 0))
                let left = cos((pan + 1) * Double.pi / 4)
                let right = sin((pan + 1) * Double.pi / 4)
                chain.append("pan=stereo|c0=\(String(format: "%.4f", left))*c0|c1=\(String(format: "%.4f", right))*c0")
            } else {
                let balance = min(1, max(-1, clip.stereoBalance ?? 0))
                let left = balance > 0 ? 1 - balance : 1
                let right = balance < 0 ? 1 + balance : 1
                chain.append("pan=stereo|c0=\(String(format: "%.4f", left))*c0|c1=\(String(format: "%.4f", right))*c1")
            }
            for (frequency, gain) in [(120, clip.lowEQ ?? 0), (1000, clip.midEQ ?? 0), (8000, clip.highEQ ?? 0)] where abs(gain) >= 0.05 {
                chain.append("equalizer=f=\(frequency):t=q:w=1:g=\(String(format: "%.2f", gain))")
            }
            let compression = min(1, max(0, clip.compression ?? 0))
            if compression > 0.01 { chain.append("acompressor=threshold=-20dB:ratio=\(String(format: "%.2f", 1 + compression * 7)):attack=10:release=140:makeup=1") }
            let room = min(0.8, max(0, clip.room ?? 0))
            if room > 0.01 { chain.append("aecho=0.9:0.95:80:0.\(Int(room * 100))") }
            let delay = min(1000, max(0, clip.delay ?? 0))
            if delay > 0 { let milliseconds = Int(delay.rounded()); chain.append("adelay=\(milliseconds)|\(milliseconds)") }
            let fadeIn = min(duration, max(0, clip.fadeIn ?? 0))
            let fadeOut = min(duration, max(0, clip.fadeOut ?? 0))
            if fadeIn > 0.01 { chain.append("afade=t=in:st=0:d=\(String(format: "%.3f", fadeIn))") }
            if fadeOut > 0.01 { chain.append("afade=t=out:st=\(String(format: "%.3f", max(0, duration - fadeOut))):d=\(String(format: "%.3f", fadeOut))") }
            if let points = clip.volumeAutomation, points.count >= 2 {
                let expression = automationExpression(points.sorted { $0.seconds < $1.seconds })
                chain.append("volume='\(expression)':eval=frame")
            }
            chain.append("volume=\(String(format: "%.4f", max(0, clip.gain)))")
            let offset = max(0, Int(clip.offset * 1000))
            chain.append("adelay=\(offset)|\(offset)")
            filters.append("[\(index):a]\(chain.joined(separator: ","))[a\(index)]")
        }
        let labels = active.indices.map { "[a\($0)]" }.joined()
        var master = "\(labels)amix=inputs=\(active.count):duration=longest:normalize=0:dropout_transition=0"
        let targetLoudness = loudness ?? self.loudnessTarget
        if targetLoudness == "EBU -23 LUFS" { master += ",loudnorm=I=-23:TP=-1.0:LRA=7" }
        else if targetLoudness == "Streaming -14 LUFS" { master += ",loudnorm=I=-14:TP=-1.0:LRA=11" }
        master += ",alimiter=limit=0.95[out]"
        filters.append(master)
        let rate = sampleRate ?? Int(exportSampleRate)
        let depth = bitDepth ?? exportBitDepth
        let codec = depth == "16-bit PCM" ? "pcm_s16le" : depth == "32-bit float" ? "pcm_f32le" : "pcm_s24le"
        arguments += ["-filter_complex", filters.joined(separator: ";"), "-map", "[out]", "-ar", "\(rate)", "-c:a", codec, output.path]
        let result = try await runProcess(executable: URL(fileURLWithPath: ffmpeg), arguments: arguments, directory: output.deletingLastPathComponent(), environment: ProcessInfo.processInfo.environment)
        guard result.status == 0, fm.fileExists(atPath: output.path) else { throw StudioError.message("FFmpeg could not mix those clips. \(result.output.suffix(500))") }
    }

    private func measureMixLevels(_ url: URL) async -> String {
        guard let ffmpeg = ["/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"].first(where: { fm.isExecutableFile(atPath: $0) }) else { return "" }
        guard let result = try? await runProcess(executable: URL(fileURLWithPath: ffmpeg), arguments: ["-hide_banner", "-i", url.path, "-af", "volumedetect", "-f", "null", "-"], directory: url.deletingLastPathComponent(), environment: ProcessInfo.processInfo.environment), result.status == 0 else { return "" }
        let lines = result.output.split(separator: "\n").map(String.init)
        let mean = lines.first(where: { $0.contains("mean_volume:") })?.components(separatedBy: "mean_volume:").last?.trimmingCharacters(in: .whitespaces)
        let peak = lines.first(where: { $0.contains("max_volume:") })?.components(separatedBy: "max_volume:").last?.trimmingCharacters(in: .whitespaces)
        guard let peak, let mean else { return "" }
        return "Peak \(peak) · average \(mean)"
    }

    private func automationExpression(_ points: [VolumeAutomationPoint]) -> String {
        guard let first = points.first, let last = points.last else { return "1" }
        var expression = String(format: "%.4f", last.gain)
        for index in stride(from: points.count - 2, through: 0, by: -1) {
            let a = points[index], b = points[index + 1]
            let span = max(0.001, b.seconds - a.seconds)
            let interpolation = String(format: "%.4f+(%.4f-%.4f)*(t-%.4f)/%.4f", a.gain, b.gain, a.gain, a.seconds, span)
            expression = "if(lt(t,\(String(format: "%.4f", b.seconds))),\(interpolation),\(expression))"
        }
        return "if(lt(t,\(String(format: "%.4f", first.seconds))),\(String(format: "%.4f", first.gain)),\(expression))"
    }

    private func audioChannelCount(_ url: URL) -> AVAudioChannelCount {
        (try? AVAudioFile(forReading: url).processingFormat.channelCount) ?? 2
    }

    func addAutomationPoint(to clip: AudioClip, at seconds: Double? = nil) {
        var updated = clips.first(where: { $0.id == clip.id }) ?? clip
        let relativeTime = max(0, (seconds ?? playbackTime) - max(0, clip.offset))
        var points = updated.volumeAutomation ?? []
        points.append(VolumeAutomationPoint(seconds: relativeTime, gain: updated.gain))
        updated.volumeAutomation = points.sorted { $0.seconds < $1.seconds }
        updateClip(updated)
    }

    func updateAutomationPoint(_ point: VolumeAutomationPoint, for clip: AudioClip) {
        var updated = clips.first(where: { $0.id == clip.id }) ?? clip
        var points = updated.volumeAutomation ?? []
        guard let index = points.firstIndex(where: { $0.id == point.id }) else { return }
        points[index] = point
        updated.volumeAutomation = points.sorted { $0.seconds < $1.seconds }
        updateClip(updated)
    }

    func updateAutomationPoint(_ point: VolumeAutomationPoint, gain: Double, in clip: AudioClip) {
        var updated = clips.first(where: { $0.id == clip.id }) ?? clip
        var points = updated.volumeAutomation ?? []
        guard let index = points.firstIndex(where: { $0.id == point.id }) else { return }
        points[index].gain = gain
        updated.volumeAutomation = points.sorted { $0.seconds < $1.seconds }
        updateClip(updated)
    }

    func removeAutomationPoint(_ point: VolumeAutomationPoint, from clip: AudioClip) {
        var updated = clips.first(where: { $0.id == clip.id }) ?? clip
        updated.volumeAutomation?.removeAll { $0.id == point.id }
        updateClip(updated)
    }

    func removeClip(_ clip: AudioClip) {
        recordUndo()
        clips.removeAll { $0.id == clip.id }
        saveProject()
    }

    func updateClip(_ clip: AudioClip) {
        if let index = clips.firstIndex(where: { $0.id == clip.id }), clips[index] != clip {
            recordUndo()
            clips[index] = clip
            saveProject()
        }
    }

    func addClip(_ clip: AudioClip) {
        recordUndo()
        clips.insert(clip, at: 0)
        saveProject()
    }

    func showWorkspaceFolder() { NSWorkspace.shared.open(workspaceURL) }
    func showVideosFolder() { NSWorkspace.shared.open(videoDir) }
    func showClipsFolder() { NSWorkspace.shared.open(workspaceURL.appendingPathComponent("Clips", isDirectory: true)) }

    func sendClipToAudioWorkspace(_ clip: ClippedMoment) {
        referenceVideoURL = clip.url
        videoPlayer = AVPlayer(url: clip.url)
        videoPlayer?.isMuted = true
        mode = .mix
        status = "Loaded '\(clip.title)' into CineScope Audio Timeline"
    }

    func revealClipInFinder(_ clip: ClippedMoment) {
        NSWorkspace.shared.selectFile(clip.videoPath, inFileViewerRootedAtPath: "")
    }

    private func ensureFolders() {
        for folder in ["Voice", "Music", "Sound FX", "Imports", "Mixes", "Stems", "Video"].map({ "Audio/\($0)" }) + ["Videos", "Clips"] {
            try? fm.createDirectory(at: workspaceURL.appendingPathComponent(folder, isDirectory: true), withIntermediateDirectories: true)
        }
    }

    private func loadProject() {
        ensureFolders()
        if let data = try? Data(contentsOf: clipMetaURL), let saved = try? JSONDecoder().decode([AudioClip].self, from: data) {
            clips = saved.filter { fm.fileExists(atPath: $0.filename) }.sorted { $0.createdAt > $1.createdAt }
        }
    }

    private func saveProject() {
        if let data = try? JSONEncoder().encode(clips) {
            try? data.write(to: clipMetaURL, options: .atomic)
        }
    }

    private func loadWorkspaceState() {
        guard let data = try? Data(contentsOf: workspaceStateURL), let state = try? JSONDecoder().decode(WorkspaceState.self, from: data) else { return }
        sceneMarkers = state.markers.sorted { $0.seconds < $1.seconds }
        if let path = state.referenceVideoPath, fm.fileExists(atPath: path) {
            let url = URL(fileURLWithPath: path)
            referenceVideoURL = url
            videoPlayer = AVPlayer(url: url)
            videoPlayer?.isMuted = true
        }
    }

    private func saveWorkspaceState() {
        let state = WorkspaceState(referenceVideoPath: referenceVideoURL?.path, markers: sceneMarkers)
        if let data = try? JSONEncoder().encode(state) {
            try? data.write(to: workspaceStateURL, options: .atomic)
        }
    }

    private func recordUndo() {
        let now = Date()
        guard now.timeIntervalSince(lastUndoCapture) > 0.35 else { return }
        undoHistory.append(clips)
        if undoHistory.count > 40 { undoHistory.removeFirst() }
        lastUndoCapture = now
        canUndo = true
    }

    func undoLastEdit() {
        guard let previous = undoHistory.popLast() else { canUndo = false; return }
        clips = previous
        canUndo = !undoHistory.isEmpty
        saveProject()
        status = "Undid last timeline edit"
    }

    func selectWorkspace() {
        let panel = NSOpenPanel()
        panel.canChooseDirectories = true
        panel.canChooseFiles = false
        panel.allowsMultipleSelection = false
        panel.prompt = "Use This Workspace"
        if panel.runModal() == .OK, let url = panel.url {
            workspaceURL = url
            currentWorkspaceName = url.lastPathComponent
            ensureFolders()
            loadProject()
            loadWorkspaceState()
        }
    }

    private func locateSoundEngine() -> String {
        var paths: [String] = []
        if let p = Bundle.main.resourceURL?.appendingPathComponent("StableAudio/optimized/mlx/sa3").path {
            paths.append(p)
        }
        if let appSupport = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask).first {
            paths.append(appSupport.appendingPathComponent("YouTube Studio Pro/StableAudio/optimized/mlx/sa3").path)
            paths.append(appSupport.appendingPathComponent("Cinema Audio Studio/StableAudio/optimized/mlx/sa3").path)
        }
        paths.append("/Users/dheerajsrinivasa/Library/Application Support/Cinema Audio Studio/StableAudio/optimized/mlx/sa3")

        for candidate in paths {
            let folder = URL(fileURLWithPath: candidate).deletingLastPathComponent()
            if fm.isExecutableFile(atPath: candidate) && fm.fileExists(atPath: folder.appendingPathComponent(".venv/bin/python").path) {
                return candidate
            }
        }
        return ""
    }

    private func runProcess(executable: URL, arguments: [String], directory: URL, environment: [String: String]) async throws -> (status: Int32, output: String) {
        try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let process = Process()
                let pipe = Pipe()
                process.executableURL = executable
                process.arguments = arguments
                process.currentDirectoryURL = directory
                process.environment = environment
                process.standardOutput = pipe
                process.standardError = pipe
                do {
                    try process.run()
                    let data = pipe.fileHandleForReading.readDataToEndOfFile()
                    process.waitUntilExit()
                    continuation.resume(returning: (process.terminationStatus, String(data: data, encoding: .utf8) ?? ""))
                } catch { continuation.resume(throwing: error) }
            }
        }
    }

    private func timestamp() -> String { DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .short).replacingOccurrences(of: ":", with: "-") }
    private func audioDuration(_ url: URL) -> Double? {
        guard let file = try? AVAudioFile(forReading: url), file.fileFormat.sampleRate > 0 else { return nil }
        let value = Double(file.length) / file.fileFormat.sampleRate
        return value.isFinite && value > 0 ? value : nil
    }
    private func safeFilename(_ value: String) -> String { value.replacingOccurrences(of: "[^A-Za-z0-9 -]", with: "", options: .regularExpression).replacingOccurrences(of: " ", with: "-") }
    private func emotionDisplay(_ value: String) -> String { value.replacingOccurrences(of: "^[^A-Za-z]+", with: "", options: .regularExpression).components(separatedBy: "(").first ?? value }
    private func applyPronunciationRules(_ text: String) -> String {
        var output = text
        for raw in pronunciationRules.components(separatedBy: .newlines) {
            let parts = raw.components(separatedBy: "=")
            guard parts.count >= 2 else { continue }
            let original = parts[0].trimmingCharacters(in: .whitespaces)
            let phonetic = parts.dropFirst().joined(separator: "=").trimmingCharacters(in: .whitespaces)
            if !original.isEmpty && !phonetic.isEmpty {
                output = output.replacingOccurrences(of: original, with: phonetic, options: [.caseInsensitive, .diacriticInsensitive])
            }
        }
        return output
    }

    // MARK: - Execute Topic to Video Pipeline (HyperFrames Premium)
    func runTopicToVideo() {
        guard !videoTopic.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        guard !videoGenerating else { return }

        videoGenerating = true
        videoProgress = 5.0
        videoStep = "Scripting & Storyboard..."
        status = "Directing viral video on Apple Silicon GPU..."

        let topic = videoTopic.trimmingCharacters(in: .whitespacesAndNewlines)
        let dur = Int(videoDuration)
        let fmt = videoFormat.contains("9:16") ? "vertical" : "horizontal"
        let avPos = avatarPosition.lowercased().replacingOccurrences(of: "-", with: "_")
        let avatarFlag = includeAvatar
        let voiceArg = "dheeraj"
        let capStyle = videoCaptionStyle.contains("Cyberpunk") ? "cyberpunk" : (videoCaptionStyle.contains("Clean") ? "clean" : "hormozi")
        let bgmArg: String = {
            if videoBgmMood.contains("Synth") { return "cyber_synth" }
            if videoBgmMood.contains("Suspense") { return "ambient_suspense" }
            if videoBgmMood.contains("Mystery") { return "dark_mystery" }
            if videoBgmMood.contains("Epic") { return "cinematic_epic" }
            if videoBgmMood.contains("Lo-Fi") { return "lofi_chill" }
            if videoBgmMood.contains("No Music") { return "none" }
            return "auto"
        }()
        let themeArg: String = {
            if videoThemePreset.contains("Warm") { return "warm_creator" }
            if videoThemePreset.contains("Emerald") { return "emerald_tech" }
            if videoThemePreset.contains("Crimson") { return "crimson_noir" }
            if videoThemePreset.contains("Greek") { return "luxury_gold" }
            if videoThemePreset.contains("Cyberpunk") { return "cyber_violet" }
            if videoThemePreset.contains("Ocean") { return "ocean_abyss" }
            if videoThemePreset.contains("Studio") { return "studio_frost" }
            return "auto"
        }()

        let outFolder = workspaceURL.appendingPathComponent("Videos", isDirectory: true)
        let outputMP4 = outFolder.appendingPathComponent("Video-\(Int(Date().timeIntervalSince1970)).mp4")

        Task.detached(priority: .userInitiated) {
            let pythonBin: String = {
                let candidate = "/Users/dheerajsrinivasa/.gemini/antigravity/scratch/clip-studio/.venv/bin/python3"
                if FileManager.default.fileExists(atPath: candidate) { return candidate }
                return "/opt/homebrew/bin/python3"
            }()

            let scriptPath: String = {
                if let res = Bundle.main.resourceURL?.appendingPathComponent("engines/generator/generator_bridge.py").path,
                   FileManager.default.fileExists(atPath: res) { return res }
                return "/Users/dheerajsrinivasa/.gemini/antigravity/scratch/youtube-studio-pro/engines/generator/generator_bridge.py"
            }()

            let proc = Process()
            proc.executableURL = URL(fileURLWithPath: pythonBin)
            var args = [
                scriptPath,
                "--topic", topic,
                "--duration", "\(dur)",
                "--format", fmt,
                "--avatar-pos", avPos,
                "--voice", voiceArg,
                "--caption-style", capStyle,
                "--bgm-mood", bgmArg,
                "--theme", themeArg,
                "--output", outputMP4.path,
                "--api-key", await self.openRouterAPIKey
            ]
            if avatarFlag { args.append("--avatar") }
            if bgmArg == "none" { args.append("--no-bgm") }
            proc.arguments = args

            var env = ProcessInfo.processInfo.environment
            env["PATH"] = "/Users/dheerajsrinivasa/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
            proc.environment = env

            let pipe = Pipe()
            proc.standardOutput = pipe
            proc.standardError = pipe

            func processGenOutput(_ text: String) async {
                let lines = text.components(separatedBy: .newlines)
                for line in lines {
                    let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
                    if trimmed.hasPrefix("{") && trimmed.hasSuffix("}") {
                        if let json = try? JSONSerialization.jsonObject(with: Data(trimmed.utf8)) as? [String: Any] {
                            let type = json["type"] as? String ?? ""
                            if type == "progress" {
                                let pct = json["percent"] as? Double ?? 0.0
                                let step = json["step"] as? String ?? ""
                                let msg = json["message"] as? String ?? ""
                                await MainActor.run {
                                    self.videoProgress = pct
                                    self.videoStep = "\(step): \(msg)"
                                    self.status = "\(step): \(msg)"
                                }
                            }
                        }
                    }
                }
            }

            pipe.fileHandleForReading.readabilityHandler = { handle in
                let data = handle.availableData
                guard !data.isEmpty, let text = String(data: data, encoding: .utf8) else { return }
                Task { await processGenOutput(text) }
            }

            do {
                try proc.run()
                proc.waitUntilExit()
                pipe.fileHandleForReading.readabilityHandler = nil

                await MainActor.run {
                    self.videoGenerating = false
                    if proc.terminationStatus == 0 && FileManager.default.fileExists(atPath: outputMP4.path) {
                        self.videoProgress = 100.0
                        self.videoStep = "Complete!"
                        self.status = "Rendered video ready: \(outputMP4.lastPathComponent)"
                        self.generatedVideoURL = outputMP4
                        self.videoPlayerPreview = AVPlayer(url: outputMP4)
                        self.videoPlayerPreview?.play()
                    } else {
                        self.status = "Render finished with non-zero status"
                    }
                }
            } catch {
                await MainActor.run {
                    self.videoGenerating = false
                    self.errorMessage = "Render pipeline error: \(error.localizedDescription)"
                }
            }
        }
    }

    // MARK: - Execute Video Clipper Pipeline (MacOpus Studio)
    func runVideoClipper() {
        guard !clipperSource.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "Please enter a valid YouTube video URL or local file path."
            return
        }
        guard !clipperProcessing else { return }

        clipperProcessing = true
        clipperProgress = 5.0
        clipperStep = "Initializing Clipper Engine..."
        status = "Processing video clipping on Apple Silicon..."

        let source = clipperSource.trimmingCharacters(in: .whitespacesAndNewlines)
        let layoutArg: String = {
            if clipLayout.contains("Crop") { return "crop" }
            if clipLayout.contains("Zoom") { return "zoom" }
            return "blur"
        }()

        let styleArg: String = {
            if clipSubtitleStyle.contains("Bounce") { return "bounce" }
            if clipSubtitleStyle.contains("Hype") { return "hype" }
            if clipSubtitleStyle.contains("Clean") { return "clean" }
            return "hormozi"
        }()

        let providerArg: String = {
            if clipAiProvider.contains("Gemini") { return "gemini" }
            if clipAiProvider.contains("OpenAI") { return "openai" }
            if clipAiProvider.contains("Groq") { return "groq" }
            if clipAiProvider.contains("Ollama") { return "ollama" }
            if clipAiProvider.contains("Energy") || clipAiProvider.contains("Offline") { return "loudness" }
            return "openrouter"
        }()

        var minDur = 25
        var maxDur = 60
        if clipDurationPreset.contains("< 30s") { minDur = 15; maxDur = 35 }
        else if clipDurationPreset.contains("60s – 90s") { minDur = 60; maxDur = 90 }
        else if clipDurationPreset.contains("90s – 150s") { minDur = 90; maxDur = 150 }

        let clipsCount = targetClipCount
        let modeArg = clipCurationMode.contains("Single") ? "single_moment" : "story_arc"
        let hookArg = clipEnableAiHook ? "--enable-ai-hook" : "--disable-ai-hook"
        let clipsDir = workspaceURL.appendingPathComponent("Clips", isDirectory: true).path

        Task.detached(priority: .userInitiated) {
            let pythonBin: String = {
                let candidate = "/Users/dheerajsrinivasa/.gemini/antigravity/scratch/youtube-studio-pro/engines/.venv/bin/python3"
                if FileManager.default.fileExists(atPath: candidate) { return candidate }
                if let res = Bundle.main.resourceURL?.appendingPathComponent("engines/.venv/bin/python3").path,
                   FileManager.default.fileExists(atPath: res) { return res }
                return "/opt/homebrew/bin/python3"
            }()

            let scriptPath: String = {
                if let res = Bundle.main.resourceURL?.appendingPathComponent("engines/clipper/clipper_bridge.py").path,
                   FileManager.default.fileExists(atPath: res) { return res }
                return "/Users/dheerajsrinivasa/.gemini/antigravity/scratch/youtube-studio-pro/engines/clipper/clipper_bridge.py"
            }()

            let proc = Process()
            proc.executableURL = URL(fileURLWithPath: pythonBin)
            proc.arguments = [
                scriptPath,
                "--source", source,
                "--layout", layoutArg,
                "--style", styleArg,
                "--ai-provider", providerArg,
                "--min-duration", "\(minDur)",
                "--max-duration", "\(maxDur)",
                "--clips", "\(clipsCount)",
                "--curation-mode", modeArg,
                hookArg,
                "--output-dir", clipsDir
            ]

            var env = ProcessInfo.processInfo.environment
            env["PATH"] = "/Users/dheerajsrinivasa/.hermes/tools/ffmpeg-9.0.1-darwin-arm64:/Users/dheerajsrinivasa/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
            proc.environment = env

            let pipe = Pipe()
            proc.standardOutput = pipe
            proc.standardError = pipe

            func processClipperOutput(_ text: String) async {
                let lines = text.components(separatedBy: .newlines)
                for line in lines {
                    let trimmed = line.trimmingCharacters(in: .whitespacesAndNewlines)
                    if trimmed.hasPrefix("{") && trimmed.hasSuffix("}") {
                        if let json = try? JSONSerialization.jsonObject(with: Data(trimmed.utf8)) as? [String: Any] {
                            let type = json["type"] as? String ?? ""
                            if type == "progress" {
                                let pct = json["percent"] as? Double ?? 0.0
                                let step = json["step"] as? String ?? ""
                                let msg = json["message"] as? String ?? ""
                                await MainActor.run {
                                    self.clipperProgress = pct
                                    self.clipperStep = "\(step): \(msg)"
                                    self.status = "\(step): \(msg)"
                                }
                            } else if type == "complete" {
                                if let rawClips = json["clips"] as? [[String: Any]] {
                                    var parsed: [ClippedMoment] = []
                                    for c in rawClips {
                                        let vPath = (c["video_path"] as? String) ?? (c["rendered_mp4"] as? String) ?? ""
                                        let cPath = (c["cover_path"] as? String) ?? ""
                                        let finalDur = (c["final_duration"] as? Double) ?? (c["duration"] as? Double) ?? 30.0
                                        parsed.append(ClippedMoment(
                                            id: c["id"] as? String ?? UUID().uuidString,
                                            title: c["title"] as? String ?? "Viral Clip",
                                            hook: c["hook"] as? String ?? "",
                                            hookNarration: c["hook_narration"] as? String,
                                            conclusionSummary: c["conclusion_summary"] as? String,
                                            isStoryArc: c["is_story_arc"] as? Bool,
                                            segmentCount: c["segment_count"] as? Int,
                                            duration: finalDur,
                                            viralityScore: c["virality_score"] as? Int ?? (c["score"] as? Int ?? 90),
                                            videoPath: vPath,
                                            coverPath: cPath,
                                            category: c["category"] as? String ?? "Highlight",
                                            description: c["description"] as? String ?? "",
                                            hashtags: c["hashtags"] as? [String] ?? [],
                                            explanation: (c["explanation"] as? String) ?? (c["reason"] as? String) ?? ""
                                        ))
                                    }
                                    await MainActor.run {
                                        self.generatedClips = parsed
                                        if let first = parsed.first {
                                            self.activeClipPlayer = AVPlayer(url: first.url)
                                            self.activeClipPlayer?.play()
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            // Pipe reads arrive in arbitrary chunks: reassemble whole lines before parsing.
            // Progress lines are shown as they come; the final result is handled after exit, in order.
            let lineBuffer = ClipperLineBuffer()
            pipe.fileHandleForReading.readabilityHandler = { handle in
                let data = handle.availableData
                guard !data.isEmpty else { return }
                for line in lineBuffer.append(data) where !line.contains("\"type\": \"complete\"") {
                    Task { await processClipperOutput(line) }
                }
            }

            do {
                try proc.run()
                proc.waitUntilExit()
                pipe.fileHandleForReading.readabilityHandler = nil
                let rest = pipe.fileHandleForReading.readDataToEndOfFile()
                _ = lineBuffer.append(rest)
                _ = lineBuffer.append(Data("\n".utf8))
                if let complete = lineBuffer.lastCompleteLine {
                    await processClipperOutput(complete)
                }

                await MainActor.run {
                    self.clipperProcessing = false
                    if proc.terminationStatus == 0 {
                        self.clipperProgress = 100.0
                        self.clipperStep = "Done! Generated \(self.generatedClips.count) clips."
                        self.status = "Clipped \(self.generatedClips.count) viral moments"
                    } else {
                        self.status = "Clipper exited with code \(proc.terminationStatus)"
                    }
                }
            } catch {
                await MainActor.run {
                    self.clipperProcessing = false
                    self.errorMessage = "Failed to run clipper: \(error.localizedDescription)"
                }
            }
        }
    }
}

/// Collects clipper stdout and hands back whole lines; remembers the final "complete" result line.
final class ClipperLineBuffer: @unchecked Sendable {
    private var pending = Data()
    private let lock = NSLock()
    private(set) var lastCompleteLine: String?

    func append(_ data: Data) -> [String] {
        lock.lock(); defer { lock.unlock() }
        pending.append(data)
        var lines: [String] = []
        while let nl = pending.firstIndex(of: 0x0A) {
            let lineData = pending[pending.startIndex..<nl]
            pending.removeSubrange(pending.startIndex...nl)
            if let line = String(data: lineData, encoding: .utf8) {
                if line.contains("\"type\": \"complete\"") { lastCompleteLine = line }
                lines.append(line)
            }
        }
        return lines
    }
}

// MARK: - Main Unified Studio View
struct StudioView: View {
    @StateObject private var model = StudioModel()
    @State private var showSettings = false
    @State private var showVoiceImporter = false
    @State private var showAudioImporter = false
    @State private var showVideoImporter = false
    @State private var markerDraft = "Scene marker"
    @State private var timelineZoom = 28.0

    var body: some View {
        HStack(spacing: 0) {
            sidebar
            Rectangle().fill(Color.white.opacity(0.07)).frame(width: 1)
            VStack(spacing: 0) {
                topBar
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 26) {
                        titleBlock
                        switch model.mode {
                        case .generateVideo:
                            topicToVideoStudio
                        case .clipVideo:
                            clipperStudio
                        case .voice:
                            voiceStudio
                        case .music:
                            musicStudio
                        case .effects:
                            effectsStudio
                        case .mix:
                            workspaceStudio
                        }
                    }
                    .padding(.horizontal, 34).padding(.top, 28).padding(.bottom, 40)
                    .frame(maxWidth: 1240, alignment: .leading)
                    .frame(maxWidth: .infinity, alignment: .center)
                }
                bottomBar
            }
        }
        .background(Color(hex: 0x0C0D10))
        .preferredColorScheme(.dark)
        .fileImporter(isPresented: $showVoiceImporter, allowedContentTypes: [.audio, .mp3, .wav], allowsMultipleSelection: false) { result in
            if case let .success(urls) = result, let url = urls.first { model.importReference(from: url) }
        }
        .fileImporter(isPresented: $showAudioImporter, allowedContentTypes: [.audio, .mp3, .wav], allowsMultipleSelection: false) { result in
            if case let .success(urls) = result, let url = urls.first { model.importAudio(url) }
        }
        .fileImporter(isPresented: $showVideoImporter, allowedContentTypes: [.movie, .mpeg4Movie], allowsMultipleSelection: false) { result in
            if case let .success(urls) = result, let url = urls.first { model.importVideo(url) }
        }
        .sheet(isPresented: $showSettings) { settingsSheet }
        .alert("Notice", isPresented: Binding(get: { model.errorMessage != nil }, set: { if !$0 { model.errorMessage = nil } })) {
            Button("OK", role: .cancel) { model.errorMessage = nil }
        } message: { Text(model.errorMessage ?? "") }
    }

    // MARK: - Sidebar with CineScope & YouTube Identity
    private var sidebar: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 12) {
                Image("YouTubeStudioLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 36, height: 36)
                    .clipShape(RoundedRectangle(cornerRadius: 9))
                    .overlay(RoundedRectangle(cornerRadius: 9).stroke(Color.white.opacity(0.12), lineWidth: 0.8))

                VStack(alignment: .leading, spacing: 2) {
                    Text("YOUTUBE STUDIO")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .tracking(1.4)
                    Text("PRO CREATOR SUITE")
                        .font(.system(size: 9, weight: .bold))
                        .tracking(1.8)
                        .foregroundStyle(Color(hex: 0xC7A477))
                }
            }
            .padding(.horizontal, 20).padding(.top, 22).padding(.bottom, 26)

            Text("VIDEO PRODUCTION").font(.system(size: 10, weight: .bold)).tracking(1.7).foregroundStyle(.white.opacity(0.34)).padding(.horizontal, 20).padding(.bottom, 8)
            modeButton(.generateVideo)
            modeButton(.clipVideo)

            Spacer().frame(height: 20)
            Rectangle().fill(Color.white.opacity(0.08)).frame(height: 1).padding(.horizontal, 18).padding(.bottom, 18)

            Text("CINESCOPE AUDIO STUDIO").font(.system(size: 10, weight: .bold)).tracking(1.7).foregroundStyle(Color(hex: 0xC7A477).opacity(0.75)).padding(.horizontal, 20).padding(.bottom, 8)
            modeButton(.voice)
            modeButton(.music)
            modeButton(.effects)

            Spacer().frame(height: 20)
            Rectangle().fill(Color.white.opacity(0.08)).frame(height: 1).padding(.horizontal, 18).padding(.bottom, 18)

            Text("PROJECT & MIXDOWN").font(.system(size: 10, weight: .bold)).tracking(1.7).foregroundStyle(.white.opacity(0.34)).padding(.horizontal, 20).padding(.bottom, 8)
            modeButton(.mix)

            HStack(spacing: 8) {
                Circle().fill(model.remoteAvailable ? Color(hex: 0x72C7A4) : Color(hex: 0xCF846D)).frame(width: 7, height: 7)
                Text(model.remoteAvailable ? "VOICE LINK READY" : "PORT 5070 OFFLINE").font(.system(size: 9, weight: .bold)).tracking(1.1).foregroundStyle(.white.opacity(0.46))
            }
            .padding(.horizontal, 20).padding(.top, 14)

            Spacer()

            Button {
                showSettings = true
            } label: {
                HStack(spacing: 11) {
                    Image(systemName: "slider.horizontal.3")
                    Text("Settings & Engines")
                    Spacer()
                    Image(systemName: "chevron.right").font(.system(size: 9)).opacity(0.45)
                }
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(.white.opacity(0.58))
                .padding(13)
                .background(Color.white.opacity(0.035), in: RoundedRectangle(cornerRadius: 10))
                .padding(.horizontal, 12).padding(.bottom, 16)
            }
            .buttonStyle(.plain)
        }
        .frame(width: 242)
        .background(Color(hex: 0x101114))
    }

    private func modeButton(_ mode: StudioMode) -> some View {
        Button {
            model.mode = mode
        } label: {
            HStack(spacing: 12) {
                Image(systemName: mode.icon).font(.system(size: 13, weight: .semibold)).frame(width: 18)
                Text(mode.rawValue).font(.system(size: 13, weight: .medium))
                Spacer()
                if mode == .voice && model.remoteAvailable {
                    Circle().fill(Color(hex: 0x72C7A4)).frame(width: 6, height: 6)
                }
            }
            .foregroundStyle(model.mode == mode ? Color(hex: 0xF1D5AE) : .white.opacity(0.58))
            .padding(.horizontal, 14).padding(.vertical, 10)
            .background(model.mode == mode ? Color.white.opacity(0.075) : .clear, in: RoundedRectangle(cornerRadius: 9))
            .overlay(alignment: .leading) {
                if model.mode == mode {
                    RoundedRectangle(cornerRadius: 2).fill(Color(hex: 0xD5AE7A)).frame(width: 3, height: 20)
                }
            }
            .padding(.horizontal, 10)
        }
        .buttonStyle(.plain)
    }

    private var topBar: some View {
        HStack {
            HStack(spacing: 8) {
                Image(systemName: "folder").foregroundStyle(Color(hex: 0xC6A577))
                Text(model.currentWorkspaceName).font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.76))
            }
            Spacer()
            HStack(spacing: 7) {
                Circle().fill(model.soundEngineAvailable ? Color(hex: 0x72C7A4) : Color(hex: 0xD7AA71)).frame(width: 6, height: 6)
                Text(model.soundEngineAvailable ? "LOCAL MLX ENGINE READY" : "SETUP LOCAL AUDIO").font(.system(size: 9, weight: .bold)).tracking(1).foregroundStyle(.white.opacity(0.55))
            }
            Button {
                showAudioImporter = true
            } label: {
                Label("Import Audio", systemImage: "plus").font(.system(size: 11, weight: .semibold)).foregroundStyle(.white.opacity(0.85)).padding(.horizontal, 13).padding(.vertical, 8).background(Color.white.opacity(0.07), in: RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain).padding(.leading, 12)
        }
        .padding(.horizontal, 30).frame(height: 57).background(Color(hex: 0x0F1013)).overlay(alignment: .bottom) { Rectangle().fill(Color.white.opacity(0.07)).frame(height: 1) }
    }

    private var titleBlock: some View {
        HStack(alignment: .bottom) {
            VStack(alignment: .leading, spacing: 8) {
                Text(model.mode.eyebrow).font(.system(size: 10, weight: .bold)).tracking(2.2).foregroundStyle(Color(hex: 0xC7A477))
                Text(titleForMode).font(.system(size: 28, weight: .semibold, design: .rounded)).tracking(-0.8).foregroundStyle(Color(hex: 0xF3F0EB))
                Text(subtitleForMode).font(.system(size: 13)).foregroundStyle(.white.opacity(0.48))
            }
            Spacer()
        }
    }

    private var titleForMode: String {
        switch model.mode {
        case .generateVideo: return "Direct retention video"
        case .clipVideo: return "Extract viral highlights"
        case .voice: return "Direct voice performance"
        case .music: return "Compose cinematic score"
        case .effects: return "Shape soundscape & foley"
        case .mix: return "Multitrack film workspace"
        }
    }

    private var subtitleForMode: String {
        switch model.mode {
        case .generateVideo: return "HyperFrames Premium composition, Whispered speech sync, avatar visemes & dynamic BGM."
        case .clipVideo: return "Smart face tracking, viral moment detection, and vertical 9:16 reels from any long video."
        case .voice: return "Fish Audio S2.1 Pro speech with personal voice cloning, emotions, and directions."
        case .music: return "Stable Audio 3 Small & Medium local generation on Apple Silicon."
        case .effects: return "Local Stable Audio 3 SFX for crisp foley, textures, and atmospheres."
        case .mix: return "Multitrack arrangement, 3-band EQ, compression, volume automation, and PCM mixdown."
        }
    }

    // MARK: - View 1: Topic to Video (HyperFrames Premium)
    private var topicToVideoStudio: some View {
        VStack(alignment: .leading, spacing: 20) {
            panel {
                sectionLabel("TOPIC & CREATIVE DIRECTION", detail: "Describe your concept, hook, target audience, or narrative thesis")
                TextEditor(text: $model.videoTopic)
                    .font(.system(size: 15, design: .serif))
                    .scrollContentBackground(.hidden)
                    .foregroundStyle(Color(hex: 0xE9E5DE))
                    .frame(minHeight: 110)
                    .padding(10)
                    .background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 10))
            }

            panel {
                HStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 6) {
                        sectionLabel("FORMAT", detail: "Aspect ratio for platforms")
                        Picker("Format", selection: $model.videoFormat) {
                            Text("📱 9:16 Vertical (Shorts/Reels)").tag("9:16 Vertical")
                            Text("🖥️ 16:9 Horizontal (YouTube)").tag("16:9 Horizontal")
                        }
                        .pickerStyle(.menu)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        sectionLabel("DURATION", detail: "\(Int(model.videoDuration)) seconds")
                        Slider(value: $model.videoDuration, in: 30...90, step: 15)
                            .tint(Color(hex: 0xC7A477))
                    }
                }
            }

            panel {
                HStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 6) {
                        Toggle(isOn: $model.includeAvatar) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Talking Avatar Sticker").font(.system(size: 12, weight: .bold))
                                Text("Automated visemes & silence pauses").font(.system(size: 10)).foregroundStyle(.white.opacity(0.4))
                            }
                        }
                        .toggleStyle(.checkbox)
                    }

                    if model.includeAvatar {
                        VStack(alignment: .leading, spacing: 6) {
                            sectionLabel("AVATAR PLACEMENT", detail: "Screen position")
                            Picker("Position", selection: $model.avatarPosition) {
                                Text("Bottom-Right").tag("Bottom-Right")
                                Text("Bottom-Left (Mirrored)").tag("Bottom-Left")
                            }
                            .pickerStyle(.menu)
                        }
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        sectionLabel("CAPTIONS", detail: "Word-by-word kinetic typography")
                        Picker("Style", selection: $model.videoCaptionStyle) {
                            Text("🔥 Hormozi Gold").tag("🔥 Hormozi Gold")
                            Text("⚡ Cyberpunk Neon").tag("⚡ Cyberpunk Neon")
                            Text("✨ Minimal Clean").tag("✨ Minimal Clean")
                        }
                        .pickerStyle(.menu)
                    }
                }

                HStack(spacing: 20) {
                    Picker("BGM Mood", selection: $model.videoBgmMood) {
                        Text("Auto (AI Directed)").tag("Auto (AI Directed)")
                        Text("⚡ Cyber Synth").tag("⚡ Cyber Synth")
                        Text("🕵️ Ambient Suspense").tag("🕵️ Ambient Suspense")
                        Text("🌌 Dark Mystery").tag("🌌 Dark Mystery")
                        Text("🎬 Cinematic Epic").tag("🎬 Cinematic Epic")
                        Text("🔇 No Music (Dialogue Only)").tag("🔇 No Music (Dialogue Only)")
                    }
                    .pickerStyle(.menu)
                    .frame(width: 175)

                    Picker("Visual Theme", selection: $model.videoThemePreset) {
                        Text("Auto (AI Directed)").tag("Auto (AI Directed)")
                        Text("🔥 Warm Creator (Amber)").tag("🔥 Warm Creator (Amber)")
                        Text("💎 Emerald Tech").tag("💎 Emerald Tech")
                        Text("🩸 Crimson Noir").tag("🩸 Crimson Noir")
                        Text("🏛️ Greek God & Luxury").tag("🏛️ Greek God & Luxury")
                        Text("⚡ Cyberpunk Violet").tag("⚡ Cyberpunk Violet")
                        Text("🌊 Deep Ocean").tag("🌊 Deep Ocean")
                        Text("✨ Studio Frost").tag("✨ Studio Frost")
                    }
                    .pickerStyle(.menu)
                    .frame(width: 180)
                }
            }

            HStack(spacing: 16) {
                Button {
                    model.runTopicToVideo()
                } label: {
                    HStack(spacing: 10) {
                        if model.videoGenerating {
                            ProgressView().controlSize(.small)
                        } else {
                            Image(systemName: "sparkles")
                        }
                        Text(model.videoGenerating ? "Rendering Video..." : "⚡ Generate Video from Topic")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundStyle(Color(hex: 0x141519))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 14)
                    .background(LinearGradient(colors: [Color(hex: 0xF3D7B0), Color(hex: 0xD0AA79)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
                .disabled(model.videoGenerating)

                Button {
                    model.showVideosFolder()
                } label: {
                    Label("Open Videos Folder", systemImage: "folder")
                        .font(.system(size: 12, weight: .medium))
                }
                .buttonStyle(SoftButtonStyle())

                Spacer()
                if model.videoGenerating {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(model.videoStep).font(.system(size: 11, weight: .medium)).foregroundStyle(.white.opacity(0.8))
                        ProgressView(value: model.videoProgress, total: 100.0).frame(width: 180)
                    }
                }
            }

            if let player = model.videoPlayerPreview {
                panel {
                    sectionLabel("GENERATED VIDEO PREVIEW", detail: model.generatedVideoURL?.lastPathComponent ?? "")
                    VideoPlayer(player: player)
                        .frame(height: 480)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.08), lineWidth: 1))

                    HStack(spacing: 12) {
                        Button {
                            if let url = model.generatedVideoURL {
                                NSWorkspace.shared.activateFileViewerSelecting([url])
                            }
                        } label: {
                            Label("Reveal in Finder", systemImage: "folder.badge.gearshape")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .buttonStyle(SoftButtonStyle())

                        Button {
                            if let url = model.generatedVideoURL {
                                model.clipperSource = url.path
                                model.mode = .clipVideo
                            }
                        } label: {
                            Label("Send to Video Clipper", systemImage: "scissors")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .buttonStyle(SoftButtonStyle())

                        Button {
                            if let url = model.generatedVideoURL {
                                model.importVideo(url)
                                model.mode = .mix
                            }
                        } label: {
                            Label("Open in Audio Timeline", systemImage: "waveform.path.ecg")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .buttonStyle(SoftButtonStyle())

                        Spacer()

                        Button {
                            model.generateSeoForCurrentVideo()
                        } label: {
                            HStack(spacing: 8) {
                                if model.isGeneratingSeo {
                                    ProgressView().controlSize(.small)
                                } else {
                                    Image(systemName: "megaphone")
                                }
                                Text(model.isGeneratingSeo ? "Generating SEO…" : "⚡ Viral SEO & Publishing")
                                    .font(.system(size: 12, weight: .bold))
                            }
                            .foregroundStyle(Color(hex: 0x141519))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(LinearGradient(colors: [Color(hex: 0xF3D7B0), Color(hex: 0xD0AA79)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                        .disabled(model.isGeneratingSeo)
                    }
                    .padding(.top, 8)

                    if !model.viralSeoText.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("VIRAL YOUTUBE PACKAGING (TITLES, DESCRIPTION & TAGS)").font(.system(size: 11, weight: .bold)).tracking(1).foregroundStyle(Color(hex: 0xD0AD7E))
                                Spacer()
                                Button("Copy to Clipboard") {
                                    NSPasteboard.general.clearContents()
                                    NSPasteboard.general.setString(model.viralSeoText, forType: .string)
                                    model.status = "SEO metadata copied to clipboard"
                                }
                                .buttonStyle(SoftButtonStyle())
                            }
                            ScrollView {
                                Text(model.viralSeoText)
                                    .font(.system(size: 13, design: .monospaced))
                                    .foregroundStyle(Color(hex: 0xE9E5DE))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(14)
                                    .background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 8))
                            }
                            .frame(maxHeight: 220)
                        }
                        .padding(.top, 14)
                    }
                }
            }
        }
    }

    // MARK: - View 2: Video Clipper (PeakCut & MacOpus Studio)
    private var clipperStudio: some View {
        VStack(alignment: .leading, spacing: 20) {
            panel {
                sectionLabel("VIDEO & STREAM SOURCE", detail: "Enter a YouTube, Twitch or Kick link, or drag-and-drop a local video file")
                HStack(spacing: 12) {
                    TextField("https://www.youtube.com/watch?v=... / Twitch / Kick / local file path", text: $model.clipperSource)
                        .textFieldStyle(.plain)
                        .padding(12)
                        .background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 9))

                    Button("Browse Video...") {
                        let panel = NSOpenPanel()
                        panel.allowedContentTypes = [.movie, .mpeg4Movie, .quickTimeMovie]
                        panel.allowsMultipleSelection = false
                        if panel.runModal() == .OK, let url = panel.url {
                            model.clipperSource = url.path
                        }
                    }
                    .buttonStyle(SoftButtonStyle())
                }
            }

            panel {
                HStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 6) {
                        sectionLabel("LAYOUT CONVERSION", detail: "9:16 vertical short framing")
                        Picker("Layout", selection: $model.clipLayout) {
                            Text("🌫️ Smart Ambient Blur (100% visible)").tag("🌫️ Smart Ambient Blur (100% visible, zero zoom)")
                            Text("📱 Center Crop (Full 9:16 bleed)").tag("📱 Center Crop (Full 9:16 bleed)")
                            Text("🔍 Zoomed Ambient Fill").tag("🔍 Zoomed Ambient Fill")
                        }
                        .pickerStyle(.menu)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        sectionLabel("KINETIC CAPTIONS & HOOK", detail: "Animated word pop & vector hook")
                        Picker("Captions", selection: $model.clipSubtitleStyle) {
                            Text("⚡ Bounce (Electric Cyan Pop)").tag("⚡ Bounce (Electric Cyan Pop)")
                            Text("🔥 Hype (High Energy Gold/Red)").tag("🔥 Hype (High Energy Gold/Red)")
                            Text("✨ Clean (Minimal Modern)").tag("✨ Clean (Minimal Modern)")
                            Text("🏆 Hormozi (Bold Impact Gold)").tag("🏆 Hormozi (Bold Impact Gold)")
                        }
                        .pickerStyle(.menu)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        sectionLabel("AI VIRAL SCOUT", detail: "Retention intelligence")
                        Picker("AI Provider", selection: $model.clipAiProvider) {
                            Text("🤖 Auto (Gemini 2.5 Flash)").tag("Auto (Gemini 2.5 Flash)")
                            Text("🌐 OpenRouter (Multi-Model)").tag("OpenRouter (Multi-Model)")
                            Text("🧠 OpenAI (GPT-4o-mini)").tag("OpenAI (GPT-4o-mini)")
                            Text("⚡ Groq (Ultra-Fast Llama)").tag("Groq (Ultra-Fast Llama 3.3)")
                            Text("💻 Ollama (Local / No Key)").tag("Ollama (Local / No Key)")
                            Text("🔊 Audio Energy (No AI / Offline)").tag("⚡ Audio Energy (No AI / Offline)")
                        }
                        .pickerStyle(.menu)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        sectionLabel("LENGTH & COUNT", detail: "Duration & moment targets")
                        HStack(spacing: 8) {
                            Picker("Duration", selection: $model.clipDurationPreset) {
                                Text("⚡ Quick (< 30s)").tag("< 30s")
                                Text("🎯 Optimal (30s – 60s)").tag("30s – 60s")
                                Text("📖 Deep Dive (60s – 90s)").tag("60s – 90s")
                            }
                            .pickerStyle(.menu)

                            Picker("Clips", selection: $model.targetClipCount) {
                                ForEach(1...6, id: \.self) { n in
                                    Text("\(n) clip\(n > 1 ? "s" : "")").tag(n)
                                }
                            }
                            .pickerStyle(.menu)
                            .frame(width: 90)
                        }
                    }
                }

                Rectangle().fill(Color.white.opacity(0.06)).frame(height: 1).padding(.vertical, 4)

                HStack(spacing: 24) {
                    VStack(alignment: .leading, spacing: 6) {
                        sectionLabel("CURATION ARCHETYPE", detail: "Narrative structure across the source video")
                        Picker("Curation Mode", selection: $model.clipCurationMode) {
                            Text("🎬 Multi-Beat Story Arc (Setup -> Payoff)").tag("🎬 Multi-Beat Story Arc (Setup -> Payoff)")
                            Text("🎯 Focused Single Moment (Guaranteed Resolution)").tag("🎯 Single Climax (Guaranteed Resolution)")
                        }
                        .pickerStyle(.menu)
                    }

                    VStack(alignment: .leading, spacing: 6) {
                        sectionLabel("SUSPENSE TEASER ENGINE", detail: "5-7 second curiosity cliffhanger before clip starts")
                        Toggle(isOn: $model.clipEnableAiHook) {
                            HStack(spacing: 6) {
                                Text("⚡ AI Suspense Hook Intro")
                                    .font(.system(size: 13, weight: .semibold))
                                    .foregroundStyle(Color(hex: 0xF3F0EB))
                                Text("(Voiceover + Tension Riser)")
                                    .font(.system(size: 11))
                                    .foregroundStyle(.white.opacity(0.6))
                            }
                        }
                        .toggleStyle(.checkbox)
                    }
                    Spacer()
                }
            }

            HStack(spacing: 16) {
                Button {
                    model.runVideoClipper()
                } label: {
                    HStack(spacing: 10) {
                        if model.clipperProcessing {
                            ProgressView().controlSize(.small)
                        } else {
                            Image(systemName: "scissors")
                        }
                        Text(model.clipperProcessing ? "Extracting Highlights..." : "✂️ Extract Viral Highlights")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .foregroundStyle(Color(hex: 0x141519))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 14)
                    .background(LinearGradient(colors: [Color(hex: 0xF3D7B0), Color(hex: 0xD0AA79)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 10))
                }
                .buttonStyle(.plain)
                .disabled(model.clipperProcessing)

                Button {
                    model.showClipsFolder()
                } label: {
                    Label("Open Clips Folder", systemImage: "folder")
                        .font(.system(size: 12, weight: .medium))
                }
                .buttonStyle(SoftButtonStyle())

                Spacer()
                if model.clipperProcessing {
                    VStack(alignment: .trailing, spacing: 4) {
                        Text(model.clipperStep).font(.system(size: 11, weight: .medium)).foregroundStyle(.white.opacity(0.8))
                        ProgressView(value: model.clipperProgress, total: 100.0).frame(width: 220)
                    }
                }
            }

            if !model.generatedClips.isEmpty {
                panel {
                    HStack {
                        sectionLabel("EXTRACTED VIRAL MOMENTS", detail: "\(model.generatedClips.count) high-retention vertical short\(model.generatedClips.count > 1 ? "s" : "") generated")
                        Spacer()
                    }

                    VStack(spacing: 14) {
                        ForEach(model.generatedClips) { clip in
                            HStack(alignment: .top, spacing: 16) {
                                // Cover thumbnail preview
                                ZStack(alignment: .bottomTrailing) {
                                    if let coverURL = clip.coverURL, let nsImg = NSImage(contentsOf: coverURL) {
                                        Image(nsImage: nsImg)
                                            .resizable()
                                            .aspectRatio(9/16, contentMode: .fill)
                                            .frame(width: 80, height: 128)
                                            .clipped()
                                            .clipShape(RoundedRectangle(cornerRadius: 8))
                                    } else {
                                        RoundedRectangle(cornerRadius: 8)
                                            .fill(Color(hex: 0x1c1d22))
                                            .frame(width: 80, height: 128)
                                            .overlay {
                                                Image(systemName: "film")
                                                    .font(.system(size: 24))
                                                    .foregroundStyle(.white.opacity(0.3))
                                            }
                                    }

                                    Text(String(format: "%.0fs", clip.duration))
                                        .font(.system(size: 9, weight: .bold, design: .monospaced))
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 2)
                                        .background(.black.opacity(0.75), in: RoundedRectangle(cornerRadius: 4))
                                        .padding(4)
                                }

                                VStack(alignment: .leading, spacing: 6) {
                                    HStack(spacing: 8) {
                                        Text(clip.title)
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundStyle(Color(hex: 0xF3F0EB))

                                        Spacer()

                                        Text("\(clip.viralityScore)% VIRAL")
                                            .font(.system(size: 10, weight: .heavy, design: .monospaced))
                                            .foregroundStyle(Color(hex: 0x72C7A4))
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 3)
                                            .background(Color(hex: 0x72C7A4).opacity(0.15), in: Capsule())
                                    }

                                    HStack(spacing: 8) {
                                        if clip.isStoryArc == true {
                                            Text("🎬 \(clip.segmentCount ?? 3)-BEAT STORY ARC")
                                                .font(.system(size: 9, weight: .bold))
                                                .foregroundStyle(Color(hex: 0x72C7A4))
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background(Color(hex: 0x72C7A4).opacity(0.15), in: Capsule())
                                        }

                                        if let cat = clip.category, !cat.isEmpty {
                                            Text(cat.uppercased())
                                                .font(.system(size: 9, weight: .bold))
                                                .foregroundStyle(Color(hex: 0xD0AA79))
                                                .padding(.horizontal, 6)
                                                .padding(.vertical, 2)
                                                .background(Color(hex: 0xD0AA79).opacity(0.15), in: Capsule())
                                        }

                                        if !clip.hook.isEmpty {
                                            Text("HOOK: \(clip.hook)")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundStyle(.white.opacity(0.8))
                                        }
                                    }

                                    if let hookNarr = clip.hookNarration, !hookNarr.isEmpty {
                                        HStack(alignment: .top, spacing: 6) {
                                            Text("🎙️")
                                                .font(.system(size: 11))
                                            Text("\"\(hookNarr)\"")
                                                .font(.system(size: 11, weight: .medium, design: .serif))
                                                .italic()
                                                .foregroundStyle(Color(hex: 0x00F0FF).opacity(0.95))
                                                .lineLimit(2)
                                        }
                                        .padding(7)
                                        .background(Color(hex: 0x00F0FF).opacity(0.08), in: RoundedRectangle(cornerRadius: 6))
                                    }

                                    if let payoff = clip.conclusionSummary, !payoff.isEmpty {
                                        HStack(spacing: 6) {
                                            Text("🏆")
                                                .font(.system(size: 10))
                                            Text("Payoff: \(payoff)")
                                                .font(.system(size: 11, weight: .semibold))
                                                .foregroundStyle(Color(hex: 0xD0AA79))
                                                .lineLimit(1)
                                        }
                                    }

                                    if let desc = clip.description, !desc.isEmpty {
                                        Text(desc)
                                            .font(.system(size: 11))
                                            .foregroundStyle(.white.opacity(0.6))
                                            .lineLimit(2)
                                    }

                                    if let tags = clip.hashtags, !tags.isEmpty {
                                        Text(tags.map { "#\($0)" }.joined(separator: " "))
                                            .font(.system(size: 10, weight: .medium, design: .monospaced))
                                            .foregroundStyle(Color(hex: 0x8EB5E0))
                                    }

                                    // Action buttons
                                    HStack(spacing: 10) {
                                        Button {
                                            model.activeClipPlayer = AVPlayer(url: clip.url)
                                            model.activeClipPlayer?.play()
                                        } label: {
                                            Label("Play", systemImage: "play.fill")
                                                .font(.system(size: 10, weight: .bold))
                                        }
                                        .buttonStyle(SoftButtonStyle())

                                        Button {
                                            NSPasteboard.general.clearContents()
                                            NSPasteboard.general.setString(clip.title, forType: .string)
                                            model.status = "Copied title: '\(clip.title)'"
                                        } label: {
                                            Label("Copy Title", systemImage: "doc.on.doc")
                                                .font(.system(size: 10, weight: .medium))
                                        }
                                        .buttonStyle(SoftButtonStyle())

                                        Button {
                                            let tagsStr = (clip.hashtags ?? []).map { "#\($0)" }.joined(separator: " ")
                                            let fullText = "\(clip.title)\n\n\(clip.description ?? "")\n\n\(tagsStr)"
                                            NSPasteboard.general.clearContents()
                                            NSPasteboard.general.setString(fullText, forType: .string)
                                            model.status = "Copied viral caption & tags"
                                        } label: {
                                            Label("Copy SEO & Tags", systemImage: "tag")
                                                .font(.system(size: 10, weight: .medium))
                                        }
                                        .buttonStyle(SoftButtonStyle())

                                        Button {
                                            model.sendClipToAudioWorkspace(clip)
                                        } label: {
                                            Label("Score in Audio Studio", systemImage: "waveform.path.ecg")
                                                .font(.system(size: 10, weight: .semibold))
                                                .foregroundStyle(Color(hex: 0xD0AA79))
                                        }
                                        .buttonStyle(SoftButtonStyle())

                                        Button {
                                            model.revealClipInFinder(clip)
                                        } label: {
                                            Image(systemName: "arrow.up.right.square")
                                                .font(.system(size: 11))
                                        }
                                        .buttonStyle(SoftButtonStyle())
                                    }
                                    .padding(.top, 4)
                                }
                            }
                            .padding(14)
                            .background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 10))
                        }
                    }
                }
            }

            if let player = model.activeClipPlayer {
                panel {
                    HStack {
                        sectionLabel("VIRAL SHORT PREVIEW", detail: "9:16 hardware preview player")
                        Spacer()
                    }
                    VideoPlayer(player: player)
                        .frame(height: 520)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }

    // MARK: - View 3: CineScope Voice Studio (Full Voice Engine)
    private var voiceStudio: some View {
        VStack(alignment: .leading, spacing: 19) {
            panel {
                HStack {
                    sectionLabel("SCRIPT", detail: "Paste a scene, line, or narration")
                    Spacer()
                    Button("Clear") { model.speechText = "" }
                        .buttonStyle(.plain)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.white.opacity(0.42))
                }
                TextEditor(text: $model.speechText)
                    .font(.system(size: 15, weight: .regular, design: .serif))
                    .scrollContentBackground(.hidden)
                    .foregroundStyle(Color(hex: 0xE9E5DE))
                    .frame(minHeight: 158)
                    .padding(10)
                    .background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 10))
                    .overlay(alignment: .topLeading) {
                        if model.speechText.isEmpty {
                            Text("The camera holds on the empty platform. Then, from the dark…")
                                .font(.system(size: 15, design: .serif))
                                .foregroundStyle(.white.opacity(0.25))
                                .padding(.leading, 16).padding(.top, 18)
                                .allowsHitTesting(false)
                        }
                    }
                HStack {
                    Text("\(model.speechText.count) characters").font(.system(size: 10, design: .monospaced)).foregroundStyle(.white.opacity(0.31))
                    Spacer()
                    Text("Auto delivery follows the script’s wording and context").font(.system(size: 10)).foregroundStyle(.white.opacity(0.36))
                }
            }

            panel {
                HStack(spacing: 14) {
                    VStack(alignment: .leading, spacing: 8) {
                        sectionLabel("PERFORMER", detail: "Voice preset or your reference recording")
                        Picker("Voice", selection: $model.selectedVoice) {
                            ForEach(model.voices, id: \.self) { Text($0).tag($0) }
                        }
                        .labelsHidden().pickerStyle(.menu)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10).background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 9))
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        sectionLabel("DIRECTION", detail: "Choose a feeling or let the scene guide it")
                        Picker("Emotion", selection: $model.selectedEmotion) {
                            ForEach(model.emotions, id: \.self) { Text($0).tag($0) }
                        }
                        .labelsHidden().pickerStyle(.menu)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(10).background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 9))
                    }
                }

                TextField("Performance direction (e.g. [quietly, holding back tears])", text: $model.performanceDirection, axis: .vertical)
                    .lineLimit(1...2).textFieldStyle(.plain).font(.system(size: 12)).foregroundStyle(.white.opacity(0.78))
                    .padding(11).background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 8))

                if model.selectedEmotion == "✏️ Custom Acoustic Tag..." {
                    TextField("Custom Fish emotion tag, e.g. wistful", text: $model.customEmotion)
                        .textFieldStyle(.plain).padding(11).background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 8))
                }

                if model.selectedVoice.contains("Custom Voice Clone") {
                    HStack {
                        Image(systemName: "waveform.badge.mic").foregroundStyle(Color(hex: 0xCDAA79))
                        Text(model.voiceSampleName).font(.system(size: 11)).foregroundStyle(.white.opacity(0.55))
                        Spacer()
                        Button("Choose Reference Audio") { showVoiceImporter = true }.buttonStyle(SoftButtonStyle())
                    }
                    TextField("Exact transcript spoken in the reference audio", text: $model.referenceTranscript, axis: .vertical)
                        .lineLimit(2...4).textFieldStyle(.plain).font(.system(size: 11)).padding(10).background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 8))
                    Text("Use a clean reference with one speaker and enter its exact transcript. Only use a voice you have permission to clone.").font(.system(size: 10)).foregroundStyle(.white.opacity(0.38))
                }

                HStack(alignment: .top, spacing: 12) {
                    VStack(alignment: .leading, spacing: 7) {
                        sectionLabel("NAME PRONUNCIATIONS", detail: "One rule per line: spelling = how it sounds")
                        TextField("Aarav = aa-rahv    ·    Thiruvananthapuram = thiru-van-an-tha-pu-ram", text: $model.pronunciationRules, axis: .vertical)
                            .lineLimit(2...3).textFieldStyle(.plain).font(.system(size: 11)).foregroundStyle(.white.opacity(0.72))
                            .padding(10).background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 8))
                    }
                }
            }

            HStack {
                HStack(spacing: 8) {
                    Image(systemName: model.remoteAvailable ? "checkmark.circle.fill" : "sparkles")
                        .foregroundStyle(model.remoteAvailable ? Color(hex: 0x72C7A4) : Color(hex: 0xE7C99D))
                    Text(model.remoteAvailable ? "Fish Audio S2.1 Pro via port 5070" : "macOS Neural Voice & Cloud Fallback Ready")
                        .font(.system(size: 11)).foregroundStyle(.white.opacity(0.52))
                }
                Spacer()
                Button {
                    Task { await model.generateSpeech() }
                } label: {
                    Label(model.isGenerating ? "Generating…" : "Generate performance", systemImage: model.isGenerating ? "hourglass" : "waveform")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(Color(hex: 0x171615))
                        .padding(.horizontal, 18).padding(.vertical, 12)
                        .background(LinearGradient(colors: [Color(hex: 0xE7C99D), Color(hex: 0xC99F6F)], startPoint: .topLeading, endPoint: .bottomTrailing), in: RoundedRectangle(cornerRadius: 9))
                }
                .buttonStyle(.plain)
                .disabled(model.isGenerating)
                .opacity(model.isGenerating ? 0.55 : 1)
            }

            latestOutput
        }
    }

    // MARK: - View 4: CineScope Music Studio (Stable Audio MLX)
    private var musicStudio: some View {
        VStack(alignment: .leading, spacing: 18) {
            panel {
                HStack {
                    sectionLabel("MUSIC BRIEF", detail: "Describe the scene, instrumentation, texture, and energy")
                    Spacer()
                    Text("LOCAL · APPLE SILICON").font(.system(size: 9, weight: .bold)).tracking(1).foregroundStyle(Color(hex: 0x77C4A1))
                }
                TextEditor(text: $model.musicPrompt)
                    .font(.system(size: 14, design: .serif))
                    .scrollContentBackground(.hidden)
                    .foregroundStyle(Color(hex: 0xE9E5DE))
                    .frame(minHeight: 150)
                    .padding(10).background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 10))

                HStack(spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        sectionLabel(model.musicEditMode == "Replace region" ? "FINAL CUE LENGTH" : "LENGTH", detail: model.musicEditMode == "Continue" ? "Seconds to add" : model.musicEditMode == "Replace region" ? "Total output time" : "Seconds")
                        Slider(value: $model.musicSeconds, in: 10...(model.musicEditMode == "Continue" ? 112 : 120), step: 1).tint(Color(hex: 0xCDAA79))
                        Text("\(Int(model.musicSeconds)) sec\(model.musicEditMode == "Continue" ? " added" : model.musicEditMode == "Replace region" ? " total" : "")").font(.system(size: 11, design: .monospaced)).foregroundStyle(.white.opacity(0.57))
                    }.frame(maxWidth: .infinity, alignment: .leading)

                    VStack(alignment: .leading, spacing: 8) {
                        sectionLabel("MODEL", detail: "Optimized for Apple Silicon MLX")
                        HStack {
                            Image(systemName: "cpu").foregroundStyle(Color(hex: 0xCDAA79))
                            Picker("Music quality", selection: $model.musicQuality) {
                                Text(model.mediumModelAvailable ? "Cinematic · Medium" : "Cinematic · Medium (not installed)").tag("Cinematic · Medium").disabled(!model.mediumModelAvailable)
                                Text("Fast · Small").tag("Fast · Small")
                            }
                            .labelsHidden().pickerStyle(.menu).font(.system(size: 12, weight: .medium))
                        }.padding(.top, 6)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }

                editControls(for: true)
                qualityControls
            }

            HStack {
                Text("Use More like this for variations, Replace region to revise a section, or Continue to extend a cue.").font(.system(size: 11, design: .serif)).italic().foregroundStyle(.white.opacity(0.4))
                Spacer()
                generateButton("Compose music", icon: "music.note", enabled: true) {
                    Task { await model.generateSound(kind: .music) }
                }
            }

            latestOutput
        }
    }

    // MARK: - View 5: CineScope Sound FX Studio (Stable Audio SFX)
    private var effectsStudio: some View {
        VStack(alignment: .leading, spacing: 18) {
            panel {
                sectionLabel("SOUND DESIGN BRIEF", detail: "Describe the source, distance, material, space, and movement")
                TextEditor(text: $model.fxPrompt)
                    .font(.system(size: 14, design: .serif))
                    .scrollContentBackground(.hidden)
                    .foregroundStyle(Color(hex: 0xE9E5DE))
                    .frame(minHeight: 150)
                    .padding(10).background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 10))
                    .overlay(alignment: .topLeading) {
                        if model.fxPrompt.isEmpty {
                            Text("A single mouse click, close-miked, dry, a small plastic switch with a crisp release.")
                                .font(.system(size: 14, design: .serif)).foregroundStyle(.white.opacity(0.25))
                                .padding(.leading, 16).padding(.top, 18).allowsHitTesting(false)
                        }
                    }

                Menu {
                    Button("Wind through trees · leaves rustling") { model.fxPrompt = "Steady outdoor wind moving through a stand of trees, individual leaves and fine branches rustling and swaying at different distances, natural irregular gusts, open woodland ambience, no microphone wind noise, no music or voices." }
                    Button("Wind across grass · low field-level") { model.fxPrompt = "Low field-level perspective of a breeze sweeping across tall meadow grass, soft seed heads and blades brushing together in waves, gentle gusts pass left to right, open rural air, no trees, no voices, no music." }
                    Button("Desk chair sliding on wood floor") { model.fxPrompt = "An office desk chair with small casters rolling and scraping a short distance across a hard wooden floor, slight creak and wheel rattle, close indoor perspective, one natural movement and stop, no speech or music." }
                    Button("Sliding door · heavy track") { model.fxPrompt = "A heavy sliding door opening along a metal track, low rolling rumble with a brief gritty scrape and a solid stop, close interior perspective, single action, no voices or music." }
                } label: {
                    Label("Prompt examples", systemImage: "text.quote").font(.system(size: 10, weight: .medium)).foregroundStyle(Color(hex: 0xD8B98E))
                }

                HStack(spacing: 18) {
                    VStack(alignment: .leading, spacing: 8) {
                        sectionLabel(model.fxEditMode == "Replace region" ? "FINAL CLIP LENGTH" : "LENGTH", detail: model.fxEditMode == "Continue" ? "Seconds to add" : model.fxEditMode == "Replace region" ? "Total output time" : "Seconds")
                        Slider(value: $model.fxSeconds, in: 2...30, step: 1).tint(Color(hex: 0xCDAA79))
                        Text("\(Int(model.fxSeconds)) sec\(model.fxEditMode == "Continue" ? " added" : model.fxEditMode == "Replace region" ? " total" : "")").font(.system(size: 11, design: .monospaced)).foregroundStyle(.white.opacity(0.57))
                    }.frame(maxWidth: .infinity, alignment: .leading)

                    VStack(alignment: .leading, spacing: 8) {
                        sectionLabel("MODEL", detail: "Local foley & ambience")
                        HStack {
                            Image(systemName: "waveform.path.ecg").foregroundStyle(Color(hex: 0xCDAA79))
                            Text("Stable Audio 3 · Small SFX").font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.72))
                        }.padding(.top, 6)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                }

                editControls(for: false)
                qualityControls
            }

            HStack {
                Text("For critical Foley, render several takes and audition them; results depend on the local model.").font(.system(size: 11)).foregroundStyle(.white.opacity(0.4))
                Spacer()
                generateButton("Render sound", icon: "sparkles", enabled: true) {
                    Task { await model.generateSound(kind: .effects) }
                }
            }

            latestOutput
        }
    }

    // MARK: - View 6: CineScope Multitrack Film Workspace & Mixdown
    private var workspaceStudio: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(spacing: 13) {
                statCard("\(model.clips.count)", label: "AUDIO CLIPS", icon: "waveform")
                statCard("\(model.clips.filter { $0.kind == "Voice" }.count)", label: "VOICE TAKES", icon: "mic")
                statCard("\(model.clips.filter { $0.kind == "Music" || $0.kind == "Sound FX" }.count)", label: "SCORE & FOLEY", icon: "music.note")
            }

            panel {
                HStack {
                    sectionLabel("FILM TIMELINE", detail: "Arrange, trim, balance, process, and export synchronized audio")
                    Spacer()
                    Button { model.undoLastEdit() } label: { Label("Undo", systemImage: "arrow.uturn.backward") }
                        .buttonStyle(SoftButtonStyle()).disabled(!model.canUndo)
                    Button { showVideoImporter = true } label: { Label(model.referenceVideoURL == nil ? "Add picture" : "Replace picture", systemImage: "film").font(.system(size: 10, weight: .medium)) }
                        .buttonStyle(SoftButtonStyle())
                    Button { Task { await model.previewTimeline() } } label: { Label("Play timeline", systemImage: "play.fill").font(.system(size: 10, weight: .medium)) }
                        .buttonStyle(SoftButtonStyle()).disabled(model.clips.isEmpty || model.isExporting)
                    Button { Task { await model.makeMixdown() } } label: { Label(model.isExporting ? "Exporting…" : "Export mix", systemImage: "square.and.arrow.down").font(.system(size: 10, weight: .semibold)).foregroundStyle(Color(hex: 0x171615)).padding(.horizontal, 12).padding(.vertical, 8).background(Color(hex: 0xD9B98D), in: RoundedRectangle(cornerRadius: 8)) }
                        .buttonStyle(.plain).disabled(model.clips.isEmpty || model.isExporting)
                }

                if model.clips.isEmpty {
                    emptyWorkspace
                } else {
                    if let player = model.videoPlayer {
                        VideoPlayer(player: player).frame(height: 235).clipShape(RoundedRectangle(cornerRadius: 9)).overlay(alignment: .topLeading) { Label("REFERENCE PICTURE · MUTED", systemImage: "film").font(.system(size: 8, weight: .bold)).tracking(1).padding(8).background(.black.opacity(0.65), in: Capsule()).padding(8) }
                    }

                    HStack(spacing: 9) {
                        Button { model.addSceneMarker(markerDraft) } label: { Label("Add marker at playhead", systemImage: "mappin.and.ellipse") }.buttonStyle(SoftButtonStyle())
                        TextField("Marker name", text: $markerDraft).textFieldStyle(.plain).font(.system(size: 10)).padding(8).background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 6))
                        Spacer()
                        Text("ZOOM").font(.system(size: 8, weight: .bold)).tracking(1).foregroundStyle(.white.opacity(0.4))
                        Slider(value: $timelineZoom, in: 12...64).frame(width: 100).tint(Color(hex: 0xD8B98E))
                    }

                    timelineView

                    VStack(spacing: 0) {
                        ForEach(model.clips) { clip in clipRow(clip) }
                    }
                    .background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 10))

                    HStack(spacing: 12) {
                        exportPicker("RATE", selection: $model.exportSampleRate, options: [("48 kHz", 48000.0), ("96 kHz", 96000.0)])
                        exportPicker("BIT DEPTH", selection: $model.exportBitDepth, options: [("16-bit PCM", "16-bit PCM"), ("24-bit PCM", "24-bit PCM"), ("32-bit float", "32-bit float")])
                        exportPicker("LOUDNESS", selection: $model.loudnessTarget, options: [("Off", "Off"), ("Film · −23 LUFS", "EBU -23 LUFS"), ("Streaming · −14 LUFS", "Streaming -14 LUFS")])
                        Spacer()
                        Button { Task { await model.exportStems() } } label: { Label("Export stems", systemImage: "square.stack.3d.up") }
                            .buttonStyle(SoftButtonStyle()).disabled(model.clips.isEmpty || model.isExporting)
                    }

                    if !model.sceneMarkers.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack {
                                ForEach(model.sceneMarkers.sorted(by: { $0.seconds < $1.seconds })) { marker in
                                    HStack(spacing: 5) {
                                        Button("\(model.formattedTime(marker.seconds)) · \(marker.title)") { model.seekPlayback(to: marker.seconds) }.buttonStyle(.plain)
                                        Button { model.removeSceneMarker(marker) } label: { Image(systemName: "xmark.circle.fill") }.buttonStyle(.plain)
                                    }
                                    .font(.system(size: 9)).foregroundStyle(Color(hex: 0xD8B98E)).padding(7).background(Color.white.opacity(0.05), in: Capsule())
                                }
                            }
                        }
                    }

                    if !model.mixMeterSummary.isEmpty {
                        Label("LAST MIX LEVELS  ·  \(model.mixMeterSummary)", systemImage: "level3").font(.system(size: 9, weight: .medium, design: .monospaced)).foregroundStyle(Color(hex: 0x83C9AA))
                    }
                }
            }

            HStack {
                Button { model.selectWorkspace() } label: { Label("Change project folder", systemImage: "folder").font(.system(size: 11, weight: .medium)).foregroundStyle(.white.opacity(0.62)) }.buttonStyle(.plain)
                Spacer()
                Button { model.showWorkspaceFolder() } label: { Label("Open workspace in Finder", systemImage: "arrow.up.right.square").font(.system(size: 11, weight: .medium)).foregroundStyle(.white.opacity(0.62)) }.buttonStyle(.plain)
            }
        }
    }

    // MARK: - CineScope Multitrack Components
    private var timelineView: some View {
        let duration = max(10, model.projectDuration)
        let width = max(760, duration * timelineZoom)
        return ScrollView([.horizontal, .vertical]) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 0) {
                    ForEach(0...Int(duration / 5), id: \.self) { tick in
                        Text("\(tick * 5)s").font(.system(size: 8, design: .monospaced)).foregroundStyle(.white.opacity(0.35)).frame(width: timelineZoom * 5, alignment: .leading)
                    }
                }
                .frame(width: width, height: 23, alignment: .leading)

                ForEach(model.clips.filter { $0.kind != "Mixdown" }) { clip in
                    ZStack(alignment: .leading) {
                        Rectangle().fill(Color(hex: 0x111216))
                        Rectangle().fill(colorFor(clip.kind).opacity(0.17)).frame(width: max(4, model.clipDuration(clip) * timelineZoom), height: 30).offset(x: max(0, clip.offset) * timelineZoom)
                        WaveformStrip(url: clip.url, tint: colorFor(clip.kind)).frame(width: max(4, model.clipDuration(clip) * timelineZoom - 8), height: 22).offset(x: max(0, clip.offset) * timelineZoom + 4)
                        HStack {
                            Text(clip.name).font(.system(size: 8, weight: .medium)).lineLimit(1).padding(.leading, max(6, clip.offset * timelineZoom + 7))
                            Spacer()
                        }
                        .foregroundStyle(colorFor(clip.kind).opacity(0.75))

                        ForEach(model.sceneMarkers) { marker in
                            Rectangle().fill(Color(hex: 0xD8B98E).opacity(0.62)).frame(width: 1).offset(x: marker.seconds * timelineZoom)
                        }

                        if model.playbackDuration > 0 {
                            Rectangle().fill(Color.white.opacity(0.8)).frame(width: 1.5).offset(x: (model.playbackTime + (model.activeClipID == nil ? 0 : (model.clips.first(where: { $0.id == model.activeClipID })?.offset ?? 0))) * timelineZoom)
                        }
                    }
                    .frame(width: width, height: 35)
                    .contentShape(Rectangle())
                    .gesture(SpatialTapGesture().onEnded { value in
                        model.seekPlayback(to: max(0, value.location.x / timelineZoom))
                    })
                }
            }
        }
        .frame(height: min(245, CGFloat(36 * max(1, model.clips.filter { $0.kind != "Mixdown" }.count) + 25)))
        .background(Color(hex: 0x111216), in: RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.white.opacity(0.05), lineWidth: 1))
    }

    private func clipRow(_ clip: AudioClip) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Button { model.togglePlayback(clip) } label: {
                    Image(systemName: model.playingClip == clip.id ? "pause.fill" : "play.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(Color(hex: 0xD8B98E))
                        .frame(width: 25, height: 25)
                        .background(Color.white.opacity(0.07), in: Circle())
                }
                .buttonStyle(.plain)

                RoundedRectangle(cornerRadius: 2).fill(colorFor(clip.kind)).frame(width: 3, height: 26)

                VStack(alignment: .leading, spacing: 3) {
                    Text(clip.name).font(.system(size: 12, weight: .medium)).foregroundStyle(.white.opacity(0.84))
                    Text("\(clip.kind.uppercased()) · \(clip.createdAt.formatted(date: .omitted, time: .shortened))")
                        .font(.system(size: 9, weight: .medium)).tracking(0.7).foregroundStyle(.white.opacity(0.37))
                }

                Spacer(minLength: 5)

                Text("START").font(.system(size: 8, weight: .bold)).tracking(1).foregroundStyle(.white.opacity(0.3))
                TextField("0", value: binding(for: clip, keyPath: \.offset), format: .number.precision(.fractionLength(1)))
                    .textFieldStyle(.plain).font(.system(size: 10, design: .monospaced)).frame(width: 45).padding(6).background(Color.black.opacity(0.2), in: RoundedRectangle(cornerRadius: 5))
                Text("s").font(.system(size: 10)).foregroundStyle(.white.opacity(0.36))

                Text("LEVEL").font(.system(size: 8, weight: .bold)).tracking(1).foregroundStyle(.white.opacity(0.3)).padding(.leading, 6)
                Slider(value: binding(for: clip, keyPath: \.gain), in: 0...1.5).tint(colorFor(clip.kind)).frame(width: 80)

                Button { boolBinding(for: clip, keyPath: \.muted).wrappedValue.toggle() } label: {
                    Image(systemName: (clip.muted ?? false) ? "speaker.slash.fill" : "speaker.wave.2")
                        .foregroundStyle((clip.muted ?? false) ? Color.orange : Color.white.opacity(0.48))
                }
                .buttonStyle(.plain).help("Mute track")

                Button { boolBinding(for: clip, keyPath: \.solo).wrappedValue.toggle() } label: {
                    Text("S").font(.system(size: 9, weight: .bold))
                        .foregroundStyle((clip.solo ?? false) ? Color(hex: 0xD8B98E) : Color.white.opacity(0.42))
                        .frame(width: 18, height: 18)
                        .background(Color.white.opacity((clip.solo ?? false) ? 0.15 : 0.04), in: Circle())
                }
                .buttonStyle(.plain).help("Solo track")

                Button { model.removeClip(clip) } label: {
                    Image(systemName: "xmark").font(.system(size: 9, weight: .bold)).foregroundStyle(.white.opacity(0.34)).padding(6)
                }
                .buttonStyle(.plain).help("Remove from project")
            }
            .padding(.horizontal, 12).padding(.vertical, 10)

            DisclosureGroup {
                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        valueSlider("TRIM IN", value: optionalBinding(for: clip, keyPath: \.trimStart), range: 0...max(0.1, model.clipDuration(clip) - 0.1), suffix: "s")
                        valueSlider("TRIM TAIL", value: optionalBinding(for: clip, keyPath: \.trimEnd), range: 0...max(0.1, model.clipDuration(clip) - 0.1), suffix: "s")
                    }
                    HStack {
                        valueSlider("FADE IN", value: optionalBinding(for: clip, keyPath: \.fadeIn), range: 0...10, suffix: "s")
                        valueSlider("FADE OUT", value: optionalBinding(for: clip, keyPath: \.fadeOut), range: 0...10, suffix: "s")
                    }
                    valueSlider(clip.kind == "Voice" || clip.kind == "Music" || clip.kind == "Sound FX" ? "PAN" : "STEREO BALANCE", value: optionalBinding(for: clip, keyPath: clip.kind == "Import" ? \.stereoBalance : \.pan), range: -1...1, suffix: "")
                    HStack {
                        valueSlider("LOW EQ · 120 HZ", value: optionalBinding(for: clip, keyPath: \.lowEQ), range: -12...12, suffix: " dB")
                        valueSlider("MID EQ · 1 KHZ", value: optionalBinding(for: clip, keyPath: \.midEQ), range: -12...12, suffix: " dB")
                        valueSlider("HIGH EQ · 8 KHZ", value: optionalBinding(for: clip, keyPath: \.highEQ), range: -12...12, suffix: " dB")
                    }
                    HStack {
                        valueSlider("COMPRESSION", value: optionalBinding(for: clip, keyPath: \.compression), range: 0...1, suffix: "")
                        valueSlider("ROOM / ECHO", value: optionalBinding(for: clip, keyPath: \.room), range: 0...0.8, suffix: "")
                        valueSlider("DELAY", value: optionalBinding(for: clip, keyPath: \.delay), range: 0...1000, suffix: " ms")
                    }
                    HStack {
                        Button { model.addAutomationPoint(to: clip, at: model.playbackTime) } label: {
                            Label("Add level keyframe at playhead", systemImage: "point.topleft.down.curvedto.point.bottomright.up")
                        }
                        .buttonStyle(SoftButtonStyle())
                        Text("Automation keyframes: \(clip.volumeAutomation?.count ?? 0)").font(.system(size: 9)).foregroundStyle(.white.opacity(0.4))
                    }
                    ForEach(clip.volumeAutomation ?? []) { point in
                        HStack {
                            Text("KEYFRAME").font(.system(size: 8, weight: .bold)).foregroundStyle(.white.opacity(0.36))
                            Slider(value: automationBinding(clip: clip, point: point), in: 0...2).tint(Color(hex: 0xD8B98E))
                            Text("\(point.seconds, specifier: "%.1f")s").font(.system(size: 9, design: .monospaced))
                            Button { model.removeAutomationPoint(point, from: clip) } label: { Image(systemName: "xmark") }.buttonStyle(.plain)
                        }
                    }
                }
                .padding(.top, 9).padding(.horizontal, 12).padding(.bottom, 10)
            } label: {
                Text("Track processing · trim, fades, stereo, EQ, dynamics, space, automation").font(.system(size: 9, weight: .medium)).foregroundStyle(.white.opacity(0.42)).padding(.horizontal, 12).padding(.bottom, 9)
            }
            .padding(.horizontal, 8)

            if clip.id != model.clips.last?.id {
                Rectangle().fill(Color.white.opacity(0.055)).frame(height: 1).padding(.leading, 48)
            }
        }
    }

    private var latestOutput: some View {
        Group {
            if let clip = model.clips.first {
                panel {
                    let active = model.clips.first(where: { $0.id == model.activeClipID }) ?? clip
                    HStack(spacing: 14) {
                        Button { model.togglePlayback(active) } label: {
                            Image(systemName: model.playingClip == active.id ? "pause.fill" : "play.fill")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(Color(hex: 0x171615))
                                .frame(width: 40, height: 40)
                                .background(Color(hex: 0xD8B98E), in: Circle())
                        }
                        .buttonStyle(.plain)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(model.activeClipID == nil ? "LATEST TAKE" : (model.playingClip == active.id ? "NOW PLAYING" : "PAUSED"))
                                .font(.system(size: 9, weight: .bold)).tracking(1.5).foregroundStyle(Color(hex: 0xCDAA79))
                            Text(active.name).font(.system(size: 13, weight: .medium)).foregroundStyle(.white.opacity(0.85))
                        }

                        Spacer()
                        Text(active.kind.uppercased()).font(.system(size: 9, weight: .bold)).tracking(1).foregroundStyle(.white.opacity(0.42)).padding(.horizontal, 10).padding(.vertical, 6).background(Color.white.opacity(0.055), in: Capsule())
                        Button { NSWorkspace.shared.activateFileViewerSelecting([active.url]) } label: {
                            Image(systemName: "arrow.down.to.line").foregroundStyle(.white.opacity(0.62))
                        }
                        .buttonStyle(.plain).help("Show audio file")
                    }

                    HStack(spacing: 10) {
                        Button { model.seekPlayback(to: max(0, model.playbackTime - 5)) } label: { Image(systemName: "gobackward.5") }.buttonStyle(.plain).foregroundStyle(.white.opacity(0.58)).help("Back 5 seconds")
                        Slider(value: Binding(get: { model.playbackTime }, set: { model.seekPlayback(to: $0) }), in: 0...max(0.1, model.playbackDuration)).tint(Color(hex: 0xD8B98E))
                        Button { model.seekPlayback(to: min(model.playbackDuration, model.playbackTime + 5)) } label: { Image(systemName: "goforward.5") }.buttonStyle(.plain).foregroundStyle(.white.opacity(0.58)).help("Forward 5 seconds")
                        Text("\(model.formattedTime(model.playbackTime)) / \(model.formattedTime(model.playbackDuration))").font(.system(size: 10, design: .monospaced)).foregroundStyle(.white.opacity(0.48)).frame(width: 84, alignment: .trailing)
                    }
                }
            }
        }
    }

    private var qualityControls: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 16) {
                VStack(alignment: .leading, spacing: 4) {
                    sectionLabel("DETAIL", detail: "More steps take longer; 8 is the model's sweet spot")
                    Picker("Steps", selection: $model.soundSteps) {
                        Text("8 · Recommended").tag(8.0)
                        Text("12 · Slower").tag(12.0)
                        Text("16 · Slowest").tag(16.0)
                    }
                    .labelsHidden().pickerStyle(.menu)
                }.frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .leading, spacing: 4) {
                    sectionLabel("CANDIDATES", detail: "Render multiple takes to audition")
                    Picker("Candidate count", selection: $model.candidateCount) {
                        ForEach(1...4, id: \.self) { Text("\($0) take\($0 == 1 ? "" : "s")").tag(Double($0)) }
                    }
                    .labelsHidden().pickerStyle(.menu)
                }.frame(maxWidth: .infinity, alignment: .leading)

                VStack(alignment: .leading, spacing: 4) {
                    sectionLabel("PROMPT GUIDANCE", detail: "Higher guidance costs more time")
                    Picker("Guidance", selection: $model.soundGuidance) {
                        Text("Off · 1.0").tag(1.0)
                        Text("Gentle · 2.0").tag(2.0)
                        Text("Strong · 3.0").tag(3.0)
                    }
                    .labelsHidden().pickerStyle(.menu)
                }.frame(maxWidth: .infinity, alignment: .leading)
            }

            Toggle(isOn: $model.noiseCleanupEnabled) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Gentle noise cleanup after render").font(.system(size: 11, weight: .medium))
                    Text("FFmpeg spectral denoise reduces background hiss floor.").font(.system(size: 9)).foregroundStyle(.white.opacity(0.4))
                }
            }
            .toggleStyle(.checkbox).font(.system(size: 11)).foregroundStyle(.white.opacity(0.72))

            if model.soundGuidance != 1 {
                TextField("Optional exclusions (e.g. music, voices, wind buffeting)", text: $model.negativePrompt)
                    .textFieldStyle(.plain).font(.system(size: 11)).padding(9).background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    @ViewBuilder private func editControls(for music: Bool) -> some View {
        let mode = music ? $model.musicEditMode : $model.fxEditMode
        let options = music ? ["New score", "More like this", "Replace region", "Continue"] : ["New sound", "More like this", "Replace region", "Continue"]
        VStack(alignment: .leading, spacing: 9) {
            HStack(spacing: 14) {
                VStack(alignment: .leading, spacing: 4) {
                    sectionLabel("EDIT FROM", detail: "Use a generated or imported workspace clip")
                    Picker("Edit mode", selection: mode) {
                        ForEach(options, id: \.self) { Text($0).tag($0) }
                    }.labelsHidden().pickerStyle(.menu)
                }.frame(width: 170, alignment: .leading)

                if mode.wrappedValue != (music ? "New score" : "New sound") {
                    VStack(alignment: .leading, spacing: 4) {
                        sectionLabel("SOURCE CLIP", detail: "Choose a clip to vary or edit")
                        Picker("Source clip", selection: $model.editSourceID) {
                            Text("Choose clip…").tag(nil as UUID?)
                            ForEach(model.sourceClips) { clip in Text("\(clip.kind) · \(clip.name)").tag(clip.id as UUID?) }
                        }.labelsHidden().pickerStyle(.menu)
                    }.frame(maxWidth: .infinity, alignment: .leading)

                    if mode.wrappedValue == "More like this" {
                        VStack(alignment: .leading, spacing: 4) {
                            sectionLabel("VARIATION", detail: "Lower stays closer to the source")
                            Slider(value: $model.variationStrength, in: 0.4...0.8, step: 0.05).tint(Color(hex: 0xCDAA79))
                            Text(String(format: "Noise %.2f", model.variationStrength)).font(.system(size: 10, design: .monospaced)).foregroundStyle(.white.opacity(0.5))
                        }.frame(maxWidth: 130)
                    }
                }
            }

            if mode.wrappedValue == "Replace region", model.editSourceID != nil {
                VStack(alignment: .leading, spacing: 3) {
                    sectionLabel("REGENERATE REGION", detail: "Source range replaced; final cue duration is set above")
                    Slider(value: $model.inpaintStart, in: 0...max(0.1, model.selectedSourceDuration - 0.2), step: 0.1).tint(Color(hex: 0x8C88D8))
                    Slider(value: $model.inpaintEnd, in: max(0.1, model.inpaintStart + 0.1)...max(0.2, model.selectedSourceDuration), step: 0.1).tint(Color(hex: 0x8C88D8))
                    Text("\(model.formattedTime(model.inpaintStart)) – \(model.formattedTime(model.inpaintEnd))").font(.system(size: 10, design: .monospaced)).foregroundStyle(.white.opacity(0.52))
                    let target = music ? model.musicSeconds : model.fxSeconds
                    let replacement = target - model.selectedSourceDuration + (model.inpaintEnd - model.inpaintStart)
                    Text("New section ≈ \(model.formattedTime(replacement)) · finished cue ≈ \(model.formattedTime(target))").font(.system(size: 10, design: .monospaced)).foregroundStyle(Color(hex: 0xD8B98E))
                }
            }
            if mode.wrappedValue == "Continue" {
                Text("The model regenerates the last 1.5 seconds as a seam, then creates the added section. Longer continuations are slower and may drift from the original cue.").font(.system(size: 10)).foregroundStyle(.white.opacity(0.4))
            }
        }
        .padding(10).background(Color(hex: 0x141519).opacity(0.75), in: RoundedRectangle(cornerRadius: 9))
    }

    private var emptyWorkspace: some View {
        VStack(spacing: 12) {
            Image(systemName: "waveform.path").font(.system(size: 28, weight: .light)).foregroundStyle(Color(hex: 0xC5A274).opacity(0.8))
            Text("Your first take goes here").font(.system(size: 15, weight: .medium, design: .rounded)).foregroundStyle(.white.opacity(0.72))
            Text("Create speech, score, or sound design, then build your mix in this project.").font(.system(size: 11)).foregroundStyle(.white.opacity(0.38)).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 42)
    }

    private func exportPicker<T: Hashable>(_ title: String, selection: Binding<T>, options: [(String, T)]) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(title).font(.system(size: 8, weight: .bold)).tracking(1).foregroundStyle(.white.opacity(0.38))
            Picker(title, selection: selection) {
                ForEach(Array(options.enumerated()), id: \.offset) { _, option in Text(option.0).tag(option.1) }
            }.labelsHidden().pickerStyle(.menu)
        }
    }

    private func binding(for clip: AudioClip, keyPath: WritableKeyPath<AudioClip, Double>) -> Binding<Double> {
        Binding(get: { model.clips.first(where: { $0.id == clip.id })?[keyPath: keyPath] ?? clip[keyPath: keyPath] }, set: { value in var updated = model.clips.first(where: { $0.id == clip.id }) ?? clip; updated[keyPath: keyPath] = value; model.updateClip(updated) })
    }
    private func optionalBinding(for clip: AudioClip, keyPath: WritableKeyPath<AudioClip, Double?>) -> Binding<Double> {
        Binding(get: { (model.clips.first(where: { $0.id == clip.id }) ?? clip)[keyPath: keyPath] ?? 0 }, set: { value in var updated = model.clips.first(where: { $0.id == clip.id }) ?? clip; updated[keyPath: keyPath] = value; model.updateClip(updated) })
    }
    private func boolBinding(for clip: AudioClip, keyPath: WritableKeyPath<AudioClip, Bool?>) -> Binding<Bool> {
        Binding(get: { (model.clips.first(where: { $0.id == clip.id }) ?? clip)[keyPath: keyPath] ?? false }, set: { value in var updated = model.clips.first(where: { $0.id == clip.id }) ?? clip; updated[keyPath: keyPath] = value; model.updateClip(updated) })
    }
    private func automationBinding(clip: AudioClip, point: VolumeAutomationPoint) -> Binding<Double> {
        Binding(get: { model.clips.first(where: { $0.id == clip.id })?.volumeAutomation?.first(where: { $0.id == point.id })?.gain ?? point.gain }, set: { model.updateAutomationPoint(point, gain: $0, in: clip) })
    }
    private func valueSlider(_ title: String, value: Binding<Double>, range: ClosedRange<Double>, suffix: String) -> some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack {
                Text(title).font(.system(size: 7, weight: .bold)).tracking(0.7).foregroundStyle(.white.opacity(0.42))
                Spacer()
                Text(String(format: "%.1f%@", value.wrappedValue, suffix)).font(.system(size: 8, design: .monospaced)).foregroundStyle(.white.opacity(0.5))
            }
            Slider(value: value, in: range).tint(Color(hex: 0xD8B98E))
        }
        .frame(maxWidth: .infinity)
    }

    private func colorFor(_ kind: String) -> Color {
        if kind == "Voice" { return Color(hex: 0xD5AA78) }
        else if kind == "Music" { return Color(hex: 0x8C88D8) }
        else if kind == "Sound FX" { return Color(hex: 0x79B9A4) }
        else { return Color(hex: 0x9C9C9E) }
    }

    private func statCard(_ value: String, label: String, icon: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 15)).foregroundStyle(Color(hex: 0xD1AC7D))
            VStack(alignment: .leading, spacing: 4) {
                Text(value).font(.system(size: 17, weight: .semibold, design: .rounded)).foregroundStyle(.white.opacity(0.88))
                Text(label).font(.system(size: 8, weight: .bold)).tracking(1.1).foregroundStyle(.white.opacity(0.37))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(15)
        .background(Color(hex: 0x151619), in: RoundedRectangle(cornerRadius: 11))
        .overlay(RoundedRectangle(cornerRadius: 11).stroke(Color.white.opacity(0.055), lineWidth: 1))
    }

    private func panel<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 14, content: content)
            .padding(17)
            .background(Color(hex: 0x17181B), in: RoundedRectangle(cornerRadius: 13))
            .overlay(RoundedRectangle(cornerRadius: 13).stroke(Color.white.opacity(0.065), lineWidth: 1))
    }

    private func sectionLabel(_ label: String, detail: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label).font(.system(size: 9, weight: .bold)).tracking(1.5).foregroundStyle(.white.opacity(0.78))
            Text(detail).font(.system(size: 10)).foregroundStyle(.white.opacity(0.38))
        }
    }

    private func generateButton(_ title: String, icon: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(model.isGenerating ? "Rendering…" : title, systemImage: model.isGenerating ? "hourglass" : icon)
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color(hex: 0x171615))
                .padding(.horizontal, 17)
                .padding(.vertical, 11)
                .background(Color(hex: 0xD8B98E), in: RoundedRectangle(cornerRadius: 9))
        }
        .buttonStyle(.plain)
        .disabled(!enabled || model.isGenerating)
        .opacity(!enabled || model.isGenerating ? 0.5 : 1)
    }

    private var bottomBar: some View {
        HStack(spacing: 8) {
            Circle().fill(model.status.contains("failed") || model.status.contains("not found") ? Color(hex: 0xD79273) : Color(hex: 0x72C7A4)).frame(width: 6, height: 6)
            Text(model.status).font(.system(size: 10)).foregroundStyle(.white.opacity(0.5)).lineLimit(1)
            Spacer()
            Text("\(model.clips.count) ASSETS IN WORKSPACE").font(.system(size: 9, weight: .bold)).tracking(1).foregroundStyle(.white.opacity(0.32))
        }
        .padding(.horizontal, 24).frame(height: 38).background(Color(hex: 0x101114)).overlay(alignment: .top) { Rectangle().fill(Color.white.opacity(0.06)).frame(height: 1) }
    }

    // MARK: - CineScope Settings Sheet (OpenRouter Keychain, port 5070, Stable Audio)
    private var settingsSheet: some View {
        VStack(alignment: .leading, spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 5) {
                    Text("Engines & Workspace").font(.system(size: 22, weight: .semibold, design: .rounded))
                    Text("Manage AI runtime connections, credentials, and storage.").font(.system(size: 12)).foregroundStyle(.white.opacity(0.48))
                }
                Spacer()
                Button { showSettings = false } label: {
                    Image(systemName: "xmark").foregroundStyle(.white.opacity(0.55)).padding(8).background(Color.white.opacity(0.07), in: Circle())
                }
                .buttonStyle(.plain)
            }

            VStack(alignment: .leading, spacing: 14) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("OPENROUTER API KEY (TOPIC-TO-VIDEO & VIRAL SEO)").font(.system(size: 10, weight: .bold)).tracking(1).foregroundStyle(Color(hex: 0xD0AD7E))
                    HStack(spacing: 8) {
                        SecureField("Paste OpenRouter API key", text: $model.openRouterAPIKey)
                            .textFieldStyle(.plain).padding(10).background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 8))
                        Button("Save Key") { model.saveOpenRouterKey() }.buttonStyle(SoftButtonStyle())
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("FISH AUDIO CLOUD API KEY (OPTIONAL CLOUD VOICE)").font(.system(size: 10, weight: .bold)).tracking(1).foregroundStyle(Color(hex: 0xD0AD7E))
                    HStack(spacing: 8) {
                        SecureField("Paste Fish Audio API key (optional)", text: $model.fishAudioAPIKey)
                            .textFieldStyle(.plain).padding(10).background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 8))
                        Button("Save Key") { model.saveFishAudioKey() }.buttonStyle(SoftButtonStyle())
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("ELEVENLABS API KEY (OPTIONAL CLOUD VOICE)").font(.system(size: 10, weight: .bold)).tracking(1).foregroundStyle(Color(hex: 0xD0AD7E))
                    HStack(spacing: 8) {
                        SecureField("Paste ElevenLabs API key (optional)", text: $model.elevenLabsAPIKey)
                            .textFieldStyle(.plain).padding(10).background(Color(hex: 0x141519), in: RoundedRectangle(cornerRadius: 8))
                        Button("Save Key") { model.saveElevenLabsKey() }.buttonStyle(SoftButtonStyle())
                    }
                }
                Text("Stored securely in macOS Keychain and shared between CineScope and YouTube Studio Pro.").font(.system(size: 10)).foregroundStyle(.white.opacity(0.43))
            }

            settingsRow("Voice Performance Engine", status: model.remoteAvailable ? "Connected · localhost:5070" : "Active · macOS Neural Voice & Cloud", detail: model.remoteAvailable ? "Speech synthesized by Fish Audio S2.1 Pro on local port 5070." : "Automatic fallback to high-fidelity macOS Neural Voice & cloud endpoints.", ok: true)

            settingsRow("Music & Sound Effects Engine", status: model.soundEngineAvailable ? "Stable Audio MLX Ready" : "Active · Studio Pro Library", detail: model.soundEngineAvailable ? (model.mediumModelAvailable ? "Small Music, Small SFX, and Medium Cinematic models ready on Apple Silicon." : "Small Music and SFX ready. Medium weights not yet detected.") : "Studio Pro Foley & Cinematic Score suite active with instant render.", ok: true)

            if !model.soundEngineAvailable {
                VStack(alignment: .leading, spacing: 8) {
                    Text("LOCAL MLX ENGINE SETUP").font(.system(size: 10, weight: .bold)).tracking(1).foregroundStyle(Color(hex: 0xD0AD7E))
                    Button { installStableRuntime() } label: {
                        Label(model.installingAudio ? "Setting up runtime…" : "Install local audio engine", systemImage: "arrow.down.to.line.compact")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(Color(hex: 0x171615))
                            .padding(.horizontal, 13).padding(.vertical, 9)
                            .background(Color(hex: 0xD8B98E), in: RoundedRectangle(cornerRadius: 8))
                    }
                    .buttonStyle(.plain)
                    .disabled(model.installingAudio)
                }
            }

            VStack(alignment: .leading, spacing: 9) {
                Text("HUGGING FACE ACCESS").font(.system(size: 10, weight: .bold)).tracking(1).foregroundStyle(Color(hex: 0xD0AD7E))
                Text(model.huggingFaceConnected ? "Account connected on this Mac. Stability AI model license accepted." : "Connect your account to download model weights. Your token is stored by Hugging Face CLI.").font(.system(size: 11)).foregroundStyle(.white.opacity(0.57)).fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 12) {
                    Link("Accept model access", destination: URL(string: "https://huggingface.co/stabilityai/stable-audio-3-optimized")!)
                        .font(.system(size: 10, weight: .medium)).foregroundStyle(Color(hex: 0xD9B98E))
                    Button(model.huggingFaceConnected ? "Signed In" : "Connect Hugging Face") { model.openHuggingFaceLogin() }
                        .buttonStyle(SoftButtonStyle()).disabled(model.huggingFaceConnected)
                    Button("Refresh Status") { Task { await model.refreshHuggingFaceStatus() } }
                        .buttonStyle(SoftButtonStyle())
                    Text(model.mediumModelAvailable ? "Medium music · ready" : "Medium music · not installed")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(model.mediumModelAvailable ? Color(hex: 0x83C9AA) : Color(hex: 0xD8B98E))
                }
            }

            Divider().overlay(Color.white.opacity(0.1))

            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Workspace Directory").font(.system(size: 12, weight: .semibold))
                    Text(model.workspaceURL.path).font(.system(size: 10, design: .monospaced)).foregroundStyle(.white.opacity(0.39)).lineLimit(1)
                }
                Spacer()
                Button("Choose Folder") { model.selectWorkspace() }.buttonStyle(SoftButtonStyle())
            }

            HStack {
                Spacer()
                Button("Done") { showSettings = false }.buttonStyle(SoftButtonStyle())
            }
        }
        .padding(24).frame(width: 530).background(Color(hex: 0x17181B)).preferredColorScheme(.dark)
    }

    private func settingsRow(_ title: String, status: String, detail: String, ok: Bool) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: ok ? "checkmark.circle.fill" : "circle.dashed").foregroundStyle(ok ? Color(hex: 0x72C7A4) : Color(hex: 0xD3AC7C)).padding(.top, 1)
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(title).font(.system(size: 12, weight: .semibold))
                    Spacer()
                    Text(status).font(.system(size: 10, weight: .medium)).foregroundStyle(ok ? Color(hex: 0x83C9AA) : Color(hex: 0xD8B98E))
                }
                Text(detail).font(.system(size: 10)).foregroundStyle(.white.opacity(0.43)).fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func installStableRuntime() {
        guard !model.installingAudio else { return }
        model.installingAudio = true
        model.status = "Installing the Apple silicon audio runtime…"
        Task.detached(priority: .userInitiated) {
            do {
                let fm = FileManager.default
                let support = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("YouTube Studio Pro", isDirectory: true)
                try fm.createDirectory(at: support, withIntermediateDirectories: true)
                let runtime = support.appendingPathComponent("StableAudio", isDirectory: true)

                // If CineScope already has it, copy it directly!
                let cinemaSupport = fm.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("Cinema Audio Studio/StableAudio", isDirectory: true)
                if fm.fileExists(atPath: cinemaSupport.appendingPathComponent("optimized/mlx/install.sh").path) {
                    try? fm.copyItem(at: cinemaSupport, to: runtime)
                }

                let bundled = Bundle.main.resourceURL?.appendingPathComponent("StableAudio", isDirectory: true)
                if !fm.fileExists(atPath: runtime.appendingPathComponent("optimized/mlx/install.sh").path), let bundled, fm.fileExists(atPath: bundled.appendingPathComponent("optimized/mlx/install.sh").path) {
                    try fm.copyItem(at: bundled, to: runtime)
                }

                if !fm.fileExists(atPath: runtime.appendingPathComponent("optimized/mlx/install.sh").path) {
                    let archive = support.appendingPathComponent("stable-audio-3.tar.gz")
                    let download = Process(); download.executableURL = URL(fileURLWithPath: "/usr/bin/curl"); download.arguments = ["-L", "--fail", "--silent", "--show-error", "https://github.com/Stability-AI/stable-audio-3/archive/refs/heads/main.tar.gz", "-o", archive.path]
                    try download.run(); download.waitUntilExit()
                    guard download.terminationStatus == 0 else { throw StudioError.message("Could not download the official Stable Audio runtime source.") }
                    try fm.createDirectory(at: runtime, withIntermediateDirectories: true)
                    let tar = Process(); tar.executableURL = URL(fileURLWithPath: "/usr/bin/tar"); tar.arguments = ["-xzf", archive.path, "-C", runtime.path, "--strip-components=1"]
                    try tar.run(); tar.waitUntilExit()
                    guard tar.terminationStatus == 0 else { throw StudioError.message("Could not unpack Stable Audio runtime files.") }
                }

                let mlxFolder = runtime.appendingPathComponent("optimized/mlx", isDirectory: true)
                let logURL = support.appendingPathComponent("runtime-install.log")
                fm.createFile(atPath: logURL.path, contents: nil)
                let logHandle = try FileHandle(forWritingTo: logURL)
                let install = Process(); install.executableURL = URL(fileURLWithPath: "/bin/bash"); install.arguments = ["install.sh", "-y"]; install.currentDirectoryURL = mlxFolder
                var environment = ProcessInfo.processInfo.environment
                environment["PATH"] = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
                install.environment = environment; install.standardOutput = logHandle; install.standardError = logHandle
                try install.run(); install.waitUntilExit(); try? logHandle.close()
                guard install.terminationStatus == 0 else {
                    let log = (try? String(contentsOf: logURL, encoding: .utf8)) ?? ""
                    throw StudioError.message("Runtime setup failed. See ~/Library/Application Support/YouTube Studio Pro/runtime-install.log. \(log.suffix(450))")
                }
                await MainActor.run {
                    model.installingAudio = false
                    model.soundEnginePath = mlxFolder.appendingPathComponent("sa3").path
                    model.soundEngineAvailable = true
                    model.status = "Local runtime ready · Stable Audio weights available"
                }
            } catch {
                await MainActor.run { model.installingAudio = false; model.errorMessage = error.localizedDescription; model.status = "Audio engine setup needs attention" }
            }
        }
    }
}

// MARK: - CineScope Waveform Canvas
private struct WaveformStrip: View {
    let url: URL
    let tint: Color
    @State private var peaks: [CGFloat] = []

    var body: some View {
        Canvas { context, size in
            guard !peaks.isEmpty else { return }
            let step = size.width / CGFloat(peaks.count)
            for (index, peak) in peaks.enumerated() {
                let height = max(1, peak * size.height * 0.92)
                let rect = CGRect(x: CGFloat(index) * step, y: (size.height - height) / 2, width: max(1, step * 0.52), height: height)
                context.fill(Path(roundedRect: rect, cornerRadius: 1), with: .color(tint.opacity(0.85)))
            }
        }
        .task(id: url) {
            let source = url
            peaks = await Task.detached(priority: .utility) { Self.readPeaks(source) }.value
        }
        .accessibilityLabel("Audio waveform")
    }

    nonisolated private static func readPeaks(_ url: URL) -> [CGFloat] {
        guard let file = try? AVAudioFile(forReading: url) else { return [] }
        let frames = file.length
        guard frames > 0, let buffer = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: 4096) else { return [] }
        let bins = 96
        var result: [CGFloat] = []
        for bin in 0..<bins {
            let start = AVAudioFramePosition(bin) * frames / AVAudioFramePosition(bins)
            file.framePosition = start
            let count = AVAudioFrameCount(min(4096, max(1, frames - start)))
            guard (try? file.read(into: buffer, frameCount: count)) != nil, let channels = buffer.floatChannelData else { result.append(0.04); continue }
            var peak: Float = 0
            for channel in 0..<Int(buffer.format.channelCount) {
                for frame in 0..<Int(buffer.frameLength) { peak = max(peak, abs(channels[channel][frame])) }
            }
            result.append(CGFloat(min(1, max(0.04, peak))))
        }
        return result
    }
}

// MARK: - UI Styles & Color Helpers
struct SoftButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 11, weight: .semibold))
            .foregroundStyle(Color(hex: 0xE1C49C))
            .padding(.horizontal, 12).padding(.vertical, 8)
            .background(Color.white.opacity(configuration.isPressed ? 0.12 : 0.07), in: RoundedRectangle(cornerRadius: 8))
    }
}

extension Color {
    init(hex: UInt, opacity: Double = 1) {
        self.init(.sRGB, red: Double((hex >> 16) & 0xff) / 255, green: Double((hex >> 8) & 0xff) / 255, blue: Double(hex & 0xff) / 255, opacity: opacity)
    }
}
