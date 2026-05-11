// src/renderer/renderSvgElement.jsx
import React from 'react';

export function renderSvgElement(spec) {
  if (!spec) return null;

  if (Array.isArray(spec)) {
    return spec.map((s, i) => (
      <g key={i}>
        {renderSvgElement(s)}
      </g>
    ));
  }

  switch (spec.kind) {
    case 'circle':
      return (
        <circle
          cx={spec.cx}
          cy={spec.cy}
          r={spec.r}
          fill={spec.fill ?? 'none'}
          stroke={spec.stroke}
          strokeWidth={spec.strokeWidth}
          opacity={spec.opacity}
        />
      );

    case 'rect':
      return (
        <rect
          x={spec.x}
          y={spec.y}
          width={spec.w}
          height={spec.h}
          rx={spec.rx}
          ry={spec.ry}
          fill={spec.fill ?? 'none'}
          stroke={spec.stroke}
          strokeWidth={spec.strokeWidth}
          opacity={spec.opacity}
        />
      );

    case 'line':
      return (
        <line
          x1={spec.x1}
          y1={spec.y1}
          x2={spec.x2}
          y2={spec.y2}
          stroke={spec.stroke ?? '#fff'}
          strokeWidth={spec.strokeWidth ?? 2}
          opacity={spec.opacity}
        />
      );

    case 'polyline':
      return (
        <polyline
          points={spec.points}
          fill="none"
          stroke={spec.stroke ?? '#fff'}
          strokeWidth={spec.strokeWidth ?? 2}
          opacity={spec.opacity}
        />
      );

    case 'polygon':
      return (
        <polygon
          points={spec.points}
          fill={spec.fill ?? 'none'}
          stroke={spec.stroke ?? '#fff'}
          strokeWidth={spec.strokeWidth ?? 2}
          opacity={spec.opacity}
        />
      );

    case 'path':
      return (
        <path
          d={spec.d}
          fill={spec.fill ?? 'none'}
          stroke={spec.stroke ?? '#fff'}
          strokeWidth={spec.strokeWidth ?? 2}
          opacity={spec.opacity}
        />
      );

    case 'text':
      return (
        <text
          x={spec.x}
          y={spec.y}
          fontSize={spec.fontSize ?? 12}
          fill={spec.fill ?? '#fff'}
        >
          {spec.text}
        </text>
      );

    case 'group':
      return (
        <g transform={spec.transform}>
          {renderSvgElement(spec.children)}
        </g>
      );

    default:
      return null;
  }
}