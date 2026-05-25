import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

const MATRIX_PRIMARY_HANDLE_ORDER = [
  'text',
  'x',
  'y',
  'fontSize',
  'fill',
  'opacity',
  'strokeWidth',
  'stroke',
  'rotate',
];

const MATRIX_ARRAY_RESOLVE_ORDER = {
  x: ['cell', 'column', 'row'],
  y: ['cell', 'row', 'column'],

  text: ['cell', 'row', 'column'],
  fontSize: ['cell', 'row', 'column'],
  fill: ['cell', 'row', 'column'],
  stroke: ['cell', 'row', 'column'],
  strokeWidth: ['cell', 'row', 'column'],
  opacity: ['cell', 'row', 'column'],
  rotate: ['cell', 'row', 'column'],

  default: ['cell', 'row', 'column'],
};

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

  const matrixContext = detectMatrixContext(streams, warnings);
  const count = inferElementCount(streams, matrixContext);

  if (count <= 0) {
    warnings.push('TextGenerator resolved zero text elements.');
  }

  const children = [];

  for (let index = 0; index < count; index += 1) {
    const elementContext = makeElementContext({
      index,
      matrixContext,
    });

    const resolved = resolveTextParams({
      index,
      streams,
      params: p,
      elementContext,
    });

    children.push(
      makeTextElement({
        ctx,
        index,
        resolved,
        streams,
        parameterSources,
        elementContext,
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
        resolved: {
          count,
          matrix: matrixContext
            ? {
                rows: matrixContext.rows,
                cols: matrixContext.cols,
                flatCount: matrixContext.flatCount,
                sourceHandle: matrixContext.sourceHandle,
              }
            : null,
        },
        parameterSources,
      },
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Text Generator Output',
      outputRole: 'generated-text-collection',
      warnings,
      resolvedCount: count,
      matrixContext: matrixContext
        ? {
            rows: matrixContext.rows,
            cols: matrixContext.cols,
            flatCount: matrixContext.flatCount,
            sourceHandle: matrixContext.sourceHandle,
            rowLabels: matrixContext.rowLabels ?? null,
            colLabels: matrixContext.colLabels ?? null,
          }
        : null,

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
  elementContext,
}) {
  const parameterLineage = makeElementParameterLineage({
    index,
    streams,
    parameterSources,
    resolved,
    elementContext,
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
      flatIndex: elementContext?.flatIndex ?? index,
      rowIndex: elementContext?.rowIndex ?? null,
      colIndex: elementContext?.colIndex ?? null,
      matrixItem: elementContext?.matrixItem ?? null,
      matrixContext: elementContext?.matrix ?? null,

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
      flatIndex: elementContext?.flatIndex ?? index,
      rowIndex: elementContext?.rowIndex ?? null,
      colIndex: elementContext?.colIndex ?? null,
      matrixContext: elementContext?.matrix ?? null,
      matrixItem: elementContext?.matrixItem ?? null,

      parameterLineage,
      tags: inheritedTags,
    },
  };
}

function resolveTextParams({
  index,
  streams,
  params,
  elementContext,
}) {
  const layoutAxis = params.layoutAxis ?? 'x';
  const hasXInput = streams.x?.connected;
  const hasYInput = streams.y?.connected;
  const gapX = getStreamValue(streams.layoutGapX, 0, params.layoutGapX ?? 40);
  const gapY = getStreamValue(streams.layoutGapY, 0, params.layoutGapY ?? 20);

  let fallbackX =
    layoutAxis === 'x'
      ? index * gapX
      : 0;

  let fallbackY =
    layoutAxis === 'y'
      ? index * gapY
      : 0;

  if (elementContext?.matrix) {
    fallbackX = hasXInput ? Number(params.defaultX ?? 0) : (elementContext.colIndex ?? 0) * gapX;
    // Matrix rows are table-like: row 0 is top, later rows go downward.
    // User-facing y is upward-positive, so downward rows use negative userY.
    fallbackY = hasYInput ? Number(params.defaultY ?? 0) : -(elementContext.rowIndex ?? 0) * gapY;
  }

  const x = hasXInput
    ? getStreamValue(streams.x, index, fallbackX, elementContext)
    : fallbackX;

  const userY = hasYInput
    ? getStreamValue(
        streams.y,
        index,
        fallbackY,
        elementContext
      )
    : fallbackY;

  const y = toSvgY(userY, params);

  const rawText = getStreamValue(streams.text, index, params.defaultText ?? 'Label', elementContext);

  const fontSize = Math.max(
    1,
    toNumber(getStreamValue(streams.fontSize, index, params.fontSize ?? 12, elementContext), 12)
  );

  const styleObject = getStreamValue(streams.style, index, null, elementContext);

  const fill = styleObject?.fillColor ??
    styleObject?.fill ??
    getStreamValue(streams.fill, index, params.fillColor ?? '#111111', elementContext);

  const stroke = styleObject?.strokeColor ??
    styleObject?.stroke ??
    getStreamValue(streams.stroke, index, params.strokeColor ?? '#000000', elementContext);

  const strokeWidth = Math.max(
    0,
    toNumber(
      styleObject?.strokeWidth ??
        getStreamValue(streams.strokeWidth, index, params.strokeWidth ?? 0, elementContext),
      0
    )
  );

  const opacity = clamp(
    toNumber(
      styleObject?.opacity ??
        getStreamValue(streams.opacity, index, params.opacity ?? 1, elementContext),
      1
    ),
    0,
    1
  );

  const rotate = toNumber(
    getStreamValue(streams.rotate, index, params.rotate ?? 0, elementContext),
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
      length: 1,
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
      length: 1,
      source: null,
    };
  }

  if (normalized.kind === 'array') {
    return {
      handleId,
      connected: true,
      kind: 'array',
      values: normalized.values,
      length: normalized.values.length,
      matrix: normalized.matrix ?? null,
      source: input,
    };
  }

  return {
    handleId,
    connected: true,
    kind: 'scalar',
    value: normalized.value,
    length: 1,
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
      length: 0,
      source: null,
    };
  }

  if (Array.isArray(output.values)) {
    const matrix = normalizeOutputToMatrix(output);

    return {
      handleId,
      connected: true,
      kind: 'array',
      values: matrix?.values ?? output.values,
      length: matrix?.values?.length ?? output.values.length,
      matrix,
      source: input,
    };
  }

  if ('value' in output) {
    return {
      handleId,
      connected: true,
      kind: 'scalar',
      value: output.value,
      length: 1,
      source: input,
    };
  }

  return {
    handleId,
    connected: true,
    kind: 'scalar',
    value: output,
    length: 1,
    source: input,
  };
}

function normalizeOutputToStreamValues(output, kind) {
  const matrix = normalizeOutputToMatrix(output);

  if (matrix) {
    return {
      kind: 'array',
      values: matrix.values.map((value) => normalizeValue(value, kind)),
      matrix,
    };
  }

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

function normalizeOutputToMatrix(output) {
  if (!output) return null;

  if (output.outputType === 'data' && output.dataType === 'matrix') {
    return normalizeMatrixInput({
      rawValue: output.values,
      meta: output.meta ?? {},
    });
  }

  if (output.outputType === 'parameter' && output.parameterType === 'matrix') {
    return normalizeMatrixInput({
      rawValue: output.values,
      meta: output.meta ?? {},
    });
  }

  if (
    Array.isArray(output.values) &&
    output.meta?.matrix &&
    Number.isFinite(Number(output.meta.matrix.rows)) &&
    Number.isFinite(Number(output.meta.matrix.cols))
  ) {
    return normalizeMatrixInput({
      rawValue: output.values,
      meta: output.meta ?? {},
    });
  }

  return null;
}

function normalizeMatrixInput({ rawValue, meta = {} }) {
  if (isNestedArray(rawValue)) {
    return normalizeNestedMatrix({
      values2D: rawValue,
      meta,
    });
  }

  if (
    Array.isArray(rawValue) &&
    meta?.matrix &&
    Number.isFinite(Number(meta.matrix.rows)) &&
    Number.isFinite(Number(meta.matrix.cols))
  ) {
    return normalizeFlatMatrix({
      values: rawValue,
      meta,
    });
  }

  return null;
}

function isNestedArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.some((item) => Array.isArray(item))
  );
}

function normalizeNestedMatrix({ values2D, meta = {} }) {
  const rows = values2D.length;
  const cols = Math.max(
    0,
    ...values2D.map((row) => (Array.isArray(row) ? row.length : 0))
  );

  const rowLabels = meta.matrix?.rowLabels ?? null;
  const colLabels = meta.matrix?.colLabels ?? null;

  const values = [];
  const items = [];

  values2D.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) return;

    row.forEach((value, colIndex) => {
      const flatIndex = values.length;

      values.push(value);
      items.push({
        flatIndex,
        index: flatIndex,
        rowIndex,
        colIndex,
        rowLabel: rowLabels?.[rowIndex] ?? null,
        colLabel: colLabels?.[colIndex] ?? null,
        value,
        tags: getMatrixItemTags({
          meta,
          flatIndex,
          rowIndex,
          colIndex,
        }),
      });
    });
  });

  return {
    rows,
    cols,
    flatCount: values.length,
    values,
    items,
    rowLabels,
    colLabels,
    order: meta.matrix?.order ?? 'row-major',
  };
}

function normalizeFlatMatrix({ values, meta = {} }) {
  const rows = Number(meta.matrix.rows);
  const cols = Number(meta.matrix.cols);

  const rowLabels = meta.matrix.rowLabels ?? null;
  const colLabels = meta.matrix.colLabels ?? null;
  const matrixItems = meta.matrixItems ?? meta.mappedItems ?? meta.items ?? null;

  const items = values.map((value, flatIndex) => {
    const existing = Array.isArray(matrixItems) ? matrixItems[flatIndex] : null;
    const rowIndex = existing?.rowIndex ?? Math.floor(flatIndex / cols);
    const colIndex = existing?.colIndex ?? flatIndex % cols;

    return {
      flatIndex,
      index: flatIndex,
      rowIndex,
      colIndex,
      rowLabel: existing?.rowLabel ?? rowLabels?.[rowIndex] ?? null,
      colLabel: existing?.colLabel ?? colLabels?.[colIndex] ?? null,
      value: existing?.value ?? value,
      rawValue: existing?.rawValue ?? value,
      mappedValue: existing?.mappedValue ?? null,
      tags:
        existing?.tags ??
        getMatrixItemTags({
          meta,
          flatIndex,
          rowIndex,
          colIndex,
        }),
    };
  });

  return {
    rows,
    cols,
    flatCount: values.length,
    values,
    items,
    rowLabels,
    colLabels,
    order: meta.matrix.order ?? 'row-major',
  };
}

function getMatrixItemTags({ meta, flatIndex, rowIndex, colIndex }) {
  const taggedItems = meta?.taggedItems;

  if (Array.isArray(taggedItems)) {
    const byFlat = taggedItems.find((item) =>
      item.flatIndex === flatIndex || item.index === flatIndex
    );

    if (byFlat?.tags) return byFlat.tags;

    const byRowCol = taggedItems.find((item) =>
      item.rowIndex === rowIndex && item.colIndex === colIndex
    );

    if (byRowCol?.tags) return byRowCol.tags;
  }

  return meta?.tags ?? null;
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

function inferElementCount(streams, matrixContext = null) {
  if (matrixContext) {
    return matrixContext.flatCount;
  }

  const lengths = Object.values(streams)
    .filter((stream) => stream?.kind === 'array')
    .map((stream) => stream.values.length)
    .filter((length) => length > 0);

  if (lengths.length === 0) return 1;

  return Math.max(...lengths);
}

function detectMatrixContext(streams, warnings) {
  for (const handleId of MATRIX_PRIMARY_HANDLE_ORDER) {
    const stream = streams?.[handleId];

    if (stream?.matrix) {
      warnMatrixShapeMismatches({
        primaryHandle: handleId,
        primaryMatrix: stream.matrix,
        streams,
        warnings,
      });

      return {
        ...stream.matrix,
        sourceHandle: handleId,
      };
    }
  }

  const anyMatrixEntry = Object.entries(streams ?? {}).find(([, stream]) => stream?.matrix);

  if (!anyMatrixEntry) return null;

  const [handleId, stream] = anyMatrixEntry;

  warnMatrixShapeMismatches({
    primaryHandle: handleId,
    primaryMatrix: stream.matrix,
    streams,
    warnings,
  });

  return {
    ...stream.matrix,
    sourceHandle: handleId,
  };
}

function warnMatrixShapeMismatches({
  primaryHandle,
  primaryMatrix,
  streams,
  warnings,
}) {
  Object.entries(streams ?? {}).forEach(([handleId, stream]) => {
    if (!stream?.matrix) return;
    if (handleId === primaryHandle) return;

    if (
      stream.matrix.rows !== primaryMatrix.rows ||
      stream.matrix.cols !== primaryMatrix.cols
    ) {
      warnings.push(
        `Matrix shape mismatch: "${primaryHandle}" is ${primaryMatrix.rows}x${primaryMatrix.cols}, but "${handleId}" is ${stream.matrix.rows}x${stream.matrix.cols}. Using "${primaryHandle}" as primary matrix context.`
      );
    }
  });
}

function makeElementContext({ index, matrixContext }) {
  if (!matrixContext) {
    return {
      index,
      flatIndex: index,
      rowIndex: null,
      colIndex: null,
      matrixItem: null,
      matrix: null,
    };
  }

  const fallbackRowIndex = Math.floor(index / matrixContext.cols);
  const fallbackColIndex = index % matrixContext.cols;

  const matrixItem =
    matrixContext.items?.[index] ??
    {
      flatIndex: index,
      index,
      rowIndex: fallbackRowIndex,
      colIndex: fallbackColIndex,
      rowLabel: matrixContext.rowLabels?.[fallbackRowIndex] ?? null,
      colLabel: matrixContext.colLabels?.[fallbackColIndex] ?? null,
      value: matrixContext.values?.[index],
      tags: null,
    };

  return {
    index,
    flatIndex: matrixItem.flatIndex ?? index,
    rowIndex: matrixItem.rowIndex ?? fallbackRowIndex,
    colIndex: matrixItem.colIndex ?? fallbackColIndex,
    matrixItem,
    matrix: {
      rows: matrixContext.rows,
      cols: matrixContext.cols,
      flatCount: matrixContext.flatCount,
      rowLabels: matrixContext.rowLabels ?? null,
      colLabels: matrixContext.colLabels ?? null,
      sourceHandle: matrixContext.sourceHandle,
    },
  };
}

function getStreamValue(stream, index, fallback, elementContext = null) {
  if (!stream) return fallback;

  if (stream.kind === 'array') {
    if (stream.values.length === 0) return fallback;
    const resolvedIndex = resolveArrayIndexForContext({
      handleId: stream.handleId,
      stream,
      index,
      elementContext,
    });

    if (resolvedIndex != null && resolvedIndex < stream.values.length) {
      return stream.values[resolvedIndex];
    }

    return stream.values[stream.values.length - 1];
  }

  if (stream.kind === 'scalar') {
    return stream.value;
  }

  return fallback;
}

function resolveArrayIndexForContext({
  handleId,
  stream,
  index,
  elementContext,
}) {
  if (!stream || stream.kind !== 'array') return null;

  if (!elementContext?.matrix) {
    return index < stream.values.length ? index : null;
  }

  const matrix = elementContext.matrix;
  const preferences =
    MATRIX_ARRAY_RESOLVE_ORDER[handleId] ??
    MATRIX_ARRAY_RESOLVE_ORDER.default;

  if (stream.matrix) {
    return elementContext.flatIndex < stream.values.length
      ? elementContext.flatIndex
      : null;
  }

  for (const preference of preferences) {
    if (preference === 'cell' && stream.values.length === matrix.flatCount) {
      return elementContext.flatIndex;
    }

    if (preference === 'column' && stream.values.length === matrix.cols) {
      return elementContext.colIndex;
    }

    if (preference === 'row' && stream.values.length === matrix.rows) {
      return elementContext.rowIndex;
    }
  }

  return index < stream.values.length ? index : null;
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
    matrix: meta.matrix ?? null,
    matrixItems: meta.matrixItems ?? null,

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
  elementContext,
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
      elementContext,
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
  elementContext,
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
    matrixRole: null,
    matrixItem: null,
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
    const safeIndex = resolveArrayIndexForContext({
      handleId,
      stream,
      index,
      elementContext,
    });
    const rawValue =
      safeIndex == null
        ? null
        : stream.values[safeIndex];
    const matrixItem = getMatrixItemForResolvedIndex({
      stream,
      resolvedIndex: safeIndex,
      elementContext,
    });

    return {
      ...base,
      valueSource: source ? 'connected-array' : 'local-array',
      sourceIndex: safeIndex,
      rawValue,

      matrixRole: inferMatrixRoleForResolvedIndex({
        stream,
        resolvedIndex: safeIndex,
        elementContext,
      }),
      matrixItem,
      scaleItem: getScaleItemForIndex(source, safeIndex),
      mappedItem: getMappedItemForIndex(source, safeIndex),
      tags: mergeTagObjects(
        getTagsForIndex(source, safeIndex),
        matrixItem?.tags
      ),
    };
  }

  return base;
}

function inferMatrixRoleForResolvedIndex({
  stream,
  resolvedIndex,
  elementContext,
}) {
  if (!elementContext?.matrix || resolvedIndex == null) return null;

  if (stream?.matrix) return 'cell';

  const matrix = elementContext.matrix;

  if (resolvedIndex === elementContext.flatIndex && stream.values.length === matrix.flatCount) {
    return 'cell';
  }

  if (resolvedIndex === elementContext.colIndex && stream.values.length === matrix.cols) {
    return 'column';
  }

  if (resolvedIndex === elementContext.rowIndex && stream.values.length === matrix.rows) {
    return 'row';
  }

  return null;
}

function getMatrixItemForResolvedIndex({
  stream,
  resolvedIndex,
  elementContext,
}) {
  if (!elementContext?.matrix || resolvedIndex == null) return null;

  if (stream?.matrix) {
    return stream.matrix.items?.[resolvedIndex] ?? null;
  }

  return elementContext.matrixItem ?? null;
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
    mergeTagsInto(merged, lineage?.matrixItem?.tags);
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

function mergeTagObjects(...tagObjects) {
  const merged = {};

  tagObjects.forEach((tags) => {
    if (!tags || typeof tags !== 'object') return;

    Object.entries(tags).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (Array.isArray(value)) {
        const existing = Array.isArray(merged[key]) ? merged[key] : [];
        merged[key] = [...new Set([...existing, ...value])];
        return;
      }

      merged[key] = value;
    });
  });

  return Object.keys(merged).length > 0 ? merged : null;
}
