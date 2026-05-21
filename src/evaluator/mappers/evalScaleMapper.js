// src/evaluator/mappers/evalScaleMapper.js
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

export function evalScaleMapper(ctx) {
  const p = ctx.params ?? {};
  const warnings = [];

  const scaleType = p.scaleType ?? 'linear';
  const domainMode = p.domainMode ?? 'auto';
  const domainBaseline = p.domainBaseline ?? 'zero';
  const baselineValue = toNumber(p.baselineValue, 0);

  const rangeMin = toNumber(p.rangeMin, 0);
  const rangeMax = toNumber(p.rangeMax, 100);
  const clamp = p.clamp ?? true;

  const isDiscreteScale = isDiscreteScaleType(scaleType);
  const bandOutput = p.bandOutput ?? 'center';

  const inputOutput = getFirstInputValue(ctx, 'input');
  const inputInfo = normalizeInputValues(inputOutput, { scaleType });

  if (!inputInfo) {
    return {
      outputType: 'parameter',
      version: '0.1',
      parameterType: 'numberArray',
      values: [],
      meta: {
        sourceNodeId: ctx.nodeId,
        role: 'scaled-parameter',
        label: 'Scaled Parameter',
        warnings: ['No readable input connected to ScaleMapper.'],
        provenance: [
          makeProvenanceEntry({
            nodeId: ctx.nodeId,
            role: 'scale-mapper',
            outputType: 'parameter',
            parameterType: 'numberArray',
            label: 'Scaled Parameter',
            transform: {
              type: 'scale',
              scaleType,
              status: 'no-input',
            },
          }),
        ],
      },
    };
  }

  const inputValues = inputInfo.values;

  const rawAutoDomain = isDiscreteScale
    ? null
    : getRawAutoDomain(inputValues);

  const autoDomain = isDiscreteScale
    ? null
    : applyAutoDomainBaseline({
        rawMin: rawAutoDomain.min,
        rawMax: rawAutoDomain.max,
        domainBaseline,
        baselineValue,
      });

  const domainMin =
    !isDiscreteScale && domainMode === 'manual'
      ? toNumber(p.domainMin, autoDomain.min)
      : autoDomain?.min;

  const domainMax =
    !isDiscreteScale && domainMode === 'manual'
      ? toNumber(p.domainMax, autoDomain.max)
      : autoDomain?.max;

  if (!isDiscreteScale && domainMax === domainMin) {
    warnings.push('domainMax equals domainMin. All mapped values use rangeMin.');
  }

  if (
    !isDiscreteScale &&
    domainMode === 'auto' &&
    domainBaseline === 'dataExtent' &&
    rawAutoDomain.min > 0 &&
    rangeMin === 0
  ) {
    warnings.push(
      'This scale maps the data minimum to the range minimum. If the range minimum visually represents zero, this may exaggerate differences.'
    );
  }

  const d3ScaleInfo = createD3Scale({
    scaleType,
    inputValues,
    domain: isDiscreteScale ? null : [domainMin, domainMax],
    range: [rangeMin, rangeMax],
    clamp,
    paddingInner: toNumber(p.paddingInner, 0.1),
    paddingOuter: toNumber(p.paddingOuter, 0.1),
    bandOutput,
    warnings,
  });

  const mappedValues = inputValues.map((value) => {
    const mapped = mapValueWithD3Scale(d3ScaleInfo, value);
    return Number.isFinite(Number(mapped)) ? Number(mapped) : null;
  });

  const zeroOutputValue =
    !isDiscreteScale &&
    d3ScaleInfo.canMapZero &&
    domainIncludesZero(domainMin, domainMax)
      ? d3ScaleInfo.scale(0)
      : null;

  const parameterType =
    inputInfo.kind === 'scalar' ? 'number' : 'numberArray';

  const scaleMeta = {
    scaleId: `${ctx.nodeId}-scale`,
    scaleType: d3ScaleInfo.resolvedScaleType,
    requestedScaleType: scaleType,

    scaleFamily: d3ScaleInfo.scaleFamily,

    domainMode,
    domainBaseline: isDiscreteScale ? null : domainBaseline,
    baselineValue: isDiscreteScale ? null : baselineValue,

    rawAutoDomain: isDiscreteScale
      ? null
      : [rawAutoDomain.min, rawAutoDomain.max],

    autoDomain: isDiscreteScale
      ? null
      : [autoDomain.min, autoDomain.max],

    domain: d3ScaleInfo.domainForMeta,
    range: [rangeMin, rangeMax],
    clamp: isDiscreteScale ? null : clamp,

    zeroInputValue:
      !isDiscreteScale && domainIncludesZero(domainMin, domainMax) ? 0 : null,

    zeroOutputValue,

    parameterSpace: 'visual',

    // Important for downstream nodes:
    // For band, values are currently band start positions.
    // AxisGenerator should usually use meta.items.center for tick positions.
    outputPosition: d3ScaleInfo.outputPosition,

    d3: {
      scaleFamily: d3ScaleInfo.scaleFamily,
      bandwidth: d3ScaleInfo.bandwidth,
      step: d3ScaleInfo.step,
      paddingInner: d3ScaleInfo.paddingInner,
      paddingOuter: d3ScaleInfo.paddingOuter,
    },

    warnings,
  };

  const inheritedProvenance = inheritProvenance(inputOutput);

  const ownProvenanceEntry = makeProvenanceEntry({
    nodeId: ctx.nodeId,
    role: 'scale-mapper',
    outputType: 'parameter',
    parameterType,
    label: 'Scaled Parameter',
    scale: scaleMeta,
    transform: {
      type: 'scale',
      scaleType: d3ScaleInfo.resolvedScaleType,
      requestedScaleType: scaleType,

      domainMode,
      domainBaseline: isDiscreteScale ? null : domainBaseline,
      baselineValue: isDiscreteScale ? null : baselineValue,

      rawAutoDomain: isDiscreteScale
        ? null
        : [rawAutoDomain.min, rawAutoDomain.max],

      autoDomain: isDiscreteScale
        ? null
        : [autoDomain.min, autoDomain.max],

      domain: d3ScaleInfo.domainForMeta,
      range: [rangeMin, rangeMax],
      clamp: isDiscreteScale ? null : clamp,

      outputPosition: d3ScaleInfo.outputPosition,
    },
  });

  const output = {
    outputType: 'parameter',
    version: '0.1',

    parameterType,

    meta: {
      sourceNodeId: ctx.nodeId,
      role: 'scaled-parameter',
      label: 'Scaled Parameter',
      warnings,

      provenance: [
        ...inheritedProvenance,
        ownProvenanceEntry,
      ],

      input: {
        sourceNodeId: inputInfo.sourceNodeId,
        outputType: inputOutput?.outputType,
        dataType: inputOutput?.dataType,
        parameterType: inputOutput?.parameterType,
        rawValues: inputInfo.rawValues,
        values: inputValues,
        valueType: inputInfo.valueType,
        meta: inputOutput?.meta ?? null,
      },

      scale: scaleMeta,

      // Used by AxisGenerator / ChartSpace / later binding nodes.
      // For band:
      //   ShapeGenerator.x can use output.values as band starts.
      //   AxisGenerator ticks should use item.center.
      //   ShapeGenerator.width can later use scale.d3.bandwidth.
      items: d3ScaleInfo.items,
    },
  };

  if (parameterType === 'number') {
    output.value = mappedValues[0] ?? 0;
  } else {
    output.values = mappedValues;
  }

  return output;
}

function getFirstInputValue(ctx, handleId) {
  return ctx.inputs?.byTargetHandle?.[handleId]?.[0]?.value ?? null;
}

function normalizeInputValues(output, { scaleType }) {
  if (!output) return null;

  const isDiscreteScale = isDiscreteScaleType(scaleType);

  if (output.outputType === 'data') {
    if (output.dataType === 'number') {
      const rawValues = [output.value];

      return {
        kind: 'scalar',
        values: isDiscreteScale
          ? rawValues.map((v) => String(v))
          : rawValues.map((v) => toNumber(v, 0)),
        rawValues,
        valueType: isDiscreteScale ? 'category' : 'number',
        sourceNodeId: output.meta?.sourceNodeId,
      };
    }

    if (output.dataType === 'array') {
      const rawValues = output.values ?? [];

      const values = isDiscreteScale
        ? rawValues
            .map((v) => String(v).trim())
            .filter((v) => v.length > 0)
        : rawValues
            .map((v) => Number(v))
            .filter(Number.isFinite);

      return {
        kind: 'array',
        values,
        rawValues,
        valueType: isDiscreteScale ? 'category' : 'number',
        sourceNodeId: output.meta?.sourceNodeId,
      };
    }
  }

  if (output.outputType === 'parameter') {
    if ('value' in output) {
      const rawValues = [output.value];

      return {
        kind: 'scalar',
        values: isDiscreteScale
          ? rawValues.map((v) => String(v))
          : rawValues.map((v) => toNumber(v, 0)),
        rawValues,
        valueType: isDiscreteScale ? 'category' : 'number',
        sourceNodeId: output.meta?.sourceNodeId,
      };
    }

    if (Array.isArray(output.values)) {
      const rawValues = output.values;

      const values = isDiscreteScale
        ? rawValues
            .map((v) => String(v).trim())
            .filter((v) => v.length > 0)
        : rawValues
            .map((v) => Number(v))
            .filter(Number.isFinite);

      return {
        kind: 'array',
        values,
        rawValues,
        valueType: isDiscreteScale ? 'category' : 'number',
        sourceNodeId: output.meta?.sourceNodeId,
      };
    }
  }

  return null;
}

function getRawAutoDomain(values) {
  const valid = values.filter(Number.isFinite);

  if (!valid.length) {
    return { min: 0, max: 1 };
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);

  if (min === max) {
    if (min === 0) {
      return { min: 0, max: 1 };
    }

    return {
      min,
      max,
    };
  }

  return { min, max };
}

function applyAutoDomainBaseline({
  rawMin,
  rawMax,
  domainBaseline,
  baselineValue,
}) {
  if (domainBaseline === 'zero') {
    return {
      min: Math.min(0, rawMin),
      max: Math.max(0, rawMax),
    };
  }

  if (domainBaseline === 'custom') {
    const b = Number(baselineValue);

    if (!Number.isFinite(b)) {
      return {
        min: rawMin,
        max: rawMax,
      };
    }

    return {
      min: Math.min(b, rawMin),
      max: Math.max(b, rawMax),
    };
  }

  return {
    min: rawMin,
    max: rawMax,
  };
}

function createD3Scale({
  scaleType,
  inputValues,
  domain,
  range,
  clamp,
  paddingInner,
  paddingOuter,
  bandOutput,
  warnings,
}) {
  const resolvedType = scaleType ?? 'linear';

  if (resolvedType === 'band') {
    const domainValues = uniqueValues(inputValues);

    const scale = scaleBand()
      .domain(domainValues)
      .range(range)
      .paddingInner(clampNumber(paddingInner, 0, 1))
      .paddingOuter(clampNumber(paddingOuter, 0, 1));

    const bandwidth = scale.bandwidth();
    const step = scale.step();

    const items = makeBandItems({
      scale,
      domainValues,
      bandwidth,
    });

    const outputPosition = bandOutput === 'start' ? 'start' : 'center';

    return {
      scale,
      resolvedScaleType: 'band',
      scaleFamily: 'discrete-position',
      domainForMeta: domainValues,
      bandwidth,
      step,
      paddingInner: scale.paddingInner(),
      paddingOuter: scale.paddingOuter(),
      outputPosition,
      canMapZero: false,
      items,
    };
  }

  if (resolvedType === 'point') {
    const domainValues = uniqueValues(inputValues);

    const scale = scalePoint()
      .domain(domainValues)
      .range(range)
      .padding(clampNumber(paddingOuter, 0, 1));

    const step = scale.step();

    return {
      scale,
      resolvedScaleType: 'point',
      scaleFamily: 'discrete-position',
      domainForMeta: domainValues,
      bandwidth: 0,
      step,
      paddingInner: null,
      paddingOuter: scale.padding(),
      outputPosition: 'point',
      canMapZero: false,
      items: makePointItems({
        scale,
        domainValues,
      }),
    };
  }

  if (resolvedType === 'log') {
    const [d0, d1] = domain;

    if (d0 <= 0 || d1 <= 0) {
      warnings.push(
        'Log scale requires a positive domain. Symlog scale is used as a safer fallback.'
      );

      const scale = scaleSymlog()
        .domain(domain)
        .range(range)
        .clamp(Boolean(clamp));

      return makeContinuousScaleInfo({
        scale,
        resolvedScaleType: 'symlog',
        domain,
        canMapZero: true,
      });
    }

    const scale = scaleLog()
      .domain(domain)
      .range(range)
      .clamp(Boolean(clamp));

    return makeContinuousScaleInfo({
      scale,
      resolvedScaleType: 'log',
      domain,
      canMapZero: false,
    });
  }

  if (resolvedType === 'symlog') {
    const scale = scaleSymlog()
      .domain(domain)
      .range(range)
      .clamp(Boolean(clamp));

    return makeContinuousScaleInfo({
      scale,
      resolvedScaleType: 'symlog',
      domain,
      canMapZero: true,
    });
  }

  if (resolvedType === 'sqrt') {
    const scale = scaleSqrt()
      .domain(domain)
      .range(range)
      .clamp(Boolean(clamp));

    return makeContinuousScaleInfo({
      scale,
      resolvedScaleType: 'sqrt',
      domain,
      canMapZero: true,
    });
  }

  const scale = scaleLinear()
    .domain(domain)
    .range(range)
    .clamp(Boolean(clamp));

  return makeContinuousScaleInfo({
    scale,
    resolvedScaleType: 'linear',
    domain,
    canMapZero: true,
  });
}

function makeContinuousScaleInfo({
  scale,
  resolvedScaleType,
  domain,
  canMapZero,
}) {
  return {
    scale,
    resolvedScaleType,
    scaleFamily: 'continuous-position',
    domainForMeta: domain,
    bandwidth: null,
    step: null,
    paddingInner: null,
    paddingOuter: null,
    outputPosition: 'value',
    canMapZero,
    items: null,
  };
}

function makeBandItems({ scale, domainValues, bandwidth }) {
  return domainValues.map((category, index) => {
    const start = scale(category);
    const safeStart = Number.isFinite(Number(start)) ? Number(start) : null;

    return {
      index,
      category,
      value: category,

      position: safeStart,
      start: safeStart,
      center: safeStart == null ? null : safeStart + bandwidth / 2,
      end: safeStart == null ? null : safeStart + bandwidth,

      bandwidth,
    };
  });
}

function makePointItems({ scale, domainValues }) {
  return domainValues.map((category, index) => {
    const position = scale(category);
    const safePosition = Number.isFinite(Number(position))
      ? Number(position)
      : null;

    return {
      index,
      category,
      value: category,

      position: safePosition,
      start: safePosition,
      center: safePosition,
      end: safePosition,

      bandwidth: 0,
    };
  });
}

function isDiscreteScaleType(scaleType) {
  return scaleType === 'band' || scaleType === 'point';
}

function domainIncludesZero(domainMin, domainMax) {
  const min = Math.min(domainMin, domainMax);
  const max = Math.max(domainMin, domainMax);

  return min <= 0 && max >= 0;
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

function clampNumber(value, min, max) {
  const n = Number(value);

  if (!Number.isFinite(n)) return min;

  return Math.max(min, Math.min(max, n));
}

function mapValueWithD3Scale(scaleInfo, value) {
  const base = scaleInfo.scale(value);

  if (!Number.isFinite(Number(base))) return null;

  if (
    scaleInfo.resolvedScaleType === 'band' &&
    scaleInfo.outputPosition === 'center'
  ) {
    return Number(base) + scaleInfo.bandwidth / 2;
  }

  return Number(base);
}