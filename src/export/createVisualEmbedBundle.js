// src/export/createVisualEmbedBundle.js

export const VISUAL_EMBED_BUNDLE_VERSION = '0.1';

export function createVisualEmbedBundle({
  name,
  description = '',
  visual,
  renderOptions = {},
  source = {},
}) {
  if (!visual || visual.outputType !== 'visual') {
    throw new Error('createVisualEmbedBundle expects a visual output.');
  }

  const viewportWidth = Math.max(
    1,
    Number(renderOptions.viewportWidth ?? 900)
  );

  const viewportHeight = Math.max(
    1,
    Number(renderOptions.viewportHeight ?? 520)
  );

  const runtimeSpec =
    visual.runtimeSpec ??
    visual.meta?.runtimeSpec ??
    null;

  return cleanJson({
    type: 'node-vis-embed',
    version: VISUAL_EMBED_BUNDLE_VERSION,

    name: String(name || 'Untitled visual'),
    description: String(description || ''),

    exportedAt: new Date().toISOString(),

    source: {
      editor: 'node-vis-editor',
      sourceNodeId: source.sourceNodeId ?? null,
      sourceLabel: source.sourceLabel ?? null,
    },

    visual: {
      outputType: 'visual',
      version: visual.version ?? '0.1',

      root: visual.root,

      runtimeSpec,

      meta: {
        ...(visual.meta ?? {}),
        runtimeSpec,
      },
    },

    renderOptions: {
      mode: renderOptions.mode ?? 'fit',
      viewportWidth,
      viewportHeight,
      background: renderOptions.background ?? '#ffffff',
      overflow: renderOptions.overflow ?? 'visible',
    },

    embed: {
      preferredWidth: viewportWidth,
      preferredHeight: viewportHeight,
      responsive: renderOptions.responsive ?? true,
    },
  });
}

function cleanJson(value) {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (item === undefined) return null;
      return item;
    })
  );
}