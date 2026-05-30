// src/evaluator/interactions/evalInteractionEffect.js

import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

import { mergeRuntimeSpecs } from '../../runtime/spec/runtimeSpecUtils.js';

export function evalInteractionEffect(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const visualOutput = getFirstInputValue(ctx, 'visual');
  const eventOutput = getFirstInputValue(ctx, 'event');
  const selectionOutput = getFirstInputValue(ctx, 'selection');

  if (!visualOutput || visualOutput.outputType !== 'visual') {
    return makeEmptyVisualOutput(ctx, [
      'Interaction Effect expects a visual input.',
    ]);
  }

  if (!eventOutput || eventOutput.outputType !== 'eventSignal') {
    warnings.push('No Event Trigger connected. Interaction Effect will pass the visual through.');
  }

  const targetScopeId = resolveVisualScopeId(visualOutput);
  const eventSummary = summarizeEvent(eventOutput);
  const behavior = resolveBehavior({
    requested: p.behavior,
    eventType: eventSummary.eventType,
  });

  const target = makeTargetSpec({
    params: p,
    visualOutput,
    selectionOutput,
    targetScopeId,
    warnings,
  });

  const style = makeStyleSpec(p);

  const effectRuntimeSpec = eventOutput
    ? makeInteractionEffectRuntimeSpec({
        ctx,
        eventSummary,
        behavior,
        target,
        style,
      })
    : null;

  const mergedRuntimeSpec = mergeRuntimeSpecs([
    visualOutput.runtimeSpec,
    visualOutput.meta?.runtimeSpec,
    eventOutputToRuntimeSpec(eventOutput),
    effectRuntimeSpec,
  ]);

  const inputProvenance = [
    ...inheritProvenance(visualOutput),
    ...(eventOutput ? inheritProvenance(eventOutput) : []),
    ...(selectionOutput ? inheritProvenance(selectionOutput) : []),
  ];

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'interaction-effect',
    outputType: 'visual',
    label: 'Interaction Effect Visual',
    transform: {
      type: 'attach-interaction-effect',
      eventType: eventSummary.eventType,
      behavior,
      target,
      style,
    },
  });

  const effectSummary = {
    nodeId: ctx.nodeId,
    eventType: eventSummary.eventType,
    behavior,
    target,
    style,
  };

  return {
    ...visualOutput,

    runtimeSpec: mergedRuntimeSpec,

    meta: {
      ...(visualOutput.meta ?? {}),

      sourceNodeId: ctx.nodeId,
      upstreamSourceNodeId: visualOutput.meta?.sourceNodeId ?? null,

      label: visualOutput.meta?.label ?? 'Interaction Effect Visual',

      runtimeSpec: mergedRuntimeSpec,

      interactionEffects: [
        ...(visualOutput.meta?.interactionEffects ?? []),
        effectSummary,
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
      id: `${ctx.nodeId}-empty-interaction-effect`,
      children: [],
      meta: {
        sourceNodeId: ctx.nodeId,
        role: 'empty-interaction-effect',
      },
    },

    runtimeSpec: null,

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Interaction Effect Visual',
      warnings,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Event                                                                       */
/* -------------------------------------------------------------------------- */

function summarizeEvent(eventOutput) {
  if (!eventOutput || eventOutput.outputType !== 'eventSignal') {
    return {
      connected: false,
      eventType: 'none',
      eventIds: {},
      primaryEventId: null,
      secondaryEventId: null,
      sourceScopeId: null,
      events: [],
    };
  }

  return {
    connected: true,
    eventType: eventOutput.eventType ?? 'unknown',
    eventIds: eventOutput.eventIds ?? {},
    primaryEventId: eventOutput.primaryEventId ?? null,
    secondaryEventId: eventOutput.secondaryEventId ?? null,
    sourceScopeId: eventOutput.sourceScopeId ?? null,
    selector: eventOutput.selector ?? null,
    events: eventOutput.events ?? [],
  };
}

function resolveBehavior({
  requested,
  eventType,
}) {
  const allowed = getAllowedBehaviors(eventType);

  if (requested && allowed.includes(requested)) {
    return requested;
  }

  if (eventType === 'click') return 'toggleClicked';
  if (eventType === 'hover') return 'activeWhileEvent';
  if (eventType === 'press') return 'activeWhileEvent';

  return 'none';
}

function getAllowedBehaviors(eventType) {
  if (eventType === 'click') {
    return ['toggleClicked', 'selectClicked'];
  }

  if (eventType === 'hover' || eventType === 'press') {
    return ['activeWhileEvent'];
  }

  return ['none'];
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

/* -------------------------------------------------------------------------- */
/* Target                                                                      */
/* -------------------------------------------------------------------------- */

function makeTargetSpec({
  params,
  visualOutput,
  selectionOutput,
  targetScopeId,
  warnings,
}) {
  const requestedMode = params.targetMode ?? 'auto';

  const hasSelection =
    selectionOutput &&
    selectionOutput.outputType === 'elementSelection';

  let mode = requestedMode;

  if (mode === 'auto') {
    mode = hasSelection ? 'selection' : 'eventElement';
  }

  if (mode === 'selection' && !hasSelection) {
    warnings.push('Target mode is Connected Selection, but no selection input is connected. Falling back to Event Element.');
    mode = 'eventElement';
  }

  const selector = makeTargetSelector({
    mode,
    selectionOutput,
  });

  const selectionSummary = hasSelection
    ? {
        sourceVisual: selectionOutput.sourceVisual ?? null,
        selector: selectionOutput.selector ?? null,
        selectedCount: selectionOutput.preview?.selectedCount ?? null,
        totalCount: selectionOutput.preview?.totalCount ?? null,
      }
    : null;

  if (
    hasSelection &&
    selectionOutput.sourceVisual?.scopeId &&
    selectionOutput.sourceVisual.scopeId !== targetScopeId
  ) {
    warnings.push('Connected selection was created from a different visual scope. It may not match this target visual.');
  }

  return {
    mode,
    scopeId: targetScopeId,
    selector,
    selection: selectionSummary,

    targetVisual: {
      rootId: visualOutput.root?.id ?? null,
      sourceNodeId: visualOutput.meta?.sourceNodeId ?? null,
      label: visualOutput.meta?.label ?? null,
    },
  };
}

function makeTargetSelector({
  mode,
  selectionOutput,
}) {
  if (mode === 'wholeVisual') {
    return {
      type: 'all',
    };
  }

  if (mode === 'selection' && selectionOutput?.selector) {
    return selectionOutput.selector;
  }

  // Event element.
  // This compares current element against the eventRef stored in state.
  return {
    type: 'self',
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

/* -------------------------------------------------------------------------- */
/* Style                                                                       */
/* -------------------------------------------------------------------------- */

function makeStyleSpec(params) {
  const style = {};

  if (params.applyStroke ?? true) {
    style.stroke = {
      enabled: true,
      color: params.strokeColor ?? '#ffffff',
      width: Math.max(0, Number(params.strokeWidth ?? 2)),
    };
  }

  if (params.applyFill ?? false) {
    style.fill = {
      type: 'solid',
      color: params.fillColor ?? '#ffcc00',
    };
  }

  if (params.applyOpacity ?? false) {
    style.opacity = clamp(Number(params.opacity ?? 1), 0, 1);
  }

  return style;
}

/* -------------------------------------------------------------------------- */
/* Runtime                                                                     */
/* -------------------------------------------------------------------------- */

function makeInteractionEffectRuntimeSpec({
  ctx,
  eventSummary,
  behavior,
  target,
  style,
}) {
  const stateId = `${ctx.nodeId}:active`;
  const effectId = `${ctx.nodeId}:style-effect`;
  const overrideId = `${ctx.nodeId}:style-override`;

  return {
    version: '0.1',

    states: [
      {
        id: stateId,
        type: 'elementRef',
        initial: null,
      },
    ],

    stateRules: makeStateRules({
      ctx,
      stateId,
      eventSummary,
      behavior,
    }),

    // Future-facing generic effect model.
    // Tooltip / visibility / content effects can be added here later.
    effects: [
      {
        id: effectId,
        type: 'style',

        stateId,

        source: {
          type: 'eventRef',
        },

        target: {
          mode: target.mode,
          scopeId: target.scopeId,
          selector: target.selector,
          selection: target.selection,
        },

        style,

        priority: 50,
      },
    ],

    // Current runtime execution path.
    // Style effects compile to overrides.
    overrides: [
      {
        id: overrideId,
        stateId,

        when: {
          exists: true,
        },

        targetScopeId: target.scopeId,

        selector: target.selector,

        patch: {
          style,
        },

        priority: 50,
      },
    ],

    provides: {
      states: [stateId],
      effects: [effectId],
      overrides: [overrideId],
    },

    requires: {
      events: getRequiredEventIds(eventSummary, behavior),
    },
  };
}

function makeStateRules({
  ctx,
  stateId,
  eventSummary,
  behavior,
}) {
  if (!eventSummary.connected) return [];

  if (eventSummary.eventType === 'hover') {
    const enterId = eventSummary.eventIds?.enter ?? eventSummary.primaryEventId;
    const leaveId = eventSummary.eventIds?.leave ?? eventSummary.secondaryEventId;
    const moveId = eventSummary.eventIds?.move ?? null;

    return [
        ...(enterId
            ? [
                {
                id: `${ctx.nodeId}:hover-enter`,
                eventId: enterId,
                action: {
                    type: 'setState',
                    stateId,
                    value: 'event.ref',
                },
                },
            ]
            : []),

        ...(moveId
        ? [
            {
                id: `${ctx.nodeId}:hover-move`,
                eventId: moveId,
                action: {
                type: 'setState',
                stateId,
                value: 'event.ref',
                },
            },
            ]
        : []),

        ...(leaveId
            ? [
                {
                id: `${ctx.nodeId}:hover-leave`,
                eventId: leaveId,
                action: {
                    type: 'clearState',
                    stateId,
                },
                },
            ]
            : []),
    ];
  }

  if (eventSummary.eventType === 'press') {
    const downId = eventSummary.eventIds?.down ?? eventSummary.primaryEventId;
    const upId = eventSummary.eventIds?.up ?? eventSummary.secondaryEventId;

    return [
      ...(downId
        ? [
            {
              id: `${ctx.nodeId}:press-down`,
              eventId: downId,
              action: {
                type: 'setState',
                stateId,
                value: 'event.ref',
              },
            },
          ]
        : []),

      ...(upId
        ? [
            {
              id: `${ctx.nodeId}:press-up`,
              eventId: upId,
              action: {
                type: 'clearState',
                stateId,
              },
            },
          ]
        : []),
    ];
  }

  if (eventSummary.eventType === 'click') {
    const clickId = eventSummary.eventIds?.trigger ?? eventSummary.primaryEventId;

    if (!clickId) return [];

    if (behavior === 'selectClicked') {
      return [
        {
          id: `${ctx.nodeId}:select-clicked`,
          eventId: clickId,
          action: {
            type: 'setState',
            stateId,
            value: 'event.ref',
          },
        },
      ];
    }

    return [
      {
        id: `${ctx.nodeId}:toggle-clicked`,
        eventId: clickId,
        action: {
          type: 'toggleElementRef',
          stateId,
          value: 'event.ref',
        },
      },
    ];
  }

  return [];
}

function getRequiredEventIds(eventSummary, behavior) {
  if (!eventSummary.connected) return [];

  if (eventSummary.eventType === 'hover') {
    return [
      eventSummary.eventIds?.enter ?? eventSummary.primaryEventId,
      eventSummary.eventIds?.leave ?? eventSummary.secondaryEventId,
    ].filter(Boolean);
  }

  if (eventSummary.eventType === 'press') {
    return [
      eventSummary.eventIds?.down ?? eventSummary.primaryEventId,
      eventSummary.eventIds?.up ?? eventSummary.secondaryEventId,
    ].filter(Boolean);
  }

  if (eventSummary.eventType === 'click') {
    return [
      eventSummary.eventIds?.trigger ?? eventSummary.primaryEventId,
    ].filter(Boolean);
  }

  return Object.values(eventSummary.eventIds ?? {}).filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

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

function clamp(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}