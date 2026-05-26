// src/CustomNodes/HoverRuntimeBinderNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  NumberField,
  ColorField,
  TextField,
} from './UI/NodeFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

const MATCH_OPTIONS = [
  { value: 'self', label: 'Self' },
  { value: 'sameTag', label: 'Same Tag' },
  { value: 'sameRow', label: 'Same Row' },
  { value: 'sameColumn', label: 'Same Column' },
];

const TAG_KEY_OPTIONS = [
  { value: 'item', label: 'item' },
  { value: 'state', label: 'state' },
  { value: 'time', label: 'time' },
  { value: 'group', label: 'group' },
  { value: 'series', label: 'series' },
  { value: 'category', label: 'category' },
  { value: 'custom', label: 'Custom' },
];

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'On' },
  { value: 'false', label: 'Off' },
];

export default function HoverRuntimeBinderNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const matchMode = data.matchMode ?? 'self';
  const tagKeyPreset = data.tagKeyPreset ?? 'item';
  const useOpacity = data.useOpacity ?? false;
  const useCursor = data.useCursor ?? true;

  return (
    <NodeShell
      nodeId={id}
      title="Hover Runtime Binder"
      subtitle="Adds hover event, hover state, and hover style change"
      badge="Runtime"
      footer="Output: visual + runtime"
      collapsed={data.collapsed}
    >
      <Handle
        type="target"
        id="visual"
        position={Position.Left}
      />

      <Handle
        type="source"
        position={Position.Right}
      />

      <NodeSection
        nodeId={id}
        sectionId="hover"
        sectionCollapsed={data.sectionCollapsed}
        title="Hover"
        subtitle="How hovered elements are matched"
        ports={['visual']}
      >
        <SelectField
          label="Match"
          value={matchMode}
          onChange={(v) => update({ matchMode: v })}
          options={MATCH_OPTIONS}
        />

        {matchMode === 'sameTag' && (
          <>
            <SelectField
              label="Tag Key"
              value={tagKeyPreset}
              onChange={(v) => update({ tagKeyPreset: v })}
              options={TAG_KEY_OPTIONS}
            />

            {tagKeyPreset === 'custom' && (
              <TextField
                label="Custom"
                value={data.customTagKey ?? ''}
                onChange={(v) => update({ customTagKey: v })}
                placeholder="tagKey"
              />
            )}
          </>
        )}

        <SelectField
          label="Cursor"
          value={String(useCursor)}
          onChange={(v) => update({ useCursor: v === 'true' })}
          options={BOOLEAN_OPTIONS}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="effect"
        sectionCollapsed={data.sectionCollapsed}
        title="Effect"
        subtitle="Style patch applied while matched"
      >
        <ColorField
          label="Stroke"
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

        <SelectField
          label="Opacity"
          value={String(useOpacity)}
          onChange={(v) => update({ useOpacity: v === 'true' })}
          options={BOOLEAN_OPTIONS}
        />

        {useOpacity && (
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