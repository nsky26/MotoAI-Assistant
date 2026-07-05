/**
 * MotoAI Dynamic Inspection Engine (Phase 6.2)
 *
 * The app must NEVER guess the fault. It must INSPECT.
 *
 * This engine orchestrates the entire diagnostic process:
 * 1. Start inspection based on user-reported symptoms
 * 2. Choose the next test/protocol based on current evidence
 * 3. Receive observations from the user
 * 4. Update the Evidence Engine
 * 5. Call the Rule Engine
 * 6. Calculate probabilities
 * 7. Choose the next inspection
 * 8. Continue until one root cause has confidence > 90%
 *
 * Supported inspection protocols:
 * - Bike Not Starting (top-level orchestrator)
 * - Battery protocol
 * - Spark protocol
 * - Fuel protocol
 * - Compression protocol
 * - Timing protocol
 *
 * Pure TypeScript — no UI, no React, no Firebase.
 * Unit-test friendly.
 */
import type { ConfidenceScore } from "./knowledgeTypes";
import type { EvidenceState } from "./evidenceEngine";
import { createEvidenceState, recordObservation, updateConfidence, eliminatePart, completeInspection, getTopCauses } from "./evidenceEngine";
import { loadRules, fireRules } from "./ruleEngine";
import { startProtocol, advanceProtocol, failStep, branchProtocol, getCurrentStep } from "./protocolEngine";
import type { ProtocolSession } from "./knowledgeTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InspectionPhase =
  | "initial_assessment"
  | "battery_protocol"
  | "spark_protocol"
  | "fuel_protocol"
  | "compression_protocol"
  | "timing_protocol"
  | "completed";

export interface InspectionSession {
  /** Unique session ID */
  sessionId: string;
  /** Current inspection phase */
  phase: InspectionPhase;
  /** User-reported symptom IDs */
  symptoms: string[];
  /** Current Evidence Engine state */
  evidenceState: EvidenceState;
  /** Active protocol session (if any) */
  activeProtocol: ProtocolSession | null;
  /** Ordered list of completed protocols */
  completedProtocols: string[];
  /** Ordered list of suggested inspections from Rule Engine */
  pendingInspections: string[];
  /** Whether the inspection is complete */
  isComplete: boolean;
  /** The final diagnosis (set when complete) */
  finalDiagnosis: {
    partId: string;
    partName: string;
    confidence: number;
    reason: string;
  } | null;
  /** Current top causes ranked by probability */
  topCauses: ConfidenceScore[];
  /** Number of remaining possible causes */
  remainingCauses: number;
  /** Timestamps */
  startedAt: string;
  completedAt: string | null;
}

export interface InspectionObservation {
  /** The symptom or measurement being observed */
  observationId: string;
  /** Whether the observation is confirmed (true) or ruled out (false) */
  confirmed: boolean;
  /** Optional measurement value (e.g. battery voltage) */
  value?: number;
  /** Source of the observation */
  source: "user_input" | "voice" | "inspection" | "sensor";
}

// ---------------------------------------------------------------------------
// Phase-to-Protocol Mapping
// ---------------------------------------------------------------------------

const PHASE_PROTOCOLS: Record<InspectionPhase, string[]> = {
  initial_assessment: ["fuse_inspection", "battery_inspection"],
  battery_protocol: ["battery_inspection", "voltage_regulator_inspection"],
  spark_protocol: ["spark_plug_inspection", "ignition_coil_inspection", "crank_sensor_inspection"],
  fuel_protocol: ["fuel_pump_inspection", "fuel_filter_inspection"],
  compression_protocol: ["compression_test"],
  timing_protocol: ["crank_sensor_inspection", "ecu_inspection"],
  completed: [],
};

/**
 * Maps symptoms to the most likely starting phase.
 */
const SYMPTOM_TO_PHASE: Record<string, InspectionPhase> = {
  engine_no_crank: "battery_protocol",
  engine_cranks_slowly: "battery_protocol",
  engine_cranks_no_start: "spark_protocol",
  clicking_sound: "battery_protocol",
  engine_starts_then_dies: "fuel_protocol",
  no_electrical_power: "battery_protocol",
  no_fuel_pump_prime: "fuel_protocol",
  weak_spark: "spark_protocol",
  misfire: "spark_protocol",
  rough_idle: "fuel_protocol",
};

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

const _sessions = new Map<string, InspectionSession>();

/**
 * Starts a new inspection session based on user-reported symptoms.
 *
 * @param symptoms - Array of symptom IDs the user is experiencing
 * @returns A new InspectionSession
 */
export async function startInspection(symptoms: string[]): Promise<InspectionSession> {
  const sessionId = `inspect_${Date.now()}`;

  // Create fresh Evidence Engine state
  const evidenceState = createEvidenceState([]);

  // Determine starting phase from symptoms
  const startPhase = determineStartingPhase(symptoms);

  // Run initial Rule Engine evaluation
  const rules = await loadRules();
  const facts = buildFactsFromSymptoms(symptoms);
  const ruleResult = fireRules(rules, facts);

  const session: InspectionSession = {
    sessionId,
    phase: startPhase,
    symptoms,
    evidenceState,
    activeProtocol: null,
    completedProtocols: [],
    pendingInspections: ruleResult.suggestedInspections,
    isComplete: false,
    finalDiagnosis: null,
    topCauses: [],
    remainingCauses: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
  };

  _sessions.set(sessionId, session);
  return session;
}

/**
 * Determines the starting inspection phase based on reported symptoms.
 */
function determineStartingPhase(symptoms: string[]): InspectionPhase {
  // Check for critical symptoms first
  if (symptoms.includes("engine_no_crank") || symptoms.includes("no_electrical_power")) {
    return "battery_protocol";
  }

  // Map each symptom to a phase, pick the most common
  const phaseCounts: Record<string, number> = {};
  for (const symptom of symptoms) {
    const phase = SYMPTOM_TO_PHASE[symptom];
    if (phase) {
      phaseCounts[phase] = (phaseCounts[phase] || 0) + 1;
    }
  }

  // Return the phase with the highest count
  let bestPhase: InspectionPhase = "initial_assessment";
  let bestCount = 0;
  for (const [phase, count] of Object.entries(phaseCounts)) {
    if (count > bestCount) {
      bestCount = count;
      bestPhase = phase as InspectionPhase;
    }
  }

  return bestPhase;
}

/**
 * Builds facts from symptoms for the Rule Engine.
 */
function buildFactsFromSymptoms(symptoms: string[]): Record<string, unknown> {
  const facts: Record<string, unknown> = {
    symptom_count: symptoms.length,
    electrical_symptom_count: 0,
    has_critical_symptom: false,
  };

  for (const symptom of symptoms) {
    facts.symptom_present = symptom;
  }

  const criticalSymptoms = new Set(["engine_no_crank", "no_electrical_power"]);
  for (const s of symptoms) {
    if (criticalSymptoms.has(s)) {
      facts.has_critical_symptom = true;
      break;
    }
  }

  return facts;
}

// ---------------------------------------------------------------------------
// Core Inspection Loop
// ---------------------------------------------------------------------------

/**
 * Processes an observation from the user and advances the inspection.
 * This is the main entry point for each step of the diagnostic process.
 *
 * @param sessionId - The inspection session ID
 * @param observation - The user's observation
 * @returns Updated InspectionSession
 */
export async function submitObservation(
  sessionId: string,
  observation: InspectionObservation,
): Promise<InspectionSession | null> {
  const session = _sessions.get(sessionId);
  if (!session || session.isComplete) return null;

  // 1. Record the observation in the Evidence Engine
  session.evidenceState = recordObservation(
    session.evidenceState,
    observation.observationId,
    observation.confirmed,
    observation.source,
  );

  // 2. If there's a measurement value, update confidence accordingly
  if (observation.value !== undefined) {
    session.evidenceState = updateConfidence(
      session.evidenceState,
      observation.observationId,
      observation.confirmed ? 0.1 : -0.1,
      `Measurement: ${observation.value}`,
    );
  }

  // 3. Advance the active protocol if one is running
  if (session.activeProtocol && !session.activeProtocol.completed) {
    if (observation.confirmed) {
      session.activeProtocol = await advanceProtocol(session.activeProtocol);
    } else {
      session.activeProtocol = await failStep(session.activeProtocol);
    }

    // Check if protocol completed
    if (session.activeProtocol.completed) {
      const protocolId = session.activeProtocol.protocolId;
      session.completedProtocols.push(protocolId);

      // Mark inspection complete in Evidence Engine
      const partId = getPartIdFromProtocol(protocolId);
      if (partId) {
        session.evidenceState = completeInspection(session.evidenceState, protocolId, partId);

        // If protocol failed, eliminate the part
        if (!session.activeProtocol.passed) {
          session.evidenceState = eliminatePart(
            session.evidenceState,
            partId,
            `Inspection failed: ${protocolId}`,
          );
        }
      }

      // Branch to next protocol
      const nextProtocol = await branchProtocol(session.activeProtocol);
      if (nextProtocol) {
        session.activeProtocol = await startProtocol(nextProtocol);
      } else {
        session.activeProtocol = null;
      }
    }
  }

  // 4. Run the Rule Engine with current evidence
  const rules = await loadRules();
  const facts = buildFactsFromEvidence(session);
  const ruleResult = fireRules(rules, facts);

  // Apply confidence updates from rules
  for (const [partId, delta] of ruleResult.confidenceUpdates) {
    session.evidenceState = updateConfidence(
      session.evidenceState,
      partId,
      delta,
      `Rule fired: ${ruleResult.firedRules.join(", ")}`,
    );
  }

  // Add suggested inspections to pending list
  for (const inspection of ruleResult.suggestedInspections) {
    if (!session.pendingInspections.includes(inspection)) {
      session.pendingInspections.push(inspection);
    }
  }

  // 5. Calculate probabilities
  session.topCauses = getTopCauses(session.evidenceState, 5);
  session.remainingCauses = countRemainingCauses(session);

  // 6. Check if we should transition to a new phase
  session.phase = await determineNextPhase(session);

  // 7. If no active protocol, start the next one
  if (!session.activeProtocol && !session.isComplete) {
    session.activeProtocol = await startNextProtocol(session);
  }

  // 8. Check completion condition
  if (session.topCauses.length > 0 && session.topCauses[0].score >= 0.9) {
    session.isComplete = true;
    session.completedAt = new Date().toISOString();
    session.finalDiagnosis = {
      partId: session.topCauses[0].partId,
      partName: session.topCauses[0].partId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      confidence: session.topCauses[0].score,
      reason: session.topCauses[0].reasons.join("; "),
    };
  }

  // Also complete if only one cause remains
  if (session.remainingCauses <= 1 && session.topCauses.length > 0) {
    session.isComplete = true;
    session.completedAt = new Date().toISOString();
    if (!session.finalDiagnosis) {
      session.finalDiagnosis = {
        partId: session.topCauses[0].partId,
        partName: session.topCauses[0].partId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        confidence: session.topCauses[0].score,
        reason: "All other causes eliminated through inspection.",
      };
    }
  }

  _sessions.set(sessionId, session);
  return { ...session };
}

// ---------------------------------------------------------------------------
// Phase Selection
// ---------------------------------------------------------------------------

/**
 * Determines the next inspection phase based on current evidence.
 */
async function determineNextPhase(session: InspectionSession): Promise<InspectionPhase> {
  if (session.isComplete) return "completed";

  const topCause = session.topCauses[0];

  // If battery is the top cause, run battery protocol
  if (topCause && topCause.partId === "battery" && topCause.score > 0.3) {
    return "battery_protocol";
  }

  // If spark-related parts are top, run spark protocol
  if (topCause && ["spark_plug", "ignition_coil", "crank_position_sensor"].includes(topCause.partId)) {
    return "spark_protocol";
  }

  // If fuel-related parts are top, run fuel protocol
  if (topCause && ["fuel_pump", "fuel_filter", "fuel_injector"].includes(topCause.partId)) {
    return "fuel_protocol";
  }

  // If timing-related, run timing protocol
  if (topCause && ["ecu", "crank_position_sensor"].includes(topCause.partId)) {
    return "timing_protocol";
  }

  // Default: stay in current phase or go to initial assessment
  return session.phase === "completed" ? "completed" : session.phase;
}

// ---------------------------------------------------------------------------
// Protocol Management
// ---------------------------------------------------------------------------

/**
 * Starts the next appropriate protocol based on the current phase and evidence.
 */
async function startNextProtocol(session: InspectionSession): Promise<ProtocolSession | null> {
  // First, try pending inspections from the Rule Engine
  if (session.pendingInspections.length > 0) {
    const nextInspection = session.pendingInspections.shift()!;
    if (!session.completedProtocols.includes(nextInspection)) {
      const protocol = await startProtocol(nextInspection);
      if (protocol) return protocol;
    }
  }

  // Otherwise, use the phase-based protocol list
  const protocols = PHASE_PROTOCOLS[session.phase] || [];
  for (const protocolId of protocols) {
    if (!session.completedProtocols.includes(protocolId)) {
      const protocol = await startProtocol(protocolId);
      if (protocol) return protocol;
    }
  }

  // If all protocols in this phase are done, try the next phase
  const phases: InspectionPhase[] = ["battery_protocol", "spark_protocol", "fuel_protocol", "compression_protocol", "timing_protocol"];
  const currentIndex = phases.indexOf(session.phase);
  for (let i = currentIndex + 1; i < phases.length; i++) {
    const nextPhase = phases[i];
    const nextProtocols = PHASE_PROTOCOLS[nextPhase] || [];
    for (const protocolId of nextProtocols) {
      if (!session.completedProtocols.includes(protocolId)) {
        session.phase = nextPhase;
        const protocol = await startProtocol(protocolId);
        if (protocol) return protocol;
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Probability Calculation
// ---------------------------------------------------------------------------

/**
 * Calculates the probability distribution across all non-eliminated parts.
 * Returns a map of partId → probability (0.0 to 1.0, summing to 1.0).
 */
export function calculateProbabilities(session: InspectionSession): Map<string, number> {
  const probabilities = new Map<string, number>();
  let totalConfidence = 0;

  for (const score of session.evidenceState.confidenceScores) {
    if (!session.evidenceState.eliminatedParts.has(score.partId)) {
      probabilities.set(score.partId, score.score);
      totalConfidence += score.score;
    }
  }

  // Normalize to sum to 1.0
  if (totalConfidence > 0) {
    for (const [partId, score] of probabilities) {
      probabilities.set(partId, score / totalConfidence);
    }
  }

  return probabilities;
}

/**
 * Returns the current inspection state for a session.
 */
export function getInspectionState(sessionId: string): InspectionSession | null {
  const session = _sessions.get(sessionId);
  if (!session) return null;
  return { ...session };
}

/**
 * Gets the current step instruction for the active protocol.
 */
export function getCurrentInstruction(session: InspectionSession): string | null {
  if (!session.activeProtocol) return null;
  const step = getCurrentStep(session.activeProtocol);
  return step ? step.instruction : null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds facts from the current evidence state for the Rule Engine.
 */
function buildFactsFromEvidence(session: InspectionSession): Record<string, unknown> {
  const facts: Record<string, unknown> = {
    symptom_count: session.symptoms.length,
    electrical_symptom_count: 0,
    has_critical_symptom: false,
    completed_inspections: session.completedProtocols.length,
    remaining_causes: session.remainingCauses,
  };

  // Add confirmed symptoms
  for (const obs of session.evidenceState.observations) {
    if (obs.confirmed) {
      facts.symptom_present = obs.symptomId;
    }
  }

  // Check for critical symptoms
  const criticalSymptoms = new Set(["engine_no_crank", "no_electrical_power"]);
  for (const s of session.symptoms) {
    if (criticalSymptoms.has(s)) {
      facts.has_critical_symptom = true;
      break;
    }
  }

  return facts;
}

/**
 * Counts the number of non-eliminated parts.
 */
function countRemainingCauses(session: InspectionSession): number {
  let count = 0;
  for (const score of session.evidenceState.confidenceScores) {
    if (!session.evidenceState.eliminatedParts.has(score.partId)) {
      count++;
    }
  }
  return count;
}

/**
 * Maps a protocol ID to its corresponding part ID.
 */
function getPartIdFromProtocol(protocolId: string): string | null {
  const protocolToPart: Record<string, string> = {
    battery_inspection: "battery",
    voltage_regulator_inspection: "voltage_regulator",
    spark_plug_inspection: "spark_plug",
    ignition_coil_inspection: "ignition_coil",
    crank_sensor_inspection: "crank_position_sensor",
    fuel_pump_inspection: "fuel_pump",
    fuel_filter_inspection: "fuel_filter",
    fuse_inspection: "main_fuse",
    wiring_harness_inspection: "wiring_harness",
    ecu_inspection: "ecu",
    starter_relay_inspection: "starter_relay",
  };
  return protocolToPart[protocolId] || null;
}

/**
 * Returns a summary of the inspection progress.
 */
export function getInspectionSummary(session: InspectionSession): string {
  const lines: string[] = [
    `Inspection: ${session.sessionId}`,
    `Phase: ${session.phase}`,
    `Symptoms: ${session.symptoms.join(", ")}`,
    `Completed protocols: ${session.completedProtocols.length}`,
    `Remaining causes: ${session.remainingCauses}`,
    `Complete: ${session.isComplete}`,
    "",
    "Top causes:",
  ];

  for (const cause of session.topCauses) {
    const eliminated = session.evidenceState.eliminatedParts.has(cause.partId);
    lines.push(`  ${eliminated ? "[ELIMINATED]" : "[PENDING]"} ${cause.partId}: ${(cause.score * 100).toFixed(1)}%`);
    for (const reason of cause.reasons) {
      lines.push(`    → ${reason}`);
    }
  }

  if (session.finalDiagnosis) {
    lines.push("", `FINAL DIAGNOSIS: ${session.finalDiagnosis.partName}`);
    lines.push(`Confidence: ${(session.finalDiagnosis.confidence * 100).toFixed(1)}%`);
    lines.push(`Reason: ${session.finalDiagnosis.reason}`);
  }

  return lines.join("\n");
}