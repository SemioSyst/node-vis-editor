export function evalTransformInteractionTest(ctx) {
  return {
    outputType: 'visual',
    version: '0.1',

    root: {
      nodeType: 'collection',
      id: `${ctx.nodeId}-root-collection`,

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
        rotate: 12,
        scaleX: 0.9,
        scaleY: 0.9,
        origin: 'center',
      },

      interaction: {
        hitArea: 'bounds',
        events: {
          click: {
            action: 'log',
            payload: {
              message: 'PARENT collection clicked',
            },
          },
          hover: {
            action: 'log',
            cursor: 'pointer',
            payload: {
              message: 'PARENT collection hovered',
            },
          },
        },
      },

      children: [
        {
          nodeType: 'element',
          id: `${ctx.nodeId}-background`,
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
              shapeType: 'rect',
              x: 0,
              y: 0,
              width: 100,
              height: 100,
              rx: 8,
              ry: 8,
            },
          },

          style: {
            fill: { type: 'solid', color: 'rgba(0,0,0,0.04)' },
            stroke: { enabled: true, color: '#000000', width: 1 },
            opacity: 1,
          },
        },

        {
          nodeType: 'element',
          id: `${ctx.nodeId}-child-rect`,
          elementType: 'graphic',

          frame: {
            x: 18,
            y: 18,
            width: 38,
            height: 28,
            anchor: 'top-left',
          },

          transform: {
            x: 0,
            y: 0,
            rotate: -18,
            scaleX: 1,
            scaleY: 1,
            origin: 'center',
          },

          content: {
            contentType: 'shape',
            shape: {
              shapeType: 'rect',
              x: 0,
              y: 0,
              width: 38,
              height: 28,
              rx: 4,
              ry: 4,
            },
          },

          style: {
            fill: { type: 'solid', color: 'rgba(80, 120, 255, 0.35)' },
            stroke: { enabled: true, color: '#000000', width: 2 },
            opacity: 1,
          },

          interaction: {
            hitArea: 'bounds',
            stopPropagation: true,
            events: {
              click: {
                action: 'log',
                payload: {
                  message: 'CHILD rect clicked; parent should NOT fire because stopPropagation=true',
                },
              },
              hover: {
                action: 'log',
                cursor: 'crosshair',
                payload: {
                  message: 'CHILD rect hovered',
                },
              },
            },
          },
        },

        {
          nodeType: 'element',
          id: `${ctx.nodeId}-child-circle`,
          elementType: 'graphic',

          frame: {
            x: 72,
            y: 45,
            width: 28,
            height: 28,
            anchor: 'center',
          },

          transform: {
            x: 0,
            y: 0,
            rotate: 0,
            scaleX: 1.2,
            scaleY: 1.2,
            origin: 'center',
          },

          content: {
            contentType: 'shape',
            shape: {
              shapeType: 'circle',
              cx: 0,
              cy: 0,
              r: 14,
            },
          },

          style: {
            fill: { type: 'solid', color: 'rgba(255, 120, 80, 0.35)' },
            stroke: { enabled: true, color: '#000000', width: 2 },
            opacity: 1,
          },

          interaction: {
            hitArea: 'visible',
            events: {
              click: {
                action: 'log',
                payload: {
                  message: 'CHILD circle clicked; parent may also fire if event bubbles',
                },
              },
              hover: {
                action: 'log',
                cursor: 'grab',
                payload: {
                  message: 'CHILD circle hovered',
                },
              },
            },
          },
        },

        {
          nodeType: 'element',
          id: `${ctx.nodeId}-label`,
          elementType: 'text',

          frame: {
            x: 50,
            y: 84,
            width: 80,
            height: 16,
            anchor: 'center',
          },

          content: {
            contentType: 'text',
            text: 'parent transform',
            x: 0,
            y: 0,
            fontSize: 10,
          },

          style: {
            fill: { type: 'solid', color: '#000000' },
            opacity: 1,
          },
        },
      ],

      meta: {
        role: 'transform-interaction-test',
        tags: ['test', 'interaction', 'transform'],
      },
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Transform + Interaction Test Output',
      warnings: [],
    },
  };
}