// src/evaluator/evaluatorsByType.js

const DEFAULT_VIEWBOX = '0 0 100 100';
const DEFAULT_STROKE = '#000000';
const DEFAULT_STROKE_WIDTH = 2;

/**
 * Helpers
 */
function pick(obj, key, fallback) {
  const v = obj?.[key];
  return v === undefined || v === null ? fallback : v;
}

/**
 * Base shape evaluators
 * ctx.params should come from IR: graphIR.nodesById[id].params
 * ctx.getUpstreamOutputs() returns array of upstream outputs (already resolved from outputs store)
 */

// Circle node: outputs one circle spec
function evalCircle(ctx) {
  const p = ctx.params ?? {};
  return {
    kind: 'circle',
    cx: pick(p, 'cx', 50),
    cy: pick(p, 'cy', 50),
    r: pick(p, 'r', 22),
    fill: pick(p, 'fill', 'none'),
    stroke: pick(p, 'stroke', DEFAULT_STROKE),
    strokeWidth: pick(p, 'strokeWidth', DEFAULT_STROKE_WIDTH),
    opacity: pick(p, 'opacity', undefined),
    viewBox: pick(p, 'viewBox', DEFAULT_VIEWBOX), // optional; Preview can read from top-level group
  };
}

// Rect node: outputs one rect spec
function evalRect(ctx) {
  const p = ctx.params ?? {};
  return {
    kind: 'rect',
    x: pick(p, 'x', 8),
    y: pick(p, 'y', 8),
    w: pick(p, 'w', 84),
    h: pick(p, 'h', 84),
    rx: pick(p, 'rx', 10),
    ry: pick(p, 'ry', 10),
    fill: pick(p, 'fill', 'none'),
    stroke: pick(p, 'stroke', DEFAULT_STROKE),
    strokeWidth: pick(p, 'strokeWidth', DEFAULT_STROKE_WIDTH),
    opacity: pick(p, 'opacity', undefined),
    viewBox: pick(p, 'viewBox', DEFAULT_VIEWBOX),
  };
}

// Line node: outputs one line spec
function evalLine(ctx) {
  const p = ctx.params ?? {};
  return {
    kind: 'line',
    x1: pick(p, 'x1', 10),
    y1: pick(p, 'y1', 50),
    x2: pick(p, 'x2', 90),
    y2: pick(p, 'y2', 50),
    stroke: pick(p, 'stroke', DEFAULT_STROKE),
    strokeWidth: pick(p, 'strokeWidth', DEFAULT_STROKE_WIDTH),
    opacity: pick(p, 'opacity', undefined),
    viewBox: pick(p, 'viewBox', DEFAULT_VIEWBOX),
  };
}

// Group node: merges upstream outputs into children array
function evalGroup(ctx) {
  const p = ctx.params ?? {};
  const children = ctx.getUpstreamOutputs();

  // Demo behaviour: if nothing upstream, output empty group
  return {
    kind: 'group',
    viewBox: pick(p, 'viewBox', DEFAULT_VIEWBOX),
    transform: pick(p, 'transform', undefined),
    children,
  };
}

/**
 * Registry
 * IMPORTANT: these keys must match graphIR.nodesById[id].type
 * e.g. node.type = 'circle', 'rect', 'line', 'group'
 */
export const evaluatorsByType = {
  circle: evalCircle,
  rect: evalRect,
  line: evalLine,
  group: evalGroup,
};
