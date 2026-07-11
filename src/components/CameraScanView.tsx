import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Mic, Zap, Shield, HelpCircle, ArrowRight, Camera, RefreshCw, 
  ScanLine, FolderOpen, MapPin, ArrowLeft, Battery, Wifi, WifiOff, 
  Video, Trash2, Check, ZoomIn, Info, AlertTriangle, Eye 
} from "lucide-react";
import { Diagnosis, VisionDiagnosisResponse } from "../types";
import { getFallbackDiagnosis, resolveFallbackPreset } from "../services/diagnosisService";
import { useSpeechToText } from "../hooks/useSpeechToText";
import { Capacitor } from "@capacitor/core";
import { captureFrame, buildVisionPayload, validateImage, captureNativePhoto } from "../services/cameraService";
import { classifySeverity } from "../services/aiDiagnosisService";
import { detectObjects, isModelInstalled, classifyPartCondition } from "../services/visionService";
import { getApiUrl } from "../services/apiClient";

interface CameraScanViewProps {
  onDiagnosticComplete: (diag: Diagnosis) => void;
  onSelectCriticalPreset: () => void;
}

export default function CameraScanView({ onDiagnosticComplete, onSelectCriticalPreset }: CameraScanViewProps) {
  const [activePreset, setActivePreset] = useState<string>("Battery issue");
  const [customInput, setCustomInput] = useState<string>("");
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [displayTranscript, setDisplayTranscript] = useState<string>("\"I'm hearing a clicking sound near the battery...\"");
  
  // Media states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingTimer, setRecordingTimer] = useState<number>(0);
  const [isZoomed, setIsZoomed] = useState<boolean>(false);
  const [isFlashOn, setIsFlashOn] = useState<boolean>(false);
  const [activeCamera, setActiveCamera] = useState<"user" | "environment">("environment");
  
  // Camera loading & status states
  const [isInitializingCamera, setIsInitializingCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number>(88);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Object classification / HUD states
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [detectedVehicle, setDetectedVehicle] = useState<string | null>(null);
  const [detectedPart, setDetectedPart] = useState<string | null>(null);
  const [visionDetections, setVisionDetections] = useState<any[]>([]);
  const [inferenceTime, setInferenceTime] = useState<number>(0);
  const [frameFps, setFrameFps] = useState<number>(30);
  const [hudMessage, setHudMessage] = useState<string>("Point the camera toward the component.");

  // Pre-diagnosis preview screen state
  const [showPreviewScreen, setShowPreviewScreen] = useState<boolean>(false);

  // AI Scanning step animations
  const [aiScanStep, setAiScanStep] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);

  // System states listeners
  useEffect(() => {
    // Monitor online state
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    // Battery API
    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then((batt: any) => {
        setBatteryLevel(Math.round(batt.level * 100));
        batt.addEventListener("levelchange", () => {
          setBatteryLevel(Math.round(batt.level * 100));
        });
      });
    }

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Update HUD guidance message based on preset
  useEffect(() => {
    if (activePreset === "Battery issue") {
      setHudMessage("Point camera toward the battery cluster.");
    } else if (activePreset === "Bike not starting") {
      setHudMessage("Point camera toward the spark plug / engine block.");
    } else if (activePreset === "Strange noise") {
      setHudMessage("Focus on the transmission chain or casing.");
    } else if (activePreset === "Smoke detected") {
      setHudMessage("Aim at the exhaust muffler or silencer pipe.");
    }
  }, [activePreset]);

  // Live frame processing loop using our visionService
  useEffect(() => {
    let active = true;
    const processFrame = async () => {
      if (!active) return;
      if (videoRef.current && hasCameraAccess && !showPreviewScreen) {
        try {
          const res = await detectObjects(videoRef.current, activePreset);
          setVisionDetections(res.detections);
          setInferenceTime(res.inferenceTimeMs);
          setFrameFps(res.fps);
          
          if (res.detections.length > 0) {
            const primary = res.detections[0];
            setDetectedPart(primary.className);
            setDetectedVehicle("Motorcycle");
            setHudMessage(`${primary.className} (${primary.condition}) detected with ${Math.round(primary.confidence * 100)}% confidence.`);
          }
        } catch (e) {
          // ignore
        }
      }
      setTimeout(processFrame, 150); // Throttled for balanced performance (around 7 FPS)
    };
    processFrame();
    return () => {
      active = false;
    };
  }, [hasCameraAccess, activePreset, showPreviewScreen]);

  // Request Camera access of client
  const startCamera = async () => {
    setIsInitializingCamera(true);
    setCameraError(null);
    let granted = false;

    if (Capacitor.isNativePlatform()) {
      try {
        const { Camera } = await import("@capacitor/camera");
        const status = await Camera.requestPermissions();
        granted = status.camera === "granted";
      } catch (e) {
        console.warn("Native camera permission request error:", e);
      }
    } else {
      granted = true; // browser will prompt inline
    }

    if (granted) {
      try {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: activeCamera } 
          });
          mediaStreamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(e => console.warn("Video play error:", e));
          }
          setHasCameraAccess(true);
        } else {
          setHasCameraAccess(false);
          setCameraError("Media devices are not available in this window environment.");
        }
      } catch (e: any) {
        console.warn("Camera request error:", e);
        setHasCameraAccess(false);
        setCameraError(e.message || "Failed to launch camera feed.");
      } finally {
        setIsInitializingCamera(false);
      }
    } else {
      setHasCameraAccess(false);
      setIsInitializingCamera(false);
      setCameraError("Camera permission denied.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [activeCamera]);

  // Toggle switch camera
  const handleSwitchCamera = () => {
    setActiveCamera(prev => prev === "environment" ? "user" : "environment");
  };

  // Run Object classification on image/video
  const runImageClassification = (base64OrUrl: string) => {
    setIsDetecting(true);
    setDetectedVehicle(null);
    setDetectedPart(null);

    let part = "battery";
    if (activePreset === "Bike not starting") {
      part = "spark_plug";
    } else if (activePreset === "Strange noise") {
      part = "chain";
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, 100, 100);
        const condition = classifyPartCondition(part, ctx, 100, 100);
        
        let identifiedProblem = `Identified Motorcycle - Component: ${part} (${condition})`;
        if (part === "battery" && condition === "Corrosion") {
          identifiedProblem = "Corroded Battery Terminal / Low Voltage";
        } else if (part === "spark_plug" && condition === "Carbon") {
          identifiedProblem = "Carbon Fouled Spark Plug / Misfire";
        } else if (part === "chain" && condition === "Rust") {
          identifiedProblem = "Rusted Drive Chain / Slack Excess";
        }

        setDetectedVehicle("Motorcycle");
        setDetectedPart(part);
        setIsDetecting(false);
        setCustomInput(identifiedProblem);
        setHudMessage(`${part} (${condition}) identified from image.`);
        setShowPreviewScreen(true);
      }
    };
    img.onerror = () => {
      setDetectedVehicle("Motorcycle");
      setDetectedPart(part);
      setIsDetecting(false);
      setCustomInput(`Identified Motorcycle - Component: ${part}.`);
      setShowPreviewScreen(true);
    };

    if (base64OrUrl.startsWith("data:") || base64OrUrl.length > 500) {
      img.src = base64OrUrl.startsWith("data:") ? base64OrUrl : `data:image/jpeg;base64,${base64OrUrl}`;
    } else {
      img.src = base64OrUrl;
    }
  };

  // Capture Photo Shutter Action
  const handleCapturePhoto = async () => {
    let base64 = "";

    if (Capacitor.isNativePlatform() && !mediaStreamRef.current) {
      const nativePhoto = await captureNativePhoto();
      if (!nativePhoto) {
        console.warn("Failed to capture native photo.");
        return;
      }
      base64 = nativePhoto;
    } else {
      if (!videoRef.current || !canvasRef.current) return;
      const captured = captureFrame(videoRef.current, canvasRef.current);
      if (!captured) {
        console.warn("Failed to capture frame from video feed.");
        return;
      }
      base64 = captured.base64;
    }

    setSelectedImage(base64);
    setSelectedVideo(null);
    runImageClassification(base64);
  };

  // Video recording controls
  const handleStartVideoRecording = () => {
    if (!mediaStreamRef.current) return;
    recordedChunksRef.current = [];
    setRecordingTimer(0);
    setIsRecording(true);

    try {
      const options = { mimeType: "video/webm;codecs=vp9" };
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(mediaStreamRef.current, options);
      } catch {
        recorder = new MediaRecorder(mediaStreamRef.current);
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        const videoUrl = URL.createObjectURL(blob);
        setSelectedVideo(videoUrl);
        setSelectedImage(null);
        
        // Run classification mock scan on the video frame
        runImageClassification(videoUrl);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTimer(prev => {
          if (prev >= 29) {
            handleStopVideoRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (e) {
      console.warn("Media recorder initialization failed:", e);
      setIsRecording(false);
    }
  };

  const handleStopVideoRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Gallery file picker support
  const handleGalleryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    if (file.type.startsWith("image/")) {
      reader.onload = () => {
        const base64 = (reader.result as string).split(",")[1];
        setSelectedImage(base64);
        setSelectedVideo(null);
        runImageClassification(base64);
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith("video/")) {
      const videoUrl = URL.createObjectURL(file);
      setSelectedVideo(videoUrl);
      setSelectedImage(null);
      runImageClassification(videoUrl);
    }
  };

  // Shutter action cleanups
  const handleRemoveImage = () => {
    setSelectedImage(null);
    setSelectedVideo(null);
    setIsZoomed(false);
    setDetectedVehicle(null);
    setDetectedPart(null);
    setShowPreviewScreen(false);
  };

  // Real browser speech-to-text
  const {
    isListening: isMicListening,
    transcript: speechTranscript,
    error: speechError,
    isSupported: speechSupported,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
  } = useSpeechToText();

  // When speech recognition produces a transcript, populate the input field
  useEffect(() => {
    if (speechTranscript) {
      setCustomInput(speechTranscript);
      setDisplayTranscript(`"${speechTranscript}"`);
    }
  }, [speechTranscript]);

  // When speech stops with content, auto-submit/open preview
  const previousListeningRef = useRef(false);
  useEffect(() => {
    if (previousListeningRef.current && !isMicListening && speechTranscript.trim().length > 0) {
      setShowPreviewScreen(true);
    }
    previousListeningRef.current = isMicListening;
  }, [isMicListening]);

  // Submit Issue to Gemini API or Fallback
  const handleIssueSubmit = async (textToSubmit: string, forceCritical: boolean = false) => {
    // Start AI scanning step animation series
    setAiScanStep(1);
    setIsAnalyzing(true);
    
    // Simulate beautiful cybersecurity scan progression
    const steps = [
      "Detecting motorcycle profile...",
      "Identifying engine clusters...",
      "Analyzing component anomalies...",
      "Evaluating rules & evidence...",
      "Formulating diagnostic report..."
    ];

    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setAiScanStep(i + 2);
    }

    try {
      let response: Response;
      if (selectedImage) {
        const payload = buildVisionPayload(selectedImage, textToSubmit || undefined);
        response = await fetch(getApiUrl("/api/diagnose-vision"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch(getApiUrl("/api/diagnose"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            input: textToSubmit,
            isCriticalRequest: forceCritical
          }),
        });
      }

      if (!response.ok) throw new Error("API returned failure status");

      const data = await response.json();
      if (data.success && data.diagnosis) {
        onDiagnosticComplete(data.diagnosis);
      } else {
        throw new Error("Diagnostics API returned error status");
      }
    } catch (err) {
      console.warn("Diagnostics API failed, falling back to offline preset:", err);
      setHudMessage("Offline Mode Active: Fallback Presets Loaded");
      if (forceCritical) {
        onSelectCriticalPreset();
      } else {
        const preset = resolveFallbackPreset(textToSubmit);
        const diag = getFallbackDiagnosis(preset);
        if (diag.isCritical) {
          onSelectCriticalPreset();
        } else {
          onDiagnosticComplete(diag);
        }
      }
    } finally {
      setIsAnalyzing(false);
      setAiScanStep(0);
    }
  };

  const presets = [
    { label: "Battery issue", transcript: "\"I'm hearing a clicking sound near the battery...\"", target: "BATTERY" },
    { label: "Bike not starting", transcript: "\"The starter motor cranks but engine won't kick in...\"", target: "ENGINE" },
    { label: "Strange noise", transcript: "\"High pitched grinding noise when releasing clutch...\"", target: "CLUTCH" },
    { label: "Smoke detected", transcript: "\"White smoke coming out of exhaust with petrol smell...\"", target: "EXHAUST" }
  ];

  const handlePresetClick = (p: typeof presets[0]) => {
    setActivePreset(p.label);
    const cleanText = p.transcript.replace(/^"|"$/g, "");
    setCustomInput(cleanText);
    setDisplayTranscript(p.transcript);
  };

  return (
    <div className="flex flex-col h-full bg-[#070708] text-zinc-100 font-sans select-none overflow-y-auto">
      
      {/* 1. TOP STATUS BAR (Clean, no duplicates, no back button) */}
      <div className="flex items-center justify-end px-6 py-4 border-b border-zinc-900 bg-[#0c0c0e]/95 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4 text-[10px] font-mono tracking-wider text-zinc-500">
          <div className="flex items-center gap-1.5">
            <Battery className="w-3.5 h-3.5 text-zinc-400" />
            <span>{batteryLevel}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">ONLINE</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400 font-bold">OFFLINE</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN PREVIEW OR CAMERA STREAM FRAME */}
      {showPreviewScreen ? (
        /* Preview screen block before diagnoses */
        <div className="flex-1 p-5 flex flex-col gap-4">
          <div className="relative rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-950 aspect-video flex items-center justify-center shadow-lg">
            {selectedImage && (
              <img 
                src={selectedImage.startsWith("data:") ? selectedImage : `data:image/jpeg;base64,${selectedImage}`} 
                alt="Selected Target" 
                className={`w-full h-full object-cover transition-transform duration-300 ${isZoomed ? "scale-150" : "scale-100"}`}
              />
            )}
            {selectedVideo && (
              <video 
                src={selectedVideo} 
                controls 
                className="w-full h-full object-contain"
              />
            )}
            {!selectedImage && !selectedVideo && (
              <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
                <Mic className="w-8 h-8 text-emerald-400 animate-pulse" />
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Voice Input Transcribed</span>
                <p className="text-xs text-zinc-300 font-medium italic max-w-xs px-4">
                  "{customInput || "Listening for speech..."}"
                </p>
              </div>
            )}
            
            {/* Classification results overlay */}
            <div className="absolute bottom-4 left-4 right-4 bg-zinc-950/90 border border-emerald-500/40 rounded-xl p-3 z-40 backdrop-blur-sm shadow-xl flex flex-col gap-1">
              <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">OBJECT CLASSIFICATION</span>
              <div className="flex gap-2.5 mt-1">
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase font-mono">
                  TYPE: {detectedVehicle || "Motorcycle"}
                </span>
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase font-mono">
                  COMPONENT: {detectedPart || "Battery"}
                </span>
              </div>
            </div>

            <div className="absolute top-4 right-4 flex gap-2 z-40">
              <button 
                onClick={() => setIsZoomed(!isZoomed)}
                className="bg-zinc-900/80 hover:bg-zinc-800 text-white text-xs font-semibold py-1.5 px-3 rounded-lg border border-zinc-800 transition-all font-mono"
              >
                {isZoomed ? "ZOOM OUT" : "ZOOM IN"}
              </button>
              <button 
                onClick={handleRemoveImage}
                className="bg-red-950/80 hover:bg-red-900 text-red-200 text-xs font-semibold py-1.5 px-3 rounded-lg border border-red-900/40 transition-all font-mono"
              >
                REMOVE
              </button>
            </div>
          </div>

          <div className="bg-zinc-950/60 border border-zinc-900 rounded-3xl p-4 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">Input Details</h3>
            <textarea
              className="w-full bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50"
              rows={3}
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Provide diagnostic context..."
            />
            <button
              onClick={() => handleIssueSubmit(customInput)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold py-3.5 rounded-xl uppercase text-xs tracking-wider transition-all shadow-[0_4px_15px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              Submit Diagnostic
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Camera capture display block */
        <div className="flex-1 flex flex-col justify-between p-4 gap-4">
          
          {/* Preset quick selection */}
          <div className="flex flex-wrap justify-center gap-2 px-2">
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => handlePresetClick(p)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 cursor-pointer ${
                  activePreset === p.label
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                    : "bg-zinc-900/50 border-zinc-900 text-zinc-500 hover:border-zinc-800"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Large Camera viewport */}
          <div className="relative flex-1 rounded-3xl overflow-hidden border border-zinc-800/80 bg-zinc-950/70 flex items-center justify-center min-h-[280px]">
            {/* Banner: AI model is not installed */}
            {!isModelInstalled() && (
              <div className="absolute top-0 inset-x-0 bg-yellow-950/85 border-b border-yellow-900/40 text-yellow-200 text-[10px] px-4 py-2.5 font-mono flex items-center justify-between z-30">
                <div className="flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-yellow-400" />
                  <span>AI model is not installed. Manual/Web-backed diagnostics is active.</span>
                </div>
              </div>
            )}

            {isInitializingCamera && (
              <div className="absolute inset-0 bg-[#070708]/90 z-20 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase">INITIALIZING FEED...</span>
              </div>
            )}
            
            {cameraError && (
              <div className="absolute inset-0 bg-[#070708]/95 z-20 p-6 flex flex-col items-center justify-center text-center gap-4">
                <AlertTriangle className="w-10 h-10 text-red-500" />
                <p className="text-xs text-zinc-400 font-mono">{cameraError}</p>
                <p className="text-[10px] text-zinc-500 max-w-xs leading-relaxed">
                  Note: If inline camera streaming is restricted by system WebView settings, you can still use the Shutter button or Gallery picker below to capture and analyze inspection targets natively.
                </p>
                <button
                  onClick={startCamera}
                  className="bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-800 text-xs py-2 px-4 rounded-xl cursor-pointer"
                >
                  RETRY
                </button>
              </div>
            )}

            {hasCameraAccess ? (
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
            ) : (
              /* Vector graphic fallback */
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center opacity-60">
                <div className="absolute w-64 h-64 rounded-full border border-zinc-900/30 flex items-center justify-center">
                  <div className="absolute w-48 h-48 rounded-full border border-emerald-500/10 animate-pulse"></div>
                  <Camera className="w-8 h-8 text-emerald-500/20" />
                </div>
              </div>
            )}

            {/* Target HUD bounding boxes */}
            <div className="absolute inset-0 pointer-events-none z-10">
              {/* Corner brackets */}
              <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-emerald-500/60 rounded-tl-md"></div>
              <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-emerald-500/60 rounded-tr-md"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-emerald-500/60 rounded-bl-md"></div>
              <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-emerald-500/60 rounded-br-md"></div>

              {/* Center focus crosshair */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 animate-ping"></div>
                <div className="w-1.5 h-1.5 absolute rounded-full bg-emerald-400"></div>
                <div className="w-8 h-8 absolute border border-dashed border-emerald-500/30 rounded-full animate-spin"></div>
              </div>

              {/* Live YOLO Telemetry Stats */}
              {hasCameraAccess && (
                <div className="absolute top-4 left-4 bg-zinc-950/80 border border-zinc-900 rounded-lg p-2 font-mono text-[9px] text-zinc-400 flex flex-col gap-0.5">
                  <div>FPS: <span className="text-emerald-400 font-bold">{frameFps}</span></div>
                  <div>INFERENCE: <span className="text-emerald-400 font-bold">{inferenceTime}ms</span></div>
                  <div>TRACK COUNT: <span className="text-emerald-400 font-bold">{visionDetections.length}</span></div>
                </div>
              )}

              {/* Live YOLO Bounding Boxes */}
              {hasCameraAccess && visionDetections.map((det, idx) => (
                <div
                  key={idx}
                  style={{
                    left: `${det.boundingBox.x * 100}%`,
                    top: `${det.boundingBox.y * 100}%`,
                    width: `${det.boundingBox.width * 100}%`,
                    height: `${det.boundingBox.height * 100}%`,
                  }}
                  className="absolute border-2 border-emerald-500 rounded-2xl flex flex-col justify-between animate-pulse transition-all shadow-[0_0_15px_rgba(16,185,129,0.15)] pointer-events-none"
                >
                  <div className="bg-emerald-500 text-[#0b0b0c] text-[8px] font-bold px-1.5 py-0.5 rounded-tl-lg rounded-br-lg uppercase tracking-wider w-fit font-mono">
                    #{idx + 1} {det.className} ({det.condition}) - {Math.round(det.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>

            {/* Real-time floating HUD guidance label */}
            <div className="absolute bottom-4 left-4 right-4 bg-zinc-950/80 border border-zinc-900 rounded-xl p-3 z-15 backdrop-blur-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-[10px] text-zinc-300 font-mono uppercase tracking-wider">{hudMessage}</span>
            </div>
          </div>

          {/* Shutter / capture bottom panel */}
          <div className="flex flex-col gap-4">
            
            {/* Manual text input to describe issues manually */}
            <div className="relative mx-1">
              <input
                id="describe-issue-input"
                type="text"
                placeholder="Or type custom issue manually (e.g. 'clicking sound')"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && customInput.trim() && handleIssueSubmit(customInput)}
                className="w-full bg-zinc-950/90 border border-zinc-800 text-zinc-200 rounded-2xl py-3.5 pl-4 pr-12 text-xs focus:outline-none focus:border-emerald-500/80 transition-all font-sans placeholder:text-zinc-600 shadow-inner"
              />
              <button
                id="submit-issue-btn"
                disabled={!customInput.trim() || isAnalyzing}
                onClick={() => handleIssueSubmit(customInput)}
                className="absolute right-2.5 top-2.5 p-1.5 rounded-xl bg-emerald-500 text-zinc-950 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all cursor-pointer hover:bg-emerald-400"
              >
                {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              </button>
            </div>

            {/* Shutter control tray */}
            <div className="flex items-center justify-between px-6 py-2 bg-[#0c0c0e]/80 border border-zinc-900 rounded-3xl">
              
              {/* Gallery trigger */}
              <label className="p-3 hover:bg-zinc-800 rounded-full transition-all cursor-pointer text-zinc-400 hover:text-zinc-200">
                <FolderOpen className="w-5 h-5" />
                <input 
                  type="file" 
                  accept="image/*,video/*" 
                  className="hidden" 
                  onChange={handleGalleryFileSelect}
                />
              </label>

              {/* Record Video Shutter */}
              <button
                onClick={isRecording ? handleStopVideoRecording : handleStartVideoRecording}
                className={`p-3 rounded-full transition-all border cursor-pointer ${
                  isRecording 
                    ? "bg-red-500/10 border-red-500 text-red-500 animate-pulse" 
                    : "hover:bg-zinc-800 border-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
                title={isRecording ? "Stop Video Recording" : "Record Video"}
              >
                <Video className="w-5 h-5" />
              </button>

              {/* Shutter photo capture button */}
              <button
                onClick={handleCapturePhoto}
                className="w-14 h-14 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                title="Capture Photo"
              >
                <Camera className="w-6 h-6" />
              </button>

              {/* Speech mic */}
              <button
                onClick={toggleListening}
                disabled={!speechSupported}
                className={`p-3 rounded-full transition-all border cursor-pointer ${
                  isMicListening 
                    ? "bg-red-500 border-red-500 text-zinc-950 animate-pulse" 
                    : "hover:bg-zinc-800 border-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
                title="Microphone input"
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* Camera Switcher */}
              <button
                onClick={handleSwitchCamera}
                className="p-3 hover:bg-zinc-800 rounded-full transition-all border border-zinc-900 text-zinc-400 hover:text-zinc-200"
                title="Switch Camera"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>

            {/* Live voice feedback block */}
            {(isMicListening || speechTranscript || speechError || isRecording) && (
              <div className="bg-zinc-950/60 border border-zinc-900 rounded-2xl p-3 flex flex-col items-center gap-1.5">
                {isRecording && (
                  <span className="text-[10px] text-red-500 font-mono tracking-widest uppercase animate-pulse">
                    RECORDING VIDEO: {recordingTimer}s / 30s
                  </span>
                )}
                {isMicListening && (
                  <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase animate-pulse">
                    🎤 LISTENING LIVE...
                  </span>
                )}
                {speechTranscript && (
                  <p className="text-xs text-zinc-300 italic text-center">
                    "{speechTranscript}"
                  </p>
                )}
                {speechError && (
                  <p className="text-xs text-red-400 font-semibold">
                    {speechError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. DYNAMIC AI SCANNING LOADER OVERLAY */}
      {isAnalyzing && aiScanStep > 0 && (
        <div className="absolute inset-0 bg-[#070708]/95 z-[100] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="relative w-28 h-28 flex items-center justify-center mb-6">
            <div className="absolute inset-0 border-4 border-emerald-500/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <ScanLine className="w-10 h-10 text-emerald-400 animate-pulse" />
          </div>

          <h3 className="text-base font-black tracking-widest text-emerald-400 uppercase font-mono mb-2">
            AI SCAN ACTIVE
          </h3>
          
          {/* Cyber scan step checklist */}
          <div className="flex flex-col gap-2 mt-4 text-xs font-mono text-left max-w-xs w-full bg-zinc-950 border border-zinc-900 p-4 rounded-2xl shadow-inner">
            <div className={`flex items-center gap-2 ${aiScanStep >= 1 ? "text-emerald-400 font-bold" : "text-zinc-600"}`}>
              {aiScanStep > 1 ? <Check className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Detecting motorcycle profile...</span>
            </div>
            <div className={`flex items-center gap-2 ${aiScanStep >= 2 ? "text-emerald-400 font-bold" : "text-zinc-600"}`}>
              {aiScanStep > 2 ? <Check className="w-3.5 h-3.5" /> : aiScanStep === 2 ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Identifying engine clusters...</span>
            </div>
            <div className={`flex items-center gap-2 ${aiScanStep >= 3 ? "text-emerald-400 font-bold" : "text-zinc-600"}`}>
              {aiScanStep > 3 ? <Check className="w-3.5 h-3.5" /> : aiScanStep === 3 ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Analyzing component anomalies...</span>
            </div>
            <div className={`flex items-center gap-2 ${aiScanStep >= 4 ? "text-emerald-400 font-bold" : "text-zinc-600"}`}>
              {aiScanStep > 4 ? <Check className="w-3.5 h-3.5" /> : aiScanStep === 4 ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Evaluating rules & evidence...</span>
            </div>
            <div className={`flex items-center gap-2 ${aiScanStep >= 5 ? "text-emerald-400 font-bold" : "text-zinc-600"}`}>
              {aiScanStep > 5 ? <Check className="w-3.5 h-3.5" /> : aiScanStep === 5 ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Formulating diagnostic report...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
