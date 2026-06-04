// src/runtime/controls/applySliderRuntime.js

export function applySliderRuntimeToOutput(output, runtime) {
  if (!output || output.outputType !== 'visual') return output;
  if (!runtime) return output;

  const spec = runtime.getSpec?.();
  const state = runtime.getState?.();

  const sliderEvents = (spec?.events ?? []).filter(
    (eventSpec) => eventSpec?.event === 'sliderInput'
  );

  if (!sliderEvents.length) return output;

  let root = output.root;
  let changed = false;

  sliderEvents.forEach((eventSpec) => {
    const slider = eventSpec.slider ?? {};
    const stateId = slider.stateId;

    const value =
      state?.states?.[stateId] ??
      findInitialStateValue(spec, stateId);

    if (!value) return;

    const progress = clamp01(value.progress ?? 0);

    const activeResult = updateSliderPart({
      node: root,
      slider,
      role: 'activeTrack',
      scopeId: slider.activeTrackScopeId,
      stateId,
      updater: (node) => updateActiveTrack(node, slider, progress),
    });

    if (activeResult.changed) {
      root = activeResult.node;
      changed = true;
    }

    const handleResult = updateSliderPart({
      node: root,
      slider,
      role: 'handle',
      scopeId: slider.handleScopeId,
      stateId,
      updater: (node) => updateHandle(node, slider, progress),
    });

    if (handleResult.changed) {
      root = handleResult.node;
      changed = true;
    }
  });

  if (!changed) return output;

  return {
    ...output,
    root,
    meta: {
      ...(output.meta ?? {}),
      sliderRuntimeApplied: true,
    },
  };
}

function updateSliderPart({
  node,
  slider,
  role,
  scopeId,
  stateId,
  updater,
}) {
  if (!node) {
    return {
      node,
      changed: false,
    };
  }

  if (nodeMatchesSliderPart(node, {
    role,
    scopeId,
    stateId,
    slider,
  })) {
    return {
      node: updater(node),
      changed: true,
    };
  }

  const children = node.children ?? [];

  if (!children.length) {
    return {
      node,
      changed: false,
    };
  }

  let changed = false;

  const nextChildren = children.map((child) => {
    const result = updateSliderPart({
      node: child,
      slider,
      role,
      scopeId,
      stateId,
      updater,
    });

    if (result.changed) {
      changed = true;
    }

    return result.node;
  });

  if (!changed) {
    return {
      node,
      changed: false,
    };
  }

  return {
    node: {
      ...node,
      children: nextChildren,
    },
    changed: true,
  };
}

function nodeMatchesSliderPart(node, {
  role,
  scopeId,
  stateId,
  slider,
}) {
  if (!node) return false;

  const meta = node.meta ?? {};

  // First: match the actual part directly.
  // Do not use runtimeScopeIds here, because CoordinateGroup layer wrappers
  // may collect all child scopes and would be falsely matched as activeTrack/handle.
  if (nodeMatchesDirectRuntimeScope(node, scopeId)) {
    return true;
  }

  // Best fallback: Slider evaluator writes these fields directly on the real
  // activeTrack / handle nodes. CoordinateGroup should preserve meta.
  if (
    meta.sliderRole === role &&
    meta.sliderStateId === stateId
  ) {
    return true;
  }

  // Additional strict fallback for older / partially prefixed nodes.
  if (
    role === 'activeTrack' &&
    meta.sliderRole === 'activeTrack' &&
    nodeMatchesDirectRuntimeScope(node, slider.activeTrackScopeId)
  ) {
    return true;
  }

  if (
    role === 'handle' &&
    meta.sliderRole === 'handle' &&
    nodeMatchesDirectRuntimeScope(node, slider.handleScopeId)
  ) {
    return true;
  }

  return false;
}

function nodeMatchesDirectRuntimeScope(node, scopeId) {
  if (!node || !scopeId) return false;

  const meta = node.meta ?? {};

  if (node.id === scopeId) return true;
  if (meta.originalId === scopeId) return true;
  if (meta.sourceRootId === scopeId) return true;
  if (meta.sourceVisualRootId === scopeId) return true;
  if (meta.runtimeTargetScopeId === scopeId) return true;
  if (meta.originalStateRootId === scopeId) return true;

  // Important:
  // Do NOT use meta.runtimeScopeIds here.
  // For slider visual updates we need the actual part node, not a wrapper
  // that merely contains the part's scope.
  return false;
}

function updateActiveTrack(node, slider, progress) {
  const width = Number(
    slider.width ??
    node.meta?.sliderWidth ??
    node.content?.shape?.width ??
    0
  );

  const nextWidth = width * progress;

  return {
    ...node,
    content: {
      ...(node.content ?? {}),
      shape: {
        ...(node.content?.shape ?? {}),
        width: nextWidth,
      },
    },
    meta: {
      ...(node.meta ?? {}),
      sliderRuntimeProgress: progress,
    },
  };
}

function updateHandle(node, slider, progress) {
  const width = Number(
    slider.width ??
    node.meta?.sliderWidth ??
    0
  );

  const nextCx = width * progress;

  return {
    ...node,
    content: {
      ...(node.content ?? {}),
      shape: {
        ...(node.content?.shape ?? {}),
        cx: nextCx,
      },
    },
    meta: {
      ...(node.meta ?? {}),
      sliderRuntimeProgress: progress,
    },
  };
}

function findInitialStateValue(spec, stateId) {
  return (spec?.states ?? []).find((item) => item.id === stateId)?.initial ?? null;
}

function nodeMatchesRuntimeScope(node, scopeId) {
  if (!node || !scopeId) return false;

  const meta = node.meta ?? {};

  if (node.id === scopeId) return true;
  if (meta.originalId === scopeId) return true;
  if (meta.sourceRootId === scopeId) return true;
  if (meta.sourceVisualRootId === scopeId) return true;
  if (meta.runtimeTargetScopeId === scopeId) return true;
  if (meta.originalStateRootId === scopeId) return true;

  if (
    Array.isArray(meta.runtimeScopeIds) &&
    meta.runtimeScopeIds.includes(scopeId)
  ) {
    return true;
  }

  return false;
}

function clamp01(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(1, n));
}