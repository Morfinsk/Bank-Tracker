// Generated app-core slice 20/34 (declarations).

function showPage(pageId, options = {}) {
  const showPagePerfStart = btPerfNow();
  try { dismissBackExitToast(); } catch (_) {}
  if (massTagSelectMode && pageId !== 'txns') {
    exitMassTagSelectMode();
  }
  const previousPageId = activePageId;
  const fromHistory = !!(options && options.fromHistory);
  const shouldPushHistory = !fromHistory && window.__bankTrackerTabHistoryReady && activePageId !== pageId;
  const useTabPresentation = shouldPresentTabOnSwitch(pageId);

  if (useTabPresentation) {
    beginLoadingPresentation({ kind: 'tab', tabId: pageId });
  }

  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active', 'page-slide-in-right', 'page-slide-in-left', 'swipe-peeking', 'page-tab-fade', 'page-light-switch', 'is-tab-presenting');
    p.style.transform = '';
    p.style.webkitTransform = '';
  });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active', 'tab-just-activated'));

  const targetPage = document.getElementById(`page-${pageId}`);
  const targetNav = document.getElementById(`nav-${pageId}`);

  if (targetPage) {
    targetPage.classList.add('active');
    if (useTabPresentation) targetPage.classList.add('is-tab-presenting');

    requestAnimationFrame(() => {
      targetPage.classList.add('page-light-switch');
      window.setTimeout(() => {
        targetPage.classList.remove('page-light-switch');
      }, 240);
    });
  }

  if (targetNav) {
    targetNav.classList.add('active', 'tab-just-activated');
    window.setTimeout(() => targetNav.classList.remove('tab-just-activated'), 240);
  }

  if (shouldPushHistory) {
    pushTabHistory(pageId);
  }
  activePageId = pageId;

  if (pageId === 'txns') {
    if (!options.preserveFilters) {
      if (massTagSelectMode) exitMassTagSelectMode();
      resetTransactionFilters();
      collapseTransactionFilterPanel();
      const search = document.getElementById('txn-search');
      if (search) search.value = '';
      const page = document.getElementById('page-txns');
      if (page) page.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'auto' });
    } else if (massTagSelectMode) {
      document.getElementById('page-txns')?.classList.add('mass-tag-select-mode');
      document.body.classList.add('mass-tag-select-active');
    }
    if (useTabPresentation) presentTxnsTab(options);
    else {
      document.getElementById('page-txns')?.classList.add('txn-cashflow-intro-pending');
      renderTransactionsSection();
      if (massTagSelectMode) {
        document.getElementById('txn-list')?.removeAttribute('data-rendered-key');
        try { updateTxnPage(true); } catch (_) {}
        updateMassTagBarUi();
      }
      scheduleTxnCashflowIntro(0);
    }
  }

  if (pageId === 'archive') {
    scheduleArchiveTabRender();
  }

  if (pageId === 'settings') {
    document.getElementById('sheets-url').value = SHEETS_URL || DEFAULT_SHEETS_URL;
    const limitsUrlInput = document.getElementById('limits-webapp-url');
    if (limitsUrlInput) limitsUrlInput.value = LIMITS_WEBAPP_URL;
    const budgetInputMap = {
      rb_cz: ['budget-rb-cz', 'budget-warn-rb-cz'],
      csob_sk: ['budget-csob-sk', 'budget-warn-csob-sk'],
      csob_cz: ['budget-csob-cz', 'budget-warn-csob-cz'],
      moneta: ['budget-moneta', 'budget-warn-moneta']
    };
    Object.entries(budgetInputMap).forEach(([bankKey, ids]) => {
      const budgetInput = document.getElementById(ids[0]);
      const warningInput = document.getElementById(ids[1]);
      if (budgetInput) budgetInput.value = localStorage.getItem(getBudgetStorageKey(bankKey, 'limit')) || '';
      if (warningInput) warningInput.value = localStorage.getItem(getBudgetStorageKey(bankKey, 'warn')) || '';
    });
    resetSimFields();
    updateEditModeUI();
    updatePushStatus();
    refreshConnectionSaveChecks();
    if (useTabPresentation) {
      const finishSettingsPresentation = () => {
        markLoadingPresentationDataReady();
        finishLoadingPresentation();
      };
      if (sectionDatasetStillLoading()) {
        const startedAt = Date.now();
        const poll = () => {
          if (!__loadingPresentation || __loadingPresentation.done) return;
          if (!sectionDatasetStillLoading() || (Date.now() - startedAt) > 12000) {
            finishSettingsPresentation();
            return;
          }
          window.setTimeout(poll, 120);
        };
        window.setTimeout(poll, 80);
      } else {
        finishSettingsPresentation();
      }
    }
  }

  if (previousPageId === 'overview' && pageId !== 'overview') {
    try { pauseOverviewChartAnimations(); } catch (_) {}
    try { cancelOverviewChartsReplay(); } catch (_) {}
  }

  scheduleFloatingUtilityUpdate();

  if (pageId === 'overview') {
    scheduleOverviewChartsReplay(previousPageId === 'overview-details');
  }

  if (pageId === 'overview-details') {
    prepareOverviewDetailsBars();
    try { scrollOverviewDetailsToTop(); } catch (_) {
      try { window.scrollTo(0, 0); } catch (__) {}
    }
    if (useTabPresentation) {
      const revealDetails = () => {
        try { startOverviewDetailsBarAnimations(); } catch (_) {}
      };
      const finishDetailsPresentation = () => {
        markLoadingPresentationDataReady();
        finishLoadingPresentation(revealDetails);
      };
      if (sectionDatasetStillLoading()) {
        const startedAt = Date.now();
        const poll = () => {
          if (!__loadingPresentation || __loadingPresentation.done) return;
          if (!sectionDatasetStillLoading() || (Date.now() - startedAt) > 12000) {
            try { prepareOverviewDetailsBars(); } catch (_) {}
            finishDetailsPresentation();
            return;
          }
          window.setTimeout(poll, 120);
        };
        window.setTimeout(poll, 80);
      } else {
        finishDetailsPresentation();
      }
    } else {
      requestAnimationFrame(() => {
        try { startOverviewDetailsBarAnimations(); } catch (_) {}
      });
    }
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      btPerfLog('tabSwitch', btPerfNow() - showPagePerfStart, String(pageId || 'unknown'));
    });
  });
}

function setConnectionSaveCheck(inputId, state) {
  const el = document.getElementById('save-check-' + inputId);
  if (!el) return;
  el.classList.remove('show', 'saving', 'error');
  if (state === 'saving') {
    el.textContent = '…';
    el.title = 'Saving…';
    el.setAttribute('aria-label', 'Saving…');
    el.classList.add('saving');
    return;
  }
  if (state === 'error') {
    el.textContent = '!';
    el.title = 'Not saved';
    el.setAttribute('aria-label', 'Not saved');
    el.classList.add('error');
    return;
  }
  if (state === 'saved') {
    el.textContent = '✓';
    el.title = 'Saved';
    el.setAttribute('aria-label', 'Saved');
    el.classList.add('show');
    return;
  }
  el.textContent = '✓';
  el.title = 'Not saved yet';
  el.setAttribute('aria-label', 'Not saved yet');
}

function isValidGoogleSheetsUrlForSave(value) {
  const text = String(value || '').trim();
  return !text || /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[a-zA-Z0-9_-]+/i.test(text);
}

function scheduleConnectionAutoSave(inputId) {
  window.clearTimeout(connectionAutoSaveTimers[inputId]);
  setConnectionSaveCheck(inputId, 'saving');
  connectionAutoSaveTimers[inputId] = window.setTimeout(() => autoSaveConnectionField(inputId), 450);
}

function autoSaveConnectionField(inputId) {
  const sheetsInput = document.getElementById('sheets-url');
  const webappInput = document.getElementById('limits-webapp-url');
  SHEETS_URL = sheetsInput?.value.trim() || '';
  LIMITS_WEBAPP_URL = webappInput?.value.trim() || '';

  const valid = inputId === 'sheets-url'
    ? isValidGoogleSheetsUrlForSave(SHEETS_URL)
    : (!LIMITS_WEBAPP_URL || isValidAppsScriptExecUrl(LIMITS_WEBAPP_URL));

  if (!valid) {
    setConnectionSaveCheck(inputId, 'error');
    return false;
  }

  localStorage.setItem('sheets_url', SHEETS_URL);
  localStorage.setItem('limits_webapp_url', LIMITS_WEBAPP_URL);
  if (typeof updateGoogleSheetsToggleUi === 'function') updateGoogleSheetsToggleUi();
  setConnectionSaveCheck(inputId, 'saved');
  const status = document.getElementById('limits-sync-status');
  if (status) status.textContent = 'Saved.';
  return true;
}

function refreshConnectionSaveChecks() {
  const sheets = document.getElementById('sheets-url')?.value.trim() || '';
  const webapp = document.getElementById('limits-webapp-url')?.value.trim() || '';
  setConnectionSaveCheck('sheets-url', sheets ? 'saved' : 'idle');
  setConnectionSaveCheck('limits-webapp-url', webapp ? 'saved' : 'idle');
}

async function saveConfig() {
  SHEETS_URL = document.getElementById('sheets-url').value.trim();
  LIMITS_WEBAPP_URL = document.getElementById('limits-webapp-url')?.value.trim() || '';

  localStorage.setItem('sheets_url', SHEETS_URL);
  if (typeof updateGoogleSheetsToggleUi === 'function') updateGoogleSheetsToggleUi();
  localStorage.setItem('limits_webapp_url', LIMITS_WEBAPP_URL);

  if (LIMITS_WEBAPP_URL && !isValidAppsScriptExecUrl(LIMITS_WEBAPP_URL)) {
    showInvalidWebAppUrlWarning();
  }

  let bankSyncMessage = '';
  if (LIMITS_WEBAPP_URL) {
    const sentCount = await syncAllBanksAndSettingsToEndpoint();
    bankSyncMessage = sentCount
      ? `\nBank_Settings + Bank_Archive odoslané: ${sentCount} záznamov.`
      : '\nWeb App URL je uložená, ale nebolo čo odoslať.';
  }

  alert((isLocalEditMode()
    ? 'Konfigurácia uložená. Offline/test režim je aktívny.'
    : 'Konfigurácia uložená. Google Sheets režim je aktívny, lokálne pridávanie a mazanie platieb je vypnuté.') + bankSyncMessage);

  renderAll();
  showPage('overview');
}


function ensureLimitsHistoryForLoadedTransactions() {
  allTransactions.forEach(t => {
    if (t.month && !limitsHistory[t.month]) {
      ensureLimitHistoryForMonth(t.month);
    }
  });
  localStorage.setItem('limits_history', JSON.stringify(limitsHistory));
}

function loadCachedOrDemoData() {
  clearDemoTransactionsCacheIfNeeded();
  loadCachedTransactionsSnapshot();
}

function getLocalTestSeedStorageKey() {
  return 'bank_tracker_local_test_seed_version';
}

function isLocalOfflineDemoMode() {
  return isLocalTestDataHost() && (!isGoogleSheetsEnabled() || !String(SHEETS_URL || '').trim());
}

function shouldAutoSeedLocalWidgetDemo() {
  if (!isLocalOfflineDemoMode()) return false;
  return localStorage.getItem(getLocalTestSeedStorageKey()) !== LOCAL_TEST_DATA_VERSION;
}

function applyLocalWidgetDemoAlertLimits(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  if (typeof setTransactionAlertSettingsForBank !== 'function') return;
  setTransactionAlertSettingsForBank('rb_cz', 15000, 5000, month);
  setTransactionAlertSettingsForBank('csob_cz', 8000, 4000, month);
  setTransactionAlertSettingsForBank('moneta', 6000, 3500, month);
  setTransactionAlertSettingsForBank('air_bank_cz', 5000, 3000, month);
}

function getLocalTestOverviewBankSetting(bankKey, monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  if (!localTestOverviewDetails || localTestOverviewDetails.month !== month) return null;
  return localTestOverviewDetails.settings?.[bankKey] || null;
}

function isLocalTestDataHost() {
  const host = String(location.hostname || '').toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || location.protocol === 'file:';
}

function makeLocalTestDate(monthStr, day, hour, minute = 0) {
  const [m, y] = normalizeMonthStr(monthStr || getAktuálneMonth()).split('/').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return new Date(y, m - 1, Math.min(Number(day) || 1, lastDay), Number(hour) || 12, Number(minute) || 0);
}

function createLocalTestTransactions(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const cardByBank = {
    rb_cz: '**** 3553',
    csob_sk: '**** 2424',
    csob_cz: '**** 4214',
    moneta: '**** 8899',
    air_bank_cz: '**** 7788'
  };
  const rows = [
    { day: 1, hour: 8, bankId: 'rb_cz', kind: 'account', amount: 65000, direction: 'incoming', currency: 'CZK', merchant: 'Salary ACME', category: 'Salary' },
    { day: 5, hour: 10, bankId: 'rb_cz', kind: 'account', amount: 18500, direction: 'outgoing', currency: 'CZK', merchant: 'Hypotéka splátka', category: 'Bývanie' },
    { day: 8, hour: 9, bankId: 'csob_cz', kind: 'account', amount: 3200, direction: 'outgoing', currency: 'CZK', merchant: 'ČEZ energie', category: 'Domácnosť' },
    { day: 9, hour: 9, bankId: 'csob_cz', kind: 'account', amount: 890, direction: 'outgoing', currency: 'CZK', merchant: 'Vodné a stočné', category: 'Domácnosť' },
    { day: 10, hour: 8, bankId: 'moneta', kind: 'account', amount: 4500, direction: 'outgoing', currency: 'CZK', merchant: 'Poistenie domácnosti', category: 'Domácnosť', quarterly: true },
    { day: 12, hour: 7, bankId: 'csob_cz', kind: 'card', amount: 259, direction: 'outgoing', currency: 'CZK', merchant: 'Netflix.com', category: 'Predplatné' },
    { day: 12, hour: 8, bankId: 'rb_cz', kind: 'card', amount: 169, direction: 'outgoing', currency: 'CZK', merchant: 'Spotify', category: 'Predplatné' },
    { day: 13, hour: 8, bankId: 'csob_cz', kind: 'card', amount: 99, direction: 'outgoing', currency: 'CZK', merchant: 'iCloud', category: 'Predplatné' },
    { day: 15, hour: 8, bankId: 'rb_cz', kind: 'card', amount: 20, direction: 'outgoing', currency: 'USD', merchant: 'CURSOR USAGE MID', category: 'Predplatné' },
    { day: 16, hour: 9, bankId: 'csob_cz', kind: 'card', amount: 299, direction: 'outgoing', currency: 'CZK', merchant: 'O2 Slovakia', category: 'Predplatné' },
    { day: 2, hour: 17, bankId: 'rb_cz', kind: 'card', amount: 1250, direction: 'outgoing', currency: 'CZK', merchant: 'Tesco groceries', category: 'Groceries' },
    { day: 3, hour: 18, bankId: 'csob_cz', kind: 'card', amount: 740, direction: 'outgoing', currency: 'CZK', merchant: 'Lidl', category: 'Groceries' },
    { day: 4, hour: 10, bankId: 'rb_cz', kind: 'cash', amount: 2000, direction: 'outgoing', currency: 'CZK', merchant: 'ATM cash withdrawal', category: 'Cash' },
    { day: 5, hour: 9, bankId: 'moneta', kind: 'card', amount: 1550, direction: 'outgoing', currency: 'CZK', merchant: 'OMV fuel', category: 'Fuel' },
    { day: 20, hour: 14, bankId: 'rb_cz', kind: 'card', amount: 12000, direction: 'outgoing', currency: 'CZK', merchant: 'Electro World one-off', category: 'Dom' },
    { day: 22, hour: 11, bankId: 'rb_cz', kind: 'account', amount: 18000, direction: 'incoming', currency: 'CZK', merchant: 'Bonus payment', category: 'Income' },
    { day: 7, hour: 12, bankId: 'csob_sk', kind: 'card', amount: 14, direction: 'outgoing', currency: 'EUR', merchant: 'Pharmacy SK', category: 'Health' },
    { day: 8, hour: 9, bankId: 'csob_sk', kind: 'account', amount: 2200, direction: 'incoming', currency: 'EUR', merchant: 'Salary SK', category: 'Salary' },
    { day: 13, hour: 22, bankId: 'air_bank_cz', kind: 'card', amount: 430, direction: 'outgoing', currency: 'CZK', merchant: 'Taxi', category: 'Transport' }
  ];

  return rows.map((row, idx) => {
    const txDate = makeLocalTestDate(month, row.day, row.hour, idx % 2 ? 35 : 10);
    const isIncome = row.direction === 'incoming';
    const amount = isIncome ? Math.abs(row.amount) : -Math.abs(row.amount);
    const currency = normalizeCurrencyForStorage(row.currency);
    const bankName = plainBankName(row.bankId);
    const paymentKind = row.kind;
    return {
      id: `local-test-${LOCAL_TEST_DATA_VERSION}-${month.replace('/', '-')}-${idx + 1}`,
      msgId: `local-test-${LOCAL_TEST_DATA_VERSION}-${month.replace('/', '-')}-${idx + 1}`,
      emailId: '',
      date: formatDate(txDate),
      amount,
      currency,
      merchant: row.merchant,
      category: row.category,
      card: paymentKind === 'card' ? cardByBank[row.bankId] : paymentKind,
      type: paymentKind === 'card' ? 'Card payment' : (paymentKind === 'cash' ? 'Cash payment' : 'Transfer'),
      paymentKind,
      month,
      bank: bankName,
      bankId: row.bankId,
      timestamp: txDate.getTime(),
      quarterly: !!row.quarterly
    };
  });
}

function seedOverviewDetailsFromLocalTestData(txns, monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const settings = {
    rb_cz: { cardLimit: 8, budget: 30000, warning: 3000, balance: 92000 },
    csob_sk: { cardLimit: 4, budget: 1800, warning: 150, balance: 3600 },
    csob_cz: { cardLimit: 6, budget: 18000, warning: 2000, balance: 48500 },
    csob_cz_credit: { cardLimit: 0, creditCardLimit: 60000, budget: 0, warning: 0, balance: 0 },
    moneta: { cardLimit: 5, budget: 12000, warning: 1500, balance: 28400 },
    air_bank_cz: { cardLimit: 4, budget: 9000, warning: 1000, balance: 17600 }
  };

  const totals = {};
  Object.keys(settings).forEach(bankKey => {
    totals[bankKey] = { spending: 0, income: 0, net: 0 };
  });

  (txns || []).forEach(tx => {
    const bankKey = getArchiveBankKeyFromTransaction(tx);
    if (!totals[bankKey]) totals[bankKey] = { spending: 0, income: 0, net: 0 };
    const currency = getArchiveBankCurrency(bankKey);
    const converted = Math.abs(convertTransactionAmount(tx, currency));
    if (!Number.isFinite(converted)) return;
    const amount = Number(tx.amount || 0);
    if (amount < 0) totals[bankKey].spending += converted;
    if (amount > 0) totals[bankKey].income += converted;
    totals[bankKey].net += amount < 0 ? -converted : converted;
  });

  localTestOverviewDetails = { month, settings, totals };
  document.documentElement.setAttribute('data-local-test-overview-month', month);
  document.documentElement.setAttribute('data-local-test-overview-spending', String(Math.round(Object.values(totals).reduce((sum, item) => sum + Number(item.spending || 0), 0))));
}



function shiftMonthStr(monthStr, offset) {
  const normalized = normalizeMonthStr(monthStr || getAktuálneMonth());
  const match = normalized.match(/^(\d{2})\/(\d{4})$/);
  if (!match) return normalized;
  const d = new Date(Number(match[2]), Number(match[1]) - 1 + Number(offset || 0), 1);
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

function createLocalTestTransactionsForArchive(monthStr = getAktuálneMonth()) {
  const baseMonth = normalizeMonthStr(monthStr || getAktuálneMonth());
  const months = [-5, -4, -3, -2, -1, 0].map(offset => shiftMonthStr(baseMonth, offset));
  const factors = [0.52, 0.68, 0.84, 0.76, 1.05, 1];
  return months.flatMap((m, monthIdx) => createLocalTestTransactions(m)
    .filter((tx) => !tx.quarterly || monthIdx % 3 === 0)
    .map((tx, idx) => {
    const factor = factors[monthIdx] || 1;
    const adjusted = { ...tx };
    const amount = Number(tx.amount || 0);
    adjusted.amount = Math.round(amount * factor * 100) / 100;
    adjusted.id = `local-test-${LOCAL_TEST_DATA_VERSION}-${m.replace('/', '-')}-${monthIdx + 1}-${idx + 1}`;
    adjusted.msgId = adjusted.id;
    delete adjusted.quarterly;
    return adjusted;
  }));
}

function resetLocalWidgetDemoStores() {
  try { localStorage.removeItem('bank_tracker_alerts_v1'); } catch (_) {}
  try { localStorage.removeItem('bank_tracker_subscriptions_v1'); } catch (_) {}
}