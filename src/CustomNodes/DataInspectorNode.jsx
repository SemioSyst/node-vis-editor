// src/CustomNodes/DataInspectorNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  NumberField,
} from './UI/NodeFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

const VIEW_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'values', label: 'Values' },
  { value: 'tags', label: 'Tags' },
  { value: 'matrix', label: 'Matrix' },
  { value: 'lineage', label: 'Lineage' },
  { value: 'json', label: 'Raw JSON' },
];

export default function DataInspectorNode({ id, data }) {
  const update = useUpdateNodeData(id);

  return (
    <NodeShell
      nodeId={id}
      title="Data Inspector"
      subtitle="Inspects values, matrix items, tags and lineage"
      badge="Inspect"
      footer="Output: inspection table"
      collapsed={data.collapsed}
    >
      <Handle
        type="target"
        id="input"
        position={Position.Left}
      />

      <Handle
        type="source"
        position={Position.Right}
      />

      <NodeSection
        nodeId={id}
        sectionId="inspect"
        sectionCollapsed={data.sectionCollapsed}
        title="Inspect"
        subtitle="Choose what to display"
        ports={['input']}
      >
        <SelectField
          label="View"
          value={data.viewMode ?? 'auto'}
          onChange={(v) => update({ viewMode: v })}
          options={VIEW_OPTIONS}
        />

        <NumberField
          label="Max Rows"
          value={data.maxRows ?? 80}
          onChange={(v) => update({ maxRows: v })}
          min={1}
          max={500}
          step={1}
        />
      </NodeSection>
    </NodeShell>
  );
}