// Generated app-core slice 11/34 (declarations).

function maybeSendBudgetLocalNotification(bankKey, bankLabel, spent, budget, remaining, warning) {
  if (!budget || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const month = getAktuálneMonth();

  // Bezpečná funkcia na odoslanie notifikácie, ktorá nezabije appku na Androide
  const sendSafeNotification = (bodyText) => {
    try {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg && reg.showNotification) {
            reg.showNotification('Bank Tracker', { body: bodyText, icon: '/icon.png' });
          } else {
            new Notification('Bank Tracker', { body: bodyText });
          }
        }).catch(() => {
          new Notification('Bank Tracker', { body: bodyText });
        });
      } else {
        new Notification('Bank Tracker', { body: bodyText });
      }
    } catch (e) {
      console.warn("Local notification skipped:", e);
    }
  };

  if (warning && remaining > 0 && remaining <= warning) {
    const key = `budget_warn_${bankKey}_${month}_${budget}_${warning}`;
    if (localStorage.getItem(key) !== 'sent') {
      sendSafeNotification(`${bankLabel}: minuté ${formatCurrencyAmount(spent, getBankBudgetCurrency(bankKey))}. Ostáva ${formatCurrencyAmount(remaining, getBankBudgetCurrency(bankKey))} do konca mesačného budgetu.`);
      localStorage.setItem(key, 'sent');
    }
  }
  if (remaining <= 0) {
    const key = `budget_over_${bankKey}_${month}_${budget}`;
    if (localStorage.getItem(key) !== 'sent') {
      sendSafeNotification(`${bankLabel}: mesačný budget ${formatCurrencyAmount(budget, getBankBudgetCurrency(bankKey))} bol prekročený.`);
      localStorage.setItem(key, 'sent');
    }
  }
}

function getCurrentMonthOutgoingTransactions() {
  const month = getAktuálneMonth();
  return allTransactions.filter(t => t.month === month && Number(t.amount) < 0);
}

function getCurrentMonthCardTransactions() {
  return getCurrentMonthOutgoingTransactions().filter(t => isCardTransaction(t));
}

function getTransactionsCzkEquivalentTotal(txns) {
  return txns.reduce((sum, tx) => {
    return sum + Math.abs(convertTransactionAmount(tx, 'CZK'));
  }, 0);
}



function getLatestStoredAccountBalanceForBank(bankKey, selectedMonth = getAktuálneMonth()) {
  const id = String(bankKey || '').trim();
  if (!id) return 0;
  const normalizedSelected = normalizeMonthStr(selectedMonth || getAktuálneMonth());
  const testSetting = getLocalTestOverviewBankSetting(id, normalizedSelected);
  if (testSetting && testSetting.balance !== undefined) return Number(testSetting.balance || 0) || 0;
  if (hasSheetAccountBalanceAuthority(id, normalizedSelected)) {
    const sheetStored = localStorage.getItem(getSheetAccountBalanceValueKey(id, normalizedSelected));
    if (sheetStored !== null && Number.isFinite(Number(sheetStored))) {
      return Number(sheetStored);
    }
    const exactKey = getAccountBalanceStorageKey(id, normalizedSelected);
    const exact = localStorage.getItem(exactKey);
    if (exact !== null) return Number(exact || 0) || 0;
    return 0;
  }
  const exactKey = getAccountBalanceStorageKey(id, normalizedSelected);
  const exact = localStorage.getItem(exactKey);
  if (exact !== null) return Number(exact || 0) || 0;

  const base = localStorage.getItem(getAccountBalanceStorageKey(id));
  if (base !== null) return Number(base || 0) || 0;

  const prefix = 'bank_account_balance_' + id + '_';
  const rows = [];
  Object.keys(localStorage).forEach(key => {
    if (!key.startsWith(prefix)) return;
    const month = normalizeMonthStr(key.slice(prefix.length));
    const value = Number(localStorage.getItem(key) || 0) || 0;
    if (month) rows.push({ month, value });
  });
  rows.sort((a, b) => monthSortValue(b.month) - monthSortValue(a.month));
  const selectedSort = monthSortValue(normalizedSelected);
  const sameOrOlder = rows.find(r => monthSortValue(r.month) <= selectedSort);
  if (sameOrOlder) return sameOrOlder.value;
  return rows[0]?.value || 0;
}

function getOverviewBankCardLimitForBank(bankKey, monthStr = getAktuálneMonth()) {
  const testSetting = getLocalTestOverviewBankSetting(bankKey, monthStr);
  if (testSetting && testSetting.cardLimit !== undefined) return Number(testSetting.cardLimit || 0) || 0;
  const fromArchive = Number(getArchiveCardLimitForMonth(bankKey, monthStr) || 0) || 0;
  if (fromArchive) return fromArchive;
  return Number(getMonthlyCardLimitForBank(bankKey, monthStr) || 0) || 0;
}

function getOverviewBudgetLimitForBank(bankKey, monthStr = getAktuálneMonth()) {
  const testSetting = getLocalTestOverviewBankSetting(bankKey, monthStr);
  if (testSetting && testSetting.budget !== undefined) return Number(testSetting.budget || 0) || 0;
  const settings = getBudgetSettingsForBank(bankKey, monthStr);
  return Number(settings?.budget || 0) || 0;
}

function getOverviewBudgetWarningForBank(bankKey, monthStr = getAktuálneMonth()) {
  const testSetting = getLocalTestOverviewBankSetting(bankKey, monthStr);
  if (testSetting && testSetting.warning !== undefined) return Number(testSetting.warning || 0) || 0;
  const settings = getBudgetSettingsForBank(bankKey, monthStr);
  return Number(settings?.warning || 0) || 0;
}

function getOverviewBudgetSpentForBank(bankKey, monthStr = getAktuálneMonth()) {
  const overviewStored = getStoredOverviewMonthlyStat(bankKey, monthStr, 'spending');
  if (overviewStored !== null) return overviewStored;
  const archive = Number(getMonthlyArchiveSpentForBank(bankKey, monthStr) || 0) || 0;
  if (archive) return archive;
  return Number(getCurrentMonthSpentInBankCurrency(bankKey) || 0) || 0;
}

function getOverviewBudgetDailySeries(monthStr = getAktuálneMonth(), currency = getAppCurrency()) {
  const normalizedMonth = normalizeMonthStr(monthStr || getAktuálneMonth());
  const [month, year] = normalizedMonth.split('/').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const targetCurrency = currencyCode(currency || getAppCurrency() || 'CZK');
  const daily = Array.from({ length: daysInMonth }, (_, idx) => ({ day: idx + 1, value: 0 }));

  (allTransactions || []).forEach(tx => {
    if (normalizeMonthStr(tx.month) !== normalizedMonth) return;
    if (Number(tx.amount || 0) >= 0) return;
    if (typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)) return;
    const parsed = parseCustomDateStr(tx.rawDate || tx.date);
    if (!parsed || isNaN(parsed.getTime())) return;
    const day = parsed.getDate();
    if (day < 1 || day > daysInMonth) return;
    daily[day - 1].value += Math.abs(convertTransactionAmount(tx, targetCurrency));
  });

  let cumulative = 0;
  return daily.map(item => {
    cumulative += item.value;
    return { day: item.day, value: cumulative };
  });
}

function getOverviewMonthSpentInCurrency(targetCurrency = getAppCurrency(), bankKey = null) {
  const month = normalizeMonthStr(getAktuálneMonth());
  const target = currencyCode(targetCurrency || getAppCurrency());
  return (allTransactions || [])
    .filter(tx => normalizeMonthStr(tx.month) === month && Number(tx.amount || 0) < 0)
    .filter(tx => !(typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)))
    .filter(tx => !(typeof isInternalTransferTransaction === 'function' && isInternalTransferTransaction(tx)))
    .filter(tx => !bankKey || getBudgetBankKeyFromTransaction(tx) === bankKey)
    .reduce((sum, tx) => sum + Math.abs(convertTransactionAmount(tx, target)), 0);
}

function getOverviewBudgetTransactionSeries(monthStr = getAktuálneMonth(), currency = getAppCurrency()) {
  const normalizedMonth = normalizeMonthStr(monthStr || getAktuálneMonth());
  const targetCurrency = currencyCode(currency || getAppCurrency() || 'CZK');
  const monthStart = new Date(normalizedMonth.split('/')[1], Number(normalizedMonth.split('/')[0]) - 1, 1, 0, 0, 0, 0).getTime();
  const monthEnd = new Date(normalizedMonth.split('/')[1], Number(normalizedMonth.split('/')[0]), 0, 23, 59, 59, 999).getTime();

  const txns = (allTransactions || [])
    .filter(tx => normalizeMonthStr(tx.month) === normalizedMonth)
    .filter(tx => Number(tx.amount || 0) < 0)
    .filter(tx => !(typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)))
    .map(tx => ({
      tx,
      date: parseCustomDateStr(tx.rawDate || tx.date)
    }))
    .filter(item => item.date && !isNaN(item.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let cumulative = 0;
  return txns.map(item => {
    cumulative += Math.abs(convertTransactionAmount(item.tx, targetCurrency));
    const time = Math.min(Math.max(item.date.getTime(), monthStart), monthEnd);
    return {
      timestamp: time,
      value: cumulative
    };
  });
}

function getOverviewCardUsedCountForBank(bankKey, monthStr = getAktuálneMonth()) {
  const normalizedMonth = normalizeMonthStr(monthStr || getAktuálneMonth());
  return (allTransactions || []).filter(tx => {
    if (normalizeMonthStr(tx.month) !== normalizedMonth) return false;
    if (Number(tx.amount || 0) >= 0) return false;
    if (!isCardTransaction(tx)) return false;
    const key = getBankKey(tx);
    if (bankKey === 'csob_cz') return key === 'csob_cz' || key === 'csob_cz_credit';
    return key === bankKey;
  }).length;
}

function getOverviewCreditCardLimit(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const testSetting = getLocalTestOverviewBankSetting('csob_cz_credit', month);
  if (testSetting && testSetting.creditCardLimit !== undefined) return Number(testSetting.creditCardLimit || 0) || 0;
  const explicit = localStorage.getItem(getCreditCardLimitStorageKey('csob_cz_credit', month));
  if (explicit !== null) return Number(explicit || 0) || 0;
  const custom = getCustomBanks().find(b => b && b.id === 'csob_cz_credit');
  if (custom && (custom.creditCardLimit !== undefined || custom.creditLimit !== undefined)) {
    return Number(custom.creditCardLimit || custom.creditLimit || 0) || 0;
  }
  const legacyMonthly = localStorage.getItem(getMonthlyCardLimitStorageKey('csob_cz_credit', month));
  if (legacyMonthly !== null) return Number(legacyMonthly || 0) || 0;
  const legacyArchive = Number(getArchiveCardLimitForMonth('csob_cz_credit', month) || 0) || 0;
  return legacyArchive;
}

function getOverviewStoredAssetValue(keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    const raw = localStorage.getItem(String(key || ''));
    if (raw !== null && String(raw).trim() !== '') {
      const n = Number(String(raw).replace(/[^0-9,.-]/g, '').replace(',', '.'));
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function getOverviewInvestmentsValue(appCurrency) {
  return getOverviewStoredAssetValue([
    'overview_investments_value_' + appCurrency,
    'overview_assets_investments_' + appCurrency,
    'overview_investments_value',
    'overview_assets_investments',
    'investments_value',
    'asset_investments_value'
  ]);
}

function getOverviewPropertiesValue(appCurrency) {
  return getOverviewStoredAssetValue([
    'overview_properties_value_' + appCurrency,
    'overview_assets_properties_' + appCurrency,
    'overview_properties_value',
    'overview_assets_properties',
    'properties_value',
    'property_value',
    'asset_properties_value'
  ]);
}

function getAccountBalanceCashTotal(monthStr = getAktuálneMonth(), targetCurrency = getAppCurrency()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const target = targetCurrency || getAppCurrency();
  const parentedCreditIds = new Set(CREDIT_BALANCE_SUBACCOUNTS.map(item => item.id));
  return getAllManagedBanksForBalance(month).reduce((sum, bank) => {
    if (!bank || parentedCreditIds.has(bank.id) || bank.liability) return sum;
    return sum + convertSignedAmountCurrency(Number(bank.balance || 0), bank.currency || target, target);
  }, 0);
}

function getOverviewDetailsAccountBalanceTotal(monthStr = getAktuálneMonth(), appCurrency = getAppCurrency()) {
  return getAccountBalanceCashTotal(monthStr, appCurrency || getAppCurrency());
}

function getOverviewDashboardMetrics() {
  const appCurrency = getAppCurrency();
  const month = normalizeMonthStr(getAktuálneMonth());
  const allBanks = getAllManagedBanksForBalance(month);
  const creditChildrenByParent = {};
  CREDIT_BALANCE_SUBACCOUNTS.forEach(config => {
    const item = getCreditBalanceSubaccountData(config);
    if (!item || !item.parentId) return;
    const balanceBank = allBanks.find(b => b.id === item.id);
    const child = {
      ...item,
      balance: balanceBank ? getLatestStoredAccountBalanceForBank(item.id, month) : getCreditOutstandingBalance(item.id),
      currency: balanceBank?.currency || item.currency || 'CZK',
      liability: true
    };
    if (!creditChildrenByParent[item.parentId]) creditChildrenByParent[item.parentId] = [];
    creditChildrenByParent[item.parentId].push(child);
  });
  const parentedCreditIds = new Set(CREDIT_BALANCE_SUBACCOUNTS.map(item => item.id));
  const banks = allBanks.filter(bank => !parentedCreditIds.has(bank.id));

  const creditChildren = Object.values(creditChildrenByParent).flat();
  const creditAvailable = creditChildren.reduce((sum, child) => {
    return sum + Math.max(0, convertAmountCurrency(getCreditAvailableBalanceDisplay(child.balance || 0), child.currency || appCurrency, appCurrency));
  }, 0);
  const creditMonthlyUsed = getCreditCardMonthlyUsedAmount(appCurrency);
  const creditLimitRaw = getOverviewCreditCardLimit(month);
  const creditLimit = convertAmountCurrency(creditLimitRaw || 0, getCreditOutstandingCurrency('csob_cz_credit') || appCurrency, appCurrency);
  const creditUsed = creditMonthlyUsed > 0 ? creditMonthlyUsed : Math.max(0, (Number(creditLimit || 0) || 0) - (Number(creditAvailable || 0) || 0));
  const creditOutstanding = creditUsed;
  const creditPct = creditLimit > 0 ? Math.min(creditUsed / creditLimit, 1) : 0;
  const hasCreditWidget = creditLimit > 0 || creditUsed > 0 || creditAvailable > 0 || getSheetCreditBankRows().length > 0;

  // The Overview cash number must mirror "Total balance" in Overview details.
  // Available credit is not cash and must not inflate cash/net worth.
  const availableCash = getOverviewDetailsAccountBalanceTotal(month, appCurrency);
  const investmentsValue = getOverviewInvestmentsValue(appCurrency);
  const propertiesValue = getOverviewPropertiesValue(appCurrency);
  const totalNetWorth = availableCash + investmentsValue + propertiesValue;

  const visibleBankKeys = BANK_ORDER.filter(bankKey => bankKey !== 'csob_cz_credit');
  const byBankMonth = getTransactionsByBank(true, true);
  const mergedCardTxns = { ...(byBankMonth || {}) };
  mergedCardTxns.csob_cz = [ ...(mergedCardTxns.csob_cz || []), ...(mergedCardTxns.csob_cz_credit || []) ];
  const cardUsed = visibleBankKeys.reduce((sum, bankKey) => sum + ((mergedCardTxns[bankKey] || []).length), 0);
  const cardLimit = visibleBankKeys.reduce((sum, bankKey) => sum + Math.max(0, getOverviewBankCardLimitForBank(bankKey, month)), 0);
  const cardPct = cardLimit > 0 ? Math.min(cardUsed / cardLimit, 1) : 0;

  let budgetSpent = 0;
  let budgetLimit = 0;
  visibleBankKeys.forEach(bankKey => {
    const bankCurrency = getBankBudgetCurrency(bankKey);
    const spent = getOverviewBudgetSpentForBank(bankKey, month);
    const budget = getOverviewBudgetLimitForBank(bankKey, month);
    budgetSpent += convertAmountCurrency(spent || 0, bankCurrency || appCurrency, appCurrency);
    budgetLimit += convertAmountCurrency(budget || 0, bankCurrency || appCurrency, appCurrency);
  });
  // Keep Bank budget "spent" aligned with the Overview top bar (real monthly spent).
  try {
    const topBarSpentCzk = Number(getArchiveMonthSpentTotalCzk(month) || 0);
    const topBarSpentInAppCurrency = Number(convertAmountCurrency(topBarSpentCzk, 'CZK', appCurrency) || 0);
    if (isFinite(topBarSpentInAppCurrency) && topBarSpentInAppCurrency >= 0) {
      budgetSpent = topBarSpentInAppCurrency;
    }
  } catch (_) {}
  const budgetPct = budgetLimit > 0 ? Math.min(budgetSpent / budgetLimit, 1) : 0;
  const budgetTransactionSeries = getOverviewBudgetTransactionSeries(month, appCurrency);

  const monthTxns = allTransactions.filter(t => normalizeMonthStr(t.month) === month);
  const cashTxns = monthTxns.filter(t => normalizePaymentKindValue(t.paymentKind || t.type) === 'cash' && Number(t.amount || 0) < 0);
  const cashSpent = cashTxns.reduce((sum, tx) => sum + Math.abs(convertTransactionAmount(tx, appCurrency)), 0);

  return { appCurrency, totalNetWorth, availableCash, investmentsValue, propertiesValue, cardUsed, cardLimit, cardPct, budgetSpent, budgetLimit, budgetPct, budgetTransactionSeries, budgetDailySeries: budgetTransactionSeries, cashSpent, creditOutstanding, creditUsed, creditLimit, creditAvailable, creditPct, hasCreditWidget };
}

function createOverviewHalfGauge(percent, caption, mainText = '') {
  const pct = Math.max(0, Math.min(100, Math.round((Number(percent || 0) || 0) * 100)));
  const isEmpty = pct < 1;
  const centerText = mainText ? escapeHtml(String(mainText)) : `${pct}%`;
  const arcStroke = isEmpty
    ? 'stroke-dasharray="0 100" opacity="0" stroke-linecap="butt"'
    : `stroke-dasharray="100 100" stroke-dashoffset="${100 - pct}" stroke-linecap="round" data-gauge-pct="${pct}" style="--gauge-pct:${pct}"`;
  const arcClass = isEmpty ? 'wealth-gauge-arc is-empty-arc' : 'wealth-gauge-arc';
  return `
    <div class="mini-half-gauge">
      <svg viewBox="${HALF_GAUGE_VIEWBOX}" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="wealthGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#00E5A0"></stop>
            <stop offset="100%" stop-color="#58cfff"></stop>
          </linearGradient>
        </defs>
        <path d="${HALF_GAUGE_ARC_PATH}" fill="none" stroke="rgba(112,145,204,.18)" stroke-width="12" stroke-linecap="round"></path>
        <path class="${arcClass}" pathLength="100" d="${HALF_GAUGE_ARC_PATH}" fill="none" stroke="url(#wealthGaugeGrad)" stroke-width="12" ${arcStroke}></path>
      </svg>
      <div class="mini-half-gauge-center">
        <span class="pct">${centerText}</span>
        <span class="caption">${escapeHtml(caption || '')}</span>
      </div>
    </div>`;
}

function createOverviewInlineProgress(leftText, rightText, ratio, statusText, statusClass) {
  const width = Math.max(0, Math.min(100, Math.round((Number(ratio || 0) || 0) * 100)));
  const noStatus = !String(statusText || '').trim();
  return `
    <div class="wealth-inline-progress-labels ${noStatus ? 'no-status' : ''}">
      <span>${escapeHtml(String(leftText || '0'))}</span>
      <span class="wealth-inline-progress-status ${escapeAttr(statusClass || '')}">${escapeHtml(String(statusText || ''))}</span>
      <span>${escapeHtml(String(rightText || '0'))}</span>
    </div>
    <div class="wealth-inline-progress-track">
      <div class="wealth-inline-progress-fill wealth-anim-fill ${escapeAttr(statusClass || '')}" style="width:${Math.max(width, statusClass === 'is-empty' ? 4 : 0)}%;"></div>
    </div>`;
}