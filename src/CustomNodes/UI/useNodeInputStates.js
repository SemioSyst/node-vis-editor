// src/CustomNodes/UI/useNodeInputStates.js
import { useMemo } from 'react';
import { useGraphIR } from '../../GraphIRContext.js';

export function useNodeInputStates(nodeId) {
  const graphIR = useGraphIR();

  const connectedTargetHandles = useMemo(() => {
    const id = String(nodeId);
    const edges = graphIR.edges ?? [];

    const handles = new Set();

    edges.forEach((edge) => {
      if (String(edge.target) !== id) return;

      if (edge.targetHandle) {
        handles.add(edge.targetHandle);
      }
    });

    return handles;
  }, [graphIR, nodeId]);

  const isConnected = (handleId) => connectedTargetHandles.has(handleId);

  return {
    connectedTargetHandles,
    isConnected,
  };
}