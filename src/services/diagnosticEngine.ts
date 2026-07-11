/**
 * MotoAI Dynamic Diagnostic & Verification Engine (Phase 5.3)
 *
 * Central orchestrator managing the state machine, evidence collection,
 * dynamic rule evaluations, knowledge graph dependencies, dynamic repair workflows,
 * and adaptive replanning upon step verification failures.
 */
import { Rule, Part, WorkflowStep, RepairWorkflow } from "./knowledgeTypes";
import { EvidenceState, createEvidenceState, recordYoloObservation, updateConfidence } from "./evidenceEngine";
import { evaluateSymptoms } from "./ruleEngine";

export type DiagnosticState =
  | "IDLE"
  | "COLLECTING_INPUT"
  | "INITIAL_INSPECTION"
  | "RULE_EVALUATION"
  | "DIAGNOSIS_READY"
  | "REPAIR_IN_PROGRESS"
  | "VERIFY_STEP"
  | "REPAIR_COMPLETED"
  | "FINISHED";

export interface DiagnosticSession {
  state: DiagnosticState;
  bikeModel: string;
  symptoms: string[];
  evidenceState: EvidenceState;
  currentWorkflow: RepairWorkflow | null;
  currentStepIndex: number;
  timeline: string[];
  failedRepairs: string[];
}

let _session: DiagnosticSession = {
  state: "IDLE",
  bikeModel: "Generic Motorcycle",
  symptoms: [],
  evidenceState: createEvidenceState([]),
  currentWorkflow: null,
  currentStepIndex: 0,
  timeline: [],
  failedRepairs: []
};

/**
 * Initializes a new dynamic diagnostic session.
 */
export function initializeSession(parts: Part[], bikeModel: string): DiagnosticSession {
  _session = {
    state: "COLLECTING_INPUT",
    bikeModel,
    symptoms: [],
    evidenceState: createEvidenceState(parts),
    currentWorkflow: null,
    currentStepIndex: 0,
    timeline: ["Session initialized: COLLECTING_INPUT"],
    failedRepairs: []
  };
  return _session;
}

/**
 * Gets the current active session state.
 */
export function getSession(): DiagnosticSession {
  return _session;
}

/**
 * Transition state machine deterministically.
 */
export function transitionTo(target: DiagnosticState): void {
  const previous = _session.state;
  _session.state = target;
  _session.timeline.push(`State transitioned from ${previous} to ${target}`);
  console.log(`diagnosticEngine: state changed ${previous} -> ${target}`);
}

/**
 * Logs an evidence observation and triggers rule re-evaluation.
 */
export async function addEvidence(part: string, condition: string, confidence: number): Promise<void> {
  _session.timeline.push(`YOLO detected: ${part} (${condition}) with ${Math.round(confidence * 100)}% confidence`);
  
  // Update evidence state
  _session.evidenceState = recordYoloObservation(_session.evidenceState, part, condition, confidence);
  
  // Re-run Rule Engine evaluations
  transitionTo("RULE_EVALUATION");
  const symptoms = _session.symptoms;
  const evalResult = await evaluateSymptoms(symptoms);
  
  // Update part confidence scores from fired rules
  for (const [partId, delta] of evalResult.confidenceUpdates.entries()) {
    _session.evidenceState = updateConfidence(
      _session.evidenceState,
      partId,
      delta,
      `Rule fired: ${evalResult.firedRules.join(", ")}`
    );
  }

  transitionTo("DIAGNOSIS_READY");
}

/**
 * Dynamically plans the repair workflow based on current evidence scores.
 */
export function planWorkflow(partId: string): RepairWorkflow {
  const steps: WorkflowStep[] = [
    {
      order: 1,
      instruction: `Inspect access path and remove covers surrounding ${partId}.`,
      dependency: null,
      verificationRequired: true,
      locked: false,
      verified: false
    },
    {
      order: 2,
      instruction: `Unbolt current ${partId} and disconnect wiring cables.`,
      dependency: "1",
      verificationRequired: true,
      locked: true,
      verified: false
    },
    {
      order: 3,
      instruction: `Install replacement ${partId} and reconnect wiring terminals securely.`,
      dependency: "2",
      verificationRequired: true,
      locked: true,
      verified: false
    }
  ];

  const workflow: RepairWorkflow = {
    id: `wf_${partId}`,
    name: `Dynamic ${partId.replace("_", " ")} Replacement`,
    partId,
    difficulty: "INTERMEDIATE",
    estimatedMinutes: 25,
    tools: ["Screwdriver", "Socket Wrench", "Multimeter"],
    reassemblySteps: true,
    steps
  };

  _session.currentWorkflow = workflow;
  _session.currentStepIndex = 0;
  _session.timeline.push(`Planned dynamic workflow: wf_${partId}`);
  transitionTo("REPAIR_IN_PROGRESS");

  return workflow;
}

/**
 * Handles dynamic step verification check.
 * If verification passes, proceeds.
 * If verification fails, triggers evidence update, re-runs rule engine, and replans!
 */
export async function verifyCurrentStep(
  method: "camera" | "audio" | "user",
  success: boolean,
  failureReason?: string
): Promise<{ success: boolean; nextAction: string }> {
  const wf = _session.currentWorkflow;
  if (!wf) return { success: false, nextAction: "No workflow active" };

  const currentStep = wf.steps[_session.currentStepIndex];
  transitionTo("VERIFY_STEP");

  if (success) {
    currentStep.verified = true;
    _session.timeline.push(`Step ${currentStep.order} verified via ${method}: PASS`);
    
    _session.currentStepIndex++;
    if (_session.currentStepIndex >= wf.steps.length) {
      transitionTo("REPAIR_COMPLETED");
      return { success: true, nextAction: "REPAIR_COMPLETED" };
    }
    
    // Unlock next step
    const nextStep = wf.steps[_session.currentStepIndex];
    if (nextStep) nextStep.locked = false;

    transitionTo("REPAIR_IN_PROGRESS");
    return { success: true, nextAction: "PROCEED_TO_NEXT_STEP" };
  } else {
    // Verification Failed: Trigger adaptive replanning
    _session.timeline.push(`Step ${currentStep.order} verification failed via ${method}: ${failureReason || "Unmet criteria"}`);
    _session.failedRepairs.push(wf.partId);

    // Increase failure confidence of alternative parts
    _session.evidenceState = updateConfidence(
      _session.evidenceState,
      wf.partId,
      -0.6, // heavily discount current target
      `Verification failed: ${failureReason}`
    );

    // Find next highest suspect cause
    const nextSuspect = Array.from(_session.evidenceState.partStatuses.values())
      .filter(p => !p.eliminated && !_session.failedRepairs.includes(p.partId))
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (nextSuspect && nextSuspect.confidence > 0.1) {
      planWorkflow(nextSuspect.partId);
      return {
        success: false,
        nextAction: `REPLANNING: Switched to replacement path for ${nextSuspect.partId}`
      };
    } else {
      transitionTo("FINISHED");
      return {
        success: false,
        nextAction: "UNRESOLVED: No alternative component faults matches symptoms. Suggesting mechanic intervention."
      };
    }
  }
}
