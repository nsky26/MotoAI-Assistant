/**
 * MotoAI Offline Storage Service (Phase 8)
 *
 * Enables MotoAI to work completely offline by loading all knowledge
 * data into memory at startup instead of via fetch() calls.
 *
 * Features:
 * - Embeds all knowledge JSON as typed constants (no network fetch needed)
 * - Provides IndexedDB-backed history cache for offline diagnosis saving
 * - Syncs local history to Firestore when internet returns
 * - Provides connectivity detection
 *
 * Pure TypeScript — no UI, no React.
 * Compatible with Capacitor WebView on Android.
 */
import type { Part, Relationship, Rule, InspectionProtocol, RepairWorkflow } from "./knowledgeTypes";
import type { DiagnosisRecord } from "../types/history";

// ═══════════════════════════════════════════════════════════════════════════
// 1. EMBEDDED KNOWLEDGE DATA
//    All knowledge data is inlined as typed constants.
//    No fetch() calls needed at runtime.
//    Data is loaded from the JSON files at build time via Vite's JSON import.
// ═══════════════════════════════════════════════════════════════════════════

// These imports work with Vite's built-in JSON support
// The type declarations are in src/types/json.d.ts
import type { Part as PartRaw, Relationship as RelRaw, Rule as RuleRaw, InspectionProtocol as ProtoRaw, RepairWorkflow as WfRaw } from "./knowledgeTypes";

// ---------------------------------------------------------------------------
// In-memory caches (populated at startup, no fetch needed)
// ---------------------------------------------------------------------------

let _parts: Map<string, Part> | null = null;
let _relationships: Relationship[] | null = null;
let _rules: Rule[] | null = null;
let _protocols: Map<string, InspectionProtocol> | null = null;
let _workflows: Map<string, RepairWorkflow> | null = null;
let _initialized = false;

/**
 * Initializes all in-memory caches from the embedded knowledge data.
 * Must be called once at app startup (e.g., in main.tsx).
 * After this, all engines can use get*() functions synchronously.
 *
 * @param knowledgeData - Object containing all knowledge data arrays
 */
export function initializeOfflineData(knowledgeData: {
  parts?: PartRaw[];
  relationships?: RelRaw[];
  rules?: RuleRaw[];
  protocols?: ProtoRaw[];
  workflows?: WfRaw[];
}): void {
  if (_initialized) return;

  // Parts
  if (knowledgeData.parts) {
    const partsMap = new Map<string, Part>();
    for (const p of knowledgeData.parts) partsMap.set(p.id, p as Part);
    _parts = partsMap;
  }

  // Relationships
  if (knowledgeData.relationships) {
    _relationships = knowledgeData.relationships as Relationship[];
  }

  // Rules
  if (knowledgeData.rules) {
    _rules = knowledgeData.rules as Rule[];
  }

  // Protocols
  if (knowledgeData.protocols) {
    const protoMap = new Map<string, InspectionProtocol>();
    for (const p of knowledgeData.protocols) protoMap.set(p.id, p as InspectionProtocol);
    _protocols = protoMap;
  }

  // Workflows
  if (knowledgeData.workflows) {
    const wfMap = new Map<string, RepairWorkflow>();
    for (const w of knowledgeData.workflows) {
      const workflow = w as RepairWorkflow;
      workflow.steps = workflow.steps.map((s) => ({
        ...s,
        locked: s.dependency !== null,
        verified: false,
      }));
      wfMap.set(w.id, workflow);
    }
    _workflows = wfMap;
  }

  _initialized = true;
}

// ---------------------------------------------------------------------------
// Synchronous getters (no fetch, no async)
// ---------------------------------------------------------------------------

export function getParts(): Map<string, Part> {
  return _parts || new Map();
}

export function getRelationships(): Relationship[] {
  return _relationships || [];
}

export function getRules(): Rule[] {
  return _rules || [];
}

export function getProtocols(): Map<string, InspectionProtocol> {
  return _protocols || new Map();
}

export function getWorkflows(): Map<string, RepairWorkflow> {
  return _workflows || new Map();
}

export function isInitialized(): boolean {
  return _initialized;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. INDEXEDDB — OFFLINE HISTORY CACHE
//    Stores diagnoses locally when Firestore is unavailable.
//    Syncs to Firestore when connectivity is restored.
// ═══════════════════════════════════════════════════════════════════════════

const DB_NAME = "motoai_offline";
const DB_VERSION = 1;
const STORE_NAME = "diagnoses";
const SYNC_QUEUE = "sync_queue";

let _db: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "diagnosisId" });
      }
      if (!db.objectStoreNames.contains(SYNC_QUEUE)) {
        const store = db.createObjectStore(SYNC_QUEUE, { keyPath: "id", autoIncrement: true });
        store.createIndex("pending", "pending", { unique: false });
      }
    };
    request.onsuccess = () => {
      _db = request.result;
      resolve(_db);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a diagnosis to local IndexedDB.
 * Returns false if IndexedDB is unavailable.
 */
export async function saveDiagnosisLocally(record: DiagnosisRecord): Promise<boolean> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(record);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieves all locally stored diagnoses.
 */
export async function getLocalDiagnoses(): Promise<DiagnosisRecord[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Queues a Firestore write for later sync.
 * Used when Firestore save fails due to no connectivity.
 */
export async function queueForSync(record: DiagnosisRecord): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(SYNC_QUEUE, "readwrite");
    tx.objectStore(SYNC_QUEUE).add({ record, pending: true, createdAt: new Date().toISOString() });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silent fail
  }
}

/**
 * Returns all items waiting to be synced to Firestore.
 */
export async function getSyncQueue(): Promise<Array<{ id: number; record: DiagnosisRecord }>> {
  try {
    const db = await openDb();
    const tx = db.transaction(SYNC_QUEUE, "readonly");
    const index = tx.objectStore(SYNC_QUEUE).index("pending");
    const request = index.getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Removes an item from the sync queue after successful upload.
 */
export async function removeFromSyncQueue(id: number): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(SYNC_QUEUE, "readwrite");
    tx.objectStore(SYNC_QUEUE).delete(id);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silent fail
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. CONNECTIVITY DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns true if the browser reports online.
 */
export function isOnline(): boolean {
  return navigator.onLine;
}

/**
 * Registers a listener for connectivity changes.
 * Returns an unsubscribe function.
 */
export function onConnectivityChange(callback: (online: boolean) => void): () => void {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. SYNC ENGINE
//    Attempts to sync all queued diagnoses to Firestore.
// ═══════════════════════════════════════════════════════════════════════════

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Attempts to sync all queued items to Firestore.
 * Call this when connectivity is restored.
 *
 * @param saveFn - A function that saves a DiagnosisRecord to Firestore.
 * @returns SyncResult with counts and errors.
 */
export async function syncQueueToFirestore(
  saveFn: (record: DiagnosisRecord) => Promise<boolean>,
): Promise<SyncResult> {
  if (!isOnline()) return { synced: 0, failed: 0, errors: ["Still offline"] };

  const queue = await getSyncQueue();
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of queue) {
    try {
      const success = await saveFn(item.record);
      if (success) {
        await removeFromSyncQueue(item.id);
        synced++;
      } else {
        failed++;
        errors.push(`Failed to sync: ${item.record.diagnosisId}`);
      }
    } catch (err: any) {
      failed++;
      errors.push(err.message || "Unknown error");
    }
  }

  return { synced, failed, errors };
}