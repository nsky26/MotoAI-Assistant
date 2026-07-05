/**
 * MotoAI Knowledge Graph (Phase 3.3)
 *
 * Loads the parts and relationships from the knowledge base, builds
 * a directed graph, and provides traversal functions for finding
 * dependencies between parts, hidden part discovery, access paths,
 * and repair sequences.
 *
 * Pure TypeScript — no UI, no React, no Firebase.
 * Unit-test friendly.
 */
import type { Part, Relationship, GraphNode } from "./knowledgeTypes";

// ---------------------------------------------------------------------------
// In-memory Graph
// ---------------------------------------------------------------------------

let _parts: Map<string, Part> | null = null;
let _relationships: Relationship[] | null = null;

/**
 * Loads parts from knowledge/parts.json.
 */
async function loadParts(): Promise<Map<string, Part>> {
  if (_parts) return _parts;
  try {
    const res = await fetch("/knowledge/parts.json");
    const data = await res.json();
    const map = new Map<string, Part>();
    for (const p of data.parts) map.set(p.id, p as Part);
    _parts = map;
    return map;
  } catch {
    _parts = new Map();
    return _parts;
  }
}

/**
 * Loads relationships from knowledge/relationships.json.
 */
async function loadRelationships(): Promise<Relationship[]> {
  if (_relationships) return _relationships;
  try {
    const res = await fetch("/knowledge/relationships.json");
    const data = await res.json();
    _relationships = data.relationships as Relationship[];
    return _relationships;
  } catch {
    _relationships = [];
    return _relationships;
  }
}

// ---------------------------------------------------------------------------
// Graph Traversal
// ---------------------------------------------------------------------------

/**
 * Finds all parts that must be removed to access a target part.
 *
 * @param partId - The target part ID
 * @returns Ordered list of part IDs in the access path
 */
export async function findAccessPath(partId: string): Promise<Part[]> {
  const parts = await loadParts();
  const part = parts.get(partId);
  if (!part) return [];

  const path: Part[] = [];
  for (const accessPartId of part.accessPath) {
    if (accessPartId !== partId) {
      const accessPart = parts.get(accessPartId);
      if (accessPart) path.push(accessPart);
    }
  }
  return path;
}

/**
 * Finds all dependencies of a part by traversing incoming relationships.
 * A dependency is a part that must function for this part to work.
 *
 * @param partId - The target part ID
 * @returns Array of GraphNodes with depth from target
 */
export async function findDependencies(partId: string): Promise<GraphNode[]> {
  const parts = await loadParts();
  const rels = await loadRelationships();

  const visited = new Set<string>();
  const result: GraphNode[] = [];
  const queue: { id: string; depth: number }[] = [{ id: partId, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    const part = parts.get(current.id);
    if (!part) continue;

    // Find relationships where this part is the target (what powers/feeds it)
    const incomingRels = rels.filter((r) => r.target === current.id);
    const node: GraphNode = {
      part,
      relationships: incomingRels,
      depth: current.depth,
    };
    result.push(node);

    // Queue dependency sources
    for (const rel of incomingRels) {
      if (!visited.has(rel.source)) {
        queue.push({ id: rel.source, depth: current.depth + 1 });
      }
    }
  }

  return result;
}

/**
 * Finds all parts that depend on a given part (reverse dependencies).
 * Useful for understanding impact of a part failure.
 *
 * @param partId - The part ID to check
 * @returns Array of part IDs that depend on this part
 */
export async function findDependents(partId: string): Promise<Part[]> {
  const parts = await loadParts();
  const rels = await loadRelationships();

  const result: Part[] = [];
  const visited = new Set<string>();
  const queue = [partId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    // Find outgoing relationships (this part powers/feeds others)
    const outgoing = rels.filter((r) => r.source === current);
    for (const rel of outgoing) {
      const dependent = parts.get(rel.target);
      if (dependent && !visited.has(rel.target)) {
        result.push(dependent);
        queue.push(rel.target);
      }
    }
  }

  return result;
}

/**
 * Generates the optimal repair sequence by analyzing the dependency graph.
 * Parts with no dependencies come first (foundation parts).
 *
 * @param targetPartId - The part to repair/replace
 * @returns Ordered list of part IDs in repair sequence
 */
export async function generateRepairSequence(targetPartId: string): Promise<string[]> {
  const deps = await findDependencies(targetPartId);

  // Sort by depth descending (deepest dependencies first)
  deps.sort((a, b) => b.depth - a.depth);

  // Extract part IDs, remove duplicates while preserving order
  const sequence: string[] = [];
  const seen = new Set<string>();
  for (const node of deps) {
    if (!seen.has(node.part.id)) {
      seen.add(node.part.id);
      sequence.push(node.part.id);
    }
  }
  if (!seen.has(targetPartId)) sequence.push(targetPartId);

  return sequence;
}

/**
 * Finds hidden or non-obvious parts that could be causing the symptoms.
 * These are parts that are not in the direct symptom-to-part mapping
 * but are connected via the relationship graph.
 *
 * @param knownPartIds - Parts already identified as potential causes
 * @returns Array of hidden part IDs that might be involved
 */
export async function findHiddenParts(knownPartIds: string[]): Promise<Part[]> {
  const parts = await loadParts();
  const rels = await loadRelationships();

  const hiddenParts: Part[] = [];
  const known = new Set(knownPartIds);

  for (const rel of rels) {
    // If a known part is the target of a relationship, check the source
    if (known.has(rel.target) && !known.has(rel.source)) {
      const sourcePart = parts.get(rel.source);
      if (sourcePart && !hiddenParts.includes(sourcePart)) {
        hiddenParts.push(sourcePart);
      }
    }
    // If a known part is the source, check the target
    if (known.has(rel.source) && !known.has(rel.target)) {
      const targetPart = parts.get(rel.target);
      if (targetPart && !hiddenParts.includes(targetPart)) {
        hiddenParts.push(targetPart);
      }
    }
  }

  return hiddenParts;
}

/**
 * Returns all parts in a given subsystem.
 *
 * @param subsystem - The subsystem name (e.g., "starting_system", "ignition_system")
 * @returns Array of parts in that subsystem
 */
export async function getPartsBySubsystem(subsystem: string): Promise<Part[]> {
  const parts = await loadParts();
  const result: Part[] = [];
  for (const part of parts.values()) {
    if (part.subsystem === subsystem) result.push(part);
  }
  return result;
}