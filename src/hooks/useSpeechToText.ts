/**
 * useSpeechToText — MotoAI Voice Input Hook
 *
 * Provides real-time browser-based speech recognition using the Web Speech API.
 * Falls back from the standard SpeechRecognition to webkitSpeechRecognition
 * for maximum browser compatibility (Chrome, Android Chrome, Edge).
 *
 * Architecture:
 * - Single hook per component instance.
 * - Returns `isListening`, `transcript`, and control functions.
 * - Lifecycle-managed: cleans up recognition on unmount.
 *
 * Android Chrome / Capacitor compatibility:
 * - Android Chrome supports webkitSpeechRecognition as of Chrome 25+.
 * - Capacitor Web View uses the system WebView which inherits Chrome's APIs.
 * - No native plugin required for speech-to-text; this uses the built-in browser API.
 */
import { useState, useEffect, useRef, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpeechToTextState {
  /** True while the microphone is actively listening */
  isListening: boolean;
  /** The current live transcript (updated in real-time as the user speaks) */
  transcript: string;
  /** An error message if something went wrong, or null */
  error: string | null;
  /** True if the browser supports the Web Speech API */
  isSupported: boolean;
}

export interface SpeechToTextActions {
  /** Start listening. Has no effect if already listening or if unsupported. */
  startListening: () => void;
  /** Stop listening. Has no effect if not listening. */
  stopListening: () => void;
  /** Toggle listening on/off */
  toggleListening: () => void;
  /** Reset the transcript without stopping */
  resetTranscript: () => void;
}

export type UseSpeechToTextReturn = SpeechToTextState & SpeechToTextActions;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Continuous mode — keep listening until manually stopped */
const CONTINUOUS = true;

/** Interim results — get partial transcripts in real-time */
const INTERIM_RESULTS = true;

/** Language — matches typical user locale */
const LANG = "en-US";

// ---------------------------------------------------------------------------
// Helper: resolve the SpeechRecognition constructor
// ---------------------------------------------------------------------------

/**
 * Resolves the browser's SpeechRecognition constructor.
 * Returns `undefined` if the browser does not support it.
 */
function getSpeechRecognition(): SpeechRecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;

  // Standard API (Firefox, some Chromium builds)
  if (window.SpeechRecognition) {
    return window.SpeechRecognition;
  }

  // Vendor-prefixed API (Chrome, Android Chrome, Edge, Opera)
  if (window.webkitSpeechRecognition) {
    return window.webkitSpeechRecognition;
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useSpeechToText
 *
 * Provides browser-based speech recognition with real-time transcript updates.
 *
 * @returns {UseSpeechToTextReturn} Combined state + actions
 *
 * Usage:
 * ```ts
 * const { isListening, transcript, startListening, stopListening } = useSpeechToText();
 * ```
 *
 * Android / Capacitor Notes:
 * - Requires microphone permission (handled by the browser prompt).
 * - On Android Chrome, the user must tap a UI element to start recognition
 *   (autoplay policy). The microphone button click satisfies this requirement.
 * - For Capacitor, the `@capacitor/speech-recognition` plugin is available
 *   but this hook uses the Web Speech API natively, which works in
 *   Capacitor's Web View without additional plugins.
 */
export function useSpeechToText(): UseSpeechToTextReturn {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const mountedRef = useRef<boolean>(true);

  // -----------------------------------------------------------------------
  // Initialize on mount, destroy on unmount
  // -----------------------------------------------------------------------
  useEffect(() => {
    mountedRef.current = true;

    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      setIsSupported(false);
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    // Create a single recognition instance for the lifetime of the hook
    const recognition = new Recognition();
    recognition.continuous = CONTINUOUS;
    recognition.interimResults = INTERIM_RESULTS;
    recognition.lang = LANG;

    // --- Event handlers ---

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!mountedRef.current) return;

      let finalTranscript = "";

      // Build the complete transcript from all result items
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      // If we have final text, use it; otherwise fall back to the latest interim
      if (finalTranscript) {
        // Append to existing transcript (continuous mode accumulates)
        setTranscript((prev) => {
          const separator = prev && !prev.endsWith(" ") ? " " : "";
          // Only append if the new text isn't already the end of the transcript
          // (prevents duplicates when interim becomes final)
          if (prev.trim().endsWith(finalTranscript.trim())) {
            return prev;
          }
          return prev + separator + finalTranscript;
        });
      } else if (event.results.length > 0) {
        // Show latest interim result
        const latest = event.results[event.results.length - 1];
        if (!latest.isFinal) {
          // Update transcript with interim text
          const interim = latest[0].transcript;
          setTranscript((prev) => {
            // If interim is already at the end, just return
            if (prev.endsWith(interim)) return prev;
            // Remove any previous interim and append the new one
            const lastSpaceIndex = prev.lastIndexOf(" ");
            const base = lastSpaceIndex >= 0 ? prev.substring(0, lastSpaceIndex) : "";
            return base ? base + " " + interim : interim;
          });
        }
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (!mountedRef.current) return;

      let message: string;
      switch (event.error) {
        case "not-allowed":
          message = "Microphone access denied. Please allow microphone permissions in your browser settings.";
          break;
        case "no-speech":
          message = "No speech detected. Please try again.";
          break;
        case "audio-capture":
          message = "No microphone found. Please connect a microphone.";
          break;
        case "aborted":
          message = "";
          break; // Silent — user or code intentionally stopped
        case "network":
          message = "Network error. Please check your internet connection.";
          break;
        case "service-not-allowed":
          message = "Speech service is not allowed.";
          break;
        default:
          message = `Speech recognition error: ${event.error}`;
      }

      if (message) {
        setError(message);
      }

      // If not aborted, stop listening so the user can retry
      if (event.error !== "aborted") {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (!mountedRef.current) return;
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      mountedRef.current = false;
      try {
        recognition.abort();
      } catch {
        // Ignore cleanup errors
      }
      recognitionRef.current = null;
    };
  }, []);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const startListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || isListening) return;

    setError(null);
    setTranscript("");

    try {
      recognition.start();
      setIsListening(true);
    } catch (err) {
      // Already started — ignore silently
      if (
        err instanceof DOMException &&
        err.name === "InvalidStateError"
      ) {
        return;
      }
      console.warn("SpeechRecognition start error:", err);
      setError("Failed to start speech recognition. Please try again.");
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !isListening) return;

    try {
      recognition.stop();
      setIsListening(false);
    } catch (err) {
      console.warn("SpeechRecognition stop error:", err);
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const resetTranscript = useCallback(() => {
    setTranscript("");
  }, []);

  // -----------------------------------------------------------------------
  // Return combined state + actions
  // -----------------------------------------------------------------------

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
  };
}