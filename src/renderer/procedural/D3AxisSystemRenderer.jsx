// src/renderer/procedural/D3AxisSystemRenderer.jsx

import { useEffect, useRef } from 'react';
import { select } from 'd3-selection';
import { axisBottom, axisLeft } from 'd3-axis';
import {
  scaleLinear,
  scaleLog,
  scaleSymlog,
  scaleSqrt,
  scaleBand,
  scalePoint,
} from 'd3-scale';

export default function D3AxisSystemRenderer({ node }) {
  const ref = useRef(null);
  const plan = node.renderPlan ?? {};

  useEffect(() => {
    const root = select(ref.current);
    root.selectAll('*').remove();

    const style = plan.style ?? {};
    const origin = plan.origin ?? {};

    if (plan.x) {
      const xScale = makeScale(plan.x);

      const xAxis = axisBottom(xScale)
        .tickSize(style.tickSize ?? 6)
        .tickPadding(style.tickPadding ?? 4);

      if (isDiscreteScale(plan.x.scaleType)) {
        xAxis.tickValues(plan.x.tickValues ?? plan.x.domain ?? []);
      } else {
        xAxis.ticks(plan.x.tickCount ?? 5);
      }

      const gx = root
        .append('g')
        .attr('class', 'd3-axis d3-axis-x')
        .attr('transform', `translate(0, ${plan.x.axisY ?? 0})`);

      gx.call(xAxis);
      styleAxisGroup(gx, style);

      if (origin.showMarker) {
        const zeroTick = gx
          .selectAll('.tick')
          .filter((d) => Number(d) === 0);

        zeroTick.select('line').attr('display', 'none');

        zeroTick
          .select('text')
          .attr('dx', origin.labelOffsetX ?? 4);
      }
    }

    if (plan.y) {
      const yScale = makeScale(plan.y);

      const yAxis = axisLeft(yScale)
        .tickSize(style.tickSize ?? 6)
        .tickPadding(style.tickPadding ?? 4);

      if (isDiscreteScale(plan.y.scaleType)) {
        yAxis.tickValues(plan.y.tickValues ?? plan.y.domain ?? []);
      } else {
        yAxis.ticks(plan.y.tickCount ?? 5);
      }

      const gy = root
        .append('g')
        .attr('class', 'd3-axis d3-axis-y')
        .attr('transform', `translate(${plan.y.axisX ?? 0}, 0)`);

      gy.call(yAxis);
      styleAxisGroup(gy, style);

      if (origin.showMarker) {
        gy.selectAll('.tick')
          .filter((d) => Number(d) === 0)
          .remove();
      }
    }

    if (origin.showMarker) {
      const x = plan.y?.axisX ?? 0;
      const y = plan.x?.axisY ?? 0;
      const r = origin.markerRadius ?? 3;

      root
        .append('circle')
        .attr('class', 'd3-axis-origin-marker')
        .attr('cx', x)
        .attr('cy', y)
        .attr('r', r)
        .attr('fill', origin.fillColor ?? '#ffffff')
        .attr('stroke', origin.strokeColor ?? style.strokeColor ?? '#000000')
        .attr('stroke-width', origin.strokeWidth ?? style.strokeWidth ?? 1);
    }
  }, [plan]);

  return <g ref={ref} />;
}

function makeScale(axisPlan) {
  const domain = axisPlan.domain ?? [0, 1];
  const range = axisPlan.range ?? [0, 1];
  const type = axisPlan.scaleType ?? 'linear';

  if (type === 'band') {
    return scaleBand()
      .domain(Array.isArray(domain) ? domain : [])
      .range(range)
      .paddingInner(axisPlan.paddingInner ?? 0.1)
      .paddingOuter(axisPlan.paddingOuter ?? 0.1);
  }

  if (type === 'point') {
    return scalePoint()
      .domain(Array.isArray(domain) ? domain : [])
      .range(range)
      .padding(axisPlan.paddingOuter ?? 0.1);
  }

  if (type === 'log') {
    const [d0, d1] = domain;

    if (d0 <= 0 || d1 <= 0) {
      return scaleSymlog().domain(domain).range(range);
    }

    return scaleLog().domain(domain).range(range);
  }

  if (type === 'symlog') {
    return scaleSymlog().domain(domain).range(range);
  }

  if (type === 'sqrt') {
    return scaleSqrt().domain(domain).range(range);
  }

  return scaleLinear().domain(domain).range(range);
}

function styleAxisGroup(g, style) {
  const showDomainLine = style.showDomainLine ?? true;
  const showTickLines = style.showTickLines ?? true;
  const showTickLabels = style.showTickLabels ?? true;

  g.select('.domain')
    .attr('display', showDomainLine ? null : 'none')
    .attr('stroke', style.strokeColor ?? '#000000')
    .attr('stroke-width', style.strokeWidth ?? 1);

  g.selectAll('.tick line')
    .attr('display', showTickLines ? null : 'none')
    .attr('stroke', style.strokeColor ?? '#000000')
    .attr('stroke-width', style.strokeWidth ?? 1);

  g.selectAll('.tick text')
    .attr('display', showTickLabels ? null : 'none')
    .attr('fill', style.textColor ?? '#000000')
    .attr('font-size', style.fontSize ?? 10);
}

function isDiscreteScale(scaleType) {
  return scaleType === 'band' || scaleType === 'point';
}