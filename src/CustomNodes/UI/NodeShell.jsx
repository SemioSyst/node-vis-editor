// src/CustomNodes/UI/NodeShell.jsx
import './nodeUi.css';

export default function NodeShell({
  title,
  subtitle,
  badge,
  children,
  footer,
  className = '',
}) {
  return (
    <div className={`node-shell ${className}`}>
      <div className="node-shell__header">
        <div>
          <div className="node-shell__title">{title}</div>
          {subtitle && (
            <div className="node-shell__subtitle">{subtitle}</div>
          )}
        </div>

        {badge && (
          <div className="node-shell__badge">
            {badge}
          </div>
        )}
      </div>

      <div className="node-shell__body">
        {children}
      </div>

      {footer && (
        <div className="node-shell__footer">
          {footer}
        </div>
      )}
    </div>
  );
}