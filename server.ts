import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { getFallbackDiagnosis, getFallbackMechanics, resolveFallbackPreset } from "./src/services/diagnosisService";
import { buildDiagnosisPrompt, mapAiToDiagnosis, classifySeverity } from "./src/services/aiDiagnosisService";
import type { AiDiagnosisResponse } from "./src/types";
import { runSymptomDiagnosis } from "./src/services/ruleEngine";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json());

// ────────────────────────────────────────────────────────────────────────────
// Production Middlewares & Security
// ────────────────────────────────────────────────────────────────────────────

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Custom CORS Headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Custom Security Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});

// In-Memory Rate Limiter
const ipRequests = new Map<string, { count: number; resetTime: number }>();
app.use((req, res, next) => {
  const ip = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
  const now = Date.now();
  const limit = 200; // 200 requests
  const windowMs = 60000; // per minute
  
  let reqData = ipRequests.get(ip);
  if (!reqData || now > reqData.resetTime) {
    reqData = { count: 0, resetTime: now + windowMs };
  }
  reqData.count++;
  ipRequests.set(ip, reqData);
  
  if (reqData.count > limit) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "MotoAI Backend",
    timestamp: new Date().toISOString()
  });
});

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
  spark_plug: getFallbackDiagnosis("spark_plug"),
  chain: getFallbackDiagnosis("chain"),
  tire_puncture: getFallbackDiagnosis("tire_puncture"),
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
      model: process.env.GEMINI_MODEL || "gemini-2.5-pro",
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

  // Step 2: Fallback — run local multi-symptom rule engine
  const words = (input || "").toLowerCase().split(/\s+/);
  const symptoms: string[] = [];
  if (words.some(w => w.includes("start") || w.includes("crank") || w.includes("turn"))) {
    symptoms.push("s_weak_cranking");
  }
  if (words.some(w => w.includes("click") || w.includes("tick"))) {
    symptoms.push("s_clicking_noise_battery");
  }
  if (words.some(w => w.includes("spongy") || w.includes("soft") || w.includes("brake"))) {
    symptoms.push("s_soft_brake_lever");
  }
  if (words.some(w => w.includes("grind") || w.includes("pads"))) {
    symptoms.push("s_grinding_noise_brakes");
  }
  if (words.some(w => w.includes("chain") || w.includes("clank") || w.includes("rattle"))) {
    symptoms.push("s_chain_clanking");
  }
  if (words.some(w => w.includes("misfire") || w.includes("sputter") || w.includes("spark"))) {
    symptoms.push("s_engine_misfire");
  }
  if (words.some(w => w.includes("tire") || w.includes("puncture") || w.includes("flat"))) {
    symptoms.push("s_flat_tire_handling");
  }

  const matches = runSymptomDiagnosis(symptoms);
  if (matches.length > 0) {
    return res.json({ success: true, diagnosis: matches[0] });
  }

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
      model: process.env.GEMINI_MODEL || "gemini-2.5-pro",
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

  // Fallback: if vision fails (no key, network error, etc.), run rule engine on prompt terms
  const fallbackInput = prompt || "motorcycle issue";
  const words = fallbackInput.toLowerCase().split(/\s+/);
  const symptoms: string[] = [];
  if (words.some(w => w.includes("start") || w.includes("crank") || w.includes("turn") || w.includes("battery") || w.includes("voltage"))) {
    symptoms.push("s_weak_cranking");
  }
  if (words.some(w => w.includes("click") || w.includes("tick"))) {
    symptoms.push("s_clicking_noise_battery");
  }
  if (words.some(w => w.includes("spongy") || w.includes("soft") || w.includes("brake"))) {
    symptoms.push("s_soft_brake_lever");
  }
  if (words.some(w => w.includes("grind") || w.includes("pads") || w.includes("brake"))) {
    symptoms.push("s_grinding_noise_brakes");
  }
  if (words.some(w => w.includes("chain") || w.includes("clank") || w.includes("rattle") || w.includes("loose"))) {
    symptoms.push("s_chain_clanking");
  }
  if (words.some(w => w.includes("misfire") || w.includes("sputter") || w.includes("spark") || w.includes("plug"))) {
    symptoms.push("s_engine_misfire");
  }
  if (words.some(w => w.includes("tire") || w.includes("puncture") || w.includes("flat"))) {
    symptoms.push("s_flat_tire_handling");
  }

  const matches = runSymptomDiagnosis(symptoms);
  if (matches.length > 0) {
    return res.json({ success: true, diagnosis: matches[0] });
  }

  const preset = resolveFallbackPreset(fallbackInput);
  return res.json({ success: true, diagnosis: PRESET_DIAGNOSES[preset] });
});

// ────────────────────────────────────────────────────────────────────────────
// API Endpoint: Nearby mechanics via OpenStreetMap (Overpass API)
// ────────────────────────────────────────────────────────────────────────────
app.post("/api/nearby-mechanics", async (req, res) => {
  const { latitude, longitude } = req.body;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ success: false, error: "Missing latitude/longitude." });
  }

  const query = `[out:json];
(
node["shop"="motorcycle"](around:5000,${latitude},${longitude});
node["shop"="motorcycle_repair"](around:5000,${latitude},${longitude});
node["shop"="repair"](around:5000,${latitude},${longitude});
node["amenity"="vehicle_repair"](around:5000,${latitude},${longitude});
node["craft"="mechanic"](around:5000,${latitude},${longitude});
node["service"="repair"](around:5000,${latitude},${longitude});
node["motorcycle"="yes"](around:5000,${latitude},${longitude});
);
out center tags;`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Overpass API returned status ${response.status}`);
    }

    const data = await response.json();
    const elements = data.elements || [];
    const allResults: any[] = [];

    for (const element of elements) {
      const tags = element.tags || {};
      const lat = element.lat;
      const lon = element.lon;

      if (lat === undefined || lon === undefined) continue;

      const name = tags.name || "Unnamed Motorcycle Workshop";
      const phone = tags.phone || tags["contact:phone"] || "";
      const opening_hours = tags.opening_hours || "";

      // Build readable address from available address fields
      const addrParts: string[] = [];
      if (tags["addr:housenumber"]) addrParts.push(tags["addr:housenumber"]);
      if (tags["addr:street"]) addrParts.push(tags["addr:street"]);
      if (tags["addr:suburb"]) addrParts.push(tags["addr:suburb"]);
      if (tags["addr:city"]) addrParts.push(tags["addr:city"]);
      if (tags["addr:state"]) addrParts.push(tags["addr:state"]);
      const address = addrParts.join(", ") || "Address not available";

      const distMiles = haversineDistance(latitude, longitude, lat, lon);
      const distanceMeters = distMiles * 1609.34;
      const distanceText = `${distMiles.toFixed(1)} miles away`;

      allResults.push({
        name,
        latitude: lat,
        longitude: lon,
        distanceMeters,
        distanceText,
        distance: distanceText,
        phone,
        address,
        opening_hours,
        source: "osm",
      });
    }

    // Sort by distanceMeters
    allResults.sort((a, b) => a.distanceMeters - b.distanceMeters);

    return res.json({ success: true, mechanics: allResults.slice(0, 10) });
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn("Overpass API search failed:", err.message);
    return res.status(500).json({ success: false, error: err.message });
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

const MAX_MECHANICS = 10;

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
  if (process.env.NODE_ENV === "development") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname);
    console.log(`Serving static assets from production dist path: ${distPath}`);
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