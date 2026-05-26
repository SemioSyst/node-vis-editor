// src/runtime/runtimeOverrides.js

import {
  matchesRuntimeSelector,
  matchesRuntimeScope,
} from '../references/runtimeSelectors.js';

export function applyRuntimeOverridesToNode(node, ref, runtime) {
  if (!runtime || !ref?.elementId) return node;

  const style = applyRuntimeStyleOverrides(node.style ?? {}, ref, runtime);

  if (style === (node.style ?? {})) return node;

  return {
    ...node,
    style,
  };
}

export function applyRuntimeStyleOverrides(baseStyle, ref, runtime) {
  const spec = runtime.getSpec();
  const state = runtime.getState();

  const activeOverrides = (spec.overrides ?? [])
    .filter((override) =>
      isOverrideActive({
        override,
        runtimeState: state,
        currentRef: ref,
      })
    )
    .sort((a, b) => Number(a.priority ?? 0) - Number(b.priority ?? 0));

  if (activeOverrides.length === 0) return baseStyle;

  return activeOverrides.reduce((style, override) => {
    return applyStylePatch(style, override.patch?.style ?? {});
  }, baseStyle);
}

function isOverrideActive({
  override,
  runtimeState,
  currentRef,
}) {

  if (!matchesRuntimeScope(currentRef, override.targetScopeId)) {
    return false;
  }
  
  const stateValue = runtimeState.states?.[override.stateId];

  if (override.when?.exists && stateValue == null) {
    return false;
  }

  if ('equals' in (override.when ?? {})) {
    if (stateValue !== override.when.equals) return false;
  }

  return matchesRuntimeSelector({
    selector: override.selector,
    stateValue,
    currentRef,
  });
}

function applyStylePatch(style, patch) {
  if (!patch || Object.keys(patch).length === 0) return style;

  const next = {
    ...style,
  };

  if (patch.opacity != null) {
    next.opacity = patch.opacity;
  }

  if (patch.fill) {
    next.fill = {
      ...(typeof style.fill === 'object' ? style.fill : {}),
      ...patch.fill,
    };
  }

  if (patch.stroke) {
    next.stroke = {
      ...(typeof style.stroke === 'object' ? style.stroke : {}),
      ...patch.stroke,
    };
  }

  return next;
}