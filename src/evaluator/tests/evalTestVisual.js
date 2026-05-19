export function evalTestVisual(ctx) {
  return {
    outputType: 'visual',
    version: '0.1',

    root: {
      nodeType: 'collection',
      id: `${ctx.nodeId}-test-collection`,

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

      interaction: {
        hitArea: 'bounds',
        events: {
          click: {
            action: 'log',
            payload: {
              message: 'Test visual group clicked',
            },
          },
          hover: {
            action: 'log',
            cursor: 'pointer',
            payload: {
              message: 'Test visual group hovered',
            },
          },
        },
      },

      children: [
        {
          nodeType: 'element',
          id: `${ctx.nodeId}-rect`,
          elementType: 'graphic',

          frame: {
            x: 8,
            y: 8,
            width: 84,
            height: 84,
            anchor: 'top-left',
          },

          content: {
            contentType: 'shape',
            shape: {
              shapeType: 'rect',
              x: 0,
              y: 0,
              width: 84,
              height: 84,
              rx: 10,
              ry: 10,
            },
          },

          style: {
            fill: { type: 'none' },
            stroke: { enabled: true, color: '#000000', width: 2 },
            opacity: 1,
          },
        },

        {
          nodeType: 'element',
          id: `${ctx.nodeId}-circle`,
          elementType: 'graphic',

          frame: {
            x: 50,
            y: 50,
            width: 44,
            height: 44,
            anchor: 'center',
          },

          content: {
            contentType: 'shape',
            shape: {
              shapeType: 'circle',
              cx: 0,
              cy: 0,
              r: 22,
            },
          },

          style: {
            fill: { type: 'solid', color: 'rgba(255,255,255,0.25)' },
            stroke: { enabled: true, color: '#000000', width: 2 },
            opacity: 1,
          },
        },

        {
          nodeType: 'element',
          id: `${ctx.nodeId}-line`,
          elementType: 'graphic',

          frame: {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            anchor: 'top-left',
          },

          content: {
            contentType: 'shape',
            shape: {
              shapeType: 'line',
              x1: 10,
              y1: 50,
              x2: 90,
              y2: 50,
            },
          },

          style: {
            stroke: { enabled: true, color: '#000000', width: 2 },
            opacity: 1,
          },
        },

        {
          nodeType: 'element',
          id: `${ctx.nodeId}-text`,
          elementType: 'text',

          frame: {
            x: 50,
            y: 85,
            width: 80,
            height: 20,
            anchor: 'center',
          },

          content: {
            contentType: 'text',
            text: 'v0.1',
            x: 0,
            y: 0,
            fontSize: 12,
          },

          style: {
            fill: { type: 'solid', color: '#000000' },
            opacity: 1,
          },
        },
      ],

      meta: {
        role: 'test-collection',
        tags: ['test', 'v0.1'],
      },
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Test Visual Output',
      warnings: [],
    },
  };
}