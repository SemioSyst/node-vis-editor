// src/CustomNodes/UI/ColourRampPreview.jsx

import {
  getSequentialInterpolator,
  getDivergingInterpolator,
  getCategoricalPalette,
} from '../../evaluator/mappers/colorSchemes.js';

import './colourRampPreview.css';

export default function ColourRampPreview({
  colourMode = 'sequential',

  sequentialScheme = 'viridis',
  divergingScheme = 'rdBu',
  categoricalScheme = 'tableau10',

  manualColours = '[#5b78ff,#ff7a59,#36c285,#f2c94c]',

  reverse = false,

  domainMode = 'auto',
  domainMin = 0,
  domainCenter = 0,
  domainMax = 100,

  missingColour = '#cccccc',
}) {
  if (colourMode === 'categorical') {
    const palette = normalizePalette(getCategoricalPalette(categoricalScheme), reverse);

    return (
      <CategoricalPreview
        title={categoricalScheme}
        palette={palette}
        missingColour={missingColour}
      />
    );
  }

  if (colourMode === 'manual') {
    const palette = normalizePalette(parseColourList(manualColours), reverse);

    return (
      <CategoricalPreview
        title="Manual"
        palette={palette}
        missingColour={missingColour}
      />
    );
  }

  if (colourMode === 'diverging') {
    const interpolator = getDivergingInterpolator(divergingScheme);
    const samples = sampleInterpolator(interpolator, reverse, 32);

    return (
      <ContinuousPreview
        title={divergingScheme}
        samples={samples}
        missingColour={missingColour}
        labels={[
          formatDomainLabel(domainMode, domainMin, 'min'),
          formatDomainLabel(domainMode, domainCenter, 'center'),
          formatDomainLabel(domainMode, domainMax, 'max'),
        ]}
        diverging
      />
    );
  }

  const interpolator = getSequentialInterpolator(sequentialScheme);
  const samples = sampleInterpolator(interpolator, reverse, 32);

  return (
    <ContinuousPreview
      title={sequentialScheme}
      samples={samples}
      missingColour={missingColour}
      labels={[
        formatDomainLabel(domainMode, domainMin, 'min'),
        formatDomainLabel(domainMode, domainMax, 'max'),
      ]}
    />
  );
}

function ContinuousPreview({
  title,
  samples,
  missingColour,
  labels,
  diverging = false,
}) {
  const gradient = `linear-gradient(to right, ${samples.join(', ')})`;

  return (
    <div className="colour-ramp-preview">
      <div className="colour-ramp-preview__top">
        <div className="colour-ramp-preview__title">
          {title}
        </div>

        <div className="colour-ramp-preview__missing">
          <span
            className="colour-ramp-preview__missing-swatch"
            style={{ background: missingColour }}
          />
          <span>missing</span>
        </div>
      </div>

      <div className="colour-ramp-preview__bar-wrap">
        <div
          className="colour-ramp-preview__bar"
          style={{ background: gradient }}
        />

        {diverging && (
          <div className="colour-ramp-preview__center-marker" />
        )}
      </div>

      <div className={diverging ? 'colour-ramp-preview__labels colour-ramp-preview__labels--three' : 'colour-ramp-preview__labels'}>
        {labels.map((label, index) => (
          <span key={`${label}-${index}`}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function CategoricalPreview({
  title,
  palette,
  missingColour,
}) {
  const visiblePalette = palette.length > 0
    ? palette
    : ['#cccccc'];

  return (
    <div className="colour-ramp-preview">
      <div className="colour-ramp-preview__top">
        <div className="colour-ramp-preview__title">
          {title}
        </div>

        <div className="colour-ramp-preview__missing">
          <span
            className="colour-ramp-preview__missing-swatch"
            style={{ background: missingColour }}
          />
          <span>missing</span>
        </div>
      </div>

      <div className="colour-ramp-preview__swatches">
        {visiblePalette.slice(0, 16).map((colour, index) => (
          <div
            key={`${colour}-${index}`}
            className="colour-ramp-preview__swatch"
            style={{ background: colour }}
            title={`${index}: ${colour}`}
          />
        ))}
      </div>

      <div className="colour-ramp-preview__caption">
        {visiblePalette.length} colours
        {visiblePalette.length > 16 ? ' · showing first 16' : ''}
      </div>
    </div>
  );
}

function sampleInterpolator(interpolator, reverse, count) {
  return Array.from({ length: count }, (_, index) => {
    const t = count <= 1 ? 0 : index / (count - 1);
    const resolvedT = reverse ? 1 - t : t;
    return interpolator(resolvedT);
  });
}

function normalizePalette(palette, reverse) {
  const values = Array.isArray(palette)
    ? palette.filter(Boolean)
    : [];

  return reverse ? [...values].reverse() : values;
}

function parseColourList(text) {
  const raw = String(text ?? '').trim();

  if (!raw) return [];

  if (raw.startsWith('[') && raw.endsWith(']')) {
    try {
      const parsed = JSON.parse(raw);

      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item).trim())
          .filter(Boolean);
      }
    } catch {
      return splitRelaxedColourList(raw.slice(1, -1));
    }
  }

  return splitRelaxedColourList(raw);
}

function splitRelaxedColourList(text) {
  const result = [];
  let current = '';
  let quote = null;
  let parenDepth = 0;

  const source = String(text ?? '');

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];

    if ((char === '"' || char === "'") && source[i - 1] !== '\\') {
      if (quote === char) {
        quote = null;
      } else if (!quote) {
        quote = char;
      }

      current += char;
      continue;
    }

    if (!quote) {
      if (char === '(') parenDepth += 1;
      if (char === ')') parenDepth = Math.max(0, parenDepth - 1);

      if (char === ',' && parenDepth === 0) {
        pushCurrent();
        continue;
      }
    }

    current += char;
  }

  pushCurrent();

  return result;

  function pushCurrent() {
    const value = stripSimpleQuotes(current.trim());

    if (value) {
      result.push(value);
    }

    current = '';
  }
}

function stripSimpleQuotes(value) {
  return String(value ?? '').replace(/^['"]|['"]$/g, '');
}

function formatDomainLabel(domainMode, value, fallback) {
  if (domainMode === 'auto') {
    if (fallback === 'min') return 'auto min';
    if (fallback === 'max') return 'auto max';
    if (fallback === 'center') return String(value ?? 0);
  }

  return String(value ?? fallback);
}