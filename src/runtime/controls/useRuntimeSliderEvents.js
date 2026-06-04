// src/runtime/controls/useRuntimeSliderEvents.js

import { useEffect } from 'react';

export function useRuntimeSliderEvents({
  runtime,
  containerRef,
}) {
  useEffect(() => {
    if (!runtime) return undefined;

    const spec = runtime.getSpec?.();
    const sliderEvents = (spec?.events ?? []).filter(
      (eventSpec) => eventSpec?.event === 'sliderInput'
    );

    if (!sliderEvents.length) return undefined;

    const cleanupFns = sliderEvents
      .map((eventSpec) =>
        attachSliderEvent({
          runtime,
          container: containerRef?.current ?? null,
          eventSpec,
        })
      )
      .filter(Boolean);

    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
    };
  }, [runtime, containerRef]);
}

function attachSliderEvent({
  runtime,
  container,
  eventSpec,
}) {
  if (!container) return null;

  const slider = eventSpec.slider ?? {};
  const hitElement =
    findElementByRuntimeScope(container, slider.hitScopeId) ??
    findElementByRuntimeScope(container, eventSpec.sourceScopeId) ??
    findElementByRuntimeScope(container, slider.rootScopeId);

  if (!hitElement) return null;

  const onPointerDown = (evt) => {
    evt.preventDefault();
    evt.stopPropagation();

    const dragRect = hitElement.getBoundingClientRect();

    updateFromPointer({
        runtime,
        eventSpec,
        evt,
        dragging: true,
        dragRect,
    });

    const onPointerMove = (moveEvt) => {
        moveEvt.preventDefault();

        updateFromPointer({
        runtime,
        eventSpec,
        evt: moveEvt,
        dragging: true,
        dragRect,
        });
    };

    const onPointerUp = (upEvt) => {
        updateFromPointer({
        runtime,
        eventSpec,
        evt: upEvt,
        dragging: false,
        dragRect,
        });

        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    };

  hitElement.addEventListener('pointerdown', onPointerDown);

  hitElement.style.cursor = 'pointer';
  hitElement.style.touchAction = 'none';

  return () => {
    hitElement.removeEventListener('pointerdown', onPointerDown);
  };
}

function updateFromPointer({
  runtime,
  eventSpec,
  evt,
  dragging,
  dragRect = null,
}) {
  const slider = eventSpec.slider ?? {};

  const rect = dragRect;

  if (!rect || rect.width <= 0) return;

  const rawProgress = (evt.clientX - rect.left) / rect.width;
  const progress = clamp01(rawProgress);

  const min = Number(slider.min ?? 0);
  const max = Number(slider.max ?? 100);
  const step = Math.max(0, Number(slider.step ?? 0));

  const value = progressToValue({
    progress,
    min,
    max,
    step,
  });

  const steppedProgress = valueToProgress({
    value,
    min,
    max,
  });

  const payload = {
    mode: 'slider',

    progress: steppedProgress,
    rawProgress,

    value,

    min,
    max,
    step,

    dragging,

    fromIndex: null,
    toIndex: null,
    localProgress: steppedProgress,
  };

  runtime.dispatch({
    type: 'event.emit',
    eventId: eventSpec.emit?.eventId ?? eventSpec.id,
    ref: {
      elementId: eventSpec.sourceScopeId,
      sourceScopeId: eventSpec.sourceScopeId,
      eventType: 'slider',
      slider: payload,
      value: payload,
      tags: {},
      dataRef: {},
      meta: {
        eventId: eventSpec.id,
      },
    },
    value: payload,
  });
}

function findElementFromEventTarget(target, scopeId) {
  let current = target;

  while (current && current instanceof HTMLElement) {
    if (elementMatchesRuntimeScope(current, scopeId)) {
      return current;
    }

    current = current.parentElement;
  }

  return target;
}

function findElementByRuntimeScope(container, scopeId) {
  if (!container || !scopeId) return null;

  if (elementMatchesRuntimeScope(container, scopeId)) {
    return container;
  }

  const candidates = container.querySelectorAll(
    '[data-runtime-scopes], [data-node-id]'
  );

  for (const candidate of candidates) {
    if (elementMatchesRuntimeScope(candidate, scopeId)) {
      return candidate;
    }
  }

  return null;
}

function elementMatchesRuntimeScope(element, scopeId) {
  if (!element || !scopeId) return false;

  if (element.dataset?.nodeId === scopeId) return true;

  const rawScopes = element.dataset?.runtimeScopes;

  if (!rawScopes) return false;

  try {
    const scopes = JSON.parse(rawScopes);
    return Array.isArray(scopes) && scopes.includes(scopeId);
  } catch {
    return rawScopes.includes(scopeId);
  }
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

function clamp01(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(1, n));
}