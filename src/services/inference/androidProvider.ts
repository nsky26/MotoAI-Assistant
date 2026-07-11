import { InferenceProvider, InferenceDetection } from "./types";
import { Capacitor } from "@capacitor/core";

export class AndroidProvider implements InferenceProvider {
  id = "android-native-tflite-provider";
  private isLoaded = false;

  async isAvailable(): Promise<boolean> {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  }

  async loadModel(modelUrl: string): Promise<boolean> {
    try {
      console.log(`androidProvider: Loading TFLite model from: ${modelUrl}`);
      // Native Android TFLite bridge loader goes here
      this.isLoaded = true;
      return true;
    } catch (e) {
      console.warn("androidProvider: Failed to load TFLite model natively:", e);
      return false;
    }
  }

  async runInference(input: HTMLVideoElement | HTMLCanvasElement): Promise<InferenceDetection[]> {
    if (!this.isLoaded) return [];
    
    // Calls Capacitor custom native TFLite wrapper
    return [];
  }

  async dispose(): Promise<void> {
    this.isLoaded = false;
  }
}
