// src/evaluator/inspectors/evalDataInspector.js

import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

export function evalDataInspector(ctx) {
  const p = ctx.params ?? {};
  const inputOutput = getFirstInputValue(ctx, 'input');

  const requestedViewMode = p.viewMode ?? 'auto';
  const maxRows = Math.max(1, Math.round(Number(p.maxRows ?? 80)));

  if (!inputOutput) {
    return makeInspectionOutput({
      ctx,
      title: 'No Input',
      subtitle: 'Connect data, parameter, or visual output to inspect.',
      viewMode: requestedViewMode,
      rows: [],
      columns: [],
      maxRows,
      warnings: ['No input connected to DataInspector.'],
      inputOutput: null,
    });
  }

  const inspection = inspectOutput({
    output: inputOutput,
    requestedViewMode,
    maxRows,
  });

  return makeInspectionOutput({
    ctx,
    ...inspection,
    requestedViewMode,
    maxRows,
    inputOutput,
  });
}

function getFirstInputValue(ctx, handleId) {
  return ctx.inputs?.byTargetHandle?.[handleId]?.[0]?.value ?? null;
}

function makeInspectionOutput({
  ctx,
  title,
  subtitle,
  viewMode,
  requestedViewMode,
  rows,
  columns,
  maxRows,
  warnings = [],
  jsonText = '',
  inputOutput,
}) {
  const provenance = inputOutput
    ? inheritProvenance(inputOutput)
    : [];

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'data-inspector',
    outputType: 'inspection',
    label: 'Data Inspector Output',
    transform: {
      type: 'inspect',
      requestedViewMode,
      resolvedViewMode: viewMode,
    },
  });

  return {
    outputType: 'inspection',
    version: '0.1',

    inspectionType: jsonText ? 'json' : 'table',

    title,
    subtitle,

    columns,
    rows,
    maxRows,
    jsonText,

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Data Inspector Output',

      requestedViewMode,
      resolvedViewMode: viewMode,

      inputSummary: summarizeInput(inputOutput),
      rowCount: rows.length,
      columnCount: columns.length,

      warnings,

      provenance: [
        ...provenance,
        ownProvenanceEntry,
      ],
    },
  };
}

function inspectOutput({
  output,
  requestedViewMode,
  maxRows,
}) {
  const inputKind = inferOutputKind(output);
  const viewMode = resolveViewMode({
    requestedViewMode,
    inputKind,
  });

  if (viewMode === 'json') {
    return {
      title: 'Raw JSON',
      subtitle: summarizeInputLabel(output),
      viewMode,
      columns: [],
      rows: [],
      maxRows,
      jsonText: safeStringify(output),
      warnings: [],
    };
  }

  if (inputKind === 'matrix') {
    return inspectMatrixOutput({
      output,
      viewMode,
    });
  }

  if (inputKind === 'array') {
    return inspectArrayOutput({
      output,
      viewMode,
    });
  }

  if (inputKind === 'visual') {
    return inspectVisualOutput({
      output,
      viewMode,
    });
  }

  if (inputKind === 'scalar') {
    return inspectScalarOutput({
      output,
      viewMode,
    });
  }

  return {
    title: 'Unsupported Output',
    subtitle: summarizeInputLabel(output),
    viewMode,
    columns: [
      { key: 'message', label: 'Message' },
    ],
    rows: [
      {
        message: `Unsupported output type: ${output?.outputType ?? 'unknown'}`,
      },
    ],
    warnings: [],
  };
}

function inferOutputKind(output) {
  if (!output) return 'none';

  if (output.outputType === 'visual') return 'visual';

  if (
    output.dataType === 'matrix' ||
    output.parameterType === 'matrix' ||
    output.meta?.matrix ||
    Array.isArray(output.meta?.matrixItems)
  ) {
    return 'matrix';
  }

  if (
    output.dataType === 'array' ||
    output.parameterType === 'numberArray' ||
    output.parameterType === 'stringArray' ||
    Array.isArray(output.values)
  ) {
    return 'array';
  }

  if (
    output.dataType === 'number' ||
    output.parameterType === 'number' ||
    output.parameterType === 'string' ||
    'value' in output
  ) {
    return 'scalar';
  }

  return 'unknown';
}

function resolveViewMode({
  requestedViewMode,
  inputKind,
}) {
  if (requestedViewMode && requestedViewMode !== 'auto') {
    return requestedViewMode;
  }

  if (inputKind === 'matrix') return 'matrix';
  if (inputKind === 'visual') return 'lineage';
  if (inputKind === 'array') return 'tags';
  if (inputKind === 'scalar') return 'values';

  return 'values';
}

/* -------------------------------------------------------------------------- */
/* Matrix                                                                      */
/* -------------------------------------------------------------------------- */

function inspectMatrixOutput({
  output,
  viewMode,
}) {
  const meta = output.meta ?? {};
  const matrixItems = normalizeMatrixItems(output);

  const rows = matrixItems.map((item) => {
    const tags = item.tags ?? findTaggedItemTags(meta.taggedItems, item.flatIndex);

    return {
      __rowId: item.flatIndex,
      flatIndex: item.flatIndex,
      rowIndex: item.rowIndex,
      colIndex: item.colIndex,
      value: item.value,
      rawValue: item.rawValue,
      mappedValue: item.mappedValue,
      ...flattenTags(tags),
    };
  });

  const columns = makeColumnsFromRows({
    base: [
      { key: 'flatIndex', label: 'flat' },
      { key: 'rowIndex', label: 'row' },
      { key: 'colIndex', label: 'col' },
      { key: 'value', label: 'value' },
      { key: 'rawValue', label: 'raw' },
      { key: 'mappedValue', label: 'mapped' },
    ],
    rows,
  });

  return {
    title: 'Matrix',
    subtitle: summarizeInputLabel(output),
    viewMode,
    columns,
    rows,
    warnings: meta.warnings ?? [],
  };
}

function normalizeMatrixItems(output) {
  const meta = output.meta ?? {};
  const matrix = meta.matrix ?? {};

  const existing =
    meta.matrixItems ??
    meta.mappedItems ??
    meta.items ??
    null;

  if (Array.isArray(existing) && existing.length > 0) {
    return existing.map((item, index) => {
      const flatIndex = item.flatIndex ?? item.index ?? index;
      const cols = Number(matrix.cols ?? 1);
      const rowIndex = item.rowIndex ?? Math.floor(flatIndex / cols);
      const colIndex = item.colIndex ?? flatIndex % cols;

      return {
        ...item,
        flatIndex,
        index: flatIndex,
        rowIndex,
        colIndex,
        value: item.value ?? getMatrixValue(output.values, rowIndex, colIndex),
        rawValue: item.rawValue ?? item.value ?? getMatrixValue(output.values, rowIndex, colIndex),
      };
    });
  }

  const values = output.values ?? [];
  const rows = Number(matrix.rows ?? values.length ?? 0);
  const cols = Number(matrix.cols ?? Math.max(0, ...values.map((row) => row?.length ?? 0)));

  const result = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    for (let colIndex = 0; colIndex < cols; colIndex += 1) {
      const flatIndex = rowIndex * cols + colIndex;

      result.push({
        flatIndex,
        index: flatIndex,
        rowIndex,
        colIndex,
        value: getMatrixValue(values, rowIndex, colIndex),
        rawValue: getMatrixValue(values, rowIndex, colIndex),
        tags: findTaggedItemTags(meta.taggedItems, flatIndex),
      });
    }
  }

  return result;
}

function getMatrixValue(values, rowIndex, colIndex) {
  return values?.[rowIndex]?.[colIndex] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Array                                                                       */
/* -------------------------------------------------------------------------- */

function inspectArrayOutput({
  output,
  viewMode,
}) {
  const meta = output.meta ?? {};
  const values = output.values ?? [];
  const mappedItems = meta.mappedItems ?? meta.items ?? null;

  const rows = values.map((value, index) => {
    const mappedItem = Array.isArray(mappedItems)
      ? mappedItems[index]
      : null;

    const tags =
      mappedItem?.tags ??
      findTaggedItemTags(meta.taggedItems, index) ??
      null;

    return {
      __rowId: index,
      index,
      value,
      rawValue: mappedItem?.rawValue,
      inputValue: mappedItem?.inputValue,
      mappedValue: mappedItem?.mappedValue,
      ...flattenTags(tags),
    };
  });

  const columns = makeColumnsFromRows({
    base: [
      { key: 'index', label: 'index' },
      { key: 'value', label: 'value' },
      { key: 'rawValue', label: 'raw' },
      { key: 'inputValue', label: 'input' },
      { key: 'mappedValue', label: 'mapped' },
    ],
    rows,
  });

  return {
    title: 'Array',
    subtitle: summarizeInputLabel(output),
    viewMode,
    columns,
    rows,
    warnings: meta.warnings ?? [],
  };
}

/* -------------------------------------------------------------------------- */
/* Scalar                                                                      */
/* -------------------------------------------------------------------------- */

function inspectScalarOutput({
  output,
  viewMode,
}) {
  const tags = output.meta?.tags ?? null;

  const row = {
    value: output.value,
    ...flattenTags(tags),
  };

  const columns = makeColumnsFromRows({
    base: [
      { key: 'value', label: 'value' },
    ],
    rows: [row],
  });

  return {
    title: 'Value',
    subtitle: summarizeInputLabel(output),
    viewMode,
    columns,
    rows: [row],
    warnings: output.meta?.warnings ?? [],
  };
}

/* -------------------------------------------------------------------------- */
/* Visual                                                                      */
/* -------------------------------------------------------------------------- */

function inspectVisualOutput({
  output,
  viewMode,
}) {
  const elements = flattenVisualElements(output.root);

  const rows = elements.map((node, index) => {
    const dataRef = node.dataRef ?? {};
    const tags = dataRef.tags ?? node.meta?.tags ?? null;

    return {
      __rowId: node.id ?? index,
      index,
      id: node.id,
      nodeType: node.nodeType,
      elementType: node.elementType,
      role: node.role,
      dataIndex: dataRef.index,
      flatIndex: dataRef.flatIndex,
      rowIndex: dataRef.rowIndex,
      colIndex: dataRef.colIndex,
      generator: dataRef.generatorNodeId ?? node.meta?.generatorNodeId,
      collection: dataRef.collectionId ?? node.meta?.collectionId,
      lineage: summarizeParameterLineage(dataRef.parameterLineage ?? node.meta?.parameterLineage),
      ...flattenTags(tags),
    };
  });

  const columns = makeColumnsFromRows({
    base: [
      { key: 'index', label: '#' },
      { key: 'id', label: 'id' },
      { key: 'elementType', label: 'type' },
      { key: 'role', label: 'role' },
      { key: 'dataIndex', label: 'dataIndex' },
      { key: 'rowIndex', label: 'row' },
      { key: 'colIndex', label: 'col' },
      { key: 'generator', label: 'generator' },
      { key: 'lineage', label: 'lineage' },
    ],
    rows,
  });

  return {
    title: 'Visual Elements',
    subtitle: summarizeInputLabel(output),
    viewMode,
    columns,
    rows,
    warnings: output.meta?.warnings ?? [],
  };
}

function flattenVisualElements(node) {
  if (!node) return [];

  const own =
    node.nodeType === 'element'
      ? [node]
      : [];

  const children = (node.children ?? []).flatMap(flattenVisualElements);

  return [...own, ...children];
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function flattenTags(tags) {
  if (!tags || typeof tags !== 'object') return {};

  const result = {};

  Object.entries(tags).forEach(([key, value]) => {
    result[`tag:${key}`] = value;
  });

  return result;
}

function findTaggedItemTags(taggedItems, index) {
  if (!Array.isArray(taggedItems)) return null;

  return taggedItems.find((item) =>
    item.index === index ||
    item.flatIndex === index
  )?.tags ?? null;
}

function makeColumnsFromRows({
  base,
  rows,
}) {
  const baseKeys = new Set(base.map((column) => column.key));
  const dynamicKeys = new Set();

  rows.forEach((row) => {
    Object.keys(row).forEach((key) => {
      if (key === '__rowId') return;
      if (baseKeys.has(key)) return;

      const hasValue = row[key] !== undefined && row[key] !== null && row[key] !== '';

      if (hasValue) {
        dynamicKeys.add(key);
      }
    });
  });

  const dynamicColumns = [...dynamicKeys].map((key) => ({
    key,
    label: key.startsWith('tag:')
      ? key.replace(/^tag:/, '')
      : key,
  }));

  return [
    ...base,
    ...dynamicColumns,
  ].filter((column) =>
    rows.some((row) =>
      row[column.key] !== undefined &&
      row[column.key] !== null &&
      row[column.key] !== ''
    )
  );
}

function summarizeParameterLineage(lineage) {
  if (!lineage || typeof lineage !== 'object') return '';

  return Object.entries(lineage)
    .filter(([, value]) => value?.connected)
    .map(([handleId, value]) => {
      const source = value.scaleId ?? value.sourceNodeId ?? 'input';
      const index = value.sourceIndex != null ? `[${value.sourceIndex}]` : '';
      return `${handleId}:${source}${index}`;
    })
    .join(' | ');
}

function summarizeInput(output) {
  if (!output) return null;

  return {
    outputType: output.outputType,
    dataType: output.dataType,
    parameterType: output.parameterType,
    outputRole: output.meta?.outputRole,
    label: output.meta?.label,
    sourceNodeId: output.meta?.sourceNodeId,
  };
}

function summarizeInputLabel(output) {
  if (!output) return 'No input';

  const type =
    output.dataType ??
    output.parameterType ??
    output.outputRole ??
    output.outputType ??
    'unknown';

  const label = output.meta?.label;

  return label ? `${label} · ${type}` : String(type);
}

function safeStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}