// src/evaluator/data/evalSimpleDataInput.js

export function evalSimpleDataInput(ctx) {
  const p = ctx.params ?? {};
  const mode = p.dataMode ?? 'array';
  const rawText = p.rawText ?? getDefaultText(mode);

  if (mode === 'number') {
    return {
      outputType: 'data',
      version: '0.1',
      dataType: 'number',
      value: parseNumber(rawText),
      meta: {
        sourceNodeId: ctx.nodeId,
        label: 'Simple Number',
      },
    };
  }

  if (mode === 'table') {
    const table = parseCsvTable(rawText);

    return {
      outputType: 'data',
      version: '0.1',
      dataType: 'table',
      columns: table.columns,
      rows: table.rows,
      meta: {
        sourceNodeId: ctx.nodeId,
        label: 'Simple Table',
      },
    };
  }

  return {
    outputType: 'data',
    version: '0.1',
    dataType: 'array',
    values: parseNumberArray(rawText),
    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Simple Array',
    },
  };
}

function getDefaultText(mode) {
  if (mode === 'number') return '42';
  if (mode === 'table') return 'name,value\nA,20\nB,45\nC,70\nD,35';
  return '20,45,70,35';
}

function parseNumber(text) {
  const n = Number(String(text).trim());
  return Number.isFinite(n) ? n : 0;
}

function parseNumberArray(text) {
  const values = String(text)
    .split(/[\n,]+/)
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));

  return values.length ? values : [];
}

function parseCsvTable(text) {
  const lines = String(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { columns: [], rows: [] };
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());

  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = inferValue(cells[index]);
    });

    return row;
  });

  const columns = headers.map((key) => ({
    key,
    type: inferColumnType(rows.map((row) => row[key])),
  }));

  return { columns, rows };
}

function splitCsvLine(line) {
  // Simple CSV split for demo use.
  // Later we can replace this with a robust CSV parser.
  return String(line).split(',').map((cell) => cell.trim());
}

function inferValue(value) {
  const trimmed = String(value ?? '').trim();
  const n = Number(trimmed);

  if (trimmed !== '' && Number.isFinite(n)) {
    return n;
  }

  return trimmed;
}

function inferColumnType(values) {
  const valid = values.filter((v) => v !== '' && v !== null && v !== undefined);

  if (valid.length === 0) return 'unknown';

  const allNumbers = valid.every((v) => typeof v === 'number' && Number.isFinite(v));

  return allNumbers ? 'number' : 'string';
}