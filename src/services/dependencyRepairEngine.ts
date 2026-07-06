/**
 * MotoAI Dependency Repair Engine (Phase 6.3)
 *
 * Dynamically generates repair paths from the Knowledge Graph.
 * Never hardcodes repair order — the path is computed at runtime.
 *
 * Workflow:
 *   Need Spark Plug → Knowledge Graph → Side Cover → Ignition Cap → Spark Plug
 *
 * The engine:
 * 1. Resolves the access path from the Knowledge Graph
 * 2. Resolves functional dependencies (what powers/feeds the target)
 * 3. Generates step-by-step repair instructions dynamically
 * 4. Generates reverse assembly for reassembly
 * 5. Finds all blocking parts
 * 6. Estimates total repair time
 * 7. Integrates with Workflow Engine
 *
 * Pure TypeScript — no UI, no React, no Firebase.
 * Unit-test friendly.
 */
import type { Part, RepairWorkflow, WorkflowStep } from "./knowledgeTypes";
import { findAccessPath, findDependencies, generateRepairSequence } from "./knowledgeGraph";
import { startWorkflow, getWorkflow, verifyStep } from "./workflowEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RepairPathStep {
  /** The part involved in this step */
  partId: string;
  /** The part's display name */
  partName: string;
  /** What action to perform */
  action: "access" | "disconnect" | "remove" | "install" | "reconnect" | "test";
  /** The instruction text */
  instruction: string;
  /** Whether this step requires verification */
  requiresVerification: boolean;
  /** Which step must be verified before this one can proceed */
  dependencyStepIndex: number | null;
  /** Estimated minutes for this step */
  estimatedMinutes: number;
  /** Tools needed for this step */
  tools: string[];
}

export interface GeneratedRepairPath {
  /** The target part being repaired/replaced */
  targetPartId: string;
  /** Fully qualified path steps */
  steps: RepairPathStep[];
  /** Total estimated minutes */
  totalMinutes: number;
  /** Parts that block access to the target */
  blockingParts: Part[];
  /** Tools needed across all steps */
  requiredTools: string[];
  /** Difficulty assessment */
  difficulty: "beginner" | "intermediate" | "expert";
}

/**
 * Step generation actions with their corresponding keywords.
 * Maps part access requirements to natural instruction templates.
 */
const ACTION_TEMPLATES: Record<string, {
  access: string[];
  disconnect: string[];
  remove: string[];
  install: string[];
  reconnect: string[];
  test: string[];
}> = {
  seat: {
    access: ["Open the seat lock and lift the seat to access the {part} area"],
    disconnect: ["Disconnect any seat latch sensor wires"],
    remove: ["Remove the seat entirely and set it aside"],
    install: ["Position the seat over the mounting points and press down to lock"],
    reconnect: ["Reconnect the seat latch sensor"],
    test: ["Verify the seat is securely locked by pulling up gently"],
  },
  battery_cover: {
    access: ["Locate the battery cover plate"],
    disconnect: [],
    remove: ["Remove the battery cover by unscrewing the retaining screws or releasing the clips"],
    install: ["Align the battery cover and secure it with screws or clips"],
    reconnect: [],
    test: ["Verify the cover is secure"],
  },
  fuel_tank: {
    access: ["Ensure the engine is cold before working near the fuel tank"],
    disconnect: ["Turn the fuel tap to OFF position. Disconnect the fuel line from the tank"],
    remove: ["Remove the fuel tank mounting bolts (2 at front, 1 at rear). Lift the tank carefully and set it on a soft surface"],
    install: ["Position the fuel tank on the frame. Install and tighten the mounting bolts"],
    reconnect: ["Reconnect the fuel line to the tank. Turn fuel tap to ON and check for leaks"],
    test: ["Start the engine and verify no fuel leaks around the tank connections"],
  },
  spark_plug_cap: {
    access: ["Locate the spark plug cap at the end of the ignition wire"],
    disconnect: ["Grasp the spark plug cap firmly and pull straight out. Do not pull on the wire itself"],
    remove: [],
    install: ["Push the spark plug cap onto the new spark plug terminal until it clicks into place"],
    reconnect: [],
    test: ["Verify the cap is fully seated by giving it a gentle tug"],
  },
  spark_plug: {
    access: ["Clean the area around the spark plug with compressed air to prevent debris from falling into the cylinder"],
    disconnect: [],
    remove: ["Use a spark plug socket and ratchet to loosen and remove the old spark plug (counter-clockwise)"],
    install: ["Apply a small amount of anti-seize to the new spark plug threads. Start threading by hand to prevent cross-threading. Tighten to the specified torque (12-15 Nm)"],
    reconnect: [],
    test: ["Start the engine and verify smooth idle and acceleration"],
  },
  ignition_coil: {
    access: ["Access may require removing the fuel tank first"],
    disconnect: ["Disconnect the electrical connector from the ignition coil"],
    remove: ["Remove the ignition coil mounting bolts and lift out the coil"],
    install: ["Position the new ignition coil and secure with mounting bolts"],
    reconnect: ["Reconnect the electrical connector to the ignition coil"],
    test: ["Start the engine and verify spark is present at all cylinders"],
  },
  battery: {
    access: ["Open the seat to access the battery compartment"],
    disconnect: ["Loosen the negative terminal bolt (black, marked -) using an 8mm or 10mm wrench. Disconnect and secure the cable away from the battery"],
    remove: ["Loosen the positive terminal bolt (red, marked +) and disconnect. Remove the battery hold-down clamp. Lift the old battery out carefully"],
    install: ["Place the new battery in the tray ensuring correct orientation. Reinstall the hold-down clamp"],
    reconnect: ["Apply dielectric grease to terminals. Connect the POSITIVE terminal first (red) and tighten. Connect the NEGATIVE terminal second (black) and tighten"],
    test: ["Turn ignition ON. Verify dash lights illuminate. Press start to test"],
  },
  main_fuse: {
    access: ["Open the fuse box cover near the battery"],
    disconnect: [],
    remove: ["Remove the blown fuse using pliers or the fuse puller tool"],
    install: ["Install the new fuse of the exact same amperage rating"],
    reconnect: [],
    test: ["Verify electrical systems power on. If the new fuse blows immediately, there is a short circuit"],
  },
  starter_relay: {
    access: ["Locate the starter relay in the relay box near the battery"],
    disconnect: ["Unplug the two small signal wires from the relay"],
    remove: ["Remove the two large terminal nuts and disconnect the battery and starter wires. Remove the old relay"],
    install: ["Install the new relay in the same orientation"],
    reconnect: ["Reconnect the large battery and starter wires to the correct terminals. Tighten nuts. Reconnect the two small signal wires"],
    test: ["Press the start button and verify the relay clicks and the starter engages"],
  },
  starter_motor: {
    access: ["Remove the right side engine cover to access the starter motor"],
    disconnect: ["Disconnect the starter motor electrical lead"],
    remove: ["Remove the starter motor mounting bolts. Pull the starter motor out of the housing"],
    install: ["Insert the new starter motor into the housing. Align the mounting holes"],
    reconnect: ["Reconnect the starter motor electrical lead. Tighten securely"],
    test: ["Press the start button and verify the starter engages and turns the engine"],
  },
  crank_position_sensor: {
    access: ["Locate the crank position sensor on the left side of the engine near the stator cover"],
    disconnect: ["Disconnect the sensor electrical connector"],
    remove: ["Remove the sensor mounting bolt (10mm). Pull the old sensor out"],
    install: ["Clean the sensor mounting surface. Install the new sensor with the correct air gap"],
    reconnect: ["Reconnect the sensor electrical connector. Tighten the mounting bolt"],
    test: ["Start the engine and verify the check engine light is off. Verify RPM gauge works"],
  },
  ecu: {
    access: ["Locate the ECU under the seat or in the ECU compartment"],
    disconnect: ["Disconnect all ECU connectors (label them if needed for reassembly) — release the locking clips first"],
    remove: ["Remove the ECU mounting bolts/screws. Lift the ECU out"],
    install: ["Place the new ECU in the mounting position. Secure with mounting bolts"],
    reconnect: ["Reconnect all ECU connectors in the correct positions. Ensure locking clips engage"],
    test: ["Turn ignition ON. Verify the check engine light cycles correctly. Start the engine and verify normal operation"],
  },
  fuel_pump: {
    access: ["Relieve fuel system pressure by removing the fuel pump fuse and cranking the engine for 3 seconds. Reinstall the fuse"],
    disconnect: ["Disconnect the fuel pump electrical connector. Disconnect the fuel line from the pump assembly using a fuel line clamp"],
    remove: ["Remove the fuel pump retaining ring or bolts. Lift the fuel pump assembly out of the tank"],
    install: ["Install the new fuel pump assembly with a new gasket/seal. Ensure it is properly seated"],
    reconnect: ["Reconnect the fuel line. Reconnect the fuel pump electrical connector"],
    test: ["Turn ignition ON and listen for the 2-second fuel pump prime sound. Check for fuel leaks at all connections"],
  },
  fuel_filter: {
    access: ["Locate the fuel filter along the fuel line. Place a container below to catch drips"],
    disconnect: ["Clamp the fuel line on both sides of the filter using fuel line clamps"],
    remove: ["Loosen the hose clamps. Remove the old fuel filter"],
    install: ["Install the new filter matching the direction arrow (points toward the injector/engine)"],
    reconnect: ["Tighten the hose clamps securely. Remove the fuel line clamps"],
    test: ["Turn ignition ON to prime the fuel system. Check for leaks. Start the engine and verify normal operation"],
  },
  wiring_harness: {
    access: ["Disconnect the battery negative terminal for safety. Remove the fuel tank and side panels to access the wiring harness"],
    disconnect: ["Locate the damaged section of the wiring harness"],
    remove: ["Cut out the damaged section of wire. Strip insulation back 10mm on both ends"],
    install: ["Splice in a new wire of the same gauge using solder and heat shrink tubing"],
    reconnect: ["Wrap the repaired section with electrical tape. Secure the harness with zip ties"],
    test: ["Reconnect the battery. Test the affected circuit. Verify all electrical functions work"],
  },
  voltage_regulator: {
    access: ["Locate the voltage regulator/rectifier on the right side of the frame"],
    disconnect: ["Disconnect the electrical connector from the regulator"],
    remove: ["Remove the regulator mounting bolts. Remove the regulator"],
    install: ["Apply thermal compound to the back of the new regulator (if required). Position and secure with mounting bolts"],
    reconnect: ["Reconnect the electrical connector to the regulator"],
    test: ["Start the engine. Measure battery voltage at 2000 RPM — should read 13.5V to 14.5V"],
  },
};

/** Default fallback templates for unknown parts */
const DEFAULT_TEMPLATES = {
  access: ["Locate the {part} on the motorcycle"],
  disconnect: ["Disconnect any electrical connectors or cables attached to the {part}"],
  remove: ["Remove the {part} by loosening its mounting fasteners. Keep all fasteners organized"],
  install: ["Install the new {part} in the correct position. Tighten all mounting fasteners"],
  reconnect: ["Reconnect any electrical connectors or cables that were disconnected"],
  test: ["Verify the {part} is functioning correctly. Test the motorcycle operation"],
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generates a complete, dynamic repair path for the given target part.
 * The path is computed at runtime using the following process:
 *
 * 1. Query the Knowledge Graph for the target part
 * 2. Find all blocking parts (parts that must be removed to access the target)
 * 3. Find all functional dependencies
 * 4. Generate step-by-step instructions for each part
 * 5. Sequence everything in the correct order
 *
 * @param targetPartId - The part to repair/replace (e.g. "spark_plug")
 * @returns GeneratedRepairPath with all steps, tools, and estimates
 */
export async function generateRepairPath(targetPartId: string): Promise<GeneratedRepairPath> {
  // Load the parts database
  const parts = await loadPartsMap();
  const targetPart = parts.get(targetPartId);
  if (!targetPart) {
    throw new Error(`Part not found: ${targetPartId}`);
  }

  // Step 1: Find blocking parts (access path)
  const blockingParts = await findBlockingParts(targetPartId);

  // Step 2: Find functional dependencies from the Knowledge Graph
  const deps = await findDependencies(targetPartId);
  const dependencyPartIds = deps
    .filter((d) => d.part.id !== targetPartId && d.depth > 0)
    .map((d) => d.part.id);

  // Step 3: Build the complete part sequence
  // Order: dependencies → blocking parts → target part
  const partSequence: string[] = [];
  const seen = new Set<string>();

  // Add dependency parts (first, what powers/feeds the target)
  for (const depId of dependencyPartIds) {
    if (!seen.has(depId)) {
      seen.add(depId);
      partSequence.push(depId);
    }
  }

  // Add blocking parts (second, what covers the target)
  for (const bp of blockingParts) {
    if (!seen.has(bp.id)) {
      seen.add(bp.id);
      partSequence.push(bp.id);
    }
  }

  // Add the target part itself (last)
  if (!seen.has(targetPartId)) {
    partSequence.push(targetPartId);
  }

  // Step 4: Generate steps for each part in sequence
  const steps: RepairPathStep[] = [];
  let stepIndex = 0;

  for (const partId of partSequence) {
    const part = parts.get(partId);
    if (!part) continue;

    const partSteps = generateStepsForPart(part, partId === targetPartId, stepIndex);
    for (const ps of partSteps) {
      ps.dependencyStepIndex = stepIndex > 0 ? stepIndex - 1 : null;
      steps.push(ps);
      stepIndex++;
    }
  }

  // Step 5: Calculate totals
  const totalMinutes = steps.reduce((sum, s) => sum + s.estimatedMinutes, 0);
  const requiredTools = collectTools(partSequence, parts);

  // Step 6: Determine difficulty
  const difficulty = assessDifficulty(partSequence, parts);

  return {
    targetPartId,
    steps,
    totalMinutes,
    blockingParts,
    requiredTools,
    difficulty,
  };
}

/**
 * Generates a reverse assembly path from a repair path.
 * Used for reassembly after the repair is complete.
 *
 * @param repairPath - The forward repair path
 * @returns GeneratedRepairPath in reverse order with reassembly instructions
 */
export async function generateReverseAssembly(
  repairPath: GeneratedRepairPath,
): Promise<GeneratedRepairPath> {
  if (repairPath.steps.length === 0) return repairPath;

  const reversedSteps: RepairPathStep[] = [];
  const originalSteps = [...repairPath.steps].reverse();
  let stepIndex = 0;

  for (const step of originalSteps) {
    // Map the forward action to its reverse action
    const reverseAction = getReverseAction(step.action);
    const reverseInstruction = reverseStepInstruction(step.instruction);

    reversedSteps.push({
      partId: step.partId,
      partName: step.partName,
      action: reverseAction,
      instruction: reverseInstruction,
      requiresVerification: step.requiresVerification,
      dependencyStepIndex: stepIndex > 0 ? stepIndex - 1 : null,
      estimatedMinutes: Math.max(1, Math.round(step.estimatedMinutes * 0.7)),
      tools: step.tools,
    });
    stepIndex++;
  }

  const totalMinutes = reversedSteps.reduce((sum, s) => sum + s.estimatedMinutes, 0);

  return {
    targetPartId: repairPath.targetPartId,
    steps: reversedSteps,
    totalMinutes,
    blockingParts: repairPath.blockingParts,
    requiredTools: repairPath.requiredTools,
    difficulty: repairPath.difficulty,
  };
}

/**
 * Finds all parts that block access to the target part.
 * This uses the access path from the Knowledge Graph and
 * enriches it with functional dependencies.
 *
 * @param targetPartId - The target part ID
 * @returns Array of Parts that must be removed or moved to access the target
 */
export async function findBlockingParts(targetPartId: string): Promise<Part[]> {
  // Use the Knowledge Graph's access path
  const directAccessPath = await findAccessPath(targetPartId);

  const parts = await loadPartsMap();
  const targetPart = parts.get(targetPartId);
  if (!targetPart) return [];

  const blockingParts: Part[] = [];
  const seen = new Set<string>();

  // Add direct access path parts
  for (const part of directAccessPath) {
    if (!seen.has(part.id)) {
      seen.add(part.id);
      blockingParts.push(part);
    }
  }

  // Add parts from the target's own accessPath array
  for (const pathId of targetPart.accessPath) {
    if (!seen.has(pathId)) {
      const part = parts.get(pathId);
      if (part) {
        seen.add(part.id);
        // Only add if not already included
        if (!blockingParts.find((bp) => bp.id === part.id)) {
          blockingParts.push(part);
        }
      }
    }
  }

  // For each blocking part, check if IT has blocking parts (recursive)
  // This handles cases like: spark_plug needs spark_plug_cap, which needs fuel_tank
  for (const blockingPart of [...blockingParts]) {
    for (const pathId of blockingPart.accessPath) {
      if (!seen.has(pathId)) {
        const part = parts.get(pathId);
        if (part) {
          seen.add(part.id);
          blockingParts.push(part);
        }
      }
    }
  }

  return blockingParts;
}

/**
 * Estimates the total repair time for a target part.
 * Accounts for:
 * - Time to remove blocking parts
 * - Time to perform the actual repair
 * - Time for reassembly
 * - Time for testing
 * - Complexity multiplier based on difficulty
 *
 * @param targetPartId - The target part ID
 * @returns Estimated total minutes
 */
export async function estimateRepairTime(targetPartId: string): Promise<number> {
  const path = await generateRepairPath(targetPartId);
  const reverse = await generateReverseAssembly(path);

  // Forward time + reverse time + 20% buffer for unexpected issues
  const total = path.totalMinutes + reverse.totalMinutes;
  return Math.round(total * 1.2);
}

/**
 * Converts a GeneratedRepairPath into a RepairWorkflow that can be
 * consumed by the Workflow Engine (startWorkflow, verifyStep, etc.).
 *
 * @param repairPath - The generated repair path
 * @returns A RepairWorkflow compatible with workflowEngine
 */
export async function pathToWorkflow(
  repairPath: GeneratedRepairPath,
): Promise<RepairWorkflow> {
  const workflowSteps: WorkflowStep[] = repairPath.steps.map((ps, index) => ({
    order: index + 1,
    instruction: ps.instruction,
    dependency: ps.dependencyStepIndex !== null ? `step_${ps.dependencyStepIndex + 1}_verified` : null,
    verificationRequired: ps.requiresVerification,
    locked: ps.dependencyStepIndex !== null,
    verified: false,
  }));

  // Unlock the first step
  if (workflowSteps.length > 0) {
    workflowSteps[0].locked = false;
  }

  return {
    id: `dynamic_${repairPath.targetPartId}_${Date.now()}`,
    name: `${repairPath.targetPartId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Repair`,
    partId: repairPath.targetPartId,
    difficulty: repairPath.difficulty,
    estimatedMinutes: repairPath.totalMinutes,
    tools: repairPath.requiredTools,
    reassemblySteps: true,
    steps: workflowSteps,
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
 * Generates step-by-step instructions for a specific part.
 * Uses the ACTION_TEMPLATES knowledge base to create natural instructions.
 *
 * @param part - The part to generate steps for
 * @param isTarget - Whether this is the target part (gets extra steps)
 * @param startIndex - Starting step index
 * @returns Array of RepairPathStep
 */
function generateStepsForPart(
  part: Part,
  isTarget: boolean,
  startIndex: number,
): RepairPathStep[] {
  const steps: RepairPathStep[] = [];
  const templates = ACTION_TEMPLATES[part.id] || DEFAULT_TEMPLATES;
  const partName = part.name;

  // Step 1: Access (finding and reaching the part)
  if (templates.access.length > 0) {
    for (const template of templates.access) {
      steps.push({
        partId: part.id,
        partName,
        action: "access",
        instruction: template.replace(/{part}/g, partName),
        requiresVerification: false,
        dependencyStepIndex: null,
        estimatedMinutes: 1,
        tools: part.tools,
      });
    }
  }

  // Step 2: Disconnect (electrical, fuel, or mechanical connections)
  if (templates.disconnect.length > 0) {
    for (const template of templates.disconnect) {
      steps.push({
        partId: part.id,
        partName,
        action: "disconnect",
        instruction: template.replace(/{part}/g, partName),
        requiresVerification: true,
        dependencyStepIndex: null,
        estimatedMinutes: 2,
        tools: part.tools,
      });
    }
  }

  // Step 3: Remove (take the part out)
  if (templates.remove.length > 0) {
    for (const template of templates.remove) {
      steps.push({
        partId: part.id,
        partName,
        action: "remove",
        instruction: template.replace(/{part}/g, partName),
        requiresVerification: !isTarget,
        dependencyStepIndex: null,
        estimatedMinutes: isTarget ? 3 : 2,
        tools: part.tools,
      });
    }
  }

  // If this is the target part, add install + reconnect + test
  if (isTarget) {
    // Step 4: Install (put the new/repaired part in)
    if (templates.install.length > 0) {
      for (const template of templates.install) {
        steps.push({
          partId: part.id,
          partName,
          action: "install",
          instruction: template.replace(/{part}/g, partName),
          requiresVerification: true,
          dependencyStepIndex: null,
          estimatedMinutes: 3,
          tools: part.tools,
        });
      }
    }

    // Step 5: Reconnect (restore connections)
    if (templates.reconnect.length > 0) {
      for (const template of templates.reconnect) {
        steps.push({
          partId: part.id,
          partName,
          action: "reconnect",
          instruction: template.replace(/{part}/g, partName),
          requiresVerification: true,
          dependencyStepIndex: null,
          estimatedMinutes: 2,
          tools: part.tools,
        });
      }
    }

    // Step 6: Test (verify the repair)
    if (templates.test.length > 0) {
      for (const template of templates.test) {
        steps.push({
          partId: part.id,
          partName,
          action: "test",
          instruction: template.replace(/{part}/g, partName),
          requiresVerification: true,
          dependencyStepIndex: null,
          estimatedMinutes: 2,
          tools: part.tools,
        });
      }
    }
  }

  return steps;
}

/**
 * Maps a forward action to its reverse counterpart for reassembly.
 */
function getReverseAction(action: RepairPathStep["action"]): RepairPathStep["action"] {
  const reverseMap: Record<RepairPathStep["action"], RepairPathStep["action"]> = {
    access: "install",
    disconnect: "reconnect",
    remove: "install",
    install: "install",
    reconnect: "reconnect",
    test: "test",
  };
  return reverseMap[action];
}

/**
 * Reverses a step instruction for reassembly.
 */
function reverseStepInstruction(instruction: string): string {
  let result = instruction
    .replace(/\bRemove\b/g, "Reinstall")
    .replace(/\bremove\b/g, "reinstall")
    .replace(/\bDisconnect\b/g, "Reconnect")
    .replace(/\bdisconnect\b/g, "reconnect")
    .replace(/\bLift\b/g, "Lower")
    .replace(/\blift\b/g, "lower")
    .replace(/\bLoosen\b/g, "Tighten")
    .replace(/\bloosen\b/g, "tighten")
    .replace(/\bTake out\b/g, "Put back")
    .replace(/\btake out\b/g, "put back");

  // Fix double spaces
  result = result.replace(/\s+/g, " ");

  return result;
}

/**
 * Collects all unique tools needed across a sequence of parts.
 */
function collectTools(partSequence: string[], parts: Map<string, Part>): string[] {
  const toolSet = new Set<string>();
  for (const partId of partSequence) {
    const part = parts.get(partId);
    if (part) {
      for (const tool of part.tools) {
        toolSet.add(tool);
      }
    }
  }
  // Always add safety equipment
  toolSet.add("safety_glasses");
  toolSet.add("insulated_gloves");
  return Array.from(toolSet).sort();
}

/**
 * Assesses the difficulty of a repair based on its depth.
 */
function assessDifficulty(partSequence: string[], parts: Map<string, Part>): "beginner" | "intermediate" | "expert" {
  if (partSequence.length <= 2) return "beginner";
  if (partSequence.length <= 4) return "intermediate";

  // Check if any parts require expert-level disassembly
  for (const partId of partSequence) {
    const part = parts.get(partId);
    if (part && part.criticality === "critical") return "expert";
  }

  return "expert";
}

/**
 * Returns a human-readable summary of the generated repair path.
 */
export function getRepairPathSummary(path: GeneratedRepairPath): string {
  const lines: string[] = [
    `Repair Path for: ${path.targetPartId}`,
    `Difficulty: ${path.difficulty}`,
    `Estimated time: ${path.totalMinutes} minutes`,
    `Tools needed: ${path.requiredTools.length}`,
    `Steps: ${path.steps.length}`,
    "",
    "Blocking parts (must be removed first):",
  ];

  for (const bp of path.blockingParts) {
    lines.push(`  - ${bp.name} (${bp.id})`);
  }

  lines.push("", "Step-by-step:");

  for (let i = 0; i < path.steps.length; i++) {
    const step = path.steps[i];
    const dep = step.dependencyStepIndex !== null ? ` [after step ${step.dependencyStepIndex + 1}]` : "";
    lines.push(`  ${i + 1}. [${step.action}] ${step.instruction}${dep}`);
  }

  return lines.join("\n");
}

/**
 * Renders a tool ID to a human-readable name.
 */
export function getToolName(toolId: string): string {
  const toolNames: Record<string, string> = {
    "8mm_wrench": "8mm Combination Wrench",
    "10mm_wrench": "10mm Combination Wrench",
    "12mm_wrench": "12mm Combination Wrench",
    "socket_set": "Socket Set (8-14mm)",
    "spark_plug_socket": "Spark Plug Socket (16mm or 18mm)",
    "feeler_gauge": "Feeler Gauge",
    "torque_wrench": "Torque Wrench (5-50 Nm)",
    "screwdriver": "Screwdriver Set",
    "screwdriver_set": "Screwdriver Set (Phillips + Flat)",
    "pliers": "Combination Pliers",
    "multimeter": "Digital Multimeter",
    "wire_brush": "Wire Brush (Stainless Steel)",
    "dielectric_grease": "Dielectric Grease",
    "anti_seize_compound": "Anti-Seize Compound",
    "fuel_line_clamp": "Fuel Line Clamp",
    "crimping_tool": "Crimping Tool",
    "soldering_iron": "Soldering Iron",
    "heat_shrink": "Heat Shrink Tubing",
    "electrical_tape": "Electrical Tape",
    "zip_ties": "Zip Ties (Cable Ties)",
    "container": "Small Container / Catch Pan",
    "safety_glasses": "Safety Glasses",
    "insulated_gloves": "Insulated Gloves",
    "replacement_fuse": "Replacement Fuse (correct amperage)",
    "wrench_set": "Wrench Set",
  };
  return toolNames[toolId] || toolId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}