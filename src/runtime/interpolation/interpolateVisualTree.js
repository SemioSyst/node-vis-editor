// src/runtime/interpolation/interpolateVisualTree.js

import { interpolateVisualElement } from './interpolateVisualElement.js';
import { interpolateNodeLayoutProps } from './interpolateValues.js';
import {
  cloneVisualNode,
  findVisualNodeById,
  makeScopeStableRoot,
  replaceVisualNodeById,
} from './visualTreeUtils.js';

export function interpolateVisualStateRoot({
  change,
  fromState,
  toState,
  targetScopeId,
  progress,
  transitionSpec,
}) {
  if (!change || !fromState?.visual?.root || !toState?.visual?.root) {
    return null;
  }

    const fromRoot = fromState.visual.root;
    const toRoot = toState.visual.root;

    const rootLayoutProps = interpolateNodeLayoutProps(
        fromRoot,
        toRoot,
        progress
    );

    const baseRoot = {
        ...cloneVisualNode(fromRoot),

        // Interpolate root / collection level layout too.
        // This covers cases where the whole fallback layout or group offset changed.
        ...rootLayoutProps,

        meta: {
            ...(fromRoot.meta ?? {}),
            runtimeRootLayoutInterpolated: Boolean(
            rootLayoutProps.frame ||
            rootLayoutProps.transform
            ),
        },
    };

    const pairs = resolveMatchedElementPairs({
        change,
        fromStateKey: fromState.key,
        toStateKey: toState.key,
        fromRoot,
        toRoot,
  });

  if (pairs.length === 0) {
    return null;
  }

  let nextRoot = baseRoot;
  let interpolatedCount = 0;

  pairs.forEach((pair) => {
    const interpolated = interpolateVisualElement({
        fromElement: pair.fromElement,
        toElement: pair.toElement,
        progress,
        transitionSpec,
        match: pair,
    });

    if (!interpolated) return;

    const result = replaceVisualNodeById(
      nextRoot,
      pair.fromElement.id,
      {
        ...interpolated,
        id: pair.fromElement.id,
        meta: {
          ...(interpolated.meta ?? {}),
          matchKey: pair.matchKey,
          runtimeFromElementId: pair.fromElement.id,
          runtimeToElementId: pair.toElement.id,
        },
      }
    );

    if (result.replaced) {
      nextRoot = result.node;
      interpolatedCount += 1;
    }
  });

  if (interpolatedCount === 0) {
    return null;
  }

  const stableRoot = makeScopeStableRoot({
    replacementRoot: nextRoot,
    targetScopeId,
    activeStateKey: toState.key,
  });

  return {
    root: stableRoot,
    interpolatedCount,
    pairCount: pairs.length,
  };
}

function resolveMatchedElementPairs({
  change,
  fromStateKey,
  toStateKey,
  fromRoot,
  toRoot,
}) {
  const pairMatch = findPairMatch({
    change,
    fromStateKey,
    toStateKey,
  });

  if (pairMatch) {
    return pairMatch.matches
      .map((match) => {
        const fromElementId = match.fromElementRef?.elementId;
        const toElementId = match.toElementRef?.elementId;

        if (!fromElementId || !toElementId) return null;

        const fromElement = findVisualNodeById(fromRoot, fromElementId);
        const toElement = findVisualNodeById(toRoot, toElementId);

        if (!fromElement || !toElement) return null;

        return {
            matchKey: match.matchKey,
            fromRef: match.fromElementRef,
            toRef: match.toElementRef,
            fromElement,
            toElement,

            pointMatches: match.pointMatches ?? null,
            pointMatchRule: match.pointMatchRule ?? null,
            pointMatchReport: match.pointMatchReport ?? null,
        };
      })
      .filter(Boolean);
  }

  // Backward compatibility with older global elementMatches.
  return (change.elementMatches ?? [])
    .map((match) => {
      const fromRef = match.elementsByState?.[fromStateKey];
      const toRef = match.elementsByState?.[toStateKey];

      if (!fromRef?.elementId || !toRef?.elementId) return null;

      const fromElement = findVisualNodeById(fromRoot, fromRef.elementId);
      const toElement = findVisualNodeById(toRoot, toRef.elementId);

      if (!fromElement || !toElement) return null;

      return {
        matchKey: match.matchKey,
        fromRef,
        toRef,
        fromElement,
        toElement,
        pointMatches: match.pointMatches ?? null,
      };
    })
    .filter(Boolean);
}

function findPairMatch({
  change,
  fromStateKey,
  toStateKey,
}) {
  return (change.pairMatches ?? []).find((pair) =>
    pair.fromStateKey === fromStateKey &&
    pair.toStateKey === toStateKey
  ) ?? null;
}