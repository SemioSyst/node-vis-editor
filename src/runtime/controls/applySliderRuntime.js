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
      scopeId: slider.activeTrackScopeId,
      updater: (node) => updateActiveTrack(node, slider, progress),
    });

    if (activeResult.changed) {
      root = activeResult.node;
      changed = true;
    }

    const handleResult = updateSliderPart({
      node: root,
      scopeId: slider.handleScopeId,
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
  scopeId,
  updater,
}) {
  if (!node || !scopeId) {
    return {
      node,
      changed: false,
    };
  }

  if (nodeMatchesRuntimeScope(node, scopeId)) {
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
      scopeId,
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

function updateActiveTrack(node, slider, progress) {
  const width = Number(slider.width ?? 0);
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
  const width = Number(slider.width ?? 0);
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
  if (meta.runtimeTargetScopeId === scopeId) return true;
  if (meta.originalStateRootId === scopeId) return true;
  if (meta.sourceRootId === scopeId) return true;
  if (meta.sourceVisualRootId === scopeId) return true;

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