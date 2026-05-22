// src/CustomNodes/ScaleMapperNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  NumberField,
} from './UI/NodeFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

export default function ScaleMapperNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const domainMode = data.domainMode ?? 'auto';
  const domainBaseline = data.domainBaseline ?? 'zero';
  const scaleType = data.scaleType ?? 'linear';

  const isManualDomain = domainMode === 'manual';
  const isAutoDomain = domainMode === 'auto';
  const isCustomBaseline = domainBaseline === 'custom';

  return (
    <NodeShell
      title="Scale Mapper"
      subtitle="Maps raw data values into visual parameter values"
      badge="Mapper"
      footer="Output: scaled parameter"
    >
      <Handle
        type="target"
        id="input"
        position={Position.Left}
      />

      <Handle
        type="source"
        position={Position.Right}
      />

      <NodeSection
        nodeId={id}
        sectionId="scale"
        sectionCollapsed={data.sectionCollapsed}
        title="Scale"
        subtitle="Mapping type and domain source"
      >
        <SelectField
            label="Type"
            value={scaleType}
            onChange={(v) => update({ scaleType: v })}
            options={[
                { value: 'linear', label: 'Linear' },
                { value: 'log', label: 'Log' },
                { value: 'symlog', label: 'Symlog' },
                { value: 'sqrt', label: 'Sqrt' },
                { value: 'band', label: 'Band' },
                { value: 'point', label: 'Point' },
            ]}
        />

        <SelectField
          label="Domain"
          value={domainMode}
          onChange={(v) => update({ domainMode: v })}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'manual', label: 'Manual' },
          ]}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="autoDomain"
        sectionCollapsed={data.sectionCollapsed}
        title="Auto Domain"
        subtitle="How the automatic input range is expanded"
        defaultCollapsed={isManualDomain}
      >
        <SelectField
          label="Baseline"
          value={domainBaseline}
          onChange={(v) => update({ domainBaseline: v })}
          state={isManualDomain ? 'inactive' : 'normal'}
          note={isManualDomain ? 'manual' : undefined}
          options={[
            { value: 'zero', label: 'Include Zero' },
            { value: 'dataExtent', label: 'Data Extent' },
            { value: 'custom', label: 'Custom' },
          ]}
        />

        <NumberField
          label="Base Value"
          value={data.baselineValue ?? 0}
          onChange={(v) => update({ baselineValue: v })}
          state={
            isManualDomain
              ? 'inactive'
              : isCustomBaseline
                ? 'normal'
                : 'inactive'
          }
          note={
            isManualDomain
              ? 'manual'
              : isCustomBaseline
                ? undefined
                : 'inactive'
          }
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="manualDomain"
        sectionCollapsed={data.sectionCollapsed}
        title="Manual Domain"
        subtitle="Used only when Domain is set to Manual"
        defaultCollapsed={isAutoDomain}
      >
        <NumberField
          label="Min"
          value={data.domainMin ?? 0}
          onChange={(v) => update({ domainMin: v })}
          state={isAutoDomain ? 'inactive' : 'normal'}
          note={isAutoDomain ? 'auto' : undefined}
        />

        <NumberField
          label="Max"
          value={data.domainMax ?? 100}
          onChange={(v) => update({ domainMax: v })}
          state={isAutoDomain ? 'inactive' : 'normal'}
          note={isAutoDomain ? 'auto' : undefined}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="range"
        sectionCollapsed={data.sectionCollapsed}
        title="Range"
        subtitle="Output visual parameter range"
      >
        <NumberField
          label="Min"
          value={data.rangeMin ?? 0}
          onChange={(v) => update({ rangeMin: v })}
        />

        <NumberField
          label="Max"
          value={data.rangeMax ?? 100}
          onChange={(v) => update({ rangeMax: v })}
        />
      </NodeSection>

      {(scaleType === 'band' || scaleType === 'point') && (
        <NodeSection
        nodeId={id}
        sectionId="bandPoint"
        sectionCollapsed={data.sectionCollapsed}
        title="Band / Point"
        subtitle="Spacing settings for discrete scales"
        >
            {scaleType === 'band' && (
            <NumberField
                label="Inner Pad"
                value={data.paddingInner ?? 0.1}
                onChange={(v) => update({ paddingInner: v })}
                min={0}
                max={1}
                step={0.05}
            />
            )}

            {scaleType === 'band' && (
            <SelectField
                label="Band Pos"
                value={data.bandOutput ?? 'center'}
                onChange={(v) => update({ bandOutput: v })}
                options={[
                { value: 'center', label: 'Center' },
                { value: 'start', label: 'Start' },
                ]}
            />
            )}

            <NumberField
            label="Outer Pad"
            value={data.paddingOuter ?? 0.1}
            onChange={(v) => update({ paddingOuter: v })}
            min={0}
            max={1}
            step={0.05}
            />
        </NodeSection>
      )}

      <NodeSection
        nodeId={id}
        sectionId="options"
        sectionCollapsed={data.sectionCollapsed}
        title="Options"
        subtitle="Value handling"
        defaultCollapsed
      >
        <SelectField
          label="Clamp"
          value={String(data.clamp ?? true)}
          onChange={(v) => update({ clamp: v === 'true' })}
          options={[
            { value: 'true', label: 'On' },
            { value: 'false', label: 'Off' },
          ]}
        />
      </NodeSection>
    </NodeShell>
  );
}