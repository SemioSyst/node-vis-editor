// src/evaluator/interactions/evalTransition.js

import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

import { mergeRuntimeSpecs } from '../../runtime/spec/runtimeSpecUtils.js';

export function evalTransition(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const inputOutput = getFirstInputValue(ctx, 'visual');

  if (!inputOutput || inputOutput.outputType !== 'visual') {
    return makeEmptyVisualOutput(ctx, [
      'Transition expects a visual input.',
    ]);
  }

  const runtimeSpec =
    inputOutput.runtimeSpec ??
    inputOutput.meta?.runtimeSpec ??
    null;

  if (!runtimeSpec) {
    warnings.push('Input visual has no state information. Transition will pass the visual through.');
  }

  const visualStateBindings = (runtimeSpec?.bindings ?? []).filter(
    (binding) => binding?.type === 'visualStateBinding'
  );

  if (runtimeSpec && visualStateBindings.length === 0) {
    warnings.push('No visual state binding found. Transition settings were added but may not affect the visual.');
  }

  const transition = makeTransitionSpec({
    ctx,
    params: p,
    targetBindingIds: visualStateBindings.map((binding) => binding.id),
  });

  const nextRuntimeSpec = attachTransitionToRuntimeSpec({
    runtimeSpec,
    transition,
    visualStateBindings,
  });

  const inputProvenance = inheritProvenance(inputOutput);

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'transition',
    outputType: 'visual',
    label: 'Transition Visual',
    transform: {
      type: 'attach-transition',
      mode: transition.mode,
      executionMode: transition.executionMode,
      duration: transition.duration,
      easing: transition.easing,
      targetBindingIds: transition.targetBindingIds,
    },
  });

  return {
    ...inputOutput,

    runtimeSpec: nextRuntimeSpec,

    meta: {
      ...(inputOutput.meta ?? {}),

      sourceNodeId: ctx.nodeId,
      upstreamSourceNodeId: inputOutput.meta?.sourceNodeId ?? null,

      label: inputOutput.meta?.label ?? 'Transition Visual',

      runtimeSpec: nextRuntimeSpec,

      transition,

      transitions: [
        ...(inputOutput.meta?.transitions ?? []),
        transition,
      ],

      warnings: [
        ...(inputOutput.meta?.warnings ?? []),
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
      id: `${ctx.nodeId}-empty-transition`,
      children: [],
      meta: {
        sourceNodeId: ctx.nodeId,
        role: 'empty-transition',
      },
    },

    runtimeSpec: null,

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Transition Visual',
      warnings,
    },
  };
}

function makeTransitionSpec({
  ctx,
  params,
  targetBindingIds,
}) {
  const mode = params.transitionMode ?? 'auto';

  return {
    id: `${ctx.nodeId}:transition`,

    type: 'visualStateTransition',

    targetBindingIds,

    mode,

    // v0.1 behavior:
    // Auto now tries property interpolation first.
    // If it cannot interpolate, runtime falls back to crossfade.
    executionMode:
      mode === 'auto'
        ? 'attribute'
        : mode,

    duration: Math.max(0, Number(params.duration ?? 600)),

    easing: params.easing ?? 'easeInOut',

    interpolation: {
      geometry: params.geometryMode ?? 'auto',
      color: params.colorMode ?? 'auto',
      opacity: params.opacityMode ?? 'auto',
      path: params.pathMode ?? 'auto',
      text: params.textMode ?? 'crossfade',
    },

    stagger: {
      type: params.staggerType ?? 'none',
      amount: Math.max(0, Number(params.staggerAmount ?? 0)),
    },
  };
}

function attachTransitionToRuntimeSpec({
  runtimeSpec,
  transition,
}) {
  const baseSpec = runtimeSpec ?? {
    version: '0.1',
    states: [],
    events: [],
    stateRules: [],
    changes: [],
    transitions: [],
    bindings: [],
    overrides: [],
  };

  const targetBindingIds = new Set(
    transition.targetBindingIds ?? []
  );

  const nextBindings = (baseSpec.bindings ?? []).map((binding) => {
    if (
      binding?.type === 'visualStateBinding' &&
      targetBindingIds.has(binding.id)
    ) {
      return {
        ...binding,
        transitionId: transition.id,
      };
    }

    return binding;
  });

  const nextTransitions = [
    ...(baseSpec.transitions ?? []).filter(
      (item) => item.id !== transition.id
    ),
    transition,
  ];

  return mergeRuntimeSpecs([
    {
      ...baseSpec,
      bindings: nextBindings,
      transitions: nextTransitions,

      provides: {
        ...(baseSpec.provides ?? {}),
        transitions: [
          ...((baseSpec.provides ?? {}).transitions ?? []),
          transition.id,
        ],
      },
    },
  ]);
}