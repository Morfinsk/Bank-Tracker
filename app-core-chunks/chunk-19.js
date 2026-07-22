// Generated app-core slice 19/34 (declarations).

function dedupeTransactionsForCurrentView(txns) {
  const seen = new Set();
  return (txns || []).filter(tx => {
    const key = getTransactionViewDedupeKey(tx);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function updateTxnPage(monthTxns) {
  const listDiv = document.getElementById('txn-list');
  const cashflowSlot = document.getElementById('txn-cashflow-slot');
  if (!listDiv) return;

  updateTransactionDateInputs();
  updatePaymentKindFilterUi();
  updateCardSourceFiltersUi();
  updateDirectionFilterUi();
  updateTransactionFilterPanelUi();

  let base = sortTransactionsNewestFirst(allTransactions);
  base = filterTransactionsByMonthFilter(base);
  base = filterTransactionsByDateRange(base);

  if (activeDrilldownFilter) {
    base = applyDrilldownTransactionFilter(base);
  } else {
    if (activeDirection === 'incoming') base = base.filter(t => Number(t.amount) > 0);
    if (activeDirection === 'outgoing') base = base.filter(t => Number(t.amount) < 0);
    if (activeBank !== 'všetky') base = base.filter(t => matchesAnyActiveBankFilterV239(t, activeBank));
    if (activePaymentKind !== 'all') base = base.filter(t => matchesAnyPaymentKindV239(t, activePaymentKind));
  }

  if (activeRecurringGroupFilter && typeof transactionMatchesRecurringGroupFilter === 'function') {
    base = base.filter((t) => transactionMatchesRecurringGroupFilter(t));
  }

  if (activeCardLast4) base = base.filter(t => transactionMatchesCardLast4(t, activeCardLast4));
  base = prepareTransactionsForCurrentView(base);
  base = dedupeTransactionsForCurrentView(base);

  if (activeSearch) base = base.filter(t => transactionMatchesSearch(t, activeSearch));

  let scoped = filterTransactionsByHistoryScope(base);

  const categorySource = scoped.filter(tx => !(typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)));
  const cats = ['všetky', ...new Set(categorySource.map(tx => tx.category).filter(Boolean))];
  renderCategoryFilters(cats, categorySource);

  if (activeCategory !== 'všetky') {
    base = base.filter(t => matchesAnyCategoryV239(t, activeCategory));
    scoped = filterTransactionsByHistoryScope(base);
  }

  const olderCount = !hasActiveTransactionDateRange() && !hasActiveTransactionMonthFilter() && activeTxnHistoryScope !== 'all'
    ? base.filter(t => !isCurrentTransactionMonth(t)).length
    : 0;

  if (scoped.length === 0) {
    if (cashflowSlot) cashflowSlot.innerHTML = '';
    listDiv.innerHTML =
      renderTransactionHistoryNote() +
      `<div class="empty-state"><div class="empty-icon">📭</div>${t('noTransactionsForFilters')}</div>` +
      renderLoadOlderTransactionsButton(olderCount) +
      renderTransactionTotals([]);
    scheduleFloatingUtilityUpdate();
    return;
  }

  const visible = scoped.slice(0, txnVisibleLimit);

  let lastDayLabel = '';
  const rows = visible.map(t => {
    const bankKey = getBankKey(t);
    const isIncome = Number(t.amount) > 0;
    const sign = isIncome ? '+' : '-';
    const amountClass = isIncome ? 'amount-income' : 'amount-expense';
    const txId = typeof getTransactionId === 'function' ? getTransactionId(t) : (t.id || t.msgId || '');
    const dayLabel = getTxnDayDisplay(t);
    const timeLabel = getTxnTimeDisplay(t);
    const paymentLabel = getPaymentKindLabel(t);
    // v4400: for transfers show the counterparty account (recipient on an
    // outgoing payment, sender on an incoming one); fall back to the own source.
    const transferAcct = getTransactionTransferAccountDisplayV4400(t);
    const source = transferAcct ? transferAcct.source : getPaymentSourceMasked(t);
    const dayHeader = dayLabel !== lastDayLabel ? `<div class="txn-day-header">${escapeHtml(dayLabel)}</div>` : '';
    lastDayLabel = dayLabel;
    const accountEquivalent = renderAccountCurrencyEquivalent(t);
    const isCreditRepayment = typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(t);
    const isInternalTransfer = typeof isInternalTransferTransaction === 'function' && isInternalTransferTransaction(t);
    const isNeutralTransfer = typeof isExcludedFromSpendingStats === 'function' ? isExcludedFromSpendingStats(t) : (isCreditRepayment || isInternalTransfer);
    const isManualNonSpent = typeof isTransactionManuallyExcludedFromSpent === 'function' && isTransactionManuallyExcludedFromSpent(t);
    const rowClass = (isNeutralTransfer ? ' tx-credit-repayment' : '') + (isManualNonSpent ? ' tx-manual-non-spent' : '');
    const amountClassFinal = isNeutralTransfer && !isManualNonSpent ? 'amount-neutral' : amountClass;
    return `${dayHeader}<div class="tx-item${rowClass}" data-tx-id="${escapeAttr(txId)}"><div class="tx-left"><div class="tx-icon">${catIcon(t.category)}</div><div><div class="tx-merchant">${escapeHtml(t.merchant)}</div><div class="tx-meta">${escapeHtml(timeLabel)} · <span class="tx-payment-source" data-label="${escapeAttr(paymentLabel)}" data-source="${escapeAttr(source)}" onclick="event.stopPropagation(); togglePaymentSourceDetail(this)">${escapeHtml(paymentLabel)}</span></div></div></div><div class="tx-right-side"><div class="tx-amount-wrap"><div class="tx-amount ${amountClassFinal}">${sign}${formatCurrencyAmount(t.amount, t.currency)}</div>${accountEquivalent}</div>${bankLogoImg(bankKey, 'tx-bank-logo')}</div></div>`;
  }).join('');

  if (cashflowSlot) cashflowSlot.innerHTML = renderTransactionDailyCashflow(scoped);

  listDiv.innerHTML =
    renderTransactionHistoryNote() +
    renderTransactionPagingInfo(visible.length, scoped.length) +
    rows +
    renderShowMoreTransactionsButton(visible.length, scoped.length) +
    renderLoadOlderTransactionsButton(olderCount) +
    renderTransactionTotals(scoped);

  bindTransactionDeleteGestures();
  scheduleFloatingUtilityUpdate();
}

function normalizeCategoryKey(category) {
  return String(category || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function translateCategory(category) {
  const lang = getLanguage ? getLanguage() : 'en';
  const original = String(category || '').trim();
  const lower = original.toLowerCase();
  const normalized = normalizeCategoryKey(original);
  const dict = CATEGORY_I18N[lang] || CATEGORY_I18N.en;

  return dict[lower] || dict[normalized] || original;
}

function renderCategoryFilters(cats, scopedTxns = []) {
  const wrap = document.getElementById('cat-filters');
  const extraWrap = document.getElementById('cat-filters-extra');
  const extraCard = document.getElementById('cat-filters-extra-card');
  if (!wrap) return;

  const counts = {};
  scopedTxns.forEach(tx => {
    const category = tx?.category || '';
    if (category) counts[category] = (counts[category] || 0) + 1;
  });

  const uniqueCats = [...new Set((cats || []).filter(Boolean))];
  const allToken = uniqueCats.includes('všetky') ? ['všetky'] : [];
  const categoryCats = uniqueCats
    .filter(c => c !== 'všetky')
    .sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || String(a).localeCompare(String(b)));

  const preferredCategoryKeys = ['restauracie', 'potraviny', 'ucet'];
  const priorityCats = preferredCategoryKeys
    .map(key => categoryCats.find(c => normalizeCategoryKey(c) === key))
    .filter(Boolean);
  const fallbackCats = categoryCats.filter(c => !priorityCats.includes(c));
  const primaryCategoryCats = [...priorityCats, ...fallbackCats].slice(0, 3);
  const extraCats = categoryCats.filter(c => !primaryCategoryCats.includes(c));
  const primaryCats = [...allToken, ...primaryCategoryCats];

  const chipHtml = (c) => {
    const label = c === 'všetky' ? t('all') : `${catIcon(c)} ${translateCategory(c)}`;
    return `<div class="cat-chip ${activeCategory === c ? 'active' : ''}" data-category="${escapeAttr(c)}" onclick="filterCategoryFromChip(this)">${label}</div>`;
  };

  wrap.innerHTML = primaryCats.map(chipHtml).join('') + (extraCats.length
    ? `<div class="cat-chip cat-more-chip ${txnCategoryFiltersExpanded ? 'active' : ''}" onclick="toggleCategoryFilters()">…</div>`
    : '');

  if (extraWrap) {
    extraWrap.innerHTML = extraCats.map(chipHtml).join('');
    extraWrap.style.display = (!!extraCats.length && txnCategoryFiltersExpanded) ? 'flex' : 'none';
  }
  if (extraCard) extraCard.style.display = 'none';
}

function filterCategoryFromChip(el) {
  if (!el) return;
  filterCategory(el.getAttribute('data-category') || 'všetky');
}

function toggleCategoryFilters() {
  txnCategoryFiltersExpanded = !txnCategoryFiltersExpanded;
  updateTxnPage();
}


function openBankTransactions(bankKey) {
  activeCategory = 'všetky';
  showPage('txns');
  filterBank(bankKey);
}

function openBankCardTransactions(bankKey) {
  // Card-limit widget drilldown must be strict (bank + month + card + outgoing),
  // never toggle bank chips, and must survive txns tab wrappers.
  if (typeof setExclusiveTransactionFilters === 'function') {
    setExclusiveTransactionFilters({
      bankKey: bankKey,
      monthStr: getAktuálneMonth(),
      mode: 'cards'
    });
    showPage('txns', { preserveFilters: true });
    return;
  }
  // Fallback for very old cached markup.
  showPage('txns', { preserveFilters: true });
  activeCategory = 'všetky';
  activePaymentKind = 'card';
  activeDirection = 'outgoing';
  activeMonthFilter = normalizeMonthStr(getAktuálneMonth());
  activeDateFrom = '';
  activeDateTo = '';
  activeTxnHistoryScope = 'all';
  activeBank = bankKey;
  updatePaymentKindFilterUi();
  updateDirectionFilterUi();
  updateTransactionDateInputs();
  updateTxnPage();
}

function setTransactionDateRangeFromMonth(monthStr) {
  const normalized = normalizeMonthStr(monthStr || '');
  const match = normalized.match(/^(\d{2})\/(\d{4})$/);
  if (!match) {
    activeDateFrom = '';
    activeDateTo = '';
    return;
  }
  const month = Number(match[1]);
  const year = Number(match[2]);
  const lastDay = new Date(year, month, 0).getDate();
  activeDateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  activeDateTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function setTransactionDateRangeFromBankMonth(bankKey, monthStr, paymentKind = 'card') {
  const normalized = normalizeMonthStr(monthStr || getAktuálneMonth());

  const matchingDates = allTransactions
    .map(tx => {
      const rawDate = tx?.rawDate || tx?.date || '';
      if (!rawDate) return null;
      const parsed = parseCustomDateStr(rawDate);
      if (!parsed || isNaN(parsed.getTime())) return null;
      const txMonth = getMonthFromDate(parsed);
      if (txMonth !== normalized) return null;
      if (getBankKey(tx) !== bankKey) return null;
      if (Number(tx.amount || 0) >= 0) return null;
      if (paymentKind && paymentKind !== 'all' && getTransactionPaymentKind(tx) !== paymentKind) return null;
      return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
    })
    .filter(Boolean)
    .sort();

  if (matchingDates.length) {
    activeDateFrom = matchingDates[0];
    activeDateTo = matchingDates[matchingDates.length - 1];
    return;
  }

  activeDateFrom = '';
  activeDateTo = '';
}

function openCreditCardTransactions(cardLast4 = '') {
  const creditCard = String(cardLast4 || getCsobCzCreditCardLast4() || '').replace(/\D/g, '').slice(-4);
  if (!creditCard) return;
  activePageId = 'transactions';
  activeBank = 'csob_cz';
  activePaymentKind = 'card';
  activeCardLast4 = creditCard;
  activeCategory = 'všetky';
  activeSearch = '';
  activeDirection = 'all';
  if (getAktuálneMonth() !== getCurrentMonth()) {
    setTransactionDateRangeFromMonth(getAktuálneMonth());
  } else {
    activeDateFrom = '';
    activeDateTo = '';
    activeTxnMonthFilter = '';
  }
  const search = document.getElementById('txn-search');
  if (search) search.value = '';
  resetTxnVisibleLimit();
  switchPage('transactions');
  updateCardSourceFiltersUi();
  updateTxnPage();
  setTimeout(scrollToLatestVisibleTransaction, 120);
}

function openBankTransactions(bankKey, paymentKind = 'card') {
  showPage('txns');
  activeCategory = 'všetky';
  activeTxnTag = 'all';
  activeCardLast4 = '';
  if (activePaymentKind === 'internal') activePaymentKind = 'all';
  activePaymentKind = paymentKind || 'all';
  activeDateFrom = '';
  activeDateTo = '';
  activeMonthFilter = '';
  activeTxnHistoryScope = 'all';
  updatePaymentKindFilterUi();
  updateTransactionDateInputs();
  filterBank(bankKey);
}

function openRecentBankTransactions(bankKey) {
  // Recent bank click should only select the bank. It must not apply the old 14-day/date filter.
  showPage('txns', { preserveFilters: true });
  activeCategory = 'všetky';
  activePaymentKind = 'all';
  activeDirection = 'all';
  activeMonthFilter = '';
  activeSearch = '';
  activeTxnHistoryScope = 'all';
  activeTxnTag = 'all';
  activeDateFrom = '';
  activeDateTo = '';
  activeCardLast4 = '';

  const search = document.getElementById('txn-search');
  if (search) search.value = '';
  updatePaymentKindFilterUi();
  updateDirectionFilterUi();
  updateCardSourceFiltersUi();
  updateTransactionDateInputs();
  filterBank(bankKey);
}

function openBankMonthTransactions(bankKey, monthStr, paymentKind = 'card') {
  openArchiveMonthFilter(bankKey, monthStr, paymentKind === 'card' ? 'cards' : 'all');
}

function syncExclusiveBankFilterUi(bankKey) {
  const key = String(bankKey || 'všetky');
  if (typeof window.updateBankFilterUiV239 === 'function') {
    window.updateBankFilterUiV239();
    return;
  }
  document.getElementById('filter-bank-all')?.classList.toggle('active', key === 'všetky');
  document.getElementById('filter-bank-rb')?.classList.toggle('active', key === 'rb_cz');
  document.getElementById('filter-bank-csob-sk')?.classList.toggle('active', key === 'csob_sk');
  document.getElementById('filter-bank-csob-cz')?.classList.toggle('active', key === 'csob_cz');
  document.getElementById('filter-bank-moneta')?.classList.toggle('active', key === 'moneta');
  document.getElementById('filter-bank-air-bank-cz')?.classList.toggle('active', key === 'air_bank_cz');
  document.getElementById('filter-bank-pluxee')?.classList.toggle('active', key === 'pluxee');
}

function setExclusiveTransactionFilters(opts = {}) {
  const bankKey = String(opts.bankKey || 'všetky');
  const mode = String(opts.mode || 'all');
  const months = Array.isArray(opts.months) ? opts.months.map(m => normalizeMonthStr(m)).filter(Boolean) : [];
  const monthStr = opts.monthStr != null ? normalizeMonthStr(opts.monthStr) : '';

  activeCategory = 'všetky';
  activeTxnTag = 'all';
  activeCardLast4 = '';
  activeSearch = '';
  activeTxnHistoryScope = 'all';
  activeDateFrom = '';
  activeDateTo = '';
  activeMonthFilter = months.length ? months.join('|') : (monthStr || '');

  if (mode === 'cards') {
    activePaymentKind = 'card';
    activeDirection = 'outgoing';
    activeDrilldownFilter = { type: 'cards', bankKey };
  } else if (mode === 'spent') {
    activePaymentKind = 'all';
    activeDirection = 'outgoing';
    activeDrilldownFilter = { type: 'spent', bankKey };
  } else if (mode === 'income') {
    activePaymentKind = 'all';
    activeDirection = 'incoming';
    activeDrilldownFilter = { type: 'income', bankKey };
  } else if (mode === 'overview-spent') {
    activePaymentKind = 'all';
    activeDirection = 'outgoing';
    activeDrilldownFilter = { type: 'overview-spent', bankKey: 'všetky' };
  } else {
    activePaymentKind = 'all';
    activeDirection = 'all';
    activeDrilldownFilter = null;
  }

  activeBank = bankKey;
  try { window.activeBank = activeBank; } catch (_) {}

  const search = document.getElementById('txn-search');
  if (search) search.value = '';
  resetTxnVisibleLimit();
  updatePaymentKindFilterUi();
  updateDirectionFilterUi();
  updateCardSourceFiltersUi();
  updateTransactionDateInputs();
  updateTransactionFilterPanelUi();
  syncExclusiveBankFilterUi(bankKey);
}

function openOverviewTotalSpentFilter() {
  const month = normalizeMonthStr(getAktuálneMonth());
  setExclusiveTransactionFilters({
    bankKey: 'všetky',
    monthStr: month,
    mode: 'overview-spent'
  });
  showPage('txns', { preserveFilters: true });
}

function openArchiveMonthFilter(bankKey, monthStr, mode = 'cards') {
  setExclusiveTransactionFilters({
    bankKey,
    monthStr: monthStr || getAktuálneMonth(),
    mode
  });
  // preserveFilters keeps deferred resetAllTxnFilters() wrappers from wiping archive filters.
  showPage('txns', { preserveFilters: true });
}

function setTransactionDateRangeFromMonthRange(startMonthStr, endMonthStr) {
  const start = normalizeMonthStr(startMonthStr || getAktuálneMonth());
  const end = normalizeMonthStr(endMonthStr || start);
  const startMatch = start.match(/^(\d{2})\/(\d{4})$/);
  const endMatch = end.match(/^(\d{2})\/(\d{4})$/);
  if (!startMatch || !endMatch) {
    activeDateFrom = '';
    activeDateTo = '';
    return;
  }
  const sm = Number(startMatch[1]);
  const sy = Number(startMatch[2]);
  const em = Number(endMatch[1]);
  const ey = Number(endMatch[2]);
  const lastDay = new Date(ey, em, 0).getDate();
  activeDateFrom = `${sy}-${String(sm).padStart(2, '0')}-01`;
  activeDateTo = `${ey}-${String(em).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function openArchiveBankRangeFilter(bankKey, monthsCsv, mode = 'spent') {
  const months = String(monthsCsv || '')
    .split('|')
    .map(m => normalizeMonthStr(m))
    .filter(Boolean)
    .sort((a, b) => monthSortValue(a) - monthSortValue(b));
  if (!months.length) return openBankTransactions(bankKey, 'all');

  setExclusiveTransactionFilters({
    bankKey,
    months,
    mode: mode === 'cards' ? 'cards' : (mode === 'income' ? 'income' : (mode === 'all' ? 'all' : 'spent'))
  });
  showPage('txns', { preserveFilters: true });
}

function filterBank(bank) {
  if (bank !== 'csob_cz') activeCardLast4 = '';
  activeBank = bank;
  clearDrilldownTransactionFilter();
  resetTxnVisibleLimit();
  document.getElementById('filter-bank-all').classList.toggle('active', bank === 'všetky');
  document.getElementById('filter-bank-rb').classList.toggle('active', bank === 'rb_cz');
  document.getElementById('filter-bank-csob-sk').classList.toggle('active', bank === 'csob_sk');
  document.getElementById('filter-bank-csob-cz').classList.toggle('active', bank === 'csob_cz');
  document.getElementById('filter-bank-moneta').classList.toggle('active', bank === 'moneta');
  document.getElementById('filter-bank-air-bank-cz')?.classList.toggle('active', bank === 'air_bank_cz');
  document.getElementById('filter-bank-pluxee')?.classList.toggle('active', bank === 'pluxee');
  updateTxnPage();
}

function filterCategory(cat) {
  activeCardLast4 = '';
  activeCategory = cat;
  resetTxnVisibleLimit();
  updateTxnPage();
}




function resetTransactionFilters() {
  activeDirection = 'all';
  activeBank = 'všetky';
  activePaymentKind = 'all';
  activeCardLast4 = '';
  activeTxnTag = 'all';
  activeCategory = 'všetky';
  activeSearch = '';
  activeDateFrom = '';
  activeDateTo = '';
  activeMonthFilter = '';
  activeDrilldownFilter = null;
  activeRecurringGroupFilter = null;
  activeTxnHistoryScope = 'current';
  resetTxnVisibleLimit();

  const search = document.getElementById('txn-search');
  if (search) search.value = '';

  updateTransactionDateInputs();
  updatePaymentKindFilterUi();

  document.querySelectorAll('#direction-filters .txn-filter-pill').forEach(el => el.classList.remove('active'));
  document.getElementById('filter-dir-all')?.classList.add('active');

  document.querySelectorAll('#bank-filters .cat-chip').forEach(el => el.classList.remove('active'));
  document.getElementById('filter-bank-all')?.classList.add('active');
}