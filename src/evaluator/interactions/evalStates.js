// src/evaluator/interactions/evalStates.js

import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

import { mergeRuntimeSpecs } from '../../runtime/spec/runtimeSpecUtils.js';
import { buildPathPointMatchBundle } from '../../runtime/interpolation/pathPointMatching.js';

export function evalStates(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const eventOutput = getFirstInputValue(ctx, 'event');
  const stateInputs = getInputEntries(ctx, 'states')
    .filter((input) => input?.value?.outputType === 'visual');

  const configuredStates = p.states ?? [];

  const visualStates = resolveVisualStates({
    stateInputs,
    configuredStates,
    warnings,
  });

  const startState = visualStates.find((state) => state.enabled !== false) ?? null;

  if (!startState) {
    return makeEmptyVisualOutput(ctx, [
      'States node needs at least one enabled visual state input.',
    ]);
  }

  const eventSummary = summarizeEvent(eventOutput);
  const switchMode = resolveSwitchMode({
    requested: p.switchMode,
    eventType: eventSummary.eventType,
    stateCount: visualStates.length,
  });

  const matchRule = makeMatchRule(p);
  const matchResult = buildElementMatches({
    states: visualStates,
    matchRule,
    warnings,
  });

  const stateSet = makeStateSet({
    ctx,
    visualStates,
    startState,
  });

  const runtimeSpec = makeStatesRuntimeSpec({
    ctx,
    startState,
    visualStates,
    eventSummary,
    switchMode,
    matchResult,
    stateSet,
  });

  const mergedRuntimeSpec = mergeRuntimeSpecs([
    startState.visual.runtimeSpec,
    startState.visual.meta?.runtimeSpec,
    eventOutputToRuntimeSpec(eventOutput),
    runtimeSpec,
  ]);

  const inputProvenance = [
    ...(eventOutput ? inheritProvenance(eventOutput) : []),
    ...stateInputs.flatMap((input) => inheritProvenance(input.value)),
  ];

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'states',
    outputType: 'visual',
    label: 'States Visual',
    transform: {
      type: 'build-stateful-visual',
      eventType: eventSummary.eventType,
      switchMode,
      stateCount: visualStates.length,
      startStateKey: startState.key,
      match: matchResult.match,
    },
  });

  return {
    ...startState.visual,

    outputType: 'visual',
    version: startState.visual.version ?? '0.1',

    root: startState.visual.root,

    runtimeSpec: mergedRuntimeSpec,

    meta: {
      ...(startState.visual.meta ?? {}),

      sourceNodeId: ctx.nodeId,
      upstreamSourceNodeId: startState.visual.meta?.sourceNodeId ?? null,

      label: 'States Visual',

      runtimeSpec: mergedRuntimeSpec,

      stateSet,
      startStateKey: startState.key,

      trigger: eventSummary,

      switch: {
        mode: switchMode,
        order: visualStates.map((state) => state.key),
        eventIds: eventSummary.eventIds,
        primaryEventId: eventSummary.primaryEventId,
        secondaryEventId: eventSummary.secondaryEventId,
      },

      match: matchResult.match,
      elementMatches: matchResult.elementMatches,
      pairMatches: matchResult.pairMatches,
      matchReport: matchResult.report,

      warnings,

      provenance: [
        ...dedupeProvenance(inputProvenance),
        ownProvenanceEntry,
      ],
    },
  };
}

function getFirstInputValue(ctx, handleId) {
  return ctx.inputs?.byTargetHandle?.[handleId]?.[0]?.value ?? null;
}

function getInputEntries(ctx, handleId) {
  return ctx.inputs?.byTargetHandle?.[handleId] ?? [];
}

function makeEmptyVisualOutput(ctx, warnings) {
  return {
    outputType: 'visual',
    version: '0.1',

    root: {
      nodeType: 'collection',
      id: `${ctx.nodeId}-empty-states`,
      children: [],
      meta: {
        sourceNodeId: ctx.nodeId,
        role: 'empty-states',
      },
    },

    runtimeSpec: null,

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'States Visual',
      warnings,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* States                                                                      */
/* -------------------------------------------------------------------------- */

function resolveVisualStates({
  stateInputs,
  configuredStates,
  warnings,
}) {
  const byEdgeId = new Map(
    stateInputs.map((input, index) => [
      input.edge?.id ?? `${input.from ?? 'source'}-${index}`,
      input,
    ])
  );

  const configured = configuredStates
    .map((config, index) => {
      const edgeId = config.edgeId;
      const input = byEdgeId.get(edgeId);

      if (!input?.value) return null;

      return makeVisualState({
        input,
        config,
        index,
      });
    })
    .filter(Boolean);

  const configuredEdgeIds = new Set(configured.map((state) => state.edgeId));

  const added = stateInputs
    .filter((input, index) => {
      const edgeId = input.edge?.id ?? `${input.from ?? 'source'}-${index}`;
      return !configuredEdgeIds.has(edgeId);
    })
    .map((input, index) =>
      makeVisualState({
        input,
        config: null,
        index: configured.length + index,
      })
    );

  const result = [...configured, ...added]
    .filter((state) => state.enabled !== false);

  if (result.length === 0) {
    warnings.push('States node has no enabled visual state inputs.');
  }

  if (result.length === 1) {
    warnings.push('Only one visual state is connected. State switching needs at least two states.');
  }

  return result;
}

function makeVisualState({
  input,
  config,
  index,
}) {
  const visual = input.value;
  const edge = input.edge ?? {};

  const key =
    config?.stateKey ??
    config?.id ??
    `state-${edge.id ?? input.from ?? index}`;

  const label =
    config?.label ??
    visual.meta?.label ??
    input.from ??
    `State ${index + 1}`;

  const elements = flattenVisualElements(visual.root);
  const availableTagKeys = collectTagKeysFromElements(elements);

  return {
    key,
    label,

    enabled: config?.enabled ?? true,

    sourceNodeId: input.from ?? visual.meta?.sourceNodeId ?? null,
    sourceHandle: edge.sourceHandle ?? null,
    edgeId: edge.id ?? null,

    visual,

    elements,

    summary: {
      elementCount: elements.length,
      availableTagKeys,
      rootId: visual.root?.id ?? null,
      outputRole: visual.meta?.outputRole ?? null,
    },
  };
}

function makeStateSet({
  ctx,
  visualStates,
  startState,
}) {
  return {
    id: `${ctx.nodeId}:state-set`,
    type: 'visualStates',

    states: visualStates.map((state, index) => ({
      key: state.key,
      label: state.label,
      order: index,

      sourceOutputType: 'visual',
      sourceNodeId: state.sourceNodeId,
      sourceHandle: state.sourceHandle,
      edgeId: state.edgeId,

      isStart: state.key === startState.key,

      summary: state.summary,
    })),

    startStateKey: startState.key,
  };
}

function flattenVisualElements(node) {
  if (!node) return [];

  const own =
    node.nodeType === 'element'
      ? [node]
      : [];

  const children = (node.children ?? []).flatMap(flattenVisualElements);

  return [
    ...own,
    ...children,
  ];
}

function collectTagKeysFromElements(elements) {
  const keys = new Set();

  elements.forEach((element) => {
    const tags = getElementTags(element);

    Object.keys(tags ?? {}).forEach((key) => keys.add(key));
  });

  return [...keys];
}

/* -------------------------------------------------------------------------- */
/* Event + switch                                                              */
/* -------------------------------------------------------------------------- */

function summarizeEvent(eventOutput) {
  if (!eventOutput || eventOutput.outputType !== 'eventSignal') {
    return {
      connected: false,
      eventType: 'none',
      eventIds: {},
      primaryEventId: null,
      secondaryEventId: null,
      sourceScopeId: null,
      events: [],
    };
  }

  return {
    connected: true,
    eventType: eventOutput.eventType ?? 'unknown',
    eventIds: eventOutput.eventIds ?? {},
    primaryEventId: eventOutput.primaryEventId ?? null,
    secondaryEventId: eventOutput.secondaryEventId ?? null,
    sourceScopeId: eventOutput.sourceScopeId ?? null,
    selector: eventOutput.selector ?? null,
    events: eventOutput.events ?? [],
  };
}

function resolveSwitchMode({
  requested,
  eventType,
  stateCount,
}) {
  const allowed = getAllowedSwitchModes(eventType);

  if (requested && allowed.includes(requested)) {
    return requested;
  }

  if (eventType === 'click') {
    return stateCount <= 2 ? 'toggle' : 'next';
  }

  if (eventType === 'hover' || eventType === 'press') {
    return 'activeWhileEvent';
  }

  return 'none';
}

function getAllowedSwitchModes(eventType) {
  if (eventType === 'click') {
    return ['toggle', 'next', 'previous', 'setFirst'];
  }

  if (eventType === 'hover' || eventType === 'press') {
    return ['activeWhileEvent'];
  }

  return ['none'];
}

function eventOutputToRuntimeSpec(eventOutput) {
  if (!eventOutput || eventOutput.outputType !== 'eventSignal') {
    return null;
  }

  return {
    version: '0.1',
    events: eventOutput.events ?? [],
    provides: {
      events: Object.values(eventOutput.eventIds ?? {}).filter(Boolean),
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Runtime spec                                                                */
/* -------------------------------------------------------------------------- */

function makeStatesRuntimeSpec({
  ctx,
  startState,
  visualStates,
  eventSummary,
  switchMode,
  matchResult,
  stateSet,
}) {
  const activeStateId = `${ctx.nodeId}:active-state`;
  const changeId = `${ctx.nodeId}:visual-state-change`;
  const bindingId = `${ctx.nodeId}:visual-state-binding`;

  const stateOrder = visualStates.map((state) => state.key);
  const startStateKey = startState.key;

  return {
    version: '0.1',

    states: [
      {
        id: activeStateId,
        type: 'stateKey',
        initial: startStateKey,
      },
    ],

    stateRules: makeStateRules({
      ctx,
      activeStateId,
      eventSummary,
      switchMode,
      stateOrder,
      startStateKey,
    }),

    changes: [
        {
            id: changeId,
            type: 'visualState',
            stateId: activeStateId,

            stateSet,

            visualStates: visualStates.map((state) => ({
            key: state.key,
            label: state.label,
            visual: state.visual,
            summary: state.summary,
            })),

            match: matchResult.match,

            // Legacy / inspection-friendly global view.
            elementMatches: matchResult.elementMatches,

            // New pairwise matching used by transition execution.
            pairMatches: matchResult.pairMatches,

            matchReport: matchResult.report,
        },
    ],

    bindings: [
      {
        id: bindingId,
        type: 'visualStateBinding',
        targetScopeId: startState.visual.root?.id ?? null,
        stateId: activeStateId,
        changeId,
        startStateKey,
      },
    ],

    provides: {
      states: [activeStateId],
      changes: [changeId],
      bindings: [bindingId],
    },

    requires: {
      events: Object.values(eventSummary.eventIds ?? {}).filter(Boolean),
    },
  };
}

function makeStateRules({
  ctx,
  activeStateId,
  eventSummary,
  switchMode,
  stateOrder,
  startStateKey,
}) {
  if (!eventSummary.connected) return [];

  if (eventSummary.eventType === 'click') {
    const eventId = eventSummary.primaryEventId;

    if (!eventId) return [];

    if (switchMode === 'setFirst') {
      return [
        {
          id: `${ctx.nodeId}:set-first`,
          eventId,
          action: {
            type: 'setState',
            stateId: activeStateId,
            value: startStateKey,
          },
        },
      ];
    }

    return [
      {
        id: `${ctx.nodeId}:${switchMode}`,
        eventId,
        action: {
          type: 'cycleState',
          stateId: activeStateId,
          mode: switchMode,
          order: stateOrder,
        },
      },
    ];
  }

  if (eventSummary.eventType === 'hover' || eventSummary.eventType === 'press') {
    const enterId = eventSummary.primaryEventId;
    const leaveId = eventSummary.secondaryEventId;

    const activeStateKey =
      stateOrder.find((key) => key !== startStateKey) ??
      startStateKey;

    return [
      ...(enterId
        ? [
            {
              id: `${ctx.nodeId}:active-while-event-enter`,
              eventId: enterId,
              action: {
                type: 'setState',
                stateId: activeStateId,
                value: activeStateKey,
              },
            },
          ]
        : []),

      ...(leaveId
        ? [
            {
              id: `${ctx.nodeId}:active-while-event-leave`,
              eventId: leaveId,
              action: {
                type: 'setState',
                stateId: activeStateId,
                value: startStateKey,
              },
            },
          ]
        : []),
    ];
  }

  return [];
}

/* -------------------------------------------------------------------------- */
/* Matching                                                                    */
/* -------------------------------------------------------------------------- */

function makeMatchRule(params) {
  const method = params.matchMethod ?? 'auto';

  const tagKeys = parseTagKeyList(params.matchTagKeys ?? 'item');

  return {
    method,
    tagKeys,
    fallback: params.matchFallback ?? 'index',
    pairRules: [],
  };
}

function buildElementMatches({
  states,
  matchRule,
  warnings,
}) {
  const resolvedRule = resolveMatchRule({
    states,
    matchRule,
  });

  const pairMatches = buildPairMatches({
    states,
    matchRule: resolvedRule,
    warnings,
  });

  const elementMatches = buildElementMatchesFromPairs({
    states,
    pairMatches,
  });

  const duplicates = pairMatches.flatMap((pair) => pair.report.duplicates ?? []);
  const missing = pairMatches.flatMap((pair) => pair.report.missing ?? []);
  const fallbackUsed = pairMatches.flatMap((pair) => pair.report.fallbackUsed ?? []);

  duplicates.forEach((duplicate) => {
    warnings.push(
      `Duplicate match key "${duplicate.matchKey}" in "${duplicate.stateLabel}".`
    );
  });

  missing.forEach((item) => {
    warnings.push(
      `Missing match for "${item.matchKey}" in ${item.stateKey}.`
    );
  });

  return {
    match: resolvedRule,

    elementMatches,
    pairMatches,

    report: {
      pairCount: pairMatches.length,

      totalKeys: elementMatches.length,

      matchedAcrossAllStates: elementMatches.filter(
        (item) => item.status === 'matched'
      ).length,

      pairReports: pairMatches.map((pair) => ({
        pairKey: pair.pairKey,
        fromStateKey: pair.fromStateKey,
        toStateKey: pair.toStateKey,
        method: pair.method,
        matchedCount: pair.report.matchedCount,
        missingCount: pair.report.missing.length,
        duplicateCount: pair.report.duplicates.length,
        fallbackUsedCount: pair.report.fallbackUsed.length,
      })),

      missing,
      duplicates,
      fallbackUsed,
    },
  };
}

function buildPairMatches({
  states,
  matchRule,
  warnings,
}) {
  const pairs = [];

  states.forEach((fromState) => {
    states.forEach((toState) => {
      if (fromState.key === toState.key) return;

      const pair = buildPairMatch({
        fromState,
        toState,
        matchRule,
        warnings,
      });

      pairs.push(pair);
    });
  });

  return pairs;
}

function buildPairMatch({
  fromState,
  toState,
  matchRule,
}) {
  const pairKey = `${fromState.key}->${toState.key}`;

  const pairRule =
    matchRule.method === 'auto'
      ? resolveAutoPairRule({
          fromState,
          toState,
          fallback: matchRule.fallback,
        })
      : matchRule;

  const result = buildPairMatchWithRule({
    fromState,
    toState,
    matchRule: pairRule,
  });

  if (
    result.matches.length === 0 &&
    pairRule.method !== 'index' &&
    pairRule.fallback === 'index'
  ) {
    const fallbackResult = buildPairMatchWithRule({
      fromState,
      toState,
      matchRule: {
        method: 'index',
        fallback: 'index',
        tagKeys: [],
        pairRules: [],
        fallbackFrom: pairRule,
      },
    });

    return {
      pairKey,
      fromStateKey: fromState.key,
      toStateKey: toState.key,
      method: {
        method: 'index',
        fallback: 'index',
        fallbackFrom: pairRule,
      },
      matches: fallbackResult.matches,
      report: {
        ...fallbackResult.report,
        fallbackUsed: [
          ...fallbackResult.report.fallbackUsed,
          {
            reason: 'pair-rule-fallback-index',
            fromMethod: pairRule.method,
            fromTagKeys: pairRule.tagKeys ?? [],
          },
        ],
      },
    };
  }

  return {
    pairKey,
    fromStateKey: fromState.key,
    toStateKey: toState.key,
    method: pairRule,
    matches: result.matches,
    report: result.report,
  };
}

function resolveAutoPairRule({
  fromState,
  toState,
  fallback,
}) {
  const candidates = [
    { method: 'tagKeys', tagKeys: ['identity'], fallback },
    { method: 'tagKeys', tagKeys: ['matchId'], fallback },
    { method: 'tagKeys', tagKeys: ['id'], fallback },
    { method: 'tagKeys', tagKeys: ['key'], fallback },

    // Important:
    // Prefer item before item+state/year, because year/state often represents
    // the state dimension itself and should not be used to match across states.
    { method: 'tagKeys', tagKeys: ['item'], fallback },

    { method: 'tagKeys', tagKeys: ['series', 'point'], fallback },
    { method: 'matrixPosition', tagKeys: [], fallback },
    { method: 'index', tagKeys: [], fallback: 'index' },
  ];

  const scored = candidates.map((candidate, index) => {
    const result = buildPairMatchWithRule({
      fromState,
      toState,
      matchRule: candidate,
    });

    return {
      candidate,
      result,
      score: scorePairMatchResult(result, index),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    ...scored[0].candidate,
    resolvedFrom: 'auto',
    autoScore: scored[0].score,
  };
}

function scorePairMatchResult(result, candidateIndex) {
  const matched = result.matches.length;
  const missing = result.report.missing.length;
  const duplicates = result.report.duplicates.length;

  // Earlier candidates win small ties.
  const priorityBonus = Math.max(0, 20 - candidateIndex);

  return (
    matched * 100 +
    priorityBonus -
    missing * 25 -
    duplicates * 20
  );
}

function buildPairMatchWithRule({
  fromState,
  toState,
  matchRule,
}) {
  if (matchRule.method === 'index') {
    return buildIndexPairMatch({
      fromState,
      toState,
      matchRule,
    });
  }

  if (matchRule.method === 'matrixPosition') {
    return buildKeyedPairMatch({
      fromState,
      toState,
      matchRule,
      keyFn: ({ elementRef }) => {
        if (elementRef.rowIndex != null && elementRef.colIndex != null) {
          return `row=${elementRef.rowIndex}|col=${elementRef.colIndex}`;
        }

        if (elementRef.flatIndex != null) {
          return `flat=${elementRef.flatIndex}`;
        }

        return null;
      },
    });
  }

  if (matchRule.method === 'tagKeys') {
    const tagKeys = matchRule.tagKeys ?? [];

    return buildKeyedPairMatch({
      fromState,
      toState,
      matchRule,
      keyFn: ({ element }) => {
        const tags = getElementTags(element);

        const hasAllKeys = tagKeys.every((key) =>
          tags?.[key] !== undefined &&
          tags?.[key] !== null &&
          tags?.[key] !== ''
        );

        if (!hasAllKeys) return null;

        return tagKeys
          .map((key) => `${key}=${String(tags[key])}`)
          .join('|');
      },
    });
  }

  return buildIndexPairMatch({
    fromState,
    toState,
    matchRule,
  });
}

function buildIndexPairMatch({
  fromState,
  toState,
  matchRule,
}) {
  const fromElements = fromState.elements;
  const toElements = toState.elements;

  const count = Math.min(fromElements.length, toElements.length);

  const matches = [];

  for (let index = 0; index < count; index += 1) {
    const fromElement = fromElements[index];
    const toElement = toElements[index];

    const pair = {
        matchKey: `index=${index}`,
        fromElementRef: makeElementStateRef({
            element: fromElement,
            state: fromState,
            localIndex: index,
        }),
        toElementRef: makeElementStateRef({
            element: toElement,
            state: toState,
            localIndex: index,
        }),
    };

    matches.push(
        attachPathPointMatchesToPair({
            pair,
            fromElement,
            toElement,
        })
    );
  }

  const missing = [];

  if (fromElements.length !== toElements.length) {
    missing.push({
      matchKey: 'index-length-mismatch',
      stateKey:
        fromElements.length > toElements.length
          ? toState.key
          : fromState.key,
      reason: `length mismatch ${fromElements.length} vs ${toElements.length}`,
    });
  }

  return {
    matches,
    report: {
      matchedCount: matches.length,
      missing,
      duplicates: [],
      fallbackUsed:
        matchRule.fallbackFrom
          ? [
              {
                reason: 'index-fallback',
                fromMethod: matchRule.fallbackFrom.method,
                fromTagKeys: matchRule.fallbackFrom.tagKeys ?? [],
              },
            ]
          : [],
    },
  };
}

function buildKeyedPairMatch({
  fromState,
  toState,
  matchRule,
  keyFn,
}) {
  const fromGroups = groupElementsByMatchKey({
    state: fromState,
    keyFn,
  });

  const toGroups = groupElementsByMatchKey({
    state: toState,
    keyFn,
  });

  const allKeys = new Set([
    ...fromGroups.keys(),
    ...toGroups.keys(),
  ]);

  const matches = [];
  const missing = [];
  const duplicates = [];
  const fallbackUsed = [];

  allKeys.forEach((matchKey) => {
    const fromItems = fromGroups.get(matchKey) ?? [];
    const toItems = toGroups.get(matchKey) ?? [];

    if (fromItems.length === 0) {
      missing.push({
        matchKey,
        stateKey: fromState.key,
        reason: 'missing-from-state',
      });
      return;
    }

    if (toItems.length === 0) {
      missing.push({
        matchKey,
        stateKey: toState.key,
        reason: 'missing-to-state',
      });
      return;
    }

    if (fromItems.length === 1 && toItems.length === 1) {
    const pair = {
        matchKey,
        fromElementRef: fromItems[0].elementRef,
        toElementRef: toItems[0].elementRef,
    };

    matches.push(
        attachPathPointMatchesToPair({
        pair,
        fromElement: fromItems[0].element,
        toElement: toItems[0].element,
        })
    );

    return;
    }

    duplicates.push({
      matchKey,
      stateKey: fromState.key,
      stateLabel: fromState.label,
      count: fromItems.length,
    });

    duplicates.push({
      matchKey,
      stateKey: toState.key,
      stateLabel: toState.label,
      count: toItems.length,
    });

    if (matchRule.fallback === 'occurrence') {
      const count = Math.min(fromItems.length, toItems.length);

      for (let index = 0; index < count; index += 1) {
        const pair = {
        matchKey: `${matchKey}#${index}`,
        fromElementRef: fromItems[index].elementRef,
        toElementRef: toItems[index].elementRef,
        };

        matches.push(
        attachPathPointMatchesToPair({
            pair,
            fromElement: fromItems[index].element,
            toElement: toItems[index].element,
        })
        );
      }

      fallbackUsed.push({
        matchKey,
        reason: 'duplicate-occurrence',
      });

      return;
    }

    if (matchRule.fallback === 'index') {
      const count = Math.min(fromItems.length, toItems.length);

      for (let index = 0; index < count; index += 1) {
        const pair = {
        matchKey: `${matchKey}#${index}`,
        fromElementRef: fromItems[index].elementRef,
        toElementRef: toItems[index].elementRef,
        };

        matches.push(
        attachPathPointMatchesToPair({
            pair,
            fromElement: fromItems[index].element,
            toElement: toItems[index].element,
        })
        );
      }

      fallbackUsed.push({
        matchKey,
        reason: 'duplicate-index-within-key',
      });
    }
  });

  return {
    matches,
    report: {
      matchedCount: matches.length,
      missing,
      duplicates,
      fallbackUsed,
    },
  };
}

function groupElementsByMatchKey({
  state,
  keyFn,
}) {
  const groups = new Map();

  state.elements.forEach((element, localIndex) => {
    const elementRef = makeElementStateRef({
      element,
      state,
      localIndex,
    });

    const matchKey = keyFn({
      element,
      elementRef,
      localIndex,
    });

    if (!matchKey) return;

    if (!groups.has(matchKey)) {
      groups.set(matchKey, []);
    }

    groups.get(matchKey).push({
      element,
      elementRef,
      localIndex,
    });
  });

  return groups;
}

function buildElementMatchesFromPairs({
  states,
  pairMatches,
}) {
  const map = new Map();

  pairMatches.forEach((pair) => {
    pair.matches.forEach((match) => {
      const existing =
        map.get(match.matchKey) ??
        {
          matchKey: match.matchKey,
          status: 'matched',
          missingStates: [],
          elementsByState: {},
        };

      existing.elementsByState[pair.fromStateKey] = match.fromElementRef;
      existing.elementsByState[pair.toStateKey] = match.toElementRef;

      map.set(match.matchKey, existing);
    });
  });

  return [...map.values()].map((item) => {
    const missingStates = states
      .filter((state) => !item.elementsByState[state.key])
      .map((state) => state.key);

    return {
      ...item,
      status: missingStates.length === 0 ? 'matched' : 'pairwise',
      missingStates,
    };
  });
}

function resolveMatchRule({
  states,
  matchRule,
}) {
  if (matchRule.method !== 'auto') {
    return matchRule;
  }

  const allElements = states.flatMap((state) => state.elements);
  const availableTagKeys = new Set();

  allElements.forEach((element) => {
    const tags = getElementTags(element);
    Object.keys(tags ?? {}).forEach((key) => availableTagKeys.add(key));
  });

  const hasEveryTag = (...keys) =>
    keys.every((key) => availableTagKeys.has(key));

  if (hasEveryTag('identity')) {
    return {
      ...matchRule,
      method: 'tagKeys',
      tagKeys: ['identity'],
      resolvedFrom: 'auto',
    };
  }

  if (hasEveryTag('id')) {
    return {
      ...matchRule,
      method: 'tagKeys',
      tagKeys: ['id'],
      resolvedFrom: 'auto',
    };
  }

  if (hasEveryTag('key')) {
    return {
      ...matchRule,
      method: 'tagKeys',
      tagKeys: ['key'],
      resolvedFrom: 'auto',
    };
  }

  if (hasEveryTag('item')) {
    return {
        ...matchRule,
        method: 'tagKeys',
        tagKeys: ['item'],
        resolvedFrom: 'auto',
    };
    }

    if (hasEveryTag('series', 'point')) {
    return {
        ...matchRule,
        method: 'tagKeys',
        tagKeys: ['series', 'point'],
        resolvedFrom: 'auto',
    };
    }

  if (hasEveryTag('series', 'point')) {
    return {
      ...matchRule,
      method: 'tagKeys',
      tagKeys: ['series', 'point'],
      resolvedFrom: 'auto',
    };
  }

  if (hasEveryTag('item')) {
    return {
      ...matchRule,
      method: 'tagKeys',
      tagKeys: ['item'],
      resolvedFrom: 'auto',
    };
  }

  if (states.some((state) =>
    state.elements.some((element) =>
      element.dataRef?.rowIndex != null &&
      element.dataRef?.colIndex != null
    )
  )) {
    return {
      ...matchRule,
      method: 'matrixPosition',
      resolvedFrom: 'auto',
    };
  }

  return {
    ...matchRule,
    method: 'index',
    resolvedFrom: 'auto',
  };
}

function buildMatchMapForState({
  state,
  matchRule,
}) {
  const entries = [];
  const byBaseKey = new Map();
  const duplicates = [];
  const fallbackUsed = [];

  state.elements.forEach((element, localIndex) => {
    const elementRef = makeElementStateRef({
      element,
      state,
      localIndex,
    });

    const baseKey = makeBaseMatchKey({
    element,
    elementRef,
    matchRule,
    localIndex,
    });

    if (!baseKey) {
    fallbackUsed.push({
        stateKey: state.key,
        elementId: element.id,
        from: null,
        to: null,
        reason: 'missing-match-key',
    });

    return;
    }

    const occurrence = byBaseKey.get(baseKey) ?? 0;
    byBaseKey.set(baseKey, occurrence + 1);

    let matchKey = baseKey;

    if (occurrence > 0) {
      duplicates.push({
        stateKey: state.key,
        stateLabel: state.label,
        matchKey: baseKey,
        occurrence,
      });

      if (matchRule.fallback === 'occurrence') {
        matchKey = `${baseKey}#${occurrence}`;
        fallbackUsed.push({
          stateKey: state.key,
          elementId: element.id,
          from: baseKey,
          to: matchKey,
          reason: 'duplicate-occurrence',
        });
      } else if (matchRule.fallback === 'index') {
        const index = elementRef.flatIndex ?? elementRef.index ?? localIndex;
        matchKey = `${baseKey}|index=${index}`;
        fallbackUsed.push({
          stateKey: state.key,
          elementId: element.id,
          from: baseKey,
          to: matchKey,
          reason: 'duplicate-index',
        });
      } else {
        matchKey = null;
      }
    }

    if (!matchKey) return;

    entries.push({
      matchKey,
      elementRef,
    });
  });

  const byKey = new Map();

  entries.forEach((entry) => {
    byKey.set(entry.matchKey, entry);
  });

  return {
    entries,
    byKey,
    duplicates,
    fallbackUsed,
  };
}

function makeBaseMatchKey({
  element,
  elementRef,
  matchRule,
  localIndex,
}) {
  if (matchRule.method === 'tagKeys') {
    const tags = getElementTags(element);
    const keys = matchRule.tagKeys ?? [];

    const hasAllKeys = keys.every((key) =>
        tags?.[key] !== undefined &&
        tags?.[key] !== null &&
        tags?.[key] !== ''
    );

    if (!hasAllKeys) {
        return null;
    }

    return keys
        .map((key) => `${key}=${String(tags[key])}`)
        .join('|');
    }

  if (matchRule.method === 'matrixPosition') {
    const row = elementRef.rowIndex;
    const col = elementRef.colIndex;

    if (row != null && col != null) {
      return `row=${row}|col=${col}`;
    }

    if (elementRef.flatIndex != null) {
      return `flat=${elementRef.flatIndex}`;
    }
  }

  return `index=${elementRef.flatIndex ?? elementRef.index ?? localIndex}`;
}

function attachPathPointMatchesToPair({
  pair,
  fromElement,
  toElement,
}) {
  const pointMatchBundle = buildPathPointMatchBundle({
    fromElement,
    toElement,
    rule: {
      method: 'auto',
      fallback: 'index',
    },
  });

  if (!pointMatchBundle) {
    return pair;
  }

  return {
    ...pair,

    pointMatches: pointMatchBundle.matches,
    pointMatchRule: pointMatchBundle.rule,
    pointMatchReport: pointMatchBundle.report,
  };
}

function makeElementStateRef({
  element,
  state,
  localIndex,
}) {
  const dataRef = element.dataRef ?? {};
  const meta = element.meta ?? {};

  return {
    elementId: element.id,
    stateKey: state.key,
    stateLabel: state.label,

    nodeType: element.nodeType ?? null,
    elementType: element.elementType ?? null,
    role: element.role ?? null,

    index: dataRef.index ?? meta.elementIndex ?? localIndex,
    flatIndex: dataRef.flatIndex ?? meta.flatIndex ?? null,
    rowIndex: dataRef.rowIndex ?? meta.rowIndex ?? null,
    colIndex: dataRef.colIndex ?? meta.colIndex ?? null,

    tags: getElementTags(element),

    dataRef,
    meta,
  };
}

function getElementTags(element) {
  const dataRef = element.dataRef ?? {};
  const meta = element.meta ?? {};

  const lineageTags = collectParameterLineageTags(
    dataRef.parameterLineage ??
    meta.parameterLineage
  );

  return mergeTagObjects(
    meta.matrixItem?.tags,
    dataRef.matrixItem?.tags,
    lineageTags,
    meta.tags,
    dataRef.tags
  );
}

function collectParameterLineageTags(parameterLineage) {
  if (!parameterLineage || typeof parameterLineage !== 'object') {
    return null;
  }

  const merged = {};

  Object.values(parameterLineage).forEach((lineage) => {
    mergeInto(merged, lineage?.scaleItem?.tags);
    mergeInto(merged, lineage?.mappedItem?.tags);
    mergeInto(merged, lineage?.matrixItem?.tags);
    mergeInto(merged, lineage?.tags);
  });

  return Object.keys(merged).length > 0 ? merged : null;
}

function mergeTagObjects(...tagObjects) {
  const merged = {};

  tagObjects.forEach((tags) => {
    mergeInto(merged, tags);
  });

  return Object.keys(merged).length > 0 ? merged : null;
}

function mergeInto(target, tags) {
  if (!tags || typeof tags !== 'object') return;

  Object.entries(tags).forEach(([key, value]) => {
    if (key == null || key === '') return;
    if (value === undefined || value === null || value === '') return;

    target[key] = value;
  });
}

function parseTagKeyList(value) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

/* -------------------------------------------------------------------------- */
/* Provenance                                                                  */
/* -------------------------------------------------------------------------- */

function dedupeProvenance(entries) {
  const result = [];
  const seen = new Set();

  entries.forEach((entry) => {
    const key = `${entry.nodeId ?? ''}-${entry.role ?? ''}-${entry.label ?? ''}`;

    if (seen.has(key)) return;

    seen.add(key);
    result.push(entry);
  });

  return result;
}