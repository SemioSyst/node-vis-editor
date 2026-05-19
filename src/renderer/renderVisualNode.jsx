// src/renderer/renderVisualNode.jsx

import { renderSvgElement } from './renderSvgElement.jsx';

function buildTransform(node) {
  const frame = node.frame ?? {};
  const transform = node.transform ?? {};

  const parts = [];

  // v0.1: frame.x/y means local origin position in parent coordinate system.
  // anchor is reserved for later resolver support.
  const fx = frame.x ?? 0;
  const fy = frame.y ?? 0;
  if (fx !== 0 || fy !== 0) {
    parts.push(`translate(${fx} ${fy})`);
  }

  const tx = transform.x ?? 0;
  const ty = transform.y ?? 0;
  if (tx !== 0 || ty !== 0) {
    parts.push(`translate(${tx} ${ty})`);
  }

  const rotate = transform.rotate ?? 0;
  if (rotate !== 0) {
    parts.push(`rotate(${rotate})`);
  }

  const scaleX = transform.scaleX ?? 1;
  const scaleY = transform.scaleY ?? 1;
  if (scaleX !== 1 || scaleY !== 1) {
    parts.push(`scale(${scaleX} ${scaleY})`);
  }

  return parts.length ? parts.join(' ') : undefined;
}

function svgStyleFromVisualStyle(style = {}) {
  const fill =
    style.fill?.type === 'none'
      ? 'none'
      : style.fill?.color ?? style.fill ?? undefined;

  const strokeEnabled = style.stroke?.enabled;
  const stroke =
    strokeEnabled === false
      ? undefined
      : style.stroke?.color ?? style.stroke ?? undefined;

  const strokeWidth =
    style.stroke?.width ?? style.strokeWidth ?? undefined;

  return {
    fill,
    stroke,
    strokeWidth,
    opacity: style.opacity,
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

function renderShapeContent(node) {
  const content = node.content ?? {};

  if (content.contentType === 'legacySvg') {
    return renderSvgElement(content.spec);
  }

  if (content.contentType === 'shape') {
    const shape = content.shape ?? {};
    const shapeType = shape.shapeType ?? shape.kind;
    const styleProps = svgStyleFromVisualStyle(node.style);

    switch (shapeType) {
      case 'circle':
        return (
          <circle
            cx={shape.cx ?? 0}
            cy={shape.cy ?? 0}
            r={shape.r ?? 10}
            {...styleProps}
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
          />
        );

      case 'path':
        return (
          <path
            d={shape.d}
            {...styleProps}
          />
        );

      default:
        return null;
    }
  }

  if (content.contentType === 'text') {
    const style = node.style ?? {};
    return (
      <text
        x={content.x ?? 0}
        y={content.y ?? 0}
        fontSize={content.fontSize ?? style.text?.fontSize ?? 14}
        fontFamily={content.fontFamily ?? style.text?.fontFamily}
        fontWeight={content.fontWeight ?? style.text?.fontWeight}
        fill={style.fill?.color ?? style.fill ?? '#000'}
        textAnchor={content.textAnchor}
        dominantBaseline={content.dominantBaseline}
      >
        {content.text ?? ''}
      </text>
    );
  }

  if (content.contentType === 'image') {
    return (
      <image
        href={content.src}
        x={content.x ?? 0}
        y={content.y ?? 0}
        width={content.width ?? node.frame?.width ?? 100}
        height={content.height ?? node.frame?.height ?? 100}
        preserveAspectRatio={content.preserveAspectRatio ?? 'xMidYMid meet'}
      />
    );
  }

  return null;
}

function renderElementNode(node, ctx) {
  const transform = buildTransform(node);
  const interactionProps = buildInteractionProps(node);

  return (
    <g
      key={node.id}
      transform={transform}
      {...interactionProps}
    >
      {renderHitArea(node)}
      {renderShapeContent(node)}
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
      key={node.id}
      transform={transform}
      opacity={node.opacity}
      {...interactionProps}
    >
      {renderHitArea(node)}
      {(node.children ?? []).map((child, i) =>
        renderVisualNode(child, { ...ctx, key: `${node.id}-child-${i}` })
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

    default:
      console.warn('[renderVisualNode] Unsupported visual node:', node);
      return null;
  }
}