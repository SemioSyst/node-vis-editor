// src/renderer/OutputRenderer.jsx
import { useMemo } from 'react';

import SvgRenderer from './SvgRenderer.jsx';
import InspectionRenderer from './InspectionRenderer.jsx';
import { normalizeOutput } from './normalizeOutput.js';
import { createRenderFrame } from './viewport/createRenderFrame.js';
import { createVisualRuntime } from '../runtime/core/visualRuntimeStore.js';
import { useVisualRuntimeSnapshot } from '../runtime/adapters/react/visualRuntimeReact.js';
import { applyVisualStateRuntimeToOutput } from '../runtime/visualStates/applyVisualStateRuntime.js';
import './OutputRenderer.css';

export default function OutputRenderer({
  output,
  emptyText = 'No output',
  renderOptions = {},
}) {
  const normalized = normalizeOutput(output);

  const runtimeSpec =
    normalized?.outputType === 'visual'
      ? (
          renderOptions.runtimeSpec ??
          normalized.runtimeSpec ??
          normalized.meta?.runtimeSpec ??
          null
        )
      : null;

  const runtime = useMemo(() => {
    if (!runtimeSpec) return null;

    return createVisualRuntime({
      runtimeSpec,
    });
  }, [runtimeSpec]);

  // Subscribe to runtime state.
  // The snapshot itself is only used to force rerender when runtime state changes.
  useVisualRuntimeSnapshot(runtime);

  if (!normalized) {
    return (
      <div className="output-renderer-empty">
        {emptyText}
      </div>
    );
  }

  if (normalized.outputType === 'inspection') {
    return (
      <div className="output-renderer-root output-renderer-root--inspection">
        <InspectionRenderer
          spec={normalized}
          renderOptions={renderOptions}
        />
      </div>
    );
  }

  if (normalized.outputType !== 'visual') {
    return (
      <div className="output-renderer-empty">
        Unsupported output type: {normalized.outputType ?? 'unknown'}
      </div>
    );
  }

  const renderedOutput = applyVisualStateRuntimeToOutput(
    normalized,
    runtime
  );

  const renderFrame = createRenderFrame(renderedOutput, renderOptions);

  return (
    <div
      className={`output-renderer-root output-renderer-root--${renderFrame.mode}`}
      style={{ overflow: renderFrame.overflow }}
    >
      {renderFrame.mode === 'actual' ? (
        <div className="output-renderer-actual-inner">
          <SvgRenderer
            spec={renderedOutput}
            renderFrame={renderFrame}
            renderOptions={renderOptions}
            runtime={runtime}
          />
        </div>
      ) : (
        <SvgRenderer
          spec={renderedOutput}
          renderFrame={renderFrame}
          renderOptions={renderOptions}
          runtime={runtime}
        />
      )}
    </div>
  );
}