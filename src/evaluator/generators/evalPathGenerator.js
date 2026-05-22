import {
  line as d3Line,
  curveLinear,
  curveMonotoneX,
  curveBasis,
  curveCatmullRom,
  curveStep,
} from 'd3-shape';

import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

export function evalPathGenerator(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const inputsByHandle = ctx.inputs?.byTargetHandle ?? {};
  const pathMode = p.pathMode ?? 'linePath';

  const parameterSources = collectParameterSources(inputsByHandle);

  const streams = {
    x: makeParamStream({
      handleId: 'x',
      inputsByHandle,
      fallback: p.defaultX ?? 0,
      kind: 'number',
    }),

    y: makeParamStream({
      handleId: 'y',
      inputsByHandle,
      fallback: p.defaultY ?? 0,
      kind: 'number',
    }),

    pathData: makeParamStream({
      handleId: 'pathData',
      inputsByHandle,
      fallback: p.pathData ?? 'M 0 0 L 100 50',
      kind: 'text',
    }),

    stroke: makeParamStream({
      handleId: 'stroke',
      inputsByHandle,
      fallback: p.strokeColor ?? '#111111',
      kind: 'color',
    }),

    strokeWidth: makeParamStream({
      handleId: 'strokeWidth',
      inputsByHandle,
      fallback: p.strokeWidth ?? 2,
      kind: 'number',
    }),

    fill: makeParamStream({
      handleId: 'fill',
      inputsByHandle,
      fallback: p.fillColor ?? '#6f86e8',
      kind: 'color',
    }),

    opacity: makeParamStream({
      handleId: 'opacity',
      inputsByHandle,
      fallback: p.opacity ?? 1,
      kind: 'number',
    }),

    style: makeGroupedInputStream({
      handleId: 'style',
      inputsByHandle,
    }),
  };

  const resolved = resolvePath({
    pathMode,
    params: p,
    streams,
    warnings,
  });

  const child = makePathElement({
    ctx,
    pathMode,
    resolved,
    streams,
    parameterSources,
  });

  const inputProvenance = collectInputProvenanceFromSources(parameterSources);

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'path-generator',
    outputType: 'visual',
    label: 'Path Generator Output',
    transform: {
      type: 'generate-path',
      pathMode,
      pointCount: resolved.points.length,
      closed: resolved.closed,
    },
  });

  return {
    outputType: 'visual',
    version: '0.1',

    root: {
      nodeType: 'collection',
      id: `${ctx.nodeId}-path-collection`,

      transform: {
        x: 0,
        y: 0,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
      },

      interaction: null,
      bindings: [],

      children: [child],

      meta: {
        role: 'generated-path',
        tags: ['path-generator', 'path', pathMode],
        sourceNodeId: ctx.nodeId,

        parameterSources,
        geometrySummary: resolved.geometrySummary,
      },
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Path Generator Output',
      outputRole: 'generated-path-collection',
      warnings,

      resolvedCount: 1,
      pathMode,
      pointCount: resolved.points.length,

      provenance: [
        ...inputProvenance,
        ownProvenanceEntry,
      ],

      parameterSources,
      geometrySummary: resolved.geometrySummary,
    },
  };
}

function resolvePath({
  pathMode,
  params,
  streams,
  warnings,
}) {
  if (pathMode === 'freeformPath') {
    const pathData = String(
      getStreamValue(streams.pathData, 0, params.pathData ?? 'M 0 0 L 100 50')
    );

    const style = resolveStyle({
      params,
      streams,
      index: 0,
      pathMode,
    });

    return {
      pathMode,
      d: pathData,
      closed: false,
      points: [],
      anchors: {},
      style,
      geometrySummary: {
        pathMode,
        pathData,
        closed: false,
        pointCount: 0,
        bounds: null,
        anchors: {},
      },
    };
  }

  const points = resolvePoints({
    streams,
    params,
  });

  if (points.length < 2) {
    warnings.push('PathGenerator needs at least two valid points.');
  }

  const curve = getCurve(params.curveType ?? 'linear');

  const lineGenerator = d3Line()
    .x((point) => point.x)
    .y((point) => point.y)
    .defined((point) =>
      Number.isFinite(point.x) && Number.isFinite(point.y)
    )
    .curve(curve);

  let d = lineGenerator(points) ?? '';

  const closed = pathMode === 'polygonPath';

  if (closed && d && !d.trim().endsWith('Z')) {
    d = `${d}Z`;
  }

  const style = resolveStyle({
    params,
    streams,
    index: 0,
    pathMode,
  });

  const bounds = getPointBounds(points);
  const anchors = makePathAnchors(points, bounds);

  return {
    pathMode,
    d,
    closed,
    points,
    anchors,
    style,
    geometrySummary: {
      pathMode,
      pathData: d,
      closed,
      pointCount: points.length,
      bounds,
      anchors,
      curveType: params.curveType ?? 'linear',
      sampleCount: Math.max(2, Math.round(toNumber(params.sampleCount ?? 32, 32))),
    },
  };
}

function resolvePoints({
  streams,
  params,
}) {
  const xLength = getStreamLength(streams.x);
  const yLength = getStreamLength(streams.y);
  const count = Math.max(xLength, yLength, 2);

  const points = [];

  for (let index = 0; index < count; index += 1) {
    const fallbackX = index * 40;
    const fallbackY = 0;

    const x = toNumber(
      getStreamValue(streams.x, index, params.defaultX ?? fallbackX),
      fallbackX
    );

    const userY = toNumber(
      getStreamValue(streams.y, index, params.defaultY ?? fallbackY),
      fallbackY
    );

    const y = toSvgY(userY, params);

    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    points.push({
      index,

      // SVG-space coordinates used to draw the path.
      x,
      y,

      // User-space coordinates kept for future binding / animation / debug.
      userX: x,
      userY,
    });
  }

  return points;
}

function resolveStyle({
  params,
  streams,
  index,
  pathMode,
}) {
  const styleObject = getStreamValue(streams.style, index, null);

  const fillMode = params.fillMode ?? (pathMode === 'polygonPath' ? 'solid' : 'none');

  const fillColor =
    styleObject?.fillColor ??
    styleObject?.fill ??
    getStreamValue(streams.fill, index, params.fillColor ?? '#6f86e8');

  const strokeColor =
    styleObject?.strokeColor ??
    styleObject?.stroke ??
    getStreamValue(streams.stroke, index, params.strokeColor ?? '#111111');

  const strokeWidth = Math.max(
    0,
    toNumber(
      styleObject?.strokeWidth ??
        getStreamValue(streams.strokeWidth, index, params.strokeWidth ?? 2),
      2
    )
  );

  const opacity = clamp(
    toNumber(
      styleObject?.opacity ??
        getStreamValue(streams.opacity, index, params.opacity ?? 1),
      1
    ),
    0,
    1
  );

  return {
    fillMode,
    fillColor,
    strokeColor,
    strokeWidth,
    opacity,
  };
}

function makePathElement({
  ctx,
  pathMode,
  resolved,
  streams,
  parameterSources,
}) {
  const parameterLineage = makeElementParameterLineage({
    index: 0,
    streams,
    parameterSources,
    resolved,
  });

  const pointLineage = makePointLineage({
    points: resolved.points,
    streams,
    parameterSources,
  });

  const inheritedTags = collectElementTags({
    index: 0,
    parameterLineage,
    parameterSources,
  });

  const pointTags = collectPointTags(pointLineage);

  return {
    nodeType: 'element',
    id: `${ctx.nodeId}-${pathMode}-0`,

    // Technical role only. Binding should rely on lineage/tags/context.
    role: 'path',
    tags: ['path', pathMode],

    dataRef: {
      index: 0,
      collectionId: `${ctx.nodeId}-path-collection`,
      generatorNodeId: ctx.nodeId,

      pathMode,
      pointCount: resolved.points.length,

      inputValues: {
        pathData: resolved.d,
        stroke: resolved.style.strokeColor,
        strokeWidth: resolved.style.strokeWidth,
        fill: resolved.style.fillColor,
        fillMode: resolved.style.fillMode,
        opacity: resolved.style.opacity,
      },

      points: pointLineage,

      parameterLineage,
      tags: inheritedTags,
      pointTags,
    },

    elementType: 'graphic',

    frame: {
      x: 0,
      y: 0,
      width: resolved.geometrySummary.bounds?.width ?? 0,
      height: resolved.geometrySummary.bounds?.height ?? 0,
      alignX: 'left',
      alignY: 'top',
    },

    transform: {
      x: 0,
      y: 0,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      origin: 'center',
    },

    content: {
      contentType: 'shape',
      shape: {
        shapeType: 'path',
        d: resolved.d,
      },
    },

    style: {
      fill:
        resolved.style.fillMode === 'none'
          ? {
              type: 'none',
            }
          : {
              type: 'solid',
              color: resolved.style.fillColor,
            },

      stroke: {
        enabled: resolved.style.strokeWidth > 0,
        color: resolved.style.strokeColor,
        width: resolved.style.strokeWidth,
      },

      opacity: resolved.style.opacity,
    },

    interaction: null,
    bindings: [],

    meta: {
      sourceNodeId: ctx.nodeId,
      elementIndex: 0,
      collectionId: `${ctx.nodeId}-path-collection`,
      generatorNodeId: ctx.nodeId,

      pathMode,
      geometrySummary: resolved.geometrySummary,
      anchors: resolved.anchors,

      parameterLineage,
      pointLineage,
      tags: inheritedTags,
      pointTags,
    },
  };
}

function makePointLineage({
  points,
  streams,
  parameterSources,
}) {
  return points.map((point) => ({
  index: point.index,

  // SVG-space point used by the rendered path.
  x: point.x,
  y: point.y,

  // User-space point before SVG y-direction conversion.
  userX: point.userX ?? point.x,
  userY: point.userY ?? -point.y,

    xLineage: makeSingleParamLineage({
      handleId: 'x',
      index: point.index,
      stream: streams.x,
      source: parameterSources.x,
      resolvedValue: point.x,
    }),

    yLineage: makeSingleParamLineage({
      handleId: 'y',
      index: point.index,
      stream: streams.y,
      source: parameterSources.y,
      resolvedValue: point.y,
    }),

    tags: collectTagsFromLineages([
      makeSingleParamLineage({
        handleId: 'x',
        index: point.index,
        stream: streams.x,
        source: parameterSources.x,
        resolvedValue: point.x,
      }),
      makeSingleParamLineage({
        handleId: 'y',
        index: point.index,
        stream: streams.y,
        source: parameterSources.y,
        resolvedValue: point.y,
      }),
    ]),
  }));
}

function collectPointTags(pointLineage) {
  const result = {};

  pointLineage.forEach((point) => {
    if (!point.tags) return;
    result[point.index] = point.tags;
  });

  return Object.keys(result).length > 0 ? result : null;
}

function getPointBounds(points) {
  if (!Array.isArray(points) || points.length === 0) return null;

  const xs = points.map((point) => point.x).filter(Number.isFinite);
  const ys = points.map((point) => point.y).filter(Number.isFinite);

  if (xs.length === 0 || ys.length === 0) return null;

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function makePathAnchors(points, bounds) {
  if (!Array.isArray(points) || points.length === 0) return {};

  const start = points[0];
  const end = points[points.length - 1];

  return {
    start: { x: start.x, y: start.y },
    end: { x: end.x, y: end.y },

    points: points.map((point) => ({
      index: point.index,
      x: point.x,
      y: point.y,
    })),

    bounds,
  };
}

function getCurve(curveType) {
  if (curveType === 'monotoneX') return curveMonotoneX;
  if (curveType === 'basis') return curveBasis;
  if (curveType === 'catmullRom') return curveCatmullRom;
  if (curveType === 'step') return curveStep;
  return curveLinear;
}

function makeParamStream({
  handleId,
  inputsByHandle,
  fallback,
  kind,
}) {
  const input = inputsByHandle?.[handleId]?.[0];
  const output = input?.value;

  if (!input || !output) {
    return {
      handleId,
      connected: false,
      kind: 'scalar',
      value: fallback,
      source: null,
    };
  }

  const normalized = normalizeOutputToStreamValues(output, kind);

  if (!normalized) {
    return {
      handleId,
      connected: false,
      kind: 'scalar',
      value: fallback,
      source: null,
    };
  }

  if (normalized.kind === 'array') {
    return {
      handleId,
      connected: true,
      kind: 'array',
      values: normalized.values,
      source: input,
    };
  }

  return {
    handleId,
    connected: true,
    kind: 'scalar',
    value: normalized.value,
    source: input,
  };
}

function makeGroupedInputStream({
  handleId,
  inputsByHandle,
}) {
  const input = inputsByHandle?.[handleId]?.[0];
  const output = input?.value;

  if (!input || !output) {
    return {
      handleId,
      connected: false,
      kind: 'missing',
      source: null,
    };
  }

  if (Array.isArray(output.values)) {
    return {
      handleId,
      connected: true,
      kind: 'array',
      values: output.values,
      source: input,
    };
  }

  if ('value' in output) {
    return {
      handleId,
      connected: true,
      kind: 'scalar',
      value: output.value,
      source: input,
    };
  }

  return {
    handleId,
    connected: true,
    kind: 'scalar',
    value: output,
    source: input,
  };
}

function normalizeOutputToStreamValues(output, kind) {
  if (Array.isArray(output.values)) {
    return {
      kind: 'array',
      values: output.values.map((value) => normalizeValue(value, kind)),
    };
  }

  if ('value' in output) {
    return {
      kind: 'scalar',
      value: normalizeValue(output.value, kind),
    };
  }

  return null;
}

function normalizeValue(value, kind) {
  if (kind === 'number') {
    return toNumber(value, 0);
  }

  if (kind === 'color') {
    return String(value ?? '#000000');
  }

  if (kind === 'text') {
    return String(value ?? '');
  }

  return value;
}

function getStreamLength(stream) {
  if (!stream) return 0;
  if (stream.kind === 'array') return stream.values.length;
  if (stream.kind === 'scalar') return 1;
  return 0;
}

function getStreamValue(stream, index, fallback) {
  if (!stream) return fallback;

  if (stream.kind === 'array') {
    if (stream.values.length === 0) return fallback;
    if (index < stream.values.length) return stream.values[index];
    return stream.values[stream.values.length - 1];
  }

  if (stream.kind === 'scalar') {
    return stream.value;
  }

  return fallback;
}

function collectParameterSources(inputsByHandle) {
  const result = {};

  Object.entries(inputsByHandle ?? {}).forEach(([handleId, inputs]) => {
    const input = inputs?.[0];

    if (!input?.value) return;

    result[handleId] = makeParameterSourceSummary({
      handleId,
      input,
    });
  });

  return result;
}

function makeParameterSourceSummary({
  handleId,
  input,
}) {
  const output = input.value;
  const meta = output.meta ?? {};
  const edge = input.edge ?? {};

  return {
    targetHandle: handleId,

    sourceNodeId: input.from ?? meta.sourceNodeId ?? null,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandleFromEdge: edge.targetHandle ?? handleId,

    edgeId: edge.id ?? null,

    outputType: output.outputType,
    dataType: output.dataType,
    parameterType: output.parameterType,

    parameterSpace: meta.scale ? 'scaled-visual' : 'visual',
    scale: meta.scale ?? null,

    items: meta.items ?? null,
    mappedItems: meta.mappedItems ?? null,

    tags: meta.tags ?? null,
    taggedItems: meta.taggedItems ?? null,

    label: meta.label ?? null,
    role: meta.role ?? null,

    provenance: inheritProvenance(output),
  };
}

function makeElementParameterLineage({
  index,
  streams,
  parameterSources,
  resolved,
}) {
  const handles = [
    'x',
    'y',
    'pathData',
    'stroke',
    'strokeWidth',
    'fill',
    'opacity',
    'style',
  ];

  const lineage = {};

  handles.forEach((handleId) => {
    const stream = streams?.[handleId];
    const source = parameterSources?.[handleId];

    lineage[handleId] = makeSingleParamLineage({
      handleId,
      index,
      stream,
      source,
      resolvedValue: getResolvedValueForHandle({
        handleId,
        resolved,
      }),
    });
  });

  return lineage;
}

function getResolvedValueForHandle({
  handleId,
  resolved,
}) {
  if (handleId === 'pathData') return resolved.d;
  if (handleId === 'stroke') return resolved.style?.strokeColor;
  if (handleId === 'strokeWidth') return resolved.style?.strokeWidth;
  if (handleId === 'fill') return resolved.style?.fillColor;
  if (handleId === 'opacity') return resolved.style?.opacity;
  return null;
}

function makeSingleParamLineage({
  handleId,
  index,
  stream,
  source,
  resolvedValue,
}) {
  const base = {
    handleId,
    connected: Boolean(stream?.connected && source),
    streamKind: stream?.kind ?? 'missing',

    resolvedValue,

    sourceIndex: null,

    sourceNodeId: source?.sourceNodeId ?? null,
    sourceHandle: source?.sourceHandle ?? null,
    edgeId: source?.edgeId ?? null,

    outputType: source?.outputType ?? null,
    dataType: source?.dataType ?? null,
    parameterType: source?.parameterType ?? null,

    scaleId: source?.scale?.scaleId ?? null,
    scaleType: source?.scale?.scaleType ?? null,
    scaleFamily: source?.scale?.scaleFamily ?? source?.scale?.d3?.scaleFamily ?? null,

    rawValue: null,
    scaleItem: null,
    mappedItem: null,
    tags: null,

    provenance: source?.provenance ?? [],
  };

  if (!stream || stream.kind === 'missing') {
    return {
      ...base,
      valueSource: 'fallback',
    };
  }

  if (stream.kind === 'scalar') {
    return {
      ...base,
      valueSource: source ? 'connected-scalar' : 'local-scalar',
      rawValue: stream.value,
    };
  }

  if (stream.kind === 'array') {
    const safeIndex = clampIndex(index, stream.values.length);
    const rawValue =
      safeIndex == null
        ? null
        : stream.values[safeIndex];

    return {
      ...base,
      valueSource: source ? 'connected-array' : 'local-array',
      sourceIndex: safeIndex,
      rawValue,

      scaleItem: getScaleItemForIndex(source, safeIndex),
      mappedItem: getMappedItemForIndex(source, safeIndex),
      tags: getTagsForIndex(source, safeIndex),
    };
  }

  return base;
}

function clampIndex(index, length) {
  if (!Number.isFinite(length) || length <= 0) return null;
  if (index < length) return index;
  return null;
}

function getScaleItemForIndex(source, index) {
  if (!source || index == null) return null;

  const items =
    source.items ??
    source.scale?.items ??
    source.meta?.items ??
    null;

  if (!Array.isArray(items)) return null;

  return items[index] ?? null;
}

function getMappedItemForIndex(source, index) {
  if (!source || index == null) return null;

  const mappedItems =
    source.mappedItems ??
    source.meta?.mappedItems ??
    null;

  if (!Array.isArray(mappedItems)) return null;

  return mappedItems[index] ?? null;
}

function getTagsForIndex(source, index) {
  if (!source || index == null) return null;

  const taggedItems =
    source.taggedItems ??
    source.meta?.taggedItems ??
    null;

  if (Array.isArray(taggedItems)) {
    return taggedItems[index]?.tags ?? null;
  }

  const mappedItems =
    source.mappedItems ??
    source.meta?.mappedItems ??
    null;

  if (Array.isArray(mappedItems)) {
    return mappedItems[index]?.tags ?? null;
  }

  const items =
    source.items ??
    source.meta?.items ??
    null;

  if (Array.isArray(items)) {
    return items[index]?.tags ?? null;
  }

  return source.tags ?? source.meta?.tags ?? null;
}

function collectElementTags({
  index,
  parameterLineage,
  parameterSources,
}) {
  const merged = {};

  Object.values(parameterLineage ?? {}).forEach((lineage) => {
    mergeTagsInto(merged, lineage?.tags);
    mergeTagsInto(merged, lineage?.scaleItem?.tags);
    mergeTagsInto(merged, lineage?.mappedItem?.tags);
  });

  Object.values(parameterSources ?? {}).forEach((source) => {
    const tags = getTagsForIndex(source, index);
    mergeTagsInto(merged, tags);
  });

  return Object.keys(merged).length > 0 ? merged : null;
}

function collectTagsFromLineages(lineages) {
  const merged = {};

  lineages.forEach((lineage) => {
    mergeTagsInto(merged, lineage?.tags);
    mergeTagsInto(merged, lineage?.scaleItem?.tags);
    mergeTagsInto(merged, lineage?.mappedItem?.tags);
  });

  return Object.keys(merged).length > 0 ? merged : null;
}

function mergeTagsInto(target, tags) {
  if (!tags || typeof tags !== 'object') return;

  Object.entries(tags).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      const existing = Array.isArray(target[key]) ? target[key] : [];
      target[key] = [...new Set([...existing, ...value])];
      return;
    }

    target[key] = value;
  });
}

function collectInputProvenanceFromSources(parameterSources) {
  const outputs = Object.values(parameterSources ?? {})
    .flatMap((source) => source.provenance ?? []);

  const seen = new Set();
  const result = [];

  outputs.forEach((entry) => {
    const key = `${entry.nodeId ?? ''}-${entry.role ?? ''}-${entry.label ?? ''}`;

    if (seen.has(key)) return;

    seen.add(key);
    result.push(entry);
  });

  return result;
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toSvgY(value, params = {}) {
  const n = Number(value);

  if (!Number.isFinite(n)) return 0;

  // Default user-facing coordinate system:
  // positive y means upward.
  if ((params.yDirection ?? 'up') === 'svg') {
    return n;
  }

  return -n;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}