// src/evaluator/mappers/evalColourMapper.js

import { rgb } from 'd3-color';

import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

import {
  getSequentialInterpolator,
  getDivergingInterpolator,
  getCategoricalPalette,
} from './colorSchemes.js';

export function evalColourMapper(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const inputOutput = getFirstInputValue(ctx, 'input');
  const inputInfo = normalizeInput(inputOutput);

  if (!inputInfo) {
    return {
      outputType: 'parameter',
      version: '0.1',
      parameterType: 'colorArray',
      values: [],
      meta: {
        sourceNodeId: ctx.nodeId,
        label: 'Colour Mapper Output',
        warnings: ['No readable input connected to ColourMapper.'],
        provenance: [
          makeProvenanceEntry({
            nodeId: ctx.nodeId,
            role: 'colour-mapper',
            outputType: 'parameter',
            parameterType: 'colorArray',
            label: 'Colour Mapper Output',
            transform: {
              type: 'colour-map',
              status: 'no-input',
            },
          }),
        ],
      },
    };
  }

  const colourMode = p.colourMode ?? 'sequential';
  const domainMode = p.domainMode ?? 'auto';
  const reverse = Boolean(p.reverse ?? false);
  const clamp = p.clamp ?? true;
  const missingColour = p.missingColour ?? '#cccccc';

  const mapper = createColourMapper({
    params: p,
    inputInfo,
    colourMode,
    domainMode,
    reverse,
    clamp,
    missingColour,
    warnings,
  });

  const mappedItems = inputInfo.values.map((value, index) => {
    const inputItem = getInputItem(inputInfo, index);
    const tags = getTagsForIndex(inputInfo, index);

    const result = mapper.map(value, index, inputItem);

    return {
      index,

      flatIndex: inputItem?.flatIndex ?? index,
      rowIndex: inputItem?.rowIndex ?? null,
      colIndex: inputItem?.colIndex ?? null,
      rowLabel: inputItem?.rowLabel ?? null,
      colLabel: inputItem?.colLabel ?? null,

      rawValue: inputItem?.rawValue ?? inputItem?.value ?? inputInfo.rawValues?.[index] ?? value,
      inputValue: value,

      normalizedValue: result.normalizedValue ?? null,
      color: result.color,

      category: result.category ?? null,
      tags,

      sourceItem: inputItem ?? null,
    };
  });

  const colourValues = mappedItems.map((item) => item.color);

  const parameterType =
    inputInfo.kind === 'scalar'
      ? 'color'
      : 'colorArray';

  const inputProvenance = inheritProvenance(inputOutput);

  const colorScaleMeta = {
    mode: colourMode,

    domainMode,
    domain: mapper.domain ?? null,
    center: mapper.center ?? null,

    scheme: mapper.schemeName ?? null,
    reverse,
    clamp,
    missingColour,

    categories: mapper.categories ?? null,
    palette: mapper.palette ?? null,
  };

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'colour-mapper',
    outputType: 'parameter',
    parameterType,
    label: 'Colour Mapper Output',
    transform: {
      type: 'colour-map',
      mode: colourMode,
      domainMode,
      domain: mapper.domain ?? null,
      scheme: mapper.schemeName ?? null,
      reverse,
      clamp,
    },
  });

  const meta = {
    sourceNodeId: ctx.nodeId,
    label: 'Colour Mapper Output',
    role: 'colour-parameter',
    warnings,

    provenance: [
      ...inputProvenance,
      ownProvenanceEntry,
    ],

    input: {
      sourceNodeId: inputInfo.sourceNodeId,
      outputType: inputOutput?.outputType,
      dataType: inputOutput?.dataType,
      parameterType: inputOutput?.parameterType,
      rawValues: inputInfo.rawValues,
      values: inputInfo.values,
      valueType: inputInfo.valueType,
      matrix: inputInfo.matrix ?? null,
      tags: inputInfo.tags ?? null,
      taggedItems: inputInfo.taggedItems ?? null,
      meta: inputOutput?.meta ?? null,
    },

    colorScale: colorScaleMeta,
    colourScale: colorScaleMeta,

    tags: inputInfo.tags ?? null,
    taggedItems: makeTaggedItemsFromMappedItems(mappedItems),

    mappedItems,

    matrix: inputInfo.matrix ?? null,
    matrixItems: inputInfo.matrix
      ? makeMatrixItemsFromMappedItems(mappedItems)
      : null,
  };

  if (parameterType === 'color') {
    return {
      outputType: 'parameter',
      version: '0.1',
      parameterType,
      value: colourValues[0] ?? missingColour,
      meta,
    };
  }

  return {
    outputType: 'parameter',
    version: '0.1',
    parameterType,
    values: colourValues,
    meta,
  };
}

/* -------------------------------------------------------------------------- */
/* Input normalization                                                         */
/* -------------------------------------------------------------------------- */

function getFirstInputValue(ctx, handleId) {
  return ctx.inputs?.byTargetHandle?.[handleId]?.[0]?.value ?? null;
}

function normalizeInput(output) {
  if (!output) return null;

  const meta = output.meta ?? {};

  if (
    output.dataType === 'matrix' ||
    output.parameterType === 'matrix' ||
    meta.matrix
  ) {
    return normalizeMatrixInput(output);
  }

  if (Array.isArray(output.values)) {
    return {
      kind: 'array',
      values: output.values,
      rawValues: output.values,
      valueType: inferValueType(output.values),
      sourceNodeId: meta.sourceNodeId,
      tags: meta.tags ?? null,
      taggedItems: meta.taggedItems ?? null,
      matrix: null,
      items: meta.mappedItems ?? meta.items ?? null,
      inputMeta: meta,
    };
  }

  if ('value' in output) {
    return {
      kind: 'scalar',
      values: [output.value],
      rawValues: [output.value],
      valueType: inferValueType([output.value]),
      sourceNodeId: meta.sourceNodeId,
      tags: meta.tags ?? null,
      taggedItems: meta.taggedItems ?? null,
      matrix: null,
      items: null,
      inputMeta: meta,
    };
  }

  return null;
}

function normalizeMatrixInput(output) {
  const meta = output.meta ?? {};
  const matrix = meta.matrix ?? {};

  if (isNestedArray(output.values)) {
    const values = [];
    const items = [];

    const rows = output.values.length;
    const cols = Math.max(
      0,
      ...output.values.map((row) => Array.isArray(row) ? row.length : 0)
    );

    output.values.forEach((row, rowIndex) => {
      if (!Array.isArray(row)) return;

      row.forEach((value, colIndex) => {
        const flatIndex = values.length;
        const existingItem = findMatrixItem(meta, flatIndex, rowIndex, colIndex);

        values.push(value);

        items.push({
          ...(existingItem ?? {}),
          index: flatIndex,
          flatIndex,
          rowIndex,
          colIndex,
          rowLabel: existingItem?.rowLabel ?? matrix.rowLabels?.[rowIndex] ?? null,
          colLabel: existingItem?.colLabel ?? matrix.colLabels?.[colIndex] ?? null,
          value: existingItem?.value ?? value,
          rawValue: existingItem?.rawValue ?? value,
          tags: existingItem?.tags ?? getTagsForIndexFromMeta(meta, flatIndex),
        });
      });
    });

    return {
      kind: 'matrix',
      values,
      rawValues: values,
      valueType: inferValueType(values),
      sourceNodeId: meta.sourceNodeId,
      tags: meta.tags ?? null,
      taggedItems: meta.taggedItems ?? null,
      matrix: {
        rows,
        cols,
        flatCount: values.length,
        order: matrix.order ?? 'row-major',
        rowLabels: matrix.rowLabels ?? null,
        colLabels: matrix.colLabels ?? null,
      },
      items,
      inputMeta: meta,
    };
  }

  const values = Array.isArray(output.values) ? output.values : [];
  const rows = Number(matrix.rows ?? 0);
  const cols = Number(matrix.cols ?? 0);

  const items = values.map((value, flatIndex) => {
    const existingItem = findMatrixItem(
      meta,
      flatIndex,
      Math.floor(flatIndex / Math.max(cols, 1)),
      cols > 0 ? flatIndex % cols : 0
    );

    const rowIndex =
      existingItem?.rowIndex ??
      (cols > 0 ? Math.floor(flatIndex / cols) : null);

    const colIndex =
      existingItem?.colIndex ??
      (cols > 0 ? flatIndex % cols : null);

    return {
      ...(existingItem ?? {}),
      index: flatIndex,
      flatIndex,
      rowIndex,
      colIndex,
      rowLabel: existingItem?.rowLabel ?? matrix.rowLabels?.[rowIndex] ?? null,
      colLabel: existingItem?.colLabel ?? matrix.colLabels?.[colIndex] ?? null,
      value: existingItem?.value ?? value,
      rawValue: existingItem?.rawValue ?? value,
      tags: existingItem?.tags ?? getTagsForIndexFromMeta(meta, flatIndex),
    };
  });

  return {
    kind: 'matrix',
    values,
    rawValues: values,
    valueType: inferValueType(values),
    sourceNodeId: meta.sourceNodeId,
    tags: meta.tags ?? null,
    taggedItems: meta.taggedItems ?? null,
    matrix: {
      rows,
      cols,
      flatCount: values.length,
      order: matrix.order ?? 'row-major',
      rowLabels: matrix.rowLabels ?? null,
      colLabels: matrix.colLabels ?? null,
    },
    items,
    inputMeta: meta,
  };
}

function isNestedArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.some((item) => Array.isArray(item))
  );
}

function findMatrixItem(meta, flatIndex, rowIndex, colIndex) {
  const candidates =
    meta.matrixItems ??
    meta.mappedItems ??
    meta.items ??
    null;

  if (!Array.isArray(candidates)) return null;

  return candidates.find((item) =>
    item.flatIndex === flatIndex ||
    item.index === flatIndex ||
    (
      item.rowIndex === rowIndex &&
      item.colIndex === colIndex
    )
  ) ?? null;
}

function getInputItem(inputInfo, index) {
  if (Array.isArray(inputInfo.items)) {
    return inputInfo.items[index] ?? null;
  }

  return null;
}

function getTagsForIndex(inputInfo, index) {
  const item = getInputItem(inputInfo, index);

  if (item?.tags) return item.tags;

  const tagged = inputInfo.taggedItems;

  if (Array.isArray(tagged)) {
    const match = tagged.find((entry) =>
      entry.index === index ||
      entry.flatIndex === index
    );

    if (match?.tags) return match.tags;
  }

  return inputInfo.tags ?? null;
}

function getTagsForIndexFromMeta(meta, index) {
  const tagged = meta.taggedItems;

  if (Array.isArray(tagged)) {
    const match = tagged.find((entry) =>
      entry.index === index ||
      entry.flatIndex === index
    );

    if (match?.tags) return match.tags;
  }

  return meta.tags ?? null;
}

function inferValueType(values) {
  const valid = values.filter(
    (value) => value !== null && value !== undefined && value !== ''
  );

  if (valid.length === 0) return 'empty';

  const allNumbers = valid.every((value) =>
    Number.isFinite(Number(value))
  );

  return allNumbers ? 'number' : 'category';
}

/* -------------------------------------------------------------------------- */
/* Colour mapping                                                              */
/* -------------------------------------------------------------------------- */

function createColourMapper({
  params,
  inputInfo,
  colourMode,
  domainMode,
  reverse,
  clamp,
  missingColour,
  warnings,
}) {
  if (colourMode === 'categorical') {
    return createCategoricalMapper({
      params,
      inputInfo,
      reverse,
      missingColour,
      warnings,
    });
  }

  if (colourMode === 'manual') {
    return createManualMapper({
      params,
      inputInfo,
      reverse,
      missingColour,
      warnings,
    });
  }

  if (colourMode === 'diverging') {
    return createDivergingMapper({
      params,
      inputInfo,
      domainMode,
      reverse,
      clamp,
      missingColour,
      warnings,
    });
  }

  return createSequentialMapper({
    params,
    inputInfo,
    domainMode,
    reverse,
    clamp,
    missingColour,
    warnings,
  });
}

function createSequentialMapper({
  params,
  inputInfo,
  domainMode,
  reverse,
  clamp,
  missingColour,
  warnings,
}) {
  const schemeName = params.sequentialScheme ?? 'viridis';
  const interpolator = getSequentialInterpolator(schemeName);

  const numericValues = getNumericValues(inputInfo.values);
  const autoDomain = getExtent(numericValues);

  if (!autoDomain) {
    warnings.push('Sequential colour mapping requires numeric values. Missing colour is used for non-numeric values.');
  }

  const domain =
    domainMode === 'manual'
      ? [
          toNumber(params.domainMin, autoDomain?.[0] ?? 0),
          toNumber(params.domainMax, autoDomain?.[1] ?? 1),
        ]
      : autoDomain ?? [0, 1];

  return {
    schemeName,
    domain,
    center: null,
    categories: null,
    palette: null,

    map(value) {
      const n = Number(value);

      if (!Number.isFinite(n) || domain[0] === domain[1]) {
        return {
          color: normalizeColour(missingColour),
          normalizedValue: null,
        };
      }

      let t = (n - domain[0]) / (domain[1] - domain[0]);

      if (clamp) {
        t = clamp01(t);
      }

      if (reverse) {
        t = 1 - t;
      }

      return {
        color: normalizeColour(interpolator(t)),
        normalizedValue: t,
      };
    },
  };
}

function createDivergingMapper({
  params,
  inputInfo,
  domainMode,
  reverse,
  clamp,
  missingColour,
  warnings,
}) {
  const schemeName = params.divergingScheme ?? 'rdBu';
  const interpolator = getDivergingInterpolator(schemeName);

  const numericValues = getNumericValues(inputInfo.values);
  const autoExtent = getExtent(numericValues);

  if (!autoExtent) {
    warnings.push('Diverging colour mapping requires numeric values. Missing colour is used for non-numeric values.');
  }

  const center = toNumber(params.domainCenter, 0);
  let min;
  let max;

  if (domainMode === 'manual') {
    min = toNumber(params.domainMin, autoExtent?.[0] ?? -1);
    max = toNumber(params.domainMax, autoExtent?.[1] ?? 1);
  } else {
    min = autoExtent?.[0] ?? -1;
    max = autoExtent?.[1] ?? 1;
  }

  if (params.symmetricDomain ?? true) {
    const radius = Math.max(
      Math.abs(min - center),
      Math.abs(max - center),
      1e-9
    );

    min = center - radius;
    max = center + radius;
  }

  const domain = [min, center, max];

  return {
    schemeName,
    domain,
    center,
    categories: null,
    palette: null,

    map(value) {
      const n = Number(value);

      if (!Number.isFinite(n) || min === max) {
        return {
          color: normalizeColour(missingColour),
          normalizedValue: null,
        };
      }

      let t;

      if (n <= center) {
        t = 0.5 * ((n - min) / (center - min || 1));
      } else {
        t = 0.5 + 0.5 * ((n - center) / (max - center || 1));
      }

      if (clamp) {
        t = clamp01(t);
      }

      if (reverse) {
        t = 1 - t;
      }

      return {
        color: normalizeColour(interpolator(t)),
        normalizedValue: t,
      };
    },
  };
}

function createCategoricalMapper({
  params,
  inputInfo,
  reverse,
  missingColour,
  warnings,
}) {
  const schemeName = params.categoricalScheme ?? 'tableau10';
  let palette = [...getCategoricalPalette(schemeName)];

  if (reverse) {
    palette = [...palette].reverse();
  }

  if (!palette.length) {
    palette = [missingColour];
    warnings.push('Categorical palette is empty. Missing colour is used.');
  }

  const categories = uniqueValues(
    inputInfo.values
      .filter((value) => value !== null && value !== undefined && value !== '')
      .map((value) => String(value))
  );

  const categoryIndex = new Map(
    categories.map((category, index) => [category, index])
  );

  return {
    schemeName,
    domain: null,
    center: null,
    categories,
    palette,

    map(value) {
      if (value === null || value === undefined || value === '') {
        return {
          color: normalizeColour(missingColour),
          normalizedValue: null,
          category: null,
        };
      }

      const category = String(value);
      const index = categoryIndex.get(category) ?? 0;
      const color = palette[index % palette.length];

      return {
        color: normalizeColour(color),
        normalizedValue: palette.length <= 1 ? 0 : index / (palette.length - 1),
        category,
      };
    },
  };
}

function createManualMapper({
  params,
  inputInfo,
  reverse,
  missingColour,
  warnings,
}) {
  let palette = parseColourList(
    params.manualColours ?? '[#5b78ff,#ff7a59,#36c285,#f2c94c]'
  );

  if (reverse) {
    palette = [...palette].reverse();
  }

  if (!palette.length) {
    palette = [missingColour];
    warnings.push('Manual palette is empty. Missing colour is used.');
  }

  const categories = uniqueValues(
    inputInfo.values
      .filter((value) => value !== null && value !== undefined && value !== '')
      .map((value) => String(value))
  );

  const categoryIndex = new Map(
    categories.map((category, index) => [category, index])
  );

  return {
    schemeName: 'manual',
    domain: null,
    center: null,
    categories,
    palette,

    map(value, index) {
      let colorIndex = index;

      if (value !== null && value !== undefined && value !== '') {
        const category = String(value);

        if (categoryIndex.has(category)) {
          colorIndex = categoryIndex.get(category);
        }
      }

      const color = palette[colorIndex % palette.length] ?? missingColour;

      return {
        color: normalizeColour(color),
        normalizedValue: palette.length <= 1 ? 0 : colorIndex / (palette.length - 1),
        category: value == null ? null : String(value),
      };
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Output metadata                                                             */
/* -------------------------------------------------------------------------- */

function makeTaggedItemsFromMappedItems(mappedItems) {
  return mappedItems.map((item) => ({
    index: item.index,
    flatIndex: item.flatIndex,
    rowIndex: item.rowIndex,
    colIndex: item.colIndex,
    tags: item.tags ?? null,
  }));
}

function makeMatrixItemsFromMappedItems(mappedItems) {
  return mappedItems.map((item) => ({
    index: item.index,
    flatIndex: item.flatIndex,
    rowIndex: item.rowIndex,
    colIndex: item.colIndex,
    rowLabel: item.rowLabel,
    colLabel: item.colLabel,

    // This is the value ShapeGenerator will see when this output is used as fill.
    value: item.color,

    rawValue: item.rawValue,
    inputValue: item.inputValue,
    mappedValue: item.color,
    normalizedValue: item.normalizedValue,

    color: item.color,
    tags: item.tags ?? null,
  }));
}

/* -------------------------------------------------------------------------- */
/* Parsing / formatting                                                        */
/* -------------------------------------------------------------------------- */

function getNumericValues(values) {
  return values
    .map((value) => Number(value))
    .filter(Number.isFinite);
}

function getExtent(values) {
  if (!values.length) return null;

  return [
    Math.min(...values),
    Math.max(...values),
  ];
}

function parseColourList(text) {
  const raw = String(text ?? '').trim();

  if (!raw) return [];

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      return splitRelaxedList(raw.slice(1, -1));
    }
  }

  return splitRelaxedList(raw);
}

function splitRelaxedList(text) {
  return String(text ?? '')
    .split(',')
    .map((item) => stripSimpleQuotes(item.trim()))
    .filter(Boolean);
}

function stripSimpleQuotes(value) {
  return String(value ?? '').replace(/^['"]|['"]$/g, '');
}

function normalizeColour(value) {
  const parsed = rgb(value);

  if (!parsed) {
    return String(value ?? '#cccccc');
  }

  return parsed.formatHex();
}

function uniqueValues(values) {
  const result = [];
  const seen = new Set();

  values.forEach((value) => {
    const key = String(value);

    if (seen.has(key)) return;

    seen.add(key);
    result.push(value);
  });

  return result;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}