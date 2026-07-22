// Generated app-core slice 27/34 (declarations).

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
  const totalsRow = renderArchiveMonthTotalsRowHtml(visibleBankKeys, mStr);
  const header = `<div class="archive-bank-spent-header"><div>${t('bank')}</div><div>${t('spent')}</div><div>${t('income')}</div></div>`;
  return `<div class="archive-item archive-item-spent-layout"><div class="archive-month-top">${formatMonthString(mStr)}</div><div class="archive-spent-table">${header}${rows}${totalsRow}</div></div>`;
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