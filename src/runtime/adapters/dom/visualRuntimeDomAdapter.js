// src/runtime/visualRuntimeDomAdapter.js
import { createVisualRuntime } from '../../core/visualRuntimeStore.js';
import { makeRuntimeRefFromDom } from '../../references/runtimeRefs.js';
import { matchesEventSelector } from '../../references/runtimeSelectors.js';
import { applyRuntimeStyleOverrides } from '../../overrides/runtimeOverrides.js';

export function attachVisualRuntimeToDom(rootElement, runtimeSpec) {
  if (!rootElement) {
    throw new Error('[attachVisualRuntimeToDom] rootElement is required.');
  }

  const runtime = createVisualRuntime({
    runtimeSpec,
  });

  attachDomEvents({
    rootElement,
    runtime,
  });

  runtime.subscribe(() => {
    applyDomOverrides({
      rootElement,
      runtime,
    });
  });

  return runtime;
}

function attachDomEvents({
  rootElement,
  runtime,
}) {
  const spec = runtime.getSpec();

  (spec.events ?? []).forEach((eventSpec) => {
    rootElement.addEventListener(
      eventSpec.event,
      (event) => {
        const element = findRuntimeElement(event.target, rootElement);
        if (!element) return;

        const ref = makeRuntimeRefFromDom(element);

        if (!matchesEventSelector({ selector: eventSpec.selector, ref })) {
          return;
        }

        const eventId = eventSpec.emit?.eventId ?? eventSpec.id;

        runtime.dispatch({
          type: 'event.emit',
          eventId,
          ref,
          value: eventSpec.emit?.value === 'event.ref' ? ref : eventSpec.emit?.value,
        });
      },
      true
    );
  });
}

function applyDomOverrides({
  rootElement,
  runtime,
}) {
  const elements = rootElement.querySelectorAll('[data-node-id]');

  elements.forEach((element) => {
    const ref = makeRuntimeRefFromDom(element);
    const baseStyle = readInlineStyle(element);
    const nextStyle = applyRuntimeStyleOverrides(baseStyle, ref, runtime);

    writeInlineStyle(element, nextStyle);
  });
}

function findRuntimeElement(target, rootElement) {
  let current = target;

  while (current && current !== rootElement) {
    if (current.dataset?.nodeId) {
      return current;
    }

    current = current.parentNode;
  }

  return null;
}

function readInlineStyle(element) {
  return {
    opacity: element.style.opacity || undefined,
    fill: element.style.fill
      ? { color: element.style.fill }
      : undefined,
    stroke: element.style.stroke
      ? {
          enabled: element.style.stroke !== 'none',
          color: element.style.stroke,
          width: Number(element.style.strokeWidth || 0),
        }
      : undefined,
  };
}

function writeInlineStyle(element, style = {}) {
  if (style.opacity != null) {
    element.style.opacity = String(style.opacity);
  }

  if (style.fill?.color) {
    element.style.fill = style.fill.color;
  }

  if (style.stroke?.enabled) {
    element.style.stroke = style.stroke.color ?? '#000';
    element.style.strokeWidth = String(style.stroke.width ?? 1);
  }
}