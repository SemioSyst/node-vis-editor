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
    params: p,
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

    driverType: eventBundle.driverType ?? null,

    sourceVisual,
    sourceScopeId,

    selector,

    events: eventBundle.events,
    runtimeSpec: eventBundle.runtimeSpec ?? null,

    eventIds: eventBundle.eventIds,

    primaryEventId: eventBundle.primaryEventId,
    secondaryEventId: eventBundle.secondaryEventId,

    scroll: eventBundle.scroll ?? null,
    progressStateId: eventBundle.progressStateId ?? null,

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
      driverType: eventBundle.driverType ?? null,
      sourceScopeId,
      selector,

      scroll: eventBundle.scroll ?? null,
      progressStateId: eventBundle.progressStateId ?? null,

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
  if (eventType === 'scroll') return 'scroll';
  return 'hover';
}

function makeEventBundle({
  ctx,
  params,
  eventType,
  sourceScopeId,
  selector,
  useCursor,
}) {
  if (eventType === 'scroll') {
    return makeScrollEventBundle({
      ctx,
      params,
      sourceScopeId,
      selector,
    });
  }

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

function makeScrollEventBundle({
  ctx,
  params,
  sourceScopeId,
  selector,
}) {
  const progressEventId = `${ctx.nodeId}:scroll-progress`;
  const progressStateId = `${ctx.nodeId}:scroll-progress`;

  const scroll = makeScrollSpec(params);

  const eventSpec = {
    id: progressEventId,
    event: 'scrollProgress',

    sourceScopeId,
    selector,

    scroll,

    emit: {
      eventId: progressEventId,
      value: 'event.value',
    },
  };

  return {
    driverType: 'progress',

    primaryEventId: progressEventId,
    secondaryEventId: null,

    progressStateId,

    eventIds: {
      progress: progressEventId,
    },

    scroll,

    events: [
      eventSpec,
    ],

    runtimeSpec: {
      version: '0.1',

      states: [
        {
          id: progressStateId,
          type: 'progress',
          initial: {
            mode: scroll.source,
            progress: 0,
            rawProgress: 0,
            fromIndex: 0,
            toIndex: 0,
            localProgress: 0,
          },
        },
      ],

      events: [
        eventSpec,
      ],

      stateRules: [
        {
          id: `${ctx.nodeId}:scroll-progress-state`,
          eventId: progressEventId,
          action: {
            type: 'setState',
            stateId: progressStateId,
            value: 'event.value',
          },
        },
      ],

      provides: {
        states: [progressStateId],
        events: [progressEventId],
      },
    },
  };
}

function makeScrollSpec(params) {
  const source = params.scrollSource ?? 'elementViewport';

  if (source === 'pageSteps') {
    return {
      source: 'pageSteps',
      clamp: params.scrollClamp !== false,

      pageSteps: {
        steps: normalizeScrollSteps(params.scrollSteps),
        transitionDistance: Math.max(0, Number(params.pageTransitionDistance ?? 300)),
        transitionAlignment: 'before',
        clamp: params.scrollClamp !== false,
      },
    };
  }

  return {
    source: 'elementViewport',
    clamp: params.scrollClamp !== false,

    elementViewport: {
      start: {
        elementPoint: resolvePointValue({
          value: params.scrollStartElementPoint ?? '0',
          customPercent: params.scrollStartElementCustomPercent ?? 0,
        }),
        viewportPoint: resolvePointValue({
          value: params.scrollStartViewportPoint ?? '1',
          customPercent: params.scrollStartViewportCustomPercent ?? 100,
        }),
        offsetPx: Number(params.scrollStartOffsetPx ?? params.scrollStartOffset ?? 0),
      },

      end: {
        elementPoint: resolvePointValue({
          value: params.scrollEndElementPoint ?? '1',
          customPercent: params.scrollEndElementCustomPercent ?? 100,
        }),
        viewportPoint: resolvePointValue({
          value: params.scrollEndViewportPoint ?? '0',
          customPercent: params.scrollEndViewportCustomPercent ?? 0,
        }),
        offsetPx: Number(params.scrollEndOffsetPx ?? params.scrollEndOffset ?? 0),
      },

      clamp: params.scrollClamp !== false,
    },
  };
}

function resolvePointValue({
  value,
  customPercent,
}) {
  if (value === 'custom') {
    return clamp01(Number(customPercent ?? 0) / 100);
  }

  const n = Number(value);

  if (!Number.isFinite(n)) return 0;

  return clamp01(n);
}

function clamp01(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(1, n));
}

function normalizeScrollSteps(steps) {
  const list = Array.isArray(steps) && steps.length >= 2
    ? steps
    : [
        { id: 'step-0', position: 0 },
        { id: 'step-1', position: 800 },
      ];

  return list.map((step, index) => ({
    id: step.id ?? `step-${index}`,
    index,
    position: Number(step.position ?? index * 800),
  }));
}

function makeEmptyEventSignal(ctx, warnings) {
  return {
    outputType: 'eventSignal',
    version: '0.1',

    eventType: 'unknown',

    sourceVisual: null,
    sourceScopeId: null,
    selector: null,

    events: [],
    eventIds: {},

    primaryEventId: null,
    secondaryEventId: null,

    preview: null,

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Event Signal',
      warnings,
    },
  };
}