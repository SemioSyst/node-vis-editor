// src/runtime/visualRuntimeCore.js

import { compileRuntimeSpec } from '../spec/runtimeSpecCompiler.js';

export const EMPTY_VISUAL_RUNTIME_SPEC = {
  version: '0.1',
  states: [],
  events: [],
  stateRules: [],
  overrides: [],
};

export function createVisualRuntime({
  runtimeSpec = EMPTY_VISUAL_RUNTIME_SPEC,
  initialState = {},
} = {}) {
  const compiledSpec = compileRuntimeSpec(runtimeSpec);

  let state = {
    states: {},
    selected: null,
    activeState: null,
    timelineProgress: 0,
    ...initialState,
  };

  compiledSpec.states.forEach((stateDef) => {
    if (state.states[stateDef.id] === undefined) {
      state.states[stateDef.id] = stateDef.initial ?? null;
    }
  });

  const listeners = new Set();

  return {
    getSpec() {
      return compiledSpec;
    },

    getState() {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    dispatch(action) {
      const nextState = reduceRuntimeState(state, action);

      if (nextState === state) return;

      state = nextState;
      listeners.forEach((listener) => listener());
    },
  };
}

function reduceRuntimeState(state, action) {
  if (!action?.type) return state;

  if (action.type === 'state.set') {
    return {
      ...state,
      states: {
        ...state.states,
        [action.stateId]: action.value ?? null,
      },
    };
  }

  if (action.type === 'state.clear') {
    return {
      ...state,
      states: {
        ...state.states,
        [action.stateId]: null,
      },
    };
  }

  if (action.type === 'state.toggle') {
    return {
      ...state,
      states: {
        ...state.states,
        [action.stateId]: !Boolean(state.states[action.stateId]),
      },
    };
  }

  if (action.type === 'timeline.set') {
    return {
      ...state,
      timelineProgress: clamp01(action.progress ?? 0),
    };
  }

  return state;
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}