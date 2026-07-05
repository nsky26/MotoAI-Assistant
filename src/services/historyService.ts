/**
 * MotoAI Repair History Service
 *
 * Manages saving, loading, searching, and deleting diagnosis records
 * in Firestore. Each user's diagnoses are stored at:
 *   users/{uid}/diagnoses/{diagnosisId}
 *
 * All operations require an authenticated user (uid).
 * If Firebase is not configured, all functions gracefully return empty/default data.
 */
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  DocumentSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { getFirebaseApp } from "./firebase";
import type { DiagnosisRecord, HistoryPaginationResult, HistoryFilters } from "../types/history";
import type { Diagnosis } from "../types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLLECTION_NAME = "users";
const SUB_COLLECTION = "diagnoses";
const DEFAULT_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Lazy initialization
// ---------------------------------------------------------------------------

let db: Firestore | null = null;

function getDb(): Firestore | null {
  if (db) return db;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    db = getFirestore(app);
    return db;
  } catch (err) {
    console.warn("Firestore initialization failed:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Converts a Diagnosis from the app to a DiagnosisRecord for Firestore.
 */
function diagnosisToRecord(diag: Diagnosis, uid: string, userDescription?: string, voiceTranscript?: string): DiagnosisRecord {
  return {
    diagnosisId: diag.id,
    uid,
    timestamp: new Date().toISOString(),
    issue: diag.issue,
    rootCause: diag.aiRecommendation,
    confidence: diag.confidence,
    severity: (diag.severityLevel as any) || "MEDIUM",
    repairDifficulty: diag.difficulty ? (diag.difficulty >= 5 ? "EXPERT" : diag.difficulty >= 3 ? "INTERMEDIATE" : "BEGINNER") as any : undefined,
    estimatedCost: diag.estimatedCost,
    estimatedRepairTime: diag.estimatedTime,
    repairSteps: diag.steps,
    repairCompleted: false,
    isCritical: diag.isCritical,
    nearbyMechanics: diag.mechanics,
    userDescription,
    voiceTranscript,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Saves a diagnosis to Firestore.
 * If Firebase is not configured, this silently succeeds (no-op).
 *
 * @param uid - The authenticated user's UID
 * @param diagnosis - The diagnosis to save
 * @param userDescription - Optional user's typed description
 * @param voiceTranscript - Optional voice transcript
 * @returns True if saved successfully (or if Firebase is not configured)
 */
export async function saveDiagnosis(
  uid: string,
  diagnosis: Diagnosis,
  userDescription?: string,
  voiceTranscript?: string,
): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return true; // Silent no-op when Firebase not configured

  try {
    const record = diagnosisToRecord(diagnosis, uid, userDescription, voiceTranscript);
    await setDoc(doc(firestore, COLLECTION_NAME, uid, SUB_COLLECTION, diagnosis.id), record);
    return true;
  } catch (err) {
    console.warn("historyService: Failed to save diagnosis:", err);
    return false;
  }
}

/**
 * Retrieves the user's diagnosis history with pagination, filtering, and sorting.
 *
 * @param uid - The authenticated user's UID
 * @param filters - Optional filters for search, severity, sort order, page size
 * @param cursorDoc - Optional document snapshot for cursor-based pagination
 * @returns HistoryPaginationResult with records and hasMore flag
 */
export async function getDiagnosisHistory(
  uid: string,
  filters?: Partial<HistoryFilters>,
  cursorDoc?: DocumentSnapshot,
): Promise<HistoryPaginationResult> {
  const firestore = getDb();
  if (!firestore) {
    return { records: [], hasMore: false };
  }

  try {
    const constraints: QueryConstraint[] = [];
    const pageSize = filters?.pageSize || DEFAULT_PAGE_SIZE;
    const sort = filters?.sortOrder || "newest";

    // Filter by severity
    if (filters?.severity && filters.severity !== "ALL") {
      constraints.push(where("severity", "==", filters.severity));
    }

    // Sort
    constraints.push(orderBy("timestamp", sort === "newest" ? "desc" : "asc"));

    // Pagination
    constraints.push(limit(pageSize + 1)); // Fetch one extra to check hasMore

    if (cursorDoc) {
      constraints.push(startAfter(cursorDoc));
    }

    const q = query(
      collection(firestore, COLLECTION_NAME, uid, SUB_COLLECTION),
      ...constraints,
    );

    const snapshot = await getDocs(q);
    const records: DiagnosisRecord[] = [];
    let hasMore = false;

    snapshot.forEach((docSnapshot) => {
      if (records.length < pageSize) {
        const data = docSnapshot.data() as DiagnosisRecord;
        records.push({ ...data, diagnosisId: docSnapshot.id });
      } else {
        hasMore = true;
      }
    });

    // Client-side search filter (Firestore doesn't support text search natively)
    let filtered = records;
    if (filters?.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      filtered = records.filter(
        (r) =>
          r.issue.toLowerCase().includes(q) ||
          (r.rootCause && r.rootCause.toLowerCase().includes(q)) ||
          (r.userDescription && r.userDescription.toLowerCase().includes(q)),
      );
    }

    return {
      records: filtered,
      hasMore,
      lastCursor: snapshot.docs[snapshot.docs.length - 1] || undefined,
    };
  } catch (err) {
    console.warn("historyService: Failed to fetch history:", err);
    return { records: [], hasMore: false };
  }
}

/**
 * Retrieves a single diagnosis by ID.
 *
 * @param uid - The authenticated user's UID
 * @param diagnosisId - The diagnosis document ID
 * @returns The DiagnosisRecord, or null if not found
 */
export async function getDiagnosisById(
  uid: string,
  diagnosisId: string,
): Promise<DiagnosisRecord | null> {
  const firestore = getDb();
  if (!firestore) return null;

  try {
    const snapshot = await getDoc(doc(firestore, COLLECTION_NAME, uid, SUB_COLLECTION, diagnosisId));
    if (snapshot.exists()) {
      return { ...snapshot.data(), diagnosisId: snapshot.id } as DiagnosisRecord;
    }
    return null;
  } catch (err) {
    console.warn("historyService: Failed to get diagnosis:", err);
    return null;
  }
}

/**
 * Updates a diagnosis record. Used typically to mark repair as completed.
 *
 * @param uid - The authenticated user's UID
 * @param diagnosisId - The diagnosis document ID
 * @param updates - Partial fields to update
 * @returns True if updated successfully
 */
export async function updateDiagnosis(
  uid: string,
  diagnosisId: string,
  updates: Partial<DiagnosisRecord>,
): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return true;

  try {
    await updateDoc(doc(firestore, COLLECTION_NAME, uid, SUB_COLLECTION, diagnosisId), updates);
    return true;
  } catch (err) {
    console.warn("historyService: Failed to update diagnosis:", err);
    return false;
  }
}

/**
 * Deletes a diagnosis record.
 *
 * @param uid - The authenticated user's UID
 * @param diagnosisId - The diagnosis document ID
 * @returns True if deleted successfully
 */
export async function deleteDiagnosis(
  uid: string,
  diagnosisId: string,
): Promise<boolean> {
  const firestore = getDb();
  if (!firestore) return true;

  try {
    await deleteDoc(doc(firestore, COLLECTION_NAME, uid, SUB_COLLECTION, diagnosisId));
    return true;
  } catch (err) {
    console.warn("historyService: Failed to delete diagnosis:", err);
    return false;
  }
}