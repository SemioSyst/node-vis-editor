// src/renderer/SvgRenderer.jsx

import { renderVisualNode } from './renderVisualNode.jsx';

export default function SvgRenderer({ spec }) {
  if (!spec) {
    return null;
  }

  const viewBox =
    spec.viewBox ??
    spec.root?.viewBox ??
    '0 0 100 100';

  return (
    <svg
      className="output-renderer-svg"
      width="100%"
      height="100%"
      viewBox={viewBox}
      preserveAspectRatio="xMidYMid meet"
    >
      {renderVisualNode(spec.root)}
    </svg>
  );
}