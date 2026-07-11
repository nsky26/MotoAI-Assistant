import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#0b0b0c] text-white p-6 select-none font-sans">
          <div className="relative border border-red-950/60 bg-[#160c0e]/85 rounded-2xl p-6 max-w-md w-full shadow-[0_0_30px_rgba(239,68,68,0.15)] flex flex-col items-center text-center">
            
            <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center text-zinc-950 mb-4 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
            </div>

            <h2 className="text-lg font-black text-red-200 tracking-wider uppercase font-mono-tech leading-snug">
              SYSTEM ERROR ENCOUNTERED
            </h2>

            <p className="text-xs text-zinc-400 leading-relaxed mt-3 font-medium">
              An unexpected runtime error has crashed the active view. The logs have been collected automatically.
            </p>

            {this.state.error && (
              <div className="w-full bg-zinc-950/90 border border-zinc-900 rounded-xl p-3.5 mt-4 text-[10px] font-mono text-left text-red-400/90 overflow-x-auto max-h-36">
                <span className="font-bold text-red-300">Error:</span> {this.state.error.message}
                {this.state.error.stack && (
                  <pre className="mt-2 text-zinc-600 leading-normal whitespace-pre-wrap font-sans text-[9px]">
                    {this.state.error.stack.split("\n").slice(0, 3).join("\n")}
                  </pre>
                )}
              </div>
            )}

            <button
              id="reload-app-error-boundary-btn"
              onClick={this.handleReload}
              className="mt-6 w-full bg-emerald-500 text-zinc-950 font-bold py-3.5 rounded-xl hover:bg-emerald-400 transition-all text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(16,185,129,0.3)] font-cyber"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
