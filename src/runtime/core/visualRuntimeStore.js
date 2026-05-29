// src/runtime/core/visualRuntimeStore.js

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
  let animationFrameId = null;

  const runtime = {
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

      if (hasActiveTransitions(state)) {
        scheduleAnimationFrame();
      }
    },
  };

  function scheduleAnimationFrame() {
    if (animationFrameId != null) return;

    if (typeof requestAnimationFrame === 'function') {
      animationFrameId = requestAnimationFrame((time) => {
        animationFrameId = null;

        runtime.dispatch({
          type: 'transition.tick',
          now: time,
        });

        if (hasActiveTransitions(state)) {
          scheduleAnimationFrame();
        }
      });

      return;
    }

    animationFrameId = setTimeout(() => {
      animationFrameId = null;

      runtime.dispatch({
        type: 'transition.tick',
        now: getNow(),
      });

      if (hasActiveTransitions(state)) {
        scheduleAnimationFrame();
      }
    }, 16);
  }

  return runtime;
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

    transitions: {},

    timelineProgress: initialState.timelineProgress ?? 0,

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
      compiledSpec,
      stateId: action.stateId,
      value: action.value ?? null,
    });
  }

  if (action.type === 'state.clear') {
    return setRuntimeStateValue({
      state,
      compiledSpec,
      stateId: action.stateId,
      value: null,
    });
  }

  if (action.type === 'state.toggle') {
    return setRuntimeStateValue({
      state,
      compiledSpec,
      stateId: action.stateId,
      value: !Boolean(state.states?.[action.stateId]),
    });
  }

  if (action.type === 'transition.tick') {
    return tickTransitions({
      state,
      now: action.now ?? getNow(),
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
      compiledSpec,
    });
  }, state);
}

function applyStateRule({
  state,
  rule,
  ref,
  value,
  compiledSpec,
}) {
  const action = rule.action ?? {};

  if (action.type === 'clearState') {
    return setRuntimeStateValue({
      state,
      compiledSpec,
      stateId: action.stateId,
      value: null,
    });
  }

  if (action.type === 'toggleState') {
    return setRuntimeStateValue({
      state,
      compiledSpec,
      stateId: action.stateId,
      value: !Boolean(state.states?.[action.stateId]),
    });
  }

  if (action.type === 'toggleElementRef') {
    const nextValue = resolveActionValue(action.value, { ref, value });
    const currentValue = state.states?.[action.stateId];

    const shouldClear =
      currentValue?.elementId &&
      nextValue?.elementId &&
      currentValue.elementId === nextValue.elementId;

    return setRuntimeStateValue({
      state,
      compiledSpec,
      stateId: action.stateId,
      value: shouldClear ? null : nextValue,
    });
  }

  if (action.type === 'cycleState') {
    return cycleRuntimeStateValue({
      state,
      compiledSpec,
      stateId: action.stateId,
      order: action.order ?? [],
      mode: action.mode ?? 'next',
    });
  }

  return setRuntimeStateValue({
    state,
    compiledSpec,
    stateId: action.stateId,
    value: resolveActionValue(action.value, { ref, value }),
  });
}

function resolveActionValue(value, eventContext) {
  if (value === 'event.ref') return eventContext.ref;
  if (value === 'event.value') return eventContext.value;
  return value;
}

function cycleRuntimeStateValue({
  state,
  compiledSpec,
  stateId,
  order,
  mode,
}) {
  if (!stateId || !Array.isArray(order) || order.length === 0) {
    return state;
  }

  const current = state.states?.[stateId];
  const currentIndex = order.includes(current)
    ? order.indexOf(current)
    : 0;

  let nextIndex = currentIndex;

  if (mode === 'previous') {
    nextIndex = currentIndex <= 0 ? order.length - 1 : currentIndex - 1;
  } else if (mode === 'toggle') {
    nextIndex = currentIndex === 0 ? Math.min(1, order.length - 1) : 0;
  } else {
    nextIndex = (currentIndex + 1) % order.length;
  }

  return setRuntimeStateValue({
    state,
    compiledSpec,
    stateId,
    value: order[nextIndex],
  });
}

function setRuntimeStateValue({
  state,
  compiledSpec,
  stateId,
  value,
}) {
  if (!stateId) return state;

  const previous = state.states?.[stateId];

  if (previous === value) return state;

  const nextState = {
    ...state,
    states: {
      ...state.states,
      [stateId]: value,
    },
  };

  return startTransitionsForStateChange({
    previousState: state,
    nextState,
    compiledSpec,
    stateId,
    fromValue: previous,
    toValue: value,
  });
}

function startTransitionsForStateChange({
  previousState,
  nextState,
  compiledSpec,
  stateId,
  fromValue,
  toValue,
}) {
  if (fromValue == null || toValue == null || fromValue === toValue) {
    return nextState;
  }

  const relatedBindings = (compiledSpec.bindings ?? []).filter(
    (binding) =>
      binding?.type === 'visualStateBinding' &&
      binding.stateId === stateId
  );

  if (relatedBindings.length === 0) return nextState;

  let transitions = {
    ...(nextState.transitions ?? {}),
  };

  const now = getNow();

  relatedBindings.forEach((binding) => {
    if (!binding.transitionId) {
      delete transitions[binding.id];
      return;
    }

    const transitionSpec = (compiledSpec.transitions ?? []).find(
      (item) => item.id === binding.transitionId
    );

    if (!transitionSpec) {
      delete transitions[binding.id];
      return;
    }

    const mode =
      transitionSpec.executionMode ??
      transitionSpec.mode ??
      'crossfade';

    if (mode === 'direct') {
      delete transitions[binding.id];
      return;
    }

    transitions[binding.id] = {
      id: `${binding.id}:active-transition`,
      bindingId: binding.id,
      transitionId: transitionSpec.id,

      stateId,

      fromStateKey: fromValue,
      toStateKey: toValue,

      startTime: now,
      duration: Math.max(0, Number(transitionSpec.duration ?? 600)),
      easing: transitionSpec.easing ?? 'easeInOut',
      mode,

      rawProgress: 0,
      progress: 0,
    };
  });

  return {
    ...nextState,
    transitions,
  };
}

function tickTransitions({
  state,
  now,
}) {
  const active = state.transitions ?? {};
  const entries = Object.entries(active);

  if (entries.length === 0) return state;

  const nextTransitions = {};
  let changed = false;

  entries.forEach(([bindingId, transition]) => {
    const duration = Math.max(0, Number(transition.duration ?? 0));
    const elapsed = Math.max(0, now - transition.startTime);

    const rawProgress =
      duration <= 0
        ? 1
        : clamp01(elapsed / duration);

    const progress = applyEasing(rawProgress, transition.easing);

    changed =
      changed ||
      rawProgress !== transition.rawProgress ||
      progress !== transition.progress;

    if (rawProgress < 1) {
      nextTransitions[bindingId] = {
        ...transition,
        rawProgress,
        progress,
      };
    }
  });

  if (!changed && Object.keys(nextTransitions).length === entries.length) {
    return state;
  }

  return {
    ...state,
    transitions: nextTransitions,
  };
}

function hasActiveTransitions(state) {
  return Object.keys(state.transitions ?? {}).length > 0;
}

function applyEasing(t, easing) {
  const x = clamp01(t);

  if (easing === 'linear') return x;

  if (easing === 'easeIn') {
    return x * x;
  }

  if (easing === 'easeOut') {
    return 1 - (1 - x) * (1 - x);
  }

  if (easing === 'cubicInOut') {
    return x < 0.5
      ? 4 * x * x * x
      : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  // easeInOut
  return x < 0.5
    ? 2 * x * x
    : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function getNow() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }

  return Date.now();
}

function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}