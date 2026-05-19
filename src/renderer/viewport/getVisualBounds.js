// src/renderer/viewport/getVisualBounds.js

export function getVisualBounds(output) {
  if (!output) return null;

  if (output.outputType === 'visual') {
    return getNodeBounds(output.root);
  }

  if (output.kind) {
    return getLegacyBounds(output);
  }

  return null;
}

export function getExplicitRootSize(output) {
  if (!output || output.outputType !== 'visual') return null;

  const root = output.root;
  if (!root) return null;

  if (
    root.nodeType === 'container' &&
    root.frame?.width != null &&
    root.frame?.height != null
  ) {
    return {
      x: Number(root.frame.x ?? 0),
      y: Number(root.frame.y ?? 0),
      width: Number(root.frame.width),
      height: Number(root.frame.height),
    };
  }

  if (root.size?.width != null && root.size?.height != null) {
    return {
      x: 0,
      y: 0,
      width: Number(root.size.width),
      height: Number(root.size.height),
    };
  }

  return null;
}

function getNodeBounds(node) {
  if (!node) return null;

  if (Array.isArray(node)) {
    return unionBounds(node.map(getNodeBounds));
  }

  if (node.kind) {
    return getLegacyBounds(node);
  }

  let localBounds = null;

  if (node.nodeType === 'element') {
    localBounds = getElementContentBounds(node);
  }

  const childBounds = unionBounds((node.children ?? []).map(getNodeBounds));
  localBounds = unionBounds([localBounds, childBounds]);

  if (!localBounds) {
    localBounds = getFrameFallbackBounds(node);
  }

  return applyNodeTransform(localBounds, node);
}

function getElementContentBounds(node) {
  const content = node.content ?? {};

  if (content.contentType === 'legacySvg') {
    return getLegacyBounds(content.spec);
  }

  if (content.contentType === 'shape') {
    const shape = content.shape ?? {};
    const shapeType = shape.shapeType ?? shape.kind;

    if (shapeType === 'rect') {
      const x = Number(shape.x ?? 0);
      const y = Number(shape.y ?? 0);
      const w = Number(shape.width ?? shape.w ?? node.frame?.width ?? 0);
      const h = Number(shape.height ?? shape.h ?? node.frame?.height ?? 0);

      return makeBounds(x, y, x + w, y + h);
    }

    if (shapeType === 'circle') {
      const cx = Number(shape.cx ?? 0);
      const cy = Number(shape.cy ?? 0);
      const r = Number(shape.r ?? node.frame?.width / 2 ?? 0);

      return makeBounds(cx - r, cy - r, cx + r, cy + r);
    }

    if (shapeType === 'line') {
      const x1 = Number(shape.x1 ?? 0);
      const y1 = Number(shape.y1 ?? 0);
      const x2 = Number(shape.x2 ?? 0);
      const y2 = Number(shape.y2 ?? 0);

      return makeBounds(
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.max(x1, x2),
        Math.max(y1, y2)
      );
    }

    if (shapeType === 'path') {
      return getFrameFallbackBounds(node);
    }
  }

  if (content.contentType === 'text') {
    const x = Number(content.x ?? 0);
    const y = Number(content.y ?? 0);
    const fontSize = Number(content.fontSize ?? node.style?.text?.fontSize ?? 14);
    const text = String(content.text ?? '');
    const approxWidth = text.length * fontSize * 0.6;

    return makeBounds(x, y - fontSize, x + approxWidth, y + fontSize * 0.25);
  }

  if (content.contentType === 'image') {
    const x = Number(content.x ?? 0);
    const y = Number(content.y ?? 0);
    const w = Number(content.width ?? node.frame?.width ?? 100);
    const h = Number(content.height ?? node.frame?.height ?? 100);

    return makeBounds(x, y, x + w, y + h);
  }

  return getFrameFallbackBounds(node);
}

function getLegacyBounds(spec) {
  if (!spec) return null;

  if (Array.isArray(spec)) {
    return unionBounds(spec.map(getLegacyBounds));
  }

  switch (spec.kind) {
    case 'circle': {
      const cx = Number(spec.cx ?? 0);
      const cy = Number(spec.cy ?? 0);
      const r = Number(spec.r ?? 0);
      return makeBounds(cx - r, cy - r, cx + r, cy + r);
    }

    case 'rect': {
      const x = Number(spec.x ?? 0);
      const y = Number(spec.y ?? 0);
      const w = Number(spec.w ?? spec.width ?? 0);
      const h = Number(spec.h ?? spec.height ?? 0);
      return makeBounds(x, y, x + w, y + h);
    }

    case 'line': {
      const x1 = Number(spec.x1 ?? 0);
      const y1 = Number(spec.y1 ?? 0);
      const x2 = Number(spec.x2 ?? 0);
      const y2 = Number(spec.y2 ?? 0);

      return makeBounds(
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.max(x1, x2),
        Math.max(y1, y2)
      );
    }

    case 'polyline':
    case 'polygon': {
      return boundsFromPoints(spec.points);
    }

    case 'text': {
      const x = Number(spec.x ?? 0);
      const y = Number(spec.y ?? 0);
      const fontSize = Number(spec.fontSize ?? 12);
      const text = String(spec.text ?? '');
      return makeBounds(x, y - fontSize, x + text.length * fontSize * 0.6, y);
    }

    case 'group': {
      return unionBounds((spec.children ?? []).map(getLegacyBounds));
    }

    default:
      return null;
  }
}

function getFrameFallbackBounds(node) {
  const frame = node.frame;
  if (!frame) return null;

  const x = Number(frame.x ?? 0);
  const y = Number(frame.y ?? 0);
  const width = Number(frame.width ?? 0);
  const height = Number(frame.height ?? 0);

  return makeBounds(x, y, x + width, y + height);
}

function applyNodeTransform(bounds, node) {
  if (!bounds) return null;

  const frame = node.frame ?? {};
  const transform = node.transform ?? {};

  const translateX = Number(frame.x ?? 0) + Number(transform.x ?? 0);
  const translateY = Number(frame.y ?? 0) + Number(transform.y ?? 0);
  const scaleX = Number(transform.scaleX ?? 1);
  const scaleY = Number(transform.scaleY ?? 1);
  const rotate = Number(transform.rotate ?? 0);

  const corners = [
    [bounds.minX, bounds.minY],
    [bounds.maxX, bounds.minY],
    [bounds.maxX, bounds.maxY],
    [bounds.minX, bounds.maxY],
  ].map(([x, y]) => {
    let nx = x * scaleX;
    let ny = y * scaleY;

    if (rotate !== 0) {
      const rad = (rotate * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rx = nx * cos - ny * sin;
      const ry = nx * sin + ny * cos;
      nx = rx;
      ny = ry;
    }

    return [nx + translateX, ny + translateY];
  });

  return boundsFromCoordinatePairs(corners);
}

function boundsFromPoints(pointsString) {
  if (!pointsString) return null;

  const pairs = String(pointsString)
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));

  return boundsFromCoordinatePairs(pairs);
}

function boundsFromCoordinatePairs(pairs) {
  if (!pairs.length) return null;

  const xs = pairs.map(([x]) => x);
  const ys = pairs.map(([, y]) => y);

  return makeBounds(
    Math.min(...xs),
    Math.min(...ys),
    Math.max(...xs),
    Math.max(...ys)
  );
}

function unionBounds(boundsList) {
  const valid = boundsList.filter(Boolean);
  if (!valid.length) return null;

  return makeBounds(
    Math.min(...valid.map((b) => b.minX)),
    Math.min(...valid.map((b) => b.minY)),
    Math.max(...valid.map((b) => b.maxX)),
    Math.max(...valid.map((b) => b.maxY))
  );
}

function makeBounds(minX, minY, maxX, maxY) {
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}