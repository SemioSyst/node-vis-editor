// src/evaluator/generators/evalShapeGenerator.js
import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

const STRUCTURAL_HANDLES = [
  'x',
  'y',
  'width',
  'height',
  'radius',
  'cornerRadius',
  'alignX',
  'alignY',
];

const STYLE_HANDLES = [
  'fill',
  'stroke',
  'strokeWidth',
  'opacity',
];

const LAYOUT_HANDLES = [
  'layoutGapX',
  'layoutGapY',
];

const MATRIX_PRIMARY_HANDLE_ORDER = [
  'x',
  'y',
  'width',
  'height',
  'radius',
  'cornerRadius',
  'fill',
  'opacity',
  'strokeWidth',
  'stroke',
];

const MATRIX_ARRAY_RESOLVE_ORDER = {
  x: ['cell', 'column', 'row'],
  y: ['cell', 'row', 'column'],

  width: ['cell', 'column', 'row'],
  height: ['cell', 'row', 'column'],

  radius: ['cell', 'row', 'column'],
  cornerRadius: ['cell', 'row', 'column'],

  fill: ['cell', 'row', 'column'],
  stroke: ['cell', 'row', 'column'],
  strokeWidth: ['cell', 'row', 'column'],
  opacity: ['cell', 'row', 'column'],

  default: ['cell', 'row', 'column'],
};

export function evalShapeGenerator(ctx) {
  const params = ctx.params ?? {};
  const warnings = [];

  const shapeType = params.shapeType ?? 'rect';

  const inputsByHandle = ctx.inputs?.byTargetHandle ?? {};

  const hasFrameInput = hasHandleInput(inputsByHandle, 'frame');
  const hasStyleInput = hasHandleInput(inputsByHandle, 'style');

  const parameterSources = collectParameterSources(inputsByHandle, [
    'x',
    'y',
    'width',
    'height',
    'radius',
    'cornerRadius',
    'alignX',
    'alignY',
    'fill',
    'stroke',
    'strokeWidth',
    'opacity',
    'layoutGapX',
    'layoutGapY',
    'frame',
    'style',
  ]);

  const streams = buildParamStreams({
    ctx,
    params,
    inputsByHandle,
    hasFrameInput,
    hasStyleInput,
    warnings,
  });

  const matrixContext = detectMatrixContext(streams, warnings);
  const layoutMode = getLayoutMode(params);

  if (layoutMode === 'matrixGrid' && !matrixContext) {
    warnings.push(
      'Matrix Grid layout selected but no matrix input is connected. Falling back to Linear X layout.'
    );
  }

  const count = inferElementCount(streams, warnings, matrixContext);

  const children = [];

  for (let index = 0; index < count; index++) {
    const elementContext = makeElementContext({
      index,
      matrixContext,
    });

    const resolved = resolveElementParams({
      index,
      shapeType,
      params,
      streams,
      hasFrameInput,
      hasStyleInput,
      elementContext,
    });

    children.push(makeShapeElement({
      ctx,
      index,
      shapeType,
      resolved,
      streams,
      parameterSources,
      elementContext,
    }));
  }

    const inputProvenance = collectInputProvenanceFromSources(parameterSources);

    const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'shape-generator',
    outputType: 'visual',
    label: 'Generated Shape Collection',
    transform: {
        type: 'generate-visual-elements',
        shapeType,
        count,
    },
    });

  return {
    outputType: 'visual',
    version: '0.1',

    root: {
        nodeType: 'collection',
        id: `${ctx.nodeId}-collection`,

        transform: {
        x: 0,
        y: 0,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        origin: 'center',
        },

        interaction: null,
        bindings: [],

        children,

        meta: {
        role: 'generated-shapes',
        tags: ['shape-generator', shapeType],
        sourceNodeId: ctx.nodeId,

        layout: makeLayoutMeta({
          params,
          matrixContext,
        }),

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
        label: 'Shape Generator Output',
        outputRole: 'generated-visual-collection',
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

/**
 * Build all parameter streams.
 * Each stream can be:
 * - scalar
 * - array
 * - missing
 */
function buildParamStreams({
  ctx,
  params,
  inputsByHandle,
  hasFrameInput,
  hasStyleInput,
  warnings,
}) {
  const streams = {};

  // Advanced grouped input: frame
    const frameOutput = getFirstInputValue(inputsByHandle, 'frame');
    if (frameOutput) {
    const frameFields = extractFieldSet(frameOutput, 'frame');

    if (frameFields) {
        streams.x = makeStreamFromRawValue(frameFields.x, 'x', 'structural');
        streams.y = makeStreamFromRawValue(frameFields.y, 'y', 'structural');
        streams.width = makeStreamFromRawValue(frameFields.width, 'width', 'structural');
        streams.height = makeStreamFromRawValue(frameFields.height, 'height', 'structural');

        // New frame alignment fields.
        streams.alignX = makeStreamFromRawValue(frameFields.alignX, 'alignX', 'structural');
        streams.alignY = makeStreamFromRawValue(frameFields.alignY, 'alignY', 'structural');

        // Optional backward compatibility for older "anchor" field.
        if ((frameFields.alignX == null || frameFields.alignY == null) && frameFields.anchor) {
            const align = parseAnchor(frameFields.anchor);
            if (frameFields.alignX == null) {
                streams.alignX = makeStreamFromRawValue(align.x, 'alignX', 'structural');
            }
            if (frameFields.alignY == null) {
                streams.alignY = makeStreamFromRawValue(align.y, 'alignY', 'structural');
            }
        }
    } else {
        warnings.push('Frame input connected but no readable frame fields were found.');
    }
    }

  // Advanced grouped input: style
  const styleOutput = getFirstInputValue(inputsByHandle, 'style');
  if (styleOutput) {
    const styleFields = extractFieldSet(styleOutput, 'style');

    if (styleFields) {
      streams.fill = makeStreamFromRawValue(styleFields.fill, 'fill', 'style');
      streams.stroke = makeStreamFromRawValue(styleFields.stroke, 'stroke', 'style');
      streams.strokeWidth = makeStreamFromRawValue(styleFields.strokeWidth, 'strokeWidth', 'style');
      streams.opacity = makeStreamFromRawValue(styleFields.opacity, 'opacity', 'style');
    } else {
      warnings.push('Style input connected but no readable style fields were found.');
    }
  }

  // Low-level property inputs.
  // In v0.1, advanced grouped inputs win over low-level inputs.
  for (const handle of STRUCTURAL_HANDLES) {
    if (hasFrameInput && ['x', 'y', 'width', 'height', 'alignX', 'alignY'].includes(handle)) {
        if (hasHandleInput(inputsByHandle, handle)) {
            warnings.push(`"${handle}" input ignored because frame input is active.`);
        }
        continue;
    }

    const output = getFirstInputValue(inputsByHandle, handle);
    if (output) {
      streams[handle] = makeStreamFromOutput(output, handle, 'structural', warnings);
    }
  }

  for (const handle of STYLE_HANDLES) {
    if (hasStyleInput) {
      if (hasHandleInput(inputsByHandle, handle)) {
        warnings.push(`"${handle}" input ignored because style input is active.`);
      }
      continue;
    }

    const output = getFirstInputValue(inputsByHandle, handle);
    if (output) {
      streams[handle] = makeStreamFromOutput(output, handle, 'style', warnings);
    }
  }

  // Layout inputs.
  // These do not normally decide element count, but can drive fallback layout spacing.
  for (const handle of LAYOUT_HANDLES) {
    const output = getFirstInputValue(inputsByHandle, handle);

    if (output) {
      streams[handle] = makeStreamFromOutput(output, handle, 'layout', warnings);
    }
  }

  // Data input can still help infer count if connected.
  const dataOutput = getFirstInputValue(inputsByHandle, 'data');
  if (dataOutput) {
    streams.data = makeStreamFromOutput(dataOutput, 'data', 'data', warnings);
  }

  return streams;
}

function hasHandleInput(inputsByHandle, handleId) {
  return Boolean(inputsByHandle?.[handleId]?.length);
}

function getFirstInputValue(inputsByHandle, handleId) {
  return inputsByHandle?.[handleId]?.[0]?.value ?? null;
}

/**
 * Convert data/parameter output into a generic stream.
 */
function makeStreamFromOutput(output, targetHandle, role, warnings) {
  if (!output) {
    return makeMissingStream(targetHandle, role);
  }

  if (output.outputType === 'parameter' && output.fields) {
    const fieldValue = output.fields[targetHandle];

    if (fieldValue !== undefined) {
      return makeStreamFromRawValue(fieldValue, targetHandle, role, output.meta ?? {});
    }

    warnings.push(`Input for "${targetHandle}" has fields but no field named "${targetHandle}".`);
    return makeMissingStream(targetHandle, role);
  }

  if (output.outputType === 'data') {
    if (output.dataType === 'matrix') {
      return makeStreamFromRawValue(output.values, targetHandle, role, output.meta ?? {});
    }

    if (output.dataType === 'array') {
      return makeStreamFromRawValue(output.values, targetHandle, role, output.meta ?? {});
    }

    if (output.dataType === 'number') {
      return makeStreamFromRawValue(output.value, targetHandle, role, output.meta ?? {});
    }

    warnings.push(`Data input for "${targetHandle}" has unsupported dataType "${output.dataType}".`);
    return makeMissingStream(targetHandle, role);
  }

  if (output.outputType === 'parameter') {
    if (output.parameterType === 'matrix') {
      return makeStreamFromRawValue(output.values, targetHandle, role, output.meta ?? {});
    }

    if ('values' in output) {
      return makeStreamFromRawValue(output.values, targetHandle, role, output.meta ?? {});
    }

    if ('value' in output) {
      return makeStreamFromRawValue(output.value, targetHandle, role, output.meta ?? {});
    }

    warnings.push(`Parameter input for "${targetHandle}" has no value or values.`);
    return makeMissingStream(targetHandle, role);
  }

  warnings.push(`Input for "${targetHandle}" has unsupported outputType "${output.outputType}".`);
  return makeMissingStream(targetHandle, role);
}

function extractFieldSet(output, expectedFieldSetType) {
  if (!output) return null;

  if (output.outputType !== 'parameter') return null;

  if (output.parameterType === 'fieldSet' && output.fieldSetType === expectedFieldSetType) {
    return output.fields ?? null;
  }

  // Allow specialized names later, e.g. frameField/styleField.
  if (expectedFieldSetType === 'frame' && output.parameterType === 'frameField') {
    return output.fields ?? null;
  }

  if (expectedFieldSetType === 'style' && output.parameterType === 'styleField') {
    return output.fields ?? null;
  }

  return null;
}

function makeStreamFromRawValue(rawValue, handleId, role, meta = {}) {
  if (rawValue === undefined || rawValue === null) {
    return makeMissingStream(handleId, role);
  }

  const matrix = normalizeMatrixInput({
    rawValue,
    meta,
  });

  if (matrix) {
    return {
      handleId,
      role,
      kind: 'array',
      values: matrix.values,
      length: matrix.values.length,
      connected: true,
      matrix,
    };
  }

  if (Array.isArray(rawValue)) {
    return {
      handleId,
      role,
      kind: 'array',
      values: rawValue,
      length: rawValue.length,
      connected: true,
    };
  }

  return {
    handleId,
    role,
    kind: 'scalar',
    value: rawValue,
    length: 1,
    connected: true,
  };
}

function makeMissingStream(handleId, role) {
  return {
    handleId,
    role,
    kind: 'missing',
    connected: false,
    length: 0,
  };
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

      const baseItem = {
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
      };

      values.push(value);
      items.push(baseItem);
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

  const matrixItems =
    meta.matrixItems ??
    meta.mappedItems ??
    meta.items ??
    null;

  const items = values.map((value, flatIndex) => {
    const existing = Array.isArray(matrixItems) ? matrixItems[flatIndex] : null;

    const rowIndex =
      existing?.rowIndex ??
      Math.floor(flatIndex / cols);

    const colIndex =
      existing?.colIndex ??
      flatIndex % cols;

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

/**
 * Count rule v0.2:
 * 1. Structural arrays decide count by shortest length.
 * 2. If no structural arrays, data array can decide count.
 * 3. Style arrays do not decide count by themselves.
 * 4. Otherwise count = 1.
 * 5. If matrix context is provided, use its flatCount.
 * 
 */
function inferElementCount(streams, warnings, matrixContext = null) {
  if (matrixContext) {
    return matrixContext.flatCount;
  }

  const structuralArrays = Object.values(streams).filter(
    (s) => s?.role === 'structural' && s.kind === 'array'
  );

  if (structuralArrays.length > 0) {
    const lengths = structuralArrays.map((s) => s.length);
    const min = Math.min(...lengths);
    const max = Math.max(...lengths);

    if (min !== max) {
      warnings.push(
        `Structural input length mismatch (${lengths.join(', ')}). Using shortest length ${min}.`
      );
    }

    return Math.max(0, min);
  }

  if (streams.data?.kind === 'array') {
    return streams.data.length;
  }

  return 1;
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

function resolveElementParams({
  index,
  shapeType,
  params,
  streams,
  elementContext,
}) {
  const layoutPoint = resolveLocalLayoutPoint(index, params, streams, elementContext);

  const x = resolveParam({
    handleId: 'x',
    stream: streams.x,
    index,
    fallback: layoutPoint.x ?? params.defaultX ?? 0,
    repeatStyle: false,
    elementContext,
  });

  const userY = resolveParam({
    handleId: 'y',
    stream: streams.y,
    index,
    fallback: layoutPoint.y ?? params.defaultY ?? 0,
    repeatStyle: false,
    elementContext,
  });

  const y = toSvgY(userY, params);

  const width = resolveParam({
    handleId: 'width',
    stream: streams.width,
    index,
    fallback: params.defaultWidth ?? 12,
    repeatStyle: false,
    elementContext,
  });

  const height = resolveParam({
    handleId: 'height',
    stream: streams.height,
    index,
    fallback: params.defaultHeight ?? 40,
    repeatStyle: false,
    elementContext,
  });

  const radius = resolveParam({
    handleId: 'radius',
    stream: streams.radius,
    index,
    fallback: params.defaultRadius ?? 8,
    repeatStyle: false,
    elementContext,
  });

  const cornerRadius = resolveParam({
    handleId: 'cornerRadius',
    stream: streams.cornerRadius,
    index,
    fallback: params.cornerRadius ?? 0,
    repeatStyle: false,
    elementContext,
  });

  const alignX = resolveParam({
    handleId: 'alignX',
    stream: streams.alignX,
    index,
    fallback: params.alignX ?? getDefaultAlignX(shapeType),
    repeatStyle: false,
    elementContext,
  });

  const alignY = resolveParam({
    handleId: 'alignY',
    stream: streams.alignY,
    index,
    fallback: params.alignY ?? getDefaultAlignY(shapeType),
    repeatStyle: false,
    elementContext,
  });

  const fill = resolveParam({
    handleId: 'fill',
    stream: streams.fill,
    index,
    fallback: params.fillColor ?? '#5b78ff',
    repeatStyle: true,
    elementContext,
  });

  const stroke = resolveParam({
    handleId: 'stroke',
    stream: streams.stroke,
    index,
    fallback: params.strokeColor ?? '#000000',
    repeatStyle: true,
    elementContext,
  });

  const strokeWidth = resolveParam({
    handleId: 'strokeWidth',
    stream: streams.strokeWidth,
    index,
    fallback: params.strokeWidth ?? 2,
    repeatStyle: true,
    elementContext,
  });

  const opacity = resolveParam({
    handleId: 'opacity',
    stream: streams.opacity,
    index,
    fallback: params.opacity ?? 1,
    repeatStyle: true,
    elementContext,
  });

  return {
    x,
    // SVG-space y used for rendering.
    y,
    // User-space y before SVG conversion.
    userY,
    width,
    height,
    radius,
    cornerRadius,
    alignX,
    alignY,
    fill,
    stroke,
    strokeWidth,
    opacity,
  };
}

function resolveParam({
  handleId,
  stream,
  index,
  fallback,
  repeatStyle,
  elementContext,
}) {
  if (!stream || stream.kind === 'missing') return fallback;

  if (stream.kind === 'scalar') return stream.value;

  if (stream.kind === 'array') {
    const resolvedIndex = resolveArrayIndexForContext({
      handleId,
      stream,
      index,
      elementContext,
    });

    if (resolvedIndex != null && resolvedIndex < stream.values.length) {
      return stream.values[resolvedIndex];
    }

    if (repeatStyle && stream.values.length > 0) {
      return stream.values[stream.values.length - 1];
    }

    return fallback;
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

  // A stream that is itself a matrix is always cell-wise.
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

function resolveLocalLayoutPoint(index, params, streams, elementContext) {
  const hasXInput = streams.x?.connected;
  const hasYInput = streams.y?.connected;

  const gapX = getLayoutGapValue(streams.layoutGapX, params.layoutGapX ?? 18);
  const gapY = getLayoutGapValue(streams.layoutGapY, params.layoutGapY ?? 18);

  const fallbackX = Number(params.defaultX ?? 0);
  const fallbackY = Number(params.defaultY ?? 0);

  const layoutMode = getLayoutMode(params);

  if (
    elementContext?.matrix &&
    (layoutMode === 'auto' || layoutMode === 'matrixGrid')
  ) {
    const colIndex = elementContext.colIndex ?? 0;
    const rowIndex = elementContext.rowIndex ?? 0;

    const matrixX = colIndex * gapX;

    // Matrix fallback layout is table-like by default:
    // row 0 at top, later rows go downward.
    //
    // Since user-facing y is upward-positive, downward means negative userY.
    const rowDirection = getMatrixRowDirection(params);
    const matrixUserY =
      rowDirection === 'up'
        ? rowIndex * gapY
        : -rowIndex * gapY;

    return {
      x: hasXInput ? fallbackX : matrixX,
      y: hasYInput ? fallbackY : matrixUserY,
    };
  }

  // If both x and y are driven, layout should not affect position.
  if (hasXInput && hasYInput) {
    return { x: fallbackX, y: fallbackY };
  }

  if (layoutMode === 'linearY') {
    return {
      x: hasXInput ? fallbackX : 0,
      y: hasYInput ? fallbackY : index * gapY,
    };
  }

  // auto / linearX / matrixGrid-without-matrix all fall back to linear X.
  return {
    x: hasXInput ? fallbackX : index * gapX,
    y: hasYInput ? fallbackY : 0,
  };
}

function makeShapeElement({
  ctx,
  index,
  shapeType,
  resolved,
  streams,
  parameterSources,
  elementContext,
}) {
  const frame = makeFrame({ shapeType, resolved });
  const content = makeContent({ shapeType, resolved });

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
    id: `${ctx.nodeId}-${shapeType}-${index}`,

    // Keep this as a technical role, not a user-facing semantic category.
    // Later binding logic should rely mainly on lineage/tags/source, not this role.
    role: 'mark',
    tags: ['shape', shapeType],

    dataRef: {
      index,
      flatIndex: elementContext?.flatIndex ?? index,
      rowIndex: elementContext?.rowIndex ?? null,
      colIndex: elementContext?.colIndex ?? null,
      matrixItem: elementContext?.matrixItem ?? null,
      matrixContext: elementContext?.matrix ?? null,

      collectionId: `${ctx.nodeId}-collection`,
      generatorNodeId: ctx.nodeId,

      inputValues: {
        x: resolved.x,
        // SVG-space y
        y: resolved.y,
        // User-space y before SVG conversion
        userY: resolved.userY,
        width: resolved.width,
        height: resolved.height,
        radius: resolved.radius,
        cornerRadius: resolved.cornerRadius,
        alignX: resolved.alignX,
        alignY: resolved.alignY,
        fill: resolved.fill,
        stroke: resolved.stroke,
        strokeWidth: resolved.strokeWidth,
        opacity: resolved.opacity,
      },

      // The important new part.
      // Binding nodes can compare this with TextGenerator / PathGenerator later.
      parameterLineage,

      // Empty for now unless upstream nodes already provide tags.
      // Future TagMapper can make this useful without changing ShapeGenerator again.
      tags: inheritedTags,
    },

    elementType: 'graphic',
    frame,

    transform: {
      x: 0,
      y: 0,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      origin: 'center',
    },

    content,

    style: makeVisualStyle(resolved),

    interaction: null,
    bindings: [],

    meta: {
      sourceNodeId: ctx.nodeId,
      elementIndex: index,
      collectionId: `${ctx.nodeId}-collection`,
      generatorNodeId: ctx.nodeId,
      matrixContext: elementContext?.matrix ?? null,
      matrixItem: elementContext?.matrixItem ?? null,

      // Duplicate a lightweight copy in meta so future selectors do not need
      // to know whether to read dataRef or meta first.
      parameterLineage,
      tags: inheritedTags,
    },
  };
}

function makeFrame({ shapeType, resolved }) {
  if (shapeType === 'circle') {
    const size = resolved.radius * 2;

    return makeAlignedFrame({
      x: resolved.x,
      y: resolved.y,
      width: size,
      height: size,
      alignX: resolved.alignX ?? 'center',
      alignY: resolved.alignY ?? 'center',
    });
  }

  return makeAlignedFrame({
    x: resolved.x,
    y: resolved.y,
    width: resolved.width,
    height: resolved.height,
    alignX: resolved.alignX ?? 'center',
    alignY: resolved.alignY ?? 'center',
  });
}

function makeAlignedFrame({ x, y, width, height, alignX, alignY }) {
  const safeWidth = Number(width) || 0;
  const safeHeight = Number(height) || 0;

  const offset = getAlignOffset(alignX, alignY, safeWidth, safeHeight);

  return {
    x: Number(x ?? 0) - offset.x,
    y: Number(y ?? 0) - offset.y,
    width: safeWidth,
    height: safeHeight,
    alignX,
    alignY,
  };
}

function getAlignOffset(alignX, alignY, width, height) {
  const x =
    alignX === 'center'
      ? width / 2
      : alignX === 'right'
        ? width
        : 0;

  const y =
    alignY === 'center'
      ? height / 2
      : alignY === 'bottom'
        ? height
        : 0;

  return { x, y };
}

function parseAnchor(anchor) {
  switch (anchor) {
    case 'top-left':
      return { x: 'left', y: 'top' };
    case 'top-center':
      return { x: 'center', y: 'top' };
    case 'top-right':
      return { x: 'right', y: 'top' };
    case 'center-left':
      return { x: 'left', y: 'center' };
    case 'center':
      return { x: 'center', y: 'center' };
    case 'center-right':
      return { x: 'right', y: 'center' };
    case 'bottom-left':
      return { x: 'left', y: 'bottom' };
    case 'bottom-center':
      return { x: 'center', y: 'bottom' };
    case 'bottom-right':
      return { x: 'right', y: 'bottom' };
    default:
      return { x: 'left', y: 'top' };
  }
}

function getDefaultAlignX(shapeType) {
  if (shapeType === 'circle') return 'center';
  return 'left';
}

function getDefaultAlignY(shapeType) {
  if (shapeType === 'circle') return 'center';
  if (shapeType === 'rect') return 'bottom';
  return 'top';
}

function makeContent({ shapeType, resolved }) {
  if (shapeType === 'circle') {
    return {
        contentType: 'shape',
        shape: {
            shapeType: 'circle',
            cx: resolved.radius,
            cy: resolved.radius,
            r: resolved.radius,
        },
    };
    }

  if (shapeType === 'line') {
    return {
      contentType: 'shape',
      shape: {
        shapeType: 'line',
        x1: 0,
        y1: 0,

        // Line width/endX remains normal x delta.
        x2: resolved.width,

        // Line height/endY is treated as user-space y delta,
        // so positive value goes upward.
        y2: toSvgY(resolved.height),
      },
    };
  }

  return {
    contentType: 'shape',
    shape: {
      shapeType: 'rect',
      x: 0,
      y: 0,
      width: resolved.width,
      height: resolved.height,
      rx: resolved.cornerRadius,
      ry: resolved.cornerRadius,
    },
  };
}

function makeVisualStyle(resolved) {
  return {
    fill: {
      type: resolved.fill === 'none' ? 'none' : 'solid',
      color: resolved.fill === 'none' ? undefined : resolved.fill,
    },

    stroke: {
      enabled: resolved.stroke !== 'none',
      color: resolved.stroke === 'none' ? undefined : resolved.stroke,
      width: resolved.strokeWidth,
    },

    opacity: clampNumber(resolved.opacity, 0, 1),
  };
}

function clampNumber(value, min, max) {
  const n = Number(value);

  if (!Number.isFinite(n)) return min;

  return Math.max(min, Math.min(max, n));
}

function collectParameterSources(inputsByHandle, handles) {
  const result = {};

  handles.forEach((handleId) => {
    const input = inputsByHandle?.[handleId]?.[0];
    const output = input?.value;

    if (!output) return;

    result[handleId] = makeParameterSourceSummary({
      handleId,
      input,
      output,
    });
  });

  return result;
}

function makeElementParameterLineage({
  index,
  streams,
  parameterSources,
  resolved,
  elementContext,
}) {
  const handles = [
    'x',
    'y',
    'width',
    'height',
    'radius',
    'cornerRadius',
    'alignX',
    'alignY',
    'fill',
    'stroke',
    'strokeWidth',
    'opacity',
    'frame',
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

    // The final value actually used by this generated element.
    resolvedValue,

    // Which index of the upstream array was consumed.
    // For scalar/default values this remains null.
    sourceIndex: null,

    // Useful for later auto binding.
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
    const resolvedIndex = resolveArrayIndexForContext({
      handleId,
      stream,
      index,
      elementContext,
    });

    const rawValue =
      resolvedIndex == null
        ? null
        : stream.values[resolvedIndex];

    const matrixRole = inferMatrixRoleForResolvedIndex({
      stream,
      resolvedIndex,
      elementContext,
    });

    const matrixItem = getMatrixItemForResolvedIndex({
      stream,
      resolvedIndex,
      elementContext,
    });

    return {
      ...base,
      valueSource: source ? 'connected-array' : 'local-array',
      sourceIndex: resolvedIndex,
      rawValue,

      matrixRole,
      matrixItem,

      scaleItem: getScaleItemForIndex(source, resolvedIndex),
      mappedItem: getMappedItemForIndex(source, resolvedIndex),

      tags: mergeTagObjects(
        getTagsForIndex(source, resolvedIndex),
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

function getMappedItemForIndex(source, index) {
  if (!source || index == null) return null;

  const mappedItems =
    source.mappedItems ??
    source.meta?.mappedItems ??
    null;

  if (!Array.isArray(mappedItems)) return null;

  return mappedItems[index] ?? null;
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

function makeParameterSourceSummary({ handleId, input, output }) {
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

function collectInputProvenanceFromSources(parameterSources) {
  return Object.values(parameterSources).flatMap((source) => {
    if (Array.isArray(source.provenance) && source.provenance.length > 0) {
      return source.provenance;
    }

    if (source.sourceNodeId) {
      return [
        {
          sourceNodeId: source.sourceNodeId,
          role: source.role,
          label: source.label,
          outputType: source.outputType,
          dataType: source.dataType,
          parameterType: source.parameterType,
        },
      ];
    }

    return [];
  });
}

function toSvgY(value, params = {}) {
  const n = Number(value);

  if (!Number.isFinite(n)) return 0;

  if ((params.yDirection ?? 'up') === 'svg') {
    return n;
  }

  return -n;
}

function getLayoutMode(params = {}) {
  const raw = params.layoutMode ?? params.layoutAxis ?? 'auto';

  if (raw === 'x') return 'linearX';
  if (raw === 'y') return 'linearY';

  if (raw === 'linearX') return 'linearX';
  if (raw === 'linearY') return 'linearY';
  if (raw === 'matrixGrid') return 'matrixGrid';

  return 'auto';
}

function getMatrixRowDirection(params = {}) {
  const raw = params.matrixRowDirection ?? 'down';

  return raw === 'up' ? 'up' : 'down';
}

function getLayoutGapValue(stream, fallback) {
  if (!stream || stream.kind === 'missing') {
    return Number(fallback ?? 18);
  }

  if (stream.kind === 'scalar') {
    return Number(stream.value ?? fallback ?? 18);
  }

  if (stream.kind === 'array' && stream.values.length > 0) {
    return Number(stream.values[0] ?? fallback ?? 18);
  }

  return Number(fallback ?? 18);
}

function makeLayoutMeta({ params, matrixContext }) {
  const layoutMode = getLayoutMode(params);

  const usesMatrixGrid = Boolean(
    matrixContext &&
    (layoutMode === 'auto' || layoutMode === 'matrixGrid')
  );

  return {
    type: usesMatrixGrid ? 'matrix-grid' : 'linear',
    mode: layoutMode,

    axis:
      usesMatrixGrid
        ? null
        : layoutMode === 'linearY'
          ? 'y'
          : 'x',

    gapX: Number(params.layoutGapX ?? 18),
    gapY: Number(params.layoutGapY ?? 18),

    matrixRowDirection: usesMatrixGrid
      ? getMatrixRowDirection(params)
      : null,

    matrix: matrixContext
      ? {
          rows: matrixContext.rows,
          cols: matrixContext.cols,
          flatCount: matrixContext.flatCount,
          sourceHandle: matrixContext.sourceHandle,
        }
      : null,
  };
}