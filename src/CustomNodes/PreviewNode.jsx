import { useCallback, useMemo } from 'react';
import { Position, Handle } from '@xyflow/react';
import { useGraphIR } from '../GraphIRContext.js'; // import the custom hook to access graphIR context
import './PreviewNode.css';

function PreviewNode(props) {
  const graphIR = useGraphIR();

  const onClick = useCallback(() => {
    // log the graphIR snapshot when the node is clicked
    console.log('[PreviewNode] graphIR snapshot:', graphIR);
    alert('Preview Node clicked! Check console for graphIR snapshot.');
  }, [graphIR]);

  const stats = useMemo(() => {
    const id = String(props.id);
    const inD = graphIR.inDegree?.[id] ?? 0;
    const outD = graphIR.outDegree?.[id] ?? 0;
    return { inD, outD };
  }, [graphIR, props.id]);

  return (
    <div className="preview-node" onClick={onClick}>
      <Handle type="target" position={Position.Top} />
      <div id="preview-node-label">Preview Node</div>

      <div style={{ fontSize: 12, marginTop: 6 }}>
        <div>id: {props.id}</div>
        <div>inDegree: {stats.inD}</div>
        <div>outDegree: {stats.outD}</div>
        <div>nodes: {Object.keys(graphIR.nodesById || {}).length}</div>
        <div>edges: {graphIR.edges?.length ?? 0}</div>
      </div>
    </div>
  );
}

export default PreviewNode;
