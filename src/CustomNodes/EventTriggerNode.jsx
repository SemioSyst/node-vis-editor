// src/CustomNodes/EventTriggerNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
} from './UI/NodeFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

const EVENT_TYPE_OPTIONS = [
  { value: 'hover', label: 'Hover' },
  { value: 'click', label: 'Click' },
  { value: 'press', label: 'Press' },
];

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'On' },
  { value: 'false', label: 'Off' },
];

export default function EventTriggerNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const eventType = data.eventType ?? 'hover';
  const useCursor = data.useCursor ?? true;

  return (
    <NodeShell
      nodeId={id}
      title="Event Trigger"
      subtitle="Turns selected elements into event sources"
      badge="Event"
      footer="Output: event signal"
      collapsed={data.collapsed}
    >
      <Handle
        type="target"
        id="selection"
        position={Position.Left}
      />

      <Handle
        type="source"
        position={Position.Right}
      />

      <NodeSection
        nodeId={id}
        sectionId="event"
        sectionCollapsed={data.sectionCollapsed}
        title="Event"
        subtitle="Choose what user action should be watched"
        ports={['selection']}
      >
        <SelectField
          label="Event"
          value={eventType}
          onChange={(v) => update({ eventType: v })}
          options={EVENT_TYPE_OPTIONS}
        />

        <SelectField
          label="Cursor"
          value={String(useCursor)}
          onChange={(v) => update({ useCursor: v === 'true' })}
          options={BOOLEAN_OPTIONS}
        />
      </NodeSection>
    </NodeShell>
  );
}