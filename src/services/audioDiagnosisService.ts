/**
 * MotoAI Audio Diagnosis Service (Phase 6.1)
 *
 * Analyzes motorcycle sounds in real-time using the Web Audio API.
 * Detects specific audio events and feeds them as Observations into
 * the Evidence Engine for diagnosis.
 *
 * Detected audio events:
 * - Weak battery (slow, labored cranking)
 * - Relay click (single or rapid clicking)
 * - Starter motor (whirring/grinding)
 * - Engine cranking (rhythmic turnover)
 * - Engine started (sustained idle)
 * - Spark present (sharp ignition pop)
 * - Spark absent (cranking with no combustion)
 * - Misfire (irregular combustion gaps)
 * - Valve ticking (rhythmic metallic tapping)
 *
 * Architecture:
 * 1. getUserMedia() captures microphone input
 * 2. Web Audio API's AnalyserNode extracts frequency + time-domain data
 * 3. Audio fingerprinting algorithms classify sounds
 * 4. Each detection becomes an Observation via Evidence Engine
 *
 * Pure TypeScript — no UI, no React.
 * Compatible with Capacitor WebView on Android.
 */
import { recordObservation, updateConfidence, type EvidenceState } from "./evidenceEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AudioEventType =
  | "weak_battery"
  | "relay_click"
  | "starter_motor"
  | "engine_cranking"
  | "engine_started"
  | "spark_present"
  | "spark_absent"
  | "misfire"
  | "valve_ticking";

export interface AudioEvent {
  /** The type of audio event detected */
  type: AudioEventType;
  /** Confidence of the detection (0.0 to 1.0) */
  confidence: number;
  /** Timestamp of the detection */
  timestamp: string;
  /** Frequency analysis data (for debugging) */
  dominantFrequency: number;
  /** Amplitude of the detection */
  amplitude: number;
}

export interface AudioDiagnosisState {
  /** Whether the audio service is currently listening */
  isListening: boolean;
  /** Whether the browser supports the Web Audio API */
  isSupported: boolean;
  /** Error message if initialization failed */
  error: string | null;
  /** Recent audio events detected */
  recentEvents: AudioEvent[];
  /** Current audio level (0.0 to 1.0) for UI visualization */
  currentLevel: number;
  /** Whether microphone permission has been granted */
  hasPermission: boolean;
}

export interface AudioDiagnosisConfig {
  /** Sample rate for audio analysis (Hz) */
  sampleRate: number;
  /** FFT size for frequency analysis (must be power of 2) */
  fftSize: number;
  /** Minimum amplitude threshold to consider a sound significant */
  amplitudeThreshold: number;
  /** Time window (ms) to analyze for event detection */
  analysisWindowMs: number;
  /** Minimum confidence to emit an event */
  minConfidence: number;
  /** Cooldown period (ms) before the same event can fire again */
  eventCooldownMs: number;
}

export const DEFAULT_AUDIO_CONFIG: AudioDiagnosisConfig = {
  sampleRate: 44100,
  fftSize: 2048,
  amplitudeThreshold: 0.05,
  analysisWindowMs: 500,
  minConfidence: 0.6,
  eventCooldownMs: 2000,
};

// ---------------------------------------------------------------------------
// Audio Event Signatures
// ---------------------------------------------------------------------------

/**
 * Frequency and amplitude signatures for each audio event.
 * These define the expected characteristics of each sound.
 */
interface AudioSignature {
  /** Expected dominant frequency range [min, max] in Hz */
  frequencyRange: [number, number];
  /** Expected amplitude range [min, max] (0.0 to 1.0) */
  amplitudeRange: [number, number];
  /** Expected duration in ms */
  durationMs: [number, number];
  /** Whether the sound is rhythmic (has a pattern) */
  isRhythmic: boolean;
  /** Expected rhythm rate (beats per second) if rhythmic */
  rhythmRate?: [number, number];
  /** Whether the sound is continuous or impulsive */
  isContinuous: boolean;
}

const AUDIO_SIGNATURES: Record<AudioEventType, AudioSignature> = {
  weak_battery: {
    frequencyRange: [80, 200],
    amplitudeRange: [0.1, 0.3],
    durationMs: [500, 3000],
    isRhythmic: true,
    rhythmRate: [2, 5], // slow cranking
    isContinuous: true,
  },
  relay_click: {
    frequencyRange: [1000, 4000],
    amplitudeRange: [0.3, 0.8],
    durationMs: [30, 150],
    isRhythmic: false,
    isContinuous: false,
  },
  starter_motor: {
    frequencyRange: [200, 800],
    amplitudeRange: [0.4, 0.9],
    durationMs: [200, 5000],
    isRhythmic: true,
    rhythmRate: [8, 15],
    isContinuous: true,
  },
  engine_cranking: {
    frequencyRange: [100, 400],
    amplitudeRange: [0.3, 0.7],
    durationMs: [500, 5000],
    isRhythmic: true,
    rhythmRate: [5, 12],
    isContinuous: true,
  },
  engine_started: {
    frequencyRange: [50, 300],
    amplitudeRange: [0.2, 0.6],
    durationMs: [2000, 30000],
    isRhythmic: true,
    rhythmRate: [10, 25],
    isContinuous: true,
  },
  spark_present: {
    frequencyRange: [3000, 8000],
    amplitudeRange: [0.5, 1.0],
    durationMs: [10, 50],
    isRhythmic: true,
    rhythmRate: [5, 12], // matches cranking rate
    isContinuous: false,
  },
  spark_absent: {
    frequencyRange: [100, 400],
    amplitudeRange: [0.3, 0.7],
    durationMs: [1000, 5000],
    isRhythmic: true,
    rhythmRate: [5, 12],
    isContinuous: true,
  },
  misfire: {
    frequencyRange: [100, 500],
    amplitudeRange: [0.2, 0.6],
    durationMs: [2000, 10000],
    isRhythmic: true,
    rhythmRate: [3, 8], // irregular rhythm
    isContinuous: true,
  },
  valve_ticking: {
    frequencyRange: [2000, 6000],
    amplitudeRange: [0.1, 0.4],
    durationMs: [1000, 30000],
    isRhythmic: true,
    rhythmRate: [15, 40],
    isContinuous: true,
  },
};

// ---------------------------------------------------------------------------
// Audio Event → Symptom Mapping
// ---------------------------------------------------------------------------

/**
 * Maps detected audio events to symptom IDs for the Evidence Engine.
 */
const AUDIO_TO_SYMPTOM: Record<AudioEventType, string> = {
  weak_battery: "engine_cranks_slowly",
  relay_click: "clicking_sound",
  starter_motor: "grinding_noise_start",
  engine_cranking: "engine_cranks_no_start",
  engine_started: "engine_started",
  spark_present: "weak_spark",
  spark_absent: "weak_spark",
  misfire: "misfire",
  valve_ticking: "rough_idle",
};

/**
 * Maps audio events to part confidence updates for the Evidence Engine.
 */
const AUDIO_CONFIDENCE_MAP: Record<AudioEventType, Array<{ partId: string; delta: number }>> = {
  weak_battery: [
    { partId: "battery", delta: 0.3 },
    { partId: "starter_motor", delta: 0.1 },
  ],
  relay_click: [
    { partId: "starter_relay", delta: 0.25 },
    { partId: "battery", delta: 0.2 },
  ],
  starter_motor: [
    { partId: "starter_motor", delta: 0.35 },
    { partId: "starter_clutch", delta: 0.15 },
  ],
  engine_cranking: [
    { partId: "spark_plug", delta: 0.15 },
    { partId: "ignition_coil", delta: 0.1 },
    { partId: "fuel_pump", delta: 0.1 },
    { partId: "crank_position_sensor", delta: 0.1 },
  ],
  engine_started: [
    { partId: "battery", delta: -0.1 },
    { partId: "starter_motor", delta: -0.1 },
  ],
  spark_present: [
    { partId: "ignition_coil", delta: -0.15 },
    { partId: "spark_plug", delta: -0.1 },
  ],
  spark_absent: [
    { partId: "ignition_coil", delta: 0.3 },
    { partId: "spark_plug", delta: 0.2 },
    { partId: "crank_position_sensor", delta: 0.15 },
  ],
  misfire: [
    { partId: "spark_plug", delta: 0.2 },
    { partId: "ignition_coil", delta: 0.15 },
    { partId: "fuel_injector", delta: 0.1 },
  ],
  valve_ticking: [
    { partId: "valve_clearance", delta: 0.3 },
  ],
};

// ---------------------------------------------------------------------------
// Audio Diagnosis Engine
// ---------------------------------------------------------------------------

export class AudioDiagnosisEngine {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;
  private animationFrameId: number | null = null;
  private isListening = false;
  private isSupported = false;
  private hasPermission = false;
  private error: string | null = null;
  private recentEvents: AudioEvent[] = [];
  private currentLevel = 0;
  private lastEventTimestamps: Map<AudioEventType, number> = new Map();
  private config: AudioDiagnosisConfig;
  private onEventCallback: ((event: AudioEvent) => void) | null = null;
  private frequencyBuffer: Float32Array | null = null;
  private timeDomainBuffer: Float32Array | null = null;
  private lastAnalysisTime = 0;

  constructor(config?: Partial<AudioDiagnosisConfig>) {
    this.config = { ...DEFAULT_AUDIO_CONFIG, ...config };
    this.isSupported = this.checkSupport();
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Returns the current state of the audio engine.
   */
  getState(): AudioDiagnosisState {
    return {
      isListening: this.isListening,
      isSupported: this.isSupported,
      error: this.error,
      recentEvents: [...this.recentEvents.slice(-10)],
      currentLevel: this.currentLevel,
      hasPermission: this.hasPermission,
    };
  }

  /**
   * Registers a callback for when audio events are detected.
   */
  onEvent(callback: (event: AudioEvent) => void): void {
    this.onEventCallback = callback;
  }

  /**
   * Starts listening to the microphone and analyzing audio.
   */
  async start(): Promise<boolean> {
    if (this.isListening) return true;
    if (!this.isSupported) {
      this.error = "Web Audio API is not supported in this browser.";
      return false;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.hasPermission = true;

      this.audioContext = new AudioContext();
      this.microphone = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;

      this.microphone.connect(this.analyser);

      this.frequencyBuffer = new Float32Array(this.analyser.frequencyBinCount);
      this.timeDomainBuffer = new Float32Array(this.analyser.frequencyBinCount);

      this.isListening = true;
      this.error = null;
      this.lastAnalysisTime = performance.now();
      this.analyzeLoop();

      return true;
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        this.error = "Microphone access denied. Please allow microphone permissions.";
        this.hasPermission = false;
      } else {
        this.error = `Failed to start audio capture: ${err.message}`;
      }
      return false;
    }
  }

  /**
   * Stops listening and cleans up resources.
   */
  stop(): void {
    this.isListening = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    this.microphone = null;
    this.analyser = null;
  }

  /**
   * Integrates a detected audio event into the Evidence Engine.
   * Records an observation and updates confidence scores.
   *
   * @param evidenceState - The current Evidence Engine state
   * @param event - The detected audio event
   * @returns Updated EvidenceState
   */
  integrateWithEvidenceEngine(
    evidenceState: EvidenceState,
    event: AudioEvent,
  ): EvidenceState {
    let state = evidenceState;

    // Record the observation
    const symptomId = AUDIO_TO_SYMPTOM[event.type];
    if (symptomId) {
      state = recordObservation(state, symptomId, true, "sensor");
    }

    // Update confidence scores
    const confidenceUpdates = AUDIO_CONFIDENCE_MAP[event.type];
    if (confidenceUpdates) {
      for (const update of confidenceUpdates) {
        state = updateConfidence(
          state,
          update.partId,
          update.delta * event.confidence,
          `Audio diagnosis detected: ${event.type} (confidence: ${(event.confidence * 100).toFixed(0)}%)`,
        );
      }
    }

    return state;
  }

  // -----------------------------------------------------------------------
  // Audio Analysis
  // -----------------------------------------------------------------------

  private analyzeLoop(): void {
    if (!this.isListening || !this.analyser) return;

    // Get frequency and time-domain data
    // Use Float32Array constructor without generic variance issues
    const freqLen = this.analyser.frequencyBinCount;
    const timeLen = this.analyser.frequencyBinCount;
    const freqArray = new Float32Array(freqLen);
    const timeArray = new Float32Array(timeLen);
    this.analyser.getFloatFrequencyData(freqArray);
    this.analyser.getFloatTimeDomainData(timeArray);
    // Copy back to our buffers
    if (this.frequencyBuffer) {
      for (let i = 0; i < freqLen; i++) this.frequencyBuffer[i] = freqArray[i];
    }
    if (this.timeDomainBuffer) {
      for (let i = 0; i < timeLen; i++) this.timeDomainBuffer[i] = timeArray[i];
    }

    // Calculate current amplitude level
    this.currentLevel = this.calculateAmplitude(this.timeDomainBuffer!);

    // Run analysis at the configured interval
    const now = performance.now();
    if (now - this.lastAnalysisTime >= this.config.analysisWindowMs) {
      this.lastAnalysisTime = now;
      this.analyzeAudioFrame();
    }

    this.animationFrameId = requestAnimationFrame(() => this.analyzeLoop());
  }

  private analyzeAudioFrame(): void {
    if (!this.frequencyBuffer || !this.timeDomainBuffer) return;

    const amplitude = this.currentLevel;

    // Skip if below threshold
    if (amplitude < this.config.amplitudeThreshold) return;

    // Extract audio features
    const dominantFreq = this.findDominantFrequency(this.frequencyBuffer);
    const rhythmRate = this.detectRhythm(this.timeDomainBuffer);
    const isContinuous = this.isContinuousSound(this.timeDomainBuffer);

    // Classify the sound against known signatures
    const detected = this.classifySound(dominantFreq, amplitude, rhythmRate, isContinuous);

    if (detected && detected.confidence >= this.config.minConfidence) {
      this.emitEvent(detected);
    }
  }

  /**
   * Classifies the current audio frame against known motorcycle sound signatures.
   */
  private classifySound(
    dominantFreq: number,
    amplitude: number,
    rhythmRate: number | null,
    isContinuous: boolean,
  ): AudioEvent | null {
    let bestMatch: AudioEventType | null = null;
    let bestConfidence = 0;

    for (const [eventType, signature] of Object.entries(AUDIO_SIGNATURES)) {
      let confidence = 0;
      let matches = 0;
      let checks = 0;

      // Check frequency range
      checks++;
      if (dominantFreq >= signature.frequencyRange[0] && dominantFreq <= signature.frequencyRange[1]) {
        // Score based on how centered the frequency is
        const mid = (signature.frequencyRange[0] + signature.frequencyRange[1]) / 2;
        const range = signature.frequencyRange[1] - signature.frequencyRange[0];
        const deviation = Math.abs(dominantFreq - mid) / range;
        confidence += 1 - deviation;
        matches++;
      }

      // Check amplitude range
      checks++;
      if (amplitude >= signature.amplitudeRange[0] && amplitude <= signature.amplitudeRange[1]) {
        const mid = (signature.amplitudeRange[0] + signature.amplitudeRange[1]) / 2;
        const range = signature.amplitudeRange[1] - signature.amplitudeRange[0];
        const deviation = Math.abs(amplitude - mid) / range;
        confidence += 1 - deviation;
        matches++;
      }

      // Check continuity
      checks++;
      if (isContinuous === signature.isContinuous) {
        confidence += 0.8;
        matches++;
      }

      // Check rhythm rate if applicable
      if (signature.isRhythmic && signature.rhythmRate && rhythmRate !== null) {
        checks++;
        if (rhythmRate >= signature.rhythmRate[0] && rhythmRate <= signature.rhythmRate[1]) {
          const mid = (signature.rhythmRate[0] + signature.rhythmRate[1]) / 2;
          const range = signature.rhythmRate[1] - signature.rhythmRate[0];
          const deviation = Math.abs(rhythmRate - mid) / range;
          confidence += 1 - deviation;
          matches++;
        }
      }

      // Calculate final confidence
      const finalConfidence = checks > 0 ? confidence / checks : 0;

      if (finalConfidence > bestConfidence) {
        bestConfidence = finalConfidence;
        bestMatch = eventType as AudioEventType;
      }
    }

    if (bestMatch && bestConfidence >= this.config.minConfidence) {
      return {
        type: bestMatch,
        confidence: bestConfidence,
        timestamp: new Date().toISOString(),
        dominantFrequency: dominantFreq,
        amplitude,
      };
    }

    return null;
  }

  /**
   * Emits a detected audio event, respecting cooldown periods.
   */
  private emitEvent(event: AudioEvent): void {
    const lastTime = this.lastEventTimestamps.get(event.type) || 0;
    const now = Date.now();

    if (now - lastTime < this.config.eventCooldownMs) return;

    this.lastEventTimestamps.set(event.type, now);
    this.recentEvents.push(event);

    // Keep only last 50 events
    if (this.recentEvents.length > 50) {
      this.recentEvents.shift();
    }

    if (this.onEventCallback) {
      this.onEventCallback(event);
    }
  }

  // -----------------------------------------------------------------------
  // Audio Feature Extraction
  // -----------------------------------------------------------------------

  /**
   * Finds the dominant frequency in the frequency data.
   */
  private findDominantFrequency(frequencyData: Float32Array): number {
    let maxAmplitude = -Infinity;
    let maxIndex = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      if (frequencyData[i] > maxAmplitude) {
        maxAmplitude = frequencyData[i];
        maxIndex = i;
      }
    }

    // Convert bin index to frequency
    const sampleRate = this.audioContext?.sampleRate || this.config.sampleRate;
    return (maxIndex * sampleRate) / this.config.fftSize;
  }

  /**
   * Calculates the current amplitude level from time-domain data.
   */
  private calculateAmplitude(timeData: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      sum += Math.abs(timeData[i]);
    }
    return sum / timeData.length;
  }

  /**
   * Detects the rhythm rate (beats per second) from time-domain data.
   * Uses zero-crossing rate analysis.
   */
  private detectRhythm(timeData: Float32Array): number | null {
    let zeroCrossings = 0;
    for (let i = 1; i < timeData.length; i++) {
      if ((timeData[i - 1] >= 0 && timeData[i] < 0) || (timeData[i - 1] < 0 && timeData[i] >= 0)) {
        zeroCrossings++;
      }
    }

    const sampleRate = this.audioContext?.sampleRate || this.config.sampleRate;
    const duration = timeData.length / sampleRate;
    if (duration <= 0) return null;

    return zeroCrossings / (2 * duration);
  }

  /**
   * Determines if the current sound is continuous (sustained) or impulsive (brief).
   */
  private isContinuousSound(timeData: Float32Array): boolean {
    // Count samples above threshold
    let aboveThreshold = 0;
    for (let i = 0; i < timeData.length; i++) {
      if (Math.abs(timeData[i]) > this.config.amplitudeThreshold) {
        aboveThreshold++;
      }
    }

    const ratio = aboveThreshold / timeData.length;
    return ratio > 0.3; // More than 30% of samples above threshold = continuous
  }

  /**
   * Checks if the Web Audio API is supported.
   */
  private checkSupport(): boolean {
    return !!(
      typeof window !== "undefined" &&
      window.AudioContext &&
      navigator.mediaDevices?.getUserMedia
    );
  }
}

/**
 * Creates a singleton instance of the AudioDiagnosisEngine.
 */
let _instance: AudioDiagnosisEngine | null = null;

export function getAudioDiagnosisEngine(): AudioDiagnosisEngine {
  if (!_instance) {
    _instance = new AudioDiagnosisEngine();
  }
  return _instance;
}