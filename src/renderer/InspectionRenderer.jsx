// src/renderer/InspectionRenderer.jsx

import DataTablePreview from '../CustomNodes/UI/DataTablePreview.jsx';

export default function InspectionRenderer({
  spec,
}) {
  return (
    <div
      className="inspection-renderer"
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: '#111',
        borderRadius: 8,
      }}
    >
      <DataTablePreview
        title={spec.title}
        subtitle={spec.subtitle}
        columns={spec.columns ?? []}
        rows={spec.rows ?? []}
        maxRows={spec.maxRows ?? 80}
        jsonText={spec.jsonText ?? ''}
      />
    </div>
  );
}