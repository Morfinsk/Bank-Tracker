// Generated app-core slice 26/34 (declarations).

function convertSignedAmountCurrency(amount, fromCurrency, toCurrency) {
  const numeric = Number(amount) || 0;
  if (!Number.isFinite(numeric) || numeric === 0) return 0;
  const sign = numeric < 0 ? -1 : 1;
  return sign * convertAmountCurrency(Math.abs(numeric), fromCurrency, toCurrency);
}

function convertTransactionAmount(tx, targetCurrency = 'CZK') {
  return convertAmountCurrency(tx.amount, tx.currency, targetCurrency);
}

function getBankChartCurrency(bankKey) {
  const bank = getBankInfo(bankKey);
  return localStorage.getItem('bank_currency_' + bankKey) || bank.primaryCurrency || 'CZK';
}

function formatCompactAmount(value) {
  const n = Math.round(Number(value) || 0);
  if (n >= 1000000) return `${Math.round(n / 100000) / 10}M`;
  if (n >= 1000) return `${Math.round(n / 100) / 10}k`;
  return String(n);
}


function shortArchiveMonthLabel(monthStr) {
  const m = normalizeMonthStr(monthStr);
  const idx = parseInt(m.slice(0, 2), 10) - 1;
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
  return labels[idx] || m;
}

function toggleArchiveTrendChartType() {
  archiveTrendChartType = archiveTrendChartType === 'bars' ? 'line' : 'bars';
  localStorage.setItem('archive_trend_chart_type', archiveTrendChartType);
  archiveTrendChartCache = { signature: '', html: '' };
  renderArchiveTrendChart();
  scheduleArchiveChartIntro(30);
}

function getDynamicArchiveBankKeys(monthly) {
  const seen = new Set();
  const ordered = [];
  BANK_ORDER.forEach(key => { seen.add(key); ordered.push(key); });
  getCustomBanks().forEach(bank => {
    if (bank && bank.active !== false && bank.id && !seen.has(bank.id)) {
      seen.add(bank.id);
      ordered.push(bank.id);
    }
  });
  Object.keys(monthly || {}).forEach(month => {
    Object.keys(monthly[month] || {}).forEach(key => {
      if (key && !seen.has(key)) {
        seen.add(key);
        ordered.push(key);
      }
    });
  });
  return ordered;
}

function getArchiveBankInfo(bankKey) {
  const custom = getCustomBanks().find(b => b && b.id === bankKey);
  if (custom) {
    return {
      label: escapeHtml(custom.name || 'Banka'),
      short: escapeHtml(custom.name || 'Banka'),
      color: getCustomArchiveBankColor(bankKey),
      primaryCurrency: custom.currency || 'CZK'
    };
  }
  return getBankInfo(bankKey);
}

function getArchiveBankName(bankKey) {
  const custom = getCustomBanks().find(b => b && b.id === bankKey);
  return custom ? (custom.name || 'Banka') : plainBankName(bankKey);
}


function getArchiveMonthlyStatKey(bankKey, monthStr, field) {
  return `bank_monthly_${field}_${bankKey}_${normalizeMonthStr(monthStr)}`;
}

function getOverviewMonthlyStatKey(bankKey, monthStr, field) {
  return `overview_monthly_${field}_${bankKey}_${normalizeMonthStr(monthStr)}`;
}

function getStoredOverviewMonthlyStat(bankKey, monthStr, field) {
  const normalizedMonth = normalizeMonthStr(monthStr || getAktuálneMonth());
  if (localTestOverviewDetails && localTestOverviewDetails.month === normalizedMonth) {
    let value = null;
    if (localTestOverviewDetails.totals?.[bankKey] && localTestOverviewDetails.totals[bankKey][field] !== undefined) {
      value = Number(localTestOverviewDetails.totals[bankKey][field] || 0) || 0;
    }
    if (bankKey === 'csob_cz' && localTestOverviewDetails.totals?.csob_cz_credit && localTestOverviewDetails.totals.csob_cz_credit[field] !== undefined) {
      value = (value || 0) + (Number(localTestOverviewDetails.totals.csob_cz_credit[field] || 0) || 0);
    }
    if (value !== null) return value;
  }
  let total = 0;
  let found = false;
  const stored = localStorage.getItem(getOverviewMonthlyStatKey(bankKey, normalizedMonth, field));
  if (stored !== null) {
    const n = Number(stored || 0);
    if (Number.isFinite(n)) { total += n; found = true; }
  }
  if (bankKey === 'csob_cz') {
    const creditStored = localStorage.getItem(getOverviewMonthlyStatKey('csob_cz_credit', normalizedMonth, field));
    if (creditStored !== null) {
      const n = Number(creditStored || 0);
      if (Number.isFinite(n)) { total += n; found = true; }
    }
  }
  return found ? total : null;
}

function setOverviewMonthlyStat(bankKey, monthStr, field, value) {
  const amount = Math.round((Number(value || 0) || 0) * 100) / 100;
  localStorage.setItem(getOverviewMonthlyStatKey(bankKey, monthStr, field), String(amount));
  return amount;
}


function setArchiveMonthlyStat(bankKey, monthStr, field, value) {
  const key = getArchiveMonthlyStatKey(bankKey, monthStr, field);
  const amount = Math.round((Number(value || 0) || 0) * 100) / 100;
  localStorage.setItem(key, String(amount));
  return amount;
}

function adjustArchiveMonthlyStat(bankKey, monthStr, field, delta) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const key = getArchiveMonthlyStatKey(bankKey, month, field);
  const current = Number(localStorage.getItem(key) || '0') || 0;
  return setArchiveMonthlyStat(bankKey, month, field, current + (Number(delta || 0) || 0));
}

function applyLocalArchiveStatsFromTransaction(tx, multiplier = 1) {
  if (!tx) return false;
  if (typeof isExcludedFromSpendingStats === 'function' && isExcludedFromSpendingStats(tx)) return false;
  const amount = Number(tx.amount || 0);
  const mult = Number(multiplier || 1);
  if (!isFinite(amount) || amount === 0 || !isFinite(mult) || mult === 0) return false;
  const bankKey = getArchiveBankKeyFromTransaction(tx);
  if (!bankKey) return false;
  const month = normalizeMonthStr(tx.month || getAktuálneMonth());
  const targetCurrency = getArchiveBankCurrency(bankKey);
  const converted = Math.abs(convertTransactionAmount(tx, targetCurrency));
  if (!isFinite(converted)) return false;
  if (amount < 0) adjustArchiveMonthlyStat(bankKey, month, 'spending', mult * converted);
  if (amount > 0) adjustArchiveMonthlyStat(bankKey, month, 'income', mult * converted);
  const netDelta = amount < 0 ? -converted : converted;
  adjustArchiveMonthlyStat(bankKey, month, 'net', mult * netDelta);
  return true;
}

function rebuildLocalArchiveStatsFromTransactions(options = {}) {
  const force = !!(options && options.force);
  if (!force) {
    const txnsAt = getLocalCacheTimestamp('cached_txns_updated_at');
    const statsAt = getLocalCacheTimestamp('cached_archive_stats_updated_at');
    if (statsAt && (!txnsAt || txnsAt <= statsAt) && isLocalCacheFresh('cached_archive_stats_updated_at')) {
      return;
    }
  }
  // Rebuild frontend monthly archive cache from the loaded transaction set.
  // This prevents stale Bank_Archive values from overriding what the user can see
  // in the filtered Transactions tab after add/delete/edit.
  const prefixRe = /^bank_monthly_(spending|income|net)_.+_\d{2}\/\d{4}$/;
  try {
    Object.keys(localStorage).forEach(key => {
      if (prefixRe.test(String(key || ''))) localStorage.removeItem(key);
    });
  } catch (e) {}

  const totals = {};
  const adjustments = buildTransactionStatsAdjustments(allTransactions);
  (allTransactions || []).forEach(tx => {
    if (!tx || !tx.month) return;
    const bankKey = getArchiveBankKeyFromTransaction(tx);
    if (!bankKey) return;
    const month = normalizeMonthStr(tx.month);
    const currency = getArchiveBankCurrency(bankKey);
    const amount = Number(adjustments.effective.get(tx) || 0);
    if (!Number.isFinite(amount) || amount === 0) return;
    const converted = convertTransactionStatsAmount(tx, amount, currency);
    if (!Number.isFinite(converted)) return;
    const key = bankKey + '|' + month;
    if (!totals[key]) totals[key] = { bankKey, month, spending: 0, income: 0, net: 0 };
    if (amount < 0) totals[key].spending += converted;
    if (amount > 0) totals[key].income += converted;
    totals[key].net += amount < 0 ? -converted : converted;
  });

  Object.values(totals).forEach(item => {
    setArchiveMonthlyStat(item.bankKey, item.month, 'spending', item.spending);
    setArchiveMonthlyStat(item.bankKey, item.month, 'income', item.income);
    setArchiveMonthlyStat(item.bankKey, item.month, 'net', item.net);
  });
  markLocalCacheTimestamp('cached_archive_stats_updated_at');
}

function getArchiveMonthlyStatFromTransactions(bankKey, monthStr, field, targetCurrency) {
  const normalizedMonth = normalizeMonthStr(monthStr);
  const target = currencyCode(targetCurrency || getArchiveBankCurrency(bankKey));
  const adjustments = buildTransactionStatsAdjustments(allTransactions);
  return allTransactions.reduce((sum, tx) => {
    if (normalizeMonthStr(tx.month) !== normalizedMonth) return sum;
    if (getArchiveBankKeyFromTransaction(tx) !== bankKey) return sum;
    const amount = Number(adjustments.effective.get(tx) || 0);
    const converted = convertTransactionStatsAmount(tx, amount, target);
    if (field === 'spending' && amount < 0) return sum + Math.abs(converted);
    if (field === 'income' && amount > 0) return sum + Math.abs(converted);
    if (field === 'net') return sum + (amount < 0 ? -Math.abs(converted) : Math.abs(converted));
    return sum;
  }, 0);
}

function hasArchiveTransactionsForBank(bankKey, monthStr, field) {
  const normalizedMonth = normalizeMonthStr(monthStr);
  const adjustments = buildTransactionStatsAdjustments(allTransactions);
  return allTransactions.some(tx => {
    if (normalizeMonthStr(tx.month) !== normalizedMonth) return false;
    if (getArchiveBankKeyFromTransaction(tx) !== bankKey) return false;
    const amount = Number(adjustments.effective.get(tx) || 0);
    if (field === 'spending') return amount < 0;
    if (field === 'income') return amount > 0;
    if (field === 'net') return amount !== 0;
    return false;
  });
}

function hasAnyArchiveTransactionsForBankMonth(bankKey, monthStr) {
  const normalizedMonth = normalizeMonthStr(monthStr);
  const adjustments = buildTransactionStatsAdjustments(allTransactions);
  return allTransactions.some(tx => {
    if (normalizeMonthStr(tx.month) !== normalizedMonth) return false;
    if (getArchiveBankKeyFromTransaction(tx) !== bankKey) return false;
    return Math.abs(Number(adjustments.effective.get(tx) || 0)) > 0.005;
  });
}

function hasAnyArchiveTransactionsForMonth(monthStr) {
  const normalizedMonth = normalizeMonthStr(monthStr);
  const adjustments = buildTransactionStatsAdjustments(allTransactions);
  return allTransactions.some(tx => {
    if (normalizeMonthStr(tx.month) !== normalizedMonth) return false;
    return Math.abs(Number(adjustments.effective.get(tx) || 0)) > 0.005;
  });
}

function getArchiveMonthlyStat(bankKey, monthStr, field, targetCurrency) {
  const normalizedMonth = normalizeMonthStr(monthStr);
  const target = currencyCode(targetCurrency || getArchiveBankCurrency(bankKey));

  // v162: live Transactions/Archive_Transactions are the UI source of truth.
  // Bank_Archive is a backend cache/snapshot and can be stale after local add/delete
  // or if the backend delta had an old bug. If we have loaded transactions for this
  // bank+month, calculate spent/income/net directly from them in the bank currency.
  // v285: if the selected month has loaded transactions, always compute live by bank
  // to avoid stale backend monthly cache (e.g. internal transfer leftovers).
  if (hasAnyArchiveTransactionsForMonth(normalizedMonth) || hasAnyArchiveTransactionsForBankMonth(bankKey, normalizedMonth)) {
    return getArchiveMonthlyStatFromTransactions(bankKey, normalizedMonth, field, target);
  }

  let total = 0;
  let hasStored = false;
  const stored = localStorage.getItem(getArchiveMonthlyStatKey(bankKey, normalizedMonth, field));
  if (stored !== null) {
    const n = Number(stored || 0);
    if (Number.isFinite(n)) { total += n; hasStored = true; }
  }
  if (bankKey === 'csob_cz') {
    const creditStored = localStorage.getItem(getArchiveMonthlyStatKey('csob_cz_credit', normalizedMonth, field));
    if (creditStored !== null) {
      const n = Number(creditStored || 0);
      if (Number.isFinite(n)) { total += n; hasStored = true; }
    }
  }
  if (!hasStored) {
    const overviewStored = localStorage.getItem(getOverviewMonthlyStatKey(bankKey, normalizedMonth, field));
    if (overviewStored !== null) {
      const n = Number(overviewStored || 0);
      if (Number.isFinite(n)) { total += n; hasStored = true; }
    }
    if (bankKey === 'csob_cz') {
      const overviewCreditStored = localStorage.getItem(getOverviewMonthlyStatKey('csob_cz_credit', normalizedMonth, field));
      if (overviewCreditStored !== null) {
        const n = Number(overviewCreditStored || 0);
        if (Number.isFinite(n)) { total += n; hasStored = true; }
      }
    }
  }
  if (hasStored) {
    // Bank_Settings monthly archive totals were historically stored in CZK.
    // Display them in the bank account currency, e.g. ČSOB SK in EUR.
    return target === 'CZK' ? total : convertAmountCurrency(total, 'CZK', target);
  }
  return getArchiveMonthlyStatFromTransactions(bankKey, normalizedMonth, field, target);
}

function getMonthlyArchiveSpentForBank(bankKey, monthStr) {
  return getArchiveMonthlyStat(bankKey, monthStr, 'spending', getArchiveBankCurrency(bankKey));
}

function formatMonthlyArchiveSpentCell(bankKey, monthStr) {
  const currency = getArchiveBankCurrency(bankKey);
  const spent = Number(getMonthlyArchiveSpentForBank(bankKey, monthStr) || 0);
  return spent ? ('-' + formatCurrencyAmount(Math.abs(spent), currency)) : formatCurrencyAmount(0, currency);
}

function renderArchiveCzkEquivalentHtml(amount, sourceCurrency, direction) {
  const source = currencyCode(sourceCurrency || 'CZK');
  if (source === 'CZK') return '';
  const value = Math.abs(Number(amount) || 0);
  const czk = convertAmountCurrency(value, source, 'CZK');
  const formatted = formatCurrencyAmount(czk, 'CZK');
  const text = (direction === 'spent' && value > 0) ? ('-' + formatted) : formatted;
  return `<div class="archive-bank-czk-equivalent">${escapeHtml(text)}</div>`;
}

function renderMonthlyArchiveSpentCellHtml(bankKey, monthStr) {
  const currency = getArchiveBankCurrency(bankKey);
  const spent = Number(getMonthlyArchiveSpentForBank(bankKey, monthStr) || 0);
  const main = spent ? ('-' + formatCurrencyAmount(Math.abs(spent), currency)) : formatCurrencyAmount(0, currency);
  const equivalent = renderArchiveCzkEquivalentHtml(spent, currency, 'spent');
  return `<div class="archive-amount-wrap"><div>${escapeHtml(main)}</div>${equivalent}</div>`;
}

function getMonthlyArchiveIncomeForBank(bankKey, monthStr) {
  return getArchiveMonthlyStat(bankKey, monthStr, 'income', getArchiveBankCurrency(bankKey));
}

function formatMonthlyArchiveIncomeCell(bankKey, monthStr) {
  const currency = getArchiveBankCurrency(bankKey);
  const income = Number(getMonthlyArchiveIncomeForBank(bankKey, monthStr) || 0);
  return income ? formatCurrencyAmount(income, currency) : formatCurrencyAmount(0, currency);
}

function renderMonthlyArchiveIncomeCellHtml(bankKey, monthStr) {
  const currency = getArchiveBankCurrency(bankKey);
  const income = Number(getMonthlyArchiveIncomeForBank(bankKey, monthStr) || 0);
  const main = income ? formatCurrencyAmount(income, currency) : formatCurrencyAmount(0, currency);
  const equivalent = renderArchiveCzkEquivalentHtml(income, currency, 'income');
  return `<div class="archive-amount-wrap"><div>${escapeHtml(main)}</div>${equivalent}</div>`;
}

function getArchiveMonthTotalsForBanks(bankKeys, monthStr, targetCurrency) {
  const currency = currencyCode(targetCurrency || getAppCurrency() || 'CZK');
  let spent = 0;
  let income = 0;
  (bankKeys || []).forEach(bankKey => {
    const sourceCurrency = getArchiveBankCurrency(bankKey);
    const bankSpent = Number(getMonthlyArchiveSpentForBank(bankKey, monthStr) || 0);
    const bankIncome = Number(getMonthlyArchiveIncomeForBank(bankKey, monthStr) || 0);
    if (bankSpent > 0) spent += Math.max(0, Number(convertAmountCurrency(bankSpent, sourceCurrency, currency) || 0));
    if (bankIncome > 0) income += Math.max(0, Number(convertAmountCurrency(bankIncome, sourceCurrency, currency) || 0));
  });
  return { spent, income, currency };
}

function renderArchiveMonthTotalsRowHtml(bankKeys, monthStr) {
  const totals = getArchiveMonthTotalsForBanks(bankKeys, monthStr, getAppCurrency() || 'CZK');
  const spentMain = totals.spent ? ('-' + formatCurrencyAmount(Math.abs(totals.spent), totals.currency)) : formatCurrencyAmount(0, totals.currency);
  const incomeMain = totals.income ? formatCurrencyAmount(totals.income, totals.currency) : formatCurrencyAmount(0, totals.currency);
  const spentEquivalent = renderArchiveCzkEquivalentHtml(totals.spent, totals.currency, 'spent');
  const incomeEquivalent = renderArchiveCzkEquivalentHtml(totals.income, totals.currency, 'income');
  const totalLabel = escapeHtml(t('accountBalanceTotal'));
  const monthLabel = escapeAttr(formatMonthString(monthStr));
  return `<div class="archive-bank-spent-row archive-bank-total-row" title="${monthLabel} · ${totalLabel}">
    <div class="archive-bank-limit-cell archive-bank-total-label" title="${monthLabel} · ${totalLabel}">${totalLabel}<div class="archive-bank-status">${escapeHtml(totals.currency)}</div></div>
    <div class="archive-bank-spent-cell" onclick="event.stopPropagation(); openArchiveMonthFilter('všetky','${monthStr}','spent')" title="${monthLabel} · ${escapeAttr(t('spent'))} · ${escapeAttr(t('outgoing'))}"><div class="archive-amount-wrap"><div>${escapeHtml(spentMain)}</div>${spentEquivalent}</div></div>
    <div class="archive-bank-income-cell" onclick="event.stopPropagation(); openArchiveMonthFilter('všetky','${monthStr}','income')" title="${monthLabel} · ${escapeAttr(t('income'))} · ${escapeAttr(t('incoming'))}"><div class="archive-amount-wrap"><div>${escapeHtml(incomeMain)}</div>${incomeEquivalent}</div></div>
  </div>`;
}

function getArchiveCardLimitForMonth(bankKey, monthStr) {
  const bank = getArchiveBankInfo(bankKey);
  const systemBank = BANKS[bankKey];
  const hist = getLimitsForMonth(monthStr);
  if (systemBank && systemBank.limitKey) return hist[systemBank.limitKey] ?? systemBank.defaultLimit ?? 0;

  const custom = getCustomBanks().find(b => b && b.id === bankKey);
  const monthlyStored = localStorage.getItem(`bank_card_limit_${bankKey}_${normalizeMonthStr(monthStr)}`);
  const stored = monthlyStored !== null ? monthlyStored : localStorage.getItem(`bank_card_limit_${bankKey}`);
  const value = parseFloat(stored ?? custom?.cardLimit ?? bank?.defaultLimit ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function getCustomArchiveBankColor(bankKey) {
  const palette = ['#7dd3fc', '#c084fc', '#f9a8d4', '#fde047', '#86efac', '#fdba74', '#a5b4fc', '#67e8f9'];
  let hash = 0;
  String(bankKey || '').split('').forEach(ch => { hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0; });
  return palette[Math.abs(hash) % palette.length];
}

function getArchiveBankKeyFromTransaction(tx) {
  const explicit = String(tx.bankId || tx.bankKey || '').trim();
  if (explicit === 'csob_cz_credit') return 'csob_cz';
  if (explicit && (BANKS[explicit] || explicit.startsWith('custom_'))) return explicit;
  const detectedKey = getBankKey(tx);
  if (detectedKey === 'csob_cz_credit') return 'csob_cz';
  const bankText = String(tx.bank || tx.banka || '').trim().toLowerCase();
  const custom = getCustomBanks().find(b => {
    if (!b || b.active === false) return false;
    const id = String(b.id || '').toLowerCase();
    const name = String(b.name || '').toLowerCase();
    const account = String(b.account || '').toLowerCase();
    return (id && bankText === id) || (name && bankText.includes(name)) || (account && bankText.includes(account.replace(/\*/g, '')));
  });
  const fallbackKey = custom ? custom.id : getBankKey(tx);
  return fallbackKey === 'csob_cz_credit' ? 'csob_cz' : fallbackKey;
}