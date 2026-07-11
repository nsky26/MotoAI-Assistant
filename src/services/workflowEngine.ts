import workflowsData from "../../knowledge/workflows.json";
import failuresData from "../../knowledge/failures.json";
import { runSymptomDiagnosis, buildDiagnosisFromFailure } from "./ruleEngine";
import type { Diagnosis } from "../types";

export interface RepairWorkflow {
  failureId: string;
  inspectionSteps: string[];
  repairSteps: string[];
  verification: {
    type: "camera" | "audio" | "manual";
    target: string;
    checklist: string[];
  };
  rollbackSteps: string[];
}

// Generate workflow details from json database
export function getWorkflowForFailure(failureId: string): RepairWorkflow | null {
  const flow = workflowsData.find(w => w.failureId === failureId);
  if (!flow) return null;

  return {
    failureId,
    inspectionSteps: flow.inspection,
    repairSteps: flow.repair,
    verification: {
      type: flow.verification.type as "camera" | "audio" | "manual",
      target: flow.verification.target,
      checklist: flow.verification.checklist
    },
    rollbackSteps: flow.rollback
  };
}

// Dynamic replanning logic on verification failures
export function replanWorkflow(
  failedFailureId: string,
  activeSymptoms: string[],
  previouslyFailedIds: string[]
): { diagnosis: Diagnosis; workflow: RepairWorkflow } | null {
  console.log(`Replanning workflow: ${failedFailureId} failed. Updating evidence weights...`);

  // Add the failed ID to previously failed list to prevent infinite loop matches
  const updatedFailedList = [...previouslyFailedIds, failedFailureId];

  // Run diagnostics using rule engine
  const results = runSymptomDiagnosis(activeSymptoms);

  // Find the next highest probability diagnosis that hasn't failed yet
  const nextDiagnosis = results.find(d => !updatedFailedList.includes(d.id));

  if (nextDiagnosis) {
    const nextWorkflow = getWorkflowForFailure(nextDiagnosis.id);
    if (nextWorkflow) {
      return {
        diagnosis: nextDiagnosis,
        workflow: nextWorkflow
      };
    }
  }

  // Fallback: If no other rules match, generate a general maintenance/safety inspection checklist
  const fallbackDiag = buildDiagnosisFromFailure("dead_battery", 40); // default
  fallbackDiag.issue = "General Safety & Telemetry Inspection";
  fallbackDiag.description = "Automated verification failed on primary symptoms. Re-inspecting spark path, fuel pressure, and terminal feeds.";
  fallbackDiag.steps = [
    "Verify spark plug gap spacing and boot seat connection.",
    "Verify starter relay clicks when pressing button.",
    "Check master fuse for broken filament/continuity.",
    "Check main fuel line for blockages/pressure."
  ];

  return {
    diagnosis: fallbackDiag,
    workflow: {
      failureId: "general_inspection",
      inspectionSteps: ["Verify wiring harnesses and main fuse box."],
      repairSteps: fallbackDiag.steps,
      verification: {
        type: "manual",
        target: "general",
        checklist: ["Check console display indicators for warnings."]
      },
      rollbackSteps: ["Reconnect standard battery terminals."]
    }
  };
}