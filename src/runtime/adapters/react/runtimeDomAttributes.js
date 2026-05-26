// src/runtime/runtimeDomAttributes.js

export function getRuntimeDomAttributes(node, options = {}) {
  const tags =
    node.dataRef?.tags ??
    node.meta?.tags ??
    node.dataRef?.matrixItem?.tags ??
    node.meta?.matrixItem?.tags ??
    null;

  return {
    'data-node-id': node.id,
    'data-element-type': node.elementType,
    'data-role': node.role,

    'data-runtime-scopes': options.scopeIds?.length
      ? JSON.stringify(options.scopeIds)
      : undefined,

    'data-generator-node-id': node.dataRef?.generatorNodeId,
    'data-collection-id': node.dataRef?.collectionId,

    'data-index': node.dataRef?.index,
    'data-flat-index': node.dataRef?.flatIndex,
    'data-row-index': node.dataRef?.rowIndex,
    'data-col-index': node.dataRef?.colIndex,

    'data-tags': tags ? JSON.stringify(tags) : undefined,
  };
}