const DEBUG_COMPILER = true; // Set to true to enable debug logging

/**
 * Build a minimal Graph IR from React Flow nodes/edges.
 * - Includes node.type in nodesById
 * - Builds adjacency list + in/out degree tables
 * - Keeps handle info on edges (sourceHandle/targetHandle)
 *
 * @param {Array<{id: string, type?: string, data?: any}>} nodes
 * @param {Array<{id: string, source: string, target: string, sourceHandle?: string|null, targetHandle?: string|null}>} edges
 * @returns {{
 *   nodesById: Record<string, { id: string, type: string|null }>,
 *   edges: Array<{ id: string, source: string, target: string, sourceHandle: string|null, targetHandle: string|null }>,
 *   adj: Record<string, string[]>,
 *   inDegree: Record<string, number>,
 *   outDegree: Record<string, number>,
 *   invalidEdges: Array<{ id: string, reason: string }>
 * }}
 */
function compileGraph(nodes, edges) {
    if (DEBUG_COMPILER) {
        console.groupCollapsed(
        `[compileGraph] input nodes=${nodes.length} edges=${edges.length}`
        );
    }
  
    // --- Build node lookup ---
    const nodesById = Object.create(null);
    const adj = Object.create(null);
    const inDegree = Object.create(null);
    const outDegree = Object.create(null);

    // Iterate nodes and build lookup
    for (const n of nodes) {
        const id = String(n.id);
        const type = n.type ?? null; // React Flow nodes often have undefined type for "default"
        nodesById[id] = { id, type }; // Store minimal node info
        adj[id] = []; // Initialize adjacency list
        inDegree[id] = 0; // Initialize in-degree count
        outDegree[id] = 0; // Initialize out-degree count
    }

    // --- Build edges + adjacency ---
    const irEdges = [];
    const invalidEdges = [];

    // Iterate edges and build IR
    for (const e of edges) {
        const id = String(e.id);
        const source = String(e.source);
        const target = String(e.target);

        // Defensive checks (rare)
        if (!nodesById[source]) {
            invalidEdges.push({ id, reason: `Missing source node: ${source}` });
            continue;
        }
        if (!nodesById[target]) {
            invalidEdges.push({ id, reason: `Missing target node: ${target}` });
            continue;
        }

        const sourceHandle = e.sourceHandle ?? null;
        const targetHandle = e.targetHandle ?? null;

        irEdges.push({
            id,
            source,
            target,
            sourceHandle,
            targetHandle,
        });

        // Add the target to the source's adjacency list
        adj[source].push(target);

        // Update in/out degree counts
        outDegree[source] += 1;
        inDegree[target] += 1;
    }

    
    const ir = {
        nodesById,
        edges: irEdges,
        adj,
        inDegree,
        outDegree,
        invalidEdges,
    };

    if (DEBUG_COMPILER) {
        console.log("nodesById:", nodesById);
        console.log("edges:", irEdges);
        console.log("adj:", adj);
        console.log("inDegree:", inDegree, "outDegree:", outDegree);
        if (invalidEdges.length) console.warn("invalidEdges:", invalidEdges);
        console.groupEnd();
    }

    return ir;
}

export default compileGraph;