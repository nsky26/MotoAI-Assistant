/**
 * MotoAI Inference Layer — Model Loader (Phase 8.1)
 *
 * Detects platform environments, instantiates correct providers,
 * and maintains lazy-loaded sessions.
 */
import { InferenceProvider } from "./inference/types";
import { ONNXProvider } from "./inference/onnxProvider";
import { AndroidProvider } from "./inference/androidProvider";
import { Capacitor } from "@capacitor/core";

class ModelLoader {
  private activeProvider: InferenceProvider | null = null;
  private isInitializing = false;

  async getProvider(): Promise<InferenceProvider | null> {
    if (this.activeProvider) return this.activeProvider;
    if (this.isInitializing) return null;

    this.isInitializing = true;
    try {
      const isAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
      const provider = isAndroid ? new AndroidProvider() : new ONNXProvider();
      
      const available = await provider.isAvailable();
      if (available) {
        this.activeProvider = provider;
        console.log(`modelLoader: Initialized active provider: ${provider.id}`);
      } else {
        console.warn("modelLoader: Target provider is not available in this environment.");
      }
    } catch (e) {
      console.warn("modelLoader: Failed to initialize provider:", e);
    } finally {
      this.isInitializing = false;
    }

    return this.activeProvider;
  }

  async loadModel(modelUrl: string): Promise<boolean> {
    const provider = await this.getProvider();
    if (!provider) return false;
    return provider.loadModel(modelUrl);
  }

  async dispose(): Promise<void> {
    if (this.activeProvider) {
      await this.activeProvider.dispose();
      this.activeProvider = null;
    }
  }
}

export const modelLoader = new ModelLoader();
