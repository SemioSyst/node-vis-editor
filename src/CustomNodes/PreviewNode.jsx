import { useCallback, useMemo } from 'react';
import { Position, Handle } from '@xyflow/react';
import { useGraphIR } from '../GraphIRContext.js'; // import the custom hook to access graphIR context
import { useOutputs } from '../OutputsContext.jsx'; // import the custom hook to access outputs context
import './PreviewNode.css';

// A simple function to render SVG shapes based on a spec object. This is just for demonstration;
function renderShape(spec) {
    if (!spec) return null;

    // If the spec is an array, render each item in the array (allows for grouping multiple shapes)
    if (Array.isArray(spec)) {
        return spec.map((s, i) => <g key={i}>{renderShape(s)}</g>);
    }

    // Otherwise, render a single shape based on its kind
    switch (spec.kind) {
        case 'circle':
        return <circle cx={spec.cx} cy={spec.cy} r={spec.r} fill={spec.fill ?? 'none'} stroke={spec.stroke} strokeWidth={spec.strokeWidth} opacity={spec.opacity} />;
        case 'rect':
        return <rect x={spec.x} y={spec.y} width={spec.w} height={spec.h} rx={spec.rx} ry={spec.ry} fill={spec.fill ?? 'none'} stroke={spec.stroke} strokeWidth={spec.strokeWidth} opacity={spec.opacity} />;
        case 'line':
        return <line x1={spec.x1} y1={spec.y1} x2={spec.x2} y2={spec.y2} stroke={spec.stroke ?? '#fff'} strokeWidth={spec.strokeWidth ?? 2} opacity={spec.opacity} />;
        case 'polyline':
        return <polyline points={spec.points} fill="none" stroke={spec.stroke ?? '#fff'} strokeWidth={spec.strokeWidth ?? 2} opacity={spec.opacity} />;
        case 'polygon':
        return <polygon points={spec.points} fill={spec.fill ?? 'none'} stroke={spec.stroke ?? '#fff'} strokeWidth={spec.strokeWidth ?? 2} opacity={spec.opacity} />;
        case 'path':
        return <path d={spec.d} fill={spec.fill ?? 'none'} stroke={spec.stroke ?? '#fff'} strokeWidth={spec.strokeWidth ?? 2} opacity={spec.opacity} />;
        case 'text':
        return <text x={spec.x} y={spec.y} fontSize={spec.fontSize ?? 12} fill={spec.fill ?? '#fff'}>{spec.text}</text>;
        case 'group':
        return <g transform={spec.transform}>{renderShape(spec.children)}</g>;
        default:
        return null;
    }
}


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
        alert('Preview Node clicked!');
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

            <div id="preview-node-content" >
                {spec ? (
                    <svg width="100%" height="100%" viewBox={spec.viewBox ?? '0 0 100 100'} preserveAspectRatio="xMidYMid meet">
                    {renderShape(spec)}
                    </svg>
                ) : (
                    <div style={{ fontSize: 12, opacity: 0.6, padding: 8 }}>
                    No output {sourceId ? `(from ${sourceId} missing)` : '(no input)'}
                    </div>
                )}
            </div>
            {/*
            <div id="preview-node-stats">
                <div>id: {props.id}</div>
                <div>inDegree: {stats.inD}</div>
                <div>outDegree: {stats.outD}</div>
                <div>nodes: {Object.keys(graphIR.nodesById || {}).length}</div>
                <div>edges: {graphIR.edges?.length ?? 0}</div>
            </div>
            */}
        </div>
    );
}

export default PreviewNode;
