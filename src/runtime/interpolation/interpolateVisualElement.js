// src/runtime/interpolation/interpolateVisualElement.js

import {
  chooseByProgress,
  interpolateMaybeNumber,
  interpolateNodeLayoutProps,
  interpolateNumberProps,
  interpolateStyle,
} from './interpolateValues.js';
import { clonePlainObject } from './visualTreeUtils.js';
import {
  buildPathDFromPoints,
  buildPathPointMatchBundle,
  interpolatePointsFromMatches,
} from './pathPointMatching.js';

export function interpolateVisualElement({
  fromElement,
  toElement,
  progress,
  transitionSpec,
  match = null,
}) {
  if (!fromElement || !toElement) {
    return null;
  }

  if (fromElement.nodeType !== 'element' || toElement.nodeType !== 'element') {
    return chooseByProgress(fromElement, toElement, progress);
  }

  const fromContent = fromElement.content ?? {};
  const toContent = toElement.content ?? {};

  if (fromContent.contentType !== toContent.contentType) {
    return chooseByProgress(fromElement, toElement, progress);
  }

  const interpolatedContent = interpolateContent({
    fromContent,
    toContent,
    fromElement,
    toElement,
    progress,
    transitionSpec,
    match,
  });

  if (!interpolatedContent) {
    return null;
  }

  const layoutProps = interpolateNodeLayoutProps(
    fromElement,
    toElement,
    progress
    );

    return {
        ...fromElement,

        // This is the important part for fallback layout animation.
        // ShapeGenerator / TextGenerator / PathGenerator often store generated
        // positions in frame / transform rather than only in content.
        ...layoutProps,

        content: interpolatedContent,

        style: interpolateStyle(
            fromElement.style ?? {},
            toElement.style ?? {},
            progress
        ),

        meta: {
            ...(fromElement.meta ?? {}),
            runtimeInterpolated: true,
            runtimeLayoutInterpolated: Boolean(layoutProps.frame || layoutProps.transform),
            runtimeInterpolationFrom: fromElement.id,
            runtimeInterpolationTo: toElement.id,
        },
    };
}

function interpolateContent({
    fromContent,
    toContent,
    fromElement,
    toElement,
    progress,
    transitionSpec,
    match,
}) {
  if (fromContent.contentType === 'shape') {
    return interpolateShapeContent({
        fromContent,
        toContent,
        fromElement,
        toElement,
        progress,
        transitionSpec,
        match,
    });
  }

  if (fromContent.contentType === 'text') {
    return interpolateTextContent({
      fromContent,
      toContent,
      progress,
    });
  }

  // For image / legacySvg / unsupported content, fallback to snap.
  return chooseByProgress(fromContent, toContent, progress);
}

function interpolateShapeContent({
  fromContent,
  toContent,
  fromElement,
  toElement,
  progress,
  transitionSpec,
  match,
}) {
  const fromShape = fromContent.shape ?? {};
  const toShape = toContent.shape ?? {};

  const fromShapeType = fromShape.shapeType ?? fromShape.kind;
  const toShapeType = toShape.shapeType ?? toShape.kind;

  if (fromShapeType !== toShapeType) {
    return null;
  }

  if (fromShapeType === 'rect') {
    return {
      ...fromContent,
      shape: {
        ...fromShape,
        shapeType: 'rect',
        ...interpolateNumberProps(
          fromShape,
          toShape,
          ['x', 'y', 'width', 'height', 'w', 'h', 'rx', 'ry'],
          progress
        ),
      },
    };
  }

  if (fromShapeType === 'circle') {
    return {
      ...fromContent,
      shape: {
        ...fromShape,
        shapeType: 'circle',
        ...interpolateNumberProps(
          fromShape,
          toShape,
          ['cx', 'cy', 'r'],
          progress
        ),
      },
    };
  }

  if (fromShapeType === 'line') {
    return {
      ...fromContent,
      shape: {
        ...fromShape,
        shapeType: 'line',
        ...interpolateNumberProps(
          fromShape,
          toShape,
          ['x1', 'y1', 'x2', 'y2'],
          progress
        ),
      },
    };
  }

  if (fromShapeType === 'path') {
    return interpolatePathContent({
        fromContent,
        toContent,
        fromElement,
        toElement,
        progress,
        transitionSpec,
        match,
    });
  }

  if (fromShapeType === 'polygon' || fromShapeType === 'polyline') {
    const points = interpolatePointsString(
      fromShape.points,
      toShape.points,
      progress
    );

    if (!points) return null;

    return {
      ...fromContent,
      shape: {
        ...fromShape,
        shapeType: fromShapeType,
        points,
      },
    };
  }

  return chooseByProgress(fromContent, toContent, progress);
}

function interpolateTextContent({
  fromContent,
  toContent,
  progress,
}) {
  const next = {
    ...fromContent,
  };

  ['x', 'y', 'fontSize', 'rotate'].forEach((key) => {
    if (fromContent[key] == null && toContent[key] == null) return;

    next[key] = interpolateMaybeNumber(
      fromContent[key],
      toContent[key],
      progress
    );
  });

  next.text = chooseByProgress(
    fromContent.text,
    toContent.text,
    progress
  );

  next.fontFamily = chooseByProgress(
    fromContent.fontFamily,
    toContent.fontFamily,
    progress
  );

  next.fontWeight = chooseByProgress(
    fromContent.fontWeight,
    toContent.fontWeight,
    progress
  );

  return next;
}

function interpolatePathContent({
  fromContent,
  toContent,
  fromElement,
  toElement,
  progress,
  transitionSpec,
  match,
}) {
  const pathMode = transitionSpec?.interpolation?.path ?? 'auto';

  if (pathMode === 'direct') {
    return chooseByProgress(fromContent, toContent, progress);
  }

  if (pathMode === 'crossfade') {
    return null;
  }

  let pointMatches = match?.pointMatches ?? null;

  if (!pointMatches?.length) {
    const pointMatchBundle = buildPathPointMatchBundle({
      fromElement,
      toElement,
      rule: {
        method: pathMode === 'points' ? 'auto' : 'auto',
        fallback: 'index',
      },
    });

    pointMatches = pointMatchBundle?.matches ?? null;
  }

  if (!pointMatches?.length) {
    return null;
  }

  const points = interpolatePointsFromMatches(
    pointMatches,
    progress
  );

  if (!points.length) {
    return null;
  }

  return {
    ...fromContent,
    shape: {
      ...(fromContent.shape ?? {}),
      shapeType: 'path',
      d: buildPathDFromPoints(points),
    },
  };
}

function getPathPoints(element) {
  const points =
    element.dataRef?.points ??
    element.meta?.points ??
    element.meta?.geometrySummary?.points ??
    [];

  if (!Array.isArray(points)) return [];

  return points
    .map((point) => ({
      x: Number(point.x),
      y: Number(point.y),
    }))
    .filter((point) =>
      Number.isFinite(point.x) &&
      Number.isFinite(point.y)
    );
}

function buildPathFromPoints(points) {
  if (!points.length) return '';

  return points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
    )
    .join(' ');
}

function interpolatePointsString(fromPoints, toPoints, progress) {
  const fromPairs = parsePointsString(fromPoints);
  const toPairs = parsePointsString(toPoints);

  if (
    fromPairs.length === 0 ||
    fromPairs.length !== toPairs.length
  ) {
    return null;
  }

  return fromPairs
    .map((fromPair, index) => {
      const toPair = toPairs[index];

      const x = interpolateMaybeNumber(fromPair[0], toPair[0], progress);
      const y = interpolateMaybeNumber(fromPair[1], toPair[1], progress);

      return `${x},${y}`;
    })
    .join(' ');
}

function parsePointsString(points) {
  if (!points) return [];

  return String(points)
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number))
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
}