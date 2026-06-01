// src/runtime/layout/applyRuntimeLayoutRules.js

import {
  cloneVisualNode,
} from '../interpolation/visualTreeUtils.js';

import { makeRuntimeRefFromNode } from '../references/runtimeRefs.js';

import {
  applyContextSlotsToVisual,
  makeContextFromRuntimeRef,
} from '../context/applyContextSlots.js';

import {
  findNodeByRuntimeScope,
  findNodesMatchingSelector,
  getVisualNodeBounds,
} from './visualBounds.js';

const DEBUG_POSITION_RULE = false;

export function applyRuntimeLayoutRulesToOutput(output, runtime) {
  if (!output || output.outputType !== 'visual') return output;
  if (!runtime) return output;

  const spec = runtime.getSpec?.();
  const state = runtime.getState?.();

  const layoutRules = spec?.layoutRules ?? [];
  const contextSlotSets = spec?.contextSlots ?? [];

  if (!layoutRules.length) return output;

  let root = output.root;
  let changed = false;

  const appliedRules = [];

  layoutRules.forEach((rule) => {
    const result = applyLayoutRule({
        root,
        rule,
        runtimeState: state,
        contextSlotSets,
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
    contextSlotSets,
}) {
  const sourceNode = findBestPositionRuleSourceNode(
    root,
    rule.sourceScopeId
    );

    const sourceTemplateNode =
    rule.sourceTemplateRoot ??
    sourceNode;

    if (!sourceNode || !sourceTemplateNode) {
    return {
        root,
        applied: false,
        summary: {
        id: rule.id,
        failed: true,
        reason: 'source-node-or-template-not-found',
        sourceScopeId: rule.sourceScopeId,
        hasSourceNode: Boolean(sourceNode),
        hasSourceTemplate: Boolean(sourceTemplateNode),
        },
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

    const matchingContextSlotSets = findContextSlotSetsForSource({
        sourceNode: sourceTemplateNode,
        rule,
        contextSlotSets,
    });

    const children =
    rule.mode === 'move'
        ? [
            makePositionedClone({
            sourceNode: sourceTemplateNode,
            anchor: anchors[0],
            rule,
            index: 0,
            contextSlotSets: matchingContextSlotSets,
            }),
        ]
        : anchors.map((anchor, index) =>
            makePositionedClone({
            sourceNode: sourceTemplateNode,
            anchor,
            rule,
            index,
            contextSlotSets: matchingContextSlotSets,
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

        sourceScopeId: rule.sourceScopeId,
        placeholderNodeId: sourceNode.id,
        placeholderNodeType: sourceNode.nodeType,
        templateNodeId: sourceTemplateNode.id,
        templateNodeType: sourceTemplateNode.nodeType,
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
            ref: makeRuntimeRefFromNode(node),
        };
    })
    .filter(Boolean);
}

function makePositionedClone({
  sourceNode,
  anchor,
  rule,
  index,
  contextSlotSets,
}) {
  const context = makeContextFromAnchor(anchor);

  const slottedSource = applyContextSlotsToVisual(
    sourceNode,
    {
      context,
      contextSlotSets,
    }
  );

    debugPositionRule('clone source check', {
    ruleId: rule.id,

    templateNodeId: sourceNode.id,
    templateNodeType: sourceNode.nodeType,
    templateChildren: summarizeChildren(sourceNode),

    context: {
        tags: context?.tags,
        value: context?.value,
        rawValue: context?.rawValue,
        dataRef: context?.dataRef,
    },

    contextSlotSets: contextSlotSets?.map((slotSet) => ({
        id: slotSet.id,
        componentScopeId: slotSet.componentScopeId,
        bindingCount: slotSet.bindings?.length ?? 0,
        bindings: slotSet.bindings?.map((binding) => ({
        elementId: binding.elementId,
        property: binding.property,
        source: binding.source,
        stateInfo: binding.stateInfo,
        })),
    })),

    slottedSourceId: slottedSource.id,
    slottedSourceType: slottedSource.nodeType,
    slottedChildren: summarizeChildren(slottedSource),
    });

  const sourceBounds = getVisualNodeBounds(slottedSource) ?? {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    centerX: 0,
    centerY: 0,
    width: 0,
    height: 0,
  };

  const clone = prefixCloneIds(
    cloneVisualNode(slottedSource),
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

    interaction: {
        ...(clone.interaction ?? {}),
        pointerEvents: rule.pointerEvents ?? 'none',
    },

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
      contextSlotsApplied: contextSlotSets?.length > 0,
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

function makeContextFromAnchor(anchor) {
  const ref =
    anchor?.ref ??
    (anchor?.node ? makeRuntimeRefFromNode(anchor.node) : null);

  if (!ref) {
    return {
      anchor,
      tags: {},
      dataRef: {},
      sourceItems: {},
      meta: {},
    };
  }

  return makeContextFromRuntimeRef(ref, {
    anchor,
  });
}

function findContextSlotSetsForSource({
  sourceNode,
  rule,
  contextSlotSets,
}) {
  if (!contextSlotSets?.length) return [];

  const sourceScopes = collectNodeRuntimeScopes(sourceNode);

  if (rule?.sourceScopeId) {
    sourceScopes.add(rule.sourceScopeId);
  }

  return contextSlotSets.filter((slotSet) => {
    const componentScopeId = slotSet.componentScopeId;

    if (!componentScopeId) return false;

    if (sourceScopes.has(componentScopeId)) return true;

    // Also allow matching if the slot component scope appears inside the
    // selected source subtree. This helps when Position Rule selected a wrapper
    // around the component root.
    return subtreeContainsDirectScope(sourceNode, componentScopeId);
  });
}

function subtreeContainsDirectScope(node, scopeId) {
  if (!node || !scopeId) return false;

  const meta = node.meta ?? {};

  if (node.id === scopeId) return true;
  if (meta.originalId === scopeId) return true;
  if (meta.sourceRootId === scopeId) return true;
  if (meta.sourceVisualRootId === scopeId) return true;
  if (meta.runtimeTargetScopeId === scopeId) return true;
  if (meta.originalStateRootId === scopeId) return true;

  return (node.children ?? []).some((child) =>
    subtreeContainsDirectScope(child, scopeId)
  );
}

function collectNodeRuntimeScopes(node) {
  const meta = node?.meta ?? {};

  return new Set([
    node?.id,
    meta.originalId,
    meta.sourceRootId,
    meta.sourceVisualRootId,
    meta.runtimeTargetScopeId,
    meta.originalStateRootId,
    ...(meta.runtimeScopeIds ?? []),
  ].filter(Boolean));
}

function findBestPositionRuleSourceNode(root, sourceScopeId) {
  if (!root || !sourceScopeId) return null;

  const candidates = [];

  walkTreeForPositionRuleSource(root, 0, (node, depth) => {
    const score = getPositionRuleSourceScore(node, sourceScopeId);

    if (score <= 0) return;

    candidates.push({
      node,
      score,
      depth,
    });
  });

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;

    // If scores tie, prefer the deeper node.
    // This avoids selecting outer CoordinateGroup wrappers when the actual
    // component root also exists deeper in the tree.
    return b.depth - a.depth;
  });

  return candidates[0].node;
}

function walkTreeForPositionRuleSource(node, depth, visitor) {
  if (!node) return;

  visitor(node, depth);

  (node.children ?? []).forEach((child) => {
    walkTreeForPositionRuleSource(child, depth + 1, visitor);
  });
}

function getPositionRuleSourceScore(node, sourceScopeId) {
  if (!node || !sourceScopeId) return 0;

  const meta = node.meta ?? {};

  // Best: exact current id.
  if (node.id === sourceScopeId) return 1000;

  // Very good: CoordinateGroup-prefixed node preserving original id.
  if (meta.originalId === sourceScopeId) return 900;

  // Good: explicit runtime target.
  if (meta.runtimeTargetScopeId === sourceScopeId) return 850;
  if (meta.originalStateRootId === sourceScopeId) return 800;

  // Good but usually wrapper-level.
  if (meta.sourceRootId === sourceScopeId) return 700;
  if (meta.sourceVisualRootId === sourceScopeId) return 700;

  // Weak fallback only.
  // runtimeScopeIds can be inherited by ancestor wrappers or descendants,
  // so it must never beat direct/original/source id matches.
  if (
    Array.isArray(meta.runtimeScopeIds) &&
    meta.runtimeScopeIds.includes(sourceScopeId)
  ) {
    return 100;
  }

  return 0;
}

function summarizeChildren(node) {
  return (node?.children ?? []).map((child) => ({
    id: child.id,
    originalId: child.meta?.originalId,
    nodeType: child.nodeType,
    contentType: child.content?.contentType,
    shapeType: child.content?.shape?.shapeType,
    text: child.content?.text,

    childCount: child.children?.length ?? 0,

    contextLocalStateApplied: child.meta?.contextLocalStateApplied,
    contextSlotBindingApplied: child.meta?.contextSlotBindingApplied,
    contextStateResolutionFailed: child.meta?.contextStateResolutionFailed,

    activeStateKey: child.meta?.activeStateKey,
    requestedActiveState: child.meta?.contextRequestedActiveState,
  }));
}

function debugPositionRule(message, payload) {
  if (!DEBUG_POSITION_RULE) return;

  console.log(`[PositionRule] ${message}`, payload);
}