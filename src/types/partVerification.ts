/**
 * MotoAI Part Verification Types
 *
 * Defines the data structures for verifying whether a user has
 * completed each repair step using camera-based visual verification.
 */

/**
 * The type of verification to perform for a given step.
 */
export type VerificationType =
  | "part_visible"      // The part should be visible (pre-repair inspection)
  | "part_removed"      // The part should be gone (was visible, now absent)
  | "connector_attached" // A connector/cable should be properly connected
  | "connector_detached" // A connector/cable should be disconnected
  | "bolt_removed"      // A bolt/fastener should be removed
  | "bolt_tightened"    // A bolt/fastener should be tightened
  | "step_completed";   // General step completion check

/**
 * Result of a single verification check.
 */
export interface VerificationResult {
  /** Whether the verification passed */
  verified: boolean;
  /** Confidence score (0.0 to 1.0) of the verification */
  confidence: number;
  /** The verification type that was performed */
  type: VerificationType;
  /** Human-readable status message */
  message: string;
  /** Detailed advice if verification failed */
  advice?: string;
  /** Timestamp of the verification */
  timestamp: string;
}

/**
 * Configuration for a verification check.
 */
export interface VerificationConfig {
  /** The part label to verify (matches YOLO_CLASSES labels) */
  partLabel: string;
  /** The type of verification to perform */
  type: VerificationType;
  /** Minimum confidence threshold for a passing verification */
  minConfidence: number;
  /** How many consecutive frames must pass verification */
  requiredFrames: number;
  /** Optional — the expected state after verification (for step_completed) */
  expectedState?: string;
}

/**
 * Default verification configurations for common repair scenarios.
 */
export const VERIFICATION_PRESETS: Record<VerificationType, Partial<VerificationConfig>> = {
  part_visible: { minConfidence: 0.6, requiredFrames: 3 },
  part_removed: { minConfidence: 0.7, requiredFrames: 5 },
  connector_attached: { minConfidence: 0.65, requiredFrames: 3 },
  connector_detached: { minConfidence: 0.65, requiredFrames: 3 },
  bolt_removed: { minConfidence: 0.7, requiredFrames: 4 },
  bolt_tightened: { minConfidence: 0.7, requiredFrames: 4 },
  step_completed: { minConfidence: 0.6, requiredFrames: 2 },
};

/**
 * Maps workflow step instruction keywords to verification types.
 */
export const STEP_TO_VERIFICATION: Record<string, VerificationType> = {
  "remove": "part_removed",
  "disconnect": "connector_detached",
  "detach": "connector_detached",
  "loosen": "bolt_removed",
  "unscrew": "bolt_removed",
  "take out": "part_removed",
  "pull": "connector_detached",
  "connect": "connector_attached",
  "attach": "connector_attached",
  "tighten": "bolt_tightened",
  "screw": "bolt_tightened",
  "insert": "part_visible",
  "install": "part_visible",
  "place": "part_visible",
  "check": "part_visible",
  "inspect": "part_visible",
  "locate": "part_visible",
  "clean": "part_visible",
};