// src/evaluator/data/evalSimpleDataInput.js

export function evalSimpleDataInput(ctx) {
  const p = ctx.params ?? {};
  const mode = p.dataMode ?? 'array';
  const rawText = p.rawText ?? getDefaultText(mode);

  if (mode === 'number') {
    const value = parseNumber(rawText);

    return {
      outputType: 'data',
      version: '0.1',
      dataType: 'number',
      value,
      meta: {
        sourceNodeId: ctx.nodeId,
        label: 'Simple Number',
        valueType: 'number',
        rawText,
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
        rawText,
      },
    };
  }

  const array = parseAutoArray(rawText);

  return {
    outputType: 'data',
    version: '0.1',
    dataType: 'array',
    values: array.values,
    meta: {
      sourceNodeId: ctx.nodeId,
      label: 'Simple Array',
      valueType: array.valueType,
      rawItems: array.rawItems,
      rawText,
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

function parseAutoArray(text) {
  const rawItems = String(text)
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!rawItems.length) {
    return {
      values: [],
      rawItems: [],
      valueType: 'empty',
    };
  }

  const numericValues = rawItems.map((item) => Number(item));
  const allNumbers = numericValues.every((n) => Number.isFinite(n));

  if (allNumbers) {
    return {
      values: numericValues,
      rawItems,
      valueType: 'number',
    };
  }

  return {
    values: rawItems,
    rawItems,
    valueType: 'string',
  };
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