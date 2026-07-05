/**
 * MotoAI Object Detection Types
 *
 * Defines the data structures for YOLOv8 TFLite-based real-time
 * motorcycle part detection.
 */

/**
 * A bounding box around a detected motorcycle part.
 * Coordinates are normalized (0.0 to 1.0) relative to the image dimensions.
 */
export interface BoundingBox {
  /** Left edge x-coordinate (0.0 to 1.0) */
  x: number;
  /** Top edge y-coordinate (0.0 to 1.0) */
  y: number;
  /** Width of the bounding box (0.0 to 1.0) */
  width: number;
  /** Height of the bounding box (0.0 to 1.0) */
  height: number;
}

/**
 * A detected motorcycle part with its bounding box and confidence.
 */
export interface DetectedPart {
  /** The class/label of the detected part (e.g. "battery", "spark_plug") */
  label: string;
  /** Human-readable name (e.g. "Battery", "Spark Plug") */
  name: string;
  /** Confidence score (0.0 to 1.0) */
  confidence: number;
  /** Bounding box coordinates */
  bbox: BoundingBox;
  /** Whether this detection exceeds the minimum confidence threshold */
  isReliable: boolean;
}

/**
 * Result of a single detection frame analysis.
 */
export interface DetectionResult {
  /** All detected parts in the frame */
  detections: DetectedPart[];
  /** The most confident detection (or null if nothing found) */
  primaryDetection: DetectedPart | null;
  /** Average confidence across all detections */
  averageConfidence: number;
  /** Number of detections above the reliability threshold */
  reliableCount: number;
  /** Processing time in milliseconds */
  inferenceTimeMs: number;
  /** Timestamp of the detection */
  timestamp: string;
}

/**
 * Status of the object detection model.
 */
export interface ModelStatus {
  /** Whether the model is loaded and ready */
  isLoaded: boolean;
  /** Whether the model is currently loading */
  isLoading: boolean;
  /** Error message if loading failed, or null */
  error: string | null;
  /** The model URL or path */
  modelUrl: string | null;
  /** Progress percentage during loading (0-100) */
  loadProgress: number;
}

/**
 * Configuration for the object detection service.
 */
export interface DetectionConfig {
  /** Minimum confidence threshold (0.0 to 1.0). Detections below this are filtered. */
  confidenceThreshold: number;
  /** IoU threshold for non-maximum suppression (0.0 to 1.0) */
  iouThreshold: number;
  /** Maximum number of detections per frame */
  maxDetections: number;
  /** How often to run detection (in ms). -1 = every frame. */
  detectionIntervalMs: number;
  /** URL or path to the TFLite model file */
  modelUrl: string;
  /** Input image size expected by the model (e.g. 640) */
  inputSize: number;
}

/**
 * Default detection configuration.
 */
export const DEFAULT_DETECTION_CONFIG: DetectionConfig = {
  confidenceThreshold: 0.5,
  iouThreshold: 0.45,
  maxDetections: 10,
  detectionIntervalMs: 200, // 5 FPS
  modelUrl: "/models/motoai-yolov8.tflite",
  inputSize: 640,
};

/**
 * Mapping of model class IDs to human-readable labels.
 * These correspond to the 8 motorcycle parts we detect.
 */
export const YOLO_CLASSES: Record<number, { label: string; name: string }> = {
  0: { label: "battery", name: "Battery" },
  1: { label: "spark_plug", name: "Spark Plug" },
  2: { label: "ignition_coil", name: "Ignition Coil" },
  3: { label: "air_filter", name: "Air Filter" },
  4: { label: "carburetor", name: "Carburetor" },
  5: { label: "fuel_tank", name: "Fuel Tank" },
  6: { label: "starter_relay", name: "Starter Relay" },
  7: { label: "fuse_box", name: "Fuse Box" },
};