// src/CustomNodes/AxisGeneratorNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  NumberField,
  ColorField,
} from './UI/NodeFields.jsx';
import { PortStatusRow } from './UI/PortFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';
import { useNodeInputStates } from './UI/useNodeInputStates.js';

export default function AxisGeneratorNode({ id, data }) {
  const update = useUpdateNodeData(id);
  const { isConnected } = useNodeInputStates(id);

  const axisMode = data.axisMode ?? 'xy';
  const showX = axisMode === 'x' || axisMode === 'xy';
  const showY = axisMode === 'y' || axisMode === 'xy';

  const xScaleControlled = showX && isConnected('xScale');
  const yScaleControlled = showY && isConnected('yScale');

  return (
    <NodeShell
      title="Axis Generator"
      subtitle="Generates linear axes or a 2D coordinate system"
      badge="Generator"
      footer="Output: visual axis system"
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

        <SelectField
          label="Scale"
          value={data.scaleType ?? 'linear'}
          onChange={(v) => update({ scaleType: v })}
          options={[
            { value: 'linear', label: 'Linear' },
            { value: 'log', label: 'Log (later)' },
            { value: 'time', label: 'Time (later)' },
            { value: 'band', label: 'Band (later)' },
          ]}
        />
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
          disabled={xScaleControlled}
        />

        <NumberField
          label="Height"
          value={data.plotHeight ?? 120}
          onChange={(v) => update({ plotHeight: v })}
          min={1}
          disabled={yScaleControlled}
        />
      </NodeSection>

      {showX && (
        <NodeSection title="X Domain" subtitle="Horizontal numeric range">
          <NumberField
            label="X Min"
            value={data.xDomainMin ?? 0}
            onChange={(v) => update({ xDomainMin: v })}
            disabled={xScaleControlled}
          />

          <NumberField
            label="X Max"
            value={data.xDomainMax ?? 100}
            onChange={(v) => update({ xDomainMax: v })}
            disabled={xScaleControlled}
          />

          <NumberField
            label="X Ticks"
            value={data.xTickCount ?? 5}
            onChange={(v) => update({ xTickCount: v })}
            min={1}
          />
        </NodeSection>
      )}

      {showY && (
        <NodeSection title="Y Domain" subtitle="Vertical numeric range">
          <NumberField
            label="Y Min"
            value={data.yDomainMin ?? 0}
            onChange={(v) => update({ yDomainMin: v })}
            disabled={yScaleControlled}
          />

          <NumberField
            label="Y Max"
            value={data.yDomainMax ?? 100}
            onChange={(v) => update({ yDomainMax: v })}
            disabled={yScaleControlled}
          />

          <NumberField
            label="Y Ticks"
            value={data.yTickCount ?? 5}
            onChange={(v) => update({ yTickCount: v })}
            min={1}
          />
        </NodeSection>
      )}

      <NodeSection title="Tick & Label" subtitle="Tick marks and numeric labels">
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
          label="Label Off"
          value={data.labelOffset ?? 18}
          onChange={(v) => update({ labelOffset: v })}
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
        <NodeSection
          title="Origin"
          subtitle="Shared origin marker in 2D axis mode"
        >
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
      </NodeSection>
    </NodeShell>
  );
}