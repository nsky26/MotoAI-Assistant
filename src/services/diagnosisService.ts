/**
 * MotoAI Diagnosis Service
 * 
 * Single source of truth for offline/preset diagnosis data.
 * All components must use this service instead of inlining diagnosis data.
 */
import type { Diagnosis, Mechanic } from "../types";

/** Battery corrosion preset */
const BATTERY_PRESET: Diagnosis = {
  id: "battery-corrosion",
  isCritical: false,
  issue: "Low Battery Voltage / Terminal Corrosion",
  confidence: 98,
  description: "Identified via voltage drop analysis and acoustic signature.",
  difficulty: 3,
  estimatedTime: "15 mins",
  diyCost: 0,
  proEstimate: 80,
  severityCode: "B001",
  severityLevel: "HIGH",
  aiRecommendation:
    "Based on your telemetry, the starter battery exhibits a minor plate sulfation resistance trigger. Clean terminals thoroughly before completing the charging loop.",
  steps: [
    "Prepare workspace, turn off ignition, put on safety glasses and insulated gloves.",
    "Locate the negative terminal (black) and loosen the bolt using an 8mm wrench.",
    "Disconnect the negative terminal entirely to prevent short-circuiting during further work.",
    "Locate the positive terminal (red) and loosen the bolt using an 8mm wrench, then disconnect.",
    "Clean terminal clamps with a wire brush and apply battery dielectric grease before reassembly.",
  ],
};

/** Brake failure preset */
const BRAKE_PRESET: Diagnosis = {
  id: "brake-failure",
  isCritical: true,
  issue: "CRITICAL: BRAKE SYSTEM FAILURE",
  confidence: 95,
  severityLevel: "HIGH",
  severityCode: "B001",
  description:
    "Unsafe to continue DIY repair. Professional assistance required immediately to prevent hydraulic lock or total pressure loss.",
  estimatedCost: "$350 — $500",
  costDetails: "Includes hydraulic fluid flush & caliber replacement.",
  aiRecommendation:
    "Based on your telemetry, the front rotor has reached a critical heat point. Avoid braking hard until a professional inspects the calipers.",
  mechanics: [
    {
      name: "Apex Precision Moto",
      rating: 4.9,
      reviews: 214,
      distance: "0.8 miles away",
    },
    {
      name: "Nitro Diagnostics Hub",
      rating: 4.7,
      reviews: 128,
      distance: "2.4 miles away",
    },
  ],
};

/** Spark plug preset */
const SPARK_PRESET: Diagnosis = {
  id: "spark-plug-fouled",
  isCritical: false,
  issue: "Fouled or Carbonized Spark Plug",
  confidence: 94,
  description: "Misfiring and ignition issues detected in cylinder head.",
  difficulty: 2,
  estimatedTime: "20 mins",
  diyCost: 12,
  proEstimate: 60,
  severityCode: "B002",
  severityLevel: "MEDIUM",
  aiRecommendation: "Replace fouled spark plug with identical heat range. Check gap thickness before installing.",
  steps: [
    "Locate the spark plug boot on the cylinder head.",
    "Carefully pull off the boot connector.",
    "Unscrew the plug counterclockwise using a spark plug socket.",
    "Thread in the new plug by hand to prevent cross-threading, then tighten to torque specifications.",
    "Reattach the boot connector securely.",
  ],
};

/** Drive chain preset */
const CHAIN_PRESET: Diagnosis = {
  id: "chain-loose",
  isCritical: false,
  issue: "Loose or Rusted Drive Chain",
  confidence: 92,
  description: "Slack exceeds recommended tension tolerance margins.",
  difficulty: 2,
  estimatedTime: "30 mins",
  diyCost: 15,
  proEstimate: 70,
  severityCode: "B003",
  severityLevel: "MEDIUM",
  aiRecommendation: "Adjust chain tension adjuster bolts equally on both sides. Apply high-quality dry chain lube.",
  steps: [
    "Loosen the main rear axle nut.",
    "Adjust tensioner bolts equally on left and right sides to restore 25-30mm slack.",
    "Verify wheel alignment markings are aligned.",
    "Torque rear axle nut to manufacturer specification.",
    "Lubricate chain links thoroughly.",
  ],
};

/** Tire puncture preset */
const TIRE_PRESET: Diagnosis = {
  id: "tire-puncture",
  isCritical: false,
  issue: "Rear Tire Puncture / Pressure Loss",
  confidence: 96,
  description: "Identified flat/puncture via visual thread check or pressure telemetry drop.",
  difficulty: 2,
  estimatedTime: "25 mins",
  diyCost: 10,
  proEstimate: 50,
  severityCode: "B004",
  severityLevel: "HIGH",
  aiRecommendation: "Ensure tire plug is sealed properly. Inflate to 32 PSI and run bubble check with soapy water.",
  steps: [
    "Park motorcycle on center stand on level ground.",
    "Inspect tread surface to locate nail, glass, or puncture site.",
    "Extract debris using pliers and prep hole using a tire reamer.",
    "Insert plug cord coated in vulcanizing cement using the plug installation tool.",
    "Cut tail excess flush with tread and inflate tire back to recommended PSI.",
  ],
};

export function getFallbackDiagnosis(type: "battery" | "brake" | "spark_plug" | "chain" | "tire_puncture"): Diagnosis {
  switch (type) {
    case "brake":
      return { ...BRAKE_PRESET, mechanics: [...(BRAKE_PRESET.mechanics || [])] };
    case "spark_plug":
      return { ...SPARK_PRESET };
    case "chain":
      return { ...CHAIN_PRESET };
    case "tire_puncture":
      return { ...TIRE_PRESET };
    case "battery":
    default:
      return { ...BATTERY_PRESET };
  }
}

export function getFallbackMechanics(): Mechanic[] {
  return [
    {
      name: "Apex Precision Moto",
      rating: 4.9,
      reviews: 214,
      distance: "0.8 miles away",
      latitude: 37.7749,
      longitude: -122.4194,
      distanceMeters: 1287,
      distanceText: "0.8 miles away",
      source: "fallback"
    },
    {
      name: "Nitro Diagnostics Hub",
      rating: 4.7,
      reviews: 128,
      distance: "2.4 miles away",
      latitude: 37.7749,
      longitude: -122.4194,
      distanceMeters: 3862,
      distanceText: "2.4 miles away",
      source: "fallback"
    },
  ];
}

export function resolveFallbackPreset(input: string): "brake" | "battery" | "spark_plug" | "chain" | "tire_puncture" {
  const lower = input.toLowerCase();
  if (
    lower.includes("brake") ||
    lower.includes("rotor") ||
    lower.includes("leak") ||
    lower.includes("caliper")
  ) {
    return "brake";
  }
  if (
    lower.includes("tire") ||
    lower.includes("puncture") ||
    lower.includes("flat")
  ) {
    return "tire_puncture";
  }
  if (
    lower.includes("spark") ||
    lower.includes("starting") ||
    lower.includes("engine") ||
    lower.includes("plug")
  ) {
    return "spark_plug";
  }
  if (
    lower.includes("chain") ||
    lower.includes("noise") ||
    lower.includes("grinding") ||
    lower.includes("loose")
  ) {
    return "chain";
  }
  return "battery";
}