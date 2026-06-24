export interface Mechanic {
  name: string;
  rating: number;
  reviews: number;
  distance: string;
  /** Phone number in international format (e.g. "+15551234567") */
  phone?: string;
  /** Google Places place_id for map links */
  placeId?: string;
  /** Whether the shop is currently open */
  openNow?: boolean;
  /** Full address string */
  address?: string;
}

/**
 * MechanicSearchRequest
 *
 * Payload sent to the backend `/api/nearby-mechanics` endpoint.
 */
export interface MechanicSearchRequest {
  latitude: number;
  longitude: number;
  /** The diagnosed issue title (for context) */
  issue?: string;
  /** Severity level for determining urgency */
  severity?: SeverityLevel;
}

/**
 * MechanicSearchResponse
 *
 * Backend response from the Places API mechanic search.
 */
export interface MechanicSearchResponse {
  mechanics: Mechanic[];
  /** Error message if the API call failed */
  error?: string;
}

export interface Diagnosis {
  id: string;
  isCritical: boolean;
  issue: string;
  confidence: number;
  description: string;
  difficulty?: number; // 1 to 5 wrenches
  estimatedTime?: string;
  diyCost?: number;
  proEstimate?: number;
  severityCode: string;
  severityLevel: string;
  aiRecommendation: string;
  steps?: string[];
  estimatedCost?: string; // e.g. "$350 — $500"
  costDetails?: string;
  mechanics?: Mechanic[];
}

/**
 * VisionDiagnosisRequest
 *
 * Payload sent to the backend `/api/diagnose-vision` endpoint.
 * Contains the base64-encoded image and optional user text prompt.
 */
export interface VisionDiagnosisRequest {
  /** Base64-encoded JPEG image (without data: URI prefix) */
  image: string;
  /** Optional user-provided text description of the issue */
  prompt?: string;
}

/**
 * VisionDiagnosisResponse
 *
 * Structured response from the Gemini Vision analysis.
 * Maps to the UI's Diagnosis type for display.
 */
export interface VisionDiagnosisResponse {
  issue: string;
  confidence: number;
  severity: string;
  repairDifficulty: string;
  estimatedCost: string;
  repairSteps: string[];
}

/**
 * Severity classification for motorcycle issues.
 */
export type SeverityLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Repair difficulty classification.
 */
export type RepairDifficulty = "BEGINNER" | "INTERMEDIATE" | "EXPERT";

/**
 * AiDiagnosisResponse
 *
 * Structured response from Gemini's text-based AI diagnosis engine.
 * Used by aiDiagnosisService.ts and POST /api/diagnose.
 */
export interface AiDiagnosisResponse {
  issue: string;
  rootCause: string;
  confidence: number;
  severity: SeverityLevel;
  repairDifficulty: RepairDifficulty;
  estimatedCost: string;
  estimatedRepairTime: string;
  repairSteps: string[];
  safetyWarnings: string[];
}