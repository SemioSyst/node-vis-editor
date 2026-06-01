// src/runtime/scroll/useRuntimeScrollEvents.js

import { useEffect } from 'react';

import {
  computeElementViewportProgress,
  computePageStepProgress,
} from './scrollProgressUtils.js';

export function useRuntimeScrollEvents({
  runtime,
  containerRef,
  scrollContainerRef = null,
}) {
  useEffect(() => {
    if (!runtime) return undefined;

    const spec = runtime.getSpec?.();
    const scrollEvents = (spec?.events ?? []).filter(
      (eventSpec) => eventSpec?.event === 'scrollProgress'
    );

    if (scrollEvents.length === 0) {
      return undefined;
    }

    const scrollContainer = scrollContainerRef?.current ?? null;
    const scrollTarget = scrollContainer ?? window;

    let frame = null;

    const emitAll = () => {
      frame = null;

      scrollEvents.forEach((eventSpec) => {
        const payload = computePayloadForScrollEvent({
          eventSpec,
          container: containerRef?.current ?? null,
          scrollContainer,
        });

        runtime.dispatch({
          type: 'event.emit',
          eventId: eventSpec.emit?.eventId ?? eventSpec.id,
          ref: makeScrollRuntimeRef({
            eventSpec,
            payload,
          }),
          value: payload,
        });
      });
    };

    const schedule = () => {
      if (frame != null) return;

      frame = requestAnimationFrame(emitAll);
    };

    // Initial measurement after DOM is present.
    schedule();

    scrollTarget.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);

    return () => {
      if (frame != null) {
        cancelAnimationFrame(frame);
      }

      scrollTarget.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
    };
  }, [runtime, containerRef, scrollContainerRef]);
}

function computePayloadForScrollEvent({
  eventSpec,
  container,
  scrollContainer,
}) {
  const scroll = eventSpec.scroll ?? {};
  const source = scroll.source ?? 'elementViewport';

  if (source === 'pageSteps') {
    return computePageStepProgress({
      config: scroll.pageSteps ?? {},
      scrollY: scrollContainer?.scrollTop ?? null,
    });
  }

  const targetElement = findElementByRuntimeScope(
    container,
    eventSpec.sourceScopeId
  );

  return computeElementViewportProgress({
    element: targetElement ?? container,
    scrollContainer,
    config: scroll.elementViewport ?? {},
  });
}

function makeScrollRuntimeRef({
  eventSpec,
  payload,
}) {
  return {
    elementId: eventSpec.sourceScopeId ?? eventSpec.id,
    sourceScopeId: eventSpec.sourceScopeId ?? null,

    eventType: 'scroll',

    scroll: payload,
    value: payload,

    pointer: null,

    tags: {},
    dataRef: {},

    meta: {
      eventId: eventSpec.id,
      scrollSource: eventSpec.scroll?.source ?? 'elementViewport',
    },
  };
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