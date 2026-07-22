// Generated app-core slice 4/34 (declarations).

function getArchiveMonths() {
  return [...new Set(allTransactions.map(t => t.month).filter(Boolean))]
    .sort((a,b) => monthSortValue(b) - monthSortValue(a));
}
function updateArchivePaymentKindFilterUi() {
  document.getElementById('archive-kind-all')?.classList.toggle('active', archiveDetailPaymentKind === 'all');
  document.getElementById('archive-kind-card')?.classList.toggle('active', archiveDetailPaymentKind === 'card');
  document.getElementById('archive-kind-account')?.classList.toggle('active', archiveDetailPaymentKind === 'account');
  document.getElementById('archive-kind-cash')?.classList.toggle('active', archiveDetailPaymentKind === 'cash');
}

function filterArchivePaymentKind(kind) {
  archiveDetailPaymentKind = kind || 'all';
  archiveDetailFilter = null;
  resetArchiveDetailVisibleLimit();
  updateArchivePaymentKindFilterUi();
  renderArchiveBankDetail();
}

function filterArchiveDetailTransactionsByKind(txns) {
  if (archiveDetailPaymentKind === 'card') return txns.filter(tx => isCardTransaction(tx));
  if (archiveDetailPaymentKind === 'account') return txns.filter(tx => isAccountTransaction(tx) && !isExcludedFromSpendingStats(tx));
  if (archiveDetailPaymentKind === 'cash') return txns.filter(tx => isCashTransaction(tx));
  return txns;
}

function getPaymentKindLabel(tx) {
  if (typeof isInternalTransferTransaction === 'function' && isInternalTransferTransaction(tx)) return t('internalTransfers');
  const kind = getTransactionPaymentKind(tx);
  if (kind === 'internal') return t('internalTransfers');
  if (kind === 'account') return t('accountsOnly');
  if (kind === 'cash') return t('cashOnly');
  return t('cardsOnly');
}

function openArchiveBankDetail(bankKey, monthStr) {
  archiveDetailFilter = null;
  archiveDetailPaymentKind = 'all';
  resetArchiveDetailVisibleLimit();
  archiveDetailBankKey = bankKey || 'rb_cz';

  const monthSelect = document.getElementById('archive-detail-month');
  if (monthSelect) {
    const months = getArchiveMonths();
    const selected = normalizeMonthStr(monthStr || months[0] || getAktuálneMonth());
    monthSelect.innerHTML = months.map(m => `<option value="${m}" ${normalizeMonthStr(m) === selected ? 'selected' : ''}>${formatMonthString(m)}</option>`).join('');
    monthSelect.value = selected;
  }

  updateArchivePaymentKindFilterUi();

  const chartWrap = document.getElementById('archive-bank-detail-chart');
  const listWrap = document.getElementById('archive-bank-detail-list');
  if (chartWrap) chartWrap.innerHTML = `<div class="archive-detail-loader">${getBtInlineLoadingHtml(t('loading') + '...')}</div>`;
  if (listWrap) listWrap.innerHTML = '';

  openSheet('archive-bank-detail-sheet');

  requestAnimationFrame(() => {
    window.setTimeout(() => {
      renderArchiveBankDetail();
    }, document.documentElement.classList.contains('android-pwa-perf') ? 90 : 35);
  });
}

function clearArchiveDetailFilter() {
  archiveDetailFilter = null;
  resetArchiveDetailVisibleLimit();
  renderArchiveBankDetail();
}

function setArchiveDetailFilter(day, type) {
  archiveDetailFilter = { day: Number(day), type: String(type || 'all') };
  resetArchiveDetailVisibleLimit();
  renderArchiveBankDetail();
}


function resetArchiveDetailVisibleLimit() {
  archiveDetailVisibleLimit = ARCHIVE_DETAIL_PAGE_SIZE;
}

function loadMoreArchiveDetailTransactions() {
  archiveDetailVisibleLimit += ARCHIVE_DETAIL_PAGE_SIZE;
  renderArchiveBankDetail();
}

function renderArchiveDetailLoadMoreButton(visibleCount, totalCount) {
  if (visibleCount >= totalCount) return '';

  const nextCount = Math.min(ARCHIVE_DETAIL_PAGE_SIZE, totalCount - visibleCount);
  return `
    <div class="archive-detail-load-more-wrap">
      <button class="archive-detail-load-more-btn" onclick="loadMoreArchiveDetailTransactions()">${t('archiveLoadMore')} +${nextCount}</button>
    </div>
  `;
}

function renderArchiveBankDetail() {
  const chartWrap = document.getElementById('archive-bank-detail-chart');
  const listWrap = document.getElementById('archive-bank-detail-list');
  const title = document.getElementById('archive-bank-detail-title');
  const monthStr = normalizeMonthStr(document.getElementById('archive-detail-month')?.value || getAktuálneMonth());
  const bankKey = archiveDetailBankKey || 'rb_cz';
  const bankName = plainBankName(bankKey);
  const targetCurrency = getBankChartCurrency(bankKey);

  updateArchivePaymentKindFilterUi();

  if (title) title.innerHTML = `${bankLogoImg(bankKey)} ${bankName} — ${t('dailyArchive')}`;

  if (!chartWrap || !listWrap) return;

  const allBankMonthTxns = sortTransactionsNewestFirst(allTransactions.filter(tx => {
    return tx.month === monthStr && getBankKey(tx) === bankKey;
  }));

  const txns = filterArchiveDetailTransactionsByKind(allBankMonthTxns);

  if (txns.length === 0) {
    chartWrap.innerHTML = `<div class="empty-state" style="padding:22px 0;">${t('noDailyData')}</div>`;
    listWrap.innerHTML = `<div class="budget-status-note" style="margin:0 0 8px;">${t('showing')}: 0 / ${allBankMonthTxns.length}</div>`;
    return;
  }

  const [mm, yyyy] = normalizeMonthStr(monthStr).split('/').map(Number);
  const daysInMonth = new Date(yyyy, mm, 0).getDate();

  const daily = Array.from({ length: daysInMonth }, (_, idx) => ({
    day: idx + 1,
    income: 0,
    expense: 0,
    incomeCount: 0,
    expenseCount: 0
  }));

  const txnsWithDay = txns.map(tx => {
    const parsed = parseCustomDateStr(tx.date);
    const day = parsed && !isNaN(parsed.getTime()) ? parsed.getDate() : 1;
    const safeDay = Math.max(1, Math.min(daysInMonth, day));
    return { ...tx, __archiveDay: safeDay };
  });

  txnsWithDay.forEach(tx => {
    const idx = tx.__archiveDay - 1;
    const value = convertTransactionAmount(tx, targetCurrency);

    if (Number(tx.amount) > 0) {
      daily[idx].income += value;
      daily[idx].incomeCount += 1;
    }
    if (Number(tx.amount) < 0) {
      daily[idx].expense += value;
      daily[idx].expenseCount += 1;
    }
  });

  const max = Math.max(1, ...daily.map(d => Math.max(d.income, d.expense)));
  const niceMax = Math.ceil(max / 1000) * 1000 || max;
  const w = 360;
  const h = 210;
  const padL = 34;
  const padR = 10;
  const padT = 16;
  const axisY = 150;
  const chartW = w - padL - padR;
  const dayBand = chartW / daysInMonth;
  const barW = Math.max(2, Math.min(7, dayBand * 0.33));
  const barGap = Math.max(1, Math.min(3, dayBand * 0.08));
  const maxBarH = axisY - padT - 10;

  const barHeight = (value) => Math.max(value > 0 ? 2 : 0, (value / niceMax) * maxBarH);

  const selected = archiveDetailFilter;
  const selectedLabel = selected
    ? `${t('selectedDay')} ${String(selected.day).padStart(2, '0')} · ${selected.type === 'income' ? t('income') : t('expenses')}`
    : t('allDays');

  const totalIncome = daily.reduce((s,d) => s + d.income, 0);
  const totalExpense = daily.reduce((s,d) => s + d.expense, 0);

  const labelDays = [1, Math.ceil(daysInMonth / 3), Math.ceil(daysInMonth * 2 / 3), daysInMonth]
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const bars = daily.map(d => {
    const xCenter = padL + (d.day - 0.5) * dayBand;
    const incomeH = barHeight(d.income);
    const expenseH = barHeight(d.expense);
    const depth = 4;
    const incomeX = xCenter - barW - barGap / 2;
    const expenseX = xCenter + barGap / 2;
    const incomeTopY = axisY - incomeH;
    const expenseTopY = axisY - expenseH;
    const incomeActive = selected && selected.day === d.day && selected.type === 'income';
    const expenseActive = selected && selected.day === d.day && selected.type === 'expense';
    const hasSelected = !!selected;
    const incomeMuted = hasSelected && !incomeActive ? ' daily-bar-muted' : '';
    const expenseMuted = hasSelected && !expenseActive ? ' daily-bar-muted' : '';

    return `
      ${incomeH > 0 ? `<polygon class="daily-bar-income-side daily-bar-face${incomeActive ? ' active' : ''}${incomeMuted}" points="${incomeX + barW},${axisY} ${incomeX + barW + depth},${axisY - depth} ${incomeX + barW + depth},${incomeTopY - depth} ${incomeX + barW},${incomeTopY}"></polygon>
      <polygon class="daily-bar-income-top daily-bar-face${incomeActive ? ' active' : ''}${incomeMuted}" points="${incomeX},${incomeTopY} ${incomeX + depth},${incomeTopY - depth} ${incomeX + barW + depth},${incomeTopY - depth} ${incomeX + barW},${incomeTopY}"></polygon>` : ''}
      <rect class="daily-bar-income${incomeActive ? ' active' : ''}${incomeMuted}" x="${incomeX}" y="${incomeTopY}" width="${barW}" height="${incomeH}" rx="2" onclick="setArchiveDetailFilter(${d.day}, 'income')"></rect>
      ${expenseH > 0 ? `<polygon class="daily-bar-expense-side daily-bar-face${expenseActive ? ' active' : ''}${expenseMuted}" points="${expenseX + barW},${axisY} ${expenseX + barW + depth},${axisY - depth} ${expenseX + barW + depth},${expenseTopY - depth} ${expenseX + barW},${expenseTopY}"></polygon>
      <polygon class="daily-bar-expense-top daily-bar-face${expenseActive ? ' active' : ''}${expenseMuted}" points="${expenseX},${expenseTopY} ${expenseX + depth},${expenseTopY - depth} ${expenseX + barW + depth},${expenseTopY - depth} ${expenseX + barW},${expenseTopY}"></polygon>` : ''}
      <rect class="daily-bar-expense${expenseActive ? ' active' : ''}${expenseMuted}" x="${expenseX}" y="${expenseTopY}" width="${barW}" height="${expenseH}" rx="2" onclick="setArchiveDetailFilter(${d.day}, 'expense')"></rect>
    `;
  }).join('');

  const kindLabel = archiveDetailPaymentKind === 'all'
    ? t('paymentKindAll')
    : archiveDetailPaymentKind === 'card'
      ? t('cardsOnly')
      : t('accountsOnly');

  chartWrap.innerHTML = `
    <div class="daily-chart-card">
      <div class="daily-chart-title">
        <strong>${t('dailyCashflow')} · ${formatMonthString(monthStr)}</strong>
        <span>${t('bankCurrencyNote')}: ${targetCurrency} · ${kindLabel}</span>
      </div>
      <div class="daily-legend">
        <span><i class="daily-dot" style="background:var(--ok);"></i>${t('income')}: ${Math.round(totalIncome).toLocaleString('cs-CZ')} ${targetCurrency}</span>
        <span><i class="daily-dot" style="background:var(--danger);"></i>${t('expenses')}: ${Math.round(totalExpense).toLocaleString('cs-CZ')} ${targetCurrency}</span>
      </div>
      <div class="daily-chart-help">${t('clickBarToFilter')}</div>
      <div class="daily-filter-chip">${selectedLabel}</div>
      ${selected ? `<button class="daily-reset-filter" onclick="clearArchiveDetailFilter()" style="margin-left:8px;">${t('allDays')}</button>` : ''}
      <svg class="daily-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <line class="daily-grid-line" x1="${padL}" y1="${axisY}" x2="${w - padR}" y2="${axisY}"></line>
        <line class="daily-grid-line" x1="${padL}" y1="${Math.round(axisY / 2)}" x2="${w - padR}" y2="${Math.round(axisY / 2)}"></line>
        <line class="daily-grid-line" x1="${padL}" y1="${padT}" x2="${w - padR}" y2="${padT}"></line>
        <text class="daily-axis-label" x="2" y="${padT + 4}">${formatCompactAmount(niceMax)}</text>
        <text class="daily-axis-label" x="2" y="${Math.round(axisY / 2) + 4}">${formatCompactAmount(niceMax / 2)}</text>
        <text class="daily-axis-label" x="2" y="${axisY + 4}">0</text>
        ${bars}
        ${labelDays.map(day => {
          const x = padL + (day - 0.5) * dayBand;
          return `<text class="daily-axis-label" x="${x - 5}" y="${axisY + 25}">${String(day).padStart(2,'0')}</text>`;
        }).join('')}
      </svg>
    </div>
  `;

  let visibleTxns = txnsWithDay;
  if (selected) {
    visibleTxns = visibleTxns.filter(tx => {
      const typeOk = selected.type === 'income' ? Number(tx.amount) > 0 : Number(tx.amount) < 0;
      return tx.__archiveDay === selected.day && typeOk;
    });
  }

  const totalVisibleTxns = visibleTxns.length;
  const renderedTxns = visibleTxns.slice(0, archiveDetailVisibleLimit);

  listWrap.innerHTML = `
    <div class="budget-status-note" style="margin:0 0 8px;">${t('showing')}: ${renderedTxns.length} / ${totalVisibleTxns}</div><div class="archive-edit-hint">${t('longPressToEdit')}</div>
    ${renderedTxns.map(tx => {
      const isIncome = Number(tx.amount) > 0;
      const amountClass = isIncome ? 'amount-income' : 'amount-expense';
      const sign = isIncome ? '+' : '-';
      return `
        <div class="daily-tx-row archive-edit-row" data-archive-tx-id="${escapeAttr(typeof getTransactionId === 'function' ? getTransactionId(tx) : (tx.id || tx.msgId || ''))}" title="${t('editTransaction')}">
          <div class="daily-tx-main">
            <div class="daily-tx-title">${escapeHtml(tx.merchant || '')}</div>
            <div class="daily-tx-sub">${escapeHtml(tx.date || '')} · ${translateCategory(tx.category || '')}<span class="daily-tx-kind">${getPaymentKindLabel(tx)}</span></div>
          </div>
          <div class="daily-tx-amount ${amountClass}">${sign}${formatCurrencyAmount(tx.amount, tx.currency)}</div>
        </div>`;
    }).join('')}
    ${renderArchiveDetailLoadMoreButton(renderedTxns.length, totalVisibleTxns)}
  `;
  bindArchiveTransactionEditGestures();
  scheduleFloatingUtilityUpdate();
}

// ── OPRAVENÉ MAZANIE JEDNEJ TRANSAKCIE ──────────────────────────

function bindArchiveTransactionEditGestures() {
  document.querySelectorAll('[data-archive-tx-id]').forEach(row => {
    if (row.dataset.archiveEditBound === 'true') return;
    row.dataset.archiveEditBound = 'true';

    let timer = null;
    let startX = 0;
    let startY = 0;
    let didOpen = false;

    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const openEdit = () => {
      const txId = row.dataset.archiveTxId;
      if (!txId || didOpen) return;
      didOpen = true;
      row.classList.add('long-press-edit');
      navigator.vibrate?.(25);
      window.setTimeout(() => row.classList.remove('long-press-edit'), 350);
      openTransactionEditSheet(txId);
    };

    row.addEventListener('pointerdown', (event) => {
      if (event.target.closest && event.target.closest('button, input, select, textarea, a')) return;
      didOpen = false;
      startX = event.clientX || 0;
      startY = event.clientY || 0;
      timer = window.setTimeout(openEdit, 560);
    });

    row.addEventListener('pointermove', (event) => {
      const dx = Math.abs((event.clientX || 0) - startX);
      const dy = Math.abs((event.clientY || 0) - startY);
      if (dx > 12 || dy > 12) clear();
    });

    row.addEventListener('pointerup', clear);
    row.addEventListener('pointercancel', clear);
    row.addEventListener('pointerleave', clear);

    row.addEventListener('dblclick', (event) => {
      if (event.target.closest && event.target.closest('button, input, select, textarea, a')) return;
      event.preventDefault();
      openEdit();
    });
  });
}
function scheduleBackgroundMonthlyArchiveRepair(reason = 'mutation') {
  if (archiveRepairDebounce) clearTimeout(archiveRepairDebounce);
  archiveRepairDebounce = setTimeout(() => {
    runBackgroundMonthlyArchiveRepair(reason);
  }, 12000);
}

async function deleteSingleTransaction(txId) {
  if (!txId) return false;

  const targetId = String(txId);
  const tx = allTransactions.find(t => String(t.id || t.msgId || t.emailId || '') === targetId);
  const sheetId = String(tx?.msgId || tx?.emailId || tx?.id || targetId).trim();
  if (!sheetId) return false;

  // v158: optimistic delete UI. Do not keep the user waiting for the full Apps Script
  // response; remove locally immediately and let Google Sheets sync finish in background.
  showTopWorkingToast('Deleting...');

  const affectedMonths = new Set();
  if (tx?.month) affectedMonths.add(normalizeMonthStr(tx.month));

  if (tx) {
    applyLocalArchiveStatsFromTransaction(tx, -1);
    seedAccountBalanceBasesForMonth(tx.month || getAktuálneMonth());
  }
  allTransactions = allTransactions.filter(t => String(t.id || t.msgId || t.emailId || '') !== targetId && String(t.msgId || t.emailId || t.id || '') !== sheetId);
  affectedMonths.forEach(month => recomputeAccountBalancesForMonth(month));
  saveCachedTransactionsSnapshot();
  renderAll();

  // v159: local delete is instant; do not keep the top spinner visible while
  // Apps Script finishes balance/monthly/log updates in the background.
  window.setTimeout(() => showDeletedToast(), 450);

  postToBankTrackerEndpoint('deleteTransaction', { id: sheetId, msgId: sheetId }).then(ok => {
    if (ok) scheduleBackgroundMonthlyArchiveRepair('delete_transaction_background_repair');
    if (!ok) {
      const status = document.getElementById('limits-sync-status');
      if (status) status.textContent = 'Transakcia bola vymazaná lokálne. Google Sheets sync mešká alebo sa nepodaril - skontroluj Web App /exec a Apps Script Executions.';
    }
  }).catch(err => {
    const status = document.getElementById('limits-sync-status');
    if (status) status.textContent = 'Transakcia bola vymazaná lokálne. Google Sheets sync zlyhal: ' + String(err && err.message ? err.message : err);
  });

  return true;
}

// ── OPRAVENÉ KASKÁDOVÉ MAZANIE ARCHÍVU MESIACA ──────────────────
function deleteArchiveMonth(monthStr) {
  if (!guardLocalEdit('Mazanie mesiaca z archívu')) return;

  if (!confirm(`Naozaj chceš vymazať celý mesiac ${formatMonthString(monthStr)} z archívu vrátane všetkých jeho platieb?`)) {
    return;
  }

  // Odstráni všetky platby patriace pod vymazaný mesiac
  allTransactions = allTransactions.filter(t => t.month !== monthStr);

  if (limitsHistory[monthStr]) {
    delete limitsHistory[monthStr];
    localStorage.setItem('limits_history', JSON.stringify(limitsHistory));
  }

  renderAll();
}

function resetSimFields() {
  const now = new Date();
  const formattedNow = formatDate(now);
  const simDateRb = document.getElementById('sim-date-rb');
  const simDateCsob = document.getElementById('sim-date-csob');
  if (simDateRb) simDateRb.value = formattedNow;
  if (simDateCsob) simDateCsob.value = formattedNow;
  const simDateCsobCz = document.getElementById('sim-date-csob-cz');
  const simDateMoneta = document.getElementById('sim-date-moneta');
  if (simDateCsobCz) simDateCsobCz.value = formattedNow;
  if (simDateMoneta) simDateMoneta.value = formattedNow;
  populateSimulatorLimitMonthDropdown(getAktuálneMonth());
  fillSimulatorLimitInputs(getSimulatorLimitMonth());
}
function normalizeAtmCashWithdrawalText(value) {
  let text = String(value || '').toLowerCase().replace(/\u00a0/g, ' ');
  try { text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
  return text.replace(/[^a-z0-9]+/g, ' ').trim();
}

function isAtmCashWithdrawalTransaction(tx) {
  if (!tx) return false;
  const text = normalizeAtmCashWithdrawalText([
    tx.type, tx.category, tx.merchant, tx.merchantRaw, tx.paymentKind
  ].join(' '));
  if (!text) return false;
  return /\bvyber\s+(?:hotovosti\s+)?z\s+bankomatu\b/.test(text) ||
    /\bvyber\s+hotovosti\b/.test(text) ||
    /\bcash\s+withdrawal\b/.test(text) ||
    /\batm\s+(?:cash\s+)?withdrawal\b/.test(text) ||
    /\bbankomat\b/.test(text);
}