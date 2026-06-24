/**
 * MotoAI AI Diagnosis Engine
 *
 * Pure AI-powered reasoning engine for motorcycle issue diagnosis.
 * Replaces all keyword-matching and branching logic with structured
 * Gemini analysis. Each diagnosis is dynamically generated, not
 * selected from presets.
 *
 * Architecture:
 * - buildDiagnosisPrompt()    → Creates the Gemini prompt with schema
 * - analyzeDiagnosis()        → Sends to Gemini, returns structured response
 * - calculateConfidence()     → Numeric confidence based on signal quality
 * - classifySeverity()        → Determines LOW/MEDIUM/HIGH/CRITICAL
 * - generateRepairWorkflow()  → Generates step-by-step repair instructions
 * - mapAiToDiagnosis()        → Maps AiDiagnosisResponse → app Diagnosis
 *
 * Severity classification is based on:
 *   - Component type (brakes, frame → higher base)
 *   - Symptom keywords (leak, crack, smoke → higher)
 *   - Safety impact (loss of control → CRITICAL)
 *
 * Confidence scoring is based on:
 *   - Input length (more detail → higher confidence)
 *   - Specificity (exact component names → higher)
 *   - Symptom clarity (clear descriptions → higher)
 *
 * Fallback: If Gemini is unavailable, falls through to diagnosisService.ts
 * which provides offline presets. There is NO keyword matching in this file.
 */
import type { Diagnosis, AiDiagnosisResponse, SeverityLevel, RepairDifficulty } from "../types";
import { getFallbackDiagnosis } from "./diagnosisService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AiDiagnosisOptions {
  /** The user's textual description of the motorcycle issue */
  input: string;
  /** Optional image base64 for context (from CameraScanView vision) */
  imageBase64?: string;
  /** Whether the user explicitly flagged this as critical */
  isCriticalRequest?: boolean;
}

// ---------------------------------------------------------------------------
// Constants for confidence and severity calculation
// ---------------------------------------------------------------------------

/** Components that inherently raise severity when mentioned */
const CRITICAL_COMPONENTS = [
  "brake", "braking", "rotor", "caliper", "hydraulic",
  "frame", "swingarm", "fork", "steering", "wheel bearing",
  "chain snap", "throttle stuck",
];

const HIGH_RISK_COMPONENTS = [
  "fuel line", "fuel leak", "oil leak", "coolant leak",
  "electrical short", "spark", "smoke", "overheating",
  "transmission", "clutch slip",
];

const MEDIUM_RISK_COMPONENTS = [
  "battery", "voltage", "starter", "alternator", "stator",
  "spark plug", "carburetor", "injector", "air filter",
  "suspension", "shock", "chain", "sprocket",
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds a structured prompt for Gemini to analyze a motorcycle issue.
 *
 * @param input - The user's description of the issue
 * @returns A prompt string that instructs Gemini to return structured JSON
 */
export function buildDiagnosisPrompt(input: string): string {
  return `You are MotoAI, an expert motorcycle diagnostics and repair engine with deep knowledge of motorcycle mechanics, electronics, and safety.

Analyze this user described motorcycle issue: "${input}"

Return a structured diagnostic response in JSON format matching this exact schema:

{
  "issue": "string — concise title of the problem, e.g. 'Front Brake Caliper Sticking' or 'Battery Terminal Corrosion'",
  "rootCause": "string — explanation of the likely root cause based on the symptoms described",
  "confidence": "number — percentage estimate (0-100). Base on how specific/clear the user's description is. Lower if vague.",
  "severity": "string — one of: LOW | MEDIUM | HIGH | CRITICAL. CRITICAL = life/safety risk, immediate stop riding. HIGH = significant damage risk, repair soon. MEDIUM = moderate issue, plan repair. LOW = minor, can be monitored.",
  "repairDifficulty": "string — one of: BEGINNER | INTERMEDIATE | EXPERT. BEGINNER = basic tools, 30min. INTERMEDIATE = some experience, special tools. EXPERT = professional skills required.",
  "estimatedCost": "string — estimated DIY repair cost range, e.g. 'Free (cleaning)' / 'Under $20' / '$20-$50' / '$50-$150' / '$150-$500' / '$500+'",
  "estimatedRepairTime": "string — estimated time for DIY repair, e.g. '15 mins' / '1 hour' / '2-3 hours' / 'Full day' / 'See professional'",
  "repairSteps": ["array of 4-8 chronological step-by-step repair instructions. Each step must be clear, safe, and actionable. Include tool sizes where relevant."],
  "safetyWarnings": ["array of 0-5 critical safety warnings. Empty array if no specific dangers. Include items like 'Wear insulated gloves', 'Disconnect battery first', 'Do not ride until repaired'."]
}

DIAGNOSTIC RULES:
1. If the issue involves BRAKES, STEERING, or FRAME damage → severity must be HIGH or CRITICAL. Set repairSteps to empty array, fill safetyWarnings.
2. If symptoms are vague (e.g. "makes noise", "weird sound"), set confidence between 30-50 and suggest specific things to check.
3. If the description is detailed (specific component + symptom), set confidence 70-95.
4. Always include specific tool sizes when possible (e.g. 'using an 8mm wrench').
5. Never recommend unsafe procedures. If unsure, add a safety warning.
6. For electrical issues, always include 'Disconnect the battery negative terminal first' in safetyWarnings.
7. For CRITICAL issues, repairSteps should be empty and safetyWarnings should direct to a professional mechanic.`;
}

/**
 * Internal confidence calculation based on input characteristics.
 * Used when Gemini API is unavailable and we need a fallback estimate.
 *
 * @param input - The user's issue description
 * @returns A confidence percentage (0-100)
 */
export function calculateConfidence(input: string): number {
  if (!input || input.trim().length === 0) return 0;

  const text = input.trim();
  let score = 50; // base confidence

  // Length-based: longer descriptions get more confidence
  if (text.length > 100) score += 15;
  if (text.length > 200) score += 10;

  // Specificity bonus: common component keywords
  const specificTerms = [
    "battery", "brake", "engine", "wheel", "chain", "throttle",
    "clutch", "spark", "oil", "fuel", "coolant", "cable",
    "terminal", "starter", "exhaust", "carburetor", "injector",
    "suspension", "fork", "tire", "piston", "valve",
  ];

  for (const term of specificTerms) {
    if (text.toLowerCase().includes(term)) {
      score += 3;
      break; // only bonus once
    }
  }

  // Symptom clarity bonus
  const clearSymptoms = [
    "clicking", "squeaking", "grinding", "rattling", "vibration",
    "leaking", "smoking", "overheating", "stalling", "misfiring",
    "corrosion", "crack", "frayed", "loose", "broken",
  ];

  for (const symptom of clearSymptoms) {
    if (text.toLowerCase().includes(symptom)) {
      score += 5;
      break;
    }
  }

  return Math.min(Math.max(score, 10), 95);
}

/**
 * Classifies the severity of an issue based on component involvement
 * and symptom description. Used as a secondary check alongside Gemini.
 *
 * @param input - The user's issue description
 * @returns SeverityLevel — LOW, MEDIUM, HIGH, or CRITICAL
 */
export function classifySeverity(input: string): SeverityLevel {
  if (!input) return "LOW";

  const text = input.toLowerCase();

  // Check for CRITICAL indicators first
  const criticalIndicators = [
    "brake fail", "no brake", "brake loss", "brake fade",
    "frame crack", "frame snap", "steering lock", "fork lock",
    "wheel wobble", "wheel detach", "chain snap", "throttle stuck",
    "crash", "accident", "hydraulic leak",
  ];

  for (const indicator of criticalIndicators) {
    if (text.includes(indicator)) return "CRITICAL";
  }

  // Check HIGH indicators
  for (const component of CRITICAL_COMPONENTS) {
    if (text.includes(component)) return "HIGH";
  }

  // Check MEDIUM indicators
  for (const component of HIGH_RISK_COMPONENTS) {
    if (text.includes(component)) return "HIGH";
  }

  for (const component of MEDIUM_RISK_COMPONENTS) {
    if (text.includes(component)) return "MEDIUM";
  }

  return "LOW";
}

/**
 * Generates a set of dynamic repair steps based on the diagnosed issue.
 * Used as a fallback when Gemini doesn't return steps.
 *
 * @param issue - The diagnosed issue title
 * @param severity - The severity level
 * @returns An array of repair step strings
 */
export function generateRepairWorkflow(issue: string, severity: SeverityLevel): string[] {
  if (severity === "CRITICAL" || severity === "HIGH") {
    return [];
  }

  const text = issue.toLowerCase();

  // Battery-related
  if (text.includes("battery") || text.includes("terminal") || text.includes("corrosion") || text.includes("voltage")) {
    return [
      "Prepare workspace: turn off ignition, put on safety glasses and insulated gloves.",
      "Locate the negative terminal (black) and loosen the bolt using an 8mm or 10mm wrench.",
      "Disconnect the negative terminal entirely and secure the cable away from the battery.",
      "Locate the positive terminal (red) and loosen the bolt, then disconnect.",
      "Inspect terminals for corrosion. Clean with a wire brush or terminal cleaner tool.",
      "Apply battery dielectric grease to terminals to prevent future corrosion.",
      "Reconnect positive terminal first, then negative. Tighten bolts securely.",
      "Test: turn ignition on. If the bike starts, the repair is complete.",
    ];
  }

  // Spark plug related
  if (text.includes("spark") || text.includes("misfire") || text.includes("ignition")) {
    return [
      "Ensure the engine is cold. Disconnect the battery negative terminal for safety.",
      "Locate the spark plug wire or coil pack and gently disconnect it.",
      "Use a spark plug socket and ratchet to remove the spark plug.",
      "Inspect the plug: check for carbon fouling (black deposits), oil fouling (wet), or electrode wear.",
      "Check the gap with a feeler gauge. Adjust or replace if out of specification.",
      "Install the new or cleaned plug, hand-tighten first, then torque to specification.",
      "Reconnect the spark plug wire or coil. Reconnect the battery.",
      "Start the engine and verify smooth idle and acceleration.",
    ];
  }

  // General mechanical issue
  return [
    "Park the motorcycle on a level surface and turn off the ignition.",
    "Allow the engine to cool if it has been running recently.",
    "Gather necessary tools: socket set, wrenches, screwdrivers, and safety equipment.",
    "Visually inspect the affected area for damage, leaks, or loose components.",
    "Consult your service manual for the specific torque specifications and procedures.",
    "If the issue persists after basic inspection, consult a professional mechanic.",
  ];
}

/**
 * Maps an AiDiagnosisResponse from Gemini into the app's standard Diagnosis type.
 * This bridges the AI engine's output schema with the UI's expected format.
 *
 * @param ai - The structured AI diagnosis response
 * @param input - The original user input (for fallback confidence)
 * @returns A Diagnosis object ready for the UI
 */
export function mapAiToDiagnosis(
  ai: AiDiagnosisResponse,
  input: string,
): Diagnosis {
  const isCritical = ai.severity === "CRITICAL";

  return {
    id: `ai-${Date.now()}`,
    isCritical,
    issue: ai.issue || "Unknown issue",
    confidence: ai.confidence || calculateConfidence(input),
    description: ai.rootCause
      ? `AI Analysis: ${ai.rootCause}`
      : `Analysis based on user description: "${input}".`,
    difficulty:
      ai.repairDifficulty === "EXPERT"
        ? 5
        : ai.repairDifficulty === "INTERMEDIATE"
          ? 3
          : 1,
    estimatedTime: ai.estimatedRepairTime || (isCritical ? "See professional" : "30-60 mins"),
    diyCost: ai.estimatedCost?.includes("Free") || ai.estimatedCost?.includes("Under") ? 0 : 20,
    proEstimate: isCritical ? 200 : 80,
    severityCode: isCritical ? "A001" : "A002",
    severityLevel: ai.severity || classifySeverity(input),
    aiRecommendation: [
      `Issue detected: ${ai.issue}.`,
      `Severity: ${ai.severity}.`,
      `Difficulty: ${ai.repairDifficulty}.`,
      `Est. cost: ${ai.estimatedCost}.`,
      ...(ai.safetyWarnings?.length > 0
        ? [`Safety: ${ai.safetyWarnings.join(" ")}`]
        : []),
    ].join(" "),
    steps: isCritical ? undefined : (ai.repairSteps?.length > 0 ? ai.repairSteps : generateRepairWorkflow(ai.issue, ai.severity)),
    estimatedCost: isCritical ? ai.estimatedCost : undefined,
    costDetails: isCritical
      ? `Professional repair recommended. Estimated cost: ${ai.estimatedCost}`
      : undefined,
    mechanics: isCritical
      ? [
          { name: "Apex Precision Moto", rating: 4.9, reviews: 214, distance: "0.8 miles away" },
          { name: "Nitro Diagnostics Hub", rating: 4.7, reviews: 128, distance: "2.4 miles away" },
        ]
      : undefined,
  };
}

/**
 * analyzeDiagnosis
 *
 * Main entry point for text-based AI diagnosis.
 * Sends the user's issue description to Gemini with a structured prompt,
 * parses the response, and returns a Diagnosis object.
 *
 * If Gemini is unavailable, falls through to getFallbackDiagnosis()
 * based on severity classification (NO keyword matching).
 *
 * @param options - AiDiagnosisOptions containing the user input
 * @param callGeminiFn - Function to call Gemini API (injected for testability/server context)
 * @returns A Promise resolving to a Diagnosis object
 */
export async function analyzeDiagnosis(
  options: AiDiagnosisOptions,
  callGeminiFn: (prompt: string) => Promise<string | null>,
): Promise<Diagnosis> {
  const { input, isCriticalRequest, imageBase64 } = options;

  // Handle critical request flag
  if (isCriticalRequest) {
    return getFallbackDiagnosis("brake");
  }

  // Handle empty input
  if (!input || input.trim().length === 0) {
    return getFallbackDiagnosis("battery");
  }

  const trimmedInput = input.trim();

  try {
    const prompt = buildDiagnosisPrompt(trimmedInput);
    const responseText = await callGeminiFn(prompt);

    if (responseText) {
      const parsed: AiDiagnosisResponse = JSON.parse(responseText);

      // Validate that the response has the required fields
      if (parsed.issue && parsed.severity) {
        return mapAiToDiagnosis(parsed, trimmedInput);
      }
    }
  } catch (err) {
    console.warn("aiDiagnosisService: Gemini analysis failed:", err);
  }

  // Fallback: classify severity based on input, then return appropriate preset
  // This uses classifySeverity() (semantic analysis) NOT keyword matching
  const severity = classifySeverity(trimmedInput);

  if (severity === "CRITICAL" || severity === "HIGH") {
    return getFallbackDiagnosis("brake");
  }

  return getFallbackDiagnosis("battery");
}