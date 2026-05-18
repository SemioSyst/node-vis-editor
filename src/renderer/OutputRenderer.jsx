// src/renderer/OutputRenderer.jsx

import SvgRenderer from './SvgRenderer.jsx';
import { normalizeOutput } from './normalizeOutput.js';
import './OutputRenderer.css';

export default function OutputRenderer({ output, emptyText = 'No output' }) {
  const normalized = normalizeOutput(output);

  if (!normalized) {
    return (
      <div className="output-renderer-empty">
        {emptyText}
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

  return (
    <div className="output-renderer-root">
      <SvgRenderer spec={normalized} />
    </div>
  );
}