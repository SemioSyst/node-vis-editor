// src/evaluator/interactions/evalHoverRuntimeBinder.js

import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

import { mergeRuntimeSpecs } from '../../runtime/spec/runtimeSpecUtils.js';

export function evalHoverRuntimeBinder(ctx) {
  const p = ctx.params ?? {};
  const inputOutput = getFirstInputValue(ctx, 'visual');

  if (!inputOutput || inputOutput.outputType !== 'visual') {
    return makeEmptyVisualOutput(ctx, [
      'HoverRuntimeBinder expects a visual input.',
    ]);
  }

  const scopeId = resolveVisualScopeId(inputOutput);
  const runtimeSpec = makeHoverRuntimeSpec({
    ctx,
    params: p,
    scopeId,
  });

  const mergedRuntimeSpec = mergeRuntimeSpecs([
    inputOutput.runtimeSpec,
    inputOutput.meta?.runtimeSpec,
    runtimeSpec,
  ]);

  const inputProvenance = inheritProvenance(inputOutput);

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'hover-runtime-binder',
    outputType: 'visual',
    label: 'Hover Runtime Binder Output',
    transform: {
      type: 'attach-hover-runtime',
      scopeId,
      matchMode: p.matchMode ?? 'self',
      tagKey: resolveTagKey(p),
    },
  });

  return {
    ...inputOutput,

    runtimeSpec: mergedRuntimeSpec,

    meta: {
      ...(inputOutput.meta ?? {}),

      sourceNodeId: ctx.nodeId,
      upstreamSourceNodeId: inputOutput.meta?.sourceNodeId ?? null,

      label: inputOutput.meta?.label ?? 'Hover Runtime Visual',

      runtimeSpec: mergedRuntimeSpec,

      runtimeBindings: [
        ...(inputOutput.meta?.runtimeBindings ?? []),
        {
          nodeId: ctx.nodeId,
          type: 'hover-runtime-binder',
          scopeId,
          matchMode: p.matchMode ?? 'self',
          tagKey: resolveTagKey(p),
        },
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
      id: `${ctx.nodeId}-empty-hover-runtime`,
      children: [],
      meta: {
        sourceNodeId: ctx.nodeId,
        role: 'empty-hover-runtime',
      },
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Hover Runtime Binder Output',
      warnings,
    },
  };
}

function makeHoverRuntimeSpec({
  ctx,
  params,
  scopeId,
}) {
  const stateId = `${ctx.nodeId}:hovered`;
  const hoverEnterEventId = `${ctx.nodeId}:hover-enter`;
  const hoverLeaveEventId = `${ctx.nodeId}:hover-leave`;

  const matchMode = params.matchMode ?? 'self';
  const tagKey = resolveTagKey(params);

  const strokeColor = params.strokeColor ?? '#ffffff';
  const strokeWidth = Math.max(0, Number(params.strokeWidth ?? 2));

  const useOpacity = Boolean(params.useOpacity ?? false);
  const opacity = useOpacity
    ? clamp(Number(params.opacity ?? 1), 0, 1)
    : null;

  const useCursor = params.useCursor ?? true;

  return {
    version: '0.1',

    states: [
      {
        id: stateId,
        type: 'elementRef',
        initial: null,
      },
    ],

    events: [
      {
        id: hoverEnterEventId,
        event: 'pointerenter',

        // This keeps the event bound to the visual that passed through this node.
        sourceScopeId: scopeId,

        selector: {
          type: 'all',
        },

        cursor: useCursor ? 'pointer' : null,

        emit: {
          eventId: hoverEnterEventId,
          value: 'event.ref',
        },
      },

      {
        id: hoverLeaveEventId,
        event: 'pointerleave',

        sourceScopeId: scopeId,

        selector: {
          type: 'all',
        },

        emit: {
          eventId: hoverLeaveEventId,
          value: 'event.ref',
        },
      },
    ],

    stateRules: [
      {
        id: `${ctx.nodeId}:hover-set`,
        eventId: hoverEnterEventId,
        action: {
          type: 'setState',
          stateId,
          value: 'event.ref',
        },
      },

      {
        id: `${ctx.nodeId}:hover-clear`,
        eventId: hoverLeaveEventId,
        action: {
          type: 'clearState',
          stateId,
        },
      },
    ],

    overrides: [
      {
        id: `${ctx.nodeId}:hover-style`,
        stateId,

        when: {
          exists: true,
        },

        // This keeps the override bound to the visual that passed through this node.
        targetScopeId: scopeId,

        selector: makeRuntimeSelector({
          matchMode,
          tagKey,
        }),

        patch: {
          style: {
            stroke: {
              enabled: true,
              color: strokeColor,
              width: strokeWidth,
            },

            ...(opacity != null
              ? { opacity }
              : {}),
          },
        },

        priority: 20,
      },
    ],

    provides: {
      states: [stateId],
      events: [hoverEnterEventId, hoverLeaveEventId],
    },

    requires: {},
  };
}

function makeRuntimeSelector({
  matchMode,
  tagKey,
}) {
  if (matchMode === 'sameTag') {
    return {
      type: 'sameTag',
      tagKey,
    };
  }

  if (matchMode === 'sameRow') {
    return {
      type: 'sameRow',
    };
  }

  if (matchMode === 'sameColumn') {
    return {
      type: 'sameColumn',
    };
  }

  return {
    type: 'self',
  };
}

function resolveTagKey(params) {
  const preset = params.tagKeyPreset ?? 'item';

  if (preset === 'custom') {
    return params.customTagKey || 'item';
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

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}