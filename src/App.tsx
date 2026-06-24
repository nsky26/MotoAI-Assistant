import React, { useState, useEffect } from "react";
import { 
  Gauge, Wrench, Shield, Award, User, RotateCcw, AlertTriangle, Play, CheckCircle2, ChevronRight, Activity, Thermometer, Zap, Cpu 
} from "lucide-react";
import { Diagnosis } from "./types";
import { getFallbackDiagnosis } from "./services/diagnosisService";
import CameraScanView from "./components/CameraScanView";
import DiagnosisResultView from "./components/DiagnosisResultView";
import GuidedRepairView from "./components/GuidedRepairView";
import CriticalAlertView from "./components/CriticalAlertView";
import LoginView from "./components/LoginView";
import ProfileView from "./components/ProfileView";
import { useAuth } from "./context/AuthContext";

type Tab = "scan" | "diagnose" | "repair" | "telemetry" | "profile" | "login";

export default function App() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("scan");
  const [activeDiagnosis, setActiveDiagnosis] = useState<Diagnosis | null>(null);
  const [isRepairComplete, setIsRepairComplete] = useState<boolean>(false);

  // Setup simulated initial readings for MotoAI Telemetry
  const telemetryData = {
    batteryVoltage: "11.6V",
    batteryStatus: "Corrosion Suspected (Low)",
    frontBrakePressure: "95 PSI",
    rotorTemperature: "280°C", // "critical heat point" referenced in recommendation
    canStatus: "ACTIVE",
    lidarStatus: "READY"
  };

  // Callback when scanning completes
  const handleDiagnosticComplete = (diag: Diagnosis) => {
    setActiveDiagnosis(diag);
    setIsRepairComplete(false);
    // Transition to the Results or Critical tab
    setActiveTab("diagnose");
  };

  // Helper trigger to set brake system failure preset (via service layer)
  const handleTriggerCriticalPreset = () => {
    handleDiagnosticComplete(getFallbackDiagnosis("brake"));
  };

  // Reset helper
  const handleResetApp = () => {
    setActiveDiagnosis(null);
    setIsRepairComplete(false);
    setActiveTab("scan");
  };

  return (
    <div className="min-h-screen bg-[#060607] flex flex-col items-center justify-center p-0 md:p-6 transition-colors duration-500 font-sans">
      
      {/* Outer shell containing decorative info block on desktop */}
      <div className="w-full max-w-sm bg-zinc-950 border border-zinc-900/40 rounded-none md:rounded-[40px] shadow-2xl relative flex flex-col justify-between overflow-hidden h-[844px] border-zinc-800">
        
        {/* Top Notch Decorative phone bar */}
        <div className="absolute top-0 left-12 right-12 h-6 bg-zinc-950 rounded-b-3xl z-40 hidden md:flex items-center justify-center border-b border-zinc-900/50">
          <div className="w-20 h-3 bg-zinc-900 rounded-full"></div>
        </div>

        {/* Brand App Bar Header */}
        <header className="flex items-center justify-between px-6 pt-5 pb-3 bg-zinc-950 border-b border-zinc-900/40 z-30 shadow-md">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={handleResetApp}>
            {/* Custom high-fidelity logo representing high tech gear tooth structure */}
            <div className="flex flex-col gap-0.5 font-mono-tech font-extrabold text-[#00e63d] tracking-tighter shrink-0 select-none scale-110">
              <span className="flex items-center leading-none text-xl font-cyber text-emerald-400 font-black italic">
                <span className="text-emerald-500 mr-1 opacity-80 stroke-2 font-mono-tech">⊞</span>
                MotoAI
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Small active indicators */}
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-[#00e63d] px-2 py-0.5 rounded-full font-mono-tech uppercase font-bold tracking-widest hidden sm:inline-block">
              V2.1
            </span>
            <div
              id="profile-icon-btn"
              onClick={() => setActiveTab(user ? "profile" : "login")}
              className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "Profile"}
                  className="w-full h-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-4 h-4 text-zinc-300" />
              )}
            </div>
          </div>
        </header>

        {/* Primary Screen View Switching Container */}
        <main className="flex-1 overflow-hidden relative">
          
          {/* View Tab 1: Scanner HUD */}
          {activeTab === "scan" && (
            <CameraScanView 
              onDiagnosticComplete={handleDiagnosticComplete} 
              onSelectCriticalPreset={handleTriggerCriticalPreset}
            />
          )}

          {/* View Tab 2: AI Diagnosis Complete Outcome */}
          {activeTab === "diagnose" && (
            <>
              {activeDiagnosis ? (
                activeDiagnosis.isCritical ? (
                  <CriticalAlertView 
                    diagnosis={activeDiagnosis} 
                    onBackToScan={handleResetApp} 
                  />
                ) : (
                  <DiagnosisResultView
                    diagnosis={activeDiagnosis}
                    onStartRepair={() => setActiveTab("repair")}
                    onBackToScan={handleResetApp}
                  />
                )
              ) : (
                /* Empty Diagnosis state prompting scan walkthrough */
                <div className="flex flex-col items-center justify-center h-full p-6 text-center select-none bg-[#0b0b0c]">
                  <div className="w-20 h-20 rounded-full bg-zinc-950 border-2 border-dashed border-zinc-800 flex items-center justify-center text-zinc-600 mb-6 relative">
                    <Cpu className="w-8 h-8" />
                    <div className="absolute inset-0 border border-emerald-500/20 rounded-full animate-ping pointer-events-none"></div>
                  </div>
                  <h3 className="text-lg font-bold text-zinc-200 tracking-tight font-cyber">
                    No Diagnostics Loaded
                  </h3>
                  <p className="text-xs text-zinc-500 mt-2 max-w-xs leading-relaxed">
                    Swipe or tap the camera icon below to begin a machine visual scan, or select a quick diagnostics preset trigger from the HUD list.
                  </p>
                  
                  <button
                    id="trigger-quick-preset-scans"
                    onClick={() => setActiveTab("scan")}
                    className="mt-6 bg-emerald-500 text-zinc-950 font-extrabold text-xs tracking-wider px-5 py-3 rounded-xl uppercase transition-all duration-300 shadow-[0_4px_12px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_20px_rgba(16,185,129,0.4)] font-cyber cursor-pointer"
                  >
                    Launch Camera Scanner
                  </button>
                </div>
              )}
            </>
          )}

          {/* View Tab 3: Step-by-Step Assisted Repair Workflow */}
          {activeTab === "repair" && (
            <>
              {isRepairComplete ? (
                /* Celebration Triumph Splash card layout when finished */
                <div className="flex flex-col items-center justify-center h-full p-6 text-center select-none bg-[#0b0b0c] animate-fade-in relative overflow-hidden">
                  
                  {/* Glowing success effects background */}
                  <div className="absolute w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -top-10 -left-10"></div>
                  <div className="absolute w-44 h-44 bg-emerald-500/5 rounded-full blur-2xl bottom-10 right-10"></div>

                  <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center text-zinc-950 mb-6 shadow-[0_0_25px_rgba(16,185,129,0.4)] border-4 border-[#0b0b0c]">
                    <Award className="w-10 h-10 fill-current" />
                  </div>
                  <h3 className="text-2xl font-black text-emerald-400 tracking-tight font-cyber">
                    Repair Completed!
                  </h3>
                  <p className="text-sm font-semibold text-zinc-400 mt-1 uppercase font-mono-tech tracking-wider">
                    VOLTAGE LEVEL RE-VERIFIED
                  </p>
                  <p className="text-xs text-zinc-400 mt-4 leading-relaxed max-w-xs">
                    Awesome job! You successfully cleaned, greased, and re-torqued your terminal connector leads. Terminal corrosion has been resolved and starter voltage recovered.
                  </p>

                  <div className="mt-8 flex flex-col gap-3 w-full px-4">
                    <button
                      id="resolve-triumph-return-scan"
                      onClick={handleResetApp}
                      className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-200 py-3.5 px-6 rounded-2xl text-xs font-bold font-cyber tracking-wider uppercase transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4 mr-1.5 inline" />
                      Take New Scan
                    </button>
                  </div>
                </div>
              ) : activeDiagnosis ? (
                activeDiagnosis.isCritical ? (
                  /* Critical Safety block showing pro list */
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center select-none bg-[#0b0b0c]">
                    <div className="w-16 h-16 rounded-full bg-red-950/40 border border-red-900/30 flex items-center justify-center text-red-400 mb-5 shadow-inner">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-black text-red-200 tracking-wide font-cyber uppercase">
                      DIY Safety Lockout
                    </h3>
                    <p className="text-xs text-zinc-500 mt-2 max-w-xs leading-relaxed">
                      This is a high-risk hydraulic brake defect. Guided DIY repairs are locked out immediately to protect your life. Please review the Certified Professional mechanics list.
                    </p>
                    <button
                      id="overrule-redirect-certified"
                      onClick={() => setActiveTab("diagnose")}
                      className="mt-6 bg-red-950/20 text-red-400 border border-red-900/40 font-bold text-xs tracking-wider px-5 py-3 rounded-xl uppercase font-cyber cursor-pointer"
                    >
                      View Professional Shops
                    </button>
                  </div>
                ) : (
                  <GuidedRepairView
                    steps={activeDiagnosis.steps || []}
                    issueTitle={activeDiagnosis.issue}
                    onCompletedAll={() => setIsRepairComplete(true)}
                    onBackToResult={() => setActiveTab("diagnose")}
                  />
                )
              ) : (
                /* No Repair selected notice */
                <div className="flex flex-col items-center justify-center h-full p-6 text-center select-none bg-[#0b0b0c]">
                  <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-900 flex items-center justify-center text-zinc-600 mb-5">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-200 font-cyber">
                    No Active Repair Loop
                  </h3>
                  <p className="text-xs text-zinc-500 mt-2 max-w-xs leading-relaxed">
                    Once you diagnose a safe DIY issue via scanner, you can access step-by-step AR guided visual steps here.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Profile View */}
          {activeTab === "profile" && (
            <ProfileView
              onBack={() => setActiveTab("scan")}
              onShowLogin={() => setActiveTab("login")}
            />
          )}

          {/* Login View */}
          {activeTab === "login" && (
            <LoginView onBack={() => setActiveTab("profile")} />
          )}

          {/* View Tab 4: Diagnostics Telemetry Log */}
          {activeTab === "telemetry" && (
            <div className="flex flex-col h-full bg-[#0b0b0c] text-white p-5 justify-between">
              
              {/* Telemetry log header */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono-tech leading-none">
                  BIKE TELEMETRY PROTOCOL
                </span>
                <h2 className="text-xl font-bold font-cyber text-zinc-100 tracking-tight uppercase">
                  Connected Sensors Log
                </h2>
                <p className="text-xs text-zinc-500 font-medium">
                  Real-time wireless OBD-II monitoring interface
                </p>
              </div>

              {/* Grid block metric displays */}
              <div className="flex-1 overflow-y-auto my-4 space-y-3.5 pr-0.5">
                
                {/* Gauge item 1: Voltage */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-2xl flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                      <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide leading-none">OBD-II battery voltage</h4>
                      <p className="text-xs text-red-400 mt-1.5 font-bold font-mono-tech">{telemetryData.batteryStatus}</p>
                    </div>
                  </div>
                  <span className="text-lg font-black font-cyber text-rose-400 font-mono-tech">
                    {telemetryData.batteryVoltage}
                  </span>
                </div>

                {/* Gauge item 2: Front rotor heat */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-2xl flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
                      <Thermometer className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide leading-none">Front rotor temperature</h4>
                      <p className="text-xs text-red-400 mt-1.5 font-bold font-medium font-sans">CRITICAL THERMAL LEVEL</p>
                    </div>
                  </div>
                  <span className="text-lg font-black font-cyber text-red-400 font-mono-tech">
                    {telemetryData.rotorTemperature}
                  </span>
                </div>

                {/* Gauge item 3: Hydraulic Pressure */}
                <div className="bg-zinc-950 border border-zinc-900 p-4 rounded-2xl flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl">
                      <Activity className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide leading-none">Brake line pressure</h4>
                      <p className="text-[11px] text-zinc-500 mt-1.5 font-medium">Acceptable limits (80 - 110 PSI)</p>
                    </div>
                  </div>
                  <span className="text-lg font-black font-cyber text-zinc-300 font-mono-tech">
                    {telemetryData.frontBrakePressure}
                  </span>
                </div>

                {/* Status signals list layout */}
                <div className="grid grid-cols-2 gap-3.5 pt-2">
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono-tech">CAN-BUS Bus Link</span>
                    <span className="text-xs text-[#00e63d] font-cyber font-black mt-1.5 tracking-widest flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 glow-green animate-ping inline-block"></span>
                      ONLINE
                    </span>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono-tech">LiDAR Radar Sync</span>
                    <span className="text-xs text-[#00e63d] font-cyber font-black mt-1.5 tracking-widest flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 glow-green inline-block"></span>
                      READY
                    </span>
                  </div>
                </div>
              </div>

              {/* Back to scanner */}
              <button
                id="telemetry-return-scan"
                onClick={() => setActiveTab("scan")}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-3.5 px-6 rounded-2xl text-xs font-black uppercase font-cyber tracking-wider transition-all duration-300 shadow-[0_4px_12px_rgba(16,185,129,0.25)] cursor-pointer"
              >
                ← Back To Camera Scan
              </button>
            </div>
          )}
        </main>

        {/* BOTTOM NAV BAR FOOTER */}
        <footer className="bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900 px-6 py-4 flex items-center justify-between z-30 select-none">
          
          {/* Tab 1: Speedometer camera scanner */}
          <button
            id="tab-btn-scan"
            onClick={() => setActiveTab("scan")}
            className={`flex flex-col items-center gap-1.5 relative transition-all duration-300 cursor-pointer ${
              activeTab === "scan" ? "text-emerald-400 scale-110" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Gauge className="w-6 h-6 stroke-[2]" />
            <span className="text-[10px] font-extrabold tracking-wide uppercase font-cyber hidden xs:inline">
              Scanner
            </span>
            {activeTab === "scan" && (
              <div className="absolute -bottom-1 w-8 h-1 bg-emerald-400 rounded-full glow-green"></div>
            )}
          </button>

          {/* Tab 2: AI Diagnosis Outcome center */}
          <button
            id="tab-btn-diagnose"
            onClick={() => setActiveTab("diagnose")}
            className={`flex flex-col items-center gap-1.5 relative transition-all duration-300 cursor-pointer ${
              activeTab === "diagnose" ? "text-emerald-400 scale-110" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {/* Custom styled brain-CPU hybrid selector */}
            <div className="relative">
              <Cpu className="w-6 h-6 stroke-[2]" />
              {activeDiagnosis && (
                <span className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-zinc-950 ${
                  activeDiagnosis.isCritical ? "bg-red-500 glow-red animate-ping" : "bg-emerald-400 glow-green"
                }`}></span>
              )}
            </div>
            <span className="text-[10px] font-extrabold tracking-wide uppercase font-cyber hidden xs:inline">
              Diagnose
            </span>
            {activeTab === "diagnose" && (
              <div className="absolute -bottom-1 w-8 h-1 bg-emerald-400 rounded-full glow-green"></div>
            )}
          </button>

          {/* Tab 3: Wrench guided repair steps */}
          <button
            id="tab-btn-repair"
            onClick={() => setActiveTab("repair")}
            className={`flex flex-col items-center gap-1.5 relative transition-all duration-300 cursor-pointer ${
              activeTab === "repair" ? "text-emerald-400 scale-110" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Wrench className="w-6 h-6 stroke-[2]" />
            <span className="text-[10px] font-extrabold tracking-wide uppercase font-cyber hidden xs:inline">
              Repair
            </span>
            {activeTab === "repair" && (
              <div className="absolute -bottom-1 w-8 h-1 bg-emerald-400 rounded-full glow-green"></div>
            )}
          </button>

          {/* Tab 4: Telemetry list sensor values */}
          <button
            id="tab-btn-telemetry"
            onClick={() => setActiveTab("telemetry")}
            className={`flex flex-col items-center gap-1.5 relative transition-all duration-300 cursor-pointer ${
              activeTab === "telemetry" ? "text-emerald-400 scale-110" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Activity className="w-6 h-6 stroke-[2]" />
            <span className="text-[10px] font-extrabold tracking-wide uppercase font-cyber hidden xs:inline">
              Telemetry
            </span>
            {activeTab === "telemetry" && (
              <div className="absolute -bottom-1 w-8 h-1 bg-emerald-400 rounded-full glow-green"></div>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
