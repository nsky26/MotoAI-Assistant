/**
 * MotoAI AR Overlay Service (Phase 5.3)
 *
 * Pure logic service that calculates AR overlay positions, alignment guides,
 * animated arrow targets, distance indicators, and camera alignment hints
 * based on bounding boxes from objectDetectionService.
 *
 * The Workflow Engine controls which object is highlighted by providing
 * the target part label. The service then computes all visual elements
 * needed by the AROverlay component.
 *
 * Pure TypeScript — no UI, no React. All calculations are stateless.
 */
import type { DetectedPart, BoundingBox } from "../types/objectDetection";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ARGuideArrow {
  /** Normalized start position (0-1) */
  fromX: number;
  fromY: number;
  /** Normalized end position (0-1) */
  toX: number;
  toY: number;
  /** Arrow color */
  color: string;
  /** Whether the arrow should animate (pulse/float) */
  animated: boolean;
  /** Label text for the arrow */
  label: string;
}

export interface ARHighlightCircle {
  /** Center X (normalized 0-1) */
  cx: number;
  /** Center Y (normalized 0-1) */
  cy: number;
  /** Radius (normalized 0-1) */
  r: number;
  /** Color of the circle */
  color: string;
  /** Whether to animate (pulse) */
  animated: boolean;
  /** Label text */
  label: string;
}

export interface ARAlignmentGuide {
  /** Center X of the target zone (normalized 0-1) */
  targetX: number;
  /** Center Y of the target zone (normalized 0-1) */
  targetY: number;
  /** Whether the target is within the optimal zone */
  isAligned: boolean;
  /** Horizontal offset from center (-1 to 1, negative = left) */
  offsetX: number;
  /** Vertical offset from center (-1 to 1, negative = up) */
  offsetY: number;
  /** Size of the alignment zone (normalized 0-1) */
  zoneSize: number;
}

export interface ARDistanceIndicator {
  /** Estimated distance in cm */
  estimatedCm: number;
  /** Whether the distance is optimal (20-40cm) */
  isOptimal: boolean;
  /** Whether the user is too close */
  tooClose: boolean;
  /** Whether the user is too far */
  tooFar: boolean;
  /** Direction hint text */
  hint: string;
}

export interface ARDirectionHint {
  /** Text direction to move (e.g. "Move left", "Move right", "Move closer") */
  text: string;
  /** Arrow direction for the hint */
  direction: "left" | "right" | "up" | "down" | "forward" | "backward" | "none";
  /** Whether the hint is currently active */
  active: boolean;
  /** Priority (lower = more important) */
  priority: number;
}

export interface AROverlayState {
  /** Highlight circles around detected parts */
  circles: ARHighlightCircle[];
  /** Guide arrows pointing to target parts */
  arrows: ARGuideArrow[];
  /** Camera alignment guide */
  alignment: ARAlignmentGuide | null;
  /** Distance indicator */
  distance: ARDistanceIndicator | null;
  /** Direction hints for camera positioning */
  hints: ARDirectionHint[];
  /** Whether the target part is detected */
  targetDetected: boolean;
  /** Name of the target part being highlighted */
  targetName: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Optimal bounding box size range (as fraction of frame) */
const OPTIMAL_BBOX_SIZE_MIN = 0.15;
const OPTIMAL_BBOX_SIZE_MAX = 0.4;

/** Optimal center zone (center ± this fraction) */
const OPTIMAL_CENTER_ZONE = 0.15;

/** Colors for different part types */
const PART_COLORS: Record<string, string> = {
  battery: "#10b981",       // emerald green
  spark_plug: "#f59e0b",    // amber
  ignition_coil: "#8b5cf6", // violet
  air_filter: "#3b82f6",    // blue
  carburetor: "#ef4444",    // red
  fuel_tank: "#06b6d4",     // cyan
  starter_relay: "#f97316", // orange
  fuse_box: "#ec4899",      // pink
};

const DEFAULT_COLOR = "#ef4444"; // red fallback

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Computes the full AR overlay state from detection results and a target part.
 *
 * @param detections - All detected parts from objectDetectionService
 * @param targetPartLabel - The part label the Workflow Engine wants highlighted
 * @returns AROverlayState with all visual elements
 */
export function computeOverlayState(
  detections: DetectedPart[],
  targetPartLabel: string | null,
): AROverlayState {
  const targetPart = targetPartLabel
    ? detections.find((d) => d.label === targetPartLabel && d.isReliable)
    : null;

  const targetName = targetPart?.name || targetPartLabel?.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "";

  const circles = computeCircles(detections, targetPartLabel);
  const arrows = computeArrows(detections, targetPartLabel);
  const alignment = targetPart ? computeAlignment(targetPart.bbox) : null;
  const distance = targetPart ? computeDistance(targetPart.bbox) : null;
  const hints = computeHints(alignment, distance);

  return {
    circles,
    arrows,
    alignment,
    distance,
    hints,
    targetDetected: targetPart !== null,
    targetName,
  };
}

/**
 * Computes highlight circles for all detected parts.
 * The target part gets a larger, animated circle.
 */
function computeCircles(
  detections: DetectedPart[],
  targetPartLabel: string | null,
): ARHighlightCircle[] {
  return detections
    .filter((d) => d.isReliable)
    .map((d) => {
      const isTarget = d.label === targetPartLabel;
      const color = PART_COLORS[d.label] || DEFAULT_COLOR;

      return {
        cx: d.bbox.x + d.bbox.width / 2,
        cy: d.bbox.y + d.bbox.height / 2,
        r: isTarget ? Math.max(d.bbox.width, d.bbox.height) * 0.6 : Math.max(d.bbox.width, d.bbox.height) * 0.4,
        color,
        animated: isTarget,
        label: d.name,
      };
    });
}

/**
 * Computes guide arrows pointing from the center of the frame
 * toward the target part's location.
 */
function computeArrows(
  detections: DetectedPart[],
  targetPartLabel: string | null,
): ARGuideArrow[] {
  if (!targetPartLabel) return [];

  const target = detections.find((d) => d.label === targetPartLabel);
  if (!target) {
    // Target not detected — show a general search arrow
    return [
      {
        fromX: 0.5,
        fromY: 0.5,
        toX: 0.5,
        toY: 0.3,
        color: "#ef4444",
        animated: true,
        label: `Find ${targetPartLabel.replace(/_/g, " ")}`,
      },
    ];
  }

  const targetCx = target.bbox.x + target.bbox.width / 2;
  const targetCy = target.bbox.y + target.bbox.height / 2;

  // Only show arrow if target is not centered
  const dx = targetCx - 0.5;
  const dy = targetCy - 0.5;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.1) return []; // Already centered

  // Arrow from center toward target
  const arrowLen = Math.min(0.15, dist * 0.5);
  const nx = dx / dist;
  const ny = dy / dist;

  return [
    {
      fromX: 0.5,
      fromY: 0.5,
      toX: 0.5 + nx * arrowLen,
      toY: 0.5 + ny * arrowLen,
      color: PART_COLORS[targetPartLabel] || DEFAULT_COLOR,
      animated: true,
      label: target.name,
    },
  ];
}

/**
 * Computes the camera alignment guide based on the target bounding box position.
 */
function computeAlignment(bbox: BoundingBox): ARAlignmentGuide {
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;

  const offsetX = cx - 0.5;
  const offsetY = cy - 0.5;

  const isAligned = Math.abs(offsetX) < OPTIMAL_CENTER_ZONE && Math.abs(offsetY) < OPTIMAL_CENTER_ZONE;

  return {
    targetX: cx,
    targetY: cy,
    isAligned,
    offsetX,
    offsetY,
    zoneSize: OPTIMAL_CENTER_ZONE,
  };
}

/**
 * Computes the distance indicator based on bounding box size.
 * Larger bbox = closer, smaller bbox = farther.
 */
function computeDistance(bbox: BoundingBox): ARDistanceIndicator {
  const bboxSize = Math.max(bbox.width, bbox.height);

  // Estimate distance: bboxSize 0.4 ≈ 20cm, bboxSize 0.15 ≈ 40cm
  const estimatedCm = Math.round(60 / (bboxSize * 10)) * 10;

  const isOptimal = bboxSize >= OPTIMAL_BBOX_SIZE_MIN && bboxSize <= OPTIMAL_BBOX_SIZE_MAX;
  const tooClose = bboxSize > OPTIMAL_BBOX_SIZE_MAX;
  const tooFar = bboxSize < OPTIMAL_BBOX_SIZE_MIN;

  let hint: string;
  if (tooClose) {
    hint = "Move farther away";
  } else if (tooFar) {
    hint = "Move closer";
  } else {
    hint = "Perfect distance";
  }

  return { estimatedCm, isOptimal, tooClose, tooFar, hint };
}

/**
 * Computes directional hints for camera positioning.
 */
function computeHints(
  alignment: ARAlignmentGuide | null,
  distance: ARDistanceIndicator | null,
): ARDirectionHint[] {
  const hints: ARDirectionHint[] = [];

  // Alignment hints
  if (alignment) {
    if (Math.abs(alignment.offsetX) > OPTIMAL_CENTER_ZONE) {
      hints.push({
        text: alignment.offsetX < 0 ? "Move right" : "Move left",
        direction: alignment.offsetX < 0 ? "right" : "left",
        active: true,
        priority: 1,
      });
    }

    if (Math.abs(alignment.offsetY) > OPTIMAL_CENTER_ZONE) {
      hints.push({
        text: alignment.offsetY < 0 ? "Move down" : "Move up",
        direction: alignment.offsetY < 0 ? "down" : "up",
        active: true,
        priority: 1,
      });
    }
  }

  // Distance hints
  if (distance) {
    if (distance.tooClose) {
      hints.push({
        text: "Move farther away",
        direction: "backward",
        active: true,
        priority: 2,
      });
    } else if (distance.tooFar) {
      hints.push({
        text: "Move closer",
        direction: "forward",
        active: true,
        priority: 2,
      });
    }
  }

  // If no hints, show aligned
  if (hints.length === 0) {
    hints.push({
      text: "Aligned",
      direction: "none",
      active: false,
      priority: 99,
    });
  }

  return hints.sort((a, b) => a.priority - b.priority);
}

/**
 * Gets the color for a specific part label.
 */
export function getPartColor(label: string): string {
  return PART_COLORS[label] || DEFAULT_COLOR;
}

/**
 * Converts normalized coordinates to pixel values for a given container size.
 */
export function normalizedToPixel(
  normalizedX: number,
  normalizedY: number,
  containerWidth: number,
  containerHeight: number,
): { x: number; y: number } {
  return {
    x: normalizedX * containerWidth,
    y: normalizedY * containerHeight,
  };
}