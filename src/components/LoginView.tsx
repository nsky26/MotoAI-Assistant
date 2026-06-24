/**
 * MotoAI Login View
 *
 * Provides Google Sign-In and Email/Password authentication.
 * - Google Sign-In button (primary)
 * - Email/Password toggle for login vs registration
 * - Loading and error states
 * - Guest mode message when Firebase is not configured
 * - Clean, dark-themed UI matching MotoAI design language
 */
import React, { useState } from "react";
import { Mail, Lock, Chrome, ArrowLeft, AlertCircle, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface LoginViewProps {
  onBack: () => void;
}

type AuthMode = "login" | "register";

export default function LoginView({ onBack }: LoginViewProps) {
  const { signInGoogle, signInEmail, signUpEmail, isConfigured, isLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await signInGoogle();
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const resultError =
        mode === "register"
          ? await signUpEmail(email.trim(), password)
          : await signInEmail(email.trim(), password);

      if (resultError) {
        setError(resultError);
      }
      // If resultError is null, auth state change will navigate away
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0b0c] text-white p-6 justify-between">
      {/* Top indicator bar */}
      <div className="flex items-center gap-1 mb-2 z-15">
        <button
          id="back-btn-login"
          onClick={onBack}
          className="text-zinc-500 hover:text-white transition-all text-xs font-mono-tech flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          BACK
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full gap-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center mx-auto mb-4">
            <User className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold font-cyber text-zinc-100 tracking-tight">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {mode === "login"
              ? "Sign in to save your diagnosis history"
              : "Register to track all your repairs"}
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Firebase not configured message */}
        {!isConfigured && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-center">
            <p className="text-xs text-zinc-500">
              Authentication is not configured. Set up Firebase credentials in your environment variables to enable sign-in.
            </p>
          </div>
        )}

        {/* Google Sign-In */}
        <button
          id="google-signin-btn"
          onClick={handleGoogleSignIn}
          disabled={isSubmitting || !isConfigured || isLoading}
          className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-950 disabled:text-zinc-700 border border-zinc-800 text-zinc-200 py-3.5 px-6 rounded-2xl text-sm font-bold font-cyber tracking-wide uppercase transition-all flex items-center justify-center gap-3 cursor-pointer disabled:cursor-not-allowed"
        >
          <Chrome className="w-5 h-5" />
          {isSubmitting ? "Signing in..." : `Continue with Google`}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-900"></div>
          <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest font-mono-tech">OR</span>
          <div className="flex-1 h-px bg-zinc-900"></div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              id="email-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/60 transition-all placeholder:text-zinc-600"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              id="password-input"
              type="password"
              placeholder="Password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-emerald-500/60 transition-all placeholder:text-zinc-600"
            />
          </div>

          <button
            id="email-auth-submit-btn"
            type="submit"
            disabled={isSubmitting || !isConfigured || isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 py-3.5 px-6 rounded-2xl text-sm font-bold font-cyber tracking-wide uppercase transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? "Please wait..."
              : mode === "login"
                ? "Sign In with Email"
                : "Create Account"}
          </button>
        </form>

        {/* Toggle mode */}
        <button
          id="toggle-auth-mode-btn"
          onClick={toggleMode}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-all font-semibold text-center cursor-pointer"
        >
          {mode === "login"
            ? "Don't have an account? Create one"
            : "Already have an account? Sign in"}
        </button>

        {/* Guest mode note */}
        <p className="text-[10px] text-zinc-600 text-center leading-relaxed">
          You can still use MotoAI without an account.
          <br />
          Signing in adds repair history and saved diagnostics.
        </p>
      </div>
    </div>
  );
}