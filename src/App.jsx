import { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, 
  Controls, Background, Panel, BackgroundVariant, useViewport,
} from '@xyflow/react';
// Import custom nodes
import PreviewNode from './CustomNodes/PreviewNode.jsx';
import CircleNode from './CustomNodes/CircleNode.jsx';
import RectNode from './CustomNodes/RectNode.jsx';
import LineNode from './CustomNodes/LineNode.jsx';
import GroupNode from './CustomNodes/GroupNode.jsx';
import TestVisualNode from './CustomNodes/TestVisualNode.jsx';
import TransformInteractionTestNode from './CustomNodes/TransformInteractionTestNode.jsx';
import ShapeGeneratorNode from './CustomNodes/ShapeGeneratorNode.jsx';
import SimpleDataInputNode from './CustomNodes/SimpleDataInputNode.jsx';
import AxisGeneratorNode from './CustomNodes/AxisGeneratorNode.jsx';
import ScaleMapperNode from './CustomNodes/ScaleMapperNode.jsx';
import D3AxisGeneratorNode from './CustomNodes/D3AxisGeneratorNode.jsx';
import CoordinateGroupNode from './CustomNodes/CoordinateGroupNode.jsx';
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
  { type: 'shapeGenerator', label: 'Shape Generator', defaultData: { } },
  { type: 'simpleDataInput', label: 'Simple Data Input', defaultData: { } },
  { type: 'axisGenerator', label: 'Axis Generator', defaultData: { } },
  { type: 'scaleMapper', label: 'Scale Mapper', defaultData: { } },
  { type: 'd3AxisGenerator', label: 'Axis Generator(D3)', defaultData: { } },
  { type: 'coordinateGroup', label: 'Coordinate Group', defaultData: { } },
];

//Initial Nodes and Edges
const initialNodes = [
  {
    id: 'data-x-mismatch',
    type: 'simpleDataInput',
    position: { x: -520, y: 20 },
    data: {
      dataMode: 'array',
      rawText: '10,35,60',
    },
  },

  {
    id: 'data-y-mismatch',
    type: 'simpleDataInput',
    position: { x: -520, y: 180 },
    data: {
      dataMode: 'array',
      rawText: '20,45',
    },
  },

  {
    id: 'shape-generator-mismatch',
    type: 'shapeGenerator',
    position: { x: -140, y: 80 },
    data: {
      shapeType: 'circle',
      defaultRadius: 7,

      fillColor: '#66cc88',
      strokeColor: '#000000',
      strokeWidth: 2,
      opacity: 0.7,

      layoutAxis: 'x',
      layoutStartX: 8,
      layoutStartY: 90,
      layoutStep: 18,
    },
  },

  {
    id: 'preview-mismatch',
    type: 'previewNode',
    position: { x: 280, y: 100 },
    data: { label: 'Mismatch Preview' },
  },

  {
    id: 'data-height-opacity',
    type: 'simpleDataInput',
    position: { x: -460, y: 80 },
    data: {
      dataMode: 'array',
      rawText: '0.2,0.45,0.7,0.35',
    },
  },

  {
    id: 'data-height-values',
    type: 'simpleDataInput',
    position: { x: -460, y: -80 },
    data: {
      dataMode: 'array',
      rawText: '20,45,70,35',
    },
  },

  {
    id: 'shape-generator-opacity',
    type: 'shapeGenerator',
    position: { x: -120, y: 40 },
    data: {
      shapeType: 'rect',

      defaultX: 8,
      defaultY: 90,
      defaultWidth: 12,
      defaultHeight: 40,

      fillColor: '#5b78ff',
      strokeColor: '#000000',
      strokeWidth: 2,
      opacity: 1,

      layoutAxis: 'x',
      layoutStartX: 8,
      layoutStartY: 90,
      layoutStep: 18,
    },
  },

  {
    id: 'preview-opacity',
    type: 'previewNode',
    position: { x: 280, y: 60 },
    data: { label: 'Opacity Preview' },
  },

  {
    id: 'data-raw-values',
    type: 'simpleDataInput',
    position: { x: -720, y: 80 },
    data: {
      dataMode: 'array',
      rawText: '1000,5000,10000,20000',
    },
  },

  {
    id: 'scale-height',
    type: 'scaleMapper',
    position: { x: -440, y: 80 },
    data: {
      scaleType: 'linear',
      domainMode: 'auto',

      domainMin: 0,
      domainMax: 20000,

      rangeMin: 0,
      rangeMax: 100,

      clamp: true,
    },
  },

  {
    id: 'shape-scaled-bars',
    type: 'shapeGenerator',
    position: { x: -120, y: 40 },
    data: {
      shapeType: 'rect',

      defaultX: 0,
      defaultY: 0,
      defaultWidth: 12,
      defaultHeight: 40,
      cornerRadius: 0,

      alignX: 'left',
      alignY: 'bottom',

      fillColor: '#5b78ff',
      strokeColor: '#000000',
      strokeWidth: 1,
      opacity: 0.75,

      layoutAxis: 'x',
      layoutGapX: 18,
      layoutGapY: 18,
    },
  },

  {
    id: 'preview-scaled-bars',
    type: 'previewNode',
    position: { x: 260, y: 60 },
    data: {
      previewWidth: 320,
      previewHeight: 220,
      previewMode: 'fit',
    },
  },

];

const initialEdges = [
  {
    id: 'data-x-mismatch-shape-generator-mismatch-x',
    source: 'data-x-mismatch',
    target: 'shape-generator-mismatch',
    targetHandle: 'x',
  },
  {
    id: 'data-y-mismatch-shape-generator-mismatch-y',
    source: 'data-y-mismatch',
    target: 'shape-generator-mismatch',
    targetHandle: 'y',
  },
  {
    id: 'shape-generator-mismatch-preview-mismatch',
    source: 'shape-generator-mismatch',
    target: 'preview-mismatch',
  },
  {
    id: 'data-height-values-shape-generator-opacity-height',
    source: 'data-height-values',
    target: 'shape-generator-opacity',
    targetHandle: 'height',
  },
  {
    id: 'data-height-opacity-shape-generator-opacity-opacity',
    source: 'data-height-opacity',
    target: 'shape-generator-opacity',
    targetHandle: 'opacity',
  },
  {
    id: 'shape-generator-opacity-preview-opacity',
    source: 'shape-generator-opacity',
    target: 'preview-opacity',
  },

  {
    id: 'data-raw-values-scale-height',
    source: 'data-raw-values',
    target: 'scale-height',
    targetHandle: 'input',
  },

  {
    id: 'scale-height-shape-height',
    source: 'scale-height',
    target: 'shape-scaled-bars',
    targetHandle: 'height',
  },

  {
    id: 'shape-scaled-bars-preview',
    source: 'shape-scaled-bars',
    target: 'preview-scaled-bars',
  },
];

//Define custom node types
const nodeTypes = {
  previewNode: PreviewNode,
  circle: CircleNode,
  rect: RectNode,
  line: LineNode,
  group: GroupNode,
  testVisual: TestVisualNode,
  transformInteractionTest: TransformInteractionTestNode,
  shapeGenerator: ShapeGeneratorNode,
  simpleDataInput: SimpleDataInputNode,
  axisGenerator: AxisGeneratorNode,
  scaleMapper: ScaleMapperNode,
  d3AxisGenerator: D3AxisGeneratorNode,
  coordinateGroup: CoordinateGroupNode,
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
            <ViewportZoomIndicator />
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
      nodes,
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

function ViewportZoomIndicator() {
  const { zoom } = useViewport();

  return (
    <Panel position="top-left">
      <div className="zoom-indicator">
        Canvas {Math.round(zoom * 100)}%
      </div>
    </Panel>
  );
}