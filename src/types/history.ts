/**
 * MotoAI Repair History Types
 *
 * Defines the Firestore document schema for saved diagnoses.
 * Each document lives at: users/{uid}/diagnoses/{diagnosisId}
 */
import type { Mechanic, SeverityLevel, RepairDifficulty } from "../types";

/**
 * A saved diagnosis record stored in Firestore.
 */
export interface DiagnosisRecord {
  /** Unique diagnosis ID (matches document ID) */
  diagnosisId: string;
  /** Firebase Auth UID (for security rules) */
  uid: string;
  /** ISO timestamp of when the diagnosis was performed */
  timestamp: string;
  /** The diagnosed issue title */
  issue: string;
  /** Root cause explanation from AI */
  rootCause?: string;
  /** AI confidence percentage (0-100) */
  confidence: number;
  /** Severity classification */
  severity: SeverityLevel;
  /** Repair difficulty level */
  repairDifficulty?: RepairDifficulty;
  /** Estimated cost description */
  estimatedCost?: string;
  /** Estimated repair time */
  estimatedRepairTime?: string;
  /** Step-by-step repair instructions */
  repairSteps?: string[];
  /** Safety warnings */
  safetyWarnings?: string[];
  /** Whether the user marked the repair as complete */
  repairCompleted: boolean;
  /** Whether the diagnosis was flagged as critical */
  isCritical: boolean;
  /** Nearby mechanics at time of diagnosis */
  nearbyMechanics?: Mechanic[];
  /** User's voice transcript at time of diagnosis */
  voiceTranscript?: string;
  /** User's typed description */
  userDescription?: string;
  /** Captured image URL (base64 or Firebase Storage URL) */
  capturedImageURL?: string;
  /** Motorcycle brand (user-provided) */
  motorcycleBrand?: string;
  /** Motorcycle model (user-provided) */
  motorcycleModel?: string;
}

/**
 * Pagination result for history queries.
 */
export interface HistoryPaginationResult {
  records: DiagnosisRecord[];
  /** True if there are more records to load */
  hasMore: boolean;
  /** The last document snapshot (for cursor-based pagination) */
  lastCursor?: unknown;
}

/**
 * Filter options for the history view.
 */
export interface HistoryFilters {
  searchQuery?: string;
  severity?: SeverityLevel | "ALL";
  sortOrder: "newest" | "oldest";
  pageSize: number;
}