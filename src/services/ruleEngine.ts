/**
 * MotoAI Rule Engine (Phase 3.2)
 *
 * Loads rules from knowledge/rules.json, evaluates conditions against
 * the current facts (symptoms, observations, measurements), fires matching
 * rules, and returns suggested inspections, confidence updates, and stop signals.
 *
 * Pure TypeScript — no UI, no React, no Firebase.
 * Unit-test friendly: all inputs are explicit, no side effects.
 */
import type { Rule, RuleCondition, EvaluationResult } from "./knowledgeTypes";
import { getRules as getOfflineRules, isInitialized } from "./offlineStorage";

// ---------------------------------------------------------------------------
// Knowledge Loader
// ---------------------------------------------------------------------------

let _rules: Rule[] | null = null;

/**
 * Loads rules from the knowledge base.
 * Caches in memory after first load.
 */
export async function loadRules(): Promise<Rule[]> {
  if (_rules) return _rules;
  if (isInitialized()) {
    const offlineRules = getOfflineRules();
    if (offlineRules && offlineRules.length > 0) {
      _rules = offlineRules;
      return _rules;
    }
  }
  try {
    const response = await fetch("/knowledge/rules.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    _rules = data.rules as Rule[];
    return _rules;
  } catch (err) {
    console.warn("ruleEngine: Failed to load rules.json, using inline fallback:", err);
    _rules = getDefaultRules();
    return _rules;
  }
}

/**
 * Evaluates a single condition against the current facts.
 *
 * @param condition - The condition to evaluate
 * @param facts - Key-value map of current known facts
 * @returns True if the condition is satisfied
 */
export function evaluateCondition(condition: RuleCondition, facts: Record<string, unknown>): boolean {
  // Special handling for symptom_present to support multiple simultaneous symptoms
  if (condition.fact === "symptom_present") {
    const presentSymptoms = facts["symptoms_set"] as Set<string> | undefined;
    if (presentSymptoms) {
      if (condition.operator === "eq") {
        return presentSymptoms.has(condition.value as string);
      }
      if (condition.operator === "neq") {
        return !presentSymptoms.has(condition.value as string);
      }
    }
  }

  const factValue = facts[condition.fact];

  switch (condition.operator) {
    case "eq":
      return factValue === condition.value;
    case "neq":
      return factValue !== condition.value;
    case "gt":
      return typeof factValue === "number" && typeof condition.value === "number" && factValue > condition.value;
    case "gte":
      return typeof factValue === "number" && typeof condition.value === "number" && factValue >= condition.value;
    case "lt":
      return typeof factValue === "number" && typeof condition.value === "number" && factValue < condition.value;
    case "lte":
      return typeof factValue === "number" && typeof condition.value === "number" && factValue <= condition.value;
    default:
      return false;
  }
}

/**
 * Evaluates all conditions of a rule against current facts.
 *
 * @param rule - The rule to evaluate
 * @param facts - Current known facts
 * @returns True if ALL conditions pass (AND logic)
 */
export function evaluateRule(rule: Rule, facts: Record<string, unknown>): boolean {
  for (const condition of rule.conditions) {
    if (!evaluateCondition(condition, facts)) {
      return false;
    }
  }
  return true;
}

/**
 * Fires all matching rules sorted by priority.
 * Returns a consolidated EvaluationResult with all actions.
 *
 * @param rules - Array of loaded rules
 * @param facts - Current known facts (symptoms, measurements, observations)
 * @returns EvaluationResult with suggested inspections, confidence updates, etc.
 */
export function fireRules(rules: Rule[], facts: Record<string, unknown>): EvaluationResult {
  // Sort by priority (lower number = higher priority)
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  const result: EvaluationResult = {
    firedRules: [],
    suggestedInspections: [],
    confidenceUpdates: new Map<string, number>(),
    shouldStop: false,
    stopReason: null,
    severity: null,
  };

  for (const rule of sorted) {
    if (evaluateRule(rule, facts)) {
      result.firedRules.push(rule.id);

      for (const action of rule.actions) {
        switch (action.type) {
          case "suggest_inspection":
            if (action.target && !result.suggestedInspections.includes(action.target)) {
              result.suggestedInspections.push(action.target);
            }
            break;

          case "update_confidence":
            if (action.part && action.delta) {
              const current = result.confidenceUpdates.get(action.part) || 0;
              result.confidenceUpdates.set(action.part, current + action.delta);
            }
            break;

          case "stop_diagnosis":
            result.shouldStop = true;
            if (action.reason) result.stopReason = action.reason;
            break;

          case "set_severity":
            if (action.level) result.severity = action.level;
            break;
        }
      }
    }
  }

  return result;
}

/**
 * One-shot: loads rules, evaluates against facts, returns results.
 *
 * @param symptoms - Array of symptom IDs the user has reported
 * @param measurements - Optional key-value measurements (e.g., battery_voltage: 12.1)
 * @returns EvaluationResult
 */
export async function evaluateSymptoms(
  symptoms: string[],
  measurements?: Record<string, number>,
): Promise<EvaluationResult> {
  const rules = await loadRules();

  // Build facts from symptoms and measurements
  const facts: Record<string, unknown> = {
    symptom_count: symptoms.length,
    electrical_symptom_count: 0,
    has_critical_symptom: false,
    ...(measurements || {}),
  };

  // Set present symptoms
  const symptomsSet = new Set<string>();
  for (const symptomId of symptoms) {
    symptomsSet.add(symptomId);
    facts[`symptom_present`] = symptomId; // Keep for fallback compatibility
  }
  facts["symptoms_set"] = symptomsSet;

  // Check for critical symptoms (from knowledge/symptoms.json)
  const criticalSymptoms = new Set(["engine_no_crank", "no_electrical_power"]);
  for (const s of symptoms) {
    if (criticalSymptoms.has(s)) {
      facts.has_critical_symptom = true;
      break;
    }
  }

  return fireRules(rules, facts);
}

/**
 * Returns default rules as inline fallback when knowledge/rules.json cannot be loaded.
 */
function getDefaultRules(): Rule[] {
  return [
    {
      id: "fallback_no_crank",
      name: "Fallback: No Crank",
      priority: 99,
      triggerSymptom: "engine_no_crank",
      conditions: [{ fact: "symptom_present", operator: "eq", value: "engine_no_crank" }],
      actions: [
        { type: "suggest_inspection", target: "battery_inspection", reason: "Check battery first" },
        { type: "suggest_inspection", target: "fuse_inspection", reason: "Check main fuse" },
        { type: "update_confidence", part: "battery", delta: 0.3 },
      ],
      description: "Fallback rule for no-crank scenario",
    },
  ];
}