// src/evaluator/export/evalFinalOutput.js

import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

import { createVisualEmbedBundle } from '../../export/createVisualEmbedBundle.js';

export function evalFinalOutput(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const visualOutput = getFirstInputValue(ctx, 'visual');

  if (!visualOutput || visualOutput.outputType !== 'visual') {
    return {
      outputType: 'finalOutput',
      version: '0.1',

      status: 'missing-input',
      bundle: null,

      preview: {
        connected: false,
      },

      meta: {
        sourceNodeId: ctx.nodeId,
        label: 'Final Output',
        warnings: [
          'Final Output expects a visual input.',
        ],
      },
    };
  }

  const name = p.name ?? 'Untitled visual';
  const description = p.description ?? '';

  const renderOptions = {
    mode: p.renderMode ?? 'fit',
    viewportWidth: Number(p.viewportWidth ?? 900),
    viewportHeight: Number(p.viewportHeight ?? 520),
    background: p.background ?? '#ffffff',
    overflow: p.overflow ?? 'visible',
    responsive: p.responsive ?? true,
  };

  let bundle = null;

  try {
    bundle = createVisualEmbedBundle({
      name,
      description,
      visual: visualOutput,
      renderOptions,
      source: {
        sourceNodeId: ctx.nodeId,
        sourceLabel: 'Final Output',
      },
    });
  } catch (error) {
    warnings.push(error.message);
  }

  const inputProvenance = inheritProvenance(visualOutput);

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'final-output',
    outputType: 'finalOutput',
    label: name,
    transform: {
      type: 'create-final-output',
      name,
      viewportWidth: renderOptions.viewportWidth,
      viewportHeight: renderOptions.viewportHeight,
      hasRuntimeSpec: Boolean(
        visualOutput.runtimeSpec ??
        visualOutput.meta?.runtimeSpec
      ),
    },
  });

  return {
    outputType: 'finalOutput',
    version: '0.1',

    status: bundle ? 'ready' : 'error',

    bundle,

    visual: visualOutput,

    renderOptions,

    preview: {
      connected: true,
      name,
      viewportWidth: renderOptions.viewportWidth,
      viewportHeight: renderOptions.viewportHeight,

      rootId: visualOutput.root?.id ?? null,

      runtimeSummary: summarizeRuntimeSpec(
        visualOutput.runtimeSpec ??
        visualOutput.meta?.runtimeSpec
      ),
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: name,

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

function summarizeRuntimeSpec(runtimeSpec) {
  if (!runtimeSpec) {
    return {
      states: 0,
      events: 0,
      transitions: 0,
      bindings: 0,
      effects: 0,
      layoutRules: 0,
      contextSlots: 0,
    };
  }

  return {
    states: runtimeSpec.states?.length ?? 0,
    events: runtimeSpec.events?.length ?? 0,
    transitions: runtimeSpec.transitions?.length ?? 0,
    bindings: runtimeSpec.bindings?.length ?? 0,
    effects: runtimeSpec.effects?.length ?? 0,
    layoutRules: runtimeSpec.layoutRules?.length ?? 0,
    contextSlots: runtimeSpec.contextSlots?.length ?? 0,
  };
}