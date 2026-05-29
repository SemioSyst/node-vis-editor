// src/runtime/interpolation/interpolateValues.js

import { rgb } from 'd3-color';

export function clamp01(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(1, n));
}

export function chooseByProgress(fromValue, toValue, progress) {
  return clamp01(progress) < 0.5 ? fromValue : toValue;
}

export function toFiniteNumber(value, fallback = null) {
  const n = Number(value);

  return Number.isFinite(n) ? n : fallback;
}

export function interpolateNumber(fromValue, toValue, progress, fallback = 0) {
  const from = toFiniteNumber(fromValue, fallback);
  const to = toFiniteNumber(toValue, from);

  const t = clamp01(progress);

  return from + (to - from) * t;
}

export function interpolateMaybeNumber(fromValue, toValue, progress) {
  const from = toFiniteNumber(fromValue, null);
  const to = toFiniteNumber(toValue, null);

  if (from == null || to == null) {
    return chooseByProgress(fromValue, toValue, progress);
  }

  return interpolateNumber(from, to, progress, from);
}

export function interpolateColor(fromColor, toColor, progress) {
  const from = parseDisplayableColor(fromColor);
  const to = parseDisplayableColor(toColor);

  if (!from || !to) {
    return chooseByProgress(fromColor, toColor, progress);
  }

  const t = clamp01(progress);

  return rgb(
    from.r + (to.r - from.r) * t,
    from.g + (to.g - from.g) * t,
    from.b + (to.b - from.b) * t,
    from.opacity + (to.opacity - from.opacity) * t
  ).formatHex();
}

export function interpolateStyle(fromStyle = {}, toStyle = {}, progress) {
  const t = clamp01(progress);

  const next = {
    ...fromStyle,
  };

  const fromOpacity = toFiniteNumber(fromStyle.opacity, null);
  const toOpacity = toFiniteNumber(toStyle.opacity, null);

  if (fromOpacity != null || toOpacity != null) {
    next.opacity = interpolateNumber(
      fromOpacity ?? 1,
      toOpacity ?? fromOpacity ?? 1,
      t,
      1
    );
  }

  const fromFillColor = getFillColor(fromStyle.fill);
  const toFillColor = getFillColor(toStyle.fill);

  if (fromFillColor || toFillColor) {
    const color = interpolateColor(
      fromFillColor ?? toFillColor,
      toFillColor ?? fromFillColor,
      t
    );

    next.fill = makeFillLike(fromStyle.fill ?? toStyle.fill, color);
  }

  const fromStroke = normalizeStroke(fromStyle);
  const toStroke = normalizeStroke(toStyle);

  if (fromStroke.enabled || toStroke.enabled) {
    next.stroke = {
      enabled: true,
      color: interpolateColor(
        fromStroke.color ?? toStroke.color ?? '#000000',
        toStroke.color ?? fromStroke.color ?? '#000000',
        t
      ),
      width: interpolateNumber(
        fromStroke.width ?? 0,
        toStroke.width ?? fromStroke.width ?? 0,
        t,
        0
      ),
    };
  }

  return next;
}

export function interpolateNumberProps(fromObject = {}, toObject = {}, keys = [], progress) {
  const next = {
    ...fromObject,
  };

  keys.forEach((key) => {
    const fromValue = fromObject?.[key];
    const toValue = toObject?.[key];

    if (fromValue == null && toValue == null) return;

    next[key] = interpolateMaybeNumber(fromValue, toValue, progress);
  });

  return next;
}

function parseDisplayableColor(value) {
  if (!value) return null;

  const parsed = rgb(value);

  if (!parsed || !parsed.displayable()) {
    return null;
  }

  return parsed;
}

function getFillColor(fill) {
  if (!fill) return null;

  if (typeof fill === 'string') {
    return fill;
  }

  if (fill.type === 'none') {
    return null;
  }

  return fill.color ?? null;
}

function makeFillLike(originalFill, color) {
  if (!originalFill || typeof originalFill === 'string') {
    return color;
  }

  return {
    ...originalFill,
    type: originalFill.type === 'none' ? 'solid' : originalFill.type,
    color,
  };
}

function normalizeStroke(style = {}) {
  const stroke = style.stroke;

  if (!stroke) {
    return {
      enabled: false,
      color: style.strokeColor ?? null,
      width: style.strokeWidth ?? 0,
    };
  }

  if (typeof stroke === 'string') {
    return {
      enabled: stroke !== 'none',
      color: stroke,
      width: Number(style.strokeWidth ?? 1),
    };
  }

  return {
    enabled: Boolean(stroke.enabled),
    color: stroke.color ?? style.strokeColor ?? '#000000',
    width: Number(stroke.width ?? style.strokeWidth ?? 1),
  };
}

export function interpolateFrame(fromFrame, toFrame, progress) {
  if (!fromFrame && !toFrame) return fromFrame;

  const from = fromFrame ?? {};
  const to = toFrame ?? {};
  const next = {
    ...from,
  };

  ['x', 'y', 'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight'].forEach((key) => {
    if (from[key] == null && to[key] == null) return;

    next[key] = interpolateMaybeNumber(
      from[key] ?? getFrameFallbackValue(key, to[key]),
      to[key] ?? from[key] ?? getFrameFallbackValue(key, from[key]),
      progress
    );
  });

  // Non-numeric layout hints should switch at midpoint.
  ['alignX', 'alignY', 'anchor', 'positionMode'].forEach((key) => {
    if (from[key] == null && to[key] == null) return;

    next[key] = chooseByProgress(from[key], to[key], progress);
  });

  return next;
}

export function interpolateTransform(fromTransform, toTransform, progress) {
  if (!fromTransform && !toTransform) return fromTransform;

  const from = fromTransform ?? {};
  const to = toTransform ?? {};
  const next = {
    ...from,
  };

  const numericKeys = [
    'x',
    'y',
    'translateX',
    'translateY',
    'scale',
    'scaleX',
    'scaleY',
    'rotate',
    'rotation',
  ];

  numericKeys.forEach((key) => {
    if (from[key] == null && to[key] == null) return;

    next[key] = interpolateMaybeNumber(
      from[key] ?? getTransformFallbackValue(key),
      to[key] ?? from[key] ?? getTransformFallbackValue(key),
      progress
    );
  });

  ['origin', 'transformOrigin'].forEach((key) => {
    if (from[key] == null && to[key] == null) return;

    next[key] = chooseByProgress(from[key], to[key], progress);
  });

  return next;
}

export function interpolateNodeLayoutProps(fromNode = {}, toNode = {}, progress) {
  const next = {};

  if (fromNode.frame || toNode.frame) {
    next.frame = interpolateFrame(
      fromNode.frame,
      toNode.frame,
      progress
    );
  }

  if (fromNode.transform || toNode.transform) {
    next.transform = interpolateTransform(
      fromNode.transform,
      toNode.transform,
      progress
    );
  }

  if (fromNode.opacity != null || toNode.opacity != null) {
    next.opacity = interpolateNumber(
      fromNode.opacity ?? 1,
      toNode.opacity ?? fromNode.opacity ?? 1,
      progress,
      1
    );
  }

  return next;
}

function getFrameFallbackValue(key, pairedValue) {
  if (key === 'x' || key === 'y') return 0;

  const pairedNumber = Number(pairedValue);

  if (Number.isFinite(pairedNumber)) return pairedNumber;

  return 0;
}

function getTransformFallbackValue(key) {
  if (key === 'scale' || key === 'scaleX' || key === 'scaleY') {
    return 1;
  }

  return 0;
}