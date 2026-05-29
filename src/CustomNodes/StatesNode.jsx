// src/CustomNodes/StatesNode.jsx
import { useEffect, useMemo, useRef } from 'react';
import { Handle, Position, useStore } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  TextField,
} from './UI/NodeFields.jsx';
import {
  PortStatusRow,
} from './UI/PortFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

const MATCH_METHOD_OPTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: 'tagKeys', label: 'Tag Keys' },
  { value: 'index', label: 'Index' },
  { value: 'matrixPosition', label: 'Matrix Position' },
];

const FALLBACK_OPTIONS = [
  { value: 'index', label: 'Index' },
  { value: 'occurrence', label: 'Occurrence' },
  { value: 'strict', label: 'Strict' },
];

const ENABLE_OPTIONS = [
  { value: 'true', label: 'On' },
  { value: 'false', label: 'Off' },
];

export default function StatesNode({ id, data }) {
  const update = useUpdateNodeData(id);
  const dragIndexRef = useRef(null);

  const eventSource = useStore((store) => {
    const edges = store.edges ?? [];
    const nodes = store.nodes ?? [];

    const edge = edges.find(
      (item) => item.target === id && item.targetHandle === 'event'
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

      // EventTriggerNode stores this in data.
      eventType: sourceNode?.data?.eventType ?? null,
    };
  });

  const connectedStateSources = useStore((store) => {
    const edges = store.edges ?? [];
    const nodes = store.nodes ?? [];

    return edges
      .filter((edge) => edge.target === id && edge.targetHandle === 'states')
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

  const states = useMemo(() => {
    return reconcileUiStates(data.states ?? [], connectedStateSources);
  }, [data.states, connectedStateSources]);

  useEffect(() => {
    const current = data.states ?? [];
    const next = reconcileUiStates(current, connectedStateSources);

    if (!areStateListsEquivalent(current, next)) {
      update({ states: next });
    }
  }, [connectedStateSources, data.states, update]);

  const eventType = eventSource?.eventType ?? 'none';

  const switchOptions = getSwitchOptionsForEvent(eventType);
  const switchMode = normalizeSwitchMode(
    data.switchMode,
    eventType,
    states.filter((state) => state.enabled !== false).length
  );

  const firstEnabledStateId =
    states.find((state) => state.enabled !== false)?.id ?? null;

  const setStates = (nextStates) => {
    update({ states: nextStates });
  };

  const updateState = (stateId, patch) => {
    setStates(
      states.map((state) =>
        state.id === stateId
          ? { ...state, ...patch }
          : state
      )
    );
  };

  const moveState = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= states.length) return;

    const next = [...states];
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    setStates(next);
  };

  const reorderState = (fromIndex, toIndex) => {
    if (fromIndex == null || fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= states.length) return;
    if (toIndex < 0 || toIndex >= states.length) return;

    const next = [...states];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    setStates(next);
  };

  const eventStatus = eventSource
    ? `${eventSource.label} · ${eventType}`
    : 'not connected';

  const statesStatus =
    connectedStateSources.length > 0
      ? `${connectedStateSources.length} connected`
      : 'not connected';

  return (
    <NodeShell
      nodeId={id}
      title="States"
      subtitle="Turns visual outputs into switchable states"
      badge="State"
      footer="Output: stateful visual"
      collapsed={data.collapsed}
    >
      <Handle
        type="source"
        position={Position.Right}
      />

      <NodeSection
        nodeId={id}
        sectionId="trigger"
        sectionCollapsed={data.sectionCollapsed}
        title="Trigger"
        subtitle="How the connected event changes the active state"
        ports={['event']}
      >
        <PortStatusRow
          handleId="event"
          label="Event"
          status={eventStatus}
        />

        <SelectField
          label="Switch"
          value={switchMode}
          onChange={(v) => update({ switchMode: v })}
          options={switchOptions}
        />
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="states"
        sectionCollapsed={data.sectionCollapsed}
        title="States"
        subtitle="First enabled state is shown first"
        ports={['states']}
      >
        <PortStatusRow
          handleId="states"
          label="State Inputs"
          status={statesStatus}
        />

        {states.length === 0 && (
          <div className="node-field__note">
            Connect visual outputs to create states.
          </div>
        )}

        {states.length > 0 && (
          <>
            <div className="node-field__note">
              Drag states to change order. The first enabled state is the start state.
            </div>

            <div className="coordinate-layer-list nodrag">
              {states.map((state, index) => {
                const isStart = state.id === firstEnabledStateId;

                return (
                  <div
                    key={state.id}
                    className={[
                      'coordinate-layer-row',
                      state.enabled === false ? 'coordinate-layer-row--disabled' : '',
                    ].join(' ')}
                    draggable
                    onDragStart={() => {
                      dragIndexRef.current = index;
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={() => {
                      reorderState(dragIndexRef.current, index);
                      dragIndexRef.current = null;
                    }}
                  >
                    <div className="coordinate-layer-row__header">
                      <span className="coordinate-layer-row__drag">⋮⋮</span>

                      <span className="coordinate-layer-row__title">
                        {state.label || `State ${index + 1}`}
                      </span>

                      {isStart && (
                        <span className="coordinate-layer-row__meta">
                          Start
                        </span>
                      )}

                      {!isStart && (
                        <span className="coordinate-layer-row__meta">
                          {index + 1}
                        </span>
                      )}

                      <button
                        type="button"
                        className="coordinate-layer-row__button"
                        onClick={() => moveState(index, -1)}
                        disabled={index === 0}
                        title="Move up"
                      >
                        ↑
                      </button>

                      <button
                        type="button"
                        className="coordinate-layer-row__button"
                        onClick={() => moveState(index, 1)}
                        disabled={index === states.length - 1}
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>

                    <TextField
                      label="Label"
                      value={state.label ?? ''}
                      onChange={(v) => updateState(state.id, { label: v })}
                      placeholder={`State ${index + 1}`}
                    />

                    <SelectField
                      label="Enabled"
                      value={String(state.enabled ?? true)}
                      onChange={(v) => updateState(state.id, { enabled: v === 'true' })}
                      options={ENABLE_OPTIONS}
                    />

                    <div className="node-field__note">
                      Source: {state.sourceNodeId}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="matching"
        sectionCollapsed={data.sectionCollapsed}
        title="Matching"
        subtitle="How elements from different states are treated as the same object"
        defaultCollapsed
      >
        <SelectField
          label="Method"
          value={data.matchMethod ?? 'auto'}
          onChange={(v) => update({ matchMethod: v })}
          options={MATCH_METHOD_OPTIONS}
        />

        {(data.matchMethod ?? 'auto') === 'tagKeys' && (
          <TextField
            label="Tag Keys"
            value={data.matchTagKeys ?? 'item'}
            onChange={(v) => update({ matchTagKeys: v })}
            placeholder="item,state"
          />
        )}

        <SelectField
          label="Fallback"
          value={data.matchFallback ?? 'index'}
          onChange={(v) => update({ matchFallback: v })}
          options={FALLBACK_OPTIONS}
        />
      </NodeSection>
    </NodeShell>
  );
}

function reconcileUiStates(existingStates, connectedSources) {
  const connectedEdgeIds = new Set(
    connectedSources.map((source) => source.edgeId)
  );

  const kept = existingStates
    .filter((state) => connectedEdgeIds.has(state.edgeId))
    .map((state) => {
      const source = connectedSources.find(
        (item) => item.edgeId === state.edgeId
      );

      return {
        ...state,
        sourceNodeId: source?.sourceNodeId ?? state.sourceNodeId,
        sourceHandle: source?.sourceHandle ?? state.sourceHandle ?? null,
        edgeId: source?.edgeId ?? state.edgeId ?? null,
        label: state.label ?? source?.label ?? state.sourceNodeId,
      };
    });

  const existingEdgeIds = new Set(kept.map((state) => state.edgeId));

  const added = connectedSources
    .filter((source) => !existingEdgeIds.has(source.edgeId))
    .map((source, index) => ({
      id: `state-${source.edgeId}`,
      stateKey: `state-${source.edgeId}`,
      sourceNodeId: source.sourceNodeId,
      sourceHandle: source.sourceHandle ?? null,
      edgeId: source.edgeId ?? null,
      label: source.label ?? `State ${index + 1}`,
      enabled: true,
    }));

  return [...kept, ...added];
}

function areStateListsEquivalent(a, b) {
  if (a.length !== b.length) return false;

  return a.every((item, index) => {
    const other = b[index];

    return (
      item.id === other.id &&
      item.sourceNodeId === other.sourceNodeId &&
      item.edgeId === other.edgeId &&
      item.enabled === other.enabled
    );
  });
}

function getSwitchOptionsForEvent(eventType) {
  if (eventType === 'hover') {
    return [
      { value: 'activeWhileEvent', label: 'Active While Hovered' },
    ];
  }

  if (eventType === 'press') {
    return [
      { value: 'activeWhileEvent', label: 'Active While Pressed' },
    ];
  }

  if (eventType === 'click') {
    return [
      { value: 'toggle', label: 'Toggle' },
      { value: 'next', label: 'Next' },
      { value: 'previous', label: 'Previous' },
      { value: 'setFirst', label: 'Set First' },
    ];
  }

  return [
    { value: 'none', label: 'No Trigger' },
  ];
}

function normalizeSwitchMode(value, eventType, stateCount) {
  const options = getSwitchOptionsForEvent(eventType);
  const allowed = new Set(options.map((option) => option.value));

  if (value && allowed.has(value)) return value;

  if (eventType === 'click') {
    return stateCount <= 2 ? 'toggle' : 'next';
  }

  if (eventType === 'hover' || eventType === 'press') {
    return 'activeWhileEvent';
  }

  return options[0]?.value ?? 'none';
}