import { Handle, Position } from '@xyflow/react';
import { useCallback } from 'react';
import { Field, useUpdateNodeData } from './_ui.jsx';

export default function CircleNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const onNum = useCallback((key) => (e) => update({ [key]: Number(e.target.value) }), [update]);
  const onStr = useCallback((key) => (e) => update({ [key]: e.target.value }), [update]);

  return (
    <div style={{ width: 200, padding: 10, borderRadius: 10, border: '1px solid #333', background: '#0f0f0f', color: '#fff' }}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Circle</div>

      <div style={{ display: 'grid', gap: 6 }}>
        <Field label="cx" value={data.cx ?? 50} onChange={onNum('cx')} />
        <Field label="cy" value={data.cy ?? 50} onChange={onNum('cy')} />
        <Field label="r"  value={data.r  ?? 22} onChange={onNum('r')} />
        <Field label="stroke" value={data.stroke ?? '#000000'} onChange={onStr('stroke')} type="text" />
        <Field label="w" value={data.strokeWidth ?? 2} onChange={onNum('strokeWidth')} />
        <Field label="fill" value={data.fill ?? 'none'} onChange={onStr('fill')} type="text" />
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
