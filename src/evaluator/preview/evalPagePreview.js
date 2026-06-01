// src/evaluator/preview/evalPagePreview.js

export function evalPagePreview(ctx) {
  const input = ctx.inputs?.byTargetHandle?.visual?.[0]?.value ?? null;

  return {
    outputType: 'inspection',
    version: '0.1',

    title: 'Page Preview',
    sections: [
      {
        title: 'Input',
        rows: [
          {
            label: 'Connected',
            value: input ? 'Yes' : 'No',
          },
          {
            label: 'Input Type',
            value: input?.outputType ?? 'none',
          },
        ],
      },
    ],

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Page Preview',
    },
  };
}