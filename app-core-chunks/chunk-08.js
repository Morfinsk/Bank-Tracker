// Generated app-core slice 8/34 (declarations).

function schedulePostBootPresentations() {
  window.setTimeout(() => {
    if (activePageId === 'overview') {
      try { scheduleOverviewPageBootAnimation({ delayMs: 0 }); } catch (_) {}
    }
    try { finishOverviewChartRenderCycle(); } catch (_) {}
    window.setTimeout(() => {
      __bootPresentationPhase = false;
      __appBootSequenceRunning = false;
    }, 480);
  }, APP_BOOT_POST_REVEAL_MS + 140);
}

function completeAppBootSequence() {
  if (__appBootSequenceRunning || !__appBootActive) return;
  if (__appBootCompleteTimer) {
    window.clearTimeout(__appBootCompleteTimer);
    __appBootCompleteTimer = null;
  }
  __appBootSequenceRunning = true;
  fadeOutBootOverlay(() => {
    revealBootPageContent(() => {
      schedulePostBootPresentations();
    });
  });
}

function showTabPageLoadingOverlay() {
  __tabLoadingDepth++;
  const overlay = ensurePageLoadingOverlay();
  overlay.classList.add('show');
  overlay.classList.remove('is-hiding', 'is-cycle-complete');
  overlay.setAttribute('aria-busy', 'true');
  restartBtLogoDrawAnimation(overlay, { force: true });
}

function hideTabPageLoadingOverlay() {
  __tabLoadingDepth = Math.max(0, __tabLoadingDepth - 1);
  if (__tabLoadingDepth <= 0 && !__appBootActive && !document.body.classList.contains('app-boot-pending')) {
    hidePageLoadingOverlay();
  }
}
function showPageLoadingOverlayDelayed(delayMs = 100) {
  if (pageLoadingTimer) clearTimeout(pageLoadingTimer);
  pageLoadingTimer = setTimeout(() => {
    showTabPageLoadingOverlay();
  }, Math.max(0, Number(delayMs || 0)));
}

function showPageLoadingOverlayNow() {
  if (pageLoadingTimer) { clearTimeout(pageLoadingTimer); pageLoadingTimer = null; }
  if (__appBootActive || document.body.classList.contains('app-boot-pending')) {
    const overlay = ensurePageLoadingOverlay();
    overlay.classList.add('show');
    overlay.classList.remove('is-hiding');
    overlay.setAttribute('aria-busy', 'true');
    return;
  }
  showTabPageLoadingOverlay();
}

function hidePageLoadingOverlay() {
  if (pageLoadingTimer) {
    clearTimeout(pageLoadingTimer);
    pageLoadingTimer = null;
  }
  if (__appBootActive || __tabLoadingDepth > 0) return;
  const overlay = document.getElementById('page-loading-overlay');
  if (!overlay || !overlay.classList.contains('show')) return;
  overlay.classList.add('is-hiding');
  overlay.classList.remove('show');
  overlay.removeAttribute('aria-busy');
  overlay.style.removeProperty('will-change');
  window.setTimeout(() => {
    overlay.classList.remove('is-hiding');
    try { flushChartsAfterOverlayHide(); } catch (_) {}
  }, APP_BOOT_OVERLAY_FADE_MS);
}
function finishAppBoot() {
  if (__appBootActive) {
    finalizeAppBootPresentation();
    return;
  }
  hideAppBootChrome();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try { finishOverviewChartRenderCycle(); } catch (_) {}
    });
  });
}
function hideAppBootChrome() {
  __appBootActive = false;
  document.body.classList.remove('app-boot-pending');
  document.body.classList.add('app-boot-reveal');
  if (__tabLoadingDepth <= 0) hidePageLoadingOverlay();
  const overlay = document.getElementById('page-loading-overlay');
  if (overlay) {
    overlay.classList.remove('show', 'is-hiding');
    overlay.removeAttribute('aria-busy');
  }
  try { dismissLargeStatusToast(); } catch (_) {}
  try { dismissBackExitToast(); } catch (_) {}
  try { closeBottomSheets(); } catch (_) {}
  __bootPresentationPhase = false;
}

function tryCompleteAppBootFromOverviewRender() {
  if (!__appBootActive || __appBootSequenceRunning) return;
  if (SHEETS_URL && isGoogleSheetsEnabled()) return;
  finalizeAppBootPresentation();
}

function exitBankTrackerApp() {
  dismissBackExitToast();

  try { window.close(); } catch (_) {}

  window.setTimeout(() => {
    try { history.back(); } catch (_) {}
  }, 60);
}

function pushTabHistory(pageId) {
  if (!window.__bankTrackerTabHistoryReady) return;
  if (!pageId || activePageId === pageId) return;

  try {
    history.pushState({ bankTrackerPage: pageId }, '', location.pathname + location.search + '#' + pageId);
  } catch (_) {}
}

function getTransactionsByBank(monthOnly = true, cardOnly = false, includeIncoming = false) {
  const month = getAktuálneMonth();
  let base = allTransactions.filter(t => (includeIncoming || Number(t.amount) < 0) && (!monthOnly || normalizeMonthStr(t.month) === normalizeMonthStr(month)));

  if (cardOnly) {
    base = base.filter(t => isCardTransaction(t));
  }

  return BANK_ORDER.reduce((acc, key) => {
    acc[key] = base.filter(t => getBankKey(t) === key);
    return acc;
  }, {});
}

function getBudgetBankKeyFromTransaction(tx) {
  const key = getBankKey(tx);
  // ČSOB CZ credit card repayments/usage belong to the ČSOB CZ monthly budget.
  if (key === 'csob_cz_credit') return 'csob_cz';
  return key;
}

function getAktuálneMonthCzkSpent(bankKey = null) {
  const month = normalizeMonthStr(getAktuálneMonth());
  const adjustments = buildTransactionStatsAdjustments(allTransactions);

  // Bank budget must include every outgoing payment kind:
  // card payments, account payments and manual cash payments.
  // ČSOB CZ credit card is budgeted under ČSOB CZ, not as a separate bank budget row.
  return allTransactions
    .filter(t => normalizeMonthStr(t.month) === month && Number(adjustments.effective.get(t) || 0) < 0)
    .filter(t => !bankKey || getBudgetBankKeyFromTransaction(t) === bankKey)
    .reduce((sum, t) => sum + convertTransactionStatsAmount(t, adjustments.effective.get(t), 'CZK'), 0);
}

function getArchiveTotalsBankKeys(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const keys = new Set((BANK_ORDER || []).filter(k => k && k !== 'csob_cz_credit'));
  (getCustomBanks() || []).forEach(b => {
    const id = String(b?.id || '').trim();
    if (id) keys.add(id);
  });
  (allTransactions || []).forEach(tx => {
    if (!tx || normalizeMonthStr(tx.month) !== month) return;
    let key = String(getArchiveBankKeyFromTransaction(tx) || '').trim();
    if (!key || key === 'csob_cz_credit') key = 'csob_cz';
    if (key) keys.add(key);
  });
  return Array.from(keys);
}

function getArchiveMonthSpentTotalCzk(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const bankKeys = getArchiveTotalsBankKeys(month);
  const totals = getArchiveMonthTotalsForBanks(bankKeys, month, 'CZK');
  return Number(totals?.spent || 0) || 0;
}

function debugOverviewArchiveSpentDiff(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const overviewCzk = (allTransactions || []).reduce((sum, tx) => {
    if (!tx || normalizeMonthStr(tx.month) !== month) return sum;
    if (Number(tx.amount || 0) >= 0) return sum;
    if (isExcludedFromSpendingStats(tx)) return sum;
    return sum + Math.abs(convertTransactionAmount(tx, 'CZK'));
  }, 0);
  const archiveCzk = Number(getArchiveMonthSpentTotalCzk(month) || 0);
  const bankKeys = getArchiveTotalsBankKeys(month);

  const byBank = bankKeys.map(bankKey => {
    const archiveBankCurrency = getArchiveBankCurrency(bankKey);
    const archiveBankSpent = Number(getMonthlyArchiveSpentForBank(bankKey, month) || 0);
    const archiveBankCzk = Number(convertAmountCurrency(archiveBankSpent, archiveBankCurrency, 'CZK') || 0);
    const txBankCzk = (allTransactions || []).reduce((sum, tx) => {
      if (!tx || normalizeMonthStr(tx.month) !== month) return sum;
      if (Number(tx.amount || 0) >= 0) return sum;
      if (isExcludedFromSpendingStats(tx)) return sum;
      if (getArchiveBankKeyFromTransaction(tx) !== bankKey) return sum;
      return sum + Math.abs(convertTransactionAmount(tx, 'CZK'));
    }, 0);
    const delta = archiveBankCzk - txBankCzk;
    return {
      bankKey,
      bankName: getArchiveBankName(bankKey),
      archiveBankCurrency,
      archiveBankSpent,
      archiveBankCzk,
      txBankCzk,
      deltaCzk: delta
    };
  }).filter(row => Math.abs(Number(row.deltaCzk || 0)) > 0.01);

  const rawMonthMismatchTx = (allTransactions || []).filter(tx => {
    if (!tx) return false;
    if (normalizeMonthStr(tx.month) !== month) return false;
    if (String(tx.month || '') === month) return false;
    if (Number(tx.amount || 0) >= 0) return false;
    if (isExcludedFromSpendingStats(tx)) return false;
    return true;
  }).map(tx => ({
    monthRaw: String(tx.month || ''),
    date: tx.date || '',
    merchant: tx.merchant || '',
    amount: Number(tx.amount || 0),
    currency: tx.currency || 'CZK',
    amountCzk: Math.abs(convertTransactionAmount(tx, 'CZK')),
    bank: tx.bank || '',
    msgId: tx.msgId || tx.id || ''
  }));

  const result = {
    month,
    overviewCzk,
    archiveCzk,
    diffCzk: archiveCzk - overviewCzk,
    byBank,
    rawMonthMismatchTx
  };
  try { console.table(byBank); } catch (_) {}
  try { console.table(rawMonthMismatchTx); } catch (_) {}
  console.log('[debugOverviewArchiveSpentDiff]', result);
  return result;
}

function debugOverviewArchiveMonthDiff(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const strictOverviewTx = (allTransactions || []).filter(tx => {
    if (!tx) return false;
    if (String(tx.month || '') !== month) return false;
    if (Number(tx.amount || 0) >= 0) return false;
    if (typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)) return false;
    if (typeof isInternalTransferTransaction === 'function' && isInternalTransferTransaction(tx)) return false;
    return true;
  });
  const normalizedOverviewTx = (allTransactions || []).filter(tx => {
    if (!tx) return false;
    if (normalizeMonthStr(tx.month) !== month) return false;
    if (Number(tx.amount || 0) >= 0) return false;
    if (typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)) return false;
    if (typeof isInternalTransferTransaction === 'function' && isInternalTransferTransaction(tx)) return false;
    return true;
  });
  const onlyNormalized = normalizedOverviewTx.filter(tx => String(tx.month || '') !== month);
  const strictSum = strictOverviewTx.reduce((sum, tx) => sum + Math.abs(convertTransactionAmount(tx, 'CZK')), 0);
  const normalizedSum = normalizedOverviewTx.reduce((sum, tx) => sum + Math.abs(convertTransactionAmount(tx, 'CZK')), 0);
  const diff = normalizedSum - strictSum;

  const details = onlyNormalized.map(tx => ({
    monthRaw: String(tx.month || ''),
    date: tx.date || '',
    merchant: tx.merchant || '',
    amount: Number(tx.amount || 0),
    currency: tx.currency || 'CZK',
    amountCzk: Math.abs(convertTransactionAmount(tx, 'CZK')),
    bank: tx.bank || '',
    msgId: tx.msgId || tx.id || ''
  }));
  try {
    console.table(details);
  } catch (_) {}
  console.log('[debugOverviewArchiveMonthDiff]', { month, strictSum, normalizedSum, diff, countOnlyNormalized: details.length, details });
  return { month, strictSum, normalizedSum, diff, countOnlyNormalized: details.length, details };
}

function getBudgetStorageKey(bankKey, type, monthStr = '') {
  const month = monthStr ? '_' + normalizeMonthStr(monthStr) : '';
  return `budget_${type}_${bankKey}${month}`;
}

function hasMonthlyBudgetSettings(bankKey, monthStr) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  return localStorage.getItem(getBudgetStorageKey(bankKey, 'limit', month)) !== null ||
         localStorage.getItem(getBudgetStorageKey(bankKey, 'warn', month)) !== null;
}

function getLegacyBudgetSettingsForBank(bankKey) {
  const custom = String(bankKey || '').startsWith('custom_')
    ? getCustomBanks().find(b => b.id === bankKey)
    : null;
  return {
    budget: parseFloat(localStorage.getItem(getBudgetStorageKey(bankKey, 'limit')) || custom?.budget || '0') || 0,
    warning: parseFloat(localStorage.getItem(getBudgetStorageKey(bankKey, 'warn')) || custom?.warning || '0') || 0
  };
}

function getBudgetSettingsForBank(bankKey, monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());

  for (let i = 0; i >= -36; i--) {
    const candidate = addMonthsToMonthStr(month, i);
    if (hasMonthlyBudgetSettings(bankKey, candidate)) {
      return {
        budget: parseFloat(localStorage.getItem(getBudgetStorageKey(bankKey, 'limit', candidate)) || '0') || 0,
        warning: parseFloat(localStorage.getItem(getBudgetStorageKey(bankKey, 'warn', candidate)) || '0') || 0,
        month: candidate
      };
    }
  }

  return {
    ...getLegacyBudgetSettingsForBank(bankKey),
    month: ''
  };
}

function setBudgetSettingsForBank(bankKey, budget, warning, monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  localStorage.setItem(getBudgetStorageKey(bankKey, 'limit', month), String(Number(budget || 0) || 0));
  localStorage.setItem(getBudgetStorageKey(bankKey, 'warn', month), String(Number(warning || 0) || 0));
}


function readBudgetSettingsInputs() {
  return {
    rbCzBudget: parseFloat(document.getElementById('budget-rb-cz')?.value || '0') || 0,
    rbCzWarning: parseFloat(document.getElementById('budget-warn-rb-cz')?.value || '0') || 0,
    csobSkBudget: parseFloat(document.getElementById('budget-csob-sk')?.value || '0') || 0,
    csobSkWarning: parseFloat(document.getElementById('budget-warn-csob-sk')?.value || '0') || 0,
    csobCzBudget: parseFloat(document.getElementById('budget-csob-cz')?.value || '0') || 0,
    csobCzWarning: parseFloat(document.getElementById('budget-warn-csob-cz')?.value || '0') || 0,
    monetaBudget: parseFloat(document.getElementById('budget-moneta')?.value || '0') || 0,
    monetaWarning: parseFloat(document.getElementById('budget-warn-moneta')?.value || '0') || 0
  };
}

async function syncBudgetToGoogleSheets(monthStr, budgetValues) {
  // Deprecated: Budgety/Budget tab is no longer used.
  // Budgets and warnings are written only via saveBankSettingsEndpoint from Manage banks / Add bank.
  const status = document.getElementById('budget-sync-status');
  if (status) status.textContent = 'Budgety sa už neposielajú do starého tabu. Zdroj pravdy je Bank_Settings.';
  return false;
}


async function saveBudgetSettings() {
  try {
    const inputMap = {
      rb_cz: ['budget-rb-cz', 'budget-warn-rb-cz'],
      csob_sk: ['budget-csob-sk', 'budget-warn-csob-sk'],
      csob_cz: ['budget-csob-cz', 'budget-warn-csob-cz'],
      moneta: ['budget-moneta', 'budget-warn-moneta']
    };

    Object.entries(inputMap).forEach(([bankKey, ids]) => {
      const budget = parseFloat(document.getElementById(ids[0])?.value || '0') || 0;
      const warning = parseFloat(document.getElementById(ids[1])?.value || '0') || 0;

      setBudgetSettingsForBank(bankKey, budget, warning, getSettingsLimitMonth());
    });

    const monthStr = getSettingsLimitMonth();
    const budgetValues = readBudgetSettingsInputs();

    await syncBudgetToGoogleSheets(monthStr, budgetValues);

    renderAll();
    alert('Budgety podľa bánk boli uložené.');
  } catch (err) {
    console.error('Budget save error:', err);
    alert('Budgety sa nepodarilo uložiť. Pošli mi screenshot chyby z konzoly.');
  }
}

function renderBudgetStatus() {
  const wrap = document.getElementById('budget-status');
  if (!wrap) return;

  function getBudgetPercentColor(pctRaw) {
    const pct = Math.max(0, Math.min(100, Number(pctRaw || 0)));
    if (pct >= 100) return '#E5005F'; // red
    if (pct >= 76) return '#FF8A3D';  // strong orange
    if (pct >= 51) return '#FFB86B';  // orange
    if (pct >= 26) return '#FFE033';  // yellow
    return '#72F0C8';                 // green
  }

  const rows = BANK_ORDER
    .filter(bankKey => bankKey !== 'csob_cz_credit')
    .map(bankKey => {
    const bank = BANKS[bankKey];
    const month = getAktuálneMonth();
    const budget = getOverviewBudgetLimitForBank(bankKey, month);
    const warning = getOverviewBudgetWarningForBank(bankKey, month);
    const budgetCurrency = getBankBudgetCurrency(bankKey);
    const spent = getOverviewBudgetSpentForBank(bankKey, month);

    if (!budget) {
      return `
        <div class="budget-bank-row" onclick="openBankBudgetManager('${bankKey}')" title="${t('filteredTransactions')}" style="padding:10px 0;border-bottom:1px solid var(--border);">
          <div class="budget-status-main">
            <div>
              <div class="budget-status-value" style="color:${bank.color};font-size:15px;">${bankLabelWithLogo(bankKey)}</div>
              <div class="budget-status-note">${t('budgetNotSet')}</div>
            </div>
          </div>
        </div>`;
    }

    const remaining = Math.max(budget - spent, 0);
    const pct = Math.min(spent / budget, 1) * 100;
    const status = remaining <= 0 ? t('overBudget') : (warning && remaining <= warning ? t('nearLimit') : t('normal'));
    const statusColor = getBudgetPercentColor(pct);

    maybeSendBudgetLocalNotification(bankKey, plainBankName(bankKey), spent, budget, remaining, warning);

    return `
      <div class="budget-bank-row" onclick="openBankBudgetManager('${bankKey}')" title="${t('filteredTransactions')}" style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div class="budget-status-main">
          <div>
            <div class="budget-status-value" style="color:${bank.color};font-size:15px;">${bankLabelWithLogo(bankKey)}</div>
            <div class="budget-status-note">${formatCurrencyAmount(spent, budgetCurrency)} / ${formatCurrencyAmount(budget, budgetCurrency)} · ${t('remaining')} ${formatCurrencyAmount(remaining, budgetCurrency)} · <span style="color:${statusColor};font-weight:700;">${status}</span></div>
          </div>
        </div>
        <div class="budget-progress"><div class="budget-progress-fill" style="width:${pct}%;background:${statusColor};"></div></div>
      </div>`;
  }).join('');

  wrap.innerHTML = `
    <div class="budget-status-title">${t('budgetStatusTitle')}</div>
    <div class="budget-status-note" style="margin:-4px 0 10px;">${t('budgetAllPaymentsHint')}</div>
    ${rows}
  `;
  try { scheduleOverviewDetailsBarRefresh(); } catch (_) {}
}

function getAccountBalanceStorageKey(bankKey, monthStr = '') {
  const month = monthStr ? '_' + normalizeMonthStr(monthStr) : '';
  return 'bank_account_balance_' + bankKey + month;
}

function getAccountBalance(bankKey, monthStr = getAktuálneMonth()) {
  const monthKey = getAccountBalanceStorageKey(bankKey, monthStr);
  const monthly = localStorage.getItem(monthKey);
  if (monthly !== null) return Number(monthly || 0) || 0;

  if (String(bankKey || '').startsWith('custom_')) {
    const bank = getCustomBanks().find(b => b.id === bankKey);
    return Number(bank?.balance || 0);
  }
  return Number(localStorage.getItem(getAccountBalanceStorageKey(bankKey)) || '0') || 0;
}

function setAccountBalance(bankKey, value, monthStr = getAktuálneMonth()) {
  const parsed = Number(value);
  const amount = Number.isFinite(parsed) ? parsed : 0;
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  localStorage.setItem(getAccountBalanceStorageKey(bankKey, month), String(amount));

  if (month === normalizeMonthStr(getAktuálneMonth())) {
    if (String(bankKey || '').startsWith('custom_')) {
      const banks = getCustomBanks();
      const bank = banks.find(b => b.id === bankKey);
      if (bank) {
        bank.balance = amount;
        saveCustomBanks(banks);
      }
      return;
    }
    localStorage.setItem(getAccountBalanceStorageKey(bankKey), String(amount));
  }
}

function getAccountBalanceBaseStorageKey(bankKey, monthStr = getAktuálneMonth()) {
  return 'bank_account_balance_base_' + String(bankKey || '').trim() + '_' + normalizeMonthStr(monthStr || getAktuálneMonth());
}