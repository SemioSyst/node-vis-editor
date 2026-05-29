// src/runtime/interpolation/pathPointMatching.js

import {
  interpolateMaybeNumber,
} from './interpolateValues.js';

export function isPathElement(element) {
  const content = element?.content ?? {};
  const shape = content.shape ?? {};
  const shapeType = shape.shapeType ?? shape.kind;

  return (
    element?.nodeType === 'element' &&
    content.contentType === 'shape' &&
    shapeType === 'path'
  );
}

export function buildPathPointMatchBundle({
  fromElement,
  toElement,
  rule = null,
}) {
  if (!isPathElement(fromElement) || !isPathElement(toElement)) {
    return null;
  }

  const fromPoints = extractPathPoints(fromElement);
  const toPoints = extractPathPoints(toElement);

  if (!fromPoints.length || !toPoints.length) {
    return null;
  }

  const resolvedRule = resolvePointMatchRule({
    fromPoints,
    toPoints,
    rule,
  });

  const result = buildPointMatchWithRule({
    fromPoints,
    toPoints,
    rule: resolvedRule,
  });

  if (!result.matches.length) {
    return null;
  }

  return {
    rule: resolvedRule,
    matches: result.matches,
    report: result.report,
  };
}

export function extractPathPoints(element) {
  const candidates = [
    element?.dataRef?.points,
    element?.dataRef?.pathPoints,
    element?.meta?.points,
    element?.meta?.geometrySummary?.points,
    element?.content?.shape?.points,
  ];

  for (const candidate of candidates) {
    const normalized = normalizePointArray(candidate);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  const d = element?.content?.shape?.d;
  const parsedFromD = parseSimpleLinePathD(d);

  if (parsedFromD.length > 0) {
    return parsedFromD;
  }

  return [];
}

export function interpolatePointsFromMatches(pointMatches, progress) {
  return [...(pointMatches ?? [])]
    .sort((a, b) => {
      const ai = a.fromPoint?.index ?? a.fromIndex ?? 0;
      const bi = b.fromPoint?.index ?? b.fromIndex ?? 0;
      return ai - bi;
    })
    .map((match, index) => {
      const fromPoint = match.fromPoint ?? {};
      const toPoint = match.toPoint ?? {};

      return {
        index,
        pointKey: match.pointKey,

        x: interpolateMaybeNumber(
          fromPoint.x,
          toPoint.x,
          progress
        ),

        y: interpolateMaybeNumber(
          fromPoint.y,
          toPoint.y,
          progress
        ),

        tags: {
          ...(fromPoint.tags ?? {}),
          ...(toPoint.tags ?? {}),
        },
      };
    })
    .filter((point) =>
      Number.isFinite(Number(point.x)) &&
      Number.isFinite(Number(point.y))
    );
}

export function buildPathDFromPoints(points) {
  if (!points?.length) return '';

  return points
    .map((point, index) => {
      const x = Number(point.x);
      const y = Number(point.y);

      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}

/* -------------------------------------------------------------------------- */
/* Matching                                                                    */
/* -------------------------------------------------------------------------- */

function resolvePointMatchRule({
  fromPoints,
  toPoints,
  rule,
}) {
  if (rule?.method && rule.method !== 'auto') {
    return {
      method: rule.method,
      tagKeys: rule.tagKeys ?? [],
      fallback: rule.fallback ?? 'index',
    };
  }

  const candidates = [
    { method: 'tagKeys', tagKeys: ['identity'], fallback: 'index' },
    { method: 'tagKeys', tagKeys: ['matchId'], fallback: 'index' },
    { method: 'tagKeys', tagKeys: ['id'], fallback: 'index' },
    { method: 'tagKeys', tagKeys: ['key'], fallback: 'index' },
    { method: 'tagKeys', tagKeys: ['point'], fallback: 'index' },
    { method: 'tagKeys', tagKeys: ['pointId'], fallback: 'index' },
    { method: 'tagKeys', tagKeys: ['item'], fallback: 'index' },
    { method: 'index', tagKeys: [], fallback: 'index' },
  ];

  const scored = candidates.map((candidate, index) => {
    const result = buildPointMatchWithRule({
      fromPoints,
      toPoints,
      rule: candidate,
    });

    return {
      candidate,
      score: scorePointMatchResult(result, index),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    ...scored[0].candidate,
    resolvedFrom: 'auto',
    autoScore: scored[0].score,
  };
}

function scorePointMatchResult(result, candidateIndex) {
  const matched = result.matches.length;
  const missing = result.report.missing.length;
  const duplicates = result.report.duplicates.length;
  const priorityBonus = Math.max(0, 20 - candidateIndex);

  return (
    matched * 100 +
    priorityBonus -
    missing * 25 -
    duplicates * 20
  );
}

function buildPointMatchWithRule({
  fromPoints,
  toPoints,
  rule,
}) {
  if (rule.method === 'index') {
    return buildIndexPointMatch({
      fromPoints,
      toPoints,
      rule,
    });
  }

  if (rule.method === 'tagKeys') {
    return buildKeyedPointMatch({
      fromPoints,
      toPoints,
      rule,
      keyFn: (point) => {
        const tags = point.tags ?? {};
        const keys = rule.tagKeys ?? [];

        const hasAllKeys = keys.every((key) =>
          tags[key] !== undefined &&
          tags[key] !== null &&
          tags[key] !== ''
        );

        if (!hasAllKeys) return null;

        return keys
          .map((key) => `${key}=${String(tags[key])}`)
          .join('|');
      },
    });
  }

  return buildIndexPointMatch({
    fromPoints,
    toPoints,
    rule,
  });
}

function buildIndexPointMatch({
  fromPoints,
  toPoints,
}) {
  const count = Math.min(fromPoints.length, toPoints.length);
  const matches = [];

  for (let index = 0; index < count; index += 1) {
    matches.push({
      pointKey: `index=${index}`,
      fromIndex: index,
      toIndex: index,
      fromPoint: fromPoints[index],
      toPoint: toPoints[index],
    });
  }

  const missing = [];

  if (fromPoints.length !== toPoints.length) {
    missing.push({
      pointKey: 'point-count-mismatch',
      reason: `point count mismatch ${fromPoints.length} vs ${toPoints.length}`,
    });
  }

  return {
    matches,
    report: {
      matchedCount: matches.length,
      missing,
      duplicates: [],
      fallbackUsed: [],
    },
  };
}

function buildKeyedPointMatch({
  fromPoints,
  toPoints,
  rule,
  keyFn,
}) {
  const fromGroups = groupPointsByKey(fromPoints, keyFn);
  const toGroups = groupPointsByKey(toPoints, keyFn);

  const allKeys = new Set([
    ...fromGroups.keys(),
    ...toGroups.keys(),
  ]);

  const matches = [];
  const missing = [];
  const duplicates = [];
  const fallbackUsed = [];

  allKeys.forEach((pointKey) => {
    const fromItems = fromGroups.get(pointKey) ?? [];
    const toItems = toGroups.get(pointKey) ?? [];

    if (fromItems.length === 0) {
      missing.push({
        pointKey,
        side: 'from',
        reason: 'missing-from-points',
      });
      return;
    }

    if (toItems.length === 0) {
      missing.push({
        pointKey,
        side: 'to',
        reason: 'missing-to-points',
      });
      return;
    }

    if (fromItems.length === 1 && toItems.length === 1) {
      matches.push({
        pointKey,
        fromIndex: fromItems[0].index,
        toIndex: toItems[0].index,
        fromPoint: fromItems[0].point,
        toPoint: toItems[0].point,
      });
      return;
    }

    duplicates.push({
      pointKey,
      fromCount: fromItems.length,
      toCount: toItems.length,
    });

    if (rule.fallback === 'occurrence' || rule.fallback === 'index') {
      const count = Math.min(fromItems.length, toItems.length);

      for (let index = 0; index < count; index += 1) {
        matches.push({
          pointKey: `${pointKey}#${index}`,
          fromIndex: fromItems[index].index,
          toIndex: toItems[index].index,
          fromPoint: fromItems[index].point,
          toPoint: toItems[index].point,
        });
      }

      fallbackUsed.push({
        pointKey,
        reason:
          rule.fallback === 'occurrence'
            ? 'duplicate-occurrence'
            : 'duplicate-index',
      });
    }
  });

  if (matches.length === 0 && rule.fallback === 'index') {
    const fallback = buildIndexPointMatch({
      fromPoints,
      toPoints,
      rule: {
        method: 'index',
      },
    });

    return {
      ...fallback,
      report: {
        ...fallback.report,
        fallbackUsed: [
          ...fallback.report.fallbackUsed,
          {
            reason: 'tag-point-match-fallback-index',
            fromTagKeys: rule.tagKeys ?? [],
          },
        ],
      },
    };
  }

  return {
    matches,
    report: {
      matchedCount: matches.length,
      missing,
      duplicates,
      fallbackUsed,
    },
  };
}

function groupPointsByKey(points, keyFn) {
  const groups = new Map();

  points.forEach((point, index) => {
    const pointKey = keyFn(point, index);

    if (!pointKey) return;

    if (!groups.has(pointKey)) {
      groups.set(pointKey, []);
    }

    groups.get(pointKey).push({
      index,
      point,
    });
  });

  return groups;
}

/* -------------------------------------------------------------------------- */
/* Point extraction                                                            */
/* -------------------------------------------------------------------------- */

function normalizePointArray(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((point, index) => normalizePoint(point, index))
    .filter(Boolean);
}

function normalizePoint(point, index) {
  if (Array.isArray(point)) {
    const [x, y] = point.map(Number);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }

    return {
      index,
      x,
      y,
      tags: null,
      raw: point,
    };
  }

  if (!point || typeof point !== 'object') return null;

  const x = Number(
    point.x ??
    point.svgX ??
    point.userX ??
    point.cx
  );

  const y = Number(
    point.y ??
    point.svgY ??
    point.userY ??
    point.cy
  );

  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    index: point.index ?? point.pointIndex ?? index,
    flatIndex: point.flatIndex ?? null,
    rowIndex: point.rowIndex ?? null,
    colIndex: point.colIndex ?? null,

    x,
    y,

    tags: mergeTags(
      point.tags,
      point.matrixItem?.tags,
      point.mappedItem?.tags,
      point.dataRef?.tags,
      collectLineageTags(point.lineage),
      collectLineageTags(point.parameterLineage)
    ),

    raw: point,
  };
}

function parseSimpleLinePathD(d) {
  if (!d) return [];

  const tokens = String(d)
    .replace(/,/g, ' ')
    .trim()
    .split(/\s+/);

  const points = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token === 'M' || token === 'L' || token === 'm' || token === 'l') {
      const x = Number(tokens[i + 1]);
      const y = Number(tokens[i + 2]);

      if (Number.isFinite(x) && Number.isFinite(y)) {
        points.push({
          index: points.length,
          x,
          y,
          tags: null,
          raw: { command: token, x, y },
        });
      }

      i += 2;
    }
  }

  return points;
}

function collectLineageTags(lineage) {
  if (!lineage || typeof lineage !== 'object') return null;

  const merged = {};

  Object.values(lineage).forEach((entry) => {
    mergeInto(merged, entry?.tags);
    mergeInto(merged, entry?.matrixItem?.tags);
    mergeInto(merged, entry?.mappedItem?.tags);
    mergeInto(merged, entry?.scaleItem?.tags);
  });

  return Object.keys(merged).length > 0 ? merged : null;
}

function mergeTags(...tagObjects) {
  const merged = {};

  tagObjects.forEach((tags) => {
    mergeInto(merged, tags);
  });

  return Object.keys(merged).length > 0 ? merged : null;
}

function mergeInto(target, tags) {
  if (!tags || typeof tags !== 'object') return;

  Object.entries(tags).forEach(([key, value]) => {
    if (key == null || key === '') return;
    if (value === undefined || value === null || value === '') return;

    target[key] = value;
  });
}