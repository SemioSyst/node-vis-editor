// src/renderer/procedural/ProceduralRenderer.jsx

import D3AxisSystemRenderer from './D3AxisSystemRenderer.jsx';

const PROCEDURAL_RENDERERS = {
  'd3-axis-system': D3AxisSystemRenderer,
};

export default function ProceduralRenderer({
  node,
  renderFrame,
  renderOptions,
  ctx,
}) {
  const Renderer = PROCEDURAL_RENDERERS[node.rendererType];

  if (!Renderer) {
    console.warn('[ProceduralRenderer] Unsupported rendererType:', node.rendererType, node);
    return null;
  }

  return (
    <Renderer
      node={node}
      renderFrame={renderFrame}
      renderOptions={renderOptions}
      ctx={ctx}
    />
  );
}