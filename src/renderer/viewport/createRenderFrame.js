// src/renderer/viewport/createRenderFrame.js

import { getVisualBounds, getExplicitRootSize } from './getVisualBounds.js';

const FALLBACK_BOUNDS = {
  minX: 0,
  minY: 0,
  maxX: 100,
  maxY: 100,
  width: 100,
  height: 100,
};

export function createRenderFrame(output, renderOptions = {}) {
  const mode = renderOptions.mode ?? 'fit';

  const viewportWidth = Number(renderOptions.viewportWidth ?? 240);
  const viewportHeight = Number(renderOptions.viewportHeight ?? 160);

  const contentBounds = getVisualBounds(output) ?? FALLBACK_BOUNDS;
  const explicitSize = getExplicitRootSize(output);

  const renderBounds = resolveRenderBounds({
    contentBounds,
    explicitSize,
    renderOptions,
  });

  if (mode === 'actual') {
    return createActualRenderFrame({
      viewportWidth,
      viewportHeight,
      contentBounds,
      explicitSize,
      renderBounds,
      renderOptions,
    });
  }

  return createFitRenderFrame({
    viewportWidth,
    viewportHeight,
    contentBounds,
    explicitSize,
    renderBounds,
    renderOptions,
  });
}

function createFitRenderFrame({
  viewportWidth,
  viewportHeight,
  contentBounds,
  explicitSize,
  renderBounds,
  renderOptions,
}) {
  const paddingRatio = Number(renderOptions.paddingRatio ?? 0.12);
  const minPadding = Number(renderOptions.fitMinPadding ?? renderOptions.minPadding ?? 8);

  const safeWidth = Math.max(renderBounds.width, 1);
  const safeHeight = Math.max(renderBounds.height, 1);

  const padX = Math.max(safeWidth * paddingRatio, minPadding);
  const padY = Math.max(safeHeight * paddingRatio, minPadding);

  const viewX = renderBounds.minX - padX;
  const viewY = renderBounds.minY - padY;
  const viewWidth = safeWidth + padX * 2;
  const viewHeight = safeHeight + padY * 2;

  return {
    mode: 'fit',

    viewportWidth,
    viewportHeight,

    contentBounds,
    explicitSize,
    renderBounds,

    viewBox: `${viewX} ${viewY} ${viewWidth} ${viewHeight}`,
    viewBoxRect: {
      x: viewX,
      y: viewY,
      width: viewWidth,
      height: viewHeight,
    },

    svgWidth: '100%',
    svgHeight: '100%',
    preserveAspectRatio: 'xMidYMid meet',

    // For future HTML / Canvas renderers
    scaleMode: 'fit',
    overflow: 'hidden',
  };
}

function createActualRenderFrame({
  viewportWidth,
  viewportHeight,
  contentBounds,
  explicitSize,
  renderBounds,
  renderOptions,
}) {
  const safePadding = Number(renderOptions.actualPadding ?? 8);

  const actualRect = expandBoundsToRect(renderBounds, safePadding);

  const overflow = renderOptions.overflow ?? 'auto';

  return {
    mode: 'actual',

    viewportWidth,
    viewportHeight,

    contentBounds,
    explicitSize,
    renderBounds,

    viewBox: `${actualRect.x} ${actualRect.y} ${actualRect.width} ${actualRect.height}`,
    viewBoxRect: actualRect,

    svgWidth: actualRect.width,
    svgHeight: actualRect.height,
    preserveAspectRatio: 'xMinYMin meet',

    // For future HTML / Canvas renderers
    scaleMode: 'actual',
    overflow,
  };
}

function resolveRenderBounds({
  contentBounds,
  explicitSize,
  renderOptions,
}) {
  const explicitBounds = explicitSizeToBounds(explicitSize);

  if (!explicitBounds) {
    return contentBounds ?? FALLBACK_BOUNDS;
  }

  // If true, actual/fit preview behaves like a clipped container.
  // Default false because authoring preview should not accidentally crop labels,
  // strokes, axis ticks, or procedural renderer output.
  if (renderOptions.clipToExplicitSize) {
    return explicitBounds;
  }

  return unionBounds([
    explicitBounds,
    contentBounds,
  ]) ?? explicitBounds;
}

function explicitSizeToBounds(explicitSize) {
  if (!explicitSize) return null;

  const x = Number(explicitSize.x ?? 0);
  const y = Number(explicitSize.y ?? 0);
  const width = Number(explicitSize.width);
  const height = Number(explicitSize.height);

  if (![x, y, width, height].every(Number.isFinite)) return null;

  return makeBounds(x, y, x + Math.max(width, 1), y + Math.max(height, 1));
}

function expandBoundsToRect(bounds, padding) {
  const p = Number(padding ?? 0);

  return {
    x: bounds.minX - p,
    y: bounds.minY - p,
    width: Math.max(bounds.width + p * 2, 1),
    height: Math.max(bounds.height + p * 2, 1),
  };
}

function unionBounds(boundsList) {
  const valid = boundsList.filter(Boolean);
  if (!valid.length) return null;

  return makeBounds(
    Math.min(...valid.map((b) => b.minX)),
    Math.min(...valid.map((b) => b.minY)),
    Math.max(...valid.map((b) => b.maxX)),
    Math.max(...valid.map((b) => b.maxY))
  );
}

function makeBounds(minX, minY, maxX, maxY) {
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
    return FALLBACK_BOUNDS;
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
}