/**
 * MotoAI Camera Service
 *
 * Responsible for capturing frames from the live camera feed and preparing
 * them for AI-based image diagnosis via Gemini Vision.
 *
 * Architecture:
 * - Uses the existing videoRef + canvasRef already declared in CameraScanView
 * - Captures a single still frame from the live video stream
 * - Compresses + validates the image before sending to the backend
 * - All functions are pure utilities (no state, no React)
 */
import type { VisionDiagnosisRequest } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Max image width in pixels for the captured frame */
const MAX_IMAGE_WIDTH = 1024;

/** Max image height in pixels for the captured frame */
const MAX_IMAGE_HEIGHT = 768;

/** JPEG quality (0.0 – 1.0). 0.7 balances size vs AI recognition quality */
const JPEG_QUALITY = 0.7;

/** Max base64 payload size in bytes (~3MB after base64 overhead) */
const MAX_PAYLOAD_BYTES = 3_500_000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CaptureResult {
  /** base64-encoded JPEG image (without the `data:image/jpeg;base64,` prefix) */
  base64: string;
  /** Original width of the captured frame */
  width: number;
  /** Original height of the captured frame */
  height: number;
  /** Size of the base64 string in bytes */
  sizeBytes: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Captures a single frame from the live video element and returns it
 * as a compressed base64 JPEG string.
 *
 * @param videoElement - The HTMLVideoElement currently showing the camera feed
 * @param canvasElement - An off-screen HTMLCanvasElement used for the capture
 * @returns A CaptureResult object, or null if capture failed
 */
export function captureFrame(
  videoElement: HTMLVideoElement,
  canvasElement: HTMLCanvasElement,
): CaptureResult | null {
  const video = videoElement;
  const canvas = canvasElement;

  if (!video.videoWidth || !video.videoHeight) {
    return null;
  }

  // Calculate dimensions while maintaining aspect ratio
  let width = video.videoWidth;
  let height = video.videoHeight;

  if (width > MAX_IMAGE_WIDTH) {
    const ratio = MAX_IMAGE_WIDTH / width;
    width = MAX_IMAGE_WIDTH;
    height = Math.round(height * ratio);
  }
  if (height > MAX_IMAGE_HEIGHT) {
    const ratio = MAX_IMAGE_HEIGHT / height;
    height = MAX_IMAGE_HEIGHT;
    width = Math.round(width * ratio);
  }

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }

  // Draw the current video frame onto the canvas
  ctx.drawImage(video, 0, 0, width, height);

  // Convert to base64 JPEG
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");

  return {
    base64,
    width,
    height,
    sizeBytes: base64.length,
  };
}

/**
 * Converts a base64 string + prompt into the payload shape expected
 * by the backend `/api/diagnose-vision` endpoint.
 *
 * @param base64 - The base64-encoded JPEG image
 * @param prompt - Optional text prompt describing the issue
 * @returns VisionDiagnosisRequest payload
 */
export function buildVisionPayload(
  base64: string,
  prompt?: string,
): VisionDiagnosisRequest {
  return {
    image: base64,
    prompt: prompt || "Analyze this motorcycle component for visible issues.",
  };
}

/**
 * Validates a captured image before sending to the API.
 *
 * Checks:
 * 1. Base64 is not empty
 * 2. Payload size is within allowed limits
 *
 * @param base64 - The base64-encoded JPEG image
 * @returns ValidationResult
 */
export function validateImage(base64: string): ValidationResult {
  if (!base64 || base64.length === 0) {
    return { valid: false, error: "Captured image is empty." };
  }

  if (base64.length > MAX_PAYLOAD_BYTES) {
    const mb = (base64.length / 1_000_000).toFixed(1);
    return {
      valid: false,
      error: `Image is too large (${mb} MB). Maximum allowed is ${(MAX_PAYLOAD_BYTES / 1_000_000).toFixed(0)} MB.`,
    };
  }

  return { valid: true };
}

/**
 * Compresses an already-captured base64 image by re-encoding at a lower quality.
 * Useful if the initial capture is too large.
 *
 * @param base64 - The base64-encoded JPEG image
 * @param quality - JPEG quality (0.0 – 1.0), lower = smaller file
 * @returns A new base64 string, or the original if compression failed
 */
export function compressImage(base64: string, quality: number = 0.5): string {
  try {
    // Create an off-screen Image element
    const img = new Image();
    img.src = `data:image/jpeg;base64,${base64}`;

    // Create a temporary canvas
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return base64;

    ctx.drawImage(img, 0, 0);
    const compressed = canvas.toDataURL("image/jpeg", quality);
    return compressed.replace(/^data:image\/jpeg;base64,/, "");
  } catch {
    // If anything fails, return the original
    return base64;
  }
}