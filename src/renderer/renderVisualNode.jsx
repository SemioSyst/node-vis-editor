// src/renderer/renderVisualNode.jsx

import { renderSvgElement } from './renderSvgElement.jsx';
import ProceduralRenderer from './procedural/ProceduralRenderer.jsx';
import { makeRuntimeRefFromNode } from '../runtime/references/runtimeRefs.js';
import { buildReactRuntimeEventProps } from '../runtime/adapters/react/runtimeEvents.js';
import { applyRuntimeOverridesToNode } from '../runtime/overrides/runtimeOverrides.js';
import { getRuntimeDomAttributes } from '../runtime/adapters/react/runtimeDomAttributes.js';

function buildTransform(node) {
  const frame = node.frame ?? {};
  const transform = node.transform ?? {};

  const parts = [];

  const fx = toNumber(frame.x, 0);
  const fy = toNumber(frame.y, 0);
  if (fx !== 0 || fy !== 0) {
    parts.push(`translate(${fx} ${fy})`);
  }

  const tx = toNumber(transform.x, 0);
  const ty = toNumber(transform.y, 0);
  if (tx !== 0 || ty !== 0) {
    parts.push(`translate(${tx} ${ty})`);
  }

  const rotate = toNumber(transform.rotate, 0);
  if (rotate !== 0) {
    const origin = resolveTransformOrigin(transform, frame);

    if (origin) {
      parts.push(`rotate(${rotate} ${origin.x} ${origin.y})`);
    } else {
      parts.push(`rotate(${rotate})`);
    }
  }

  const scaleX = toNumber(transform.scaleX, 1);
  const scaleY = toNumber(transform.scaleY, 1);
  if (scaleX !== 1 || scaleY !== 1) {
    parts.push(`scale(${scaleX} ${scaleY})`);
  }

  return parts.length ? parts.join(' ') : undefined;
}

function resolveTransformOrigin(transform, frame) {
  if (!transform.origin || transform.origin === 'local') return null;

  const width = toNumber(frame.width, 0);
  const height = toNumber(frame.height, 0);

  if (transform.origin === 'center') {
    return {
      x: width / 2,
      y: height / 2,
    };
  }

  if (transform.origin === 'top-left') {
    return { x: 0, y: 0 };
  }

  if (transform.origin === 'bottom-left') {
    return { x: 0, y: height };
  }

  if (transform.origin === 'bottom-center') {
    return { x: width / 2, y: height };
  }

  if (typeof transform.origin === 'object') {
    return {
      x: toNumber(transform.origin.x, 0),
      y: toNumber(transform.origin.y, 0),
    };
  }

  return null;
}

function getFill(style = {}, fallback = undefined) {
  if (style.fill?.type === 'none') return 'none';
  if (style.fill?.color) return style.fill.color;
  if (typeof style.fill === 'string') return style.fill;
  return fallback;
}

function getStroke(style = {}) {
  const enabled = Boolean(style.stroke?.enabled);

  if (!enabled) {
    return {
      stroke: 'none',
      strokeWidth: 0,
      strokeEnabled: false,
    };
  }

  return {
    stroke: style.stroke?.color ?? style.stroke ?? '#000000',
    strokeWidth: style.stroke?.width ?? style.strokeWidth ?? 1,
    strokeEnabled: true,
  };
}

function getCommonSvgStyle(style = {}) {
  const { stroke, strokeWidth } = getStroke(style);

  return {
    fill: getFill(style),
    stroke,
    strokeWidth,
    opacity: style.opacity,
    strokeLinecap: style.strokeLinecap,
    strokeLinejoin: style.strokeLinejoin,
    strokeDasharray: style.strokeDasharray,
    vectorEffect: style.vectorEffect,
  };
}

function getElementDataAttributes(node) {
  const tags =
    node.dataRef?.tags ??
    node.meta?.tags ??
    node.dataRef?.matrixItem?.tags ??
    node.meta?.matrixItem?.tags ??
    null;

  return {
    'data-node-id': node.id,
    'data-element-type': node.elementType,
    'data-role': node.role,
    'data-generator-node-id': node.dataRef?.generatorNodeId,
    'data-collection-id': node.dataRef?.collectionId,
    'data-index': node.dataRef?.index,
    'data-flat-index': node.dataRef?.flatIndex,
    'data-row-index': node.dataRef?.rowIndex,
    'data-col-index': node.dataRef?.colIndex,
    'data-tags': tags ? JSON.stringify(tags) : undefined,
  };
}

function getGroupDataAttributes(node) {
  return {
    'data-node-id': node.id,
    'data-node-type': node.nodeType,
    'data-role': node.role ?? node.meta?.role,
    'data-layer-id': node.meta?.layerId,
    'data-layer-index': node.meta?.layerIndex,
    'data-source-node-id': node.meta?.sourceNodeId,
  };
}

function buildInteractionProps(node) {
  const interaction = node.interaction;
  if (!interaction) return {};

  const events = interaction.events ?? {};
  const props = {};

  if (events.click) {
    props.onClick = (evt) => {
      if (interaction.stopPropagation) {
        evt.stopPropagation();
      }

      if (events.click.action === 'log') {
        console.log('[Renderer interaction: click]', {
          nodeId: node.id,
          payload: events.click.payload,
          node,
        });
      }
    };
  }

  if (events.hover) {
    props.onMouseEnter = () => {
      if (events.hover.action === 'log') {
        console.log('[Renderer interaction: hover enter]', {
          nodeId: node.id,
          payload: events.hover.payload,
          node,
        });
      }
    };

    props.onMouseLeave = () => {
      if (events.hover.action === 'log') {
        console.log('[Renderer interaction: hover leave]', {
          nodeId: node.id,
          payload: events.hover.payload,
          node,
        });
      }
    };

    if (events.hover.cursor) {
      props.style = {
        cursor: events.hover.cursor,
      };
    }
  }

  return props;
}

function renderHitArea(node) {
  const interaction = node.interaction;
  const frame = node.frame ?? {};

  if (interaction?.hitArea !== 'bounds') return null;

  const width = frame.width ?? 100;
  const height = frame.height ?? 100;

  return (
    <rect
      x={0}
      y={0}
      width={width}
      height={height}
      fill="transparent"
      pointerEvents="all"
    />
  );
}

function renderElementContent(node) {
  const content = node.content ?? {};

  switch (content.contentType) {
    case 'legacySvg':
      return renderSvgElement(content.spec);

    case 'shape':
      return renderShapeContent(node);

    case 'text':
      return renderTextContent(node);

    case 'image':
      return renderImageContent(node);

    default:
      console.warn('[renderElementContent] Unsupported content:', content, node);
      return null;
  }
}

function renderShapeContent(node) {
  const content = node.content ?? {};
  const shape = content.shape ?? {};
  const shapeType = shape.shapeType ?? shape.kind;
  const styleProps = getCommonSvgStyle(node.style);

  switch (shapeType) {
    case 'circle':
      return (
        <circle
          cx={shape.cx ?? 0}
          cy={shape.cy ?? 0}
          r={shape.r ?? 10}
          {...styleProps}
          {...getElementDataAttributes(node)}
        />
      );

    case 'rect':
      return (
        <rect
          x={shape.x ?? 0}
          y={shape.y ?? 0}
          width={shape.width ?? shape.w ?? 40}
          height={shape.height ?? shape.h ?? 40}
          rx={shape.rx}
          ry={shape.ry}
          {...styleProps}
          {...getElementDataAttributes(node)}
        />
      );

    case 'line':
      return (
        <line
          x1={shape.x1 ?? 0}
          y1={shape.y1 ?? 0}
          x2={shape.x2 ?? 100}
          y2={shape.y2 ?? 0}
          {...styleProps}
          {...getElementDataAttributes(node)}
        />
      );

    case 'path':
      return (
        <path
          d={shape.d ?? ''}
          {...styleProps}
          {...getElementDataAttributes(node)}
        />
      );

    case 'polygon':
      return (
        <polygon
          points={shape.points ?? ''}
          {...styleProps}
          {...getElementDataAttributes(node)}
        />
      );

    case 'polyline':
      return (
        <polyline
          points={shape.points ?? ''}
          {...styleProps}
          {...getElementDataAttributes(node)}
        />
      );

    default:
      console.warn('[renderShapeContent] Unsupported shape type:', shapeType, node);
      return null;
  }
}

function renderTextContent(node) {
  const content = node.content ?? {};
  const style = node.style ?? {};

  const fill = getFill(style, '#000000');
  const { stroke, strokeWidth, strokeEnabled } = getStroke(style);

  return (
    <text
      x={content.x ?? 0}
      y={content.y ?? 0}
      fontSize={content.fontSize ?? style.text?.fontSize ?? 14}
      fontFamily={content.fontFamily ?? style.text?.fontFamily}
      fontWeight={content.fontWeight ?? style.text?.fontWeight}
      textAnchor={content.textAnchor ?? 'start'}
      dominantBaseline={content.dominantBaseline ?? 'auto'}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      paintOrder={strokeEnabled ? 'stroke fill' : undefined}
      opacity={style.opacity ?? 1}
      {...getElementDataAttributes(node)}
    >
      {content.text ?? ''}
    </text>
  );
}

function renderImageContent(node) {
  const content = node.content ?? {};

  return (
    <image
      href={content.src}
      x={content.x ?? 0}
      y={content.y ?? 0}
      width={content.width ?? node.frame?.width ?? 100}
      height={content.height ?? node.frame?.height ?? 100}
      preserveAspectRatio={content.preserveAspectRatio ?? 'xMidYMid meet'}
      opacity={node.style?.opacity ?? 1}
      {...getElementDataAttributes(node)}
    />
  );
}

function renderElementNode(node, ctx) {
  const transform = buildTransform(node);
  const interactionProps = buildInteractionProps(node);

  const runtimeRef = makeRuntimeRefFromNode(node, {
    scopeIds: ctx.runtimeScopes ?? [],
  });
  const runtimeProps = buildReactRuntimeEventProps(runtimeRef, ctx.runtime);
  const renderNode = applyRuntimeOverridesToNode(node, runtimeRef, ctx.runtime);

  return (
    <g
      key={ctx.key ?? node.id}
      transform={transform}
      opacity={node.opacity}
      {...getRuntimeDomAttributes(node, {
        scopeIds: ctx.runtimeScopes ?? [],
      })}
      {...interactionProps}
      {...runtimeProps}
    >
      {renderHitArea(node)}
      {renderElementContent(renderNode)}
      {(node.children ?? []).map((child, i) =>
        renderVisualNode(child, { ...ctx, key: `${node.id}-child-${i}` })
      )}
    </g>
  );
}

function renderGroupLikeNode(node, ctx) {
  const transform = buildTransform(node);
  const interactionProps = buildInteractionProps(node);

  return (
    <g
      key={ctx.key ?? node.id}
      transform={transform}
      opacity={node.opacity}
      {...getGroupDataAttributes(node)}
      {...interactionProps}
    >
      {renderHitArea(node)}
      {(node.children ?? []).map((child, i) =>
        renderVisualNode(child, {
          ...ctx,
          key: `${node.id}-child-${i}`,
          runtimeScopes: [
            ...(ctx.runtimeScopes ?? []),
            node.id,
            node.meta?.originalId,
          ].filter(Boolean),
        })
      )}
    </g>
  );
}

function renderProceduralNode(node, ctx) {
  const transform = buildTransform(node);
  const interactionProps = buildInteractionProps(node);

  return (
    <g
      key={ctx.key ?? node.id}
      transform={transform}
      opacity={node.opacity}
      {...getGroupDataAttributes(node)}
      {...interactionProps}
    >
      {renderHitArea(node)}

      <ProceduralRenderer
        node={node}
        renderFrame={ctx.renderFrame}
        renderOptions={ctx.renderOptions}
        ctx={ctx}
      />

      {(node.children ?? []).map((child, i) =>
        renderVisualNode(child, {
          ...ctx,
          key: `${node.id}-child-${i}`,
          runtimeScopes: [
            ...(ctx.runtimeScopes ?? []),
            node.id,
            node.meta?.originalId,
          ].filter(Boolean),
        })
      )}
    </g>
  );
}

export function renderVisualNode(node, ctx = {}) {
  if (!node) return null;

  if (Array.isArray(node)) {
    return node.map((child, i) =>
      renderVisualNode(child, { ...ctx, key: `array-child-${i}` })
    );
  }

  // Legacy escape hatch
  if (node.kind) {
    return renderSvgElement(node);
  }

  switch (node.nodeType) {
    case 'element':
      return renderElementNode(node, ctx);

    case 'collection':
    case 'container':
    case 'layer':
      return renderGroupLikeNode(node, ctx);

    case 'procedural':
      return renderProceduralNode(node, ctx);

    default:
      console.warn('[renderVisualNode] Unsupported visual node:', node);
      return null;
  }
}

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}