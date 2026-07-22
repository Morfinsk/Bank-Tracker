// Generated app-core slice 12/34 (declarations).

function createCreditCardLimitProgress(used, limit, available, currency) {
  const usedNum = Math.max(0, Number(used || 0) || 0);
  const limitNum = Math.max(0, Number(limit || 0) || 0);
  const availableNum = Math.max(0, Number(available || 0) || 0);
  const ratio = limitNum > 0 ? Math.min(1, usedNum / limitNum) : 0;
  const width = Math.round(ratio * 100);
  const isCompleted = limitNum > 0 && usedNum >= limitNum;
  const isEmpty = usedNum <= 0 || limitNum <= 0;
  const pairText = formatOverviewCompactCurrencyPair(usedNum, limitNum, currency);
  const usedText = formatOverviewCompactCurrency(usedNum, currency);
  const limitText = formatOverviewCompactCurrency(limitNum, currency);
  const fillClass = isCompleted ? 'is-ok' : (isEmpty ? 'is-empty' : '');
  const fillWidth = Math.max(width, !isEmpty ? 3 : 0);
  return `
    <div class="wealth-credit-progress-summary">
      <span class="wealth-credit-progress-pair">${escapeHtml(pairText)}</span>
    </div>
    <div class="wealth-credit-progress-track" title="${escapeAttr(`${usedText} / ${limitText}`)}">
      <div class="wealth-credit-progress-used wealth-anim-fill ${escapeAttr(fillClass)}" style="width:${fillWidth}%;"></div>
    </div>`;
}

function formatOverviewCompactCurrency(value, currency) {
  const symbol = currencySymbol(currency || getAppCurrency());
  const n = Math.abs(Number(value || 0));
  const sign = Number(value || 0) < 0 ? '-' : '';
  let out;
  if (n >= 1000000) out = (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace('.', ',') + 'M';
  else if (n >= 1000) out = Math.round(n / 1000).toLocaleString('cs-CZ') + 'k';
  else out = Math.round(n).toLocaleString('cs-CZ');
  return `${sign}${out} ${symbol}`;
}

function formatOverviewCompactNumber(value) {
  const n = Math.abs(Number(value || 0));
  const sign = Number(value || 0) < 0 ? '-' : '';
  if (n >= 1000000) return sign + (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace('.', ',') + 'M';
  if (n >= 1000) return sign + Math.round(n / 1000).toLocaleString('cs-CZ') + 'k';
  return sign + Math.round(n).toLocaleString('cs-CZ');
}

function formatOverviewCompactCurrencyPair(leftValue, rightValue, currency) {
  return `${formatOverviewCompactNumber(leftValue)} / ${formatOverviewCompactNumber(rightValue)} ${currencySymbol(currency || getAppCurrency())}`;
}

function getCreditCardMonthlyUsedAmount(appCurrency) {
  const month = normalizeMonthStr(getAktuálneMonth());
  const target = appCurrency || getAppCurrency();
  const last4 = typeof getCsobCzCreditCardLast4 === 'function' ? getCsobCzCreditCardLast4() : '';
  const creditTxns = (allTransactions || []).filter(tx => {
    if (normalizeMonthStr(tx.month) !== month) return false;
    if (Number(tx.amount || 0) >= 0) return false;
    if (!isCardTransaction(tx)) return false;
    const bankKey = getBankKey(tx);
    if (bankKey === 'csob_cz_credit') return true;
    const text = [tx.bank, tx.card, tx.type, tx.category, tx.merchant, tx.merchantRaw, tx.paymentKind].join(' ').toLowerCase();
    if (last4 && text.includes(String(last4).toLowerCase())) return true;
    return bankKey === 'csob_cz' && (text.includes('credit') || text.includes('kredit'));
  });
  return creditTxns.reduce((sum, tx) => sum + Math.abs(convertTransactionAmount(tx, target)), 0);
}

function createWealthTrendSvg() {
  return `
    <svg viewBox="0 0 180 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="wealthLineGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00E5A0"></stop>
          <stop offset="100%" stop-color="#56b6ff"></stop>
        </linearGradient>
        <linearGradient id="wealthAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(114,246,165,.45)"></stop>
          <stop offset="100%" stop-color="rgba(86,182,255,.06)"></stop>
        </linearGradient>
      </defs>
      <path d="M8 56 C22 50, 34 46, 44 32 S72 8, 89 12 S121 30, 137 26 S160 16, 172 12 L172 64 L8 64 Z" fill="url(#wealthAreaGradient)"></path>
      <path d="M8 56 C22 50, 34 46, 44 32 S72 8, 89 12 S121 30, 137 26 S160 16, 172 12" fill="none" stroke="url(#wealthLineGradient)" stroke-width="4" stroke-linecap="round"></path>
    </svg>`;
}

function createSmoothSvgPath(points) {
  const safePoints = (points || []).filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!safePoints.length) return '';
  if (safePoints.length === 1) return `M${safePoints[0].x.toFixed(2)} ${safePoints[0].y.toFixed(2)}`;

  let d = `M${safePoints[0].x.toFixed(2)} ${safePoints[0].y.toFixed(2)}`;
  for (let i = 0; i < safePoints.length - 1; i += 1) {
    const p0 = safePoints[Math.max(0, i - 1)];
    const p1 = safePoints[i];
    const p2 = safePoints[i + 1];
    const p3 = safePoints[Math.min(safePoints.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;
    const yMin = Math.min(p1.y, p2.y);
    const yMax = Math.max(p1.y, p2.y);
    cp1y = Math.max(yMin, Math.min(yMax, cp1y));
    cp2y = Math.max(yMin, Math.min(yMax, cp2y));
    d += ` C${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}


function createLinearSvgPath(points) {
  const safePoints = (points || []).filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!safePoints.length) return '';
  if (safePoints.length === 1) return `M${safePoints[0].x.toFixed(2)} ${safePoints[0].y.toFixed(2)}`;
  let d = `M${safePoints[0].x.toFixed(2)} ${safePoints[0].y.toFixed(2)}`;
  for (let i = 1; i < safePoints.length; i += 1) {
    d += ` L${safePoints[i].x.toFixed(2)} ${safePoints[i].y.toFixed(2)}`;
  }
  return d;
}


function createBudgetWavySvgPath(points, amplitude = 2.1) {
  const safePoints = (points || []).filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!safePoints.length) return '';
  if (safePoints.length === 1) return `M${safePoints[0].x.toFixed(2)} ${safePoints[0].y.toFixed(2)}`;

  const clampY = value => Math.max(3, Math.min(61, Number(value || 0)));
  const waveStrength = Math.max(0.18, Number(amplitude || 0) * 0.32);
  let d = `M${safePoints[0].x.toFixed(2)} ${safePoints[0].y.toFixed(2)}`;

  for (let i = 0; i < safePoints.length - 1; i += 1) {
    const p0 = safePoints[Math.max(0, i - 1)];
    const p1 = safePoints[i];
    const p2 = safePoints[i + 1];
    const p3 = safePoints[Math.min(safePoints.length - 1, i + 2)];

    const segDx = p2.x - p1.x;
    const segDy = p2.y - p1.y;
    const segLen = Math.max(1, Math.hypot(segDx, segDy));
    const sign = i % 2 === 0 ? -1 : 1;
    const gentleWave = sign * Math.min(waveStrength, Math.max(0.12, segLen * 0.02));

    const baseCp1x = p1.x + (p2.x - p0.x) / 6;
    const baseCp1y = p1.y + (p2.y - p0.y) / 6;
    const baseCp2x = p2.x - (p3.x - p1.x) / 6;
    const baseCp2y = p2.y - (p3.y - p1.y) / 6;

    const cp1x = p1.x + ((baseCp1x - p1.x) * 0.92);
    const cp2x = p2.x + ((baseCp2x - p2.x) * 0.92);
    const cp1y = clampY(baseCp1y + gentleWave);
    const cp2y = clampY(baseCp2y - gentleWave);

    d += ` C${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}

function createOverviewBudgetSparkline(used = 0, limit = 0, currency, txSeries = []) {
  const usedNum = Math.max(0, Number(used || 0) || 0);
  const limitNum = Math.max(0, Number(limit || 0) || 0);
  const series = Array.isArray(txSeries) ? txSeries.filter(p => p && Number.isFinite(Number(p.value))) : [];
  const normalizedMonth = normalizeMonthStr(getAktuálneMonth());
  const [monthNum, yearNum] = normalizedMonth.split('/').map(Number);
  const monthStart = new Date(yearNum, monthNum - 1, 1, 0, 0, 0, 0).getTime();
  const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59, 999).getTime();
  const today = new Date();
  const todayInSelectedMonth = today.getFullYear() === yearNum && (today.getMonth() + 1) === monthNum;
  const nowInMonth = todayInSelectedMonth ? Math.min(Math.max(today.getTime(), monthStart), monthEnd) : monthEnd;

  const startX = 7;
  const startY = 61;
  const endX = 107;
  const endY = 5;
  const width = endX - startX;
  const height = startY - endY;
  const finalSpent = series.length ? Math.max(usedNum, Number(series[series.length - 1].value || 0) || 0) : usedNum;

  const dayMs = 24 * 60 * 60 * 1000;
  const remainingDaysRaw = Math.max(0, Math.ceil((monthEnd - nowInMonth) / dayMs));
  const projectedDailyStepValue = Math.max(0, Number(convertAmountCurrency(2000, 'CZK', currency || getAppCurrency())) || 2000);
  const projectionCycles = Math.max(0, Math.ceil(remainingDaysRaw / 7));
  const projectedFinalValue = Math.max(finalSpent, finalSpent + (projectedDailyStepValue * 3 * projectionCycles));
  const maxValue = Math.max(limitNum, finalSpent, projectedFinalValue, 1) * 1.04;

  let rawSpentPoints = [{ timestamp: monthStart, value: 0 }];
  if (series.length) {
    rawSpentPoints = rawSpentPoints.concat(series.map(point => ({
      timestamp: Math.min(Math.max(Number(point.timestamp || monthStart), monthStart), monthEnd),
      value: Math.max(0, Number(point.value || 0) || 0)
    })));
  } else {
    rawSpentPoints.push({ timestamp: nowInMonth, value: finalSpent });
  }

  rawSpentPoints.sort((a, b) => a.timestamp - b.timestamp);
  const deduped = [];
  rawSpentPoints.forEach(point => {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.timestamp - point.timestamp) < 60000) {
      last.value = Math.max(last.value, point.value);
      return;
    }
    deduped.push(point);
  });

  const spentPoints = deduped.map(point => {
    const x = startX + ((point.timestamp - monthStart) / Math.max(1, monthEnd - monthStart)) * width;
    const y = startY - (point.value / maxValue) * height;
    return { x, y, value: point.value, timestamp: point.timestamp };
  });
  const monthHasEnded = !todayInSelectedMonth && today.getTime() > monthEnd;
  if (monthHasEnded) {
    const finalY = startY - (usedNum / maxValue) * height;
    const last = spentPoints[spentPoints.length - 1];
    if (!last || last.x < endX - 0.5) {
      spentPoints.push({ x: endX, y: finalY, value: usedNum, timestamp: monthEnd });
    } else {
      last.x = endX;
      last.y = finalY;
      last.value = usedNum;
      last.timestamp = monthEnd;
    }
  } else {
    const nowX = startX + ((nowInMonth - monthStart) / Math.max(1, monthEnd - monthStart)) * width;
    const last = spentPoints[spentPoints.length - 1];
    if (last && nowX > last.x + 0.5) {
      const flatY = startY - (usedNum / maxValue) * height;
      spentPoints.push({ x: nowX, y: flatY, value: usedNum, timestamp: nowInMonth });
    }
  }
  let currentPoint = spentPoints[spentPoints.length - 1] || { x: startX, y: startY, value: 0, timestamp: monthStart };
  if (spentPoints.length) {
    const last = spentPoints[spentPoints.length - 1];
    last.value = usedNum;
    last.y = startY - (usedNum / maxValue) * height;
    currentPoint = last;
  }

  let spentLinePath = '';
  let flatTailIdx = -1;
  if (spentPoints.length >= 2) {
    const lastPt = spentPoints[spentPoints.length - 1];
    const prevPt = spentPoints[spentPoints.length - 2];
    if (Math.abs(lastPt.value - prevPt.value) < 0.01 && lastPt.x > prevPt.x + 0.5) {
      flatTailIdx = spentPoints.length - 1;
    }
  }
  if (flatTailIdx > 0) {
    const mainPts = spentPoints.slice(0, flatTailIdx);
    const anchor = mainPts[mainPts.length - 1] || spentPoints[0];
    const tail = spentPoints[flatTailIdx];
    spentLinePath = createLinearSvgPath(mainPts);
    if (spentLinePath) {
      spentLinePath += ` L${anchor.x.toFixed(2)} ${anchor.y.toFixed(2)} L${tail.x.toFixed(2)} ${tail.y.toFixed(2)}`;
    } else {
      spentLinePath = `M${tail.x.toFixed(2)} ${tail.y.toFixed(2)}`;
    }
  } else {
    spentLinePath = createLinearSvgPath(spentPoints);
  }
  let hasFlatTail = flatTailIdx > 0;
  if (monthHasEnded && spentPoints.length >= 1) {
    let mainPts = spentPoints.slice();
    const tail = mainPts[mainPts.length - 1];
    if (tail && tail.x >= endX - 0.5) mainPts = mainPts.slice(0, -1);
    const anchor = mainPts[mainPts.length - 1] || { x: startX, y: startY };
    spentLinePath = createLinearSvgPath(mainPts);
    if (spentLinePath) {
      spentLinePath += ` L${anchor.x.toFixed(2)} ${anchor.y.toFixed(2)} L${endX.toFixed(2)} ${anchor.y.toFixed(2)}`;
      hasFlatTail = true;
    }
  }
  if (spentLinePath && currentPoint && !hasFlatTail) {
    spentLinePath += ` L${currentPoint.x.toFixed(2)} ${currentPoint.y.toFixed(2)}`;
  }
  const spentAreaPath = spentLinePath
    ? `${spentLinePath} L${currentPoint.x.toFixed(2)} ${startY} L${startX} ${startY} Z`
    : '';

  const valueToY = value => startY - (Math.max(0, Number(value || 0) || 0) / maxValue) * height;
  let remainingLinePath = '';
  let remainingAreaPath = '';
  if (!monthHasEnded && currentPoint && monthEnd > currentPoint.timestamp + 60000) {
    const projValue = Math.min(projectedFinalValue, maxValue * 0.98);
    const projY = valueToY(projValue);
    remainingLinePath = `M${currentPoint.x.toFixed(2)} ${currentPoint.y.toFixed(2)} L${endX} ${projY.toFixed(2)}`;
    remainingAreaPath = `${remainingLinePath} L${endX} ${startY} L${currentPoint.x.toFixed(2)} ${startY} Z`;
  }

  return `
    <div class="wealth-budget-sparkline" aria-label="Bank budget ${escapeAttr(formatOverviewCompactCurrencyPair(usedNum, limitNum, currency))}">
      <div class="wealth-budget-sparkline-label">${escapeHtml(formatOverviewCompactCurrencyPair(usedNum, limitNum, currency))}</div>
      <svg viewBox="0 0 114 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="budgetUsedAreaV190" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(0,229,160,0.44)"></stop>
            <stop offset="72%" stop-color="rgba(0,229,160,0.07)"></stop>
            <stop offset="100%" stop-color="rgba(0,229,160,0)"></stop>
          </linearGradient>
          <linearGradient id="budgetRemainAreaV190" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,139,253,0.44)"></stop>
            <stop offset="72%" stop-color="rgba(56,139,253,0.07)"></stop>
            <stop offset="100%" stop-color="rgba(56,139,253,0)"></stop>
          </linearGradient>
        </defs>
        ${spentAreaPath ? `<path class="overview-line-area" d="${spentAreaPath}" fill="url(#budgetUsedAreaV190)"></path>` : ''}
        ${remainingAreaPath ? `<path class="overview-line-area is-projection" d="${remainingAreaPath}" fill="url(#budgetRemainAreaV190)"></path>` : ''}
        ${spentLinePath ? `<path class="wealth-spark-line overview-widget-line" d="${spentLinePath}" fill="none" stroke="#00E5A0" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"></path>` : ''}
        ${remainingLinePath ? `<path class="wealth-spark-line overview-widget-line is-projection" d="${remainingLinePath}" fill="none" stroke="#388bfd" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"></path>` : ''}
        <circle class="overview-line-dot" cx="${currentPoint.x.toFixed(2)}" cy="${currentPoint.y.toFixed(2)}" r="1.55" fill="#ffffff" opacity="0.95"></circle>
        <circle class="overview-line-dot" cx="${currentPoint.x.toFixed(2)}" cy="${currentPoint.y.toFixed(2)}" r="0.92" fill="#00E5A0"></circle>
      </svg>
    </div>`;
}
function updateGlobalSyncIndicator(_active) {
  const el = document.getElementById('global-sync-indicator');
  if (!el) return;
  el.classList.remove('show');
  el.hidden = true;
}

function setOverviewBalanceSyncState(active) {
  if (active) beginOverviewBalanceSyncUI();
  else endOverviewBalanceSyncUI();
}

function getOverviewBalanceSyncCards() {
  return Array.from(document.querySelectorAll('.wealth-card-net, .wealth-card-cash'));
}

function beginOverviewBalanceSyncUI() {
  __overviewBalanceSyncDepth++;
  if (__overviewBalanceSyncDepth > 1) return;
  getOverviewBalanceSyncCards().forEach((card) => {
    card.classList.add('is-balance-syncing');
  });
}

function endOverviewBalanceSyncUI() {
  __overviewBalanceSyncDepth = Math.max(0, __overviewBalanceSyncDepth - 1);
  if (__overviewBalanceSyncDepth > 0) return;
  getOverviewBalanceSyncCards().forEach((card) => {
    card.classList.remove('is-balance-syncing');
  });
}

function lockOverviewBalanceDatasets() {
  try {
    const metrics = typeof getOverviewDashboardMetrics === 'function' ? getOverviewDashboardMetrics() : null;
    if (!metrics) return;
    const net = document.getElementById('overview-net-worth');
    const cash = document.getElementById('overview-available-cash');
    if (net && net.dataset.balanceValue == null) {
      net.dataset.balanceValue = String(Number(metrics.totalNetWorth || 0));
    }
    if (cash && cash.dataset.balanceValue == null) {
      cash.dataset.balanceValue = String(Number(metrics.availableCash || 0));
    }
  } catch (_) {}
}

function applyOverviewBalanceEl(el, amount, currency, options = {}) {
  if (!el) return;
  const target = Number(amount || 0);
  const curr = currency || getAppCurrency();
  const animate = !!(options && options.animate);
  const from = Number(el.dataset.balanceValue ?? target);
  el.dataset.balanceValue = String(target);

  const paint = (value) => {
    el.textContent = formatSignedCurrencyAmount(value, curr);
  };

  if (!animate || Math.abs(from - target) < 0.5 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    paint(target);
    return;
  }

  const start = performance.now();
  const duration = 420;
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    paint(from + (target - from) * eased);
    if (t < 1) requestAnimationFrame(step);
    else paint(target);
  };
  requestAnimationFrame(step);
}