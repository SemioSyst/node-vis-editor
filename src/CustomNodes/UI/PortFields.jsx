// src/CustomNodes/UI/PortFields.jsx
import { Handle, Position } from '@xyflow/react';
import './nodeUi.css';

function PortFieldShell({
  handleId,
  label,
  children,
  state = 'normal',
  note,
}) {
  const isControlled = state === 'controlled';
  const isInactive = state === 'inactive';
  const isDisabled = isControlled || isInactive;

  const resolvedNote =
    note ??
    (isControlled ? 'input' : isInactive ? 'inactive' : undefined);

  return (
    <div
      className={[
        'port-field',
        isControlled ? 'port-field--controlled' : '',
        isInactive ? 'port-field--inactive' : '',
      ].join(' ')}
    >
      <div className="port-field__handle-slot">
        <Handle
          type="target"
          id={handleId}
          position={Position.Left}
          className="port-field__handle"
          isConnectable={!isInactive}
        />
      </div>

      <div className="port-field__label-wrap">
        <div className="port-field__label">{label}</div>
        {resolvedNote && (
          <div className="port-field__note">{resolvedNote}</div>
        )}
      </div>

      <div className="port-field__control">
        {children({ disabled: isDisabled })}
      </div>
    </div>
  );
}

export function PortNumberField({
  handleId,
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  state = 'normal',
  note,
}) {
  return (
    <PortFieldShell
      handleId={handleId}
      label={label}
      state={state}
      note={note}
    >
      {({ disabled }) => (
        <input
          className="node-input nodrag"
          type="number"
          step={step}
          min={min}
          max={max}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === '' ? '' : Number(raw));
          }}
        />
      )}
    </PortFieldShell>
  );
}

export function PortTextField({
  handleId,
  label,
  value,
  onChange,
  placeholder,
  state = 'normal',
  note,
}) {
  return (
    <PortFieldShell
      handleId={handleId}
      label={label}
      state={state}
      note={note}
    >
      {({ disabled }) => (
        <input
          className="node-input nodrag"
          type="text"
          value={value ?? ''}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </PortFieldShell>
  );
}

export function PortColorField({
  handleId,
  label,
  value,
  onChange,
  state = 'normal',
  note,
}) {
  return (
    <PortFieldShell
      handleId={handleId}
      label={label}
      state={state}
      note={note}
    >
      {({ disabled }) => (
        <div className="node-color-row">
          <input
            className="node-color nodrag"
            type="color"
            value={normalizeColor(value)}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            className="node-input nodrag"
            type="text"
            value={value ?? ''}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </PortFieldShell>
  );
}

export function PortStatusRow({
  handleId,
  label,
  status = 'Input',
  state = 'normal',
}) {
  const isControlled = state === 'controlled';
  const isInactive = state === 'inactive';

  return (
    <div
      className={[
        'port-status-row',
        isControlled ? 'port-status-row--active' : '',
        isInactive ? 'port-status-row--inactive' : '',
      ].join(' ')}
    >
      <div className="port-field__handle-slot">
        <Handle
          type="target"
          id={handleId}
          position={Position.Left}
          className="port-field__handle"
          isConnectable={!isInactive}
        />
      </div>

      <div className="port-status-row__text">
        <span className="port-status-row__label">{label}</span>
        <span className="port-status-row__status">
          {isControlled ? 'connected' : status}
        </span>
      </div>
    </div>
  );
}

function normalizeColor(value) {
  if (typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)) {
    return value;
  }

  return '#000000';
}