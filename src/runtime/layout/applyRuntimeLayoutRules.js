// src/runtime/layout/applyRuntimeLayoutRules.js

import {
  cloneVisualNode,
} from '../interpolation/visualTreeUtils.js';

import {
  findNodesMatchingSelector,
  getVisualNodeBounds,
  findNodeByRuntimeScope,
} from './visualBounds.js';

export function applyRuntimeLayoutRulesToOutput(output, runtime) {
  if (!output || output.outputType !== 'visual') return output;
  if (!runtime) return output;

  const spec = runtime.getSpec?.();
  const state = runtime.getState?.();

  const layoutRules = spec?.layoutRules ?? [];

  if (!layoutRules.length) return output;

  let root = output.root;
  let changed = false;

  const appliedRules = [];

  layoutRules.forEach((rule) => {
    const result = applyLayoutRule({
      root,
      rule,
      runtimeState: state,
    });

    if (result.applied) {
      root = result.root;
      changed = true;
      appliedRules.push(result.summary);
    }
  });

  if (!changed) return output;

  return {
    ...output,
    root,
    meta: {
      ...(output.meta ?? {}),
      runtimeLayoutRules: appliedRules,
    },
  };
}

function applyLayoutRule({
  root,
  rule,
  runtimeState,
}) {
  const sourceNode = findNodeByRuntimeScope(
    root,
    rule.sourceScopeId
  );

  if (!sourceNode) {
    return {
      root,
      applied: false,
      summary: null,
    };
  }

  const anchors = resolveAnchors({
    root,
    rule,
    runtimeState,
  });

  if (!anchors.length) {
    if (rule.anchor?.type === 'pointer' || rule.anchor?.type === 'eventElement') {
      const hiddenRoot = replaceSourceWithCollection({
        root,
        sourceNode,
        replacementChildren: [],
        rule,
      });

      return {
        root: hiddenRoot,
        applied: true,
        summary: {
          id: rule.id,
          mode: rule.mode,
          anchorCount: 0,
          hidden: true,
        },
      };
    }

    return {
      root,
      applied: false,
      summary: null,
    };
  }

  const sourceBounds = getVisualNodeBounds(sourceNode) ?? {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    centerX: 0,
    centerY: 0,
    width: 0,
    height: 0,
  };

  const children =
    rule.mode === 'move'
      ? [
          makePositionedClone({
            sourceNode,
            sourceBounds,
            anchor: anchors[0],
            rule,
            index: 0,
          }),
        ]
      : anchors.map((anchor, index) =>
          makePositionedClone({
            sourceNode,
            sourceBounds,
            anchor,
            rule,
            index,
          })
        );

  const nextRoot = replaceSourceWithCollection({
    root,
    sourceNode,
    replacementChildren: children,
    rule,
  });

  return {
    root: nextRoot,
    applied: true,
    summary: {
      id: rule.id,
      mode: rule.mode,
      anchorType: rule.anchor?.type,
      anchorCount: anchors.length,
      generatedCount: children.length,
    },
  };
}

function resolveAnchors({
  root,
  rule,
  runtimeState,
}) {
  const anchor = rule.anchor ?? {};

  if (anchor.type === 'pointer') {
    const stateValue = runtimeState?.states?.[anchor.stateId];

    if (!stateValue?.pointer) return [];

    const x = Number(stateValue.pointer.svgX ?? stateValue.pointer.clientX);
    const y = Number(stateValue.pointer.svgY ?? stateValue.pointer.clientY);

    if (!Number.isFinite(x) || !Number.isFinite(y)) return [];

    return [
      {
        type: 'pointer',
        bounds: {
          left: x,
          right: x,
          top: y,
          bottom: y,
          centerX: x,
          centerY: y,
          width: 0,
          height: 0,
        },
        ref: stateValue,
      },
    ];
  }

  if (anchor.type === 'eventElement') {
    const stateValue = runtimeState?.states?.[anchor.stateId];

    if (!stateValue?.elementId) return [];

    const node = findNodeByRuntimeIdOrScope(root, stateValue.elementId);

    if (!node) return [];

    const bounds = getVisualNodeBounds(node);

    if (!bounds) return [];

    return [
      {
        type: 'eventElement',
        node,
        bounds,
        ref: stateValue,
      },
    ];
  }

  if (anchor.type === 'canvas') {
    const x = Number(anchor.x ?? 0);
    const y = Number(anchor.y ?? 0);

    return [
      {
        type: 'canvas',
        bounds: {
          left: x,
          right: x,
          top: y,
          bottom: y,
          centerX: x,
          centerY: y,
          width: 0,
          height: 0,
        },
      },
    ];
  }

  // Default: selection anchor.
  const anchorNodes = findNodesMatchingSelector(
    root,
    anchor.selector ?? { type: 'all' },
    {
      scopeId: anchor.sourceScopeId,
    }
  );

  return anchorNodes
    .map((node) => {
      const bounds = getVisualNodeBounds(node);

      if (!bounds) return null;

      return {
        type: 'selection',
        node,
        bounds,
      };
    })
    .filter(Boolean);
}

function makePositionedClone({
  sourceNode,
  sourceBounds,
  anchor,
  rule,
  index,
}) {
  const clone = prefixCloneIds(
    cloneVisualNode(sourceNode),
    `${rule.id}-copy-${index}`
  );

  const point = computePlacementPoint({
    anchorBounds: anchor.bounds,
    sourceBounds,
    placement: rule.placement ?? 'top',
    offset: rule.offset ?? { x: 0, y: 0 },
  });

  const translateX = point.x - sourceBounds.left;
  const translateY = point.y - sourceBounds.top;

  return {
    ...clone,

    transform: {
      ...(clone.transform ?? {}),
      x: Number(clone.transform?.x ?? 0) + translateX,
      y: Number(clone.transform?.y ?? 0) + translateY,
    },

    meta: {
      ...(clone.meta ?? {}),
      positionedByRule: rule.id,
      anchorType: anchor.type,
      anchorIndex: index,
    },
  };
}

function computePlacementPoint({
  anchorBounds,
  sourceBounds,
  placement,
  offset,
}) {
  const offsetX = Number(offset?.x ?? 0);
  const offsetY = Number(offset?.y ?? 0);

  const sourceWidth = sourceBounds.width ?? 0;
  const sourceHeight = sourceBounds.height ?? 0;

  if (placement === 'bottom') {
    return {
      x: anchorBounds.centerX - sourceWidth / 2 + offsetX,
      y: anchorBounds.bottom + Math.abs(offsetY),
    };
  }

  if (placement === 'left') {
    return {
      x: anchorBounds.left - sourceWidth - Math.abs(offsetX),
      y: anchorBounds.centerY - sourceHeight / 2 + offsetY,
    };
  }

  if (placement === 'right') {
    return {
      x: anchorBounds.right + Math.abs(offsetX),
      y: anchorBounds.centerY - sourceHeight / 2 + offsetY,
    };
  }

  if (placement === 'center') {
    return {
      x: anchorBounds.centerX - sourceWidth / 2 + offsetX,
      y: anchorBounds.centerY - sourceHeight / 2 + offsetY,
    };
  }

  if (placement === 'topRight') {
    return {
      x: anchorBounds.right + Math.abs(offsetX),
      y: anchorBounds.top - sourceHeight - Math.abs(offsetY),
    };
  }

  if (placement === 'bottomRight') {
    return {
      x: anchorBounds.right + Math.abs(offsetX),
      y: anchorBounds.bottom + Math.abs(offsetY),
    };
  }

  // top
  return {
    x: anchorBounds.centerX - sourceWidth / 2 + offsetX,
    y: anchorBounds.top - sourceHeight - Math.abs(offsetY),
  };
}

function replaceSourceWithCollection({
  root,
  sourceNode,
  replacementChildren,
  rule,
}) {
  const replacement = {
    nodeType: 'collection',
    id: sourceNode.id,

    frame: sourceNode.frame ?? null,
    transform: sourceNode.transform ?? null,

    children: replacementChildren,

    meta: {
      ...(sourceNode.meta ?? {}),
      layoutRuleApplied: rule.id,
      originalSourceRootId: sourceNode.id,
    },
  };

  return replaceNodeById(root, sourceNode.id, replacement).node;
}

function replaceNodeById(node, nodeId, replacement) {
  if (!node || !nodeId) {
    return {
      node,
      replaced: false,
    };
  }

  if (node.id === nodeId) {
    return {
      node: replacement,
      replaced: true,
    };
  }

  let replaced = false;

  const nextChildren = (node.children ?? []).map((child) => {
    const result = replaceNodeById(child, nodeId, replacement);

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

function findNodeByRuntimeIdOrScope(root, id) {
  if (!root || !id) return null;

  if (root.id === id) return root;

  if (root.meta?.originalId === id) return root;

  if (
    Array.isArray(root.meta?.runtimeScopeIds) &&
    root.meta.runtimeScopeIds.includes(id)
  ) {
    return root;
  }

  for (const child of root.children ?? []) {
    const found = findNodeByRuntimeIdOrScope(child, id);

    if (found) return found;
  }

  return null;
}

function prefixCloneIds(node, prefix) {
  if (!node || typeof node !== 'object') return node;

  const originalId = node.id ?? null;

  return {
    ...node,
    id: originalId ? `${prefix}-${originalId}` : prefix,

    meta: {
      ...(node.meta ?? {}),
      originalId,
      clonedByPositionRule: prefix,
    },

    children: Array.isArray(node.children)
      ? node.children.map((child, index) =>
          prefixCloneIds(child, `${prefix}-${index}`)
        )
      : node.children,
  };
}