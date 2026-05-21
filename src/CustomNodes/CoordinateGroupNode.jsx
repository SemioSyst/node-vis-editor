// src/CustomNodes/CoordinateGroupNode.jsx
import { useEffect, useMemo, useRef } from 'react';
import { Handle, Position, useStore } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  NumberField,
} from './UI/NodeFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

const ROLE_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'axis', label: 'Axis' },
  { value: 'marks', label: 'Marks' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'annotation', label: 'Annotation' },
  { value: 'background', label: 'Background' },
  { value: 'visual', label: 'Visual' },
];

export default function CoordinateGroupNode({ id, data }) {
  const update = useUpdateNodeData(id);
  const dragIndexRef = useRef(null);

  const connectedSources = useStore((store) => {
    const edges = store.edges ?? [];
    const nodes = store.nodes ?? [];

    return edges
      .filter((edge) => edge.target === id && edge.targetHandle === 'layers')
      .map((edge) => {
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
  });

  const layers = useMemo(() => {
    return reconcileUiLayers(data.layers ?? [], connectedSources);
  }, [data.layers, connectedSources]);

  useEffect(() => {
    const current = data.layers ?? [];
    const next = reconcileUiLayers(current, connectedSources);

    if (!areLayerListsEquivalent(current, next)) {
      update({ layers: next });
    }
  }, [connectedSources, data.layers, update]);

  const setLayers = (nextLayers) => {
    update({ layers: nextLayers });
  };

  const updateLayer = (layerId, patch) => {
    setLayers(
      layers.map((layer) =>
        layer.id === layerId
          ? { ...layer, ...patch }
          : layer
      )
    );
  };

  const moveLayer = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= layers.length) return;

    const next = [...layers];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    setLayers(next);
  };

  const reorderLayer = (fromIndex, toIndex) => {
    if (fromIndex == null || fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= layers.length) return;
    if (toIndex < 0 || toIndex >= layers.length) return;

    const next = [...layers];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    setLayers(next);
  };

  return (
    <NodeShell
      title="Coordinate Group"
      subtitle="Combines visual layers in one coordinate space"
      badge="Group"
      footer="Output: visual coordinate group"
    >
      <Handle
        type="target"
        id="layers"
        position={Position.Left}
      />

      <Handle
        type="source"
        position={Position.Right}
      />

      <NodeSection
        title="Layers"
        subtitle="Render order: bottom to top"
      >
        {layers.length === 0 && (
          <div className="node-field__note">
            Connect visual outputs to the layers input.
          </div>
        )}

        <div className="coordinate-layer-list nodrag">
          {layers.map((layer, index) => (
            <div
              key={layer.id}
              className="coordinate-layer-row"
              draggable
              onDragStart={() => {
                dragIndexRef.current = index;
              }}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={() => {
                reorderLayer(dragIndexRef.current, index);
                dragIndexRef.current = null;
              }}
            >
              <div className="coordinate-layer-row__header">
                <span className="coordinate-layer-row__drag">⋮⋮</span>

                <span className="coordinate-layer-row__title">
                  {layer.label ?? layer.sourceNodeId}
                </span>

                <button
                  type="button"
                  className="coordinate-layer-row__button"
                  onClick={() => moveLayer(index, -1)}
                  disabled={index === 0}
                >
                  ↑
                </button>

                <button
                  type="button"
                  className="coordinate-layer-row__button"
                  onClick={() => moveLayer(index, 1)}
                  disabled={index === layers.length - 1}
                >
                  ↓
                </button>
              </div>

              <SelectField
                label="Role"
                value={layer.role ?? 'auto'}
                onChange={(v) => updateLayer(layer.id, { role: v })}
                options={ROLE_OPTIONS}
              />

              <SelectField
                label="Visible"
                value={String(layer.visible ?? true)}
                onChange={(v) => updateLayer(layer.id, { visible: v === 'true' })}
                options={[
                  { value: 'true', label: 'Show' },
                  { value: 'false', label: 'Hide' },
                ]}
              />

              <NumberField
                label="X"
                value={layer.x ?? 0}
                onChange={(v) => updateLayer(layer.id, { x: v })}
                step={1}
              />

              <NumberField
                label="Y"
                value={layer.y ?? 0}
                onChange={(v) => updateLayer(layer.id, { y: v })}
                step={1}
              />

              <NumberField
                label="Opacity"
                value={layer.opacity ?? 1}
                onChange={(v) => updateLayer(layer.id, { opacity: v })}
                min={0}
                max={1}
                step={0.05}
              />
            </div>
          ))}
        </div>
      </NodeSection>
    </NodeShell>
  );
}

function reconcileUiLayers(existingLayers, connectedSources) {
  const connectedIds = new Set(
    connectedSources.map((source) => source.sourceNodeId)
  );

  const kept = existingLayers
    .filter((layer) => connectedIds.has(layer.sourceNodeId))
    .map((layer) => {
      const source = connectedSources.find(
        (item) => item.sourceNodeId === layer.sourceNodeId
      );

      return {
        ...layer,
        label: layer.label ?? source?.label ?? layer.sourceNodeId,
        sourceHandle: source?.sourceHandle ?? layer.sourceHandle ?? null,
        edgeId: source?.edgeId ?? layer.edgeId ?? null,
      };
    });

  const existingIds = new Set(kept.map((layer) => layer.sourceNodeId));

  const added = connectedSources
    .filter((source) => !existingIds.has(source.sourceNodeId))
    .map((source) => ({
      id: `layer-${source.sourceNodeId}`,
      sourceNodeId: source.sourceNodeId,
      sourceHandle: source.sourceHandle ?? null,
      edgeId: source.edgeId ?? null,
      label: source.label ?? source.sourceNodeId,
      role: 'auto',
      visible: true,
      locked: false,
      opacity: 1,
      x: 0,
      y: 0,
    }));

  return [...kept, ...added];
}

function areLayerListsEquivalent(a, b) {
  if (a.length !== b.length) return false;

  return a.every((item, index) => {
    const other = b[index];

    return (
      item.id === other.id &&
      item.sourceNodeId === other.sourceNodeId &&
      item.edgeId === other.edgeId
    );
  });
}