/**
 * MotoAI Mechanics Service
 *
 * Handles real-time mechanic search via Google Places API through
 * the backend proxy endpoint. Provides geolocation utilities and
 * manages loading/error states for the mechanic recommendation flow.
 *
 * Architecture:
 * - Uses navigator.geolocation to get the user's current position
 * - Sends lat/lng + issue context to backend POST /api/nearby-mechanics
 * - Backend proxies to Google Places API (protects API key)
 * - Returns structured Mechanic[] for UI display
 *
 * Android / Capacitor compatibility:
 * - navigator.geolocation works on Android Chrome and Capacitor WebView
 * - For Capacitor-native, @capacitor/geolocation plugin can be used later
 * - Permission is requested automatically by the browser
 */
import type { Mechanic, MechanicSearchResponse, SeverityLevel } from "../types";
import { getFallbackMechanics } from "./diagnosisService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface MechanicSearchResult {
  mechanics: Mechanic[];
  isLoading: boolean;
  error: string | null;
  /** True if the user denied geolocation permission */
  permissionDenied: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default radius in meters for the Places API search */
const SEARCH_RADIUS_METERS = 5000; // 5km / ~3 miles

/** Search queries to send to Places API for broad coverage */
const SEARCH_QUERIES = [
  "motorcycle repair shop",
  "motorcycle mechanic",
  "motorcycle service center",
  "bike repair garage",
];

/** Maximum results to return */
const MAX_RESULTS = 8;

/** Timeout for geolocation request (ms) */
const GEOLOCATION_TIMEOUT_MS = 10000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Requests the user's current geolocation.
 * Wraps the browser's navigator.geolocation API in a Promise.
 *
 * @returns A promise resolving to GeolocationPosition
 * @throws If permission is denied or location is unavailable
 */
export function requestGeolocation(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error("PERMISSION_DENIED"));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error("POSITION_UNAVAILABLE"));
            break;
          case error.TIMEOUT:
            reject(new Error("TIMEOUT"));
            break;
          default:
            reject(new Error(`Geolocation error: ${error.message}`));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: 300000, // 5 minutes cache
      },
    );
  });
}

/**
 * Fetches nearby mechanics from the backend Places API proxy.
 *
 * @param latitude - User's latitude
 * @param longitude - User's longitude
 * @param issue - Optional diagnosed issue title for context
 * @param severity - Optional severity level
 * @returns A promise resolving to an array of Mechanic objects
 */
export async function fetchNearbyMechanics(
  latitude: number,
  longitude: number,
  issue?: string,
  severity?: SeverityLevel,
): Promise<Mechanic[]> {
  try {
    const response = await fetch("/api/nearby-mechanics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude,
        longitude,
        issue,
        severity,
      }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data: MechanicSearchResponse = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.mechanics || [];
  } catch (err) {
    console.warn("mechanicsService: Failed to fetch nearby mechanics:", err);
    // Return fallback mechanics on failure
    return getFallbackMechanics();
  }
}

/**
 * Builds a Google Maps navigation URL for a given place.
 *
 * @param placeId - The Google Places place_id
 * @returns A URL string that opens Google Maps navigation
 */
export function buildNavigationUrl(placeId?: string, name?: string): string {
  if (placeId) {
    return `https://www.google.com/maps/dir/?api=1&destination_place_id=${placeId}`;
  }
  // Fallback: search by name
  const encoded = encodeURIComponent(name || "motorcycle repair");
  return `https://www.google.com/maps/search/${encoded}`;
}

/**
 * Builds a tel: URI for calling a mechanic.
 *
 * @param phone - The mechanic's phone number
 * @returns A tel: URI string
 */
export function buildPhoneUrl(phone?: string): string | null {
  if (!phone) return null;
  // Strip non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}

/**
 * Formats a distance value from meters to a human-readable string.
 *
 * @param meters - Distance in meters
 * @returns A formatted string like "0.8 miles away" or "2.4 miles away"
 */
export function formatDistance(meters: number): string {
  const miles = meters / 1609.34;
  if (miles < 0.1) return "Less than 0.1 miles away";
  if (miles < 1) return `${(Math.round(miles * 10) / 10).toFixed(1)} miles away`;
  return `${Math.round(miles)} miles away`;
}