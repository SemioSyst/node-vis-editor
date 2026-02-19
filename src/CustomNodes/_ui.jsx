// src/CustomNodes/_ui.jsx
// This file contains shared UI components and hooks for custom nodes.
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

export function useUpdateNodeData(nodeId) {
  const { setNodes } = useReactFlow();

  return useCallback((patch) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        return { ...n, data: { ...n.data, ...patch } };
      })
    );
  }, [setNodes, nodeId]);
}

export function Field({ label, value, onChange, type = 'number', step }) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 6, alignItems: 'center', fontSize: 12 }}>
      <span style={{ opacity: 0.8 }}>{label}</span>
      <input
        className="nodrag"
        type={type}
        step={step}
        value={value ?? ''}
        onChange={onChange}
        style={{
          width: '100%',
          padding: '4px 6px',
          borderRadius: 6,
          border: '1px solid #444',
          background: '#111',
          color: '#fff',
        }}
      />
    </label>
  );
}
