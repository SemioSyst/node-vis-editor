// src/CustomNodes/ContextSlotsNode.jsx
import { useEffect, useMemo } from 'react';
import { Handle, Position } from '@xyflow/react';

import NodeShell from './UI/NodeShell.jsx';
import NodeSection from './UI/NodeSection.jsx';
import {
  SelectField,
  TextField,
  NumberField,
} from './UI/NodeFields.jsx';
import { PortStatusRow } from './UI/PortFields.jsx';
import { useUpdateNodeData } from './UI/useUpdateNodeData.js';

import {
  NodeRegistryButton,
  NodeRegistryCard,
  NodeRegistryCardHeader,
  NodeRegistryEmpty,
  NodeRegistryIconButton,
  NodeRegistryList,
  NodeRegistryMetaLine,
} from './UI/NodeRegistryList.jsx';

import {
  getDefaultContextPathForProperty,
  getDefaultPropertyForKind,
  inferFormatForProperty,
} from '../context/contextSlotElements.js';

const SOURCE_OPTIONS = [
  { value: 'contextPath', label: 'Context Path' },
  { value: 'fixed', label: 'Fixed Value' },
];

const FORMAT_OPTIONS = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'percent', label: 'Percent' },
  { value: 'color', label: 'Color' },
  { value: 'stateKey', label: 'State Key' },
  { value: 'raw', label: 'Raw' },
];

const CONTEXT_PATH_OPTIONS = [
  { value: 'tags.item', label: 'tags.item' },
  { value: 'tags.year', label: 'tags.year' },
  { value: 'tags.series', label: 'tags.series' },
  { value: 'dataRef.value', label: 'dataRef.value' },
  { value: 'dataRef.rawValue', label: 'dataRef.rawValue' },
  { value: 'rawValue', label: 'rawValue' },
  { value: 'value', label: 'value' },
  { value: 'sourceItems.x.rawValue', label: 'sourceItems.x.rawValue' },
  { value: 'sourceItems.y.rawValue', label: 'sourceItems.y.rawValue' },
  { value: 'sourceItems.height.rawValue', label: 'sourceItems.height.rawValue' },
  { value: 'sourceItems.fill.color', label: 'sourceItems.fill.color' },
  { value: '__custom__', label: 'Custom...' },
];

export default function ContextSlotsNode({ id, data }) {
  const update = useUpdateNodeData(id);

  const elements = data.availableElements ?? data.contextSlotElements ?? [];
  const registeredElements = data.registeredElements ?? [];

  const selectedElementId =
    data.selectedElementId ??
    registeredElements[0]?.elementId ??
    null;

  const selectedRegistered = registeredElements.find(
    (item) => item.elementId === selectedElementId
  ) ?? null;

  const selectedElementInfo = elements.find(
    (item) => item.elementId === selectedElementId
  ) ?? null;

  const addableElements = elements.filter(
    (element) =>
      !registeredElements.some(
        (registered) => registered.elementId === element.elementId
      )
  );

  const candidateFallbackId = addableElements[0]?.elementId ?? '';

  const candidateElementId =
    data.candidateElementId ??
    candidateFallbackId;

  useEffect(() => {
    if (!data.candidateElementId && candidateFallbackId) {
      update({ candidateElementId: candidateFallbackId });
    }
  }, [candidateFallbackId, data.candidateElementId, update]);

  const elementOptions = useMemo(() => (
    addableElements.map((element) => ({
      value: element.elementId,
      label: makeElementOptionLabel(element),
    }))
  ), [addableElements]);

  const registeredRows = useMemo(() => (
    registeredElements.map((registered) => {
      const element = elements.find(
        (item) => item.elementId === registered.elementId
      );

      return {
        ...registered,
        element,
      };
    })
  ), [registeredElements, elements]);

  const setRegisteredElements = (next) => {
    update({ registeredElements: next });
  };

  const addElement = () => {
    const element = elements.find(
      (item) => item.elementId === candidateElementId
    );

    if (!element) return;

    const nextRegistered = [
      ...registeredElements,
      {
        id: `registered-${element.elementId}`,
        elementId: element.elementId,
        alias: makeDefaultAlias(element),
        bindings: [],
      },
    ];

    const nextCandidateId =
      addableElements.find((item) => item.elementId !== element.elementId)?.elementId ??
      '';

    update({
      registeredElements: nextRegistered,
      selectedElementId: element.elementId,
      candidateElementId: nextCandidateId,
    });
  };

  const removeElement = (elementId) => {
    const next = registeredElements.filter(
      (item) => item.elementId !== elementId
    );

    update({
      registeredElements: next,
      selectedElementId:
        selectedElementId === elementId
          ? next[0]?.elementId ?? null
          : selectedElementId,
    });
  };

  const updateRegistered = (elementId, patch) => {
    setRegisteredElements(
      registeredElements.map((item) =>
        item.elementId === elementId
          ? { ...item, ...patch }
          : item
      )
    );
  };

  const addBinding = () => {
    if (!selectedRegistered || !selectedElementInfo) return;

    const property = getDefaultPropertyForKind(selectedElementInfo.kind);
    const format = inferFormatForProperty(selectedElementInfo.kind, property);

    const binding = {
      id: `binding-${selectedElementId}-${Date.now()}`,
      property,
      source: {
        type: 'contextPath',
        path: getDefaultContextPathForProperty(property),
      },
      format: {
        type: format,
        decimals: 0,
        prefix: '',
        suffix: '',
      },
      fallback: '',
    };

    updateRegistered(selectedElementId, {
      bindings: [
        ...(selectedRegistered.bindings ?? []),
        binding,
      ],
    });
  };

  const updateBinding = (bindingId, patch) => {
    if (!selectedRegistered) return;

    updateRegistered(selectedElementId, {
      bindings: (selectedRegistered.bindings ?? []).map((binding) =>
        binding.id === bindingId
          ? deepMergeBinding(binding, patch)
          : binding
      ),
    });
  };

  const removeBinding = (bindingId) => {
    if (!selectedRegistered) return;

    updateRegistered(selectedElementId, {
      bindings: (selectedRegistered.bindings ?? []).filter(
        (binding) => binding.id !== bindingId
      ),
    });
  };

  return (
    <NodeShell
      nodeId={id}
      title="Context Slots"
      subtitle="Registers component elements that can be filled by context"
      badge="Slots"
      footer="Output: visual + context slots"
      collapsed={data.collapsed}
    >
      <Handle
        type="source"
        position={Position.Right}
      />

      <NodeSection
        nodeId={id}
        sectionId="component"
        sectionCollapsed={data.sectionCollapsed}
        title="Component"
        subtitle="The component visual to register slots for"
        ports={['visual']}
      >
        <PortStatusRow
          handleId="visual"
          label="Visual"
          status={
            elements.length > 0
              ? `${elements.length} editable elements`
              : 'not scanned'
          }
        />

        {elements.length === 0 && (
          <NodeRegistryEmpty>
            Connect a visual and run the evaluator once to scan editable elements.
          </NodeRegistryEmpty>
        )}
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="addElement"
        sectionCollapsed={data.sectionCollapsed}
        title="Add Element"
        subtitle="Choose a component element to make context-driven"
      >
        <SelectField
          label="Element"
          value={candidateElementId}
          onChange={(v) => update({ candidateElementId: v })}
          options={
            elementOptions.length > 0
              ? elementOptions
              : [{ value: '', label: 'No available elements' }]
          }
        />

        <NodeRegistryButton
          variant="primary"
          fullWidth
          onClick={addElement}
          disabled={!candidateElementId}
        >
          Add Element
        </NodeRegistryButton>
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="registered"
        sectionCollapsed={data.sectionCollapsed}
        title="Registered Elements"
        subtitle="Elements currently exposed as context slots"
      >
        {registeredRows.length === 0 && (
          <NodeRegistryEmpty>
            No elements registered yet.
          </NodeRegistryEmpty>
        )}

        {registeredRows.length > 0 && (
          <NodeRegistryList>
            {registeredRows.map((registered) => {
              const selected = registered.elementId === selectedElementId;
              const element = registered.element;

              return (
                <NodeRegistryCard
                  key={registered.id}
                  selected={selected}
                >
                  <NodeRegistryCardHeader
                    title={registered.alias || element?.displayName || registered.elementId}
                    meta={`${(registered.bindings ?? []).length} bindings`}
                    onSelect={() => update({ selectedElementId: registered.elementId })}
                    actions={(
                      <NodeRegistryIconButton
                        title="Remove element"
                        onClick={() => removeElement(registered.elementId)}
                      />
                    )}
                  />

                  {element && (
                    <NodeRegistryMetaLine>
                      {element.displayName} · {element.detail}
                    </NodeRegistryMetaLine>
                  )}
                </NodeRegistryCard>
              );
            })}
          </NodeRegistryList>
        )}
      </NodeSection>

      <NodeSection
        nodeId={id}
        sectionId="editor"
        sectionCollapsed={data.sectionCollapsed}
        title="Binding Editor"
        subtitle="Edit bindings for the selected element"
      >
        {!selectedRegistered && (
          <NodeRegistryEmpty>
            Select a registered element to edit its bindings.
          </NodeRegistryEmpty>
        )}

        {selectedRegistered && (
          <>
            <TextField
              label="Alias"
              value={selectedRegistered.alias ?? ''}
              onChange={(v) => updateRegistered(selectedElementId, { alias: v })}
              placeholder="Title, Value, Background..."
            />

            {selectedElementInfo && (
              <NodeRegistryMetaLine>
                Editing: {selectedElementInfo.displayName}
              </NodeRegistryMetaLine>
            )}

            {(selectedRegistered.bindings ?? []).length > 0 && (
              <NodeRegistryList>
                {(selectedRegistered.bindings ?? []).map((binding, index) => (
                  <BindingCard
                    key={binding.id}
                    binding={binding}
                    index={index}
                    elementInfo={selectedElementInfo}
                    onChange={(patch) => updateBinding(binding.id, patch)}
                    onRemove={() => removeBinding(binding.id)}
                  />
                ))}
              </NodeRegistryList>
            )}

            {(selectedRegistered.bindings ?? []).length === 0 && (
              <NodeRegistryEmpty>
                No bindings for this element yet.
              </NodeRegistryEmpty>
            )}

            <NodeRegistryButton
              variant="primary"
              fullWidth
              onClick={addBinding}
              disabled={!selectedElementInfo}
            >
              Add Binding
            </NodeRegistryButton>
          </>
        )}
      </NodeSection>
    </NodeShell>
  );
}

function BindingCard({
  binding,
  index,
  elementInfo,
  onChange,
  onRemove,
}) {
  const propertyOptions = (elementInfo?.properties ?? []).map((property) => ({
    value: property.value,
    label: property.label,
  }));

  const sourceType = binding.source?.type ?? 'contextPath';
  const formatType = binding.format?.type ?? 'text';

  return (
    <NodeRegistryCard>
      <NodeRegistryCardHeader
        title={`Binding ${index + 1}`}
        actions={(
          <NodeRegistryIconButton
            title="Remove binding"
            onClick={onRemove}
          />
        )}
      />

      <SelectField
        label="Property"
        value={binding.property ?? propertyOptions[0]?.value ?? ''}
        onChange={(v) => {
          const nextFormat = inferFormatForProperty(
            elementInfo?.kind ?? 'element',
            v
          );

          const currentSourceType = binding.source?.type ?? 'contextPath';

          onChange({
            property: v,
            format: {
              ...(binding.format ?? {}),
              type: nextFormat,
            },
            source:
              currentSourceType === 'contextPath'
                ? {
                    type: 'contextPath',
                    path: getDefaultContextPathForProperty(v),
                  }
                : binding.source,
          });
        }}
        options={
          propertyOptions.length > 0
            ? propertyOptions
            : [{ value: binding.property ?? '', label: binding.property ?? 'Property' }]
        }
      />

      <SelectField
        label="Source"
        value={sourceType}
        onChange={(v) => onChange({
          source: {
            ...(binding.source ?? {}),
            type: v,
          },
        })}
        options={SOURCE_OPTIONS}
      />

      {sourceType === 'contextPath' && (
        <ContextPathEditor
            value={binding.source?.path ?? ''}
            onChange={(v) => onChange({
            source: {
                ...(binding.source ?? {}),
                type: 'contextPath',
                path: v,
            },
            })}
        />
      )}

      {sourceType === 'fixed' && (
        <TextField
          label="Value"
          value={binding.source?.value ?? ''}
          onChange={(v) => onChange({
            source: {
              ...(binding.source ?? {}),
              type: 'fixed',
              value: v,
            },
          })}
          placeholder="Fixed value"
        />
      )}

      <SelectField
        label="Format"
        value={formatType}
        onChange={(v) => onChange({
          format: {
            ...(binding.format ?? {}),
            type: v,
          },
        })}
        options={FORMAT_OPTIONS}
      />

      {(formatType === 'number' || formatType === 'percent') && (
        <>
          <NumberField
            label="Decimals"
            value={binding.format?.decimals ?? 0}
            onChange={(v) => onChange({
              format: {
                ...(binding.format ?? {}),
                decimals: v,
              },
            })}
            min={0}
            step={1}
          />

          <TextField
            label="Prefix"
            value={binding.format?.prefix ?? ''}
            onChange={(v) => onChange({
              format: {
                ...(binding.format ?? {}),
                prefix: v,
              },
            })}
            placeholder="$"
          />

          <TextField
            label="Suffix"
            value={binding.format?.suffix ?? ''}
            onChange={(v) => onChange({
              format: {
                ...(binding.format ?? {}),
                suffix: v,
              },
            })}
            placeholder=" TWh"
          />
        </>
      )}

      <TextField
        label="Fallback"
        value={binding.fallback ?? ''}
        onChange={(v) => onChange({ fallback: v })}
        placeholder="Optional"
      />
    </NodeRegistryCard>
  );
}

function ContextPathEditor({
  value,
  onChange,
}) {
  const knownValues = new Set(
    CONTEXT_PATH_OPTIONS
      .filter((item) => item.value !== '__custom__')
      .map((item) => item.value)
  );

  const selectValue =
    knownValues.has(value)
      ? value
      : '__custom__';

  return (
    <>
      <SelectField
        label="Field"
        value={selectValue}
        onChange={(v) => {
          if (v === '__custom__') {
            onChange(value && !knownValues.has(value) ? value : '');
            return;
          }

          onChange(v);
        }}
        options={CONTEXT_PATH_OPTIONS}
      />

      {selectValue === '__custom__' && (
        <TextField
          label="Custom Path"
          value={value}
          onChange={onChange}
          placeholder="tags.item"
        />
      )}
    </>
  );
}

function makeElementOptionLabel(element) {
  return [
    element.displayName,
    element.pathLabel,
    element.detail,
  ]
    .filter(Boolean)
    .join(' · ');
}

function makeDefaultAlias(element) {
  if (!element) return 'Element';

  if (element.kind === 'text') {
    return element.displayName?.replace(/^Text · /, '') ?? 'Text';
  }

  return element.displayName ?? 'Element';
}

function deepMergeBinding(binding, patch) {
  return {
    ...binding,
    ...patch,
    source: patch.source
      ? {
          ...(binding.source ?? {}),
          ...patch.source,
        }
      : binding.source,
    format: patch.format
      ? {
          ...(binding.format ?? {}),
          ...patch.format,
        }
      : binding.format,
  };
}