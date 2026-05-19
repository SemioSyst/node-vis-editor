// src/CustomNodes/UI/NodeSection.jsx
// A simple section component for grouping related fields in a node's UI.
import './nodeUi.css';

export default function NodeSection({ title, subtitle, children, collapsed = false }) {
  if (collapsed) return null;

  return (
    <section className="node-section">
      <div className="node-section__header">
        <div className="node-section__title">{title}</div>
        {subtitle && <div className="node-section__subtitle">{subtitle}</div>}
      </div>

      <div className="node-section__body">
        {children}
      </div>
    </section>
  );
}