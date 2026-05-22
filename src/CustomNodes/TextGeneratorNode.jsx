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

const FONT_WEIGHT_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
  { value: 'lighter', label: 'Light' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: '700' },
];

const FORMAT_OPTIONS = [
  { value: 'plain', label: 'Plain' },
  { value: 'number', label: 'Number' },
  { value: 'percent', label: 'Percent' },
];

function getPortState(isConnected) {
  return isConnected ? 'controlled' : 'normal';
}

export default function TextGeneratorNode({ id, data }) {
  const update = useUpdateNodeData(id);
  const { isConnected } = useNodeInputStates(id);

  const textControlled = isConnected('text');
  const xControlled = isConnected('x');
  const yControlled = isConnected('y');
  const fontSizeControlled = isConnected('fontSize');
  const fillControlled = isConnected('fill');
  const strokeControlled = isConnected('stroke');
  const strokeWidthControlled = isConnected('strokeWidth');
  const opacityControlled = isConnected('opacity');
  const rotateControlled = isConnected('rotate');

  const layoutAxis = data.layoutAxis ?? 'x';

  const gapXDisabled = layoutAxis === 'y';
  const gapYDisabled = layoutAxis === 'x';

  return (
    <NodeShell
      nodeId={id}
      title="Text Generator"
      subtitle="Generates SVG text elements from defaults or parameter inputs"
      badge="Generator"
      footer="Output: visual text collection"
      collapsed={data.collapsed}
    >
      <Handle type="source" position={Position.Right} />

      <NodeSection
        nodeId={id}
        sectionId="content"
        sectionCollapsed={data.sectionCollapsed}
        title="Content"
        subtitle="Text value and formatting"
        ports={['text']}
      >
        <PortTextField
          handleId="text"
          label="Text"
          value={data.defaultText ?? 'Label'}
          onChange={(v) => update({ defaultText: v })}
          state={getPortState(textControlled)}
          note={textControlled ? 'controlled' : undefined}
          placeholder="Label"
        />

        <SelectField
          label="Format"
          value={data.formatMode ?? 'plain'}
          onChange={(v) => update({ formatMode: v })}
          options={FORMAT_OPTIONS}
        />

        <NumberField
          label="Decimals"
          value={data.decimalPlaces ?? 0}
          onChange={(v) => update({ decimalPlaces: v })}
          min={0}
          max={6}
          step={1}
        />

        <TextField
          label="Prefix"
          value={data.prefix ?? ''}
          onChange={(v) => update({ prefix: v })}
          placeholder=""
        />

        <TextField
          label="Suffix"
          value={data.suffix ?? ''}
          onChange={(v) => update({ suffix: v })}
          placeholder=""
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="position"
        sectionCollapsed={data.sectionCollapsed}
        title="Position"
        subtitle="Text anchor position"
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

      <NodeSection
        nodeId={id}
        sectionId="typography"
        sectionCollapsed={data.sectionCollapsed}
        title="Typography"
        subtitle="Font, alignment and rotation"
        ports={['fontSize', 'rotate']}
        defaultCollapsed
      >
        <PortNumberField
          handleId="fontSize"
          label="Size"
          value={data.fontSize ?? 12}
          onChange={(v) => update({ fontSize: v })}
          min={1}
          state={getPortState(fontSizeControlled)}
          note={fontSizeControlled ? 'controlled' : undefined}
        />

        <SelectField
          label="Weight"
          value={data.fontWeight ?? 'normal'}
          onChange={(v) => update({ fontWeight: v })}
          options={FONT_WEIGHT_OPTIONS}
        />

        <TextField
          label="Family"
          value={data.fontFamily ?? 'sans-serif'}
          onChange={(v) => update({ fontFamily: v })}
          placeholder="sans-serif"
        />

        <PortNumberField
          handleId="rotate"
          label="Rotate"
          value={data.rotate ?? 0}
          onChange={(v) => update({ rotate: v })}
          step={1}
          state={getPortState(rotateControlled)}
          note={rotateControlled ? 'controlled' : undefined}
        />

        <SelectField
          label="Align X"
          value={data.alignX ?? 'center'}
          onChange={(v) => update({ alignX: v })}
          options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
          ]}
        />

        <SelectField
          label="Align Y"
          value={data.alignY ?? 'center'}
          onChange={(v) => update({ alignY: v })}
          options={[
            { value: 'top', label: 'Top' },
            { value: 'center', label: 'Center' },
            { value: 'bottom', label: 'Bottom' },
            { value: 'baseline', label: 'Baseline' },
          ]}
        />

        <NumberField
          label="Max W"
          value={data.maxWidth ?? 0}
          onChange={(v) => update({ maxWidth: v })}
          min={0}
          step={1}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="style"
        sectionCollapsed={data.sectionCollapsed}
        title="Style"
        subtitle="Fill, outline and opacity"
        ports={['fill', 'stroke', 'strokeWidth', 'opacity']}
        defaultCollapsed
      >
        <PortColorField
          handleId="fill"
          label="Fill"
          value={data.fillColor ?? '#111111'}
          onChange={(v) => update({ fillColor: v })}
          state={getPortState(fillControlled)}
          note={fillControlled ? 'controlled' : undefined}
        />

        <PortColorField
          handleId="stroke"
          label="Stroke"
          value={data.strokeColor ?? '#000000'}
          onChange={(v) => update({ strokeColor: v })}
          state={getPortState(strokeControlled)}
          note={strokeControlled ? 'controlled' : undefined}
        />

        <PortNumberField
          handleId="strokeWidth"
          label="Stroke W"
          value={data.strokeWidth ?? 0}
          onChange={(v) => update({ strokeWidth: v })}
          step={0.5}
          min={0}
          state={getPortState(strokeWidthControlled)}
          note={strokeWidthControlled ? 'controlled' : undefined}
        />

        <PortNumberField
          handleId="opacity"
          label="Opacity"
          value={data.opacity ?? 1}
          onChange={(v) => update({ opacity: v })}
          step={0.05}
          min={0}
          max={1}
          state={getPortState(opacityControlled)}
          note={opacityControlled ? 'controlled' : undefined}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="fallbackLayout"
        sectionCollapsed={data.sectionCollapsed}
        title="Fallback Layout"
        subtitle="Used only when x/y are not driven by inputs"
        ports={['layoutGapX', 'layoutGapY']}
        defaultCollapsed
      >
        <SelectField
          label="Axis"
          value={layoutAxis}
          onChange={(v) => update({ layoutAxis: v })}
          options={[
            { value: 'x', label: 'X axis' },
            { value: 'y', label: 'Y axis' },
          ]}
        />

        <PortNumberField
          handleId="layoutGapX"
          label="Gap X"
          value={data.layoutGapX ?? 40}
          onChange={(v) => update({ layoutGapX: v })}
          disabled={gapXDisabled}
          state={gapXDisabled ? 'inactive' : 'normal'}
          note={gapXDisabled ? 'inactive' : undefined}
        />

        <PortNumberField
          handleId="layoutGapY"
          label="Gap Y"
          value={data.layoutGapY ?? 20}
          onChange={(v) => update({ layoutGapY: v })}
          disabled={gapYDisabled}
          state={gapYDisabled ? 'inactive' : 'normal'}
          note={gapYDisabled ? 'inactive' : undefined}
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