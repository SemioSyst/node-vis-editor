// src/runtime/interpolation/visualTreeUtils.js

export function cloneVisualNode(node) {
  if (!node || typeof node !== 'object') return node;

  return {
    ...node,
    meta: node.meta ? clonePlainObject(node.meta) : node.meta,
    dataRef: node.dataRef ? clonePlainObject(node.dataRef) : node.dataRef,
    frame: node.frame ? clonePlainObject(node.frame) : node.frame,
    transform: node.transform ? clonePlainObject(node.transform) : node.transform,
    style: clonePlainObject(node.style),
    content: clonePlainObject(node.content),
    children: Array.isArray(node.children)
      ? node.children.map(cloneVisualNode)
      : node.children,
  };
}

export function findVisualNodeById(node, nodeId) {
  if (!node || !nodeId) return null;

  if (node.id === nodeId) return node;

  for (const child of node.children ?? []) {
    const found = findVisualNodeById(child, nodeId);

    if (found) return found;
  }

  return null;
}

export function replaceVisualNodeById(node, nodeId, replacementNode) {
  if (!node || !nodeId) {
    return {
      node,
      replaced: false,
    };
  }

  if (node.id === nodeId) {
    return {
      node: replacementNode,
      replaced: true,
    };
  }

  const children = node.children ?? [];

  if (!children.length) {
    return {
      node,
      replaced: false,
    };
  }

  let replaced = false;

  const nextChildren = children.map((child) => {
    const result = replaceVisualNodeById(child, nodeId, replacementNode);

    if (result.replaced) {
      replaced = true;
    }

    return result.node;
  });

  if (!replaced) {
    return {
      node,
      replaced: false,
    };
  }

  return {
    node: {
      ...node,
      children: nextChildren,
    },
    replaced: true,
  };
}

export function replaceVisualSubtree({
  node,
  targetScopeId,
  replacementRoot,
}) {
  if (!node || !targetScopeId) {
    return {
      node,
      replaced: false,
    };
  }

  // Exact scope/root id match.
  if (node.id === targetScopeId) {
    return {
      node: replacementRoot,
      replaced: true,
    };
  }

  // Wrapped scope match.
  //
  // CoordinateGroup may prefix or wrap visual roots. In that case the original
  // targetScopeId may no longer exist as node.id, but should be preserved in
  // meta.originalId / sourceRootId / sourceVisualRootId / runtimeScopeIds.
  //
  // We preserve the wrapper node's frame/transform/opacity/layer metadata and
  // replace only its visual content.
  if (nodeMatchesRuntimeScope(node, targetScopeId)) {
    return {
      node: {
        ...node,
        children: [replacementRoot],
        meta: {
          ...(node.meta ?? {}),
          runtimeReplacedScopeId: targetScopeId,
        },
      },
      replaced: true,
    };
  }

  const children = node.children ?? [];

  if (!children.length) {
    return {
      node,
      replaced: false,
    };
  }

  let replaced = false;

  const nextChildren = children.map((child) => {
    const result = replaceVisualSubtree({
      node: child,
      targetScopeId,
      replacementRoot,
    });

    if (result.replaced) {
      replaced = true;
    }

    return result.node;
  });

  if (!replaced) {
    return {
      node,
      replaced: false,
    };
  }

  return {
    node: {
      ...node,
      children: nextChildren,
    },
    replaced: true,
  };
}

export function makeScopeStableRoot({
  replacementRoot,
  targetScopeId,
  activeStateKey,
}) {
  const cloned = cloneVisualNode(replacementRoot);

  return {
    ...cloned,

    // Keep the runtime scope stable across state switches.
    id: targetScopeId,

    meta: {
      ...(cloned.meta ?? {}),
      originalStateRootId: cloned.id,
      runtimeTargetScopeId: targetScopeId,
      activeStateKey,

      runtimeScopeIds: uniqueTruthy([
        ...(cloned.meta?.runtimeScopeIds ?? []),
        cloned.id,
        targetScopeId,
      ]),
    },
  };
}

export function setRootOpacity(node, opacity) {
  return {
    ...node,
    opacity: Number(opacity),
    meta: {
      ...(node.meta ?? {}),
      runtimeOpacity: Number(opacity),
    },
  };
}

export function clonePlainObject(value) {
  if (!value || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map(clonePlainObject);
  }

  return {
    ...value,
  };
}

function nodeMatchesRuntimeScope(node, targetScopeId) {
  if (!node || !targetScopeId) return false;

  const meta = node.meta ?? {};

  if (meta.originalId === targetScopeId) return true;
  if (meta.sourceRootId === targetScopeId) return true;
  if (meta.sourceVisualRootId === targetScopeId) return true;
  if (meta.runtimeTargetScopeId === targetScopeId) return true;
  if (meta.originalStateRootId === targetScopeId) return true;

  if (
    Array.isArray(meta.runtimeScopeIds) &&
    meta.runtimeScopeIds.includes(targetScopeId)
  ) {
    return true;
  }

  return false;
}

function uniqueTruthy(values) {
  return [...new Set(values.filter(Boolean))];
}