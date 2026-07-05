/**
 * MotoAI Diagnosis History Card
 *
 * Displays a single saved diagnosis in the history list.
 * Shows issue, severity badge, confidence, cost, difficulty, and timestamp.
 */
import React from "react";
import { AlertTriangle, Clock, Wrench, DollarSign, ChevronRight, CheckCircle2 } from "lucide-react";
import type { DiagnosisRecord } from "../types/history";

interface DiagnosisHistoryCardProps {
  record: DiagnosisRecord;
  onClick: (record: DiagnosisRecord) => void;
}

export default function DiagnosisHistoryCard({ record, onClick }: DiagnosisHistoryCardProps) {
  const severityColor = (s: string) => {
    switch (s) {
      case "CRITICAL": return "bg-red-500/20 text-red-400 border-red-500/40";
      case "HIGH": return "bg-orange-500/20 text-orange-400 border-orange-500/40";
      case "MEDIUM": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
      default: return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <button
      id={`history-card-${record.diagnosisId}`}
      onClick={() => onClick(record)}
      className="w-full bg-zinc-950/80 border border-zinc-900/90 rounded-2xl p-4 flex flex-col gap-2.5 hover:border-zinc-800 transition-all text-left cursor-pointer"
    >
      {/* Top row: issue + severity badge */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-zinc-200 tracking-tight leading-tight flex-1">
          {record.issue}
        </h4>
        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${severityColor(record.severity)}`}>
          {record.severity}
        </span>
      </div>

      {/* Root cause preview */}
      {record.rootCause && (
        <p className="text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
          {record.rootCause}
        </p>
      )}

      {/* Metrics row */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Confidence */}
        <span className="text-[10px] text-emerald-400 font-bold font-mono-tech">
          {record.confidence}% confidence
        </span>

        {/* Difficulty */}
        {record.repairDifficulty && (
          <div className="flex items-center gap-1">
            <Wrench className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-400 font-mono-tech">{record.repairDifficulty}</span>
          </div>
        )}

        {/* Cost */}
        {record.estimatedCost && (
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] text-zinc-400 font-mono-tech truncate max-w-[100px]">{record.estimatedCost}</span>
          </div>
        )}

        {/* Repair completed */}
        {record.repairCompleted && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold font-mono-tech">
            <CheckCircle2 className="w-3 h-3" />
            Done
          </span>
        )}
      </div>

      {/* Bottom row: date + arrow */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-zinc-600" />
          <span className="text-[10px] text-zinc-600 font-mono-tech">
            {formatDate(record.timestamp)}
          </span>
        </div>
        <ChevronRight className="w-4 h-4 text-zinc-600" />
      </div>
    </button>
  );
}