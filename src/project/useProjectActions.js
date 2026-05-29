// src/project/useProjectActions.js
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createProjectSnapshot,
  downloadProjectSnapshot,
  readProjectFile,
  saveProjectToLocalStorage,
  loadProjectFromLocalStorage,
} from './projectIO.js';

const DEFAULT_DRAFT_KEY = 'node-vis-editor:auto-save';

export function useProjectActions({
  nodes,
  edges,
  setNodes,
  setEdges,
  reactFlowInstance,
  projectName = 'node-vis-project',
  draftKey = DEFAULT_DRAFT_KEY,
}) {
  const [draftAvailable, setDraftAvailable] = useState(false);

  useEffect(() => {
    setDraftAvailable(Boolean(localStorage.getItem(draftKey)));
  }, [draftKey]);

  const getCurrentFlowObject = useCallback(() => {
    if (reactFlowInstance?.toObject) {
      return reactFlowInstance.toObject();
    }

    return {
      nodes,
      edges,
      viewport: {
        x: 0,
        y: 0,
        zoom: 1,
      },
    };
  }, [reactFlowInstance, nodes, edges]);

  const applyProjectSnapshot = useCallback((snapshot) => {
    const flow = snapshot.reactFlow ?? {};

    setNodes(flow.nodes ?? []);
    setEdges(flow.edges ?? []);

    if (flow.viewport && reactFlowInstance?.setViewport) {
      requestAnimationFrame(() => {
        reactFlowInstance.setViewport(flow.viewport);
      });
    }
  }, [reactFlowInstance, setNodes, setEdges]);

  const handleSaveFile = useCallback(() => {
    const snapshot = createProjectSnapshot({
      flow: getCurrentFlowObject(),
      name: projectName,
    });

    downloadProjectSnapshot(snapshot);
  }, [getCurrentFlowObject, projectName]);

  const handleSaveDraft = useCallback(() => {
    const snapshot = createProjectSnapshot({
      flow: getCurrentFlowObject(),
      name: `${projectName}-draft`,
    });

    saveProjectToLocalStorage(snapshot, draftKey);
    setDraftAvailable(true);

    console.info('[Project] Draft saved to this browser.');
  }, [getCurrentFlowObject, projectName, draftKey]);

  const handleLoadDraft = useCallback(() => {
    try {
      const snapshot = loadProjectFromLocalStorage(draftKey);

      if (!snapshot) {
        console.warn('[Project] No draft found in this browser.');
        setDraftAvailable(false);
        return;
      }

      applyProjectSnapshot(snapshot);
      console.info('[Project] Draft loaded.');
    } catch (error) {
      console.error('[Project] Failed to load draft:', error);
    }
  }, [applyProjectSnapshot, draftKey]);

  const handleLoadFile = useCallback(async (file) => {
    try {
      const snapshot = await readProjectFile(file);
      applyProjectSnapshot(snapshot);

      console.info('[Project] Project file loaded:', file.name);
    } catch (error) {
      console.error('[Project] Failed to load project file:', error);
    }
  }, [applyProjectSnapshot]);

  return useMemo(() => ({
    draftAvailable,

    handleSaveFile,
    handleSaveDraft,
    handleLoadDraft,
    handleLoadFile,
  }), [
    draftAvailable,
    handleSaveFile,
    handleSaveDraft,
    handleLoadDraft,
    handleLoadFile,
  ]);
}