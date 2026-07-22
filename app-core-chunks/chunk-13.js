// Generated app-core slice 13/34 (declarations).

function renderOverviewDashboard() {
  const netWorthEl = document.getElementById('overview-net-worth');
  if (!netWorthEl) return;
  const detailsMonth = document.getElementById('overview-details-month');
  if (detailsMonth) detailsMonth.textContent = getMonthLabel();
  const metrics = getOverviewDashboardMetrics();
  const appCurrency = metrics.appCurrency;
  document.documentElement.setAttribute('data-overview-metrics', JSON.stringify({
    net: Math.round(Number(metrics.totalNetWorth || 0)),
    cash: Math.round(Number(metrics.availableCash || 0)),
    budgetSpent: Math.round(Number(metrics.budgetSpent || 0)),
    budgetLimit: Math.round(Number(metrics.budgetLimit || 0)),
    txns: (allTransactions || []).length
  }));

  applyOverviewBalanceEl(netWorthEl, metrics.totalNetWorth, appCurrency, { animate: !!window.__overviewBalanceAnimateNext });
  netWorthEl.style.color = Number(metrics.totalNetWorth || 0) < 0 ? 'var(--danger)' : '#f8fbff';

  const availableEl = document.getElementById('overview-available-cash');
  if (availableEl) {
    const cashValue = Number(metrics.availableCash || 0);
    applyOverviewBalanceEl(availableEl, metrics.availableCash, appCurrency, { animate: !!window.__overviewBalanceAnimateNext });
    availableEl.classList.toggle('wealth-card-value-green', cashValue >= 0);
    availableEl.classList.toggle('amount-expense', cashValue < 0);
    availableEl.style.color = cashValue < 0 ? '#E5005F' : '#00E5A0';
  }
  const cardGauge = document.getElementById('overview-card-limits-gauge');
  if (cardGauge) cardGauge.innerHTML = createOverviewHalfGauge(metrics.cardPct, 'used');
  const cardLine = document.getElementById('overview-card-limits-line');
  if (cardLine) {
    let statusText = 'Missing';
    let statusClass = '';
    if (metrics.cardUsed <= 0) { statusText = ''; statusClass = 'is-empty'; }
    else if (metrics.cardLimit > 0 && metrics.cardUsed >= metrics.cardLimit) { statusText = 'Completed'; statusClass = 'is-ok'; }
    cardLine.innerHTML = createOverviewInlineProgress(`${metrics.cardUsed}`, `${metrics.cardLimit}`, metrics.cardPct, statusText, statusClass);
  }

  const budgetLine = document.getElementById('overview-bank-budget-line');
  if (budgetLine) {
    budgetLine.innerHTML = createOverviewBudgetSparkline(metrics.budgetSpent, metrics.budgetLimit, appCurrency, metrics.budgetTransactionSeries);
  }

  const cashEl = document.getElementById('overview-cash-total');
  if (cashEl) {
    cashEl.textContent = formatCurrencyAmount(metrics.cashSpent, appCurrency);
    cashEl.style.color = Number(metrics.cashSpent || 0) > 0 ? '#f8fbff' : 'var(--muted)';
  }
  const creditWidget = document.getElementById('overview-credit-widget');
  const creditGauge = document.getElementById('overview-credit-gauge');
  const creditLine = document.getElementById('overview-credit-line');
  if (creditWidget) {
    creditWidget.style.display = metrics.hasCreditWidget ? '' : 'none';
    if (metrics.hasCreditWidget) {
      if (creditGauge) creditGauge.innerHTML = createOverviewHalfGauge(metrics.creditPct, 'USED');
      if (creditLine) creditLine.innerHTML = createCreditCardLimitProgress(
        metrics.creditUsed,
        metrics.creditLimit,
        metrics.creditAvailable,
        appCurrency
      );
    }
  }
}

function getOverviewChartCardKey(card) {
  if (!card) return '';
  if (card.classList.contains('wealth-card-net') || card.querySelector('#overview-net-worth')) return 'builtin:net-worth';
  if (card.querySelector('#overview-card-limits-gauge')) return 'builtin:card-limits';
  if (card.querySelector('#overview-bank-budget-line')) return 'builtin:bank-budget';
  const widgetId = card.getAttribute('data-widget-id') || card.id;
  if (widgetId) return 'widget:' + widgetId;
  return 'card:' + (card.className || 'unknown');
}

function getOverviewChartCardSignature(card) {
  if (!card) return '';
  const parts = [];
  card.querySelectorAll('.wealth-gauge-arc, .overview-widget-arc').forEach((el) => {
    parts.push(el.getAttribute('stroke-dashoffset') || '');
    parts.push(el.style.getPropertyValue('--gauge-pct') || el.getAttribute('stroke-dasharray') || '');
  });
  card.querySelectorAll('.overview-widget-line, .wealth-spark-line, .wealth-networth-trend-line-v238').forEach((el) => parts.push(el.getAttribute('d') || ''));
  card.querySelectorAll('.overview-widget-fill, .wealth-inline-progress-fill, .custom-widget-gauge-fill').forEach((el) => parts.push(el.style.width || ''));
  card.querySelectorAll('.wealth-card-value, .custom-widget-gauge-metric-label-v262, .custom-widget-linear-label-v260, .custom-widget-fit-value').forEach((el) => {
    parts.push(String(el.textContent || '').replace(/\s+/g, ' ').trim());
  });
  return parts.join('|');
}

function getOverviewSummarySignature() {
  const page = document.getElementById('page-overview');
  if (!page) return '';
  const parts = [];
  page.querySelectorAll('.summary-item').forEach((el) => parts.push(String(el.textContent || '').replace(/\s+/g, ' ').trim()));
  const daysFill = document.getElementById('sum-days-progress-fill');
  if (daysFill) parts.push(String(daysFill.style.width || ''));
  return parts.join('|');
}

function captureOverviewChartSignatures() {
  const page = document.getElementById('page-overview');
  const sigs = { __summary: getOverviewSummarySignature() };
  if (!page) return sigs;
  getOverviewChartCards(page).forEach((card) => {
    const key = getOverviewChartCardKey(card);
    if (key) sigs[key] = getOverviewChartCardSignature(card);
  });
  return sigs;
}

function overviewChartCardDataChanged(card, beforeSigs) {
  if (!beforeSigs) return true;
  const key = getOverviewChartCardKey(card);
  if (!key) return true;
  return beforeSigs[key] !== getOverviewChartCardSignature(card);
}

function overviewChartIntroIsCurrent(card) {
  if (!card) return false;
  const sig = getOverviewChartCardSignature(card);
  return !!sig && card.dataset.btChartAnimSig === sig;
}

function getOverviewChartCardsNeedingIntro(page = document.getElementById('page-overview')) {
  return getOverviewChartCards(page).filter((card) => {
    if (!overviewChartCardHasGraphics(card)) return false;
    if (!isOverviewChartCardVisible(card)) return false;
    return !overviewChartIntroIsCurrent(card);
  });
}

function canRunOverviewChartIntro() {
  if (activePageId !== 'overview') return false;
  if (typeof __appBootActive !== 'undefined' && __appBootActive) return false;
  if (document.body.classList.contains('app-boot-pending')) return false;
  if (typeof isPageLoadingOverlayBlocking === 'function' && isPageLoadingOverlayBlocking()) return false;
  // v3910: never start line draw while sync/boot data is still unsettled
  // (frozen partial "Spent" line).
  if (shouldWaitForOverviewDataSync() && !__overviewChartsDataSettled) return false;
  if (typeof isSyncing !== 'undefined' && isSyncing) return false;
  return true;
}

function getOverviewIntroCards(page, options = {}) {
  const mode = options.mode || 'visible';
  const beforeSigs = options.beforeSigs || null;
  if (mode === 'boot') {
    return getOverviewChartCards(page).filter((card) => overviewChartCardHasGraphics(card));
  }
  return getOverviewChartCards(page).filter((card) => {
    if (!overviewChartCardHasGraphics(card)) return false;
    if (!isOverviewChartCardVisible(card)) return false;
    if (mode === 'changed-visible') return overviewChartCardDataChanged(card, beforeSigs);
    return true;
  });
}

function getOverviewChartCards(page = document.getElementById('page-overview')) {
  if (!page) return [];
  const cards = [];
  const netCard = document.getElementById('overview-net-worth')?.closest('.wealth-card-net');
  if (netCard) cards.push(netCard);
  const gaugeCard = document.getElementById('overview-card-limits-gauge')?.closest('.wealth-card');
  if (gaugeCard) cards.push(gaugeCard);
  const budgetCard = document.getElementById('overview-bank-budget-line')?.closest('.wealth-card');
  if (budgetCard) cards.push(budgetCard);
  page.querySelectorAll('.custom-widget-card').forEach((card) => cards.push(card));
  return cards.filter((card, index, all) => card && all.indexOf(card) === index);
}

function overviewChartCardHasGraphics(card) {
  if (!card) return false;
  if (card.classList.contains('wealth-card-net')) {
    return !!card.querySelector('.wealth-networth-trend-line-v238');
  }
  return !!(card.querySelector('.overview-widget-arc, .overview-widget-line, .overview-widget-fill, .wealth-gauge-arc, .wealth-spark-line, .wealth-networth-trend-line-v238, .wealth-inline-progress-fill, .custom-widget-gauge-fill'));
}

function isOverviewChartCardVisible(card) {
  if (!card) return false;
  const rect = card.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  return rect.bottom > 8 && rect.top < (viewportHeight - 8) && rect.width > 0;
}

function getGaugeArcTargetPct(arc) {
  if (!arc) return 0;
  const dataPct = arc.getAttribute('data-gauge-pct');
  if (dataPct != null && dataPct !== '') {
    return Math.max(0, Math.min(100, parseFloat(dataPct) || 0));
  }
  const cssPct = arc.style.getPropertyValue('--gauge-pct');
  if (cssPct) return Math.max(0, Math.min(100, parseFloat(cssPct) || 0));
  const offset = arc.getAttribute('stroke-dashoffset');
  if (offset != null && offset !== '') {
    return Math.max(0, Math.min(100, 100 - (parseFloat(offset) || 0)));
  }
  return 0;
}

function stopOverviewGaugeArcAnimations(card) {
  if (!card || typeof card.querySelectorAll !== 'function') return;
  card.querySelectorAll('.overview-widget-arc, .wealth-gauge-arc').forEach((arc) => {
    try { (arc.__btArcAnim || []).forEach((anim) => anim.cancel()); } catch (_) {}
    arc.__btArcAnim = null;
    arc.style.strokeDasharray = '';
    arc.style.strokeDashoffset = '';
    arc.style.opacity = '';
  });
}

function runOverviewGaugeArcAnimations(card) {
  if (!card || typeof card.querySelectorAll !== 'function') return;
  const reduceMotion = reduceMotionCheck();
  card.querySelectorAll('.overview-widget-arc:not(.is-empty-arc), .wealth-gauge-arc:not(.is-empty-arc)').forEach((arc) => {
    const pct = getGaugeArcTargetPct(arc);
    try { (arc.__btArcAnim || []).forEach((anim) => anim.cancel()); } catch (_) {}
    arc.__btArcAnim = null;
    if (pct < 0.5) return;
    const endOffset = 100 - pct;
    arc.style.strokeDasharray = '100 100';
    arc.style.strokeDashoffset = '100';
    if (reduceMotion) {
      arc.style.strokeDashoffset = String(endOffset);
      return;
    }
    const anim = arc.animate([
      { strokeDasharray: '100 100', strokeDashoffset: 100 },
      { strokeDasharray: '100 100', strokeDashoffset: endOffset }
    ], { duration: OVERVIEW_GAUGE_DRAW_MS, easing: 'ease-out', fill: 'forwards' });
    arc.__btArcAnim = [anim];
  });
}

function finalizeOverviewGaugeArcs(card) {
  stopOverviewGaugeArcAnimations(card);
}

function isOverviewLineAreaPath(path) {
  if (!path || path.tagName !== 'PATH' && path.tagName !== 'path') return false;
  if (path.classList.contains('overview-widget-line') || path.classList.contains('wealth-spark-line') || path.classList.contains('wealth-networth-trend-line-v238')) return false;
  if (path.classList.contains('custom-widget-axis-line-v274') || path.classList.contains('wealth-gauge-arc') || path.classList.contains('overview-widget-arc')) return false;
  if (path.classList.contains('overview-line-area') || path.classList.contains('wealth-networth-trend-area-v238')) return true;
  const fill = String(path.getAttribute('fill') || '').trim().toLowerCase();
  if (!fill || fill === 'none') return false;
  const stroke = String(path.getAttribute('stroke') || '').trim().toLowerCase();
  if (stroke && stroke !== 'none') return false;
  const d = String(path.getAttribute('d') || '').trim();
  return /z\s*$/i.test(d);
}

function collectOverviewLineAreaGroups(card) {
  if (!card || typeof card.querySelectorAll !== 'function') return [];
  const groups = [];
  card.querySelectorAll('svg').forEach((svg) => {
    const areas = Array.from(svg.querySelectorAll('path')).filter(isOverviewLineAreaPath);
    if (!areas.length) return;
    areas.forEach((area) => {
      if (!area.classList.contains('overview-line-area') && !area.classList.contains('wealth-networth-trend-area-v238')) {
        area.classList.add('overview-line-area');
      }
    });
    const mainLines = Array.from(svg.querySelectorAll(
      '.overview-widget-line:not(.is-projection), .wealth-spark-line:not(.is-projection), .wealth-networth-trend-line-v238'
    ));
    const projLines = Array.from(svg.querySelectorAll('.overview-widget-line.is-projection, .wealth-spark-line.is-projection'));
    const taggedProj = areas.filter((area) => area.classList.contains('is-projection'));
    const taggedMain = areas.filter((area) => !area.classList.contains('is-projection'));
    let mainAreas = [];
    let projAreas = [];
    if (taggedProj.length) {
      // Prefer explicit class pairing so projection fill never gets treated as spent.
      mainAreas = taggedMain;
      projAreas = taggedProj;
    } else if (areas.length === 1 || !projLines.length) {
      mainAreas = areas.slice();
      projAreas = [];
    } else {
      const projCount = Math.min(areas.length, projLines.length);
      mainAreas = areas.slice(0, Math.max(0, areas.length - projCount));
      projAreas = areas.slice(areas.length - projCount);
      projAreas.forEach((area) => area.classList.add('is-projection'));
    }
    const dots = Array.from(svg.querySelectorAll('circle.overview-line-dot'));
    groups.push({ svg, mainAreas, projAreas, mainLines, projLines, dots });
  });
  return groups;
}

function hideOverviewLineAreas(areas) {
  (areas || []).forEach((area) => {
    if (!area) return;
    try { (area.__btAreaAnim || []).forEach((anim) => { try { anim.onfinish = null; anim.oncancel = null; anim.cancel(); } catch (_) {} }); } catch (_) {}
    area.__btAreaAnim = null;
    area.classList.add('is-waiting-reveal');
    area.style.opacity = '0';
  });
}

function revealOverviewLineAreas(areas, options = {}) {
  const animate = !!(options && options.animate) && !reduceMotionCheck();
  (areas || []).forEach((area) => {
    if (!area) return;
    try { (area.__btAreaAnim || []).forEach((anim) => { try { anim.onfinish = null; anim.oncancel = null; anim.cancel(); } catch (_) {} }); } catch (_) {}
    area.__btAreaAnim = null;
    area.classList.remove('is-waiting-reveal');
    if (!animate) {
      area.style.opacity = '';
      return;
    }
    // Fill color already carries alpha (rgba / gradient). Animate element opacity to 1,
    // otherwise rgba(.13) * opacity(.13) makes the projection shadow nearly invisible.
    let target = 1;
    try {
      if (area.classList.contains('wealth-networth-trend-area-v238')) target = 0.14;
      else {
        const attrOpacity = parseFloat(area.getAttribute('opacity') || '');
        if (Number.isFinite(attrOpacity)) target = attrOpacity;
      }
    } catch (_) { target = 1; }
    area.style.opacity = '0';
    try {
      const anim = area.animate(
        [{ opacity: 0 }, { opacity: target }],
        { duration: 320, easing: 'ease-out', fill: 'forwards' }
      );
      area.__btAreaAnim = [anim];
      const finish = () => {
        try { anim.onfinish = null; anim.oncancel = null; anim.cancel(); } catch (_) {}
        area.style.opacity = '';
        area.__btAreaAnim = null;
      };
      anim.onfinish = finish;
      anim.oncancel = finish;
    } catch (_) {
      area.style.opacity = '';
    }
  });
}

function hideOverviewLineDots(dots) {
  (dots || []).forEach((dot) => {
    if (!dot) return;
    try { (dot.__btDotAnim || []).forEach((anim) => { try { anim.onfinish = null; anim.oncancel = null; anim.cancel(); } catch (_) {} }); } catch (_) {}
    dot.__btDotAnim = null;
    dot.classList.add('is-waiting-reveal');
    dot.style.opacity = '0';
    dot.style.transform = 'scale(0)';
    dot.style.transformBox = 'fill-box';
    dot.style.transformOrigin = 'center';
  });
}

function revealOverviewLineDots(dots, options = {}) {
  const animate = !!(options && options.animate) && !reduceMotionCheck();
  (dots || []).forEach((dot) => {
    if (!dot) return;
    try { (dot.__btDotAnim || []).forEach((anim) => { try { anim.onfinish = null; anim.oncancel = null; anim.cancel(); } catch (_) {} }); } catch (_) {}
    dot.__btDotAnim = null;
    dot.classList.remove('is-waiting-reveal');
    if (!animate) {
      dot.style.opacity = '';
      dot.style.transform = '';
      return;
    }
    const targetOpacity = parseFloat(dot.getAttribute('opacity') || '0.95') || 0.95;
    dot.style.opacity = '0';
    dot.style.transform = 'scale(0)';
    dot.style.transformBox = 'fill-box';
    dot.style.transformOrigin = 'center';
    try {
      const anim = dot.animate(
        [
          { opacity: 0, transform: 'scale(0)' },
          { opacity: targetOpacity, transform: 'scale(1)' }
        ],
        { duration: 300, easing: 'cubic-bezier(.2,1.35,.3,1)', fill: 'forwards' }
      );
      dot.__btDotAnim = [anim];
      const finish = () => {
        try { anim.onfinish = null; anim.oncancel = null; anim.cancel(); } catch (_) {}
        dot.style.opacity = '';
        dot.style.transform = '';
        dot.__btDotAnim = null;
      };
      anim.onfinish = finish;
      anim.oncancel = finish;
    } catch (_) {
      dot.style.opacity = '';
      dot.style.transform = '';
    }
  });
}

function finalizeOverviewLineAreas(card) {
  if (!card) return;
  collectOverviewLineAreaGroups(card).forEach((group) => {
    revealOverviewLineAreas(group.mainAreas.concat(group.projAreas), { animate: false });
    revealOverviewLineDots(group.dots, { animate: false });
  });
}

function finalizeOverviewChartLineStrokes(card) {
  if (!card || typeof card.querySelectorAll !== 'function') return;
  card.querySelectorAll('.overview-widget-line, .wealth-spark-line, .wealth-networth-trend-line-v238').forEach((line) => {
    try { (line.__btLineAnim || []).forEach((anim) => anim.cancel()); } catch (_) {}
    line.__btLineAnim = null;
    line.style.strokeDasharray = '';
    line.style.strokeDashoffset = '';
    line.removeAttribute('pathLength');
    if (line.classList.contains('is-projection')) {
      const targetOpacity = parseFloat(line.getAttribute('opacity') || '0.94') || 0.94;
      line.style.opacity = String(targetOpacity);
    } else {
      line.style.opacity = '';
    }
  });
  finalizeOverviewLineAreas(card);
}

function stopOverviewLineAnimations(card) {
  if (!card || typeof card.querySelectorAll !== 'function') return;
  card.querySelectorAll('.overview-widget-line, .wealth-spark-line, .wealth-networth-trend-line-v238').forEach((line) => {
    try { (line.__btLineAnim || []).forEach((anim) => anim.cancel()); } catch (_) {}
    line.__btLineAnim = null;
    line.style.strokeDasharray = '';
    line.style.strokeDashoffset = '';
    if (line.classList.contains('is-projection')) {
      line.style.opacity = '0';
    } else {
      line.style.opacity = '';
    }
  });
  // Keep fills visible when animations are cancelled mid-flight (tab leave / pause).
  finalizeOverviewLineAreas(card);
}

function runOverviewLineDrawAnimation(line, duration, delayMs = 0) {
  if (!line || typeof line.getTotalLength !== 'function') return null;
  line.removeAttribute('pathLength');
  let pathLen = 0;
  try { pathLen = Math.max(1, line.getTotalLength()); } catch (_) { pathLen = 1; }
  if (reduceMotionCheck()) {
    line.style.strokeDasharray = '';
    line.style.strokeDashoffset = '';
    return null;
  }
  line.style.strokeDasharray = `${pathLen} ${pathLen}`;
  line.style.strokeDashoffset = String(pathLen);
  const anim = line.animate([
    { strokeDashoffset: pathLen },
    { strokeDashoffset: 0 }
  ], {
    duration: Math.max(1, Number(duration) || OVERVIEW_LINE_SMOOTH_MS),
    delay: Math.max(0, Number(delayMs) || 0),
    easing: 'linear',
    fill: 'forwards'
  });
  return anim;
}