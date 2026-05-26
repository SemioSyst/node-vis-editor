// src/runtime/runtimeRefs.js

export function makeRuntimeRefFromNode(node, options = {}) {
  const dataRef = node?.dataRef ?? {};
  const meta = node?.meta ?? {};

  const tags =
    dataRef.tags ??
    meta.tags ??
    dataRef.matrixItem?.tags ??
    meta.matrixItem?.tags ??
    null;

  return {
    elementId: node?.id ?? null,
    nodeId: node?.id ?? null,

    scopeIds: options.scopeIds ?? [],

    nodeType: node?.nodeType ?? null,
    elementType: node?.elementType ?? null,
    role: node?.role ?? meta.role ?? null,

    generatorNodeId:
      dataRef.generatorNodeId ??
      meta.generatorNodeId ??
      null,

    collectionId:
      dataRef.collectionId ??
      meta.collectionId ??
      null,

    index: dataRef.index ?? meta.elementIndex ?? null,
    flatIndex: dataRef.flatIndex ?? meta.flatIndex ?? null,
    rowIndex: dataRef.rowIndex ?? meta.rowIndex ?? null,
    colIndex: dataRef.colIndex ?? meta.colIndex ?? null,

    tags,

    dataRef,
    meta,
  };
}

export function makeRuntimeRefFromDom(element) {
  if (!element?.dataset) return null;

  return {
    elementId: element.dataset.nodeId ?? null,
    nodeId: element.dataset.nodeId ?? null,

    elementType: element.dataset.elementType ?? null,
    role: element.dataset.role ?? null,

    generatorNodeId: element.dataset.generatorNodeId ?? null,
    collectionId: element.dataset.collectionId ?? null,

    scopeIds: parseScopeIds(element.dataset.runtimeScopes),
    index: parseNullableNumber(element.dataset.index),
    flatIndex: parseNullableNumber(element.dataset.flatIndex),
    rowIndex: parseNullableNumber(element.dataset.rowIndex),
    colIndex: parseNullableNumber(element.dataset.colIndex),

    tags: parseTags(element.dataset.tags),
  };
}

function parseNullableNumber(value) {
  if (value == null || value === '') return null;

  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}

function parseTags(raw) {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseScopeIds(raw) {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}