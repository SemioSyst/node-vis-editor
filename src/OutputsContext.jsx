// OutputsContext.js
import { createContext, useContext, useMemo, useState, useCallback } from 'react';

export const OutputsContext = createContext(null);

export function useOutputs() {
  const ctx = useContext(OutputsContext);
  if (ctx === null) {
    throw new Error('useOutputs() must be used inside <OutputsProvider>.');
  }
  return ctx;
}

/**
 * outputs shape:
 *   outputs[nodeId] = svgSpec
 */
export function OutputsProvider({ children, initialOutputs = null }) {
  // We use an object with null prototype to avoid potential key collisions (e.g. with built-in Object properties)
  const [outputs, setOutputs] = useState(() => initialOutputs ?? Object.create(null));

  // Helper function to set output for a specific node
  const setOutput = useCallback((nodeId, value) => {
    const id = String(nodeId);
    setOutputs((prev) => ({ ...prev, [id]: value }));
  }, []);

  // Helper function to clear all outputs
  const clearOutputs = useCallback(() => {
    setOutputs(Object.create(null));
  }, []);

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const value = useMemo(() => {
    return { outputs, setOutputs, setOutput, clearOutputs };
  }, [outputs, setOutput, clearOutputs]);

  return <OutputsContext.Provider value={value}>{children}</OutputsContext.Provider>;
}
