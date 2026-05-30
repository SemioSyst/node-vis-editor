// src/runtime/runtimeSpecUtils.js

export const EMPTY_RUNTIME_SPEC = {
  version: '0.1',

  states: [],
  events: [],
  stateRules: [],

  // Reserved for future:
  // visual-state changes, parameter-state changes, motion path changes.
  changes: [],

  // Reserved for future:
  // easing / duration / interpolation settings.
  transitions: [],

  // Reserved for future:
  // bind change/transition to target visual scope.
  bindings: [],

  // Current first useful runtime layer.
  effects: [],
  overrides: [],
  layoutRules: [],

  provides: {},
  requires: {},
};

export function mergeRuntimeSpecs(specs = []) {
  const validSpecs = specs.filter(Boolean);

  if (validSpecs.length === 0) return null;

  return {
    version: '0.1',

    states: mergeById(validSpecs.flatMap((spec) => spec.states ?? [])),
    events: mergeById(validSpecs.flatMap((spec) => spec.events ?? [])),
    stateRules: mergeById(validSpecs.flatMap((spec) => spec.stateRules ?? [])),

    changes: mergeById(validSpecs.flatMap((spec) => spec.changes ?? [])),
    transitions: mergeById(validSpecs.flatMap((spec) => spec.transitions ?? [])),
    bindings: mergeById(validSpecs.flatMap((spec) => spec.bindings ?? [])),
    effects: mergeById(validSpecs.flatMap((spec) => spec.effects ?? [])),
    overrides: mergeById(validSpecs.flatMap((spec) => spec.overrides ?? [])),
    layoutRules: mergeById(validSpecs.flatMap((spec) => spec.layoutRules ?? [])),

    // Temporary compatibility with the current hover shortcut.
    hover: validSpecs.reduce((acc, spec) => {
      if (!spec.hover) return acc;

      return {
        ...(acc ?? {}),
        ...spec.hover,
        effect: {
          ...(acc?.effect ?? {}),
          ...(spec.hover.effect ?? {}),
        },
      };
    }, null),

    provides: mergeDependencyObjects(validSpecs.map((spec) => spec.provides)),
    requires: mergeDependencyObjects(validSpecs.map((spec) => spec.requires)),
  };
}

function mergeById(items) {
  const map = new Map();

  items.forEach((item, index) => {
    if (!item) return;

    const id = item.id ?? `anonymous-${index}`;

    map.set(id, {
      ...map.get(id),
      ...item,
      id,
    });
  });

  return [...map.values()];
}

function mergeDependencyObjects(objects = []) {
  const result = {};

  objects.filter(Boolean).forEach((object) => {
    Object.entries(object).forEach(([key, values]) => {
      const existing = Array.isArray(result[key]) ? result[key] : [];
      const next = Array.isArray(values) ? values : [values];

      result[key] = [...new Set([...existing, ...next].filter(Boolean))];
    });
  });

  return result;
}