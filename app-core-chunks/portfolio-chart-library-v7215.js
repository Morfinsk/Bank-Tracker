// v7215: transaction-led Investments tab renderer; cache-bumped from the supplied v7211-compatible module.
const SVG_NS = 'http://www.w3.org/2000/svg';
const WIDTH = 360;
const HEIGHT = 224;
// v7211: os Y mala odsadenie 48 px, ale popisky ako "3,6 mil. Kč" sú pri
// 8.5px monospace ~56 px široké a kreslia sa doprava zarovnané od `left - 6`,
// takže začínali na zápornej x-ovej súradnici a viewBox ich orezal (užívateľ
// videl len "| mil. Kč"). 68 px pokryje aj najdlhší tick, ktorý formatAxisValue
// pripúšťa.
const AXIS_LEFT = 74;
const AXIS_TICK_MAX_CHARS = 13;
const APP_CHART_DURATION = 2800;
const APP_CHART_EASING = 'cubic-bezier(.18,.78,.24,1)';

function svgElement(name, attributes = {}, text = null) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  });
  if (text !== null && text !== undefined) node.textContent = String(text);
  return node;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function shortLabel(value, max = 16) {
  const text = String(value == null ? '' : value);
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text;
}

function compactNumber(value) {
  const number = finiteNumber(value);
  try {
    return new Intl.NumberFormat(undefined, {
      notation: Math.abs(number) >= 10000 ? 'compact' : 'standard',
      maximumFractionDigits: Math.abs(number) < 10 ? 1 : 0
    }).format(number);
  } catch (_) {
    return String(Math.round(number));
  }
}

function formatPercentValue(value) {
  const number = finiteNumber(value);
  try {
    return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(number)}%`;
  } catch (_) {
    return `${Math.round(number * 10) / 10}%`;
  }
}

function formatValue(spec, value) {
  if (typeof spec.valueFormatter === 'function') {
    try { return String(spec.valueFormatter(value)); } catch (_) {}
  }
  const number = finiteNumber(value);
  if (spec.format === 'percent') return formatPercentValue(number);
  if (spec.format === 'days') return `${compactNumber(number)} d`;
  /* v7216: hodnoty sa zaokrúhľovali na celé jednotky kompaktného zápisu, takže
     2,63 mil. sa zobrazilo ako "3 mil." a 1,68 mil. ako "2 mil." — používateľ ich
     sčítal na 5 mil., hoci súhrn správne hlásil 4,3 mil. Držíme 3 platné číslice
     ako na osi, aby sa každý rozpis dal sčítať a sedel so súhrnom. Menu overujeme
     na ISO kód, lebo appka posiela "KČ" a Intl by vyhodil RangeError. */
  if (spec.format === 'money') {
    const code = String(spec.currency || 'CZK').trim();
    if (isIsoCurrencyCode(code)) {
      try {
        return new Intl.NumberFormat(undefined, Object.assign({
          style: 'currency',
          currency: code,
          currencyDisplay: 'narrowSymbol'
        }, Math.abs(number) >= 100000
          ? { notation: 'compact', maximumSignificantDigits: 3 }
          : { notation: 'standard', maximumFractionDigits: 0 })).format(number);
      } catch (_) {}
    }
    return `${compactNumberPrecise(number)} ${code}`.trim();
  }
  return compactNumberPrecise(number);
}

// Tick na osi musí byť krátky — používame úzky symbol meny a tvrdý strop dĺžky,
// aby sa popisok nikdy nedostal mimo viewBox.
function isIsoCurrencyCode(code) {
  return /^[A-Za-z]{3}$/.test(String(code || '').trim());
}

// Kompaktné číslo s jedným desatinným miestom. compactNumber() zaokrúhľuje
// všetko nad 10 na celé, takže dva rôzne ticky (1,66 mil. a 2,49 mil.) vyzerali
// oba ako "2 mil." a os sa nedala prečítať.
function compactNumberPrecise(value) {
  const number = finiteNumber(value);
  try {
    return new Intl.NumberFormat(undefined, {
      notation: Math.abs(number) >= 10000 ? 'compact' : 'standard',
      maximumSignificantDigits: 3
    }).format(number);
  } catch (_) {
    return String(Math.round(number));
  }
}

// Tick na osi musí byť krátky — používame úzky symbol meny a tvrdý strop dĺžky,
// aby sa popisok nikdy nedostal mimo viewBox.
// POZOR: aplikácia posiela do spec.currency aj neštandardné hodnoty ("Kč"/"KČ"),
// pri ktorých Intl so style:'currency' vyhodí RangeError. Preto ISO kód overíme
// vopred a inak formátujeme číslo zvlášť a menu pripojíme ako príponu.
function formatAxisValue(spec, value) {
  if (typeof spec.valueFormatter === 'function') {
    try { return shortLabel(String(spec.valueFormatter(value)), AXIS_TICK_MAX_CHARS); } catch (_) {}
  }
  const number = finiteNumber(value);
  if (spec.format === 'percent') return formatPercentValue(number);
  if (spec.format === 'days') return `${compactNumber(number)} d`;
  if (spec.format === 'money') {
    const code = String(spec.currency || 'CZK').trim();
    if (isIsoCurrencyCode(code)) {
      try {
        return shortLabel(new Intl.NumberFormat(undefined, {
          style: 'currency',
          currency: code,
          currencyDisplay: 'narrowSymbol',
          notation: Math.abs(number) >= 10000 ? 'compact' : 'standard',
          maximumFractionDigits: Math.abs(number) >= 10000 ? 1 : 0
        }).format(number), AXIS_TICK_MAX_CHARS);
      } catch (_) {}
    }
    return shortLabel(`${compactNumberPrecise(number)} ${code}`.trim(), AXIS_TICK_MAX_CHARS);
  }
  return shortLabel(compactNumber(number), AXIS_TICK_MAX_CHARS);
}

// Počet znakov popisku na osi X sa odvíja od toho, koľko ich je — pri dvoch
// úveroch nemá zmysel orezať oba na "Mortgag…", keď je miesta dosť.
function axisLabelMaxChars(slotWidth) {
  const perChar = 5.2;
  return clamp(Math.floor((Number(slotWidth) || 0) / perChar), 6, 22);
}

function normalizedSeries(spec) {
  if (Array.isArray(spec.series) && spec.series.length) {
    return spec.series.map((series, index) => ({
      name: String(series && series.name != null ? series.name : `Series ${index + 1}`),
      values: Array.isArray(series && series.values) ? series.values.map(finiteNumber) : [],
      color: series && typeof series.color === 'string' ? series.color : '',
      colors: Array.isArray(series && series.colors) ? series.colors.map((color) => String(color || '')) : []
    }));
  }
  return [{
    name: String(spec.name || ''),
    values: Array.isArray(spec.values) ? spec.values.map(finiteNumber) : [],
    color: typeof spec.color === 'string' ? spec.color : '',
    colors: Array.isArray(spec.colors) ? spec.colors.map((color) => String(color || '')) : []
  }];
}

function chartColor(value) {
  const color = String(value || '').trim();
  return color && !/[<>]/.test(color) ? color : '';
}

function hasRenderableData(spec) {
  // v7218: tabulka nema "series", jej datami su riadky.
  if (spec.type === 'table') return Array.isArray(spec.rows) && spec.rows.length > 0;
  if (spec.type === 'donut') {
    return Array.isArray(spec.segments) && spec.segments.some((segment) => Math.abs(finiteNumber(segment && segment.value)) > 0);
  }
  return normalizedSeries(spec).some((series) => series.values.some((value) => Math.abs(value) > 0));
}


/* v7218: tabulkovy systemovy widget (Holdings). Zamerne HTML a nie SVG - text
   v SVG sa neda zalomit ani scrollovat a pri 8 stlpcoch by bol necitatelny.
   Widget sa inak sprava ako kazdy iny systemovy graf (menu, velkost, skrytie). */
function renderDataTableV7218(container, spec) {
  const columns = Array.isArray(spec.columns) ? spec.columns : [];
  const rows = Array.isArray(spec.rows) ? spec.rows : [];
  const scroller = document.createElement('div');
  scroller.className = 'portfolio-table-scroll-v7218';
  const table = document.createElement('table');
  table.className = 'portfolio-table-v7218';
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  columns.forEach((column) => {
    const th = document.createElement('th');
    th.textContent = String(column && column.label != null ? column.label : '');
    if (column && column.align) th.style.textAlign = column.align;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  rows.forEach((row) => {
    const tr = document.createElement('tr');
    columns.forEach((column) => {
      const td = document.createElement('td');
      const cell = row ? row[column.key] : null;
      const value = cell && typeof cell === 'object' ? cell.text : cell;
      td.textContent = String(value == null ? '' : value);
      if (column && column.align) td.style.textAlign = column.align;
      const tone = cell && typeof cell === 'object' ? cell.tone : '';
      if (tone === 'positive') td.classList.add('is-positive-v7218');
      if (tone === 'negative') td.classList.add('is-negative-v7218');
      if (column && column.strong) td.classList.add('is-strong-v7218');
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  scroller.appendChild(table);
  container.appendChild(scroller);
}

function createSvg(label) {
  const svg = svgElement('svg', {
    class: 'portfolio-chart-svg-v7202',
    viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
    role: 'img',
    'aria-label': label || 'Portfolio chart',
    focusable: 'false'
  });
  return svg;
}

function addGrid(svg, left, right, top, bottom, minValue, maxValue, spec) {
  const range = maxValue - minValue || 1;
  for (let index = 0; index <= 4; index += 1) {
    const ratio = index / 4;
    const y = bottom - ratio * (bottom - top);
    const value = minValue + ratio * range;
    svg.appendChild(svgElement('line', {
      class: 'portfolio-chart-grid-v7202',
      x1: left,
      x2: right,
      y1: y,
      y2: y
    }));
    svg.appendChild(svgElement('text', {
      class: 'portfolio-chart-axis-v7202',
      x: left - 6,
      y: y + 3,
      'text-anchor': 'end'
    }, formatAxisValue(spec, value)));
  }
}

function addLegend(svg, series, startX = 176, y = 12) {
  if (!Array.isArray(series) || series.length < 2) return;
  const gap = Math.min(94, Math.max(70, 168 / series.length));
  series.slice(0, 3).forEach((item, index) => {
    const x = startX + index * gap;
    const legendColor = chartColor(item.color);
    svg.appendChild(svgElement('circle', {
      class: `portfolio-chart-fill-${index}-v7202`,
      cx: x,
      cy: y,
      r: 4,
      style: legendColor ? `fill:${legendColor}` : undefined
    }));
    svg.appendChild(svgElement('text', {
      class: 'portfolio-chart-legend-v7202',
      x: x + 8,
      y: y + 3
    }, shortLabel(item.name, 10)));
  });
}

function renderVerticalBars(svg, spec) {
  const labels = Array.isArray(spec.labels) ? spec.labels.map(String) : [];
  const series = normalizedSeries(spec);
  const left = AXIS_LEFT;
  const right = 348;
  const top = series.length > 1 ? 28 : 14;
  const bottom = 184;
  const allValues = series.flatMap((item) => item.values);
  let minValue = Math.min(0, ...allValues);
  let maxValue = Math.max(0, ...allValues);
  if (minValue === maxValue) maxValue = minValue + 1;
  const padding = (maxValue - minValue) * 0.08;
  minValue = minValue < 0 ? minValue - padding : 0;
  maxValue = maxValue > 0 ? maxValue + padding : 1;
  const range = maxValue - minValue || 1;
  const yFor = (value) => top + ((maxValue - value) / range) * (bottom - top);
  const zeroY = yFor(0);
  addGrid(svg, left, right, top, bottom, minValue, maxValue, spec);
  addLegend(svg, series);

  const labelCount = Math.max(1, labels.length, ...series.map((item) => item.values.length));
  const slot = (right - left) / labelCount;
  const groupWidth = Math.min(slot * 0.72, 44);
  const barWidth = Math.max(3, groupWidth / Math.max(1, series.length));

  for (let labelIndex = 0; labelIndex < labelCount; labelIndex += 1) {
    const center = left + slot * (labelIndex + 0.5);
    series.forEach((item, seriesIndex) => {
      const value = finiteNumber(item.values[labelIndex]);
      const valueY = yFor(value);
      const y = Math.min(zeroY, valueY);
      const height = Math.max(1, Math.abs(valueY - zeroY));
      const x = center - groupWidth / 2 + seriesIndex * barWidth + 1;
      const pointColor = chartColor(item.colors[labelIndex] || item.color);
      const rect = svgElement('rect', {
        class: `portfolio-chart-bar-v7202 portfolio-chart-fill-${seriesIndex}-v7202${value < 0 ? ' is-negative-v7202' : ''}`,
        x,
        y,
        width: Math.max(2, barWidth - 2),
        height,
        rx: 3,
        style: value < 0 || !pointColor ? undefined : `fill:${pointColor}`
      });
      rect.appendChild(svgElement('title', {}, `${labels[labelIndex] || ''} · ${item.name || ''}: ${formatValue(spec, value)}`));
      svg.appendChild(rect);
    });

    const showEvery = Math.max(1, Math.ceil(labelCount / 6));
    if (labelIndex % showEvery === 0 || labelIndex === labelCount - 1) {
      // v7211: dĺžku popisku odvodíme od šírky slotu. Predtým bola natvrdo 8
      // znakov, takže dva úvery vedľa seba boli oba "Mortgag…" a nedali sa
      // rozlíšiť. Plný text ostáva v <title> pre hover aj čítačky.
      const fullLabel = labels[labelIndex] || String(labelIndex + 1);
      const axisText = svgElement('text', {
        class: 'portfolio-chart-axis-v7202',
        x: center,
        y: 207,
        'text-anchor': 'middle'
      }, shortLabel(fullLabel, axisLabelMaxChars(slot * showEvery)));
      axisText.appendChild(svgElement('title', {}, fullLabel));
      svg.appendChild(axisText);
    }
  }

  svg.appendChild(svgElement('line', {
    class: 'portfolio-chart-zero-v7202',
    x1: left,
    x2: right,
    y1: zeroY,
    y2: zeroY
  }));
}

function renderHorizontalBars(svg, spec) {
  const labels = Array.isArray(spec.labels) ? spec.labels.map(String) : [];
  const series = normalizedSeries(spec);
  const values = (series[0] && series[0].values) || [];
  const count = Math.min(8, Math.max(labels.length, values.length));
  const left = 126;
  const right = 345;
  const top = 14;
  const bottom = 207;
  const shownValues = values.slice(0, count);
  let minValue = Math.min(0, ...shownValues);
  let maxValue = Math.max(0, ...shownValues);
  if (minValue === maxValue) maxValue = minValue + 1;
  const padding = (maxValue - minValue) * 0.08;
  minValue = minValue < 0 ? minValue - padding : 0;
  maxValue = maxValue > 0 ? maxValue + padding : 1;
  const range = maxValue - minValue || 1;
  const xFor = (value) => left + ((value - minValue) / range) * (right - left);
  const zeroX = xFor(0);
  const rowHeight = (bottom - top) / Math.max(1, count);
  const barHeight = clamp(rowHeight * 0.52, 8, 17);

  for (let index = 0; index < count; index += 1) {
    const value = finiteNumber(shownValues[index]);
    const y = top + rowHeight * index + rowHeight / 2;
    const valueX = xFor(value);
    const x = Math.min(zeroX, valueX);
    const width = Math.max(1, Math.abs(valueX - zeroX));
    const rowLabel = labels[index] || String(index + 1);
    const rowLabelNode = svgElement('text', {
      class: 'portfolio-chart-label-v7202',
      x: 8,
      y: y + 4
    }, shortLabel(rowLabel, 19));
    rowLabelNode.appendChild(svgElement('title', {}, rowLabel));
    svg.appendChild(rowLabelNode);
    const itemColor = chartColor((series[0] && series[0].colors[index]) || (series[0] && series[0].color));
    const rect = svgElement('rect', {
      class: `portfolio-chart-hbar-v7202 portfolio-chart-fill-${index % 5}-v7202${value < 0 ? ' is-negative-v7202' : ''}`,
      x,
      y: y - barHeight / 2,
      width,
      height: barHeight,
      rx: 4,
      style: value < 0 || !itemColor ? undefined : `fill:${itemColor}`
    });
    rect.appendChild(svgElement('title', {}, `${labels[index] || ''}: ${formatValue(spec, value)}`));
    svg.appendChild(rect);
    let valueLabelX;
    let valueAnchor;
    if (value >= 0) {
      const placeInside = valueX > right - 58;
      valueLabelX = placeInside ? valueX - 5 : valueX + 5;
      valueAnchor = placeInside ? 'end' : 'start';
    } else {
      const placeInside = valueX < left + 58;
      valueLabelX = placeInside ? valueX + 5 : valueX - 5;
      valueAnchor = placeInside ? 'start' : 'end';
    }
    svg.appendChild(svgElement('text', {
      class: 'portfolio-chart-value-v7202',
      x: valueLabelX,
      y: y + 4,
      'text-anchor': valueAnchor
    }, formatValue(spec, value)));
  }

  svg.appendChild(svgElement('line', {
    class: 'portfolio-chart-zero-v7202',
    x1: zeroX,
    x2: zeroX,
    y1: top,
    y2: bottom
  }));
}

function renderLines(svg, spec) {
  const labels = Array.isArray(spec.labels) ? spec.labels.map(String) : [];
  const series = normalizedSeries(spec);
  const left = AXIS_LEFT;
  const right = 348;
  const top = series.length > 1 ? 28 : 14;
  const bottom = 184;
  const allValues = series.flatMap((item) => item.values);
  let minValue = Math.min(0, ...allValues);
  let maxValue = Math.max(0, ...allValues);
  if (minValue === maxValue) maxValue = minValue + 1;
  const padding = (maxValue - minValue) * 0.08;
  minValue = minValue < 0 ? minValue - padding : 0;
  maxValue = maxValue > 0 ? maxValue + padding : 1;
  const range = maxValue - minValue || 1;
  const count = Math.max(1, labels.length, ...series.map((item) => item.values.length));
  const xFor = (index) => count <= 1 ? (left + right) / 2 : left + (index / (count - 1)) * (right - left);
  const yFor = (value) => top + ((maxValue - value) / range) * (bottom - top);
  addGrid(svg, left, right, top, bottom, minValue, maxValue, spec);
  addLegend(svg, series);

  series.forEach((item, seriesIndex) => {
    const points = item.values.slice(0, count).map((value, index) => ({
      x: xFor(index),
      y: yFor(value),
      value
    }));
    if (!points.length) return;
    let pathData = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
    if (points.length === 1) pathData += ` L ${(points[0].x + 0.1).toFixed(2)} ${points[0].y.toFixed(2)}`;
    const seriesColor = chartColor(item.color);
    const path = svgElement('path', {
      class: `portfolio-chart-line-v7202 portfolio-chart-stroke-${seriesIndex}-v7202`,
      d: pathData,
      pathLength: 1,
      style: seriesColor ? `stroke:${seriesColor}` : undefined
    });
    path.appendChild(svgElement('title', {}, item.name || spec.title || 'Trend'));
    svg.appendChild(path);
    points.forEach((point, index) => {
      const pointColor = chartColor(item.colors[index] || item.color);
      const dot = svgElement('circle', {
        class: `portfolio-chart-dot-v7202 portfolio-chart-fill-${seriesIndex}-v7202`,
        cx: point.x,
        cy: point.y,
        r: 3.2,
        style: pointColor ? `fill:${pointColor}` : undefined
      });
      dot.appendChild(svgElement('title', {}, `${labels[index] || ''} · ${item.name || ''}: ${formatValue(spec, point.value)}`));
      svg.appendChild(dot);
    });
  });

  const showEvery = Math.max(1, Math.ceil(count / 6));
  const lineSlot = count > 1 ? ((right - left) / (count - 1)) * showEvery : (right - left);
  for (let index = 0; index < count; index += 1) {
    if (index % showEvery !== 0 && index !== count - 1) continue;
    const fullLabel = labels[index] || String(index + 1);
    const axisText = svgElement('text', {
      class: 'portfolio-chart-axis-v7202',
      x: xFor(index),
      y: 207,
      'text-anchor': 'middle'
    }, shortLabel(fullLabel, axisLabelMaxChars(lineSlot)));
    axisText.appendChild(svgElement('title', {}, fullLabel));
    svg.appendChild(axisText);
  }
}

function renderDonut(svg, spec) {
  const rawSegments = (Array.isArray(spec.segments) ? spec.segments : [])
    .map((segment) => ({ label: String(segment && segment.label != null ? segment.label : ''), value: Math.max(0, finiteNumber(segment && segment.value)), color: chartColor(segment && segment.color) }))
    .filter((segment) => segment.value > 0)
    .sort((a, b) => b.value - a.value);
  const segments = rawSegments.length > 5
    ? rawSegments.slice(0, 4).concat([{ label: 'Other', value: rawSegments.slice(4).reduce((sum, item) => sum + item.value, 0) }])
    : rawSegments;
  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1;
  const cx = 116;
  const cy = 111;
  const radius = 64;
  const strokeWidth = 24;

  svg.appendChild(svgElement('circle', {
    class: 'portfolio-chart-donut-track-v7202',
    cx,
    cy,
    r: radius,
    'stroke-width': strokeWidth,
    fill: 'none'
  }));

  let offset = 0;
  segments.forEach((segment, index) => {
    const fraction = segment.value / total;
    const circle = svgElement('circle', {
      class: `portfolio-chart-donut-v7202 portfolio-chart-stroke-${index}-v7202`,
      cx,
      cy,
      r: radius,
      'stroke-width': strokeWidth,
      fill: 'none',
      style: chartColor(segment.color) ? `stroke:${chartColor(segment.color)}` : undefined,
      pathLength: 100,
      'stroke-dasharray': `${Math.max(0.2, fraction * 100)} ${Math.max(0, 100 - fraction * 100)}`,
      'stroke-dashoffset': -offset,
      transform: `rotate(-90 ${cx} ${cy})`
    });
    circle.appendChild(svgElement('title', {}, `${segment.label}: ${formatValue(spec, segment.value)} (${Math.round(fraction * 100)}%)`));
    svg.appendChild(circle);
    offset += fraction * 100;
  });

  svg.appendChild(svgElement('text', {
    class: 'portfolio-chart-donut-total-v7202',
    x: cx,
    y: cy - 2,
    'text-anchor': 'middle'
  }, formatValue(spec, total)));
  svg.appendChild(svgElement('text', {
    class: 'portfolio-chart-donut-caption-v7202',
    x: cx,
    y: cy + 17,
    'text-anchor': 'middle'
  }, shortLabel(spec.centerLabel || 'Total', 14)));

  segments.forEach((segment, index) => {
    const y = 55 + index * 29;
    svg.appendChild(svgElement('circle', {
      class: `portfolio-chart-fill-${index}-v7202`,
      cx: 222,
      cy: y,
      r: 5,
      style: chartColor(segment.color) ? `fill:${chartColor(segment.color)}` : undefined
    }));
    svg.appendChild(svgElement('text', {
      class: 'portfolio-chart-label-v7202',
      x: 234,
      y: y + 4
    }, shortLabel(segment.label, 15)));
    svg.appendChild(svgElement('text', {
      class: 'portfolio-chart-value-v7202',
      x: 348,
      y: y + 4,
      'text-anchor': 'end'
    }, `${Math.round((segment.value / total) * 100)}%`));
  });
}

function renderEmpty(container, message) {
  const empty = document.createElement('div');
  empty.className = 'portfolio-chart-empty-v7202';
  empty.textContent = message || 'Not enough data yet.';
  container.replaceChildren(empty);
}

function prefersReducedMotion() {
  try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (_) { return false; }
}

function cancelAnimations(root) {
  if (!root || typeof root.getAnimations !== 'function') return;
  try { root.getAnimations({ subtree: true }).forEach((animation) => animation.cancel()); }
  catch (_) {
    try { root.getAnimations().forEach((animation) => animation.cancel()); } catch (_) {}
  }
}

function finishAnimationStyles(element, styles) {
  Object.entries(styles || {}).forEach(([key, value]) => {
    try { element.style[key] = value; } catch (_) {}
  });
}

function settleAnimation(animation, element, styles) {
  if (!animation || !element) return;
  Promise.resolve(animation.finished).then(() => {
    finishAnimationStyles(element, styles);
    try { animation.cancel(); } catch (_) {}
  }).catch(() => {});
}

function preparePortfolioSvgForAnimation(svg) {
  if (!svg || prefersReducedMotion()) return;
  svg.querySelectorAll('.portfolio-chart-line-v7202').forEach((path) => {
    let length = 1;
    try { length = Math.max(1, path.getTotalLength()); } catch (_) {}
    path.dataset.portfolioLengthV7205 = String(length);
    path.style.opacity = '1';
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);
  });
  svg.querySelectorAll('.portfolio-chart-bar-v7202').forEach((bar) => {
    bar.style.transformBox = 'fill-box';
    bar.style.transformOrigin = 'center bottom';
    bar.style.opacity = '0.55';
    bar.style.transform = 'scaleY(.16)';
  });
  svg.querySelectorAll('.portfolio-chart-hbar-v7202').forEach((bar) => {
    bar.style.transformBox = 'fill-box';
    bar.style.transformOrigin = 'left center';
    bar.style.opacity = '0.55';
    bar.style.transform = 'scaleX(.12)';
  });
  svg.querySelectorAll('.portfolio-chart-dot-v7202').forEach((dot) => {
    dot.style.transformBox = 'fill-box';
    dot.style.transformOrigin = 'center';
    dot.style.opacity = '0';
    dot.style.transform = 'scale(.74)';
  });
  svg.querySelectorAll('.portfolio-chart-donut-v7202').forEach((segment) => {
    segment.dataset.portfolioDashV7205 = segment.getAttribute('stroke-dasharray') || '100 0';
    segment.style.opacity = '0.35';
    segment.style.strokeDasharray = '0 100';
  });
}

function animatePortfolioSvg(svg, options = {}) {
  if (!svg || svg.dataset.portfolioAnimatedV7205 === '1') return;
  svg.dataset.portfolioAnimatedV7205 = '1';
  if (prefersReducedMotion() || options.animate === false) {
    svg.querySelectorAll('.portfolio-chart-line-v7202').forEach((path) => finishAnimationStyles(path, { strokeDasharray: 'none', strokeDashoffset: '0', opacity: '1' }));
    svg.querySelectorAll('.portfolio-chart-bar-v7202,.portfolio-chart-hbar-v7202').forEach((bar) => finishAnimationStyles(bar, { opacity: '1', transform: 'none' }));
    svg.querySelectorAll('.portfolio-chart-dot-v7202').forEach((dot) => finishAnimationStyles(dot, { opacity: '1', transform: 'none' }));
    svg.querySelectorAll('.portfolio-chart-donut-v7202').forEach((segment) => finishAnimationStyles(segment, { opacity: '1', strokeDasharray: segment.dataset.portfolioDashV7205 || segment.getAttribute('stroke-dasharray') || '100 0' }));
    return;
  }
  cancelAnimations(svg);
  const duration = Math.max(240, finiteNumber(options.duration) || APP_CHART_DURATION);
  const easing = options.easing || APP_CHART_EASING;

  svg.querySelectorAll('.portfolio-chart-line-v7202').forEach((path) => {
    const length = Math.max(1, finiteNumber(path.dataset.portfolioLengthV7205) || 1);
    const animation = path.animate(
      [{ strokeDashoffset: String(length) }, { strokeDashoffset: '0' }],
      { duration, easing, fill: 'both' }
    );
    settleAnimation(animation, path, { strokeDasharray: 'none', strokeDashoffset: '0', opacity: '1' });
  });

  svg.querySelectorAll('.portfolio-chart-bar-v7202').forEach((bar, index) => {
    const animation = bar.animate(
      [{ opacity: 0.55, transform: 'scaleY(.16)' }, { opacity: 1, transform: 'scaleY(1)' }],
      { duration, delay: Math.min(180, index * 18), easing, fill: 'both' }
    );
    settleAnimation(animation, bar, { opacity: '1', transform: 'none' });
  });

  svg.querySelectorAll('.portfolio-chart-hbar-v7202').forEach((bar, index) => {
    const animation = bar.animate(
      [{ opacity: 0.55, transform: 'scaleX(.12)' }, { opacity: 1, transform: 'scaleX(1)' }],
      { duration, delay: Math.min(180, index * 18), easing, fill: 'both' }
    );
    settleAnimation(animation, bar, { opacity: '1', transform: 'none' });
  });

  svg.querySelectorAll('.portfolio-chart-dot-v7202').forEach((dot, index) => {
    const animation = dot.animate(
      [{ opacity: 0, transform: 'scale(.74)' }, { opacity: 1, transform: 'scale(1)' }],
      { duration: 650, delay: Math.max(0, duration - 700) + Math.min(220, index * 26), easing: 'ease-out', fill: 'both' }
    );
    settleAnimation(animation, dot, { opacity: '1', transform: 'none' });
  });

  svg.querySelectorAll('.portfolio-chart-donut-v7202').forEach((segment, index) => {
    const targetDash = segment.dataset.portfolioDashV7205 || segment.getAttribute('stroke-dasharray') || '100 0';
    const animation = segment.animate(
      [{ opacity: 0.35, strokeDasharray: '0 100' }, { opacity: 1, strokeDasharray: targetDash }],
      { duration, delay: Math.min(160, index * 38), easing, fill: 'both' }
    );
    settleAnimation(animation, segment, { opacity: '1', strokeDasharray: targetDash });
  });
}

export function renderPortfolioChart(container, spec = {}, options = {}) {
  if (!container) return;
  const wrapper = container.closest('.portfolio-chart-wrapper-v7202');
  if (wrapper) wrapper.classList.remove('is-rendered-v7202');
  container.replaceChildren();

  if (!hasRenderableData(spec)) {
    renderEmpty(container, spec.emptyMessage || 'Not enough data yet. Add or sync data to unlock this chart.');
    if (wrapper) wrapper.classList.add('is-rendered-v7202');
    return;
  }

  if (spec.type === 'table') {
    renderDataTableV7218(container, spec);
    if (wrapper) wrapper.classList.add('is-rendered-v7202');
    return;
  }

  const svg = createSvg(spec.ariaLabel || spec.title || 'Portfolio chart');
  switch (spec.type) {
    case 'donut':
      renderDonut(svg, spec);
      break;
    case 'horizontalBar':
      renderHorizontalBars(svg, spec);
      break;
    case 'line':
      renderLines(svg, spec);
      break;
    case 'groupedBar':
    case 'bar':
    default:
      renderVerticalBars(svg, spec);
      break;
  }
  if (options.animate !== false && !prefersReducedMotion()) preparePortfolioSvgForAnimation(svg);
  container.appendChild(svg);

  requestAnimationFrame(() => {
    if (!container.isConnected) return;
    // Reading the final box after the tab panel is visible prevents zero-width
    // measurements and keeps initialization outside the layout phase.
    try { container.getBoundingClientRect(); } catch (_) {}
    if (wrapper) wrapper.classList.add('is-rendered-v7202');
    requestAnimationFrame(() => animatePortfolioSvg(svg, options));
  });
}

export function refreshPortfolioChartLayout(container) {
  if (!container) return;
  requestAnimationFrame(() => {
    try { container.getBoundingClientRect(); } catch (_) {}
  });
}

export function clearPortfolioChart(container) {
  if (!container) return;
  cancelAnimations(container);
  container.replaceChildren();
  const wrapper = container.closest('.portfolio-chart-wrapper-v7202');
  if (wrapper) wrapper.classList.remove('is-rendered-v7202');
}
