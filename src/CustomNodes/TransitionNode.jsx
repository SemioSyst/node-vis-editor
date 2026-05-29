// src/CustomNodes/TransitionNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  NumberField,
} from './UI/NodeFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

const MODE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'direct', label: 'Direct' },
  { value: 'crossfade', label: 'Crossfade' },
];

const EASING_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'easeIn', label: 'Ease In' },
  { value: 'easeOut', label: 'Ease Out' },
  { value: 'easeInOut', label: 'Ease In Out' },
  { value: 'cubicInOut', label: 'Cubic In Out' },
];

const GEOMETRY_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'direct', label: 'Direct' },
  { value: 'crossfade', label: 'Crossfade' },
];

const COLOR_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'interpolate', label: 'Interpolate' },
  { value: 'direct', label: 'Direct' },
];

const OPACITY_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'interpolate', label: 'Interpolate' },
  { value: 'direct', label: 'Direct' },
];

const PATH_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'points', label: 'Points if Possible' },
  { value: 'crossfade', label: 'Crossfade' },
  { value: 'direct', label: 'Direct' },
];

const TEXT_OPTIONS = [
  { value: 'crossfade', label: 'Crossfade' },
  { value: 'direct', label: 'Direct' },
];

const STAGGER_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'index', label: 'By Index' },
  { value: 'row', label: 'By Row' },
  { value: 'column', label: 'By Column' },
];

export default function TransitionNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const mode = data.transitionMode ?? 'auto';
  const staggerType = data.staggerType ?? 'none';

  return (
    <NodeShell
      nodeId={id}
      title="Transition"
      subtitle="Controls how states change over time"
      badge="Motion"
      footer="Output: visual with transition"
      collapsed={data.collapsed}
    >
      <Handle
        type="target"
        id="visual"
        position={Position.Left}
      />

      <Handle
        type="source"
        position={Position.Right}
      />

      <NodeSection
        nodeId={id}
        sectionId="timing"
        sectionCollapsed={data.sectionCollapsed}
        title="Timing"
        subtitle="Duration and easing"
        ports={['visual']}
      >
        <SelectField
          label="Mode"
          value={mode}
          onChange={(v) => update({ transitionMode: v })}
          options={MODE_OPTIONS}
        />

        <NumberField
          label="Duration"
          value={data.duration ?? 600}
          onChange={(v) => update({ duration: v })}
          min={0}
          step={50}
        />

        <SelectField
          label="Easing"
          value={data.easing ?? 'easeInOut'}
          onChange={(v) => update({ easing: v })}
          options={EASING_OPTIONS}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="interpolation"
        sectionCollapsed={data.sectionCollapsed}
        title="Interpolation"
        subtitle="How visual differences are interpreted"
        defaultCollapsed
      >
        <SelectField
          label="Geometry"
          value={data.geometryMode ?? 'auto'}
          onChange={(v) => update({ geometryMode: v })}
          options={GEOMETRY_OPTIONS}
        />

        <SelectField
          label="Color"
          value={data.colorMode ?? 'auto'}
          onChange={(v) => update({ colorMode: v })}
          options={COLOR_OPTIONS}
        />

        <SelectField
          label="Opacity"
          value={data.opacityMode ?? 'auto'}
          onChange={(v) => update({ opacityMode: v })}
          options={OPACITY_OPTIONS}
        />

        <SelectField
          label="Path"
          value={data.pathMode ?? 'auto'}
          onChange={(v) => update({ pathMode: v })}
          options={PATH_OPTIONS}
        />

        <SelectField
          label="Text"
          value={data.textMode ?? 'crossfade'}
          onChange={(v) => update({ textMode: v })}
          options={TEXT_OPTIONS}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="stagger"
        sectionCollapsed={data.sectionCollapsed}
        title="Stagger"
        subtitle="Optional delay between elements"
        defaultCollapsed
      >
        <SelectField
          label="Stagger"
          value={staggerType}
          onChange={(v) => update({ staggerType: v })}
          options={STAGGER_OPTIONS}
        />

        {staggerType !== 'none' && (
          <NumberField
            label="Amount"
            value={data.staggerAmount ?? 20}
            onChange={(v) => update({ staggerAmount: v })}
            min={0}
            step={5}
          />
        )}
      </NodeSection>
    </NodeShell>
  );
}