// src/runtime/visualRuntimeReact.js

import { useSyncExternalStore } from 'react';

const EMPTY_STATE = {};

function subscribeNoop() {
  return () => {};
}

function getEmptyState() {
  return EMPTY_STATE;
}

export function useVisualRuntimeSnapshot(runtime) {
  return useSyncExternalStore(
    runtime?.subscribe ?? subscribeNoop,
    runtime?.getState ?? getEmptyState,
    runtime?.getState ?? getEmptyState
  );
}