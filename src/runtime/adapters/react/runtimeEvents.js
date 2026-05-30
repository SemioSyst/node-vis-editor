// src/runtime/runtimeEvents.js

import {
  matchesEventSelector,
  matchesRuntimeScope,
} from '../../references/runtimeSelectors.js';

const EVENT_PROP_MAP = {
  pointerenter: 'onPointerEnter',
  pointermove: 'onPointerMove',
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

      const refWithPointer = {
        ...ref,
        pointer: makePointerInfo(evt),
      };

      runtime.dispatch({
        type: 'event.emit',
        eventId,
        ref: refWithPointer,
        value: resolveEventValue(eventSpec.emit?.value, {
          ref: refWithPointer,
          evt,
        }),
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

function makePointerInfo(evt) {
  const nativeEvent = evt?.nativeEvent ?? evt;

  const pointer = {
    clientX: nativeEvent?.clientX ?? null,
    clientY: nativeEvent?.clientY ?? null,
    pageX: nativeEvent?.pageX ?? null,
    pageY: nativeEvent?.pageY ?? null,
    screenX: nativeEvent?.screenX ?? null,
    screenY: nativeEvent?.screenY ?? null,

    svgX: null,
    svgY: null,
  };

  const svg = evt?.currentTarget?.ownerSVGElement;

  if (
    svg &&
    typeof svg.createSVGPoint === 'function' &&
    typeof svg.getScreenCTM === 'function' &&
    pointer.clientX != null &&
    pointer.clientY != null
  ) {
    const point = svg.createSVGPoint();
    point.x = pointer.clientX;
    point.y = pointer.clientY;

    const matrix = svg.getScreenCTM();

    if (matrix) {
      const transformed = point.matrixTransform(matrix.inverse());
      pointer.svgX = transformed.x;
      pointer.svgY = transformed.y;
    }
  }

  return pointer;
}