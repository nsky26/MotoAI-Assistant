import React, { useState } from "react";
import { 
  ArrowLeft, Check, CheckCircle2, ChevronRight, ChevronLeft, Eye, EyeOff, Flashlight, HelpCircle, RefreshCw, Send, Sparkles 
} from "lucide-react";

interface GuidedRepairViewProps {
  steps: string[];
  issueTitle: string;
  onCompletedAll: () => void;
  onBackToResult: () => void;
}

export default function GuidedRepairView({ steps = [], issueTitle, onCompletedAll, onBackToResult }: GuidedRepairViewProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(1); // Default to Step 2 of 5 (index 1) to match UI screenshot
  const [showExample, setShowExample] = useState<boolean>(false);
  const [flashlightOn, setFlashlightOn] = useState<boolean>(false);
  const [copilotQuestion, setCopilotQuestion] = useState<string>("");
  const [copilotAnswer, setCopilotAnswer] = useState<string>("");
  const [isCopilotLoading, setIsCopilotLoading] = useState<boolean>(false);
  const [verifiedSteps, setVerifiedSteps] = useState<boolean[]>(new Array(steps.length).fill(false));

  const totalSteps = steps.length || 5;
  const currentStepNum = currentStepIndex + 1;
  const progressPercent = (currentStepNum / totalSteps) * 100;

  // Simulate or execute step verification
  const handleVerifyStep = () => {
    const updated = [...verifiedSteps];
    updated[currentStepIndex] = true;
    setVerifiedSteps(updated);

    // Auto-advance or trigger complete
    if (currentStepIndex < totalSteps - 1) {
      setTimeout(() => {
        setCurrentStepIndex(prev => prev + 1);
        setShowExample(false);
      }, 800);
    } else {
      setTimeout(() => {
        onCompletedAll();
      }, 1000);
    }
  };

  // Submit Question to AI Copilot
  const handleAskCopilot = async () => {
    if (!copilotQuestion.trim()) return;
    setIsCopilotLoading(true);
    setCopilotAnswer("");
    try {
      const response = await fetch("/api/ask-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          question: copilotQuestion,
          context: {
            issue: issueTitle,
            currentStep: steps[currentStepIndex],
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
    <div className="flex flex-col h-full bg-[#0b0b0c] text-white">
      
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-900/40">
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
          className={`p-2 rounded-xl transition-all cursor-pointer ${
            flashlightOn ? "bg-amber-500 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)]" : "bg-zinc-900 text-zinc-400 hover:text-white"
          }`}
        >
          <Flashlight className="w-5 h-5" />
        </button>
      </div>

      {/* Simulated Live View AR Target overlay (Step 2 of 5 terminal) */}
      <div className="relative h-44 border-b border-zinc-900/60 overflow-hidden flex items-center justify-center bg-zinc-950">
        
        {/* Dynamic camera feed placeholder background with glowing concentric circles */}
        <div className="absolute inset-0 bg-[#0d0e12] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#13141a_1px,transparent_1px),linear-gradient(to_bottom,#13141a_1px,transparent_1px)] bg-[size:20px_20px] opacity-35"></div>
          
          {/* Circular HUD lock */}
          <div className="relative w-36 h-36 border border-emerald-500/10 rounded-full flex items-center justify-center">
            <div className="absolute w-28 h-28 border border-emerald-500/20 rounded-full spin-slow"></div>
            <div className="absolute w-20 h-20 border-2 border-dashed border-emerald-400/40 rounded-full spin-slow-reverse"></div>
            <div className="absolute w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 glow-green"></div>
            </div>
          </div>
        </div>

        {/* Framing brackets */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-emerald-500/40 rounded-tl"></div>
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-emerald-500/40 rounded-tr"></div>
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-emerald-500/40 rounded-bl"></div>
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-emerald-500/40 rounded-br"></div>

        {/* High-tech scan notification label */}
        <div className="absolute top-4 left-4 bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono-tech">
          BATTERY DETECTED
        </div>

        {/* Flashlight simulated glare overlay */}
        {flashlightOn && (
          <div className="absolute inset-0 bg-white/5 pointer-events-none mix-blend-color-dodge transition-all duration-300">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-radial-gradient from-amber-200/20 to-transparent rounded-full blur-2xl"></div>
          </div>
        )}

        {/* "Show Example" schematic illustration card overlay */}
        {showExample && (
          <div className="absolute inset-0 bg-[#0e0e11]/95 z-20 p-4 flex flex-col justify-center animate-fade-in text-center">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono-tech flex items-center justify-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 fill-current" />
              Terminal Guidance Overlay
            </h4>
            <div className="mx-auto max-w-xs border border-zinc-800 rounded-xl bg-zinc-950 p-3 text-left">
              <p className="text-[11px] text-zinc-400 leading-relaxed font-mono-tech">
                1. Match <span className="text-zinc-200 font-bold">8mm hex-socket</span> wrench.<br />
                2. Fit squarely over the <span className="text-zinc-200 font-bold">negative (-) bolt</span>.<br />
                3. Rotate counter-clockwise (lefty-loosey).<br />
                4. Pull lead clear of post.
              </p>
              <div className="flex gap-2 justify-center mt-3 border-t border-zinc-900 pt-2 items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700"></span>
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">SCHEMATIC LOADED</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Progress metrics and Step tracker */}
      <div className="p-4 z-10">
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

      {/* Main Repair Action Card */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
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
                {steps[currentStepIndex] || "Loosen the terminal screws to proceed."}
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

        {/* AI COPILOT VOICE COMPANION ASSIST */}
        <div className="mt-4 bg-zinc-950/50 border border-zinc-900/60 rounded-2xl p-4 flex flex-col gap-3">
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

      {/* Step switcher arrows and Slide Verify Button container */}
      <div className="p-4 border-t border-zinc-900 bg-zinc-950 mt-auto">
        <div className="flex items-center gap-3 mb-3">
          <button
            id="prev-step-btn"
            disabled={currentStepIndex === 0}
            onClick={() => {
              setCurrentStepIndex(prev => prev - 1);
              setShowExample(false);
            }}
            className="bg-zinc-900 border border-zinc-800 disabled:opacity-40 py-2.5 px-3 rounded-xl hover:bg-zinc-850 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            id="swipe-verify-btn"
            onClick={handleVerifyStep}
            className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-3 px-6 rounded-2xl text-sm font-bold tracking-wider uppercase transition-all duration-300 shadow-[0_4px_12px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer font-cyber"
          >
            <CheckCircle2 className="w-5 h-5" />
            Verify Repair
          </button>

          <button
            id="next-step-btn"
            disabled={currentStepIndex === totalSteps - 1}
            onClick={() => {
              setCurrentStepIndex(prev => prev + 1);
              setShowExample(false);
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
