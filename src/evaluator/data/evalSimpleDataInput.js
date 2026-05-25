// src/evaluator/data/evalSimpleDataInput.js

export function evalSimpleDataInput(ctx) {
  const p = ctx.params ?? {};

  const requestedMode = normalizeMode(p.dataMode ?? 'auto');
  const rawText = p.rawText ?? getDefaultText(requestedMode);
  const mode = detectDataMode(rawText, requestedMode);

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

        requestedMode,
        resolvedMode: mode,
      },
    };
  }

  if (mode === 'matrix') {
    const matrix = parseBracketMatrix(rawText);

    return {
      outputType: 'data',
      version: '0.1',
      dataType: 'matrix',

      values: matrix.values,

      meta: {
        sourceNodeId: ctx.nodeId,
        label: 'Simple Matrix',

        valueType: matrix.valueType,
        rawText,
        rawRows: matrix.rawRows,

        requestedMode,
        resolvedMode: mode,

        warnings: matrix.warnings,

        matrix: {
          rows: matrix.rows,
          cols: matrix.cols,
          order: 'row-major',

          // Reserved for future TagMapper / MatrixLabelMapper.
          rowLabels: null,
          colLabels: null,
        },

        matrixItems: matrix.matrixItems,
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

      requestedMode,
      resolvedMode: mode,

      warnings: array.warnings ?? [],
    },
  };
}

function normalizeMode(mode) {
  // Old saved nodes may still use table.
  // For now, table is treated as matrix.
  if (mode === 'table') return 'matrix';

  if (mode === 'number') return 'number';
  if (mode === 'array') return 'array';
  if (mode === 'matrix') return 'matrix';

  return 'auto';
}

function detectDataMode(rawText, requestedMode = 'auto') {
  const normalizedRequestedMode = normalizeMode(requestedMode);

  if (normalizedRequestedMode !== 'auto') {
    return normalizedRequestedMode;
  }

  const raw = String(rawText ?? '').trim();

  if (!raw) return 'array';

  // Bracket matrix:
  // [[10,20],[30,40]]
  // [[A,B],[C,D]]
  if (/^\s*\[\s*\[/.test(raw)) {
    return 'matrix';
  }

  // Bracket array:
  // [10,20,30]
  if (/^\s*\[/.test(raw)) {
    return 'array';
  }

  // Comma/newline separated values are treated as array.
  if (raw.includes(',') || raw.includes('\n')) {
    return 'array';
  }

  if (Number.isFinite(Number(raw))) {
    return 'number';
  }

  return 'array';
}

function getDefaultText(mode) {
  if (mode === 'number') return '42';

  if (mode === 'matrix') {
    return '[[10,20,30],[25,15,45],[5,30,20]]';
  }

  return '[20,45,70,35]';
}

function parseNumber(text) {
  const n = Number(String(text).trim());
  return Number.isFinite(n) ? n : 0;
}

/* -------------------------------------------------------------------------- */
/* Array                                                                       */
/* -------------------------------------------------------------------------- */

function parseAutoArray(text) {
  const warnings = [];
  const raw = String(text ?? '').trim();

  if (!raw) {
    return {
      values: [],
      rawItems: [],
      valueType: 'empty',
      warnings,
    };
  }

  // Preferred array format:
  // [20,45,70,35]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed) && !parsed.some(Array.isArray)) {
        return normalizeArrayItems(parsed, warnings);
      }

      if (Array.isArray(parsed) && parsed.some(Array.isArray)) {
        warnings.push(
          'Nested array input was parsed as a flat array. Auto mode would treat this as Matrix.'
        );

        return normalizeArrayItems(parsed.flat(), warnings);
      }
    } catch {
      const relaxed = splitRelaxedRow(raw.slice(1, -1));

      if (relaxed.length > 0) {
        return normalizeArrayItems(relaxed, warnings);
      }
    }
  }

  // Backward compatible input:
  // 20,45,70,35
  const rawItems = raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  return normalizeArrayItems(rawItems, warnings);
}

function normalizeArrayItems(rawItems, warnings = []) {
  if (!rawItems.length) {
    return {
      values: [],
      rawItems: [],
      valueType: 'empty',
      warnings,
    };
  }

  const normalizedRawItems = rawItems.map((item) => String(item).trim());

  const numericValues = normalizedRawItems.map((item) => Number(item));
  const allNumbers = numericValues.every((n) => Number.isFinite(n));

  if (allNumbers) {
    return {
      values: numericValues,
      rawItems: normalizedRawItems,
      valueType: 'number',
      warnings,
    };
  }

  return {
    values: normalizedRawItems.map((item) => stripSimpleQuotes(item)),
    rawItems: normalizedRawItems,
    valueType: 'string',
    warnings,
  };
}

/* -------------------------------------------------------------------------- */
/* Matrix                                                                      */
/* -------------------------------------------------------------------------- */

function parseBracketMatrix(text) {
  const warnings = [];
  const raw = String(text ?? '').trim();

  if (!raw) {
    return makeEmptyMatrixResult(warnings);
  }

  let parsedRows = null;

  // Preferred strict JSON format:
  // [[10,20,30],[25,15,45],[5,30,20]]
  // [["A","B"],["C","D"]]
  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.every((row) => Array.isArray(row))) {
      parsedRows = parsed;
    } else if (Array.isArray(parsed)) {
      // If user enters [1,2,3] in matrix mode, treat as one matrix row.
      parsedRows = [parsed];
      warnings.push('Flat array input was treated as a single-row matrix.');
    }
  } catch {
    // Fallback to relaxed bracket parser below.
  }

  // Relaxed format:
  // [[A,B,C],[D,E,F]]
  // [[10,20,30],[25,15,45]]
  if (!parsedRows) {
    parsedRows = parseRelaxedBracketRows(raw);

    if (!parsedRows) {
      warnings.push(
        'Matrix input should use bracket format, for example [[10,20,30],[25,15,45]].'
      );

      return makeEmptyMatrixResult(warnings);
    }
  }

  const rawRows = parsedRows.map((row) =>
    row.map((cell) => String(cell ?? '').trim())
  );

  const rows = rawRows.length;
  const cols = Math.max(0, ...rawRows.map((row) => row.length));

  const rowLengths = rawRows.map((row) => row.length);
  const hasRaggedRows = rowLengths.some((length) => length !== cols);

  if (hasRaggedRows) {
    warnings.push(
      `Matrix rows have different lengths (${rowLengths.join(', ')}). Missing cells are filled with null.`
    );
  }

  const rectangularRawRows = rawRows.map((row) => {
    const next = [...row];

    while (next.length < cols) {
      next.push('');
    }

    return next;
  });

  const values = rectangularRawRows.map((row) =>
    row.map((cell) => inferMatrixValue(cell))
  );

  const flatValues = values.flat();
  const nonEmptyValues = flatValues.filter(
    (value) => value !== null && value !== ''
  );

  const allNumbers =
    nonEmptyValues.length > 0 &&
    nonEmptyValues.every(
      (value) => typeof value === 'number' && Number.isFinite(value)
    );

  const valueType = allNumbers
    ? 'number'
    : nonEmptyValues.length === 0
      ? 'empty'
      : 'mixed';

  const matrixItems = [];

  values.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      const flatIndex = rowIndex * cols + colIndex;

      matrixItems.push({
        index: flatIndex,
        flatIndex,

        rowIndex,
        colIndex,

        rowLabel: null,
        colLabel: null,

        value,
        rawValue: rectangularRawRows[rowIndex]?.[colIndex] ?? '',

        tags: null,
      });
    });
  });

  return {
    values,
    rows,
    cols,
    rawRows: rectangularRawRows,
    valueType,
    matrixItems,
    warnings,
  };
}

function makeEmptyMatrixResult(warnings = []) {
  return {
    values: [],
    rows: 0,
    cols: 0,
    rawRows: [],
    valueType: 'empty',
    matrixItems: [],
    warnings,
  };
}

function parseRelaxedBracketRows(raw) {
  const text = String(raw ?? '').trim();

  if (!text.startsWith('[') || !text.endsWith(']')) {
    return null;
  }

  // Remove outer brackets.
  const inner = text.slice(1, -1).trim();

  if (!inner) return [];

  const rows = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];

    if (char === '[') {
      if (depth > 0) current += char;
      depth += 1;
      continue;
    }

    if (char === ']') {
      depth -= 1;

      if (depth === 0) {
        rows.push(current);
        current = '';
        continue;
      }

      current += char;
      continue;
    }

    if (depth > 0) {
      current += char;
    }
  }

  if (!rows.length) {
    // Treat [1,2,3] as one row.
    return [splitRelaxedRow(inner)];
  }

  return rows.map(splitRelaxedRow);
}

function splitRelaxedRow(rowText) {
  return String(rowText)
    .split(',')
    .map((cell) => cell.trim())
    .filter((cell) => cell.length > 0);
}

function inferMatrixValue(value) {
  const trimmed = String(value ?? '').trim();

  if (trimmed === '') return null;

  const unquoted = stripSimpleQuotes(trimmed);
  const n = Number(unquoted);

  if (Number.isFinite(n)) {
    return n;
  }

  return unquoted;
}

function stripSimpleQuotes(value) {
  return String(value ?? '').replace(/^['"]|['"]$/g, '');
}