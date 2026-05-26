// src/runtime/runtimeSelectors.js

export function matchesRuntimeSelector({
  selector,
  stateValue,
  currentRef,
}) {
  if (!selector) return false;

  const type = selector.type ?? 'self';

  if (type === 'all') {
    return true;
  }

  if (type === 'self') {
    return stateValue?.elementId === currentRef?.elementId;
  }

  if (type === 'sameTag') {
    const tagKey = selector.tagKey;

    if (!tagKey) return false;

    return (
      stateValue?.tags?.[tagKey] != null &&
      stateValue.tags[tagKey] === currentRef?.tags?.[tagKey]
    );
  }

  if (type === 'sameRow') {
    return (
      stateValue?.rowIndex != null &&
      currentRef?.rowIndex != null &&
      stateValue.rowIndex === currentRef.rowIndex
    );
  }

  if (type === 'sameColumn') {
    return (
      stateValue?.colIndex != null &&
      currentRef?.colIndex != null &&
      stateValue.colIndex === currentRef.colIndex
    );
  }

  if (type === 'tagEquals') {
    const tagKey = selector.tagKey;
    const value = selector.value;

    if (!tagKey) return false;

    return currentRef?.tags?.[tagKey] === value;
  }

  if (type === 'notSameTag') {
    const tagKey = selector.tagKey;

    if (!tagKey) return false;

    return (
      stateValue?.tags?.[tagKey] != null &&
      currentRef?.tags?.[tagKey] !== stateValue.tags[tagKey]
    );
  }

  return false;
}

export function matchesEventSelector({
  selector,
  ref,
}) {
  if (!selector || selector.type === 'all') return true;

  if (selector.type === 'none') return false;

  if (selector.type === 'tagEquals') {
    return ref?.tags?.[selector.tagKey] === selector.value;
  }

  if (selector.type === 'rowEquals') {
    return (
      ref?.rowIndex != null &&
      ref.rowIndex === selector.rowIndex
    );
  }

  if (selector.type === 'columnEquals') {
    return (
      ref?.colIndex != null &&
      ref.colIndex === selector.colIndex
    );
  }

  if (selector.type === 'indexRange') {
    const index = ref?.flatIndex ?? ref?.index;

    return (
      index != null &&
      index >= selector.start &&
      index <= selector.end
    );
  }

  return true;
}

export function matchesRuntimeScope(ref, scopeId) {
  if (!scopeId) return true;
  if (!ref) return false;

  return (
    ref.nodeId === scopeId ||
    ref.collectionId === scopeId ||
    ref.generatorNodeId === scopeId ||
    Array.isArray(ref.scopeIds) && ref.scopeIds.includes(scopeId)
  );
}