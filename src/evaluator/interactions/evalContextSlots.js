// src/evaluator/interactions/evalContextSlots.js

import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

import { mergeRuntimeSpecs } from '../../runtime/spec/runtimeSpecUtils.js';
import {
  getDefaultPropertyForKind,
  inferFormatForProperty,
  scanContextSlotElements,
} from '../../context/contextSlotElements.js';

export function evalContextSlots(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const visualOutput = getFirstInputValue(ctx, 'visual');

  if (!visualOutput || visualOutput.outputType !== 'visual') {
    return makeEmptyVisualOutput(ctx, [
      'Context Slots expects a visual input.',
    ]);
  }

    const componentRuntimeSpec =
        visualOutput.runtimeSpec ??
        visualOutput.meta?.runtimeSpec ??
    null;

    const availableElements = scanContextSlotElements(
    visualOutput.root,
        {
            runtimeSpec: componentRuntimeSpec,
        }
    );
  const registeredElements = normalizeRegisteredElements({
    registeredElements: p.registeredElements ?? [],
    availableElements,
    warnings,
  });

  const contextSlots = {
    id: `${ctx.nodeId}:context-slots`,
    version: '0.1',

    componentScopeId: resolveVisualScopeId(visualOutput),

    runtimeSpec: componentRuntimeSpec,

    availableElements,

    registeredElements,

    bindings: registeredElements.flatMap((element) =>
        (element.bindings ?? []).map((binding) => ({
        ...binding,
        elementId: element.elementId,
        elementAlias: element.alias ?? null,
        elementKind: element.kind ?? null,
        stateInfo: element.stateInfo ?? null,
        }))
    ),
    };

  const runtimeSpec = {
    version: '0.1',

    contextSlots: [contextSlots],

    provides: {
      contextSlots: [contextSlots.id],
    },
  };

  const mergedRuntimeSpec = mergeRuntimeSpecs([
    visualOutput.runtimeSpec,
    visualOutput.meta?.runtimeSpec,
    runtimeSpec,
  ]);

  const inputProvenance = inheritProvenance(visualOutput);

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'context-slots',
    outputType: 'visual',
    label: 'Context Slots Visual',
    transform: {
      type: 'register-context-slots',
      componentScopeId: contextSlots.componentScopeId,
      elementCount: availableElements.length,
      registeredCount: registeredElements.length,
      bindingCount: contextSlots.bindings.length,
    },
  });

  return {
    ...visualOutput,

    runtimeSpec: mergedRuntimeSpec,

    meta: {
      ...(visualOutput.meta ?? {}),

      sourceNodeId: ctx.nodeId,
      upstreamSourceNodeId: visualOutput.meta?.sourceNodeId ?? null,

      label: visualOutput.meta?.label ?? 'Context Slots Visual',

      runtimeSpec: mergedRuntimeSpec,

      contextSlots,

      availableContextElements: availableElements,

      warnings: [
        ...(visualOutput.meta?.warnings ?? []),
        ...warnings,
      ],

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

function makeEmptyVisualOutput(ctx, warnings) {
  return {
    outputType: 'visual',
    version: '0.1',

    root: {
      nodeType: 'collection',
      id: `${ctx.nodeId}-empty-context-slots`,
      children: [],
      meta: {
        sourceNodeId: ctx.nodeId,
        role: 'empty-context-slots',
      },
    },

    runtimeSpec: null,

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Context Slots Visual',
      warnings,
    },
  };
}

function normalizeRegisteredElements({
  registeredElements,
  availableElements,
  warnings,
}) {
  return registeredElements
    .map((registered) => {
      const element = availableElements.find(
        (item) => item.elementId === registered.elementId
      );

      if (!element) {
        warnings.push(`Registered element "${registered.elementId}" was not found in the connected component.`);
        return null;
      }

      const bindings = normalizeBindings({
        bindings: registered.bindings ?? [],
        element,
      });

        return {
            id: registered.id ?? `registered-${registered.elementId}`,
            elementId: registered.elementId,
            alias: registered.alias ?? element.displayName,
            kind: element.kind,
            stateInfo: element.stateInfo ?? null,
            summary: {
                displayName: element.displayName,
                detail: element.detail,
                pathLabel: element.pathLabel,
            },
            bindings,
        };
    })
    .filter(Boolean);
}

function normalizeBindings({
  bindings,
  element,
}) {
  return bindings.map((binding, index) => {
    const property =
      binding.property ??
      getDefaultPropertyForKind(element.kind);

    const formatType =
      binding.format?.type ??
      inferFormatForProperty(element.kind, property);

    return {
      id: binding.id ?? `binding-${element.elementId}-${index}`,
      property,

      source: normalizeSource(binding.source),

      format: {
        type: formatType,
        decimals: Number(binding.format?.decimals ?? 0),
        prefix: binding.format?.prefix ?? '',
        suffix: binding.format?.suffix ?? '',
      },

      fallback: binding.fallback ?? '',
    };
  });
}

function normalizeSource(source) {
  if (!source) {
    return {
      type: 'contextPath',
      path: 'tags.item',
    };
  }

  if (source.type === 'fixed') {
    return {
      type: 'fixed',
      value: source.value ?? '',
    };
  }

  return {
    type: 'contextPath',
    path: source.path ?? 'tags.item',
  };
}

function resolveVisualScopeId(output) {
  return (
    output.root?.id ??
    output.meta?.sourceNodeId ??
    output.meta?.label ??
    'visual'
  );
}