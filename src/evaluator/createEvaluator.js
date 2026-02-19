// src/evaluator/createEvaluator.js

export function createEvaluator({ evaluatorsByType }) {
  function run({ graphIR, nodes, topo, setOutput, getOutput }) {
    //Local cache for outputs during this run; this allows immediate access to outputs of upstream nodes without waiting for state updates.
    //We will flush this to the main outputs store at the end of the run.
    const localOutputs = Object.create(null);
    const getOutputSync = (nodeId) => {
        const id = String(nodeId);
        return Object.prototype.hasOwnProperty.call(localOutputs, id)
            ? localOutputs[id]
            : getOutput(id);
    };

    // Build an index for quick node lookup by id
    const nodeIndex = new Map((nodes ?? []).map((n) => [String(n.id), n]));

    // demo: params read from node.data (later: graphIR.nodesById[id].params)
    // TODO: in future versions, we want to decouple the evaluator from React Flow's node structure, and rely solely on graphIR for node metadata (including params). 
    // This will make the evaluator more flexible and reusable across different graph representations. For now, we keep it simple by reading params directly from nodes' data.
    const getParams = (nodeId) => nodeIndex.get(String(nodeId))?.data ?? {};

    // upstream sources of a node (multi-input)
    const getUpstreamIds = (nodeId) => graphIR.reverseAdj?.[String(nodeId)] ?? [];

    // edges that end at nodeId (for future handle-aware routing)
    const getIncomingEdges = (nodeId) =>
      (graphIR.edges ?? []).filter((e) => String(e.target) === String(nodeId));

    /**
     * Get upstream outputs in two forms:
     * 1) list: [{ from, value, edge }]
     * 2) byTargetHandle: { [targetHandleKey]: [{ from, value, edge }, ...] }
     * The second form allows nodes to differentiate inputs based on the target handle they connect to.
     */
    const getInputs = (nodeId) => {
      const incoming = getIncomingEdges(nodeId);

      // Build the list of upstream outputs with their source node and the connecting edge
      // example item: { from: 'n1', value: ..., edge: { id, source, target, sourceHandle, targetHandle } }
      const list = incoming.map((edge) => {
        const from = String(edge.source);
        return {
          from,
          value: getOutputSync(from),
          edge,
        };
      });

      // Group the inputs by their target handle for easy access by nodes that care about handle-specific routing
      // example: { default: [...], handleA: [...], handleB: [...] }
      const byTargetHandle = Object.create(null);
      for (const item of list) {
        const key = item.edge?.targetHandle ?? 'default';
        if (!byTargetHandle[key]) byTargetHandle[key] = [];
        byTargetHandle[key].push(item);
      }

      return { list, byTargetHandle };
    };

    // --- Main evaluation loop following topological order ---
    for (const nodeId of topo.order) {
      const id = String(nodeId);
      const irNode = graphIR.nodesById?.[id];
      if (!irNode) continue;

      // use node type to find the corresponding evaluator function; if no type, treat as 'default'
      const type = irNode.type ?? 'default';
      const evalFn = evaluatorsByType[type];
      if (!evalFn) {
        console.warn(`[Evaluator] no evaluator found for node ${id} (type=${type}), skipping`);
        continue; // e.g. preview nodes
        }

      // Gather inputs for this node
      const inputs = getInputs(id);

      // Build the execution context for the evaluator function
      const ctx = {
        nodeId: id,
        type,
        params: getParams(id),

        // inputs
        inputs, // { list, byTargetHandle }

        // convenience helpers
        getUpstreamIds: () => getUpstreamIds(id),
        getUpstreamOutputs: () => inputs.list.map((x) => x.value).filter((v) => v != null),

        graphIR,
        getOutput: getOutputSync, // allows evaluator functions to access outputs of any node (including upstream nodes that have been evaluated in this run, via localOutputs cache)
        setOutput,
      };

      // Execute the node's function with the context and store the output
      const out = evalFn(ctx);

      console.log(`[Evaluator] node ${id} (type=${type}) evaluated with output:`, out);

      // Store the output in the context (e.g. for downstream nodes to access)
      if (out !== undefined) {
        localOutputs[id] = out; // store in localOutputs for immediate access within this run
        setOutput(id, out);
      }
    }
  }

  return { run };
}
