// src/evaluator/groups/evalCoordinateGroup.js
import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

export function evalCoordinateGroup(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const layerInputs = ctx.inputs?.byTargetHandle?.layers ?? [];

  const visualInputs = layerInputs.filter((input) => {
    const output = input.value;

    if (!output || output.outputType !== 'visual' || !output.root) {
      warnings.push(
        `Input from "${input.from}" ignored because it is not a visual output.`
      );
      return false;
    }

    return true;
  });

  const resolvedLayers = reconcileLayers({
    layerConfigs: p.layers ?? [],
    layerInputs: visualInputs,
  });

  const coordinateReferenceLayers = resolvedLayers.filter((layer) =>
    isCoordinateReferenceOutput(layer.input?.value)
  );

  const dataDrivenLayers = resolvedLayers.filter((layer) =>
    isDataDrivenVisualOutput(layer.input?.value)
  );

  const primaryAxisLayer =
    coordinateReferenceLayers[0] ?? findFirstAxisLayer(resolvedLayers);

  const primaryAxisOutput = primaryAxisLayer?.input?.value ?? null;
  const coordinateSystem = extractCoordinateSystem(primaryAxisOutput);

  const scaleMatches = compareAllCandidateLayers({
    candidateLayers: dataDrivenLayers,
    coordinateSystem,
  });

  const children = resolvedLayers
    .filter((layer) => layer.visible !== false)
    .map((layer, index) =>
      makeLayerWrapper({
        ctx,
        layer,
        index,
      })
    );

  const inputOutputs = visualInputs
    .map((input) => input.value)
    .filter(Boolean);

  const inputProvenance = inheritProvenance(...inputOutputs);

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'coordinate-group',
    outputType: 'visual',
    label: 'Coordinate Group Output',
    transform: {
      type: 'group-visual-layers',
      layerCount: resolvedLayers.length,
    },
  });

  return {
    outputType: 'visual',
    version: '0.1',

    root: {
      nodeType: 'collection',
      id: `${ctx.nodeId}-coordinate-group`,

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
        role: 'coordinate-group',
        sourceNodeId: ctx.nodeId,

        layerOrder: resolvedLayers.map((layer, index) => ({
          index,
          id: layer.id,
          sourceNodeId: layer.sourceNodeId,

          // User-facing hint only. Do not treat this as the main binding logic.
          layerHint: layer.layerHint ?? layer.role ?? 'auto',

          inferredKind: inferLayerKind(layer.input?.value),

          visible: layer.visible,
          opacity: layer.opacity,
          x: layer.x,
          y: layer.y,
        })),

        bindingContext: makeBindingContext({
          ctx,
          resolvedLayers,
        }),

        coordinateSystem,
        scaleMatches,
      },
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Coordinate Group Output',
      outputRole: 'coordinate-group',
      warnings: [
        ...warnings,
        ...collectScaleMatchWarnings(scaleMatches),
      ],

      provenance: [
        ...inputProvenance,
        ownProvenanceEntry,
      ],

      layerSources: resolvedLayers.map((layer, index) => ({
        index,
        id: layer.id,
        sourceNodeId: layer.sourceNodeId,

        // User-facing hint only.
        layerHint: layer.layerHint ?? layer.role ?? 'auto',

        inferredKind: inferLayerKind(layer.input?.value),

        label: layer.label,
        outputRole: layer.input?.value?.meta?.outputRole ?? null,

        visible: layer.visible !== false,
        opacity: layer.opacity,
        x: layer.x,
        y: layer.y,

        hasCoordinateSystem: Boolean(extractCoordinateSystem(layer.input?.value)),
        hasParameterSources: Boolean(extractParameterSources(layer.input?.value)),
        hasElementLineage: hasElementLevelLineage(layer.input?.value?.root),
      })),

      bindingContext: makeBindingContext({
        ctx,
        resolvedLayers,
      }),

      coordinateSystem,
      scaleMatches,
    },
  };
}

function reconcileLayers({ layerConfigs, layerInputs }) {
  const inputsBySource = new Map();

  layerInputs.forEach((input) => {
    if (!inputsBySource.has(input.from)) {
      inputsBySource.set(input.from, input);
    }
  });

  const connectedSourceIds = new Set(inputsBySource.keys());

  const kept = layerConfigs
    .filter((config) => connectedSourceIds.has(config.sourceNodeId))
    .map((config) => {
      const input = inputsBySource.get(config.sourceNodeId);
      const inferredKind = inferLayerKind(input.value);
      const layerHint = config.layerHint ?? config.role ?? 'auto';

      return {
        id: config.id ?? `layer-${config.sourceNodeId}`,
        sourceNodeId: config.sourceNodeId,
        label: config.label ?? config.sourceNodeId,

        // Keep old role field for backward compatibility,
        // but do not use it as core logic.
        role: layerHint,
        layerHint,

        inferredKind,

        visible: config.visible ?? true,
        opacity: toNumber(config.opacity, 1),
        x: toNumber(config.x, 0),
        y: toNumber(config.y, 0),
        input,
      };
    });

  const existingIds = new Set(kept.map((layer) => layer.sourceNodeId));

  const added = [...inputsBySource.values()]
    .filter((input) => !existingIds.has(input.from))
    .map((input) => ({
      id: `layer-${input.from}`,
      sourceNodeId: input.from,
      label: input.from,
      role: 'auto',
      layerHint: 'auto',
      inferredKind: inferLayerKind(input.value),
      visible: true,
      opacity: 1,
      x: 0,
      y: 0,
      input,
    }));

  return [...kept, ...added];
}

function makeLayerWrapper({ ctx, layer, index }) {
  const sourceOutput = layer.input.value;

  const root = prefixVisualNodeIds(
    sourceOutput.root,
    `${ctx.nodeId}-${layer.id}`
  );

  const inferredKind = inferLayerKind(sourceOutput);

  return {
    nodeType: 'layer',
    id: `${ctx.nodeId}-${layer.id}`,

    frame: {
      x: toNumber(layer.x, 0),
      y: toNumber(layer.y, 0),
      alignX: 'left',
      alignY: 'top',
    },

    transform: {
      x: 0,
      y: 0,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
    },

    opacity: clamp(toNumber(layer.opacity, 1), 0, 1),

    interaction: null,
    bindings: [],

    children: [root],

    meta: {
      sourceNodeId: layer.sourceNodeId,
      layerId: layer.id,
      layerIndex: index,

      // User-facing hint only.
      layerHint: layer.layerHint ?? layer.role ?? 'auto',

      // Structure-based classification for future binding logic.
      inferredKind,

      wrappedOutputRole: sourceOutput.meta?.outputRole ?? null,
      wrappedLabel: sourceOutput.meta?.label ?? null,

      coordinateSystem: extractCoordinateSystem(sourceOutput),
      parameterSources: extractParameterSources(sourceOutput),

      sourceMeta: {
        sourceNodeId: sourceOutput.meta?.sourceNodeId ?? null,
        outputRole: sourceOutput.meta?.outputRole ?? null,
        label: sourceOutput.meta?.label ?? null,
        warnings: sourceOutput.meta?.warnings ?? [],
      },
    },
  };
}

function prefixVisualNodeIds(node, prefix) {
  if (!node || typeof node !== 'object') return node;

  const originalId = node.id ?? null;

  return {
    ...node,
    id: originalId ? `${prefix}-${originalId}` : prefix,

    meta: {
      ...(node.meta ?? {}),
      originalId,
      prefixedBy: prefix,
    },

    children: Array.isArray(node.children)
      ? node.children.map((child, index) =>
          prefixVisualNodeIds(child, `${prefix}-${index}`)
        )
      : node.children,
  };
}

function findFirstAxisLayer(layers) {
  return layers.find((layer) => {
    return extractCoordinateSystem(layer.input?.value);
  });
}

function extractCoordinateSystem(output) {
  return (
    output?.meta?.coordinateSystem ??
    output?.root?.meta?.coordinateSystem ??
    null
  );
}

function compareAllCandidateLayers({ candidateLayers, coordinateSystem }) {
  const result = {};

  if (!coordinateSystem) {
    return {
      status: 'no-axis-coordinate-system',
      warning: 'No axis coordinate system found in CoordinateGroup.',
      layers: {},
    };
  }

  candidateLayers.forEach((layer) => {
    const parameterSources = extractParameterSources(layer.input?.value);

    result[layer.id] = {
      sourceNodeId: layer.sourceNodeId,
      layerHint: layer.layerHint ?? layer.role ?? 'auto',
      inferredKind: inferLayerKind(layer.input?.value),

      x: compareAxisAndMarksScale({
        axisDimension: coordinateSystem.x,
        marksParameterSource: parameterSources?.x,
        dimension: 'x',
      }),

      y: compareAxisAndMarksScale({
        axisDimension: coordinateSystem.y,
        marksParameterSource: parameterSources?.y,
        dimension: 'y',
      }),
    };
  });

  return {
    status: 'checked',
    layers: result,
  };
}

function extractParameterSources(output) {
  return (
    output?.meta?.parameterSources ??
    output?.root?.meta?.parameterSources ??
    null
  );
}

function isCoordinateReferenceOutput(output) {
  return Boolean(
    output?.meta?.coordinateSystem ||
    output?.meta?.tickSummary ||
    output?.root?.meta?.coordinateSystem
  );
}

function isDataDrivenVisualOutput(output) {
  if (!output || output.outputType !== 'visual') return false;

  if (isCoordinateReferenceOutput(output)) return false;

  return Boolean(
    output?.meta?.parameterSources ||
    output?.root?.meta?.parameterSources ||
    hasElementLevelLineage(output?.root)
  );
}

function hasElementLevelLineage(node) {
  if (!node) return false;

  if (
    node?.dataRef?.parameterLineage ||
    node?.meta?.parameterLineage
  ) {
    return true;
  }

  return Array.isArray(node.children)
    ? node.children.some(hasElementLevelLineage)
    : false;
}

function inferLayerKind(output) {
  if (isCoordinateReferenceOutput(output)) return 'coordinate-reference';
  if (isDataDrivenVisualOutput(output)) return 'data-driven-visual';
  if (output?.outputType === 'visual') return 'visual';
  return 'unknown';
}

function makeBindingContext({ ctx, resolvedLayers }) {
  const layers = resolvedLayers.map((layer, index) => {
    const output = layer.input?.value;

    return {
      index,
      id: layer.id,
      sourceNodeId: layer.sourceNodeId,
      label: layer.label,

      layerHint: layer.layerHint ?? layer.role ?? 'auto',
      inferredKind: inferLayerKind(output),

      visible: layer.visible !== false,
      opacity: layer.opacity,
      x: layer.x,
      y: layer.y,

      hasCoordinateSystem: Boolean(extractCoordinateSystem(output)),
      hasParameterSources: Boolean(extractParameterSources(output)),
      hasElementLineage: hasElementLevelLineage(output?.root),

      outputRole: output?.meta?.outputRole ?? null,
      outputLabel: output?.meta?.label ?? null,
    };
  });

  return {
    coordinateGroupId: `${ctx.nodeId}-coordinate-group`,

    layers,

    coordinateReferenceLayerIds: layers
      .filter((layer) => layer.inferredKind === 'coordinate-reference')
      .map((layer) => layer.id),

    dataDrivenLayerIds: layers
      .filter((layer) => layer.inferredKind === 'data-driven-visual')
      .map((layer) => layer.id),
  };
}

function compareAxisAndMarksScale({
  axisDimension,
  marksParameterSource,
  dimension,
}) {
  if (!axisDimension) {
    return {
      matched: false,
      confidence: 'none',
      matchType: 'missing-axis-dimension',
      warning: `No ${dimension} axis dimension found.`,
    };
  }

  const axisScale = normalizeAxisScale(axisDimension);
  const marksScale = normalizeMarksScale(marksParameterSource);

  if (!marksParameterSource) {
    return {
      matched: true,
      confidence: 'low',
      matchType: 'visual-space-assumed',
      axisScale,
      marksScale: null,
      warning: `Marks have no ${dimension} parameter source. Values are assumed to already be in visual space.`,
    };
  }

  if (!marksScale) {
    return {
      matched: true,
      confidence: 'low',
      matchType: 'visual-space-assumed',
      axisScale,
      marksScale: null,
      warning: `Marks ${dimension} has no scale metadata. Values are treated as visual-space coordinates.`,
    };
  }

  if (
    axisScale.scaleId &&
    marksScale.scaleId &&
    axisScale.scaleId === marksScale.scaleId
  ) {
    return {
      matched: true,
      confidence: 'high',
      matchType: 'same-scale-source',
      axisScale,
      marksScale,
    };
  }

  if (areScaleDefinitionsEquivalent(axisScale, marksScale)) {
    return {
      matched: true,
      confidence: 'medium',
      matchType: 'equivalent-scale-definition',
      axisScale,
      marksScale,
    };
  }

  if (areRangesCompatible(axisScale.range, marksScale.range)) {
    return {
      matched: true,
      confidence: 'low',
      matchType: 'range-compatible',
      axisScale,
      marksScale,
      warning: `${dimension} scales have compatible visual ranges, but their domains or scale definitions differ.`,
    };
  }

  return {
    matched: false,
    confidence: 'none',
    matchType: 'unmatched',
    axisScale,
    marksScale,
    warning: `Marks ${dimension} scale is not compatible with axis ${dimension} scale.`,
  };
}

function normalizeAxisScale(axisDimension) {
  const source = axisDimension.sourceScale ?? {};

  return {
    scaleId: source.scaleId ?? null,
    scaleType: axisDimension.scaleType ?? source.scaleType ?? null,
    scaleFamily: axisDimension.scaleFamily ?? source.scaleFamily ?? null,
    domain: axisDimension.domain ?? source.domain ?? null,
    range: axisDimension.range ?? source.interpretedRange ?? source.originalRange ?? null,
    bandwidth: axisDimension.bandwidth ?? source.bandwidth ?? null,
    step: axisDimension.step ?? source.step ?? null,
    paddingInner: axisDimension.paddingInner ?? source.paddingInner ?? null,
    paddingOuter: axisDimension.paddingOuter ?? source.paddingOuter ?? null,
  };
}

function normalizeMarksScale(parameterSource) {
  const scale = parameterSource?.scale;

  if (!scale) return null;

  return {
    scaleId: scale.scaleId ?? null,
    scaleType: scale.scaleType ?? null,
    scaleFamily: scale.scaleFamily ?? scale.d3?.scaleFamily ?? null,
    domain: scale.domain ?? null,
    range: scale.range ?? null,
    bandwidth: scale.d3?.bandwidth ?? scale.bandwidth ?? null,
    step: scale.d3?.step ?? scale.step ?? null,
    paddingInner: scale.d3?.paddingInner ?? scale.paddingInner ?? null,
    paddingOuter: scale.d3?.paddingOuter ?? scale.paddingOuter ?? null,
  };
}

function areScaleDefinitionsEquivalent(a, b) {
  if (!a || !b) return false;

  if (a.scaleType !== b.scaleType) return false;

  if (!areDomainsEquivalent(a.domain, b.domain)) return false;

  if (!areRangesCompatible(a.range, b.range)) return false;

  if (a.scaleType === 'band' || a.scaleType === 'point') {
    return (
      approxNullable(a.bandwidth, b.bandwidth) &&
      approxNullable(a.step, b.step) &&
      approxNullable(a.paddingInner, b.paddingInner) &&
      approxNullable(a.paddingOuter, b.paddingOuter)
    );
  }

  return true;
}

function areDomainsEquivalent(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;

  return a.every((value, index) => {
    const other = b[index];

    const n1 = Number(value);
    const n2 = Number(other);

    if (Number.isFinite(n1) && Number.isFinite(n2)) {
      return approx(n1, n2);
    }

    return String(value) === String(other);
  });
}

function areRangesCompatible(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length < 2 || b.length < 2) return false;

  const aLength = Math.abs(Number(a[1]) - Number(a[0]));
  const bLength = Math.abs(Number(b[1]) - Number(b[0]));

  if (!Number.isFinite(aLength) || !Number.isFinite(bLength)) return false;

  return approx(aLength, bLength);
}

function collectScaleMatchWarnings(scaleMatches) {
  const warnings = [];

  if (!scaleMatches || scaleMatches.status !== 'checked') {
    if (scaleMatches?.warning) warnings.push(scaleMatches.warning);
    return warnings;
  }

  Object.values(scaleMatches.layers ?? {}).forEach((layerMatch) => {
    ['x', 'y'].forEach((dimension) => {
      const match = layerMatch[dimension];

      if (match?.warning) {
        warnings.push(match.warning);
      }
    });
  });

  return warnings;
}

function approx(a, b, epsilon = 1e-6) {
  return Math.abs(Number(a) - Number(b)) <= epsilon;
}

function approxNullable(a, b) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return approx(a, b);
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}