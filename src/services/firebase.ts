/**
 * MotoAI Shared Firebase Initialization
 *
 * Single shared Firebase app instance used by both authService
 * and historyService. Prevents duplicate initialization.
 *
 * Lazily initialized — no network calls until first import
 * that triggers getFirebaseApp().
 */
/// <reference types="vite/client" />

import { initializeApp, FirebaseApp, getApps } from "firebase/app";

let app: FirebaseApp | null = null;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

/**
 * Returns true if Firebase has been configured with real credentials.
 */
export function isFirebaseConfigured(): boolean {
  const isConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey.length > 10;
  if (!isConfigured) {
    console.warn("Firebase configuration is incomplete. Please check your VITE_FIREBASE_* environment variables.");
  }
  return isConfigured;
}

/**
 * Returns the shared Firebase app instance.
 * Creates it on first call if it doesn't exist.
 * Returns null if Firebase is not configured.
 */
export function getFirebaseApp(): FirebaseApp | null {
  if (app) return app;
  if (!isFirebaseConfigured()) return null;

  try {
    // Avoid double-initialization in dev with StrictMode
    if (getApps().length > 0) {
      app = getApps()[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
    return app;
  } catch (err) {
    console.warn("Firebase initialization failed:", err);
    return null;
  }
}