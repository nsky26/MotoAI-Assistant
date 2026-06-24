import React, { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Zap, Shield, HelpCircle, ArrowRight, Camera, RefreshCw, ScanLine } from "lucide-react";
import { Diagnosis, VisionDiagnosisResponse } from "../types";
import { getFallbackDiagnosis } from "../services/diagnosisService";
import { useSpeechToText } from "../hooks/useSpeechToText";
import { captureFrame, buildVisionPayload, validateImage } from "../services/cameraService";
import { classifySeverity } from "../services/aiDiagnosisService";

interface CameraScanViewProps {
  onDiagnosticComplete: (diag: Diagnosis) => void;
  onSelectCriticalPreset: () => void;
}

export default function CameraScanView({ onDiagnosticComplete, onSelectCriticalPreset }: CameraScanViewProps) {
  const [activePreset, setActivePreset] = useState<string>("Battery issue");
  const [customInput, setCustomInput] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [displayTranscript, setDisplayTranscript] = useState<string>("\"I'm hearing a clicking sound near the battery...\"");

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

  // When speech stops with content, auto-submit for diagnosis
  const previousListeningRef = useRef(false);
  useEffect(() => {
    if (previousListeningRef.current && !isMicListening && speechTranscript.trim().length > 0) {
      // User stopped listening and has speech content — submit it
      const text = speechTranscript.trim();
      // Small delay to let the UI settle
      const timer = setTimeout(() => {
        handleIssueSubmit(text);
      }, 300);
      return () => clearTimeout(timer);
    }
    previousListeningRef.current = isMicListening;
  }, [isMicListening]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const presets = [
    { label: "Bike not starting", transcript: "\"The engine attempts to turnover but dies immediately with a low hum.\"", target: "ENGINE" },
    { label: "Strange noise", transcript: "\"There is a squeaking vibration under the transmission casing.\"", target: "TRANS" },
    { label: "Smoke detected", transcript: "\"Heavy dark smoke exhaust coming from rear silencer on throttle.\"", target: "EXHAUST" },
    { label: "Battery issue", transcript: "\"I'm hearing a clicking sound near the battery...\"", target: "BATTERY" }
  ];

  // Request Camera access of client
  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn("Video play error:", e));
        }
        setHasCameraAccess(true);
      } else {
        setHasCameraAccess(false);
      }
    } catch (e) {
      console.warn("Camera request error:", e);
      setHasCameraAccess(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      // Cleanup stream on close
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle Preset tag clicks
  const handlePresetClick = (preset: typeof presets[0]) => {
    setActivePreset(preset.label);
    setDisplayTranscript(preset.transcript);
  };

  /**
   * Maps a VisionDiagnosisResponse from the Gemini Vision API into a
   * standard Diagnosis object that the rest of the app understands.
   */
  const mapVisionToDiagnosis = (vision: VisionDiagnosisResponse, prompt: string): Diagnosis => {
    const isCritical = vision.severity === "CRITICAL" || vision.severity === "HIGH";
    return {
      id: `vision-${Date.now()}`,
      isCritical,
      issue: vision.issue || "Unknown issue detected",
      confidence: vision.confidence,
      description: `AI vision analysis based on camera image${prompt ? ` with context: "${prompt}"` : ""}.`,
      difficulty:
        vision.repairDifficulty === "EXPERT"
          ? 5
          : vision.repairDifficulty === "INTERMEDIATE"
            ? 3
            : 1,
      estimatedTime: isCritical ? "See professional" : "30-60 mins",
      diyCost: vision.estimatedCost === "Free" ? 0 : 20,
      proEstimate: isCritical ? 200 : 80,
      severityCode: isCritical ? "V001" : "V002",
      severityLevel: vision.severity || "MEDIUM",
      aiRecommendation: `Detected: ${vision.issue}. Severity: ${vision.severity}. Difficulty: ${vision.repairDifficulty}. Estimated cost: ${vision.estimatedCost}. Always prioritize safety.`,
      steps: isCritical ? undefined : vision.repairSteps,
      estimatedCost: isCritical ? vision.estimatedCost : undefined,
      costDetails: isCritical ? `Professional repair recommended. ${vision.estimatedCost}` : undefined,
      mechanics: isCritical
        ? [
            { name: "Apex Precision Moto", rating: 4.9, reviews: 214, distance: "0.8 miles away" },
            { name: "Nitro Diagnostics Hub", rating: 4.7, reviews: 128, distance: "2.4 miles away" },
          ]
        : undefined,
    };
  };

  /**
   * Captures a frame from the live camera and sends it to Gemini Vision
   * for AI-based image diagnosis.
   */
  const handleCaptureAndDiagnose = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const captured = captureFrame(videoRef.current, canvasRef.current);
    if (!captured) {
      console.warn("Failed to capture frame from video feed.");
      return;
    }

    // Validate image before sending
    const validation = validateImage(captured.base64);
    if (!validation.valid) {
      console.warn("Image validation failed:", validation.error);
      return;
    }

    setIsAnalyzing(true);

    try {
      const payload = buildVisionPayload(captured.base64, customInput || undefined);
      const response = await fetch("/api/diagnose-vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Vision API returned ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.diagnosis) {
        const mapped = mapVisionToDiagnosis(data.diagnosis, customInput);
        onDiagnosticComplete(mapped);
      } else {
        throw new Error("Vision API returned unexpected response");
      }
    } catch (err) {
      console.warn("Vision diagnostics failed, falling back to text-based diagnose:", err);
      // Fallback: use severity-based classification (no keyword matching)
      const fallbackText = customInput || "motorcycle issue";
      const severity = classifySeverity(fallbackText);
      if (severity === "CRITICAL" || severity === "HIGH") {
        onSelectCriticalPreset();
      } else {
        onDiagnosticComplete(getFallbackDiagnosis("battery"));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit Issue to Gemini API or Fallback
  const handleIssueSubmit = async (textToSubmit: string, forceCritical: boolean = false) => {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          input: textToSubmit,
          isCriticalRequest: forceCritical
        }),
      });
      const data = await response.json();
      if (data.success && data.diagnosis) {
        onDiagnosticComplete(data.diagnosis);
      } else {
        throw new Error("Diagnostics API returned error status");
      }
    } catch (err) {
      console.warn("Diagnostics API failed, falling back to offline preset:", err);
      // Fallback via severity classification — no keyword matching
      if (forceCritical) {
        onSelectCriticalPreset();
      } else {
        const severity = classifySeverity(textToSubmit);
        if (severity === "CRITICAL" || severity === "HIGH") {
          onSelectCriticalPreset();
        } else {
          onDiagnosticComplete(getFallbackDiagnosis("battery"));
        }
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0b0c] text-white">
      {/* Title Header */}
      <div className="p-4 pt-6 text-center z-10">
        <h2 className="text-xl font-bold tracking-tight text-zinc-100 font-cyber">
          Point camera at motorcycle <br />
          <span className="text-zinc-400 font-normal text-lg">and describe the issue</span>
        </h2>
      </div>

      {/* Preset Pill Tags */}
      <div className="flex flex-wrap justify-center gap-2 px-4 mb-4 z-10 transition-all">
        {presets.map((p) => {
          const isSelected = activePreset === p.label;
          return (
            <button
              key={p.label}
              id={`preset-pill-${p.label.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => handlePresetClick(p)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide border transition-all duration-300 cursor-pointer ${
                isSelected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                  : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Futuristic Viewfinder Display */}
      <div className="relative flex-1 mx-4 rounded-3xl overflow-hidden border border-zinc-800/80 bg-zinc-950/70 scanner-beam flex items-center justify-center min-h-[300px]">
        
        {/* Real Live Camera Stream or Stylized Vector Fallback */}
        {hasCameraAccess ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
        ) : (
          /* High-Fidelity Cyberpunk Vector Graphic Representation of Motorcycle Battery & Casing */
          <div className="absolute inset-x-0 top-0 bottom-0 flex flex-col items-center justify-center opacity-70">
            <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden">
              
              {/* Animated Engine Background / Grid lines */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#151515_1px,transparent_1px),linear-gradient(to_bottom,#151515_1px,transparent_1px)] bg-[size:30px_30px] opacity-40"></div>
              
              {/* Dynamic neon circles imitating mechanical components */}
              <div className="absolute w-72 h-72 rounded-full border border-zinc-900/30 flex items-center justify-center">
                <div className="absolute w-56 h-56 rounded-full border border-emerald-500/10 spin-slow"></div>
                <div className="absolute w-44 h-44 rounded-full border-2 border-dashed border-emerald-500/20 spin-slow-reverse"></div>
                <div className="absolute w-32 h-32 rounded-full bg-emerald-500/5 border border-emerald-500/30 flex items-center justify-center">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 glow-green animate-ping"></div>
                  <div className="w-3 h-3 absolute rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]"></div>
                </div>
              </div>

              {/* Chassis Schematic vectors */}
              <svg className="absolute inset-0 w-full h-full text-zinc-800 opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 100 L300 200 L400 150 L550 350 M100 400 L250 300 L400 450" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
                <circle cx="300" cy="200" r="10" fill="none" stroke="currentColor" />
                <circle cx="250" cy="300" r="15" fill="none" stroke="currentColor" />
              </svg>

              <HelpCircle className="w-10 h-10 text-zinc-700 absolute top-4 left-4 animate-pulse" />
              <Camera className="w-8 h-8 text-emerald-500/40 absolute" />
            </div>
          </div>
        )}

                {/* Capture Button — triggers real AI vision diagnosis */}
                {hasCameraAccess && (
                  <button
                    id="capture-diagnose-btn"
                    onClick={handleCaptureAndDiagnose}
                    disabled={isAnalyzing}
                    className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-700 text-zinc-950 disabled:text-zinc-500 font-bold text-xs tracking-wider py-2.5 px-5 rounded-full uppercase transition-all duration-300 shadow-[0_4px_20px_rgba(16,185,129,0.35)] flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed font-cyber"
                    title="Capture photo and analyze with AI"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <ScanLine className="w-4 h-4" />
                        Capture & Diagnose
                      </>
                    )}
                  </button>
                )}

                {/* Framing HUD brackets in corners */}
        <div className="absolute inset-4 pointer-events-none border-t-2 border-l-2 border-emerald-500/60 w-10 h-10 rounded-tl-lg"></div>
        <div className="absolute inset-y-4 right-4 pointer-events-none border-t-2 border-r-2 border-emerald-500/60 w-10 h-10 rounded-tr-lg"></div>
        <div className="absolute bottom-4 left-4 pointer-events-none border-b-2 border-l-2 border-emerald-500/60 w-10 h-10 rounded-bl-lg"></div>
        <div className="absolute bottom-4 right-4 pointer-events-none border-b-2 border-r-2 border-emerald-500/60 w-10 h-10 rounded-br-lg"></div>

        {/* Dynamic target bounding boxes that adjust based on active preset */}
        {activePreset === "Battery issue" && (
          <div className="absolute top-[28%] left-[25%] right-[25%] bottom-[32%] border-2 border-emerald-500 rounded-2xl flex flex-col animate-pulse transition-all duration-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <span className="bg-emerald-500 text-[#0b0b0c] text-[10px] font-bold px-2 py-0.5 rounded-tl-lg rounded-br-lg uppercase tracking-wider w-fit font-mono-tech">
              BATTERY CLUSTER
            </span>
            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
          </div>
        )}

        {activePreset === "Bike not starting" && (
          <div className="absolute top-[35%] left-[20%] right-[20%] bottom-[25%] border-2 border-orange-500 rounded-2xl flex flex-col animate-pulse transition-all duration-500 shadow-[0_0_20px_rgba(249,115,22,0.3)]">
            <span className="bg-orange-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-tl-lg rounded-br-lg uppercase tracking-wider w-fit font-mono-tech">
              ENGINE BLOCK
            </span>
          </div>
        )}

        {activePreset === "Strange noise" && (
          <div className="absolute top-[40%] left-[30%] right-[15%] bottom-[20%] border-2 border-blue-500 rounded-2xl flex flex-col animate-pulse transition-all duration-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-tl-lg rounded-br-lg uppercase tracking-wider w-fit font-mono-tech">
              TRANSMISSION CASING
            </span>
          </div>
        )}

        {activePreset === "Smoke detected" && (
          <div className="absolute top-[50%] left-[10%] right-[40%] bottom-[15%] border-2 border-yellow-500 rounded-2xl flex flex-col animate-pulse transition-all duration-500 shadow-[0_0_20px_rgba(234,179,8,0.3)]">
            <span className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-tl-lg rounded-br-lg uppercase tracking-wider w-fit font-mono-tech">
              EXHAUST SILENCER
            </span>
          </div>
        )}

        {/* Real-time floating AI syncing / transcription widget */}
        <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-[#0e0e11]/90 backdrop-blur-md border border-zinc-800 shadow-xl flex flex-col gap-2 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse glow-green"></div>
              <span className="text-xs font-bold text-emerald-400 font-cyber tracking-wider">AI SYNCING...</span>
            </div>
            <span className="text-[10px] font-mono-tech text-zinc-500 tracking-widest uppercase">LIDAR ACTIVE</span>
          </div>
          <p className="text-sm font-medium text-zinc-200 leading-relaxed font-sans italic">
            {isMicListening ? `"${speechTranscript || "Listening..."}"` : displayTranscript}
          </p>
        </div>
      </div>

      {/* Diagnostic & Typing Input Section */}
      <div className="p-4 flex flex-col gap-3">
        
        {/* Dynamic description console */}
        <div className="relative">
          <input
            id="describe-issue-input"
            type="text"
            placeholder="Or type custom issue (e.g. 'brake pedal leaks fluid')"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && customInput.trim() && handleIssueSubmit(customInput)}
            className="w-full bg-zinc-950/90 border border-zinc-800 text-zinc-200 rounded-2xl py-3.5 pl-4 pr-12 text-sm focus:outline-none focus:border-emerald-500/80 transition-all font-sans placeholder:text-zinc-600 shadow-inner"
          />
          <button
            id="submit-issue-btn"
            disabled={!customInput.trim() || isAnalyzing}
            onClick={() => handleIssueSubmit(customInput)}
            className="absolute right-2.5 top-2.5 p-1.5 rounded-xl bg-emerald-500 text-zinc-950 disabled:bg-zinc-800 disabled:text-zinc-600 transition-all cursor-pointer hover:bg-emerald-400"
          >
            {isAnalyzing ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
          </button>
        </div>

        {/* High-Fidelity Quick Launcher Grid */}
        <div className="flex items-center justify-between mt-1">
          {/* Quick Critical Demo Trigger */}
          <button 
            id="view-critical-brake-btn"
            onClick={() => handleIssueSubmit("severe brake failure", true)}
            className="text-xs text-red-400 hover:text-red-300 transition-all flex items-center gap-1.5 font-semibold bg-red-950/20 px-3 py-1.5 rounded-xl border border-red-900/30 font-cyber cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5" />
            Simulate Brake Failure
          </button>

          {/* Quick Battery Demo Trigger */}
          <button 
            id="run-auto-diagnose-btn"
            onClick={() => handleIssueSubmit("Battery issue")}
            className="bg-emerald-500 text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold tracking-wide uppercase transition-all duration-300 shadow-[0_4px_12px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.5)] flex items-center gap-1.5 font-cyber cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            Analyze Preset
          </button>
        </div>

        {/* Audio feedback simulated level */}
        <div className="flex items-center justify-center gap-8 py-2">
          <div className="flex gap-0.5 items-center">
            <span className="w-[3px] h-3 bg-zinc-800 rounded-sm"></span>
            <span className="w-[3px] h-5 bg-zinc-700 rounded-sm"></span>
            <span className="w-[3px] h-7 bg-emerald-500 rounded-sm animate-pulse"></span>
            <span className="w-[3px] h-4 bg-zinc-700 rounded-sm"></span>
            <span className="w-[3px] h-2 bg-zinc-800 rounded-sm"></span>
          </div>

          {/* Glowing Green Microphone Button — Real Speech-to-Text */}
          <button
            id="microphone-hold-button"
            onClick={toggleListening}
            disabled={!speechSupported}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-zinc-950 shadow-[0_0_20px_rgba(5,255,100,0.4)] border-4 border-[#0b0b0c] hover:scale-105 active:scale-95 transition-all duration-300 relative cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isMicListening ? "bg-red-500 animate-pulse" : "bg-emerald-500"
            }`}
            title={
              !speechSupported
                ? "Speech recognition not supported on this browser"
                : isMicListening
                  ? "Tap to stop listening"
                  : "Tap to start voice input"
            }
          >
            <Mic className="w-6 h-6 fill-current" />
            {isMicListening && (
              <span className="absolute -inset-1 rounded-full border border-red-400/60 animate-ping pointer-events-none"></span>
            )}
            {!isMicListening && !speechTranscript && (
              <span className="absolute -inset-1 rounded-full border border-emerald-500/40 animate-ping pointer-events-none"></span>
            )}
          </button>

          <div className="flex gap-0.5 items-center">
            <span className="w-[3px] h-2 bg-zinc-800 rounded-sm"></span>
            <span className="w-[3px] h-4 bg-zinc-700 rounded-sm"></span>
            <span className="w-[3px] h-6 bg-emerald-500 rounded-sm animate-pulse"></span>
            <span className="w-[3px] h-5 bg-zinc-700 rounded-sm"></span>
            <span className="w-[3px] h-3 bg-zinc-800 rounded-sm"></span>
          </div>
        </div>
      </div>
    </div>
  );
}
