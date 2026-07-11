export interface GraphNode {
  id: string;
  name: string;
  category: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  relation: string; // e.g. "powers", "triggers", "sparks", "rotates"
}

export const GRAPH_NODES: GraphNode[] = [
  { id: "battery", name: "Starter Battery", category: "Electrical" },
  { id: "starter_relay", name: "Starter Relay", category: "Electrical" },
  { id: "starter_motor", name: "Starter Motor", category: "Starting System" },
  { id: "ignition_coil", name: "Ignition Coil", category: "Ignition" },
  { id: "spark_plug", name: "Spark Plug", category: "Ignition" },
  { id: "drive_chain", name: "Drive Chain", category: "Transmission" },
  { id: "sprockets", name: "Transmission Sprockets", category: "Transmission" },
  { id: "brake_fluid", name: "Brake Fluid Lines", category: "Braking" },
  { id: "brake_pads", name: "Brake Pads", category: "Braking" },
  { id: "tyres", name: "Tire Tread", category: "Wheel & Tyres" },
  { id: "engine", name: "Engine Cylinder Head", category: "Engine" }
];

export const GRAPH_EDGES: GraphEdge[] = [
  { from: "battery", to: "starter_relay", relation: "powers" },
  { from: "battery", to: "ignition_coil", relation: "powers" },
  { from: "starter_relay", to: "starter_motor", relation: "triggers" },
  { from: "starter_motor", to: "engine", relation: "cranks" },
  { from: "ignition_coil", to: "spark_plug", relation: "sparks" },
  { from: "spark_plug", to: "engine", relation: "combusts" },
  { from: "engine", to: "sprockets", relation: "rotates" },
  { from: "sprockets", to: "drive_chain", relation: "drives" }
];

/**
 * Traverses forward to find downstream components that will fail if the target fails.
 */
export function getAffectedDownstream(componentId: string): string[] {
  const affected: string[] = [];
  const queue: string[] = [componentId];
  const visited = new Set<string>([componentId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    // Find all edges starting from 'current'
    const destinations = GRAPH_EDGES.filter(e => e.from === current).map(e => e.to);
    for (const dest of destinations) {
      if (!visited.has(dest)) {
        visited.add(dest);
        queue.push(dest);
        const node = GRAPH_NODES.find(n => n.id === dest);
        if (node) {
          affected.push(node.name);
        }
      }
    }
  }

  return affected;
}

/**
 * Traverses backward to find upstream dependencies that could be the root cause of a fault.
 */
export function getUpstreamDependencies(componentId: string): string[] {
  const dependencies: string[] = [];
  const queue: string[] = [componentId];
  const visited = new Set<string>([componentId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    // Find edges pointing to 'current'
    const sources = GRAPH_EDGES.filter(e => e.to === current).map(e => e.from);
    for (const src of sources) {
      if (!visited.has(src)) {
        visited.add(src);
        queue.push(src);
        const node = GRAPH_NODES.find(n => n.id === src);
        if (node) {
          dependencies.push(node.name);
        }
      }
    }
  }

  return dependencies;
}