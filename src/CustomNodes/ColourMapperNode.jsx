// src/CustomNodes/ColourMapperNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  NumberField,
  TextareaField,
  ColorField,
} from './UI/NodeFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';
import ColourRampPreview from './UI/ColourRampPreview.jsx';

import {
  SEQUENTIAL_COLOUR_SCHEME_OPTIONS,
  DIVERGING_COLOUR_SCHEME_OPTIONS,
  CATEGORICAL_COLOUR_SCHEME_OPTIONS,
} from '../evaluator/mappers/colorSchemes.js';

const COLOUR_MODE_OPTIONS = [
  { value: 'sequential', label: 'Sequential' },
  { value: 'diverging', label: 'Diverging' },
  { value: 'categorical', label: 'Categorical' },
  { value: 'manual', label: 'Manual' },
];

const DOMAIN_MODE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'manual', label: 'Manual' },
];

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'On' },
  { value: 'false', label: 'Off' },
];

export default function ColourMapperNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const colourMode = data.colourMode ?? 'sequential';
  const domainMode = data.domainMode ?? 'auto';

  const showNumericDomain =
    colourMode === 'sequential' ||
    colourMode === 'diverging';

  const showDiverging =
    colourMode === 'diverging';

  const showCategorical =
    colourMode === 'categorical';

  const showManual =
    colourMode === 'manual';

  return (
    <NodeShell
      nodeId={id}
      title="Colour Mapper"
      subtitle="Maps values, categories, arrays, or matrices to colour parameters"
      badge="Mapper"
      footer="Output: colour parameter"
      collapsed={data.collapsed}
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
        sectionId="mapping"
        sectionCollapsed={data.sectionCollapsed}
        title="Mapping"
        subtitle="Colour scale type and preset"
        ports={['input']}
      >
        <SelectField
          label="Mode"
          value={colourMode}
          onChange={(v) => update({ colourMode: v })}
          options={COLOUR_MODE_OPTIONS}
        />

        {colourMode === 'sequential' && (
          <SelectField
            label="Scheme"
            value={data.sequentialScheme ?? 'viridis'}
            onChange={(v) => update({ sequentialScheme: v })}
            options={SEQUENTIAL_COLOUR_SCHEME_OPTIONS}
          />
        )}

        {colourMode === 'diverging' && (
          <SelectField
            label="Scheme"
            value={data.divergingScheme ?? 'rdBu'}
            onChange={(v) => update({ divergingScheme: v })}
            options={DIVERGING_COLOUR_SCHEME_OPTIONS}
          />
        )}

        {showCategorical && (
          <SelectField
            label="Scheme"
            value={data.categoricalScheme ?? 'tableau10'}
            onChange={(v) => update({ categoricalScheme: v })}
            options={CATEGORICAL_COLOUR_SCHEME_OPTIONS}
          />
        )}
      </NodeSection>

        <NodeSection
        nodeId={id}
        sectionId="colourPreview"
        sectionCollapsed={data.sectionCollapsed}
        title="Preview"
        subtitle="Current colour map"
        >
        <ColourRampPreview
            colourMode={colourMode}
            sequentialScheme={data.sequentialScheme ?? 'viridis'}
            divergingScheme={data.divergingScheme ?? 'rdBu'}
            categoricalScheme={data.categoricalScheme ?? 'tableau10'}
            manualColours={data.manualColours ?? '[#5b78ff,#ff7a59,#36c285,#f2c94c]'}
            reverse={Boolean(data.reverse ?? false)}
            domainMode={domainMode}
            domainMin={data.domainMin ?? 0}
            domainCenter={data.domainCenter ?? 0}
            domainMax={data.domainMax ?? 100}
            missingColour={data.missingColour ?? '#cccccc'}
        />
        </NodeSection>
        
      {showNumericDomain && (
        <NodeSection
          nodeId={id}
          sectionId="domain"
          sectionCollapsed={data.sectionCollapsed}
          title="Domain"
          subtitle="Numeric input range"
          defaultCollapsed={domainMode === 'auto'}
        >
          <SelectField
            label="Domain"
            value={domainMode}
            onChange={(v) => update({ domainMode: v })}
            options={DOMAIN_MODE_OPTIONS}
          />

          <NumberField
            label="Min"
            value={data.domainMin ?? 0}
            onChange={(v) => update({ domainMin: v })}
            state={domainMode === 'auto' ? 'inactive' : 'normal'}
            note={domainMode === 'auto' ? 'auto' : undefined}
          />

          {showDiverging && (
            <NumberField
              label="Center"
              value={data.domainCenter ?? 0}
              onChange={(v) => update({ domainCenter: v })}
            />
          )}

          <NumberField
            label="Max"
            value={data.domainMax ?? 100}
            onChange={(v) => update({ domainMax: v })}
            state={domainMode === 'auto' ? 'inactive' : 'normal'}
            note={domainMode === 'auto' ? 'auto' : undefined}
          />

          {showDiverging && (
            <SelectField
              label="Symmetric"
              value={String(data.symmetricDomain ?? true)}
              onChange={(v) => update({ symmetricDomain: v === 'true' })}
              options={BOOLEAN_OPTIONS}
            />
          )}
        </NodeSection>
      )}

      {showManual && (
        <NodeSection
          nodeId={id}
          sectionId="manual"
          sectionCollapsed={data.sectionCollapsed}
          title="Manual Palette"
          subtitle="Colours by index or category"
        >
          <TextareaField
            label="Colours"
            value={data.manualColours ?? '[#5b78ff,#ff7a59,#36c285,#f2c94c]'}
            onChange={(v) => update({ manualColours: v })}
            rows={4}
            placeholder="[#5b78ff,#ff7a59,#36c285]"
          />
        </NodeSection>
      )}

      <NodeSection
        nodeId={id}
        sectionId="options"
        sectionCollapsed={data.sectionCollapsed}
        title="Options"
        subtitle="Reverse, clamp and missing values"
        defaultCollapsed
      >
        <SelectField
          label="Reverse"
          value={String(data.reverse ?? false)}
          onChange={(v) => update({ reverse: v === 'true' })}
          options={BOOLEAN_OPTIONS}
        />

        <SelectField
          label="Clamp"
          value={String(data.clamp ?? true)}
          onChange={(v) => update({ clamp: v === 'true' })}
          options={BOOLEAN_OPTIONS}
        />

        <ColorField
          label="Missing"
          value={data.missingColour ?? '#cccccc'}
          onChange={(v) => update({ missingColour: v })}
        />
      </NodeSection>
    </NodeShell>
  );
}