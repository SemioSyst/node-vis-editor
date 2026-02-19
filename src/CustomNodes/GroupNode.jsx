import { Handle, Position } from '@xyflow/react';

export default function GroupNode() {
  return (
    <div style={{ width: 100, padding: 10, borderRadius: 10, border: '1px solid #333', background: '#0f0f0f', color: '#fff' }}>
      <Handle type="target" position={Position.Left} />
      <div style={{ fontWeight: 600 }}>Group</div>
      <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
        Combines upstream outputs into one group
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
