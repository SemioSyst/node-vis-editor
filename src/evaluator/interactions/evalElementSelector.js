// src/evaluator/interactions/evalElementSelector.js

import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

export function evalElementSelector(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const visualOutput = getFirstInputValue(ctx, 'visual');

  if (!visualOutput || visualOutput.outputType !== 'visual') {
    return {
      outputType: 'elementSelection',
      version: '0.1',

      sourceVisual: null,

      selector: {
        type: 'none',
      },

      preview: {
        totalCount: 0,
        selectedCount: 0,
        rows: [],
        availableTags: [],
      },

      meta: {
        sourceNodeId: ctx.nodeId,
        label: 'Element Selection',
        warnings: ['Element Selector expects a visual input.'],

        provenance: [
          makeProvenanceEntry({
            nodeId: ctx.nodeId,
            role: 'element-selector',
            outputType: 'elementSelection',
            label: 'Element Selection',
            transform: {
              type: 'select-elements',
              status: 'no-visual-input',
            },
          }),
        ],
      },
    };
  }

  const selector = makeSelector({
    params: p,
    warnings,
  });

  const scopeId = resolveVisualScopeId(visualOutput);
  const elements = flattenVisualElements(visualOutput.root);

  const previewRows = elements.map((node, index) => {
    const ref = makeElementRef(node, index);
    const selected = matchesSelection(selector, ref);

    return {
      id: node.id,
      index: ref.index,
      flatIndex: ref.flatIndex,
      rowIndex: ref.rowIndex,
      colIndex: ref.colIndex,
      elementType: ref.elementType,
      role: ref.role,
      selected,
      tags: ref.tags,
    };
  });

  const selectedRows = previewRows.filter((row) => row.selected);

  const availableTags = collectAvailableTags(previewRows);

  const inputProvenance = inheritProvenance(visualOutput);

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'element-selector',
    outputType: 'elementSelection',
    label: 'Element Selection',
    transform: {
      type: 'select-elements',
      selectMode: p.selectMode ?? 'all',
      selector,
      scopeId,
      totalCount: elements.length,
      selectedCount: selectedRows.length,
    },
  });

  return {
    outputType: 'elementSelection',
    version: '0.1',

    sourceVisual: {
      scopeId,
      rootId: visualOutput.root?.id ?? null,
      sourceNodeId: visualOutput.meta?.sourceNodeId ?? null,
      label: visualOutput.meta?.label ?? null,
    },

    selector,

    preview: {
      totalCount: elements.length,
      selectedCount: selectedRows.length,
      rows: previewRows.slice(0, 100),
      availableTags,
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Element Selection',

      warnings,

      sourceVisual: {
        scopeId,
        rootId: visualOutput.root?.id ?? null,
        sourceNodeId: visualOutput.meta?.sourceNodeId ?? null,
        label: visualOutput.meta?.label ?? null,
      },

      selector,
      totalCount: elements.length,
      selectedCount: selectedRows.length,
      availableTags,

      provenance: [
        ...inputProvenance,
        ownProvenanceEntry,
      ],
    },
  };
}

function getFirstInputValue(ctx, handleId) {
  return ctx.inputs?.byTargetHandle?.[handleId]?.[0]?.value ?? null;
}

function makeSelector({
  params,
  warnings,
}) {
  const mode = params.selectMode ?? 'all';

  if (mode === 'byTag') {
    const tagKey = resolveTagKey(params);
    const tagValue = String(params.tagValue ?? '').trim();

    if (!tagKey) {
      warnings.push('Tag selector needs a tag key.');
    }

    if (!tagValue) {
      warnings.push('Tag selector needs a tag value.');
    }

    return {
      type: 'tagEquals',
      tagKey,
      value: tagValue,
    };
  }

  if (mode === 'byRow') {
    return {
      type: 'rowEquals',
      rowIndex: Math.max(0, Math.round(Number(params.rowIndex ?? 0))),
    };
  }

  if (mode === 'byColumn') {
    return {
      type: 'columnEquals',
      colIndex: Math.max(0, Math.round(Number(params.colIndex ?? 0))),
    };
  }

  if (mode === 'byIndexRange') {
    const start = Math.max(0, Math.round(Number(params.indexStart ?? 0)));
    const end = Math.max(start, Math.round(Number(params.indexEnd ?? start)));

    return {
      type: 'indexRange',
      start,
      end,
    };
  }

  return {
    type: 'all',
  };
}

function resolveTagKey(params) {
  const preset = params.tagKeyPreset ?? 'item';

  if (preset === 'custom') {
    return String(params.customTagKey ?? '').trim() || 'item';
  }

  return preset;
}

function resolveVisualScopeId(output) {
  return (
    output.root?.id ??
    output.meta?.sourceNodeId ??
    output.meta?.label ??
    'visual'
  );
}

function flattenVisualElements(node) {
  if (!node) return [];

  const own =
    node.nodeType === 'element'
      ? [node]
      : [];

  const children = (node.children ?? []).flatMap(flattenVisualElements);

  return [
    ...own,
    ...children,
  ];
}

function makeElementRef(node, fallbackIndex) {
  const dataRef = node.dataRef ?? {};
  const meta = node.meta ?? {};

  const tags =
    dataRef.tags ??
    meta.tags ??
    dataRef.matrixItem?.tags ??
    meta.matrixItem?.tags ??
    null;

  return {
    id: node.id,
    elementType: node.elementType ?? null,
    role: node.role ?? meta.role ?? null,

    index: dataRef.index ?? meta.elementIndex ?? fallbackIndex,
    flatIndex: dataRef.flatIndex ?? meta.flatIndex ?? null,
    rowIndex: dataRef.rowIndex ?? meta.rowIndex ?? null,
    colIndex: dataRef.colIndex ?? meta.colIndex ?? null,

    tags,
  };
}

function matchesSelection(selector, ref) {
  if (!selector) return false;

  if (selector.type === 'all') {
    return true;
  }

  if (selector.type === 'none') {
    return false;
  }

  if (selector.type === 'tagEquals') {
    return (
      selector.tagKey &&
      ref.tags?.[selector.tagKey] === selector.value
    );
  }

  if (selector.type === 'rowEquals') {
    return (
      ref.rowIndex != null &&
      ref.rowIndex === selector.rowIndex
    );
  }

  if (selector.type === 'columnEquals') {
    return (
      ref.colIndex != null &&
      ref.colIndex === selector.colIndex
    );
  }

  if (selector.type === 'indexRange') {
    const index = ref.flatIndex ?? ref.index;

    return (
      index != null &&
      index >= selector.start &&
      index <= selector.end
    );
  }

  return false;
}

function collectAvailableTags(rows) {
  const map = new Map();

  rows.forEach((row) => {
    if (!row.tags || typeof row.tags !== 'object') return;

    Object.entries(row.tags).forEach(([key, value]) => {
      if (!map.has(key)) {
        map.set(key, new Set());
      }

      map.get(key).add(String(value));
    });
  });

  return [...map.entries()].map(([key, values]) => ({
    key,
    values: [...values],
  }));
}