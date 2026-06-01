// src/runtime/scroll/scrollProgressUtils.js

export function clamp01(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(1, n));
}

export function maybeClamp(value, clamp = true) {
  const n = Number(value);

  if (!Number.isFinite(n)) return 0;

  return clamp ? clamp01(n) : n;
}

export function computeElementViewportProgress({
  element,
  scrollContainer = null,
  config = {},
}) {
  if (!element) {
    return makeEmptyScrollPayload('elementViewport', {
      scrollContainer,
    });
  }

  const metrics = getElementViewportMetrics({
    element,
    scrollContainer,
  });

  if (!metrics) {
    return makeEmptyScrollPayload('elementViewport', {
      scrollContainer,
    });
  }

  const {
    scrollY,
    viewportHeight,
    viewportWidth,
    relativeTop,
    elementHeight,
    elementWidth,
    elementScrollTop,
  } = metrics;

  const startConfig = normalizeViewportTrigger(
    config.start,
    {
      elementPoint: 0,
      viewportPoint: 1,
      offsetPx: Number(config.startOffset ?? 0),
    }
  );

  const endConfig = normalizeViewportTrigger(
    config.end,
    {
      elementPoint: 1,
      viewportPoint: 0,
      offsetPx: Number(config.endOffset ?? 0),
    }
  );

  const startScroll = computeTriggerScrollPosition({
    elementScrollTop,
    elementHeight,
    viewportHeight,
    trigger: startConfig,
  });

  const endScroll = computeTriggerScrollPosition({
    elementScrollTop,
    elementHeight,
    viewportHeight,
    trigger: endConfig,
  });

  const denominator = endScroll - startScroll;

  const rawProgress =
    denominator === 0
      ? 0
      : (scrollY - startScroll) / denominator;

  const progress = maybeClamp(rawProgress, config.clamp !== false);

  return {
    mode: 'elementViewport',

    progress,
    rawProgress,

    scrollY,
    scrollTop: scrollY,

    startScroll,
    endScroll,

    start: startConfig,
    end: endConfig,

    rect: {
      top: relativeTop,
      bottom: relativeTop + elementHeight,
      left: 0,
      right: elementWidth,
      width: elementWidth,
      height: elementHeight,

      relativeTop,
      relativeBottom: relativeTop + elementHeight,
    },

    viewport: {
      top: 0,
      left: 0,
      height: viewportHeight,
      width: viewportWidth,
    },

    fromIndex: null,
    toIndex: null,
    localProgress: progress,
  };
}

export function computePageStepProgress({
  config = {},
  scrollY = null,
}) {
  const resolvedScrollY =
    scrollY == null
      ? getScrollY(null)
      : Number(scrollY);

  const clamp = config.clamp !== false;
  const steps = normalizePageSteps(config.steps);

  if (steps.length === 0) {
    return makeEmptyScrollPayload('pageSteps', {
      scrollY: resolvedScrollY,
    });
  }

  if (steps.length === 1) {
    return {
      mode: 'pageSteps',

      progress: 0,
      rawProgress: 0,

      scrollY: resolvedScrollY,
      scrollTop: resolvedScrollY,

      currentStepIndex: 0,
      fromIndex: 0,
      toIndex: 0,
      localProgress: 1,

      steps,
    };
  }

  const transitionDistance = Math.max(
    0,
    Number(config.transitionDistance ?? 300)
  );

  const first = steps[0];
  const last = steps[steps.length - 1];

  const globalRaw =
    last.position === first.position
      ? 0
      : (resolvedScrollY - first.position) / (last.position - first.position);

  const globalProgress = maybeClamp(globalRaw, clamp);

  for (let i = 1; i < steps.length; i += 1) {
    const point = steps[i].position;
    const start = point - transitionDistance;
    const end = point;

    if (resolvedScrollY < start) {
      const stableIndex = i - 1;

      return {
        mode: 'pageSteps',

        progress: globalProgress,
        rawProgress: globalRaw,

        scrollY: resolvedScrollY,
        scrollTop: resolvedScrollY,

        currentStepIndex: stableIndex,
        fromIndex: stableIndex,
        toIndex: stableIndex,
        localProgress: 1,

        transitionStart: null,
        transitionEnd: null,

        steps,
      };
    }

    if (resolvedScrollY <= end) {
      const localRaw =
        transitionDistance <= 0
          ? 1
          : (resolvedScrollY - start) / transitionDistance;

      return {
        mode: 'pageSteps',

        progress: globalProgress,
        rawProgress: globalRaw,

        scrollY: resolvedScrollY,
        scrollTop: resolvedScrollY,

        currentStepIndex: i,
        fromIndex: i - 1,
        toIndex: i,
        localProgress: maybeClamp(localRaw, clamp),

        transitionStart: start,
        transitionEnd: end,

        steps,
      };
    }
  }

  const lastIndex = steps.length - 1;

  return {
    mode: 'pageSteps',

    progress: globalProgress,
    rawProgress: globalRaw,

    scrollY: resolvedScrollY,
    scrollTop: resolvedScrollY,

    currentStepIndex: lastIndex,
    fromIndex: lastIndex,
    toIndex: lastIndex,
    localProgress: 1,

    transitionStart: null,
    transitionEnd: null,

    steps,
  };
}

export function resolveProgressSegment({
  payload,
  order,
}) {
  const stateOrder = Array.isArray(order) ? order : [];

  if (stateOrder.length === 0) return null;

  if (stateOrder.length === 1) {
    return {
      fromStateKey: stateOrder[0],
      toStateKey: stateOrder[0],
      localProgress: 1,
      progress: 1,
    };
  }

  if (
    payload?.mode === 'pageSteps' &&
    payload.fromIndex != null &&
    payload.toIndex != null
  ) {
    const fromIndex = clampIndex(payload.fromIndex, stateOrder.length);
    const toIndex = clampIndex(payload.toIndex, stateOrder.length);

    return {
      fromStateKey: stateOrder[fromIndex],
      toStateKey: stateOrder[toIndex],
      localProgress: clamp01(payload.localProgress ?? 0),
      progress: clamp01(payload.progress ?? 0),
      fromIndex,
      toIndex,
    };
  }

  const progress = clamp01(
    typeof payload === 'number'
      ? payload
      : payload?.progress ?? 0
  );

  const segmentCount = stateOrder.length - 1;
  const scaled = progress * segmentCount;

  const fromIndex = Math.min(
    stateOrder.length - 1,
    Math.floor(scaled)
  );

  const toIndex = Math.min(
    stateOrder.length - 1,
    fromIndex + 1
  );

  const localProgress =
    fromIndex === toIndex
      ? 1
      : scaled - fromIndex;

  return {
    fromStateKey: stateOrder[fromIndex],
    toStateKey: stateOrder[toIndex],
    localProgress: clamp01(localProgress),
    progress,
    fromIndex,
    toIndex,
  };
}

function computeTriggerScrollPosition({
  elementScrollTop,
  elementHeight,
  viewportHeight,
  trigger,
}) {
  return (
    elementScrollTop +
    elementHeight * trigger.elementPoint -
    viewportHeight * trigger.viewportPoint -
    Number(trigger.offsetPx ?? 0)
  );
}

function normalizeViewportTrigger(value, fallback) {
  return {
    elementPoint: clamp01(
      value?.elementPoint ?? fallback.elementPoint
    ),
    viewportPoint: clamp01(
      value?.viewportPoint ?? fallback.viewportPoint
    ),
    offsetPx: Number(value?.offsetPx ?? fallback.offsetPx ?? 0),
  };
}

function normalizePageSteps(steps) {
  const normalized = Array.isArray(steps) ? steps : [];

  return normalized
    .map((step, index) => ({
      id: step.id ?? `step-${index}`,
      index,
      position: Number(step.position ?? step.scrollY ?? 0),
    }))
    .filter((step) => Number.isFinite(step.position))
    .sort((a, b) => a.position - b.position);
}

function makeEmptyScrollPayload(mode, options = {}) {
  const scrollY =
    options.scrollY == null
      ? getScrollY(options.scrollContainer ?? null)
      : Number(options.scrollY);

  return {
    mode,
    progress: 0,
    rawProgress: 0,
    scrollY,
    scrollTop: scrollY,
    fromIndex: 0,
    toIndex: 0,
    localProgress: 0,
  };
}

function getViewportMetrics(scrollContainer) {
  if (scrollContainer && typeof scrollContainer.getBoundingClientRect === 'function') {
    const rect = scrollContainer.getBoundingClientRect();

    return {
      top: rect.top,
      left: rect.left,
      width: scrollContainer.clientWidth || rect.width || 0,
      height: scrollContainer.clientHeight || rect.height || 0,
    };
  }

  return {
    top: 0,
    left: 0,
    width:
      window.innerWidth ??
      document.documentElement.clientWidth ??
      0,
    height:
      window.innerHeight ??
      document.documentElement.clientHeight ??
      0,
  };
}

function getScrollY(scrollContainer) {
  if (scrollContainer) {
    return Number(scrollContainer.scrollTop ?? 0);
  }

  return (
    window.scrollY ??
    window.pageYOffset ??
    document.documentElement.scrollTop ??
    0
  );
}

function clampIndex(index, length) {
  const n = Number(index);

  if (!Number.isFinite(n)) return 0;

  return Math.max(0, Math.min(length - 1, Math.floor(n)));
}

function getElementViewportMetrics({
  element,
  scrollContainer,
}) {
  if (!element) return null;

  if (scrollContainer) {
    const scrollY = Number(scrollContainer.scrollTop ?? 0);

    const elementScrollTop = getOffsetTopWithinScrollContainer(
      element,
      scrollContainer
    );

    const elementHeight =
      Number(element.offsetHeight ?? 0) ||
      Number(element.clientHeight ?? 0) ||
      getUnscaledRectHeight(element);

    const elementWidth =
      Number(element.offsetWidth ?? 0) ||
      Number(element.clientWidth ?? 0) ||
      getUnscaledRectWidth(element);

    return {
      scrollY,
      viewportHeight: Number(scrollContainer.clientHeight ?? 0),
      viewportWidth: Number(scrollContainer.clientWidth ?? 0),

      elementScrollTop,
      relativeTop: elementScrollTop - scrollY,

      elementHeight,
      elementWidth,
    };
  }

  if (typeof element.getBoundingClientRect !== 'function') {
    return null;
  }

  const rect = element.getBoundingClientRect();
  const scrollY = getScrollY(null);

  return {
    scrollY,
    viewportHeight:
      window.innerHeight ??
      document.documentElement.clientHeight ??
      0,
    viewportWidth:
      window.innerWidth ??
      document.documentElement.clientWidth ??
      0,

    elementScrollTop: scrollY + rect.top,
    relativeTop: rect.top,

    elementHeight: rect.height,
    elementWidth: rect.width,
  };
}

function getOffsetTopWithinScrollContainer(element, scrollContainer) {
  let top = 0;
  let current = element;

  while (
    current &&
    current !== scrollContainer &&
    current instanceof HTMLElement
  ) {
    top += current.offsetTop ?? 0;
    current = current.offsetParent;
  }

  // If offsetParent chain does not reach the scroll container, fall back to
  // rect delta corrected by the container scrollTop. This can happen when
  // transformed ancestors or SVG wrappers break offsetParent traversal.
  if (current !== scrollContainer && typeof element.getBoundingClientRect === 'function') {
    const elementRect = element.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();

    return (
      scrollContainer.scrollTop +
      (elementRect.top - containerRect.top) / getApproxElementScale(element, scrollContainer)
    );
  }

  return top;
}

function getApproxElementScale(element, scrollContainer) {
  const rect = element.getBoundingClientRect?.();
  const layoutHeight = Number(element.offsetHeight ?? element.clientHeight ?? 0);

  if (rect?.height && layoutHeight > 0) {
    return rect.height / layoutHeight;
  }

  const containerRect = scrollContainer.getBoundingClientRect?.();
  const containerLayoutHeight = Number(scrollContainer.clientHeight ?? 0);

  if (containerRect?.height && containerLayoutHeight > 0) {
    return containerRect.height / containerLayoutHeight;
  }

  return 1;
}

function getUnscaledRectHeight(element) {
  const rect = element.getBoundingClientRect?.();

  if (!rect) return 0;

  const scale = getApproxElementScale(element, element.parentElement);
  return scale ? rect.height / scale : rect.height;
}

function getUnscaledRectWidth(element) {
  const rect = element.getBoundingClientRect?.();

  if (!rect) return 0;

  const scale = getApproxElementScale(element, element.parentElement);
  return scale ? rect.width / scale : rect.width;
}