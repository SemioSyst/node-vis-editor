// src/CustomNodes/EventTriggerNode.jsx
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  NumberField,
} from './UI/NodeFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

import {
  NodeRegistryButton,
  NodeRegistryCard,
  NodeRegistryCardHeader,
  NodeRegistryIconButton,
  NodeRegistryList,
} from './UI/NodeRegistryList.jsx';

import ViewportTriggerEditor from './UI/ViewportTriggerEditor.jsx';

const EVENT_TYPE_OPTIONS = [
  { value: 'hover', label: 'Hover' },
  { value: 'click', label: 'Click' },
  { value: 'press', label: 'Press' },
  { value: 'scroll', label: 'Scroll' },
];

const BOOLEAN_OPTIONS = [
  { value: 'true', label: 'On' },
  { value: 'false', label: 'Off' },
];

const SCROLL_MODE_OPTIONS = [
  { value: 'elementViewport', label: 'Element in viewport' },
  { value: 'pageSteps', label: 'Page scroll steps' },
];

export default function EventTriggerNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const eventType = data.eventType ?? 'hover';
  const useCursor = data.useCursor ?? true;
  const scrollSource = data.scrollSource ?? 'elementViewport';

  const scrollSteps = normalizeScrollSteps(data.scrollSteps);

  const updateScrollStep = (stepId, patch) => {
    update({
      scrollSteps: scrollSteps.map((step) =>
        step.id === stepId
          ? { ...step, ...patch }
          : step
      ),
    });
  };

  const addScrollStep = () => {
    const last = scrollSteps[scrollSteps.length - 1];
    const previous = scrollSteps[scrollSteps.length - 2];

    const gap =
      last && previous
        ? Math.max(100, Number(last.position) - Number(previous.position))
        : 800;

    const nextPosition =
      last
        ? Number(last.position) + gap
        : 0;

    update({
      scrollSteps: [
        ...scrollSteps,
        {
          id: `step-${Date.now()}`,
          position: nextPosition,
        },
      ],
    });
  };

  const removeScrollStep = (stepId) => {
    if (scrollSteps.length <= 2) return;

    update({
      scrollSteps: scrollSteps.filter((step) => step.id !== stepId),
    });
  };

  return (
    <NodeShell
      nodeId={id}
      title="Event Trigger"
      subtitle="Turns selected elements into event sources"
      badge="Event"
      footer="Output: event signal"
      collapsed={data.collapsed}
    >
      <Handle
        type="target"
        id="selection"
        position={Position.Left}
      />

      <Handle
        type="source"
        position={Position.Right}
      />

      <NodeSection
        nodeId={id}
        sectionId="event"
        sectionCollapsed={data.sectionCollapsed}
        title="Event"
        subtitle="Choose what user action should be watched"
        ports={['selection']}
      >
        <SelectField
          label="Event"
          value={eventType}
          onChange={(v) => update({ eventType: v })}
          options={EVENT_TYPE_OPTIONS}
        />

        {eventType !== 'scroll' && (
          <SelectField
            label="Cursor"
            value={String(useCursor)}
            onChange={(v) => update({ useCursor: v === 'true' })}
            options={BOOLEAN_OPTIONS}
          />
        )}
      </NodeSection>

      {eventType === 'scroll' && (
        <NodeSection
          nodeId={id}
          sectionId="scroll"
          sectionCollapsed={data.sectionCollapsed}
          title="Scroll"
          subtitle="Configure how scroll progress is measured"
        >
          <SelectField
            label="Scroll Mode"
            value={scrollSource}
            onChange={(v) => update({ scrollSource: v })}
            options={SCROLL_MODE_OPTIONS}
          />

          {scrollSource === 'elementViewport' && (
            <>
              <ViewportTriggerEditor
                title="Start"
                elementPoint={data.scrollStartElementPoint ?? '0'}
                elementCustomPercent={data.scrollStartElementCustomPercent ?? 0}
                viewportPoint={data.scrollStartViewportPoint ?? '1'}
                viewportCustomPercent={data.scrollStartViewportCustomPercent ?? 100}
                offsetPx={data.scrollStartOffsetPx ?? 0}
                onChange={(patch) =>
                    update(mapViewportTriggerPatch('scrollStart', patch))
                }
              />

              <ViewportTriggerEditor
                title="End"
                elementPoint={data.scrollEndElementPoint ?? '1'}
                elementCustomPercent={data.scrollEndElementCustomPercent ?? 100}
                viewportPoint={data.scrollEndViewportPoint ?? '0'}
                viewportCustomPercent={data.scrollEndViewportCustomPercent ?? 0}
                offsetPx={data.scrollEndOffsetPx ?? 0}
                onChange={(patch) =>
                    update(mapViewportTriggerPatch('scrollEnd', patch))
                }
              />

              <SelectField
                label="Clamp"
                value={String(data.scrollClamp ?? true)}
                onChange={(v) => update({ scrollClamp: v === 'true' })}
                options={BOOLEAN_OPTIONS}
              />
            </>
          )}

          {scrollSource === 'pageSteps' && (
            <>
              <NumberField
                label="Transition Distance"
                value={data.pageTransitionDistance ?? 300}
                onChange={(v) => update({ pageTransitionDistance: v })}
                min={0}
                step={50}
              />

              <SelectField
                label="Clamp"
                value={String(data.scrollClamp ?? true)}
                onChange={(v) => update({ scrollClamp: v === 'true' })}
                options={BOOLEAN_OPTIONS}
              />

              <NodeRegistryList>
                {scrollSteps.map((step, index) => (
                  <NodeRegistryCard key={step.id}>
                    <NodeRegistryCardHeader
                        title={`Step ${index}`}
                        actions={(
                            <NodeRegistryIconButton
                            title="Remove step"
                            onClick={() => removeScrollStep(step.id)}
                            />
                        )}
                    />

                    <NumberField
                        label="Scroll Y (px)"
                        value={step.position}
                        onChange={(v) => updateScrollStep(step.id, { position: v })}
                        step={100}
                    />
                  </NodeRegistryCard>
                ))}
              </NodeRegistryList>

              <NodeRegistryButton
                variant="primary"
                fullWidth
                onClick={addScrollStep}
              >
                Add Step
              </NodeRegistryButton>
            </>
          )}
        </NodeSection>
      )}
    </NodeShell>
  );
}

function mapViewportTriggerPatch(prefix, patch) {
  const result = {};

  if (Object.prototype.hasOwnProperty.call(patch, 'elementPoint')) {
    result[`${prefix}ElementPoint`] = patch.elementPoint;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'elementCustomPercent')) {
    result[`${prefix}ElementCustomPercent`] = patch.elementCustomPercent;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'viewportPoint')) {
    result[`${prefix}ViewportPoint`] = patch.viewportPoint;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'viewportCustomPercent')) {
    result[`${prefix}ViewportCustomPercent`] = patch.viewportCustomPercent;
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'offsetPx')) {
    result[`${prefix}OffsetPx`] = patch.offsetPx;
  }

  return result;
}

function normalizeScrollSteps(steps) {
  const list = Array.isArray(steps) && steps.length >= 2
    ? steps
    : [
        { id: 'step-0', position: 0 },
        { id: 'step-1', position: 800 },
      ];

  return list.map((step, index) => ({
    id: step.id ?? `step-${index}`,
    position: Number(step.position ?? index * 800),
  }));
}