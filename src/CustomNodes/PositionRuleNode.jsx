// src/CustomNodes/PositionRuleNode.jsx
import { Handle, Position, useStore, useUpdateNodeInternals } from '@xyflow/react';
import { useEffect } from 'react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  NumberField,
  TextField,
} from './UI/NodeFields.jsx';
import { PortStatusRow } from './UI/PortFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

const ANCHOR_OPTIONS = [
  { value: 'selection', label: 'Connected Selection' },
  { value: 'eventElement', label: 'Event Element' },
  { value: 'pointer', label: 'Pointer' },
  { value: 'canvas', label: 'Canvas' },
];

const MODE_OPTIONS = [
  { value: 'repeat', label: 'Repeat for Anchors' },
  { value: 'move', label: 'Move Once' },
];

const PLACEMENT_OPTIONS = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'left', label: 'Left' },
  { value: 'right', label: 'Right' },
  { value: 'center', label: 'Center' },
  { value: 'topRight', label: 'Top Right' },
  { value: 'bottomRight', label: 'Bottom Right' },
];

const MATCH_OPTIONS = [
  { value: 'repeatTemplate', label: 'Repeat Template' },
  { value: 'index', label: 'Index' },
  { value: 'tagKeys', label: 'Tag Keys' },
];

export default function PositionRuleNode({ id, data }) {
  const update = useUpdateNodeData(id);
  const updateNodeInternals = useUpdateNodeInternals();

  const visualSource = useConnectedSource(id, 'visual');
  const selectionSource = useConnectedSource(id, 'anchor');
  const eventSource = useConnectedSource(id, 'event');

  const anchorType = data.anchorType ?? 'selection';
  const matchMode = data.matchMode ?? 'repeatTemplate';

  useEffect(() => {
    updateNodeInternals(id);

    const frame = requestAnimationFrame(() => {
        updateNodeInternals(id);
    });

    return () => {
        cancelAnimationFrame(frame);
    };
    }, [id, anchorType, updateNodeInternals]);

  return (
    <NodeShell
      nodeId={id}
      title="Position Rule"
      subtitle="Places or repeats a visual relative to anchors"
      badge="Layout"
      footer="Output: visual + position rule"
      collapsed={data.collapsed}
    >
      <Handle
        type="source"
        position={Position.Right}
      />

      <NodeSection
        nodeId={id}
        sectionId="visual"
        sectionCollapsed={data.sectionCollapsed}
        title="Positioned Visual"
        subtitle="The element or component to place"
        ports={['visual']}
      >
        <PortStatusRow
          handleId="visual"
          label="Visual"
          status={visualSource ? visualSource.label : 'not connected'}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="anchor"
        sectionCollapsed={data.sectionCollapsed}
        title="Anchor"
        subtitle="What the positioned visual should attach to"
        ports={['anchor', 'event']}
      >
        <SelectField
          label="Anchor"
          value={anchorType}
          onChange={(v) => update({ anchorType: v })}
          options={ANCHOR_OPTIONS}
        />

        {anchorType === 'selection' && (
          <PortStatusRow
            handleId="anchor"
            label="Selection"
            status={selectionSource ? selectionSource.label : 'not connected'}
          />
        )}

        {(anchorType === 'eventElement' || anchorType === 'pointer') && (
          <PortStatusRow
            handleId="event"
            label="Event"
            status={eventSource ? eventSource.label : 'not connected'}
          />
        )}

        {anchorType === 'canvas' && (
          <>
            <NumberField
              label="Canvas X"
              value={data.canvasX ?? 0}
              onChange={(v) => update({ canvasX: v })}
              step={10}
            />

            <NumberField
              label="Canvas Y"
              value={data.canvasY ?? 0}
              onChange={(v) => update({ canvasY: v })}
              step={10}
            />
          </>
        )}
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="placement"
        sectionCollapsed={data.sectionCollapsed}
        title="Placement"
        subtitle="Where the visual appears relative to the anchor"
      >
        <SelectField
          label="Mode"
          value={data.mode ?? 'repeat'}
          onChange={(v) => update({ mode: v })}
          options={MODE_OPTIONS}
        />

        <SelectField
          label="Placement"
          value={data.placement ?? 'top'}
          onChange={(v) => update({ placement: v })}
          options={PLACEMENT_OPTIONS}
        />

        <NumberField
          label="Offset X"
          value={data.offsetX ?? 0}
          onChange={(v) => update({ offsetX: v })}
          step={2}
        />

        <NumberField
          label="Offset Y"
          value={data.offsetY ?? 8}
          onChange={(v) => update({ offsetY: v })}
          step={2}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="matching"
        sectionCollapsed={data.sectionCollapsed}
        title="Matching"
        subtitle="How positioned visuals match anchors"
        defaultCollapsed
      >
        <SelectField
          label="Match"
          value={matchMode}
          onChange={(v) => update({ matchMode: v })}
          options={MATCH_OPTIONS}
        />

        {matchMode === 'tagKeys' && (
          <TextField
            label="Tag Keys"
            value={data.matchTagKeys ?? 'item'}
            onChange={(v) => update({ matchTagKeys: v })}
            placeholder="item,state"
          />
        )}
      </NodeSection>
    </NodeShell>
  );
}

function useConnectedSource(nodeId, targetHandle) {
  return useStore((store) => {
    const edges = store.edges ?? [];
    const nodes = store.nodes ?? [];

    const edge = edges.find(
      (item) =>
        item.target === nodeId &&
        item.targetHandle === targetHandle
    );

    if (!edge) return null;

    const sourceNode = nodes.find((node) => node.id === edge.source);

    return {
      sourceNodeId: edge.source,
      sourceHandle: edge.sourceHandle ?? null,
      edgeId: edge.id,
      label:
        sourceNode?.data?.label ??
        sourceNode?.data?.title ??
        sourceNode?.type ??
        edge.source,
      nodeType: sourceNode?.type ?? null,
      eventType: sourceNode?.data?.eventType ?? null,
    };
  });
}