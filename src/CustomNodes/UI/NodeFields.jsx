// src/CustomNodes/UI/NodeFields.jsx
// A collection of common field components for node UIs, like text inputs, dropdowns, color pickers, etc.
import './nodeUi.css';

function BaseField({ label, children }) {
  return (
    <label className="node-field">
      <span className="node-field__label">{label}</span>
      <div className="node-field__control">
        {children}
      </div>
    </label>
  );
}

export function TextField({ label, value, onChange, placeholder }) {
  return (
    <BaseField label={label}>
      <input
        className="node-input nodrag"
        type="text"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </BaseField>
  );
}

export function NumberField({ label, value, onChange, step = 1, min, max }) {
  return (
    <BaseField label={label}>
      <input
        className="node-input nodrag"
        type="number"
        step={step}
        min={min}
        max={max}
        value={value ?? ''}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === '' ? '' : Number(raw));
        }}
      />
    </BaseField>
  );
}

export function SelectField({ label, value, onChange, options, disabled = false }) {
  return (
    <BaseField label={label}>
      <select
        className="node-input nodrag"
        value={value ?? ''}
        disabled={disabled}
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
    </BaseField>
  );
}

export function ColorField({ label, value, onChange }) {
  return (
    <BaseField label={label}>
      <div className="node-color-row">
        <input
          className="node-color nodrag"
          type="color"
          value={value ?? '#000000'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="node-input nodrag"
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </BaseField>
  );
}

export function TextareaField({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <BaseField label={label}>
      <textarea
        className="node-textarea nodrag"
        rows={rows}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </BaseField>
  );
}