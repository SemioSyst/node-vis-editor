import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

export function evalTextGenerator(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const inputsByHandle = ctx.inputs?.byTargetHandle ?? {};

  const parameterSources = collectParameterSources(inputsByHandle);

  const streams = {
    text: makeParamStream({
      handleId: 'text',
      inputsByHandle,
      fallback: p.defaultText ?? 'Label',
      kind: 'text',
    }),

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

    fontSize: makeParamStream({
      handleId: 'fontSize',
      inputsByHandle,
      fallback: p.fontSize ?? 12,
      kind: 'number',
    }),

    fill: makeParamStream({
      handleId: 'fill',
      inputsByHandle,
      fallback: p.fillColor ?? '#111111',
      kind: 'color',
    }),

    stroke: makeParamStream({
      handleId: 'stroke',
      inputsByHandle,
      fallback: p.strokeColor ?? '#000000',
      kind: 'color',
    }),

    strokeWidth: makeParamStream({
      handleId: 'strokeWidth',
      inputsByHandle,
      fallback: p.strokeWidth ?? 0,
      kind: 'number',
    }),

    opacity: makeParamStream({
      handleId: 'opacity',
      inputsByHandle,
      fallback: p.opacity ?? 1,
      kind: 'number',
    }),

    rotate: makeParamStream({
      handleId: 'rotate',
      inputsByHandle,
      fallback: p.rotate ?? 0,
      kind: 'number',
    }),

    layoutGapX: makeParamStream({
      handleId: 'layoutGapX',
      inputsByHandle,
      fallback: p.layoutGapX ?? 40,
      kind: 'number',
    }),

    layoutGapY: makeParamStream({
      handleId: 'layoutGapY',
      inputsByHandle,
      fallback: p.layoutGapY ?? 20,
      kind: 'number',
    }),

    style: makeGroupedInputStream({
      handleId: 'style',
      inputsByHandle,
    }),
  };

  const count = inferElementCount(streams);

  if (count <= 0) {
    warnings.push('TextGenerator resolved zero text elements.');
  }

  const children = [];

  for (let index = 0; index < count; index += 1) {
    const resolved = resolveTextParams({
      index,
      streams,
      params: p,
    });

    children.push(
      makeTextElement({
        ctx,
        index,
        resolved,
        streams,
        parameterSources,
      })
    );
  }

  const inputProvenance = collectInputProvenanceFromSources(parameterSources);

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'text-generator',
    outputType: 'visual',
    label: 'Text Generator Output',
    transform: {
      type: 'generate-text',
      count,
      renderMode: 'svg-text',
    },
  });

  return {
    outputType: 'visual',
    version: '0.1',

    root: {
      nodeType: 'collection',
      id: `${ctx.nodeId}-text-collection`,

      transform: {
        x: 0,
        y: 0,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
      },

      interaction: null,
      bindings: [],

      children,

      meta: {
        role: 'generated-text',
        tags: ['text-generator', 'text'],
        sourceNodeId: ctx.nodeId,
        parameterSources,
      },
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Text Generator Output',
      outputRole: 'generated-text-collection',
      warnings,
      resolvedCount: count,

      provenance: [
        ...inputProvenance,
        ownProvenanceEntry,
      ],

      parameterSources,
    },
  };
}

function makeTextElement({
  ctx,
  index,
  resolved,
  streams,
  parameterSources,
}) {
  const parameterLineage = makeElementParameterLineage({
    index,
    streams,
    parameterSources,
    resolved,
  });

  const inheritedTags = collectElementTags({
    index,
    parameterLineage,
    parameterSources,
  });

  return {
    nodeType: 'element',
    id: `${ctx.nodeId}-text-${index}`,

    // Technical role only. Binding logic should rely on lineage/tags/context.
    role: 'text',
    tags: ['text', 'svg-text'],

    dataRef: {
      index,
      collectionId: `${ctx.nodeId}-text-collection`,
      generatorNodeId: ctx.nodeId,

      inputValues: {
        x: resolved.x,
        // SVG-space y
        y: resolved.y,
        // User-space y before SVG conversion
        userY: resolved.userY,
        text: resolved.text,
        fontSize: resolved.fontSize,
        fontFamily: resolved.fontFamily,
        fontWeight: resolved.fontWeight,
        rotate: resolved.rotate,
        alignX: resolved.alignX,
        alignY: resolved.alignY,
        maxWidth: resolved.maxWidth,
        fill: resolved.fill,
        stroke: resolved.stroke,
        strokeWidth: resolved.strokeWidth,
        opacity: resolved.opacity,
      },

      parameterLineage,
      tags: inheritedTags,
    },

    elementType: 'text',

    frame: {
      x: resolved.x,
      y: resolved.y,
      width: resolved.maxWidth,
      height: 0,
      alignX: resolved.alignX,
      alignY: resolved.alignY,
    },

    transform: {
      x: 0,
      y: 0,
      rotate: resolved.rotate,
      scaleX: 1,
      scaleY: 1,
      origin: 'center',
    },

    content: {
      contentType: 'text',
      renderMode: 'svg-text',

      text: resolved.text,
      x: 0,
      y: 0,

      fontSize: resolved.fontSize,
      fontFamily: resolved.fontFamily,
      fontWeight: resolved.fontWeight,

      textAnchor: mapAlignXToTextAnchor(resolved.alignX),
      dominantBaseline: mapAlignYToDominantBaseline(resolved.alignY),

      maxWidth: resolved.maxWidth,
    },

    style: {
      fill: {
        type: 'solid',
        color: resolved.fill,
      },

      stroke: {
        enabled: resolved.strokeWidth > 0,
        color: resolved.stroke,
        width: resolved.strokeWidth,
      },

      opacity: resolved.opacity,
    },

    interaction: null,
    bindings: [],

    meta: {
      sourceNodeId: ctx.nodeId,
      elementIndex: index,
      collectionId: `${ctx.nodeId}-text-collection`,
      generatorNodeId: ctx.nodeId,

      parameterLineage,
      tags: inheritedTags,
    },
  };
}

function resolveTextParams({
  index,
  streams,
  params,
}) {
  const layoutAxis = params.layoutAxis ?? 'x';

  const fallbackX =
    layoutAxis === 'x'
      ? index * getStreamValue(streams.layoutGapX, index, params.layoutGapX ?? 40)
      : 0;

  const fallbackY =
    layoutAxis === 'y'
      ? index * getStreamValue(streams.layoutGapY, index, params.layoutGapY ?? 20)
      : 0;

  const x = getStreamValue(streams.x, index, params.defaultX ?? fallbackX);

  const userY = getStreamValue(
    streams.y,
    index,
    params.defaultY ?? fallbackY
  );

  const y = toSvgY(userY, params);

  const rawText = getStreamValue(streams.text, index, params.defaultText ?? 'Label');

  const fontSize = Math.max(
    1,
    toNumber(getStreamValue(streams.fontSize, index, params.fontSize ?? 12), 12)
  );

  const styleObject = getStreamValue(streams.style, index, null);

  const fill = styleObject?.fillColor ??
    styleObject?.fill ??
    getStreamValue(streams.fill, index, params.fillColor ?? '#111111');

  const stroke = styleObject?.strokeColor ??
    styleObject?.stroke ??
    getStreamValue(streams.stroke, index, params.strokeColor ?? '#000000');

  const strokeWidth = Math.max(
    0,
    toNumber(
      styleObject?.strokeWidth ??
        getStreamValue(streams.strokeWidth, index, params.strokeWidth ?? 0),
      0
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

  const rotate = toNumber(
    getStreamValue(streams.rotate, index, params.rotate ?? 0),
    0
  );

  const alignX = params.alignX ?? 'center';
  const alignY = params.alignY ?? 'center';

  const maxWidth = Math.max(0, toNumber(params.maxWidth ?? 0, 0));

  return {
    x: toNumber(x, 0),

    // SVG-space y used for rendering.
    y: toNumber(y, 0),

    // User-space y kept for future binding / animation / debug.
    userY: toNumber(userY, 0),

    text: formatTextValue({
      value: rawText,
      formatMode: params.formatMode ?? 'plain',
      decimalPlaces: clamp(Math.round(toNumber(params.decimalPlaces ?? 0, 0)), 0, 6),
      prefix: params.prefix ?? '',
      suffix: params.suffix ?? '',
    }),

    fontSize,
    fontFamily: params.fontFamily ?? 'sans-serif',
    fontWeight: params.fontWeight ?? 'normal',

    rotate,
    alignX,
    alignY,
    maxWidth,

    fill,
    stroke,
    strokeWidth,
    opacity,
  };
}

function formatTextValue({
  value,
  formatMode,
  decimalPlaces,
  prefix,
  suffix,
}) {
  if (formatMode === 'number') {
    const n = Number(value);

    if (Number.isFinite(n)) {
      return `${prefix}${n.toFixed(decimalPlaces)}${suffix}`;
    }
  }

  if (formatMode === 'percent') {
    const n = Number(value);

    if (Number.isFinite(n)) {
      return `${prefix}${(n * 100).toFixed(decimalPlaces)}%${suffix}`;
    }
  }

  return `${prefix}${String(value ?? '')}${suffix}`;
}

function mapAlignXToTextAnchor(alignX) {
  if (alignX === 'left') return 'start';
  if (alignX === 'right') return 'end';
  return 'middle';
}

function mapAlignYToDominantBaseline(alignY) {
  if (alignY === 'top') return 'hanging';
  if (alignY === 'bottom') return 'auto';
  if (alignY === 'baseline') return 'alphabetic';
  return 'middle';
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

function inferElementCount(streams) {
  const lengths = Object.values(streams)
    .filter((stream) => stream?.kind === 'array')
    .map((stream) => stream.values.length)
    .filter((length) => length > 0);

  if (lengths.length === 0) return 1;

  return Math.max(...lengths);
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
    'text',
    'x',
    'y',
    'fontSize',
    'fill',
    'stroke',
    'strokeWidth',
    'opacity',
    'rotate',
    'layoutGapX',
    'layoutGapY',
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
      resolvedValue: resolved?.[handleId],
    });
  });

  return lineage;
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

  if ((params.yDirection ?? 'up') === 'svg') {
    return n;
  }

  return -n;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}