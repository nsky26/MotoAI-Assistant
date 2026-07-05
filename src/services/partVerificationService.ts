/**
 * MotoAI Part Verification Service (Phase 5.2)
 *
 * Verifies whether the user has completed each repair step using
 * camera-based visual analysis. Integrates with the Workflow Engine
 * to prevent step progression until verification succeeds.
 *
 * Each verification function:
 * 1. Captures a frame from the live camera
 * 2. Runs object detection to find the target part
 * 3. Analyzes the detection result against the expected state
 * 4. Returns a VerificationResult with confidence score
 *
 * The Workflow Engine's verifyStep() should only be called after
 * partVerificationService returns verified: true.
 *
 * Pure TypeScript — no UI, no React, no Firebase.
 * Unit-test friendly.
 */
import type { VerificationResult, VerificationType, VerificationConfig } from "../types/partVerification";
import { VERIFICATION_PRESETS, STEP_TO_VERIFICATION } from "../types/partVerification";
import { detect, loadModel, getModelStatus } from "./objectDetectionService";
import type { DetectionResult, DetectedPart } from "../types/objectDetection";
import type { WorkflowStep } from "./knowledgeTypes";

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * Frame buffer for consecutive verification tracking.
 * Maps a verification key to an array of recent boolean results.
 */
const _frameBuffer = new Map<string, boolean[]>();

/**
 * Maximum frames to keep in the buffer.
 */
const MAX_FRAME_BUFFER = 10;

// ---------------------------------------------------------------------------
// Public Verification Functions
// ---------------------------------------------------------------------------

/**
 * Verifies that a specific motorcycle part is currently visible in the camera frame.
 * Used for steps like "Locate the battery" or "Inspect the spark plug".
 *
 * @param videoElement - The live HTMLVideoElement from the camera
 * @param partLabel - The part label to look for (matches YOLO_CLASSES)
 * @param config - Optional custom verification config
 * @returns VerificationResult
 */
export async function verifyPartVisible(
  videoElement: HTMLVideoElement,
  partLabel: string,
  config?: Partial<VerificationConfig>,
): Promise<VerificationResult> {
  const preset = VERIFICATION_PRESETS.part_visible;
  const minConfidence = config?.minConfidence ?? preset.minConfidence ?? 0.6;
  const requiredFrames = config?.requiredFrames ?? preset.requiredFrames ?? 3;
  const key = `visible_${partLabel}`;

  return performVerification(videoElement, partLabel, "part_visible", minConfidence, requiredFrames, key, {
    passMessage: `✓ ${labelToName(partLabel)} is visible`,
    failMessage: `✗ ${labelToName(partLabel)} not detected — point camera at the part`,
    failAdvice: `Make sure ${labelToName(partLabel)} is clearly visible in the frame. Adjust camera position and lighting.`,
  });
}

/**
 * Verifies that a specific motorcycle part has been removed.
 * The part should NOT be detected in the frame.
 * Used for steps like "Remove the battery" or "Take out the spark plug".
 *
 * @param videoElement - The live HTMLVideoElement from the camera
 * @param partLabel - The part label that should be gone
 * @param config - Optional custom verification config
 * @returns VerificationResult
 */
export async function verifyPartRemoved(
  videoElement: HTMLVideoElement,
  partLabel: string,
  config?: Partial<VerificationConfig>,
): Promise<VerificationResult> {
  const preset = VERIFICATION_PRESETS.part_removed;
  const minConfidence = config?.minConfidence ?? preset.minConfidence ?? 0.7;
  const requiredFrames = config?.requiredFrames ?? preset.requiredFrames ?? 5;
  const key = `removed_${partLabel}`;

  return performAbsenceVerification(videoElement, partLabel, "part_removed", minConfidence, requiredFrames, key, {
    passMessage: `✓ ${labelToName(partLabel)} has been removed`,
    failMessage: `✗ ${labelToName(partLabel)} is still visible`,
    failAdvice: `The ${labelToName(partLabel)} is still detected in the frame. Please remove it before proceeding.`,
  });
}

/**
 * Verifies that a connector or cable is properly attached.
 * Used for steps like "Connect the battery terminal" or "Reattach the spark plug cap".
 *
 * @param videoElement - The live HTMLVideoElement from the camera
 * @param partLabel - The part label whose connector should be attached
 * @param config - Optional custom verification config
 * @returns VerificationResult
 */
export async function verifyConnectorAttached(
  videoElement: HTMLVideoElement,
  partLabel: string,
  config?: Partial<VerificationConfig>,
): Promise<VerificationResult> {
  const preset = VERIFICATION_PRESETS.connector_attached;
  const minConfidence = config?.minConfidence ?? preset.minConfidence ?? 0.65;
  const requiredFrames = config?.requiredFrames ?? preset.requiredFrames ?? 3;
  const key = `attached_${partLabel}`;

  return performVerification(videoElement, partLabel, "connector_attached", minConfidence, requiredFrames, key, {
    passMessage: `✓ ${labelToName(partLabel)} connector is attached`,
    failMessage: `✗ ${labelToName(partLabel)} connector not confirmed`,
    failAdvice: `Ensure the ${labelToName(partLabel)} connector is fully seated and locked.`,
  });
}

/**
 * Verifies that a bolt or fastener has been removed.
 * Used for steps like "Loosen the 8mm bolt" or "Remove the mounting screws".
 *
 * @param videoElement - The live HTMLVideoElement from the camera
 * @param partLabel - The part label whose fasteners should be removed
 * @param config - Optional custom verification config
 * @returns VerificationResult
 */
export async function verifyBoltRemoved(
  videoElement: HTMLVideoElement,
  partLabel: string,
  config?: Partial<VerificationConfig>,
): Promise<VerificationResult> {
  const preset = VERIFICATION_PRESETS.bolt_removed;
  const minConfidence = config?.minConfidence ?? preset.minConfidence ?? 0.7;
  const requiredFrames = config?.requiredFrames ?? preset.requiredFrames ?? 4;
  const key = `bolt_${partLabel}`;

  return performAbsenceVerification(videoElement, partLabel, "bolt_removed", minConfidence, requiredFrames, key, {
    passMessage: `✓ Fasteners on ${labelToName(partLabel)} are removed`,
    failMessage: `✗ Fasteners still detected on ${labelToName(partLabel)}`,
    failAdvice: `Please remove all bolts/fasteners securing the ${labelToName(partLabel)}. Use the correct size wrench.`,
  });
}

/**
 * Verifies that a workflow step has been completed by analyzing
 * the instruction text and performing the appropriate verification check.
 *
 * This is the main integration point with the Workflow Engine.
 *
 * @param videoElement - The live HTMLVideoElement from the camera
 * @param step - The WorkflowStep to verify
 * @param partLabel - The part involved in this step
 * @returns VerificationResult
 */
export async function verifyStepCompleted(
  videoElement: HTMLVideoElement,
  step: WorkflowStep,
  partLabel: string,
): Promise<VerificationResult> {
  // Determine verification type from step instruction
  const verificationType = getVerificationTypeFromInstruction(step.instruction);

  switch (verificationType) {
    case "part_removed":
      return verifyPartRemoved(videoElement, partLabel);
    case "connector_attached":
      return verifyConnectorAttached(videoElement, partLabel);
    case "connector_detached":
      return performAbsenceVerification(
        videoElement, partLabel, "connector_detached", 0.65, 3, `detached_${partLabel}`,
        {
          passMessage: `✓ Connector on ${labelToName(partLabel)} is detached`,
          failMessage: `✗ Connector still attached on ${labelToName(partLabel)}`,
          failAdvice: `Please disconnect the connector from ${labelToName(partLabel)}.`,
        },
      );
    case "bolt_removed":
      return verifyBoltRemoved(videoElement, partLabel);
    case "bolt_tightened":
      return performVerification(
        videoElement, partLabel, "bolt_tightened", 0.7, 4, `tightened_${partLabel}`,
        {
          passMessage: `✓ Fasteners on ${labelToName(partLabel)} are tightened`,
          failMessage: `✗ Could not verify fasteners are tightened on ${labelToName(partLabel)}`,
          failAdvice: `Use a torque wrench to tighten fasteners to the specified torque.`,
        },
      );
    case "part_visible":
    case "step_completed":
    default:
      return performVerification(
        videoElement, partLabel, "step_completed", 0.6, 2, `step_${partLabel}`,
        {
          passMessage: `✓ Step completed for ${labelToName(partLabel)}`,
          failMessage: `✗ Could not verify step completion for ${labelToName(partLabel)}`,
          failAdvice: `Point the camera at ${labelToName(partLabel)} and ensure the step was completed correctly.`,
        },
      );
  }
}

/**
 * Checks whether the Workflow Engine should allow advancing to the next step.
 * Only returns true when verification passes with sufficient confidence.
 *
 * @param videoElement - The live HTMLVideoElement from the camera
 * @param step - The WorkflowStep that needs verification
 * @param partLabel - The part involved
 * @returns True if the step is verified and the workflow can advance
 */
export async function canAdvanceWorkflow(
  videoElement: HTMLVideoElement,
  step: WorkflowStep,
  partLabel: string,
): Promise<{ allowed: boolean; result: VerificationResult }> {
  const result = await verifyStepCompleted(videoElement, step, partLabel);

  if (result.verified && result.confidence >= 0.5) {
    return { allowed: true, result };
  }

  return { allowed: false, result };
}

// ---------------------------------------------------------------------------
// Core Verification Logic
// ---------------------------------------------------------------------------

interface VerificationMessages {
  passMessage: string;
  failMessage: string;
  failAdvice: string;
}

/**
 * Performs a positive verification — the part SHOULD be detected.
 */
async function performVerification(
  videoElement: HTMLVideoElement,
  partLabel: string,
  type: VerificationType,
  minConfidence: number,
  requiredFrames: number,
  frameKey: string,
  messages: VerificationMessages,
): Promise<VerificationResult> {
  try {
    const detection = await detect(videoElement);
    const found = findPartInDetection(detection, partLabel);

    const passed = found !== null && found.confidence >= minConfidence;
    updateFrameBuffer(frameKey, passed);

    const consecutivePasses = countConsecutive(frameKey, true);
    const verified = consecutivePasses >= requiredFrames;

    return {
      verified,
      confidence: found ? found.confidence : 0,
      type,
      message: verified ? messages.passMessage : messages.failMessage,
      advice: verified ? undefined : messages.failAdvice,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      verified: false,
      confidence: 0,
      type,
      message: `Verification error: ${err instanceof Error ? err.message : "Unknown error"}`,
      advice: "Try again. Ensure the camera is working and properly positioned.",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Performs an absence verification — the part should NOT be detected.
 */
async function performAbsenceVerification(
  videoElement: HTMLVideoElement,
  partLabel: string,
  type: VerificationType,
  minConfidence: number,
  requiredFrames: number,
  frameKey: string,
  messages: VerificationMessages,
): Promise<VerificationResult> {
  try {
    const detection = await detect(videoElement);
    const found = findPartInDetection(detection, partLabel);

    // For absence: passed if the part is NOT found or found with LOW confidence
    const passed = found === null || found.confidence < minConfidence;
    updateFrameBuffer(frameKey, passed);

    const consecutivePasses = countConsecutive(frameKey, true);
    const verified = consecutivePasses >= requiredFrames;

    return {
      verified,
      confidence: found ? 1 - found.confidence : 0.9,
      type,
      message: verified ? messages.passMessage : messages.failMessage,
      advice: verified ? undefined : messages.failAdvice,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    return {
      verified: false,
      confidence: 0,
      type,
      message: `Verification error: ${err instanceof Error ? err.message : "Unknown error"}`,
      advice: "Try again. Ensure the camera is working and properly positioned.",
      timestamp: new Date().toISOString(),
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Finds a specific part in a detection result by label.
 */
function findPartInDetection(
  detection: DetectionResult,
  partLabel: string,
): DetectedPart | null {
  return detection.detections.find(
    (d) => d.label === partLabel && d.isReliable,
  ) || null;
}

/**
 * Updates the frame buffer for a given key with a new boolean result.
 */
function updateFrameBuffer(key: string, value: boolean): void {
  const buffer = _frameBuffer.get(key) || [];
  buffer.push(value);
  if (buffer.length > MAX_FRAME_BUFFER) {
    buffer.shift();
  }
  _frameBuffer.set(key, buffer);
}

/**
 * Counts the number of consecutive matching values at the end of the buffer.
 */
function countConsecutive(key: string, targetValue: boolean): number {
  const buffer = _frameBuffer.get(key) || [];
  let count = 0;
  for (let i = buffer.length - 1; i >= 0; i--) {
    if (buffer[i] === targetValue) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Extracts a human-readable part name from a label.
 */
function labelToName(label: string): string {
  const nameMap: Record<string, string> = {
    battery: "Battery",
    spark_plug: "Spark Plug",
    ignition_coil: "Ignition Coil",
    air_filter: "Air Filter",
    carburetor: "Carburetor",
    fuel_tank: "Fuel Tank",
    starter_relay: "Starter Relay",
    fuse_box: "Fuse Box",
  };
  return nameMap[label] || label.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Determines the verification type from a workflow step instruction text
 * by matching keywords.
 */
function getVerificationTypeFromInstruction(instruction: string): VerificationType {
  const lower = instruction.toLowerCase();

  // Check each keyword in the mapping
  for (const [keyword, verificationType] of Object.entries(STEP_TO_VERIFICATION)) {
    if (lower.includes(keyword.toLowerCase())) {
      return verificationType;
    }
  }

  // Default fallback
  return "step_completed";
}

/**
 * Returns the current frame buffer statistics for debugging.
 */
export function getVerificationStats(): Record<string, { buffer: boolean[]; consecutive: number }> {
  const stats: Record<string, { buffer: boolean[]; consecutive: number }> = {};
  for (const [key, buffer] of _frameBuffer.entries()) {
    stats[key] = {
      buffer: [...buffer],
      consecutive: countConsecutive(key, true),
    };
  }
  return stats;
}

/**
 * Clears all frame buffers (e.g., when starting a new workflow).
 */
export function resetVerificationState(): void {
  _frameBuffer.clear();
}