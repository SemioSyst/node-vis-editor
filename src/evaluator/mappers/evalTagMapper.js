// src/evaluator/mappers/evalTagMapper.js
import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

export function evalTagMapper(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const inputOutput = getFirstInputValue(ctx, 'input');

  if (!inputOutput) {
    return {
      outputType: 'data',
      version: '0.1',
      dataType: 'array',
      values: [],
      meta: {
        sourceNodeId: ctx.nodeId,
        label: 'Tagged Data',
        warnings: ['No input connected to TagMapper.'],
        tags: null,
        taggedItems: [],
        provenance: [
          makeProvenanceEntry({
            nodeId: ctx.nodeId,
            role: 'tag-mapper',
            outputType: 'data',
            label: 'Tagged Data',
            transform: {
              type: 'tag',
              status: 'no-input',
            },
          }),
        ],
      },
    };
  }

  const requestedPreset = normalizeTagPreset(p.tagPreset ?? p.tagMode ?? 'auto');
  const inputKind = inferInputKind(inputOutput);

  const tagPlan = makeTagPlan({
    params: p,
    requestedPreset,
    inputOutput,
    inputKind,
    warnings,
  });

  return applyTagsToOutput({
    inputOutput,
    tagPlan,
    ctx,
    inputKind,
    warnings,
  });
}

function getFirstInputValue(ctx, handleId) {
  return ctx.inputs?.byTargetHandle?.[handleId]?.[0]?.value ?? null;
}

function normalizeTagPreset(mode) {
  if (mode === 'applyAll') return 'applyAll';
  if (mode === 'byIndex') return 'byIndex';
  if (mode === 'matrixRow') return 'matrixRow';
  if (mode === 'matrixColumn') return 'matrixColumn';
  if (mode === 'matrixRowColumn') return 'matrixRowColumn';
  if (mode === 'matrixCell') return 'matrixCell';
  return 'auto';
}

function inferInputKind(output) {
  if (!output) return 'unknown';

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
    output.parameterType === 'colorArray' ||
    Array.isArray(output.values)
  ) {
    return 'array';
  }

  if (
    output.dataType === 'number' ||
    output.parameterType === 'number' ||
    output.parameterType === 'string' ||
    output.parameterType === 'color' ||
    'value' in output
  ) {
    return 'scalar';
  }

  return 'unknown';
}

function makeTagPlan({
  params,
  requestedPreset,
  inputOutput,
  inputKind,
  warnings,
}) {
  const matrixInfo = getMatrixInfo(inputOutput);
  const arrayLength = getArrayLength(inputOutput);

  const applyGlobalTag = boolValue(
    params.applyGlobalTag,
    hasNonEmptyText(params.globalTagValue)
  );

  const applyIndexTags = boolValue(
    params.applyIndexTags,
    false
  );

  const applyRowTags = boolValue(
    params.applyRowTags,
    false
  );

  const applyColumnTags = boolValue(
    params.applyColumnTags,
    false
  );

  const applyCellTags = boolValue(
    params.applyCellTags,
    false
  );

  const globalTags = makeGlobalTags({
    params,
    enabled: applyGlobalTag,
  });

  const indexKey = resolveTagKey({
    preset: params.indexKeyPreset ?? 'item',
    custom: params.indexCustomKey,
    fallback: 'item',
  });

  const rowKey = resolveTagKey({
    preset: params.rowKeyPreset ?? 'item',
    custom: params.rowCustomKey,
    fallback: 'item',
  });

  const colKey = resolveTagKey({
    preset: params.colKeyPreset ?? 'state',
    custom: params.colCustomKey,
    fallback: 'state',
  });

  const cellKey = resolveTagKey({
    preset: params.cellKeyPreset ?? 'group',
    custom: params.cellCustomKey,
    fallback: 'group',
  });

  const indexValues = parseTagList(params.indexTagValues ?? '');
  const rowValues = parseTagList(params.rowTagValues ?? '');
  const colValues = parseTagList(params.colTagValues ?? '');
  const cellMatrix = parseTagMatrix(params.cellTagMatrix ?? '');

  if (applyIndexTags && inputKind !== 'array') {
    warnings.push(`Index tags work best with array input. Current input is "${inputKind}".`);
  }

  if (
    (applyRowTags || applyColumnTags || applyCellTags) &&
    inputKind !== 'matrix'
  ) {
    warnings.push(`Matrix tag rules expect matrix input. Current input is "${inputKind}".`);
  }

  if (applyIndexTags && arrayLength != null) {
    warnLengthMismatch({
      label: 'Index tag values',
      expected: arrayLength,
      actual: indexValues.length,
      warnings,
      allowEmpty: true,
    });
  }

  if (matrixInfo) {
    if (applyRowTags) {
      warnLengthMismatch({
        label: 'Row tag values',
        expected: matrixInfo.rows,
        actual: rowValues.length,
        warnings,
        allowEmpty: true,
      });
    }

    if (applyColumnTags) {
      warnLengthMismatch({
        label: 'Column tag values',
        expected: matrixInfo.cols,
        actual: colValues.length,
        warnings,
        allowEmpty: true,
      });
    }

    if (applyCellTags && cellMatrix.length > 0) {
      if (cellMatrix.length !== matrixInfo.rows) {
        warnings.push(
          `Cell tag matrix row count (${cellMatrix.length}) does not match input matrix rows (${matrixInfo.rows}).`
        );
      }

      const maxCols = Math.max(0, ...cellMatrix.map((row) => row.length));

      if (maxCols !== matrixInfo.cols) {
        warnings.push(
          `Cell tag matrix column count (${maxCols}) does not match input matrix columns (${matrixInfo.cols}).`
        );
      }
    }
  }

  if (applyRowTags && rowValues.length === 0) {
    warnings.push('Row tags are enabled but no row values were provided. Fallback row labels will be used.');
  }

  if (applyColumnTags && colValues.length === 0) {
    warnings.push('Column tags are enabled but no column values were provided. Fallback column labels will be used.');
  }

  if (applyIndexTags && indexValues.length === 0) {
    warnings.push('Index tags are enabled but no index values were provided. Fallback item labels will be used.');
  }

  return {
    requestedPreset,
    inputKind,

    apply: {
      global: applyGlobalTag,
      index: applyIndexTags,
      row: applyRowTags,
      column: applyColumnTags,
      cell: applyCellTags,
    },

    globalTags,

    index: {
      key: indexKey,
      values: indexValues,
    },

    row: {
      key: rowKey,
      values: rowValues,
    },

    column: {
      key: colKey,
      values: colValues,
    },

    cell: {
      key: cellKey,
      matrix: cellMatrix,
    },
  };
}

function applyTagsToOutput({
  inputOutput,
  tagPlan,
  ctx,
  inputKind,
  warnings,
}) {
  const meta = inputOutput.meta ?? {};
  const inheritedProvenance = inheritProvenance(inputOutput);

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'tag-mapper',
    outputType: inputOutput.outputType,
    label: 'Tagged Output',
    transform: {
      type: 'tag',
      requestedPreset: tagPlan.requestedPreset,
      inputKind,
      activeRules: getActiveRules(tagPlan),
      appliedKeys: getAppliedKeys(tagPlan),
    },
  });

  const nextMeta = {
    ...meta,

    sourceNodeId: ctx.nodeId,
    upstreamSourceNodeId: meta.sourceNodeId ?? null,

    label: meta.label ?? 'Tagged Output',

    tags: mergeTags(
      meta.tags,
      tagPlan.globalTags
    ),

    requestedTagPreset: tagPlan.requestedPreset,
    activeTagRules: getActiveRules(tagPlan),

    warnings: [
      ...(meta.warnings ?? []),
      ...warnings,
    ],

    provenance: [
      ...inheritedProvenance,
      ownProvenanceEntry,
    ],

    tagMapper: {
      sourceNodeId: ctx.nodeId,
      requestedPreset: tagPlan.requestedPreset,
      inputKind,
      activeRules: getActiveRules(tagPlan),
      appliedKeys: getAppliedKeys(tagPlan),
    },
  };

  if (inputKind === 'matrix') {
    const matrixResult = applyMatrixTags({
      inputOutput,
      tagPlan,
      baseMeta: nextMeta,
    });

    return {
      ...inputOutput,
      meta: {
        ...nextMeta,
        matrixItems: matrixResult.matrixItems,
        taggedItems: matrixResult.taggedItems,
      },
    };
  }

  if (inputKind === 'array') {
    const arrayResult = applyArrayTags({
      inputOutput,
      tagPlan,
      baseMeta: nextMeta,
    });

    return {
      ...inputOutput,
      meta: {
        ...nextMeta,
        taggedItems: arrayResult.taggedItems,
      },
    };
  }

  return {
    ...inputOutput,
    meta: nextMeta,
  };
}

function applyArrayTags({
  inputOutput,
  tagPlan,
  baseMeta,
}) {
  const values = Array.isArray(inputOutput.values)
    ? inputOutput.values
    : [];

  const existingTaggedItems = baseMeta.taggedItems ?? inputOutput.meta?.taggedItems ?? [];

  const taggedItems = values.map((value, index) => {
    const existing = findTaggedItemByIndex(existingTaggedItems, index);

    const indexTags = tagPlan.apply.index
      ? {
          [tagPlan.index.key]:
            tagPlan.index.values[index] ??
            existing?.tags?.[tagPlan.index.key] ??
            makeFallbackIndexLabel(index),
        }
      : null;

    const tags = mergeTags(
      existing?.tags,
      tagPlan.globalTags,
      indexTags
    );

    return {
      ...(existing ?? {}),
      index,
      value,
      tags,
    };
  });

  return { taggedItems };
}

function applyMatrixTags({
  inputOutput,
  tagPlan,
  baseMeta,
}) {
  const meta = inputOutput.meta ?? {};
  const matrix = meta.matrix ?? {};
  const rows = Number(matrix.rows ?? inputOutput.values?.length ?? 0);
  const cols = Number(
    matrix.cols ??
      Math.max(0, ...(inputOutput.values ?? []).map((row) => row?.length ?? 0))
  );

  const existingMatrixItems = normalizeMatrixItems({
    inputOutput,
    rows,
    cols,
  });

  const existingTaggedItems = baseMeta.taggedItems ?? meta.taggedItems ?? [];

  const matrixItems = existingMatrixItems.map((item) => {
    const flatIndex = item.flatIndex ?? item.index;
    const rowIndex = item.rowIndex ?? Math.floor(flatIndex / cols);
    const colIndex = item.colIndex ?? flatIndex % cols;

    const existingTagged = findTaggedItemByIndex(existingTaggedItems, flatIndex);

    const rowTags = tagPlan.apply.row
      ? getRowTags({
          tagPlan,
          rowIndex,
        })
      : null;

    const columnTags = tagPlan.apply.column
      ? getColumnTags({
          tagPlan,
          colIndex,
        })
      : null;

    const cellTags = tagPlan.apply.cell
      ? getCellTags({
          tagPlan,
          rowIndex,
          colIndex,
        })
      : null;

    const tags = mergeTags(
      item.tags,
      existingTagged?.tags,
      tagPlan.globalTags,
      rowTags,
      columnTags,
      cellTags
    );

    return {
      ...item,
      flatIndex,
      index: flatIndex,
      rowIndex,
      colIndex,
      tags,
    };
  });

  const taggedItems = matrixItems.map((item) => ({
    index: item.flatIndex,
    flatIndex: item.flatIndex,
    rowIndex: item.rowIndex,
    colIndex: item.colIndex,
    tags: item.tags ?? null,
  }));

  return {
    matrixItems,
    taggedItems,
  };
}

function normalizeMatrixItems({
  inputOutput,
  rows,
  cols,
}) {
  const meta = inputOutput.meta ?? {};

  const existing =
    meta.matrixItems ??
    meta.mappedItems ??
    meta.items ??
    null;

  if (Array.isArray(existing) && existing.length > 0) {
    return existing.map((item, index) => {
      const flatIndex = item.flatIndex ?? item.index ?? index;
      const rowIndex = item.rowIndex ?? Math.floor(flatIndex / cols);
      const colIndex = item.colIndex ?? flatIndex % cols;

      return {
        ...item,
        flatIndex,
        index: flatIndex,
        rowIndex,
        colIndex,
        value: item.value ?? getMatrixValue(inputOutput.values, rowIndex, colIndex),
      };
    });
  }

  const items = [];

  for (let rowIndex = 0; rowIndex < rows; rowIndex += 1) {
    for (let colIndex = 0; colIndex < cols; colIndex += 1) {
      const flatIndex = rowIndex * cols + colIndex;

      items.push({
        index: flatIndex,
        flatIndex,
        rowIndex,
        colIndex,
        rowLabel: meta.matrix?.rowLabels?.[rowIndex] ?? null,
        colLabel: meta.matrix?.colLabels?.[colIndex] ?? null,
        value: getMatrixValue(inputOutput.values, rowIndex, colIndex),
        tags: null,
      });
    }
  }

  return items;
}

function getMatrixValue(values, rowIndex, colIndex) {
  return values?.[rowIndex]?.[colIndex] ?? null;
}

function getRowTags({
  tagPlan,
  rowIndex,
}) {
  const value =
    tagPlan.row.values[rowIndex] ??
    makeFallbackRowLabel(rowIndex);

  return {
    [tagPlan.row.key]: value,
  };
}

function getColumnTags({
  tagPlan,
  colIndex,
}) {
  const value =
    tagPlan.column.values[colIndex] ??
    makeFallbackColumnLabel(colIndex);

  return {
    [tagPlan.column.key]: value,
  };
}

function getCellTags({
  tagPlan,
  rowIndex,
  colIndex,
}) {
  const value =
    tagPlan.cell.matrix?.[rowIndex]?.[colIndex];

  if (value == null || value === '') return null;

  return {
    [tagPlan.cell.key]: value,
  };
}

function findTaggedItemByIndex(taggedItems, index) {
  if (!Array.isArray(taggedItems)) return null;

  return taggedItems.find((item) =>
    item.index === index ||
    item.flatIndex === index
  ) ?? null;
}

function getMatrixInfo(output) {
  const meta = output?.meta ?? {};

  if (!meta.matrix) return null;

  return {
    rows: Number(meta.matrix.rows ?? 0),
    cols: Number(meta.matrix.cols ?? 0),
  };
}

function getArrayLength(output) {
  if (Array.isArray(output?.values)) return output.values.length;
  return null;
}

function warnLengthMismatch({
  label,
  expected,
  actual,
  warnings,
  allowEmpty = false,
}) {
  if (allowEmpty && actual === 0) return;

  if (actual !== expected) {
    warnings.push(
      `${label} count (${actual}) does not match expected count (${expected}). Missing labels will use fallbacks.`
    );
  }
}

function getActiveRules(tagPlan) {
  const rules = [];

  if (tagPlan.apply.global && tagPlan.globalTags) rules.push('global');
  if (tagPlan.apply.index) rules.push('index');
  if (tagPlan.apply.row) rules.push('matrix-row');
  if (tagPlan.apply.column) rules.push('matrix-column');
  if (tagPlan.apply.cell) rules.push('matrix-cell');

  return rules;
}

function getAppliedKeys(tagPlan) {
  const keys = [];

  if (tagPlan.apply.global && tagPlan.globalTags) {
    keys.push(...Object.keys(tagPlan.globalTags));
  }

  if (tagPlan.apply.index) {
    keys.push(tagPlan.index.key);
  }

  if (tagPlan.apply.row) {
    keys.push(tagPlan.row.key);
  }

  if (tagPlan.apply.column) {
    keys.push(tagPlan.column.key);
  }

  if (tagPlan.apply.cell) {
    keys.push(tagPlan.cell.key);
  }

  return [...new Set(keys.filter(Boolean))];
}

function makeGlobalTags({
  params,
  enabled,
}) {
  if (!enabled) return null;

  const key = resolveTagKey({
    preset: params.globalKeyPreset ?? 'group',
    custom: params.globalCustomKey,
    fallback: 'group',
  });

  const value = parseSingleTagValue(params.globalTagValue);

  if (!key || value == null || value === '') return null;

  return {
    [key]: value,
  };
}

function resolveTagKey({
  preset,
  custom,
  fallback,
}) {
  if (preset === 'custom') {
    return String(custom ?? '').trim() || fallback;
  }

  return String(preset ?? fallback).trim() || fallback;
}

function parseSingleTagValue(value) {
  const raw = String(value ?? '').trim();

  if (raw === '') return null;

  return stripSimpleQuotes(raw);
}

function parseTagList(text) {
  const raw = String(text ?? '').trim();

  if (!raw) return [];

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed.map((item) => stripSimpleQuotes(String(item ?? '').trim()));
      }
    } catch {
      return splitRelaxedRow(raw.slice(1, -1));
    }
  }

  return raw
    .split(',')
    .map((item) => stripSimpleQuotes(item.trim()))
    .filter(Boolean);
}

function parseTagMatrix(text) {
  const raw = String(text ?? '').trim();

  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.every((row) => Array.isArray(row))) {
      return parsed.map((row) =>
        row.map((cell) => stripSimpleQuotes(String(cell ?? '').trim()))
      );
    }
  } catch {
    // relaxed parser below
  }

  return parseRelaxedBracketRows(raw) ?? [];
}

function parseRelaxedBracketRows(raw) {
  const text = String(raw ?? '').trim();

  if (!text.startsWith('[') || !text.endsWith(']')) {
    return null;
  }

  const inner = text.slice(1, -1).trim();

  if (!inner) return [];

  const rows = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];

    if (char === '[') {
      if (depth > 0) current += char;
      depth += 1;
      continue;
    }

    if (char === ']') {
      depth -= 1;

      if (depth === 0) {
        rows.push(current);
        current = '';
        continue;
      }

      current += char;
      continue;
    }

    if (depth > 0) {
      current += char;
    }
  }

  if (!rows.length) {
    return [splitRelaxedRow(inner)];
  }

  return rows.map(splitRelaxedRow);
}

function splitRelaxedRow(rowText) {
  return String(rowText)
    .split(',')
    .map((cell) => stripSimpleQuotes(cell.trim()))
    .filter((cell) => cell.length > 0);
}

function stripSimpleQuotes(value) {
  return String(value ?? '').replace(/^['"]|['"]$/g, '');
}

function mergeTags(...tagObjects) {
  const merged = {};

  tagObjects.forEach((tags) => {
    if (!tags || typeof tags !== 'object') return;

    Object.entries(tags).forEach(([key, value]) => {
      if (key == null || key === '') return;
      if (value === undefined || value === null || value === '') return;

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

function boolValue(value, fallback = false) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return Boolean(fallback);
}

function hasNonEmptyText(value) {
  return String(value ?? '').trim().length > 0;
}

function makeFallbackIndexLabel(index) {
  return `item-${index}`;
}

function makeFallbackRowLabel(index) {
  return `row-${index}`;
}

function makeFallbackColumnLabel(index) {
  return `col-${index}`;
}