import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  NumberField,
  TextField,
} from './UI/NodeFields.jsx';
import {
  PortNumberField,
  PortColorField,
  PortTextField,
  PortStatusRow,
} from './UI/PortFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';
import { useNodeInputStates } from './UI/useNodeInputStates.js';

const PATH_MODE_OPTIONS = [
  { value: 'linePath', label: 'Line Path' },
  { value: 'polygonPath', label: 'Polygon Path' },
  { value: 'freeformPath', label: 'Freeform Path' },
];

const CURVE_OPTIONS = [
  { value: 'linear', label: 'Linear' },
  { value: 'monotoneX', label: 'Monotone X' },
  { value: 'basis', label: 'Basis' },
  { value: 'catmullRom', label: 'Catmull Rom' },
  { value: 'step', label: 'Step' },
];

const FILL_MODE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'solid', label: 'Solid' },
];

function getPortState(isConnected) {
  return isConnected ? 'controlled' : 'normal';
}

export default function PathGeneratorNode({ id, data }) {
  const update = useUpdateNodeData(id);
  const { isConnected } = useNodeInputStates(id);

  const pathMode = data.pathMode ?? 'linePath';
  const isPointPath = pathMode === 'linePath' || pathMode === 'polygonPath';
  const isFreeform = pathMode === 'freeformPath';

  const xControlled = isConnected('x');
  const yControlled = isConnected('y');
  const pathDataControlled = isConnected('pathData');

  const strokeControlled = isConnected('stroke');
  const strokeWidthControlled = isConnected('strokeWidth');
  const fillControlled = isConnected('fill');
  const opacityControlled = isConnected('opacity');

  return (
    <NodeShell
      nodeId={id}
      title="Path Generator"
      subtitle="Generates SVG paths from points or path data"
      badge="Generator"
      footer="Output: visual path collection"
      collapsed={data.collapsed}
    >
      <Handle type="source" position={Position.Right} />

      <NodeSection
        nodeId={id}
        sectionId="path"
        sectionCollapsed={data.sectionCollapsed}
        title="Path"
        subtitle="Path generation mode"
      >
        <SelectField
          label="Mode"
          value={pathMode}
          onChange={(v) => update({ pathMode: v })}
          options={PATH_MODE_OPTIONS}
        />
      </NodeSection>

      {isPointPath && (
        <NodeSection
          nodeId={id}
          sectionId="points"
          sectionCollapsed={data.sectionCollapsed}
          title="Points"
          subtitle="Point arrays used to generate the path"
          ports={['x', 'y']}
        >
          <PortNumberField
            handleId="x"
            label="X"
            value={data.defaultX ?? 0}
            onChange={(v) => update({ defaultX: v })}
            state={getPortState(xControlled)}
            note={xControlled ? 'controlled' : undefined}
          />

          <PortNumberField
            handleId="y"
            label="Y"
            value={data.defaultY ?? 0}
            onChange={(v) => update({ defaultY: v })}
            state={getPortState(yControlled)}
            note={yControlled ? 'controlled' : undefined}
          />
        </NodeSection>
      )}

      {isFreeform && (
        <NodeSection
          nodeId={id}
          sectionId="freeform"
          sectionCollapsed={data.sectionCollapsed}
          title="Freeform"
          subtitle="Raw SVG path data"
          ports={['pathData']}
        >
          <PortTextField
            handleId="pathData"
            label="Path"
            value={data.pathData ?? 'M 0 0 L 100 50'}
            onChange={(v) => update({ pathData: v })}
            state={getPortState(pathDataControlled)}
            note={pathDataControlled ? 'controlled' : undefined}
            placeholder="M 0 0 L 100 50"
          />
        </NodeSection>
      )}

      {isPointPath && (
        <NodeSection
          nodeId={id}
          sectionId="curve"
          sectionCollapsed={data.sectionCollapsed}
          title="Curve"
          subtitle="Interpolation for point-based paths"
          defaultCollapsed
        >
          <SelectField
            label="Curve"
            value={data.curveType ?? 'linear'}
            onChange={(v) => update({ curveType: v })}
            options={CURVE_OPTIONS}
          />

          <NumberField
            label="Samples"
            value={data.sampleCount ?? 32}
            onChange={(v) => update({ sampleCount: v })}
            min={2}
            max={256}
            step={1}
          />
        </NodeSection>
      )}

      <NodeSection
        nodeId={id}
        sectionId="style"
        sectionCollapsed={data.sectionCollapsed}
        title="Style"
        subtitle="Stroke, fill and opacity"
        ports={['stroke', 'strokeWidth', 'fill', 'opacity']}
        defaultCollapsed
      >
        <SelectField
          label="Fill Mode"
          value={data.fillMode ?? (pathMode === 'polygonPath' ? 'solid' : 'none')}
          onChange={(v) => update({ fillMode: v })}
          options={FILL_MODE_OPTIONS}
        />

        <PortColorField
          handleId="fill"
          label="Fill"
          value={data.fillColor ?? '#6f86e8'}
          onChange={(v) => update({ fillColor: v })}
          state={getPortState(fillControlled)}
          note={fillControlled ? 'controlled' : undefined}
        />

        <PortColorField
          handleId="stroke"
          label="Stroke"
          value={data.strokeColor ?? '#111111'}
          onChange={(v) => update({ strokeColor: v })}
          state={getPortState(strokeControlled)}
          note={strokeControlled ? 'controlled' : undefined}
        />

        <PortNumberField
          handleId="strokeWidth"
          label="Stroke W"
          value={data.strokeWidth ?? 2}
          onChange={(v) => update({ strokeWidth: v })}
          min={0}
          step={0.5}
          state={getPortState(strokeWidthControlled)}
          note={strokeWidthControlled ? 'controlled' : undefined}
        />

        <PortNumberField
          handleId="opacity"
          label="Opacity"
          value={data.opacity ?? 1}
          onChange={(v) => update({ opacity: v })}
          min={0}
          max={1}
          step={0.05}
          state={getPortState(opacityControlled)}
          note={opacityControlled ? 'controlled' : undefined}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="advancedInputs"
        sectionCollapsed={data.sectionCollapsed}
        title="Advanced Inputs"
        subtitle="Grouped inputs can take control over related parameters"
        ports={['style']}
        defaultCollapsed
      >
        <PortStatusRow
          handleId="style"
          label="Style"
          status="fill / stroke / opacity"
        />
      </NodeSection>
    </NodeShell>
  );
}