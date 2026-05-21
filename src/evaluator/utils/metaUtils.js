export function getInputMeta(output) {
  return output?.meta ?? {};
}

export function getInputProvenance(output) {
  return Array.isArray(output?.meta?.provenance)
    ? output.meta.provenance
    : [];
}

export function makeProvenanceEntry({
  nodeId,
  role,
  outputType,
  dataType,
  parameterType,
  label,
  field,
  scale,
  transform,
}) {
  return {
    sourceNodeId: nodeId,
    role,
    outputType,
    dataType,
    parameterType,
    label,
    field,
    scale,
    transform,
  };
}

export function inheritProvenance(...outputs) {
  return outputs.flatMap((output) => {
    const inherited = getInputProvenance(output);

    if (inherited.length > 0) {
      return inherited;
    }

    if (output?.meta?.sourceNodeId) {
      return [
        {
          sourceNodeId: output.meta.sourceNodeId,
          role: output.meta.role,
          label: output.meta.label,
          outputType: output.outputType,
          dataType: output.dataType,
          parameterType: output.parameterType,
        },
      ];
    }

    return [];
  });
}