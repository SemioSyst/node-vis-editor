import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, 
  Controls, Background, Panel, BackgroundVariant
} from '@xyflow/react';
import PreviewNode from './CustomNodes/PreviewNode.jsx';
import compileGraph from './compileGraph.js';
import { GraphIRContext } from './GraphIRContext.js';
import { OutputsProvider } from './OutputsContext.jsx';
import { topoSort } from './topoSort.js';

import '@xyflow/react/dist/style.css';

//Initial Nodes and Edges
const initialNodes = [
  { id: 'n1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: 'n2', position: { x: -100, y: 100 }, data: { label: 'Node 2' } },
  { id: 'n3', position: { x: 100, y: 100 }, data: { label: 'Node 3' } },
  { id: 'n4', position: { x: -100, y: 200 }, data: { label: 'Node 4' } },
  { id: 'n5', position: { x: 100, y: 200 }, data: { label: 'Node 5' } },
  { id: 'n6', position: { x: 0, y: 300 }, data: { label: 'Preview Node' }, type: 'previewNode' },
];
const initialEdges = [
  { id: 'n1-n2', source: 'n1', target: 'n2' },
  { id: 'n1-n3', source: 'n1', target: 'n3' },
  { id: 'n2-n4', source: 'n2', target: 'n4' },
  { id: 'n3-n5', source: 'n3', target: 'n5' },
  { id: 'n4-n6', source: 'n4', target: 'n6' },
];

//Define custom node types
const nodeTypes = {
  previewNode: PreviewNode,
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
        <OutputsProvider initialOutputs={initialOutputs}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
          >
            <Panel position="bottom-center">Node Panel Placeholder</Panel>
            <Panel position="top-right">Debug Panel Placeholder</Panel>
            <Background color="#ccc" variant={BackgroundVariant.Dots}/>
            <Controls/>
          </ReactFlow>
        </OutputsProvider>
      </GraphIRContext.Provider>
    </div>
  );
}