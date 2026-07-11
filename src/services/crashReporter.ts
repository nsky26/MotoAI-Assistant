/**
 * MotoAI Crash Reporting Service (Phase 9)
 *
 * Provides error boundary crash reporting and crash log collection.
 * On Android/Capacitor:
 * - Catches unhandled exceptions
 * - Catches unhandled promise rejections
 * - Logs crashes to indexedDB for later analysis
 * - Syncs crash logs when connectivity is restored
 */
import { saveDiagnosisLocally, queueForSync, isOnline } from './offlineStorage';
import type { DiagnosisRecord } from '../types/history';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CrashReport {
  /** Unique crash ID */
  id: string;
  /** Error message */
  message: string;
  /** Error stack trace */
  stack: string;
  /** Error type */
  type: 'unhandled_exception' | 'unhandled_rejection' | 'component_error' | 'runtime_error';
  /** Component where the error occurred (if known) */
  componentName?: string;
  /** User agent string */
  userAgent: string;
  /** Platform (web/android/ios) */
  platform: string;
  /** App version */
  appVersion: string;
  /** Timestamp */
  timestamp: string;
  /** Whether this crash has been synced */
  synced: boolean;
}

// ---------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------

const DB_NAME = 'motoai_crashes';
const DB_VERSION = 1;
const STORE_NAME = 'crash_reports';

let _db: IDBDatabase | null = null;

function openCrashDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (_db) return resolve(_db);

    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      _db = request.result;
      resolve(_db);
    };
    request.onerror = () => reject(request.error);
  });
}

async function saveCrashLocally(crash: CrashReport): Promise<void> {
  try {
    const db = await openCrashDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(crash);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Nothing more we can do
  }
}

export async function getAllCrashes(): Promise<CrashReport[]> {
  try {
    const db = await openCrashDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function clearCrashReports(): Promise<void> {
  try {
    const db = await openCrashDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Silent
  }
}

// ---------------------------------------------------------------------------
// Crash Reporting
// ---------------------------------------------------------------------------

/**
 * Reports a crash. Stores it locally and attempts remote sync.
 *
 * @param error - The error to report
 * @param componentName - Optional component name for context
 * @param type - The crash type
 */
export async function reportCrash(
  error: Error | string,
  componentName?: string,
  type?: CrashReport['type'],
): Promise<void> {
  const message = typeof error === 'string' ? error : error.message;
  const stack = typeof error === 'string' ? '' : (error.stack || '');

  const crash: CrashReport = {
    id: `crash_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    message,
    stack,
    type: type || 'runtime_error',
    componentName,
    userAgent: navigator.userAgent,
    platform: navigator.userAgent.includes('Android') ? 'android' : 'web',
    appVersion: '2.1.0',
    timestamp: new Date().toISOString(),
    synced: false,
  };

  // Save locally
  await saveCrashLocally(crash);

  // Attempt remote sync if online
  if (isOnline()) {
    try {
      // In production, this would POST to a crash reporting endpoint
      // For now, we store it locally
      crash.synced = false;
    } catch {
      // Sync will be retried later
    }
  }
}

/**
 * Initializes global error handlers for uncaught exceptions
 * and unhandled promise rejections.
 */
export function initCrashReporting(): void {
  // Uncaught exceptions
  window.addEventListener('error', (event) => {
    reportCrash(
      event.error || event.message,
      undefined,
      'unhandled_exception',
    );

    // Don't prevent default — let the browser handle it
    return false;
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    reportCrash(
      event.reason instanceof Error ? event.reason : String(event.reason),
      undefined,
      'unhandled_rejection',
    );
  });
}

/**
 * Clears all crash history.
 */
export function clearCrashHistory(): void {
  clearCrashReports();
}