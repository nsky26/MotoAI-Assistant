/**
 * MotoAI Evidence Engine (Phase 3.5)
 *
 * Manages the evidence gathered during diagnosis:
 * - Stores observations (symptom confirmations, inspection results)
 * - Calculates and updates confidence scores for each potential cause
 * - Eliminates impossible causes based on negative evidence
 * - Tracks which inspections have been completed
 *
 * Pure TypeScript — no UI, no React, no Firebase.
 * Unit-test friendly.
 */
import type { Observation, ConfidenceScore, PartStatus } from "./knowledgeTypes";
import type { Part } from "./knowledgeTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvidenceState {
  observations: Observation[];
  partStatuses: Map<string, PartStatus>;
  confidenceScores: ConfidenceScore[];
  eliminatedParts: Set<string>;
  completedInspections: Set<string>;
}

// ---------------------------------------------------------------------------
// Constants — symptom-to-part elimination rules
// ---------------------------------------------------------------------------

/**
 * If a symptom is CONFIRMED FALSE (user says they don't have it),
 * certain parts can be eliminated. This maps symptom confirmation
 * to part elimination.
 */
const ELIMINATION_RULES: Record<string, string[]> = {
  // If fuel pump primes, fuel pump circuit is likely fine
  no_fuel_pump_prime_false: ["fuel_pump", "fuel_pump_relay", "fuel_pump_fuse"],
  // If there's a spark, ignition system is likely fine
  weak_spark_false: ["ignition_coil", "spark_plug_cap"],
  // If engine cranks, starter system is likely fine
  engine_no_crank_false: ["starter_motor", "starter_relay", "main_fuse"],
  // If battery voltage is good, battery is fine
  battery_not_charging_false: ["battery"],
};

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Creates a fresh EvidenceState with no observations.
 */
export function createEvidenceState(parts: Part[]): EvidenceState {
  const partStatuses = new Map<string, PartStatus>();

  for (const part of parts) {
    partStatuses.set(part.id, {
      partId: part.id,
      eliminated: false,
      eliminationReason: null,
      confidence: 0,
      inspectionsCompleted: [],
    });
  }

  return {
    observations: [],
    partStatuses,
    confidenceScores: [],
    eliminatedParts: new Set(),
    completedInspections: new Set(),
  };
}

/**
 * Records a new observation about a symptom.
 *
 * @param state - Current evidence state
 * @param symptomId - The symptom being observed
 * @param confirmed - Whether the symptom is confirmed (true) or ruled out (false)
 * @param source - Where the observation came from
 * @returns Updated evidence state
 */
export function recordObservation(
  state: EvidenceState,
  symptomId: string,
  confirmed: boolean,
  source: Observation["source"],
): EvidenceState {
  const observation: Observation = {
    symptomId,
    confirmed,
    timestamp: new Date().toISOString(),
    source,
  };

  state.observations.push(observation);

  // If symptom is ruled out, eliminate possible causes
  if (!confirmed) {
    const ruleKey = `${symptomId}_false`;
    const eliminateParts = ELIMINATION_RULES[ruleKey];
    if (eliminateParts) {
      for (const partId of eliminateParts) {
        const status = state.partStatuses.get(partId);
        if (status && !status.eliminated) {
          status.eliminated = true;
          status.eliminationReason = `Symptom "${symptomId}" was ruled out`;
          state.eliminatedParts.add(partId);
        }
      }
    }
  }

  return { ...state };
}

/**
 * Updates the confidence score for a specific part.
 * Clamps the score between 0.0 and 1.0.
 *
 * @param state - Current evidence state
 * @param partId - The part ID
 * @param delta - Amount to add/subtract from current confidence
 * @param reason - Why the confidence changed
 * @returns Updated evidence state
 */
export function updateConfidence(
  state: EvidenceState,
  partId: string,
  delta: number,
  reason: string,
): EvidenceState {
  const status = state.partStatuses.get(partId);
  if (!status || status.eliminated) return state;

  // Update the confidence score
  status.confidence = Math.max(0, Math.min(1, status.confidence + delta));

  // Record the reason
  const existingScore = state.confidenceScores.find((s) => s.partId === partId);
  if (existingScore) {
    existingScore.score = status.confidence;
    existingScore.reasons.push(reason);
  } else {
    state.confidenceScores.push({
      partId,
      score: status.confidence,
      reasons: [reason],
    });
  }

  return { ...state };
}

/**
 * Applies multiple confidence updates at once (from rule engine).
 *
 * @param state - Current evidence state
 * @param updates - Map of partId -> delta values
 * @param reason - Base reason for the updates
 * @returns Updated evidence state
 */
export function applyBatchConfidenceUpdates(
  state: EvidenceState,
  updates: Map<string, number>,
  reason: string,
): EvidenceState {
  for (const [partId, delta] of updates) {
    state = updateConfidence(state, partId, delta, reason);
  }
  return state;
}

/**
 * Eliminates a part as a possible cause.
 *
 * @param state - Current evidence state
 * @param partId - The part to eliminate
 * @param reason - Why it was eliminated
 * @returns Updated evidence state
 */
export function eliminatePart(
  state: EvidenceState,
  partId: string,
  reason: string,
): EvidenceState {
  const status = state.partStatuses.get(partId);
  if (!status) return state;

  status.eliminated = true;
  status.eliminationReason = reason;
  status.confidence = 0;
  state.eliminatedParts.add(partId);

  return { ...state };
}

/**
 * Marks an inspection as completed for tracking.
 *
 * @param state - Current evidence state
 * @param protocolId - The inspection protocol ID that was completed
 * @param partId - The part that was inspected
 * @returns Updated evidence state
 */
export function completeInspection(
  state: EvidenceState,
  protocolId: string,
  partId: string,
): EvidenceState {
  state.completedInspections.add(protocolId);

  const status = state.partStatuses.get(partId);
  if (status && !status.inspectionsCompleted.includes(protocolId)) {
    status.inspectionsCompleted.push(protocolId);
  }

  return { ...state };
}

/**
 * Gets the top N non-eliminated parts by confidence score.
 *
 * @param state - Current evidence state
 * @param count - Number of top results to return
 * @returns Array of confidence scores sorted descending
 */
export function getTopCauses(state: EvidenceState, count: number = 3): ConfidenceScore[] {
  return state.confidenceScores
    .filter((s) => !state.eliminatedParts.has(s.partId))
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}

/**
 * Gets all currently eliminated parts with their reasons.
 *
 * @param state - Current evidence state
 * @returns Array of eliminated part statuses
 */
export function getEliminatedParts(state: EvidenceState): PartStatus[] {
  const result: PartStatus[] = [];
  for (const [partId, status] of state.partStatuses) {
    if (status.eliminated) result.push(status);
  }
  return result;
}

/**
 * Resets the evidence state to initial values.
 *
 * @param parts - The full parts list to reinitialize
 * @returns Fresh EvidenceState
 */
export function resetEvidence(parts: Part[]): EvidenceState {
  return createEvidenceState(parts);
}