import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { getFallbackDiagnosis, getFallbackMechanics, resolveFallbackPreset } from "./src/services/diagnosisService";
import { buildDiagnosisPrompt, mapAiToDiagnosis, classifySeverity } from "./src/services/aiDiagnosisService";
import type { AiDiagnosisResponse } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      throw new Error("GEMINI_API_KEY is not configured in secrets. Fallback to offline presets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Offline fallback diagnoses — single source via service layer
// Uses the same service the frontend imports to guarantee consistency
const PRESET_DIAGNOSES = {
  battery: getFallbackDiagnosis("battery"),
  brake: getFallbackDiagnosis("brake"),
};

// API Endpoint: Text-based AI diagnosis (no keyword matching)
app.post("/api/diagnose", async (req, res) => {
  const { input, isCriticalRequest } = req.body;

  // If user explicitly requests a critical demo, route directly to brake preset
  if (isCriticalRequest) {
    return res.json({ success: true, diagnosis: PRESET_DIAGNOSES.brake });
  }

  // If no input text was provided, default to battery preset
  if (!input) {
    return res.json({ success: true, diagnosis: PRESET_DIAGNOSES.battery });
  }

  // Step 1: Try Gemini API for dynamic AI diagnosis (no keyword matching)
  try {
    const ai = getGeminiClient();
    const prompt = buildDiagnosisPrompt(input);

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            issue: { type: Type.STRING },
            rootCause: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            severity: { type: Type.STRING },
            repairDifficulty: { type: Type.STRING },
            estimatedCost: { type: Type.STRING },
            estimatedRepairTime: { type: Type.STRING },
            repairSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            safetyWarnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["issue", "severity", "confidence", "repairDifficulty", "estimatedCost", "estimatedRepairTime"],
        },
      },
    });

    if (response && response.text) {
      const parsed: AiDiagnosisResponse = JSON.parse(response.text.trim());
      const diagnosis = mapAiToDiagnosis(parsed, input);
      return res.json({ success: true, diagnosis });
    }
  } catch (err: any) {
    console.warn("AI Diagnostics (aiDiagnosisService) failed, using severity-based fallback:", err.message);
  }

  // Step 2: Fallback — classify severity dynamically, NO keyword matching
  const severity = classifySeverity(input);
  if (severity === "CRITICAL" || severity === "HIGH") {
    return res.json({ success: true, diagnosis: PRESET_DIAGNOSES.brake });
  }
  return res.json({ success: true, diagnosis: PRESET_DIAGNOSES.battery });
});

// ────────────────────────────────────────────────────────────────────────────
// API Endpoint: Vision-based image diagnosis
// ────────────────────────────────────────────────────────────────────────────
app.post("/api/diagnose-vision", async (req, res) => {
  const { image, prompt } = req.body;

  if (!image) {
    return res.status(400).json({ success: false, error: "Missing image (base64)." });
  }

  // Validate image size — base64 ~3.5MB limit
  if (image.length > 3_500_000) {
    return res.status(413).json({ success: false, error: "Image too large (max ~3.5 MB base64)." });
  }

  const userPrompt = prompt || "Analyze this motorcycle component for visible issues.";

  try {
    const ai = getGeminiClient();

    // Construct multimodal prompt with both text and image
    const analysisPrompt = `You are MotoAI Vision, an expert motorcycle diagnostic image analyst.

Analyze the provided motorcycle component image carefully. Look specifically for:

1. **Battery terminals** — corrosion, loose connections, cracked casing, acid leaks
2. **Wiring and cables** — frayed insulation, exposed copper, burn marks, loose connectors
3. **Spark plugs** — carbon fouling, oil fouling, electrode wear, cracked porcelain
4. **Visible damage** — cracks, dents, deformation, broken parts
5. **Corrosion & rust** — on terminals, connectors, frame mounting points, exhaust
6. **Fluid leaks** — oil, coolant, brake fluid, fuel — color and location
7. **Loose connections** — unattached hoses, unseated connectors, missing bolts
8. **General condition** — cleanliness, wear indicators, safety hazards

User-described issue (if any): "${userPrompt}"

Return a structured JSON diagnosis with this exact schema:
{
  "issue": "Brief title of the most likely problem (e.g. 'Corroded Battery Terminal' or 'Frayed Brake Cable')",
  "confidence": 95,
  "severity": "LOW | MEDIUM | HIGH | CRITICAL",
  "repairDifficulty": "BEGINNER | INTERMEDIATE | EXPERT",
  "estimatedCost": "Free / Under $20 / $20-$100 / $100-$500 / $500+",
  "repairSteps": ["Step 1...", "Step 2...", "..."]
}

Rules:
- If the image has NO motorcycle or vehicle parts visible, set issue to "No vehicle detected" and confidence to 0.
- Be conservative — if unsure, lower confidence.
- severity defaults to LOW if nothing dangerous is visible.
- estimatedCost should reflect typical DIY cost.
- repairSteps should be clear, actionable, and safe.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: analysisPrompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: image,
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            issue: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            severity: { type: Type.STRING },
            repairDifficulty: { type: Type.STRING },
            estimatedCost: { type: Type.STRING },
            repairSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ["issue", "confidence", "severity", "repairDifficulty", "estimatedCost", "repairSteps"],
        },
      },
    });

    if (response && response.text) {
      const parsed = JSON.parse(response.text.trim());
      return res.json({ success: true, diagnosis: parsed });
    }
  } catch (err: any) {
    console.warn("Vision diagnostics failed, falling back to text-based diagnosis:", err.message);
  }

  // Fallback: if vision fails (no key, network error, etc.), fall through to text-based diagnose
  // Re-route to the text-based diagnose logic with the user prompt
  const fallbackInput = prompt || "motorcycle issue";
  const preset = resolveFallbackPreset(fallbackInput);
  return res.json({ success: true, diagnosis: PRESET_DIAGNOSES[preset] });
});

// ────────────────────────────────────────────────────────────────────────────
// API Endpoint: Nearby mechanics via Google Places API
// ────────────────────────────────────────────────────────────────────────────
app.post("/api/nearby-mechanics", async (req, res) => {
  const { latitude, longitude, issue, severity } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, error: "Missing latitude/longitude." });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    // No API key — return fallback mechanics
    return res.json({ success: true, mechanics: getFallbackMechanics() });
  }

  // Search queries targeting motorcycle-specific services
  const queries = ["motorcycle+repair", "motorcycle+mechanic", "bike+service+center"];
  const allResults: any[] = [];
  const seenPlaceIds = new Set<string>();

  try {
    for (const query of queries) {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&location=${latitude},${longitude}&radius=5000&key=${apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === "OK" && data.results) {
        for (const place of data.results) {
          if (!seenPlaceIds.has(place.place_id) && allResults.length < 10) {
            seenPlaceIds.add(place.place_id);

            // Get detailed info for phone number + open status
            let phone = "";
            let openNow = false;
            try {
              const detailUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number,opening_hours&key=${apiKey}`;
              const detailRes = await fetch(detailUrl);
              const detailData = await detailRes.json();
              if (detailData.status === "OK" && detailData.result) {
                phone = detailData.result.formatted_phone_number || "";
                openNow = detailData.result.opening_hours?.open_now || false;
              }
            } catch {
              // Non-critical — continue without details
            }

            allResults.push({
              name: place.name,
              rating: place.rating || 0,
              reviews: place.user_ratings_total || 0,
              distance: `${((place.geometry?.location?.lat ? haversineDistance(
                latitude, longitude,
                place.geometry.location.lat,
                place.geometry.location.lng
              ) : 0)).toFixed(1)} miles away`,
              phone,
              placeId: place.place_id,
              openNow,
              address: place.formatted_address || "",
            });
          }
        }
      }
    }

    // Sort by rating (highest first)
    allResults.sort((a, b) => b.rating - a.rating);

    return res.json({ success: true, mechanics: allResults.slice(0, MAX_MECHANICS) });
  } catch (err: any) {
    console.warn("Places API search failed:", err.message);
    return res.json({ success: true, mechanics: getFallbackMechanics() });
  }
});

/** Haversine distance in miles between two lat/lng points */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const MAX_MECHANICS = 8;

// Assistant Copilot Question endpoint (for repair help)
app.post("/api/ask-gemini", async (req, res) => {
  const { question, context } = req.body;
  try {
    const ai = getGeminiClient();
    const prompt = `You are MotoAI Copilot. The user is currently diagnosing or repairing their motorcycle. 
Current Problem context: ${JSON.stringify(context || "None")}.
User asks: "${question}".
Provide a concise, practical, pro-mechanic advice answer. Max 100 words. Speak directly, focusing on exact mechanical safety and tool sizes. Highlight critical parts in bold.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });
    
    if (response && response.text) {
      return res.json({ success: true, answer: response.text.trim() });
    }
  } catch (err: any) {
    console.warn("AI Ask failed:", err.message);
  }
  return res.json({ 
    success: true, 
    answer: "No internet or AI keys active. Remember to standardly put safety glasses, wear insulated gloves, locate the negative (black) terminal, loosen the hex bolt, clean pins, and make sure that no keys are in the ignition." 
  });
});

// Setup Vite Dev server or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MotoAI Server running on port ${PORT}`);
  });
}

startServer();