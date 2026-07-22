// Generated app-core slice 17/34 (declarations).

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