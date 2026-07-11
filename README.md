
# MotoAI Assistant

MotoAI is a premium, real-world hybrid motorcycle diagnostic assistant combining an offline Boolean Rule Engine, Bayesian probability networks, a component Knowledge Graph, and dynamic Guided Repair Workflows.

## Core Features

*   **Intelligent Hybrid Diagnostics**: Merges evidence from YOLO camera scans, acoustic signatures, manual symptom cards, and mileage metrics.
*   **Offline Dependency Traversal**: Features a local component Knowledge Graph (e.g. `Battery -> Relay -> Starter -> Engine`) to discover downstream affected elements and root causes.
*   **Guided AR Repair Workflows**: Provides 5-step repair procedures including live viewfinder scan verifications, fastener torque specs (Nm), and fluid capacity values.
*   **Adaptive Replanning**: Automatically recalculates and structures alternative repair plans if a step verification fails.

---

## Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file at the root of the project using the template provided in [.env.example](file:///c:/Users/nanne/Downloads/motoai/.env.example):
```env
# Backend variables
PORT=3000
NODE_ENV=production
GEMINI_API_KEY=your_gemini_key

# Frontend variables
VITE_API_URL=https://your-backend.onrender.com
VITE_FIREBASE_API_KEY=your_key
```

### 3. Local Development
Run the local Express API and Vite web dev server:
```bash
npm run dev
```

### 4. Build & Compile Checks
```bash
npx tsc --noEmit
npm run build
```

### 5. Native Android Sync
Sync the built web bundles into the native Capacitor Android project:
```bash
npx cap sync android
```
Navigate to `./android/` and compile the debug application package:
```bash
./gradlew assembleDebug
```

---

## Production Deployment

### Backend (Render)
This project is configured with a blueprint configuration in [render.yaml](file:///c:/Users/nanne/Downloads/motoai/render.yaml). Deploys run automatically and expose the health status check endpoint at `/api/health`.

### Environment Secret Mappings
Secrets (including API keys and `google-services.json` structures) are excluded from index indexing via [.gitignore](file:///c:/Users/nanne/Downloads/motoai/.gitignore).
