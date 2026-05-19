// src/evaluator/generators/evalAxisGenerator.js

export function evalAxisGenerator(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const axisMode = p.axisMode ?? p.axisType ?? 'xy';
  const scaleType = p.scaleType ?? 'linear';

  const plotWidth = Math.max(1, toNumber(p.plotWidth ?? p.axisLength, 200));
  const plotHeight = Math.max(1, toNumber(p.plotHeight ?? p.axisLength, 120));

  const xDomainMin = toNumber(p.xDomainMin ?? p.domainMin, 0);
  const xDomainMax = toNumber(p.xDomainMax ?? p.domainMax, 100);
  const yDomainMin = toNumber(p.yDomainMin ?? p.domainMin, 0);
  const yDomainMax = toNumber(p.yDomainMax ?? p.domainMax, 100);

  const xTickCount = Math.max(1, Math.round(toNumber(p.xTickCount ?? p.tickCount, 5)));
  const yTickCount = Math.max(1, Math.round(toNumber(p.yTickCount ?? p.tickCount, 5)));

  const tickSize = Math.max(0, toNumber(p.tickSize, 6));
  const labelOffset = Math.max(0, toNumber(p.labelOffset, 18));
  const fontSize = Math.max(1, toNumber(p.fontSize, 10));
  const decimalPlaces = clamp(Math.round(toNumber(p.decimalPlaces, 0)), 0, 6);

  const originMarkerRadius = Math.max(0, toNumber(p.originMarkerRadius, 2));
  const originLabelOffsetX = toNumber(p.originLabelOffsetX, 4);

  const strokeColor = p.strokeColor ?? '#000000';
  const strokeWidth = Math.max(0, toNumber(p.strokeWidth, 1));
  const textColor = p.textColor ?? '#000000';

  const showX = axisMode === 'x' || axisMode === 'xy';
  const showY = axisMode === 'y' || axisMode === 'xy';

  if (scaleType !== 'linear') {
    warnings.push(
      `Scale type "${scaleType}" is reserved for later. Linear scale is used for now.`
    );
  }

  if (showX && xDomainMax === xDomainMin) {
    warnings.push('xDomainMax equals xDomainMin. X axis positions collapse to 0.');
  }

  if (showY && yDomainMax === yDomainMin) {
    warnings.push('yDomainMax equals yDomainMin. Y axis positions collapse to 0.');
  }

  const xTicks = showX
    ? makeLinearTicks({
        domainMin: xDomainMin,
        domainMax: xDomainMax,
        length: plotWidth,
        tickCount: xTickCount,
        decimalPlaces,
      })
    : [];

  const yTicks = showY
    ? makeLinearTicks({
        domainMin: yDomainMin,
        domainMax: yDomainMax,
        length: plotHeight,
        tickCount: yTickCount,
        decimalPlaces,
      })
    : [];

  const xZeroPosition = domainIncludesZero(xDomainMin, xDomainMax)
    ? mapLinearValue({
        value: 0,
        domainMin: xDomainMin,
        domainMax: xDomainMax,
        length: plotWidth,
      })
    : null;

  const yZeroPosition = domainIncludesZero(yDomainMin, yDomainMax)
    ? mapLinearValue({
        value: 0,
        domainMin: yDomainMin,
        domainMax: yDomainMax,
        length: plotHeight,
      })
    : null;

  // Visual coordinate system:
  // x range: 0 → plotWidth
  // y range: 0 → -plotHeight
  //
  // xAxisY is where x axis is drawn.
  // yAxisX is where y axis is drawn.
  const xAxisY = showY
    ? (yZeroPosition == null ? 0 : -yZeroPosition)
    : 0;

  const yAxisX = showX
    ? (xZeroPosition == null ? 0 : xZeroPosition)
    : 0;

  const children = [];

  if (showX) {
    children.push(
      makeAxisLineElement({
        ctx,
        idSuffix: 'x-axis-line',
        role: 'x-axis-line',
        x1: 0,
        y1: xAxisY,
        x2: plotWidth,
        y2: xAxisY,
        strokeColor,
        strokeWidth,
      })
    );

    xTicks.forEach((tick, index) => {
    const isOriginTick = axisMode === 'xy' && isZeroTick(tick);

    // In 2D mode, the origin should be marked by a small circle,
    // not by overlapping x/y tick marks.
    if (!isOriginTick) {
        children.push(
            makeTickLineElement({
                ctx,
                idSuffix: `x-tick-line-${index}`,
                role: 'x-axis-tick',
                axis: 'x',
                x: tick.position,
                y: xAxisY,
                tickSize,
                strokeColor,
                strokeWidth,
                dataRef: tickDataRef(index, tick),
            })
        );
    }

    children.push(
            makeTickLabelElement({
                ctx,
                idSuffix: `x-tick-label-${index}`,
                role: 'x-axis-label',
                axis: 'x',
                x: tick.position + (isOriginTick ? originLabelOffsetX : 0),
                y: xAxisY + labelOffset,
                text: tick.label,
                fontSize,
                textColor,
                dataRef: tickDataRef(index, tick),
            })
        );
    });
  }

  if (showY) {
    children.push(
      makeAxisLineElement({
        ctx,
        idSuffix: 'y-axis-line',
        role: 'y-axis-line',
        x1: yAxisX,
        y1: 0,
        x2: yAxisX,
        y2: -plotHeight,
        strokeColor,
        strokeWidth,
      })
    );

    yTicks.forEach((tick, index) => {
    const y = -tick.position;
    const isOriginTick = axisMode === 'xy' && isZeroTick(tick);

    // In 2D mode, the origin is represented by the shared origin marker.
    // Do not draw a second y-axis zero tick or zero label.
    if (!isOriginTick) {
        children.push(
        makeTickLineElement({
                ctx,
                idSuffix: `y-tick-line-${index}`,
                role: 'y-axis-tick',
                axis: 'y',
                x: yAxisX,
                y,
                tickSize,
                strokeColor,
                strokeWidth,
                dataRef: tickDataRef(index, tick),
            })
        );

        children.push(
            makeTickLabelElement({
                    ctx,
                    idSuffix: `y-tick-label-${index}`,
                    role: 'y-axis-label',
                    axis: 'y',
                    x: yAxisX - labelOffset,
                    y,
                    text: tick.label,
                    fontSize,
                    textColor,
                    dataRef: tickDataRef(index, tick),
                })
            );
        }
    });
  }

  if (axisMode === 'xy' && xZeroPosition != null && yZeroPosition != null) {
    children.push(
                makeOriginMarkerElement({
                ctx,
                x: yAxisX,
                y: xAxisY,
                radius: originMarkerRadius,
                strokeColor,
                strokeWidth,
                strokeColor,
            })
        );
    }

  return {
    outputType: 'visual',
    version: '0.1',

    root: {
      nodeType: 'collection',
      id: `${ctx.nodeId}-axis-system-collection`,

      transform: {
        x: 0,
        y: 0,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
      },

      interaction: null,
      bindings: [],
      children,

      meta: {
        role: axisMode === 'xy' ? 'axis-system' : 'axis',
        tags: ['axis-generator', 'axis', axisMode, scaleType],
        sourceNodeId: ctx.nodeId,
      },
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Axis Generator Output',
      outputRole: axisMode === 'xy' ? 'axis-system' : 'axis',
      warnings,

      coordinateSystem: {
        scaleType: 'linear',
        requestedScaleType: scaleType,
        axisMode,

        plotSize: {
          width: plotWidth,
          height: plotHeight,
        },

        origin: {
          x: yAxisX,
          y: xAxisY,
          source: {
            x: xZeroPosition == null ? 'left-edge' : 'x-domain-zero',
            y: yZeroPosition == null ? 'bottom-edge' : 'y-domain-zero',
          },
        },

        x: showX
          ? {
              domain: [xDomainMin, xDomainMax],
              range: [0, plotWidth],
              zeroPosition: xZeroPosition,
              axisY: xAxisY,
              ticks: xTicks.map((tick) => ({
                value: tick.value,
                label: tick.label,
                normalized: tick.normalized,
                position: tick.position,
                visualPosition: {
                  x: tick.position,
                  y: xAxisY,
                },
              })),
            }
          : null,

        y: showY
          ? {
              domain: [yDomainMin, yDomainMax],
              range: [0, -plotHeight],
              zeroPosition: yZeroPosition == null ? null : -yZeroPosition,
              axisX: yAxisX,
              ticks: yTicks.map((tick) => ({
                value: tick.value,
                label: tick.label,
                normalized: tick.normalized,
                position: -tick.position,
                visualPosition: {
                  x: yAxisX,
                  y: -tick.position,
                },
              })),
            }
          : null,
      },
    },
  };
}

function makeAxisLineElement({
  ctx,
  idSuffix,
  role,
  x1,
  y1,
  x2,
  y2,
  strokeColor,
  strokeWidth,
}) {
  return {
    nodeType: 'element',
    id: `${ctx.nodeId}-${idSuffix}`,
    role,
    tags: ['axis', 'axis-line'],

    elementType: 'graphic',

    frame: {
      x: 0,
      y: 0,
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
      alignX: 'left',
      alignY: 'top',
    },

    content: {
      contentType: 'shape',
      shape: {
        shapeType: 'line',
        x1,
        y1,
        x2,
        y2,
      },
    },

    style: makeLineStyle(strokeColor, strokeWidth),

    interaction: null,
    bindings: [],

    meta: {
      sourceNodeId: ctx.nodeId,
    },
  };
}

function makeTickLineElement({
  ctx,
  idSuffix,
  role,
  axis,
  x,
  y,
  tickSize,
  strokeColor,
  strokeWidth,
  dataRef,
}) {
  const shape =
    axis === 'x'
      ? {
          shapeType: 'line',
          x1: x,
          y1: y,
          x2: x,
          y2: y + tickSize,
        }
      : {
          shapeType: 'line',
          x1: x,
          y1: y,
          x2: x - tickSize,
          y2: y,
        };

  return {
    nodeType: 'element',
    id: `${ctx.nodeId}-${idSuffix}`,
    role,
    tags: ['axis', 'tick'],
    dataRef,

    elementType: 'graphic',

    frame: {
      x: 0,
      y: 0,
      width: tickSize,
      height: tickSize,
      alignX: 'left',
      alignY: 'top',
    },

    content: {
      contentType: 'shape',
      shape,
    },

    style: makeLineStyle(strokeColor, strokeWidth),

    interaction: null,
    bindings: [],

    meta: {
      sourceNodeId: ctx.nodeId,
    },
  };
}

function makeTickLabelElement({
  ctx,
  idSuffix,
  role,
  axis,
  x,
  y,
  text,
  fontSize,
  textColor,
  dataRef,
}) {
  return {
    nodeType: 'element',
    id: `${ctx.nodeId}-${idSuffix}`,
    role,
    tags: ['axis', 'tick-label', 'text'],
    dataRef,

    elementType: 'text',

    frame: {
      x,
      y,
      width: 0,
      height: 0,
      alignX: axis === 'x' ? 'center' : 'right',
      alignY: axis === 'x' ? 'top' : 'center',
    },

    content: {
      contentType: 'text',
      text,
      x: 0,
      y: 0,
      fontSize,
      textAnchor: axis === 'x' ? 'middle' : 'end',
      dominantBaseline: axis === 'x' ? 'hanging' : 'middle',
    },

    style: {
      fill: {
        type: 'solid',
        color: textColor,
      },
      stroke: {
        enabled: false,
      },
      opacity: 1,
    },

    interaction: null,
    bindings: [],

    meta: {
      sourceNodeId: ctx.nodeId,
    },
  };
}

function makeLineStyle(strokeColor, strokeWidth) {
  return {
    fill: { type: 'none' },
    stroke: {
      enabled: true,
      color: strokeColor,
      width: strokeWidth,
    },
    opacity: 1,
  };
}

function makeLinearTicks({
  domainMin,
  domainMax,
  length,
  tickCount,
  decimalPlaces,
}) {
  if (tickCount <= 1) {
    return [
      makeTick({
        value: domainMin,
        domainMin,
        domainMax,
        length,
        decimalPlaces,
      }),
    ];
  }

  return Array.from({ length: tickCount }, (_, index) => {
    const normalized = index / (tickCount - 1);
    const value = domainMin + (domainMax - domainMin) * normalized;

    return makeTick({
      value,
      domainMin,
      domainMax,
      length,
      decimalPlaces,
    });
  });
}

function makeTick({
  value,
  domainMin,
  domainMax,
  length,
  decimalPlaces,
}) {
  const normalized =
    domainMax === domainMin
      ? 0
      : (value - domainMin) / (domainMax - domainMin);

  const position = mapLinearValue({
    value,
    domainMin,
    domainMax,
    length,
  });

  return {
    value,
    normalized,
    position,
    label: formatNumber(value, decimalPlaces),
  };
}

function mapLinearValue({
  value,
  domainMin,
  domainMax,
  length,
}) {
  if (domainMax === domainMin) return 0;

  return ((value - domainMin) / (domainMax - domainMin)) * length;
}

function tickDataRef(index, tick) {
  return {
    index,
    value: tick.value,
    normalized: tick.normalized,
    label: tick.label,
    position: tick.position,
  };
}

function domainIncludesZero(domainMin, domainMax) {
  const min = Math.min(domainMin, domainMax);
  const max = Math.max(domainMin, domainMax);

  return min <= 0 && max >= 0;
}

function formatNumber(value, decimalPlaces) {
  const n = Number(value);

  if (!Number.isFinite(n)) return String(value);

  return n.toFixed(decimalPlaces);
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeOriginMarkerElement({
  ctx,
  x,
  y,
  radius,
  strokeColor,
  strokeWidth,
  fillColor,
}) {
  return {
    nodeType: 'element',
    id: `${ctx.nodeId}-origin-marker`,
    role: 'origin-marker',
    tags: ['axis', 'origin', 'marker'],

    elementType: 'graphic',

    dataRef: {
      value: 0,
      role: 'origin',
    },

    frame: {
      x: x - radius,
      y: y - radius,
      width: radius * 2,
      height: radius * 2,
      alignX: 'left',
      alignY: 'top',
    },

    content: {
      contentType: 'shape',
      shape: {
        shapeType: 'circle',
        cx: radius,
        cy: radius,
        r: radius,
      },
    },

    style: {
      fill: {
        type: fillColor === 'none' ? 'none' : 'solid',
        color: fillColor,
      },
      stroke: {
        enabled: true,
        color: strokeColor,
        width: strokeWidth,
      },
      opacity: 1,
    },

    interaction: null,
    bindings: [],

    meta: {
      sourceNodeId: ctx.nodeId,
    },
  };
}

function isZeroTick(tick) {
  return Math.abs(Number(tick.value)) < 1e-9;
}