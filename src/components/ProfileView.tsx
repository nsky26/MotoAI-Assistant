/**
 * MotoAI Profile View
 *
 * Displays the current user's profile information and provides logout.
 * - Shows avatar, name, email
 * - Logout button
 * - Guest mode message when not logged in
 */
import React from "react";
import { ArrowLeft, LogOut, User, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface ProfileViewProps {
  onBack: () => void;
  onShowLogin: () => void;
}

export default function ProfileView({ onBack, onShowLogin }: ProfileViewProps) {
  const { user, displayName, email, photoURL, signOut, isConfigured } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0b0c] text-white p-6 justify-between">
      {/* Top indicator bar */}
      <div className="flex items-center gap-1 mb-2 z-15">
        <button
          id="back-btn-profile"
          onClick={onBack}
          className="text-zinc-500 hover:text-white transition-all text-xs font-mono-tech flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          BACK
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full gap-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-zinc-950 border-2 border-zinc-800 flex items-center justify-center overflow-hidden">
            {photoURL ? (
              <img
                src={photoURL}
                alt={displayName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User className="w-10 h-10 text-emerald-400" />
            )}
          </div>

          {user ? (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold font-cyber text-zinc-100 tracking-tight">
                  {displayName}
                </h2>
                <p className="text-xs text-zinc-500 mt-1 flex items-center justify-center gap-1.5">
                  <Mail className="w-3 h-3" />
                  {email}
                </p>
              </div>

              {/* Verified badge */}
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider font-mono-tech">
                  Authenticated
                </span>
              </div>

              {/* Logout Button */}
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="w-full bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-400 py-3.5 px-6 rounded-2xl text-sm font-bold font-cyber tracking-wide uppercase transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-bold font-cyber text-zinc-100 tracking-tight">
                Guest Mode
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                You are using MotoAI without an account.
              </p>

              <button
                id="go-to-login-btn"
                onClick={onShowLogin}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-3.5 px-6 rounded-2xl text-sm font-bold font-cyber tracking-wide uppercase transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
              >
                <User className="w-4 h-4" />
                Sign In
              </button>

              {!isConfigured && (
                <p className="text-[10px] text-zinc-600 mt-4 leading-relaxed text-center">
                  Authentication is not configured. Set up Firebase credentials
                  in your environment variables to enable sign-in.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}