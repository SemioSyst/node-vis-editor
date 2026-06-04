// src/CustomNodes/SliderNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  NumberField,
  ColorField,
} from './UI/NodeFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

import './SliderNode.css';

export default function SliderNode({ id, data }) {
  const update = useUpdateNodeData(id);

  return (
    <NodeShell
      nodeId={id}
      title="Slider"
      subtitle="Visual control that outputs progress"
      badge="Control"
      footer="Outputs: visual + event"
      collapsed={data.collapsed}
    >
      <NodeSection
        nodeId={id}
        sectionId="value"
        sectionCollapsed={data.sectionCollapsed}
        title="Value"
        subtitle="Slider range and initial value"
      >
        <NumberField
          label="Min"
          value={data.min ?? 0}
          onChange={(v) => update({ min: v })}
          step={1}
        />

        <NumberField
          label="Max"
          value={data.max ?? 100}
          onChange={(v) => update({ max: v })}
          step={1}
        />

        <NumberField
          label="Initial"
          value={data.initialValue ?? 50}
          onChange={(v) => update({ initialValue: v })}
          step={1}
        />

        <NumberField
          label="Step"
          value={data.step ?? 1}
          onChange={(v) => update({ step: v })}
          min={0}
          step={1}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="layout"
        sectionCollapsed={data.sectionCollapsed}
        title="Layout"
        subtitle="Slider visual size"
      >
        <NumberField
          label="Width"
          value={data.width ?? 240}
          onChange={(v) => update({ width: v })}
          min={40}
          step={10}
        />

        <NumberField
          label="Track H"
          value={data.trackHeight ?? 6}
          onChange={(v) => update({ trackHeight: v })}
          min={1}
          step={1}
        />

        <NumberField
        label="Track Radius"
        value={data.trackRadius ?? 3}
        onChange={(v) => update({ trackRadius: v })}
        min={0}
        step={1}
        />

        <NumberField
          label="Handle R"
          value={data.handleRadius ?? 9}
          onChange={(v) => update({ handleRadius: v })}
          min={2}
          step={1}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="style"
        sectionCollapsed={data.sectionCollapsed}
        title="Style"
        subtitle="Slider colours"
        defaultCollapsed
      >
        <ColorField
          label="Track"
          value={data.trackColor ?? '#333333'}
          onChange={(v) => update({ trackColor: v })}
        />

        <ColorField
          label="Active"
          value={data.activeColor ?? '#6f86ff'}
          onChange={(v) => update({ activeColor: v })}
        />

        <ColorField
          label="Handle"
          value={data.handleColor ?? '#ffffff'}
          onChange={(v) => update({ handleColor: v })}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="outputs"
        sectionCollapsed={data.sectionCollapsed}
        title="Outputs"
        subtitle="Connect visual to a group and event to States"
      >
        <SliderOutputRow
          id="visual"
          label="Visual"
          description="Slider graphics"
        />

        <SliderOutputRow
          id="event"
          label="Event"
          description="Progress driver"
        />
      </NodeSection>
    </NodeShell>
  );
}

function SliderOutputRow({
  id,
  label,
  description,
}) {
  return (
    <div className="slider-output-row">
      <div className="slider-output-row__text">
        <div className="slider-output-row__label">
          {label}
        </div>
        <div className="slider-output-row__description">
          {description}
        </div>
      </div>

      <Handle
        type="source"
        id={id}
        position={Position.Right}
        className="slider-output-row__handle"
      />
    </div>
  );
}