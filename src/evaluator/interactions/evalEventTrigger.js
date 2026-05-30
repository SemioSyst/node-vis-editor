// src/evaluator/interactions/evalEventTrigger.js

import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

export function evalEventTrigger(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const selectionOutput = getFirstInputValue(ctx, 'selection');

  if (!selectionOutput || selectionOutput.outputType !== 'elementSelection') {
    return makeEmptyEventSignal(ctx, [
      'Event Trigger expects an Element Selection input.',
    ]);
  }

  const eventType = normalizeEventType(p.eventType ?? 'hover');
  const useCursor = p.useCursor ?? true;

  const sourceVisual = selectionOutput.sourceVisual ?? null;
  const sourceScopeId = sourceVisual?.scopeId ?? null;
  const selector = selectionOutput.selector ?? { type: 'all' };

  if (!sourceScopeId) {
    warnings.push('Element Selection has no source visual scope. Event may not bind at render time.');
  }

  const eventBundle = makeEventBundle({
    ctx,
    eventType,
    sourceScopeId,
    selector,
    useCursor,
  });

  const inputProvenance = inheritProvenance(selectionOutput);

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'event-trigger',
    outputType: 'eventSignal',
    label: 'Event Signal',
    transform: {
      type: 'create-event-signal',
      eventType,
      sourceScopeId,
      selector,
    },
  });

  return {
    outputType: 'eventSignal',
    version: '0.1',

    eventType,

    sourceVisual,
    sourceScopeId,

    selector,

    events: eventBundle.events,

    eventIds: eventBundle.eventIds,

    // Useful for State Change nodes:
    // hover has start/end, click has trigger, press has down/up.
    primaryEventId: eventBundle.primaryEventId,
    secondaryEventId: eventBundle.secondaryEventId,

    preview: {
      sourceScopeId,
      selector,
      selectedCount: selectionOutput.preview?.selectedCount ?? null,
      totalCount: selectionOutput.preview?.totalCount ?? null,
      availableTags: selectionOutput.preview?.availableTags ?? [],
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Event Signal',

      eventType,
      sourceScopeId,
      selector,

      eventIds: eventBundle.eventIds,

      warnings: [
        ...(selectionOutput.meta?.warnings ?? []),
        ...warnings,
      ],

      sourceSelection: {
        sourceNodeId: selectionOutput.meta?.sourceNodeId ?? null,
        sourceVisual,
        selector,
        selectedCount: selectionOutput.preview?.selectedCount ?? null,
        totalCount: selectionOutput.preview?.totalCount ?? null,
      },

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

function normalizeEventType(eventType) {
  if (eventType === 'click') return 'click';
  if (eventType === 'press') return 'press';
  return 'hover';
}

function makeEventBundle({
  ctx,
  eventType,
  sourceScopeId,
  selector,
  useCursor,
}) {
  if (eventType === 'click') {
    const clickEventId = `${ctx.nodeId}:click`;

    return {
      primaryEventId: clickEventId,
      secondaryEventId: null,

      eventIds: {
        trigger: clickEventId,
      },

      events: [
        {
          id: clickEventId,
          event: 'click',

          sourceScopeId,

          selector,

          cursor: useCursor ? 'pointer' : null,

          emit: {
            eventId: clickEventId,
            value: 'event.ref',
          },
        },
      ],
    };
  }

  if (eventType === 'press') {
    const downEventId = `${ctx.nodeId}:press-down`;
    const upEventId = `${ctx.nodeId}:press-up`;

    return {
      primaryEventId: downEventId,
      secondaryEventId: upEventId,

      eventIds: {
        down: downEventId,
        up: upEventId,
      },

      events: [
        {
          id: downEventId,
          event: 'pointerdown',

          sourceScopeId,

          selector,

          cursor: useCursor ? 'pointer' : null,

          emit: {
            eventId: downEventId,
            value: 'event.ref',
          },
        },
        {
          id: upEventId,
          event: 'pointerup',

          sourceScopeId,

          selector,

          cursor: useCursor ? 'pointer' : null,

          emit: {
            eventId: upEventId,
            value: 'event.ref',
          },
        },
      ],
    };
  }

    const enterEventId = `${ctx.nodeId}:hover-enter`;
    const moveEventId = `${ctx.nodeId}:hover-move`;
    const leaveEventId = `${ctx.nodeId}:hover-leave`;

    return {
        primaryEventId: enterEventId,
        secondaryEventId: leaveEventId,

        eventIds: {
            enter: enterEventId,
            move: moveEventId,
            leave: leaveEventId,
        },

        events: [
            {
                id: enterEventId,
                event: 'pointerenter',
                sourceScopeId,
                selector,
                cursor: useCursor ? 'pointer' : null,
                emit: {
                    eventId: enterEventId,
                    value: 'event.ref',
                },
            },
            {
                id: moveEventId,
                event: 'pointermove',
                sourceScopeId,
                selector,
                cursor: useCursor ? 'pointer' : null,
                emit: {
                    eventId: moveEventId,
                    value: 'event.ref',
                },
            },
            {
                id: leaveEventId,
                event: 'pointerleave',
                sourceScopeId,
                selector,
                emit: {
                    eventId: leaveEventId,
                    value: 'event.ref',
                },
            },
        ],
    };
}

function makeEmptyEventSignal(ctx, warnings) {
  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'event-trigger',
    outputType: 'eventSignal',
    label: 'Event Signal',
    transform: {
      type: 'create-event-signal',
      status: 'no-selection-input',
    },
  });

  return {
    outputType: 'eventSignal',
    version: '0.1',

    eventType: 'none',

    sourceVisual: null,
    sourceScopeId: null,

    selector: {
      type: 'none',
    },

    events: [],
    eventIds: {},

    primaryEventId: null,
    secondaryEventId: null,

    preview: {
      sourceScopeId: null,
      selector: { type: 'none' },
      selectedCount: 0,
      totalCount: 0,
      availableTags: [],
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Event Signal',
      warnings,

      provenance: [
        ownProvenanceEntry,
      ],
    },
  };
}