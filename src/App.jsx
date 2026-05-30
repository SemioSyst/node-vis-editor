import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge, 
  Controls, Background, Panel, BackgroundVariant, useViewport, useReactFlow,
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
import TextGeneratorNode from './CustomNodes/TextGeneratorNode.jsx';
import PathGeneratorNode from './CustomNodes/PathGeneratorNode.jsx';
import TagMapperNode from './CustomNodes/TagMapperNode.jsx';
import DataInspectorNode from './CustomNodes/DataInspectorNode.jsx';
import ColourMapperNode from './CustomNodes/ColourMapperNode.jsx';
import HoverRuntimeBinderNode from './CustomNodes/HoverRuntimeBinderNode.jsx';
import ElementSelectorNode from './CustomNodes/ElementSelectorNode.jsx';
import EventTriggerNode from './CustomNodes/EventTriggerNode.jsx';
import StatesNode from './CustomNodes/StatesNode.jsx';
import TransitionNode from './CustomNodes/TransitionNode.jsx';
import InteractionEffectNode from './CustomNodes/InteractionEffectNode.jsx';
import PositionRuleNode from './CustomNodes/PositionRuleNode.jsx';
// Import other necessary modules
import compileGraph from './compileGraph.js';
import { GraphIRContext } from './GraphIRContext.js';
import { OutputsProvider, useOutputs } from './OutputsContext.jsx';
import { topoSort } from './topoSort.js';
import { createEvaluator } from './evaluator/createEvaluator.js';
import { evaluatorsByType } from './evaluator/evaluatorsByType.js';
import {
  createProjectSnapshot,
  downloadProjectSnapshot,
  readProjectFile,
  saveProjectToLocalStorage,
  loadProjectFromLocalStorage,
} from './project/projectIO.js';
import ProjectToolbar from './project/ProjectToolbar.jsx';
import { useProjectActions } from './project/useProjectActions.js';

import '@xyflow/react/dist/style.css';

function createGraphCompileKey(nodes, edges) {
  return JSON.stringify({
    nodes: nodes.map((node) => [String(node.id), node.type ?? null]),
    edges: edges.map((edge) => [
      String(edge.id),
      String(edge.source),
      String(edge.target),
      edge.sourceHandle ?? null,
      edge.targetHandle ?? null,
    ]),
  });
}

function createGraphCompileInput(nodes, edges) {
  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      type: node.type,
    })),
    edges: edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    })),
  };
}

// Define the node library with default data for each node type
const NODE_LIBRARY = [
  { type: 'previewNode', label: 'Preview', defaultData: { label: 'Preview' } },
  { type: 'shapeGenerator', label: 'Shape Generator', defaultData: { } },
  { type: 'simpleDataInput', label: 'Simple Data Input', defaultData: { } },
  { type: 'axisGenerator', label: 'Axis Generator', defaultData: { } },
  { type: 'scaleMapper', label: 'Scale Mapper', defaultData: { } },
  { type: 'd3AxisGenerator', label: 'Axis Generator(D3)', defaultData: { } },
  { type: 'coordinateGroup', label: 'Coordinate Group', defaultData: { } },
  { type: 'textGenerator', label: 'Text Generator', defaultData: { } },
  { type: 'pathGenerator', label: 'Path Generator', defaultData: { } },
  { type: 'tagMapper', label: 'Tag Mapper', defaultData: { } },
  { type: 'dataInspector', label: 'Data Inspector', defaultData: { } },
  { type: 'colourMapper', label: 'Colour Mapper', defaultData: { } },
  { type: 'elementSelector', label: 'Element Selector', defaultData: { } },
  { type: 'eventTrigger', label: 'Event Trigger', defaultData: { } },
  { type: 'states', label: 'States', defaultData: { } },
  { type: 'transition', label: 'Transition', defaultData: { } },
  { type: 'interactionEffect', label: 'Interaction Effect', defaultData: { } },
  { type: 'positionRule', label: 'Position Rule', defaultData: { } },
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
  textGenerator: TextGeneratorNode,
  pathGenerator: PathGeneratorNode,
  tagMapper: TagMapperNode,
  dataInspector: DataInspectorNode,
  colourMapper: ColourMapperNode,
  hoverRuntimeBinder: HoverRuntimeBinderNode,
  elementSelector: ElementSelectorNode,
  eventTrigger: EventTriggerNode,
  states: StatesNode,
  transition: TransitionNode,
  interactionEffect: InteractionEffectNode,
  positionRule: PositionRuleNode,
};

//Initial Nodes and Edges
const initialNodes = [
  {
    id: 'data-x-categories',
    type: 'simpleDataInput',
    position: { x: -900, y: 40 },
    data: {
      dataMode: 'array',
      rawText: 'A,B,C,D',
      label: 'X Categories',
    },
  },

  {
    id: 'data-y-values',
    type: 'simpleDataInput',
    position: { x: -900, y: 260 },
    data: {
      dataMode: 'array',
      rawText: '1000,5000,10000,20000',
      label: 'Y Values',
    },
  },

  {
    id: 'scale-x-band',
    type: 'scaleMapper',
    position: { x: -620, y: 40 },
    data: {
      label: 'X Band Scale',

      scaleType: 'band',
      domainMode: 'auto',

      rangeMin: 0,
      rangeMax: 240,

      paddingInner: 0.25,
      paddingOuter: 0.15,

      // important: x values represent category centers
      bandOutput: 'center',

      clamp: true,
    },
  },

  {
    id: 'scale-y-linear',
    type: 'scaleMapper',
    position: { x: -620, y: 260 },
    data: {
      label: 'Y Linear Scale',

      scaleType: 'linear',
      domainMode: 'auto',
      domainBaseline: 'zero',
      baselineValue: 0,

      rangeMin: 0,
      rangeMax: 140,

      clamp: true,
    },
  },

  {
    id: 'shape-bars',
    type: 'shapeGenerator',
    position: { x: -280, y: 40 },
    data: {
      label: 'Bars',

      shapeType: 'rect',

      defaultX: 0,
      defaultY: 0,

      defaultWidth: 34,
      defaultHeight: 40,
      cornerRadius: 0,

      alignX: 'center',
      alignY: 'bottom',

      fillColor: '#6f86e8',
      strokeColor: '#222222',
      strokeWidth: 1.5,
      opacity: 1,

      layoutAxis: 'x',
      layoutGapX: 20,
      layoutGapY: 20,
    },
  },

  {
    id: 'd3-axis-system',
    type: 'd3AxisGenerator',
    position: { x: -280, y: 330 },
    data: {
      label: 'D3 Axis System',

      axisMode: 'xy',

      // these will be controlled by xScale / yScale once connected
      xScaleType: 'band',
      yScaleType: 'linear',

      plotWidth: 240,
      plotHeight: 140,

      xTickCount: 5,
      yTickCount: 5,

      decimalPlaces: 0,
      tickSize: 6,
      tickPadding: 4,
      fontSize: 10,

      showDomainLine: true,
      showTickLines: true,
      showTickLabels: true,

      strokeColor: '#222222',
      strokeWidth: 1.5,
      textColor: '#111111',

      originMarkerRadius: 0,
      originLabelOffsetX: 4,
      originMarkerFill: '#ffffff',
    },
  },

  {
    id: 'coordinate-chart',
    type: 'coordinateGroup',
    position: { x: 140, y: 160 },
    data: {
      label: 'Coordinate Chart',

      layers: [
        {
          id: 'layer-axis',
          sourceNodeId: 'd3-axis-system',
          label: 'Axis',
          role: 'axis',
          visible: true,
          locked: false,
          opacity: 1,
          x: 0,
          y: 0,
        },
        {
          id: 'layer-bars',
          sourceNodeId: 'shape-bars',
          label: 'Bars',
          role: 'marks',
          visible: true,
          locked: false,
          opacity: 1,
          x: 0,
          y: 0,
        },
      ],
    },
  },

  {
    id: 'preview-chart',
    type: 'previewNode',
    position: { x: 520, y: 160 },
    data: {
      previewWidth: 420,
      previewHeight: 300,
      previewMode: 'fit',
    },
  },
];

const initialEdges = [
  {
    id: 'edge-data-x-to-scale-x',
    source: 'data-x-categories',
    target: 'scale-x-band',
    targetHandle: 'input',
  },

  {
    id: 'edge-data-y-to-scale-y',
    source: 'data-y-values',
    target: 'scale-y-linear',
    targetHandle: 'input',
  },

  {
    id: 'edge-scale-x-to-shape-x',
    source: 'scale-x-band',
    target: 'shape-bars',
    targetHandle: 'x',
  },

  {
    id: 'edge-scale-y-to-shape-height',
    source: 'scale-y-linear',
    target: 'shape-bars',
    targetHandle: 'height',
  },

  {
    id: 'edge-scale-x-to-axis-x',
    source: 'scale-x-band',
    target: 'd3-axis-system',
    targetHandle: 'xScale',
  },

  {
    id: 'edge-scale-y-to-axis-y',
    source: 'scale-y-linear',
    target: 'd3-axis-system',
    targetHandle: 'yScale',
  },

  {
    id: 'edge-axis-to-coordinate-group',
    source: 'd3-axis-system',
    target: 'coordinate-chart',
    targetHandle: 'layers',
  },

  {
    id: 'edge-shape-to-coordinate-group',
    source: 'shape-bars',
    target: 'coordinate-chart',
    targetHandle: 'layers',
  },

  {
    id: 'edge-coordinate-group-to-preview',
    source: 'coordinate-chart',
    target: 'preview-chart',
  },
];

//Main App Component
export default function App() {
  const flowWrapperRef = useRef(null);
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

  // --- Project saving/loading logic ---
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const projectActions = useProjectActions({
    nodes,
    edges,
    setNodes,
    setEdges,
    reactFlowInstance,
    projectName: 'node-vis-project',
  });

  // --- Node addition logic ---
  const nextIdRef = useRef(1); // simple ref to keep track of next node id for demo purposes
  // Function to add a new node of a given type to the canvas
  const addNode = useCallback((nodeType, position) => {
    const entry = NODE_LIBRARY.find((x) => x.type === nodeType);
    if (!entry) return;
    // Generate a unique id for the new node
    const id = `${nodeType}-${nextIdRef.current++}`;

    setNodes((prev) => [
      ...prev,
      {
        id,
        type: entry.type,
        position: position ?? { x: 0, y: 0 },
        origin: [0.5, 0.5],
        data: { ...(entry.defaultData ?? {}) },
      },
    ]);
  }, [setNodes, nextIdRef]);

  // --- Create the evaluator function once (it can be memoized since it doesn't depend on changing state) ---
  const evaluator = useMemo(() => createEvaluator({ evaluatorsByType }), []);

  // --- Compile graph to IR ---
  // React Flow updates node.position continuously while dragging. The compiler only
  // needs graph structure, so keep the IR stable when visual-only node fields change.
  const graphCompileKey = useMemo(() => createGraphCompileKey(nodes, edges), [nodes, edges]);
  const graphCompileCacheRef = useRef({ key: null, input: null });
  if (graphCompileCacheRef.current.key !== graphCompileKey) {
    graphCompileCacheRef.current = {
      key: graphCompileKey,
      input: createGraphCompileInput(nodes, edges),
    };
  }
  const graphCompileInput = graphCompileCacheRef.current.input;
  const graphIR = useMemo(
    () => compileGraph(graphCompileInput.nodes, graphCompileInput.edges),
    [graphCompileInput],
  );
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
    <div ref={flowWrapperRef} style={{ width: '100vw', height: '100vh' }}>
      <GraphIRContext.Provider value={graphIR}>
        <OutputsProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onInit={setReactFlowInstance}
            fitView
          >
            <AddNodePanel addNode={addNode} flowWrapperRef={flowWrapperRef} />
            <Panel position="top-right">
              <ProjectToolbar
                onSaveFile={projectActions.handleSaveFile}
                onSaveDraft={projectActions.handleSaveDraft}
                onLoadDraft={projectActions.handleLoadDraft}
                onLoadFile={projectActions.handleLoadFile}
                draftAvailable={projectActions.draftAvailable}
              >
                <RunEvaluatorButton
                  evaluator={evaluator}
                  graphIR={graphIR}
                  topo={topo}
                  nodes={nodes}
                />
              </ProjectToolbar>
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

function AddNodePanel({ addNode, flowWrapperRef }) {
  const { screenToFlowPosition } = useReactFlow();

  const addNodeAtViewportCenter = useCallback((nodeType) => {
    const bounds = flowWrapperRef.current?.getBoundingClientRect();
    const screenCenter = bounds
      ? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    addNode(nodeType, screenToFlowPosition(screenCenter));
  }, [addNode, flowWrapperRef, screenToFlowPosition]);

  return (
    <Panel position="bottom-center">
      <div style={{ display: 'flex', gap: 8, padding: 8, background: 'rgba(0,0,0,0.6)', borderRadius: 10 }}>
        {NODE_LIBRARY.map((n) => (
          <button
            key={n.type}
            onClick={() => addNodeAtViewportCenter(n.type)}
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
      type="button"
      onClick={onRun}
      className="project-toolbar__button project-toolbar__button--primary"
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

function handleSaveProject() {
  const flow = reactFlowInstance.toObject();

  const snapshot = createProjectSnapshot({
    flow,
    name: 'test-scene',
  });

  downloadProjectSnapshot(snapshot);
}

function handleAutoSaveProject() {
  const flow = reactFlowInstance.toObject();

  const snapshot = createProjectSnapshot({
    flow,
    name: 'auto-save',
  });

  saveProjectToLocalStorage(snapshot);
}

async function handleLoadProjectFile(file) {
  const snapshot = await readProjectFile(file);

  const flow = snapshot.reactFlow;

  setNodes(flow.nodes ?? []);
  setEdges(flow.edges ?? []);

  if (flow.viewport) {
    requestAnimationFrame(() => {
      reactFlowInstance.setViewport(flow.viewport);
    });
  }
}

function handleLoadAutoSave() {
  const snapshot = loadProjectFromLocalStorage();
  if (!snapshot) return;

  const flow = snapshot.reactFlow;

  setNodes(flow.nodes ?? []);
  setEdges(flow.edges ?? []);

  if (flow.viewport) {
    requestAnimationFrame(() => {
      reactFlowInstance.setViewport(flow.viewport);
    });
  }
}