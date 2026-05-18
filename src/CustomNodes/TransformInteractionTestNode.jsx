import { Handle, Position } from '@xyflow/react';

export default function TransformInteractionTestNode() {
  return (
    <div
      style={{
        width: 210,
        padding: 10,
        borderRadius: 10,
        border: '1px solid #333',
        background: '#101010',
        color: '#fff',
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>
        Transform + Interaction Test
      </div>

      <div style={{ opacity: 0.7, lineHeight: 1.4 }}>
        Tests parent transform, child transform, and nested click events.
      </div>

      <Handle type="source" position={Position.Right} />
    </div>
  );
}