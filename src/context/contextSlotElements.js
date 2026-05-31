// src/context/contextSlotElements.js

export function scanContextSlotElements(root, options = {}) {
  const runtimeSpec = options.runtimeSpec ?? null;

  const statefulTargets = collectStatefulTargets(runtimeSpec);
  const stateInfoByNodeId = findBestStatefulTargetNodes({
    root,
    statefulTargets,
  });

  const result = [];

  walkVisualTree(root, [], (node, path) => {
    const stateInfo = stateInfoByNodeId.get(node.id) ?? null;

    if (!isEditableNode(node, stateInfo)) return;

    const kind = getElementKind(node, stateInfo);
    const properties = getEditablePropertiesForKind(kind, node);

    if (properties.length === 0) return;

    result.push({
      elementId: node.id,
      kind,
      displayName: makeElementDisplayName(node, kind, stateInfo),
      detail: makeElementDetail(node, stateInfo),
      pathLabel: makePathLabel(path),
      properties,
      stateInfo,
    });
  });

  return result;
}

export function getEditablePropertiesForKind(kind, node = null) {
  if (kind === 'text') {
    return [
      { value: 'content.text', label: 'Text content', format: 'text' },
      { value: 'style.fill.color', label: 'Fill colour', format: 'color' },
      { value: 'style.stroke.color', label: 'Stroke colour', format: 'color' },
      { value: 'style.opacity', label: 'Opacity', format: 'number' },
      { value: 'content.x', label: 'X position', format: 'number' },
      { value: 'content.y', label: 'Y position', format: 'number' },
    ];
  }

  if (kind === 'rect') {
    return [
      { value: 'style.fill.color', label: 'Fill colour', format: 'color' },
      { value: 'style.stroke.color', label: 'Stroke colour', format: 'color' },
      { value: 'style.stroke.width', label: 'Stroke width', format: 'number' },
      { value: 'style.opacity', label: 'Opacity', format: 'number' },
      { value: 'content.shape.width', label: 'Width', format: 'number' },
      { value: 'content.shape.height', label: 'Height', format: 'number' },
    ];
  }

  if (kind === 'circle') {
    return [
      { value: 'style.fill.color', label: 'Fill colour', format: 'color' },
      { value: 'style.stroke.color', label: 'Stroke colour', format: 'color' },
      { value: 'style.stroke.width', label: 'Stroke width', format: 'number' },
      { value: 'style.opacity', label: 'Opacity', format: 'number' },
      { value: 'content.shape.r', label: 'Radius', format: 'number' },
    ];
  }

  if (kind === 'line' || kind === 'path' || kind === 'polyline' || kind === 'polygon') {
    return [
      { value: 'style.stroke.color', label: 'Stroke colour', format: 'color' },
      { value: 'style.stroke.width', label: 'Stroke width', format: 'number' },
      { value: 'style.opacity', label: 'Opacity', format: 'number' },
    ];
  }

  if (kind === 'stateful') {
    return [
      { value: 'state.activeState', label: 'Active state', format: 'stateKey' },
      { value: 'style.opacity', label: 'Opacity', format: 'number' },
    ];
  }

  return [
    { value: 'style.opacity', label: 'Opacity', format: 'number' },
  ];
}

export function getPropertyDef(kind, property) {
  return getEditablePropertiesForKind(kind)
    .find((item) => item.value === property) ?? null;
}

export function getDefaultPropertyForKind(kind) {
  const properties = getEditablePropertiesForKind(kind);
  return properties[0]?.value ?? 'style.opacity';
}

export function getDefaultContextPathForProperty(property) {
  if (property === 'content.text') return 'tags.item';
  if (property === 'style.fill.color') return 'sourceItems.fill.color';
  if (property === 'style.stroke.color') return 'sourceItems.stroke.color';
  if (property === 'state.activeState') return 'tags.item';
  return 'dataRef.value';
}

export function inferFormatForProperty(kind, property) {
  const def = getPropertyDef(kind, property);
  return def?.format ?? 'raw';
}

/* -------------------------------------------------------------------------- */
/* Stateful visual detection                                                   */
/* -------------------------------------------------------------------------- */

function collectStatefulTargets(runtimeSpec) {
  const bindings = runtimeSpec?.bindings ?? [];
  const changes = runtimeSpec?.changes ?? [];

  const visualStateChanges = changes.filter(
    (change) => change?.type === 'visualState'
  );

  const visualStateChangeById = new Map(
    visualStateChanges.map((change) => [change.id, change])
  );

  return bindings
    .filter((binding) =>
      binding?.type === 'visualStateBinding' &&
      binding.targetScopeId &&
      binding.changeId &&
      visualStateChangeById.has(binding.changeId)
    )
    .map((binding) => {
      const change = visualStateChangeById.get(binding.changeId);

      return {
        targetScopeId: binding.targetScopeId,
        bindingId: binding.id,
        stateId: binding.stateId,
        changeId: binding.changeId,
        startStateKey: binding.startStateKey,
        stateCount: change?.visualStates?.length ?? 0,
        stateLabels: (change?.visualStates ?? []).map(
          (state) => state.label ?? state.key
        ),
      };
    });
}

function findBestStatefulTargetNodes({
  root,
  statefulTargets,
}) {
  const result = new Map();

  statefulTargets.forEach((target) => {
    let best = null;

    walkVisualTree(root, [], (node, path) => {
      const score = getDirectStatefulTargetScore(
        node,
        target.targetScopeId
      );

      if (score <= 0) return;

      const candidate = {
        node,
        path,
        score,
        depth: path.length,
      };

      if (!best) {
        best = candidate;
        return;
      }

      if (candidate.score > best.score) {
        best = candidate;
        return;
      }

      if (
        candidate.score === best.score &&
        candidate.depth > best.depth
      ) {
        best = candidate;
      }
    });

    if (!best?.node?.id) return;

    result.set(best.node.id, {
      ...target,
      targetNodeId: best.node.id,
      targetPath: best.path,
      targetMatchScore: best.score,
    });
  });

  return result;
}

function getDirectStatefulTargetScore(node, targetScopeId) {
  if (!node || !targetScopeId) return 0;

  const meta = node.meta ?? {};

  if (node.id === targetScopeId) return 100;
  if (meta.originalId === targetScopeId) return 90;
  if (meta.runtimeTargetScopeId === targetScopeId) return 85;
  if (meta.originalStateRootId === targetScopeId) return 80;
  if (meta.sourceRootId === targetScopeId) return 70;
  if (meta.sourceVisualRootId === targetScopeId) return 70;

  // Important:
  // Do NOT use runtimeScopeIds here.
  // runtimeScopeIds are useful for runtime search, but too broad for UI target selection.
  // They can be inherited by parent wrappers, which caused outer component groups
  // to be incorrectly registered as Stateful visual.
  return 0;
}

/* -------------------------------------------------------------------------- */
/* Scanning                                                                    */
/* -------------------------------------------------------------------------- */

function walkVisualTree(node, path, visitor) {
  if (!node) return;

  const nextPath = [
    ...path,
    makePathSegment(node),
  ];

  visitor(node, nextPath);

  (node.children ?? []).forEach((child) => {
    walkVisualTree(child, nextPath, visitor);
  });
}

function isEditableNode(node, stateInfo) {
  if (!node) return false;

  if (stateInfo) return true;
  if (node.nodeType === 'element') return true;

  return false;
}

function getElementKind(node, stateInfo) {
  if (stateInfo) return 'stateful';

  const content = node.content ?? {};

  if (content.contentType === 'text') return 'text';

  if (content.contentType === 'shape') {
    const shape = content.shape ?? {};
    return shape.shapeType ?? shape.kind ?? 'shape';
  }

  return content.contentType ?? node.elementType ?? node.nodeType ?? 'element';
}

function makeElementDisplayName(node, kind, stateInfo) {
  if (kind === 'stateful') {
    const count = stateInfo?.stateCount;
    return `Stateful visual${count != null ? ` · ${count} states` : ''}`;
  }

  if (kind === 'text') {
    const text = String(node.content?.text ?? node.content?.value ?? '').trim();
    return text ? `Text · "${truncate(text, 28)}"` : 'Text';
  }

  if (kind === 'rect') {
    const shape = node.content?.shape ?? {};
    const width = shape.width ?? shape.w;
    const height = shape.height ?? shape.h;
    const fill = getFillColor(node.style?.fill);
    return `Rect${fill ? ` · fill ${fill}` : ''}${width != null && height != null ? ` · ${width}×${height}` : ''}`;
  }

  if (kind === 'circle') {
    const shape = node.content?.shape ?? {};
    const fill = getFillColor(node.style?.fill);
    return `Circle${fill ? ` · fill ${fill}` : ''}${shape.r != null ? ` · r ${shape.r}` : ''}`;
  }

  if (kind === 'path') {
    const pointCount =
      node.dataRef?.points?.length ??
      node.meta?.geometrySummary?.points?.length ??
      null;

    return `Path${pointCount != null ? ` · ${pointCount} points` : ''}`;
  }

  return `${capitalize(kind)}`;
}

function makeElementDetail(node, stateInfo) {
  if (stateInfo?.stateLabels?.length) {
    return `states: ${stateInfo.stateLabels.slice(0, 4).join(', ')}`;
  }

  return (
    node.meta?.userLabel ??
    node.meta?.componentRole ??
    node.meta?.role ??
    node.dataRef?.generatorNodeId ??
    node.meta?.sourceNodeId ??
    node.id
  );
}

function makePathSegment(node) {
  return (
    node.meta?.userLabel ??
    node.meta?.componentRole ??
    node.meta?.role ??
    node.id ??
    node.nodeType ??
    'node'
  );
}

function makePathLabel(path) {
  return path
    .filter(Boolean)
    .slice(-4)
    .join(' / ');
}

function getFillColor(fill) {
  if (!fill) return null;
  if (typeof fill === 'string') return fill;
  return fill.color ?? null;
}

function truncate(value, max) {
  const text = String(value ?? '');
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function capitalize(value) {
  const text = String(value ?? '');
  if (!text) return text;
  return text[0].toUpperCase() + text.slice(1);
}