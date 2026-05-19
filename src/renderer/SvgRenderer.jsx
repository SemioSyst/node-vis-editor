// src/renderer/SvgRenderer.jsx

import { renderVisualNode } from './renderVisualNode.jsx';

export default function SvgRenderer({ spec, renderFrame }) {
  if (!spec || !renderFrame) return null;

  return (
    <svg
      className={`output-renderer-svg output-renderer-svg--${renderFrame.mode}`}
      width={renderFrame.svgWidth}
      height={renderFrame.svgHeight}
      viewBox={renderFrame.viewBox}
      preserveAspectRatio={renderFrame.preserveAspectRatio}
    >
      {renderVisualNode(spec.root)}
    </svg>
  );
}