/**
 * MotoAI Brain — Core Type Definitions
 *
 * Shared types for the Rule Engine, Knowledge Graph, Protocol Engine,
 * Evidence Engine, and Workflow Engine.
 */

// ---------------------------------------------------------------------------
// Knowledge Graph Types
// ---------------------------------------------------------------------------

export interface Part {
  id: string;
  name: string;
  category: string;
  subsystem: string;
  accessPath: string[];
  tools: string[];
  symptoms: string[];
  relatedParts: string[];
  criticality: "low" | "medium" | "high" | "critical";
  inspectionProtocol: string;
  repairProtocol: string;
  commonIssues: string[];
  estimatedCost: { min: number; max: number; currency: string };
}

export interface Relationship {
  id: string;
  source: string;
  target: string;
  type: string;
  description: string;
}

export interface GraphNode {
  part: Part;
  relationships: Relationship[];
  depth: number;
}

// ---------------------------------------------------------------------------
// Rule Engine Types
// ---------------------------------------------------------------------------

export type ConditionOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";

export interface RuleCondition {
  fact: string;
  operator: ConditionOperator;
  value: string | number | boolean;
}

export interface RuleAction {
  type: "suggest_inspection" | "update_confidence" | "stop_diagnosis" | "set_severity";
  target?: string;
  part?: string;
  reason?: string;
  delta?: number;
  level?: string;
}

export interface Rule {
  id: string;
  name: string;
  priority: number;
  category?: string;
  triggerSymptom?: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  description: string;
}

export interface EvaluationResult {
  firedRules: string[];
  suggestedInspections: string[];
  confidenceUpdates: Map<string, number>;
  shouldStop: boolean;
  stopReason: string | null;
  severity: string | null;
}

// ---------------------------------------------------------------------------
// Protocol Engine Types
// ---------------------------------------------------------------------------

export interface ProtocolStep {
  order: number;
  instruction: string;
  expected: string | null;
  failCondition: string | null;
}

export interface InspectionProtocol {
  id: string;
  name: string;
  partId: string;
  estimatedMinutes: number;
  steps: ProtocolStep[];
  passThreshold: number;
  nextProtocolOnPass: string | null;
  nextProtocolOnFail: string | null;
}

export interface ProtocolSession {
  protocolId: string;
  currentStepIndex: number;
  passedSteps: number[];
  failedSteps: number[];
  completed: boolean;
  passed: boolean;
}

// ---------------------------------------------------------------------------
// Evidence Engine Types
// ---------------------------------------------------------------------------

export interface Observation {
  symptomId: string;
  confirmed: boolean;
  timestamp: string;
  source: "user_input" | "voice" | "inspection" | "sensor";
}

export interface ConfidenceScore {
  partId: string;
  score: number; // 0.0 to 1.0
  reasons: string[];
}

export interface PartStatus {
  partId: string;
  eliminated: boolean;
  eliminationReason: string | null;
  confidence: number;
  inspectionsCompleted: string[];
}

// ---------------------------------------------------------------------------
// Workflow Engine Types
// ---------------------------------------------------------------------------

export interface WorkflowStep {
  order: number;
  instruction: string;
  dependency: string | null;
  verificationRequired: boolean;
  locked: boolean;
  verified: boolean;
}

export interface RepairWorkflow {
  id: string;
  name: string;
  partId: string;
  difficulty: string;
  estimatedMinutes: number;
  tools: string[];
  reassemblySteps: boolean;
  steps: WorkflowStep[];
}

export interface WorkflowSession {
  workflowId: string;
  currentStepIndex: number;
  verifiedSteps: Set<number>;
  completed: boolean;
  startedAt: string | null;
  completedAt: string | null;
  isReversed: boolean;
}