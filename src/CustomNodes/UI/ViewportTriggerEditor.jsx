// src/CustomNodes/UI/ViewportTriggerEditor.jsx
import {
  SelectField,
  NumberField,
} from './NodeFields.jsx';

import './ViewportTriggerEditor.css';

const POINT_OPTIONS = [
  { value: '0', label: 'Top / 0%' },
  { value: '0.5', label: 'Center / 50%' },
  { value: '1', label: 'Bottom / 100%' },
  { value: 'custom', label: 'Custom %' },
];

export default function ViewportTriggerEditor({
  title,

  elementPoint = '0',
  elementCustomPercent = 0,

  viewportPoint = '1',
  viewportCustomPercent = 100,

  offsetPx = 0,

  onChange,
}) {
  const resolvedElementPoint = elementPoint ?? '0';
  const resolvedViewportPoint = viewportPoint ?? '1';

  const patch = (next) => {
    onChange?.(next);
  };

  return (
    <div className="viewport-trigger-editor">
      <div className="viewport-trigger-editor__title">
        {title}
      </div>

      <div className="viewport-trigger-editor__body">
        <PointField
          label="Element point"
          value={resolvedElementPoint}
          customPercent={elementCustomPercent}
          onPointChange={(v) => patch({ elementPoint: v })}
          onCustomPercentChange={(v) => patch({ elementCustomPercent: v })}
        />

        <div className="viewport-trigger-editor__relation">
          reaches
        </div>

        <PointField
          label="Viewport point"
          value={resolvedViewportPoint}
          customPercent={viewportCustomPercent}
          onPointChange={(v) => patch({ viewportPoint: v })}
          onCustomPercentChange={(v) => patch({ viewportCustomPercent: v })}
        />

        <NumberField
          label="Offset (px)"
          value={offsetPx}
          onChange={(v) => patch({ offsetPx: v })}
          step={10}
        />
      </div>
    </div>
  );
}

function PointField({
  label,
  value,
  customPercent,
  onPointChange,
  onCustomPercentChange,
}) {
  return (
    <div className="viewport-trigger-editor__point-field">
      <SelectField
        label={label}
        value={value}
        onChange={onPointChange}
        options={POINT_OPTIONS}
      />

      {value === 'custom' && (
        <div className="viewport-trigger-editor__nested-field">
          <NumberField
            label="Custom %"
            value={customPercent}
            onChange={onCustomPercentChange}
            min={0}
            max={100}
            step={5}
          />
        </div>
      )}
    </div>
  );
}