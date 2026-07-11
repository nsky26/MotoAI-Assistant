import rulesData from "../../knowledge/rules.json";
import failuresData from "../../knowledge/failures.json";
import partsData from "../../knowledge/parts.json";
import workflowsData from "../../knowledge/workflows.json";
import toolsData from "../../knowledge/tools.json";
import costsData from "../../knowledge/repair_costs.json";
import maintenanceData from "../../knowledge/maintenance.json";

import type { Diagnosis, Mechanic } from "../types";

export interface RuleCondition {
  type: "AND" | "OR" | "NOT" | "symptom";
  id?: string;
  rules?: RuleCondition[];
  rule?: RuleCondition;
}

export interface Rule {
  id: string;
  failureId: string;
  condition: RuleCondition;
  confidenceModifier: number;
}

export interface FailureMode {
  id: string;
  name: string;
  partId: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  prior: number;
  description: string;
}

// Evaluate condition recursively
function evaluateCondition(condition: RuleCondition, activeSymptoms: string[]): boolean {
  if (condition.type === "symptom") {
    return activeSymptoms.includes(condition.id || "");
  }
  if (condition.type === "AND") {
    if (!condition.rules || condition.rules.length === 0) return false;
    return condition.rules.every(r => evaluateCondition(r, activeSymptoms));
  }
  if (condition.type === "OR") {
    if (!condition.rules || condition.rules.length === 0) return false;
    return condition.rules.some(r => evaluateCondition(r, activeSymptoms));
  }
  if (condition.type === "NOT") {
    if (!condition.rule) return false;
    return !evaluateCondition(condition.rule, activeSymptoms);
  }
  return false;
}

// Map failure details into a standard Diagnosis output
export function buildDiagnosisFromFailure(failureId: string, confidence: number): Diagnosis {
  const failure = (failuresData as FailureMode[]).find(f => f.id === failureId);
  const part = partsData.find(p => p.id === failure?.partId);
  const workflow = workflowsData.find(w => w.failureId === failureId);
  const costInfo = costsData.find(c => c.failureId === failureId);
  const maint = maintenanceData.find(m => m.component === failure?.partId);

  const steps = workflow ? [...workflow.inspection, ...workflow.repair] : ["Inspect and repair component."];
  const severityLevel = failure?.severity || "MEDIUM";

  // Build tools names
  const requiredTools = workflow ? (toolsData
    .filter(t => {
      if (failureId === "dead_battery" || failureId === "corroded_terminals") {
        return ["t_multimeter", "t_socket_wrench", "t_wire_brush"].includes(t.id);
      }
      if (failureId === "carbon_fouled_plug") {
        return ["t_spark_socket", "t_socket_wrench", "t_wire_brush"].includes(t.id);
      }
      if (failureId === "loose_chain_slack") {
        return ["t_socket_wrench"].includes(t.id);
      }
      if (failureId === "air_in_brake_lines") {
        return ["t_brake_bleed", "t_socket_wrench"].includes(t.id);
      }
      if (failureId === "tire_puncture") {
        return ["t_tire_reamer"].includes(t.id);
      }
      return false;
    })
    .map(t => t.name)) : ["General Toolkit"];

  return {
    id: failureId,
    isCritical: severityLevel === "HIGH" && (failureId === "air_in_brake_lines" || failureId === "brake-failure"),
    issue: failure?.name || "Unknown Issue",
    confidence: Math.round(confidence),
    description: failure?.description || "No description available.",
    difficulty: failureId === "dead_battery" ? 3 : 2,
    estimatedTime: failureId === "dead_battery" ? "15 mins" : failureId === "loose_chain_slack" ? "30 mins" : "20 mins",
    diyCost: costInfo?.partCost ?? 0,
    proEstimate: costInfo?.totalProCost ?? 80,
    severityCode: failureId === "dead_battery" ? "B001" : "B002",
    severityLevel,
    aiRecommendation: `AI Diagnostic Rule Engine Match. Recommended preventative action: ${maint?.task || "Regular cleaning and inspections."}`,
    steps,
    estimatedCost: costInfo ? `$${costInfo.partCost} DIY / $${costInfo.totalProCost} Pro` : undefined,
    costDetails: `Requires target spare parts and manual tools.`,
    mechanics: [
      {
        name: "Apex Precision Moto",
        rating: 4.9,
        reviews: 214,
        distance: "0.8 miles away"
      },
      {
        name: "Nitro Diagnostics Hub",
        rating: 4.7,
        reviews: 128,
        distance: "2.4 miles away"
      }
    ]
  };
}

// Main Rule Engine Query Entry Point
export function runSymptomDiagnosis(
  activeSymptoms: string[],
  brand?: string,
  mileage?: number
): Diagnosis[] {
  const diagnoses: Diagnosis[] = [];

  // Evaluate each registered rule
  for (const rule of rulesData as Rule[]) {
    const match = evaluateCondition(rule.condition, activeSymptoms);
    if (match) {
      // Prior-weighted Bayesian confidence update
      const failure = (failuresData as FailureMode[]).find(f => f.id === rule.failureId);
      const prior = failure ? failure.prior : 0.1;
      
      let modifier = rule.confidenceModifier;
      
      // Mileage-dependent weight shifts
      if (mileage && mileage > 15000) {
        if (rule.failureId === "loose_chain_slack" || rule.failureId === "tire_puncture") {
          modifier *= 1.2;
        }
      }
      
      // Brand-specific adjustments
      if (brand) {
        const lowerBrand = brand.toLowerCase();
        if ((lowerBrand.includes("royal") || lowerBrand.includes("enfield")) && rule.failureId === "loose_chain_slack") {
          modifier *= 1.25;
        }
      }

      // Calculate updated confidence probability
      const updatedProb = prior + (1 - prior) * Math.min(1, modifier);
      const confidencePercent = Math.min(99, updatedProb * 100);

      // Support elimination checks (e.g. if chain is tight, we can't have loose chain!)
      if (activeSymptoms.includes("s_soft_brake_lever") && rule.failureId === "dead_battery") {
        // Spongy brakes eliminate battery issues as primary cause
        continue;
      }

      diagnoses.push(buildDiagnosisFromFailure(rule.failureId, confidencePercent));
    }
  }

  // Sort by highest confidence
  return diagnoses.sort((a, b) => b.confidence - a.confidence);
}

export interface EvaluateSymptomsResult {
  firedRules: string[];
  confidenceUpdates: Map<string, number>;
}

export async function evaluateSymptoms(symptoms: string[]): Promise<EvaluateSymptomsResult> {
  const firedRules: string[] = [];
  const confidenceUpdates = new Map<string, number>();

  const diagnoses = runSymptomDiagnosis(symptoms);
  for (const diag of diagnoses) {
    firedRules.push(diag.issue);
    const delta = diag.confidence / 100;
    
    const failure = (failuresData as FailureMode[]).find(f => f.id === diag.id);
    if (failure) {
      confidenceUpdates.set(failure.partId, delta);
    }
  }

  return {
    firedRules,
    confidenceUpdates
  };
}