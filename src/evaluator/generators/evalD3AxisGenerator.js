// src/evaluator/generators/evalD3AxisGenerator.js
import {
  inheritProvenance,
  makeProvenanceEntry,
} from '../utils/metaUtils.js';

import {
  scaleLinear,
  scaleLog,
  scaleSymlog,
  scaleSqrt,
  scaleBand,
  scalePoint,
} from 'd3-scale';

export function evalD3AxisGenerator(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const axisMode = p.axisMode ?? p.axisType ?? 'xy';

  const requestedXScaleType = p.xScaleType ?? p.scaleType ?? 'linear';
  const requestedYScaleType = p.yScaleType ?? p.scaleType ?? 'linear';

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

  const xScaleMeta = showX ? xScaleInput?.scale : null;
  const yScaleMeta = showY ? yScaleInput?.scale : null;

  const xScaleType = xScaleMeta?.scaleType ?? requestedXScaleType;
  const yScaleType = yScaleMeta?.scaleType ?? requestedYScaleType;

  const xIsDiscrete = isDiscretePositionScale(xScaleType);
  const yIsDiscrete = isDiscretePositionScale(yScaleType);

  const xDomain = xScaleMeta?.domain ?? (
    xIsDiscrete
        ? parseCategoryDomain(p.xCategories, ['A', 'B', 'C', 'D'])
        : [
            toNumber(p.xDomainMin ?? p.domainMin, 0),
            toNumber(p.xDomainMax ?? p.domainMax, 100),
        ]
    );

  const yDomain = yScaleMeta?.domain ?? (
    yIsDiscrete
        ? parseCategoryDomain(p.yCategories, ['A', 'B', 'C', 'D'])
        : [
            toNumber(p.yDomainMin ?? p.domainMin, 0),
            toNumber(p.yDomainMax ?? p.domainMax, 100),
        ]
    );

  const plotWidth = Math.max(
    1,
    xScaleMeta
      ? getRangeLength(xScaleMeta.range, toNumber(p.plotWidth ?? p.axisLength, 200))
      : toNumber(p.plotWidth ?? p.axisLength, 200)
  );

  const plotHeight = Math.max(
    1,
    yScaleMeta
      ? getRangeLength(yScaleMeta.range, toNumber(p.plotHeight ?? p.axisLength, 120))
      : toNumber(p.plotHeight ?? p.axisLength, 120)
  );

  const xContinuousDomain = xIsDiscrete
    ? null
    : [
        toNumber(xDomain[0], 0),
        toNumber(xDomain[1], 100),
      ];

  const yContinuousDomain = yIsDiscrete
    ? null
    : [
        toNumber(yDomain[0], 0),
        toNumber(yDomain[1], 100),
      ];

  const xTickCount = Math.max(1, Math.round(toNumber(p.xTickCount ?? p.tickCount, 5)));
  const yTickCount = Math.max(1, Math.round(toNumber(p.yTickCount ?? p.tickCount, 5)));

  const tickSize = Math.max(0, toNumber(p.tickSize, 6));
  const tickPadding = Math.max(0, toNumber(p.tickPadding, 4));
  const fontSize = Math.max(1, toNumber(p.fontSize, 10));
  const decimalPlaces = clamp(Math.round(toNumber(p.decimalPlaces, 0)), 0, 6);

  const originMarkerRadius = Math.max(0, toNumber(p.originMarkerRadius, 3));
  const originLabelOffsetX = toNumber(p.originLabelOffsetX, 4);

  const strokeColor = p.strokeColor ?? '#000000';
  const strokeWidth = Math.max(0, toNumber(p.strokeWidth, 1));
  const textColor = p.textColor ?? '#000000';
  const originMarkerFill = p.originMarkerFill ?? '#ffffff';

  const showDomainLine = p.showDomainLine ?? true;
  const showTickLines = p.showTickLines ?? true;
  const showTickLabels = p.showTickLabels ?? true;

  const xZeroPosition =
    showX &&
    !xIsDiscrete &&
    domainIncludesZero(xContinuousDomain[0], xContinuousDomain[1])
      ? mapLinearValue({
          value: 0,
          domainMin: xContinuousDomain[0],
          domainMax: xContinuousDomain[1],
          length: plotWidth,
        })
      : null;

  const yZeroPosition =
    showY &&
    !yIsDiscrete &&
    domainIncludesZero(yContinuousDomain[0], yContinuousDomain[1])
      ? mapLinearValue({
          value: 0,
          domainMin: yContinuousDomain[0],
          domainMax: yContinuousDomain[1],
          length: plotHeight,
        })
      : null;

  const xAxisY = showY
    ? (yZeroPosition == null ? 0 : -yZeroPosition)
    : 0;

  const yAxisX = showX
    ? (xZeroPosition == null ? 0 : xZeroPosition)
    : 0;

  const xTickSummary = showX
    ? makeTickSummary({
        axis: 'x',
        scaleType: xScaleType,
        domain: xDomain,
        scaleInput: xScaleInput,
        length: plotWidth,
        tickCount: xTickCount,
        decimalPlaces,
      })
    : [];

  const yTickSummary = showY
    ? makeTickSummary({
        axis: 'y',
        scaleType: yScaleType,
        domain: yDomain,
        scaleInput: yScaleInput,
        length: plotHeight,
        tickCount: yTickCount,
        decimalPlaces,
      })
    : [];

  const hasTrueOrigin =
    axisMode === 'xy' &&
    !xIsDiscrete &&
    !yIsDiscrete &&
    xZeroPosition != null &&
    yZeroPosition != null;

  const bounds = makeAxisBounds({
    plotWidth,
    plotHeight,
    xAxisY,
    yAxisX,
    labelSpace: fontSize + tickPadding + tickSize + 10,
  });

  const scaleInputsForProvenance = [
    showX ? xScaleInput?.output : null,
    showY ? yScaleInput?.output : null,
  ].filter(Boolean);

  const inputProvenance = inheritProvenance(...scaleInputsForProvenance);

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: axisMode === 'xy' ? 'd3-axis-system-generator' : 'd3-axis-generator',
    outputType: 'visual',
    label: 'D3 Axis Generator Output',
    transform: {
      type: 'generate-d3-axis-system',
      axisMode,
      xScaleType,
      yScaleType,
      plotWidth,
      plotHeight,
    },
  });

  const coordinateSystem = {
    axisMode,

    plotSize: {
      width: plotWidth,
      height: plotHeight,
    },

    origin: {
      x: yAxisX,
      y: xAxisY,
      hasOrigin: hasTrueOrigin,
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

          bandwidth: xScaleMeta?.d3?.bandwidth ?? xScaleMeta?.bandwidth ?? null,
          step: xScaleMeta?.d3?.step ?? xScaleMeta?.step ?? null,

          paddingInner: xScaleMeta?.d3?.paddingInner ?? p.xPaddingInner ?? null,
          paddingOuter: xScaleMeta?.d3?.paddingOuter ?? p.xPaddingOuter ?? null,

          sourceScale: xScaleInput
            ? makeSourceScaleSummary({
                scaleInput: xScaleInput,
                interpretedRange: [0, plotWidth],
              })
            : null,

          ticks: xTickSummary,
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

          bandwidth: yScaleMeta?.d3?.bandwidth ?? yScaleMeta?.bandwidth ?? null,
          step: yScaleMeta?.d3?.step ?? yScaleMeta?.step ?? null,

          paddingInner: yScaleMeta?.d3?.paddingInner ?? p.yPaddingInner ?? null,
          paddingOuter: yScaleMeta?.d3?.paddingOuter ?? p.yPaddingOuter ?? null,

          sourceScale: yScaleInput
            ? makeSourceScaleSummary({
                scaleInput: yScaleInput,
                interpretedRange: [0, -plotHeight],
              })
            : null,

          ticks: yTickSummary,
        }
      : null,
  };

  return {
    outputType: 'visual',
    version: '0.2',

    root: {
      nodeType: 'procedural',
      rendererType: 'd3-axis-system',
      id: `${ctx.nodeId}-d3-axis-system`,

      frame: {
        x: 0,
        y: 0,
        width: bounds.width,
        height: bounds.height,
        alignX: 'left',
        alignY: 'top',
      },

      transform: {
        x: 0,
        y: 0,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
      },

      renderPlan: {
        axisMode,

        plotWidth,
        plotHeight,

        x: showX
          ? {
              scaleType: xScaleType,
              domain: xDomain,
              range: [0, plotWidth],
              axisY: xAxisY,
              tickCount: xTickCount,
              tickValues: xIsDiscrete ? xDomain : null,
              paddingInner: xScaleMeta?.d3?.paddingInner ?? p.xPaddingInner ?? 0.1,
              paddingOuter: xScaleMeta?.d3?.paddingOuter ?? p.xPaddingOuter ?? 0.1,
            }
          : null,

        y: showY
          ? {
              scaleType: yScaleType,
              domain: yDomain,
              range: [0, -plotHeight],
              axisX: yAxisX,
              tickCount: yTickCount,
              tickValues: yIsDiscrete ? yDomain : null,
              paddingInner: yScaleMeta?.d3?.paddingInner ?? p.yPaddingInner ?? 0.1,
              paddingOuter: yScaleMeta?.d3?.paddingOuter ?? p.yPaddingOuter ?? 0.1,
            }
          : null,

        style: {
          strokeColor,
          strokeWidth,
          textColor,
          fontSize,
          tickSize,
          tickPadding,

          showDomainLine,
          showTickLines,
          showTickLabels,
        },

        origin: {
          showMarker: hasTrueOrigin,
          markerRadius: originMarkerRadius,
          labelOffsetX: originLabelOffsetX,
          fillColor: originMarkerFill,
          strokeColor,
          strokeWidth,
        },
      },

      geometrySummary: {
        bounds,
        plotSize: {
          width: plotWidth,
          height: plotHeight,
        },
      },

      semanticSummary: {
        role: axisMode === 'xy' ? 'axis-system' : 'axis',
        xScaleId: xScaleMeta?.scaleId ?? null,
        yScaleId: yScaleMeta?.scaleId ?? null,
      },

      interaction: null,
      bindings: [],

      meta: {
        role: axisMode === 'xy' ? 'axis-system' : 'axis',
        tags: ['d3-axis-generator', 'axis', axisMode, xScaleType, yScaleType],
        sourceNodeId: ctx.nodeId,
      },
    },

    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'D3 Axis Generator Output',
      outputRole: axisMode === 'xy' ? 'axis-system' : 'axis',
      warnings,

      provenance: [
        ...inputProvenance,
        ownProvenanceEntry,
      ],

      coordinateSystem,
      tickSummary: {
        x: xTickSummary,
        y: yTickSummary,
      },
    },
  };
}

function makeTickSummary({
  axis,
  scaleType,
  domain,
  scaleInput,
  length,
  tickCount,
  decimalPlaces,
}) {
  if (scaleType === 'band' || scaleType === 'point') {
    const items = scaleInput?.items;

    if (Array.isArray(items) && items.length > 0) {
      return items.map((item, index) => {
        const position = normalizeDiscretePositionFromItem({
          item,
          sourceScale: scaleInput.scale,
          length,
          preferredPosition: 'center',
        });

        return {
          value: item.category ?? item.value,
          label: String(item.category ?? item.value),
          position: axis === 'y' ? -position : position,
          visualPosition:
            axis === 'y'
              ? { x: 0, y: -position }
              : { x: position, y: 0 },
          normalized: null,
          source: `${scaleType}-scale-items`,
          index,
        };
      });
    }

    return (Array.isArray(domain) ? domain : []).map((value, index) => ({
      value,
      label: String(value),
      position: null,
      visualPosition: null,
      normalized: null,
      source: `${scaleType}-scale-domain`,
      index,
    }));
  }

  const scale = makeD3Scale({
    scaleType,
    domain,
    range: [0, length],
  });

  const values =
    typeof scale.ticks === 'function'
      ? scale.ticks(tickCount)
      : [];

  return values.map((value, index) => {
    const position = scale(value);

    return {
      value,
      label: formatNumber(value, decimalPlaces),
      position: axis === 'y' ? -position : position,
      visualPosition:
        axis === 'y'
          ? { x: 0, y: -position }
          : { x: position, y: 0 },
      normalized: null,
      source: 'd3-scale-ticks',
      index,
    };
  });
}

function makeD3Scale({ scaleType, domain, range }) {
  if (scaleType === 'band') {
    return scaleBand()
      .domain(Array.isArray(domain) ? domain : [])
      .range(range)
      .paddingInner(0.1)
      .paddingOuter(0.1);
  }

  if (scaleType === 'point') {
    return scalePoint()
      .domain(Array.isArray(domain) ? domain : [])
      .range(range)
      .padding(0.1);
  }

  if (scaleType === 'log') {
    const [d0, d1] = domain;

    if (d0 <= 0 || d1 <= 0) {
      return scaleSymlog().domain(domain).range(range);
    }

    return scaleLog().domain(domain).range(range);
  }

  if (scaleType === 'symlog') {
    return scaleSymlog().domain(domain).range(range);
  }

  if (scaleType === 'sqrt') {
    return scaleSqrt().domain(domain).range(range);
  }

  return scaleLinear().domain(domain).range(range);
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

function makeAxisBounds({
  plotWidth,
  plotHeight,
  xAxisY,
  yAxisX,
  labelSpace,
}) {
  const minX = Math.min(0, yAxisX) - labelSpace;
  const maxX = Math.max(plotWidth, yAxisX) + labelSpace;
  const minY = Math.min(-plotHeight, xAxisY) - labelSpace;
  const maxY = Math.max(0, xAxisY) + labelSpace;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
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

function mapLinearValue({
  value,
  domainMin,
  domainMax,
  length,
}) {
  if (domainMax === domainMin) return 0;

  return ((value - domainMin) / (domainMax - domainMin)) * length;
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

function isDiscretePositionScale(scaleType) {
  return scaleType === 'band' || scaleType === 'point';
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseCategoryDomain(value, fallback = []) {
  if (Array.isArray(value)) {
    const parsed = value
      .map((item) => String(item).trim())
      .filter(Boolean);

    return parsed.length > 0 ? uniqueValues(parsed) : fallback;
  }

  const parsed = String(value ?? '')
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed.length > 0 ? uniqueValues(parsed) : fallback;
}

function uniqueValues(values) {
  const result = [];
  const seen = new Set();

  values.forEach((value) => {
    const key = String(value);

    if (seen.has(key)) return;

    seen.add(key);
    result.push(value);
  });

  return result;
}