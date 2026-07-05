/**
 * MotoAI Repair History View
 *
 * Full-featured history dashboard with search, filter, sort, pagination.
 * - Lists previous diagnoses as DiagnosisHistoryCards
 * - Search by issue text
 * - Filter by severity (ALL / LOW / MEDIUM / HIGH / CRITICAL)
 * - Sort by newest/oldest
 * - Load more pagination (20 per page)
 * - Click to reopen a saved diagnosis
 * - Delete confirmation
 * - Empty, loading, and error states
 * - Login prompt for guest users
 */
import React, { useState, useEffect, useCallback } from "react";
import { Search, SlidersHorizontal, ChevronDown, Trash2, RefreshCw, User, Clock, ArrowUpDown, List, AlertCircle } from "lucide-react";
import type { DiagnosisRecord, HistoryFilters } from "../types/history";
import { getDiagnosisHistory, deleteDiagnosis } from "../services/historyService";
import { useAuth } from "../context/AuthContext";
import DiagnosisHistoryCard from "./DiagnosisHistoryCard";

interface RepairHistoryViewProps {
  onReopenDiagnosis: (record: DiagnosisRecord) => void;
  onNavigateToLogin: () => void;
}

const SEVERITY_OPTIONS = ["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

export default function RepairHistoryView({ onReopenDiagnosis, onNavigateToLogin }: RepairHistoryViewProps) {
  const { user } = useAuth();
  const [records, setRecords] = useState<DiagnosisRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<typeof SEVERITY_OPTIONS[number]>("ALL");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch history with current filters
  const fetchHistory = useCallback(async (append = false) => {
    if (!user) return;

    setIsLoading(!append);
    setError(null);
    if (!append) setIsLoadingMore(false);

    try {
      const filters: Partial<HistoryFilters> = {
        searchQuery: debouncedSearch || undefined,
        severity: severityFilter === "ALL" ? undefined : severityFilter,
        sortOrder,
        pageSize: 20,
      };

      const result = await getDiagnosisHistory(user.uid, filters);
      setRecords(append ? [...records, ...result.records] : result.records);
      setHasMore(result.hasMore);
    } catch (err) {
      setError("Failed to load repair history.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, debouncedSearch, severityFilter, sortOrder]);

  // Refetch when filters change
  useEffect(() => {
    fetchHistory();
  }, [debouncedSearch, severityFilter, sortOrder, user?.uid]);

  const handleLoadMore = async () => {
    if (!user || !hasMore) return;
    setIsLoadingMore(true);
    await fetchHistory(true);
  };

  const handleDelete = async (diagnosisId: string) => {
    if (!user) return;
    const success = await deleteDiagnosis(user.uid, diagnosisId);
    if (success) {
      setRecords((prev) => prev.filter((r) => r.diagnosisId !== diagnosisId));
    }
    setDeleteConfirmId(null);
  };

  // Guest state
  if (!user) {
    return (
      <div className="flex flex-col h-full bg-[#0b0b0c] text-white p-6 justify-center items-center text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-950 border-2 border-dashed border-zinc-800 flex items-center justify-center mb-4">
          <List className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-bold text-zinc-200 font-cyber">Sign In to View History</h3>
        <p className="text-xs text-zinc-500 mt-2 max-w-xs">
          Your diagnosis and repair history will appear here once you sign in.
        </p>
        <button
          id="history-login-btn"
          onClick={onNavigateToLogin}
          className="mt-6 bg-emerald-500 text-zinc-950 font-bold px-5 py-3 rounded-xl text-xs uppercase tracking-wider font-cyber cursor-pointer"
        >
          <User className="w-4 h-4 inline mr-1.5" />
          Sign In
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0b0b0c] text-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-lg font-bold font-cyber text-zinc-100 tracking-tight">
          Repair History
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          {records.length > 0
            ? `${records.length} diagnosis${records.length !== 1 ? "es" : ""} saved`
            : "Your saved diagnoses"}
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="px-4 pb-2 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            id="history-search-input"
            type="text"
            placeholder="Search diagnoses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:border-emerald-500/60 placeholder:text-zinc-600"
          />
          <button
            id="toggle-history-filters"
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all cursor-pointer ${
              showFilters || severityFilter !== "ALL" ? "text-emerald-400 bg-emerald-500/10" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2.5 animate-fade-in">
            {/* Severity */}
            <div>
              <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold font-mono-tech mb-1.5 block">Severity</label>
              <div className="flex gap-1.5 flex-wrap">
                {SEVERITY_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverityFilter(s)}
                    className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider border transition-all cursor-pointer ${
                      severityFilter === s
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/40"
                        : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {s === "ALL" ? "All" : s}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold font-mono-tech">Sort by</span>
              <button
                onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                {sortOrder === "newest" ? "Newest first" : "Oldest first"}
                <ArrowUpDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <RefreshCw className="w-8 h-8 text-zinc-600 animate-spin mb-3" />
            <p className="text-xs text-zinc-500">Loading history...</p>
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-red-300">{error}</p>
              <button
                id="retry-history-btn"
                onClick={() => fetchHistory(false)}
                className="text-xs text-red-400 underline mt-1 cursor-pointer"
              >
                Tap to retry
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && records.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-3">
              <List className="w-6 h-6 text-zinc-600" />
            </div>
            <h4 className="text-sm font-bold text-zinc-400">No diagnoses yet</h4>
            <p className="text-xs text-zinc-600 mt-1 max-w-xs">
              {searchQuery || severityFilter !== "ALL"
                ? "No diagnoses match your search criteria. Try adjusting the filters."
                : "Complete your first diagnosis and it will appear here automatically."}
            </p>
          </div>
        )}

        {/* Record list */}
        {records.map((record) => (
          <div key={record.diagnosisId} className="relative group">
            <DiagnosisHistoryCard
              record={record}
              onClick={onReopenDiagnosis}
            />

            {/* Delete button — hover reveal */}
            {deleteConfirmId !== record.diagnosisId ? (
              <button
                id={`delete-history-${record.diagnosisId}`}
                onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(record.diagnosisId); }}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-zinc-500 hover:text-red-400" />
              </button>
            ) : (
              <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10 bg-zinc-900 border border-zinc-800 rounded-lg p-1.5">
                <span className="text-[9px] text-zinc-400 font-mono-tech">Delete?</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(record.diagnosisId); }}
                  className="text-[10px] font-bold text-red-400 px-1.5 py-0.5 cursor-pointer"
                >
                  Yes
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                  className="text-[10px] font-bold text-zinc-500 px-1.5 py-0.5 cursor-pointer"
                >
                  No
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Load more */}
        {hasMore && !isLoading && (
          <button
            id="load-more-history-btn"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-400 py-3 rounded-xl text-xs font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoadingMore ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Load More
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}