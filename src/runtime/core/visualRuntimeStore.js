// src/runtime/visualRuntimeStore.js

import { compileRuntimeSpec } from '../spec/runtimeSpecCompiler.js';

export function createVisualRuntime({
  runtimeSpec,
  initialState = {},
} = {}) {
  const compiledSpec = compileRuntimeSpec(runtimeSpec);

  let state = createInitialRuntimeState({
    compiledSpec,
    initialState,
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

      return () => {
        listeners.delete(listener);
      };
    },

    dispatch(action) {
      const nextState = reduceRuntimeState({
        state,
        action,
        compiledSpec,
      });

      if (nextState === state) return;

      state = nextState;
      listeners.forEach((listener) => listener());
    },
  };
}

function createInitialRuntimeState({
  compiledSpec,
  initialState,
}) {
  const states = {
    ...(initialState.states ?? {}),
  };

  compiledSpec.states.forEach((stateDef) => {
    if (states[stateDef.id] === undefined) {
      states[stateDef.id] = stateDef.initial ?? null;
    }
  });

  return {
    states,

    timelineProgress: initialState.timelineProgress ?? 0,

    // Runtime warnings are produced by adapters/compiler later.
    warnings: [],
  };
}

function reduceRuntimeState({
  state,
  action,
  compiledSpec,
}) {
  if (!action?.type) return state;

  if (action.type === 'event.emit') {
    return applyStateRulesForEvent({
      state,
      compiledSpec,
      eventId: action.eventId,
      ref: action.ref,
      value: action.value,
    });
  }

  if (action.type === 'state.set') {
    return setRuntimeStateValue({
      state,
      stateId: action.stateId,
      value: action.value ?? null,
    });
  }

  if (action.type === 'state.clear') {
    return setRuntimeStateValue({
      state,
      stateId: action.stateId,
      value: null,
    });
  }

  if (action.type === 'state.toggle') {
    return setRuntimeStateValue({
      state,
      stateId: action.stateId,
      value: !Boolean(state.states?.[action.stateId]),
    });
  }

  if (action.type === 'timeline.set') {
    return {
      ...state,
      timelineProgress: clamp01(action.progress ?? 0),
    };
  }

  return state;
}

function applyStateRulesForEvent({
  state,
  compiledSpec,
  eventId,
  ref,
  value,
}) {
  const rules = (compiledSpec.stateRules ?? []).filter(
    (rule) => rule.eventId === eventId
  );

  if (rules.length === 0) return state;

  return rules.reduce((nextState, rule) => {
    return applyStateRule({
      state: nextState,
      rule,
      ref,
      value,
    });
  }, state);
}

function applyStateRule({
  state,
  rule,
  ref,
  value,
}) {
  const action = rule.action ?? {};

  if (action.type === 'clearState') {
    return setRuntimeStateValue({
      state,
      stateId: action.stateId,
      value: null,
    });
  }

  if (action.type === 'toggleState') {
    return setRuntimeStateValue({
      state,
      stateId: action.stateId,
      value: !Boolean(state.states?.[action.stateId]),
    });
  }

  return setRuntimeStateValue({
    state,
    stateId: action.stateId,
    value: resolveActionValue(action.value, { ref, value }),
  });
}

function resolveActionValue(value, eventContext) {
  if (value === 'event.ref') return eventContext.ref;
  if (value === 'event.value') return eventContext.value;
  return value;
}

function setRuntimeStateValue({
  state,
  stateId,
  value,
}) {
  if (!stateId) return state;

  const previous = state.states?.[stateId];

  if (previous === value) return state;

  return {
    ...state,
    states: {
      ...state.states,
      [stateId]: value,
    },
  };
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}