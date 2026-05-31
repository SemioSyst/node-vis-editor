// src/CustomNodes/UI/NodeRegistryList.jsx
import './NodeRegistryList.css';

export function NodeRegistryList({
  children,
  className = '',
}) {
  return (
    <div className={cx('node-registry-list', className)}>
      {children}
    </div>
  );
}

export function NodeRegistryEmpty({
  children,
}) {
  return (
    <div className="node-registry-empty">
      {children}
    </div>
  );
}

export function NodeRegistryCard({
  selected = false,
  children,
  className = '',
}) {
  return (
    <div
      className={cx(
        'node-registry-card',
        selected && 'node-registry-card--selected',
        className
      )}
    >
      {children}
    </div>
  );
}

export function NodeRegistryCardHeader({
  title,
  meta = null,
  onSelect = null,
  actions = null,
  titleClassName = '',
}) {
  const titleNode = onSelect ? (
    <button
      type="button"
      className={cx('node-registry-card__title-button', titleClassName)}
      onClick={onSelect}
      title={typeof title === 'string' ? title : undefined}
    >
      {title}
    </button>
  ) : (
    <span
      className={cx('node-registry-card__title', titleClassName)}
      title={typeof title === 'string' ? title : undefined}
    >
      {title}
    </span>
  );

  return (
    <div className="node-registry-card__header">
      {titleNode}

      {meta != null && (
        <span className="node-registry-card__meta">
          {meta}
        </span>
      )}

      {actions && (
        <div className="node-registry-card__actions">
          {actions}
        </div>
      )}
    </div>
  );
}

export function NodeRegistryMetaLine({
  children,
}) {
  if (!children) return null;

  return (
    <div className="node-registry-meta-line">
      {children}
    </div>
  );
}

export function NodeRegistryButton({
  children,
  variant = 'secondary',
  fullWidth = false,
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      className={cx(
        'node-registry-button',
        variant === 'primary' && 'node-registry-button--primary',
        variant === 'danger' && 'node-registry-button--danger',
        fullWidth && 'node-registry-button--full',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function NodeRegistryIconButton({
  children = '×',
  title,
  className = '',
  ...props
}) {
  return (
    <button
      type="button"
      className={cx('node-registry-icon-button', className)}
      title={title}
      {...props}
    >
      {children}
    </button>
  );
}

function cx(...items) {
  return items.filter(Boolean).join(' ');
}