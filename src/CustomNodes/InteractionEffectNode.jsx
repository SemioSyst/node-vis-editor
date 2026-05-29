// src/CustomNodes/InteractionEffectNode.jsx
import { Handle, Position, useStore } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  NumberField,
  ColorField,
} from './UI/NodeFields.jsx';
import {
  PortStatusRow,
} from './UI/PortFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

const TARGET_MODE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'eventElement', label: 'Event Element' },
  { value: 'selection', label: 'Connected Selection' },
  { value: 'wholeVisual', label: 'Whole Visual' },
];

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'On' },
  { value: 'false', label: 'Off' },
];

const CLICK_BEHAVIOR_OPTIONS = [
  { value: 'toggleClicked', label: 'Toggle Clicked Element' },
  { value: 'selectClicked', label: 'Select Clicked Element' },
];

const HOVER_BEHAVIOR_OPTIONS = [
  { value: 'activeWhileEvent', label: 'Active While Hovered' },
];

const PRESS_BEHAVIOR_OPTIONS = [
  { value: 'activeWhileEvent', label: 'Active While Pressed' },
];

export default function InteractionEffectNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const eventSource = useConnectedSource(id, 'event');
  const visualSource = useConnectedSource(id, 'visual');
  const selectionSource = useConnectedSource(id, 'selection');

  const eventType = eventSource?.eventType ?? 'none';
  const behaviorOptions = getBehaviorOptions(eventType);
  const behavior = normalizeBehavior(data.behavior, eventType);

  const applyStroke = data.applyStroke ?? true;
  const applyFill = data.applyFill ?? false;
  const applyOpacity = data.applyOpacity ?? false;

  return (
    <NodeShell
      nodeId={id}
      title="Interaction Effect"
      subtitle="Adds event-driven feedback to a visual output"
      badge="Effect"
      footer="Output: visual + interaction"
      collapsed={data.collapsed}
    >
      <Handle
        type="source"
        position={Position.Right}
      />

      <NodeSection
        nodeId={id}
        sectionId="event"
        sectionCollapsed={data.sectionCollapsed}
        title="Event"
        subtitle="What user action activates this effect"
        ports={['event']}
      >
        <PortStatusRow
          handleId="event"
          label="Event"
          status={
            eventSource
              ? `${eventSource.label} · ${eventType}`
              : 'not connected'
          }
        />

        <SelectField
          label="Behavior"
          value={behavior}
          onChange={(v) => update({ behavior: v })}
          options={behaviorOptions}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="target"
        sectionCollapsed={data.sectionCollapsed}
        title="Target"
        subtitle="Where this effect is applied"
        ports={['visual', 'selection']}
      >
        <PortStatusRow
          handleId="visual"
          label="Visual"
          status={
            visualSource
              ? visualSource.label
              : 'not connected'
          }
        />

        <PortStatusRow
          handleId="selection"
          label="Selection"
          status={
            selectionSource
              ? selectionSource.label
              : 'optional'
          }
        />

        <SelectField
          label="Apply To"
          value={data.targetMode ?? 'auto'}
          onChange={(v) => update({ targetMode: v })}
          options={TARGET_MODE_OPTIONS}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="effect"
        sectionCollapsed={data.sectionCollapsed}
        title="Effect"
        subtitle="Feedback style"
      >
        <div className="node-field__note">
          Effect type: Style
        </div>

        <SelectField
          label="Stroke"
          value={String(applyStroke)}
          onChange={(v) => update({ applyStroke: v === 'true' })}
          options={BOOLEAN_OPTIONS}
        />

        {applyStroke && (
          <>
            <ColorField
              label="Stroke Color"
              value={data.strokeColor ?? '#ffffff'}
              onChange={(v) => update({ strokeColor: v })}
            />

            <NumberField
              label="Stroke W"
              value={data.strokeWidth ?? 2}
              onChange={(v) => update({ strokeWidth: v })}
              min={0}
              step={0.5}
            />
          </>
        )}

        <SelectField
          label="Fill"
          value={String(applyFill)}
          onChange={(v) => update({ applyFill: v === 'true' })}
          options={BOOLEAN_OPTIONS}
        />

        {applyFill && (
          <ColorField
            label="Fill Color"
            value={data.fillColor ?? '#ffcc00'}
            onChange={(v) => update({ fillColor: v })}
          />
        )}

        <SelectField
          label="Opacity"
          value={String(applyOpacity)}
          onChange={(v) => update({ applyOpacity: v === 'true' })}
          options={BOOLEAN_OPTIONS}
        />

        {applyOpacity && (
          <NumberField
            label="Opacity V"
            value={data.opacity ?? 1}
            onChange={(v) => update({ opacity: v })}
            min={0}
            max={1}
            step={0.05}
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

      // EventTriggerNode stores this in data.
      eventType: sourceNode?.data?.eventType ?? null,
    };
  });
}

function getBehaviorOptions(eventType) {
  if (eventType === 'click') return CLICK_BEHAVIOR_OPTIONS;
  if (eventType === 'press') return PRESS_BEHAVIOR_OPTIONS;
  if (eventType === 'hover') return HOVER_BEHAVIOR_OPTIONS;

  return [
    { value: 'none', label: 'No Event' },
  ];
}

function normalizeBehavior(value, eventType) {
  const options = getBehaviorOptions(eventType);
  const allowed = new Set(options.map((option) => option.value));

  if (value && allowed.has(value)) return value;

  if (eventType === 'click') return 'toggleClicked';
  if (eventType === 'press') return 'activeWhileEvent';
  if (eventType === 'hover') return 'activeWhileEvent';

  return options[0]?.value ?? 'none';
}