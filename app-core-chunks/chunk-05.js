// Generated app-core slice 5/6 (merged).
function getArchiveTrendMonths() {
  const months = new Set();
  (allTransactions || []).forEach(tx => {
    const m = normalizeMonthStr(tx && tx.month);
    if (m) months.add(m);
  });
  try {
    Object.keys(localStorage || {}).forEach(key => {
      const match = String(key || '').match(/^(?:bank|overview)_monthly_(?:spending|income|net)_.+_(\d{2}\/\d{4})$/);
      if (match) months.add(normalizeMonthStr(match[1]));
    });
  } catch (_) {}
  return [...months]
    .filter(Boolean)
    .sort((a, b) => monthSortValue(a) - monthSortValue(b))
    .slice(-8);
}

function getArchiveTrendValueCzk(bankKey, monthStr) {
  const value = Number(getArchiveMonthlyStat(bankKey, monthStr, 'spending', 'CZK') || 0);
  return Number.isFinite(value) ? Math.abs(value) : 0;
}

function buildArchiveTrendMonthlyData(months) {
  const monthly = {};
  months.forEach(month => { monthly[month] = {}; });

  const bankKeys = getDynamicArchiveBankKeys(monthly).filter(bankKey => bankKey !== 'csob_cz_credit');
  bankKeys.forEach(bankKey => {
    months.forEach(month => {
      const value = getArchiveTrendValueCzk(bankKey, month);
      if (value > 0) monthly[month][bankKey] = value;
    });
  });

  // Include any bank keys that exist only in loaded transactions/custom data.
  (allTransactions || []).forEach(tx => {
    const month = normalizeMonthStr(tx && tx.month);
    if (!month || !monthly[month]) return;
    const bankKey = getArchiveBankKeyFromTransaction(tx);
    if (!bankKey || bankKey === 'csob_cz_credit') return;
    if (!bankKeys.includes(bankKey)) bankKeys.push(bankKey);
  });

  bankKeys.forEach(bankKey => {
    months.forEach(month => {
      if (monthly[month][bankKey] === undefined) {
        const value = getArchiveTrendValueCzk(bankKey, month);
        if (value > 0) monthly[month][bankKey] = value;
      }
    });
  });

  return monthly;
}

function getArchiveTrendChartCacheSignature() {
  const months = getArchiveTrendMonths();
  const chartType = archiveTrendChartType === 'bars' ? 'bars' : 'line';
  const txStamp = getLocalCacheTimestamp('cached_txns_updated_at');
  return `${chartType}|${txStamp}|${months.join('|')}`;
}

function renderArchiveTrendChart() {
  const wrap = document.getElementById('archive-trend-chart');
  if (!wrap) return;

  const months = getArchiveTrendMonths();
  if (months.length === 0) {
    wrap.innerHTML = `<div class="empty-state" style="padding:22px 0;">${t('noTrendData')}</div>`;
    archiveTrendChartCache = { signature: getArchiveTrendChartCacheSignature(), html: wrap.innerHTML };
    return;
  }

  const cacheSignature = getArchiveTrendChartCacheSignature();
  if (archiveTrendChartCache.signature === cacheSignature && archiveTrendChartCache.html) {
    wrap.innerHTML = archiveTrendChartCache.html;
    primeArchiveTrendLinesForIntro(wrap);
    const chartType = archiveTrendChartType === 'bars' ? 'bars' : 'line';
    const toggle = document.getElementById('archive-trend-toggle');
    const toggleIcon = document.getElementById('archive-trend-toggle-icon');
    const toggleTitle = chartType === 'bars' ? t('switchToLineChart', 'Switch to line chart') : t('switchToStackedBarChart', 'Switch to stacked bar chart');
    if (toggle) {
      toggle.title = toggleTitle;
      toggle.setAttribute('aria-label', toggleTitle);
    }
    if (toggleIcon) {
      toggleIcon.className = chartType === 'bars' ? 'txn-chart-toggle-icon' : 'txn-chart-toggle-icon bar';
    }
    return;
  }

  const monthly = buildArchiveTrendMonthlyData(months);
  const dynamicBankKeys = getDynamicArchiveBankKeys(monthly).filter(bankKey => bankKey !== 'csob_cz_credit');
  const activeBankKeys = dynamicBankKeys.filter(bankKey => months.some(month => (monthly[month]?.[bankKey] || 0) > 0));
  const chartBanks = activeBankKeys.length ? activeBankKeys : dynamicBankKeys;

  if (!chartBanks.length) {
    wrap.innerHTML = `<div class="empty-state" style="padding:22px 0;">${t('noTrendData')}</div>`;
    return;
  }

  const chartType = archiveTrendChartType === 'bars' ? 'bars' : 'line';
  const toggle = document.getElementById('archive-trend-toggle');
  const toggleIcon = document.getElementById('archive-trend-toggle-icon');
  const toggleTitle = chartType === 'bars' ? t('switchToLineChart', 'Switch to line chart') : t('switchToStackedBarChart', 'Switch to stacked bar chart');
  if (toggle) {
    toggle.title = toggleTitle;
    toggle.setAttribute('aria-label', toggleTitle);
  }
  if (toggleIcon) {
    toggleIcon.className = chartType === 'bars' ? 'txn-chart-toggle-icon' : 'txn-chart-toggle-icon bar';
  }

  const monthLabel = (mStr) => shortArchiveMonthLabel(mStr);
  const monthsArg = months.join('|');
  const legend = chartBanks.map(bankKey => {
    const bank = getArchiveBankInfo(bankKey);
    return `<span class="archive-bank-legend-item" onclick="openArchiveBankRangeFilter('${bankKey}','${monthsArg}','spent')" title="${escapeAttr(getArchiveBankName(bankKey))} · ${escapeAttr(t('spent'))}"><span class="archive-bank-legend-dot" style="background:${bank.color};"></span>${escapeHtml(getArchiveBankName(bankKey))}</span>`;
  }).join('');

  if (chartType === 'bars') {
    const totalsByMonth = {};
    months.forEach(month => {
      totalsByMonth[month] = chartBanks.reduce((sum, bankKey) => sum + (monthly[month]?.[bankKey] || 0), 0);
    });

    const w = Math.max(320, Math.min(520, 58 * months.length + 72));
    const h = 205;
    const padL = 36;
    const padR = 8;
    const padT = 16;
    const bottom = 44;
    const chartW = w - padL - padR;
    const axisY = h - bottom;
    const chartH = axisY - padT - 10;
    const step = chartW / Math.max(1, months.length);
    const maxValue = Math.max(1, ...months.flatMap(month => [totalsByMonth[month] || 0, ...chartBanks.map(bankKey => monthly[month]?.[bankKey] || 0)]));
    const magnitude = maxValue >= 100000 ? 10000 : 1000;
    const niceMax = Math.ceil(maxValue / magnitude) * magnitude || maxValue;

    const axisLabels = [
      { value: niceMax, y: padT + 7 },
      { value: niceMax / 2, y: padT + chartH / 2 + 3 },
      { value: 0, y: axisY - 2 }
    ].map(item => `<text class="archive-y-label" x="2" y="${item.y.toFixed(1)}">${formatCompactAmount(item.value)}</text>`).join('');

    const bars = months.map((month, idx) => {
      const slotX = padL + idx * step;
      const values = chartBanks.map(bankKey => ({ bankKey, value: monthly[month]?.[bankKey] || 0 })).filter(item => item.value > 0);
      const total = totalsByMonth[month] || 0;
      const totalH = Math.max(0, (total / niceMax) * chartH);
      const groupW = Math.min(step * 0.62, Math.max(18, values.length * 9));
      const miniGap = values.length > 1 ? 2 : 0;
      const miniW = values.length > 0 ? Math.max(5, Math.min(9, (groupW - miniGap * (values.length - 1)) / values.length)) : 8;
      const startX = slotX + (step - groupW) / 2;
      const bankBars = values.map((item, bankIdx) => {
        const bank = getArchiveBankInfo(item.bankKey);
        const barH = Math.max(2, (item.value / niceMax) * chartH);
        const x = startX + bankIdx * (miniW + miniGap);
        return `<rect class="archive-trend-bar-segment archive-trend-bar-animate" x="${x.toFixed(1)}" y="${(axisY - barH).toFixed(1)}" width="${miniW.toFixed(1)}" height="${barH.toFixed(1)}" rx="3" style="fill:${bank.color};animation-delay:${(idx * 80 + bankIdx * 35).toFixed(0)}ms" onclick="openArchiveMonthFilter('${item.bankKey}','${month}','spent')"><title>${escapeHtml(getArchiveBankName(item.bankKey))} · ${escapeHtml(formatMonthString(month))} · ${escapeHtml(formatCurrencyAmount(item.value, 'CZK'))}</title></rect>`;
      }).join('');
      return `
        ${bankBars}
        ${total > 0 ? `<text class="archive-trend-bar-total" x="${(slotX + step / 2).toFixed(1)}" y="${Math.max(10, axisY - totalH - 5).toFixed(1)}" text-anchor="middle">${formatCompactAmount(total)}</text>` : ''}
        <text class="archive-axis-label" x="${(slotX + step / 2).toFixed(1)}" y="${axisY + 24}" text-anchor="middle">${monthLabel(month)}</text>`;
    }).join('');

    wrap.innerHTML = `
      <div class="archive-bank-legend">${legend}</div>
      <div class="archive-chart-note">CZK · ${escapeHtml(t('spent'))}</div>
      <svg class="archive-trend-bars-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <line class="archive-grid-line" x1="${padL}" y1="${axisY}" x2="${w - padR}" y2="${axisY}"></line>
        <line class="archive-grid-line" x1="${padL}" y1="${padT + chartH / 2}" x2="${w - padR}" y2="${padT + chartH / 2}"></line>
        <line class="archive-grid-line" x1="${padL}" y1="${padT}" x2="${w - padR}" y2="${padT}"></line>
        ${axisLabels}
        <text class="archive-axis-unit" x="${padL}" y="${h - 6}">CZK</text>
        ${bars}
      </svg>
    `;
    primeArchiveTrendLinesForIntro(wrap);
    archiveTrendChartCache = { signature: cacheSignature, html: wrap.innerHTML };
    return;
  }

  const w = Math.max(320, Math.min(520, 58 * months.length + 72));
  const h = 190;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const axisY = 134;
  const step = months.length === 1 ? 0 : (w - padL - padR) / (months.length - 1);

  let max = 1;
  months.forEach(month => {
    chartBanks.forEach(bankKey => {
      max = Math.max(max, monthly[month]?.[bankKey] || 0);
    });
  });

  const magnitude = max >= 100000 ? 10000 : 1000;
  const niceMax = Math.ceil(max / magnitude) * magnitude || max;
  const halfLabel = formatCompactAmount(niceMax / 2);
  const maxLabel = formatCompactAmount(niceMax);

  const getPoint = (month, bankKey, index) => {
    const value = monthly[month]?.[bankKey] || 0;
    const x = padL + index * step;
    const y = axisY - (value / niceMax) * (axisY - padT - 14);
    return { x, y, value };
  };

  const linePoints = (bankKey) => months.map((m, i) => {
    const p = getPoint(m, bankKey, i);
    return `${p.x},${p.y}`;
  }).join(' ');

  const lines = chartBanks.map(bankKey => {
    const bank = getArchiveBankInfo(bankKey);
    const points = months.map((m, i) => getPoint(m, bankKey, i));
    const visiblePoints = points.filter(p => p.value > 0);
    const title = `${getArchiveBankName(bankKey)} · ${t('spent')} · ${months[0]}–${months[months.length - 1]}`;
    return `
      <polyline class="archive-bank-line" style="stroke:${bank.color};" points="${linePoints(bankKey)}" onclick="openArchiveBankRangeFilter('${bankKey}','${monthsArg}','spent')"><title>${escapeHtml(title)}</title></polyline>
      <polyline class="archive-bank-line-hit" points="${linePoints(bankKey)}" onclick="openArchiveBankRangeFilter('${bankKey}','${monthsArg}','spent')"><title>${escapeHtml(title)}</title></polyline>
      ${visiblePoints.map(p => {
        const idx = points.indexOf(p);
        return `<circle class="archive-bank-point" cx="${p.x}" cy="${p.y}" r="3.2" style="fill:${bank.color};" onclick="openArchiveMonthFilter('${bankKey}','${months[idx]}','spent')"><title>${escapeHtml(getArchiveBankName(bankKey))} · ${escapeHtml(formatMonthString(months[idx]))} · ${escapeHtml(formatCurrencyAmount(p.value, 'CZK'))}</title></circle>`;
      }).join('')}
    `;
  }).join('');

  wrap.innerHTML = `
    <div class="archive-bank-legend">${legend}</div>
    <div class="archive-chart-note">CZK · ${escapeHtml(t('spent'))}</div>
    <svg class="archive-multiline-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      <line class="archive-grid-line" x1="${padL}" y1="${axisY}" x2="${w - padR}" y2="${axisY}"></line>
      <line class="archive-grid-line" x1="${padL}" y1="${Math.round(axisY / 2)}" x2="${w - padR}" y2="${Math.round(axisY / 2)}"></line>
      <line class="archive-grid-line" x1="${padL}" y1="${padT}" x2="${w - padR}" y2="${padT}"></line>

      <text class="archive-y-label" x="2" y="${padT + 4}">${maxLabel}</text>
      <text class="archive-y-label" x="2" y="${Math.round(axisY / 2) + 4}">${halfLabel}</text>
      <text class="archive-y-label" x="2" y="${axisY + 4}">0</text>
      <text class="archive-axis-unit" x="${padL}" y="${h - 6}">CZK</text>

      ${lines}
      ${months.map((m, i) => {
        const x = padL + i * step;
        return `<text class="archive-axis-label" x="${x - 13}" y="${axisY + 24}">${monthLabel(m)}</text>`;
      }).join('')}
    </svg>
  `;
  primeArchiveTrendLinesForIntro(wrap);
  archiveTrendChartCache = { signature: cacheSignature, html: wrap.innerHTML };
}

function renderArchiveMonthCardHtml(mStr, visibleBankKeys, monthlyCounts) {
  const rows = visibleBankKeys.map(bankKey => {
    const bank = getArchiveBankInfo(bankKey);
    const count = monthlyCounts[mStr]?.[bankKey] || 0;
    const limit = getArchiveCardLimitForMonth(bankKey, mStr);
    const logo = bankLogoImg(bankKey);
    const title = escapeAttr(getArchiveBankName(bankKey));
    const spent = renderMonthlyArchiveSpentCellHtml(bankKey, mStr);
    const income = renderMonthlyArchiveIncomeCellHtml(bankKey, mStr);
    return `<div class="archive-bank-spent-row" title="${title} · ${formatMonthString(mStr)}">
      <div class="archive-bank-limit-cell" onclick="event.stopPropagation(); openArchiveMonthFilter('${bankKey}','${mStr}','cards')" style="color:${bank.color};" title="${title} · ${t('cardsOnly')} · ${t('transactions')}"><span class="bank-inline-logo">${logo}<span>${count}/${limit}</span></span><div>${getBankStatusText(count, limit, mStr)}</div></div>
      <div class="archive-bank-spent-cell" onclick="event.stopPropagation(); openArchiveMonthFilter('${bankKey}','${mStr}','spent')" title="${title} · ${t('spent')} · ${t('outgoing')}">${spent}</div>
      <div class="archive-bank-income-cell" onclick="event.stopPropagation(); openArchiveMonthFilter('${bankKey}','${mStr}','income')" title="${title} · ${t('income')} · ${t('incoming')}">${income}</div>
    </div>`;
  }).join('');
  // Total používa presne tú istú množinu účtov ako Available cash a Net flow.
  const totalsRow = renderArchiveMonthTotalsRowHtml(getOverviewCashflowBankKeysForMonth(mStr), mStr);
  const header = `<div class="archive-bank-spent-header"><div>${t('bank')}</div><div>${t('spent')}</div><div>${t('income')}</div></div>`;
  const breakdownButton = `<button class="archive-cashflow-breakdown-btn" type="button" onclick="event.stopPropagation();openMonthlyCashflowBreakdown('${mStr}')">
    <span data-i18n="cashflowBreakdownCta">${escapeHtml(t('cashflowBreakdownCta'))}</span><span aria-hidden="true">→</span>
  </button>`;
  return `<div class="archive-item archive-item-spent-layout"><div class="archive-month-top">${formatMonthString(mStr)}</div><div class="archive-spent-table">${header}${rows}${totalsRow}${breakdownButton}</div></div>`;
}

function appendArchiveMonthsChunk(count) {
  const container = document.getElementById('archive-months-list');
  const page = document.getElementById('page-archive');
  if (!container) return;
  const state = archiveRenderState || {};
  const months = Array.isArray(state.months) ? state.months : [];
  const start = Number(state.rendered || 0);
  if (start >= months.length) return;
  const end = Math.min(months.length, start + Math.max(1, Number(count || 1)));
  const html = months.slice(start, end).map(mStr => {
    return renderArchiveMonthCardHtml(mStr, state.visibleBankKeys || [], state.monthlyCounts || {});
  }).join('');
  container.insertAdjacentHTML('beforeend', html);
  state.rendered = end;
  archiveRenderState = state;
  if (page && page.classList.contains('active') && state.rendered < months.length) {
    if (page.scrollHeight <= (page.clientHeight + 60)) {
      // Keep filling just enough cards so user always gets a scroll target.
      requestAnimationFrame(() => appendArchiveMonthsChunk(1));
    }
  }
}

function maybeLoadMoreArchiveMonths() {
  const page = document.getElementById('page-archive');
  const container = document.getElementById('archive-months-list');
  if (!page || !container || !page.classList.contains('active')) return;
  const state = archiveRenderState || {};
  if (!Array.isArray(state.months) || state.rendered >= state.months.length) return;
  if (archiveScrollQueued) return;
  archiveScrollQueued = true;
  requestAnimationFrame(() => {
    archiveScrollQueued = false;
    const nearPageBottom = (page.scrollTop + page.clientHeight) >= (page.scrollHeight - 220);
    if (!nearPageBottom) return;
    appendArchiveMonthsChunk(2);
  });
}

function renderArchive() {
  const container = document.getElementById('archive-months-list');
  if (!container) return;

  const txnsAll = allTransactions.filter(t => t.month);
  const storedStatMonths = Object.keys(localStorage)
    .map(k => String(k || '').match(/^bank_monthly_(?:spending|income|net)_.+_(\d{2}\/\d{4})$/))
    .filter(Boolean)
    .map(m => normalizeMonthStr(m[1]));
  const monthsInSpecs = [...new Set([...txnsAll.map(t => normalizeMonthStr(t.month)).filter(Boolean), ...storedStatMonths])]
    .sort((a,b) => monthSortValue(b) - monthSortValue(a));

  if (monthsInSpecs.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:20px 0;">${t('archiveEmpty')}</div>`;
    archiveRenderState = { months: [], rendered: 0, monthlyCounts: {}, visibleBankKeys: [] };
    return;
  }

  const monthlyCounts = {};
  monthsInSpecs.forEach(month => { monthlyCounts[month] = {}; });
  allTransactions.forEach(tx => {
    if (!tx.month || Number(tx.amount || 0) >= 0 || !isCardTransaction(tx)) return;
    if (typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)) return;
    const month = normalizeMonthStr(tx.month);
    const bankKey = getArchiveBankKeyFromTransaction(tx);
    if (!monthlyCounts[month]) monthlyCounts[month] = {};
    monthlyCounts[month][bankKey] = (monthlyCounts[month][bankKey] || 0) + 1;
  });

  const visibleBankKeys = getDynamicArchiveBankKeys(monthlyCounts)
    .filter(bankKey => bankKey !== 'csob_cz_credit');

  archiveRenderState = {
    months: monthsInSpecs,
    rendered: 0,
    monthlyCounts: monthlyCounts,
    visibleBankKeys: visibleBankKeys
  };

  // Fast first paint: latest month first, older months on-demand while scrolling.
  container.innerHTML = '';
  appendArchiveMonthsChunk(1);
}


function selectPlan(plan) {
  localStorage.setItem('selected_plan', plan);
  updateUpgradePlanStatus();
  alert(t('planSavedAlertPrefix') + ' "' + plan + '" ' + t('planSavedAlertSuffix'));
}
async function togglePushNotifications(){const isEnabled=localStorage.getItem('push_enabled')==='true';if(isEnabled){localStorage.setItem('push_enabled','false');updatePushStatus();alert('Push notifikácie sú lokálne vypnuté. V ďalšom kroku token označíme ako neaktívny v Google Sheets.');return}await enableNotifications();if(localStorage.getItem('fcm_token'))localStorage.setItem('push_enabled','true');updatePushStatus()}

function getLanguage() {
  return localStorage.getItem('app_language') || 'en';
}


function t(key, fallback) {
  const lang = getLanguage ? getLanguage() : 'en';
  const dict = (typeof I18N !== 'undefined' && I18N[lang]) || (typeof I18N !== 'undefined' && I18N.en) || {};
  return dict[key] || fallback || key;
}

function setLanguage(lang) {
  localStorage.setItem('app_language', lang);
  renderAll();
  applyLanguage();

  setBillingMode(document.getElementById('billing-yearly')?.classList.contains('active') ? 'yearly' : 'monthly');

  if (document.getElementById('bank-manager-sheet')?.classList.contains('open')) { renderBankManager(); }

  translateManualCategoryDropdown();
}
function applyLanguage() {
  const lang = getLanguage();
  const dict = I18N[lang] || I18N.en;

  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key]) el.innerHTML = dict[key];
  });

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key]) el.setAttribute('title', dict[key]);
  });

  const select = document.getElementById('language-select');
  if (select) select.value = lang;
  updateAppCurrencySelect();
  if (typeof updateGoogleSheetsToggleUi === 'function') updateGoogleSheetsToggleUi();

  if (typeof applyAppTheme === 'function') applyAppTheme(getAppTheme());

  if (typeof initCurrencyDropdowns === 'function') initCurrencyDropdowns();
}





function isGoogleSheetsEnabled() {
  return localStorage.getItem('google_sheets_enabled') !== 'false';
}

function toggleGoogleSheetsMode() {
  const next = !isGoogleSheetsEnabled();
  localStorage.setItem('google_sheets_enabled', next ? 'true' : 'false');
  updateGoogleSheetsToggleUi();

  if (next) {
    syncData();
  } else {
    loadCachedOrDemoData();
    try {
      if (isLocalOfflineDemoMode() && (shouldAutoSeedLocalWidgetDemo() || !allTransactions.length)) {
        seedBankTrackerLocalTestData(true);
      } else if (isLocalOfflineDemoMode()) {
        applyLocalWidgetDemoAlertLimits(getAktuálneMonth());
      }
    } catch (_) {}
    renderAll();
    applyLanguage();
  }
}

function updateGoogleSheetsToggleUi() {
  const enabled = isGoogleSheetsEnabled();
  const toggle = document.getElementById('sheets-toggle');
  const sub = document.getElementById('sheets-toggle-sub');
  const dict = (typeof I18N !== 'undefined' && I18N[getLanguage ? getLanguage() : 'en']) || {};

  if (toggle) toggle.classList.toggle('on', enabled);
  if (sub) {
    sub.setAttribute('data-i18n', enabled ? 'googleSheetsToggleSubOn' : 'googleSheetsToggleSubOff');
    sub.textContent = enabled
      ? (dict.googleSheetsToggleSubOn || 'Enabled — app loads real transactions from Sheets.')
      : (dict.googleSheetsToggleSubOff || 'Disabled — app uses local cache only.');
  }

  const input = document.getElementById('sheets-url');
  if (input) input.disabled = !enabled;
}

function ensureDefaultConfig() {
  try {
    SHEETS_URL = localStorage.getItem('sheets_url') || DEFAULT_SHEETS_URL || '';
    LIMITS_WEBAPP_URL = localStorage.getItem('limits_webapp_url') || DEFAULT_LIMITS_WEBAPP_URL || '';
  } catch (err) {
    console.warn('Config storage unavailable:', err);
    SHEETS_URL = DEFAULT_SHEETS_URL || '';
    LIMITS_WEBAPP_URL = DEFAULT_LIMITS_WEBAPP_URL || '';
  }
}




function getTransactionAlertStorageKey(bankId, direction, monthStr) {
  return `bank_tx_alert_${direction}_${bankId}_${normalizeMonthStr(monthStr || getAktuálneMonth())}`;
}

function getTransactionAlertSettingsForBank(bankId, monthStr) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  return {
    incoming: parseFloat(localStorage.getItem(getTransactionAlertStorageKey(bankId, 'incoming', month)) || '0') || 0,
    outgoing: parseFloat(localStorage.getItem(getTransactionAlertStorageKey(bankId, 'outgoing', month)) || '0') || 0
  };
}

function setTransactionAlertSettingsForBank(bankId, incomingAlert, outgoingAlert, monthStr) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  localStorage.setItem(getTransactionAlertStorageKey(bankId, 'incoming', month), String(parseAmountValue(incomingAlert)));
  localStorage.setItem(getTransactionAlertStorageKey(bankId, 'outgoing', month), String(parseAmountValue(outgoingAlert)));
}

function getBankSettingsPayload(bankId, monthStr, cardLimit, budget, warning, accountBalance, incomingAlert, outgoingAlert, creditCardLimit = undefined) {
  const isCreditCardBank = String(bankId || '').trim() === 'csob_cz_credit';
  const parsedCardLimit = parseAmountValue(cardLimit);
  const parsedCreditCardLimit = parseAmountValue(creditCardLimit !== undefined ? creditCardLimit : (isCreditCardBank ? cardLimit : undefined));
  const hasCreditCardLimit = creditCardLimit !== undefined || isCreditCardBank;
  return {
    bankId,
    month: normalizeMonthStr(monthStr || getAktuálneMonth()),
    cardLimit: isCreditCardBank ? 0 : parsedCardLimit,
    creditCardLimit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    creditCardLimits: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    creditLimit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    credit_card_limit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    monthlyLimit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    monthly_limit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    creditMonthlyLimit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    credit_monthly_limit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    budget: parseAmountValue(budget),
    warning: parseAmountValue(warning),
    accountBalance: parseAmountValue(accountBalance),
    incomingAlert: parseAmountValue(incomingAlert),
    outgoingAlert: parseAmountValue(outgoingAlert)
  };
}

async function saveBankSettingsEndpoint(bankId, monthStr, cardLimit, budget, warning, accountBalance, incomingAlert, outgoingAlert, creditCardLimit = undefined) {
  const payload = getBankSettingsPayload(bankId, monthStr, cardLimit, budget, warning, accountBalance, incomingAlert, outgoingAlert, creditCardLimit);
  return postToBankTrackerEndpoint('saveBankSettings', { ...payload, settings: payload });
}



function cleanBankAccountValue(value) {
  let text = String(value || '').trim();
  if (/^(true|false|null|undefined)$/i.test(text)) return '';
  text = text.replace(/^(karta|card)\s*/i, '').trim();
  text = text.replace(/^(účty|ucty|účet|ucet|accounts?|iban)\s*/i, '').trim();
  const accounts = [];
  const slashRe = /(\d{1,12})\s*\/\s*(\d{4})/g;
  let match;
  while ((match = slashRe.exec(text)) !== null) accounts.push(`${String(match[1])}/${match[2]}`);
  if (accounts.length) return normalizeIdentifierList(accounts.join(','));
  const compactText = text.replace(/\s+/g, '').toUpperCase();
  const ibanLike = compactText.match(/[A-Z]{2}\d{2}[A-Z0-9]{8,}/g) || [];
  if (ibanLike.length) return normalizeIdentifierList(ibanLike.join(','));
  const countryShortcut = text.match(/\b(SK|DE)\s*(\d{4})\b/i);
  if (countryShortcut) return `${countryShortcut[1].toUpperCase()} ${countryShortcut[2]}`;
  const digitGroups = text.match(/\d{4,}/g) || [];
  if (digitGroups.length) return normalizeIdentifierList(digitGroups.map(v => String(v).slice(-4)).join(','));
  return normalizeIdentifierList(text);
}

function formatBankAccountForInput(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const slash = text.match(/(\d{1,12})\s*\/\s*(\d{4})/);
  if (slash) return `${slash[1]}/${slash[2]}`;
  const compact = text.replace(/\s+/g, '').toUpperCase();
  if (/^[A-Z]{2}\d{4}$/.test(compact)) return compact.slice(0, 2) + ' ' + compact.slice(2);
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{8,34}$/.test(compact)) {
    return compact.replace(/(.{4})/g, '$1 ').trim();
  }
  return text;
}

function cleanBankCardsValue(value) {
  let text = String(value || '').replace(/^(karta|card|cards?)\s*/i, '').trim();
  if (/^(true|false|null|undefined)$/i.test(text)) return '';
  text = text.replace(/\d{1,12}\s*\/\s*\d{4}/g, ' ');
  text = text.replace(/[A-Z]{2}\d{2}[A-Z0-9]{8,}/ig, ' ');
  const matches = text.match(/(?:\*{2,}|x{2,})\s*(\d{4})|\b(\d{4})\b/ig) || [];
  return [...new Set(matches.map(v => String(v).replace(/\D/g, '').slice(-4)).filter(Boolean))].join(',');
}

function removeAccountPartsFromCards(cards, account) {
  const accountParts = new Set();
  String(account || '').split(',').forEach(acc => {
    const text = String(acc || '').trim();
    const slash = text.match(/(\d{4})\s*\/\s*(\d{4})/);
    if (slash) { accountParts.add(slash[1]); accountParts.add(slash[2]); }
    const country = text.match(/^[A-Z]{2}\s*(\d{4})$/i);
    if (country) accountParts.add(country[1]);
  });
  return normalizeIdentifierList(String(cards || '').split(',').map(v => String(v || '').replace(/\D/g, '').slice(-4)).filter(v => v && !accountParts.has(v)).join(','));
}

function getBankStoredCardsStorageKey(bankKey) {
  return 'bank_stored_cards_' + String(bankKey || '').trim();
}

function emptyBankStoredCardSlot() {
  return { number: '', expiry: '', cvc: '' };
}

function normalizeBankStoredCardExpiry(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '/' + digits.slice(2);
}

function formatBankStoredCardNumberForInput(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function formatBankStoredCardExpiryForInput(value) {
  return normalizeBankStoredCardExpiry(value);
}

function normalizeBankStoredCards(cards) {
  const list = Array.isArray(cards) ? cards : [];
  return Array.from({ length: BANK_STORED_CARD_SLOTS }, (_, index) => {
    const item = list[index] || {};
    return {
      number: String(item.number || '').replace(/\D/g, '').slice(0, 19),
      expiry: normalizeBankStoredCardExpiry(item.expiry),
      cvc: String(item.cvc || '').replace(/\D/g, '').slice(0, 4)
    };
  });
}

function getBankStoredCards(bankKey) {
  try {
    const raw = localStorage.getItem(getBankStoredCardsStorageKey(bankKey));
    if (raw) return normalizeBankStoredCards(JSON.parse(raw));
  } catch (_) {}
  const custom = getCustomBanks().find(b => b && b.id === bankKey);
  if (custom && Array.isArray(custom.storedCards)) return normalizeBankStoredCards(custom.storedCards);
  return normalizeBankStoredCards([]);
}

function setBankStoredCards(bankKey, cards) {
  const id = String(bankKey || '').trim();
  const normalized = normalizeBankStoredCards(cards);
  localStorage.setItem(getBankStoredCardsStorageKey(id), JSON.stringify(normalized));
  const last4s = [...new Set(normalized.map(card => String(card.number || '').slice(-4)).filter(v => v.length === 4))];
  localStorage.setItem('bank_cards_' + id, last4s.join(','));
  const banks = getCustomBanks();
  const custom = banks.find(b => b && b.id === id);
  if (custom) {
    custom.storedCards = normalized;
    custom.cards = last4s.join(',');
    saveCustomBanks(banks);
  }
  syncManagedBankCardsField(id, last4s.join(','));
  return normalized;
}

function getManagedBankStoredCardInputId(bankKey, slot, field) {
  return 'edit-card-' + field + '-' + String(slot) + '-' + String(bankKey || '').trim();
}

function readManagedBankStoredCardsFromForm(bankKey) {
  return normalizeBankStoredCards(Array.from({ length: BANK_STORED_CARD_SLOTS }, (_, index) => {
    const slot = index + 1;
    return {
      number: document.getElementById(getManagedBankStoredCardInputId(bankKey, slot, 'number'))?.value || '',
      expiry: document.getElementById(getManagedBankStoredCardInputId(bankKey, slot, 'expiry'))?.value || '',
      cvc: document.getElementById(getManagedBankStoredCardInputId(bankKey, slot, 'cvc'))?.value || ''
    };
  }));
}

function syncManagedBankCardsField(bankKey, cardsValue) {
  const id = String(bankKey || '').trim();
  if (!id) return;
  const cards = cleanBankCardsValue(cardsValue || localStorage.getItem('bank_cards_' + id) || '');
  const cardsInput = document.getElementById('edit-cards-' + id);
  if (cardsInput) cardsInput.value = cards;
}

function readBankStoredCardsFromSheetCells(cell, headers, accountValue = '') {
  const headerIndex = (name) => headers.findIndex(h => String(h || '').trim().toLowerCase() === String(name).toLowerCase());
  const stored = normalizeBankStoredCards(Array.from({ length: BANK_STORED_CARD_SLOTS }, (_, index) => {
    const slot = index + 1;
    const panIdx = headerIndex('Card ' + slot);
    const expIdx = headerIndex('Card ' + slot + ' expiry');
    const cvcIdx = headerIndex('Card ' + slot + ' cvc');
    return {
      number: panIdx >= 0 ? cell(panIdx) : '',
      expiry: expIdx >= 0 ? cell(expIdx) : '',
      cvc: cvcIdx >= 0 ? cell(cvcIdx) : ''
    };
  }));
  if (stored.some(card => card.number || card.expiry || card.cvc)) return stored;
  const cardsIdx = headerIndex('Cards');
  const legacyCards = cardsIdx >= 0 ? cleanBankCardsValue(cell(cardsIdx)) : '';
  if (!legacyCards) return stored;
  return normalizeBankStoredCards(legacyCards.split(',').slice(0, BANK_STORED_CARD_SLOTS).map(card => ({
    number: card,
    expiry: '',
    cvc: ''
  })));
}

function getEndpointBankPayload(bankId, bankData = {}) {
  const info = BANKS[bankId] || null;
  const isCustom = String(bankId || '').startsWith('custom_');
  const name = bankData.name || (isCustom ? bankData.name : getBankDisplayOverride(bankId)) || plainBankName(bankId);
  const savedCurrency = localStorage.getItem('bank_currency_' + bankId);
  let currency = bankData.currency || savedCurrency || info?.primaryCurrency || 'CZK';
  if (bankId === 'csob_sk') currency = 'EUR';
  const type = bankData.type || info?.primaryType || (isCustom ? 'account' : 'card');
  const account = cleanBankAccountValue(bankData.account || localStorage.getItem('bank_account_' + bankId) || info?.account || '');
  const cards = removeAccountPartsFromCards(cleanBankCardsValue(bankData.cards || localStorage.getItem('bank_cards_' + bankId) || info?.cards || ''), account);
  const storedCards = normalizeBankStoredCards(bankData.storedCards || getBankStoredCards(bankId));

  return {
    id: bankId,
    name: String(name || '').replace(/<[^>]+>/g, '').trim(),
    currency,
    type,
    account,
    cards,
    storedCards,
    active: bankData.active === false ? false : true
  };
}

async function syncAllBanksAndSettingsToEndpoint() {
  // Deprecated safety no-op.
  // This used to push local cached bank settings to Google Sheets and could overwrite
  // Bank_Settings with zeros after cookies/site-data reset. Do not use for refresh/config save.
  return 0;
}


function isValidCurrencyCode(code) {
  return /^[A-Z]{3}$/.test(String(code || '').trim().toUpperCase());
}

function parseBanksSheetData(raw) {
  const data = parseGvizJson(raw);
  const rows = data?.table?.rows || [];
  const cols = data?.table?.cols || [];
  const headerFromCols = cols.map(col => String(col?.label || '').trim());
  const firstRowHeaders = rows[0]?.c?.map(cell => String(cell?.v || cell?.f || '').trim()) || [];
  const looksLikeHeaderRow = firstRowHeaders.some(h => /bank id|currency|account|cards|active/i.test(h));
  const headers = (headerFromCols.some(Boolean) ? headerFromCols : firstRowHeaders).map(h => String(h || '').trim());
  const dataRows = looksLikeHeaderRow ? rows.slice(1) : rows;
  const headerIndex = (names, fallback) => {
    const list = Array.isArray(names) ? names : [names];
    for (const name of list) {
      const idx = headers.findIndex(h => h.toLowerCase() === String(name).toLowerCase());
      if (idx >= 0) return idx;
    }
    return fallback;
  };
  const idx = {
    id: headerIndex(['Bank ID','BankID'], 0),
    name: headerIndex('Name', 1),
    currency: headerIndex('Currency', 2),
    type: headerIndex('Type', 3),
    account: headerIndex(['Account','Account last 4','IBAN / Account','Account / Card last 4 digits'], 4),
    cards: headerIndex(['Cards','Card','Card last 4 digits'], 5),
    active: headerIndex('Active', headers.includes('Cards') ? 6 : 5)
  };
  const custom = [];
  const existingCustom = getCustomBanks();
  const existingById = Object.fromEntries(existingCustom.map(b => [b.id, b]));

  dataRows.forEach(row => {
    const c = row.c || [];
    const cell = (i) => String(c[i]?.v ?? c[i]?.f ?? '').trim();
    const id = cell(idx.id);
    const name = cell(idx.name);
    const rawCurrency = cell(idx.currency).toUpperCase();
    const type = cell(idx.type).toLowerCase() || 'account';
    let account = cleanBankAccountValue(cell(idx.account));
    let cards = cleanBankCardsValue(cell(idx.cards));
    const legacyAccountCards = cell(headerIndex('Account / Card last 4 digits', -1));
    if (!cards && /^\s*(karta|card)\b/i.test(legacyAccountCards)) cards = cleanBankCardsValue(legacyAccountCards);
    if (!account && !/^\s*(karta|card)\b/i.test(legacyAccountCards)) account = cleanBankAccountValue(legacyAccountCards);
    const activeRaw = String(c[idx.active]?.v ?? c[idx.active]?.f ?? 'TRUE').trim().toLowerCase();
    const active = !(activeRaw === 'false' || activeRaw === '0' || activeRaw === 'no');
    if (!id || !active) return;
    const canonicalId = canonicalBankIdFromSheetRow(id, name, [account, cards].filter(Boolean).join(' '));
    let currency = isValidCurrencyCode(rawCurrency) ? rawCurrency : '';
    if (canonicalId === 'csob_sk') currency = 'EUR';
    cards = removeAccountPartsFromCards(cards, account);

    if (['savings', 'credit', 'account', 'card'].includes(type)) {
      localStorage.setItem('bank_product_type_' + canonicalId, type === 'card' ? 'account' : type);
    }

    if (BANK_ORDER.includes(canonicalId)) {
      if (name) setBankDisplayOverride(canonicalId, name);
      if (currency) localStorage.setItem('bank_currency_' + canonicalId, currency);
      if (account) localStorage.setItem('bank_account_' + canonicalId, account);
      if (cards) localStorage.setItem('bank_cards_' + canonicalId, cards);
      const sheetStoredCards = readBankStoredCardsFromSheetCells(cell, headers, account);
      if (sheetStoredCards.some(card => card.number || card.expiry || card.cvc)) setBankStoredCards(canonicalId, sheetStoredCards);
      return;
    }

    const old = existingById[id] || existingById[canonicalId] || {};
    const storedCards = readBankStoredCardsFromSheetCells(cell, headers, account);
    custom.push({
      ...old,
      id: canonicalId,
      name: name || old.name || canonicalId,
      currency: currency || old.currency || 'CZK',
      type: type === 'credit' ? 'credit' : (type === 'savings' ? 'savings' : (type === 'card' ? 'card' : 'account')),
      account: account || old.account || '',
      cards: cards || old.cards || '',
      storedCards,
      active: true
    });
  });

  saveCustomBanks(custom);
  return custom.length;
}

async function syncBanksFromSheets(spreadsheetId) {
  try {
    if (!spreadsheetId) return false;
    saveCustomBanks([]);
    const gvizUrl = buildGvizUrl(spreadsheetId, 'Bank_Settings');
    const res = await fetchNoStore(gvizUrl);
    if (!res.ok) throw new Error('Bank_Settings fetch failed');
    const raw = await res.text();
    parseBanksSheetData(raw);
    return true;
  } catch (e) {
    console.warn('Bank_Settings sync skipped:', e);
    return false;
  }
}
function parseBankSettingsSheetData(raw) {
  const data = parseGvizJson(raw);
  const rows = data?.table?.rows || [];
  const cols = data?.table?.cols || [];
  const headerFromCols = cols.map(col => String(col?.label || '').trim());
  const firstRowHeaders = rows[0]?.c?.map(cell => String(cell?.v ?? cell?.f ?? '').trim()) || [];
  const normalizeHeader = (value) => String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_\-./()]+/g, ' ')
    .replace(/\s+/g, ' ');
  const hasHeaderLabels = headerFromCols.some(Boolean);
  const firstRowLooksLikeHeader = firstRowHeaders
    .map(normalizeHeader)
    .some(h => /month|mesiac|mesic|obdobi|bank|banka|budget|balance|zostatok|zustatek|limit|spending|spent|income|vydav|prijem/i.test(h));
  const headerMode = hasHeaderLabels || firstRowLooksLikeHeader;
  const headers = (hasHeaderLabels ? headerFromCols : firstRowHeaders).map(normalizeHeader);
  const dataRows = firstRowLooksLikeHeader && !hasHeaderLabels ? rows.slice(1) : rows;
  const headerIndex = (names, fallback) => {
    const list = (Array.isArray(names) ? names : [names]).map(normalizeHeader).filter(Boolean);
    const exact = headers.findIndex(h => list.includes(h));
    if (exact >= 0) return exact;
    const contains = headers.findIndex(h => list.some(name => {
      if (name.length < 8 || h.length < 8) return false;
      return h.includes(name) || name.includes(h);
    }));
    return contains >= 0 ? contains : (headerMode ? -1 : fallback);
  };
  const idx = {
    month: headerIndex(['Month', 'Mesiac', 'Mesic', 'Period', 'Obdobi', 'Obdobie'], 0),
    bank: headerIndex(['Bank ID', 'BankID', 'Bank', 'Banka'], 1),
    cardLimit: headerIndex(['Card limit', 'Card Limit', 'Cards limit', 'Limit', 'Payment limit', 'Limit karty', 'Kartovy limit', 'Limit kariet'], 2),
    creditCardLimit: headerIndex(['Credit card limits', 'Credit card limit', 'Credit limit', 'Monthly credit limit', 'Monthly limit', 'monthlyLimit', 'monthly_limit', 'creditMonthlyLimit', 'credit_monthly_limit', 'credit_card_limit', 'credit_card_limits', 'Limit kreditky', 'Limit kreditnej karty', 'Limit kreditni karty'], -1),
    budget: headerIndex(['Budget', 'Bank budget', 'Monthly budget', 'Mesacny budget', 'Mesicni budget', 'Rozpocet'], 3),
    warning: headerIndex(['Warning', 'Warn', 'Budget warning', 'Warning threshold', 'Upozornenie', 'Varovani'], 4),
    balance: headerIndex(['Balance', 'Account balance', 'Zostatok', 'Zustatek', 'Zostatok uctu', 'Zustatek uctu'], 5),
    incomingAlert: headerIndex(['Incoming alert', 'Income alert', 'Incoming limit', 'Prijem alert', 'Prichozi alert'], 6),
    outgoingAlert: headerIndex(['Outgoing alert', 'Spending alert', 'Outgoing limit', 'Vydavky alert', 'Odchozi alert'], 7),
    monthlySpending: headerIndex(['Monthly spending', 'Spending', 'Spent', 'Monthly spent', 'Mesacne vydavky', 'Mesicni vydaje', 'Vydavky', 'Vydaje', 'Minute'], 8),
    monthlyIncome: headerIndex(['Monthly income', 'Income', 'Mesacny prijem', 'Mesicni prijem', 'Prijem', 'Prijmy'], 9),
    monthlyNet: headerIndex(['Monthly net', 'Net', 'Cisty vysledok', 'Netto'], -1)
  };
  const cellText = (cells, i) => i >= 0 ? String(cells[i]?.v ?? cells[i]?.f ?? '').trim() : '';
  const hasCell = (cells, i) => i >= 0 && !!cells[i] && String(cells[i].v ?? cells[i].f ?? '').trim() !== '';
  const hasNumericCell = (cells, i) => {
    if (i < 0 || !cells[i]) return false;
    const raw = cells[i].v ?? cells[i].f;
    if (raw === 0) return true;
    if (raw === null || raw === undefined) return false;
    return String(raw).trim() !== '';
  };
  const cellNumber = (cells, i) => parseSheetNumber(cells[i]?.v, cells[i]?.f);
  const parseSheetMonth = (cells, i) => {
    const raw = cells[i]?.v ?? cells[i]?.f ?? '';
    if (!String(raw || '').trim()) return '';
    const date = parseGSheetDate(raw);
    if (date) return getMonthFromDate(date);
    const text = String(raw || '').trim();
    const iso = text.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?/);
    if (iso) return `${String(Number(iso[2])).padStart(2, '0')}/${iso[1]}`;
    // Strict MM/YYYY (or M/YYYY) only. Do NOT fall back to the current month for
    // ambiguous values like "6.26" – a stray row like that would otherwise map to
    // the current month and overwrite the real balance (e.g. ČSOB SK) with 0.
    const mmYyyy = text.match(/^(\d{1,2})\/(\d{4})$/);
    if (mmYyyy) return `${String(parseInt(mmYyyy[1], 10)).padStart(2, '0')}/${mmYyyy[2]}`;
    return '';
  };
  if (!dataRows.length) return 0;
  clearSheetAccountBalanceStorage();
  let count = 0;
  dataRows.forEach(row => {
    const c = row.c || [];
    const firstCell = cellText(c, idx.month).toLowerCase();
    const secondCell = cellText(c, idx.bank).toLowerCase();
    if (/^(month|mesiac|mesic|period)$/.test(firstCell) || /^(bank|banka|bank id|bankid)$/.test(secondCell)) return;
    const month = parseSheetMonth(c, idx.month);
    const rawBankId = cellText(c, idx.bank);
    const relatedCustom = getCustomBanks().find(b => b.id === rawBankId) || {};
    const bankId = canonicalBankIdFromSheetRow(rawBankId, relatedCustom.name, relatedCustom.account);
    if (!bankId || !month) return;
    const hasCardLimit = hasCell(c, idx.cardLimit);
    const hasCreditCardLimit = hasCell(c, idx.creditCardLimit);
    const hasBudget = hasCell(c, idx.budget);
    const hasWarning = hasCell(c, idx.warning);
    const hasBalance = idx.balance >= 0 && hasNumericCell(c, idx.balance);
    const hasIncomingAlert = hasCell(c, idx.incomingAlert);
    const hasOutgoingAlert = hasCell(c, idx.outgoingAlert);
    const hasSpending = hasCell(c, idx.monthlySpending);
    const hasIncome = hasCell(c, idx.monthlyIncome);
    const hasNet = hasCell(c, idx.monthlyNet);
    const hasOverviewDetailValue = hasCardLimit || hasCreditCardLimit || hasBudget || hasWarning || hasBalance || hasIncomingAlert || hasOutgoingAlert || hasSpending || hasIncome || hasNet;
    if (!hasOverviewDetailValue) return;

    const cardLimit = hasCardLimit ? cellNumber(c, idx.cardLimit) : null;
    const creditCardLimit = hasCreditCardLimit ? cellNumber(c, idx.creditCardLimit) : null;
    const budget = hasBudget ? cellNumber(c, idx.budget) : null;
    const warning = hasWarning ? cellNumber(c, idx.warning) : null;
    const balance = hasBalance ? cellNumber(c, idx.balance) : null;
    const incomingAlert = hasIncomingAlert ? cellNumber(c, idx.incomingAlert) : null;
    const outgoingAlert = hasOutgoingAlert ? cellNumber(c, idx.outgoingAlert) : null;
    const monthlySpending = hasSpending ? cellNumber(c, idx.monthlySpending) : null;
    const monthlyIncome = hasIncome ? cellNumber(c, idx.monthlyIncome) : null;
    const monthlyNet = hasNet
      ? cellNumber(c, idx.monthlyNet)
      : Math.round(((monthlyIncome || 0) - (monthlySpending || 0)) * 100) / 100;

    if (hasCardLimit) setMonthlyCardLimitForBank(bankId, cardLimit, month);
    if (hasCreditCardLimit) setCreditCardLimitForBank(bankId, creditCardLimit, month);
    if (hasSpending) {
      setOverviewMonthlyStat(bankId, month, 'spending', monthlySpending);
      localStorage.setItem(getArchiveMonthlyStatKey(bankId, month, 'spending'), String(monthlySpending));
    }
    if (hasIncome) {
      setOverviewMonthlyStat(bankId, month, 'income', monthlyIncome);
      localStorage.setItem(getArchiveMonthlyStatKey(bankId, month, 'income'), String(monthlyIncome));
    }
    if (hasSpending || hasIncome || hasNet) {
      setOverviewMonthlyStat(bankId, month, 'net', monthlyNet);
      localStorage.setItem(getArchiveMonthlyStatKey(bankId, month, 'net'), String(monthlyNet));
    }
    if (hasBudget) localStorage.setItem(getBudgetStorageKey(bankId, 'limit', month), String(budget));
    if (hasWarning) localStorage.setItem(getBudgetStorageKey(bankId, 'warn', month), String(warning));
    if (hasBalance && Number.isFinite(balance)) {
      localStorage.setItem(getSheetAccountBalanceValueKey(bankId, month), String(balance));
      markSheetAccountBalanceAuthority(bankId, month);
      if (isCreditLiabilityBankKey(bankId)) {
        if (getAccountBalanceBase(bankId, month) === null) {
          syncAccountBalanceBaseFromAbsoluteValue(bankId, month, balance);
        } else {
          recomputeAccountBalanceForBank(bankId, month);
        }
      } else {
        syncAccountBalanceBaseFromAbsoluteValue(bankId, month, balance);
      }
    }
    if (hasIncomingAlert || hasOutgoingAlert) {
      const currentAlerts = getTransactionAlertSettingsForBank(bankId, month);
      setTransactionAlertSettingsForBank(
        bankId,
        hasIncomingAlert ? incomingAlert : currentAlerts.incoming,
        hasOutgoingAlert ? outgoingAlert : currentAlerts.outgoing,
        month
      );
    }

    const limits = getLimitsForMonth(month);
    const info = getBankInfo(bankId);
    if (hasCardLimit && BANK_ORDER.includes(bankId) && info?.limitKey) {
      limits[info.limitKey] = cardLimit;
      saveLimitsForMonth(month, limits);
    }

    const banks = getCustomBanks();
    const custom = banks.find(b => b.id === bankId);
    if (custom) {
      if (hasCardLimit) custom.cardLimit = cardLimit;
      if (hasCreditCardLimit) custom.creditCardLimit = creditCardLimit;
      if (hasBudget) custom.budget = budget;
      if (hasWarning) custom.warning = warning;
      if (hasBalance) custom.balance = balance;
      if (hasIncomingAlert) custom.incomingAlert = incomingAlert;
      if (hasOutgoingAlert) custom.outgoingAlert = outgoingAlert;
      if (hasSpending) custom.monthlySpending = monthlySpending;
      if (hasIncome) custom.monthlyIncome = monthlyIncome;
      if (hasSpending || hasIncome || hasNet) custom.monthlyNet = monthlyNet;
      custom.budgetMonth = month;
      saveCustomBanks(banks);
    }
    count++;
  });
  return count;
}


function parseBalanceLogSheetData(raw) {
  const data = parseGvizJson(raw);
  const rows = data?.table?.rows || [];
  const cols = data?.table?.cols || [];
  const headerFromCols = cols.map(col => String(col?.label || '').trim());
  const firstRowHeaders = rows[0]?.c?.map(cell => String(cell?.v ?? cell?.f ?? '').trim()) || [];
  const normalizeHeader = (value) => String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_\-./()]+/g, ' ')
    .replace(/\s+/g, ' ');
  const hasHeaderLabels = headerFromCols.some(Boolean);
  const firstRowLooksLikeHeader = firstRowHeaders.map(normalizeHeader).some(h => /created|source|bank|month|balance|delta|currency|reason/.test(h));
  const headers = (hasHeaderLabels ? headerFromCols : firstRowHeaders).map(normalizeHeader);
  const dataRows = firstRowLooksLikeHeader && !hasHeaderLabels ? rows.slice(1) : rows;
  const headerIndex = (names, fallback) => {
    const list = (Array.isArray(names) ? names : [names]).map(normalizeHeader).filter(Boolean);
    const exact = headers.findIndex(h => list.includes(h));
    if (exact >= 0) return exact;
    const contains = headers.findIndex(h => list.some(name => h.includes(name) || name.includes(h)));
    return contains >= 0 ? contains : (headers.length ? -1 : fallback);
  };
  const idx = {
    created: headerIndex(['Created', 'Timestamp', 'Date', 'Datum'], 0),
    bank: headerIndex(['Bank ID', 'BankID', 'Bank', 'Banka'], 2),
    month: headerIndex(['Month', 'Mesiac', 'Mesic', 'Period'], 3),
    newBalance: headerIndex(['New balance', 'Balance', 'Account balance', 'Novy balance', 'Novy zostatok', 'Novy zustatek'], 6),
    currency: headerIndex(['Currency', 'Mena'], 7)
  };
  const cellRaw = (cells, i) => i >= 0 ? (cells[i]?.v ?? cells[i]?.f ?? '') : '';
  const cellText = (cells, i) => String(cellRaw(cells, i) ?? '').trim();
  const parseCreated = (cells, i) => {
    const raw = cellRaw(cells, i);
    const date = parseGSheetDate(raw);
    if (date) return date.getTime();
    const t = Date.parse(String(raw || ''));
    return Number.isFinite(t) ? t : 0;
  };
  const parseLogMonth = (cells, i, createdTime) => {
    const raw = cellRaw(cells, i);
    if (String(raw || '').trim()) {
      const date = parseGSheetDate(raw);
      if (date) return getMonthFromDate(date);
      const text = String(raw || '').trim();
      const iso = text.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?/);
      if (iso) return `${String(Number(iso[2])).padStart(2, '0')}/${iso[1]}`;
      // Strict MM/YYYY only; ambiguous values must not snap to the current month.
      const mmYyyy = text.match(/^(\d{1,2})\/(\d{4})$/);
      if (mmYyyy) return `${String(parseInt(mmYyyy[1], 10)).padStart(2, '0')}/${mmYyyy[2]}`;
    }
    if (createdTime) return getMonthFromDate(new Date(createdTime));
    return '';
  };

  const latest = new Map();
  dataRows.forEach(row => {
    const c = row.c || [];
    const rawBankId = cellText(c, idx.bank);
    if (!rawBankId || /^(bank|banka|bank id|bankid)$/i.test(rawBankId)) return;
    const bankId = canonicalBankIdFromSheetRow(rawBankId, '', '');
    if (!bankId) return;
    const created = parseCreated(c, idx.created);
    const month = parseLogMonth(c, idx.month, created);
    if (!month) return;
    const newBalance = parseSheetNumber(cellRaw(c, idx.newBalance), cellText(c, idx.newBalance));
    if (!Number.isFinite(newBalance)) return;
    const key = bankId + '|' + month;
    const prev = latest.get(key);
    if (!prev || created >= prev.created) latest.set(key, { bankId, month, created, newBalance, currency: cellText(c, idx.currency) });
  });

  let applied = 0;
  let skippedByArchive = 0;
  latest.forEach(item => {
    if (hasSheetAccountBalanceAuthority(item.bankId, item.month)) {
      skippedByArchive++;
      return;
    }
    if (isCreditLiabilityBankKey(item.bankId)) {
      localStorage.setItem(getSheetAccountBalanceValueKey(item.bankId, item.month), String(item.newBalance));
      markSheetAccountBalanceAuthority(item.bankId, item.month);
      if (getAccountBalanceBase(item.bankId, item.month) === null) {
        syncAccountBalanceBaseFromAbsoluteValue(item.bankId, item.month, item.newBalance);
      } else {
        recomputeAccountBalanceForBank(item.bankId, item.month);
      }
    } else {
      syncAccountBalanceBaseFromAbsoluteValue(item.bankId, item.month, item.newBalance);
    }
    if (item.currency) localStorage.setItem('bank_currency_' + item.bankId, normalizeCurrencyForStorage(item.currency));
    applied++;
  });
  if (skippedByArchive > 0) console.log(`Balance_Log skipped ${skippedByArchive} balances because Bank_Archive has explicit Account balance.`);
  return applied;
}

async function syncBalanceLogFromSheets(spreadsheetId) {
  try {
    if (!spreadsheetId) return false;
    const gvizUrl = buildGvizUrl(spreadsheetId, 'Balance_Log');
    const res = await fetchNoStore(gvizUrl);
    if (!res.ok) throw new Error('Balance_Log fetch failed');
    const raw = await res.text();
    const count = parseBalanceLogSheetData(raw);
    if (count > 0) console.log(`Balance_Log sync loaded ${count} latest balances.`);
    return count > 0;
  } catch (e) {
    console.warn('Balance_Log sync skipped:', e);
    return false;
  }
}

async function syncBankSettingsFromSheets(spreadsheetId) {
  if (!spreadsheetId) return false;
  const sheetNames = [
    'Bank_Archive',
    'Overview details',
    'Overview Details',
    'overview details',
    'Overview_Details',
    'overview_details',
    'Bank_Overview'
  ];
  let lastError = null;
  for (const sheetName of sheetNames) {
    try {
      const gvizUrl = buildGvizUrl(spreadsheetId, sheetName);
      const res = await fetchNoStore(gvizUrl);
      if (!res.ok) throw new Error(`${sheetName} fetch failed`);
      const raw = await res.text();
      const count = parseBankSettingsSheetData(raw);
      if (count > 0) {
        console.log(`${sheetName} sync loaded ${count} overview detail rows.`);
        return true;
      }
      console.warn(`${sheetName} sync returned no overview detail rows.`);
    } catch (e) {
      lastError = e;
    }
  }
  console.warn('Overview details sync skipped:', lastError);
  return false;
}


function isValidAppsScriptExecUrl(url) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^\s]+\/exec(?:\?.*)?$/i.test(String(url || '').trim());
}

function showInvalidWebAppUrlWarning() {
  alert('Používaš Google Apps Script editor URL, nie Web App URL. Potrebuješ Deploy → New deployment → Web app → skopírovať /exec URL. Editor URL typu script.google.com/home/projects/.../edit nebude zapisovať do Sheets.');
}

async function syncDetectedBanksToSheets() {
  LIMITS_WEBAPP_URL = localStorage.getItem('limits_webapp_url') || LIMITS_WEBAPP_URL || '';
  if (!LIMITS_WEBAPP_URL || !isValidAppsScriptExecUrl(LIMITS_WEBAPP_URL)) {
    showInvalidWebAppUrlWarning();
    return false;
  }
  const ok = await postToBankTrackerEndpoint('syncDetectedBanks', { month: getAktuálneMonth() });
  alert(ok
    ? 'Sync detected banks dokončený. Aktualizovaný bol iba tab Bank_Settings; Bank_Archive sa nemenil.'
    : 'Sync sa nepodarilo odoslať. Skontroluj Web App URL a deployment access.');
  return ok;
}


function getCurrentWebAppUrl() {
  const inputUrl = document.getElementById('limits-webapp-url')?.value?.trim() || '';
  const storedUrl = localStorage.getItem('limits_webapp_url') || '';
  LIMITS_WEBAPP_URL = (inputUrl || storedUrl || LIMITS_WEBAPP_URL || '').trim();
  if (LIMITS_WEBAPP_URL) localStorage.setItem('limits_webapp_url', LIMITS_WEBAPP_URL);
  return LIMITS_WEBAPP_URL;
}
function flattenEndpointPayload(action, payload = {}) {
  const flat = { action };
  const add = (key, value) => {
    if (action === 'saveLoan' && /^(fixationPeriodsJson|fixationPeriodsJSON|simSettingsJson|simSettingsJSON)$/.test(key)) return;
    if (value === undefined || value === null) return;
    if (typeof value === 'object') return;
    flat[key] = String(value);
  };

  Object.keys(payload || {}).forEach(key => add(key, payload[key]));

  if (payload.bank) {
    add('bankId', payload.bank.id || payload.bank.bankId);
    add('id', payload.bank.id || payload.bank.bankId);
    add('name', payload.bank.name);
    add('currency', payload.bank.currency);
    add('type', payload.bank.type);
    add('account', payload.bank.account);
    add('cards', payload.bank.cards);
    add('active', payload.bank.active === false ? 'false' : 'true');
    add('changedField', payload.bank.changedField);
    add('changedSlot', payload.bank.changedSlot);
    add('changedCardField', payload.bank.changedCardField);
    add('replaceIdentifiers', payload.bank.replaceIdentifiers === true ? 'true' : (payload.bank.replaceIdentifiers === false ? 'false' : undefined));
    add('allowAppend', payload.bank.allowAppend === true ? 'true' : (payload.bank.allowAppend === false ? 'false' : undefined));
    if (Array.isArray(payload.bank.storedCards)) {
      payload.bank.storedCards.slice(0, 3).forEach((card, index) => {
        const slot = index + 1;
        add(`card${slot}`, card && card.number);
        add(`card${slot}Number`, card && card.number);
        add(`card${slot}Expiry`, card && card.expiry);
        add(`card${slot}Cvc`, card && card.cvc);
      });
    }
  }

  if (payload.loan) {
    add('loanId', payload.loan.id || payload.loan.loanId);
    add('id', payload.loan.id || payload.loan.loanId);
    add('name', payload.loan.name || payload.loan.loanName);
    add('loanName', payload.loan.name || payload.loan.loanName);
    add('type', payload.loan.type || payload.loan.loanType);
    add('currency', payload.loan.currency);
    add('originalAmount', payload.loan.originalAmount || payload.loan.originalValue || payload.loan.principal);
    add('originalValue', payload.loan.originalAmount || payload.loan.originalValue || payload.loan.principal);
    add('outstandingBalance', payload.loan.outstandingBalance || payload.loan.currentBalance || payload.loan.balance);
    add('currentBalance', payload.loan.currentBalance || payload.loan.outstandingBalance || payload.loan.balance);
    add('interestRate', payload.loan.interestRate || payload.loan.rate);
    add('period', payload.loan.periodValue || payload.loan.period || payload.loan.loanPeriod || payload.loan.periodMonths);
    add('periodValue', payload.loan.periodValue || payload.loan.period || payload.loan.loanPeriod);
    add('periodUnit', payload.loan.periodUnit);
    add('periodMonths', payload.loan.periodMonths);
    add('fixationUntil', payload.loan.fixationUntil || payload.loan.fixation);
    add('variableSymbol', payload.loan.variableSymbol || payload.loan.vs);
    add('vs', payload.loan.variableSymbol || payload.loan.vs);
    add('account', payload.loan.account);
    add('linkedBankId', payload.loan.linkedBankId || payload.loan.bankId);
    add('bankId', payload.loan.linkedBankId || payload.loan.bankId);
    add('amountOfRepayment', payload.loan.amountOfRepayment || payload.loan.monthlyPayment || payload.loan.repaymentAmount);
    add('repaymentAmount', payload.loan.repaymentAmount || payload.loan.amountOfRepayment || payload.loan.monthlyPayment);
    add('monthlyPayment', payload.loan.monthlyPayment || payload.loan.repaymentAmount || payload.loan.amountOfRepayment);
    add('matchText', payload.loan.matchText || payload.loan.repaymentText);
    add('repaymentText', payload.loan.repaymentText || payload.loan.matchText);
    add('status', payload.loan.status || 'active');
    add('active', payload.loan.status === 'closed' || payload.loan.active === false ? 'false' : 'true');
    const loanPeriods = Array.isArray(payload.loan.fixationPeriods) ? payload.loan.fixationPeriods : (Array.isArray(payload.fixationPeriods) ? payload.fixationPeriods : []);
    const loanTerm = loanPeriods.find(period => String(period && period.role || '') === 'loan_term') || null;
    const loanSegments = loanPeriods.filter(period => String(period && period.role || '') === 'period');
    const orderedPeriods = (loanTerm ? [loanTerm] : []).concat(loanSegments).slice(0, 10);
    orderedPeriods.forEach((period, index) => {
      const slot = index + 1;
      const rawMonths = index === 0
        ? (period && (period.fixationMonths ?? period.durationMonths))
        : (period && (period.periodUnit === 'years' ? Number(period.periodValue || 0) * 12 : period.periodValue));
      add(`period${slot}Months`, rawMonths);
      add(`period${slot}Rate`, period && (period.rate ?? period.interestRate));
      add(`period${slot}Color`, period && period.color);
    });
    const residual = loanPeriods.find(period => String(period && period.role || '') === 'residual') || null;
    add('residualRate', residual && (residual.rate ?? residual.interestRate) || payload.loan.residualRate);
    add('residualColor', residual && residual.color || payload.loan.residualColor);
    const sim = payload.loan.simSettings && typeof payload.loan.simSettings === 'object' ? payload.loan.simSettings : {};
    add('paidYears', payload.loan.paidYears ?? sim.paidYears);
    add('historicalRate', payload.loan.historicalRate ?? sim.histRate);
  }

  if (payload.settings) {
    add('bankId', payload.settings.bankId);
    add('month', payload.settings.month);
    add('cardLimit', payload.settings.cardLimit);
    add('creditCardLimit', payload.settings.creditCardLimit);
    add('creditCardLimits', payload.settings.creditCardLimits);
    add('creditLimit', payload.settings.creditLimit);
    add('credit_card_limit', payload.settings.credit_card_limit);
    add('monthlyLimit', payload.settings.monthlyLimit);
    add('monthly_limit', payload.settings.monthly_limit);
    add('creditMonthlyLimit', payload.settings.creditMonthlyLimit);
    add('budget', payload.settings.budget);
    add('warning', payload.settings.warning);
    add('accountBalance', payload.settings.accountBalance);
    add('incomingAlert', payload.settings.incomingAlert);
    add('outgoingAlert', payload.settings.outgoingAlert);
  }

  if (payload.transaction) {
    add('txId', payload.transaction.id || payload.transaction.msgId);
    add('msgId', payload.transaction.msgId || payload.transaction.id);
    add('date', payload.transaction.date);
    add('amount', payload.transaction.amount);
    add('currency', payload.transaction.currency);
    add('merchant', payload.transaction.merchant);
    add('category', payload.transaction.category);
    add('card', payload.transaction.card);
    add('txType', payload.transaction.type);
    add('month', payload.transaction.month);
    add('bank', payload.transaction.bank);
    add('bankId', payload.transaction.bankId || payload.transaction.bankID);
    add('paymentKind', payload.transaction.paymentKind);
    add('variableSymbol', payload.transaction.variableSymbol || payload.transaction.vs);
    add('vs', payload.transaction.variableSymbol || payload.transaction.vs);
    add('tag', payload.transaction.tag);
    add('tagLabel', payload.transaction.tagLabel || payload.transaction.tagName);
    add('tagName', payload.transaction.tagName || payload.transaction.tagLabel);
    add('tagColor', payload.transaction.tagColor);
    add('tagShape', payload.transaction.tagShape);
    add('excludeFromSpent', payload.transaction.excludeFromSpent ? 'yes' : '');
    add('excludeFromIncome', payload.transaction.excludeFromIncome ? 'yes' : '');
    add('returnForTransactionId', payload.transaction.returnForTransactionId || '');
    add('recurringGroupId', payload.transaction.recurring_group_id || '');
    add('recurring_group_id', payload.transaction.recurring_group_id || '');
  }

  return flat;
}

function buildEndpointMutationUrl(action, payload = {}, callbackName = '') {
  const url = getCurrentWebAppUrl();
  const params = new URLSearchParams();
  const flat = flattenEndpointPayload(action, payload);
  Object.keys(flat).forEach(key => params.set(key, flat[key]));
  if (callbackName) params.set('callback', callbackName);
  params.set('_ts', String(Date.now()));
  return `${url}?${params.toString()}`;
}

function isLikelyIOSWebKit() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function getEndpointFailureDetail(action, result) {
  const data = result && result.data || {};
  const message = String(data.message || '');
  if (/login page returned|Google login page/i.test(message)) {
    const iosHint = isLikelyIOSWebKit()
      ? ' iPhone PWA nema Google cookies zo Safari. V Apps Script nastav Deploy -> Web app -> Who has access: Anyone (nie Anyone with Google account).'
      : ' V Apps Script nastav Deploy -> Web app -> Who has access: Anyone.';
    return getEndpointStatusMessage(action, 'error') + iosHint;
  }
  const jsonpProblem = data.status === 'timeout' || /JSONP|callback|script load/i.test(message);
  const postProblem = /fetch-post|Invalid JSON from Apps Script POST|Empty Apps Script response/i.test(message);
  if (!jsonpProblem && !postProblem) return getEndpointStatusMessage(action, 'error');
  const iosHint = isLikelyIOSWebKit()
    ? ' iPhone/Safari: skontroluj Apps Script /exec URL a Deploy -> Anyone. Ak appku mas na Home Screen, otvor /exec raz v Safari.'
    : ' Apps Script nevratil odpoved. Skontroluj Web App deployment /exec a access Anyone.';
  const lengthHint = data.urlLength && data.urlLength > 1800
    ? ' URL payload je dlhy (' + data.urlLength + ' znakov).'
    : '';
  return getEndpointStatusMessage(action, 'error') + iosHint + lengthHint;
}

function buildEndpointMutationBody(action, payload = {}) {
  return flattenEndpointPayload(action, payload);
}

function parseEndpointResponseText(text) {
  const raw = String(text || '').trim();
  if (!raw) return { ok: false, data: { status: 'error', message: 'Empty Apps Script response' } };
  if (/^\s*<!doctype html/i.test(raw) || /accounts\.google\.com\/signin/i.test(raw) || /ServiceLogin/i.test(raw)) {
    return { ok: false, data: { status: 'error', message: 'Google login page returned instead of JSON', ios: isLikelyIOSWebKit() } };
  }
  try {
    const data = JSON.parse(raw);
    const ok = !!data && (data.status === 'success' || data.status === 'ok');
    return { ok, data };
  } catch (_) {
    return { ok: false, data: { status: 'error', message: 'Invalid JSON from Apps Script POST', preview: raw.slice(0, 160) } };
  }
}

async function fetchEndpointRequest(action, payload = {}, timeoutMs = 15000) {
  const url = getCurrentWebAppUrl();
  if (!url) return { ok: false, data: { status: 'error', message: 'Missing Web App URL' } };

  const body = JSON.stringify(buildEndpointMutationBody(action, payload));
  let controller;
  let timer;
  try {
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      timer = window.setTimeout(() => controller.abort(), timeoutMs);
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
      signal: controller ? controller.signal : undefined
    });
    if (timer) window.clearTimeout(timer);
    return parseEndpointResponseText(await res.text());
  } catch (err) {
    if (timer) window.clearTimeout(timer);
    return { ok: false, data: { status: 'error', message: String(err && err.message || err), transport: 'fetch-post', ios: isLikelyIOSWebKit() } };
  }
}

function estimateEndpointMutationUrlLength(action, payload = {}) {
  return buildEndpointMutationUrl(action, payload, '__cb__').length;
}

function endpointPostFallbackTimeout(timeoutMs) {
  const requested = Math.max(3000, Number(timeoutMs || 15000));
  return isLikelyIOSWebKit() ? Math.min(requested, 12000) : requested;
}

async function endpointMutationRequest(action, payload = {}, timeoutMs = 15000) {
  const urlLength = estimateEndpointMutationUrlLength(action, payload);
  const jsonpSafe = urlLength <= 1800;

  if (jsonpSafe) {
    // iPhone/PWA can stall on Apps Script POST. Desktop already succeeds through
    // JSONP GET, so use the same path first whenever the payload is URL-safe.
    const jsonpResult = await jsonpEndpointRequest(action, payload, Math.min(timeoutMs, 20000));
    if (jsonpResult.ok) return jsonpResult;
    const postResult = await fetchEndpointRequest(action, payload, endpointPostFallbackTimeout(timeoutMs));
    return postResult.ok ? postResult : jsonpResult;
  }

  const postTimeout = endpointPostFallbackTimeout(timeoutMs);
  const postResult = await fetchEndpointRequest(action, payload, postTimeout);
  if (postResult.ok) return postResult;
  const jsonpResult = await jsonpEndpointRequest(action, payload, Math.min(timeoutMs, 20000));
  return jsonpResult.ok ? jsonpResult : postResult;
}

function getEndpointMutationJobKey(action, payload = {}) {
  if (action === 'deleteTransaction') {
    const id = String(payload.id || payload.msgId || '').trim();
    return id ? `delete:${id}` : '';
  }
  if (action === 'saveTransaction') {
    const tx = payload.transaction || payload;
    const id = String(tx.msgId || tx.id || '').trim();
    return id ? `save:${id}` : '';
  }
  return '';
}

function enqueueEndpointMutation(action, payload = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const jobKey = getEndpointMutationJobKey(action, payload);
    if (jobKey) {
      if (action === 'deleteTransaction') {
        const existing = endpointMutationQueue.find(job => job.key === jobKey);
        if (existing) {
          existing.waiters.push({ resolve, reject });
          return;
        }
      }
      if (action === 'saveTransaction') {
        const existingIdx = endpointMutationQueue.findIndex(job => job.key === jobKey);
        if (existingIdx >= 0) {
          const existing = endpointMutationQueue[existingIdx];
          existing.payload = payload;
          existing.timeoutMs = timeoutMs;
          existing.waiters.push({ resolve, reject });
          return;
        }
      }
    }

    endpointMutationQueue.push({
      action,
      payload,
      timeoutMs,
      key: jobKey,
      resolve,
      reject,
      waiters: []
    });
    drainEndpointMutationQueue();
  });
}

async function drainEndpointMutationQueue() {
  if (endpointMutationQueueRunning) return;
  endpointMutationQueueRunning = true;
  try {
    while (endpointMutationQueue.length) {
      const job = endpointMutationQueue.shift();
      const waiters = [{ resolve: job.resolve, reject: job.reject }, ...(job.waiters || [])];
      try {
        const result = await endpointMutationRequest(job.action, job.payload, job.timeoutMs);
        const ok = !!(result && result.ok);
        waiters.forEach(waiter => waiter.resolve(ok));
      } catch (err) {
        waiters.forEach(waiter => waiter.reject(err));
      }
    }
  } finally {
    endpointMutationQueueRunning = false;
  }
}

/* v7350: ručne pridaná transakcia NESPÚŠŤA prehľadávanie e-mailov.

   Po každom uložení sa 700 ms neskôr posielal `runParser` — celý prechod
   schránky s limitom 65 s. Pri transakcii, ktorú používateľ zapísal ručne,
   nie je čo parsovať: žiadny e-mail k nej neexistuje. Beh len zaberal ten
   istý Apps Script, do ktorého sa práve zapisovalo, a preto sa zápis do
   hárku aj zmena snímky v Balance logu objavovali s viditeľným oneskorením.

   Pri e-mailových cestách (import, synchronizácia bánk) beh ostáva. */
function queueParserRunAfterMutation(reason, options) {
  if (!isGoogleSheetsEnabled()) return;
  if (options && options.skipParserRun) return;
  if (parserRunQueueTimer) clearTimeout(parserRunQueueTimer);
  parserRunQueueTimer = setTimeout(async () => {
    parserRunQueueTimer = null;
    const now = Date.now();
    if (parserRunInFlight) return;
    if ((now - Number(parserRunLastStartAt || 0)) < 12000) return;
    parserRunInFlight = true;
    parserRunLastStartAt = now;
    try {
      await endpointMutationRequest('runParser', {
        source: 'app_mutation',
        reason: String(reason || 'save'),
        requestedAt: new Date().toISOString()
      }, 65000);
    } catch (_) {
      // Fire-and-forget parser trigger should never block UI flows.
    } finally {
      parserRunInFlight = false;
    }
  }, 700);
}

function getEndpointStatusMessage(action, state) {
  const labels = {
    saveToken: {
      pending: 'Ukladám push token do Google Sheets...',
      success: 'Push token bol uložený do Google Sheets.',
      error: 'Push token ostal iba lokálne. Google Sheets zápis zlyhal.'
    },
    disableToken: {
      pending: 'Vypínam starý push token...',
      success: 'Starý push token bol označený ako neaktívny.',
      error: 'Starý push token sa nepodarilo označiť ako neaktívny.'
    },
    saveBank: {
      pending: 'Ukladám banku do Google Sheets...',
      success: 'Banka bola uložená do Google Sheets.',
      error: 'Banka ostala lokálne. Google Sheets zápis zlyhal.'
    },
    saveBankSettings: {
      pending: 'Ukladám nastavenia banky do Google Sheets...',
      success: 'Nastavenia banky boli uložené do Google Sheets.',
      error: 'Nastavenia banky ostali lokálne. Google Sheets zápis zlyhal.'
    },
    syncDetectedBanks: {
      pending: 'Synchronizujem zistené banky...',
      success: 'Zistené banky boli zosynchronizované.',
      error: 'Synchronizácia zistených bánk zlyhala.'
    },
    saveTransaction: {
      pending: 'Ukladám transakciu do Google Sheets...',
      success: 'Transakcia bola uložená do Google Sheets.',
      error: 'Transakcia ostala lokálne. Google Sheets odpoveď neprišla včas.'
    },
    deleteTransaction: {
      pending: 'Vymazávam transakciu z Google Sheets...',
      success: 'Transakcia bola vymazaná z Google Sheets.',
      error: 'Vymazanie transakcie z Google Sheets zlyhalo.'
    }
  };
  const fallback = {
    pending: 'Ukladám zmenu do Google Sheets...',
    success: 'Zmena bola uložená do Google Sheets.',
    error: 'Google Sheets zápis zlyhal. Skontroluj deployment /exec a Executions.'
  };
  return (labels[action] && labels[action][state]) || fallback[state] || '';
}

function jsonpEndpointRequest(action, payload = {}, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const callbackName = `__btCloudCb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const endpointUrl = buildEndpointMutationUrl(action, payload, callbackName);
    let done = false;
    const cleanup = () => {
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    const finish = (ok, data) => {
      if (done) return;
      done = true;
      cleanup();
      resolve({ ok, data: data || null });
    };
    window[callbackName] = (data) => {
      const ok = !!data && (data.status === 'success' || data.status === 'ok');
      finish(ok, data);
    };
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.onerror = () => finish(false, { status: 'error', message: 'JSONP script load failed', action, urlLength: endpointUrl.length, ios: isLikelyIOSWebKit() });
    script.src = endpointUrl;
    (document.body || document.head || document.documentElement).appendChild(script);
    window.setTimeout(() => finish(false, { status: 'timeout', message: 'Google Sheets endpoint timeout or callback blocked', action, urlLength: endpointUrl.length, ios: isLikelyIOSWebKit() }), timeoutMs);
  });
}
async function testGoogleSheetsEndpointFromApp() {
  const status = document.getElementById('limits-sync-status');
  getCurrentWebAppUrl();
  if (!LIMITS_WEBAPP_URL || !isValidAppsScriptExecUrl(LIMITS_WEBAPP_URL)) {
    if (status) status.textContent = 'Najprv ulož platnú Apps Script /exec URL (zelená fajka pri poli).';
    return false;
  }
  const where = isLikelyIOSWebKit() ? 'iPhone WebKit' : 'tento prehliadač';
  if (status) status.textContent = 'Testujem Apps Script cez ' + where + '...';
  const result = await endpointMutationRequest('debugEcho', { probe: 'bank-tracker', from: where }, 20000);
  const data = result && result.data || {};
  const version = String(data.version || '').trim();
  const shortVersion = version ? version.split('_')[0] : '';
  if (result.ok) {
    if (status) {
      status.textContent = shortVersion
        ? ('Server OK (' + shortVersion + ' = verzia parsera, nie chyba). Z appky sa Apps Script dá volať — skús uložiť transakciu.')
        : ('Test OK z ' + where + '. Skús uložiť transakciu.');
    }
    return true;
  }
  if (status) status.textContent = getEndpointFailureDetail('debugEcho', result);
  return false;
}

/* ============================================================
   v7353 — životný cyklus zápisu (WORKFLOW §4, FAMILY_E)
   ============================================================
   Tento súbor mal doteraz staršiu verziu postToBankTrackerEndpoint bez
   mutationId a bez stavov. Novšia bola len v app-core.js, ktorý sa
   NENAČÍTAVA — appka teda bežala bez SyncCoordinatora, hoci ho pravidlá
   vyžadujú. Prenesené 1:1, aby oba súbory hovorili to isté.
   ============================================================ */
const ENDPOINT_WRITE_ACTIONS_V7241 = new Set([
  'saveLimits','saveBudgets','saveToken','disableToken','saveBank','saveBankCards','saveBankSettings','deleteBank',
  'saveTransaction','deleteTransaction','saveLoan','deleteLoan','saveProperty','deleteProperty','saveInsurance','deleteInsurance',
  'saveInvestment','deleteInvestment','saveInvestmentTrades','deleteInvestmentTrades','deleteInvestmentImportBatch',
  'deleteInvestmentEntity','applyInvestmentMutation','saveNetWorthSnapshot',
  /* v7351: dávkový zápis transakcií je ZÁPIS ako každý iný. Bez tohto riadku
     nedostal mutationId ani stavy local/syncing/synced/failed — čiže opakovaný
     pokus po výpadku siete išiel bez značky a životný cyklus zápisu ho vôbec
     nevidel. WORKFLOW §4 to vyžaduje pre všetky domény rovnako. */
  'saveTransactionsBatch'
]);

function endpointMutationIdV7241(action, payload = {}) {
  const existing = String(payload.mutationId || payload._mutationId || '').trim();
  if (existing) return existing;
  const random = Math.random().toString(36).slice(2, 10);
  return `mut_${String(action || 'write').replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_${Date.now()}_${random}`;
}

function endpointMutationSuccessV7241(result) {
  if (!(result && result.ok)) return false;
  const data = result.data || {};
  const status = String(data.status || '').trim().toLowerCase();
  return status !== 'error' && status !== 'failed' && status !== 'failure' && status !== 'rejected';
}

function emitEndpointMutationV7241(stage, detail = {}) {
  try {
    window.dispatchEvent(new CustomEvent('bt:endpoint-mutation', {
      detail: Object.assign({ stage, at: new Date().toISOString() }, detail)
    }));
  } catch (_) {}
}

async function postToBankTrackerEndpoint(action, payload = {}) {
  payload = payload && typeof payload === 'object' ? payload : {};
  const returnResponse = !!payload._returnResponse;
  const requestPayload = Object.assign({}, payload);
  delete requestPayload._returnResponse;
  const isWrite = ENDPOINT_WRITE_ACTIONS_V7241.has(String(action || ''));
  const mutationId = isWrite ? endpointMutationIdV7241(action, requestPayload) : String(requestPayload.mutationId || '').trim();
  if (isWrite && mutationId) {
    requestPayload.mutationId = mutationId;
    requestPayload._mutationId = mutationId;
  }

  const url = getCurrentWebAppUrl();
  const status = document.getElementById('limits-sync-status');
  const confirmWrite = !!requestPayload._confirmWrite;
  const fireAndForgetSave = !confirmWrite && (action === 'saveTransaction' || action === 'saveBank' || action === 'saveLoan');
  /* v7350: transakcia zapísaná rukou nemá e-mail, ktorý by sa dal parsovať. */
  const manualTxV7350 = action === 'saveTransaction'
    && /^manual-/i.test(String(requestPayload && requestPayload.transaction && (requestPayload.transaction.id || requestPayload.transaction.msgId) || ''));
  const useSerializedQueue = ENDPOINT_SERIALIZED_ACTIONS.has(action);
  const mutationDetail = { action: String(action || ''), mutationId, payload: requestPayload };
  const runMutation = async (mutationTimeoutMs) => {
    if (useSerializedQueue) {
      const ok = await enqueueEndpointMutation(action, requestPayload, mutationTimeoutMs);
      return { ok, result: { ok, data: ok ? { status: 'success', ok: true, mutationId } : { status: 'error', ok: false, mutationId } } };
    }
    const result = await endpointMutationRequest(action, requestPayload, mutationTimeoutMs);
    return { ok: endpointMutationSuccessV7241(result), result };
  };
  const finish = (ok, result, extra = {}) => {
    const data = result && result.data || {};
    if (isWrite) emitEndpointMutationV7241(ok ? 'synced' : 'failed', Object.assign({}, mutationDetail, extra, { ok, data }));
    const detailed = { ok, action: String(action || ''), mutationId, data, result, pending: !!extra.pending, unconfirmed: !ok };
    return returnResponse ? detailed : ok;
  };

  if (isWrite) emitEndpointMutationV7241('syncing', mutationDetail);

  if (!url) {
    console.warn('Apps Script Web App URL is not configured.');
    if (status && !fireAndForgetSave) status.textContent = 'Web App URL nie je nastavená. Dáta sú uložené iba lokálne.';
    const result = { ok: false, data: { status: 'error', message: 'Web App URL nie je nastavená.', mutationId } };
    return finish(false, result);
  }
  if (!isValidAppsScriptExecUrl(url)) {
    console.warn('Invalid Apps Script Web App URL. Use /exec deployment URL, not editor URL.');
    if (status && !fireAndForgetSave) status.textContent = 'Používaš nesprávnu Apps Script URL. Potrebuješ Web App /exec URL.';
    const result = { ok: false, data: { status: 'error', message: 'Neplatná Apps Script /exec URL.', mutationId } };
    return finish(false, result);
  }

  if (status && !fireAndForgetSave) status.textContent = getEndpointStatusMessage(action, 'pending');

  // Dlhšie investičné a účtovné zápisy musia dostať čas na zápis aj odpoveď.
  const longMutationActions = ['saveTransaction','deleteTransaction','saveBankSettings','saveInvestment','saveInvestmentTrades','deleteInvestmentTrades','applyInvestmentMutation','deleteInvestmentImportBatch','deleteInvestmentEntity'];
  const mutationTimeoutMs = isLikelyIOSWebKit() || confirmWrite || longMutationActions.includes(action) ? 60000 : 15000;
  if (fireAndForgetSave) {
    runMutation(mutationTimeoutMs).then(({ ok, result }) => {
      finish(ok, result);
      if (ok) {
        console.log('Google Sheets async mutation OK:', action, result && result.data);
        queueParserRunAfterMutation(action, { skipParserRun: manualTxV7350 });
      } else {
        console.warn('Google Sheets async mutation unconfirmed:', action, result && result.data ? result.data : {});
      }
    }).catch(err => {
      const result = { ok: false, data: { status: 'error', message: String(err && err.message || err), mutationId } };
      finish(false, result);
      console.warn('Google Sheets async mutation error:', action, err);
    });
    const pendingData = { status: 'pending', ok: true, mutationId };
    return returnResponse
      ? { ok: true, action: String(action || ''), mutationId, data: pendingData, pending: true, unconfirmed: false }
      : true;
  }

  try {
    const { ok, result } = await runMutation(mutationTimeoutMs);
    if (ok) {
      if (status) status.textContent = getEndpointStatusMessage(action, 'success');
      console.log('Google Sheets mutation OK:', action, result && result.data);
      if (action === 'saveTransaction' || action === 'saveBank' || action === 'saveLoan') queueParserRunAfterMutation(action, { skipParserRun: manualTxV7350 });
      return finish(true, result);
    }

    console.error('Google Sheets mutation unconfirmed:', action, JSON.stringify(result && result.data || {}));
    if (status) status.textContent = getEndpointFailureDetail(action, result);
    return finish(false, result);
  } catch (err) {
    const result = { ok: false, data: { status: 'error', message: String(err && err.message || err), mutationId } };
    if (status) status.textContent = getEndpointFailureDetail(action, result);
    return finish(false, result);
  }
}
/* v7353: táto verzia rieši _returnResponse sama a popri tom emituje stavy
   zápisu. Značka hovorí starším obalom, že ju nemajú obchádzať. */
try { postToBankTrackerEndpoint.__handlesReturnResponseV7353 = true; } catch (_) {}

/* ============================================================
   v7330 — nemenná značka vzniku transakcie
   ============================================================
   Poradie zápisov medzi PC a mobilom sa nedá odvodiť z dátumu transakcie
   (ten hovorí, kedy prebehla platba, nie kedy ju používateľ zapísal) ani
   z poradia doručenia (to určuje sieť). Potrebujeme okamih VZNIKU záznamu.

   Preto každá lokálne vytvorená transakcia dostane created_at v ISO UTC.
   Značka je NEMENNÁ: raz nastavená sa už neprepisuje, inak by úprava
   staršieho záznamu preskočila v poradí pred novší a backend by prepočítal
   zostatky v zlom slede.

   Pre záznamy, ktoré vznikli pred touto verziou, odvodíme čas z dátumu
   transakcie — je to najlepší dostupný odhad a je stabilný, takže sa
   poradie medzi behmi nemení. */
function btTransactionCreatedAtV7330(tx) {
  if (!tx || typeof tx !== 'object') return new Date().toISOString();
  const existing = String(tx.created_at || tx.createdAt || '').trim();
  if (existing) {
    const parsed = Date.parse(existing);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  // Staršie záznamy: stabilný odhad z dátumu transakcie, nie z aktuálneho času.
  const fallback = Date.parse(tx.rawDate || '') || Number(tx.timestamp) || 0;
  return new Date(fallback > 0 ? fallback : Date.now()).toISOString();
}

function btStampTransactionCreatedAtV7330(tx) {
  if (!tx || typeof tx !== 'object') return tx;
  if (!tx.created_at) tx.created_at = btTransactionCreatedAtV7330(tx);
  return tx;
}

function extractTxnPayload(tx) {
  const variableSymbol = String(tx.variableSymbol || tx.vs || tx.specificSymbol || '').replace(/\D/g, '').trim();
  const tagMeta = parseTransactionTagMeta(tx);
  return {
    id: tx.id || '',
    date: tx.date || '',
    amount: Number(tx.amount || 0),
    currency: tx.currency || 'CZK',
    merchant: tx.merchant || '',
    category: tx.category || '',
    card: tx.card || '',
    type: tx.type || '',
    month: tx.month || '',
    bank: tx.bank || '',
    bankId: tx.bankId || getBankKey(tx) || '',
    rawDate: tx.rawDate || '',
    paymentKind: tx.paymentKind || getTransactionPaymentKind(tx),
    msgId: tx.msgId || tx.id || '',
    variableSymbol: variableSymbol,
    vs: variableSymbol,
    tag: tagMeta ? JSON.stringify(tagMeta) : '',
    tagLabel: tagMeta ? tagMeta.name : '',
    tagName: tagMeta ? tagMeta.name : '',
    tagColor: tagMeta ? tagMeta.color : '',
    tagShape: tagMeta ? tagMeta.shape : '',
    excludeFromSpent: !!tx.excludeFromSpent,
    excludeFromIncome: !!tx.excludeFromIncome,
    returnForTransactionId: String(tx.returnForTransactionId || tx.returnForId || '').trim(),
    recurring_group_id: String(tx.recurring_group_id || '').trim() || null,
    counterpartyAccount: String(tx.counterpartyAccount || '').trim(),
    // v7330: backend podľa tejto značky zoraďuje dávku pred prepočtom.
    created_at: btTransactionCreatedAtV7330(tx)
  };
}

function askDeleteTransaction(txId) {
  if (!txId) return;

  const lang = getLanguage ? getLanguage() : 'en';
  const message = lang === 'sk'
    ? 'Vymazať túto transakciu?'
    : (lang === 'cs' ? 'Smazat tuto transakci?' : 'Delete this transaction?');

  if (confirm(message)) {
    deleteSingleTransaction(txId).then(ok => {
      if (ok) showDeletedToast();
    });
  }
}


function txEditEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function toDateInputValue(dateObj = new Date()) {
  const d = new Date(dateObj);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

function parseManualDateInput(value) {
  if (!value) return new Date();
  const raw = String(value).trim();
  const dtMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (dtMatch) {
    return new Date(Number(dtMatch[1]), Number(dtMatch[2]) - 1, Number(dtMatch[3]), Number(dtMatch[4]), Number(dtMatch[5]), 0);
  }
  const parts = raw.split('-').map(Number);
  if (parts.length === 3 && parts.every(Boolean)) {
    const now = new Date();
    return new Date(parts[0], parts[1] - 1, parts[2], now.getHours(), now.getMinutes(), 0);
  }
  return parseCustomDateStr(raw);
}

function getTxEditCategoryOptions(selectedCategory = '') {
  if (typeof getCategoryOptionsHtml === 'function') {
    return getCategoryOptionsHtml(selectedCategory);
  }

  const categories = ['Domácnosť','Potraviny','Pohonné hmoty','Reštaurácie','Káva','Doprava','Zdravie','Drogéria','Dom','Šport','Zábava','Predplatné','Oblečenie','Obuv','Jedlo','Bývanie','Lekáreň','Účet','Bankomat','Ostatné'];
  return categories.map(category => {
    const label = typeof translateCategory === 'function' ? translateCategory(category) : category;
    return `<option value="${txEditEscapeHtml(category)}" ${selectedCategory === category ? 'selected' : ''}>${txEditEscapeHtml(label)}</option>`;
  }).join('');
}

function getTxEditBankOptions(selectedValue = '') {
  if (typeof getAllBankOptions === 'function') {
    return getAllBankOptions(selectedValue);
  }

  return BANK_ORDER.map(key => {
    const name = plainBankName(key);
    return `<option value="${key}" ${selectedValue === key ? 'selected' : ''}>${txEditEscapeHtml(name)}</option>`;
  }).join('');
}

function getTxEditBankName(bankKey) {
  if (typeof getBankNameFromOption === 'function') return getBankNameFromOption(bankKey);
  return plainBankName(bankKey);
}

function getTxEditBankAccount(bankKey) {
  if (typeof getBankAccountFromOption === 'function') return getBankAccountFromOption(bankKey);
  return plainBankName(bankKey);
}


// ── SAFE TRANSACTION EDIT FROM TRANSACTIONS + RECENT LISTS ──
function getTransactionId(tx) {
  return String(tx?.id || tx?.msgId || '');
}

function findTransactionById(txId) {
  return allTransactions.find(tx => String(tx.id || tx.msgId || '') === String(txId));
}


function getEditedPaymentMeta(tx, paymentKind, direction, bankKey, bankName) {
  const kind = paymentKind || 'card';
  const isIncoming = direction === 'incoming';
  const previousKind = getTransactionPaymentKind(tx);
  const existingCard = String(tx?.card || '').trim();

  if (kind === 'cash') {
    if (isAtmCashWithdrawalTransaction(tx)) {
      const existingType = String(tx?.type || '').trim();
      const safeType = normalizePaymentKindValue(existingType) === 'internal'
        ? 'ATM cash withdrawal'
        : (existingType || 'ATM cash withdrawal');
      return {
        card: existingCard || 'Cash',
        type: safeType
      };
    }
    return {
      card: 'Cash',
      type: t('cashPaymentKind')
    };
  }

  if (kind === 'internal') {
    return {
      card: existingCard || getTxEditBankAccount(bankKey) || `Account ${bankName}`,
      type: 'Internal transfer'
    };
  }

  if (kind === 'account') {
    const customBank = getCustomBanks().find(b => b.id === bankKey);
    const account = customBank?.account || '';

    return {
      card: previousKind === 'account' && existingCard ? existingCard : (account || `Účet ${bankName}`),
      type: isIncoming ? 'príjem na účet' : 'odchod z účtu'
    };
  }

  return {
    card: previousKind === 'card' && existingCard ? existingCard : `Karta ${bankName}`,
    type: 'platba kartou'
  };
}

function hasScrolledPastNthItem(containerSelector, itemSelector, index = 19, rootElement = null) {
  const container = document.querySelector(containerSelector);
  if (!container) return false;

  const items = container.querySelectorAll(itemSelector);
  if (items.length <= index) return false;

  const target = items[index];
  const targetRect = target.getBoundingClientRect();

  if (rootElement) {
    const rootRect = rootElement.getBoundingClientRect();
    return targetRect.top < rootRect.top + 72;
  }

  return targetRect.top < 110;
}

function shouldShowScrollToLatestButton() {
  const archiveSheet = document.querySelector('#archive-bank-detail-sheet.open');
  if (archiveSheet) {
    return hasScrolledPastNthItem('#archive-bank-detail-sheet', '[data-archive-tx-id]', 19, archiveSheet);
  }

  const pageId = getActivePageId ? getActivePageId() : activePageId;

  if (pageId === 'txns') {
    return hasScrolledPastNthItem('#txn-list', '.tx-item', 19);
  }

  if (pageId === 'archive') {
    return hasScrolledPastNthItem('#archive-months-list', '.archive-item', 9);
  }

  return false;
}

function isActivePageBottomContentVisible() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return false;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;
  const doc = document.documentElement;
  const body = document.body;
  const scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
  const fullHeight = Math.max(body.scrollHeight || 0, doc.scrollHeight || 0, body.offsetHeight || 0, doc.offsetHeight || 0);
  if (!fullHeight || fullHeight <= vh + 80) return false;
  return (scrollTop + vh) >= (fullHeight - 220);
}

function isTransactionBottomContentVisible() {
  // Kept for compatibility with older calls; now dims the utility buttons near the bottom of any tab.
  return isActivePageBottomContentVisible();
}

function updateFloatingUtilityButtons() {
  const btn = document.getElementById('scroll-top-fab');
  const fab = document.getElementById('global-fab');
  const activeSheet = document.body?.dataset?.activeSheet || '';
  const hasSheetOpen = document.body.classList.contains('sheet-open') || !!document.querySelector('.bottom-sheet.open');
  const hideUtilities = hasSheetOpen || activeSheet === 'bank-manager-sheet' || !!massTagSelectMode;
  const showScroll = !hideUtilities && shouldShowScrollToLatestButton();
  const dimUtilities = !hideUtilities && isActivePageBottomContentVisible();

  if (btn) {
    btn.classList.toggle('visible', showScroll);
    btn.classList.toggle('utility-hidden', hideUtilities);
  }
  if (fab) {
    fab.classList.toggle('utility-dim', dimUtilities);
    fab.classList.toggle('utility-hidden', hideUtilities);
  }
}

function scheduleFloatingUtilityUpdate() {
  if (window.__floatingUtilityUpdateRaf) return;

  window.__floatingUtilityUpdateRaf = requestAnimationFrame(() => {
    window.__floatingUtilityUpdateRaf = null;
    updateFloatingUtilityButtons();
  });
}

function bindFloatingUtilityScrollWatchers() {
  if (window.__floatingUtilityScrollWatchersReady) return;
  window.__floatingUtilityScrollWatchersReady = true;

  window.addEventListener('scroll', scheduleFloatingUtilityUpdate, { passive: true });
  document.addEventListener('scroll', scheduleFloatingUtilityUpdate, { passive: true, capture: true });
  window.addEventListener('resize', scheduleFloatingUtilityUpdate, { passive: true });

  if (window.visualViewport) {
    visualViewport.addEventListener('resize', scheduleFloatingUtilityUpdate, { passive: true });
    visualViewport.addEventListener('scroll', scheduleFloatingUtilityUpdate, { passive: true });
  }
}


function easeOutCubicScroll(t) {
  return 1 - Math.pow(1 - t, 3);
}

function getWindowScrollTopValue() {
  return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function setWindowScrollTopValue(value) {
  window.scrollTo(0, value);
  document.documentElement.scrollTop = value;
  document.body.scrollTop = value;
}

function smoothScrollContainerToTop(target, duration = 360) {
  const isWindow = target === window || target === document || target === document.documentElement || target === document.body;
  const start = isWindow ? getWindowScrollTopValue() : Number(target?.scrollTop || 0);

  if (start <= 1) {
    if (isWindow) setWindowScrollTopValue(0);
    else if (target) target.scrollTop = 0;
    scheduleFloatingUtilityUpdate();
    return;
  }

  const startTime = performance.now();

  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const next = Math.round(start * (1 - easeOutCubicScroll(progress)));

    if (isWindow) setWindowScrollTopValue(next);
    else target.scrollTop = next;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      if (isWindow) setWindowScrollTopValue(0);
      else target.scrollTop = 0;
      scheduleFloatingUtilityUpdate();
    }
  };

  requestAnimationFrame(step);
}

function scrollToLatestVisibleTransaction() {
  const archiveSheet = document.querySelector('#archive-bank-detail-sheet.open');
  const anyOpenSheet = document.querySelector('.bottom-sheet.open');

  if (archiveSheet) {
    smoothScrollContainerToTop(archiveSheet, 360);
    return;
  }

  if (anyOpenSheet) {
    smoothScrollContainerToTop(anyOpenSheet, 360);
    return;
  }

  const pageId = getActivePageId ? getActivePageId() : activePageId;
  const activePage = document.getElementById('page-' + pageId);

  if (activePage && activePage.scrollTop > 2) {
    smoothScrollContainerToTop(activePage, 360);
  }

  smoothScrollContainerToTop(window, 380);
}

function fillEditTransactionSheet(txId) {
  const tx = findTransactionById(txId);
  if (!tx) return false;

  const amount = Number(tx.amount || 0);
  const parsed = parseCustomDateStr(tx.rawDate || tx.date);
  const bankKey = getBankKey(tx);

  document.getElementById('edit-tx-id').value = getTransactionId(tx);
  document.getElementById('edit-tx-date').value = toDateInputValue(parsed);
  document.getElementById('edit-tx-merchant').value = tx.merchant || '';
  const txVs = String(tx.variableSymbol || tx.vs || '').replace(/\D/g, '').trim();
  const editVsInput = document.getElementById('edit-tx-vs');
  if (editVsInput) editVsInput.value = txVs;
  const txTag = parseTransactionTagMeta(tx);
  const editTagInput = document.getElementById('edit-tx-tag');
  if (editTagInput) editTagInput.value = txTag?.name || '';
  const editTagColor = document.getElementById('edit-tx-tag-color');
  if (editTagColor) {
    editTagColor.value = (txTag?.color || '#58A6FF').toLowerCase();
    editTagColor.dataset.userPicked = txTag?.name ? '1' : '0';
  }
  const editTagShape = document.getElementById('edit-tx-tag-shape');
  if (editTagShape) editTagShape.value = txTag?.shape || '';
  const sourceBadge = document.getElementById('edit-tx-detect-source');
  if (sourceBadge) {
    const source = getInternalTransferDetectionSource(tx);
    sourceBadge.style.display = source ? 'inline-flex' : 'none';
    sourceBadge.textContent = source || '';
    sourceBadge.classList.toggle('source-parser', source === 'P');
    sourceBadge.classList.toggle('source-fallback', source === 'F');
    sourceBadge.title = source === 'P' ? 'Parser-detected internal transfer' : (source === 'F' ? 'Fallback-detected internal transfer' : '');
  }
  document.getElementById('edit-tx-amount').value = Math.abs(amount);
  document.getElementById('edit-tx-direction').value = amount >= 0 ? 'incoming' : 'outgoing';
  fillCurrencySelect(document.getElementById('edit-tx-currency'), tx.currency || 'CZK');

  const catSelect = document.getElementById('edit-tx-category');
  if (catSelect) {
    catSelect.innerHTML = getTxEditCategoryOptions(tx.category || 'Ostatné');
    if ([...catSelect.options].some(option => option.value === tx.category)) catSelect.value = tx.category;
  }

  const bankSelect = document.getElementById('edit-tx-bank');
  if (bankSelect) {
    bankSelect.innerHTML = getTxEditBankOptions(bankKey);
    bankSelect.value = bankKey;
  }

  const kindSelect = document.getElementById('edit-tx-kind');
  if (kindSelect) {
    kindSelect.value = isInternalTransferTransaction(tx) ? 'internal' : getTransactionPaymentKind(tx);
  }

  updateEditTransactionExcludeSpentUi(isTransactionManuallyExcludedFromSpent(tx));
  updateEditTransactionExcludeIncomeUi(isTransactionManuallyExcludedFromIncome(tx));
  updateEditTransactionStatsToggleVisibility(amount >= 0 ? 'incoming' : 'outgoing');
  updateEditReturnOffsetUi(tx);

  return true;
}

function getReturnOffsetCandidates(tx) {
  if (!tx || Number(tx.amount || 0) <= 0) return [];
  const incomingAmount = Math.abs(Number(tx.amount || 0));
  const currency = currencyCode(tx.currency || 'CZK');
  const txTime = parseCustomDateStr(tx.rawDate || tx.date)?.getTime() || Date.now();
  return (allTransactions || []).filter(other => {
    if (!other || other === tx || Number(other.amount || 0) >= 0) return false;
    if (getTransactionPaymentKind(other) !== 'account') return false;
    if (isExcludedFromSpendingStats(other)) return false;
    if (currencyCode(other.currency || 'CZK') !== currency) return false;
    if (Math.abs(Number(other.amount || 0)) + 0.01 < incomingAmount) return false;
    const otherTime = parseCustomDateStr(other.rawDate || other.date)?.getTime() || txTime;
    return Math.abs(txTime - otherTime) <= 120 * 24 * 60 * 60 * 1000;
  }).sort((a, b) => {
    const at = parseCustomDateStr(a.rawDate || a.date)?.getTime() || 0;
    const bt = parseCustomDateStr(b.rawDate || b.date)?.getTime() || 0;
    return Math.abs(txTime - at) - Math.abs(txTime - bt);
  });
}
function updateEditReturnOffsetUi(tx) {
  const wrap = document.getElementById('edit-tx-return-offset-wrap');
  const select = document.getElementById('edit-tx-return-for');
  if (!wrap || !select) return;
  const isIncomingAccount = Number(tx?.amount || 0) > 0 && getTransactionPaymentKind(tx) === 'account';
  wrap.style.display = isIncomingAccount ? '' : 'none';
  if (!isIncomingAccount) {
    select.innerHTML = `<option value="">${escapeHtml(t('notLinkedToPayment') || 'Not linked to an outgoing payment')}</option>`;
    return;
  }
  const selected = String(tx.returnForTransactionId || tx.returnForId || '').trim();
  const options = getReturnOffsetCandidates(tx);
  select.innerHTML = `<option value="">${escapeHtml(t('notLinkedToPayment') || 'Not linked to an outgoing payment')}</option>` + options.map(other => {
    const id = getTransactionId(other);
    const label = `${other.date || ''} · ${other.merchant || t('transaction')} · -${formatCurrencyAmount(Math.abs(Number(other.amount || 0)), other.currency || 'CZK')}`;
    return `<option value="${escapeAttr(id)}" ${id === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
  if (selected && [...select.options].some(option => option.value === selected)) select.value = selected;
}

function refreshEditReturnOffsetCandidates() {
  const txId = document.getElementById('edit-tx-id')?.value || '';
  const tx = findTransactionById(txId);
  if (!tx) return;
  const direction = document.getElementById('edit-tx-direction')?.value || (Number(tx.amount || 0) >= 0 ? 'incoming' : 'outgoing');
  const amount = Math.abs(Number(document.getElementById('edit-tx-amount')?.value || tx.amount || 0));
  const kind = document.getElementById('edit-tx-kind')?.value || getTransactionPaymentKind(tx);
  const currency = document.getElementById('edit-tx-currency')?.value || tx.currency || 'CZK';
  updateEditTransactionStatsToggleVisibility(direction);
  updateEditReturnOffsetUi({ ...tx, amount: direction === 'incoming' ? amount : -amount, paymentKind: kind, currency });
}

function updateEditTransactionStatsToggleVisibility(direction) {
  const incoming = String(direction || '') === 'incoming';
  const spentCard = document.querySelector('#transaction-edit-sheet .tx-non-spent-toggle-card');
  const incomeCard = document.querySelector('#transaction-edit-sheet .tx-non-income-toggle-card');
  if (spentCard) spentCard.hidden = incoming;
  if (incomeCard) incomeCard.hidden = !incoming;
}

function updateEditTransactionExcludeSpentUi(excluded) {
  const toggle = document.getElementById('edit-tx-exclude-spent-switch');
  const card = document.querySelector('#transaction-edit-sheet .tx-non-spent-toggle-card');
  if (!toggle) return;
  const active = !!excluded;
  toggle.classList.toggle('on', active);
  toggle.dataset.excluded = active ? '1' : '0';
  toggle.setAttribute('aria-checked', active ? 'true' : 'false');
  if (card) card.classList.toggle('on', active);
}

function updateEditTransactionExcludeIncomeUi(excluded) {
  const toggle = document.getElementById('edit-tx-exclude-income-switch');
  const card = document.querySelector('#transaction-edit-sheet .tx-non-income-toggle-card');
  if (!toggle) return;
  const active = !!excluded;
  toggle.classList.toggle('on', active);
  toggle.dataset.excluded = active ? '1' : '0';
  toggle.setAttribute('aria-checked', active ? 'true' : 'false');
  if (card) card.classList.toggle('on', active);
}

function applyTransactionExcludedVisualState(tx) {
  if (!tx) return;
  const txId = String(tx.id || tx.msgId || '').trim();
  if (!txId) return;
  const excluded = isExcludedFromSpendingStats(tx);
  const manualNonSpent = isTransactionManuallyExcludedFromSpent(tx);
  const manualNonIncome = isTransactionManuallyExcludedFromIncome(tx);
  const manualExcluded = manualNonSpent || manualNonIncome;
  document.querySelectorAll('.tx-item[data-tx-id]').forEach(row => {
    if (String(row.dataset.txId || '').trim() !== txId) return;
    row.classList.toggle('tx-credit-repayment', excluded);
    row.classList.toggle('tx-manual-non-spent', manualNonSpent);
    row.classList.toggle('tx-manual-non-income', manualNonIncome);
    const amount = row.querySelector('.tx-amount');
    if (amount) {
      amount.classList.toggle('amount-neutral', excluded && !manualExcluded);
      amount.classList.toggle('amount-income', (!excluded || manualExcluded) && Number(tx.amount || 0) > 0);
      amount.classList.toggle('amount-expense', (!excluded || manualExcluded) && Number(tx.amount || 0) < 0);
    }
  });
}

function syncEditTransactionStatsExclusionsToBackend(tx) {
  if (!tx) return;
  postToBankTrackerEndpoint('saveTransaction', { transaction: extractTxnPayload(tx) });
}

function syncEditTransactionExcludeSpentToBackend(tx) {
  syncEditTransactionStatsExclusionsToBackend(tx);
}

function applyEditTransactionExcludeSpent(excluded) {
  const txId = document.getElementById('edit-tx-id')?.value || '';
  const tx = findTransactionById(txId);
  if (!tx) return;

  const next = !!excluded;
  const prev = isTransactionManuallyExcludedFromSpent(tx);
  updateEditTransactionExcludeSpentUi(next);
  if (prev === next) return;

  const oldSnapshot = { ...tx, excludeFromSpent: prev };
  tx.excludeFromSpent = next;
  const kindSelect = document.getElementById('edit-tx-kind');
  if (kindSelect) kindSelect.value = getTransactionPaymentKind(tx);

  invalidateTransactionStatsAdjustments();
  applyLocalArchiveStatsFromTransaction(oldSnapshot, -1);
  applyLocalArchiveStatsFromTransaction(tx, 1);
  rebuildLocalArchiveStatsFromTransactions({ force: true });
  saveCachedTransactionsSnapshot();
  renderAll();
  applyTransactionExcludedVisualState(tx);

  syncEditTransactionExcludeSpentToBackend(tx);
}

function toggleEditTransactionExcludeSpent() {
  const toggle = document.getElementById('edit-tx-exclude-spent-switch');
  if (!toggle) return;
  const next = toggle.dataset.excluded !== '1';
  applyEditTransactionExcludeSpent(next);
}

function applyEditTransactionExcludeIncome(excluded) {
  const txId = document.getElementById('edit-tx-id')?.value || '';
  const tx = findTransactionById(txId);
  if (!tx) return;

  const next = !!excluded;
  const prev = isTransactionStatsFlagEnabled(tx.excludeFromIncome)
    || (Number(tx.amount || 0) > 0 && isTransactionStatsFlagEnabled(tx.excludeFromSpent));
  updateEditTransactionExcludeIncomeUi(next);
  if (prev === next) return;

  const oldSnapshot = { ...tx, excludeFromIncome: prev };
  tx.excludeFromIncome = next;
  if (Number(tx.amount || 0) > 0) tx.excludeFromSpent = false;

  invalidateTransactionStatsAdjustments();
  applyLocalArchiveStatsFromTransaction(oldSnapshot, -1);
  applyLocalArchiveStatsFromTransaction(tx, 1);
  rebuildLocalArchiveStatsFromTransactions({ force: true });
  saveCachedTransactionsSnapshot();
  renderAll();
  applyTransactionExcludedVisualState(tx);

  syncEditTransactionStatsExclusionsToBackend(tx);
}

function toggleEditTransactionExcludeIncome() {
  const toggle = document.getElementById('edit-tx-exclude-income-switch');
  if (!toggle) return;
  const next = toggle.dataset.excluded !== '1';
  applyEditTransactionExcludeIncome(next);
}

function openTransactionEditSheet(txId) {
  if (!fillEditTransactionSheet(txId)) return;
  openSheet('transaction-edit-sheet');
}

async function saveEditedTransaction() {
  const txId = document.getElementById('edit-tx-id')?.value || '';
  const tx = findTransactionById(txId);
  if (!tx) return;

  const parsedDate = parseManualDateInput(document.getElementById('edit-tx-date')?.value || '');
  const amountRaw = parseFloat(document.getElementById('edit-tx-amount')?.value || '0') || 0;
  const direction = document.getElementById('edit-tx-direction')?.value || 'outgoing';
  const currency = normalizeCurrencyForStorage(document.getElementById('edit-tx-currency')?.value || tx.currency || 'Kč');
  const category = document.getElementById('edit-tx-category')?.value || tx.category || 'Ostatné';
  const merchant = document.getElementById('edit-tx-merchant')?.value.trim() || tx.merchant || '';
  const bankKey = document.getElementById('edit-tx-bank')?.value || getBankKey(tx);
  const returnForTransactionId = direction === 'incoming' ? String(document.getElementById('edit-tx-return-for')?.value || '').trim() : '';
  const excludeFromSpent = direction === 'outgoing' && document.getElementById('edit-tx-exclude-spent-switch')?.dataset?.excluded === '1';
  const excludeFromIncome = direction === 'incoming' && !returnForTransactionId && document.getElementById('edit-tx-exclude-income-switch')?.dataset?.excluded === '1';
  const paymentKind = returnForTransactionId ? 'account' : (document.getElementById('edit-tx-kind')?.value || getTransactionPaymentKind(tx));
  const variableSymbol = String(document.getElementById('edit-tx-vs')?.value || tx.variableSymbol || tx.vs || '').replace(/\D/g, '').trim();
  const tagLabel = normalizeTransactionTagLabel(document.getElementById('edit-tx-tag')?.value || tx.tagLabel || tx.tagName || '');
  const editTagColorInput = document.getElementById('edit-tx-tag-color');
  const tagShapeRaw = document.getElementById('edit-tx-tag-shape')?.value || '';
  const tagValidation = validateRequiredTagFields(
    tagLabel,
    tagShapeRaw,
    editTagColorInput?.value || tx.tagColor || '#58A6FF',
    editTagColorInput?.dataset?.userPicked || (tx.tagLabel ? '1' : '0'),
    'edit'
  );
  if (!tagValidation.ok) { alert(tagValidation.message); return; }
  const tagColor = tagLabel ? tagValidation.color : '';
  const tagShape = tagLabel ? tagValidation.shape : '';
  const finalAmount = direction === 'incoming' ? Math.abs(amountRaw) : -Math.abs(amountRaw);
  const oldTxSnapshot = { ...tx };
  const bankName = getTxEditBankName(bankKey);
  const paymentMeta = getEditedPaymentMeta({ ...tx, category }, paymentKind, direction, bankKey, bankName);

  tx.date = formatDate(parsedDate);
  tx.rawDate = parsedDate.toISOString();
  tx.timestamp = parsedDate.getTime();
  tx.month = getMonthFromDate(parsedDate); // v115 auto archive month after edit
  tx.amount = finalAmount;
  tx.currency = currency;
  tx.category = category;
  tx.merchant = merchant;
  tx.merchantRaw = merchant;
  tx.bank = bankName;
  tx.bankId = bankKey;
  tx.card = paymentMeta.card;
  tx.type = paymentMeta.type;
  tx.paymentKind = paymentKind;
  tx.variableSymbol = variableSymbol;
  tx.vs = variableSymbol;
  tx.tagLabel = tagLabel;
  tx.tagName = tagLabel;
  tx.tagColor = tagColor;
  tx.tagShape = tagShape;
  tx.tagMeta = tagLabel ? { name: tagLabel, color: tagColor, shape: tagShape } : null;
  tx.tag = tagLabel ? JSON.stringify({ name: tagLabel, color: tagColor, shape: tagShape }) : '';
  tx.excludeFromSpent = excludeFromSpent;
  tx.excludeFromIncome = excludeFromIncome;
  tx.returnForTransactionId = returnForTransactionId;
  tx.msgId = tx.msgId || tx.id;

  invalidateTransactionStatsAdjustments();
  allTransactions = sortTransactionsNewestFirst(allTransactions);
  applyLocalArchiveStatsFromTransaction(oldTxSnapshot, -1);
  applyLocalArchiveStatsFromTransaction(tx, 1);
  const oldMonth = normalizeMonthStr(oldTxSnapshot.month || getAktuálneMonth());
  const newMonth = normalizeMonthStr(tx.month || getAktuálneMonth());
  recomputeAccountBalancesForMonth(oldMonth);
  if (newMonth !== oldMonth) recomputeAccountBalancesForMonth(newMonth);
  rebuildLocalArchiveStatsFromTransactions({ force: true });
  saveCachedTransactionsSnapshot();

  closeBottomSheets();
  renderAll();
  applyTransactionExcludedVisualState(tx);
  const ok = await postToBankTrackerEndpoint('saveTransaction', { transaction: extractTxnPayload(tx) });
  if (ok) {
    showSavedToast();
  } else {
    showLargeStatusToast(t('transactionSyncDelayed') || 'Saved locally. Google Sheets response was delayed.', 'warning');
  }
}

async function deleteEditedTransaction() {
  const txId = document.getElementById('edit-tx-id')?.value || '';
  if (!txId) return;
  if (!confirm(t('deleteTransactionConfirm'))) return;

  closeBottomSheets();
  const ok = await deleteSingleTransaction(txId);
  if (ok) {
    showDeletedToast();
  } else {
    showLargeStatusToast(t('transactionDeleteFailed') || 'Transaction was not deleted.', 'error');
  }
}
function isTouchLikeDevice() {
  return !!(window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) || ('ontouchstart' in window);
}

function bindTransactionDeleteGestures() {
  document.querySelectorAll('[data-tx-id]').forEach(el => {
    if (el.dataset.deleteBound === 'true') return;
    el.dataset.deleteBound = 'true';
    el.classList.add('long-press-ready');

    el.addEventListener('touchstart', (event) => {
      if (massTagSelectMode) return;
      if (event.target.closest && event.target.closest('button')) return;
      txLongPressTargetId = el.dataset.txId;
      txLongPressTimer = setTimeout(() => {
        el.classList.add('tx-open-hint');
        navigator.vibrate?.(35);
        openTransactionEditSheet(txLongPressTargetId);
        setTimeout(() => el.classList.remove('tx-open-hint'), 500);
      }, 650);
    }, { passive: true });

    el.addEventListener('touchend', () => {
      clearTimeout(txLongPressTimer);
      txLongPressTimer = null;
    }, { passive: true });

    el.addEventListener('touchcancel', () => {
      clearTimeout(txLongPressTimer);
      txLongPressTimer = null;
    }, { passive: true });

    el.addEventListener('touchmove', () => {
      clearTimeout(txLongPressTimer);
      txLongPressTimer = null;
    }, { passive: true });

    el.addEventListener('dblclick', (e) => {
      if (massTagSelectMode) return;
      if (isTouchLikeDevice()) return;
      if (e.target.closest && e.target.closest('button')) return;
      e.preventDefault();
      el.classList.add('tx-open-hint');
      setTimeout(() => el.classList.remove('tx-open-hint'), 220);
      openTransactionEditSheet(el.dataset.txId);
    });
  });
}

function getActivePageId() {
  const active = document.querySelector('.page.active');
  return active ? active.id.replace('page-', '') : 'overview';
}

function navigateBySwipe(deltaX) {
  // v78: swipe navigation disabled.
}

function shouldIgnorePageSwipeTarget(target) {
  if (!target) return false;
  return !!target.closest(
    'button, input, select, textarea, a, .bottom-sheet, .bottom-nav, .cat-chip, .txn-filter-pill, .sync-btn, .fab, .top-upgrade-btn, .sheet-close, .tx-item, .tx-item-compact'
  );
}

function initPageSwipeNavigation() {
  // v89: swipe navigation remains disabled for smooth mobile performance.
}

function getAppTheme() {
  const saved = localStorage.getItem('app_theme');
  return saved === 'light' ? 'light' : 'dark';
}

function updateThemeMeta(theme) {
  const config = APP_THEMES[theme] || APP_THEMES.dark;

  let metas = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
  if (!metas.length) {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
    metas = [meta];
  }

  metas.forEach(meta => {
    meta.setAttribute('content', config.themeColor);
  });

  let navMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
  if (!navMeta) {
    navMeta = document.createElement('meta');
    navMeta.setAttribute('name', 'msapplication-navbutton-color');
    document.head.appendChild(navMeta);
  }
  navMeta.setAttribute('content', config.themeColor);

  let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (!colorSchemeMeta) {
    colorSchemeMeta = document.createElement('meta');
    colorSchemeMeta.setAttribute('name', 'color-scheme');
    document.head.appendChild(colorSchemeMeta);
  }
  colorSchemeMeta.setAttribute('content', config.colorScheme);

  document.documentElement.style.colorScheme = config.colorScheme;
  document.body.style.colorScheme = config.colorScheme;
  document.documentElement.style.backgroundColor = config.backgroundColor;
  document.body.style.backgroundColor = config.backgroundColor;
  document.documentElement.style.setProperty('--system-bar-color', config.backgroundColor);
  document.documentElement.style.setProperty('--status-bar-color', config.backgroundColor);

  const statusOverlay = document.getElementById('bt-status-bar-overlay');
  if (statusOverlay) statusOverlay.style.background = config.backgroundColor;

  const androidBarBg = document.querySelector('.android-system-bar-bg');
  if (androidBarBg) androidBarBg.style.background = config.backgroundColor;
}

function applyAppTheme(theme = getAppTheme()) {
  const normalized = theme === 'light' ? 'light' : 'dark';
  localStorage.setItem('app_theme', normalized);
  document.documentElement.setAttribute('data-theme', normalized);
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(normalized);
  const overlay = document.getElementById('page-loading-overlay');
  if (overlay) {
    overlay.classList.remove('dark', 'light');
    overlay.classList.add(normalized);
  }
  updateThemeMeta(normalized);

  const darkBtn = document.getElementById('theme-dark-btn');
  const lightBtn = document.getElementById('theme-light-btn');
  if (darkBtn) darkBtn.classList.toggle('active', normalized === 'dark');
  if (lightBtn) lightBtn.classList.toggle('active', normalized === 'light');
  try { refreshBtBrandLogosForTheme(); } catch (_) {}
}

function setAppTheme(theme) {
  localStorage.setItem('app_theme_user_selected', 'true');
  applyAppTheme(theme);
  // Avoid full renderAll() on every theme click (heavy on mobile).
  requestAnimationFrame(() => {
    try {
      if (activePageId === 'txns') {
        updateTxnPage();
      } else if (activePageId === 'archive') {
        renderArchive();
        renderArchiveTrendChart();
      } else if (activePageId === 'overview' || activePageId === 'overview-details') {
        renderOverviewDashboard();
        renderBudgetStatus();
        renderAccountBalanceWidget();
      }
      scheduleFloatingUtilityUpdate();
    } catch (_) {}
  });
}

function warmHeavyTabCachesSync(options = {}) {
  startupWarmCachesDone = true;
  // B (perf): only force a full archive-stats rebuild when explicitly requested.
  // On a normal refresh the cached stats are reused (rebuild self-skips when fresh),
  // which removes a large synchronous localStorage scan + per-transaction conversion pass.
  try { rebuildLocalArchiveStatsFromTransactions({ force: !!(options && options.force) }); } catch (e) {
    console.warn('Archive stats warm-up failed:', e);
  }
  try {
    markLocalCacheTimestamp('cached_archive_stats_updated_at');
    markLocalCacheTimestamp('cached_archive_chart_updated_at');
  } catch (_) {}
}

function warmStartupCachesDeferred(options = {}) {
  warmHeavyTabCachesSync(options);
}

function yieldStartupLogoFrames(frameCount = 2) {
  if (typeof window.__btYieldLogoFrames === 'function') {
    return window.__btYieldLogoFrames(frameCount);
  }
  return new Promise((resolve) => {
    const count = Math.max(1, Number(frameCount) || 1);
    let remaining = count;
    const next = () => requestAnimationFrame(() => window.setTimeout(() => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else next();
    }, 0));
    next();
  });
}

function scheduleStartupCacheWarmup() {
  const run = () => {
    try { warmHeavyTabCachesSync({ force: false }); } catch (_) {}
  };
  // Never let cache warm-up steal the final visible logo cycle. Start looking
  // for idle time only after the overlay fade and page reveal have completed.
  window.setTimeout(() => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 4000 });
    } else {
      window.setTimeout(run, 600);
    }
  }, 1200);
}
const BT_EARLY_SHELL_REVEAL = true;
let __btBootDataHydrating = false;
let __btEarlyShellRevealed = false;
let __btBootNumbersReady = false;

function isBankStyleBootEnabled() {
  return window.__btBankStyleBoot === true;
}

function isEarlyShellRevealEnabled() {
  return BT_EARLY_SHELL_REVEAL === true || window.__btBankStyleBoot === true;
}

function areBootOverviewNumbersReady() {
  if (__btBootNumbersReady) return true;
  try {
    const header = document.getElementById('header-month');
    const net = document.getElementById('overview-net-worth');
    const cash = document.getElementById('overview-available-cash');
    if (!header || !net || !cash) return false;
    if (!String(header.textContent || '').trim()) return false;
    // Painted once applyOverviewBalanceEl wrote dataset.balanceValue.
    if (net.dataset.balanceValue == null || cash.dataset.balanceValue == null) return false;
    return true;
  } catch (_) {
    return false;
  }
}

function paintBootOverviewNumbers() {
  try {
    const headerMonth = document.getElementById('header-month');
    if (headerMonth) headerMonth.textContent = getMonthLabel();
    updateOverviewMonthNavState();
  } catch (_) {}
  try {
    window.__overviewBalanceAnimateNext = false;
    renderOverviewDashboard();
  } catch (e) {
    document.documentElement.setAttribute('data-render-overview-error', String(e && e.message ? e.message : e));
    console.error('Boot overview numbers render failed:', e);
  }
  __btBootNumbersReady = areBootOverviewNumbersReady();
  if (__btBootNumbersReady) {
    document.documentElement.setAttribute('data-boot-numbers', 'ready');
  }
  return __btBootNumbersReady;
}

function isEarlyShellRevealReady() {
  if (!isEarlyShellRevealEnabled()) return false;
  if (__btEarlyShellRevealed || !__appBootActive || __appBootSequenceRunning) return false;
  // Bank-style: do not block shell on lazy feature modules.
  if (!isBankStyleBootEnabled() && window.__btLazyStartupReady === false) return false;
  if (!document.getElementById('header-month') || !document.getElementById('page-overview')) return false;
  // Bank-style: wait for 2 complete logo cycles AND stable overview numbers.
  if (isBankStyleBootEnabled()) {
    if (!window.__btSplashBrandCyclesComplete) return false;
    if (!areBootOverviewNumbersReady()) return false;
  }
  return true;
}

function attemptEarlyShellReveal() {
  if (!isEarlyShellRevealReady()) {
    // Stale boundary hint must not force a mid-cycle cut later.
    if (window.__btSplashRevealOnBoundary) window.__btSplashRevealOnBoundary = false;
    if (isBankStyleBootEnabled() && !window.__btSplashBrandCyclesComplete) {
      window.addEventListener('bt:splash-brand-cycles-complete', () => {
        try { attemptEarlyShellReveal(); } catch (_) {}
      }, { once: true });
    }
    return false;
  }
  __btEarlyShellRevealed = true;
  document.documentElement.setAttribute('data-boot-mode', isBankStyleBootEnabled() ? 'bank-style' : 'early-shell');
  try { finalizeAppBootPresentation(); } catch (_) {}
  return true;
}

async function runBootDataHydration(ctx = {}) {
  const { loaderFailSafe } = ctx;
  try {
    document.body.classList.add('app-boot-hydrating');
    if (SHEETS_URL && isGoogleSheetsEnabled()) {
      await new Promise((resolve) => {
        window.setTimeout(() => {
          runStartupCloudSync().finally(resolve);
        }, 180);
      });
    } else {
      if (!SHEETS_URL) {
        const loadStatus = document.getElementById('limits-sync-status');
        if (loadStatus) {
          loadStatus.textContent = isLocalOfflineDemoMode()
            ? 'Local demo mode — widget test data loaded from localhost seed.'
            : (isMobileOrStandaloneClient()
              ? 'Na mobile treba v Settings zadať Google Sheets URL (ukladá sa zvlášť pre každé zariadenie).'
              : 'Google Sheets URL is empty. Paste/save the Sheets URL in Settings to load Overview details.');
        }
      }
      try {
        if (isLocalOfflineDemoMode()) {
          const seeded = seedBankTrackerLocalTestData(shouldAutoSeedLocalWidgetDemo() || !allTransactions.length);
          if (!seeded) {
            applyLocalWidgetDemoAlertLimits(getAktuálneMonth());
            window.setTimeout(() => {
              try {
                if (typeof runSubscriptionDetectionPipeline === 'function') runSubscriptionDetectionPipeline({ reason: 'local-boot' });
              } catch (_) {}
            }, 1400);
          }
        }
      } catch (e) {
        document.documentElement.setAttribute('data-local-test-seed', 'error');
        document.documentElement.setAttribute('data-local-test-seed-error', String(e && e.message ? e.message : e));
        console.error('Local test data seed failed:', e);
      }
    }
    try { prepareUiAfterDataLoad({ render: false }); } catch (_) {}
    // Paint header + net worth + cash behind the splash so reveal has no number jumps.
    try {
      paintBootOverviewNumbers();
      renderAll({
        visibleOnly: true,
        deferHeavy: true,
        overviewMode: 'numbers-first',
      });
      paintBootOverviewNumbers();
    } catch (_) {}
    try { applyLanguage(); } catch (_) {}
    try { attemptEarlyShellReveal(); } catch (_) {}

    // Charts/widgets only after the shell is visible (or after a short wait if reveal is gated on cycles).
    const runCharts = () => {
      try {
        renderAll({
          visibleOnly: true,
          deferHeavy: false,
          overviewMode: 'charts',
        });
      } catch (_) {}
    };
    if (__btEarlyShellRevealed) {
      await yieldStartupLogoFrames(1);
      runCharts();
    } else {
      window.addEventListener('bt:splash-brand-cycles-complete', () => {
        window.setTimeout(runCharts, 80);
      }, { once: true });
      window.setTimeout(() => {
        if (!__btEarlyShellRevealed) runCharts();
      }, 5200);
    }
  } catch (e) {
    console.error('Boot data hydration failed:', e);
    try {
      if (!allTransactions.length) loadCachedTransactionsSnapshot();
    } catch (_) {}
    try {
      paintBootOverviewNumbers();
      renderAll({ visibleOnly: true, deferHeavy: false });
    } catch (_) {}
  } finally {
    if (loaderFailSafe) clearTimeout(loaderFailSafe);
    document.body.classList.remove('app-boot-hydrating');
    try { __overviewChartsDataSettled = true; } catch (_) {}
    try { finishOverviewChartRenderCycle(); } catch (_) {}
    __btBootDataHydrating = false;
    document.documentElement.setAttribute('data-boot-hydration', 'done');
    scheduleStartupCacheWarmup();
    if (!__btEarlyShellRevealed) {
      try { attemptEarlyShellReveal(); } catch (_) {}
      try { finalizeAppBootPresentation(); } catch (_) {}
    }
    if (!SHEETS_URL) {
      const loadStatus = document.getElementById('limits-sync-status');
      if (loadStatus) loadStatus.textContent = 'Google Sheets URL is empty for this localhost origin. Paste/save the Sheets URL in Settings to load Overview details.';
      console.warn('Google Sheets sync skipped on startup: missing sheets_url for this origin.');
    }
  }
}

function startAppBootAfterSplashCycle() {
  if (__btColdBootStarted) return;
  __btColdBootStarted = true;
  __appBootActive = true;
  __bootPresentationPhase = true;
  beginLoadingPresentation({ kind: 'boot' });

  const loaderFailSafe = setTimeout(() => {
    try { finalizeAppBootPresentation(); } catch (_) {}
    scheduleStartupCacheWarmup();
  }, APP_BOOT_MAX_MS);

  const yieldStartupFrame = () => yieldStartupLogoFrames(isBankStyleBootEnabled() ? 1 : 2);

  const runStartupBootstrap = async () => {
  try {
    // Bank-style: hydrate numbers behind the 2 logo cycles, then reveal on cycle boundary.
    if (isBankStyleBootEnabled()) {
      try { ensureHeaderBrandLogoMarkup(); } catch (_) {}
      try { initBottomSheetDragToClose(); } catch (_) {}
      try { initGlobalPullDownControl(); } catch (_) {}
      try { initPullToRefresh(); } catch (_) {}
      try { initTabHistory(); } catch (_) {}
      try { initNavTouchFeedback(); } catch (_) {}
      try { initMassTagSelectDelegation(); } catch (_) {}
      try { updateFloatingUtilityButtons(); } catch (_) {}
      try { bindFloatingUtilityScrollWatchers(); } catch (_) {}
      applyAppTheme(getAppTheme());
      clearDemoTransactionsCacheIfNeeded();
      migrateCurrencyStorageToSymbols();
      updateGoogleSheetsToggleUi();
      ensureDefaultConfig();
      clearCloudFirstLocalData();
      try { markOverviewChartsAwaitingFreshData(); } catch (_) {}
      bootstrapUiFromCache({ deferHeavy: true, skipHideBoot: true, render: false });
      try { paintBootOverviewNumbers(); } catch (_) {}
      __btBootDataHydrating = true;
      document.documentElement.setAttribute('data-boot-hydration', 'pending');
      window.addEventListener('bt:splash-brand-cycles-complete', () => {
        try { attemptEarlyShellReveal(); } catch (_) {}
      }, { once: true });
      runBootDataHydration({ loaderFailSafe });
      return;
    }

    // Every startup group enters through the shared logo-frame queue. Core,
    // feature modules and data bootstrap can no longer bunch into one frame.
    await yieldStartupFrame();
    try { ensureHeaderBrandLogoMarkup(); } catch (_) {}
    try { initBottomSheetDragToClose(); } catch (_) {}
    try { initGlobalPullDownControl(); } catch (_) {}
    await yieldStartupFrame();
    try { initPullToRefresh(); } catch (_) {}
    try { initTabHistory(); } catch (_) {}
    await yieldStartupFrame();
    try { initNavTouchFeedback(); } catch (_) {}
    try { initMassTagSelectDelegation(); } catch (_) {}
    await yieldStartupFrame();
    try { updateFloatingUtilityButtons(); } catch (_) {}
    try { bindFloatingUtilityScrollWatchers(); } catch (_) {}
    await yieldStartupFrame();
    applyAppTheme(getAppTheme());
    clearDemoTransactionsCacheIfNeeded();
    await yieldStartupFrame();
    migrateCurrencyStorageToSymbols();
    updateGoogleSheetsToggleUi();
    ensureDefaultConfig();
    clearCloudFirstLocalData();
    try { markOverviewChartsAwaitingFreshData(); } catch (_) {}
    await yieldStartupFrame();
    // Load the cached model only. Rendering it behind the splash and then
    // rendering fresh data again caused the visible second-cycle hitch.
    bootstrapUiFromCache({ deferHeavy: true, skipHideBoot: true, render: false });
    await yieldStartupFrame();

    if (isEarlyShellRevealEnabled()) {
      __btBootDataHydrating = true;
      document.documentElement.setAttribute('data-boot-hydration', 'pending');
      if (!attemptEarlyShellReveal()) {
        window.addEventListener('bt:lazy-startup-ready', () => {
          try { attemptEarlyShellReveal(); } catch (_) {}
        }, { once: true });
      }
      runBootDataHydration({ loaderFailSafe });
      return;
    }

    if (SHEETS_URL && isGoogleSheetsEnabled()) {
      window.setTimeout(() => {
        runStartupCloudSync()
          .finally(() => {
            if (!__appBootActive) clearTimeout(loaderFailSafe);
            else finalizeAppBootPresentation();
            scheduleStartupCacheWarmup();
          });
      }, 180);
      return;
    }

    clearTimeout(loaderFailSafe);

    if (!SHEETS_URL) {
      const loadStatus = document.getElementById('limits-sync-status');
      if (loadStatus) {
        loadStatus.textContent = isLocalOfflineDemoMode()
          ? 'Local demo mode — widget test data loaded from localhost seed.'
          : (isMobileOrStandaloneClient()
            ? 'Na mobile treba v Settings zadať Google Sheets URL (ukladá sa zvlášť pre každé zariadenie).'
            : 'Google Sheets URL is empty. Paste/save the Sheets URL in Settings to load Overview details.');
      }
    }

    try {
      if (isLocalOfflineDemoMode()) {
        const seeded = seedBankTrackerLocalTestData(shouldAutoSeedLocalWidgetDemo() || !allTransactions.length);
        if (!seeded) {
          applyLocalWidgetDemoAlertLimits(getAktuálneMonth());
          window.setTimeout(() => {
            try {
              if (typeof runSubscriptionDetectionPipeline === 'function') runSubscriptionDetectionPipeline({ reason: 'local-boot' });
            } catch (_) {}
          }, 1400);
        }
      }
    } catch (e) {
      document.documentElement.setAttribute('data-local-test-seed', 'error');
      document.documentElement.setAttribute('data-local-test-seed-error', String(e && e.message ? e.message : e));
      console.error('Local test data seed failed:', e);
    }
    await yieldStartupFrame();
    try { prepareUiAfterDataLoad({ render: false }); } catch (_) {}
    await yieldStartupFrame();
    try { renderAll({ visibleOnly: true, deferHeavy: true }); } catch (_) {}
    await yieldStartupFrame();
    try { applyLanguage(); } catch (_) {}
    try { __overviewChartsDataSettled = true; } catch (_) {}
    finalizeAppBootPresentation();
    scheduleStartupCacheWarmup();
    if (!SHEETS_URL) {
      const loadStatus = document.getElementById('limits-sync-status');
      if (loadStatus) loadStatus.textContent = 'Google Sheets URL is empty for this localhost origin. Paste/save the Sheets URL in Settings to load Overview details.';
      console.warn('Google Sheets sync skipped on startup: missing sheets_url for this origin.');
    }
  } catch (e) {
    console.error('Startup bootstrap failed:', e);
    try {
      if (!allTransactions.length) loadCachedTransactionsSnapshot();
    } catch (_) {}
    try { __overviewChartsDataSettled = true; } catch (_) {}
    finalizeAppBootPresentation();
    scheduleStartupCacheWarmup();
  }
  };

  runStartupBootstrap();
}

function scheduleAppBootAfterDomReady() {
  // Bank-style: hydrate behind the logo as soon as core is ready.
  if (window.__btBankStyleBoot || window.__btSplashInitialCycleComplete) {
    startAppBootAfterSplashCycle();
    return;
  }
  window.addEventListener('bt:splash-first-cycle-complete', startAppBootAfterSplashCycle, { once: true });
}