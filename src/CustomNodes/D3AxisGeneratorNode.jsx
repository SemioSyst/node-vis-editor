// src/CustomNodes/D3AxisGeneratorNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  NumberField,
  ColorField,
  TextField,
} from './UI/NodeFields.jsx';
import { PortStatusRow } from './UI/PortFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';
import { useNodeInputStates } from './UI/useNodeInputStates.js';

export default function D3AxisGeneratorNode({ id, data }) {
  const update = useUpdateNodeData(id);
  const { isConnected } = useNodeInputStates(id);

  const axisMode = data.axisMode ?? 'xy';
  const showX = axisMode === 'x' || axisMode === 'xy';
  const showY = axisMode === 'y' || axisMode === 'xy';

  const xScaleControlled = showX && isConnected('xScale');
  const yScaleControlled = showY && isConnected('yScale');

  const xScaleType = data.xScaleType ?? data.scaleType ?? 'linear';
  const yScaleType = data.yScaleType ?? data.scaleType ?? 'linear';

  const xIsDiscrete = xScaleType === 'band' || xScaleType === 'point';
  const yIsDiscrete = yScaleType === 'band' || yScaleType === 'point';

  const scaleOptions = [
    { value: 'linear', label: 'Linear' },
    { value: 'log', label: 'Log' },
    { value: 'symlog', label: 'Symlog' },
    { value: 'sqrt', label: 'Sqrt' },
    { value: 'band', label: 'Band' },
    { value: 'point', label: 'Point' },
  ];

  return (
    <NodeShell
      title="D3 Axis Generator"
      subtitle="Generates axes with D3 axis renderer"
      badge="Generator"
      footer="Output: procedural axis system"
    >
      <Handle type="source" position={Position.Right} />

      <NodeSection title="Axis System" subtitle="Axis mode and scale type">
        <SelectField
          label="Mode"
          value={axisMode}
          onChange={(v) => update({ axisMode: v })}
          options={[
            { value: 'xy', label: 'X + Y' },
            { value: 'x', label: 'X Axis' },
            { value: 'y', label: 'Y Axis' },
          ]}
        />

        {showX && (
        <SelectField
            label="X Scale"
            value={xScaleType}
            onChange={(v) => update({ xScaleType: v })}
            state={xScaleControlled ? 'controlled' : 'normal'}
            note={xScaleControlled ? 'xScale' : undefined}
            options={[
            { value: 'linear', label: 'Linear' },
            { value: 'log', label: 'Log' },
            { value: 'symlog', label: 'Symlog' },
            { value: 'sqrt', label: 'Sqrt' },
            { value: 'band', label: 'Band' },
            { value: 'point', label: 'Point' },
            ]}
        />
        )}

        {showY && (
        <SelectField
            label="Y Scale"
            value={yScaleType}
            onChange={(v) => update({ yScaleType: v })}
            state={yScaleControlled ? 'controlled' : 'normal'}
            note={yScaleControlled ? 'yScale' : undefined}
            options={[
            { value: 'linear', label: 'Linear' },
            { value: 'log', label: 'Log' },
            { value: 'symlog', label: 'Symlog' },
            { value: 'sqrt', label: 'Sqrt' },
            { value: 'band', label: 'Band' },
            { value: 'point', label: 'Point' },
            ]}
        />
        )}
      </NodeSection>

      <NodeSection
        title="Scale Inputs"
        subtitle="Optional scale metadata from ScaleMapper"
      >
        {showX && (
          <PortStatusRow
            handleId="xScale"
            label="X Scale"
            status="domain / width"
            state={xScaleControlled ? 'controlled' : 'normal'}
          />
        )}

        {showY && (
          <PortStatusRow
            handleId="yScale"
            label="Y Scale"
            status="domain / height"
            state={yScaleControlled ? 'controlled' : 'normal'}
          />
        )}
      </NodeSection>

      <NodeSection title="Plot Size" subtitle="Local coordinate space size">
        <NumberField
          label="Width"
          value={data.plotWidth ?? 200}
          onChange={(v) => update({ plotWidth: v })}
          min={1}
          state={xScaleControlled ? 'controlled' : 'normal'}
          note={xScaleControlled ? 'xScale' : undefined}
        />

        <NumberField
          label="Height"
          value={data.plotHeight ?? 120}
          onChange={(v) => update({ plotHeight: v })}
          min={1}
          state={yScaleControlled ? 'controlled' : 'normal'}
          note={yScaleControlled ? 'yScale' : undefined}
        />
      </NodeSection>

      {showX && (
        <NodeSection
            title="X Domain"
            subtitle={xIsDiscrete ? 'Horizontal category domain' : 'Horizontal numeric range'}
        >
            {xIsDiscrete ? (
            <>
                <TextField
                label="X Cats"
                value={data.xCategories ?? 'A,B,C,D'}
                onChange={(v) => update({ xCategories: v })}
                state={xScaleControlled ? 'controlled' : 'normal'}
                note={xScaleControlled ? 'xScale' : undefined}
                placeholder="A,B,C,D"
                />

                {xScaleType === 'band' && (
                <NumberField
                    label="Inner Pad"
                    value={data.xPaddingInner ?? 0.1}
                    onChange={(v) => update({ xPaddingInner: v })}
                    min={0}
                    max={1}
                    step={0.05}
                    state={xScaleControlled ? 'controlled' : 'normal'}
                    note={xScaleControlled ? 'xScale' : undefined}
                />
                )}

                <NumberField
                label="Outer Pad"
                value={data.xPaddingOuter ?? 0.1}
                onChange={(v) => update({ xPaddingOuter: v })}
                min={0}
                max={1}
                step={0.05}
                state={xScaleControlled ? 'controlled' : 'normal'}
                note={xScaleControlled ? 'xScale' : undefined}
                />
            </>
            ) : (
            <>
                <NumberField
                label="X Min"
                value={data.xDomainMin ?? 0}
                onChange={(v) => update({ xDomainMin: v })}
                state={xScaleControlled ? 'controlled' : 'normal'}
                note={xScaleControlled ? 'xScale' : undefined}
                />

                <NumberField
                label="X Max"
                value={data.xDomainMax ?? 100}
                onChange={(v) => update({ xDomainMax: v })}
                state={xScaleControlled ? 'controlled' : 'normal'}
                note={xScaleControlled ? 'xScale' : undefined}
                />
            </>
            )}

            <NumberField
            label="X Ticks"
            value={data.xTickCount ?? 5}
            onChange={(v) => update({ xTickCount: v })}
            min={1}
            state={xIsDiscrete ? 'inactive' : 'normal'}
            note={xIsDiscrete ? 'categories' : undefined}
            />
        </NodeSection>
        )}

      {showY && (
        <NodeSection
            title="Y Domain"
            subtitle={yIsDiscrete ? 'Vertical category domain' : 'Vertical numeric range'}
        >
            {yIsDiscrete ? (
            <>
                <TextField
                label="Y Cats"
                value={data.yCategories ?? 'A,B,C,D'}
                onChange={(v) => update({ yCategories: v })}
                state={yScaleControlled ? 'controlled' : 'normal'}
                note={yScaleControlled ? 'yScale' : undefined}
                placeholder="A,B,C,D"
                />

                {yScaleType === 'band' && (
                <NumberField
                    label="Inner Pad"
                    value={data.yPaddingInner ?? 0.1}
                    onChange={(v) => update({ yPaddingInner: v })}
                    min={0}
                    max={1}
                    step={0.05}
                    state={yScaleControlled ? 'controlled' : 'normal'}
                    note={yScaleControlled ? 'yScale' : undefined}
                />
                )}

                <NumberField
                label="Outer Pad"
                value={data.yPaddingOuter ?? 0.1}
                onChange={(v) => update({ yPaddingOuter: v })}
                min={0}
                max={1}
                step={0.05}
                state={yScaleControlled ? 'controlled' : 'normal'}
                note={yScaleControlled ? 'yScale' : undefined}
                />
            </>
            ) : (
            <>
                <NumberField
                label="Y Min"
                value={data.yDomainMin ?? 0}
                onChange={(v) => update({ yDomainMin: v })}
                state={yScaleControlled ? 'controlled' : 'normal'}
                note={yScaleControlled ? 'yScale' : undefined}
                />

                <NumberField
                label="Y Max"
                value={data.yDomainMax ?? 100}
                onChange={(v) => update({ yDomainMax: v })}
                state={yScaleControlled ? 'controlled' : 'normal'}
                note={yScaleControlled ? 'yScale' : undefined}
                />
            </>
            )}

            <NumberField
            label="Y Ticks"
            value={data.yTickCount ?? 5}
            onChange={(v) => update({ yTickCount: v })}
            min={1}
            state={yIsDiscrete ? 'inactive' : 'normal'}
            note={yIsDiscrete ? 'categories' : undefined}
            />
        </NodeSection>
      )}

      <NodeSection title="Tick & Label" subtitle="D3 axis tick display">
        <NumberField
          label="Decimals"
          value={data.decimalPlaces ?? 0}
          onChange={(v) => update({ decimalPlaces: v })}
          min={0}
          max={6}
        />

        <NumberField
          label="Tick Size"
          value={data.tickSize ?? 6}
          onChange={(v) => update({ tickSize: v })}
          min={0}
        />

        <NumberField
          label="Tick Pad"
          value={data.tickPadding ?? 4}
          onChange={(v) => update({ tickPadding: v })}
          min={0}
        />

        <NumberField
          label="Font Size"
          value={data.fontSize ?? 10}
          onChange={(v) => update({ fontSize: v })}
          min={1}
        />
      </NodeSection>

      {axisMode === 'xy' && (
        <NodeSection title="Origin" subtitle="Shared origin marker for continuous 2D axes">
          <NumberField
            label="Marker R"
            value={data.originMarkerRadius ?? 3}
            onChange={(v) => update({ originMarkerRadius: v })}
            min={0}
            step={0.5}
          />

          <NumberField
            label="0 Offset X"
            value={data.originLabelOffsetX ?? 4}
            onChange={(v) => update({ originLabelOffsetX: v })}
            step={0.5}
          />
        </NodeSection>
      )}

      <NodeSection title="Display" subtitle="Axis component visibility">
        <SelectField
          label="Domain Line"
          value={String(data.showDomainLine ?? true)}
          onChange={(v) => update({ showDomainLine: v === 'true' })}
          options={[
            { value: 'true', label: 'Show' },
            { value: 'false', label: 'Hide' },
          ]}
        />

        <SelectField
          label="Tick Lines"
          value={String(data.showTickLines ?? true)}
          onChange={(v) => update({ showTickLines: v === 'true' })}
          options={[
            { value: 'true', label: 'Show' },
            { value: 'false', label: 'Hide' },
          ]}
        />

        <SelectField
          label="Labels"
          value={String(data.showTickLabels ?? true)}
          onChange={(v) => update({ showTickLabels: v === 'true' })}
          options={[
            { value: 'true', label: 'Show' },
            { value: 'false', label: 'Hide' },
          ]}
        />
      </NodeSection>

      <NodeSection title="Style" subtitle="Axis line, tick and label appearance">
        <ColorField
          label="Stroke"
          value={data.strokeColor ?? '#000000'}
          onChange={(v) => update({ strokeColor: v })}
        />

        <NumberField
          label="Stroke W"
          value={data.strokeWidth ?? 1}
          onChange={(v) => update({ strokeWidth: v })}
          step={0.5}
          min={0}
        />

        <ColorField
          label="Text"
          value={data.textColor ?? '#000000'}
          onChange={(v) => update({ textColor: v })}
        />

        <ColorField
          label="Origin Fill"
          value={data.originMarkerFill ?? '#ffffff'}
          onChange={(v) => update({ originMarkerFill: v })}
        />
      </NodeSection>
    </NodeShell>
  );
}