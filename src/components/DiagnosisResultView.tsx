import React from "react";
import { AlertTriangle, Clock, Wrench, ShieldAlert, DollarSign, Play } from "lucide-react";
import { Diagnosis } from "../types";

interface DiagnosisResultViewProps {
  diagnosis: Diagnosis;
  onStartRepair: () => void;
  onBackToScan: () => void;
}

export default function DiagnosisResultView({ diagnosis, onStartRepair, onBackToScan }: DiagnosisResultViewProps) {
  // Safe extraction of values
  const {
    issue = "Unknown Issue",
    confidence = 90,
    description = "",
    difficulty = 1,
    estimatedTime = "10 mins",
    diyCost = 0,
    proEstimate = 50,
    aiRecommendation = ""
  } = diagnosis;

  // Render wrenches for difficulty rating
  const renderWrenches = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((idx) => (
          <Wrench
            key={idx}
            className={`w-4.5 h-4.5 ${
              idx <= rating
                ? "text-emerald-500 fill-current"
                : "text-zinc-700"
            }`}
          />
        ))}
      </div>
    );
  };

  // Convert number rating to label
  const getDifficultyLabel = (rating: number) => {
    if (rating <= 1) return "Beginner";
    if (rating <= 3) return "Intermediate";
    return "Expert / Advanced";
  };

  // Percentage circle SVG setup
  const radius = 50;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (confidence / 100) * circumference;

  return (
    <div className="flex flex-col h-full bg-[#0b0b0c] text-white p-4 justify-between select-none">
      
      {/* 98% Circular Confidence Dial container */}
      <div className="flex flex-col items-center pt-4 pb-2 z-10">
        <div className="relative w-36 h-36 flex items-center justify-center">
          
          {/* Pulsing glow background */}
          <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl animate-pulse"></div>
          
          <svg className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle
              className="text-zinc-900"
              strokeWidth={strokeWidth}
              stroke="currentColor"
              fill="transparent"
              r={normalizedRadius}
              cx={radius + strokeWidth * 3}
              cy={radius + strokeWidth * 3}
              style={{ cx: '72px', cy: '72px' }}
            />
            {/* Pulsing neon-green progress ring */}
            <circle
              className="text-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_12px_#10b981]"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference + " " + circumference}
              style={{ strokeDashoffset, cx: '72px', cy: '72px' }}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={normalizedRadius}
            />
          </svg>
          
          {/* Confidence value overlay */}
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-4xl font-bold font-cyber tracking-tighter text-emerald-400">
              {confidence}
            </span>
            <span className="text-[11px] font-mono-tech text-emerald-500/80 font-bold uppercase tracking-wider mt-px">
              %
            </span>
          </div>
        </div>

        {/* Diagnosis complete text */}
        <h2 className="text-2xl font-extrabold tracking-tight mt-4 text-center text-zinc-100 font-cyber">
          AI Diagnosis Complete
        </h2>
        <p className="text-sm font-medium text-zinc-500 text-center mt-1">
          High-confidence resolution detected.
        </p>
      </div>

      {/* Main Diagnosis breakdown card */}
      <div className="flex-1 overflow-y-auto my-4 max-h-[380px] p-[1.5px] bg-gradient-to-b from-zinc-800/40 via-zinc-900/10 to-zinc-950 rounded-2xl border border-zinc-800/80">
        <div className="bg-zinc-950/80 rounded-2xl p-4 flex flex-col h-full gap-4">
          
          {/* Problem header block with Warning triangle icon */}
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-red-950/40 border border-red-900/40 text-red-400 mt-0.5">
              <AlertTriangle className="w-5.5 h-5.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100 font-sans tracking-tight">
                {issue}
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          <div className="h-px bg-zinc-900"></div>

          {/* Metrics section: Difficulty rating versus Labor time */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Difficulty panel */}
            <div className="flex flex-col gap-1">
              <span className="text-[11px] text-zinc-500 uppercase font-mono-tech tracking-widest leading-none">
                Difficulty
              </span>
              <div className="mt-1">
                {renderWrenches(difficulty)}
              </div>
              <span className="text-xs font-semibold text-zinc-300 mt-1 font-sans">
                {getDifficultyLabel(difficulty)}
              </span>
            </div>

            {/* Estimated time panel */}
            <div className="flex flex-col gap-1 items-stretch">
              <span className="text-[11px] text-zinc-500 uppercase font-mono-tech tracking-widest leading-none">
                Estimated Time
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <Clock className="w-4 h-4 text-emerald-400 self-center" />
                <span className="text-xl font-bold font-cyber text-emerald-400 tracking-tight ml-1">
                  {estimatedTime}
                </span>
              </div>
            </div>
          </div>

          {/* AI Recommendation panel info line */}
          {aiRecommendation && (
            <div className="bg-emerald-950/10 border border-emerald-900/20 rounded-xl p-3 flex gap-2.5 items-start mt-1">
              <ShieldAlert className="w-4.5 h-4.5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono-tech">
                  Special safety note
                </span>
                <p className="text-[11px] text-emerald-500/90 leading-relaxed mt-0.5 font-sans">
                  {aiRecommendation}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Estimations pricing dual grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        
        {/* DIY COST */}
        <div className="bg-zinc-950/70 border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between shadow-md">
          <span className="text-[10px] text-zinc-500 uppercase font-mono-tech tracking-wider">
            DIY Cost
          </span>
          <div className="flex items-baseline gap-0.5 text-emerald-400 font-cyber my-1.5">
            <span className="text-3xl font-extrabold">${diyCost}</span>
          </div>
          <span className="text-[11px] text-zinc-400 font-sans truncate leading-none">
            Using standard tools
          </span>
        </div>

        {/* PRO ESTIMATE */}
        <div className="bg-zinc-950/70 border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between shadow-md">
          <span className="text-[10px] text-zinc-500 uppercase font-mono-tech tracking-wider">
            Pro Estimate
          </span>
          <div className="flex items-baseline gap-0.5 text-zinc-200 font-cyber my-1.5">
            <span className="text-3xl font-extrabold">${proEstimate}+</span>
          </div>
          <span className="text-[11px] text-zinc-400 font-sans truncate leading-none">
            Reputable shop quote
          </span>
        </div>
      </div>

      {/* Pulsing Proceed Guided Repair Button */}
      <div className="flex flex-col gap-2">
        <button
          id="confirm-guided-repair-btn"
          onClick={onStartRepair}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-4 px-6 rounded-2xl text-base font-bold tracking-wide uppercase transition-all duration-300 shadow-[0_4px_20px_rgba(16,185,129,0.35)] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer font-cyber"
        >
          <Play className="w-5 h-5 fill-current" />
          Start Guided Repair
        </button>

        <button
          id="re-scan-diagnose-btn"
          onClick={onBackToScan}
          className="w-full text-zinc-500 py-2 hover:text-zinc-300 text-xs font-semibold uppercase tracking-widest font-mono-tech text-center cursor-pointer"
        >
          ← RETAKE SCAN
        </button>
      </div>
    </div>
  );
}
