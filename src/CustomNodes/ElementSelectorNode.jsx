// src/CustomNodes/ElementSelectorNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  TextField,
  NumberField,
} from './UI/NodeFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

const SELECT_MODE_OPTIONS = [
  { value: 'all', label: 'All Elements' },
  { value: 'byTag', label: 'By Tag' },
  { value: 'byRow', label: 'By Row' },
  { value: 'byColumn', label: 'By Column' },
  { value: 'byIndexRange', label: 'By Index Range' },
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

function resolveTagKey(preset, customKey) {
  if (preset === 'custom') {
    return customKey || 'item';
  }

  return preset || 'item';
}

export default function ElementSelectorNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const selectMode = data.selectMode ?? 'all';
  const tagKeyPreset = data.tagKeyPreset ?? 'item';
  const tagKey = resolveTagKey(tagKeyPreset, data.customTagKey);

  return (
    <NodeShell
      nodeId={id}
      title="Element Selector"
      subtitle="Selects elements from a visual output"
      badge="Select"
      footer="Output: element selection"
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
        sectionId="selection"
        sectionCollapsed={data.sectionCollapsed}
        title="Selection"
        subtitle="Choose which visual elements can be used downstream"
        ports={['visual']}
      >
        <SelectField
          label="Select"
          value={selectMode}
          onChange={(v) => update({ selectMode: v })}
          options={SELECT_MODE_OPTIONS}
        />

        {selectMode === 'byTag' && (
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

            <TextField
              label={tagKey}
              value={data.tagValue ?? ''}
              onChange={(v) => update({ tagValue: v })}
              placeholder="tag value"
            />
          </>
        )}

        {selectMode === 'byRow' && (
          <NumberField
            label="Row"
            value={data.rowIndex ?? 0}
            onChange={(v) => update({ rowIndex: v })}
            min={0}
            step={1}
          />
        )}

        {selectMode === 'byColumn' && (
          <NumberField
            label="Column"
            value={data.colIndex ?? 0}
            onChange={(v) => update({ colIndex: v })}
            min={0}
            step={1}
          />
        )}

        {selectMode === 'byIndexRange' && (
          <>
            <NumberField
              label="Start"
              value={data.indexStart ?? 0}
              onChange={(v) => update({ indexStart: v })}
              min={0}
              step={1}
            />

            <NumberField
              label="End"
              value={data.indexEnd ?? 10}
              onChange={(v) => update({ indexEnd: v })}
              min={0}
              step={1}
            />
          </>
        )}
      </NodeSection>
    </NodeShell>
  );
}