// src/runtime/visualStates/applyVisualStateRuntime.js

import { interpolateVisualStateRoot } from '../interpolation/interpolateVisualTree.js';
import {
  makeScopeStableRoot,
  replaceVisualSubtree,
  setRootOpacity,
} from '../interpolation/visualTreeUtils.js';
import { clamp01 } from '../interpolation/interpolateValues.js';
import { resolveProgressSegment } from '../scroll/scrollProgressUtils.js';

export function applyVisualStateRuntimeToOutput(output, runtime) {
  if (!output || output.outputType !== 'visual') return output;
  if (!runtime) return output;

  const spec = runtime.getSpec?.();
  const state = runtime.getState?.();

  if (!spec || !state) return output;

  const visualStateBindings = (spec.bindings ?? []).filter(
    (binding) => binding?.type === 'visualStateBinding'
  );

  if (visualStateBindings.length === 0) {
    return output;
  }

  let root = output.root;
  let changed = false;

  const activeVisualStates = [];

  visualStateBindings.forEach((binding) => {
    const change = findVisualStateChange(spec, binding);

    if (!change) return;

    const progressReplacement = makeProgressDrivenRoot({
    spec,
    runtimeState: state,
    change,
    binding,
    });

    if (progressReplacement?.root) {
    const targetScopeId =
        binding.targetScopeId ??
        change.targetScopeId ??
        null;

    if (!targetScopeId) return;

    const result = replaceVisualSubtree({
        node: root,
        targetScopeId,
        replacementRoot: progressReplacement.root,
    });

    if (result.replaced) {
        root = result.node;
        changed = true;

        activeVisualStates.push({
        bindingId: binding.id,
        changeId: change.id,
        stateId: binding.stateId,
        activeStateKey: progressReplacement.toStateKey,
        targetScopeId,
        transition: {
            fromStateKey: progressReplacement.fromStateKey,
            toStateKey: progressReplacement.toStateKey,
            progress: progressReplacement.localProgress,
            rawProgress: progressReplacement.progress,
            mode: 'progress-driver',
        },
        });
    }

    return;
    }

    const transitionRecord = state.transitions?.[binding.id] ?? null;

    const activeStateKey =
      transitionRecord?.toStateKey ??
      state.states?.[binding.stateId] ??
      binding.startStateKey ??
      change.stateSet?.startStateKey ??
      change.visualStates?.[0]?.key ??
      null;

    if (!activeStateKey) return;

    const targetScopeId =
      binding.targetScopeId ??
      change.targetScopeId ??
      null;

    if (!targetScopeId) return;

    const replacementRoot = transitionRecord
      ? makeTransitionRoot({
          spec,
          change,
          binding,
          targetScopeId,
          transitionRecord,
        })
      : makeActiveStateRoot({
          change,
          activeStateKey,
          targetScopeId,
        });

    if (!replacementRoot) return;

    const result = replaceVisualSubtree({
      node: root,
      targetScopeId,
      replacementRoot,
    });

    if (result.replaced) {
      root = result.node;
      changed = true;

      activeVisualStates.push({
        bindingId: binding.id,
        changeId: change.id,
        stateId: binding.stateId,
        activeStateKey,
        targetScopeId,
        transition: transitionRecord
          ? {
              fromStateKey: transitionRecord.fromStateKey,
              toStateKey: transitionRecord.toStateKey,
              progress: transitionRecord.progress,
              rawProgress: transitionRecord.rawProgress,
              mode: transitionRecord.mode,
            }
          : null,
      });
    }
  });

  if (!changed) return output;

  return {
    ...output,
    root,
    meta: {
      ...(output.meta ?? {}),
      runtimeActiveVisualStates: activeVisualStates,
    },
  };
}

function findVisualStateChange(spec, binding) {
  if (!binding?.changeId) return null;

  return (spec.changes ?? []).find(
    (change) =>
      change?.id === binding.changeId &&
      change?.type === 'visualState'
  ) ?? null;
}

function findVisualState(change, activeStateKey) {
  return (change.visualStates ?? []).find(
    (state) => state.key === activeStateKey
  ) ?? null;
}

function findTransitionSpec(spec, transitionId) {
  if (!transitionId) return null;

  return (spec.transitions ?? []).find(
    (transition) => transition.id === transitionId
  ) ?? null;
}

function makeActiveStateRoot({
  change,
  activeStateKey,
  targetScopeId,
}) {
  const activeState = findVisualState(change, activeStateKey);

  if (!activeState?.visual?.root) return null;

  return makeScopeStableRoot({
    replacementRoot: activeState.visual.root,
    targetScopeId,
    activeStateKey,
  });
}

function makeTransitionRoot({
  spec,
  change,
  binding,
  targetScopeId,
  transitionRecord,
}) {
  const fromState = findVisualState(change, transitionRecord.fromStateKey);
  const toState = findVisualState(change, transitionRecord.toStateKey);

  if (!fromState?.visual?.root || !toState?.visual?.root) {
    return null;
  }

  const transitionSpec = findTransitionSpec(spec, transitionRecord.transitionId);
  const mode =
    transitionRecord.mode ??
    transitionSpec?.executionMode ??
    transitionSpec?.mode ??
    'crossfade';

  const progress = clamp01(transitionRecord.progress ?? 0);

  if (mode === 'direct') {
    return makeScopeStableRoot({
      replacementRoot: toState.visual.root,
      targetScopeId,
      activeStateKey: transitionRecord.toStateKey,
    });
  }

  if (mode === 'attribute') {
    const interpolationResult = interpolateVisualStateRoot({
      change,
      fromState,
      toState,
      targetScopeId,
      progress,
      transitionSpec,
    });

    if (interpolationResult?.root) {
      return {
        ...interpolationResult.root,
        meta: {
          ...(interpolationResult.root.meta ?? {}),
          runtimeTransitionMode: 'attribute',
          runtimeInterpolatedCount: interpolationResult.interpolatedCount,
          runtimePairCount: interpolationResult.pairCount,
          runtimeBindingId: binding.id,
        },
      };
    }

    // Attribute interpolation failed; fall back to crossfade.
    return makeCrossfadeRoot({
      fromState,
      toState,
      targetScopeId,
      transitionRecord,
      progress,
      fallbackFrom: 'attribute',
    });
  }

  return makeCrossfadeRoot({
    fromState,
    toState,
    targetScopeId,
    transitionRecord,
    progress,
  });
}

function makeProgressDrivenRoot({
  spec,
  runtimeState,
  change,
  binding,
}) {
  const driver = binding.driver;

  if (!driver || driver.type !== 'progress') return null;

  if (driver.control && driver.control !== 'followProgress') {
    // Step by Progress reserved for next implementation.
    return null;
  }

  const payload = runtimeState.states?.[driver.stateId];

  if (payload == null) return null;

  const stateOrder =
    driver.order ??
    change.stateSet?.states?.map((state) => state.key) ??
    change.visualStates?.map((state) => state.key) ??
    [];

  const segment = resolveProgressSegment({
    payload,
    order: stateOrder,
  });

  if (!segment) return null;

  const fromState = findVisualState(change, segment.fromStateKey);
  const toState = findVisualState(change, segment.toStateKey);

  if (!fromState?.visual?.root || !toState?.visual?.root) {
    return null;
  }

  const targetScopeId =
    binding.targetScopeId ??
    change.targetScopeId ??
    null;

  if (!targetScopeId) return null;

  const transitionSpec = findTransitionSpec(spec, binding.transitionId);

  const mode =
    resolveTransitionExecutionMode({
      transitionSpec,
      hasProgressDriver: true,
    });

  const localProgress = clamp01(segment.localProgress ?? 0);

  if (
    segment.fromStateKey === segment.toStateKey ||
    mode === 'direct'
  ) {
    return {
      root: makeScopeStableRoot({
        replacementRoot: toState.visual.root,
        targetScopeId,
        activeStateKey: segment.toStateKey,
      }),
      fromStateKey: segment.fromStateKey,
      toStateKey: segment.toStateKey,
      localProgress,
      progress: segment.progress,
    };
  }

  if (mode === 'attribute') {
    const interpolationResult = interpolateVisualStateRoot({
      change,
      fromState,
      toState,
      targetScopeId,
      progress: localProgress,
      transitionSpec,
    });

    if (interpolationResult?.root) {
      return {
        root: {
          ...interpolationResult.root,
          meta: {
            ...(interpolationResult.root.meta ?? {}),
            runtimeTransitionMode: 'attribute',
            runtimeProgressDriven: true,
            runtimeInterpolatedCount: interpolationResult.interpolatedCount,
            runtimePairCount: interpolationResult.pairCount,
            runtimeBindingId: binding.id,
          },
        },
        fromStateKey: segment.fromStateKey,
        toStateKey: segment.toStateKey,
        localProgress,
        progress: segment.progress,
      };
    }
  }

  return {
    root: makeCrossfadeRoot({
      fromState,
      toState,
      targetScopeId,
      transitionRecord: {
        fromStateKey: segment.fromStateKey,
        toStateKey: segment.toStateKey,
        mode,
      },
      progress: localProgress,
      fallbackFrom: mode === 'attribute' ? 'attribute' : null,
    }),
    fromStateKey: segment.fromStateKey,
    toStateKey: segment.toStateKey,
    localProgress,
    progress: segment.progress,
  };
}

function resolveTransitionExecutionMode({
  transitionSpec,
  hasProgressDriver,
}) {
  const mode =
    transitionSpec?.executionMode ??
    transitionSpec?.mode ??
    'attribute';

  if (!hasProgressDriver) return mode;

  const control = transitionSpec?.control ?? 'auto';

  if (control === 'playAnimation') {
    // For v0.1 scroll, progress driver still follows progress unless
    // Step by Progress is explicitly implemented later.
    return mode;
  }

  return mode;
}

function makeCrossfadeRoot({
  fromState,
  toState,
  targetScopeId,
  transitionRecord,
  progress,
  fallbackFrom = null,
}) {
  return {
    nodeType: 'collection',
    id: targetScopeId,

    frame: fromState.visual.root.frame ?? null,
    transform: fromState.visual.root.transform ?? null,

    children: [
      setRootOpacity(
        makeScopeStableRoot({
          replacementRoot: fromState.visual.root,
          targetScopeId: `${targetScopeId}__from`,
          activeStateKey: transitionRecord.fromStateKey,
        }),
        1 - progress
      ),
      setRootOpacity(
        makeScopeStableRoot({
          replacementRoot: toState.visual.root,
          targetScopeId: `${targetScopeId}__to`,
          activeStateKey: transitionRecord.toStateKey,
        }),
        progress
      ),
    ],

    meta: {
      runtimeTargetScopeId: targetScopeId,
      runtimeTransitionMode: 'crossfade',
      ...(fallbackFrom ? { fallbackFrom } : {}),
      transition: {
        fromStateKey: transitionRecord.fromStateKey,
        toStateKey: transitionRecord.toStateKey,
        progress,
        mode: transitionRecord.mode,
      },
    },
  };
}