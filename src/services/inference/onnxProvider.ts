import { InferenceProvider, InferenceDetection } from "./types";

export class ONNXProvider implements InferenceProvider {
  id = "onnx-web-provider";
  private isLoaded = false;

  async isAvailable(): Promise<boolean> {
    // ONNX Runtime Web is supported in modern browser environments
    return typeof window !== "undefined" && !!window.WebAssembly;
  }

  async loadModel(modelUrl: string): Promise<boolean> {
    try {
      console.log(`onnxProvider: Loading ONNX model from: ${modelUrl}`);
      // ONNX Runtime session initialization will go here
      // For fallback/verification before real ONNX packaging:
      this.isLoaded = true;
      return true;
    } catch (e) {
      console.warn("onnxProvider: Failed to load ONNX model:", e);
      return false;
    }
  }

  async runInference(input: HTMLVideoElement | HTMLCanvasElement): Promise<InferenceDetection[]> {
    if (!this.isLoaded) return [];
    
    // In real model runtime: read canvas/video pixels, normalize, run session.run()
    // Returns detected items.
    return [];
  }

  async dispose(): Promise<void> {
    this.isLoaded = false;
  }
}
