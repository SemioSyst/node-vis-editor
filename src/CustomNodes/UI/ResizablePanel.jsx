import { useCallback, useRef } from 'react';
import { useUpdateNodeData } from './useUpdateNodeData.js';
import './nodeUi.css';

export default function ResizablePanel({
  nodeId,
  widthKey = 'previewWidth',
  heightKey = 'previewHeight',
  width = 240,
  height = 160,
  minWidth = 160,
  minHeight = 100,
  maxWidth = 800,
  maxHeight = 600,
  children,
  className = '',
}) {
  const update = useUpdateNodeData(nodeId);
  const dragRef = useRef(null);

  const onPointerDown = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = Number(width) || minWidth;
    const startHeight = Number(height) || minHeight;

    dragRef.current = {
      startX,
      startY,
      startWidth,
      startHeight,
    };

    const onPointerMove = (moveEvent) => {
      if (!dragRef.current) return;

      const dx = moveEvent.clientX - dragRef.current.startX;
      const dy = moveEvent.clientY - dragRef.current.startY;

      const nextWidth = clamp(
        dragRef.current.startWidth + dx,
        minWidth,
        maxWidth
      );

      const nextHeight = clamp(
        dragRef.current.startHeight + dy,
        minHeight,
        maxHeight
      );

      update({
        [widthKey]: Math.round(nextWidth),
        [heightKey]: Math.round(nextHeight),
      });
    };

    const onPointerUp = () => {
      dragRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [
    update,
    width,
    height,
    widthKey,
    heightKey,
    minWidth,
    minHeight,
    maxWidth,
    maxHeight,
  ]);

  return (
    <div
      className={`resizable-panel ${className}`}
      style={{
        width,
        height,
      }}
    >
      <div className="resizable-panel__content">
        {children}
      </div>

      <div
        className="resizable-panel__handle nodrag"
        onPointerDown={onPointerDown}
        title="Resize preview"
      />
    </div>
  );
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}