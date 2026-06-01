// src/runtime/context/applyContextSlots.js

import { cloneVisualNode } from '../interpolation/visualTreeUtils.js';

export function applyContextSlotsToVisual(root, {
  context,
  contextSlotSets = [],
} = {}) {
  if (!root || !contextSlotSets.length) return root;

  let nextRoot = cloneVisualNode(root);
  let changed = false;

  contextSlotSets.forEach((slotSet) => {
    (slotSet.bindings ?? []).forEach((binding) => {
      const result = applyBindingToTree({
        node: nextRoot,
        binding,
        context,
        slotSet,
      });

      if (result.changed) {
        nextRoot = result.node;
        changed = true;
      }
    });
  });

  if (!changed) return root;

  return {
    ...nextRoot,
    meta: {
      ...(nextRoot.meta ?? {}),
      contextSlotsApplied: true,
    },
  };
}

export function makeContextFromRuntimeRef(ref, extra = {}) {
  const dataRef = ref?.dataRef ?? {};
  const meta = ref?.meta ?? {};

  return {
    ...extra,

    eventRef: ref,
    anchorRef: ref,
    element: ref,

    tags: ref?.tags ?? {},
    dataRef,
    data: dataRef,

    sourceItems:
      dataRef.sourceItems ??
      meta.sourceItems ??
      {},

    lineage:
      dataRef.parameterLineage ??
      meta.parameterLineage ??
      {},

    meta,

    index: ref?.index ?? null,
    flatIndex: ref?.flatIndex ?? null,
    rowIndex: ref?.rowIndex ?? null,
    colIndex: ref?.colIndex ?? null,

    value:
      dataRef.value ??
      dataRef.rawValue ??
      dataRef.inputValue ??
      dataRef.mappedValue ??
      null,

    rawValue:
      dataRef.rawValue ??
      dataRef.inputValue ??
      dataRef.value ??
      null,

    mappedValue:
      dataRef.mappedValue ??
      dataRef.value ??
      null,

    pointer: ref?.pointer ?? null,
  };
}

function applyBindingToTree({
  node,
  binding,
  context,
  slotSet,
}) {
  if (!node) {
    return {
      node,
      changed: false,
    };
  }

  const isStateBinding = binding.property === 'state.activeState';

  const matchesTarget = isStateBinding
    ? nodeMatchesStateBindingTarget(node, binding)
    : nodeMatchesBindingTarget(node, binding.elementId);

  if (matchesTarget) {
    const value = resolveBindingValue(binding, context);

    const nextNode = isStateBinding
      ? applyLocalActiveState({
          node,
          requestedValue: value,
          binding,
          slotSet,
        })
      : setBindingProperty(node, binding.property, value);

    return {
      node: {
        ...nextNode,
        meta: {
          ...(nextNode.meta ?? {}),
          contextSlotBindingApplied: true,
        },
      },
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
    const result = applyBindingToTree({
      node: child,
      binding,
      context,
      slotSet,
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

/* -------------------------------------------------------------------------- */
/* Local stateful child lookup                                                 */
/* -------------------------------------------------------------------------- */

function applyLocalActiveState({
  node,
  requestedValue,
  binding,
  slotSet,
}) {
  const runtimeSpec =
    slotSet?.runtimeSpec ??
    node.runtimeSpec ??
    node.meta?.runtimeSpec ??
    null;

  if (!runtimeSpec) {
    return markStateRequestOnly({
      node,
      requestedValue,
      reason: 'missing-runtime-spec',
    });
  }

  const visualStateBinding = findVisualStateBindingForNode({
    node,
    runtimeSpec,
    binding,
  });

  if (!visualStateBinding) {
    return markStateRequestOnly({
      node,
      requestedValue,
      reason: 'missing-visual-state-binding',
    });
  }

  const change = (runtimeSpec.changes ?? []).find(
    (item) =>
      item.id === visualStateBinding.changeId &&
      item.type === 'visualState'
  );

  if (!change) {
    return markStateRequestOnly({
      node,
      requestedValue,
      reason: 'missing-visual-state-change',
    });
  }

  const visualState = findVisualStateByContextValue({
    visualStates: change.visualStates ?? [],
    requestedValue,
    binding,
  });

  if (!visualState?.visual?.root) {
    return markStateRequestOnly({
      node,
      requestedValue,
      reason: 'state-not-found',
    });
  }

  return makeLocalStateReplacement({
    currentNode: node,
    replacementRoot: visualState.visual.root,
    activeStateKey: visualState.key,
    requestedValue,
  });
}

function findVisualStateBindingForNode({
  node,
  runtimeSpec,
  binding,
}) {
  const bindings = (runtimeSpec.bindings ?? []).filter(
    (item) => item?.type === 'visualStateBinding'
  );

  const stateInfo = binding.stateInfo ?? null;

  if (stateInfo?.bindingId) {
    const byBindingId = bindings.find(
      (item) => item.id === stateInfo.bindingId
    );

    if (byBindingId) return byBindingId;
  }

  if (stateInfo?.targetScopeId) {
    const byTargetScope = bindings.find(
      (item) => item.targetScopeId === stateInfo.targetScopeId
    );

    if (byTargetScope) return byTargetScope;
  }

  return bindings.find((item) =>
    nodeMatchesDirectRuntimeScope(node, item.targetScopeId)
  ) ?? null;
}

function findVisualStateByContextValue({
  visualStates,
  requestedValue,
  binding,
}) {
  const raw = String(requestedValue ?? '').trim();

  if (!raw) return null;

  const matchMode =
    binding.stateMatch?.method ??
    binding.stateMatch ??
    'auto';

  if (matchMode === 'key') {
    return visualStates.find((state) => String(state.key) === raw) ?? null;
  }

  if (matchMode === 'label') {
    return visualStates.find((state) => String(state.label ?? '') === raw) ?? null;
  }

  // Auto: exact matching first.
  const exact = visualStates.find((state) =>
    String(state.key ?? '') === raw ||
    String(state.label ?? '') === raw ||
    String(state.summary?.label ?? '') === raw ||
    String(state.sourceNodeId ?? '') === raw ||
    String(state.visual?.meta?.label ?? '') === raw ||
    String(state.visual?.meta?.sourceNodeId ?? '') === raw
  );

  if (exact) return exact;

  const normalized = normalizeMatchString(raw);

  return visualStates.find((state) =>
    normalizeMatchString(state.key) === normalized ||
    normalizeMatchString(state.label) === normalized ||
    normalizeMatchString(state.summary?.label) === normalized ||
    normalizeMatchString(state.sourceNodeId) === normalized ||
    normalizeMatchString(state.visual?.meta?.label) === normalized ||
    normalizeMatchString(state.visual?.meta?.sourceNodeId) === normalized
  ) ?? null;
}

function makeLocalStateReplacement({
  currentNode,
  replacementRoot,
  activeStateKey,
  requestedValue,
}) {
  const cloned = cloneVisualNode(replacementRoot);

  return {
    ...cloned,

    // Keep the selected component child identity stable.
    id: currentNode.id,

    frame: currentNode.frame ?? cloned.frame,
    transform: currentNode.transform ?? cloned.transform,
    opacity: currentNode.opacity ?? cloned.opacity,

    meta: {
      ...(cloned.meta ?? {}),
      ...(currentNode.meta ?? {}),

      contextLocalStateApplied: true,
      contextRequestedActiveState: requestedValue,
      activeStateKey,

      originalStateRootId: cloned.id,
      runtimeTargetScopeId: currentNode.id,

      runtimeScopeIds: uniqueTruthy([
        ...(cloned.meta?.runtimeScopeIds ?? []),
        ...(currentNode.meta?.runtimeScopeIds ?? []),
        cloned.id,
        currentNode.id,
        currentNode.meta?.originalId,
        currentNode.meta?.sourceRootId,
        currentNode.meta?.sourceVisualRootId,
      ]),
    },
  };
}

function markStateRequestOnly({
  node,
  requestedValue,
  reason,
}) {
  return {
    ...node,
    meta: {
      ...(node.meta ?? {}),
      contextRequestedActiveState: requestedValue,
      contextStateResolutionFailed: reason,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Normal property bindings                                                    */
/* -------------------------------------------------------------------------- */

function resolveBindingValue(binding, context) {
  const source = binding.source ?? {};
  const fallback = binding.fallback ?? '';

  let rawValue;

  if (source.type === 'fixed') {
    rawValue = source.value;
  } else {
    rawValue = getContextPath(context, source.path);
  }

  if (rawValue == null || rawValue === '') {
    rawValue = fallback;
  }

  return formatBindingValue(rawValue, binding);
}

function getContextPath(context, path) {
  if (!path) return undefined;

  const normalized = String(path)
    .replace(/^context\./, '')
    .trim();

  if (!normalized) return undefined;

  return normalized.split('.').reduce((current, key) => {
    if (current == null) return undefined;
    return current[key];
  }, context);
}

function formatBindingValue(value, binding) {
  const format = binding.format ?? {};
  const type = format.type ?? 'raw';

  if (type === 'number') {
    const n = Number(value);

    if (!Number.isFinite(n)) {
      return value;
    }

    const decimals = Math.max(0, Number(format.decimals ?? 0));

    return `${format.prefix ?? ''}${n.toFixed(decimals)}${format.suffix ?? ''}`;
  }

  if (type === 'percent') {
    const n = Number(value);

    if (!Number.isFinite(n)) {
      return value;
    }

    const decimals = Math.max(0, Number(format.decimals ?? 0));

    return `${format.prefix ?? ''}${(n * 100).toFixed(decimals)}${format.suffix ?? '%'}`;
  }

  if (type === 'color') {
    return String(value ?? '');
  }

  if (type === 'stateKey') {
    return String(value ?? '');
  }

  if (type === 'text') {
    return String(value ?? '');
  }

  return value;
}

function setBindingProperty(node, property, value) {
  if (!property) return node;

  if (property === 'content.text') {
    return {
      ...node,
      content: {
        ...(node.content ?? {}),
        text: String(value ?? ''),
      },
    };
  }

  if (property === 'style.fill.color') {
    return {
      ...node,
      style: {
        ...(node.style ?? {}),
        fill: makeFillWithColor(node.style?.fill, value),
      },
    };
  }

  if (property === 'style.stroke.color') {
    return {
      ...node,
      style: {
        ...(node.style ?? {}),
        stroke: makeStrokeWithPatch(node.style?.stroke, {
          color: String(value ?? ''),
        }),
      },
    };
  }

  if (property === 'style.stroke.width') {
    return {
      ...node,
      style: {
        ...(node.style ?? {}),
        stroke: makeStrokeWithPatch(node.style?.stroke, {
          width: Number(value),
        }),
      },
    };
  }

  if (property === 'style.opacity') {
    return {
      ...node,
      style: {
        ...(node.style ?? {}),
        opacity: toNumberOr(value, node.style?.opacity ?? 1),
      },
    };
  }

  if (property === 'content.x' || property === 'content.y') {
    const key = property.split('.')[1];

    return {
      ...node,
      content: {
        ...(node.content ?? {}),
        [key]: toNumberOr(value, node.content?.[key] ?? 0),
      },
    };
  }

  if (property.startsWith('content.shape.')) {
    const key = property.replace('content.shape.', '');

    return {
      ...node,
      content: {
        ...(node.content ?? {}),
        shape: {
          ...(node.content?.shape ?? {}),
          [key]: toNumberOr(value, node.content?.shape?.[key] ?? 0),
        },
      },
    };
  }

  return setNestedValue(node, property, value);
}

/* -------------------------------------------------------------------------- */
/* Matching helpers                                                            */
/* -------------------------------------------------------------------------- */

function nodeMatchesBindingTarget(node, elementId, options = {}) {
  if (!node || !elementId) return false;

  const strict = Boolean(options.strict);
  const meta = node.meta ?? {};

  if (node.id === elementId) return true;
  if (meta.originalId === elementId) return true;
  if (meta.runtimeTargetScopeId === elementId) return true;
  if (meta.originalStateRootId === elementId) return true;
  if (meta.sourceRootId === elementId) return true;
  if (meta.sourceVisualRootId === elementId) return true;

  if (
    !strict &&
    Array.isArray(meta.runtimeScopeIds) &&
    meta.runtimeScopeIds.includes(elementId)
  ) {
    return true;
  }

  return false;
}

function nodeMatchesStateBindingTarget(node, binding) {
  if (!node || !binding) return false;

  const meta = node.meta ?? {};
  const stateInfo = binding.stateInfo ?? {};

  // Best case: Context Slots scan recorded the exact node id.
  if (stateInfo.targetNodeId) {
    if (node.id === stateInfo.targetNodeId) return true;
    if (meta.originalId === stateInfo.targetNodeId) return true;
    if (meta.runtimeTargetScopeId === stateInfo.targetNodeId) return true;
    if (meta.originalStateRootId === stateInfo.targetNodeId) return true;
    if (meta.sourceRootId === stateInfo.targetNodeId) return true;
    if (meta.sourceVisualRootId === stateInfo.targetNodeId) return true;
  }

  // Next: match the visualStateBinding target scope directly.
  if (stateInfo.targetScopeId) {
    if (node.id === stateInfo.targetScopeId) return true;
    if (meta.originalId === stateInfo.targetScopeId) return true;
    if (meta.runtimeTargetScopeId === stateInfo.targetScopeId) return true;
    if (meta.originalStateRootId === stateInfo.targetScopeId) return true;
    if (meta.sourceRootId === stateInfo.targetScopeId) return true;
    if (meta.sourceVisualRootId === stateInfo.targetScopeId) return true;
  }

  // Fallback: match the registered element id, but still only by direct ids.
  if (binding.elementId) {
    if (node.id === binding.elementId) return true;
    if (meta.originalId === binding.elementId) return true;
    if (meta.runtimeTargetScopeId === binding.elementId) return true;
    if (meta.originalStateRootId === binding.elementId) return true;
    if (meta.sourceRootId === binding.elementId) return true;
    if (meta.sourceVisualRootId === binding.elementId) return true;
  }

  // Important:
  // Do not use runtimeScopeIds for state.activeState.
  // runtimeScopeIds can be inherited by wrapper groups and would make
  // Context Slots replace the whole tooltip component instead of the mini chart.
  return false;
}

function nodeMatchesDirectRuntimeScope(node, scopeId) {
  if (!node || !scopeId) return false;

  const meta = node.meta ?? {};

  if (node.id === scopeId) return true;
  if (meta.originalId === scopeId) return true;
  if (meta.runtimeTargetScopeId === scopeId) return true;
  if (meta.originalStateRootId === scopeId) return true;
  if (meta.sourceRootId === scopeId) return true;
  if (meta.sourceVisualRootId === scopeId) return true;

  // Important:
  // Do not use runtimeScopeIds here.
  // For local state replacement we need a direct target, not an ancestor wrapper.
  return false;
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

/* -------------------------------------------------------------------------- */
/* Object utilities                                                            */
/* -------------------------------------------------------------------------- */

function makeFillWithColor(currentFill, value) {
  const color = String(value ?? '');

  if (!currentFill || typeof currentFill === 'string') {
    return color;
  }

  return {
    ...currentFill,
    type: currentFill.type === 'none' ? 'solid' : currentFill.type,
    color,
  };
}

function makeStrokeWithPatch(currentStroke, patch) {
  if (!currentStroke || typeof currentStroke === 'string') {
    return {
      enabled: true,
      color: patch.color ?? currentStroke ?? '#000000',
      width: Number.isFinite(Number(patch.width))
        ? Number(patch.width)
        : 1,
    };
  }

  return {
    ...currentStroke,
    enabled: true,
    ...patch,
  };
}

function setNestedValue(object, path, value) {
  const keys = String(path).split('.').filter(Boolean);

  if (!keys.length) return object;

  const clone = {
    ...object,
  };

  let current = clone;

  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      current[key] = value;
      return;
    }

    current[key] = {
      ...(current[key] ?? {}),
    };

    current = current[key];
  });

  return clone;
}

function toNumberOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeMatchString(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function uniqueTruthy(values) {
  return [...new Set(values.filter(Boolean))];
}