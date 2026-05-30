// src/runtime/runtimeSpecCompiler.js

import {
  EMPTY_RUNTIME_SPEC,
  mergeRuntimeSpecs,
} from './runtimeSpecUtils.js';

export function compileRuntimeSpec(runtimeSpec = EMPTY_RUNTIME_SPEC) {
  const merged = mergeRuntimeSpecs([runtimeSpec]) ?? EMPTY_RUNTIME_SPEC;

  const legacyHoverSpec = merged.hover?.enabled
    ? compileLegacyHover(merged.hover)
    : null;

  const compiled = mergeRuntimeSpecs([
    {
      ...merged,
      hover: null,
    },
    legacyHoverSpec,
  ]) ?? EMPTY_RUNTIME_SPEC;

  return {
    ...compiled,
    states: normalizeStates(compiled.states),
    events: normalizeEvents(compiled.events),
    stateRules: normalizeStateRules(compiled.stateRules),
    effects: normalizeEffects(compiled.effects),
    overrides: normalizeOverrides(compiled.overrides),
    layoutRules: normalizeLayoutRules(compiled.layoutRules),
  };
}

function compileLegacyHover(hover) {
  return {
    version: '0.1',

    states: [
      {
        id: 'hovered',
        type: 'elementRef',
        initial: null,
      },
    ],

    events: [
      {
        id: 'legacy-hover-enter',
        event: 'pointerenter',
        selector: { type: 'all' },
        emit: {
          eventId: 'legacy-hover-enter',
          value: 'event.ref',
        },
      },
      {
        id: 'legacy-hover-leave',
        event: 'pointerleave',
        selector: { type: 'all' },
        emit: {
          eventId: 'legacy-hover-leave',
          value: 'event.ref',
        },
      },
    ],

    stateRules: [
      {
        id: 'legacy-hover-set',
        eventId: 'legacy-hover-enter',
        action: {
          type: 'setState',
          stateId: 'hovered',
          value: 'event.ref',
        },
      },
      {
        id: 'legacy-hover-clear',
        eventId: 'legacy-hover-leave',
        action: {
          type: 'clearState',
          stateId: 'hovered',
        },
      },
    ],

    overrides: [
      {
        id: 'legacy-hover-override',
        stateId: 'hovered',
        when: { exists: true },
        selector: {
          type: hover.match ?? 'self',
          tagKey: hover.tagKey ?? null,
        },
        patch: {
          style: {
            stroke: {
              enabled: true,
              color: hover.effect?.stroke ?? '#ffffff',
              width: hover.effect?.strokeWidth ?? 2,
            },
            ...(hover.effect?.opacity != null
              ? { opacity: hover.effect.opacity }
              : {}),
          },
        },
        priority: 20,
      },
    ],

    provides: {
      states: ['hovered'],
      events: ['legacy-hover-enter', 'legacy-hover-leave'],
    },
  };
}

function normalizeStates(states = []) {
  return states.map((state) => ({
    type: 'value',
    initial: null,
    ...state,
  }));
}

function normalizeEvents(events = []) {
  return events.map((event) => ({
    selector: { type: 'all' },
    ...event,
  }));
}

function normalizeStateRules(rules = []) {
  return rules.map((rule) => ({
    ...rule,
  }));
}

function normalizeEffects(effects = []) {
  return effects.map((effect) => ({
    priority: 50,
    ...effect,
  }));
}

function normalizeOverrides(overrides = []) {
  return overrides.map((override) => ({
    priority: 0,
    when: { exists: true },
    selector: { type: 'self' },
    patch: {},
    ...override,
  }));
}

function normalizeLayoutRules(layoutRules = []) {
  return layoutRules.map((rule) => ({
    mode: 'repeat',
    placement: 'top',
    offset: { x: 0, y: 0 },
    match: { method: 'repeatTemplate' },
    ...rule,
  }));
}