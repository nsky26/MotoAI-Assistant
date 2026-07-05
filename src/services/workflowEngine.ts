/**
 * MotoAI Workflow Engine (Phase 3.6)
 *
 * Generates and manages step-by-step repair workflows.
 * Features:
 * - Loads workflows from knowledge/repair_workflows.json
 * - Resolves dependencies between steps (lock/unlock)
 * - Tracks verification status of each step
 * - Generates reverse workflow for reassembly
 * - Reports progress and remaining steps
 *
 * Pure TypeScript — no UI, no React, no Firebase.
 * Unit-test friendly.
 */
import type { RepairWorkflow, WorkflowStep, WorkflowSession } from "./knowledgeTypes";

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let _workflows: Map<string, RepairWorkflow> | null = null;

async function loadWorkflows(): Promise<Map<string, RepairWorkflow>> {
  if (_workflows) return _workflows;
  try {
    const res = await fetch("/knowledge/repair_workflows.json");
    const data = await res.json();
    const map = new Map<string, RepairWorkflow>();
    for (const w of data.workflows) {
      // Convert step dependencies from string format to actual WorkflowStep objects
      const workflow = w as RepairWorkflow;
      workflow.steps = workflow.steps.map((s) => ({
        ...s,
        locked: s.dependency !== null,
        verified: false,
      }));
      map.set(w.id, workflow);
    }
    _workflows = map;
    return map;
  } catch {
    _workflows = new Map();
    return _workflows;
  }
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

const _sessions = new Map<string, WorkflowSession>();

/**
 * Starts a new workflow session for a given workflow ID.
 * First step is unlocked automatically.
 *
 * @param workflowId - The ID of the workflow to start
 * @returns A new WorkflowSession, or null if workflow not found
 */
export async function startWorkflow(workflowId: string): Promise<WorkflowSession | null> {
  const workflows = await loadWorkflows();
  const workflow = workflows.get(workflowId);
  if (!workflow) return null;

  const session: WorkflowSession = {
    workflowId,
    currentStepIndex: 0,
    verifiedSteps: new Set<number>(),
    completed: false,
    startedAt: new Date().toISOString(),
    completedAt: null,
    isReversed: false,
  };

  // Unlock the first step
  if (workflow.steps.length > 0) {
    workflow.steps[0].locked = false;
  }

  const sessionId = `${workflowId}_${Date.now()}`;
  _sessions.set(sessionId, session);

  return session;
}

/**
 * Gets the workflow definition for a given ID.
 *
 * @param workflowId - The workflow ID
 * @returns The RepairWorkflow, or null if not found
 */
export async function getWorkflow(workflowId: string): Promise<RepairWorkflow | null> {
  const workflows = await loadWorkflows();
  return workflows.get(workflowId) || null;
}

/**
 * Gets the current workflow step.
 *
 * @param workflow - The loaded workflow
 * @param session - The active session
 * @returns The current WorkflowStep, or null if completed
 */
export function getCurrentStep(
  workflow: RepairWorkflow,
  session: WorkflowSession,
): WorkflowStep | null {
  if (session.completed) return null;
  return workflow.steps[session.currentStepIndex] || null;
}

/**
 * Marks the current step as verified and advances.
 * After verification, checks dependencies for the next step
 * and unlocks it if all dependencies are met.
 *
 * @param workflow - The loaded workflow
 * @param session - The active session
 * @returns Updated session
 */
export function verifyStep(
  workflow: RepairWorkflow,
  session: WorkflowSession,
): WorkflowSession {
  if (session.completed) return session;

  // Mark current step as verified
  session.verifiedSteps.add(session.currentStepIndex);
  workflow.steps[session.currentStepIndex].verified = true;

  // Move to next step
  const nextIndex = session.currentStepIndex + 1;
  if (nextIndex >= workflow.steps.length) {
    session.completed = true;
    session.completedAt = new Date().toISOString();
    return { ...session };
  }

  // Check if the next step's dependencies are satisfied
  const nextStep = workflow.steps[nextIndex];
  if (nextStep.dependency === null) {
    nextStep.locked = false;
  } else if (nextStep.dependency === "step_4_verified" && session.verifiedSteps.has(3)) {
    nextStep.locked = false;
  } else if (nextStep.dependency === "step_5_verified" && session.verifiedSteps.has(4)) {
    nextStep.locked = false;
  } else if (nextStep.dependency === "step_6_verified" && session.verifiedSteps.has(5)) {
    nextStep.locked = false;
  } else if (nextStep.dependency === "step_7_verified" && session.verifiedSteps.has(6)) {
    nextStep.locked = false;
  } else if (nextStep.dependency === "step_8_verified" && session.verifiedSteps.has(7)) {
    nextStep.locked = false;
  } else if (nextStep.dependency === "step_9_verified" && session.verifiedSteps.has(8)) {
    nextStep.locked = false;
  } else if (nextStep.dependency === "step_10_verified" && session.verifiedSteps.has(9)) {
    nextStep.locked = false;
  } else if (nextStep.dependency === "step_11_verified" && session.verifiedSteps.has(10)) {
    nextStep.locked = false;
  } else if (nextStep.dependency === "step_12_verified" && session.verifiedSteps.has(11)) {
    nextStep.locked = false;
  } else if (nextStep.dependency === "step_13_verified" && session.verifiedSteps.has(12)) {
    nextStep.locked = false;
  } else if (nextStep.dependency === "step_14_verified" && session.verifiedSteps.has(13)) {
    nextStep.locked = false;
  } else if (nextStep.dependency === "step_15_verified" && session.verifiedSteps.has(14)) {
    nextStep.locked = false;
  } else if (nextStep.dependency === "step_16_verified" && session.verifiedSteps.has(15)) {
    nextStep.locked = false;
  }

  session.currentStepIndex = nextIndex;

  return { ...session };
}

/**
 * Generates the reverse of a workflow for reassembly purposes.
 * Steps are reversed and dependencies are recalculated.
 *
 * @param workflow - The original workflow
 * @returns A new RepairWorkflow in reverse order
 */
export function generateReverseWorkflow(workflow: RepairWorkflow): RepairWorkflow {
  if (!workflow.reassemblySteps) return workflow;

  const originalSteps = [...workflow.steps];
  const reversed: WorkflowStep[] = originalSteps.reverse().map((step, index) => {
    const totalSteps = originalSteps.length;
    let newDependency: string | null = null;
    if (index > 0) {
      newDependency = `step_${totalSteps - index}_verified`;
    }
    return {
      ...step,
      order: index + 1,
      instruction: reverseInstruction(step.instruction),
      dependency: newDependency,
      locked: newDependency !== null,
      verified: false,
    };
  });

  reversed[0].locked = false;

  return {
    ...workflow,
    id: `${workflow.id}_reverse`,
    name: `Reassembly: ${workflow.name}`,
    steps: reversed,
  };
}

/**
 * Gets the progress (percentage) of a workflow session.
 *
 * @param workflow - The loaded workflow
 * @param session - The active session
 * @returns Percentage complete (0-100)
 */
export function getWorkflowProgress(
  workflow: RepairWorkflow,
  session: WorkflowSession,
): number {
  if (workflow.steps.length === 0) return 100;
  return Math.round((session.verifiedSteps.size / workflow.steps.length) * 100);
}

/**
 * Gets all remaining (unverified) steps in a workflow.
 *
 * @param workflow - The loaded workflow
 * @param session - The active session
 * @returns Array of unverified WorkflowSteps
 */
export function getRemainingSteps(
  workflow: RepairWorkflow,
  session: WorkflowSession,
): WorkflowStep[] {
  return workflow.steps.filter((_, index) => !session.verifiedSteps.has(index));
}

/**
 * Generates a dependency graph string for debugging.
 *
 * @param workflow - The loaded workflow
 * @returns A string representation of step dependencies
 */
export function getDependencyGraph(workflow: RepairWorkflow): string {
  const lines: string[] = [`Workflow: ${workflow.name}`, `Total steps: ${workflow.steps.length}`, ""];

  for (const step of workflow.steps) {
    const dep = step.dependency ? ` [depends on: ${step.dependency}]` : " [no dependency]";
    const lock = step.locked ? " LOCKED" : " UNLOCKED";
    lines.push(`  Step ${step.order}:${lock}${dep}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Reverses the wording of an instruction for reassembly.
 * Simple mapping: "remove" ↔ "install", "disconnect" ↔ "reconnect",
 * "loosen" ↔ "tighten".
 */
function reverseInstruction(instruction: string): string {
  let result = instruction
    .replace(/\bremove\b/gi, "reinstall")
    .replace(/\bdisconnect\b/gi, "reconnect")
    .replace(/\bloosen\b/gi, "tighten")
    .replace(/\bpull\b/gi, "push")
    .replace(/\blift\b/gi, "lower")
    .replace(/\bdisassemble\b/gi, "reassemble")
    .replace(/\btake out\b/gi, "put back");

  // Reverse order words
  result = result
    .replace(/\bsecond\b/gi, "first")
    .replace(/\blast\b/gi, "first");

  return result;
}