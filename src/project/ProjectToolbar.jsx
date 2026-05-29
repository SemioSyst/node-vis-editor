// src/project/ProjectToolbar.jsx
import './projectToolbar.css';

export default function ProjectToolbar({
  children,

  onSaveFile,
  onSaveDraft,
  onLoadDraft,
  onLoadFile,

  draftAvailable = false,
}) {
  return (
    <div className="project-toolbar">
      {children}

      <div className="project-toolbar__divider" />

      <button
        type="button"
        className="project-toolbar__button"
        onClick={onSaveFile}
        title="Download the current canvas as a project JSON file"
      >
        Save File
      </button>

      <label
        className="project-toolbar__button project-toolbar__file-button"
        title="Load a saved project JSON file"
      >
        Load File
        <input
          type="file"
          accept=".json,.nodevis.json"
          className="project-toolbar__file-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;

            onLoadFile?.(file);
            event.target.value = '';
          }}
        />
      </label>

      <button
        type="button"
        className="project-toolbar__button project-toolbar__button--secondary"
        onClick={onSaveDraft}
        title="Save the current canvas to this browser"
      >
        Save Draft
      </button>

      <button
        type="button"
        className="project-toolbar__button project-toolbar__button--secondary"
        onClick={onLoadDraft}
        disabled={!draftAvailable}
        title="Load the browser draft saved on this device"
      >
        Load Draft
      </button>
    </div>
  );
}