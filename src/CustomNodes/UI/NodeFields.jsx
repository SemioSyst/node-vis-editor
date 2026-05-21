// src/CustomNodes/UI/NodeFields.jsx
// A collection of common field components for node UIs, like text inputs, dropdowns, color pickers, etc.
import './nodeUi.css';

function BaseField({
  label,
  children,
  state = 'normal',
  disabled = false,
  note,
}) {
  const isControlled = state === 'controlled';
  const isInactive = state === 'inactive';
  const isDisabled = disabled || isControlled || isInactive;

  const resolvedNote =
    note ??
    (isControlled ? 'controlled' : isInactive ? 'inactive' : undefined);

  return (
    <label
      className={[
        'node-field',
        isControlled ? 'node-field--controlled' : '',
        isInactive ? 'node-field--inactive' : '',
      ].join(' ')}
    >
      <span className="node-field__label-wrap">
        <span className="node-field__label">{label}</span>
        {resolvedNote && (
          <span className="node-field__note">{resolvedNote}</span>
        )}
      </span>

      <div className="node-field__control">
        {typeof children === 'function'
          ? children({ disabled: isDisabled })
          : children}
      </div>
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  state = 'normal',
  note,
}) {
  return (
    <BaseField
      label={label}
      disabled={disabled}
      state={state}
      note={note}
    >
      {({ disabled: isDisabled }) => (
        <input
          className="node-input nodrag"
          type="text"
          value={value ?? ''}
          placeholder={placeholder}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </BaseField>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  disabled = false,
  state = 'normal',
  note,
}) {
  return (
    <BaseField
      label={label}
      disabled={disabled}
      state={state}
      note={note}
    >
      {({ disabled: isDisabled }) => (
        <input
          className="node-input nodrag"
          type="number"
          step={step}
          min={min}
          max={max}
          value={value ?? ''}
          disabled={isDisabled}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === '' ? '' : Number(raw));
          }}
        />
      )}
    </BaseField>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  disabled = false,
  state = 'normal',
  note,
}) {
  return (
    <BaseField
      label={label}
      disabled={disabled}
      state={state}
      note={note}
    >
      {({ disabled: isDisabled }) => (
        <select
          className="node-input nodrag"
          value={value ?? ''}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => {
            const item = typeof opt === 'string'
              ? { value: opt, label: opt }
              : opt;

            return (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            );
          })}
        </select>
      )}
    </BaseField>
  );
}

export function ColorField({
  label,
  value,
  onChange,
  disabled = false,
  state = 'normal',
  note,
}) {
  return (
    <BaseField
      label={label}
      disabled={disabled}
      state={state}
      note={note}
    >
      {({ disabled: isDisabled }) => (
        <div className="node-color-row">
          <input
            className="node-color nodrag"
            type="color"
            value={normalizeColor(value)}
            disabled={isDisabled}
            onChange={(e) => onChange(e.target.value)}
          />

          <input
            className="node-input nodrag"
            type="text"
            value={value ?? ''}
            disabled={isDisabled}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )}
    </BaseField>
  );
}

export function TextareaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  disabled = false,
  state = 'normal',
  note,
}) {
  return (
    <BaseField
      label={label}
      disabled={disabled}
      state={state}
      note={note}
    >
      {({ disabled: isDisabled }) => (
        <textarea
          className="node-textarea nodrag"
          rows={rows}
          value={value ?? ''}
          placeholder={placeholder}
          disabled={isDisabled}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </BaseField>
  );
}

function normalizeColor(value) {
  if (typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)) {
    return value;
  }

  return '#000000';
}