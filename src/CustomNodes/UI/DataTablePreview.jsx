// src/CustomNodes/UI/DataTablePreview.jsx

import './dataTablePreview.css';

export default function DataTablePreview({
  columns = [],
  rows = [],
  title,
  subtitle,
  maxRows = 80,
  jsonText = '',
  emptyText = 'No data to inspect.',
}) {
  const visibleRows = rows.slice(0, maxRows);
  const hiddenCount = Math.max(0, rows.length - visibleRows.length);

  if (jsonText) {
    return (
      <div className="data-table-preview">
        {(title || subtitle) && (
          <div className="data-table-preview__header">
            {title && <div className="data-table-preview__title">{title}</div>}
            {subtitle && <div className="data-table-preview__subtitle">{subtitle}</div>}
          </div>
        )}

        <pre className="data-table-preview__json">
          {jsonText}
        </pre>
      </div>
    );
  }

  if (!columns.length || !rows.length) {
    return (
      <div className="data-table-preview data-table-preview--empty">
        {(title || subtitle) && (
          <div className="data-table-preview__header">
            {title && <div className="data-table-preview__title">{title}</div>}
            {subtitle && <div className="data-table-preview__subtitle">{subtitle}</div>}
          </div>
        )}

        <div className="data-table-preview__empty">
          {emptyText}
        </div>
      </div>
    );
  }

  return (
    <div className="data-table-preview">
      {(title || subtitle) && (
        <div className="data-table-preview__header">
          {title && <div className="data-table-preview__title">{title}</div>}
          {subtitle && <div className="data-table-preview__subtitle">{subtitle}</div>}
        </div>
      )}

      <div className="data-table-preview__scroll">
        <table className="data-table-preview__table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  {column.label ?? column.key}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row, rowIndex) => (
              <tr key={row.__rowId ?? rowIndex}>
                {columns.map((column) => (
                  <td key={column.key}>
                    {formatCell(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hiddenCount > 0 && (
        <div className="data-table-preview__footer">
          Showing {visibleRows.length} of {rows.length} rows. {hiddenCount} hidden.
        </div>
      )}
    </div>
  );
}

function formatCell(value) {
  if (value === null || value === undefined) return '';

  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(3);
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}