/// <reference types="vite/client" />

/**
 * MotoAI Authentication Service
 *
 * Wraps Firebase Authentication with a clean API for the app.
 * Uses the shared firebase.ts for app initialization.
 */
import {
  getAuth,
  Auth,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { getFirebaseApp, isFirebaseConfigured as checkFirebaseConfigured } from "./firebase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
}

export interface AuthResult {
  success: boolean;
  user: User | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// Lazy initialization
// ---------------------------------------------------------------------------

let auth: Auth | null = null;

function getFirebaseAuth(): Auth | null {
  if (auth) return auth;

  const app = getFirebaseApp();
  if (!app) return null;

  try {
    auth = getAuth(app);
    return auth;
  } catch (err) {
    console.warn("Firebase Auth initialization failed:", err);
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  return checkFirebaseConfigured() && !!getFirebaseAuth();
}

// ---------------------------------------------------------------------------
// Auth state listener
// ---------------------------------------------------------------------------

export type AuthStateCallback = (state: AuthState) => void;

export function subscribeToAuthState(callback: AuthStateCallback): () => void {
  const fbAuth = getFirebaseAuth();

  if (!fbAuth) {
    callback({ user: null, isLoading: false, isInitialized: true });
    return () => {};
  }

  callback({ user: null, isLoading: true, isInitialized: false });

  // Handle redirect result if coming back from redirect
  getRedirectResult(fbAuth)
    .then((result) => {
      if (result?.user) {
        callback({ user: result.user, isLoading: false, isInitialized: true });
      }
    })
    .catch((err) => {
      console.warn("Firebase Auth redirect result retrieval failed:", err);
    });

  const unsubscribe = onAuthStateChanged(
    fbAuth,
    (user) => {
      callback({ user, isLoading: false, isInitialized: true });
    },
    () => {
      callback({ user: null, isLoading: false, isInitialized: true });
    },
  );

  return unsubscribe;
}

// ---------------------------------------------------------------------------
// Authentication actions
// ---------------------------------------------------------------------------

export async function signInWithGoogle(): Promise<AuthResult> {
  const fbAuth = getFirebaseAuth();
  if (!fbAuth) return { success: false, user: null, error: "Firebase is not configured." };

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    if (Capacitor.isNativePlatform()) {
      await signInWithRedirect(fbAuth, provider);
      return { success: true, user: null };
    } else {
      const result: UserCredential = await signInWithPopup(fbAuth, provider);
      return { success: true, user: result.user };
    }
  } catch (err: any) {
    if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
      return { success: false, user: null, error: "Sign-in cancelled." };
    }
    return { success: false, user: null, error: err.message || "Google sign-in failed." };
  }
}

export async function registerWithEmail(email: string, password: string): Promise<AuthResult> {
  const fbAuth = getFirebaseAuth();
  if (!fbAuth) return { success: false, user: null, error: "Firebase is not configured." };

  try {
    const result = await createUserWithEmailAndPassword(fbAuth, email, password);
    return { success: true, user: result.user };
  } catch (err: any) {
    const map: Record<string, string> = {
      "auth/email-already-in-use": "This email is already registered. Try logging in instead.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/invalid-email": "Please enter a valid email address.",
    };
    return { success: false, user: null, error: map[err.code] || err.message || "Registration failed." };
  }
}

export async function loginWithEmail(email: string, password: string): Promise<AuthResult> {
  const fbAuth = getFirebaseAuth();
  if (!fbAuth) return { success: false, user: null, error: "Firebase is not configured." };

  try {
    const result = await signInWithEmailAndPassword(fbAuth, email, password);
    return { success: true, user: result.user };
  } catch (err: any) {
    const map: Record<string, string> = {
      "auth/user-not-found": "No account found with this email.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-credential": "Invalid email or password.",
      "auth/too-many-requests": "Too many attempts. Try again later.",
    };
    return { success: false, user: null, error: map[err.code] || err.message || "Login failed." };
  }
}

export async function logoutUser(): Promise<boolean> {
  const fbAuth = getFirebaseAuth();
  if (!fbAuth) return true;
  try {
    await signOut(fbAuth);
    return true;
  } catch { return false; }
}