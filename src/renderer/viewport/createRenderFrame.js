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

  if (mode === 'actual') {
    return createActualRenderFrame({
      output,
      viewportWidth,
      viewportHeight,
      contentBounds,
      explicitSize,
      renderOptions,
    });
  }

  return createFitRenderFrame({
    output,
    viewportWidth,
    viewportHeight,
    contentBounds,
    explicitSize,
    renderOptions,
  });
}

function createFitRenderFrame({
    viewportWidth,
    viewportHeight,
    contentBounds,
    explicitSize,
    renderOptions,
}) {
  const paddingRatio = Number(renderOptions.paddingRatio ?? 0.12);

  const safeWidth = Math.max(contentBounds.width, 1);
  const safeHeight = Math.max(contentBounds.height, 1);

  const padX = safeWidth * paddingRatio;
  const padY = safeHeight * paddingRatio;

  const viewX = contentBounds.minX - padX;
  const viewY = contentBounds.minY - padY;
  const viewWidth = safeWidth + padX * 2;
  const viewHeight = safeHeight + padY * 2;

  return {
    mode: 'fit',

    viewportWidth,
    viewportHeight,

    contentBounds,
    explicitSize,

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
    renderOptions,
}) {
  const baseRect = explicitSize
  ? {
      x: explicitSize.x,
      y: explicitSize.y,
      width: Math.max(explicitSize.width, 1),
      height: Math.max(explicitSize.height, 1),
    }
  : {
      x: contentBounds.minX,
      y: contentBounds.minY,
      width: Math.max(contentBounds.width, 1),
      height: Math.max(contentBounds.height, 1),
    };

    // actual mode should add a small padding to prevent content from being cut off at the edges, especially for strokes and shadows
    const safePadding = Number(renderOptions.actualPadding ?? 4);

    const actualRect = {
        x: baseRect.x - safePadding,
        y: baseRect.y - safePadding,
        width: baseRect.width + safePadding * 2,
        height: baseRect.height + safePadding * 2,
    };

  const overflow = renderOptions.overflow ?? 'auto';

  return {
    mode: 'actual',

    viewportWidth,
    viewportHeight,

    contentBounds,
    explicitSize,

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