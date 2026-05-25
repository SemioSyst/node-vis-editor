// src/CustomNodes/SimpleDataInputNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  TextareaField,
} from './UI/NodeFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

export default function SimpleDataInputNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const dataMode = normalizeMode(data.dataMode ?? 'auto');
  const rawText = data.rawText ?? getDefaultText(dataMode);
  const detectedMode = detectDataMode(rawText, dataMode);

  const handleModeChange = (nextMode) => {
    const normalizedNextMode = normalizeMode(nextMode);

    const currentRawText = data.rawText;
    const currentDefault = getDefaultText(dataMode);

    const shouldReplaceText =
      currentRawText == null ||
      String(currentRawText).trim() === '' ||
      currentRawText === currentDefault;

    update({
      dataMode: normalizedNextMode,
      ...(shouldReplaceText
        ? { rawText: getDefaultText(normalizedNextMode) }
        : {}),
    });
  };

  return (
    <NodeShell
      nodeId={id}
      title="Simple Data Input"
      subtitle="Outputs simple number, array, or matrix data"
      badge="Data"
      footer={`Output: data / ${
        dataMode === 'auto'
          ? `auto → ${detectedMode}`
          : dataMode
      }`}
      collapsed={data.collapsed}
    >
      <Handle type="source" position={Position.Right} />

      <NodeSection
        nodeId={id}
        sectionId="input"
        sectionCollapsed={data.sectionCollapsed}
        title="Input"
        subtitle={getModeSubtitle(dataMode, detectedMode)}
      >
        <SelectField
          label="Mode"
          value={dataMode}
          onChange={handleModeChange}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'number', label: 'Number' },
            { value: 'array', label: 'Array' },
            { value: 'matrix', label: 'Matrix' },
          ]}
        />

        <TextareaField
          label="Data"
          value={rawText}
          rows={getRows(dataMode, detectedMode)}
          onChange={(v) => update({ rawText: v })}
          placeholder={getPlaceholder(dataMode)}
        />
      </NodeSection>
    </NodeShell>
  );
}

function normalizeMode(mode) {
  if (mode === 'table') return 'matrix';
  if (mode === 'number') return 'number';
  if (mode === 'array') return 'array';
  if (mode === 'matrix') return 'matrix';
  return 'auto';
}

function detectDataMode(rawText, requestedMode = 'auto') {
  const normalizedRequestedMode = normalizeMode(requestedMode);

  if (normalizedRequestedMode !== 'auto') {
    return normalizedRequestedMode;
  }

  const raw = String(rawText ?? '').trim();

  if (!raw) return 'array';

  // Bracket matrix:
  // [[10,20],[30,40]]
  // [[A,B],[C,D]]
  if (/^\s*\[\s*\[/.test(raw)) {
    return 'matrix';
  }

  // Bracket array:
  // [10,20,30]
  if (/^\s*\[/.test(raw)) {
    return 'array';
  }

  // Comma/newline separated values are treated as array.
  if (raw.includes(',') || raw.includes('\n')) {
    return 'array';
  }

  if (Number.isFinite(Number(raw))) {
    return 'number';
  }

  return 'array';
}

function getDefaultText(mode) {
  if (mode === 'number') return '42';

  if (mode === 'matrix') {
    return '[[10,20,30],[25,15,45],[5,30,20]]';
  }

  // Auto defaults to a simple array because it is the most common quick test.
  return '[20,45,70,35]';
}

function getPlaceholder(mode) {
  if (mode === 'number') return '42';

  if (mode === 'matrix') {
    return '[[10,20,30],[25,15,45],[5,30,20]]';
  }

  if (mode === 'auto') {
    return '[20,45,70,35] or [[10,20],[30,40]]';
  }

  return '[20,45,70,35]';
}

function getRows(mode, detectedMode) {
  const effectiveMode = mode === 'auto' ? detectedMode : mode;

  if (effectiveMode === 'matrix') return 5;
  if (effectiveMode === 'array') return 3;
  return 2;
}

function getModeSubtitle(mode, detectedMode) {
  if (mode === 'auto') {
    return `Auto detects current input as ${detectedMode}`;
  }

  if (mode === 'number') {
    return 'Single numeric value';
  }

  if (mode === 'matrix') {
    return 'Bracket matrix, e.g. [[10,20,30],[25,15,45]]';
  }

  return 'Bracket or comma-separated array';
}