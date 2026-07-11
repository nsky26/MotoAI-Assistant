/**
 * MotoAI Inference Layer — Core Types
 * Defines the shared schemas for interchangeable ML providers.
 */

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface InferenceDetection {
  className: string;
  confidence: number;
  boundingBox: BoundingBox;
  condition: string;
  inferenceTime: number;
}

export interface InferenceProvider {
  id: string;
  isAvailable(): Promise<boolean>;
  loadModel(modelUrl: string): Promise<boolean>;
  runInference(input: HTMLVideoElement | HTMLCanvasElement): Promise<InferenceDetection[]>;
  dispose(): Promise<void>;
}
