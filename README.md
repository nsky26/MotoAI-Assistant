<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# MotoAI

Lightweight React + Vite app with Firebase Authentication and AI-assisted diagnostics.

## Quickstart

Prerequisites: Node.js (recommended >=16)

1. Install dependencies

   ```bash
   npm install
   ```

2. Create a `.env` or `.env.local` file at the project root and add Firebase credentials:

   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

   Note: Vite exposes `import.meta.env.VITE_*` variables at build time; do not commit secrets.

3. Run in development

   ```bash
   npm run dev
   ```

4. Build for production

   ```bash
   npm run build
   ```

5. Type-check locally

   ```bash
   npx tsc --noEmit
   ```

## Authentication

- Google Sign-In (popup) and Email/Password flows are implemented in `src/services/authService.ts`.
- Wraps Firebase auth with `AuthProvider` in `src/context/AuthContext.tsx`.
- If Firebase env vars are missing the app runs in guest mode.

## CI / Deployment Notes

- Add a pipeline to run `npx tsc --noEmit` and `npm run build` on PRs.
- When deploying, make sure the Vite env variables above are provided to the build environment.

## Contributing

- Commit and push to your repo as usual. This project uses Vite and TypeScript.

---
Generated/updated README to include setup, Firebase env instructions, and build steps.
