import { useCallback, useMemo } from 'react';
import { Position, Handle } from '@xyflow/react';
import { useGraphIR } from '../GraphIRContext.js'; // import the custom hook to access graphIR context
import { useOutputs } from '../OutputsContext.jsx'; // import the custom hook to access outputs context
import OutputRenderer from '../renderer/OutputRenderer.jsx'; // import the Renderer components
import './PreviewNode.css';

function PreviewNode(props) {
    const graphIR = useGraphIR(); // use the custom hook to get the current graphIR from context
    const { outputs } = useOutputs(); // use the custom hook to get the current outputs from context

    const myId = String(props.id);

    const sourceId = useMemo(() => {
        const upstream = graphIR.reverseAdj?.[myId] ?? [];
        return upstream.length ? String(upstream[0]) : null; // demo: just take the first upstream node as the source
    }, [graphIR, myId]);

    const spec = sourceId ? outputs[sourceId] : null;

    const onClick = useCallback(() => {
        // log the graphIR snapshot when the node is clicked
        console.log('[PreviewNode] graphIR snapshot:', graphIR);
    }, [graphIR]);

    const stats = useMemo(() => {
        const id = String(props.id);
        const inD = graphIR.inDegree?.[id] ?? 0;
        const outD = graphIR.outDegree?.[id] ?? 0;
        return { inD, outD };
    }, [graphIR, props.id]);

    return (
        <div className="preview-node" onClick={onClick}>
            <Handle type="target" position={Position.Left} />

            <div id="preview-node-label">Preview Node</div>

            <div id="preview-node-content">
                <OutputRenderer
                output={spec}
                emptyText={sourceId ? `No output from ${sourceId}` : 'No input'}
                />
            </div>
        </div>
    );
}

export default PreviewNode;
