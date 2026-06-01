// src/evaluator/controls/evalSlider.js

import {
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

export function evalSlider(ctx) {
  const p = ctx.params ?? {};

  const min = Number(p.min ?? 0);
  const max = Number(p.max ?? 100);
  const step = Math.max(0, Number(p.step ?? 1));
  const initialValue = Number(p.initialValue ?? midpoint(min, max));

  const width = Math.max(40, Number(p.width ?? 240));
  const trackHeight = Math.max(1, Number(p.trackHeight ?? 6));
  const handleRadius = Math.max(2, Number(p.handleRadius ?? 9));

  const trackColor = p.trackColor ?? '#333333';
  const activeColor = p.activeColor ?? '#6f86ff';
  const handleColor = p.handleColor ?? '#ffffff';

  const progress = valueToProgress({
    value: initialValue,
    min,
    max,
  });

  const value = progressToValue({
    progress,
    min,
    max,
    step,
  });

  const ids = makeSliderIds(ctx.nodeId);

  const progressStateId = `${ctx.nodeId}:slider-progress`;
  const progressEventId = `${ctx.nodeId}:slider-input`;

  const runtimeSpec = makeSliderRuntimeSpec({
    ctx,
    ids,
    progressStateId,
    progressEventId,
    min,
    max,
    step,
    value,
    progress,
    width,
    trackHeight,
    handleRadius,
  });

  const visual = makeSliderVisualOutput({
    ctx,
    ids,
    runtimeSpec,
    min,
    max,
    step,
    value,
    progress,
    width,
    trackHeight,
    handleRadius,
    trackColor,
    activeColor,
    handleColor,
  });

  const eventSignal = makeSliderEventSignal({
    ctx,
    ids,
    runtimeSpec,
    progressStateId,
    progressEventId,
    min,
    max,
    step,
    value,
    progress,
  });

  return {
    outputType: 'multi',
    version: '0.1',

    outputs: {
      visual,
      event: eventSignal,
      default: visual,
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Slider Outputs',
      outputRole: 'slider',
    },
  };
}

function makeSliderVisualOutput({
  ctx,
  ids,
  runtimeSpec,
  min,
  max,
  step,
  value,
  progress,
  width,
  trackHeight,
  handleRadius,
  trackColor,
  activeColor,
  handleColor,
}) {
  const centerY = handleRadius + 4;
  const trackY = centerY - trackHeight / 2;
  const activeWidth = width * progress;
  const handleX = width * progress;
  const hitHeight = Math.max(32, handleRadius * 4);

  const root = {
    nodeType: 'collection',
    id: ids.root,
    frame: {
      x: 0,
      y: 0,
      width,
      height: hitHeight,
    },
    children: [
      makeRectElement({
        id: ids.track,
        x: 0,
        y: trackY,
        width,
        height: trackHeight,
        fill: trackColor,
        meta: {
          sliderRole: 'track',
        },
      }),

      makeRectElement({
        id: ids.activeTrack,
        x: 0,
        y: trackY,
        width: activeWidth,
        height: trackHeight,
        fill: activeColor,
        meta: {
          sliderRole: 'activeTrack',
          sliderStateId: `${ctx.nodeId}:slider-progress`,
          sliderWidth: width,
        },
      }),

      makeCircleElement({
        id: ids.handle,
        cx: handleX,
        cy: centerY,
        r: handleRadius,
        fill: handleColor,
        stroke: '#222222',
        strokeWidth: 1,
        meta: {
          sliderRole: 'handle',
          sliderStateId: `${ctx.nodeId}:slider-progress`,
          sliderWidth: width,
        },
      }),

      makeRectElement({
        id: ids.hitArea,
        x: 0,
        y: centerY - hitHeight / 2,
        width,
        height: hitHeight,
        fill: '#000000',
        opacity: 0.001,
        meta: {
          sliderRole: 'hitArea',
        },
      }),
    ],
    meta: {
      sourceNodeId: ctx.nodeId,
      outputRole: 'slider',
      slider: {
        rootId: ids.root,
        hitAreaId: ids.hitArea,
        progressStateId: `${ctx.nodeId}:slider-progress`,
        min,
        max,
        step,
        value,
        progress,
        width,
      },
      runtimeScopeIds: [
        ids.root,
      ],
    },
  };

  return {
    outputType: 'visual',
    version: '0.1',

    root,

    runtimeSpec,

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Slider Visual',
      outputRole: 'slider-visual',
      runtimeSpec,

      slider: {
        rootId: ids.root,
        hitAreaId: ids.hitArea,
        progressStateId: `${ctx.nodeId}:slider-progress`,
        min,
        max,
        step,
        value,
        progress,
        width,
      },

      provenance: [
        makeProvenanceEntry({
          nodeId: ctx.nodeId,
          role: 'slider',
          outputType: 'visual',
          label: 'Slider Visual',
          transform: {
            type: 'create-slider-visual',
            min,
            max,
            step,
            value,
            progress,
          },
        }),
      ],
    },
  };
}

function makeSliderEventSignal({
  ctx,
  ids,
  runtimeSpec,
  progressStateId,
  progressEventId,
  min,
  max,
  step,
  value,
  progress,
}) {
  const events = runtimeSpec.events ?? [];

  return {
    outputType: 'eventSignal',
    version: '0.1',

    eventType: 'slider',
    driverType: 'progress',

    sourceVisual: {
      scopeId: ids.root,
      sourceNodeId: ctx.nodeId,
      label: 'Slider',
    },

    sourceScopeId: ids.root,

    selector: {
      type: 'all',
    },

    events,
    runtimeSpec,

    eventIds: {
      progress: progressEventId,
    },

    primaryEventId: progressEventId,
    secondaryEventId: null,

    progressStateId,

    slider: {
      min,
      max,
      step,
      value,
      progress,
    },

    preview: {
      progress,
      value,
      min,
      max,
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Slider Event',
      eventType: 'slider',
      driverType: 'progress',
      progressStateId,
      eventIds: {
        progress: progressEventId,
      },
      slider: {
        min,
        max,
        step,
        value,
        progress,
      },
    },
  };
}

function makeSliderRuntimeSpec({
  ctx,
  ids,
  progressStateId,
  progressEventId,
  min,
  max,
  step,
  value,
  progress,
  width,
  trackHeight,
  handleRadius,
}) {
  const eventSpec = {
    id: progressEventId,
    event: 'sliderInput',

    sourceScopeId: ids.hitArea,

    slider: {
      rootScopeId: ids.root,
      hitScopeId: ids.hitArea,
      activeTrackScopeId: ids.activeTrack,
      handleScopeId: ids.handle,

      stateId: progressStateId,

      min,
      max,
      step,

      width,
      trackHeight,
      handleRadius,

      orientation: 'horizontal',
    },

    emit: {
      eventId: progressEventId,
      value: 'event.value',
    },
  };

  return {
    version: '0.1',

    states: [
      {
        id: progressStateId,
        type: 'progress',
        initial: {
          mode: 'slider',
          progress,
          rawProgress: progress,
          value,
          min,
          max,
          step,
          dragging: false,
        },
      },
    ],

    events: [
      eventSpec,
    ],

    stateRules: [
      {
        id: `${ctx.nodeId}:slider-progress-state`,
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
  };
}

function makeSliderIds(nodeId) {
  return {
    root: `${nodeId}-slider-root`,
    track: `${nodeId}-slider-track`,
    activeTrack: `${nodeId}-slider-active-track`,
    handle: `${nodeId}-slider-handle`,
    hitArea: `${nodeId}-slider-hit-area`,
  };
}

function makeRectElement({
  id,
  x,
  y,
  width,
  height,
  fill,
  opacity = 1,
  meta = {},
}) {
  return {
    nodeType: 'element',
    id,
    content: {
      contentType: 'shape',
      shape: {
        shapeType: 'rect',
        x,
        y,
        width,
        height,
      },
    },
    style: {
      fill: {
        type: 'solid',
        color: fill,
      },
      opacity,
    },
    dataRef: {
      tags: {
        role: meta.sliderRole ?? 'slider-part',
      },
    },
    meta: {
      ...meta,
      runtimeScopeIds: [id],
    },
  };
}

function makeCircleElement({
  id,
  cx,
  cy,
  r,
  fill,
  stroke,
  strokeWidth,
  meta = {},
}) {
  return {
    nodeType: 'element',
    id,
    content: {
      contentType: 'shape',
      shape: {
        shapeType: 'circle',
        cx,
        cy,
        r,
      },
    },
    style: {
      fill: {
        type: 'solid',
        color: fill,
      },
      stroke: {
        enabled: true,
        color: stroke,
        width: strokeWidth,
      },
    },
    dataRef: {
      tags: {
        role: meta.sliderRole ?? 'slider-part',
      },
    },
    meta: {
      ...meta,
      runtimeScopeIds: [id],
    },
  };
}

function valueToProgress({
  value,
  min,
  max,
}) {
  if (max === min) return 0;

  return clamp01((Number(value) - min) / (max - min));
}

function progressToValue({
  progress,
  min,
  max,
  step,
}) {
  const raw = min + clamp01(progress) * (max - min);

  if (!step || step <= 0) return raw;

  return min + Math.round((raw - min) / step) * step;
}

function midpoint(min, max) {
  return min + (max - min) / 2;
}

function clamp01(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(1, n));
}