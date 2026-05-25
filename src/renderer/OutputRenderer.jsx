// src/renderer/OutputRenderer.jsx

import SvgRenderer from './SvgRenderer.jsx';
import InspectionRenderer from './InspectionRenderer.jsx';
import { normalizeOutput } from './normalizeOutput.js';
import { createRenderFrame } from './viewport/createRenderFrame.js';
import './OutputRenderer.css';

export default function OutputRenderer({
  output,
  emptyText = 'No output',
  renderOptions = {},
}) {
  const normalized = normalizeOutput(output);

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

  const renderFrame = createRenderFrame(normalized, renderOptions);

  return (
    <div
      className={`output-renderer-root output-renderer-root--${renderFrame.mode}`}
      style={{ overflow: renderFrame.overflow }}
    >
      {renderFrame.mode === 'actual' ? (
        <div className="output-renderer-actual-inner">
          <SvgRenderer
            spec={normalized}
            renderFrame={renderFrame}
            renderOptions={renderOptions}
          />
        </div>
      ) : (
        <SvgRenderer
          spec={normalized}
          renderFrame={renderFrame}
          renderOptions={renderOptions}
        />
      )}
    </div>
  );
}