// src/evaluator/generators/evalShapeGenerator.js

const STRUCTURAL_HANDLES = [
  'x',
  'y',
  'width',
  'height',
  'radius',
  'cornerRadius',
  'alignX',
  'alignY',
];

const STYLE_HANDLES = [
  'fill',
  'stroke',
  'strokeWidth',
  'opacity',
];

export function evalShapeGenerator(ctx) {
  const params = ctx.params ?? {};
  const warnings = [];

  const shapeType = params.shapeType ?? 'rect';

  const inputsByHandle = ctx.inputs?.byTargetHandle ?? {};

  const hasFrameInput = hasHandleInput(inputsByHandle, 'frame');
  const hasStyleInput = hasHandleInput(inputsByHandle, 'style');

  const streams = buildParamStreams({
    ctx,
    params,
    inputsByHandle,
    hasFrameInput,
    hasStyleInput,
    warnings,
  });

  const count = inferElementCount(streams, warnings);

  const children = [];

  for (let index = 0; index < count; index++) {
    const resolved = resolveElementParams({
      index,
      shapeType,
      params,
      streams,
      hasFrameInput,
      hasStyleInput,
    });

    children.push(makeShapeElement({
      ctx,
      index,
      shapeType,
      resolved,
    }));
  }

  return {
    outputType: 'visual',
    version: '0.1',

    root: {
        nodeType: 'collection',
        id: `${ctx.nodeId}-collection`,

        transform: {
        x: 0,
        y: 0,
        rotate: 0,
        scaleX: 1,
        scaleY: 1,
        origin: 'center',
        },

        interaction: null,
        bindings: [],

        children,

        meta: {
        role: 'generated-shapes',
        tags: ['shape-generator', shapeType],
        sourceNodeId: ctx.nodeId,

        layout: {
            type: 'linear',
            axis: params.layoutAxis ?? 'x',
            gapX: params.layoutGapX ?? 18,
            gapY: params.layoutGapY ?? 18,
        },

        resolved: {
            count,
        },
        },
    },

    meta: {
        sourceNodeId: ctx.nodeId,
        label: 'Shape Generator Output',
        outputRole: 'generated-visual-collection',
        warnings,
        resolvedCount: count,
    },
    };
}

/**
 * Build all parameter streams.
 * Each stream can be:
 * - scalar
 * - array
 * - missing
 */
function buildParamStreams({
  ctx,
  params,
  inputsByHandle,
  hasFrameInput,
  hasStyleInput,
  warnings,
}) {
  const streams = {};

  // Advanced grouped input: frame
    const frameOutput = getFirstInputValue(inputsByHandle, 'frame');
    if (frameOutput) {
    const frameFields = extractFieldSet(frameOutput, 'frame');

    if (frameFields) {
        streams.x = makeStreamFromRawValue(frameFields.x, 'x', 'structural');
        streams.y = makeStreamFromRawValue(frameFields.y, 'y', 'structural');
        streams.width = makeStreamFromRawValue(frameFields.width, 'width', 'structural');
        streams.height = makeStreamFromRawValue(frameFields.height, 'height', 'structural');

        // New frame alignment fields.
        streams.alignX = makeStreamFromRawValue(frameFields.alignX, 'alignX', 'structural');
        streams.alignY = makeStreamFromRawValue(frameFields.alignY, 'alignY', 'structural');

        // Optional backward compatibility for older "anchor" field.
        if ((frameFields.alignX == null || frameFields.alignY == null) && frameFields.anchor) {
            const align = parseAnchor(frameFields.anchor);
            if (frameFields.alignX == null) {
                streams.alignX = makeStreamFromRawValue(align.x, 'alignX', 'structural');
            }
            if (frameFields.alignY == null) {
                streams.alignY = makeStreamFromRawValue(align.y, 'alignY', 'structural');
            }
        }
    } else {
        warnings.push('Frame input connected but no readable frame fields were found.');
    }
    }

  // Advanced grouped input: style
  const styleOutput = getFirstInputValue(inputsByHandle, 'style');
  if (styleOutput) {
    const styleFields = extractFieldSet(styleOutput, 'style');

    if (styleFields) {
      streams.fill = makeStreamFromRawValue(styleFields.fill, 'fill', 'style');
      streams.stroke = makeStreamFromRawValue(styleFields.stroke, 'stroke', 'style');
      streams.strokeWidth = makeStreamFromRawValue(styleFields.strokeWidth, 'strokeWidth', 'style');
      streams.opacity = makeStreamFromRawValue(styleFields.opacity, 'opacity', 'style');
    } else {
      warnings.push('Style input connected but no readable style fields were found.');
    }
  }

  // Low-level property inputs.
  // In v0.1, advanced grouped inputs win over low-level inputs.
  for (const handle of STRUCTURAL_HANDLES) {
    if (hasFrameInput && ['x', 'y', 'width', 'height', 'alignX', 'alignY'].includes(handle)) {
        if (hasHandleInput(inputsByHandle, handle)) {
            warnings.push(`"${handle}" input ignored because frame input is active.`);
        }
        continue;
    }

    const output = getFirstInputValue(inputsByHandle, handle);
    if (output) {
      streams[handle] = makeStreamFromOutput(output, handle, 'structural', warnings);
    }
  }

  for (const handle of STYLE_HANDLES) {
    if (hasStyleInput) {
      if (hasHandleInput(inputsByHandle, handle)) {
        warnings.push(`"${handle}" input ignored because style input is active.`);
      }
      continue;
    }

    const output = getFirstInputValue(inputsByHandle, handle);
    if (output) {
      streams[handle] = makeStreamFromOutput(output, handle, 'style', warnings);
    }
  }

  // Data input can still help infer count if connected.
  const dataOutput = getFirstInputValue(inputsByHandle, 'data');
  if (dataOutput) {
    streams.data = makeStreamFromOutput(dataOutput, 'data', 'data', warnings);
  }

  return streams;
}

function hasHandleInput(inputsByHandle, handleId) {
  return Boolean(inputsByHandle?.[handleId]?.length);
}

function getFirstInputValue(inputsByHandle, handleId) {
  return inputsByHandle?.[handleId]?.[0]?.value ?? null;
}

/**
 * Convert data/parameter output into a generic stream.
 */
function makeStreamFromOutput(output, targetHandle, role, warnings) {
  if (!output) {
    return makeMissingStream(targetHandle, role);
  }

  // Field set: target handle extracts matching field.
  // Example:
  // fieldSetType: 'frame', fields: { x: [...], y: [...] }
  if (output.outputType === 'parameter' && output.fields) {
    const fieldValue = output.fields[targetHandle];

    if (fieldValue !== undefined) {
      return makeStreamFromRawValue(fieldValue, targetHandle, role);
    }

    warnings.push(`Input for "${targetHandle}" has fields but no field named "${targetHandle}".`);
    return makeMissingStream(targetHandle, role);
  }

  if (output.outputType === 'data') {
    if (output.dataType === 'array') {
      return makeStreamFromRawValue(output.values, targetHandle, role);
    }

    if (output.dataType === 'number') {
      return makeStreamFromRawValue(output.value, targetHandle, role);
    }

    warnings.push(`Data input for "${targetHandle}" has unsupported dataType "${output.dataType}".`);
    return makeMissingStream(targetHandle, role);
  }

  if (output.outputType === 'parameter') {
    if ('values' in output) {
      return makeStreamFromRawValue(output.values, targetHandle, role);
    }

    if ('value' in output) {
      return makeStreamFromRawValue(output.value, targetHandle, role);
    }

    warnings.push(`Parameter input for "${targetHandle}" has no value or values.`);
    return makeMissingStream(targetHandle, role);
  }

  warnings.push(`Input for "${targetHandle}" has unsupported outputType "${output.outputType}".`);
  return makeMissingStream(targetHandle, role);
}

function extractFieldSet(output, expectedFieldSetType) {
  if (!output) return null;

  if (output.outputType !== 'parameter') return null;

  if (output.parameterType === 'fieldSet' && output.fieldSetType === expectedFieldSetType) {
    return output.fields ?? null;
  }

  // Allow specialized names later, e.g. frameField/styleField.
  if (expectedFieldSetType === 'frame' && output.parameterType === 'frameField') {
    return output.fields ?? null;
  }

  if (expectedFieldSetType === 'style' && output.parameterType === 'styleField') {
    return output.fields ?? null;
  }

  return null;
}

function makeStreamFromRawValue(rawValue, handleId, role) {
  if (rawValue === undefined || rawValue === null) {
    return makeMissingStream(handleId, role);
  }

  if (Array.isArray(rawValue)) {
    return {
      handleId,
      role,
      kind: 'array',
      values: rawValue,
      length: rawValue.length,
      connected: true,
    };
  }

  return {
    handleId,
    role,
    kind: 'scalar',
    value: rawValue,
    length: 1,
    connected: true,
  };
}

function makeMissingStream(handleId, role) {
  return {
    handleId,
    role,
    kind: 'missing',
    connected: false,
    length: 0,
  };
}

/**
 * Count rule v0.1:
 * 1. Structural arrays decide count by shortest length.
 * 2. If no structural arrays, data array can decide count.
 * 3. Style arrays do not decide count by themselves.
 * 4. Otherwise count = 1.
 */
function inferElementCount(streams, warnings) {
  const structuralArrays = Object.values(streams).filter(
    (s) => s?.role === 'structural' && s.kind === 'array'
  );

  if (structuralArrays.length > 0) {
    const lengths = structuralArrays.map((s) => s.length);
    const min = Math.min(...lengths);
    const max = Math.max(...lengths);

    if (min !== max) {
      warnings.push(
        `Structural input length mismatch (${lengths.join(', ')}). Using shortest length ${min}.`
      );
    }

    return Math.max(0, min);
  }

  if (streams.data?.kind === 'array') {
    return streams.data.length;
  }

  return 1;
}

function resolveElementParams({
  index,
  shapeType,
  params,
  streams,
}) {
  const layoutPoint = resolveLocalLayoutPoint(index, params, streams);

  const x = resolveParam({
    stream: streams.x,
    index,
    fallback: layoutPoint.x ?? params.defaultX ?? 0,
    repeatStyle: false,
  });

  const y = resolveParam({
    stream: streams.y,
    index,
    fallback: layoutPoint.y ?? params.defaultY ?? 0,
    repeatStyle: false,
  });

  const width = resolveParam({
    stream: streams.width,
    index,
    fallback: params.defaultWidth ?? 12,
    repeatStyle: false,
  });

  const height = resolveParam({
    stream: streams.height,
    index,
    fallback: params.defaultHeight ?? 40,
    repeatStyle: false,
  });

  const radius = resolveParam({
    stream: streams.radius,
    index,
    fallback: params.defaultRadius ?? 8,
    repeatStyle: false,
  });

  const cornerRadius = resolveParam({
    stream: streams.cornerRadius,
    index,
    fallback: params.cornerRadius ?? 0,
    repeatStyle: false,
  });

  const alignX = resolveParam({
    stream: streams.alignX,
    index,
    fallback: params.alignX ?? getDefaultAlignX(shapeType),
    repeatStyle: false,
  });

  const alignY = resolveParam({
    stream: streams.alignY,
    index,
    fallback: params.alignY ?? getDefaultAlignY(shapeType),
    repeatStyle: false,
  });

  const fill = resolveParam({
    stream: streams.fill,
    index,
    fallback: params.fillColor ?? '#5b78ff',
    repeatStyle: true,
  });

  const stroke = resolveParam({
    stream: streams.stroke,
    index,
    fallback: params.strokeColor ?? '#000000',
    repeatStyle: true,
  });

  const strokeWidth = resolveParam({
    stream: streams.strokeWidth,
    index,
    fallback: params.strokeWidth ?? 2,
    repeatStyle: true,
  });

  const opacity = resolveParam({
    stream: streams.opacity,
    index,
    fallback: params.opacity ?? 1,
    repeatStyle: true,
  });

  return {
    x,
    y,
    width,
    height,
    radius,
    cornerRadius,
    alignX,
    alignY,
    fill,
    stroke,
    strokeWidth,
    opacity,
  };
}

function resolveParam({ stream, index, fallback, repeatStyle }) {
  if (!stream || stream.kind === 'missing') return fallback;

  if (stream.kind === 'scalar') return stream.value;

  if (stream.kind === 'array') {
    if (index < stream.values.length) {
      return stream.values[index];
    }

    if (repeatStyle && stream.values.length > 0) {
      return stream.values[stream.values.length - 1];
    }

    return fallback;
  }

  return fallback;
}

function resolveLocalLayoutPoint(index, params, streams) {
  const hasXInput = streams.x?.connected;
  const hasYInput = streams.y?.connected;

  // If both x and y are driven, layout should not affect position.
  if (hasXInput && hasYInput) {
    return { x: params.defaultX ?? 0, y: params.defaultY ?? 0 };
  }

  const axis = params.layoutAxis ?? 'x';
  const gapX = Number(params.layoutGapX ?? 6);
  const gapY = Number(params.layoutGapY ?? 6);

  const fallbackX = Number(params.defaultX ?? 0);
  const fallbackY = Number(params.defaultY ?? 0);

  if (axis === 'y') {
    return {
      x: hasXInput ? fallbackX : 0,
      y: hasYInput ? fallbackY : index * gapY,
    };
  }

  return {
    x: hasXInput ? fallbackX : index * gapX,
    y: hasYInput ? fallbackY : 0,
  };
}

function makeShapeElement({ ctx, index, shapeType, resolved }) {
  const frame = makeFrame({ shapeType, resolved });
  const content = makeContent({ shapeType, resolved });

  return {
    nodeType: 'element',
    id: `${ctx.nodeId}-${shapeType}-${index}`,
    role: 'mark',
    tags: ['shape', shapeType],

    dataRef: {
      index,
      inputValues: {
        x: resolved.x,
        y: resolved.y,
        width: resolved.width,
        height: resolved.height,
        radius: resolved.radius,
        fill: resolved.fill,
        opacity: resolved.opacity,
      },
    },

    elementType: 'graphic',
    frame,

    transform: {
      x: 0,
      y: 0,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      origin: 'center',
    },

    content,

    style: makeVisualStyle(resolved),

    interaction: null,
    bindings: [],

    meta: {
      sourceNodeId: ctx.nodeId,
    },
  };
}

function makeFrame({ shapeType, resolved }) {
  if (shapeType === 'circle') {
    const size = resolved.radius * 2;

    return makeAlignedFrame({
      x: resolved.x,
      y: resolved.y,
      width: size,
      height: size,
      alignX: resolved.alignX ?? 'center',
      alignY: resolved.alignY ?? 'center',
    });
  }

  return makeAlignedFrame({
    x: resolved.x,
    y: resolved.y,
    width: resolved.width,
    height: resolved.height,
    alignX: resolved.alignX ?? 'center',
    alignY: resolved.alignY ?? 'center',
  });
}

function makeAlignedFrame({ x, y, width, height, alignX, alignY }) {
  const safeWidth = Number(width) || 0;
  const safeHeight = Number(height) || 0;

  const offset = getAlignOffset(alignX, alignY, safeWidth, safeHeight);

  return {
    x: Number(x ?? 0) - offset.x,
    y: Number(y ?? 0) - offset.y,
    width: safeWidth,
    height: safeHeight,
    alignX,
    alignY,
  };
}

function getAlignOffset(alignX, alignY, width, height) {
  const x =
    alignX === 'center'
      ? width / 2
      : alignX === 'right'
        ? width
        : 0;

  const y =
    alignY === 'center'
      ? height / 2
      : alignY === 'bottom'
        ? height
        : 0;

  return { x, y };
}

function parseAnchor(anchor) {
  switch (anchor) {
    case 'top-left':
      return { x: 'left', y: 'top' };
    case 'top-center':
      return { x: 'center', y: 'top' };
    case 'top-right':
      return { x: 'right', y: 'top' };
    case 'center-left':
      return { x: 'left', y: 'center' };
    case 'center':
      return { x: 'center', y: 'center' };
    case 'center-right':
      return { x: 'right', y: 'center' };
    case 'bottom-left':
      return { x: 'left', y: 'bottom' };
    case 'bottom-center':
      return { x: 'center', y: 'bottom' };
    case 'bottom-right':
      return { x: 'right', y: 'bottom' };
    default:
      return { x: 'left', y: 'top' };
  }
}

function getDefaultAlignX(shapeType) {
  if (shapeType === 'circle') return 'center';
  return 'left';
}

function getDefaultAlignY(shapeType) {
  if (shapeType === 'circle') return 'center';
  if (shapeType === 'rect') return 'bottom';
  return 'top';
}

function makeContent({ shapeType, resolved }) {
  if (shapeType === 'circle') {
    return {
        contentType: 'shape',
        shape: {
            shapeType: 'circle',
            cx: resolved.radius,
            cy: resolved.radius,
            r: resolved.radius,
        },
    };
    }

  if (shapeType === 'line') {
    return {
      contentType: 'shape',
      shape: {
        shapeType: 'line',
        x1: 0,
        y1: 0,
        x2: resolved.width,
        y2: resolved.height,
      },
    };
  }

  return {
    contentType: 'shape',
    shape: {
      shapeType: 'rect',
      x: 0,
      y: 0,
      width: resolved.width,
      height: resolved.height,
      rx: resolved.cornerRadius,
      ry: resolved.cornerRadius,
    },
  };
}

function makeVisualStyle(resolved) {
  return {
    fill: {
      type: resolved.fill === 'none' ? 'none' : 'solid',
      color: resolved.fill === 'none' ? undefined : resolved.fill,
    },

    stroke: {
      enabled: resolved.stroke !== 'none',
      color: resolved.stroke === 'none' ? undefined : resolved.stroke,
      width: resolved.strokeWidth,
    },

    opacity: clampNumber(resolved.opacity, 0, 1),
  };
}

function clampNumber(value, min, max) {
  const n = Number(value);

  if (!Number.isFinite(n)) return min;

  return Math.max(min, Math.min(max, n));
}