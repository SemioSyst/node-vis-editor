// src/project/projectIO.js

export const PROJECT_FILE_VERSION = '0.1';

export function createProjectSnapshot({
  flow,
  name = 'Untitled Project',
}) {
  return {
    app: 'node-vis-editor',
    version: PROJECT_FILE_VERSION,

    name,

    savedAt: new Date().toISOString(),

    reactFlow: {
      nodes: flow.nodes ?? [],
      edges: flow.edges ?? [],
      viewport: flow.viewport ?? { x: 0, y: 0, zoom: 1 },
    },
  };
}

export function validateProjectSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Invalid project file.');
  }

  if (snapshot.app !== 'node-vis-editor') {
    throw new Error('This file is not a node-vis-editor project.');
  }

  if (!snapshot.reactFlow) {
    throw new Error('Project file is missing React Flow data.');
  }

  const { nodes, edges } = snapshot.reactFlow;

  if (!Array.isArray(nodes)) {
    throw new Error('Project file has invalid nodes.');
  }

  if (!Array.isArray(edges)) {
    throw new Error('Project file has invalid edges.');
  }

  return true;
}

export function downloadProjectSnapshot(snapshot) {
  const safeName = makeSafeFileName(snapshot.name ?? 'node-vis-project');
  const fileName = `${safeName}.nodevis.json`;

  const blob = new Blob(
    [JSON.stringify(snapshot, null, 2)],
    {
      type: 'application/json',
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

export function readProjectFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const text = String(reader.result ?? '');
        const json = JSON.parse(text);

        validateProjectSnapshot(json);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read project file.'));
    };

    reader.readAsText(file);
  });
}

export function saveProjectToLocalStorage(snapshot, key = 'node-vis-editor:auto-save') {
  localStorage.setItem(
    key,
    JSON.stringify(snapshot)
  );
}

export function loadProjectFromLocalStorage(key = 'node-vis-editor:auto-save') {
  const raw = localStorage.getItem(key);

  if (!raw) return null;

  const snapshot = JSON.parse(raw);
  validateProjectSnapshot(snapshot);

  return snapshot;
}

function makeSafeFileName(name) {
  return String(name)
    .trim()
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'node-vis-project';
}