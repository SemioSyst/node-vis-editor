import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, 
  Controls, Background, Panel, BackgroundVariant
} from '@xyflow/react';
// Import custom nodes
import PreviewNode from './CustomNodes/PreviewNode.jsx';
import CircleNode from './CustomNodes/CircleNode.jsx';
import RectNode from './CustomNodes/RectNode.jsx';
import LineNode from './CustomNodes/LineNode.jsx';
import GroupNode from './CustomNodes/GroupNode.jsx';
// Import other necessary modules
import compileGraph from './compileGraph.js';
import { GraphIRContext } from './GraphIRContext.js';
import { OutputsProvider, useOutputs } from './OutputsContext.jsx';
import { topoSort } from './topoSort.js';
import { createEvaluator } from './evaluator/createEvaluator.js';
import { evaluatorsByType } from './evaluator/evaluatorsByType.js';

import '@xyflow/react/dist/style.css';

// Define the node library with default data for each node type
const NODE_LIBRARY = [
  { type: 'circle', label: 'Circle', defaultData: { cx: 50, cy: 50, r: 22, stroke: '#000000', strokeWidth: 2, fill: 'none' } },
  { type: 'rect',   label: 'Rect',   defaultData: { x: 8, y: 8, w: 84, h: 84, rx: 10, ry: 10, stroke: '#000000', strokeWidth: 2, fill: 'none' } },
  { type: 'line',   label: 'Line',   defaultData: { x1: 10, y1: 50, x2: 90, y2: 50, stroke: '#000000', strokeWidth: 2 } },
  { type: 'group',  label: 'Group',  defaultData: { } },
  { type: 'previewNode', label: 'Preview', defaultData: { label: 'Preview' } },
];

//Initial Nodes and Edges
const initialNodes = [
  { id: 'c1', type: 'circle', position: { x: -260, y: -100 }, data: {} },
  { id: 'r1', type: 'rect', position: { x: -260, y: 200 }, data: {} },
  { id: 'l1', type: 'line', position: { x: -260, y: 600 }, data: {} },

  { id: 'g1', type: 'group', position: { x: 100, y: 200 }, data: {} },
  { id: 'p1', type: 'previewNode', position: { x: 360, y: 200 }, data: { label: 'Preview' } },
];

const initialEdges = [
  { id: 'c1-g1', source: 'c1', target: 'g1' },
  { id: 'r1-g1', source: 'r1', target: 'g1' },
  { id: 'l1-g1', source: 'l1', target: 'g1' },
  { id: 'g1-p1', source: 'g1', target: 'p1' },
];

//Define custom node types
const nodeTypes = {
  previewNode: PreviewNode,
  circle: CircleNode,
  rect: RectNode,
  line: LineNode,
  group: GroupNode,
};

//Main App Component
export default function App() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
 
  const onNodesChange = useCallback(
    (changes) => setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    [],
  );
  const onConnect = useCallback(
    (params) => setEdges((edgesSnapshot) => addEdge(params, edgesSnapshot)),
    [],
  );

  // --- Node addition logic ---
  const nextIdRef = useMemo(() => ({ n: 1 }), []); // simple ref to keep track of next node id for demo purposes
  // Function to add a new node of a given type to the canvas
  const addNode = useCallback((nodeType) => {
    const entry = NODE_LIBRARY.find((x) => x.type === nodeType);
    if (!entry) return;
    // Generate a unique id for the new node
    const id = `${nodeType}-${nextIdRef.n++}`;

    // For demo purposes, new nodes are added with a random offset from the center.
    const pos = { x: 0 + (Math.random() * 80 - 40), y: 0 + (Math.random() * 80 - 40) };

    setNodes((prev) => [
      ...prev,
      {
        id,
        type: entry.type,
        position: pos,
        data: { ...(entry.defaultData ?? {}) },
      },
    ]);
  }, [setNodes, nextIdRef]);

  // --- Create the evaluator function once (it can be memoized since it doesn't depend on changing state) ---
  const evaluator = useMemo(() => createEvaluator({ evaluatorsByType }), []);

  // --- Compile graph to IR ---
  const graphIR = useMemo(() => compileGraph(nodes, edges), [nodes, edges]);
  useEffect(() => {
    console.groupCollapsed(
      `[App] graphIR updated (nodes=${Object.keys(graphIR.nodesById).length}, edges=${graphIR.edges.length})`
    );
    console.log(graphIR);
    console.groupEnd();
  }, [graphIR]);

  // --- Topological sort for potential execution order ---
  const topo = useMemo(() => topoSort(graphIR), [graphIR]);
  useEffect(() => {
    if (topo.hasCycle) {
      console.warn('[TopoSort] cycle detected, partial order:', topo.order, 'remaining:', topo.remaining);
    } else {
      console.log('[TopoSort] order:', topo.order);
    }
  }, [topo]);

  const initialOutputs = useMemo(() => ({
  // Let n6 (Preview) subscribe to n4's output, creating a simple demo data flow
    n4: {
      kind: 'group',
      viewBox: '0 0 100 100',
      children: [
        { kind: 'rect', x: 8, y: 8, w: 84, h: 84, rx: 10, ry: 10, fill: 'none', stroke: '#000000', strokeWidth: 2 },
        { kind: 'circle', cx: 50, cy: 50, r: 22, fill: 'rgba(255,255,255,0.15)', stroke: '#000000', strokeWidth: 2 },
        { kind: 'line', x1: 10, y1: 50, x2: 90, y2: 50, stroke: '#000000', strokeWidth: 2 },
      ],
    },
    n5: {
      kind: 'circle',
      cx: 50,
      cy: 50,
      r: 40,
      fill: 'rgba(255,0,0,0.15)',
      stroke: '#ff0000',
      strokeWidth: 2,
    },
  }), []);

 
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <GraphIRContext.Provider value={graphIR}>
        <OutputsProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Panel position="bottom-center">
              <div style={{ display: 'flex', gap: 8, padding: 8, background: 'rgba(0,0,0,0.6)', borderRadius: 10 }}>
                {NODE_LIBRARY.map((n) => (
                  <button
                    key={n.type}
                    onClick={() => addNode(n.type)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 6,
                      border: '1px solid #555',
                      background: '#222',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    + {n.label}
                  </button>
                ))}
              </div>
            </Panel>
            <Panel position="top-right">
              <RunEvaluatorButton evaluator={evaluator} graphIR={graphIR} topo={topo} nodes={nodes} />
            </Panel>
            <Background color="#ccc" variant={BackgroundVariant.Dots}/>
            <Controls/>
          </ReactFlow>
        </OutputsProvider>
      </GraphIRContext.Provider>
    </div>
  );
}

// --- Below are the implementations of the evaluator and topoSort, which are imported and used in App.jsx ---
function RunEvaluatorButton({ evaluator, graphIR, topo, nodes }) {
  // We need access to setOutput and outputs to manage the evaluation results
  const { setOutput, outputs } = useOutputs();

  // Helper function to get output of a node by id (returns undefined if not set)
  const getOutput = (nodeId) => outputs[String(nodeId)];

  // When the button is clicked, run the evaluator with the current graphIR and topo order
  const onRun = () => {
    console.groupCollapsed('[Evaluator] run');
    if (topo.hasCycle) {
      console.warn('[Evaluator] cycle detected, partial order will be used', topo.remaining);
    }
    evaluator.run({
      graphIR,
      nodes,     //TODO: demo ver: directly pass nodes array. In later versions, it should be relying on graphIR for node metadata (e.g. params) instead of reading from nodes.data
      topo,
      setOutput,
      getOutput,
    });
    console.groupEnd();
  };

  return (
    <button
      onClick={onRun}
      style={{
        padding: '6px 10px',
        borderRadius: 6,
        border: '1px solid #555',
        background: '#222',
        color: '#fff',
        cursor: 'pointer',
      }}
    >
      Run Evaluator
    </button>
  );
}