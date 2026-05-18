// src/CustomNodes/UI/useUpdateNodeData.js
import { useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';

export function useUpdateNodeData(nodeId) {
  const { setNodes } = useReactFlow();

  return useCallback((patch) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id !== nodeId) return node;

        return {
          ...node,
          data: {
            ...node.data,
            ...patch,
          },
        };
      })
    );
  }, [setNodes, nodeId]);
}