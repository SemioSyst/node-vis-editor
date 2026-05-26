// src/evaluator/evaluatorsByType.js
import {
  evalCircle,
  evalRect,
  evalLine,
  evalGroup,
} from './legacy/evalLegacyShapes.js';

import { evalTestVisual } from './tests/evalTestVisual.js';
import { evalTransformInteractionTest } from './tests/evalTransformInteractionTest.js';

import { evalShapeGenerator } from './generators/evalShapeGenerator.js';
import { evalSimpleDataInput } from './data/evalSimpleDataInput.js';
import { evalAxisGenerator } from './generators/evalAxisGenerator.js';
import { evalScaleMapper } from './mappers/evalScaleMapper.js';
import { evalD3AxisGenerator } from './generators/evalD3AxisGenerator.js';
import { evalCoordinateGroup } from './groups/evalCoordinateGroup.js';
import { evalTextGenerator } from './generators/evalTextGenerator.js';
import { evalPathGenerator } from './generators/evalPathGenerator.js';
import { evalTagMapper } from './mappers/evalTagMapper.js';
import { evalDataInspector } from './inspectors/evalDataInspector.js';
import { evalColourMapper } from './mappers/evalColourMapper.js';
import { evalHoverRuntimeBinder } from './interactions/evalHoverRuntimeBinder.js';
import { evalElementSelector } from './interactions/evalElementSelector.js';
import { evalEventTrigger } from './interactions/evalEventTrigger.js';

/**
 * Registry
 * IMPORTANT: these keys must match graphIR.nodesById[id].type
 * e.g. node.type = 'circle', 'rect', 'line', 'group'
 */
export const evaluatorsByType = {
  circle: evalCircle,
  rect: evalRect,
  line: evalLine,
  group: evalGroup,

  testVisual: evalTestVisual,
  transformInteractionTest: evalTransformInteractionTest,

  shapeGenerator: evalShapeGenerator,
  simpleDataInput: evalSimpleDataInput,
  axisGenerator: evalAxisGenerator,
  scaleMapper: evalScaleMapper,
  d3AxisGenerator: evalD3AxisGenerator,
  coordinateGroup: evalCoordinateGroup,
  textGenerator: evalTextGenerator,
  pathGenerator: evalPathGenerator,
  tagMapper: evalTagMapper,
  dataInspector: evalDataInspector,
  colourMapper: evalColourMapper,
  hoverRuntimeBinder: evalHoverRuntimeBinder,
  elementSelector: evalElementSelector,
  eventTrigger: evalEventTrigger,
};
