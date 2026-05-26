// src/runtime/runtimeEvents.js

import {
  matchesEventSelector,
  matchesRuntimeScope,
} from '../../references/runtimeSelectors.js';

const EVENT_PROP_MAP = {
  pointerenter: 'onPointerEnter',
  pointerleave: 'onPointerLeave',
  click: 'onClick',
  pointerdown: 'onPointerDown',
  pointerup: 'onPointerUp',
};

export function buildReactRuntimeEventProps(ref, runtime) {
  if (!runtime || !ref?.elementId) return {};

  const spec = runtime.getSpec();
  const events = spec.events ?? [];

  const props = {};
  const style = {};

  events.forEach((eventSpec) => {
    if (!matchesRuntimeScope(ref, eventSpec.sourceScopeId)) {
      return;
    }

    if (!matchesEventSelector({ selector: eventSpec.selector, ref })) {
      return;
    }

    const propName = EVENT_PROP_MAP[eventSpec.event];

    if (!propName) return;

    const previousHandler = props[propName];

    props[propName] = (evt) => {
      previousHandler?.(evt);

      const eventId =
        eventSpec.emit?.eventId ??
        eventSpec.id;

      runtime.dispatch({
        type: 'event.emit',
        eventId,
        ref,
        value: resolveEventValue(eventSpec.emit?.value, { ref, evt }),
      });
    };

    if (eventSpec.cursor) {
      style.cursor = eventSpec.cursor;
    }
  });

  if (Object.keys(style).length > 0) {
    props.style = {
      ...(props.style ?? {}),
      ...style,
    };
  }

  return props;
}

function resolveEventValue(value, context) {
  if (value === 'event.ref') return context.ref;
  if (value === 'event.target') return context.evt?.target;
  return value;
}