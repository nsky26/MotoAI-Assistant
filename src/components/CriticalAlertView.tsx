import React, { useState, useEffect } from "react";
import { AlertCircle, ArrowLeft, Check, CheckCircle, Navigation, Phone, MapPin, Star, ShieldAlert, X, AlertOctagon, RefreshCw } from "lucide-react";
import { Diagnosis, Mechanic } from "../types";
import { getFallbackMechanics } from "../services/diagnosisService";
import { requestGeolocation, fetchNearbyMechanics, buildNavigationUrl, buildPhoneUrl } from "../services/mechanicsService";

interface CriticalAlertViewProps {
  diagnosis: Diagnosis;
  onBackToScan: () => void;
}

export default function CriticalAlertView({ diagnosis, onBackToScan }: CriticalAlertViewProps) {
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<string | null>(null);
  const [shops, setShops] = useState<Mechanic[]>(diagnosis.mechanics || getFallbackMechanics());
  const [isLoadingMechanics, setIsLoadingMechanics] = useState<boolean>(false);
  const [mechanicsError, setMechanicsError] = useState<string | null>(null);

  // Automatically fetch nearby mechanics when this view is shown for critical issues
  useEffect(() => {
    const fetchMechanics = async () => {
      // If the diagnosis already has mechanics from the AI, use those
      if (diagnosis.mechanics && diagnosis.mechanics.length > 0) {
        setShops(diagnosis.mechanics);
        return;
      }

      setIsLoadingMechanics(true);
      setMechanicsError(null);

      try {
        const position = await requestGeolocation();
        const nearby = await fetchNearbyMechanics(
          position.latitude,
          position.longitude,
          diagnosis.issue,
          diagnosis.severityLevel as any,
        );
        if (nearby.length > 0) {
          setShops(nearby);
        }
      } catch (err: any) {
        if (err.message === "PERMISSION_DENIED") {
          setMechanicsError("Location access denied. Showing default mechanic recommendations.");
        } else {
          setMechanicsError("Could not find nearby mechanics. Showing default recommendations.");
        }
        setShops(getFallbackMechanics());
      } finally {
        setIsLoadingMechanics(false);
      }
    };

    fetchMechanics();
  }, []);

  const handleNavigate = (shop: Mechanic) => {
    setActiveNav(shop.name);
    // Open Google Maps in a new tab
    const url = buildNavigationUrl(shop.placeId, shop.name);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCall = (shop: Mechanic) => {
    if (shop.phone) {
      // Open phone dialer
      const telUrl = buildPhoneUrl(shop.phone);
      if (telUrl) {
        window.location.href = telUrl;
        return;
      }
    }
    // Fallback: show modal with phone number
    setActiveCall(shop.name);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0b0c] text-white p-4 justify-between select-none">
      
      {/* Top indicator bar */}
      <div className="flex items-center gap-1 mb-2 z-15">
        <button
          id="back-btn-critical"
          onClick={onBackToScan}
          className="text-zinc-500 hover:text-white transition-all text-xs font-mono-tech flex items-center gap-1 cursor-pointer"
        >
          ← SCANNER
        </button>
      </div>

      {/* Main Container Scrolling Area */}
      <div className="flex-1 overflow-y-auto pr-0.5 space-y-4">
        
        {/* CRITICAL BRAKE SYSTEM FAILURE BOX (Severe Crimson glow layout) */}
        <div className="relative border border-red-950/60 bg-[#160c0e]/85 rounded-2xl p-5 shadow-[0_0_25px_rgba(239,68,68,0.08)] glow-red overflow-hidden flex flex-col items-center">
          
          {/* Alarms background watermark hazard badge */}
          <div className="absolute right-2 top-2 text-red-500/10 rotate-12 pointer-events-none">
            <AlertOctagon className="w-28 h-28" />
          </div>

          <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-zinc-950 mb-4 shadow-[0_0_15px_rgba(239,68,68,0.4)] border-4 border-[#160c0e]">
            <AlertCircle className="w-6 h-6 stroke-[3]" />
          </div>
          
          {/* Main Title Headers */}
          <h2 className="text-xl font-black text-center text-red-200 tracking-wider font-cyber uppercase leading-snug">
            CRITICAL: BRAKE <br />
            SYSTEM FAILURE
          </h2>

          {/* Severity Badges */}
          <div className="mt-3.5 bg-red-950/60 border border-red-920 rounded-full py-1.5 px-4 text-center">
            <span className="text-[10px] font-black text-red-400 tracking-widest uppercase font-mono-tech">
              SEVERITY LEVEL: 5/5 (DANGEROUS)
            </span>
          </div>

          <p className="text-xs text-red-200/90 leading-relaxed text-center mt-4 max-w-xs font-medium">
            Unsafe to continue DIY repair. Professional assistance required immediately to prevent hydraulic lock or total pressure loss.
          </p>
        </div>

        {/* EST REPAIR COST BOARD CARD */}
        <div className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-4 flex flex-col justify-between shadow-lg relative">
          <div className="flex items-center gap-2 text-zinc-500">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono-tech">
              EST. REPAIR COST
            </span>
          </div>
          <p className="text-2xl font-black font-cyber text-zinc-100 tracking-tight mt-1.5 pl-0.5">
            {diagnosis.estimatedCost || "$350 — $500"}
          </p>
          <span className="text-[11px] text-zinc-400 font-sans mt-1">
            {diagnosis.costDetails || "Includes hydraulic fluid flush & caliber replacement."}
          </span>
        </div>

        {/* SEVERITY TEMPERATURE GRAPH LINE */}
        <div className="bg-zinc-950/80 border border-zinc-900 rounded-2xl p-4 flex flex-col shadow-lg gap-2">
          <div className="flex items-center justify-between text-[10px] font-bold tracking-widest font-mono-tech uppercase">
            <div className="flex items-center gap-1.5 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              SEVERITY LEVEL
            </div>
            <span className="text-zinc-400 font-black">HIGH CODE: {diagnosis.severityCode || "B001"}</span>
          </div>

          {/* Temperature slider bar indicator representing severe metrics */}
          <div className="w-full h-2.5 bg-zinc-900 rounded-full mt-1.5 overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full w-[90%] bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
          </div>
        </div>

        {/* NEARBY CERTIFIED MECHANICS DIRECTORY BOARD */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-400 tracking-wide font-cyber uppercase">
              Nearby Certified Mechanics
            </span>
            <span className="text-[9px] font-mono-tech text-emerald-400 flex items-center gap-1 font-bold">
              <Check className="w-3 h-3 stroke-[3]" /> VERIFIED BY MOTOAI
            </span>
          </div>

          {/* Mechanics Grid stack list */}
          <div className="space-y-3">
            {shops.map((shop, key) => (
              <div 
                key={key} 
                className="bg-zinc-950 border border-zinc-900/90 rounded-2xl p-4 flex flex-col justify-between hover:border-zinc-800 transition-all shadow-md relative"
              >
                {/* Shop logo avatar circle layout */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 font-mono-tech font-bold text-sm select-none border border-zinc-800">
                    {shop.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-zinc-200 tracking-tight">{shop.name}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-1">
                      <div className="flex items-center text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="text-zinc-200 font-bold ml-1 text-xs">{shop.rating}</span>
                      </div>
                      <span className="text-zinc-600">|</span>
                      <span>({shop.reviews} reviews)</span>
                      <span className="text-zinc-600">|</span>
                      <span className="font-semibold text-zinc-300">{shop.distance}</span>
                    </div>
                  </div>
                </div>

                {/* Mechanic action triggers */}
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    id={`navigate-shop-${key}`}
                    onClick={() => setActiveNav(shop.name)}
                    className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 hover:text-white text-zinc-300 text-xs py-3 rounded-xl font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer font-cyber"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    Navigate
                  </button>
                  <button
                    id={`dial-shop-${key}`}
                    onClick={() => setActiveCall(shop.name)}
                    className="bg-rose-100 hover:bg-rose-200 text-zinc-950 text-xs py-3 rounded-xl font-bold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer font-cyber"
                  >
                    <Phone className="w-3.5 h-3.5 fill-current" />
                    Call Mechanic
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* GREEN AI RECOMMENDATION ASSIGNED BOX HEADER */}
        <div className="border-l-4 border-emerald-500 bg-gradient-to-r from-emerald-950/15 to-zinc-950/10 p-4 rounded-r-2xl gap-2 flex flex-col border border-zinc-900">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono-tech">
              AI RECOMMENDATION
            </span>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed font-sans font-medium pl-0.5">
            {diagnosis.aiRecommendation || "Based on your telemetry, the front rotor has reached a critical heat point. Avoid braking hard until a professional inspects the calipers."}
          </p>
        </div>
      </div>

      {/* CALLING MODAL PHONE OVERLAY SIMULATION */}
      {activeCall && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl relative animate-scale-up">
            <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto text-zinc-950 animate-bounce">
              <Phone className="w-6 h-6 fill-current" />
            </div>
            <h3 className="text-lg font-extrabold text-zinc-100 mt-4 tracking-tight">{activeCall}</h3>
            <p className="text-xs text-zinc-500 mt-1 uppercase font-mono-tech tracking-wider">CONNECTING SECURE CALL...</p>
            <p className="text-[11px] text-zinc-400 mt-4 leading-relaxed bg-[#111112] max-w-xs p-3.5 rounded-xl border border-zinc-900 mx-auto font-sans italic">
              "Connecting with dispatch... Press 'Simulate Call Connect' or close standard panel dial."
            </p>
            <button
              id="confirm-simulate-call-close-btn"
              onClick={() => setActiveCall(null)}
              className="mt-6 w-full bg-red-500 text-white font-bold py-3 rounded-2xl hover:bg-red-600 transition-all text-xs font-cyber flex items-center justify-center gap-2 cursor-pointer"
            >
              <X className="w-4 h-4" />
              Hang Up
            </button>
          </div>
        </div>
      )}

      {/* NAVIGATION GPS ROUTING ROUTE MODAL SIMULATION */}
      {activeNav && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-3xl p-6 text-center max-w-sm w-full shadow-2xl relative animate-scale-up">
            <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mx-auto text-zinc-950 mb-3 animate-pulse">
              <Navigation className="w-6 h-6 fill-current" />
            </div>
            <h3 className="text-lg font-extrabold text-zinc-100 mt-2 tracking-tight">GPS Routing Initialized</h3>
            <p className="text-xs text-[#00e63d] tracking-widest font-mono-tech mt-1 uppercase">ROUTING TO {activeNav.toUpperCase()}</p>
            
            {/* Minimal SVG map schematic */}
            <div className="h-32 bg-zinc-900/60 border border-zinc-850 rounded-xl my-4 text-zinc-500 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] bg-[size:16px_16px] opacity-60"></div>
              {/* Pulsing dots and green paths */}
              <svg className="absolute inset-0 w-full h-full text-emerald-500/40" xmlns="http://www.w3.org/2005/svg">
                <path d="M 50 100 Q 150 20 250 80 T 350 40" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeDasharray="6 4" className="animate-pulse" />
                <circle cx="50" cy="100" r="6" fill="#ef4444" />
                <circle cx="350" cy="40" r="6" fill="#10b981" />
              </svg>
              <span className="text-[10px] bg-zinc-950/80 px-2.5 py-1 text-zinc-300 font-cyber font-bold select-none absolute bottom-2 rounded-md">
                CALCULATING MOST DIRECT PATH
              </span>
            </div>

            <button
              id="confirm-nav-gps-close-btn"
              onClick={() => setActiveNav(null)}
              className="w-full bg-emerald-500 text-zinc-950 font-bold py-3 rounded-2xl hover:bg-emerald-400 transition-all text-xs font-cyber flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle className="w-4.5 h-4.5" />
              Accept Route Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
