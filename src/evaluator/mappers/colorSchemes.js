// src/evaluator/mappers/colorSchemes.js

import {
  interpolateViridis,
  interpolateCividis,
  interpolateTurbo,
  interpolateInferno,
  interpolateMagma,
  interpolatePlasma,

  interpolateBlues,
  interpolateGreens,
  interpolateGreys,
  interpolateOranges,
  interpolatePurples,
  interpolateReds,

  interpolateRdBu,
  interpolatePiYG,
  interpolatePRGn,
  interpolateBrBG,
  interpolatePuOr,
  interpolateSpectral,

  schemeCategory10,
  schemeTableau10,
  schemeAccent,
  schemeDark2,
  schemePaired,
  schemeSet1,
  schemeSet2,
  schemeSet3,
} from 'd3-scale-chromatic';

export const SEQUENTIAL_COLOUR_SCHEME_OPTIONS = [
  { value: 'viridis', label: 'Viridis' },
  { value: 'cividis', label: 'Cividis' },
  { value: 'turbo', label: 'Turbo' },
  { value: 'inferno', label: 'Inferno' },
  { value: 'magma', label: 'Magma' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'blues', label: 'Blues' },
  { value: 'greens', label: 'Greens' },
  { value: 'greys', label: 'Greys' },
  { value: 'oranges', label: 'Oranges' },
  { value: 'purples', label: 'Purples' },
  { value: 'reds', label: 'Reds' },
];

export const DIVERGING_COLOUR_SCHEME_OPTIONS = [
  { value: 'rdBu', label: 'RdBu' },
  { value: 'spectral', label: 'Spectral' },
  { value: 'piYG', label: 'PiYG' },
  { value: 'prGn', label: 'PRGn' },
  { value: 'brBG', label: 'BrBG' },
  { value: 'puOr', label: 'PuOr' },
];

export const CATEGORICAL_COLOUR_SCHEME_OPTIONS = [
  { value: 'category10', label: 'Category 10' },
  { value: 'tableau10', label: 'Tableau 10' },
  { value: 'accent', label: 'Accent' },
  { value: 'dark2', label: 'Dark 2' },
  { value: 'paired', label: 'Paired' },
  { value: 'set1', label: 'Set 1' },
  { value: 'set2', label: 'Set 2' },
  { value: 'set3', label: 'Set 3' },
];

export function getSequentialInterpolator(name) {
  const map = {
    viridis: interpolateViridis,
    cividis: interpolateCividis,
    turbo: interpolateTurbo,
    inferno: interpolateInferno,
    magma: interpolateMagma,
    plasma: interpolatePlasma,

    blues: interpolateBlues,
    greens: interpolateGreens,
    greys: interpolateGreys,
    oranges: interpolateOranges,
    purples: interpolatePurples,
    reds: interpolateReds,
  };

  return map[name] ?? interpolateViridis;
}

export function getDivergingInterpolator(name) {
  const map = {
    rdBu: interpolateRdBu,
    spectral: interpolateSpectral,
    piYG: interpolatePiYG,
    prGn: interpolatePRGn,
    brBG: interpolateBrBG,
    puOr: interpolatePuOr,
  };

  return map[name] ?? interpolateRdBu;
}

export function getCategoricalPalette(name) {
  const map = {
    category10: schemeCategory10,
    tableau10: schemeTableau10,
    accent: schemeAccent,
    dark2: schemeDark2,
    paired: schemePaired,
    set1: schemeSet1,
    set2: schemeSet2,
    set3: schemeSet3,
  };

  return map[name] ?? schemeTableau10 ?? schemeCategory10;
}