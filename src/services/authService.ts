/// <reference types="vite/client" />

/**
 * MotoAI Authentication Service
 *
 * Wraps Firebase Authentication with a clean API for the app.
 * Supports:
 * - Google Sign-In (popup)
 * - Email/Password Registration and Login
 * - Logout
 * - Session persistence via onAuthStateChanged
 *
 * Architecture:
 * - Lazy initialization: Firebase is only initialized when first used
 * - Config from environment variables (VITE_FIREBASE_* or hardcoded defaults)
 * - All functions return clean results (no raw Firebase errors to UI)
 * - Guest mode: app works without authentication
 *
 * Android / Capacitor compatibility:
 * - Google Sign-In via popup works in Capacitor WebView
 * - For production Android, @capacitor-firebase/authentication plugin recommended
 * - Email/password works everywhere
 */
import { initializeApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User,
  UserCredential,
} from "firebase/auth";

// ---------------------------------------------------------------------------
// Firebase Configuration
// ---------------------------------------------------------------------------

/**
 * Firebase config. Populated from environment variables at build time.
 * Falls back to placeholder values — the app will work in guest mode
 * without Firebase configured.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthState {
  /** The current Firebase User, or null if not authenticated */
  user: User | null;
  /** True while Firebase is determining initial auth state */
  isLoading: boolean;
  /** True if Firebase has been initialized */
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

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let _isConfigured = false;

/**
 * Returns true if Firebase has been properly configured with real credentials.
 */
export function isFirebaseConfigured(): boolean {
  return _isConfigured && !!firebaseConfig.apiKey && firebaseConfig.apiKey.length > 10;
}

/**
 * Lazily initializes Firebase Auth.
 * Returns null if Firebase is not configured.
 */
function getFirebaseAuth(): Auth | null {
  if (auth) return auth;
  if (!firebaseConfig.apiKey) return null;

  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    _isConfigured = true;
    return auth;
  } catch (err) {
    console.warn("Firebase initialization failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Auth state listener
// ---------------------------------------------------------------------------

export type AuthStateCallback = (state: AuthState) => void;

/**
 * Subscribes to Firebase auth state changes.
 * Returns an unsubscribe function.
 *
 * @param callback - Called with the current AuthState whenever it changes
 * @returns Unsubscribe function
 */
export function subscribeToAuthState(callback: AuthStateCallback): () => void {
  const fbAuth = getFirebaseAuth();

  // If Firebase is not configured, emit guest state immediately
  if (!fbAuth) {
    callback({
      user: null,
      isLoading: false,
      isInitialized: true,
    });
    return () => {};
  }

  // Emit loading state first
  callback({
    user: null,
    isLoading: true,
    isInitialized: false,
  });

  const unsubscribe = onAuthStateChanged(
    fbAuth,
    (user) => {
      callback({
        user,
        isLoading: false,
        isInitialized: true,
      });
    },
    (error) => {
      console.warn("Firebase auth state error:", error);
      callback({
        user: null,
        isLoading: false,
        isInitialized: true,
      });
    },
  );

  return unsubscribe;
}

// ---------------------------------------------------------------------------
// Authentication actions
// ---------------------------------------------------------------------------

/**
 * Signs in with Google via popup.
 *
 * @returns AuthResult with user data or error
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  const fbAuth = getFirebaseAuth();
  if (!fbAuth) {
    return { success: false, user: null, error: "Firebase is not configured." };
  }

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: "select_account",
    });
    const result: UserCredential = await signInWithPopup(fbAuth, provider);
    return { success: true, user: result.user };
  } catch (err: any) {
    // User closed the popup — not an error
    if (err.code === "auth/popup-closed-by-user") {
      return { success: false, user: null, error: "Sign-in cancelled." };
    }
    if (err.code === "auth/cancelled-popup-request") {
      return { success: false, user: null, error: "Sign-in cancelled." };
    }
    console.warn("Google Sign-In error:", err);
    return {
      success: false,
      user: null,
      error: err.message || "Google sign-in failed. Please try again.",
    };
  }
}

/**
 * Creates a new account with email and password.
 *
 * @param email - User's email address
 * @param password - User's password (min 6 chars)
 * @returns AuthResult with user data or error
 */
export async function registerWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const fbAuth = getFirebaseAuth();
  if (!fbAuth) {
    return { success: false, user: null, error: "Firebase is not configured." };
  }

  try {
    const result: UserCredential = await createUserWithEmailAndPassword(
      fbAuth,
      email,
      password,
    );
    return { success: true, user: result.user };
  } catch (err: any) {
    let message: string;
    switch (err.code) {
      case "auth/email-already-in-use":
        message = "This email is already registered. Try logging in instead.";
        break;
      case "auth/weak-password":
        message = "Password must be at least 6 characters.";
        break;
      case "auth/invalid-email":
        message = "Please enter a valid email address.";
        break;
      default:
        message = err.message || "Registration failed. Please try again.";
    }
    return { success: false, user: null, error: message };
  }
}

/**
 * Signs in with email and password.
 *
 * @param email - User's email address
 * @param password - User's password
 * @returns AuthResult with user data or error
 */
export async function loginWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  const fbAuth = getFirebaseAuth();
  if (!fbAuth) {
    return { success: false, user: null, error: "Firebase is not configured." };
  }

  try {
    const result: UserCredential = await signInWithEmailAndPassword(
      fbAuth,
      email,
      password,
    );
    return { success: true, user: result.user };
  } catch (err: any) {
    let message: string;
    switch (err.code) {
      case "auth/user-not-found":
        message = "No account found with this email.";
        break;
      case "auth/wrong-password":
        message = "Incorrect password. Please try again.";
        break;
      case "auth/invalid-credential":
        message = "Invalid email or password.";
        break;
      case "auth/too-many-requests":
        message = "Too many attempts. Please try again later.";
        break;
      default:
        message = err.message || "Login failed. Please try again.";
    }
    return { success: false, user: null, error: message };
  }
}

/**
 * Signs out the current user.
 *
 * @returns True if sign-out was successful
 */
export async function logoutUser(): Promise<boolean> {
  const fbAuth = getFirebaseAuth();
  if (!fbAuth) return true;

  try {
    await signOut(fbAuth);
    return true;
  } catch (err) {
    console.warn("Logout error:", err);
    return false;
  }
}