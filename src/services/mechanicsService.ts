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
import { getApiUrl } from "./apiClient";

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

import { Capacitor } from "@capacitor/core";

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
  const cacheKey = `mechanics_${latitude.toFixed(3)}_${longitude.toFixed(3)}`;

  // Try retrieving from client cache
  try {
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      const parsed = JSON.parse(cachedData);
      const now = Date.now();
      const ageMs = now - parsed.timestamp;
      const ageHours = ageMs / (1000 * 60 * 60);
      if (ageHours < 24) {
        // Cache is valid! Mark as cache
        const mechanics = parsed.mechanics.map((m: any) => ({
          ...m,
          source: "cache" as const,
        }));
        return mechanics;
      }
    }
  } catch (cacheErr) {
    console.warn("mechanicsService: Error reading cache:", cacheErr);
  }

  // Not cached or expired -> fetch from API
  try {
    const response = await fetch(getApiUrl("/api/nearby-mechanics"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ latitude, longitude }),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.mechanics) {
      throw new Error(data.error || "Failed response format from server");
    }

    // Save success to localStorage cache with timestamp
    try {
      const cacheObject = {
        timestamp: Date.now(),
        mechanics: data.mechanics,
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheObject));
    } catch (cacheWriteErr) {
      console.warn("mechanicsService: Failed to write to cache:", cacheWriteErr);
    }

    return data.mechanics;
  } catch (fetchErr) {
    console.warn("mechanicsService: Fetch nearby mechanics failed, attempting expired cache:", fetchErr);

    // Attempt to return local cache even if expired
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const mechanics = parsed.mechanics.map((m: any) => ({
          ...m,
          source: "cache" as const,
        }));
        return mechanics;
      }
    } catch (cacheErr) {
      console.warn("mechanicsService: Error reading expired cache:", cacheErr);
    }

    // If no local cache exists, return getFallbackMechanics()
    const fallbacks = getFallbackMechanics();
    return fallbacks.map(f => ({
      ...f,
      source: "fallback" as const,
    }));
  }
}

/**
 * Builds a navigation URL for a given place.
 *
 * @returns A URL string that opens navigation
 */
export function buildNavigationUrl(
  latOrPlaceId?: number | string,
  lonOrName?: number | string,
  name?: string
): string {
  if (typeof latOrPlaceId === "number" && typeof lonOrName === "number") {
    const isAndroid = Capacitor.getPlatform() === "android";
    if (isAndroid) {
      const label = encodeURIComponent(name || "Motorcycle Repair");
      return `geo:${latOrPlaceId},${lonOrName}?q=${latOrPlaceId},${lonOrName}(${label})`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${latOrPlaceId},${lonOrName}`;
  }

  // Fallback to name search
  const shopName = typeof latOrPlaceId === "string" ? latOrPlaceId : (typeof lonOrName === "string" ? lonOrName : name);
  const encoded = encodeURIComponent(shopName || "motorcycle repair");
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