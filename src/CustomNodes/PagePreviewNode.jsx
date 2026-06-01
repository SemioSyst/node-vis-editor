// src/CustomNodes/PagePreviewNode.jsx
import { useMemo, useRef } from 'react';
import { useStore } from '@xyflow/react';

import NodeSection from './UI/NodeSection.jsx';
import {
  NumberField,
  SelectField,
} from './UI/NodeFields.jsx';
import { PortStatusRow } from './UI/PortFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';
import ResizablePanel from './UI/ResizablePanel.jsx';

import OutputRenderer from '../renderer/OutputRenderer.jsx';

// Use the same useOutputs import path as your existing Preview node / App.jsx.
import { useOutputs } from '../OutputsContext.jsx';

import './PagePreviewNode.css';

const VISUAL_POSITION_OPTIONS = [
  { value: 'normal', label: 'Normal page position' },
  { value: 'stickyCenter', label: 'Sticky in viewport center' },
];

export default function PagePreviewNode({ id, data }) {
  const update = useUpdateNodeData(id);
  const scrollViewportRef = useRef(null);

  const visualSource = useConnectedSource(id, 'visual');
  const { outputs } = useOutputs();

  const sourceOutput = visualSource
    ? outputs[String(visualSource.sourceNodeId)]
    : null;

  const pageHeight = Number(data.pageHeight ?? 2400);
  const viewportHeight = Number(data.viewportHeight ?? 520);
  const visualTop = Number(data.visualTop ?? 800);
  const visualLeft = Number(data.visualLeft ?? 80);
  const visualWidth = Number(data.visualWidth ?? 640);
  const visualPosition = data.visualPosition ?? 'normal';

  const previewWidth = Number(data.previewWidth ?? 720);
  const previewHeight = Number(data.previewHeight ?? 520);

  const renderOptions = useMemo(() => ({
    scrollContainerRef: scrollViewportRef,
    pagePreview: {
      enabled: true,
      pageHeight,
      viewportHeight,
      visualTop,
      visualLeft,
      visualWidth,
      visualPosition,
    },
  }), [
    pageHeight,
    viewportHeight,
    visualTop,
    visualLeft,
    visualWidth,
    visualPosition,
  ]);

  return (
    <div className="page-preview-node">
      <div className="page-preview-node__controls">
        <div className="page-preview-node__header">
          <div>
            <div className="page-preview-node__title">
              Page Preview
            </div>
            <div className="page-preview-node__subtitle">
              Tests a visual inside a scrollable page
            </div>
          </div>

          <div className="page-preview-node__badge">
            Preview
          </div>
        </div>

        <NodeSection
          nodeId={id}
          sectionId="input"
          sectionCollapsed={data.sectionCollapsed}
          title="Input"
          subtitle="Visual to place inside the page"
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
          sectionId="page"
          sectionCollapsed={data.sectionCollapsed}
          title="Page"
          subtitle="Pseudo page settings for scroll testing"
        >
          <NumberField
            label="Page H"
            value={pageHeight}
            onChange={(v) => update({ pageHeight: v })}
            min={viewportHeight}
            step={100}
          />

          <NumberField
            label="Viewport H"
            value={viewportHeight}
            onChange={(v) => update({ viewportHeight: v })}
            min={200}
            step={50}
          />

          <SelectField
            label="Visual Position"
            value={visualPosition}
            onChange={(v) => update({ visualPosition: v })}
            options={VISUAL_POSITION_OPTIONS}
          />

          {visualPosition === 'normal' && (
            <>
              <NumberField
                label="Visual Top"
                value={visualTop}
                onChange={(v) => update({ visualTop: v })}
                step={50}
              />

              <NumberField
                label="Visual Left"
                value={visualLeft}
                onChange={(v) => update({ visualLeft: v })}
                step={20}
              />
            </>
          )}

          <NumberField
            label="Visual W"
            value={visualWidth}
            onChange={(v) => update({ visualWidth: v })}
            min={120}
            step={20}
          />
        </NodeSection>

        {visualPosition === 'stickyCenter' && (
          <div className="page-preview-node__note">
            Sticky mode is mainly for testing Page scroll steps. Use Normal position for Element in viewport tests.
          </div>
        )}

        <div className="page-preview-node__footer">
          Preview-only node
        </div>
      </div>

      <ResizablePanel
        nodeId={id}
        widthKey="previewWidth"
        heightKey="previewHeight"
        width={previewWidth}
        height={previewHeight}
        minWidth={420}
        minHeight={280}
        maxWidth={1200}
        maxHeight={900}
        className="page-preview-node__resizable"
      >
        <div className="page-preview-panel">
          <div className="page-preview-panel__topbar">
            <div>
              <div className="page-preview-panel__title">
                Scroll Page Preview
              </div>
              <div className="page-preview-panel__meta">
                {previewWidth} × {previewHeight} · page {pageHeight}px · {visualPosition === 'stickyCenter'
                  ? 'sticky center'
                  : `visual top ${visualTop}px`}
              </div>
            </div>
          </div>

          <div
            ref={scrollViewportRef}
            className="page-preview-viewport nodrag nowheel"
          >
            <div
              className="page-preview-page"
              style={{
                height: pageHeight,
              }}
            >
              {visualPosition === 'stickyCenter' ? (
                <div className="page-preview-sticky-stage">
                  <div
                    className="page-preview-visual page-preview-visual--inside-sticky"
                    style={{
                      width: visualWidth,
                    }}
                  >
                    <OutputRenderer
                      output={sourceOutput}
                      emptyText="No visual connected"
                      renderOptions={renderOptions}
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="page-preview-visual"
                  style={{
                    top: visualTop,
                    left: visualLeft,
                    width: visualWidth,
                  }}
                >
                  <OutputRenderer
                    output={sourceOutput}
                    emptyText="No visual connected"
                    renderOptions={renderOptions}
                  />
                </div>
              )}

              <div className="page-preview-marker page-preview-marker--top">
                top
              </div>

              <div className="page-preview-marker page-preview-marker--bottom">
                bottom
              </div>
            </div>
          </div>
        </div>
      </ResizablePanel>
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