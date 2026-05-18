import { Handle, Position } from '@xyflow/react';

export default function TestVisualNode() {
  return (
    <div
      style={{
        width: 180,
        padding: 10,
        borderRadius: 10,
        border: '1px solid #333',
        background: '#101010',
        color: '#fff',
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        Test Visual
      </div>

      <div style={{ opacity: 0.7, lineHeight: 1.4 }}>
        Outputs a v0.1 visual spec with group interaction.
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}