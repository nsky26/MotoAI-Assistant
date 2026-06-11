import React, { useState, useEffect } from "react";
import { 
  Folder, 
  FileCode, 
  CheckCircle2, 
  Layers, 
  Play, 
  Smartphone, 
  Terminal, 
  Copy, 
  BookOpen, 
  TrendingUp, 
  ShieldAlert, 
  User, 
  Grid,
  MapPin,
  Mic,
  Camera,
  Compass,
  Phone,
  Settings,
  Flame,
  Wrench,
  Cpu,
  Star,
  ExternalLink,
  Info,
  Brain,
  Network,
  Zap,
  Sliders,
  Video,
  Eye
} from "lucide-react";

// In-app mock codes corresponding exactly to the Dart files we written in the workspace
const FLUTTER_FILES = [
  {
    path: "lib/main.dart",
    label: "main.dart",
    description: "App configuration & GoRouter entry",
    code: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    const ProviderScope(
      child: MotoAIApp(),
    ),
  );
}

class MotoAIApp extends ConsumerWidget {
  const MotoAIApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterWithStateProvider);

    return MaterialApp.router(
      title: 'MotoAI',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.darkTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.dark,
      routerConfig: router,
    );
  }
}`
  },
  {
    path: "lib/core/theme/app_theme.dart",
    label: "app_theme.dart",
    description: "Cybernetic Neon Green design tokens",
    code: `import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  static const Color darkBackground = Color(0xFF0F0F11);
  static const Color cardBackground = Color(0xFF16161A);
  static const Color primaryNeon = Color(0xFF10B981); // Emerald Neon Green
  static const Color secondaryNeon = Color(0xFF34D399); // Lighter Neon Green
  static const Color alertRed = Color(0xFFEF4444);
  static const Color warningOrange = Color(0xFFF59E0B);
  static const Color terminalGray = Color(0xFF2E2E35);

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      scaffoldBackgroundColor: darkBackground,
      colorScheme: const ColorScheme.dark(
        primary: primaryNeon,
        secondary: secondaryNeon,
        surface: cardBackground,
        background: darkBackground,
        error: alertRed,
        onPrimary: Colors.black,
        onSecondary: Colors.black,
      ),
      textTheme: TextTheme(
        displayLarge: GoogleFonts.spaceGrotesk(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
        headlineMedium: GoogleFonts.spaceGrotesk(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
        titleLarge: GoogleFonts.spaceGrotesk(
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: Colors.white,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 15,
          color: Colors.white70,
        ),
        labelLarge: GoogleFonts.jetBrainsMono(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: primaryNeon,
          letterSpacing: 1.5,
        ),
      ),
    );
  }
}`
  },
  {
    path: "lib/core/router/app_router.dart",
    label: "app_router.dart",
    description: "GoRouter screens routing declarations",
    code: `import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/diagnosis/screens/camera_scan_screen.dart';
import '../../features/diagnosis/screens/diagnostic_report_screen.dart';
import '../../features/repair_workflow/screens/guided_repair_screen.dart';
import '../../features/mechanic/screens/mechanic_directory_screen.dart';

final appRouterWithStateProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
    routes: [
      GoRoute(
        path: '/',
        name: 'scan',
        builder: (context, state) => const CameraScanScreen(),
      ),
      GoRoute(
        path: '/report',
        name: 'report',
        builder: (context, state) {
          final issueType = state.uri.queryParameters['issue'] ?? 'battery';
          return DiagnosticReportScreen(issueType: issueType);
        },
      ),
      GoRoute(
        path: '/repair',
        name: 'repair',
        builder: (context, state) {
          final issueType = state.uri.queryParameters['issue'] ?? 'battery';
          return GuidedRepairScreen(issueType: issueType);
        },
      ),
      GoRoute(
        path: '/mechanics',
        name: 'mechanics',
        builder: (context, state) {
          final isCritical = state.uri.queryParameters['critical'] == 'true';
          return MechanicDirectoryScreen(isCritical: isCritical);
        },
      ),
    ],
  );
});`
  },
  {
    path: "lib/features/diagnosis/screens/camera_scan_screen.dart",
    label: "camera_scan_screen.dart",
    description: "Screen 1 - Adaptive UI viewfinder, mic with wave form",
    code: `// CameraScanScreen with Lidar dynamic overlays, Sound Calibration system & issue tags
// [Code resides inside /lib/features/diagnosis/screens/camera_scan_screen.dart]`
  },
  {
    path: "lib/features/diagnosis/screens/diagnostic_report_screen.dart",
    label: "diagnostic_report_screen.dart",
    description: "Screen 4 - 98% Gauge with cost evaluation layout",
    code: `// DiagnosticReportScreen with circular confidence progress bar & breakdown comparisons
// [Code resides inside /lib/features/diagnosis/screens/diagnostic_report_screen.dart]`
  },
  {
    path: "lib/features/repair_workflow/screens/guided_repair_screen.dart",
    label: "guided_repair_screen.dart",
    description: "Screen 2 - Step 2 of 5, Active Target lock & 8mm bolting",
    code: `// GuidedRepairScreen details standard wrench tracking with Torch and telemetry scanning simulator
// [Code resides inside /lib/features/repair_workflow/screens/guided_repair_screen.dart]`
  },
  {
    path: "lib/features/mechanic/screens/mechanic_directory_screen.dart",
    label: "mechanic_directory_screen.dart",
    description: "Screen 3 - Brake system hazard warning cards with directories",
    code: `// MechanicDirectoryScreen delivers crimson warnings & maps routing actions
// [Code resides inside /lib/features/mechanic/screens/mechanic_directory_screen.dart]`
  },
  {
    path: "pubspec.yaml",
    label: "pubspec.yaml",
    description: "Flutter dependencies configuration",
    code: `name: motoai
dependencies:
  go_router: ^13.0.0
  flutter_riverpod: ^2.5.0
  google_fonts: ^6.1.0`
  }
];

export default function App() {
  const [activeScreenIndex, setActiveScreenIndex] = useState(0); // 0: Scanning, 1: Report, 2: Guided Step, 3: Certified Directory
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  // Live Simulation state
  const [isRecording, setIsRecording] = useState(true);
  const [selectedTag, setSelectedTag] = useState("Strange noise");
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [lensMode, setLensMode] = useState<"lidar" | "standard" | "thermal" | "xray">("lidar");
  const [showGrid, setShowGrid] = useState(true);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [resSetting, setResSetting] = useState("1080p_60");
  const [showCameraSettings, setShowCameraSettings] = useState(false);
  const [showBlueprints, setShowBlueprints] = useState(false);
  const [isScanningStatus, setIsScanningStatus] = useState(false);
  const [stepIsVerified, setStepIsVerified] = useState(false);

  // Real Hardware Integration states
  const [useRealCamera, setUseRealCamera] = useState(false);
  const [useRealMic, setUseRealMic] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [micLevel, setMicLevel] = useState<number[]>([12, 18, 8, 22, 14, 25, 10, 16, 8, 14]);
  const [transcript, setTranscript] = useState<string>("\"I'm hearing a clicking sound near the battery...\"");

  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Bind video stream to the video DOM element on change
  useEffect(() => {
    if (videoRef.current) {
      if (cameraStream) {
        videoRef.current.srcObject = cameraStream;
        videoRef.current.play().catch(e => console.warn("Auto-play was blocked or interrupted:", e));
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [cameraStream]);

  // React hook to handle Real Camera Feed with robust constraints & multi-tiered fallback
  useEffect(() => {
    let localStream: MediaStream | null = null;
    if (useRealCamera) {
      setCameraError(null);
      // Tier 1: Seek idealized mobile environment camera
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: { ideal: "environment" } // using 'ideal' prevents overconstrained exceptions on desktop/front cameras
        } 
      })
      .then(stream => {
        localStream = stream;
        setCameraStream(stream);
      })
      .catch(err => {
        console.warn("Mobile environment facing camera constraint failed, seeking generic video...", err);
        // Tier 2: Seek generic laptop/desktop webcam
        navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          localStream = stream;
          setCameraStream(stream);
        })
        .catch(err2 => {
          console.error("Camera access failed or was denied completely by browser:", err2);
          setCameraError(err2.message || "Permission Denied or No Video Devices available");
        });
      });
    } else {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
      }
      setCameraError(null);
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [useRealCamera]);

  // React hook to handle Real Microphone & Web Audio FFT visualizer and live speech recognition representation
  useEffect(() => {
    let localStream: MediaStream | null = null;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let animationId: number;
    let recognition: any = null;

    if (useRealMic) {
      setMicError(null);
      // 1. Live Decibel Audio Analyzer
      navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        localStream = stream;
        setMicStream(stream);

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          audioContext = new AudioContextClass();
          analyser = audioContext.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.5;

          source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateVolumeLevels = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);

            // Generate heights for the 10-bar spectrum visualizer
            const adjustedLevels = Array.from({ length: 10 }).map((_, i) => {
              const byteVal = dataArray[i * 2] || dataArray[i] || 0;
              // Translate values to visual container heights from 4px min to 26px max height
              const height = 4 + (byteVal / 255) * 22;
              return Math.max(4, Math.min(28, Math.round(height)));
            });

            setMicLevel(adjustedLevels);
            animationId = requestAnimationFrame(updateVolumeLevels);
          };
          updateVolumeLevels();
        }

        // 2. Real Speech Recognition Caption Subtitles
        const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognitionClass) {
          try {
            recognition = new SpeechRecognitionClass();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";

            recognition.onstart = () => {
              setTranscript("\"Listening for mechanical issues... Speak now.\"");
            };

            recognition.onresult = (event: any) => {
              let liveText = "";
              for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                  liveText += event.results[i][0].transcript;
                }
              }
              if (liveText.trim()) {
                setTranscript('"' + liveText.trim() + '"');
              }
            };

            recognition.onerror = (e: any) => {
              console.warn("Speech recognition error status:", e.error);
            };

            recognition.start();
          } catch (speechErr) {
            console.error(speechErr);
          }
        }
      })
      .catch(err => {
        console.error("Microphone access failed or denied:", err);
        setMicError(err.message || "Permission Denied");
      });
    } else {
      if (micStream) {
        micStream.getTracks().forEach(track => track.stop());
        setMicStream(null);
      }
      setMicError(null);
      setMicLevel([12, 18, 8, 22, 14, 25, 10, 16, 8, 14]);
      setTranscript("\"I'm hearing a clicking sound near the battery...\"");
    }

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (animationId) cancelAnimationFrame(animationId);
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close();
      }
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {}
      }
    };
  }, [useRealMic]);

  const copyCodeToClipboard = (text: string, path: string) => {
    navigator.clipboard.writeText(text);
    setCopyStatus(path);
    setTimeout(() => setCopyStatus(null), 2000);
  };

  const handleVerifyStep = () => {
    setIsScanningStatus(true);
    setTimeout(() => {
      setIsScanningStatus(false);
      setStepIsVerified(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#070709] text-neutral-100 font-sans flex flex-col antialiased">
      {/* Upper Terminal Title bar */}
      <header className="border-b border-neutral-900 bg-[#0c0c0e]/85 backdrop-blur-md px-6 py-4 flex flex-wrap justify-between items-center gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-center text-emerald-400">
            <Cpu className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white font-extrabold tracking-tight text-lg">MotoAI</span>
              <span className="text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-900/50">
                FLUTTER & DART CHASSIS
              </span>
            </div>
            <p className="text-xs text-neutral-500">Clean Architecture & Riverpod Implementation Console</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 bg-neutral-950/80 px-4 py-2 rounded-lg border border-neutral-900">
          <span className="w-2 h-2 rounded bg-emerald-500 animate-ping" />
          <span>EMULATOR ENGINE ACTIVE</span>
          <span className="text-neutral-705">|</span>
          <span>SPRING BOOT BACKEND BOUNDARY READY</span>
        </div>
      </header>

      {/* Main split workarea */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto w-full">
        
        {/* LEFT COLUMN: Feature Simulator Mockup (lg:col-span-4) */}
        <section className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[390px] bg-neutral-950 rounded-[48px] p-4.5 border-[8px] border-neutral-800 shadow-[0_24px_50px_rgba(0,0,0,0.8)] relative">
            
            {/* Phone Speaker & Notch */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-40 h-8 bg-neutral-800 rounded-b-2xl z-20 flex justify-center items-start pt-1">
              <div className="w-16 h-1.5 bg-neutral-950 rounded-full" />
            </div>

            {/* Simulated Live View screen */}
            <div className="w-full aspect-[9/19.5] bg-[#0F0F11] rounded-[36px] overflow-hidden relative flex flex-col text-white font-sans">
              
              {/* Internal App bar Header */}
              <div className="pt-8 px-5 pb-3 bg-neutral-950 flex justify-between items-center border-b border-neutral-900">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-emerald-400 rounded-sm" />
                  <span className="text-md font-black tracking-tight font-sans">MotoAI</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-neutral-900 hover:bg-neutral-850 rounded-full flex items-center justify-center text-neutral-400 border border-neutral-800">
                    <User className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* SCREEN INTERIOR */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col">

                {/* SCREEN 1: Camera Scanning */}
                {activeScreenIndex === 0 && (
                  <div className="flex-Grow flex flex-col gap-4.5 animate-fadeIn">
                    <div className="text-center mt-1">
                      <h3 className="text-lg font-bold">Point camera at motorcycle</h3>
                      <div className="inline-block mt-0.5 px-2.5 py-0.5 border border-emerald-500/20 text-emerald-400 font-bold rounded">
                        and describe the issue
                      </div>
                    </div>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {[
                        { label: "Bike not starting", q: "battery" },
                        { label: "Strange noise", q: "battery" },
                        { label: "Smoke detected", q: "exhaust" },
                        { label: "Battery issue", q: "battery" },
                      ].map((tag) => (
                        <button
                          key={tag.label}
                          onClick={() => {
                            setSelectedTag(tag.label);
                            setActiveScreenIndex(1); // switch screen simulated
                          }}
                          className={`p-2 rounded-full border text-center font-semibold transition-all ${
                            selectedTag === tag.label 
                              ? "bg-emerald-400/10 border-emerald-400 text-emerald-400" 
                              : "bg-neutral-900/80 border-neutral-800 text-neutral-400"
                          }`}
                        >
                          {tag.label}
                        </button>
                      ))}
                    </div>

                    {/* Viewfinder block */}
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-950 border border-emerald-950">
                      {useRealCamera && cameraStream && !cameraError ? (
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover transition-all duration-300 pointer-events-none"
                          style={{
                            transform: `scale(${zoomScale})`,
                            filter: 
                              lensMode === "thermal" 
                                ? "hue-rotate(180deg) saturate(250%) contrast(180%)" 
                                : lensMode === "xray" 
                                ? "grayscale(100%) invert(100%) contrast(150%) brightness(1.2)" 
                                : "none"
                          }}
                          autoPlay
                          playsInline
                          muted
                        />
                      ) : (
                        <div className="relative w-full h-full">
                          <img 
                            src="/src/assets/images/sk_bike_bg_1781152534434.png" 
                            className="w-full h-full object-cover opacity-60 transition-all duration-300 pointer-events-none"
                            style={{
                              transform: `scale(${zoomScale})`,
                              filter: 
                                lensMode === "thermal" 
                                  ? "hue-rotate(180deg) saturate(250%) contrast(180%)" 
                                  : lensMode === "xray" 
                                  ? "grayscale(100%) invert(100%) contrast(150%) brightness(1.2)" 
                                  : "none"
                            }}
                            alt="Simulator stream"
                          />
                          {useRealCamera && cameraError && (
                            <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-5 text-center z-20 animate-fadeIn">
                              <ShieldAlert className="w-8 h-8 text-amber-500 mb-2 animate-bounce" />
                              <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">Webcam Blocked / Busy</h3>
                              <p className="text-[9px] text-neutral-400 mt-1.5 max-w-xs font-mono leading-relaxed">
                                {cameraError.includes("Permission")
                                  ? "Your browser blocked camera permission inside this iframe."
                                  : `Error: ${cameraError}`}
                              </p>
                              
                              <div className="mt-3 p-2 bg-neutral-900 border border-neutral-800 rounded text-[9px] text-emerald-400 font-mono text-left w-full leading-normal">
                                <span className="font-bold text-white block mb-0.5">💡 HOW TO FIX THIS:</span>
                                1. Look for the camera icon in your browser URL block, select "Always Allow".
                                <br />
                                2. Or click the <span className="text-white font-bold">"Open in New Tab"</span> button on the top right corner of AI Studio to escape iframe constraints!
                              </div>

                              <button
                                onClick={() => {
                                  setCameraError(null);
                                  setUseRealCamera(false);
                                }}
                                className="mt-3 px-3 py-1 bg-emerald-400 hover:bg-emerald-500 text-black font-extrabold text-[9px] rounded font-mono transition-all uppercase cursor-pointer"
                              >
                                Use Simulator Feed
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Flashlight beam simulation */}
                      {flashlightOn && (
                        <div 
                          className="absolute inset-0 pointer-events-none mix-blend-color-dodge z-10" 
                          style={{ background: "radial-gradient(circle at center, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.05) 80%)" }} 
                        />
                      )}

                      {/* Dashed Grid Lines overlay */}
                      {showGrid && (
                        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-10 opacity-20">
                          <div className="border-r border-b border-dashed border-white" />
                          <div className="border-r border-b border-dashed border-white" />
                          <div className="border-b border-dashed border-white" />
                          <div className="border-r border-b border-dashed border-white" />
                          <div className="border-r border-b border-dashed border-white" />
                          <div className="border-b border-dashed border-white" />
                          <div className="border-r border-dashed border-white" />
                          <div className="border-r border-dashed border-white" />
                          <div className="border-none" />
                        </div>
                      )}

                      {/* Moving laser scanner (only in LIDAR or standard mode) */}
                      {lensMode === "lidar" && (
                        <div className="absolute left-0 right-0 h-[2px] bg-emerald-400 shadow-[0_0_10px_#10b981] animate-bounce top-1/3 z-10" />
                      )}

                      {/* Active target tracking (only in LIDAR lens mode) */}
                      {lensMode !== "xray" && (
                        <div className="absolute top-[35%] right-[15%] w-1/3 h-1/3 border border-emerald-400 bg-emerald-400/10 rounded-sm z-10 transition-all">
                          <span className="absolute -top-5 left-0 px-1.5 py-0.5 bg-emerald-500 text-black text-[8px] font-mono font-bold rounded">
                            {lensMode === "thermal" ? "THERMAL CELL SENSOR" : "BATTERY CLUSTER"}
                          </span>
                        </div>
                      )}

                      {/* UI Controls top right bar */}
                      <div className="absolute top-2 right-2 flex gap-1.5 z-20">
                        <button 
                          onClick={() => setFlashlightOn(!flashlightOn)}
                          className={`p-1.5 rounded-lg border transition-all text-xs cursor-pointer ${flashlightOn ? "bg-amber-400 text-black border-amber-300" : "bg-black/60 text-white border-neutral-800 hover:bg-black/80"}`}
                          title="Toggle Flashlight / Torch"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setShowGrid(!showGrid)}
                          className={`p-1.5 rounded-lg border transition-all text-xs cursor-pointer ${showGrid ? "bg-emerald-500 text-black border-emerald-400" : "bg-black/60 text-white border-neutral-800 hover:bg-black/80"}`}
                          title="Toggle Grid Lines"
                        >
                          <Grid className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setShowCameraSettings(!showCameraSettings)}
                          className={`p-1.5 rounded-lg border transition-all text-xs cursor-pointer ${showCameraSettings ? "bg-emerald-500 text-black border-emerald-400" : "bg-black/60 text-white border-neutral-800 hover:bg-black/80"}`}
                          title="Camera Settings"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Bottom telemetry overlay status display */}
                      <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-[8px] font-mono text-emerald-400 border border-emerald-900 flex items-center gap-1.5 z-10">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                        <span>{lensMode.toUpperCase()} | {resSetting.replace("_", " @ ")} FPS | ZOOM {zoomScale.toFixed(1)}x</span>
                      </div>

                      {/* Brackets corners */}
                      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-emerald-400 pointer-events-none z-10" />
                      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-emerald-400 pointer-events-none z-10" />
                      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-emerald-400 pointer-events-none z-10" />
                      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-emerald-400 pointer-events-none z-10" />

                      {/* FULL CAMERA SETTINGS DRAWER OVERLAY */}
                      {showCameraSettings && (
                        <div className="absolute inset-0 bg-neutral-950/95 backdrop-blur-sm p-3.5 flex flex-col justify-between z-30 animate-fadeIn text-xs">
                          <div>
                            <div className="flex justify-between items-center mb-2.5 pb-1.5 border-b border-neutral-900">
                              <span className="font-bold text-white flex items-center gap-1">
                                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                                Camera Settings
                              </span>
                              <button 
                                onClick={() => setShowCameraSettings(false)}
                                className="text-[10px] font-mono font-bold bg-neutral-900 px-2 py-0.5 rounded hover:text-white cursor-pointer"
                              >
                                CLOSE
                              </button>
                            </div>

                            {/* Lens Mode selector */}
                            <div className="mb-2.5">
                              <span className="text-neutral-500 uppercase text-[9px] block font-mono mb-1">Optical Engine Mode</span>
                              <div className="grid grid-cols-2 gap-1.5">
                                {[
                                  { label: "LIDAR Scanner", val: "lidar" },
                                  { label: "Standard View", val: "standard" },
                                  { label: "Thermal Sensor", val: "thermal" },
                                  { label: "X-Ray Depth", val: "xray" },
                                ].map((lens) => (
                                  <button
                                    key={lens.val}
                                    onClick={() => setLensMode(lens.val as any)}
                                    className={`py-1 px-1.5 rounded text-left font-semibold text-[10px] transition-all border cursor-pointer ${
                                      lensMode === lens.val 
                                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-400" 
                                        : "bg-neutral-900 border-neutral-900 text-neutral-400 hover:text-neutral-200"
                                    }`}
                                  >
                                    {lens.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Device Hardware Integration Toggles */}
                            <div className="mb-2.5">
                              <span className="text-neutral-500 uppercase text-[9px] block font-mono mb-1">Device Hardware Live Feeds</span>
                              <div className="grid grid-cols-2 gap-1.5 font-mono">
                                <button
                                  onClick={() => setUseRealCamera(!useRealCamera)}
                                  className={`py-1.5 px-2 rounded text-left font-bold text-[9px] transition-all border cursor-pointer flex items-center justify-between ${
                                    useRealCamera 
                                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-400" 
                                      : "bg-neutral-900 border-neutral-900 text-neutral-400 hover:text-neutral-200"
                                  }`}
                                >
                                  <span>📷 {useRealCamera ? "WEBCAM ON" : "VIRTUAL FEED"}</span>
                                  <span className={`w-1.5 h-1.5 rounded-full ${useRealCamera ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"}`} />
                                </button>
                                <button
                                  onClick={() => setUseRealMic(!useRealMic)}
                                  className={`py-1.5 px-2 rounded text-left font-bold text-[9px] transition-all border cursor-pointer flex items-center justify-between ${
                                    useRealMic 
                                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-400" 
                                      : "bg-neutral-900 border-neutral-900 text-neutral-400 hover:text-neutral-200"
                                  }`}
                                >
                                  <span>🎤 {useRealMic ? "MIC ON" : "VIRTUAL MIC"}</span>
                                  <span className={`w-1.5 h-1.5 rounded-full ${useRealMic ? "bg-emerald-400 animate-pulse" : "bg-neutral-600"}`} />
                                </button>
                              </div>
                            </div>

                            {/* Zoom control chips */}
                            <div className="mb-2.5">
                              <span className="text-neutral-500 uppercase text-[9px] block font-mono mb-1">Digital Telephoto Zoom</span>
                              <div className="flex gap-2">
                                {[1.0, 1.5, 2.0, 3.0].map((zoom) => (
                                  <button
                                    key={zoom}
                                    onClick={() => setZoomScale(zoom)}
                                    className={`flex-1 py-1 rounded font-mono font-extrabold text-[10px] border transition-all text-center cursor-pointer ${
                                      zoomScale === zoom 
                                        ? "bg-emerald-400 text-black border-emerald-300" 
                                        : "bg-neutral-900 border-neutral-900 text-neutral-400 hover:text-white"
                                    }`}
                                  >
                                    {zoom.toFixed(1)}x
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Video Resolution output settings */}
                            <div className="mb-2">
                              <span className="text-neutral-500 uppercase text-[9px] block font-mono mb-1">Capture & FPS Resolution</span>
                              <div className="grid grid-cols-3 gap-1.5">
                                {[
                                  { label: "1080p @ 60", val: "1080p_60" },
                                  { label: "4K @ 30", val: "4K_30" },
                                  { label: "720p @ 120", val: "720p_120" },
                                ].map((res) => (
                                  <button
                                    key={res.val}
                                    onClick={() => setResSetting(res.val)}
                                    className={`py-1 rounded font-mono text-[9px] font-bold border transition-all text-center cursor-pointer ${
                                      resSetting === res.val 
                                        ? "bg-emerald-500/15 border-emerald-500 text-emerald-400" 
                                        : "bg-neutral-900 border-neutral-900 text-neutral-400 hover:text-white"
                                    }`}
                                  >
                                    {res.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Quick Calibration readouts */}
                          <div className="bg-neutral-900 p-2 rounded border border-neutral-900 flex justify-between items-center text-[9px] font-mono text-neutral-400">
                            <div>
                              <span>SENSORS: </span>
                              <span className="text-emerald-400 font-bold">CALIBRATED</span>
                            </div>
                            <div>
                              <span>ISO: </span>
                              <span className="text-white font-bold">AUTO</span>
                            </div>
                            <div>
                              <span>FPS: </span>
                              <span className="text-emerald-400 font-bold">{resSetting.split("_")[1]}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transcript caption panel */}
                    <div className="p-3 bg-neutral-900/90 border border-neutral-800 rounded-xl">
                      <div className="flex justify-between items-center mb-1 text-[9px] font-mono text-emerald-400">
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${useRealMic && !micError ? "bg-red-500 animate-ping" : "bg-emerald-400"} animate-pulse`} />
                          {useRealMic && !micError ? "LIVE MIC CAPTURING..." : "AI SYNCING..."}
                        </span>
                        <span className="text-neutral-500">{useRealMic && !micError ? "SPEECH CAPTURE LIVE" : "LIDAR ACTIVE"}</span>
                      </div>
                      
                      {useRealMic && micError ? (
                        <div className="p-2.5 bg-neutral-950 border border-amber-500/30 rounded-lg text-[9px] font-mono text-amber-300 my-1 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-bold text-amber-400">
                            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                            <span>MIC PERMISSION BLOCKED</span>
                          </div>
                          <span>Browser security rules prevent microphone capture inside this iframe. To solve, allow browser mic permissions or click "Open in New Tab" at the top right of this page!</span>
                          <button
                            onClick={() => {
                              setMicError(null);
                              setUseRealMic(false);
                            }}
                            className="bg-neutral-900 hover:bg-neutral-800 text-white font-bold py-0.5 px-2 mt-1 rounded text-[8px] uppercase border border-neutral-800 cursor-pointer"
                          >
                            Use Virtual Mic
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs italic text-neutral-200">
                          {transcript}
                        </p>
                      )}

                      {/* Waves simulated */}
                      <div className="flex justify-center items-end gap-0.5 mt-2 h-6">
                        {micLevel.map((h, i) => (
                          <div 
                            key={i} 
                            style={{ height: `${h}px` }} 
                            className={`w-1 rounded-full transition-all duration-75 ${useRealMic && !micError ? "bg-red-400 animate-pulse" : "bg-emerald-400"}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Simulated Acoustic Signatures */}
                    <div className="bg-neutral-900/40 p-2.5 rounded-xl border border-neutral-900 text-[10px] mt-1 space-y-1.5">
                      <div className="flex justify-between items-center text-neutral-400 font-mono text-[9px] uppercase">
                        <span>🔊 Test Acoustic Signatures</span>
                        <span className="text-emerald-400 font-bold font-mono">SIMULATE</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 font-semibold text-center">
                        {[
                          { name: "Relay Clicking", txt: "\"Rhythmic ticking in the handlebar compartment when turning key...\"", lvl: [18, 5, 20, 4, 15, 6, 22, 5, 25, 4] },
                          { name: "Chain Chugging", txt: "\"High friction metal-on-metal clatter near secondary gearbox...\"", lvl: [28, 26, 12, 10, 24, 25, 14, 11, 26, 28] },
                          { name: "Brakes Squealing", txt: "\"Piercing high-frequency vibration during front wheel deceleration...\"", lvl: [6, 28, 28, 28, 28, 28, 28, 28, 28, 6] },
                          { name: "Piston Knock", txt: "\"Periodic heavy acoustic double thumps in main engine cylinder...\"", lvl: [28, 4, 6, 28, 4, 5, 26, 4, 6, 28] }
                        ].map((sound) => (
                          <button
                            key={sound.name}
                            onClick={() => {
                              setTranscript(sound.name + ": " + sound.txt);
                              setMicLevel(sound.lvl);
                              setSelectedTag(sound.name);
                            }}
                            className={`p-1.5 rounded text-left transition-all border font-mono text-[8.5px] flex items-center gap-1 cursor-pointer truncate ${
                              selectedTag === sound.name
                                ? "bg-emerald-400/10 border-emerald-400 text-emerald-400 font-bold"
                                : "bg-neutral-950 border-neutral-900 text-neutral-400 hover:text-white"
                            }`}
                          >
                            <span>🔊</span>
                            <span>{sound.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mic button indicator */}
                    <div className="flex justify-center mt-2 pb-2">
                      <button 
                        onClick={() => setUseRealMic(!useRealMic)}
                        className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                          useRealMic && !micError
                            ? "bg-emerald-400 text-black shadow-[0_4px_24px_rgba(16,185,129,0.5)] border-emerald-300 animate-pulse scale-105" 
                            : "bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-750"
                        }`}
                        title="Toggle Real Mic Feed"
                      >
                        <Mic className="w-7 h-7" />
                      </button>
                    </div>
                  </div>
                )}

                {/* SCREEN 2: Diagnostic Report Complete */}
                {activeScreenIndex === 1 && (
                  <div className="flex-1 flex flex-col gap-4 animate-fadeIn">
                    <div className="text-center py-2 flex flex-col items-center">
                      <div className="relative w-24 h-24 flex items-center justify-center mb-2">
                        <svg className="absolute w-full h-full transform -rotate-90">
                          <circle cx="48" cy="48" r="40" className="stroke-neutral-800 fill-none" strokeWidth="4" />
                          <circle cx="48" cy="48" r="40" className="stroke-emerald-400 fill-none" strokeWidth="5" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 * 0.02} />
                        </svg>
                        <span className="text-2xl font-black text-white">98%</span>
                      </div>
                      <h3 className="text-md font-bold text-white">AI Diagnosis Complete</h3>
                      <p className="text-[11px] text-neutral-500">High confidence resolution detected.</p>
                    </div>

                    {/* Suspected card */}
                    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl">
                      <div className="flex gap-2.5 items-start">
                        <div className="p-1.5 bg-red-400/10 border border-red-500/20 text-red-400 rounded-lg">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white">Low Battery Voltage / Terminal Misfire</h4>
                          <p className="text-[10px] text-neutral-400 mt-0.5 leading-relaxed">
                            Established via voltage telemetry maps & sound wave signature detection cores.
                          </p>
                        </div>
                      </div>

                      <div className="h-[1px] bg-neutral-800 my-2.5" />

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div>
                          <span className="text-neutral-500 block uppercase">Difficulty</span>
                          <span className="text-white font-bold flex gap-0.5 mt-0.5">
                            <Wrench className="w-3.5 h-3.5 text-emerald-400 inline" />
                            <Wrench className="w-3.5 h-3.5 text-emerald-400 inline" />
                            <Wrench className="w-3.5 h-3.5 text-emerald-400 inline" />
                          </span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block uppercase">Est. Time</span>
                          <span className="text-emerald-400 font-bold block mt-0.5">15 mins</span>
                        </div>
                      </div>
                    </div>

                    {/* Cost matrices */}
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div className="p-3 bg-neutral-900 rounded-xl">
                        <span className="text-neutral-500 font-mono block">DIY COST</span>
                        <span className="text-lg font-extrabold text-emerald-400">$0</span>
                        <p className="text-[9px] text-neutral-400">Using core tools</p>
                      </div>
                      <div className="p-3 bg-neutral-900 rounded-xl">
                        <span className="text-neutral-500 font-mono block">PRO ESTIMATE</span>
                        <span className="text-lg font-extrabold text-neutral-300">$80+</span>
                        <p className="text-[9px] text-neutral-400">Technical rates</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setActiveScreenIndex(2)}
                      className="w-full py-3 bg-emerald-500 text-black font-bold rounded-xl text-xs hover:bg-emerald-400 flex items-center justify-center gap-1.5 mt-2"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      Start Guided Repair
                    </button>
                  </div>
                )}

                {/* SCREEN 3: Step 2 of 5 */}
                {activeScreenIndex === 2 && (
                  <div className="flex-1 flex flex-col gap-4 animate-fadeIn">
                    <div className="flex justify-between items-center text-[9px] font-mono text-emerald-400 border-b border-neutral-900 pb-1.5">
                      <span>HUD SYSTEM ACTIVE</span>
                      <span>STEP 2 OF 5</span>
                    </div>

                    {/* Engine block with HUD scan circles */}
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-950 border border-emerald-950">
                      <img 
                        src="/src/assets/images/sk_battery_closeup_1781152565527.png" 
                        className="w-full h-full object-cover opacity-70"
                        alt="Zoomed battery"
                      />

                      {flashlightOn && (
                        <div className="absolute inset-0 bg-amber-300/10 pointer-events-none mix-blend-overlay" />
                      )}

                      {/* HUD circular reticle */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-28 h-28 flex items-center justify-center">
                          <div className="absolute inset-0 border border-emerald-400/30 border-dashed rounded-full animate-spin [animation-duration:10s]" />
                          <div className="absolute inset-2 border-2 border-emerald-400 rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          </div>
                          
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[52px] bg-emerald-400 text-black text-[7px] font-bold px-1.5 py-0.5 rounded-full font-mono shadow">
                            BATTERY DETECTED
                          </div>
                        </div>
                      </div>

                      {/* Blueprint overlay */}
                      {showBlueprints && (
                        <div className="absolute inset-0 bg-neutral-950/95 p-4 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-mono text-emerald-400 font-bold">BOLT SCHEMATIC</span>
                          <Wrench className="w-8 h-8 text-emerald-400 my-2 animate-bounce" />
                          <p className="text-[10px] text-neutral-300">
                            Connect socket adapter size 8mm on ground socket, rotate counter-clockwise.
                          </p>
                          <button 
                            onClick={() => setShowBlueprints(false)}
                            className="text-[9px] font-mono text-emerald-400 font-bold underline mt-2"
                          >
                            CLOSE SCHEMATIC
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Progress Slider */}
                    <div>
                      <div className="flex justify-between text-[10px] text-neutral-400 font-semibold mb-1">
                        <span>REPAIR PROGRESS</span>
                        <span className="text-emerald-400">Step 2 of 5</span>
                      </div>
                      <div className="w-full h-1 bg-neutral-900 rounded-full overflow-hidden">
                        <div className="w-2/5 h-full bg-emerald-400" />
                      </div>
                    </div>

                    {/* Instruction card */}
                    <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold block mb-1">ACTION REQUIRED</span>
                      <p className="text-neutral-300 leading-relaxed">
                        Locate the <span className="underline decoration-emerald-400 text-emerald-400 font-bold">negative terminal (black)</span> and loosen the hex bolt using an <span className="font-mono text-white font-bold bg-neutral-800 px-1 rounded">8mm wrench</span>.
                      </p>
                    </div>

                    {/* Quick triggers */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <button 
                        onClick={() => setShowBlueprints(!showBlueprints)}
                        className="py-2.5 bg-neutral-900 hover:bg-neutral-850 rounded-lg text-neutral-300 border border-neutral-800"
                      >
                        Show Example
                      </button>
                      <button 
                        onClick={() => setFlashlightOn(!flashlightOn)}
                        className={`py-2.5 rounded-lg border font-bold ${
                          flashlightOn 
                            ? "bg-amber-400/10 border-amber-500/30 text-amber-300" 
                            : "bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border-neutral-800"
                        }`}
                      >
                        Torch {flashlightOn ? "ON" : "Tool"}
                      </button>
                    </div>

                    <button 
                      onClick={stepIsVerified ? () => setActiveScreenIndex(3) : handleVerifyStep}
                      disabled={isScanningStatus}
                      className={`w-full py-3.5 rounded-xl text-xs font-bold transition-all ${
                        stepIsVerified 
                          ? "bg-emerald-500 text-black hover:bg-emerald-400" 
                          : "bg-neutral-900 text-emerald-400 border border-emerald-900/60"
                      }`}
                    >
                      {isScanningStatus ? (
                        <span>SCANNING TELEMETRY...</span>
                      ) : stepIsVerified ? (
                        <span>Proceed to Next Step</span>
                      ) : (
                        <span>Verify Repair Step</span>
                      )}
                    </button>
                  </div>
                )}

                {/* SCREEN 4: Certified Mechanic List */}
                {activeScreenIndex === 3 && (
                  <div className="flex-1 flex flex-col gap-3.5 animate-fadeIn">
                    
                    {/* Critical Hazard Alert red card */}
                    <div className="p-3 bg-red-950/40 border border-red-900/40 rounded-xl text-center">
                      <div className="flex justify-center mb-1">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                      </div>
                      <h4 className="text-xs font-bold text-red-400">CRITICAL: BRAKE SYSTEM FAILURE</h4>
                      <p className="text-[10px] text-red-300/80 mt-1 leading-relaxed">
                        Unsafe DIY route. Telemetry reports rotor heat excess. Professional flatbed recommended.
                      </p>
                    </div>

                    {/* Costing breakdown */}
                    <div className="flex justify-between items-center text-[10px] p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg font-mono">
                      <span className="text-neutral-500">EST. REPAIR COST</span>
                      <span className="text-white font-bold">$350 - $500</span>
                    </div>

                    {/* Mechanic list card */}
                    <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs flex flex-col gap-2.5">
                      <div className="flex gap-2 items-center">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-[10px]">
                          AP
                        </div>
                        <div>
                          <h5 className="font-bold text-white leading-none">Apex Precision Moto</h5>
                          <span className="text-[9px] text-neutral-500 mt-1 block">
                            ⭐ 4.9 (214 reviews) | 0.8 mi
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] mt-1.5 font-bold">
                        <button className="py-2 bg-neutral-800 rounded hover:bg-neutral-750 text-neutral-300">
                          Navigate
                        </button>
                        <button className="py-2 bg-red-400/10 border border-red-900 text-red-400 rounded">
                          Call Mechanic
                        </button>
                      </div>
                    </div>

                    {/* AI Recommendation */}
                    <div className="p-3 bg-emerald-950/10 border-l-2 border-emerald-400 rounded text-[10px] text-neutral-300 leading-relaxed">
                      <span className="font-mono text-emerald-400 font-bold block mb-1">AI ADVISORY</span>
                      Rotor has reached 210°C thermal thresholds. Stop hard pulls & verify pad wear.
                    </div>

                    <button 
                      onClick={() => {
                        setStepIsVerified(false);
                        setActiveScreenIndex(0);
                      }}
                      className="w-full py-2.5 border border-neutral-800 text-neutral-400 text-xs rounded-xl"
                    >
                      Restart Diagnostics
                    </button>
                  </div>
                )}

              </div>

              {/* Interactive Bottom Navigation Bar */}
              <div className="bg-neutral-950 border-t border-neutral-900/80 px-4 py-2 flex justify-around items-center relative gap-1 select-none">
                {[
                  { index: 0, icon: <Compass className="w-5 h-5" />, label: "Scan" },
                  { index: 1, icon: <Brain className="w-5 h-5" />, label: "Diagnosis" },
                  { index: 2, icon: <Wrench className="w-5 h-5" />, label: "Repair" },
                  { index: 3, icon: <Network className="w-5 h-5" />, label: "Service" },
                ].map((item) => {
                  const isActive = activeScreenIndex === item.index;
                  return (
                    <button
                      key={item.index}
                      onClick={() => setActiveScreenIndex(item.index)}
                      className={`relative flex flex-col items-center justify-center p-2.5 rounded-full transition-all duration-300 min-w-[50px] cursor-pointer group`}
                    >
                      {isActive && (
                        <span className="absolute inset-0 bg-emerald-500/10 rounded-full blur-md scale-110" />
                      )}
                      <div className={`relative transition-all duration-200 ${isActive ? "text-emerald-400 scale-110" : "text-neutral-500 group-hover:text-neutral-300"}`}>
                        {item.icon}
                      </div>
                      
                      {/* Active green indicator light */}
                      {isActive && (
                        <span className="absolute bottom-0 w-1 h-1 bg-emerald-400 rounded-full shadow-[0_0_5px_#10b981]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* IOS Home Swipe Bar */}
              <div className="bg-neutral-950 py-2 flex justify-center border-t border-neutral-900/40">
                <div className="w-28 h-1 bg-neutral-800 rounded-full" />
              </div>

            </div>
          </div>
          <div className="mt-4 text-center max-w-sm">
            <p className="text-xs text-neutral-400">
              💡 Tap on the active system icons in the device's bottom navigation bar to switch live screens.
            </p>
          </div>
        </section>

        {/* RIGHT COLUMN: Code Explorer & Exporter (lg:col-span-8) */}
        <section className="lg:col-span-7 flex flex-col border border-neutral-900 bg-[#0c0c0e]/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-xl">
          <div className="border-b border-neutral-900 bg-[#0c0c0e]/95 px-5 py-3.5 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Folder className="w-4.5 h-4.5 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-white">Flutter Workspace Code Inspector</span>
            </div>
            
            {copyStatus === FLUTTER_FILES[selectedFileIndex].path ? (
              <span className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1 bg-emerald-950 px-2 py-0.5 rounded">
                <CheckCircle2 className="w-3.5 h-3.5" /> Copied File Successfully!
              </span>
            ) : (
              <button
                onClick={() => copyCodeToClipboard(FLUTTER_FILES[selectedFileIndex].code, FLUTTER_FILES[selectedFileIndex].path)}
                className="text-xs font-mono text-neutral-400 hover:text-white flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-850 px-3 py-1.5 rounded transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Code
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 flex-1">
            
            {/* List index columns */}
            <div className="md:col-span-4 border-r border-neutral-900 bg-black/40 p-4.5 flex flex-col gap-2 overflow-y-auto max-h-[580px]">
              <span className="text-[10px] font-mono text-neutral-500 font-extrabold uppercase mb-2 block tracking-wider">
                Workspace Files
              </span>
              
              {FLUTTER_FILES.map((file, i) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFileIndex(i)}
                  className={`w-full p-2.5 rounded-xl text-left transition-all ${
                    selectedFileIndex === i
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-md"
                      : "border border-transparent hover:bg-neutral-900 text-neutral-400 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-mono font-bold truncate">{file.label}</span>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1 pl-6 leading-tight truncate">
                    {file.description}
                  </p>
                </button>
              ))}

              <div className="h-[1px] bg-neutral-900 my-4" />

              <span className="text-[10px] font-mono text-neutral-550 font-extrabold uppercase tracking-wider">
                Implementation Specs
              </span>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-900 text-[11px] leading-relaxed text-neutral-400 mt-2">
                <div className="text-white font-bold mb-1">Architecture Rules:</div>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Features nested into clean architecture screens folders.</li>
                  <li>Riverpod controllers coordinate sound trigger inputs.</li>
                  <li>Dynamic Lidar simulator overlays.</li>
                  <li>GoRouter provides zero-latency viewport transitions.</li>
                </ul>
              </div>
            </div>

            {/* Code preview block */}
            <div className="md:col-span-8 bg-[#09090b] flex flex-col h-[580px]">
              {/* Fake IDE Tabs */}
              <div className="bg-neutral-950/90 text-neutral-400 text-xs font-mono px-4 py-2 border-b border-neutral-900 flex select-none">
                <span className="text-emerald-400 border-b border-emerald-400 pb-0.5 px-1 font-bold">
                  {FLUTTER_FILES[selectedFileIndex].label}
                </span>
                <span className="ml-3 text-neutral-600">Preview Layout</span>
              </div>

              {/* Syntax highlighted raw code */}
              <div className="flex-1 p-4 overflow-auto font-mono text-[11.5px] leading-relaxed text-emerald-300">
                <pre className="whitespace-pre-wrap">{FLUTTER_FILES[selectedFileIndex].code}</pre>
              </div>

              {/* IDE Bottom status bar */}
              <div className="bg-neutral-950 text-neutral-500 text-[10px] font-mono px-4 py-2 border-t border-neutral-900 flex justify-between">
                <span>UTF-8</span>
                <span>Dart 3.x Compliant</span>
                <span>Line Count: {FLUTTER_FILES[selectedFileIndex].code.split("\n").length}</span>
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* Footer information section */}
      <footer className="mt-8 border-t border-neutral-900 bg-[#08080a] py-6 text-center text-xs text-neutral-500">
        <p>MotoAI Flutter Developer Workspace Client Console • Clean Architecture Blueprint</p>
      </footer>
    </div>
  );
}
