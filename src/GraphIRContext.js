// GraphIRContext.js
import { createContext, useContext } from 'react';

export const GraphIRContext = createContext(null);

export function useGraphIR() {
  const ctx = useContext(GraphIRContext);
  // This is a sanity check to ensure the hook is used within a provider. In practice, this shouldn't happen since the provider is at the top level of App.
  if (ctx === null) {
    throw new Error('useGraphIR() must be used inside <GraphIRContext.Provider>.');
  }
  return ctx;
}
