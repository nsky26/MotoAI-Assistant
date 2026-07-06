/**
 * MotoAI Parts Recommendation Service (Phase 7.1)
 *
 * After the Inspection Engine completes a diagnosis, this service generates
 * a complete parts and tools shopping list with:
 * - Required Parts (with OEM numbers, priority, cost)
 * - Required Tools (with names and descriptions)
 * - Estimated Total Cost (parts + tools)
 * - Estimated Time (from Dependency Repair Engine)
 * - Priority (CRITICAL / HIGH / MEDIUM / LOW)
 *
 * Integrates with:
 * - Inspection Engine (reads finalDiagnosis)
 * - Dependency Repair Engine (generates repair path + tools)
 * - Knowledge Base (parts.json for costs, tool_library.json for tool info)
 * - History Service (saves recommendation to diagnosis record)
 *
 * Pure TypeScript — no UI, no React, no Firebase.
 * Unit-test friendly.
 */
import type { InspectionSession } from "./inspectionEngine";
import { generateRepairPath, estimateRepairTime, getToolName } from "./dependencyRepairEngine";
import type { Part } from "./knowledgeTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecommendedPart {
  /** Part ID from the knowledge base */
  partId: string;
  /** Human-readable part name */
  partName: string;
  /** OEM part number (manufacturer-specific) */
  oemNumber: string;
  /** Whether this part must be replaced (true) or may be reusable (false) */
  mustReplace: boolean;
  /** Estimated cost for this part in the specified currency */
  cost: number;
  /** Currency code (e.g. "INR", "USD") */
  currency: string;
  /** Priority level for this part */
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  /** Reason this part is needed */
  reason: string;
  /** Quantity needed */
  quantity: number;
  /** Common issues that lead to this part failing */
  commonIssues: string[];
}

export interface RecommendedTool {
  /** Tool ID from the tool library */
  toolId: string;
  /** Human-readable tool name */
  toolName: string;
  /** Tool category */
  category: string;
  /** Description of what the tool is used for */
  description: string;
  /** Whether the user likely already owns this tool */
  commonlyOwned: boolean;
  /** Estimated cost to purchase if not owned */
  estimatedCost: number;
}

export interface PartsRecommendation {
  /** The diagnosed part ID */
  diagnosedPartId: string;
  /** The diagnosed part name */
  diagnosedPartName: string;
  /** Confidence of the diagnosis (0-100) */
  diagnosisConfidence: number;
  /** Required parts to purchase */
  requiredParts: RecommendedPart[];
  /** Tools needed for the repair */
  requiredTools: RecommendedTool[];
  /** Total estimated cost for parts */
  totalPartsCost: number;
  /** Total estimated cost for tools (if not owned) */
  totalToolsCost: number;
  /** Overall estimated cost (parts + tools) */
  totalEstimatedCost: number;
  /** Estimated repair time in minutes */
  estimatedMinutes: number;
  /** Overall priority based on the diagnosis */
  overallPriority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  /** Whether this is a DIY-safe repair */
  isDiySafe: boolean;
  /** Suggested action for the user */
  suggestedAction: string;
  /** Timestamp when this recommendation was generated */
  generatedAt: string;
}

// ---------------------------------------------------------------------------
// OEM Number Mapping
// ---------------------------------------------------------------------------

/**
 * OEM part numbers for the Bajaj Pulsar 150.
 * In production, these would come from a parts API or expanded database.
 */
const OEM_NUMBERS: Record<string, string> = {
  spark_plug: "NGK CR8E / BOSCH UR5DC",
  ignition_coil: "JE200134 / DS201234",
  battery: "12N8-4A / MF-8AH",
  main_fuse: "15A Blade Type (JG150032)",
  starter_relay: "JS100567 / 5WL-81940-00",
  starter_motor: "JS101234 / 3S3-81890-00",
  crank_position_sensor: "JG150456 / 5TJ-85590-00",
  fuel_pump: "JE200567 / FP150-001",
  fuel_filter: "FF150-001 / JG150789",
  wiring_harness: "WH150-001 / JE200890",
  ecu: "ECU150-001 / JE201234",
  voltage_regulator: "RR150-001 / JG150234",
  fuel_injector: "FI150-001 / JE200345",
  air_filter: "AF150-001 / JG150567",
  spark_plug_cap: "SC150-001 / JG150678",
  starter_clutch: "SCL150-001 / JS101345",
  alternator_stator: "AS150-001 / JG150789",
};

// ---------------------------------------------------------------------------
// Tool Cost Estimates
// ---------------------------------------------------------------------------

const TOOL_COSTS: Record<string, number> = {
  multimeter: 800,
  "8mm_wrench": 150,
  "10mm_wrench": 150,
  "12mm_wrench": 150,
  spark_plug_socket: 250,
  socket_set: 600,
  feeler_gauge: 200,
  torque_wrench: 1200,
  screwdriver: 200,
  screwdriver_set: 350,
  pliers: 200,
  wire_brush: 100,
  dielectric_grease: 150,
  anti_seize_compound: 200,
  fuel_line_clamp: 150,
  crimping_tool: 400,
  soldering_iron: 500,
  heat_shrink: 100,
  electrical_tape: 80,
  zip_ties: 80,
  container: 50,
  safety_glasses: 200,
  insulated_gloves: 300,
  replacement_fuse: 20,
  wrench_set: 800,
};

/** Tools commonly found in home toolkits */
const COMMONLY_OWNED_TOOLS = new Set([
  "screwdriver",
  "screwdriver_set",
  "pliers",
  "socket_set",
  "8mm_wrench",
  "10mm_wrench",
  "electrical_tape",
  "zip_ties",
  "container",
]);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a complete parts and tools recommendation from an inspection session.
 * This is the main function to call after a diagnosis completes.
 *
 * @param session - The completed InspectionSession with finalDiagnosis
 * @returns PartsRecommendation with all required parts, tools, costs, and estimates
 */
export async function generateRecommendation(
  session: InspectionSession,
): Promise<PartsRecommendation> {
  if (!session.finalDiagnosis) {
    throw new Error("Inspection session has no final diagnosis. Complete the inspection first.");
  }

  const partId = session.finalDiagnosis.partId;
  const partName = session.finalDiagnosis.partName;
  const confidence = session.finalDiagnosis.confidence;
  const isCritical = session.finalDiagnosis.reason.toLowerCase().includes("critical");

  // Get repair path and time estimate from Dependency Repair Engine
  const repairPath = await generateRepairPath(partId);
  const estimatedMinutes = await estimateRepairTime(partId);

  // Generate required parts list
  const requiredParts = await generateRequiredParts(partId, isCritical);

  // Generate required tools list
  const requiredTools = generateRequiredTools(repairPath.requiredTools);

  // Calculate costs
  const totalPartsCost = requiredParts.reduce((sum, p) => sum + p.cost * p.quantity, 0);
  const totalToolsCost = requiredTools
    .filter((t) => !t.commonlyOwned)
    .reduce((sum, t) => sum + t.estimatedCost, 0);
  const totalEstimatedCost = totalPartsCost + totalToolsCost;

  // Determine overall priority
  const overallPriority = determinePriority(session, isCritical);

  // Determine if DIY safe
  const isDiySafe = repairPath.difficulty !== "expert" && !isCritical;

  // Generate suggested action
  const suggestedAction = generateSuggestedAction(overallPriority, isDiySafe, partName, totalEstimatedCost);

  return {
    diagnosedPartId: partId,
    diagnosedPartName: partName,
    diagnosisConfidence: Math.round(confidence * 100),
    requiredParts,
    requiredTools,
    totalPartsCost,
    totalToolsCost,
    totalEstimatedCost,
    estimatedMinutes,
    overallPriority,
    isDiySafe,
    suggestedAction,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates the parts recommendation directly from a diagnosed part ID.
 * Used when the InspectionEngine session is not available but the part is known.
 *
 * @param partId - The diagnosed part ID (e.g. "spark_plug")
 * @param confidence - Confidence level (0.0 to 1.0)
 * @param isCritical - Whether the issue is critical
 * @returns PartsRecommendation
 */
export async function generateRecommendationFromPart(
  partId: string,
  confidence: number = 0.95,
  isCritical: boolean = false,
): Promise<PartsRecommendation> {
  const parts = await loadPartsMap();
  const part = parts.get(partId);

  const partName = part?.name || partId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const repairPath = await generateRepairPath(partId);
  const estimatedMinutes = await estimateRepairTime(partId);

  const requiredParts = await generateRequiredParts(partId, isCritical);
  const requiredTools = generateRequiredTools(repairPath.requiredTools);

  const totalPartsCost = requiredParts.reduce((sum, p) => sum + p.cost * p.quantity, 0);
  const totalToolsCost = requiredTools
    .filter((t) => !t.commonlyOwned)
    .reduce((sum, t) => sum + t.estimatedCost, 0);

  const priority = isCritical ? "CRITICAL" : "HIGH";
  const isDiySafe = repairPath.difficulty !== "expert" && !isCritical;
  const suggestedAction = generateSuggestedAction(priority, isDiySafe, partName, totalPartsCost + totalToolsCost);

  return {
    diagnosedPartId: partId,
    diagnosedPartName: partName,
    diagnosisConfidence: Math.round(confidence * 100),
    requiredParts,
    requiredTools,
    totalPartsCost,
    totalToolsCost,
    totalEstimatedCost: totalPartsCost + totalToolsCost,
    estimatedMinutes,
    overallPriority: priority,
    isDiySafe,
    suggestedAction,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Converts a PartsRecommendation into a structured shopping list object.
 * Can be saved to Firestore via the History Service.
 *
 * @param recommendation - The generated recommendation
 * @returns A plain object suitable for storage
 */
export function recommendationToShoppingList(recommendation: PartsRecommendation): Record<string, unknown> {
  return {
    diagnosedPart: recommendation.diagnosedPartName,
    confidence: recommendation.diagnosisConfidence,
    priority: recommendation.overallPriority,
    isDiySafe: recommendation.isDiySafe,
    suggestedAction: recommendation.suggestedAction,
    estimatedMinutes: recommendation.estimatedMinutes,
    totalCost: recommendation.totalEstimatedCost,
    parts: recommendation.requiredParts.map((p) => ({
      name: p.partName,
      oem: p.oemNumber,
      quantity: p.quantity,
      cost: p.cost,
      priority: p.priority,
      reason: p.reason,
    })),
    tools: recommendation.requiredTools.map((t) => ({
      name: t.toolName,
      owned: t.commonlyOwned,
      cost: t.commonlyOwned ? 0 : t.estimatedCost,
    })),
    generatedAt: recommendation.generatedAt,
  };
}

// ---------------------------------------------------------------------------
// Internal Helpers
// ---------------------------------------------------------------------------

/**
 * Loads the parts database from knowledge/parts.json.
 */
async function loadPartsMap(): Promise<Map<string, Part>> {
  try {
    const res = await fetch("/knowledge/parts.json");
    const data = await res.json();
    const map = new Map<string, Part>();
    for (const p of data.parts) map.set(p.id, p as Part);
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Generates the list of required parts for a diagnosed issue.
 * Includes the main part plus any commonly replaced associated parts.
 *
 * @param diagnosedPartId - The diagnosed part
 * @param isCritical - Whether the issue is critical
 * @returns Array of RecommendedPart
 */
async function generateRequiredParts(
  diagnosedPartId: string,
  isCritical: boolean,
): Promise<RecommendedPart[]> {
  const parts = await loadPartsMap();
  const mainPart = parts.get(diagnosedPartId);
  const partsList: RecommendedPart[] = [];

  if (!mainPart) {
    // Unknown part — generate generic entry
    partsList.push({
      partId: diagnosedPartId,
      partName: diagnosedPartId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      oemNumber: OEM_NUMBERS[diagnosedPartId] || "Consult service manual",
      mustReplace: true,
      cost: 0,
      currency: "INR",
      priority: isCritical ? "CRITICAL" : "HIGH",
      reason: "Diagnosed faulty component",
      quantity: 1,
      commonIssues: [],
    });
    return partsList;
  }

  // Primary part — the diagnosed component
  partsList.push({
    partId: mainPart.id,
    partName: mainPart.name,
    oemNumber: OEM_NUMBERS[mainPart.id] || "Consult service manual",
    mustReplace: true,
    cost: mainPart.estimatedCost.min,
    currency: mainPart.estimatedCost.currency,
    priority: isCritical ? "CRITICAL" : mainPart.criticality === "high" ? "HIGH" : "MEDIUM",
    reason: `Diagnosed as root cause. ${mainPart.commonIssues.slice(0, 2).join(", ")}`,
    quantity: 1,
    commonIssues: mainPart.commonIssues,
  });

  // Associated consumables — parts often replaced alongside
  const consumables = getConsumablesForPart(diagnosedPartId);
  for (const con of consumables) {
    const conPart = parts.get(con.partId);
    partsList.push({
      partId: con.partId,
      partName: conPart?.name || con.partId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      oemNumber: OEM_NUMBERS[con.partId] || "Standard part",
      mustReplace: con.mustReplace,
      cost: conPart?.estimatedCost.min || con.estimatedCost,
      currency: conPart?.estimatedCost.currency || "INR",
      priority: con.mustReplace ? "HIGH" : "LOW",
      reason: con.reason,
      quantity: con.quantity || 1,
      commonIssues: conPart?.commonIssues || [],
    });
  }

  // Gaskets/seals if the repair requires removing covers
  const gaskets = getGasketsForPart(diagnosedPartId);
  for (const gasket of gaskets) {
    partsList.push({
      partId: gasket.partId,
      partName: gasket.partName,
      oemNumber: gasket.oemNumber,
      mustReplace: true,
      cost: gasket.estimatedCost,
      currency: "INR",
      priority: "MEDIUM",
      reason: gasket.reason,
      quantity: 1,
      commonIssues: [],
    });
  }

  return partsList;
}

/**
 * Generates the list of required tools for a repair.
 *
 * @param toolIds - Array of tool IDs from the dependency repair engine
 * @returns Array of RecommendedTool
 */
function generateRequiredTools(toolIds: string[]): RecommendedTool[] {
  const toolLibrary = getToolLibrary();
  const tools: RecommendedTool[] = [];

  for (const toolId of toolIds) {
    const libEntry = toolLibrary.find((t) => t.id === toolId);
    tools.push({
      toolId,
      toolName: libEntry?.name || getToolName(toolId),
      category: libEntry?.category || "unknown",
      description: libEntry?.description || "",
      commonlyOwned: COMMONLY_OWNED_TOOLS.has(toolId),
      estimatedCost: TOOL_COSTS[toolId] || 0,
    });
  }

  return tools;
}

/**
 * Determines the overall priority of the recommendation.
 */
function determinePriority(
  session: InspectionSession,
  isCritical: boolean,
): "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" {
  if (isCritical) return "CRITICAL";

  // Check severity of symptoms
  const criticalSymptoms = new Set(["engine_no_crank", "no_electrical_power", "engine_cranks_no_start"]);
  for (const symptom of session.symptoms) {
    if (criticalSymptoms.has(symptom)) return "HIGH";
  }

  // Check confidence
  if (session.finalDiagnosis && session.finalDiagnosis.confidence > 0.8) return "HIGH";

  return "MEDIUM";
}

/**
 * Generates a suggested action text for the user.
 */
function generateSuggestedAction(
  priority: string,
  isDiySafe: boolean,
  partName: string,
  totalCost: number,
): string {
  if (!isDiySafe) {
    return `CRITICAL: ${partName} repair requires professional expertise. Please visit a certified mechanic. Estimated cost: ₹${totalCost.toLocaleString("en-IN")}. Do not attempt DIY.`;
  }

  if (priority === "CRITICAL" || priority === "HIGH") {
    return `Recommended: Replace ${partName} as soon as possible. Estimated cost: ₹${totalCost.toLocaleString("en-IN")}. DIY-safe with proper tools.`;
  }

  return `Consider replacing ${partName} at your earliest convenience. Estimated cost: ₹${totalCost.toLocaleString("en-IN")}.`;
}

/**
 * Returns consumable parts that are often replaced alongside the main part.
 */
function getConsumablesForPart(partId: string): Array<{
  partId: string;
  mustReplace: boolean;
  reason: string;
  quantity: number;
  estimatedCost: number;
}> {
  const consumablesMap: Record<string, Array<{
    partId: string;
    mustReplace: boolean;
    reason: string;
    quantity: number;
    estimatedCost: number;
  }>> = {
    spark_plug: [
      { partId: "spark_plug_cap", mustReplace: false, reason: "Inspect cap condition — replace if cracked or loose", quantity: 1, estimatedCost: 150 },
    ],
    battery: [
      { partId: "dielectric_grease", mustReplace: false, reason: "Recommended for terminal protection", quantity: 1, estimatedCost: 150 },
    ],
    fuel_filter: [
      { partId: "fuel_line_clamp", mustReplace: false, reason: "Consider replacing hose clamps if rusted", quantity: 2, estimatedCost: 50 },
    ],
    ignition_coil: [
      { partId: "spark_plug_cap", mustReplace: true, reason: "Always replace spark plug cap with ignition coil", quantity: 1, estimatedCost: 150 },
      { partId: "spark_plug", mustReplace: false, reason: "Inspect spark plug — replace if fouled", quantity: 1, estimatedCost: 200 },
    ],
    wiring_harness: [
      { partId: "electrical_tape", mustReplace: true, reason: "Required for harness repair", quantity: 1, estimatedCost: 80 },
      { partId: "zip_ties", mustReplace: true, reason: "Required for harness securing", quantity: 5, estimatedCost: 80 },
      { partId: "heat_shrink", mustReplace: true, reason: "Required for wire splicing", quantity: 3, estimatedCost: 100 },
    ],
    voltage_regulator: [
      { partId: "thermal_compound", mustReplace: false, reason: "Thermal compound may be needed for heat transfer", quantity: 1, estimatedCost: 100 },
    ],
  };

  return consumablesMap[partId] || [];
}

/**
 * Returns gaskets/seals that should be replaced for certain repairs.
 */
function getGasketsForPart(partId: string): Array<{
  partId: string;
  partName: string;
  oemNumber: string;
  estimatedCost: number;
  reason: string;
}> {
  const gasketMap: Record<string, Array<{
    partId: string;
    partName: string;
    oemNumber: string;
    estimatedCost: number;
    reason: string;
  }>> = {
    fuel_pump: [
      { partId: "fuel_pump_gasket", partName: "Fuel Pump Gasket/Seal", oemNumber: "FP-GSK-001", estimatedCost: 100, reason: "Gasket must be replaced when removing fuel pump assembly" },
    ],
    crank_position_sensor: [
      { partId: "stator_cover_gasket", partName: "Stator Cover Gasket", oemNumber: "SC-GSK-001", estimatedCost: 80, reason: "Cover gasket may need replacement if damaged during access" },
    ],
    starter_motor: [
      { partId: "starter_mount_gasket", partName: "Starter Mount Gasket", oemNumber: "SM-GSK-001", estimatedCost: 80, reason: "Gasket may be damaged when removing starter motor" },
    ],
  };

  return gasketMap[partId] || [];
}

/**
 * Returns a minimal in-memory tool library for name/description resolution.
 */
function getToolLibrary(): Array<{ id: string; name: string; category: string; description: string }> {
  return [
    { id: "multimeter", name: "Digital Multimeter", category: "electrical_test", description: "For measuring voltage, resistance, continuity" },
    { id: "8mm_wrench", name: "8mm Combination Wrench", category: "hand_tool", description: "Commonly used for battery terminals, small bolts" },
    { id: "10mm_wrench", name: "10mm Combination Wrench", category: "hand_tool", description: "Most common size on Pulsar 150" },
    { id: "12mm_wrench", name: "12mm Combination Wrench", category: "hand_tool", description: "Used for starter motor bolts and engine covers" },
    { id: "spark_plug_socket", name: "Spark Plug Socket (16mm/18mm)", category: "hand_tool", description: "Deep socket with rubber insert for spark plug removal" },
    { id: "socket_set", name: "Socket Set (8-14mm)", category: "hand_tool", description: "Ratchet and socket set for general work" },
    { id: "feeler_gauge", name: "Feeler Gauge", category: "measurement", description: "For measuring spark plug gap and valve clearances" },
    { id: "torque_wrench", name: "Torque Wrench (5-50 Nm)", category: "hand_tool", description: "For precise tightening of spark plugs and critical bolts" },
    { id: "screwdriver_set", name: "Screwdriver Set (Phillips + Flat)", category: "hand_tool", description: "For removing panels, clamps, and connectors" },
    { id: "pliers", name: "Combination Pliers", category: "hand_tool", description: "For pulling fuses, gripping, bending" },
    { id: "wire_brush", name: "Wire Brush (Stainless Steel)", category: "cleaning", description: "For cleaning battery terminals and corrosion" },
    { id: "dielectric_grease", name: "Dielectric Grease", category: "consumable", description: "Prevents terminal corrosion" },
    { id: "anti_seize_compound", name: "Anti-Seize Compound", category: "consumable", description: "Prevents spark plug thread seizing" },
    { id: "fuel_line_clamp", name: "Fuel Line Clamp", category: "hand_tool", description: "Pinches fuel line to prevent flow" },
    { id: "crimping_tool", name: "Crimping Tool", category: "electrical_tool", description: "For crimping electrical connectors" },
    { id: "soldering_iron", name: "Soldering Iron", category: "electrical_tool", description: "For soldering wire splices" },
    { id: "heat_shrink", name: "Heat Shrink Tubing", category: "consumable", description: "Insulates soldered wire connections" },
    { id: "electrical_tape", name: "Electrical Tape", category: "consumable", description: "For wrapping repaired wires" },
    { id: "zip_ties", name: "Zip Ties (Cable Ties)", category: "consumable", description: "For securing wiring harness" },
    { id: "container", name: "Small Container / Catch Pan", category: "shop_supply", description: "For catching fuel drips" },
    { id: "safety_glasses", name: "Safety Glasses", category: "safety", description: "Always wear when working on battery or fuel system" },
    { id: "insulated_gloves", name: "Insulated Gloves", category: "safety", description: "Protects against acid and electrical shock" },
  ];
}