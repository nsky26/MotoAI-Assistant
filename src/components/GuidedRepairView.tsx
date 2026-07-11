import React, { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, Check, CheckCircle2, ChevronRight, ChevronLeft, Eye, EyeOff, Flashlight, RefreshCw, Send, Sparkles, ExternalLink, AlertTriangle, Camera, Link2
} from "lucide-react";
import { getSession } from "../services/diagnosticEngine";
import { classifyPartCondition } from "../services/visionService";
import { replanWorkflow } from "../services/workflowEngine";
import { getApiUrl } from "../services/apiClient";

import torqueSpecs from "../../knowledge/torque_specs.json";
import fluidsData from "../../knowledge/fluids.json";

interface GuidedRepairViewProps {
  steps: string[];
  issueTitle: string;
  onCompletedAll: () => void;
  onBackToResult: () => void;
}

export default function GuidedRepairView({ steps = [], issueTitle, onCompletedAll, onBackToResult }: GuidedRepairViewProps) {
  // Stateful repair steps and issue titles for replanning
  const [currentSteps, setCurrentSteps] = useState<string[]>(steps);
  const [currentIssueTitle, setCurrentIssueTitle] = useState<string>(issueTitle);
  const [failedRepairs, setFailedRepairs] = useState<string[]>([]);

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0); 
  const [showExample, setShowExample] = useState<boolean>(false);
  const [flashlightOn, setFlashlightOn] = useState<boolean>(false);
  const [copilotQuestion, setCopilotQuestion] = useState<string>("");
  const [copilotAnswer, setCopilotAnswer] = useState<string>("");
  const [isCopilotLoading, setIsCopilotLoading] = useState<boolean>(false);
  const [verifiedSteps, setVerifiedSteps] = useState<boolean[]>(new Array(steps.length).fill(false));

  const [selectedBrand, setSelectedBrand] = useState<string>("Honda");
  
  // Camera status tracking
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Verification feedback states
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationFeedback, setVerificationFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const totalSteps = currentSteps.length || 5;
  const currentStepNum = currentStepIndex + 1;
  const progressPercent = (currentStepNum / totalSteps) * 100;

  // Initialize camera for Guided Repair Viewfinder
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }

      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(e => console.warn("GuidedRepairView camera play error:", e));
        }
        setIsCameraActive(true);
      } else {
        setCameraError("Camera devices not available.");
      }
    } catch (err: any) {
      console.warn("GuidedRepairView: Failed to start camera:", err);
      setIsCameraActive(false);
      setCameraError(err.message || "Camera permission denied.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Retrieve Brand from active session
  useEffect(() => {
    const session = getSession();
    if (session?.bikeModel && session.bikeModel !== "Generic Motorcycle") {
      const parsed = session.bikeModel.split(" ")[0];
      if (parsed) {
        setSelectedBrand(parsed);
      }
    }
  }, []);

  // Sync inputs on props changes
  useEffect(() => {
    setCurrentSteps(steps);
    setCurrentIssueTitle(issueTitle);
    setCurrentStepIndex(0);
    setFailedRepairs([]);
    setVerificationFeedback(null);
  }, [steps, issueTitle]);

  // Get matching parts links matching brand and specific issue
  const getSpareParts = (title: string, bikeBrand: string) => {
    const lower = title.toLowerCase();
    
    // Spark Plugs
    if (lower.includes("spark") || lower.includes("ignition") || lower.includes("plug")) {
      return [
        {
          name: `${bikeBrand} OEM Standard Spark Plug`,
          price: "$8.40",
          image: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Sparkplug.jpg",
          url: `https://www.amazon.com/s?k=${bikeBrand}+motorcycle+spark+plug`
        },
        {
          name: "NGK Iridium High-Performance Plug Upgrade",
          price: "$13.90",
          image: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Sparkplug.jpg",
          url: "https://www.amazon.com/s?k=ngk+iridium+spark+plug"
        }
      ];
    }
    
    // Drive Chain
    if (lower.includes("chain") || lower.includes("sprocket") || lower.includes("noise") || lower.includes("loose")) {
      return [
        {
          name: `${bikeBrand} Heavy Duty Drive Chain & Sprocket Kit`,
          price: "$46.00",
          image: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Motorcycle_drive_chain.jpg",
          url: `https://www.amazon.com/s?k=${bikeBrand}+motorcycle+drive+chain`
        },
        {
          name: "Motul O-Ring Chain Clean & Lube Combo Spray",
          price: "$19.50",
          image: "https://upload.wikimedia.org/wikipedia/commons/e/ea/Motorcycle_drive_chain.jpg",
          url: "https://www.amazon.com/s?k=motul+chain+lube"
        }
      ];
    }

    // Brakes
    if (lower.includes("brake") || lower.includes("rotor") || lower.includes("caliper")) {
      return [
        {
          name: `${bikeBrand} Front Sintered Brake Pads (Pair)`,
          price: "$24.90",
          image: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Motorcycle_battery.jpg",
          url: `https://www.amazon.com/s?k=${bikeBrand}+motorcycle+brake+pads`
        },
        {
          name: "Castrol DOT 4 Synthetic Hydraulic Brake Fluid",
          price: "$9.20",
          image: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Motorcycle_battery.jpg",
          url: "https://www.amazon.com/s?k=dot+4+brake+fluid"
        }
      ];
    }

    // Default: Battery
    return [
      {
        name: `${bikeBrand} Maintenance-Free AGM Starter Battery`,
        price: "$34.90",
        image: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Motorcycle_battery.jpg",
        url: `https://www.amazon.com/s?k=${bikeBrand}+motorcycle+battery`
      },
      {
        name: "Permatex Anti-Corrosion Dielectric Terminal Grease",
        price: "$5.20",
        image: "https://upload.wikimedia.org/wikipedia/commons/3/3f/Motorcycle_battery.jpg",
        url: "https://www.amazon.com/s?k=battery+terminal+grease"
      }
    ];
  };

  const spareParts = getSpareParts(currentIssueTitle, selectedBrand);

  // Extract torque specs from database
  const getTorqueSpec = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("spark") || lower.includes("plug")) {
      return torqueSpecs.find(t => t.component === "spark_plug");
    }
    if (lower.includes("battery")) {
      return torqueSpecs.find(t => t.component === "battery");
    }
    if (lower.includes("chain")) {
      return torqueSpecs.find(t => t.component === "drive_chain");
    }
    if (lower.includes("brake")) {
      return torqueSpecs.find(t => t.component === "brake_fluid");
    }
    return null;
  };
  const torque = getTorqueSpec(currentIssueTitle);

  // Extract fluid specs from database
  const getFluidSpec = (title: string, brand: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("brake")) {
      return fluidsData.find(f => f.fluid === "Brake Fluid");
    }
    return fluidsData.find(f => f.modelId === brand.toLowerCase()) || fluidsData.find(f => f.modelId === "generic");
  };
  const fluid = getFluidSpec(currentIssueTitle, selectedBrand);

  // Capture frame and perform real visual repair verification
  const handleVerifyStep = async () => {
    if (!isCameraActive) {
      setVerificationFeedback({
        success: false,
        message: "Verification Failed: Camera feed is offline. Please grant camera access, or click 'Force Verify & Bypass' to advance."
      });
      return;
    }

    setIsVerifying(true);
    setVerificationFeedback(null);

    // Simulate lens capture pause
    await new Promise(resolve => setTimeout(resolve, 1200));

    let isHealthy = false;
    let targetPart = "battery";

    if (currentIssueTitle.toLowerCase().includes("spark") || currentIssueTitle.toLowerCase().includes("plug")) {
      targetPart = "spark_plug";
    } else if (currentIssueTitle.toLowerCase().includes("chain")) {
      targetPart = "chain";
    }

    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, 100, 100);
        const condition = classifyPartCondition(targetPart, ctx, 100, 100);
        
        // If condition returns "Healthy", verification passes!
        if (condition === "Healthy") {
          isHealthy = true;
        } else {
          setVerificationFeedback({
            success: false,
            message: `Verification Failed: ${condition} condition still detected on ${targetPart}. Clean or tighten the component and try again.`
          });
        }
      }
    } else {
      isHealthy = true;
    }

    setIsVerifying(false);

    if (isHealthy) {
      setVerificationFeedback({
        success: true,
        message: "Verification Succeeded! The component state is healthy."
      });
      
      const updated = [...verifiedSteps];
      updated[currentStepIndex] = true;
      setVerifiedSteps(updated);

      setTimeout(() => {
        setVerificationFeedback(null);
        if (currentStepIndex < totalSteps - 1) {
          setCurrentStepIndex(prev => prev + 1);
          setShowExample(false);
        } else {
          onCompletedAll();
        }
      }, 1500);
    }
  };

  const handleForceBypass = () => {
    setVerificationFeedback(null);
    const updated = [...verifiedSteps];
    updated[currentStepIndex] = true;
    setVerifiedSteps(updated);

    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
      setShowExample(false);
    } else {
      onCompletedAll();
    }
  };

  // Triggers dynamic workflow recalculations and replanning
  const handleTriggerReplanning = () => {
    // Determine active symptoms based on current issue title
    const activeSymptoms: string[] = ["s_weak_cranking"];
    if (currentIssueTitle.toLowerCase().includes("chain")) {
      activeSymptoms.push("s_chain_clanking");
    } else if (currentIssueTitle.toLowerCase().includes("spark") || currentIssueTitle.toLowerCase().includes("plug")) {
      activeSymptoms.push("s_engine_misfire");
    } else if (currentIssueTitle.toLowerCase().includes("brake")) {
      activeSymptoms.push("s_soft_brake_lever");
    } else if (currentIssueTitle.toLowerCase().includes("tire") || currentIssueTitle.toLowerCase().includes("puncture")) {
      activeSymptoms.push("s_flat_tire_handling");
    }

    // Determine current failure ID
    let currentFailureId = "dead_battery";
    if (currentIssueTitle.toLowerCase().includes("corrosion")) {
      currentFailureId = "corroded_terminals";
    } else if (currentIssueTitle.toLowerCase().includes("spark") || currentIssueTitle.toLowerCase().includes("plug")) {
      currentFailureId = "carbon_fouled_plug";
    } else if (currentIssueTitle.toLowerCase().includes("chain")) {
      currentFailureId = "loose_chain_slack";
    } else if (currentIssueTitle.toLowerCase().includes("brake")) {
      currentFailureId = "air_in_brake_lines";
    } else if (currentIssueTitle.toLowerCase().includes("tire") || currentIssueTitle.toLowerCase().includes("puncture")) {
      currentFailureId = "tire_puncture";
    }

    const updatedFailed = [...failedRepairs, currentFailureId];
    setFailedRepairs(updatedFailed);

    const replanned = replanWorkflow(currentFailureId, activeSymptoms, updatedFailed);
    if (replanned) {
      setCurrentIssueTitle(replanned.diagnosis.issue);
      setCurrentSteps(replanned.workflow.repairSteps);
      setCurrentStepIndex(0);
      setVerificationFeedback({
        success: false,
        message: `Replanning Complete: Loaded dynamic repair plan for: ${replanned.diagnosis.issue}. Please follow the revised mechanical steps.`
      });
    }
  };

  const handleAskCopilot = async () => {
    if (!copilotQuestion.trim()) return;
    setIsCopilotLoading(true);
    setCopilotAnswer("");
    try {
      const response = await fetch(getApiUrl("/api/ask-gemini"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: copilotQuestion,
          context: {
            issue: currentIssueTitle,
            currentStep: currentSteps[currentStepIndex],
            stepIndex: currentStepIndex
          }
        }),
      });
      const data = await response.json();
      if (data.success && data.answer) {
        setCopilotAnswer(data.answer);
      } else {
        throw new Error();
      }
    } catch {
      setCopilotAnswer("Always remember to use safety glasses, wear insulative gloves, make sure that no keys are in the ignition, and do not let positive and negative lines bridge.");
    } finally {
      setIsCopilotLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0b0c] text-white overflow-hidden">
      
      {/* Hidden canvas for image capture verification */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Navigation Row - FIXED */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-900/40 flex-shrink-0">
        <button 
          id="back-to-results-btn"
          onClick={onBackToResult} 
          className="p-1.5 rounded-xl hover:bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-xs font-bold tracking-widest text-zinc-500 font-mono-tech uppercase">
          REPAIR ASSIST
        </span>
        <button 
          id="toggle-flashlight"
          onClick={() => setFlashlightOn(prev => !prev)} 
          className={`p-2 rounded-xl transition-all cursor-pointer flex-shrink-0 ${
            flashlightOn ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]" : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          <Flashlight className="w-5 h-5" />
        </button>
      </div>

      {/* Live View AR Target overlay - FIXED UPPER PORTION */}
      <div className="relative h-48 border-b border-zinc-900/60 overflow-hidden flex items-center justify-center bg-zinc-950 flex-shrink-0 z-20">
        
        {isCameraActive ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        ) : (
          /* Fallback view if camera has no permissions/errors */
          <div className="absolute inset-0 bg-[#0d0e12] flex flex-col items-center justify-center gap-2 p-4 text-center">
            <Camera className="w-8 h-8 text-zinc-650 animate-pulse" />
            <span className="text-[10px] text-zinc-500 font-mono uppercase">Camera is Offline</span>
            {cameraError && <p className="text-[9px] text-red-500/80 font-mono max-w-xs">{cameraError}</p>}
            <button
              onClick={startCamera}
              className="mt-1 bg-zinc-900 border border-zinc-800 text-[9px] font-bold py-1 px-3 rounded uppercase text-emerald-400"
            >
              Enable Camera
            </button>
          </div>
        )}

        <div className="absolute inset-0 bg-[linear-gradient(to_right,#13141a_1px,transparent_1px),linear-gradient(to_bottom,#13141a_1px,transparent_1px)] bg-[size:20px_20px] opacity-35"></div>
        
        {/* Circular HUD lock */}
        <div className="relative w-32 h-32 border border-emerald-500/10 rounded-full flex items-center justify-center">
          <div className="absolute w-24 h-24 border border-emerald-500/20 rounded-full spin-slow"></div>
          <div className="absolute w-18 h-18 border-2 border-dashed border-emerald-400/40 rounded-full spin-slow-reverse"></div>
          <div className="absolute w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 glow-green"></div>
          </div>
        </div>

        {/* Framing brackets */}
        <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-emerald-500/40 rounded-tl"></div>
        <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-emerald-500/40 rounded-tr"></div>
        <div className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-emerald-500/40 rounded-bl"></div>
        <div className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-emerald-500/40 rounded-br"></div>

        {/* High-tech scan notification label */}
        <div className="absolute top-3 left-3 bg-emerald-500/10 border border-emerald-500/30 text-[9px] text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono-tech">
          {currentIssueTitle.toUpperCase().includes("SPARK") ? "SPARK PLUG DETECTED" : 
           currentIssueTitle.toUpperCase().includes("CHAIN") ? "DRIVE CHAIN DETECTED" : "BATTERY DETECTED"}
        </div>

        {/* "Show Example" schematic illustration card overlay - DYNAMIC */}
        {showExample && (
          <div className="absolute inset-0 bg-[#0e0e11]/95 z-30 p-4 flex flex-col justify-center animate-fade-in text-center">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono-tech flex items-center justify-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 fill-current" />
              Terminal Guidance Overlay
            </h4>
            <div className="mx-auto max-w-xs border border-zinc-800 rounded-xl bg-zinc-950 p-3 text-left">
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest font-mono block mb-1">
                PROCEDURE CHECKLIST
              </span>
              <p className="text-[10px] text-zinc-300 leading-relaxed font-mono-tech">
                • <span className="text-zinc-400">Action:</span> {currentSteps[currentStepIndex] || "Loosen components."}<br />
                • <span className="text-zinc-400">Tooling:</span> Ensure correct metric wrench/socket size.<br />
                • <span className="text-zinc-400">Safety:</span> Double check that ignition keys are off.<br />
                • <span className="text-zinc-400">Verification:</span> Align target within overlay markers.
              </p>
              <div className="flex gap-2 justify-center mt-2.5 border-t border-zinc-900 pt-1.5 items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 glow-green animate-ping"></span>
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">LIVE COMPARISON FEED</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress metrics and Step tracker - FIXED */}
      <div className="p-4 z-10 flex-shrink-0 border-b border-zinc-900/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-zinc-500 tracking-wider font-mono-tech uppercase">
            REPAIR PROGRESS
          </span>
          <span className="text-[15px] font-cyber font-bold text-emerald-400">
            Step {currentStepNum} of {totalSteps}
          </span>
        </div>

        {/* Visual progress bar */}
        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500 ease-out shadow-[0_0_8px_#10b981]" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Scrollable Details Container - SCROLLABLE BOTTOM HALF */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Verification Status Overlay banner */}
        {verificationFeedback && (
          <div className={`p-3.5 rounded-xl border flex flex-col gap-2 font-mono text-xs ${
            verificationFeedback.success 
              ? "bg-emerald-950/20 border-emerald-900/30 text-emerald-400" 
              : "bg-red-950/20 border-red-900/30 text-red-400"
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {verificationFeedback.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{verificationFeedback.success ? "VERIFICATION PASSED" : "VERIFICATION FAILED"}</span>
            </div>
            <p className="font-sans text-[11px] leading-relaxed text-zinc-300">{verificationFeedback.message}</p>
            {!verificationFeedback.success && (
              <div className="flex gap-2 mt-1">
                <button
                  onClick={handleForceBypass}
                  className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/25 text-red-200 text-[10px] font-bold py-1.5 px-3 rounded-lg uppercase transition-all cursor-pointer"
                >
                  Force Verify & Bypass
                </button>
                <button
                  onClick={handleTriggerReplanning}
                  className="bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/25 text-emerald-400 text-[10px] font-bold py-1.5 px-3 rounded-lg uppercase transition-all cursor-pointer animate-pulse"
                >
                  AI Replanning Workflow
                </button>
              </div>
            )}
          </div>
        )}

        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 flex flex-col justify-between h-fit gap-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mt-1">
              <Sparkles className="w-4.5 h-4.5 fill-current" />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest font-mono-tech text-emerald-400">
                Action Required
              </span>
              <p className="text-zinc-200 font-medium text-sm mt-1.5 leading-relaxed font-sans">
                {currentSteps[currentStepIndex] || "Loosen components to proceed."}
              </p>
            </div>
          </div>

          {/* Prompt quick tools inside card */}
          <div className="flex items-center gap-2 mt-2">
            <button
              id="show-example-diagram-toggle"
              onClick={() => setShowExample(prev => !prev)}
              className="flex-1 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 py-3 px-4 rounded-xl text-xs font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer font-cyber"
            >
              {showExample ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showExample ? "Hide Example" : "Show Example"}
            </button>
          </div>
        </div>

        {/* Torque Specs & Fluid Capacities card */}
        {torque && (
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest font-mono-tech text-emerald-400">
                FASTENER TORQUE & REASSEMBLY SPECS
              </span>
            </div>
            <div className="space-y-2 font-mono text-[11px]">
              <div>
                <span className="text-zinc-500">Fastener:</span> <span className="text-zinc-300 font-bold">{torque.fastener}</span>
              </div>
              <div>
                <span className="text-zinc-500">Torque Spec:</span> <span className="text-emerald-400 font-bold">{torque.torque}</span>
              </div>
              {torque.notes && (
                <div className="text-zinc-400 italic text-[10px] leading-relaxed">
                  💡 Note: {torque.notes}
                </div>
              )}
              {fluid && (
                <div className="mt-2 border-t border-zinc-900/60 pt-2">
                  <span className="text-zinc-500">Recommended Fluid:</span> <span className="text-zinc-300 font-bold">{fluid.specification}</span> ({fluid.capacity})
                </div>
              )}
            </div>
          </div>
        )}

        {/* Motorcycle Brand & Spare Parts links - DYNAMIC */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
          <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono-tech text-emerald-400">
              VEHICLE COMPATIBILITY
            </span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded font-mono focus:outline-none"
            >
              <option value="Honda">HONDA</option>
              <option value="Hero">HERO MOTOCORP</option>
              <option value="Bajaj">BAJAJ AUTO</option>
              <option value="TVS">TVS MOTOR</option>
              <option value="Yamaha">YAMAHA</option>
              <option value="Royal Enfield">ROYAL ENFIELD</option>
            </select>
          </div>

          <div className="space-y-3">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">
              Recommended Spare Parts & Accessories
            </span>
            
            <div className="grid grid-cols-1 gap-2.5">
              {spareParts.map((part, index) => (
                <div key={index} className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-850 p-2.5 rounded-xl">
                  {/* Embedded image preview */}
                  <img 
                    src={part.image} 
                    alt={part.name} 
                    className="w-12 h-12 object-cover rounded-lg border border-zinc-800 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-200 font-bold truncate">{part.name}</p>
                    <p className="text-[10px] text-emerald-400 font-mono mt-0.5">{part.price}</p>
                  </div>
                  <a 
                    href={part.url}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 p-2 rounded-lg flex items-center justify-center transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI COPILOT VOICE COMPANION ASSIST */}
        <div className="bg-zinc-950/50 border border-zinc-900/60 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-emerald-400 fill-current" />
            <h4 className="text-xs font-bold font-cyber text-zinc-300 uppercase tracking-wider">
              MotoAI Repair Copilot
            </h4>
          </div>

          <p className="text-[11px] text-zinc-500 leading-normal">
            Stuck? Ask any custom mechanical questions standard to this specific step.
          </p>

          <div className="relative">
            <input
              id="copilot-query-field"
              type="text"
              placeholder="e.g. 'What if the terminal bolt is rusted?'"
              value={copilotQuestion}
              onChange={(e) => setCopilotQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAskCopilot()}
              className="w-full bg-zinc-950/90 border border-zinc-850 text-zinc-300 rounded-xl py-2.5 pl-3 pr-10 text-xs focus:outline-none focus:border-emerald-500/50 placeholder:text-zinc-600"
            />
            <button
              id="send-copilot-question-btn"
              disabled={!copilotQuestion.trim() || isCopilotLoading}
              onClick={handleAskCopilot}
              className="absolute right-2 top-2 p-1 rounded-lg text-emerald-400 hover:bg-zinc-900 disabled:text-zinc-700 cursor-pointer"
            >
              {isCopilotLoading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
            </button>
          </div>

          {copilotAnswer && (
            <div className="bg-emerald-950/10 border border-emerald-900/20 text-emerald-400 p-3 rounded-xl text-xs space-y-1 leading-relaxed animate-fade-in">
              <span className="font-bold text-[10px] uppercase font-mono-tech tracking-wider text-emerald-500 block">COPILOT TIP:</span>
              <p className="font-sans">{copilotAnswer}</p>
            </div>
          )}
        </div>
      </div>

      {/* Step switcher arrows and Slide Verify Button container - FIXED FOOTER */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button
            id="prev-step-btn"
            disabled={currentStepIndex === 0}
            onClick={() => {
              setCurrentStepIndex(prev => prev - 1);
              setShowExample(false);
              setVerificationFeedback(null);
            }}
            className="bg-zinc-900 border border-zinc-800 disabled:opacity-40 py-2.5 px-3 rounded-xl hover:bg-zinc-850 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            id="swipe-verify-btn"
            disabled={isVerifying}
            onClick={handleVerifyStep}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-3 px-6 rounded-2xl text-sm font-bold tracking-wider uppercase transition-all duration-300 shadow-[0_4px_12px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer font-cyber"
          >
            {isVerifying ? <RefreshCw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
            {isVerifying ? "Verifying..." : "Verify Repair"}
          </button>

          <button
            id="next-step-btn"
            disabled={currentStepIndex === totalSteps - 1}
            onClick={() => {
              setCurrentStepIndex(prev => prev + 1);
              setShowExample(false);
              setVerificationFeedback(null);
            }}
            className="bg-zinc-900 border border-zinc-800 disabled:opacity-40 py-2.5 px-3 rounded-xl hover:bg-zinc-850 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
