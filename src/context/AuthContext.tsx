/**
 * MotoAI AuthContext
 *
 * Provides authentication state and actions to the entire app.
 * - Wraps Firebase Auth via authService
 * - Provides user, loading, login, logout, and registration functions
 * - App remains functional in guest mode (no Firebase configured)
 */
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { User } from "firebase/auth";
import {
  subscribeToAuthState,
  signInWithGoogle,
  loginWithEmail,
  registerWithEmail,
  logoutUser,
  isFirebaseConfigured,
  type AuthState,
} from "../services/authService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthContextValue {
  /** The current Firebase User, or null for guests */
  user: User | null;
  /** True while auth state is being determined */
  isLoading: boolean;
  /** True if auth is initialized (always true after first check) */
  isInitialized: boolean;
  /** True if Firebase is configured and available */
  isConfigured: boolean;
  /** Sign in with Google popup */
  signInGoogle: () => Promise<void>;
  /** Sign in with email/password */
  signInEmail: (email: string, password: string) => Promise<string | null>;
  /** Register a new account */
  signUpEmail: (email: string, password: string) => Promise<string | null>;
  /** Sign out */
  signOut: () => Promise<void>;
  /** The user's display name (from Firebase or fallback) */
  displayName: string;
  /** The user's email */
  email: string;
  /** The user's photo URL */
  photoURL: string;
}

const defaultAuthContext: AuthContextValue = {
  user: null,
  isLoading: true,
  isInitialized: false,
  isConfigured: false,
  signInGoogle: async () => {},
  signInEmail: async () => null,
  signUpEmail: async () => null,
  signOut: async () => {},
  displayName: "",
  email: "",
  photoURL: "",
};

const AuthContext = createContext<AuthContextValue>(defaultAuthContext);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isInitialized: false,
  });

  // Subscribe to Firebase auth state on mount
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((state) => {
      setAuthState(state);
    });
    return unsubscribe;
  }, []);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const signInGoogle = useCallback(async () => {
    const result = await signInWithGoogle();
    if (!result.success && result.error && result.error !== "Sign-in cancelled.") {
      console.warn("Google sign-in failed:", result.error);
    }
  }, []);

  const signInEmail = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const result = await loginWithEmail(email, password);
      if (!result.success) {
        return result.error || "Login failed.";
      }
      return null; // null = no error
    },
    [],
  );

  const signUpEmail = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const result = await registerWithEmail(email, password);
      if (!result.success) {
        return result.error || "Registration failed.";
      }
      return null; // null = no error
    },
    [],
  );

  const signOut = useCallback(async () => {
    await logoutUser();
  }, []);

  // Derive user properties
  const displayName = authState.user?.displayName || authState.user?.email?.split("@")[0] || "Guest";
  const email = authState.user?.email || "";
  const photoURL = authState.user?.photoURL || "";

  const value: AuthContextValue = {
    user: authState.user,
    isLoading: authState.isLoading,
    isInitialized: authState.isInitialized,
    isConfigured: isFirebaseConfigured(),
    signInGoogle,
    signInEmail,
    signUpEmail,
    signOut,
    displayName,
    email,
    photoURL,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * useAuth - hook for accessing auth state and actions.
 * Must be used within an AuthProvider.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}