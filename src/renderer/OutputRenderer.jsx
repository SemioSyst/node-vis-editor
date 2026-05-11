// src/renderer/OutputRenderer.jsx
import SvgRenderer from './SvgRenderer.jsx';
import './OutputRenderer.css';

export default function OutputRenderer({ output, emptyText = 'No output' }) {
  if (!output) {
    return (
      <div className="output-renderer-empty">
        {emptyText}
      </div>
    );
  }

  // Current demo:
  // evaluator outputs are SVG specs directly:
  // { kind: 'circle' | 'rect' | 'line' | 'group', ... }
  //
  // Later we can support:
  // { renderer: 'svg', root: ... }
  // { renderer: 'html', ... }
  // { renderer: 'interactive', ... }

  return (
    <div className="output-renderer-root">
      <SvgRenderer spec={output} />
    </div>
  );
}