// Generated app-core slice 3/6 (merged).

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

function reduceMotionCheck() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
}

function getNetWorthTrendAnimRoot(card) {
  if (!card) return null;
  return card.querySelector('#overview-net-worth-trend-v238') || card.querySelector('.wealth-networth-trend-v238');
}

function stopNetWorthTrendAnimations(card) {
  const root = getNetWorthTrendAnimRoot(card);
  if (!root) return;
  root.querySelectorAll('.wealth-networth-trend-line-v238').forEach((line) => {
    try { (line.__btNetWorthLineAnim || []).forEach((anim) => anim.cancel()); } catch (_) {}
    line.__btNetWorthLineAnim = null;
    line.style.strokeDasharray = '';
    line.style.strokeDashoffset = '';
    line.style.animation = '';
  });
  revealOverviewLineAreas(root.querySelectorAll('.wealth-networth-trend-area-v238, .overview-line-area'), { animate: false });
}

function primeNetWorthTrendForIntro(root) {
  if (!root) return;
  root.querySelectorAll('.wealth-networth-trend-line-v238').forEach((line) => {
    try { (line.__btNetWorthLineAnim || []).forEach((anim) => anim.cancel()); } catch (_) {}
    line.__btNetWorthLineAnim = null;
    line.style.animation = 'none';
    let len = 0;
    try { len = line.getTotalLength(); } catch (_) {}
    if (!len || len < 1) len = 420;
    line.style.strokeDasharray = `${len}`;
    line.style.strokeDashoffset = `${len}`;
  });
}

function playNetWorthTrendChartIntro(card) {
  const root = getNetWorthTrendAnimRoot(card);
  if (!root || !root.querySelector('.wealth-networth-trend-line-v238')) return;
  if (activePageId !== 'overview') return;
  const reducedMotion = reduceMotionCheck();
  const areaNodes = root.querySelectorAll('.wealth-networth-trend-area-v238, .overview-line-area');
  if (reducedMotion) {
    root.querySelectorAll('.wealth-networth-trend-line-v238').forEach((line) => {
      line.style.strokeDashoffset = '0';
      line.style.animation = 'none';
    });
    revealOverviewLineAreas(areaNodes, { animate: false });
    return;
  }

  primeNetWorthTrendForIntro(root);
  hideOverviewLineAreas(areaNodes);
  void root.offsetWidth;

  const lines = Array.from(root.querySelectorAll('.wealth-networth-trend-line-v238'));
  let maxLineEndMs = 0;
  let finished = 0;
  const maybeRevealArea = () => {
    finished += 1;
    if (finished < lines.length) return;
    revealOverviewLineAreas(areaNodes, { animate: true });
  };
  lines.forEach((line, idx) => {
    let len = 0;
    try { len = line.getTotalLength(); } catch (_) {}
    if (!len || len < 1) len = 420;
    const duration = NET_WORTH_TREND_LINE_DRAW_MS;
    const delay = idx * 110;
    maxLineEndMs = Math.max(maxLineEndMs, delay + duration);
    try {
      const anim = line.animate(
        [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration, delay, easing: 'ease-out', fill: 'forwards' }
      );
      line.__btNetWorthLineAnim = [anim];
      anim.onfinish = () => {
        line.style.strokeDashoffset = '0';
        maybeRevealArea();
      };
      anim.oncancel = () => {
        line.style.strokeDashoffset = '0';
        maybeRevealArea();
      };
    } catch (_) {
      line.style.strokeDashoffset = '0';
      maybeRevealArea();
    }
  });
  if (!lines.length) revealOverviewLineAreas(areaNodes, { animate: false });
}

function runOverviewLineAnimations(card) {
  if (!card || typeof card.querySelectorAll !== 'function') return;
  const reduceMotion = reduceMotionCheck();
  const areaGroups = collectOverviewLineAreaGroups(card);

  // Cancel previous line anims without forcing fills visible first — we hide them below.
  card.querySelectorAll('.overview-widget-line, .wealth-spark-line, .wealth-networth-trend-line-v238').forEach((line) => {
    try {
      (line.__btLineAnim || []).forEach((anim) => {
        try { anim.onfinish = null; anim.oncancel = null; } catch (_) {}
        try { anim.cancel(); } catch (_) {}
      });
    } catch (_) {}
    line.__btLineAnim = null;
  });
  areaGroups.forEach((group) => {
    hideOverviewLineAreas(group.mainAreas.concat(group.projAreas));
    hideOverviewLineDots(group.dots);
  });
  void card.offsetWidth;

  const mainLines = card.querySelectorAll(
    '.overview-widget-line:not(.is-projection):not(.wealth-networth-trend-line-v238), .wealth-spark-line:not(.is-projection)'
  );
  const projLines = card.querySelectorAll('.overview-widget-line.is-projection, .wealth-spark-line.is-projection');
  const hasProjection = projLines.length > 0;
  const allMainAreas = areaGroups.flatMap((group) => group.mainAreas);
  const allProjAreas = areaGroups.flatMap((group) => group.projAreas);
  const allDots = areaGroups.flatMap((group) => group.dots || []);

  if (reduceMotion) {
    mainLines.forEach((line) => {
      line.style.strokeDasharray = '';
      line.style.strokeDashoffset = '';
    });
    projLines.forEach((line) => {
      const targetOpacity = parseFloat(line.getAttribute('opacity') || line.style.opacity || '0.94') || 0.94;
      line.style.strokeDasharray = '';
      line.style.strokeDashoffset = '';
      line.style.opacity = String(targetOpacity);
    });
    revealOverviewLineAreas(allMainAreas.concat(allProjAreas), { animate: false });
    revealOverviewLineDots(allDots, { animate: false });
    return;
  }

  let mainFinished = 0;
  const revealMainAreas = () => {
    mainFinished += 1;
    if (mainFinished < mainLines.length) return;
    revealOverviewLineAreas(allMainAreas, { animate: true });
    // Dot pops only after spent line finishes; projection stays without a ball.
    revealOverviewLineDots(allDots, { animate: true });
  };

  mainLines.forEach((line) => {
    line.removeAttribute('pathLength');
    const anim = runOverviewLineDrawAnimation(
      line,
      hasProjection ? OVERVIEW_LINE_DRAW_MS : OVERVIEW_LINE_SMOOTH_MS,
      OVERVIEW_CHART_ANIM_BEGIN_MS
    );
    if (anim) {
      anim.onfinish = () => {
        line.style.strokeDasharray = '';
        line.style.strokeDashoffset = '';
        revealMainAreas();
      };
      anim.oncancel = anim.onfinish;
      line.__btLineAnim = [anim];
    } else {
      revealMainAreas();
    }
  });
  if (!mainLines.length) {
    revealOverviewLineAreas(allMainAreas, { animate: false });
    revealOverviewLineDots(allDots, { animate: false });
  }

  let projFinished = 0;
  const revealProjAreas = () => {
    projFinished += 1;
    if (projFinished < projLines.length) return;
    revealOverviewLineAreas(allProjAreas, { animate: true });
  };

  projLines.forEach((line) => {
    line.removeAttribute('pathLength');
    const targetOpacity = parseFloat(line.getAttribute('opacity') || line.style.opacity || '0.94') || 0.94;
    line.style.opacity = '0';
    let pathLen = 1;
    try { pathLen = Math.max(1, line.getTotalLength()); } catch (_) {}
    const projDuration = Math.max(
      OVERVIEW_PROJECTION_DRAW_MS,
      Math.round(OVERVIEW_PROJECTION_DRAW_MS * (pathLen / 42))
    );
    const anim = runOverviewLineDrawAnimation(line, projDuration, OVERVIEW_PROJECTION_DELAY_MS + OVERVIEW_CHART_ANIM_BEGIN_MS);
    if (anim) {
      const opacityAnim = line.animate([
        { opacity: 0 },
        { opacity: targetOpacity }
      ], {
        duration: projDuration,
        delay: OVERVIEW_PROJECTION_DELAY_MS + OVERVIEW_CHART_ANIM_BEGIN_MS,
        easing: 'ease-out',
        fill: 'forwards'
      });
      anim.onfinish = () => {
        line.style.strokeDasharray = '';
        line.style.strokeDashoffset = '';
        line.style.opacity = String(targetOpacity);
        revealProjAreas();
      };
      anim.oncancel = anim.onfinish;
      line.__btLineAnim = [anim, opacityAnim];
    } else {
      line.style.opacity = String(targetOpacity);
      revealProjAreas();
    }
  });
  if (!projLines.length) revealOverviewLineAreas(allProjAreas, { animate: false });
}

function stopOverviewChartCardAnimations(card) {
  if (!card) return;
  const timerId = __overviewChartAnimTimers.get(card);
  if (timerId) {
    window.clearTimeout(timerId);
    __overviewChartAnimTimers.delete(card);
  }
  stopOverviewGaugeArcAnimations(card);
  stopOverviewLineAnimations(card);
  stopNetWorthTrendAnimations(card);
  card.classList.remove('overview-chart-animating');
}

function pauseOverviewChartAnimations() {
  const page = document.getElementById('page-overview');
  if (!page) return;
  getOverviewChartCards(page).forEach((card) => stopOverviewChartCardAnimations(card));
  page.classList.remove('overview-summary-revealing', 'summary-days-progress-animating');
}

function cancelOverviewChartsReplay() {
  if (__overviewChartReplayTimer) {
    window.clearTimeout(__overviewChartReplayTimer);
    __overviewChartReplayTimer = null;
  }
  __overviewChartReplayToken += 1;
}

function scheduleOverviewChartsReplay(fromDetailsReturn = false) {
  cancelOverviewChartsReplay();
  const token = __overviewChartReplayToken;
  const fire = () => {
    __overviewChartReplayTimer = null;
    if (token !== __overviewChartReplayToken || activePageId !== 'overview') return;
    const page = document.getElementById('page-overview');
    if (page) {
      getOverviewChartCards(page).forEach((card) => {
        if (!isOverviewChartCardVisible(card)) return;
        stopOverviewChartCardAnimations(card);
        try { delete card.dataset.btChartAnimSig; } catch (_) {}
      });
      page.classList.remove('overview-summary-revealing', 'summary-days-progress-animating');
    }
    try { animateOverviewChartsIntro({ mode: 'visible', force: true }); } catch (_) {}
  };
  if (fromDetailsReturn) {
    __overviewChartReplayTimer = window.setTimeout(fire, 280);
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(fire);
  });
}

function getOverviewChartCardAnimDuration(card) {
  const hasGauge = !!(card && card.querySelector('.overview-widget-arc:not(.is-empty-arc), .wealth-gauge-arc:not(.is-empty-arc)'));
  const hasProjection = !!(card && card.querySelector('.overview-widget-line.is-projection, .wealth-spark-line.is-projection'));
  let lineDuration = hasProjection
    ? (OVERVIEW_LINE_DRAW_MS + OVERVIEW_PROJECTION_DELAY_MS + OVERVIEW_PROJECTION_DRAW_MS + 450)
    : (OVERVIEW_LINE_SMOOTH_MS + 450);
  if (hasProjection) {
    let maxProjDuration = OVERVIEW_PROJECTION_DRAW_MS;
    card.querySelectorAll('.overview-widget-line.is-projection, .wealth-spark-line.is-projection').forEach((line) => {
      try {
        const pathLen = Math.max(1, line.getTotalLength());
        maxProjDuration = Math.max(maxProjDuration, Math.round(OVERVIEW_PROJECTION_DRAW_MS * (pathLen / 42)));
      } catch (_) {}
    });
    lineDuration = OVERVIEW_LINE_DRAW_MS + OVERVIEW_PROJECTION_DELAY_MS + maxProjDuration + 450;
  }
  const gaugeDuration = hasGauge ? (OVERVIEW_GAUGE_DRAW_MS + 450) : 0;
  return Math.max(lineDuration, gaugeDuration);
}

function animateOverviewChartCard(card) {
  if (!overviewChartCardHasGraphics(card)) return false;
  if (!canRunOverviewChartIntro()) return false;
  stopOverviewChartCardAnimations(card);
  void card.offsetWidth;
  card.classList.add('overview-chart-animating');
  card.dataset.btChartAnimSig = getOverviewChartCardSignature(card);
  __overviewChartIntroPlayed.add(card);

  const startDraw = () => {
    if (!card.isConnected || !canRunOverviewChartIntro()) {
      card.classList.remove('overview-chart-animating');
      return;
    }
    runOverviewGaugeArcAnimations(card);
    if (card.querySelector('.wealth-networth-trend-line-v238')) {
      playNetWorthTrendChartIntro(card);
    } else {
      runOverviewLineAnimations(card);
    }
  };
  // animationBegin: wait one frame + short delay so GAS data/layout can settle.
  window.setTimeout(() => {
    requestAnimationFrame(startDraw);
  }, OVERVIEW_CHART_ANIM_BEGIN_MS);

  const duration = getOverviewChartCardAnimDuration(card) + OVERVIEW_CHART_ANIM_BEGIN_MS;
  const timerId = window.setTimeout(() => {
    card.classList.remove('overview-chart-animating');
    finalizeOverviewGaugeArcs(card);
    finalizeOverviewChartLineStrokes(card);
    stopNetWorthTrendAnimations(card);
    __overviewChartAnimTimers.delete(card);
  }, duration);
  __overviewChartAnimTimers.set(card, timerId);
  return true;
}

function animateOverviewSummaryStripReveal() {
  const page = document.getElementById('page-overview');
  if (!page || activePageId !== 'overview') return;
  requestAnimationFrame(() => {
    animateOverviewDaysLeftProgress();
    page.classList.remove('overview-summary-revealing');
    void page.offsetWidth;
    page.classList.add('overview-summary-revealing');
    window.setTimeout(() => page.classList.remove('overview-summary-revealing'), OVERVIEW_LINE_SMOOTH_MS + 120);
  });
}

function playOverviewSummaryStripReveal() {
  animateOverviewSummaryStripReveal();
}

function animateOverviewDaysLeftProgress() {
  const page = document.getElementById('page-overview');
  const fill = document.getElementById('sum-days-progress-fill');
  if (!page || !fill) return;
  page.classList.remove('summary-days-progress-animating');
  void page.offsetWidth;
  page.classList.add('summary-days-progress-animating');
  window.setTimeout(() => page.classList.remove('summary-days-progress-animating'), OVERVIEW_PROGRESS_DRAW_MS + 120);
}

function animateOverviewChartsIntro(options = {}) {
  const page = document.getElementById('page-overview');
  if (!page || !canRunOverviewChartIntro()) return;
  const mode = options.mode || 'visible';
  const force = !!(options && options.force);
  const beforeSigs = mode === 'changed-visible'
    ? (options.beforeSigs || window.__overviewChartSigsBeforeSync || null)
    : null;

  const run = () => {
    let cards = getOverviewIntroCards(page, { mode, beforeSigs });
    if (mode === 'boot') {
      cards = cards.filter((card) => isOverviewChartCardVisible(card));
    } else if (mode !== 'changed-visible' && !force) {
      cards = cards.filter((card) => !overviewChartIntroIsCurrent(card));
    }
    cards.forEach((card) => animateOverviewChartCard(card));

    const summaryChanged = !beforeSigs || getOverviewSummarySignature() !== beforeSigs.__summary;
    if (cards.length && (mode === 'visible' || mode === 'boot' || summaryChanged)) {
      try { playOverviewSummaryStripReveal(); } catch (_) {}
    }

    if (mode === 'changed-visible') {
      window.__overviewSyncChangedChartKeys = new Set(cards.map(getOverviewChartCardKey).filter(Boolean));
      window.__overviewChartSigsBeforeSync = null;
    } else {
      window.__overviewSyncChangedChartKeys = null;
    }

    try { setupOverviewScrollChartAnimations(); } catch (_) {}
    return cards.length;
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const animated = run();
      if (mode !== 'changed-visible' && animated === 0) {
        const needsIntro = getOverviewChartCardsNeedingIntro(page).length > 0;
        if (needsIntro) {
          window.setTimeout(() => { try { run(); } catch (_) {} }, 80);
        }
      }
    });
  });
}

function animateVisibleOverviewChartCards() {
  animateOverviewChartsIntro();
}

function shouldWaitForOverviewDataSync() {
  try {
    return !!(SHEETS_URL && typeof isGoogleSheetsEnabled === 'function' && isGoogleSheetsEnabled());
  } catch (_) {
    return false;
  }
}

function markOverviewChartsAwaitingFreshData() {
  __overviewChartsDataSettled = false;
  __overviewChartBootIntroDone = false;
  __overviewChartScrollLive = false;
  if (__overviewBootScheduleTimer) {
    window.clearTimeout(__overviewBootScheduleTimer);
    __overviewBootScheduleTimer = null;
  }
  if (__overviewScrollLiveTimer) {
    window.clearTimeout(__overviewScrollLiveTimer);
    __overviewScrollLiveTimer = null;
  }
}

function resetOverviewPageBootAnimationState() {
  markOverviewChartsAwaitingFreshData();
  const page = document.getElementById('page-overview');
  if (!page) return;
  getOverviewChartCards(page).forEach((card) => {
    stopOverviewChartCardAnimations(card);
    try { delete card.dataset.btChartAnimSig; } catch (_) {}
  });
}

function isOverviewPageBootReady() {
  if (!canRunOverviewChartIntro()) return false;
  if (__bootPresentationPhase) return hasBootPresentableOverviewUi();
  if (typeof isSyncing !== 'undefined' && isSyncing) return false;
  if (shouldWaitForOverviewDataSync() && !__overviewChartsDataSettled) return false;
  return isOverviewPageDataReady();
}

function scheduleOverviewPageBootAnimation(options = {}) {
  if (__overviewChartBootIntroDone && !options.force) return;
  if (__overviewBootScheduleTimer) {
    window.clearTimeout(__overviewBootScheduleTimer);
  }
  const delayMs = options.delayMs != null ? options.delayMs : OVERVIEW_BOOT_DEBOUNCE_MS;
  __overviewBootScheduleTimer = window.setTimeout(() => {
    __overviewBootScheduleTimer = null;
    try { runOverviewPageBootAnimation(); } catch (_) {}
  }, Math.max(0, delayMs));
}

function runOverviewPageBootAnimation() {
  if (__overviewChartBootIntroDone) return;
  if (!canRunOverviewChartIntro()) {
    scheduleOverviewPageBootAnimation({ delayMs: 120 });
    return;
  }
  if (!isOverviewPageBootReady()) {
    scheduleOverviewPageBootAnimation({ delayMs: 100 });
    return;
  }

  __overviewChartBootIntroDone = true;
  window.__overviewPendingSyncChartAnim = false;
  window.__overviewChartSigsBeforeSync = null;

  const page = document.getElementById('page-overview');
  if (!page) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const allCards = getOverviewChartCards(page).filter(overviewChartCardHasGraphics);
      const visibleCards = allCards.filter(isOverviewChartCardVisible);
      const hiddenCards = allCards.filter((card) => !isOverviewChartCardVisible(card));

      hiddenCards.forEach((card) => {
        try { delete card.dataset.btChartAnimSig; } catch (_) {}
      });

      visibleCards.forEach((card, index) => {
        window.setTimeout(() => {
          try { animateOverviewChartCard(card); } catch (_) {}
        }, index * OVERVIEW_BOOT_STAGGER_MS);
      });

      if (visibleCards.length || page.querySelector('.summary-days-progress')) {
        try { playOverviewSummaryStripReveal(); } catch (_) {}
      }

      const scrollLiveDelay = visibleCards.length
        ? Math.min(420, visibleCards.length * OVERVIEW_BOOT_STAGGER_MS + 160)
        : 80;
      try { setupOverviewScrollChartAnimations({ enableLiveDelayMs: scrollLiveDelay }); } catch (_) {}
    });
  });
}

function scheduleOverviewChartBootIntroOnce() {
  scheduleOverviewPageBootAnimation();
}

function animateOverviewChartsAfterSync() {
  if (activePageId !== 'overview') return;
  const beforeSigs = window.__overviewChartSigsBeforeSync || null;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!__overviewChartBootIntroDone) {
        scheduleOverviewChartBootIntroOnce();
        return;
      }
      if (!beforeSigs) {
        animateOverviewChartsIntro({ mode: 'visible' });
        return;
      }
      const page = document.getElementById('page-overview');
      const chartChanged = !!(page && getOverviewChartCards(page).some((card) => overviewChartCardDataChanged(card, beforeSigs)));
      const summaryChanged = getOverviewSummarySignature() !== beforeSigs.__summary;
      if (!chartChanged && !summaryChanged) {
        window.__overviewChartSigsBeforeSync = null;
        window.__overviewSyncChangedChartKeys = null;
        try { setupOverviewScrollChartAnimations(); } catch (_) {}
        return;
      }
      animateOverviewChartsIntro({ mode: 'changed-visible', beforeSigs });
    });
  });
}

function finishOverviewChartRenderCycle() {
  try {
    const page = document.getElementById('page-overview');
    const hasCharts = !!(page && getOverviewChartCards(page).some((card) => overviewChartCardHasGraphics(card)));
    const hasSummary = !!(page && page.querySelector('.summary-days-progress'));
    if (!hasCharts && !hasSummary) {
      if (activePageId === 'overview' && !__overviewChartBootIntroDone) {
        scheduleOverviewPageBootAnimation({ delayMs: 160 });
      }
      return;
    }

    if (typeof isSyncing !== 'undefined' && isSyncing) {
      scheduleOverviewPageBootAnimation({ delayMs: 180 });
      return;
    }

    if (shouldWaitForOverviewDataSync() && !__overviewChartsDataSettled) {
      scheduleOverviewPageBootAnimation({ delayMs: 160 });
      return;
    }

    if (!shouldWaitForOverviewDataSync() && !__overviewChartsDataSettled) {
      __overviewChartsDataSettled = true;
    }

    // v3910: Hypo/loan reveals deferred until data settled — flush pending plays now.
    try {
      if (typeof window.__btFlushPendingLoanRevealsV3910 === 'function') {
        window.__btFlushPendingLoanRevealsV3910();
      }
    } catch (_) {}

    if (!__overviewChartBootIntroDone) {
      if (!isOverviewPageBootReady()) {
        scheduleOverviewPageBootAnimation({ delayMs: 120 });
        return;
      }
      scheduleOverviewPageBootAnimation();
      return;
    }
    if (window.__overviewPendingSyncChartAnim) {
      window.__overviewPendingSyncChartAnim = false;
      animateOverviewChartsAfterSync();
      return;
    }
    setupOverviewScrollChartAnimations();
  } catch (_) {}
  try { tryCompleteAppBootFromOverviewRender(); } catch (_) {}
}

function animateOverviewChartsAfterMonthShift() {
  if (activePageId !== 'overview') return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animateOverviewChartsIntro();
    });
  });
}

function scheduleNetWorthTrendAnimation() {
  /* Net worth trend animates once with the overview boot pass. */
}

function setupOverviewScrollChartAnimations(options = {}) {
  const page = document.getElementById('page-overview');
  if (!page) return;
  try { if (__overviewChartScrollObserver) __overviewChartScrollObserver.disconnect(); } catch (_) {}
  __overviewChartScrollObserver = null;
  if (__overviewScrollLiveTimer) {
    window.clearTimeout(__overviewScrollLiveTimer);
    __overviewScrollLiveTimer = null;
  }
  if (!('IntersectionObserver' in window)) return;

  const watch = getOverviewChartCards(page).filter(overviewChartCardHasGraphics);
  const daysBar = page.querySelector('.summary-days-progress');
  if (daysBar) watch.push(daysBar);
  if (!watch.length) return;

  __overviewChartScrollLive = false;

  __overviewChartScrollObserver = new IntersectionObserver((entries) => {
    if (!__overviewChartScrollLive || activePageId !== 'overview') return;
    for (const entry of entries) {
      const target = entry.target;
      // Treat near-zero intersection as leave so leave→enter always re-arms animation.
      const nowVisible = !!(entry.isIntersecting && entry.intersectionRatio >= 0.08);
      const wasVisible = __overviewChartWasVisible.get(target) === true;
      if (!nowVisible) {
        __overviewChartWasVisible.set(target, false);
        if (!target.classList.contains('summary-days-progress')) {
          try { delete target.dataset.btChartAnimSig; } catch (_) {}
        }
        continue;
      }
      // Still in view — do not restart mid-scroll jitter.
      if (wasVisible) continue;

      const syncChangedOnly = window.__overviewSyncChangedChartKeys;
      const cardKey = target.classList.contains('summary-days-progress')
        ? null
        : getOverviewChartCardKey(target);
      // After a Sheets sync, only freshly-changed cards may auto-play once.
      // Never keep that filter forever or scroll replays stay broken.
      if (syncChangedOnly && cardKey && !syncChangedOnly.has(cardKey)) {
        __overviewChartWasVisible.set(target, true);
        continue;
      }
      if (target.classList.contains('summary-days-progress')) {
        animateOverviewDaysLeftProgress();
      } else {
        try { delete target.dataset.btChartAnimSig; } catch (_) {}
        animateOverviewChartCard(target);
      }
      __overviewChartWasVisible.set(target, true);
    }
  }, {
    root: null,
    rootMargin: '0px 0px -12% 0px',
    threshold: [0, 0.08, 0.2, 0.35, 0.5]
  });

  watch.forEach((el) => {
    try { __overviewChartScrollObserver.observe(el); } catch (_) {}
  });

  const enableLiveDelayMs = Math.max(0, Number(options.enableLiveDelayMs) || 0);
  const activateScrollObserver = () => {
    __overviewScrollLiveTimer = null;
    __overviewChartScrollLive = true;
    // Sync filter is only for the boot/sync intro window; clear so later scroll works.
    window.__overviewSyncChangedChartKeys = null;
    watch.forEach((el) => {
      const visible = isOverviewChartCardVisible(el);
      const primed = visible && (
        el.classList.contains('summary-days-progress') || overviewChartIntroIsCurrent(el)
      );
      __overviewChartWasVisible.set(el, primed);
    });
  };
  if (enableLiveDelayMs > 0) {
    __overviewScrollLiveTimer = window.setTimeout(activateScrollObserver, enableLiveDelayMs);
  } else {
    requestAnimationFrame(() => {
      requestAnimationFrame(activateScrollObserver);
    });
  }
}

function isOverviewDetailsElementVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  return rect.bottom > 8 && rect.top < (viewportHeight - 8) && rect.width > 0;
}

function getOverviewDetailsBarFillFromRow(rowEl) {
  if (!rowEl) return null;
  if (rowEl.classList.contains('card-widget')) return rowEl.querySelector('.progress-fill');
  return rowEl.querySelector('.budget-progress-fill');
}

function getOverviewDetailsScrollRows(page = document.getElementById('page-overview-details')) {
  if (!page) return [];
  const rows = [];
  page.querySelectorAll('.card-widget').forEach((row) => {
    if (getOverviewDetailsBarFillFromRow(row)) rows.push(row);
  });
  page.querySelectorAll('.budget-bank-row').forEach((row) => {
    if (getOverviewDetailsBarFillFromRow(row)) rows.push(row);
  });
  return rows;
}

function getOverviewDetailsAnimatedElements(page = document.getElementById('page-overview-details')) {
  return getOverviewDetailsScrollRows(page)
    .map((row) => getOverviewDetailsBarFillFromRow(row))
    .filter(Boolean);
}

function clearOverviewDetailsBarFinishTimer(el) {
  const timerId = __overviewDetailsBarFinishTimers.get(el);
  if (timerId) {
    window.clearTimeout(timerId);
    __overviewDetailsBarFinishTimers.delete(el);
  }
}

function finishOverviewDetailsBar(el) {
  if (!el || el.classList.contains('overview-details-bar-show')) return;
  clearOverviewDetailsBarFinishTimer(el);
  el.classList.remove('overview-details-bar-animating');
  el.classList.add('overview-details-bar-show');
  el.style.animationDelay = '';
  el.style.animationDuration = '';
}

function resetOverviewDetailsBarAnimations(page = document.getElementById('page-overview-details')) {
  if (!page) return;
  page.classList.remove('overview-details-entering');
  getOverviewDetailsAnimatedElements(page).forEach((el) => {
    clearOverviewDetailsBarFinishTimer(el);
    el.classList.remove('overview-details-bar-animating', 'overview-details-bar-show');
    el.style.animationDelay = '';
    el.style.animationDuration = '';
  });
}

function prepareOverviewDetailsBars(page = document.getElementById('page-overview-details')) {
  if (!page) return;
  resetOverviewDetailsBarAnimations(page);
  page.classList.add('overview-details-entering');
}

function resetOverviewDetailsBarForScroll(el) {
  if (!el) return;
  clearOverviewDetailsBarFinishTimer(el);
  el.classList.remove('overview-details-bar-animating', 'overview-details-bar-show');
  el.style.animationDelay = '';
  el.style.animationDuration = '';
}

function onOverviewDetailsBarAnimEnd(ev) {
  const el = ev.target;
  const animName = String(ev.animationName || '');
  if (!el || (animName && animName !== 'btOverviewGrowX')) return;
  finishOverviewDetailsBar(el);
}

function animateOverviewDetailsElement(el, delayMs = 0) {
  if (!el || el.classList.contains('overview-details-bar-animating')) return false;
  clearOverviewDetailsBarFinishTimer(el);
  el.classList.remove('overview-details-bar-show');
  el.style.transition = 'none';
  const delay = Math.max(0, Number(delayMs) || 0);
  el.style.animationDelay = delay > 0 ? `${delay}ms` : '';
  el.style.animationDuration = `${OVERVIEW_DETAILS_BAR_DRAW_MS}ms`;
  el.addEventListener('animationend', onOverviewDetailsBarAnimEnd, { once: true });
  void el.offsetWidth;
  el.classList.add('overview-details-bar-animating');
  __overviewDetailsBarFinishTimers.set(
    el,
    window.setTimeout(() => finishOverviewDetailsBar(el), delay + OVERVIEW_DETAILS_BAR_DRAW_MS + 120)
  );
  return true;
}

function isOverviewDetailsRowVisible(rowEl) {
  return isOverviewDetailsElementVisible(rowEl || getOverviewDetailsBarFillFromRow(rowEl));
}

function startOverviewDetailsBarAnimations() {
  const page = document.getElementById('page-overview-details');
  if (!page || activePageId !== 'overview-details') return;
  if (typeof isPageLoadingOverlayBlocking === 'function' && isPageLoadingOverlayBlocking()) {
    window.setTimeout(() => {
      try { startOverviewDetailsBarAnimations(); } catch (_) {}
    }, 120);
    return;
  }
  page.classList.add('overview-details-entering');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const rows = getOverviewDetailsScrollRows(page);
        let stagger = 0;
        rows.forEach((row) => {
          const fill = getOverviewDetailsBarFillFromRow(row);
          if (!fill) return;
          if (!isOverviewDetailsRowVisible(row)) {
            __overviewDetailsWasVisible.set(row, false);
            return;
          }
          animateOverviewDetailsElement(fill, stagger);
          __overviewDetailsWasVisible.set(row, true);
          stagger += OVERVIEW_DETAILS_BAR_STAGGER_MS;
        });
        try { setupOverviewDetailsScrollAnimations(); } catch (_) {}
      });
    });
  });
}

function scheduleOverviewDetailsBarRefresh() {
  if (activePageId !== 'overview-details') return;
  if (window.__overviewDetailsBarRefreshQueued) return;
  window.__overviewDetailsBarRefreshQueued = true;
  requestAnimationFrame(() => {
    window.__overviewDetailsBarRefreshQueued = false;
    prepareOverviewDetailsBars();
    requestAnimationFrame(() => {
      try { startOverviewDetailsBarAnimations(); } catch (_) {}
    });
  });
}

function animateVisibleOverviewDetailsElements() {
  startOverviewDetailsBarAnimations();
}

function setupOverviewDetailsScrollAnimations() {
  const page = document.getElementById('page-overview-details');
  if (!page) return;
  try { if (__overviewDetailsScrollObserver) __overviewDetailsScrollObserver.disconnect(); } catch (_) {}
  __overviewDetailsScrollObserver = null;
  if (!('IntersectionObserver' in window)) return;

  const watchRows = getOverviewDetailsScrollRows(page);
  if (!watchRows.length) return;

  __overviewDetailsScrollLive = false;
  watchRows.forEach((row) => {
    __overviewDetailsWasVisible.set(row, false);
    const fill = getOverviewDetailsBarFillFromRow(row);
    if (fill) __overviewDetailsScrollFillByRow.set(row, fill);
  });

  __overviewDetailsScrollObserver = new IntersectionObserver((entries) => {
    if (!__overviewDetailsScrollLive || activePageId !== 'overview-details') return;
    for (const entry of entries) {
      const row = entry.target;
      const fill = __overviewDetailsScrollFillByRow.get(row) || getOverviewDetailsBarFillFromRow(row);
      if (!fill) continue;
      const nowVisible = !!entry.isIntersecting && entry.intersectionRatio >= 0.08;
      const wasVisible = !!__overviewDetailsWasVisible.get(row);
      __overviewDetailsWasVisible.set(row, nowVisible);
      if (nowVisible && !wasVisible) {
        animateOverviewDetailsElement(fill);
        continue;
      }
      if (!nowVisible && wasVisible) {
        if (fill.classList.contains('overview-details-bar-animating')) continue;
        resetOverviewDetailsBarForScroll(fill);
      }
    }
  }, {
    root: null,
    rootMargin: '0px 0px -4% 0px',
    threshold: [0, 0.08, 0.2, 0.45]
  });

  watchRows.forEach((row) => {
    try { __overviewDetailsScrollObserver.observe(row); } catch (_) {}
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      watchRows.forEach((row) => {
        const fill = getOverviewDetailsBarFillFromRow(row);
        __overviewDetailsWasVisible.set(
          row,
          isOverviewDetailsRowVisible(row)
            && !!(fill && (fill.classList.contains('overview-details-bar-show') || fill.classList.contains('overview-details-bar-animating')))
        );
      });
      __overviewDetailsScrollLive = true;
    });
  });
}

function scrollOverviewDetailsToTop() {
  try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (_) { try { window.scrollTo(0, 0); } catch (__) {} }
  try { document.documentElement.scrollTop = 0; } catch (_) {}
  try { document.body.scrollTop = 0; } catch (_) {}
  const page = document.getElementById('page-overview-details');
  if (page) page.scrollTop = 0;
}

function openOverviewDetailsSection(anchorId = '') {
  prepareOverviewDetailsBars();
  renderAccountBalanceWidget();
  renderBudgetStatus();
  renderBankCards(getTransactionsByBank(true, true));
  showPage('overview-details');
  scrollOverviewDetailsToTop();

  const normalized = String(anchorId || '').trim();
  // Net worth / available cash / generic top: stay on the header. Do not
  // scrollIntoView(account-balance) — that pushes the header off-screen.
  if (!normalized || normalized === 'overview-details-top' || normalized === 'account-balance-anchor') {
    requestAnimationFrame(() => scrollOverviewDetailsToTop());
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const anchor = document.getElementById(normalized);
      if (!anchor) {
        scrollOverviewDetailsToTop();
        return;
      }
      try {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (_) {
        try { anchor.scrollIntoView(true); } catch (__) {}
      }
    });
  });
}

function closeOverviewDetails() {
  showPage('overview');
}

function renderOverviewAfterMonthShift() {
  const month = getAktuálneMonth();
  try { reapplySheetAccountBalancesFromStorage(); } catch (_) {}
  try { recomputeAccountBalancesForMonth(month); } catch (_) {}
  const monthAllTxns = allTransactions.filter(t => normalizeMonthStr(t.month) === normalizeMonthStr(month));

  const headerMonth = document.getElementById('header-month');
  if (headerMonth) headerMonth.textContent = getMonthLabel();
  updateOverviewMonthNavState();
  updateUpgradePlanStatus();

  const txnMonthLabel = document.getElementById('txn-month');
  if (txnMonthLabel) txnMonthLabel.textContent = getMonthLabel();
  const txnAktuálneDate = document.getElementById('txn-current-date');
  if (txnAktuálneDate) txnAktuálneDate.textContent = `${t('todayPrefix')}: ${formatDate(new Date())}`;

  const archiveMonthSpent = getArchiveMonthSpentTotalCzk(month);
  const totalMonthSpent = archiveMonthSpent;
  updateOverviewSummaryStrip(totalMonthSpent, monthAllTxns.length);

  requestAnimationFrame(() => {
    try { renderBudgetStatus(); } catch (e) { console.error('Budget status render failed:', e); }
    try { renderAccountBalanceWidget(); } catch (e) { console.error('Account balance render failed:', e); }
    try { renderBankCards(getTransactionsByBank(true, true)); } catch (e) { console.error('Bank cards render failed:', e); }
    try { renderOverviewDashboard(); } catch (e) { console.error('Overview dashboard render failed:', e); }
    try { playOverviewSummaryStripReveal(); } catch (_) {}
    try { animateOverviewChartsAfterMonthShift(); } catch (_) {}
  });

  // Keep currently visible pages consistent without forcing full app re-render.
  try {
    if (activePageId === 'txns') {
      updateTxnPage();
    } else if (activePageId === 'archive') {
      renderArchive();
      renderArchiveTrendChart();
    }
  } catch (_) {}
  try { scheduleFloatingUtilityUpdate(); } catch(_) {}
}

function renderTransactionsSection(monthTxns) {
  try {
    updateTxnPage(monthTxns || getCurrentMonthOutgoingTransactions());
    bindTransactionDeleteGestures();
    __btTxnsTabDirty = false;
  } catch (e) {
    console.error('Transactions section render failed:', e);
  }
}

function renderArchiveSection() {
  try {
    renderArchive();
    renderArchiveTrendChart();
    __btArchiveTabDirty = false;
  } catch (e) {
    console.error('Archive section render failed:', e);
  }
}

// Render the heavy section for the currently active tab now; mark the others
// dirty so they render on first visit.
function renderDeferredTabSections(monthTxns) {
  if (activePageId === 'txns') renderTransactionsSection(monthTxns);
  else __btTxnsTabDirty = true;
  if (activePageId === 'archive') renderArchiveSection();
  else __btArchiveTabDirty = true;
}

function renderDirtyTabSection(pageId) {
  if (pageId === 'txns' && __btTxnsTabDirty) { renderTransactionsSection(); return true; }
  if (pageId === 'archive' && __btArchiveTabDirty) { renderArchiveSection(); return true; }
  return false;
}

function primeArchiveTrendLinesForIntro(wrap) {
  if (!wrap) return;
  wrap.querySelectorAll('.archive-bank-line').forEach((line) => {
    try { (line.__btArchiveLineAnim || []).forEach((anim) => anim.cancel()); } catch (_) {}
    line.__btArchiveLineAnim = null;
    line.style.animation = 'none';
    let len = 0;
    try { len = line.getTotalLength(); } catch (_) {}
    if (!len || len < 1) len = 420;
    line.style.strokeDasharray = `${len}`;
    line.style.strokeDashoffset = `${len}`;
  });
  wrap.querySelectorAll('.archive-bank-point').forEach((pt) => {
    pt.style.opacity = '0';
    pt.style.animation = 'none';
  });
}

function scheduleArchiveChartIntro(delayMs = 0) {
  const token = ++__archiveChartIntroToken;
  if (__archiveChartIntroObserver) {
    try { __archiveChartIntroObserver.disconnect(); } catch (_) {}
    __archiveChartIntroObserver = null;
  }
  window.setTimeout(() => {
    if (token !== __archiveChartIntroToken) return;
    requestAnimationFrame(() => {
      if (token !== __archiveChartIntroToken) return;
      requestAnimationFrame(() => {
        if (token !== __archiveChartIntroToken) return;
        const page = document.getElementById('page-archive');
        const wrap = document.getElementById('archive-trend-chart');
        if (!page || !wrap || !page.classList.contains('active')) return;
        const rect = wrap.getBoundingClientRect ? wrap.getBoundingClientRect() : null;
        const vh = window.innerHeight || document.documentElement.clientHeight || 0;
        const visible = !!(rect && rect.bottom > 24 && rect.top < (vh - 24) && rect.width > 0 && rect.height > 0);
        if (visible || !('IntersectionObserver' in window)) {
          try { playArchiveTrendChartIntro(); } catch (_) {}
          return;
        }
        __archiveChartIntroObserver = new IntersectionObserver((entries) => {
          if (token !== __archiveChartIntroToken) return;
          if (!entries.some((entry) => entry.isIntersecting)) return;
          try { __archiveChartIntroObserver.disconnect(); } catch (_) {}
          __archiveChartIntroObserver = null;
          try { playArchiveTrendChartIntro(); } catch (_) {}
        }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: [0, 0.08, 0.2] });
        try { __archiveChartIntroObserver.observe(wrap); } catch (_) {}
      });
    });
  }, Math.max(0, Number(delayMs || 0)));
}

function playArchiveTrendChartIntro() {
  const page = document.getElementById('page-archive');
  const wrap = document.getElementById('archive-trend-chart');
  if (!page || !wrap || !page.classList.contains('active')) return;
  if (typeof isPageLoadingOverlayBlocking === 'function' && isPageLoadingOverlayBlocking()) {
    scheduleArchiveChartIntro(120);
    return;
  }
  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (reducedMotion) {
    wrap.querySelectorAll('.archive-bank-line').forEach((line) => {
      line.style.strokeDashoffset = '0';
      line.style.animation = 'none';
    });
    wrap.querySelectorAll('.archive-bank-point').forEach((pt) => {
      pt.style.opacity = '1';
      pt.style.animation = 'none';
    });
    return;
  }

  wrap.querySelectorAll('.archive-trend-bar-animate').forEach((el) => {
    el.style.removeProperty('transform');
    el.style.removeProperty('opacity');
    el.style.removeProperty('animation');
    el.style.removeProperty('animation-delay');
  });
  void wrap.offsetWidth;

  wrap.querySelectorAll('.archive-trend-bar-animate').forEach((el, idx) => {
    el.style.animation = 'archiveBarGrow .9s cubic-bezier(.22,.72,.22,1) both';
    el.style.animationDelay = `${idx * 35}ms`;
  });

  primeArchiveTrendLinesForIntro(wrap);
  void wrap.offsetWidth;

  const lines = Array.from(wrap.querySelectorAll('.archive-bank-line'));
  let maxLineEndMs = 0;
  lines.forEach((line, idx) => {
    let len = 0;
    try { len = line.getTotalLength(); } catch (_) {}
    if (!len || len < 1) len = 420;
    const duration = 1400;
    const delay = idx * 140;
    maxLineEndMs = Math.max(maxLineEndMs, delay + duration);
    try {
      const anim = line.animate(
        [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration, delay, easing: 'ease-out', fill: 'forwards' }
      );
      line.__btArchiveLineAnim = [anim];
      anim.onfinish = () => {
        line.style.strokeDashoffset = '0';
      };
    } catch (_) {
      line.style.strokeDashoffset = '0';
    }
  });

  wrap.querySelectorAll('.archive-bank-point').forEach((pt, idx) => {
    pt.style.opacity = '0';
    pt.style.animation = 'none';
    const delay = Math.min(maxLineEndMs, 260 + idx * 45);
    try {
      const anim = pt.animate(
        [{ opacity: 0, transform: 'scale(0.74)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 420, delay, easing: 'ease-out', fill: 'forwards' }
      );
      pt.__btPointAnim = [anim];
      anim.onfinish = () => {
        pt.style.opacity = '1';
        pt.style.transform = '';
      };
    } catch (_) {
      pt.style.opacity = '1';
    }
  });
}

function finishArchiveTabPresentation() {
  markLoadingPresentationDataReady();
  finishLoadingPresentation(() => {
    scheduleArchiveChartIntro(60);
    window.setTimeout(() => {
      try { maybeLoadMoreArchiveMonths(); } catch (_) {}
    }, 20);
  });
}

function scheduleArchiveTabRender() {
  const list = document.getElementById('archive-months-list');
  const needsRender = !!__btArchiveTabDirty || !(list && list.children && list.children.length);

  if (!needsRender) {
    scheduleArchiveChartIntro(60);
    window.setTimeout(() => {
      try { maybeLoadMoreArchiveMonths(); } catch (_) {}
    }, 20);
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        const run = () => {
          try { renderArchive(); } catch (e) { console.error('Archive list render failed:', e); }

          // Yield after the archive list so the compositor can present another
          // smooth loader frame before the heavier trend SVG is calculated.
          requestAnimationFrame(() => {
            const finishTrend = () => {
              try { renderArchiveTrendChart(); } catch (e) { console.error('Archive chart render failed:', e); }
              __btArchiveTabDirty = false;
              finishArchiveTabPresentation();
            };
            if (typeof requestIdleCallback === 'function') {
              requestIdleCallback(finishTrend, { timeout: 240 });
            } else {
              window.setTimeout(finishTrend, 16);
            }
          });
        };
        if (typeof requestIdleCallback === 'function') {
          requestIdleCallback(run, { timeout: 320 });
        } else {
          window.setTimeout(run, 16);
        }
      }, 32);
    });
  });
}

function playTxnCashflowIntro() {
  const page = document.getElementById('page-txns');
  if (!page || !page.classList.contains('active')) return;
  if (typeof isPageLoadingOverlayBlocking === 'function' && isPageLoadingOverlayBlocking()) {
    scheduleTxnCashflowIntro(120);
    return;
  }
  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  page.classList.remove('txn-cashflow-intro-pending');
  if (reducedMotion) return;
  const slot = document.getElementById('txn-cashflow-slot');
  if (!slot) return;
  const bars = slot.querySelectorAll('.txn-cashflow-bar-in, .txn-cashflow-bar-out');
  if (!bars.length) return;
  bars.forEach((el) => {
    el.style.animation = 'none';
    el.style.removeProperty('animation-delay');
    el.style.transform = 'scaleY(0.16)';
    el.style.opacity = '0.55';
  });
  void slot.offsetWidth;
  bars.forEach((el) => {
    el.style.removeProperty('transform');
    el.style.removeProperty('opacity');
    el.style.animation = 'barGrowSoft 0.72s cubic-bezier(.18,.78,.24,1) both';
    el.style.animationDelay = el.classList.contains('txn-cashflow-bar-out') ? '0.12s' : '0ms';
  });
}

function scheduleTxnCashflowIntro(delayMs = 0) {
  window.setTimeout(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try { playTxnCashflowIntro(); } catch (_) {}
      });
    });
  }, Math.max(0, Number(delayMs || 0)));
}

function presentTxnsTab(options = {}) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        const run = () => {
          document.getElementById('page-txns')?.classList.add('txn-cashflow-intro-pending');
          try {
            renderTransactionsSection();
            if (massTagSelectMode) {
              document.getElementById('txn-list')?.removeAttribute('data-rendered-key');
              try { updateTxnPage(true); } catch (_) {}
              updateMassTagBarUi();
            }
          } catch (_) {}
          markLoadingPresentationDataReady();
          finishLoadingPresentation(() => {
            scheduleTxnCashflowIntro(0);
          });
        };
        if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 320 });
        else window.setTimeout(run, 16);
      }, 32);
    });
  });
}

function shouldInsertWidgetAfterTarget(targetEl, clientX, clientY) {
  if (!targetEl || typeof clientX !== 'number' || typeof clientY !== 'number') return false;
  const rect = targetEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  const midX = rect.left + rect.width / 2;
  const midY = rect.top + rect.height / 2;
  const dx = clientX - midX;
  const dy = clientY - midY;
  if (Math.abs(dy) > Math.abs(dx) * 0.6) return dy > 0;
  return dx > 0;
}

function reorderListRelative(list, sourceId, targetId, clientX, clientY, getId, getTargetEl) {
  getId = getId || ((item) => item?.id);
  const sourceIndex = list.findIndex((item) => getId(item) === sourceId);
  const targetIndex = list.findIndex((item) => getId(item) === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceId === targetId) return null;
  const targetEl = typeof getTargetEl === 'function' ? getTargetEl(targetId) : null;
  const insertAfter = shouldInsertWidgetAfterTarget(targetEl, clientX, clientY);
  const next = list.slice();
  const [item] = next.splice(sourceIndex, 1);
  const adjustedTarget = next.findIndex((entry) => getId(entry) === targetId);
  if (adjustedTarget < 0) return null;
  const insertAt = insertAfter ? adjustedTarget + 1 : adjustedTarget;
  next.splice(insertAt, 0, item);
  return next;
}

function initBtTouchFeedback(selector) {
  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  document.querySelectorAll(selector).forEach((el) => bindBtTouchElement(el, reducedMotion));
}

function resolveBtTouchTarget(node) {
  if (!node || typeof node.closest !== 'function') return null;
  if (node.closest('#page-overview .custom-widget-add-btn')) return null;
  if (node.closest('#page-overview-details')) return null;
  if (node.closest('input, textarea, select, label, .bottom-sheet-backdrop')) return null;
  if (node.closest('.wealth-card, .custom-widget-card')) {
    const menuBtn = node.closest('.custom-widget-menu button, .custom-widget-manual-controls button');
    return menuBtn || null;
  }
  const menuBtn = node.closest('.custom-widget-menu button, .custom-widget-manual-controls button');
  if (menuBtn) return menuBtn;
  return node.closest(BT_TOUCH_TARGET_SELECTOR);
}

function isBtSvgTouchTarget(el) {
  return !!(el && el.namespaceURI === 'http://www.w3.org/2000/svg');
}

function markBtTouchRippleHost(el) {
  if (!el || isBtSvgTouchTarget(el)) return;
  if (el.classList.contains('fab') || el.classList.contains('scroll-top-fab')) {
    el.classList.add('bt-touch-ripple-host-fixed');
  } else {
    el.classList.add('bt-touch-ripple-host');
  }
}

function spawnBtTouchRipple(el, event, reducedMotion) {
  if (!el || el.disabled || reducedMotion || isBtSvgTouchTarget(el)) return;
  const rect = el.getBoundingClientRect();
  const pointX = (event && typeof event.clientX === 'number') ? event.clientX : (rect.left + rect.width / 2);
  const pointY = (event && typeof event.clientY === 'number') ? event.clientY : (rect.top + rect.height / 2);
  const size = Math.max(rect.width, rect.height) * 2.2;
  const ripple = document.createElement('span');
  ripple.className = 'bt-touch-ripple';
  ripple.style.width = size + 'px';
  ripple.style.height = size + 'px';
  ripple.style.left = (pointX - rect.left - size / 2) + 'px';
  ripple.style.top = (pointY - rect.top - size / 2) + 'px';
  el.appendChild(ripple);
  const cleanup = () => { try { ripple.remove(); } catch (_) {} };
  ripple.addEventListener('animationend', cleanup, { once: true });
  window.setTimeout(cleanup, 520);
}

function bindBtTouchElement(el, reducedMotion) {
  if (!el || el.dataset.btTouchReady === '1') return;
  if (el.matches && el.matches('#page-overview .custom-widget-add-btn')) return;
  el.dataset.btTouchReady = '1';
  markBtTouchRippleHost(el);
  const press = (event) => {
    if (el.disabled) return;
    el.classList.add('is-touch-pressed');
    spawnBtTouchRipple(el, event, reducedMotion);
  };
  const release = () => el.classList.remove('is-touch-pressed');
  el.addEventListener('pointerdown', press, { passive: true });
  el.addEventListener('pointerup', release, { passive: true });
  el.addEventListener('pointercancel', release, { passive: true });
  el.addEventListener('pointerleave', release, { passive: true });
}

function releaseBtActiveTouch() {
  if (!__btActiveTouchEl) return;
  __btActiveTouchEl.classList.remove('is-touch-pressed');
  __btActiveTouchEl = null;
}

function initGlobalTouchFeedback() {
  if (window.__btGlobalTouchBound) return;
  window.__btGlobalTouchBound = true;
  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  document.addEventListener('pointerdown', (event) => {
    const el = resolveBtTouchTarget(event.target);
    if (!el || el.disabled) return;
    releaseBtActiveTouch();
    __btActiveTouchEl = el;
    markBtTouchRippleHost(el);
    el.classList.add('is-touch-pressed');
    spawnBtTouchRipple(el, event, reducedMotion);
  }, { passive: true });
  document.addEventListener('pointerup', releaseBtActiveTouch, { passive: true });
  document.addEventListener('pointercancel', releaseBtActiveTouch, { passive: true });
}

function initNavTouchFeedback() {
  initGlobalTouchFeedback();
}

function bootstrapUiFromCache(options = {}) {
  const bootstrapPerfStart = btPerfNow();
  const deferHeavy = options.deferHeavy !== false;
  const shouldRender = options.render !== false;
  if (!options.skipHideBoot) {
    try { hideAppBootChrome(); } catch (_) {}
  }
  try { loadCachedTransactionsSnapshot(); } catch (_) {}
  try { reapplySheetAccountBalancesFromStorage(); } catch (_) {}
  try {
    const headerMonth = document.getElementById('header-month');
    if (headerMonth) headerMonth.textContent = getMonthLabel();
    updateOverviewMonthNavState();
  } catch (_) {}
  btPerfLog('bootstrapShell', btPerfNow() - bootstrapPerfStart, 'cache+header');
  if (shouldRender) {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => {
        try { recomputeAccountBalancesForLoadedMonths(); } catch (_) {}
      }, { timeout: 1200 });
    } else {
      window.setTimeout(() => { try { recomputeAccountBalancesForLoadedMonths(); } catch (_) {} }, 0);
    }
  }
  if (shouldRender) {
    try { renderAll({ visibleOnly: true, deferHeavy }); } catch (_) {}
    try { applyLanguage(); } catch (_) {}
  }
  if (activePageId === 'overview' || document.getElementById('page-overview')?.classList.contains('active')) {
    /* Chart + summary intro runs after dashboard render via finishOverviewChartRenderCycle. */
  }
  btPerfLog('bootstrapCache', btPerfNow() - bootstrapPerfStart, deferHeavy ? 'defer-heavy' : 'eager-heavy');
}

function renderAll(options = {}) {
  const renderAllPerfStart = btPerfNow();
  invalidateTransactionStatsAdjustments();
  const forceArchiveRebuild = !!(options && options.forceArchiveRebuild);
  const renderVisibleOnly = options.eagerAllTabs !== true;
  const deferHeavy = !!(options && options.deferHeavy);
  const overviewMode = String(options.overviewMode || '');
  const numbersFirst = overviewMode === 'numbers-first';
  const chartsOnlyPass = overviewMode === 'charts';
  allTransactions = sortTransactionsNewestFirst(allTransactions);
  if (!(deferHeavy && !forceArchiveRebuild) || chartsOnlyPass) {
    rebuildLocalArchiveStatsFromTransactions({ force: forceArchiveRebuild });
  }

  const month = getAktuálneMonth();
  const monthTxns = getCurrentMonthOutgoingTransactions();
  const monthAllTxns = allTransactions.filter(t => normalizeMonthStr(t.month) === normalizeMonthStr(month));
  const monthCardTxns = getCurrentMonthCardTransactions();

  document.getElementById('header-month').textContent = getMonthLabel();
  updateOverviewMonthNavState();
  updateUpgradePlanStatus();
  const txnMonthLabel = document.getElementById('txn-month');
  if (txnMonthLabel) txnMonthLabel.textContent = getMonthLabel();
  const txnAktuálneDate = document.getElementById('txn-current-date');
  if (txnAktuálneDate) txnAktuálneDate.textContent = `${t('todayPrefix')}: ${formatDate(new Date())}`;

  // Overview headline must stay consistent with archive monthly spent total.
  const archiveMonthSpent = getArchiveMonthSpentTotalCzk(month);
  const totalMonthSpent = archiveMonthSpent;
  updateOverviewSummaryStrip(totalMonthSpent, monthAllTxns.length);

  const renderOverviewNumbersOnly = () => {
    try { renderOverviewDashboard(); } catch (e) {
      document.documentElement.setAttribute('data-render-overview-error', String(e && e.message ? e.message : e));
      console.error('Overview dashboard render failed:', e);
    }
  };

  const renderHeavyOverviewSections = () => {
    try {
      renderBudgetStatus();
    } catch (e) {
      document.documentElement.setAttribute('data-render-budget-error', String(e && e.message ? e.message : e));
      console.error('Budget status render failed:', e);
    }
    try {
      renderAccountBalanceWidget();
    } catch (e) {
      document.documentElement.setAttribute('data-render-balance-error', String(e && e.message ? e.message : e));
      console.error('Account balance render failed:', e);
    }
    let byBankMonth = {};
    try {
      byBankMonth = getTransactionsByBank(true, true);
      renderBankCards(byBankMonth);
    } catch (e) {
      document.documentElement.setAttribute('data-render-cards-error', String(e && e.message ? e.message : e));
      console.error('Bank cards render failed:', e);
    }
    try { renderOverviewDashboard(); } catch (e) {
      document.documentElement.setAttribute('data-render-overview-error', String(e && e.message ? e.message : e));
      console.error('Overview dashboard render failed:', e);
    }
    try { renderOverviewFixedWidgets(); } catch (e) { console.warn('Overview fixed widgets render failed:', e); }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try { finishOverviewChartRenderCycle(); } catch (_) {}
      });
    });
  };

  if (numbersFirst) {
    renderOverviewNumbersOnly();
  } else {
    const shouldDeferHeavy = deferHeavy && renderVisibleOnly && (activePageId === 'overview' || !!document.getElementById('page-overview')?.classList.contains('active'));
    if (shouldDeferHeavy) {
      const runDeferredHeavy = () => {
        try { renderHeavyOverviewSections(); } catch (e) { console.error('Deferred overview render failed:', e); }
      };
      if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(runDeferredHeavy, { timeout: 350 });
      } else {
        requestAnimationFrame(runDeferredHeavy);
      }
    } else {
      renderHeavyOverviewSections();
    }
  }

  // Default: render only the visible tab eagerly and mark the rest dirty.
  // Numbers-first pass skips other tabs so the first paint stays cheap.
  if (!numbersFirst) {
    if (renderVisibleOnly) {
      renderDeferredTabSections(monthTxns);
    } else {
      renderTransactionsSection(monthTxns);
      renderArchiveSection();
    }
    populateSimulatorLimitMonthDropdown(getSimulatorLimitMonth());
    populateSettingsLimitMonthDropdown(getSettingsLimitMonth());
  }

  applyLanguage();
  btPerfLog('renderAll', btPerfNow() - renderAllPerfStart, [
    renderVisibleOnly ? 'visible-only' : 'full',
    numbersFirst ? 'numbers-first' : (chartsOnlyPass ? 'charts' : (deferHeavy ? 'defer-heavy' : 'eager-heavy'))
  ].join(','));
}

function renderBankCards(byBank) {
  const main = document.getElementById('cards-container');
  const extra = document.getElementById('csob-container');
  if (!main || !extra) return;

  // ČSOB CZ debit and credit card limits are merged under the parent bank; identifiers come from Google Sheets.
  const mergedByBank = { ...(byBank || {}) };
  mergedByBank.csob_cz = [
    ...(mergedByBank.csob_cz || []),
    ...(mergedByBank.csob_cz_credit || [])
  ];

  main.innerHTML = renderBankCard('rb_cz', mergedByBank.rb_cz || []);
  extra.innerHTML = BANK_ORDER
    .filter(k => k !== 'rb_cz' && k !== 'csob_cz_credit')
    .map(k => renderBankCard(k, mergedByBank[k] || []))
    .join('');
  try { scheduleOverviewDetailsBarRefresh(); } catch (_) {}
}


function getBankCardDisplayLabel(bankKey, txns) {
  const lang = getLanguage();
  const prefix = lang === 'en' ? 'Card' : 'Karta';
  const joiner = lang === 'en' ? ' and ' : ' a ';
  const numbers = [];
  const names = [];

  (txns || []).forEach(tx => {
    const raw = String(tx?.card || '').replace(/\*/g, '').trim();
    if (!raw || /^cash$/i.test(raw) || /^účet\b/i.test(raw) || /^ucet\b/i.test(raw)) return;

    const digitGroups = raw.match(/\d{3,}/g);
    if (digitGroups && digitGroups.length) {
      const last = digitGroups[digitGroups.length - 1].slice(-4);
      if (last && !numbers.includes(last)) numbers.push(last);
      return;
    }

    const cleaned = raw.replace(/^karta\s*/i, '').replace(/^card\s*/i, '').trim();
    if (cleaned && !names.includes(cleaned)) names.push(cleaned);
  });

  getVisibleCardsForBank(bankKey).forEach(cardNo => {
    if (cardNo && !numbers.includes(cardNo)) numbers.push(cardNo);
  });

  if (numbers.length) {
    const list = numbers.length === 1
      ? numbers[0]
      : `${numbers.slice(0, -1).join(', ')}${joiner}${numbers[numbers.length - 1]}`;
    return `${prefix} ${list}`;
  }

  if (names.length) {
    const list = names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')}${joiner}${names[names.length - 1]}`;
    return `${prefix} ${list}`;
  }

  return prefix;
}

function renderBankCard(bankKey, txns) {
  const bank = getBankInfo(bankKey);
  const limit = getOverviewBankCardLimitForBank(bankKey, getAktuálneMonth()) || bank.defaultLimit || 0;
  const used = txns.length;
  const fillPct = limit > 0 ? Math.min(used / limit, 1) : 0;
  const barColor = getCardColor(used, limit);
  const cardNum = getBankCardDisplayLabel(bankKey, txns);
  const delta = Math.max(limit - used, 0);

  const warnStatusText = limit <= 0
    ? `<span style="color: var(--muted);">${t('withoutMonthlyLimit')}</span>`
    : (delta > 0
      ? `<span style="color: var(--warn);">${t('cardPayments')} - ${t('leftWord')} ${delta}</span>`
      : `<span style="color: var(--ok);">${t('cardPayments')} - ${t('limitReached')}</span>`);

  return `
  <div class="card-widget bank-card-clickable" onclick="openBankCardTransactions('${bankKey}')" style="margin-top:${bankKey === 'rb_cz' ? '0' : '14px'};">
    <div class="card-header" style="background: linear-gradient(135deg, #1a1a1a, #111);">
      <div><div class="card-name" style="color:${bank.color}; font-weight: 700;">${bankLabelWithLogo(bankKey)}</div><div class="card-number">${cardNum}</div></div>
      <div class="card-count"><div class="card-count-big" style="color:${barColor};">${used}<span style="font-size:16px;opacity:.5;color:var(--muted);">/${limit}</span></div><div class="card-count-sub">${t('usedThisMonth')}</div></div>
    </div>
    <div class="card-body">
      <div class="progress-wrap"><div class="progress-labels"><span>0</span><span>${t('progress')}</span><span>${limit}</span></div><div class="progress-track"><div class="progress-fill" style="width: ${fillPct * 100}%; background: ${barColor};"></div></div></div>
      <div class="card-warning-status">${warnStatusText}</div>
      <div class="card-stats"><div class="stat-box"><div class="stat-val">${renderCurrencyTotalLines(txns, bank.primaryCurrency)}</div><div class="stat-label">${t('spentByCurrency')}</div></div><div class="stat-box"><div class="stat-val">${delta}</div><div class="stat-label">${t('paymentsLeft')}</div></div></div>
    </div>
  </div>`;
}

function renderRecentBankColumns(byBank) {
  const wrap = document.getElementById('recent-bank-columns');
  if (!wrap) return;

  // ČSOB CZ credit card is part of ČSOB CZ for recent transactions.
  // Clicking ČSOB CZ must show cash, transfers and all cards belonging to that bank.
  const mergedByBank = { ...(byBank || {}) };
  mergedByBank.csob_cz = [
    ...(mergedByBank.csob_cz || []),
    ...(mergedByBank.csob_cz_credit || [])
  ];

  const visibleBankKeys = BANK_ORDER.filter(bankKey => bankKey !== 'csob_cz_credit');
  wrap.innerHTML = visibleBankKeys.map(bankKey => {
    const bank = getBankInfo(bankKey);
    const txns = sortTransactionsNewestFirst([...(mergedByBank[bankKey] || [])]).slice(0, 5);
    const items = txns.length === 0 ? `<div class="tx-meta-compact">${t('emptyMovements')}</div>` : txns.map(t => {
      const txId = typeof getTransactionId === 'function' ? getTransactionId(t) : (t.id || t.msgId || '');
      return `
      <div class="tx-item-compact" data-tx-id="${escapeAttr(txId)}" onclick="openRecentBankTransactions('${bankKey}')">
        <div class="tx-row-top">
          <div class="tx-merchant-compact">${escapeHtml(t.merchant)}</div>
          <div class="tx-amt-compact-wrap"><div class="tx-amt-compact ${Number(t.amount) > 0 ? 'amount-income' : 'amount-expense'}">${Number(t.amount) > 0 ? '+' : '-'}${formatCurrencyAmount(t.amount, t.currency)}</div>${renderAccountCurrencyEquivalent(t, { compact: true })}</div>
        </div>
        <div class="tx-meta-compact">${escapeHtml((t.date || '').split(' ')[0])}</div>
      </div>`;
    }).join('');
    return `<div class="tx-column"><div class="tx-col-title" onclick="openRecentBankTransactions('${bankKey}')" title="${t('tapRecentBank')}" style="color:${bank.color};">${bankLabelWithLogo(bankKey)}</div>${items}</div>`;
  }).join('');
}

function renderTwoColumns(rbTxns, csobTxns) {
  renderRecentBankColumns({ rb_cz: rbTxns, csob_sk: csobTxns, csob_cz: [], moneta: [] });
}


function parseDateInputForFilter(value, endOfDay = false) {
  if (!value) return null;
  const parts = String(value).split('-').map(Number);
  if (parts.length === 3 && parts.every(Boolean)) {
    return new Date(parts[0], parts[1] - 1, parts[2], endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
  }
  const parsed = parseCustomDateStr(value);
  if (!parsed || isNaN(parsed.getTime())) return null;
  if (endOfDay) parsed.setHours(23, 59, 59, 999);
  else parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function filterTransactionsByMonthFilter(txns) {
  // Month dropdown was removed, but archive deep-links (bank icon / spent / income) set
  // activeMonthFilter so the Transactions tab matches the archive month exactly by tx.month.
  // Supports one month or a pipe-separated set ("MM/YYYY|MM/YYYY").
  const raw = String(activeMonthFilter || '').trim();
  if (!raw) return txns;
  const months = raw.split('|').map(m => normalizeMonthStr(m)).filter(Boolean);
  if (!months.length) return txns;
  const set = new Set(months);
  return (txns || []).filter(tx => set.has(normalizeMonthStr(tx && tx.month)));
}

function filterTransactionsByDateRange(txns) {
  const from = parseDateInputForFilter(activeDateFrom, false);
  const to = parseDateInputForFilter(activeDateTo, true);
  if (!from && !to) return txns;

  return txns.filter(tx => {
    const parsed = parseCustomDateStr(tx.rawDate || tx.date);
    if (!parsed || isNaN(parsed.getTime())) return false;
    if (from && parsed < from) return false;
    if (to && parsed > to) return false;
    return true;
  });
}

function handleTransactionDateRange() {
  activeDateFrom = document.getElementById('txn-date-from')?.value || '';
  activeDateTo = document.getElementById('txn-date-to')?.value || '';
  if (activeDateFrom || activeDateTo) activeMonthFilter = '';
  activeTxnHistoryScope = (hasActiveTransactionDateRange() || activeMonthFilter) ? 'all' : 'current';
  resetTxnVisibleLimit();
  updateTxnPage();
}

function handleTransactionMonthFilter() {
  // No-op kept for old cached markup. The month dropdown is intentionally removed.
  activeMonthFilter = '';
  updateTxnPage();
}

function clearTransactionDateRange() {
  activeDateFrom = '';
  activeDateTo = '';
  activeMonthFilter = '';
  activeTxnHistoryScope = 'current';
  resetTxnVisibleLimit();
  const from = document.getElementById('txn-date-from');
  const to = document.getElementById('txn-date-to');
  if (from) from.value = '';
  if (to) to.value = '';
  updateTxnPage();
}

function getTransactionMonthOptions() {
  return [];
}

function populateTransactionMonthDropdown() {
  // Month dropdown removed from Transactions.
}

function updateTransactionDateInputs() {
  const from = document.getElementById('txn-date-from');
  const to = document.getElementById('txn-date-to');
  if (from && from.value !== activeDateFrom) from.value = activeDateFrom || '';
  if (to && to.value !== activeDateTo) to.value = activeDateTo || '';
  populateTransactionMonthDropdown();
}


function getPreferredCurrencyOrder(currencies) {
  const preferred = ['CZK', 'EUR', 'USD', 'GBP', 'PLN'];
  const unique = [...new Set(currencies.map(c => String(c || 'CZK').toUpperCase()))];
  return unique.sort((a, b) => {
    const ai = preferred.indexOf(a);
    const bi = preferred.indexOf(b);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }
    return a.localeCompare(b);
  });
}

function buildTransactionTotals(txns) {
  const adjustments = buildTransactionStatsAdjustments(allTransactions);
  const statTxns = (txns || []).filter(tx => Math.abs(Number(adjustments.effective.get(tx) || 0)) > 0.005);
  const totals = {
    count: statTxns.length,
    incoming: {},
    outgoing: {},
    net: {}
  };

  statTxns.forEach(tx => {
    const currency = currencyCode(tx.currency || 'CZK');
    const amount = Number(adjustments.effective.get(tx) || 0);
    if (!totals.incoming[currency]) totals.incoming[currency] = 0;
    if (!totals.outgoing[currency]) totals.outgoing[currency] = 0;
    if (!totals.net[currency]) totals.net[currency] = 0;

    if (amount > 0) totals.incoming[currency] += amount;
    if (amount < 0) totals.outgoing[currency] += Math.abs(amount);
    totals.net[currency] += amount;
  });

  return totals;
}

function renderTotalsValueLines(map, mode = 'neutral') {
  const currencies = getPreferredCurrencyOrder(Object.keys(map || {}));
  if (!currencies.length) return `<span class="amount-neutral">${t('noTotalValue')} ${currencySymbol('CZK')}</span>`;

  return currencies.map(currency => {
    const value = Number(map[currency] || 0);
    const cls = mode === 'income'
      ? 'amount-income'
      : mode === 'expense'
        ? 'amount-expense'
        : value < 0
          ? 'amount-expense'
          : value > 0
            ? 'amount-income'
            : 'amount-neutral';

    const sign = mode === 'income'
      ? '+'
      : mode === 'expense'
        ? '-'
        : value > 0
          ? '+'
          : value < 0
            ? '-'
            : '';

    return `<span class="${cls}">${sign}${formatCurrencyAmount(value, currency)}</span>`;
  }).join('');
}

function getTxnDateKey(tx) {
  const parsed = parseCustomDateStr(tx?.rawDate || tx?.date);
  if (!parsed || isNaN(parsed.getTime())) return '';
  const yyyy = parsed.getFullYear();
  const mm = String(parsed.getMonth() + 1).padStart(2, '0');
  const dd = String(parsed.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}


function toggleTxnCashflowChartType() {
  txnCashflowChartType = txnCashflowChartType === 'pie' ? 'bar' : 'pie';
  localStorage.setItem('txn_cashflow_chart_type', txnCashflowChartType);
  updateTxnPage();
}

function renderTransactionDailyCashflow(txns) {
  txns = (txns || []).filter(tx => !(typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)));
  if (!txns || !txns.length) return '';

  // v160: when a single bank is selected, chart values use that bank's account currency
  // and keep the original transaction sign. convertTransactionAmount() intentionally
  // returns an absolute value for totals elsewhere, so the chart must restore the sign.
  const drilldownType = String(activeDrilldownFilter?.type || '');
  const chartCurrency = drilldownType === 'overview-spent'
    ? 'CZK'
    : (activeBank && activeBank !== 'všetky'
      ? currencyCode(getBankBalanceCurrency(activeBank) || getBankInfo(activeBank)?.primaryCurrency || 'CZK')
      : currencyCode(getAppCurrency()));

  const byDay = {};
  const adjustments = buildTransactionStatsAdjustments(allTransactions);
  txns.forEach(tx => {
    let key = getTxnDateKey(tx);
    if (!key) {
      const month = normalizeMonthStr(tx?.month || '');
      const m = month.match(/^(\d{2})\/(\d{4})$/);
      if (m) key = `${m[2]}-${m[1]}-01`;
    }
    if (!key) return;
    if (!byDay[key]) byDay[key] = { incoming: 0, outgoing: 0 };
    const rawAmount = Number(adjustments.effective.get(tx) || 0);
    if (!rawAmount) return;
    const convertedAbs = convertTransactionStatsAmount(tx, rawAmount, chartCurrency);
    const signedAmount = rawAmount < 0 ? -Math.abs(convertedAbs) : Math.abs(convertedAbs);
    if (signedAmount > 0) byDay[key].incoming += signedAmount;
    if (signedAmount < 0) byDay[key].outgoing += Math.abs(signedAmount);
  });

  const days = Object.keys(byDay).sort();
  if (!days.length) return '';

  const hasScopedFilter =
    !!activeDrilldownFilter ||
    String(activeMonthFilter || '').trim() !== '' ||
    String(activeDateFrom || '').trim() !== '' ||
    String(activeDateTo || '').trim() !== '' ||
    String(activeDirection || 'all') !== 'all' ||
    String(activeBank || 'všetky') !== 'všetky' ||
    String(activePaymentKind || 'all') !== 'all' ||
    String(activeCategory || 'všetky') !== 'všetky' ||
    String(activeSearch || '').trim() !== '';
  const visibleDays = hasScopedFilter ? days : days.slice(-14);
  const totalIncoming = visibleDays.reduce((s, day) => s + (byDay[day].incoming || 0), 0);
  const totalOutgoing = visibleDays.reduce((s, day) => s + (byDay[day].outgoing || 0), 0);
  const totalCashflow = totalIncoming + totalOutgoing;
  const chartType = txnCashflowChartType === 'pie' ? 'pie' : 'bar';
  const toggleTitle = chartType === 'pie' ? t('switchToBarChart') : t('switchToPieChart');
  const toggleIconClass = chartType === 'pie' ? 'bar' : 'pie';

  const head = `
      <div class="txn-cashflow-head">
        <div class="txn-cashflow-title">${t('dailyCashflow')}</div>
        <div class="txn-cashflow-actions">
          <div class="txn-cashflow-legend">
            <span><i class="txn-cashflow-dot" style="background: var(--ok)"></i>${t('incoming')}</span>
            <span><i class="txn-cashflow-dot" style="background: #E5005F"></i>${t('spent')}</span>
          </div>
          <button type="button" class="txn-chart-toggle-btn" onclick="toggleTxnCashflowChartType()" title="${escapeAttr(toggleTitle)}" aria-label="${escapeAttr(toggleTitle)}">
            <span class="txn-chart-toggle-icon ${toggleIconClass}"></span>
          </button>
        </div>
      </div>`;

  if (chartType === 'pie') {
    const incomingPct = totalCashflow > 0 ? totalIncoming / totalCashflow : 0;
    const outgoingPct = totalCashflow > 0 ? totalOutgoing / totalCashflow : 0;
    const incomingDeg = Math.max(0, Math.min(360, incomingPct * 360));
    const r = 44;
    const cx = 56;
    const cy = 56;
    const polar = (angleDeg) => {
      const a = (angleDeg - 90) * Math.PI / 180;
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    };
    const wedge = (start, end, cls) => {
      if (end - start >= 359.99) {
        return `<circle cx="${cx}" cy="${cy}" r="${r}" class="${cls}"></circle>`;
      }
      if (end <= start) return '';
      const p1 = polar(start);
      const p2 = polar(end);
      const large = end - start > 180 ? 1 : 0;
      return `<path class="${cls}" d="M ${cx} ${cy} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z"></path>`;
    };
    const incomingWedge = wedge(0, incomingDeg, 'txn-cashflow-bar-in');
    const outgoingWedge = wedge(incomingDeg, 360, 'txn-cashflow-bar-out');
    const net = totalIncoming - totalOutgoing;
    const netClass = net >= 0 ? 'amount-income' : 'amount-expense';
    return `
    <div class="txn-cashflow-card">
      ${head}
      <div class="txn-cashflow-pie-wrap">
        <svg class="txn-cashflow-pie-svg" viewBox="0 0 112 112" aria-label="${t('pieChart')}">
          <circle class="txn-cashflow-pie-bg" cx="56" cy="56" r="48"></circle>
          ${outgoingWedge}${incomingWedge}
          <circle class="txn-cashflow-pie-hole" cx="56" cy="56" r="22"></circle>
          <text class="txn-cashflow-pie-label" x="56" y="55" text-anchor="middle">${Math.round(outgoingPct * 100)}%</text>
          <text class="txn-cashflow-axis-label" x="56" y="68" text-anchor="middle">${t('spent')}</text>
        </svg>
        <div class="txn-cashflow-pie-stats">
          <div class="txn-cashflow-pie-stat"><span>${t('incoming')}</span><strong class="amount-income">+${formatCurrencyAmount(totalIncoming, chartCurrency)}</strong></div>
          <div class="txn-cashflow-pie-stat"><span>${t('spent')}</span><strong class="amount-expense">-${formatCurrencyAmount(totalOutgoing, chartCurrency)}</strong></div>
          <div class="txn-cashflow-pie-stat"><span>${t('totalNet')}</span><strong class="${netClass}">${net >= 0 ? '+' : '-'}${formatCurrencyAmount(Math.abs(net), chartCurrency)}</strong></div>
        </div>
      </div>
    </div>`;
  }

  const maxValue = Math.max(1, ...visibleDays.flatMap(day => [byDay[day].incoming, byDay[day].outgoing]));
  const width = 320;
  const height = 142;
  const top = 12;
  const bottom = 24;
  const leftPad = 34;
  const rightPad = 4;
  const chartW = width - leftPad - rightPad;
  const chartH = height - top - bottom;
  const step = chartW / visibleDays.length;
  const backBarW = Math.max(10, Math.min(18, step * 0.48));
  const frontBarW = Math.max(12, Math.min(22, step * 0.58));
  const baseline = top + chartH;

  const compactNumber = (value) => {
    const n = Number(value || 0);
    if (n >= 1000000) return `${(n / 1000000).toFixed(n >= 10000000 ? 0 : 1)}m`;
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    return String(Math.round(n));
  };

  const axisLabels = [
    { value: maxValue, y: top + 7 },
    { value: maxValue / 2, y: top + chartH / 2 + 3 },
    { value: 0, y: baseline - 2 }
  ].map(item => (
    `<text class="txn-cashflow-axis-label" x="2" y="${item.y.toFixed(1)}">${compactNumber(item.value)}</text>`
  )).join('');

  const bars = visibleDays.map((day, idx) => {
    const slotX = leftPad + idx * step;
    const incomingH = Math.max(0, (byDay[day].incoming / maxValue) * chartH);
    const outgoingH = Math.max(0, (byDay[day].outgoing / maxValue) * chartH);
    const backIsIncoming = incomingH <= outgoingH;
    const d = new Date(day + 'T00:00:00');
    const label = String(d.getDate()).padStart(2, '0');

    const incomingRect = `<rect class="txn-cashflow-bar-in" x="${(slotX + step * 0.18).toFixed(1)}" y="${(baseline - incomingH).toFixed(1)}" width="${backBarW.toFixed(1)}" height="${incomingH.toFixed(1)}" rx="3" />`;
    const outgoingRect = `<rect class="txn-cashflow-bar-out" x="${(slotX + step * 0.34).toFixed(1)}" y="${(baseline - outgoingH).toFixed(1)}" width="${frontBarW.toFixed(1)}" height="${outgoingH.toFixed(1)}" rx="3" />`;
    const barMarkup = backIsIncoming
      ? `${incomingRect}${outgoingRect}`
      : `${outgoingRect}${incomingRect}`;

    return `
      ${barMarkup}
      ${visibleDays.length <= 10 || idx % 2 === 0 ? `<text class="txn-cashflow-label" x="${(slotX + step / 2).toFixed(1)}" y="${height - 5}" text-anchor="middle">${label}</text>` : ''}
    `;
  }).join('');

  return `
    <div class="txn-cashflow-card">
      ${head}
      <svg class="txn-cashflow-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-label="${t('dailyCashflow')}">
        <line class="txn-cashflow-grid" x1="${leftPad}" y1="${baseline}" x2="${width}" y2="${baseline}" />
        <line class="txn-cashflow-grid" x1="${leftPad}" y1="${top + chartH / 2}" x2="${width}" y2="${top + chartH / 2}" />
        ${axisLabels}
        ${bars}
      </svg>
    </div>
  `;
}

function renderTransactionTotals(txns) {
  const totals = buildTransactionTotals(txns);
  const direction = activeDirection || 'all';

  const rows = [];

  if (direction === 'incoming') {
    rows.push(`
      <div class="txn-total-row">
        <div class="txn-total-label">${t('totalIncoming')}</div>
        <div class="txn-total-values">${renderTotalsValueLines(totals.incoming, 'income')}</div>
      </div>
    `);
  } else if (direction === 'outgoing') {
    rows.push(`
      <div class="txn-total-row">
        <div class="txn-total-label">${t('totalOutgoing')}</div>
        <div class="txn-total-values">${renderTotalsValueLines(totals.outgoing, 'expense')}</div>
      </div>
    `);
  } else {
    rows.push(`
      <div class="txn-total-row">
        <div class="txn-total-label">${t('totalIncoming')}</div>
        <div class="txn-total-values">${renderTotalsValueLines(totals.incoming, 'income')}</div>
      </div>
    `);

    rows.push(`
      <div class="txn-total-row">
        <div class="txn-total-label">${t('totalOutgoing')}</div>
        <div class="txn-total-values">${renderTotalsValueLines(totals.outgoing, 'expense')}</div>
      </div>
    `);

    rows.push(`
      <div class="txn-total-row">
        <div class="txn-total-label">${t('totalNet')}</div>
        <div class="txn-total-values">${renderTotalsValueLines(totals.net, 'neutral')}</div>
      </div>
    `);
  }

  return `
    <div class="txn-totals-card ${direction !== 'all' ? 'filtered-direction' : ''}">
      <div class="txn-totals-head">
        <div class="txn-totals-title">${t('transactionTotals')}</div>
        <div class="txn-totals-count">${t('filteredTransactions')}: ${totals.count}</div>
      </div>
      <div class="txn-totals-grid">
        ${rows.join('')}
      </div>
      <div class="txn-totals-hint">${t('totalsHint')}</div>
    </div>
  `;
}


function resetTxnVisibleLimit() {
  txnVisibleLimit = TXN_PAGE_SIZE;
}

function showMoreTransactions() {
  txnVisibleLimit += TXN_PAGE_SIZE;
  updateTxnPage();
}

function renderTransactionPagingInfo(visibleCount, totalCount) {
  if (totalCount === 0) return '';

  return `
    <div class="txn-list-counter">
      <span>${t('showingTransactions')} <strong>${visibleCount}</strong> ${t('ofTransactions')} ${totalCount}</span>
      <span>${t('transactionsCountLabel')}</span>
    </div>
    ${totalCount > TXN_PAGE_SIZE ? `<div class="txn-render-note">${t('renderedForSpeed')}</div>` : ''}
  `;
}

function renderShowMoreTransactionsButton(visibleCount, totalCount) {
  if (visibleCount >= totalCount) return '';

  const remaining = totalCount - visibleCount;
  const nextCount = Math.min(TXN_PAGE_SIZE, remaining);

  return `
    <div class="txn-show-more-wrap">
      <button class="txn-show-more-btn" onclick="showMoreTransactions()">${t('showMore')} +${nextCount}</button>
    </div>
  `;
}


function hasActiveTransactionDateRange() {
  return !!(activeDateFrom || activeDateTo);
}

function hasActiveTransactionMonthFilter() {
  return !!String(activeMonthFilter || '').trim();
}

function isCurrentTransactionMonth(tx) {
  return normalizeMonthStr(tx?.month || '') === normalizeMonthStr(getAktuálneMonth());
}

function filterTransactionsByHistoryScope(txns) {
  if (hasActiveTransactionDateRange() || hasActiveTransactionMonthFilter()) return txns;
  if (activeTxnHistoryScope === 'all') return txns;
  return txns.filter(isCurrentTransactionMonth);
}

function loadOlderTransactions() {
  activeTxnHistoryScope = 'all';
  resetTxnVisibleLimit();
  updateTxnPage();
}

function renderTransactionHistoryNote() {
  if (activeRecurringGroupFilter && typeof renderRecurringGroupFilterNote === 'function') {
    return renderRecurringGroupFilterNote();
  }
  if (hasActiveTransactionDateRange() || hasActiveTransactionMonthFilter()) {
    return `<div class="txn-history-note">${t('dateRangeOverridesMonth')}</div>`;
  }

  if (activeTxnHistoryScope === 'all') {
    return `<div class="txn-history-note">${t('olderDataLoaded')}</div>`;
  }

  return `<div class="txn-history-note">${t('currentMonthOnly')} ${t('olderDataHint')}</div>`;
}

function renderLoadOlderTransactionsButton(olderCount) {
  if (hasActiveTransactionDateRange() || hasActiveTransactionMonthFilter()) return '';
  if (activeTxnHistoryScope === 'all') return '';
  if (!olderCount) return '';

  return `
    <div class="txn-load-older-wrap">
      <button class="txn-load-older-btn" onclick="loadOlderTransactions()">${t('loadOlderData')} (${olderCount})</button>
    </div>
  `;
}

function toggleTransactionFilterPanel() {
  txnFilterPanelOpen = !txnFilterPanelOpen;
  if (txnFilterPanelOpen) openSheet('txn-filter-sheet');
  else closeBottomSheets();
  updateTransactionFilterPanelUi();
}

function collapseTransactionFilterPanel() {
  txnFilterPanelOpen = false;
  closeBottomSheets();
  updateTransactionFilterPanelUi();
}

function updateTransactionFilterPanelUi() {
  const sheet = document.getElementById('txn-filter-sheet');
  const isOpen = !!(sheet && sheet.classList.contains('open'));
  txnFilterPanelOpen = isOpen;
  const toggle = document.getElementById('txn-filter-toggle');
  if (toggle) toggle.classList.toggle('active', isOpen);
  updateTransactionFilterSummary();
}

function getBankFilterLabel(bankKey) {
  if (!bankKey || bankKey === 'všetky') return t('all');
  return getBankInfo(bankKey)?.label || bankKey;
}

function getPaymentKindFilterLabel(kind) {
  if (kind === 'card') return t('cardsOnly');
  if (kind === 'account') return t('accountsOnly');
  if (kind === 'cash') return t('cashOnly');
  if (kind === 'internal') return t('internalTransfers');
  return t('all');
}

function parseWidgetMultiSelectValue(value) {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  const raw = String(value).trim();
  if (!raw || raw === 'all') return [];
  return raw.split(/[,;|]+/).map(v => v.trim()).filter(Boolean);
}

function serializeWidgetMultiSelectValue(values) {
  const list = Array.isArray(values) ? values : parseWidgetMultiSelectValue(values);
  const unique = [...new Set(list.filter(Boolean))];
  return unique.length ? unique.join(',') : 'all';
}

function hasWidgetMultiFilter(value) {
  return parseWidgetMultiSelectValue(value).length > 0;
}

function getWidgetPaymentKindSummaryLabel(paymentKindValue) {
  const kinds = parseWidgetMultiSelectValue(paymentKindValue);
  if (!kinds.length) return '';
  return kinds.map(kind => getPaymentKindFilterLabel(kind === 'account' ? 'account' : kind)).join(', ');
}

function getWidgetAccountSummaryLabel(accountValue) {
  const accounts = parseWidgetMultiSelectValue(accountValue);
  if (!accounts.length) return '';
  return accounts.map(id => plainBankName(id) || id).join(', ');
}

function widgetPaymentKindMatches(tx, paymentKindValue) {
  const kinds = parseWidgetMultiSelectValue(paymentKindValue);
  if (!kinds.length) return true;
  return kinds.some(kind => {
    if (kind === 'card') return isCardTransaction(tx);
    if (kind === 'account') return isAccountTransaction(tx) && !isInternalTransferForFiltering(tx);
    if (kind === 'cash') return isCashTransaction(tx);
    if (kind === 'internal') return isInternalTransferForFiltering(tx);
    return false;
  });
}

function widgetAccountMatches(tx, accountValue) {
  const accounts = parseWidgetMultiSelectValue(accountValue);
  if (!accounts.length) return true;
  let bankKey = '';
  try { bankKey = getBudgetBankKeyFromTransaction(tx); } catch (_) {}
  if (!bankKey) {
    try { bankKey = getBankKey(tx); } catch (_) {}
  }
  return accounts.some(id => id === bankKey || id === tx?.bankId || id === tx?.bank);
}

function getCustomWidgetPaymentKindSelection() {
  return [...document.querySelectorAll('#cw-payment-kind-grid .custom-widget-choice.active')]
    .map(btn => String(btn.dataset.value || '').trim())
    .filter(Boolean);
}

function setCustomWidgetPaymentKindSelection(value) {
  const kinds = parseWidgetMultiSelectValue(value);
  document.querySelectorAll('#cw-payment-kind-grid .custom-widget-choice').forEach(btn => {
    btn.classList.toggle('active', kinds.length ? kinds.includes(btn.dataset.value) : false);
  });
  const hidden = document.getElementById('cw-payment-kind');
  if (hidden) hidden.value = serializeWidgetMultiSelectValue(kinds);
}

function toggleCustomWidgetPaymentKind(kind) {
  const btn = document.querySelector(`#cw-payment-kind-grid .custom-widget-choice[data-value="${kind}"]`);
  if (!btn) return;
  btn.classList.toggle('active');
  const hidden = document.getElementById('cw-payment-kind');
  if (hidden) hidden.value = serializeWidgetMultiSelectValue(getCustomWidgetPaymentKindSelection());
  if (typeof updateCustomWidgetBuilderPreview === 'function') updateCustomWidgetBuilderPreview();
}

function getCustomWidgetAccountSelection() {
  return [...document.querySelectorAll('#cw-account-grid .custom-widget-choice.active')]
    .map(btn => String(btn.dataset.value || '').trim())
    .filter(Boolean);
}

function setCustomWidgetAccountSelection(value) {
  const ids = parseWidgetMultiSelectValue(value);
  document.querySelectorAll('#cw-account-grid .custom-widget-choice').forEach(btn => {
    btn.classList.toggle('active', ids.length ? ids.includes(btn.dataset.value) : false);
  });
  const hidden = document.getElementById('cw-account');
  if (hidden) hidden.value = serializeWidgetMultiSelectValue(ids);
}

function toggleCustomWidgetAccount(bankId) {
  const btn = document.querySelector(`#cw-account-grid .custom-widget-choice[data-value="${bankId}"]`);
  if (!btn) return;
  btn.classList.toggle('active');
  const hidden = document.getElementById('cw-account');
  if (hidden) hidden.value = serializeWidgetMultiSelectValue(getCustomWidgetAccountSelection());
  if (typeof updateCustomWidgetBuilderPreview === 'function') updateCustomWidgetBuilderPreview();
}

function getCustomWidgetAccountStorageValue() {
  const hidden = document.getElementById('cw-account');
  if (hidden && hidden.value) return hidden.value;
  return serializeWidgetMultiSelectValue(getCustomWidgetAccountSelection());
}

function getCustomWidgetPaymentKindStorageValue() {
  const hidden = document.getElementById('cw-payment-kind');
  if (hidden && hidden.value) return hidden.value;
  return serializeWidgetMultiSelectValue(getCustomWidgetPaymentKindSelection());
}

function getDirectionFilterLabel(direction) {
  if (direction === 'incoming') return t('incoming');
  if (direction === 'outgoing') return t('outgoing');
  return t('all');
}

function updateTransactionFilterSummary() {
  const wrap = document.getElementById('txn-filter-summary');
  if (!wrap) return;
  // v291: keep header clean - summary chips are intentionally hidden.
  wrap.innerHTML = '';
  wrap.style.display = 'none';
  return;
  const chips = [];
  if (activeDateFrom || activeDateTo) chips.push(activeDateFrom && activeDateTo ? `${activeDateFrom}–${activeDateTo}` : (activeDateFrom || activeDateTo));
  if (activeDirection && activeDirection !== 'all') chips.push(getDirectionFilterLabel(activeDirection));
  if (activePaymentKind && activePaymentKind !== 'all') chips.push(getPaymentKindFilterLabel(activePaymentKind));
  if (activeCardLast4) chips.push(getCardSourceLabelByLast4(activeCardLast4) || activeCardLast4);
  if (activeTxnTag && activeTxnTag !== 'all') chips.push(txnTagKeyToLabel[activeTxnTag] || 'Tag');
  if (activeCategory && activeCategory !== 'všetky') chips.push(translateCategory(activeCategory));
  wrap.innerHTML = chips.slice(0, 4).map(label => `<span class="txn-filter-summary-chip">${escapeHtml(label)}</span>`).join('');
}

function getTxnDayDisplay(tx) {
  const parsed = parseCustomDateStr(tx?.rawDate || tx?.date);
  if (!parsed || isNaN(parsed.getTime())) {
    const fallback = (tx?.date || '').split(' ')[0] || '';
    return fallback.replace(/^0?(\d{1,2})\.0?(\d{1,2})\.(\d{4})$/, '$1.$2.$3');
  }
  return `${parsed.getDate()}.${parsed.getMonth() + 1}.${parsed.getFullYear()}`;
}

function getTxnTimeDisplay(tx) {
  const parsed = parseCustomDateStr(tx?.rawDate || tx?.date);
  if (!parsed || isNaN(parsed.getTime())) {
    const parts = String(tx?.date || '').split(' ');
    return parts[1] || '';
  }
  return `${String(parsed.getHours()).padStart(2,'0')}:${String(parsed.getMinutes()).padStart(2,'0')}`;
}

function getCardSourceLabelByLast4(last4) {
  const value = String(last4 || '').replace(/\D/g, '').slice(-4);
  return value || '';
}

function getPaymentSourceMasked(tx) {
  const raw = String(tx?.card || '').trim();
  if (!raw) return '';
  if (/cash/i.test(raw)) return raw;
  const accountMatch = raw.match(/(\d{1,10})\s*\/\s*(\d{4})/);
  if (accountMatch) return `${accountMatch[1]}/${accountMatch[2]}`;
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 4) return digits.slice(-4);
  return raw.replace(/^Karta\s*/i, '').replace(/^Card\s*/i, '').replace(/^Účet\s*/i, '').replace(/^Ucet\s*/i, '').trim() || raw;
}

function transactionMatchesCardLast4(tx, last4) {
  const target = String(last4 || '').replace(/\D/g, '').slice(-4);
  if (!target) return true;
  const cardText = String(tx?.card || '').toLowerCase();
  const typeText = String(tx?.type || '').toLowerCase();
  const merchantText = String(tx?.merchant || '').toLowerCase();
  const bankText = String(tx?.bank || tx?.banka || '').toLowerCase();
  const digits = cardText.replace(/\D/g, '');
  if (digits.endsWith(target) || cardText.includes(target)) return true;
  const creditCard = getCsobCzCreditCardLast4();
  if (creditCard && target === creditCard) {
    const combined = `${cardText} ${typeText} ${merchantText} ${bankText}`;
    return combined.includes('csob cz credit card') || combined.includes('splátka kredit') || combined.includes('splatka kredit') || combined.includes('kreditní kart') || combined.includes('kreditni kart');
  }
  return false;
}

function togglePaymentSourceDetail(el) {
  if (!el) return;
  const label = el.getAttribute('data-label') || el.textContent || '';
  const source = el.getAttribute('data-source') || '';
  const opened = el.classList.toggle('opened');
  el.textContent = opened && source ? `${label} ${source}` : label;
}

/* v4400: is this an account transfer (vs a card payment)? */
function txIsAccountTransferV4400(tx) {
  const k = String(tx && tx.paymentKind || '').toLowerCase();
  if (k === 'account' || k === 'transfer') return true;
  if (k === 'card') return false;
  const ty = String(tx && tx.type || '').toLowerCase();
  return /odchod\s*z|příjem\s*na|prijem\s*na|úhrada|uhrada|převod|prevod|transfer|trval|inkas|sepa/.test(ty);
}

function getTransactionCounterpartyAccountV4400(tx) {
  return String(
    (tx && (tx.counterpartyAccount || tx.counterpartyIban || tx.otherAccount
      || tx.beneficiaryAccount || tx.recipientAccount || tx.senderAccount
      || tx.toAccount || tx.fromAccount)) || ''
  ).trim().replace(/\s+/g, '');
}

/* The account shown under a transfer: recipient account for an outgoing
   payment, sender account for an incoming one. Returns { text, source } where
   `source` is the arrow-prefixed account for the toggled detail, or null when
   there is no counterparty account (falls back to the own payment source). */
function getTransactionTransferAccountDisplayV4400(tx) {
  if (!tx || !txIsAccountTransferV4400(tx)) return null;
  const acct = getTransactionCounterpartyAccountV4400(tx);
  if (!acct) return null;
  const incoming = Number(tx.amount) > 0;
  return { source: (incoming ? '← ' : '→ ') + acct, account: acct, incoming };
}

function matchesActiveBankFilter(tx, bankKey) {
  if (!bankKey || bankKey === 'všetky') return true;
  const key = typeof getArchiveBankKeyFromTransaction === 'function'
    ? getArchiveBankKeyFromTransaction(tx)
    : getBankKey(tx);
  if (bankKey === 'csob_cz') return key === 'csob_cz' || key === 'csob_cz_credit';
  if (key === bankKey) return true;
  try {
    const hay = [tx?.card, tx?.account, tx?.paymentSource, tx?.source, tx?.bank, tx?.type, tx?.merchant]
      .map(v => String(v || '').toLowerCase())
      .join(' ');
    const identifiers = [
      getStoredSystemBankAccount(bankKey),
      ...(getStoredSystemBankCards(bankKey, { includeCreditChild: false }) || [])
    ].map(v => String(v || '').trim()).filter(Boolean);
    return identifiers.some(raw => {
      const lower = raw.toLowerCase();
      const digits = raw.replace(/\D/g, '');
      if (lower && hay.includes(lower)) return true;
      if (/\/\s*\d{4}/.test(raw)) {
        const accountDigits = String(raw).split('/')[0].replace(/\D/g, '');
        return !!accountDigits && hay.includes(accountDigits);
      }
      return digits.length >= 4 && hay.includes(digits.slice(-4));
    });
  } catch (_) {
    return false;
  }
}

function makeCreditCardRepaymentDisplayTx(tx) {
  const creditCard = getCsobCzCreditCardLast4();
  if (!activeCardLast4 || !creditCard || String(activeCardLast4) !== creditCard) return tx;
  if (!transactionMatchesCardLast4(tx, creditCard) || !isCsobCzCreditCardRepaymentTx(tx)) return tx;
  const amount = Math.abs(Number(tx.amount || 0));
  return {
    ...tx,
    id: String(tx.id || tx.msgId || '') + '_credit_card_view',
    msgId: String(tx.msgId || tx.id || '') + '_credit_card_view',
    amount: amount,
    card: `${getLanguage() === 'en' ? 'Card' : 'Karta'} ${creditCard}`,
    paymentKind: 'card',
    type: 'credit card repayment to card',
    bank: 'ČSOB CZ credit card',
    bankId: 'csob_cz_credit'
  };
}

function prepareTransactionsForCurrentView(txns) {
  const creditCard = getCsobCzCreditCardLast4();
  if (activeBank === 'csob_cz' && creditCard && String(activeCardLast4 || '') === creditCard) {
    return (txns || []).map(makeCreditCardRepaymentDisplayTx);
  }
  return txns || [];
}

function normalizeTransactionDedupeDateKey(tx) {
  const raw = tx?.rawDate || tx?.date || '';
  const parsed = parseCustomDateStr(raw);
  if (parsed && !isNaN(parsed.getTime())) {
    return [
      parsed.getFullYear(),
      String(parsed.getMonth() + 1).padStart(2, '0'),
      String(parsed.getDate()).padStart(2, '0'),
      String(parsed.getHours()).padStart(2, '0'),
      String(parsed.getMinutes()).padStart(2, '0')
    ].join('-');
  }
  return String(raw || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeTransactionDedupeTextKey(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTransactionViewSemanticKey(tx, forceCardLast4) {
  const cardKey = String(forceCardLast4 || getPaymentSourceMasked(tx) || '').replace(/\D/g, '').slice(-4);
  const normalizedBank = getBankKey(tx) === 'csob_cz_credit' ? 'csob_cz' : getBankKey(tx);
  return [
    normalizeMonthStr(tx?.month || ''),
    normalizeTransactionDedupeDateKey(tx),
    normalizeTransactionDedupeTextKey(tx?.merchant || tx?.merchantRaw || ''),
    Math.abs(Number(tx?.amount || 0)).toFixed(2),
    currencyCode(tx?.currency || ''),
    normalizedBank,
    cardKey || getPaymentSourceMasked(tx)
  ].join('|');
}

function getTransactionViewDedupeKey(tx) {
  // In the ČSOB CZ card 9344 view the same credit-card repayment can enter the UI
  // through two representations: account-side row and credit-card-side display row.
  // Do not use msgId first here, because those two rows may have different IDs.
  const creditCard = getCsobCzCreditCardLast4();
  if (activeBank === 'csob_cz' && creditCard && String(activeCardLast4 || '') === creditCard) {
    return 'csob_credit:' + getTransactionViewSemanticKey(tx, creditCard);
  }

  const rawId = String(tx?.msgId || tx?.id || '').replace(/_credit_card_view$/, '').trim();
  if (rawId) return 'id:' + rawId;
  return 'semantic:' + getTransactionViewSemanticKey(tx);
}