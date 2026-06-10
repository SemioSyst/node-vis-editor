// src/CustomNodes/ShapeGeneratorNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import { SelectField } from './UI/NodeFields.jsx';
import {
  PortNumberField,
  PortColorField,
  PortTextField,
  PortStatusRow,
} from './UI/PortFields.jsx';
import { useNodeInputStates } from './UI/useNodeInputStates.js';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

export default function ShapeGeneratorNode({ id, data }) {
    const update = useUpdateNodeData(id);

    const shapeType = data.shapeType ?? 'rect';
    const circleVariant = data.circleVariant ?? 'fullCircle';
    const layoutMode = data.layoutMode ?? legacyLayoutAxisToMode(data.layoutAxis ?? 'auto');

    const gapXDisabled = layoutMode === 'linearY';
    const gapYDisabled = layoutMode === 'linearX';

    const { isConnected } = useNodeInputStates(id);

    const frameControlled = isConnected('frame');
    const styleControlled = isConnected('style');

    const getParamState = (handleId) => {
    if (
        frameControlled &&
        ['x', 'y', 'width', 'height', 'alignX', 'alignY'].includes(handleId)
    ) {
        return 'controlled';
    }

    if (
        styleControlled &&
        ['fill', 'stroke', 'strokeWidth', 'opacity'].includes(handleId)
    ) {
        return 'controlled';
    }

    if (isConnected(handleId)) {
        return 'controlled';
    }

    return 'normal';
    };

    const getLayoutGapState = (handleId) => {
        if (handleId === 'layoutGapX' && gapXDisabled) {
            return 'inactive';
        }

        if (handleId === 'layoutGapY' && gapYDisabled) {
            return 'inactive';
        }

        return getParamState(handleId);
        };

  return (
    <NodeShell
        title="Shape Generator"
        subtitle="Generates visual shape elements from defaults or parameter inputs"
        badge="Generator"
        footer="Output: visual collection"
    >
        <Handle type="source" position={Position.Right} />

        <NodeSection
            nodeId={id}
            sectionId="shape"
            sectionCollapsed={data.sectionCollapsed}
            title="Shape"
            subtitle="Basic generation setting"
        >
        <SelectField
            label="Type"
            value={shapeType}
            onChange={(v) => update({ shapeType: v })}
            options={[
            { value: 'rect', label: 'Rect' },
            { value: 'circle', label: 'Circle' },
            { value: 'line', label: 'Line' },
            ]}
        />
        {shapeType === 'circle' && (
            <SelectField
                label="Circle Variant"
                value={circleVariant}
                onChange={(v) => update({ circleVariant: v })}
                options={[
                { value: 'fullCircle', label: 'Full Circle' },
                { value: 'donutRing', label: 'Donut / Ring' },
                { value: 'sectorWedge', label: 'Sector / Wedge' },
                { value: 'pieDonutValues', label: 'Pie / Donut from Values' },
                ]}
            />
        )}
        </NodeSection>

        <NodeSection
            nodeId={id}
            sectionId="position"
            sectionCollapsed={data.sectionCollapsed}
            title="Position"
            subtitle="Parameter inputs override fallback layout"
            ports={['x', 'y']}
        >
        <PortNumberField
            handleId="x"
            label="X"
            value={data.defaultX ?? 0}
            onChange={(v) => update({ defaultX: v })}
            state={getParamState('x')}
        />

        <PortNumberField
            handleId="y"
            label="Y"
            value={data.defaultY ?? 0}
            onChange={(v) => update({ defaultY: v })}
            state={getParamState('y')}
        />
        </NodeSection>

        <NodeSection
            nodeId={id}
            sectionId="geometry"
            sectionCollapsed={data.sectionCollapsed}
            title="Geometry"
            subtitle="Shape size and alignment to the generated point"
            ports={[
                'width',
                'height',
                'radius',
                'cornerRadius',
                'outerRadius',
                'innerRadius',
                'startAngle',
                'endAngle',
                'totalAngle',
                'padAngle',
                'values',
            ]}
            defaultCollapsed
        >
        {(shapeType === 'rect' || shapeType === 'line') && (
            <>
            <PortNumberField
                handleId="width"
                label={shapeType === 'line' ? 'End X' : 'Width'}
                value={data.defaultWidth ?? 12}
                onChange={(v) => update({ defaultWidth: v })}
                state={getParamState('width')}
            />

            <PortNumberField
                handleId="height"
                label={shapeType === 'line' ? 'End Y' : 'Height'}
                value={data.defaultHeight ?? 40}
                onChange={(v) => update({ defaultHeight: v })}
                state={getParamState('height')}
            />
            </>
        )}

        {shapeType === 'rect' && (
            <PortNumberField
            handleId="cornerRadius"
            label="Radius"
            value={data.cornerRadius ?? 0}
            onChange={(v) => update({ cornerRadius: v })}
            state={getParamState('cornerRadius')}
            />
        )}

        {shapeType === 'circle' && circleVariant === 'fullCircle' && (
            <PortNumberField
            handleId="radius"
            label="Radius"
            value={data.defaultRadius ?? 8}
            onChange={(v) => update({ defaultRadius: v })}
            state={getParamState('radius')}
            />
        )}

        {shapeType === 'circle' && circleVariant !== 'fullCircle' && (
            <>
            {circleVariant === 'pieDonutValues' && (
                <PortTextField
                    handleId="values"
                    label="Values"
                    value={data.values ?? '30,20,10,40'}
                    onChange={(v) => update({ values: v })}
                    state={getParamState('values')}
                    placeholder="30,20,10,40"
                />
            )}

            <PortNumberField
                handleId="outerRadius"
                label="Outer Radius"
                value={data.outerRadius ?? data.defaultRadius ?? 8}
                onChange={(v) => update({ outerRadius: v })}
                min={0}
                state={getParamState('outerRadius')}
            />

            <PortNumberField
                handleId="innerRadius"
                label="Inner Radius"
                value={data.innerRadius ?? 0}
                onChange={(v) => update({ innerRadius: v })}
                min={0}
                state={getParamState('innerRadius')}
            />

            {(circleVariant === 'sectorWedge' || circleVariant === 'pieDonutValues') && (
                <>
                <PortNumberField
                    handleId="startAngle"
                    label="Start Angle"
                    value={data.startAngle ?? -90}
                    onChange={(v) => update({ startAngle: v })}
                    state={getParamState('startAngle')}
                />

                {circleVariant === 'sectorWedge' ? (
                    <PortNumberField
                        handleId="endAngle"
                        label="End Angle"
                        value={data.endAngle ?? 90}
                        onChange={(v) => update({ endAngle: v })}
                        state={getParamState('endAngle')}
                    />
                ) : (
                    <PortNumberField
                        handleId="totalAngle"
                        label="Total Angle"
                        value={data.totalAngle ?? 360}
                        onChange={(v) => update({ totalAngle: v })}
                        state={getParamState('totalAngle')}
                    />
                )}

                <PortNumberField
                    handleId="padAngle"
                    label="Pad Angle"
                    value={data.padAngle ?? 0}
                    onChange={(v) => update({ padAngle: v })}
                    min={0}
                    state={getParamState('padAngle')}
                />
                </>
            )}
            </>
        )}

        <SelectField
            label="Align X"
            value={data.alignX ?? getDefaultAlignX(shapeType)}
            onChange={(v) => update({ alignX: v })}
            disabled={frameControlled}
            options={[
            { value: 'left', label: 'Left' },
            { value: 'center', label: 'Center' },
            { value: 'right', label: 'Right' },
            ]}
        />

        <SelectField
            label="Align Y"
            value={data.alignY ?? getDefaultAlignY(shapeType)}
            onChange={(v) => update({ alignY: v })}
            disabled={frameControlled}
            options={[
            { value: 'top', label: 'Top' },
            { value: 'center', label: 'Center' },
            { value: 'bottom', label: 'Bottom' },
            ]}
        />
        </NodeSection>

        <NodeSection
            nodeId={id}
            sectionId="style"
            sectionCollapsed={data.sectionCollapsed}
            title="Style"
            subtitle="Visual appearance"
            ports={['fill', 'stroke', 'strokeWidth', 'opacity']}
            defaultCollapsed
        >
        <PortColorField
            handleId="fill"
            label="Fill"
            value={data.fillColor ?? '#5b78ff'}
            onChange={(v) => update({ fillColor: v })}
            state={getParamState('fill')}
        />

        <PortColorField
            handleId="stroke"
            label="Stroke"
            value={data.strokeColor ?? '#000000'}
            onChange={(v) => update({ strokeColor: v })}
            state={getParamState('stroke')}
        />

        <PortNumberField
            handleId="strokeWidth"
            label="Stroke W"
            value={data.strokeWidth ?? 2}
            onChange={(v) => update({ strokeWidth: v })}
            step={0.5}
            min={0}
            state={getParamState('strokeWidth')}
        />

        <PortNumberField
            handleId="opacity"
            label="Opacity"
            value={data.opacity ?? 1}
            onChange={(v) => update({ opacity: v })}
            step={0.05}
            min={0}
            max={1}
            state={getParamState('opacity')}
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
            label="Mode"
            value={layoutMode}
            onChange={(v) => update({ layoutMode: v })}
            options={[
                { value: 'auto', label: 'Auto' },
                { value: 'linearX', label: 'Linear X' },
                { value: 'linearY', label: 'Linear Y' },
                { value: 'matrixGrid', label: 'Matrix Grid' },
            ]}
        />

        <PortNumberField
            handleId="layoutGapX"
            label="Gap X"
            value={data.layoutGapX ?? 18}
            onChange={(v) => update({ layoutGapX: v })}
            state={getLayoutGapState('layoutGapX')}
            note={gapXDisabled ? 'inactive' : undefined}
        />

        <PortNumberField
            handleId="layoutGapY"
            label="Gap Y"
            value={data.layoutGapY ?? 18}
            onChange={(v) => update({ layoutGapY: v })}
            state={getLayoutGapState('layoutGapY')}
            note={gapYDisabled ? 'inactive' : undefined}
        />

        <SelectField
            label="Rows"
            value={data.matrixRowDirection ?? 'down'}
            onChange={(v) => update({ matrixRowDirection: v })}
            disabled={layoutMode === 'linearX' || layoutMode === 'linearY'}
            state={
                layoutMode === 'linearX' || layoutMode === 'linearY'
                ? 'inactive'
                : 'normal'
            }
            note={
                layoutMode === 'linearX' || layoutMode === 'linearY'
                ? 'grid only'
                : undefined
            }
            options={[
                { value: 'down', label: 'Down' },
                { value: 'up', label: 'Up' },
            ]}
        />
        </NodeSection>

        <NodeSection
            nodeId={id}
            sectionId="advancedInputs"
            sectionCollapsed={data.sectionCollapsed}
            title="Advanced Inputs"
            subtitle="Grouped inputs can take control over related parameters"
            ports={['frame', 'style']}
            defaultCollapsed
        >
        <PortStatusRow
            handleId="frame"
            label="Frame"
            status="x / y / width / height / align"
            state={frameControlled ? 'controlled' : 'normal'}
        />

        <PortStatusRow
            handleId="style"
            label="Style"
            status="fill / stroke / opacity"
            state={styleControlled ? 'controlled' : 'normal'}
        />
        </NodeSection>
    </NodeShell>
    );
}

function getDefaultAlignX(shapeType) {
  if (shapeType === 'circle') return 'center';
  return 'left';
}

function getDefaultAlignY(shapeType) {
  if (shapeType === 'circle') return 'center';
  if (shapeType === 'rect') return 'bottom';
  return 'top';
}

function legacyLayoutAxisToMode(axis) {
  if (axis === 'x') return 'linearX';
  if (axis === 'y') return 'linearY';
  if (axis === 'linearX') return 'linearX';
  if (axis === 'linearY') return 'linearY';
  if (axis === 'matrixGrid') return 'matrixGrid';
  return 'auto';
}
