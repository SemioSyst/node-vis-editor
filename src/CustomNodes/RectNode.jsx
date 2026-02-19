import { Handle, Position } from '@xyflow/react';
import { useCallback } from 'react';
import { Field, useUpdateNodeData } from './_ui.jsx';

export default function RectNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const onNum = useCallback((key) => (e) => update({ [key]: Number(e.target.value) }), [update]);
  const onStr = useCallback((key) => (e) => update({ [key]: e.target.value }), [update]);

  return (
    <div style={{ width: 220, padding: 10, borderRadius: 10, border: '1px solid #333', background: '#0f0f0f', color: '#fff' }}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Rect</div>

      <div style={{ display: 'grid', gap: 6 }}>
        <Field label="x"  value={data.x  ?? 8}  onChange={onNum('x')} />
        <Field label="y"  value={data.y  ?? 8}  onChange={onNum('y')} />
        <Field label="w"  value={data.w  ?? 84} onChange={onNum('w')} />
        <Field label="h"  value={data.h  ?? 84} onChange={onNum('h')} />
        <Field label="rx" value={data.rx ?? 10} onChange={onNum('rx')} />
        <Field label="ry" value={data.ry ?? 10} onChange={onNum('ry')} />
        <Field label="stroke" value={data.stroke ?? '#000000'} onChange={onStr('stroke')} type="text" />
        <Field label="w" value={data.strokeWidth ?? 2} onChange={onNum('strokeWidth')} />
        <Field label="fill" value={data.fill ?? 'none'} onChange={onStr('fill')} type="text" />
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}
