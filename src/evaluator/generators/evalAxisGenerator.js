// src/evaluator/generators/evalAxisGenerator.js
import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

import {
  scaleBand,
  scalePoint,
} from 'd3-scale';

export function evalAxisGenerator(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const axisMode = p.axisMode ?? p.axisType ?? 'xy';
  const requestedScaleType = p.scaleType ?? 'linear';

  const inputsByHandle = ctx.inputs?.byTargetHandle ?? {};

  const xScaleInput = getScaleInput(inputsByHandle, 'xScale');
  const yScaleInput = getScaleInput(inputsByHandle, 'yScale');

  const showX = axisMode === 'x' || axisMode === 'xy';
  const showY = axisMode === 'y' || axisMode === 'xy';

  if (!showX && xScaleInput) {
    warnings.push('xScale input ignored because axisMode does not include x axis.');
  }

  if (!showY && yScaleInput) {
    warnings.push('yScale input ignored because axisMode does not include y axis.');
  }

  const xScale = showX ? xScaleInput?.scale : null;
  const yScale = showY ? yScaleInput?.scale : null;

  const xScaleType = xScale?.scaleType ?? requestedScaleType ?? 'linear';
  const yScaleType = yScale?.scaleType ?? requestedScaleType ?? 'linear';

  const xIsDiscrete = isDiscretePositionScale(xScaleType);
  const yIsDiscrete = isDiscretePositionScale(yScaleType);

  const xDomain = xScale?.domain ?? [
    toNumber(p.xDomainMin ?? p.domainMin, 0),
    toNumber(p.xDomainMax ?? p.domainMax, 100),
  ];

  const yDomain = yScale?.domain ?? [
    toNumber(p.yDomainMin ?? p.domainMin, 0),
    toNumber(p.yDomainMax ?? p.domainMax, 100),
  ];

  const plotWidth = Math.max(
    1,
    xScale
      ? getRangeLength(xScale.range, toNumber(p.plotWidth ?? p.axisLength, 200))
      : toNumber(p.plotWidth ?? p.axisLength, 200)
  );

  const plotHeight = Math.max(
    1,
    yScale
      ? getRangeLength(yScale.range, toNumber(p.plotHeight ?? p.axisLength, 120))
      : toNumber(p.plotHeight ?? p.axisLength, 120)
  );

  const xDomainMin = xIsDiscrete ? null : toNumber(xDomain[0], 0);
  const xDomainMax = xIsDiscrete ? null : toNumber(xDomain[1], 100);
  const yDomainMin = yIsDiscrete ? null : toNumber(yDomain[0], 0);
  const yDomainMax = yIsDiscrete ? null : toNumber(yDomain[1], 100);

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
  const originMarkerFill = p.originMarkerFill ?? '#ffffff';

  if (showX && !xIsDiscrete && xDomainMax === xDomainMin) {
    warnings.push('xDomainMax equals xDomainMin. X axis positions collapse to 0.');
  }

  if (showY && !yIsDiscrete && yDomainMax === yDomainMin) {
    warnings.push('yDomainMax equals yDomainMin. Y axis positions collapse to 0.');
  }

  const xTicks = showX
    ? makeAxisTicks({
        axis: 'x',
        scaleInput: xScaleInput,
        scaleType: xScaleType,
        domain: xDomain,
        domainMin: xDomainMin,
        domainMax: xDomainMax,
        length: plotWidth,
        tickCount: xTickCount,
        decimalPlaces,
      })
    : [];

  const yTicks = showY
    ? makeAxisTicks({
        axis: 'y',
        scaleInput: yScaleInput,
        scaleType: yScaleType,
        domain: yDomain,
        domainMin: yDomainMin,
        domainMax: yDomainMax,
        length: plotHeight,
        tickCount: yTickCount,
        decimalPlaces,
      })
    : [];

  const xZeroPosition =
    showX && !xIsDiscrete && domainIncludesZero(xDomainMin, xDomainMax)
      ? mapLinearValue({
          value: 0,
          domainMin: xDomainMin,
          domainMax: xDomainMax,
          length: plotWidth,
        })
      : null;

  const yZeroPosition =
    showY && !yIsDiscrete && domainIncludesZero(yDomainMin, yDomainMax)
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
  // For discrete scale, there is no mathematical zero.
  // Axis falls back to the bottom / left edge.
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
      const isOriginTick =
        axisMode === 'xy' &&
        !xIsDiscrete &&
        !yIsDiscrete &&
        isZeroTick(tick);

      // In 2D continuous mode, the origin is marked by one shared marker.
      // Do not draw overlapping x/y tick marks at the origin.
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

      const isOriginTick =
        axisMode === 'xy' &&
        !xIsDiscrete &&
        !yIsDiscrete &&
        isZeroTick(tick);

      // In 2D continuous mode, do not draw a second y-axis zero tick or zero label.
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

  if (
    axisMode === 'xy' &&
    !xIsDiscrete &&
    !yIsDiscrete &&
    xZeroPosition != null &&
    yZeroPosition != null
  ) {
    children.push(
      makeOriginMarkerElement({
        ctx,
        x: yAxisX,
        y: xAxisY,
        radius: originMarkerRadius,
        strokeColor,
        strokeWidth,
        fillColor: originMarkerFill,
      })
    );
  }

  const scaleInputsForProvenance = [
    showX ? xScaleInput?.output : null,
    showY ? yScaleInput?.output : null,
  ].filter(Boolean);

  const inputProvenance = inheritProvenance(...scaleInputsForProvenance);

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: axisMode === 'xy' ? 'axis-system-generator' : 'axis-generator',
    outputType: 'visual',
    label: 'Axis Generator Output',
    transform: {
      type: 'generate-axis-system',
      axisMode,
      xScaleType,
      yScaleType,
      plotWidth,
      plotHeight,
    },
  });

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
        tags: ['axis-generator', 'axis', axisMode, xScaleType, yScaleType],
        sourceNodeId: ctx.nodeId,
      },
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Axis Generator Output',
      outputRole: axisMode === 'xy' ? 'axis-system' : 'axis',
      warnings,

      provenance: [
        ...inputProvenance,
        ownProvenanceEntry,
      ],

      coordinateSystem: {
        axisMode,

        plotSize: {
          width: plotWidth,
          height: plotHeight,
        },

        origin: {
          x: yAxisX,
          y: xAxisY,
          hasOrigin:
            axisMode === 'xy' &&
            !xIsDiscrete &&
            !yIsDiscrete &&
            xZeroPosition != null &&
            yZeroPosition != null,
          source: {
            x: xZeroPosition == null ? 'left-edge' : 'x-domain-zero',
            y: yZeroPosition == null ? 'bottom-edge' : 'y-domain-zero',
          },
        },

        x: showX
          ? {
              scaleType: xScaleType,
              scaleFamily: xIsDiscrete ? 'discrete-position' : 'continuous-position',

              domain: xDomain,
              range: [0, plotWidth],

              zeroPosition: xZeroPosition,
              hasZero: xZeroPosition != null,
              axisY: xAxisY,

              bandwidth: xScale?.d3?.bandwidth ?? xScale?.bandwidth ?? null,
              step: xScale?.d3?.step ?? xScale?.step ?? null,

              sourceScale: xScaleInput
                ? makeSourceScaleSummary({
                    scaleInput: xScaleInput,
                    interpretedRange: [0, plotWidth],
                  })
                : null,

              ticks: xTicks.map((tick) => ({
                value: tick.value,
                label: tick.label,
                normalized: tick.normalized ?? null,
                position: tick.position,
                visualPosition: {
                  x: tick.position,
                  y: xAxisY,
                },
                source: tick.source ?? 'axis-generator',
              })),
            }
          : null,

        y: showY
          ? {
              scaleType: yScaleType,
              scaleFamily: yIsDiscrete ? 'discrete-position' : 'continuous-position',

              domain: yDomain,
              range: [0, -plotHeight],

              zeroPosition: yZeroPosition == null ? null : -yZeroPosition,
              hasZero: yZeroPosition != null,
              axisX: yAxisX,

              bandwidth: yScale?.d3?.bandwidth ?? yScale?.bandwidth ?? null,
              step: yScale?.d3?.step ?? yScale?.step ?? null,

              sourceScale: yScaleInput
                ? makeSourceScaleSummary({
                    scaleInput: yScaleInput,
                    interpretedRange: [0, -plotHeight],
                  })
                : null,

              ticks: yTicks.map((tick) => ({
                value: tick.value,
                label: tick.label,
                normalized: tick.normalized ?? null,
                position: -tick.position,
                visualPosition: {
                  x: yAxisX,
                  y: -tick.position,
                },
                source: tick.source ?? 'axis-generator',
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

function makeAxisTicks({
  axis,
  scaleInput,
  scaleType,
  domain,
  domainMin,
  domainMax,
  length,
  tickCount,
  decimalPlaces,
}) {
  if (scaleType === 'band') {
    return makeBandAxisTicks({
      scaleInput,
      domain,
      length,
    });
  }

  if (scaleType === 'point') {
    return makePointAxisTicks({
      scaleInput,
      domain,
      length,
    });
  }

  return makeLinearTicks({
    domainMin,
    domainMax,
    length,
    tickCount,
    decimalPlaces,
  }).map((tick) => ({
    ...tick,
    source: 'continuous-scale',
  }));
}

function makeBandAxisTicks({
  scaleInput,
  domain,
  length,
}) {
  const sourceScale = scaleInput?.scale;
  const sourceItems = scaleInput?.items;

  if (Array.isArray(sourceItems) && sourceItems.length > 0) {
    return sourceItems
      .filter((item) => item.center != null)
      .map((item, index) => ({
        value: item.category ?? item.value,
        label: String(item.category ?? item.value),
        normalized: null,
        position: normalizeDiscretePositionFromItem({
          item,
          sourceScale,
          length,
          preferredPosition: 'center',
        }),
        source: 'band-scale-items',
        index,
      }));
  }

  const domainValues = Array.isArray(domain) ? domain : [];

  const scale = scaleBand()
    .domain(domainValues)
    .range([0, length])
    .paddingInner(sourceScale?.d3?.paddingInner ?? sourceScale?.paddingInner ?? 0.1)
    .paddingOuter(sourceScale?.d3?.paddingOuter ?? sourceScale?.paddingOuter ?? 0.1);

  const bandwidth = scale.bandwidth();

  return domainValues.map((value, index) => ({
    value,
    label: String(value),
    normalized: null,
    position: scale(value) + bandwidth / 2,
    source: 'band-scale-rebuilt',
    index,
  }));
}

function makePointAxisTicks({
  scaleInput,
  domain,
  length,
}) {
  const sourceScale = scaleInput?.scale;
  const sourceItems = scaleInput?.items;

  if (Array.isArray(sourceItems) && sourceItems.length > 0) {
    return sourceItems
      .filter((item) => item.center != null || item.position != null)
      .map((item, index) => ({
        value: item.category ?? item.value,
        label: String(item.category ?? item.value),
        normalized: null,
        position: normalizeDiscretePositionFromItem({
          item,
          sourceScale,
          length,
          preferredPosition: 'center',
        }),
        source: 'point-scale-items',
        index,
      }));
  }

  const domainValues = Array.isArray(domain) ? domain : [];

  const scale = scalePoint()
    .domain(domainValues)
    .range([0, length])
    .padding(sourceScale?.d3?.paddingOuter ?? sourceScale?.paddingOuter ?? 0.1);

  return domainValues.map((value, index) => ({
    value,
    label: String(value),
    normalized: null,
    position: scale(value),
    source: 'point-scale-rebuilt',
    index,
  }));
}

function normalizeDiscretePositionFromItem({
  item,
  sourceScale,
  length,
  preferredPosition,
}) {
  const rawRange = sourceScale?.range;

  const rawPosition =
    preferredPosition === 'center'
      ? item.center ?? item.position ?? item.start
      : item.position ?? item.start ?? item.center;

  const n = Number(rawPosition);

  if (!Number.isFinite(n)) return 0;

  if (!Array.isArray(rawRange) || rawRange.length < 2) {
    return Math.abs(n);
  }

  const r0 = Number(rawRange[0]);
  const r1 = Number(rawRange[1]);

  if (!Number.isFinite(r0) || !Number.isFinite(r1) || r0 === r1) {
    return Math.abs(n);
  }

  const t = (n - r0) / (r1 - r0);

  return t * length;
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
    normalized: tick.normalized ?? null,
    label: tick.label,
    position: tick.position,
    source: tick.source ?? null,
  };
}

function domainIncludesZero(domainMin, domainMax) {
  if (!Number.isFinite(domainMin) || !Number.isFinite(domainMax)) return false;

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

function isDiscretePositionScale(scaleType) {
  return scaleType === 'band' || scaleType === 'point';
}

function getScaleInput(inputsByHandle, handleId) {
  const input = inputsByHandle?.[handleId]?.[0];
  const output = input?.value;
  const scale = output?.meta?.scale;

  if (!input || !output || !scale) return null;

  return {
    input,
    output,
    scale,
    items: output.meta?.items ?? null,
  };
}

function getRangeLength(range, fallback) {
  if (!Array.isArray(range) || range.length < 2) {
    return Math.max(1, fallback);
  }

  const start = Number(range[0]);
  const end = Number(range[1]);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return Math.max(1, fallback);
  }

  return Math.abs(end - start);
}

function makeSourceScaleSummary({ scaleInput, interpretedRange }) {
  const inputItem = scaleInput.input;
  const output = scaleInput.output;
  const scale = scaleInput.scale;
  const edge = inputItem.edge ?? {};

  return {
    sourceNodeId: inputItem.from ?? output.meta?.sourceNodeId ?? null,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
    edgeId: edge.id ?? null,

    scaleId: scale.scaleId ?? null,
    scaleType: scale.scaleType,
    scaleFamily: scale.scaleFamily ?? scale.d3?.scaleFamily ?? null,
    requestedScaleType: scale.requestedScaleType,

    domain: scale.domain,
    originalRange: scale.range,
    interpretedRange,

    bandwidth: scale.d3?.bandwidth ?? scale.bandwidth ?? null,
    step: scale.d3?.step ?? scale.step ?? null,
    outputPosition: scale.outputPosition ?? null,

    zeroInputValue: scale.zeroInputValue ?? null,
    zeroOutputValue: scale.zeroOutputValue ?? null,

    parameterSpace: scale.parameterSpace ?? null,

    itemCount: Array.isArray(scaleInput.items) ? scaleInput.items.length : null,

    provenance: inheritProvenance(output),
  };
}