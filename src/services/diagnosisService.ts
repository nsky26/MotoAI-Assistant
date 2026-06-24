/**
 * MotoAI Diagnosis Service
 * 
 * Single source of truth for offline/preset diagnosis data.
 * All components must use this service instead of inlining diagnosis data.
 */
import type { Diagnosis, Mechanic } from "../types";

/** Battery corrosion preset (non-critical, DIY-safe) */
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

/** Brake failure preset (critical, not DIY-safe) */
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

/**
 * Returns a fallback diagnosis for a given issue type.
 * Used when the API is unreachable or Gemini is unavailable.
 *
 * @param type - "battery" | "brake"
 * @returns A Diagnosis object
 */
export function getFallbackDiagnosis(type: "battery" | "brake"): Diagnosis {
  switch (type) {
    case "brake":
      return { ...BRAKE_PRESET, mechanics: [...(BRAKE_PRESET.mechanics || [])] };
    case "battery":
    default:
      return { ...BATTERY_PRESET };
  }
}

/**
 * Returns the default fallback mechanics list.
 * Used by CriticalAlertView and server when AI returns no mechanics.
 */
export function getFallbackMechanics(): Mechanic[] {
  return [
    { name: "Apex Precision Moto", rating: 4.9, reviews: 214, distance: "0.8 miles away" },
    { name: "Nitro Diagnostics Hub", rating: 4.7, reviews: 128, distance: "2.4 miles away" },
  ];
}

/**
 * Determines which fallback preset to use based on user input text.
 * Used by the API endpoint for keyword-based routing.
 *
 * @param input - The user's issue description
 * @returns "brake" | "battery"
 */
export function resolveFallbackPreset(input: string): "brake" | "battery" {
  const lower = input.toLowerCase();
  if (
    lower.includes("brake") ||
    lower.includes("rotor") ||
    lower.includes("leak")
  ) {
    return "brake";
  }
  return "battery";
}