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

  if (node.nodeType === 'procedural') {
    localBounds = getProceduralBounds(node);
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
    const shapeBounds = getShapeBounds(node);

    return expandBounds(shapeBounds, getPaintPadding(node));
  }

  if (content.contentType === 'text') {
    const textBounds = getTextBounds(node);

    return expandBounds(textBounds, getPaintPadding(node));
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

function getShapeBounds(node) {
  const content = node.content ?? {};
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
    return (
      getPathBoundsFromGeometrySummary(node) ??
      boundsFromPathData(shape.d) ??
      getFrameFallbackBounds(node)
    );
  }

  if (shapeType === 'polygon' || shapeType === 'polyline') {
    return boundsFromPoints(shape.points) ?? getFrameFallbackBounds(node);
  }

  return getFrameFallbackBounds(node);
}

function getPathBoundsFromGeometrySummary(node) {
  const bounds =
    node.meta?.geometrySummary?.bounds ??
    node.dataRef?.geometrySummary?.bounds ??
    null;

  if (!bounds) return null;

  const minX = Number(bounds.minX);
  const minY = Number(bounds.minY);
  const maxX = Number(bounds.maxX);
  const maxY = Number(bounds.maxY);

  if ([minX, minY, maxX, maxY].every(Number.isFinite)) {
    return makeBounds(minX, minY, maxX, maxY);
  }

  const x = Number(bounds.x ?? 0);
  const y = Number(bounds.y ?? 0);
  const width = Number(bounds.width);
  const height = Number(bounds.height);

  if ([x, y, width, height].every(Number.isFinite)) {
    return makeBounds(x, y, x + width, y + height);
  }

  return null;
}

function getTextBounds(node) {
  const content = node.content ?? {};
  const style = node.style ?? {};

  const x = Number(content.x ?? 0);
  const y = Number(content.y ?? 0);

  const text = String(content.text ?? '');
  const fontSize = Number(content.fontSize ?? style.text?.fontSize ?? 14);
  const fontWeight = String(content.fontWeight ?? style.text?.fontWeight ?? '');

  const lineHeight = Number(content.lineHeight ?? fontSize * 1.2);

  const rawLines = text.split('\n');
  const maxWidth = Number(content.maxWidth ?? 0);

  const weightFactor =
    fontWeight === 'bold' || Number(fontWeight) >= 600
      ? 0.66
      : 0.6;

  const estimatedRawWidths = rawLines.map((line) =>
    String(line).length * fontSize * weightFactor
  );

  const rawMaxWidth = Math.max(0, ...estimatedRawWidths);

  let estimatedWidth = rawMaxWidth;
  let lineCount = Math.max(1, rawLines.length);

  if (maxWidth > 0 && rawMaxWidth > maxWidth) {
    estimatedWidth = maxWidth;
    lineCount = rawLines.reduce((count, line) => {
      const lineWidth = String(line).length * fontSize * weightFactor;
      return count + Math.max(1, Math.ceil(lineWidth / maxWidth));
    }, 0);
  }

  const estimatedHeight = Math.max(fontSize, lineCount * lineHeight);

  const textAnchor = content.textAnchor ?? 'start';
  const dominantBaseline = content.dominantBaseline ?? 'auto';

  let minX = x;
  let maxX = x + estimatedWidth;

  if (textAnchor === 'middle') {
    minX = x - estimatedWidth / 2;
    maxX = x + estimatedWidth / 2;
  } else if (textAnchor === 'end') {
    minX = x - estimatedWidth;
    maxX = x;
  }

  let minY;
  let maxY;

  if (dominantBaseline === 'hanging' || dominantBaseline === 'text-before-edge') {
    minY = y;
    maxY = y + estimatedHeight;
  } else if (dominantBaseline === 'middle' || dominantBaseline === 'central') {
    minY = y - estimatedHeight / 2;
    maxY = y + estimatedHeight / 2;
  } else if (
    dominantBaseline === 'alphabetic' ||
    dominantBaseline === 'auto' ||
    dominantBaseline == null
  ) {
    minY = y - estimatedHeight * 0.85;
    maxY = y + fontSize * 0.3;
  } else {
    minY = y - estimatedHeight;
    maxY = y;
  }

  return makeBounds(minX, minY, maxX, maxY);
}

function getProceduralBounds(node) {
  const summaryBounds = getBoundsFromGeometrySummary(node);
  const estimatedBounds = getProceduralEstimatedBounds(node);

  return (
    unionBounds([summaryBounds, estimatedBounds]) ??
    getFrameFallbackBounds(node)
  );
}

function getBoundsFromGeometrySummary(node) {
  const bounds = node.geometrySummary?.bounds;

  if (!bounds) return null;

  const minX = Number(bounds.minX);
  const minY = Number(bounds.minY);
  const maxX = Number(bounds.maxX);
  const maxY = Number(bounds.maxY);

  if ([minX, minY, maxX, maxY].every(Number.isFinite)) {
    return makeBounds(minX, minY, maxX, maxY);
  }

  const x = Number(bounds.x ?? 0);
  const y = Number(bounds.y ?? 0);
  const width = Number(bounds.width);
  const height = Number(bounds.height);

  if ([x, y, width, height].every(Number.isFinite)) {
    return makeBounds(x, y, x + width, y + height);
  }

  return null;
}

function getProceduralEstimatedBounds(node) {
  if (node.rendererType === 'd3-axis-system') {
    return getD3AxisSystemEstimatedBounds(node);
  }

  return null;
}

function getD3AxisSystemEstimatedBounds(node) {
  const plan = node.renderPlan ?? {};
  const style = plan.style ?? {};

  const plotWidth = Number(plan.plotWidth ?? plan.x?.range?.[1] ?? 0);
  const plotHeight = Number(plan.plotHeight ?? Math.abs(plan.y?.range?.[1] ?? 0));

  const fontSize = Number(style.fontSize ?? 10);
  const tickSize = Number(style.tickSize ?? 6);
  const tickPadding = Number(style.tickPadding ?? 4);
  const strokeWidth = Number(style.strokeWidth ?? 1);

  const showTickLines = style.showTickLines ?? true;
  const showTickLabels = style.showTickLabels ?? true;

  let bounds = makeBounds(0, -plotHeight, plotWidth, 0);

  if (plan.x) {
    const axisY = Number(plan.x.axisY ?? 0);
    const labelSamples = getAxisLabelSamples(plan.x);
    const maxLabelWidth = estimateMaxTextWidth(labelSamples, fontSize);

    const tickExtent = showTickLines ? tickSize : 0;
    const labelExtent = showTickLabels
      ? tickExtent + tickPadding + fontSize * 1.35
      : tickExtent;

    const xBounds = makeBounds(
      0 - maxLabelWidth / 2 - strokeWidth,
      axisY - strokeWidth,
      plotWidth + maxLabelWidth / 2 + strokeWidth,
      axisY + labelExtent + strokeWidth
    );

    bounds = unionBounds([bounds, xBounds]);
  }

  if (plan.y) {
    const axisX = Number(plan.y.axisX ?? 0);
    const labelSamples = getAxisLabelSamples(plan.y);
    const maxLabelWidth = estimateMaxTextWidth(labelSamples, fontSize);

    const tickExtent = showTickLines ? tickSize : 0;
    const labelExtent = showTickLabels
      ? tickExtent + tickPadding + maxLabelWidth
      : tickExtent;

    const yBounds = makeBounds(
      axisX - labelExtent - strokeWidth,
      -plotHeight - fontSize * 0.75 - strokeWidth,
      axisX + strokeWidth,
      fontSize * 0.75 + strokeWidth
    );

    bounds = unionBounds([bounds, yBounds]);
  }

  if (plan.origin?.showMarker) {
    const r = Number(plan.origin.markerRadius ?? 3);
    const x = Number(plan.y?.axisX ?? 0);
    const y = Number(plan.x?.axisY ?? 0);

    bounds = unionBounds([
      bounds,
      makeBounds(x - r, y - r, x + r, y + r),
    ]);
  }

  return bounds;
}

function getAxisLabelSamples(axisPlan) {
  if (!axisPlan) return [];

  if (Array.isArray(axisPlan.tickValues) && axisPlan.tickValues.length > 0) {
    return axisPlan.tickValues.map(String);
  }

  if (Array.isArray(axisPlan.domain)) {
    return axisPlan.domain.map(String);
  }

  return [];
}

function estimateMaxTextWidth(labels, fontSize) {
  if (!Array.isArray(labels) || labels.length === 0) return 0;

  return Math.max(
    0,
    ...labels.map((label) => String(label).length * fontSize * 0.62)
  );
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

    case 'path': {
      return boundsFromPathData(spec.d);
    }

    case 'text': {
      const x = Number(spec.x ?? 0);
      const y = Number(spec.y ?? 0);
      const fontSize = Number(spec.fontSize ?? 12);
      const text = String(spec.text ?? '');
      const width = text.length * fontSize * 0.6;
      return makeBounds(x, y - fontSize, x + width, y);
    }

    case 'group': {
      return unionBounds((spec.children ?? []).map(getLegacyBounds));
    }

    default:
      return null;
  }
}

// Important: frame fallback returns LOCAL bounds.
// frame.x / frame.y are applied later by applyNodeTransform().
function getFrameFallbackBounds(node) {
  const frame = node.frame;
  if (!frame) return null;

  const width = Number(frame.width ?? 0);
  const height = Number(frame.height ?? 0);

  return makeBounds(0, 0, width, height);
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

  const origin = resolveTransformOrigin({
    transform,
    frame,
    bounds,
  });

  const corners = [
    [bounds.minX, bounds.minY],
    [bounds.maxX, bounds.minY],
    [bounds.maxX, bounds.maxY],
    [bounds.minX, bounds.maxY],
  ].map(([x, y]) => {
    let nx = x;
    let ny = y;

    if (origin) {
      nx -= origin.x;
      ny -= origin.y;
    }

    nx *= scaleX;
    ny *= scaleY;

    if (rotate !== 0) {
      const rad = (rotate * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rx = nx * cos - ny * sin;
      const ry = nx * sin + ny * cos;
      nx = rx;
      ny = ry;
    }

    if (origin) {
      nx += origin.x;
      ny += origin.y;
    }

    return [nx + translateX, ny + translateY];
  });

  return boundsFromCoordinatePairs(corners);
}

function resolveTransformOrigin({ transform, frame, bounds }) {
  if (!transform.origin || transform.origin === 'local') return null;

  const width = Number(frame.width ?? bounds.width ?? 0);
  const height = Number(frame.height ?? bounds.height ?? 0);

  if (transform.origin === 'center') {
    return {
      x: width / 2,
      y: height / 2,
    };
  }

  if (transform.origin === 'top-left') {
    return { x: 0, y: 0 };
  }

  if (transform.origin === 'bottom-left') {
    return { x: 0, y: height };
  }

  if (transform.origin === 'bottom-center') {
    return { x: width / 2, y: height };
  }

  if (typeof transform.origin === 'object') {
    return {
      x: Number(transform.origin.x ?? 0),
      y: Number(transform.origin.y ?? 0),
    };
  }

  return null;
}

function getPaintPadding(node) {
  const style = node.style ?? {};

  const strokeWidth = style.stroke?.enabled
    ? Number(style.stroke?.width ?? style.strokeWidth ?? 0)
    : 0;

  const shadowBlur = Number(style.shadow?.blur ?? 0);
  const filterPadding = Number(style.filterPadding ?? 0);

  return Math.max(0, strokeWidth / 2, shadowBlur, filterPadding);
}

function expandBounds(bounds, padding) {
  if (!bounds) return null;

  const p = Number(padding ?? 0);
  if (!Number.isFinite(p) || p <= 0) return bounds;

  return makeBounds(
    bounds.minX - p,
    bounds.minY - p,
    bounds.maxX + p,
    bounds.maxY + p
  );
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

function boundsFromPathData(pathData) {
  if (!pathData) return null;

  // Rough parser: good enough for generated M/L/C/S/Q path data.
  // For complex arcs, geometrySummary.bounds should be preferred.
  const values = String(pathData)
    .match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)
    ?.map(Number)
    .filter(Number.isFinite);

  if (!values || values.length < 2) return null;

  const pairs = [];

  for (let i = 0; i < values.length - 1; i += 2) {
    pairs.push([values[i], values[i + 1]]);
  }

  return boundsFromCoordinatePairs(pairs);
}

function boundsFromCoordinatePairs(pairs) {
  if (!pairs?.length) return null;

  const valid = pairs.filter(
    ([x, y]) => Number.isFinite(x) && Number.isFinite(y)
  );

  if (!valid.length) return null;

  const xs = valid.map(([x]) => x);
  const ys = valid.map(([, y]) => y);

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