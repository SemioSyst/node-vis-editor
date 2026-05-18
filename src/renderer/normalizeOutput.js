// src/renderer/normalizeOutput.js

const LEGACY_SVG_KINDS = new Set([
  'circle',
  'rect',
  'line',
  'polyline',
  'polygon',
  'path',
  'text',
  'group',
]);

export function normalizeOutput(output) {
  if (!output) return null;

  // New Output Spec v0.1
  if (output.outputType === 'visual') {
    return output;
  }

  // Legacy raw SVG spec
  if (output.kind && LEGACY_SVG_KINDS.has(output.kind)) {
    return {
      outputType: 'visual',
      version: '0.1',
      root: {
        nodeType: 'element',
        id: output.id ?? 'legacy-root',
        elementType: output.kind === 'text' ? 'text' : 'graphic',
        frame: {
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          anchor: 'top-left',
        },
        transform: {
          x: 0,
          y: 0,
          rotate: 0,
          scaleX: 1,
          scaleY: 1,
          origin: 'center',
        },
        content: {
          contentType: 'legacySvg',
          spec: output,
        },
        style: {},
        interaction: null,
        children: [],
        meta: {
          legacy: true,
        },
      },
      meta: {
        legacy: true,
      },
    };
  }

  return {
    outputType: 'unsupported',
    version: '0.1',
    raw: output,
    meta: {
      warnings: ['Unsupported output format'],
    },
  };
}