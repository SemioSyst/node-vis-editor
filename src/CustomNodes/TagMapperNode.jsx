// src/CustomNodes/TagMapperNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  TextField,
  TextareaField,
} from './UI/NodeFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

const TAG_PRESET_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'applyAll', label: 'Apply All' },
  { value: 'byIndex', label: 'By Index' },
  { value: 'matrixRow', label: 'Matrix Row' },
  { value: 'matrixColumn', label: 'Matrix Column' },
  { value: 'matrixRowColumn', label: 'Matrix Row + Column' },
  { value: 'matrixCell', label: 'Matrix Cell' },
];

const TAG_KEY_OPTIONS = [
  { value: 'item', label: 'item' },
  { value: 'state', label: 'state' },
  { value: 'time', label: 'time' },
  { value: 'group', label: 'group' },
  { value: 'series', label: 'series' },
  { value: 'category', label: 'category' },
  { value: 'custom', label: 'Custom' },
];

const APPLY_OPTIONS = [
  { value: 'true', label: 'On' },
  { value: 'false', label: 'Off' },
];

function resolveKeyPreset(preset, customKey, fallback) {
  if (preset === 'custom') return customKey || fallback;
  return preset || fallback;
}

function boolValue(value, fallback = false) {
  if (value === true) return true;
  if (value === false) return false;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function hasText(value) {
  return String(value ?? '').trim().length > 0;
}

export default function TagMapperNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const tagPreset = data.tagPreset ?? data.tagMode ?? 'auto';

  const applyGlobalTag = boolValue(
    data.applyGlobalTag,
    hasText(data.globalTagValue)
  );

  const applyIndexTags = boolValue(
    data.applyIndexTags,
    hasText(data.indexTagValues)
  );

  const applyRowTags = boolValue(
    data.applyRowTags,
    hasText(data.rowTagValues)
  );

  const applyColumnTags = boolValue(
    data.applyColumnTags,
    hasText(data.colTagValues)
  );

  const applyCellTags = boolValue(
    data.applyCellTags,
    hasText(data.cellTagMatrix)
  );

  const globalKey = resolveKeyPreset(
    data.globalKeyPreset ?? 'group',
    data.globalCustomKey,
    'group'
  );

  const indexKey = resolveKeyPreset(
    data.indexKeyPreset ?? 'item',
    data.indexCustomKey,
    'item'
  );

  const rowKey = resolveKeyPreset(
    data.rowKeyPreset ?? 'item',
    data.rowCustomKey,
    'item'
  );

  const colKey = resolveKeyPreset(
    data.colKeyPreset ?? 'state',
    data.colCustomKey,
    'state'
  );

  const cellKey = resolveKeyPreset(
    data.cellKeyPreset ?? 'group',
    data.cellCustomKey,
    'group'
  );

  const handlePresetChange = (preset) => {
    const patch = {
      tagPreset: preset,
      tagMode: preset, // backward compatibility
    };

    if (preset === 'auto') {
      Object.assign(patch, {
        applyIndexTags: false,
        applyRowTags: false,
        applyColumnTags: false,
        applyCellTags: false,
      });
    }

    if (preset === 'applyAll') {
      Object.assign(patch, {
        applyGlobalTag: true,
        applyIndexTags: false,
        applyRowTags: false,
        applyColumnTags: false,
        applyCellTags: false,
      });
    }

    if (preset === 'byIndex') {
      Object.assign(patch, {
        applyIndexTags: true,
        applyRowTags: false,
        applyColumnTags: false,
        applyCellTags: false,
      });
    }

    if (preset === 'matrixRow') {
      Object.assign(patch, {
        applyIndexTags: false,
        applyRowTags: true,
        applyColumnTags: false,
        applyCellTags: false,
      });
    }

    if (preset === 'matrixColumn') {
      Object.assign(patch, {
        applyIndexTags: false,
        applyRowTags: false,
        applyColumnTags: true,
        applyCellTags: false,
      });
    }

    if (preset === 'matrixRowColumn') {
      Object.assign(patch, {
        applyIndexTags: false,
        applyRowTags: true,
        applyColumnTags: true,
        applyCellTags: false,
      });
    }

    if (preset === 'matrixCell') {
      Object.assign(patch, {
        applyIndexTags: false,
        applyRowTags: false,
        applyColumnTags: false,
        applyCellTags: true,
      });
    }

    update(patch);
  };

  return (
    <NodeShell
      nodeId={id}
      title="Tag Mapper"
      subtitle="Adds explicit batch tags to array or matrix data"
      badge="Mapper"
      footer="Output: tagged data / parameter"
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
        sectionId="preset"
        sectionCollapsed={data.sectionCollapsed}
        title="Preset"
        subtitle="Quick setup only; active rules are controlled below"
        ports={['input']}
      >
        <SelectField
          label="Preset"
          value={tagPreset}
          onChange={handlePresetChange}
          options={TAG_PRESET_OPTIONS}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="globalTag"
        sectionCollapsed={data.sectionCollapsed}
        title="Global Tag"
        subtitle="Optional tag applied to all values"
        defaultCollapsed={!applyGlobalTag}
      >
        <SelectField
          label="Apply"
          value={String(applyGlobalTag)}
          onChange={(v) => update({ applyGlobalTag: v === 'true' })}
          options={APPLY_OPTIONS}
        />

        <SelectField
          label="Key"
          value={data.globalKeyPreset ?? 'group'}
          onChange={(v) => update({ globalKeyPreset: v })}
          options={TAG_KEY_OPTIONS}
        />

        {(data.globalKeyPreset ?? 'group') === 'custom' && (
          <TextField
            label="Custom"
            value={data.globalCustomKey ?? ''}
            onChange={(v) => update({ globalCustomKey: v })}
            placeholder="tagKey"
          />
        )}

        <TextField
          label={globalKey}
          value={data.globalTagValue ?? ''}
          onChange={(v) => update({ globalTagValue: v })}
          placeholder="e.g. sales"
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="indexTags"
        sectionCollapsed={data.sectionCollapsed}
        title="Index Tags"
        subtitle="Assign tags to one-dimensional arrays by index"
        defaultCollapsed={!applyIndexTags}
      >
        <SelectField
          label="Apply"
          value={String(applyIndexTags)}
          onChange={(v) => update({ applyIndexTags: v === 'true' })}
          options={APPLY_OPTIONS}
        />

        <SelectField
          label="Key"
          value={data.indexKeyPreset ?? 'item'}
          onChange={(v) => update({ indexKeyPreset: v })}
          options={TAG_KEY_OPTIONS}
        />

        {(data.indexKeyPreset ?? 'item') === 'custom' && (
          <TextField
            label="Custom"
            value={data.indexCustomKey ?? ''}
            onChange={(v) => update({ indexCustomKey: v })}
            placeholder="tagKey"
          />
        )}

        <TextareaField
          label={indexKey}
          value={data.indexTagValues ?? ''}
          onChange={(v) => update({ indexTagValues: v })}
          rows={3}
          placeholder="[A,B,C,D]"
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="rowTags"
        sectionCollapsed={data.sectionCollapsed}
        title="Row Tags"
        subtitle="Assign tags to matrix rows"
        defaultCollapsed={!applyRowTags}
      >
        <SelectField
          label="Apply"
          value={String(applyRowTags)}
          onChange={(v) => update({ applyRowTags: v === 'true' })}
          options={APPLY_OPTIONS}
        />

        <SelectField
          label="Row Key"
          value={data.rowKeyPreset ?? 'item'}
          onChange={(v) => update({ rowKeyPreset: v })}
          options={TAG_KEY_OPTIONS}
        />

        {(data.rowKeyPreset ?? 'item') === 'custom' && (
          <TextField
            label="Custom"
            value={data.rowCustomKey ?? ''}
            onChange={(v) => update({ rowCustomKey: v })}
            placeholder="rowTagKey"
          />
        )}

        <TextareaField
          label={rowKey}
          value={data.rowTagValues ?? ''}
          onChange={(v) => update({ rowTagValues: v })}
          rows={3}
          placeholder="[Apple,Banana,Cherry]"
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="columnTags"
        sectionCollapsed={data.sectionCollapsed}
        title="Column Tags"
        subtitle="Assign tags to matrix columns"
        defaultCollapsed={!applyColumnTags}
      >
        <SelectField
          label="Apply"
          value={String(applyColumnTags)}
          onChange={(v) => update({ applyColumnTags: v === 'true' })}
          options={APPLY_OPTIONS}
        />

        <SelectField
          label="Col Key"
          value={data.colKeyPreset ?? 'state'}
          onChange={(v) => update({ colKeyPreset: v })}
          options={TAG_KEY_OPTIONS}
        />

        {(data.colKeyPreset ?? 'state') === 'custom' && (
          <TextField
            label="Custom"
            value={data.colCustomKey ?? ''}
            onChange={(v) => update({ colCustomKey: v })}
            placeholder="colTagKey"
          />
        )}

        <TextareaField
          label={colKey}
          value={data.colTagValues ?? ''}
          onChange={(v) => update({ colTagValues: v })}
          rows={3}
          placeholder="[2020,2021,2022]"
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="cellTags"
        sectionCollapsed={data.sectionCollapsed}
        title="Cell Tags"
        subtitle="Assign tags to each matrix cell"
        defaultCollapsed={!applyCellTags}
      >
        <SelectField
          label="Apply"
          value={String(applyCellTags)}
          onChange={(v) => update({ applyCellTags: v === 'true' })}
          options={APPLY_OPTIONS}
        />

        <SelectField
          label="Cell Key"
          value={data.cellKeyPreset ?? 'group'}
          onChange={(v) => update({ cellKeyPreset: v })}
          options={TAG_KEY_OPTIONS}
        />

        {(data.cellKeyPreset ?? 'group') === 'custom' && (
          <TextField
            label="Custom"
            value={data.cellCustomKey ?? ''}
            onChange={(v) => update({ cellCustomKey: v })}
            placeholder="cellTagKey"
          />
        )}

        <TextareaField
          label={cellKey}
          value={data.cellTagMatrix ?? ''}
          onChange={(v) => update({ cellTagMatrix: v })}
          rows={4}
          placeholder="[[hot,warm,cold],[hot,hot,warm]]"
        />
      </NodeSection>
    </NodeShell>
  );
}