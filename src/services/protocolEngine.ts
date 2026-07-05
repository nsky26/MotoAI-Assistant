/**
 * MotoAI Protocol Engine (Phase 3.4)
 *
 * Manages inspection protocols — starts a protocol, advances through
 * steps, branches based on pass/fail, and tracks completion.
 *
 * Each protocol comes from knowledge/inspection_protocols.json.
 * The engine can chain protocols based on results.
 *
 * Pure TypeScript — no UI, no React, no Firebase.
 */
import type { InspectionProtocol, ProtocolStep, ProtocolSession } from "./knowledgeTypes";

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

let _protocols: Map<string, InspectionProtocol> | null = null;

async function loadProtocols(): Promise<Map<string, InspectionProtocol>> {
  if (_protocols) return _protocols;
  try {
    const res = await fetch("/knowledge/inspection_protocols.json");
    const data = await res.json();
    const map = new Map<string, InspectionProtocol>();
    for (const p of data.protocols) map.set(p.id, p as InspectionProtocol);
    _protocols = map;
    return map;
  } catch {
    _protocols = new Map();
    return _protocols;
  }
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

const _sessions = new Map<string, ProtocolSession>();

/**
 * Starts a new inspection protocol session.
 *
 * @param protocolId - The protocol ID to start
 * @returns A new ProtocolSession
 */
export async function startProtocol(protocolId: string): Promise<ProtocolSession | null> {
  const protocols = await loadProtocols();
  const protocol = protocols.get(protocolId);
  if (!protocol) return null;

  const session: ProtocolSession = {
    protocolId,
    currentStepIndex: 0,
    passedSteps: [],
    failedSteps: [],
    completed: false,
    passed: false,
  };

  const sessionId = `${protocolId}_${Date.now()}`;
  _sessions.set(sessionId, session);
  session.sessionId = sessionId;

  return session;
}

/**
 * Gets the current step instruction for an active session.
 *
 * @param session - The active protocol session
 * @returns The current ProtocolStep, or null if completed
 */
export function getCurrentStep(session: ProtocolSession): ProtocolStep | null {
  const protocols = _protocols;
  if (!protocols) return null;

  const protocol = protocols.get(session.protocolId);
  if (!protocol || session.completed) return null;

  return protocol.steps[session.currentStepIndex] || null;
}

/**
 * Marks the current step as passed and advances to the next step.
 * If all steps pass and meet the passThreshold, the protocol passes.
 *
 * @param session - The active protocol session
 * @returns Updated session
 */
export async function advanceProtocol(
  session: ProtocolSession,
): Promise<ProtocolSession> {
  if (session.completed) return session;

  const protocols = await loadProtocols();
  const protocol = protocols.get(session.protocolId);
  if (!protocol) return session;

  // Mark current step as passed
  session.passedSteps.push(session.currentStepIndex);

  // Move to next step
  if (session.currentStepIndex < protocol.steps.length - 1) {
    session.currentStepIndex++;
  } else {
    // Protocol complete — check pass/fail
    session.completed = true;
    session.passed = session.passedSteps.length >= protocol.passThreshold;
  }

  return { ...session };
}

/**
 * Marks the current step as failed and advances.
 * Tracks failure for branching decisions.
 *
 * @param session - The active protocol session
 * @returns Updated session
 */
export async function failStep(session: ProtocolSession): Promise<ProtocolSession> {
  if (session.completed) return session;

  const protocols = await loadProtocols();
  const protocol = protocols.get(session.protocolId);
  if (!protocol) return session;

  session.failedSteps.push(session.currentStepIndex);

  if (session.currentStepIndex < protocol.steps.length - 1) {
    session.currentStepIndex++;
  } else {
    session.completed = true;
    session.passed = false;
  }

  return { ...session };
}

/**
 * Branches to the next protocol based on pass/fail result.
 *
 * @param session - The completed session
 * @returns The next protocol ID, or null if no further protocol
 */
export async function branchProtocol(session: ProtocolSession): Promise<string | null> {
  if (!session.completed) return null;

  const protocols = await loadProtocols();
  const protocol = protocols.get(session.protocolId);
  if (!protocol) return null;

  if (session.passed) {
    return protocol.nextProtocolOnPass;
  }
  return protocol.nextProtocolOnFail;
}

/**
 * Completes a protocol session and returns the final result.
 *
 * @param session - The protocol session to complete
 * @returns The completed session
 */
export function completeProtocol(session: ProtocolSession): ProtocolSession {
  const protocols = _protocols;
  const protocol = protocols ? protocols.get(session.protocolId) : undefined;

  session.completed = true;
  session.passed = protocol
    ? session.passedSteps.length >= protocol.passThreshold
    : false;

  return { ...session };
}

/**
 * Gets the total number of steps in a protocol.
 *
 * @param protocolId - The protocol ID
 * @returns Total step count
 */
export async function getProtocolStepCount(protocolId: string): Promise<number> {
  const protocols = await loadProtocols();
  const protocol = protocols.get(protocolId);
  return protocol?.steps.length || 0;
}

// Extend the ProtocolSession interface to include sessionId
declare module "./knowledgeTypes" {
  interface ProtocolSession {
    sessionId?: string;
  }
}