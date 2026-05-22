// src/CustomNodes/UI/NodeSection.jsx
import './nodeUi.css';
import { useNodeInputStates } from './useNodeInputStates.js';
import { useUpdateNodeData } from './useUpdateNodeData.js';

export default function NodeSection({
  nodeId,
  sectionId,
  sectionCollapsed,
  title,
  subtitle,
  ports = [],
  defaultCollapsed = false,
  children,
}) {
  const update = useUpdateNodeData(nodeId);
  const { isConnected } = useNodeInputStates(nodeId);

  const connectedPorts = ports.filter((portId) => isConnected(portId));
  const hasConnectedPort = connectedPorts.length > 0;

  const storedCollapsed =
    sectionId && sectionCollapsed
      ? sectionCollapsed[sectionId]
      : undefined;

  const userCollapsed =
    storedCollapsed !== undefined
      ? Boolean(storedCollapsed)
      : Boolean(defaultCollapsed);

  // Safety rule:
  // If any port inside this section is connected,
  // force the section open and disable collapse.
  const isCollapsed = hasConnectedPort ? false : userCollapsed;
  const canCollapse = Boolean(sectionId && !hasConnectedPort);

  const toggleCollapsed = () => {
    if (!nodeId || !sectionId || !canCollapse) return;

    update({
      sectionCollapsed: {
        ...(sectionCollapsed ?? {}),
        [sectionId]: !isCollapsed,
      },
    });
  };

  return (
    <section
      className={[
        'node-section',
        isCollapsed ? 'node-section--collapsed' : '',
        hasConnectedPort ? 'node-section--connected' : '',
      ].join(' ')}
    >
      <div className="node-section__header">
        <div className="node-section__title-block">
          <div className="node-section__title-row">
            <span className="node-section__title">{title}</span>

            {hasConnectedPort && (
              <span className="node-section__status">
                {connectedPorts.length} connected
              </span>
            )}
          </div>

          {subtitle && (
            <div className="node-section__subtitle">
              {subtitle}
            </div>
          )}
        </div>

        <button
          type="button"
          className="node-section__collapse-button nodrag"
          onClick={toggleCollapsed}
          disabled={!canCollapse}
          title={
            hasConnectedPort
              ? 'Connected ports keep this section open'
              : isCollapsed
                ? 'Expand section'
                : 'Collapse section'
          }
        >
          {isCollapsed ? '▸' : '▾'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="node-section__body">
          {children}
        </div>
      )}
    </section>
  );
}