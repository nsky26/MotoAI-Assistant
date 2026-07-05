/**
 * MotoAI AR Repair Assistant Overlay (Phase 5.3)
 *
 * React component that renders augmented reality guides on top of the
 * live camera feed. Receives bounding boxes from objectDetectionService
 * and overlay state from arOverlayService.
 *
 * Features:
 * - Red circles around detected parts (highlighted target = larger + animated)
 * - Animated guide arrows pointing to target parts
 * - Bolt/connector highlight indicators
 * - Camera alignment guide (crosshair + zone indicator)
 * - Distance indicator ("~25cm")
 * - Direction hints ("Move closer", "Move left", "Move right")
 *
 * The Workflow Engine controls which part is highlighted via targetPartLabel.
 */
import React, { useRef, useEffect, useState } from "react";
import type { DetectedPart } from "../types/objectDetection";
import type { AROverlayState, ARHighlightCircle, ARGuideArrow } from "../services/arOverlayService";
import { computeOverlayState, getPartColor } from "../services/arOverlayService";

interface AROverlayProps {
  /** Current detection result from objectDetectionService */
  detections: DetectedPart[];
  /** The part label the Workflow Engine wants highlighted (e.g. "battery") */
  targetPartLabel: string | null;
  /** Width of the overlay container in pixels */
  width: number;
  /** Height of the overlay container in pixels */
  height: number;
  /** Whether the overlay is active (camera is live) */
  active: boolean;
}

/**
 * AROverlay
 *
 * Renders AR guides on an SVG overlay positioned above the camera feed.
 * All coordinates are normalized (0-1) and converted to pixel values
 * based on the container dimensions.
 */
export default function AROverlay({
  detections,
  targetPartLabel,
  width,
  height,
  active,
}: AROverlayProps) {
  const overlayState = computeOverlayState(detections, targetPartLabel);

  if (!active || width === 0 || height === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20" style={{ width, height }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Arrow marker definition */}
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
          </marker>

          {/* Glow filter for highlights */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Stronger glow for target */}
          <filter id="targetGlow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. HIGHLIGHT CIRCLES — around each detected part */}
        {overlayState.circles.map((circle, i) => (
          <ARCircleEl
            key={`circle-${i}`}
            circle={circle}
            width={width}
            height={height}
          />
        ))}

        {/* 2. GUIDE ARROWS — pointing to target positions */}
        {overlayState.arrows.map((arrow, i) => (
          <ARArrowEl
            key={`arrow-${i}`}
            arrow={arrow}
            width={width}
            height={height}
          />
        ))}

        {/* 3. ALIGNMENT GUIDE — crosshair zone */}
        {overlayState.alignment && (
          <AlignmentGuideEl
            state={overlayState}
            width={width}
            height={height}
          />
        )}
      </svg>

      {/* 4. DISTANCE INDICATOR — bottom center */}
      {overlayState.distance && (
        <DistanceIndicatorEl distance={overlayState.distance} />
      )}

      {/* 5. DIRECTION HINTS — top area */}
      {overlayState.hints.filter((h) => h.active).length > 0 && (
        <DirectionHintsEl hints={overlayState.hints} />
      )}

      {/* 6. TARGET LABEL — if detected */}
      {overlayState.targetDetected && (
        <TargetLabelEl
          name={overlayState.targetName}
          color={targetPartLabel ? getPartColor(targetPartLabel) : "#10b981"}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Renders a single highlight circle around a detected part */
function ARCircleEl({
  circle,
  width,
  height,
}: {
  circle: ARHighlightCircle;
  width: number;
  height: number;
}) {
  const cx = circle.cx * width;
  const cy = circle.cy * height;
  const r = circle.r * Math.min(width, height);

  return (
    <g filter={circle.animated ? "url(#targetGlow)" : "url(#glow)"}>
      {/* Outer ring */}
      <circle
        cx={cx}
        cy={cy}
        r={r + 4}
        fill="none"
        stroke={circle.color}
        strokeWidth="3"
        opacity="0.4"
        className={circle.animated ? "animate-ping" : ""}
      />
      {/* Main circle */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={circle.color}
        strokeWidth="2.5"
        opacity="0.9"
      />
      {/* Inner dot */}
      <circle
        cx={cx}
        cy={cy}
        r={2}
        fill={circle.color}
        opacity="0.8"
      />
      {/* Corner brackets for target */}
      {circle.animated && (
        <>
          <CornerBracket x={cx - r - 4} y={cy - r - 4} size={12} color={circle.color} />
          <CornerBracket x={cx + r + 4} y={cy - r - 4} size={12} color={circle.color} flipX />
          <CornerBracket x={cx - r - 4} y={cy + r + 4} size={12} color={circle.color} flipY />
          <CornerBracket x={cx + r + 4} y={cy + r + 4} size={12} color={circle.color} flipX flipY />
        </>
      )}
      {/* Label */}
      <text
        x={cx}
        y={cy - r - 12}
        textAnchor="middle"
        fill={circle.color}
        fontSize="11"
        fontWeight="bold"
        fontFamily="monospace"
      >
        {circle.label}
      </text>
    </g>
  );
}

/** Corner bracket for target framing */
function CornerBracket({
  x, y, size, color, flipX, flipY,
}: {
  x: number; y: number; size: number; color: string;
  flipX?: boolean; flipY?: boolean;
}) {
  const hx = flipX ? x + size : x;
  const hy = flipY ? y + size : y;
  const dx = flipX ? -1 : 1;
  const dy = flipY ? -1 : 1;

  return (
    <path
      d={`M ${hx} ${hy} L ${hx + dx * size} ${hy} L ${hx + dx * size} ${hy + dy * size / 3}`}
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      opacity="0.9"
    />
  );
}

/** Renders a guide arrow pointing toward a target */
function ARArrowEl({
  arrow,
  width,
  height,
}: {
  arrow: ARGuideArrow;
  width: number;
  height: number;
}) {
  const fromX = arrow.fromX * width;
  const fromY = arrow.fromY * height;
  const toX = arrow.toX * width;
  const toY = arrow.toY * height;

  return (
    <g
      className={arrow.animated ? "animate-pulse" : ""}
      style={{ color: arrow.color }}
    >
      {/* Arrow line */}
      <line
        x1={fromX}
        y1={fromY}
        x2={toX}
        y2={toY}
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="6 3"
        markerEnd="url(#arrowhead)"
        opacity="0.8"
      />
      {/* Label */}
      <text
        x={(fromX + toX) / 2 + 12}
        y={(fromY + toY) / 2}
        textAnchor="start"
        dominantBaseline="middle"
        fill="currentColor"
        fontSize="10"
        fontWeight="bold"
        fontFamily="monospace"
      >
        {arrow.label}
      </text>
    </g>
  );
}

/** Renders the camera alignment crosshair guide */
function AlignmentGuideEl({
  state,
  width,
  height,
}: {
  state: AROverlayState;
  width: number;
  height: number;
}) {
  if (!state.alignment) return null;

  const cx = state.alignment.targetX * width;
  const cy = state.alignment.targetY * height;
  const zonePx = state.alignment.zoneSize * Math.min(width, height);
  const color = state.alignment.isAligned ? "#10b981" : "#ef4444";

  return (
    <g filter="url(#glow)">
      {/* Crosshair horizontal */}
      <line x1={cx - zonePx} y1={cy} x2={cx + zonePx} y2={cy} stroke={color} strokeWidth="1.5" opacity="0.6" />
      {/* Crosshair vertical */}
      <line x1={cx} y1={cy - zonePx} x2={cx} y2={cy + zonePx} stroke={color} strokeWidth="1.5" opacity="0.6" />
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="3" fill={color} opacity="0.8" />
      {/* Zone circle */}
      <circle cx={cx} cy={cy} r={zonePx} fill="none" stroke={color} strokeWidth="1" opacity="0.3" strokeDasharray="4 4" />
    </g>
  );
}

/** Distance indicator at bottom center */
function DistanceIndicatorEl({
  distance,
}: {
  distance: NonNullable<AROverlayState["distance"]>;
}) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-950/80 border border-zinc-800 rounded-full px-4 py-1.5 flex items-center gap-2 z-30">
      {/* Distance value */}
      <span className="text-[10px] font-mono-tech text-zinc-400 font-bold">
        ~{distance.estimatedCm}cm
      </span>
      {/* Status indicator */}
      <span className={`w-2 h-2 rounded-full ${
        distance.isOptimal ? "bg-emerald-500" : distance.tooClose ? "bg-red-500" : "bg-amber-500"
      }`} />
      {/* Hint text */}
      <span className={`text-[10px] font-bold font-sans ${
        distance.isOptimal ? "text-emerald-400" : distance.tooClose ? "text-red-400" : "text-amber-400"
      }`}>
        {distance.hint}
      </span>
    </div>
  );
}

/** Direction hints at the top of the screen */
function DirectionHintsEl({
  hints,
}: {
  hints: AROverlayState["hints"];
}) {
  const activeHints = hints.filter((h) => h.active);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 z-30">
      {activeHints.slice(0, 2).map((hint, i) => (
        <div
          key={i}
          className={`bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-1 flex items-center gap-2 ${
            hint.priority === 1 ? "animate-pulse" : ""
          }`}
        >
          {/* Direction arrow icon */}
          <DirectionArrow direction={hint.direction} />
          <span className={`text-[10px] font-bold font-sans ${
            hint.priority === 1 ? "text-red-400" : "text-amber-400"
          }`}>
            {hint.text}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Simple direction arrow */
function DirectionArrow({ direction }: { direction: string }) {
  const arrowMap: Record<string, string> = {
    left: "←",
    right: "→",
    up: "↑",
    down: "↓",
    forward: "↑",
    backward: "↓",
    none: "●",
  };

  return (
    <span className="text-xs font-bold text-zinc-400">
      {arrowMap[direction] || "●"}
    </span>
  );
}

/** Target part label when detected */
function TargetLabelEl({ name, color }: { name: string; color: string }) {
  return (
    <div
      className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto"
      style={{ color }}
    >
      <div className="bg-zinc-950/90 border border-zinc-800 rounded-full px-4 py-1.5 text-center shadow-lg backdrop-blur-sm">
        <span className="text-[11px] font-bold uppercase tracking-wider font-cyber">
          {name}
        </span>
      </div>
    </div>
  );
}