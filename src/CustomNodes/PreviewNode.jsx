import { useCallback, useMemo } from 'react';
import { Position, Handle, useViewport } from '@xyflow/react';
import { useGraphIR } from '../GraphIRContext.js';
import { useOutputs } from '../OutputsContext.jsx';
import OutputRenderer from '../renderer/OutputRenderer.jsx';
import ResizablePanel from './UI/ResizablePanel.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';
import './PreviewNode.css';

function PreviewNode(props) {
  const graphIR = useGraphIR();
  const { outputs } = useOutputs();

  const myId = String(props.id);
  const data = props.data ?? {};
  const update = useUpdateNodeData(myId);

  const previewWidth = data.previewWidth ?? 240;
  const previewHeight = data.previewHeight ?? 160;
  const previewMode = data.previewMode ?? 'fit';

  const { zoom } = useViewport();
  const zoomPercent = Math.round(zoom * 100);

  const sourceId = useMemo(() => {
    const upstream = graphIR.reverseAdj?.[myId] ?? [];
    return upstream.length ? String(upstream[0]) : null;
  }, [graphIR, myId]);

  const spec = sourceId ? outputs[sourceId] : null;

  const onClick = useCallback(() => {
    console.log('[PreviewNode] graphIR snapshot:', graphIR);
    console.log('[PreviewNode] sourceId:', sourceId);
    console.log('[PreviewNode] output spec:', spec);
  }, [graphIR, sourceId, spec]);

  return (
    <div className="preview-node" onClick={onClick}>
      <Handle type="target" position={Position.Left} />

      <div className="preview-node__header">
        <div>
          <div className="preview-node__title">
            Preview Node
          </div>

          <div className="preview-node__meta">
            {previewWidth}×{previewHeight}
            {previewMode === 'actual' && ` · canvas ${zoomPercent}%`}
          </div>
        </div>

        <select
          className="preview-node__mode nodrag"
          value={previewMode}
          onChange={(e) => update({ previewMode: e.target.value })}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="fit">Fit</option>
          <option value="actual">Actual</option>
        </select>
      </div>

      <ResizablePanel
        nodeId={myId}
        width={previewWidth}
        height={previewHeight}
        minWidth={160}
        minHeight={100}
        maxWidth={800}
        maxHeight={600}
        className="preview-node__resizable"
      >
        <div className="preview-node__content">
          <OutputRenderer
            output={spec}
            emptyText={sourceId ? `No output from ${sourceId}` : 'No input'}
            renderOptions={{
                mode: previewMode,
                viewportWidth: previewWidth,
                viewportHeight: previewHeight,
                paddingRatio: 0.12,
                overflow: 'auto',
            }}
          />
        </div>
      </ResizablePanel>
    </div>
  );
}

export default PreviewNode;