// src/export/downloadJson.js

export function downloadJson(data, filename = 'node-vis-export.json') {
  const safeFilename = ensureJsonFilename(filename);

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    {
      type: 'application/json',
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = safeFilename;
  link.click();

  URL.revokeObjectURL(url);
}

export function makeSafeFilename(name, suffix = 'nodevis-embed') {
  const base = String(name || 'untitled-visual')
    .trim()
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'untitled-visual';

  return `${base}.${suffix}.json`;
}

function ensureJsonFilename(filename) {
  const value = String(filename || 'node-vis-export.json');

  if (value.endsWith('.json')) return value;

  return `${value}.json`;
}