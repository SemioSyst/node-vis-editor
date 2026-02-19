import { Handle, Position } from '@xyflow/react';
import { useCallback } from 'react';
import { Field, useUpdateNodeData } from './_ui.jsx';

export default function LineNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const onNum = useCallback((key) => (e) => update({ [key]: Number(e.target.value) }), [update]);
  const onStr = useCallback((key) => (e) => update({ [key]: e.target.value }), [update]);

  return (
    <div style={{ width: 220, padding: 10, borderRadius: 10, border: '1px solid #333', background: '#0f0f0f', color: '#fff' }}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Line</div>

      <div style={{ display: 'grid', gap: 6 }}>
        <Field label="x1" value={data.x1 ?? 10} onChange={onNum('x1')} />
        <Field label="y1" value={data.y1 ?? 50} onChange={onNum('y1')} />
        <Field label="x2" value={data.x2 ?? 90} onChange={onNum('x2')} />
        <Field label="y2" value={data.y2 ?? 50} onChange={onNum('y2')} />
        <Field label="stroke" value={data.stroke ?? '#000000'} onChange={onStr('stroke')} type="text" />
        <Field label="w" value={data.strokeWidth ?? 2} onChange={onNum('strokeWidth')} />
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
