// src/runtime/layout/visualBounds.js

import { makeRuntimeRefFromNode } from '../references/runtimeRefs.js';

export function getVisualNodeBounds(node, parentOffset = { x: 0, y: 0 }) {
  if (!node) return null;

  const offset = addOffsets(
    parentOffset,
    getNodeOffset(node)
  );

  if (node.nodeType === 'element') {
    return getElementBounds(node, offset);
  }

  const childBounds = (node.children ?? [])
    .map((child) => getVisualNodeBounds(child, offset))
    .filter(Boolean);

  return unionBounds(childBounds);
}

export function findNodesMatchingSelector(root, selector, options = {}) {
  const scopeId = options.scopeId ?? null;

  const scopeRoot = scopeId
    ? findNodeByRuntimeScope(root, scopeId)
    : root;

  if (!scopeRoot) return [];

  const result = [];

  walkVisualTree(scopeRoot, (node) => {
    if (node.nodeType !== 'element') return;

    const ref = makeRuntimeRefFromNode(node);

    if (matchesSelector(ref, selector)) {
      result.push(node);
    }
  });

  return result;
}

export function findNodeByRuntimeScope(node, scopeId) {
  if (!node || !scopeId) return null;

  if (node.id === scopeId) return node;

  if (nodeMatchesRuntimeScope(node, scopeId)) return node;

  for (const child of node.children ?? []) {
    const found = findNodeByRuntimeScope(child, scopeId);

    if (found) return found;
  }

  return null;
}

export function walkVisualTree(node, visitor) {
  if (!node) return;

  visitor(node);

  (node.children ?? []).forEach((child) => {
    walkVisualTree(child, visitor);
  });
}

function getElementBounds(node, offset) {
  const content = node.content ?? {};
  const shape = content.shape ?? {};

  if (content.contentType === 'shape') {
    const shapeType = shape.shapeType ?? shape.kind;

    if (shapeType === 'rect') {
      const x = Number(shape.x ?? shape.cx ?? 0);
      const y = Number(shape.y ?? shape.cy ?? 0);
      const width = Number(shape.width ?? shape.w ?? node.frame?.width ?? 0);
      const height = Number(shape.height ?? shape.h ?? node.frame?.height ?? 0);

      return normalizeBounds({
        x: offset.x + x,
        y: offset.y + y,
        width,
        height,
      });
    }

    if (shapeType === 'circle') {
      const cx = Number(shape.cx ?? shape.x ?? 0);
      const cy = Number(shape.cy ?? shape.y ?? 0);
      const r = Number(shape.r ?? 0);

      return normalizeBounds({
        x: offset.x + cx - r,
        y: offset.y + cy - r,
        width: r * 2,
        height: r * 2,
      });
    }

    if (shapeType === 'line') {
      const x1 = Number(shape.x1 ?? 0);
      const y1 = Number(shape.y1 ?? 0);
      const x2 = Number(shape.x2 ?? 0);
      const y2 = Number(shape.y2 ?? 0);

      return boundsFromPoints([
        { x: offset.x + x1, y: offset.y + y1 },
        { x: offset.x + x2, y: offset.y + y2 },
      ]);
    }

    if (shapeType === 'path') {
      const points =
        node.dataRef?.points ??
        node.meta?.points ??
        node.meta?.geometrySummary?.points ??
        [];

      const normalizedPoints = Array.isArray(points)
        ? points
            .map((point) => ({
              x: Number(point.x),
              y: Number(point.y),
            }))
            .filter((point) =>
              Number.isFinite(point.x) &&
              Number.isFinite(point.y)
            )
        : [];

      if (normalizedPoints.length > 0) {
        return boundsFromPoints(
          normalizedPoints.map((point) => ({
            x: offset.x + point.x,
            y: offset.y + point.y,
          }))
        );
      }

      return getFrameBounds(node, offset);
    }

    if (shapeType === 'polygon' || shapeType === 'polyline') {
      const points = parsePointsString(shape.points);

      if (points.length > 0) {
        return boundsFromPoints(
          points.map((point) => ({
            x: offset.x + point.x,
            y: offset.y + point.y,
          }))
        );
      }
    }
  }

  if (content.contentType === 'text') {
    return getTextBounds(node, offset);
  }

  return getFrameBounds(node, offset);
}

function getFrameBounds(node, offset) {
  const frame = node.frame ?? {};

  const width = Number(frame.width ?? frame.w ?? 0);
  const height = Number(frame.height ?? frame.h ?? 0);

  return normalizeBounds({
    x: offset.x + Number(frame.x ?? 0),
    y: offset.y + Number(frame.y ?? 0),
    width,
    height,
  });
}

function getNodeOffset(node) {
  const frame = node.frame ?? {};
  const transform = node.transform ?? {};

  return {
    x: Number(frame.x ?? 0) +
      Number(transform.x ?? transform.translateX ?? 0),

    y: Number(frame.y ?? 0) +
      Number(transform.y ?? transform.translateY ?? 0),
  };
}

function addOffsets(a, b) {
  return {
    x: Number(a?.x ?? 0) + Number(b?.x ?? 0),
    y: Number(a?.y ?? 0) + Number(b?.y ?? 0),
  };
}

function normalizeBounds(bounds) {
  const x = Number(bounds.x ?? 0);
  const y = Number(bounds.y ?? 0);
  const width = Number(bounds.width ?? 0);
  const height = Number(bounds.height ?? 0);

  const minX = Math.min(x, x + width);
  const maxX = Math.max(x, x + width);
  const minY = Math.min(y, y + height);
  const maxY = Math.max(y, y + height);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,

    left: minX,
    right: maxX,
    top: minY,
    bottom: maxY,

    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

function boundsFromPoints(points) {
  if (!points.length) return null;

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,

    left,
    right,
    top,
    bottom,

    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

function unionBounds(boundsList) {
  const valid = boundsList.filter(Boolean);

  if (!valid.length) return null;

  const left = Math.min(...valid.map((bounds) => bounds.left));
  const right = Math.max(...valid.map((bounds) => bounds.right));
  const top = Math.min(...valid.map((bounds) => bounds.top));
  const bottom = Math.max(...valid.map((bounds) => bounds.bottom));

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,

    left,
    right,
    top,
    bottom,

    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2,
  };
}

function parsePointsString(points) {
  if (!points) return [];

  return String(points)
    .trim()
    .split(/\s+/)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    })
    .filter((point) =>
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    );
}

function matchesSelector(ref, selector) {
  if (!selector || selector.type === 'all') return true;

  if (selector.type === 'none') return false;

  if (selector.type === 'tagEquals') {
    return ref.tags?.[selector.tagKey] === selector.value;
  }

  if (selector.type === 'rowEquals') {
    return ref.rowIndex != null && ref.rowIndex === selector.rowIndex;
  }

  if (selector.type === 'columnEquals') {
    return ref.colIndex != null && ref.colIndex === selector.colIndex;
  }

  if (selector.type === 'indexRange') {
    const index = ref.flatIndex ?? ref.index;

    return (
      index != null &&
      index >= selector.start &&
      index <= selector.end
    );
  }

  return false;
}

function nodeMatchesRuntimeScope(node, scopeId) {
  const meta = node.meta ?? {};

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

function getTextBounds(node, offset) {
  const content = node.content ?? {};
  const style = node.style ?? {};
  const frame = node.frame ?? {};

  const text = getTextValue(content);
  const fontSize = Number(
    content.fontSize ??
    content.size ??
    style.fontSize ??
    style.size ??
    12
  );

  const x = Number(
    content.x ??
    frame.x ??
    0
  );

  const y = Number(
    content.y ??
    frame.y ??
    0
  );

  const width = estimateTextWidth(text, fontSize);
  const height = fontSize * 1.2;

  const alignX = normalizeTextAlignX(
    content.alignX ??
    content.anchorX ??
    content.textAnchor ??
    style.alignX ??
    style.anchorX ??
    style.textAnchor ??
    'left'
  );

  const alignY = normalizeTextAlignY(
    content.alignY ??
    content.anchorY ??
    content.dominantBaseline ??
    style.alignY ??
    style.anchorY ??
    style.dominantBaseline ??
    'baseline'
  );

  let left = offset.x + x;
  let top = offset.y + y - height;

  if (alignX === 'center') {
    left = offset.x + x - width / 2;
  } else if (alignX === 'right') {
    left = offset.x + x - width;
  }

  if (alignY === 'center') {
    top = offset.y + y - height / 2;
  } else if (alignY === 'top') {
    top = offset.y + y;
  } else if (alignY === 'bottom') {
    top = offset.y + y - height;
  } else {
    // baseline
    top = offset.y + y - fontSize;
  }

  return normalizeBounds({
    x: left,
    y: top,
    width,
    height,
  });
}

function getTextValue(content) {
  return String(
    content.text ??
    content.value ??
    content.label ??
    ''
  );
}

function estimateTextWidth(text, fontSize) {
  const value = String(text ?? '');

  // Rough but stable enough for layout rules.
  // Better than using the raw x position as left bound.
  return Math.max(8, value.length * fontSize * 0.62);
}

function normalizeTextAlignX(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (
    normalized === 'center' ||
    normalized === 'middle'
  ) {
    return 'center';
  }

  if (
    normalized === 'right' ||
    normalized === 'end'
  ) {
    return 'right';
  }

  return 'left';
}

function normalizeTextAlignY(value) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase();

  if (
    normalized === 'center' ||
    normalized === 'middle'
  ) {
    return 'center';
  }

  if (
    normalized === 'top' ||
    normalized === 'start' ||
    normalized === 'hanging'
  ) {
    return 'top';
  }

  if (
    normalized === 'bottom' ||
    normalized === 'end'
  ) {
    return 'bottom';
  }

  return 'baseline';
}