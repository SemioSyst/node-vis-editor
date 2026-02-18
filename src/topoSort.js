// topoSort.js
/**
 * Kahn's algorithm topological sort.
 * Input: graphIR with { nodesById, adj, inDegree }
 * Output:
 *  - order: string[] sorted node ids (partial if cycle)
 *  - hasCycle: boolean
 *  - remaining: string[] nodes not sorted (only meaningful if hasCycle)
 */
export function topoSort(graphIR) {
  const nodeIds = Object.keys(graphIR.nodesById || {});
  const adj = graphIR.adj || {};
  const inDegree = graphIR.inDegree || {};

  // copy inDegree because we will mutate
  const deg = Object.create(null);
  for (const id of nodeIds) deg[id] = inDegree[id] ?? 0;

  // queue of nodes with 0 inDegree
  const queue = [];
  for (const id of nodeIds) {
    if (deg[id] === 0) queue.push(id);
  }

  const order = [];
  while (queue.length) {
    const id = queue.shift(); // demo规模用 shift OK；大规模可用 index 指针优化
    order.push(id);

    const outs = adj[id] || [];
    for (const to of outs) {
      if (deg[to] == null) continue; // defensive
      deg[to] -= 1;
      if (deg[to] === 0) queue.push(to);
    }
  }

  const hasCycle = order.length !== nodeIds.length;
  const remaining = hasCycle ? nodeIds.filter((id) => !order.includes(id)) : [];

  return { order, hasCycle, remaining };
}
