// src/CustomNodes/SimpleDataInputNode.jsx
import { Handle, Position } from '@xyflow/react';
import NodeShell from './UI/NodeShell.jsx';
import { SelectField, TextareaField } from './UI/NodeFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

export default function SimpleDataInputNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const dataMode = data.dataMode ?? 'array';

  return (
    <NodeShell
      title="Simple Data Input"
      subtitle="Outputs number, array, or table data"
      badge="Data"
      footer={`Output: data / ${dataMode}`}
    >
      <Handle type="source" position={Position.Right} />

      <SelectField
        label="Mode"
        value={dataMode}
        onChange={(v) => update({ dataMode: v })}
        options={[
          { value: 'number', label: 'Number' },
          { value: 'array', label: 'Array' },
          { value: 'table', label: 'Table' },
        ]}
      />

      <TextareaField
        label="Input"
        value={data.rawText ?? getDefaultText(dataMode)}
        rows={dataMode === 'table' ? 5 : 3}
        onChange={(v) => update({ rawText: v })}
        placeholder={getPlaceholder(dataMode)}
      />
    </NodeShell>
  );
}

function getDefaultText(mode) {
  if (mode === 'number') return '42';
  if (mode === 'table') return 'name,value\nA,20\nB,45\nC,70\nD,35';
  return '20,45,70,35';
}

function getPlaceholder(mode) {
  if (mode === 'number') return '42';
  if (mode === 'table') return 'name,value\nA,20\nB,45';
  return '20,45,70,35';
}