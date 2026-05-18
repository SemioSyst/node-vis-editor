// src/evaluator/evaluatorsByType.js

const DEFAULT_VIEWBOX = '0 0 100 100';
const DEFAULT_STROKE = '#000000';
const DEFAULT_STROKE_WIDTH = 2;

/**
 * Helpers
 */
function pick(obj, key, fallback) {
  const v = obj?.[key];
  return v === undefined || v === null ? fallback : v;
}

/**
 * Base shape evaluators
 * ctx.params should come from IR: graphIR.nodesById[id].params
 * ctx.getUpstreamOutputs() returns array of upstream outputs (already resolved from outputs store)
 */

// Circle node: outputs one circle spec
function evalCircle(ctx) {
  const p = ctx.params ?? {};
  return {
    kind: 'circle',
    cx: pick(p, 'cx', 50),
    cy: pick(p, 'cy', 50),
    r: pick(p, 'r', 22),
    fill: pick(p, 'fill', 'none'),
    stroke: pick(p, 'stroke', DEFAULT_STROKE),
    strokeWidth: pick(p, 'strokeWidth', DEFAULT_STROKE_WIDTH),
    opacity: pick(p, 'opacity', undefined),
    viewBox: pick(p, 'viewBox', DEFAULT_VIEWBOX), // optional; Preview can read from top-level group
  };
}

// Rect node: outputs one rect spec
function evalRect(ctx) {
  const p = ctx.params ?? {};
  return {
    kind: 'rect',
    x: pick(p, 'x', 8),
    y: pick(p, 'y', 8),
    w: pick(p, 'w', 84),
    h: pick(p, 'h', 84),
    rx: pick(p, 'rx', 10),
    ry: pick(p, 'ry', 10),
    fill: pick(p, 'fill', 'none'),
    stroke: pick(p, 'stroke', DEFAULT_STROKE),
    strokeWidth: pick(p, 'strokeWidth', DEFAULT_STROKE_WIDTH),
    opacity: pick(p, 'opacity', undefined),
    viewBox: pick(p, 'viewBox', DEFAULT_VIEWBOX),
  };
}

// Line node: outputs one line spec
function evalLine(ctx) {
  const p = ctx.params ?? {};
  return {
    kind: 'line',
    x1: pick(p, 'x1', 10),
    y1: pick(p, 'y1', 50),
    x2: pick(p, 'x2', 90),
    y2: pick(p, 'y2', 50),
    stroke: pick(p, 'stroke', DEFAULT_STROKE),
    strokeWidth: pick(p, 'strokeWidth', DEFAULT_STROKE_WIDTH),
    opacity: pick(p, 'opacity', undefined),
    viewBox: pick(p, 'viewBox', DEFAULT_VIEWBOX),
  };
}

// Group node: merges upstream outputs into children array
function evalGroup(ctx) {
  const p = ctx.params ?? {};
  const children = ctx.getUpstreamOutputs();

  // Demo behaviour: if nothing upstream, output empty group
  return {
    kind: 'group',
    viewBox: pick(p, 'viewBox', DEFAULT_VIEWBOX),
    transform: pick(p, 'transform', undefined),
    children,
  };
}

function evalTestVisual(ctx) {
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

function evalTransformInteractionTest(ctx) {
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

/**
 * Registry
 * IMPORTANT: these keys must match graphIR.nodesById[id].type
 * e.g. node.type = 'circle', 'rect', 'line', 'group'
 */
export const evaluatorsByType = {
  circle: evalCircle,
  rect: evalRect,
  line: evalLine,
  group: evalGroup,

  testVisual: evalTestVisual,
  transformInteractionTest: evalTransformInteractionTest,
};
