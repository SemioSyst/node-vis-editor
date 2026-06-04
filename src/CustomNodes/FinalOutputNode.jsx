// src/CustomNodes/FinalOutputNode.jsx
import { useMemo } from 'react';
import { useStore } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  NumberField,
  TextField,
  ColorField,
  SelectField,
} from './UI/NodeFields.jsx';
import { PortStatusRow } from './UI/PortFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

import {
  NodeRegistryButton,
  NodeRegistryCard,
  NodeRegistryCardHeader,
  NodeRegistryEmpty,
  NodeRegistryMetaLine,
} from './UI/NodeRegistryList.jsx';

import { useOutputs } from '../OutputsContext.jsx';
import {
  downloadJson,
  makeSafeFilename,
} from '../export/downloadJson.js';

import './FinalOutputNode.css';

const RENDER_MODE_OPTIONS = [
  { value: 'fit', label: 'Fit' },
  { value: 'actual', label: 'Actual size' },
];

export default function FinalOutputNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const visualSource = useConnectedSource(id, 'visual');
  const { outputs } = useOutputs();

  const output = outputs[String(id)] ?? null;
  const bundle = output?.bundle ?? null;
  const status = output?.status ?? 'not-run';

  const runtimeSummary = output?.preview?.runtimeSummary ?? null;

  const displayName = data.name ?? 'Untitled visual';

  const canDownload = Boolean(bundle);

  const filename = useMemo(() => (
    makeSafeFilename(displayName, 'nodevis-embed')
  ), [displayName]);

  const handleDownload = () => {
    if (!bundle) return;

    downloadJson(bundle, filename);
  };

  return (
    <NodeShell
      nodeId={id}
      title="Final Output"
      subtitle="Collects the final visual for embed export"
      badge="Export"
      footer="Output: embeddable visual bundle"
      collapsed={data.collapsed}
    >
      <NodeSection
        nodeId={id}
        sectionId="input"
        sectionCollapsed={data.sectionCollapsed}
        title="Input"
        subtitle="The final visual to export"
        ports={['visual']}
      >
        <PortStatusRow
          handleId="visual"
          label="Visual"
          status={visualSource ? visualSource.label : 'not connected'}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="info"
        sectionCollapsed={data.sectionCollapsed}
        title="Export Info"
        subtitle="Bundle name and default render size"
      >
        <TextField
          label="Name"
          value={data.name ?? 'Untitled visual'}
          onChange={(v) => update({ name: v })}
          placeholder="Slider transition demo"
        />

        <TextField
          label="Description"
          value={data.description ?? ''}
          onChange={(v) => update({ description: v })}
          placeholder="Optional short description"
        />

        <SelectField
          label="Render Mode"
          value={data.renderMode ?? 'fit'}
          onChange={(v) => update({ renderMode: v })}
          options={RENDER_MODE_OPTIONS}
        />

        <NumberField
          label="Viewport W"
          value={data.viewportWidth ?? 900}
          onChange={(v) => update({ viewportWidth: v })}
          min={1}
          step={20}
        />

        <NumberField
          label="Viewport H"
          value={data.viewportHeight ?? 520}
          onChange={(v) => update({ viewportHeight: v })}
          min={1}
          step={20}
        />

        <ColorField
          label="Background"
          value={data.background ?? '#ffffff'}
          onChange={(v) => update({ background: v })}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="bundle"
        sectionCollapsed={data.sectionCollapsed}
        title="Bundle"
        subtitle="Current export status"
      >
        {status === 'ready' && (
          <NodeRegistryCard selected>
            <NodeRegistryCardHeader
              title={displayName}
              meta="ready"
            />

            <NodeRegistryMetaLine>
              {filename}
            </NodeRegistryMetaLine>

            {runtimeSummary && (
              <div className="final-output-summary">
                <SummaryItem label="States" value={runtimeSummary.states} />
                <SummaryItem label="Events" value={runtimeSummary.events} />
                <SummaryItem label="Trans" value={runtimeSummary.transitions} />
                <SummaryItem label="Layout" value={runtimeSummary.layoutRules} />
              </div>
            )}
          </NodeRegistryCard>
        )}

        {status !== 'ready' && (
          <NodeRegistryEmpty>
            Run the evaluator after connecting a visual input.
          </NodeRegistryEmpty>
        )}

        <NodeRegistryButton
          variant="primary"
          fullWidth
          onClick={handleDownload}
          disabled={!canDownload}
        >
          Download Bundle JSON
        </NodeRegistryButton>
      </NodeSection>
    </NodeShell>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="final-output-summary__item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function useConnectedSource(nodeId, targetHandle) {
  return useStore((store) => {
    const edges = store.edges ?? [];
    const nodes = store.nodes ?? [];

    const edge = edges.find(
      (item) =>
        item.target === nodeId &&
        item.targetHandle === targetHandle
    );

    if (!edge) return null;

    const sourceNode = nodes.find((node) => node.id === edge.source);

    return {
      sourceNodeId: edge.source,
      sourceHandle: edge.sourceHandle ?? null,
      edgeId: edge.id,
      label:
        sourceNode?.data?.label ??
        sourceNode?.data?.title ??
        sourceNode?.type ??
        edge.source,
      nodeType: sourceNode?.type ?? null,
    };
  });
}