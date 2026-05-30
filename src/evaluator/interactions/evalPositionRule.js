// src/evaluator/interactions/evalPositionRule.js

import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

import { mergeRuntimeSpecs } from '../../runtime/spec/runtimeSpecUtils.js';

export function evalPositionRule(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const visualOutput = getFirstInputValue(ctx, 'visual');
  const selectionOutput = getFirstInputValue(ctx, 'anchor');
  const eventOutput = getFirstInputValue(ctx, 'event');

  if (!visualOutput || visualOutput.outputType !== 'visual') {
    return makeEmptyVisualOutput(ctx, [
      'Position Rule expects a visual input.',
    ]);
  }

  const sourceScopeId = resolveVisualScopeId(visualOutput);
  const anchorType = p.anchorType ?? 'selection';

  const eventSummary = summarizeEvent(eventOutput);

  const stateRuntimeSpec =
    anchorType === 'pointer' || anchorType === 'eventElement'
      ? makeAnchorStateRuntimeSpec({
          ctx,
          eventSummary,
          anchorType,
        })
      : null;

  const anchorStateId = stateRuntimeSpec?.states?.[0]?.id ?? null;

  const layoutRule = makeLayoutRule({
    ctx,
    params: p,
    sourceScopeId,
    anchorType,
    selectionOutput,
    eventSummary,
    anchorStateId,
    warnings,
  });

  const ruleRuntimeSpec = {
    version: '0.1',

    layoutRules: [layoutRule],

    provides: {
      layoutRules: [layoutRule.id],
    },

    requires: {
      events: stateRuntimeSpec?.requires?.events ?? [],
    },
  };

  const mergedRuntimeSpec = mergeRuntimeSpecs([
    visualOutput.runtimeSpec,
    visualOutput.meta?.runtimeSpec,
    eventOutputToRuntimeSpec(eventOutput),
    stateRuntimeSpec,
    ruleRuntimeSpec,
  ]);

  const inputProvenance = [
    ...inheritProvenance(visualOutput),
    ...(selectionOutput ? inheritProvenance(selectionOutput) : []),
    ...(eventOutput ? inheritProvenance(eventOutput) : []),
  ];

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'position-rule',
    outputType: 'visual',
    label: 'Position Rule Visual',
    transform: {
      type: 'attach-position-rule',
      sourceScopeId,
      anchorType,
      layoutRule,
    },
  });

  return {
    ...visualOutput,

    runtimeSpec: mergedRuntimeSpec,

    meta: {
      ...(visualOutput.meta ?? {}),

      sourceNodeId: ctx.nodeId,
      upstreamSourceNodeId: visualOutput.meta?.sourceNodeId ?? null,

      label: visualOutput.meta?.label ?? 'Position Rule Visual',

      runtimeSpec: mergedRuntimeSpec,

      positionRules: [
        ...(visualOutput.meta?.positionRules ?? []),
        layoutRule,
      ],

      warnings: [
        ...(visualOutput.meta?.warnings ?? []),
        ...warnings,
      ],

      provenance: [
        ...dedupeProvenance(inputProvenance),
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
      id: `${ctx.nodeId}-empty-position-rule`,
      children: [],
      meta: {
        sourceNodeId: ctx.nodeId,
        role: 'empty-position-rule',
      },
    },

    runtimeSpec: null,

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Position Rule Visual',
      warnings,
    },
  };
}

function makeLayoutRule({
  ctx,
  params,
  sourceScopeId,
  anchorType,
  selectionOutput,
  eventSummary,
  anchorStateId,
  warnings,
}) {
  const mode = params.mode ?? 'repeat';

  const anchor = makeAnchorSpec({
    anchorType,
    selectionOutput,
    eventSummary,
    anchorStateId,
    params,
    warnings,
  });

  return {
    id: `${ctx.nodeId}:layout-rule`,
    type: 'anchoredPosition',

    sourceScopeId,

    mode,

    anchor,

    placement: params.placement ?? 'top',

    offset: {
      x: Number(params.offsetX ?? 0),
      y: Number(params.offsetY ?? 8),
    },

    match: {
      method: params.matchMode ?? 'repeatTemplate',
      tagKeys: parseTagKeys(params.matchTagKeys ?? 'item'),
    },
  };
}

function makeAnchorSpec({
  anchorType,
  selectionOutput,
  eventSummary,
  anchorStateId,
  params,
  warnings,
}) {
  if (anchorType === 'pointer') {
    if (!eventSummary.connected) {
      warnings.push('Pointer anchor needs an Event Trigger input.');
    }

    return {
      type: 'pointer',
      stateId: anchorStateId,
    };
  }

  if (anchorType === 'eventElement') {
    if (!eventSummary.connected) {
      warnings.push('Event Element anchor needs an Event Trigger input.');
    }

    return {
      type: 'eventElement',
      stateId: anchorStateId,
    };
  }

  if (anchorType === 'canvas') {
    return {
      type: 'canvas',
      x: Number(params.canvasX ?? 0),
      y: Number(params.canvasY ?? 0),
    };
  }

  if (!selectionOutput || selectionOutput.outputType !== 'elementSelection') {
    warnings.push('Connected Selection anchor needs an Element Selector input.');
  }

  return {
    type: 'selection',
    sourceScopeId: selectionOutput?.sourceVisual?.scopeId ?? null,
    selector: selectionOutput?.selector ?? { type: 'none' },
  };
}

function makeAnchorStateRuntimeSpec({
  ctx,
  eventSummary,
  anchorType,
}) {
  if (!eventSummary.connected) return null;

  const stateId = `${ctx.nodeId}:${anchorType}-anchor`;

  return {
    version: '0.1',

    states: [
      {
        id: stateId,
        type: 'elementRef',
        initial: null,
      },
    ],

    stateRules: makeAnchorStateRules({
      ctx,
      stateId,
      eventSummary,
    }),

    provides: {
      states: [stateId],
    },

    requires: {
      events: getRequiredEventIds(eventSummary),
    },
  };
}

function makeAnchorStateRules({
  ctx,
  stateId,
  eventSummary,
}) {
  if (eventSummary.eventType === 'hover') {
    const enterId = eventSummary.eventIds?.enter ?? eventSummary.primaryEventId;
    const moveId = eventSummary.eventIds?.move ?? null;
    const leaveId = eventSummary.eventIds?.leave ?? eventSummary.secondaryEventId;

    return [
    ...(enterId
        ? [{
            id: `${ctx.nodeId}:anchor-hover-enter`,
            eventId: enterId,
            action: {
            type: 'setState',
            stateId,
            value: 'event.ref',
            },
        }]
        : []),

    ...(moveId
        ? [{
            id: `${ctx.nodeId}:anchor-hover-move`,
            eventId: moveId,
            action: {
            type: 'setState',
            stateId,
            value: 'event.ref',
            },
        }]
        : []),

    ...(leaveId
        ? [{
            id: `${ctx.nodeId}:anchor-hover-leave`,
            eventId: leaveId,
            action: {
            type: 'clearState',
            stateId,
            },
        }]
        : []),
    ];
  }

  if (eventSummary.eventType === 'press') {
    const downId = eventSummary.eventIds?.down ?? eventSummary.primaryEventId;
    const upId = eventSummary.eventIds?.up ?? eventSummary.secondaryEventId;

    return [
      ...(downId
        ? [{
            id: `${ctx.nodeId}:anchor-press-down`,
            eventId: downId,
            action: {
              type: 'setState',
              stateId,
              value: 'event.ref',
            },
          }]
        : []),

      ...(upId
        ? [{
            id: `${ctx.nodeId}:anchor-press-up`,
            eventId: upId,
            action: {
              type: 'clearState',
              stateId,
            },
          }]
        : []),
    ];
  }

  if (eventSummary.eventType === 'click') {
    const clickId = eventSummary.eventIds?.trigger ?? eventSummary.primaryEventId;

    return clickId
      ? [{
          id: `${ctx.nodeId}:anchor-click`,
          eventId: clickId,
          action: {
            type: 'setState',
            stateId,
            value: 'event.ref',
          },
        }]
      : [];
  }

  return [];
}

function summarizeEvent(eventOutput) {
  if (!eventOutput || eventOutput.outputType !== 'eventSignal') {
    return {
      connected: false,
      eventType: 'none',
      eventIds: {},
      primaryEventId: null,
      secondaryEventId: null,
      events: [],
    };
  }

  return {
    connected: true,
    eventType: eventOutput.eventType ?? 'unknown',
    eventIds: eventOutput.eventIds ?? {},
    primaryEventId: eventOutput.primaryEventId ?? null,
    secondaryEventId: eventOutput.secondaryEventId ?? null,
    events: eventOutput.events ?? [],
  };
}

function eventOutputToRuntimeSpec(eventOutput) {
  if (!eventOutput || eventOutput.outputType !== 'eventSignal') {
    return null;
  }

  return {
    version: '0.1',
    events: eventOutput.events ?? [],
    provides: {
      events: Object.values(eventOutput.eventIds ?? {}).filter(Boolean),
    },
  };
}

function getRequiredEventIds(eventSummary) {
  return Object.values(eventSummary.eventIds ?? {}).filter(Boolean);
}

function resolveVisualScopeId(output) {
  return (
    output.root?.id ??
    output.meta?.sourceNodeId ??
    output.meta?.label ??
    'visual'
  );
}

function parseTagKeys(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupeProvenance(entries) {
  const result = [];
  const seen = new Set();

  entries.forEach((entry) => {
    const key = `${entry.nodeId ?? ''}-${entry.role ?? ''}-${entry.label ?? ''}`;

    if (seen.has(key)) return;

    seen.add(key);
    result.push(entry);
  });

  return result;
}