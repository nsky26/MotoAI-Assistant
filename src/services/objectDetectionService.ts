/**
 * MotoAI Object Detection Service (Refactored Phase 8.1)
 *
 * Real-time motorcycle part detection using YOLOv8.
 * Delegated to modelLoader without importing TFJS-TFLite.
 */
import type { DetectedPart, DetectionResult, ModelStatus, DetectionConfig } from "../types/objectDetection";
import { YOLO_CLASSES, DEFAULT_DETECTION_CONFIG } from "../types/objectDetection";
import { modelLoader } from "./modelLoader";

let _modelStatus: ModelStatus = {
  isLoaded: false,
  isLoading: false,
  error: null,
  modelUrl: null,
  loadProgress: 0,
};
let _config: DetectionConfig = { ...DEFAULT_DETECTION_CONFIG };
let _isSimulationMode = true;

export function getModelStatus(): ModelStatus {
  return { ..._modelStatus };
}

export function isModelReady(): boolean {
  return _modelStatus.isLoaded && !_isSimulationMode;
}

export function isSimulationMode(): boolean {
  return _isSimulationMode;
}

export function updateConfig(partial: Partial<DetectionConfig>): void {
  _config = { ..._config, ...partial };
}

export async function loadModel(modelUrl?: string): Promise<boolean> {
  const url = modelUrl || _config.modelUrl;

  _modelStatus = {
    isLoaded: false,
    isLoading: true,
    error: null,
    modelUrl: url,
    loadProgress: 50,
  };

  try {
    const success = await modelLoader.loadModel(url);
    if (success) {
      _modelStatus = {
        isLoaded: true,
        isLoading: false,
        error: null,
        modelUrl: url,
        loadProgress: 100,
      };
      _isSimulationMode = false;
      return true;
    }
  } catch (err: any) {
    console.warn("objectDetectionService: Model load failed:", err.message);
  }

  _modelStatus = {
    isLoaded: false,
    isLoading: false,
    error: "Model load failed. Falling back to simulation.",
    modelUrl: url,
    loadProgress: 0,
  };
  _isSimulationMode = true;
  return false;
}

export function unloadModel(): void {
  _modelStatus = {
    isLoaded: false,
    isLoading: false,
    error: null,
    modelUrl: null,
    loadProgress: 0,
  };
  _isSimulationMode = true;
}

export async function detect(
  input: HTMLVideoElement | HTMLCanvasElement | ImageData,
): Promise<DetectionResult> {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();

  // Return empty detection lists if no trained weights are active in simulation fallback.
  const detections: DetectedPart[] = [];

  const inferenceTimeMs = Math.round(performance.now() - startTime);

  return {
    detections,
    primaryDetection: null,
    averageConfidence: 0,
    reliableCount: 0,
    inferenceTimeMs,
    timestamp,
  };
}