// Generated app-core slice 4/6 (merged).
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
  const lastDay = getGregorianMonthLength(y, m);
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
function seedBankTrackerLocalTestData(force = false) {
  document.documentElement.setAttribute('data-local-test-seed-attempt', force ? 'force' : 'auto');
  if (!force && !shouldAutoSeedLocalWidgetDemo() && allTransactions.length) {
    document.documentElement.setAttribute('data-local-test-seed', 'skipped-config');
    return false;
  }
  if (!force && !isLocalOfflineDemoMode()) {
    document.documentElement.setAttribute('data-local-test-seed', 'skipped-config');
    return false;
  }
  if (localStorage.getItem('bank_tracker_test_data_enabled') === 'false' && !force) {
    document.documentElement.setAttribute('data-local-test-seed', 'disabled');
    return false;
  }
  const month = normalizeMonthStr(getAktuálneMonth());
  resetLocalWidgetDemoStores();
  applyLocalWidgetDemoAlertLimits(month);

  const txns = createLocalTestTransactionsForArchive(month);
  allTransactions = sortTransactionsNewestFirst(txns.map(tx => normalizeTransactionCurrency(tx)));
  saveCachedTransactionsSnapshot();
  [...new Set(allTransactions.map(tx => normalizeMonthStr(tx.month)).filter(Boolean))].forEach(m => seedOverviewDetailsFromLocalTestData(allTransactions.filter(tx => normalizeMonthStr(tx.month) === m), m));
  seedOverviewDetailsFromLocalTestData(allTransactions.filter(tx => normalizeMonthStr(tx.month) === month), month);
  localStorage.setItem(getLocalTestSeedStorageKey(), LOCAL_TEST_DATA_VERSION);
  document.documentElement.setAttribute('data-local-test-seed-version', `${LOCAL_TEST_DATA_VERSION}:${month}`);
  document.documentElement.setAttribute('data-local-test-seed', String(allTransactions.length));
  window.setTimeout(() => {
    try {
      if (typeof runSubscriptionDetectionPipeline === 'function') {
        runSubscriptionDetectionPipeline({ reason: 'local-seed' });
      } else if (typeof renderOverviewFixedWidgets === 'function') {
        renderOverviewFixedWidgets();
      }
    } catch (e) {
      console.warn('Local widget demo pipeline failed:', e);
    }
  }, 1400);
  return true;
}

function prepareUiAfterDataLoad(options = {}) {
  const shouldRender = !(options && options.render === false);
  ensureLimitsHistoryForLoadedTransactions();
  populateSimulatorLimitMonthDropdown(getAktuálneMonth());
  fillSimulatorLimitInputs(getAktuálneMonth());
  try { recomputeAccountBalancesForLoadedMonths(); } catch (e) { console.warn('Account balance recompute on load failed:', e); }
  if (shouldRender) renderAll({ deferHeavy: true, visibleOnly: true });
}

async function runBackgroundMonthlyArchiveRepair(reason = 'timer') {
  if (monthlyRepairInFlight) return false;
  const url = getCurrentWebAppUrl();
  if (!url || !isValidAppsScriptExecUrl(url)) return false;
  monthlyRepairInFlight = true;
  try {
    const result = await jsonpEndpointRequest('recomputeMonthlyBankStats', { reason }, 90000);
    if (result && result.ok) {
      const match = SHEETS_URL && SHEETS_URL.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match) {
        await syncBankSettingsFromSheets(match[1]);
      }
      console.log('Background monthly archive repair OK:', result.data);
      return true;
    }
    console.warn('Background monthly archive repair skipped/failed:', result && result.data);
    return false;
  } catch (e) {
    console.warn('Background monthly archive repair failed:', e);
    return false;
  } finally {
    monthlyRepairInFlight = false;
  }
}

function startMonthlyArchiveRepairTimer() {
  // v254 performance: disable recurring full monthly repair timer.
  // Monthly stats still update from transaction deltas and manual repair endpoint remains available.
  if (monthlyRepairTimer) { clearInterval(monthlyRepairTimer); monthlyRepairTimer = null; }
}


function startAutoSync() {
  if (autoSyncTimer) {
    clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }

  if (!SHEETS_URL) return;

  autoSyncTimer = setInterval(() => {
    ensureDefaultConfig();
    syncData();
  }, AUTO_SYNC_INTERVAL_MS);

  startMonthlyArchiveRepairTimer();
}

function runStartupCloudSync() {
  ensureDefaultConfig();
  if (!SHEETS_URL || !isGoogleSheetsEnabled()) return Promise.resolve(false);
  if (startupCloudSyncPromise) return startupCloudSyncPromise;

  startAutoSync();
  startupCloudSyncPromise = Promise.resolve()
    .then(() => syncData({ startupMode: true, backgroundMode: true }))
    .catch((error) => {
      console.warn('Startup cloud sync failed:', error);
      return false;
    });
  return startupCloudSyncPromise;
}




function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

function matchesSearch(value, query) {
  return String(value || '').toLowerCase().includes(String(query || '').toLowerCase());
}

function transactionMatchesSearch(tx, query) {
  if (!query) return true;
  const q = String(query).toLowerCase();
  return [
    tx.merchant,
    tx.category,
    tx.bank,
    tx.card,
    tx.type,
    tx.currency,
    tx.date,
    tx.amount
  ].some(v => matchesSearch(v, q));
}

function getCategoryOptionsHtml(selectedCategory = '') {
  const selected = String(selectedCategory || '');
  return MANAGER_CATEGORY_OPTIONS.map(category => {
    return `<option value="${escapeAttr(category)}" ${selected === category ? 'selected' : ''}>${escapeHtml(translateCategory(category))}</option>`;
  }).join('');
}

function getAllBankOptions(selectedValue = '') {
  const system = BANK_ORDER.map(key => {
    const name = plainBankName(key);
    return `<option value="${key}" ${selectedValue === key ? 'selected' : ''}>${escapeHtml(name)}</option>`;
  }).join('');

  const custom = getCustomBanks().map(bank => {
    return `<option value="${escapeAttr(bank.id)}" ${selectedValue === bank.id ? 'selected' : ''}>${escapeHtml(bank.name)}</option>`;
  }).join('');

  return system + custom;
}

function getBankNameFromOption(bankKey) {
  const custom = getCustomBanks().find(b => b.id === bankKey);
  return custom ? custom.name : plainBankName(bankKey);
}

function getBankAccountFromOption(bankKey) {
  const custom = getCustomBanks().find(b => b.id === bankKey);
  return custom ? (custom.account || custom.name) : plainBankName(bankKey);
}

function currencyCode(value) {
  const raw = String(value || '').trim();
  if (!raw) return 'CZK';
  const upper = raw.toUpperCase();
  return CURRENCY_CODES_BY_SYMBOL[raw] || CURRENCY_CODES_BY_SYMBOL[upper] || upper;
}

function currencySymbol(value) {
  const code = currencyCode(value || 'CZK');
  return CURRENCY_SYMBOLS[code] || code;
}

function normalizeCurrencyForStorage(value) {
  return currencySymbol(value || 'CZK');
}

function normalizeCurrencyCodeForLogic(value) {
  return currencyCode(value || 'CZK');
}

function getBankBudgetCurrency(bankKey) {
  return normalizeCurrencyForStorage(getBankBalanceCurrency(bankKey) || getBankInfo(bankKey)?.primaryCurrency || 'CZK');
}

function getCurrentMonthSpentInBankCurrency(bankKey = null) {
  const targetCurrency = bankKey ? getBankBudgetCurrency(bankKey) : 'Kč';
  const month = getAktuálneMonth();
  return allTransactions
    .filter(t => t.month === month && Number(t.amount) < 0)
    .filter(t => !(typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(t)))
    .filter(t => !(typeof isInternalTransferTransaction === 'function' && isInternalTransferTransaction(t)))
    .filter(t => !bankKey || getBudgetBankKeyFromTransaction(t) === bankKey)
    .reduce((sum, t) => sum + Math.abs(convertTransactionAmount(t, targetCurrency)), 0);
}

function migrateCurrencyStorageToSymbols() {
  try {
    const appCurrency = localStorage.getItem('app_currency');
    if (appCurrency) localStorage.setItem('app_currency', normalizeCurrencyForStorage(appCurrency));

    Object.keys(localStorage).forEach(key => {
      if (key.indexOf('bank_currency_') === 0) {
        localStorage.setItem(key, normalizeCurrencyForStorage(localStorage.getItem(key)));
      }
    });

    const cached = JSON.parse(localStorage.getItem('cached_txns') || '[]');
    if (Array.isArray(cached)) {
      let changed = false;
      cached.forEach(tx => {
        if (tx && tx.currency) {
          const next = normalizeCurrencyForStorage(tx.currency);
          if (tx.currency !== next) { tx.currency = next; changed = true; }
        }
      });
      if (changed) localStorage.setItem('cached_txns', JSON.stringify(cached));
    }

    const banks = getCustomBanks();
    if (Array.isArray(banks) && banks.length) {
      let changed = false;
      banks.forEach(bank => {
        if (bank && bank.currency) {
          const next = normalizeCurrencyForStorage(bank.currency);
          if (bank.currency !== next) { bank.currency = next; changed = true; }
        }
      });
      if (changed) saveCustomBanks(banks);
    }
  } catch (e) {
    console.warn('Currency symbol migration skipped:', e);
  }
}

function getCurrencyOptionsHtml(selectedCurrency = 'Kč') {
  const selectedCode = currencyCode(selectedCurrency || 'CZK');
  const knownCodes = COMMON_CURRENCIES.map(([code]) => code);
  const rows = knownCodes.includes(selectedCode)
    ? COMMON_CURRENCIES
    : [[selectedCode, selectedCode], ...COMMON_CURRENCIES];

  return rows.map(([code, name]) => {
    const symbol = currencySymbol(code);
    return `<option value="${escapeAttr(symbol)}" ${selectedCode === code ? 'selected' : ''}>${escapeHtml(symbol)} — ${escapeHtml(name)}</option>`;
  }).join('');
}

function getLightCurrencyOptionsHtml(selectedCurrency = 'Kč') {
  const selectedCode = currencyCode(selectedCurrency || 'CZK');
  const common = ['CZK', 'EUR', 'USD', 'GBP', 'PLN'];
  const map = new Map(COMMON_CURRENCIES.map(([code, name]) => [code, name]));
  const codes = common.includes(selectedCode) ? common : [selectedCode, ...common];

  return [...new Set(codes)].map(code => {
    const name = map.get(code) || code;
    const symbol = currencySymbol(code);
    return `<option value="${escapeAttr(symbol)}" ${selectedCode === code ? 'selected' : ''}>${escapeHtml(symbol)} — ${escapeHtml(name)}</option>`;
  }).join('');
}

function hydrateCurrencySelect(select, selectedCurrency = null) {
  if (!select) return;
  const selected = normalizeCurrencyForStorage(selectedCurrency || select.value || 'Kč');
  if (select.dataset.currencyOptionsLoaded === 'true') {
    select.value = selected;
    return;
  }

  select.innerHTML = getCurrencyOptionsHtml(selected);
  select.dataset.currencyOptionsLoaded = 'true';
  select.value = selected;
}

function attachCurrencyLazyLoader(select) {
  if (!select || select.dataset.currencyLazyBound === 'true') return;
  select.dataset.currencyLazyBound = 'true';

  const hydrate = () => hydrateCurrencySelect(select, select.value || 'Kč');

  select.addEventListener('focus', hydrate, { once: true });
  select.addEventListener('pointerdown', hydrate, { once: true });
  select.addEventListener('touchstart', hydrate, { once: true, passive: true });
}

function fillCurrencySelect(select, selectedCurrency = 'Kč') {
  if (!select) return;

  const selected = normalizeCurrencyForStorage(selectedCurrency || 'Kč');

  if (select.dataset.currencyOptionsLoaded === 'true') {
    if (![...select.options].some(option => option.value === selected)) {
      const option = document.createElement('option');
      option.value = selected;
      option.textContent = selected;
      select.insertBefore(option, select.firstChild);
    }
    select.value = selected;
    attachCurrencyLazyLoader(select);
    return;
  }

  select.innerHTML = getLightCurrencyOptionsHtml(selected);
  select.dataset.currencyOptionsLoaded = 'false';
  select.value = selected;
  attachCurrencyLazyLoader(select);
}

function initCurrencyDropdowns() {
  fillCurrencySelect(document.getElementById('app-currency-select'), getAppCurrency());
  fillCurrencySelect(document.getElementById('new-bank-currency'), document.getElementById('new-bank-currency')?.value || 'Kč');
  fillCurrencySelect(document.getElementById('manual-tx-currency'), document.getElementById('manual-tx-currency')?.value || 'Kč');
  fillCurrencySelect(document.getElementById('edit-tx-currency'), document.getElementById('edit-tx-currency')?.value || 'Kč');
}

function getCustomBanks(){try{return JSON.parse(localStorage.getItem('custom_banks')||'[]')}catch(e){return[]}}
function saveCustomBanks(banks){localStorage.setItem('custom_banks',JSON.stringify(banks||[]))}


// ── PREVENT PAGE REFRESH ONLY WHILE BOTTOM SHEET IS OPEN ───

// ── GLOBAL PULL-DOWN CONTROL ───────────────────────────────
// Pull-to-refresh is disabled. Bottom sheet drag-to-close is handled by pointer events in v8.
function initGlobalPullDownControl() {
  if (window.__globalPullDownControlBound) return;
  window.__globalPullDownControlBound = true;

  let startY = 0;
  let startX = 0;
  let tracking = false;
  let startedOnControl = false;
  let closedByPull = false;

  const isFormControl = (target) => {
    return !!(target && target.closest && target.closest('input, textarea, select, button, a'));
  };

  window.addEventListener('touchstart', function(event) {
    if (!event.touches || event.touches.length !== 1) return;

    const touch = event.touches[0];
    startY = touch.clientY;
    startX = touch.clientX;
    tracking = true;
    closedByPull = false;
    startedOnControl = isFormControl(event.target);
  }, { passive: true });

  window.addEventListener('touchmove', function(event) {
    if (!tracking || !event.touches || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaY = touch.clientY - startY;
    const deltaX = touch.clientX - startX;
    const pullingDown = deltaY > 0;
    const mostlyVertical = Math.abs(deltaY) > Math.abs(deltaX) * 1.25;

    const openSheet = document.querySelector('.bottom-sheet.open');
    const sheetOpen = document.body.classList.contains('sheet-open') && !!openSheet;
    const insideSheet = !!(openSheet && event.target.closest && event.target.closest('.bottom-sheet.open'));
    const managerSheetOpen = !!(openSheet && (openSheet.id === 'bank-manager-sheet' || openSheet.id === 'loan-manager-sheet'));
    const managerHandleGesture = !!(managerSheetOpen && event.target && event.target.closest && event.target.closest('.sheet-handle, .sheet-title-row, .loan-manager-sheet-note'));

    const atTop =
      window.scrollY <= 0 &&
      (document.documentElement.scrollTop || 0) <= 0 &&
      (document.body.scrollTop || 0) <= 0;

    // Block browser pull-to-refresh only on the page itself. A full-page
    // widget editor owns its vertical scroll; cancelling here used to block
    // every downward finger gesture, so the editor could scroll down but not
    // back up.
    if (!sheetOpen && atTop && pullingDown && event.cancelable) {
      event.preventDefault();
    }

    if (!sheetOpen) return;

    // Let the bottom sheet drag handler own gestures that start inside the sheet.
    if (insideSheet) {
      if ((pullingDown && openSheet.scrollTop <= 0 && event.cancelable) || (managerHandleGesture && event.cancelable)) {
        event.preventDefault();
      }
      return;
    }

    if (startedOnControl) return;

    // v6: Do not close sheets by pull-down. Only block the browser pull gesture.
    if (pullingDown && mostlyVertical && event.cancelable) {
      event.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('touchend', function() {
    tracking = false;
    closedByPull = false;
  }, { passive: true });

  window.addEventListener('touchcancel', function() {
    tracking = false;
    closedByPull = false;
  }, { passive: true });
}

function initSheetOpenPullRefreshGuard() {
  initGlobalPullDownControl();
}

function ensurePullToRefreshUi() {
  let el = document.getElementById('bt-pull-refresh');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'bt-pull-refresh';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<div class="bt-pull-refresh-inner"><span class="bt-pull-refresh-icon" aria-hidden="true">${getBtBrandLogoHtml('inline')}</span></div>`;
  setLogoAnimCycleMs(BT_LOGO_CYCLE_MS, el.querySelector('.bt-logo-animation-host'));
  document.body.appendChild(el);
  return el;
}

function isAppScrollAtTopForPullRefresh() {
  const windowTop = (typeof getWindowScrollTopValue === 'function' ? getWindowScrollTopValue() : (window.pageYOffset || 0)) <= 1;
  const pageId = typeof getActivePageId === 'function' ? getActivePageId() : (activePageId || 'overview');
  const activePage = document.getElementById('page-' + pageId);
  const pageTop = !activePage || activePage.scrollTop <= 1;
  return windowTop && pageTop;
}

function getActivePageElementForPullRefresh() {
  const pageId = typeof getActivePageId === 'function' ? getActivePageId() : (activePageId || 'overview');
  return document.getElementById('page-' + pageId);
}

function setPullToRefreshPageOffset(y, releasing) {
  const page = getActivePageElementForPullRefresh();
  if (!page) return;
  page.classList.toggle('ptr-pulling', y > 0 && !releasing);
  page.classList.toggle('ptr-releasing', !!releasing);
  page.style.transform = y > 0 ? `translate3d(0, ${y}px, 0)` : '';
  if (releasing && y <= 0) {
    window.setTimeout(() => {
      page.classList.remove('ptr-releasing');
      page.style.transform = '';
    }, 240);
  }
}

async function runPullToRefresh() {
  if (window.__btPullRefreshRunning) return;
  window.__btPullRefreshRunning = true;
  setPullToRefreshPageOffset(0, true);
  try {
    if (typeof syncData === 'function') {
      await syncData({ backgroundMode: true });
    } else {
      try { loadCachedTransactionsSnapshot(); } catch (_) {}
      try { renderAll({ deferHeavy: true, visibleOnly: true }); } catch (_) {}
      try { applyLanguage(); } catch (_) {}
      if (activePageId === 'overview') {
        try { animateOverviewChartsIntro({ mode: 'visible' }); } catch (_) {}
      } else if (activePageId === 'overview-details') {
        try { startOverviewDetailsBarAnimations(); } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('Pull-to-refresh failed:', err);
  } finally {
    setPullToRefreshPageOffset(0, true);
    window.__btPullRefreshRunning = false;
  }
}
function initPullToRefresh() {
  if (window.__btPullToRefreshReady) return;
  window.__btPullToRefreshReady = true;
  ensurePullToRefreshUi();

  const THRESHOLD = 72;
  const MAX_PULL = 118;
  let startY = 0;
  let startX = 0;
  let tracking = false;
  let pulling = false;
  let pull = 0;

  const isBlockedTarget = (target) => {
    return !!(target && target.closest && target.closest('input, textarea, select, .bottom-sheet, .bottom-sheet-backdrop'));
  };

  const canPullToRefresh = () => {
    if (window.__btPullRefreshRunning || isSyncing) return false;
    if (document.body.classList.contains('sheet-open')) return false;
    if (document.querySelector('.bottom-sheet.open')) return false;
    return isAppScrollAtTopForPullRefresh();
  };

  const resetPull = (animateBack) => {
    tracking = false;
    pulling = false;
    pull = 0;
    const el = document.getElementById('bt-pull-refresh');
    if (el && !window.__btPullRefreshRunning) {
      el.style.transition = animateBack ? 'transform .22s ease, opacity .22s ease' : 'none';
      el.style.transform = 'translate3d(-50%, -140%, 0)';
      if (animateBack) el.classList.remove('is-visible');
      const icon = el.querySelector('.bt-pull-refresh-icon');
      if (icon) icon.style.transform = '';
    }
    setPullToRefreshPageOffset(0, animateBack);
  };

  window.addEventListener('touchstart', (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    if (!canPullToRefresh()) return;
    if (isBlockedTarget(event.target)) return;
    startY = event.touches[0].clientY;
    startX = event.touches[0].clientX;
    tracking = true;
    pulling = false;
    pull = 0;
  }, { passive: true });

  window.addEventListener('touchmove', (event) => {
    if (!tracking || !event.touches || event.touches.length !== 1) return;
    if (!canPullToRefresh()) {
      resetPull(true);
      return;
    }

    const touch = event.touches[0];
    const deltaY = touch.clientY - startY;
    const deltaX = touch.clientX - startX;
    if (deltaY <= 0) {
      if (pulling) resetPull(false);
      return;
    }
    if (Math.abs(deltaY) <= Math.abs(deltaX) * 1.15) return;

    pulling = true;
    pull = Math.min(deltaY * 0.5, MAX_PULL);
    if (event.cancelable) event.preventDefault();

    const el = ensurePullToRefreshUi();
    el.style.transition = 'none';
    el.style.transform = `translate3d(-50%, ${Math.max(0, pull - 18)}px, 0)`;
    el.classList.add('is-visible');
    const text = el.querySelector('.bt-pull-refresh-text');
    if (text) text.textContent = '';
    const icon = el.querySelector('.bt-pull-refresh-icon');
    if (icon) icon.style.transform = `rotate(${Math.min(pull / THRESHOLD, 1) * 180}deg)`;
    setPullToRefreshPageOffset(Math.round(pull * 0.34), false);
  }, { passive: false });

  window.addEventListener('touchend', () => {
    if (!tracking) return;
    const shouldRefresh = pulling && pull >= THRESHOLD;
    tracking = false;
    pulling = false;
    pull = 0;
    if (shouldRefresh) runPullToRefresh();
    else resetPull(true);
  }, { passive: true });

  window.addEventListener('touchcancel', () => resetPull(true), { passive: true });
}

// ── BOTTOM SHEET DRAG DOWN TO CLOSE — LARGE TOUCH ZONE ─────
function initBottomSheetDragToClose() {
  // v9: Drag/pull-down-to-close enabled again, using the proven v4 handler.

  document.querySelectorAll('.bottom-sheet').forEach(sheet => {
    if (sheet.id === 'custom-widget-sheet' || sheet.classList.contains('custom-widget-fullpage') || sheet.classList.contains('bottom-sheet-widget')) return;
    if (sheet.dataset.dragToCloseBound === 'true') return;
    sheet.dataset.dragToCloseBound = 'true';

    let startY = 0;
    let currentY = 0;
    let pointerId = null;
    let isTracking = false;
    let isDragging = false;
    let rafId = null;
    let pendingY = 0;
    let startScrollTop = 0;
    let sheetHeight = 0;
    let startedOnStrongHandle = false;

    const isInteractiveTarget = (target) => {
      return !!(target && target.closest && target.closest(
        'button, input, select, textarea, a, .txn-filter-pill, .cat-chip, .sync-btn, .top-upgrade-btn, .settings-plan-upgrade, .waitlist-btn, .mini-action-btn, .config-save, .date-range-clear-btn, .txn-show-more-btn'
      ));
    };

    const getYInsideSheet = (event) => {
      const rect = sheet.getBoundingClientRect();
      return {
        rect,
        yInside: event.clientY - rect.top
      };
    };

    const getDragZoneHeight = () => {
      const rect = sheet.getBoundingClientRect();
      const titleRow = sheet.querySelector('.sheet-title-row');
      const handle = sheet.querySelector('.sheet-handle');
      const managerHeaderExtra = sheet.querySelector('.manager-search-wrap, .loan-manager-sheet-note');

      let height = 138;

      if (titleRow) {
        const titleBottom = titleRow.getBoundingClientRect().bottom - rect.top;
        height = Math.max(height, titleBottom + 22);
      }

      if (handle) {
        const handleBottom = handle.getBoundingClientRect().bottom - rect.top;
        height = Math.max(height, handleBottom + 82);
      }

      if (managerHeaderExtra) {
        const extraBottom = managerHeaderExtra.getBoundingClientRect().bottom - rect.top;
        height = Math.max(height, extraBottom + 12);
      }

      if (sheet.id === 'bank-manager-sheet' || sheet.id === 'loan-manager-sheet') {
        height = Math.max(height, 188);
      }

      return Math.min(Math.max(height, 132), 260);
    };

    const canTrack = (event) => {
      if (!sheet.classList.contains('open')) return false;
      if (isInteractiveTarget(event.target)) return false;

      // v11: Upgrade has heavy scrollable content. Keep drag-to-close enabled,
      // but only from the handle/header so normal scrolling cannot fight the sheet drag.
      if (sheet.id === 'upgrade-sheet') {
        return !!(event.target && event.target.closest && event.target.closest('.sheet-handle, .sheet-title-row'));
      }

      // Manager sheets should scroll smoothly without accidental drag-close from content.
      // Allow drag-close only from the top handle/title row.
      if (sheet.id === 'bank-manager-sheet' || sheet.id === 'loan-manager-sheet') {
        return !!(event.target && event.target.closest && event.target.closest('.sheet-handle, .sheet-title-row'));
      }

      return true;
    };

    const setSheetY = (y) => {
      sheet.style.setProperty('transform', `translate3d(-50%, ${Math.max(0, y)}px, 0)`, 'important');
    };

    const applyTransform = () => {
      rafId = null;
      setSheetY(pendingY);
    };

    const scheduleTransform = (deltaY) => {
      pendingY = Math.max(0, deltaY);
      if (rafId) return;
      rafId = requestAnimationFrame(applyTransform);
    };

    const clearRaf = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const resetState = () => {
      clearRaf();
      isTracking = false;
      isDragging = false;
      pointerId = null;
      startY = 0;
      currentY = 0;
      pendingY = 0;
      startScrollTop = 0;
      sheetHeight = 0;
      startedOnStrongHandle = false;
      sheet.dataset.dragActive = 'false';
      sheet.classList.remove('dragging', 'sheet-snapping');
      sheet.style.removeProperty('transform');
      sheet.style.removeProperty('transition');
    };

    const snapOpen = () => {
      clearRaf();
      sheet.classList.remove('dragging');
      sheet.classList.add('sheet-snapping');
      const managerSheet = sheet.id === 'bank-manager-sheet' || sheet.id === 'loan-manager-sheet';
      const snapMs = managerSheet ? '0s' : '.20s';
      sheet.style.setProperty('transition', `transform ${snapMs} cubic-bezier(.22,.72,.23,1)`, 'important');
      setSheetY(0);

      window.setTimeout(() => {
        if (sheet.classList.contains('open')) {
          sheet.classList.remove('sheet-snapping');
          sheet.style.removeProperty('transition');
          sheet.style.removeProperty('transform');
        }
        resetState();
      }, managerSheet ? 24 : 220);
    };

    const beginTracking = (event) => {
      if (!canTrack(event)) return;

      const { rect, yInside } = getYInsideSheet(event);
      const dragZoneHeight = getDragZoneHeight();

      startY = event.clientY;
      currentY = startY;
      pointerId = event.pointerId;
      isTracking = true;
      isDragging = false;
      startScrollTop = sheet.scrollTop || 0;
      sheetHeight = Math.max(rect.height, 1);

      // FULL MOBILE TOUCH ZONE:
      // Everything from the top edge through the title/header area is a strong drag surface.
      startedOnStrongHandle =
        yInside >= 0 &&
        yInside <= dragZoneHeight;

      if (startedOnStrongHandle) {
        try { sheet.setPointerCapture(pointerId); } catch (_) {}
        if (event.cancelable) event.preventDefault();
      }
    };

    const startDrag = (event) => {
      isDragging = true;
      sheet.dataset.dragActive = 'true';
      sheet.classList.remove('sheet-snapping');
      sheet.classList.add('dragging');
      sheet.style.setProperty('transition', 'none', 'important');

      try { sheet.setPointerCapture(pointerId); } catch (_) {}
      if (event && event.cancelable) event.preventDefault();
    };

    const moveDrag = (event) => {
      if (!isTracking || event.pointerId !== pointerId) return;

      currentY = event.clientY;
      const deltaY = currentY - startY;

      if (!isDragging) {
        if (deltaY < -8) {
          resetState();
          return;
        }

        if (deltaY < 5) return;

        // Top/header zone can always drag down.
        // Below header, only drag when sheet content was already at top.
        if (!startedOnStrongHandle && startScrollTop > 0) return;

        startDrag(event);
      }

      const dragY = Math.max(0, deltaY);
      scheduleTransform(dragY);

      if (event.cancelable) event.preventDefault();
    };

    const finishDrag = (event) => {
      if (!isTracking || (event && event.pointerId !== undefined && event.pointerId !== pointerId)) return;

      const deltaY = Math.max(0, currentY - startY);
      const closeThreshold = (sheet.id === 'bank-manager-sheet' || sheet.id === 'loan-manager-sheet')
        ? Math.max(96, sheetHeight * 0.34)
        : Math.max(120, sheetHeight * 0.5);

      try { sheet.releasePointerCapture(pointerId); } catch (_) {}

      if (!isDragging) {
        resetState();
        return;
      }

      if (deltaY >= closeThreshold) {
        resetState();
        closeBottomSheets();
      } else {
        snapOpen();
      }
    };

    sheet.addEventListener('pointerdown', beginTracking);
    sheet.addEventListener('pointermove', moveDrag, { passive: false });
    sheet.addEventListener('pointerup', finishDrag);
    sheet.addEventListener('pointercancel', resetState);
    sheet.addEventListener('lostpointercapture', () => {
      if (!isTracking) return;
      resetState();
    });
  });
}

function lockPageScrollForSheet() {
  if (document.body.dataset.sheetScrollLocked === 'true') return;
  const activeSheetId = String(document.body.dataset.activeSheet || '');
  const lightweightLock = activeSheetId === 'bank-manager-sheet' || activeSheetId === 'loan-manager-sheet';
  __sheetScrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
  __sheetScrollLockMode = lightweightLock ? 'light' : 'fixed';
  document.body.dataset.sheetScrollLocked = 'true';
  // v3000: html has scroll-behavior:smooth — without this override the browser
  // visibly animates the scroll clamp on open and the restore on close.
  document.documentElement.style.scrollBehavior = 'auto';
  if (lightweightLock) return;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${__sheetScrollLockY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}

function unlockPageScrollForSheet() {
  if (document.body.dataset.sheetScrollLocked !== 'true') return;
  document.body.dataset.sheetScrollLocked = 'false';
  document.body.style.removeProperty('position');
  document.body.style.removeProperty('top');
  document.body.style.removeProperty('left');
  document.body.style.removeProperty('right');
  document.body.style.removeProperty('width');
  // v3000: restore the page position instantly for BOTH lock modes. The light
  // mode (Manage banks / Manage loans) never restored, so any scroll-chaining
  // behind the sheet left the page somewhere else after closing.
  window.scrollTo(0, __sheetScrollLockY || 0);
  document.documentElement.style.removeProperty('scroll-behavior');
  __sheetScrollLockMode = 'none';
}

function shouldAnimateBottomSheet(sheetId) {
  return ['upgrade-sheet', 'quick-add-sheet', 'txn-filter-sheet', 'custom-widget-sheet'].includes(String(sheetId || ''));
}

function isCustomWidgetFullpageSheet(sheetId) {
  return String(sheetId || '') === 'custom-widget-sheet';
}

function openSheet(id){
  document.body.classList.add('sheet-open');
  document.body.dataset.activeSheet = id || '';
  lockPageScrollForSheet();

  const customWidgetFullpage = isCustomWidgetFullpageSheet(id);
  const shouldAnimate = shouldAnimateBottomSheet(id);

  const backdrop = document.getElementById('bottom-sheet-backdrop');
  if (backdrop) {
    backdrop.classList.toggle('fullpage-fade-backdrop', !!customWidgetFullpage);
    backdrop.classList.add('open');
  }

  if (customWidgetFullpage) document.body.classList.add('custom-widget-editor-open');

  document.querySelectorAll('.bottom-sheet').forEach(sheet => {
    sheet.classList.remove('open', 'dragging', 'sheet-snapping', 'sheet-no-animation', 'custom-widget-fullpage', 'custom-widget-fullpage-open', 'bottom-sheet-widget');
    sheet.style.removeProperty('transition');
    sheet.style.removeProperty('animation');
    sheet.style.removeProperty('transform');
    sheet.dataset.dragActive = 'false';
  });

  const sheet = document.getElementById(id);
  if (sheet) {
    sheet.scrollTop = 0;

    if (customWidgetFullpage) {
      sheet.classList.add('custom-widget-fullpage');
      requestAnimationFrame(() => {
        sheet.classList.add('open', 'custom-widget-fullpage-open');
        scheduleFloatingUtilityUpdate();
      });
    } else if (!shouldAnimate) {
      sheet.classList.add('sheet-no-animation', 'open');
      scheduleFloatingUtilityUpdate();
      window.setTimeout(scheduleFloatingUtilityUpdate, 80);
    } else {
      requestAnimationFrame(() => {
        sheet.classList.add('open');
        scheduleFloatingUtilityUpdate();
        window.setTimeout(scheduleFloatingUtilityUpdate, 180);
      });
    }
  }

  if (!customWidgetFullpage) {
    initBottomSheetDragToClose();
    if (typeof initGlobalPullDownControl === 'function') initGlobalPullDownControl();
    if (typeof initPullToRefresh === 'function') initPullToRefresh();
    if (typeof initSheetPullRefreshGuard === 'function') initSheetPullRefreshGuard();
  }
  scheduleFloatingUtilityUpdate();
}
function closeBottomSheets(){
  document.body.classList.remove('sheet-open', 'custom-widget-editor-open');
  document.body.removeAttribute('data-active-sheet');
  unlockPageScrollForSheet();

  const backdrop = document.getElementById('bottom-sheet-backdrop');
  if (backdrop) {
    backdrop.classList.remove('open', 'fullpage-fade-backdrop');
  }

  document.querySelectorAll('.bottom-sheet').forEach(sheet => {
    sheet.classList.remove('open', 'dragging', 'sheet-snapping', 'sheet-no-animation', 'custom-widget-fullpage', 'custom-widget-fullpage-open', 'bottom-sheet-widget');
    sheet.style.removeProperty('transition');
    sheet.style.removeProperty('animation');
    sheet.style.removeProperty('transform');
    sheet.dataset.dragActive = 'false';
  });

  if (typeof resetManagerFilters === 'function') resetManagerFilters();
  if (typeof updateTransactionFilterPanelUi === 'function') updateTransactionFilterPanelUi();
  try {
    const stuckToast = document.getElementById('large-status-toast');
    if (stuckToast && stuckToast.classList.contains('loading')) dismissLargeStatusToast();
  } catch (_) {}
  scheduleFloatingUtilityUpdate();
}



function initSheetPullRefreshGuard() {
  if (window.__sheetPullRefreshGuardReady) return;
  window.__sheetPullRefreshGuardReady = true;
  let startY = 0;
  let startX = 0;

  window.addEventListener('touchstart', function(event) {
    if (!event.touches || event.touches.length !== 1) return;
    startY = event.touches[0].clientY || 0;
    startX = event.touches[0].clientX || 0;
  }, { passive: true, capture: true });

  window.addEventListener('touchmove', function(event) {
    const openSheet = document.querySelector('.bottom-sheet.open');
    if (!openSheet || !document.body.classList.contains('sheet-open')) return;
    if (!event.touches || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaY = (touch.clientY || 0) - startY;
    const deltaX = (touch.clientX || 0) - startX;
    const pullingDown = deltaY > 0;
    const mostlyVertical = Math.abs(deltaY) > Math.abs(deltaX) * 1.1;
    if (!pullingDown || !mostlyVertical) return;

    const insideSheet = !!(event.target && event.target.closest && event.target.closest('.bottom-sheet.open'));
    const sheetAtTop = openSheet.scrollTop <= 0;
    const pageAtTop = window.scrollY <= 0 && (document.documentElement.scrollTop || 0) <= 0 && (document.body.scrollTop || 0) <= 0;

    if ((!insideSheet && pageAtTop) || (insideSheet && sheetAtTop)) {
      if (event.cancelable) event.preventDefault();
    }
  }, { passive: false, capture: true });
}
function openUpgradeSheet() {
  upgradeReturnPageId = getActivePageId ? getActivePageId() : (activePageId || 'settings');
  closeBottomSheets();
  showPage('upgrade');
}

function closeUpgradePage() {
  const fallback = upgradeReturnPageId && upgradeReturnPageId !== 'upgrade' ? upgradeReturnPageId : 'settings';
  showPage(fallback);
}

function setBillingMode(mode) {
  document.getElementById('billing-monthly')?.classList.toggle('active', mode === 'monthly');
  document.getElementById('billing-yearly')?.classList.toggle('active', mode === 'yearly');

  const free = document.getElementById('free-price');
  const premium = document.getElementById('premium-price');
  const pro = document.getElementById('pro-price');

  if (mode === 'yearly') {
    if (free) free.innerHTML = '€0 <span>' + t('perMonth') + '</span>';
    if (premium) premium.innerHTML = '€1.25 <span>' + t('perYearPremium') + '</span>';
    if (pro) pro.innerHTML = '€3.33 <span>' + t('perYearPro') + '</span>';
  } else {
    if (free) free.innerHTML = '€0 <span>' + t('perMonth') + '</span>';
    if (premium) premium.innerHTML = '€1.99 <span>' + t('perMonth') + '</span>';
    if (pro) pro.innerHTML = '€4.99 <span>' + t('perMonth') + '</span>';
  }
}

function normalizeIdentifierList(value) {
  const parts = String(value || '')
    .split(/[;,\n]+/)
    .map(v => String(v || '').trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  parts.forEach(v => {
    const key = v.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(v); }
  });
  return out.join(',');
}

function mergeIdentifierList(a, b) {
  return normalizeIdentifierList([a, b].filter(Boolean).join(','));
}

function normalizeAccountMask(value) {
  return cleanBankAccountValue(value);
}
function toggleBankEdit(bankId) {
  const row = document.getElementById('bank-row-' + bankId);
  if (!row) return;
  const shouldOpen = !row.classList.contains('open');
  const sheet = document.getElementById('bank-manager-sheet');
  document.querySelectorAll('#bank-manager-list .managed-bank-row.open').forEach(item => item.classList.remove('open'));
  if (shouldOpen) {
    row.classList.add('open');
    requestAnimationFrame(() => {
      if (sheet && row) {
        try { row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) {
          try { row.scrollIntoView(true); } catch (_) {}
        }
      }
    });
  }
}

async function updateCustomBank(bankId) {
  const banks = getCustomBanks();
  const bank = banks.find(b => b.id === bankId);
  if (!bank) return;

  bank.name = document.getElementById('edit-name-' + bankId)?.value.trim() || bank.name;
  bank.account = cleanBankAccountValue(document.getElementById('edit-account-' + bankId)?.value || bank.account || '');
  bank.cards = cleanBankCardsValue(document.getElementById('edit-cards-' + bankId)?.value || bank.cards || '');
  bank.currency = normalizeCurrencyForStorage(document.getElementById('edit-currency-' + bankId)?.value || bank.currency || 'Kč');
  const budgetMonth = document.getElementById('edit-budget-month-' + bankId)?.value || '';
  if (!budgetMonth) {
    alert(t('chooseMonth', 'Vyber mesiac'));
    document.getElementById('edit-budget-month-' + bankId)?.focus();
    return;
  }
  bank.budget = parseFloat(document.getElementById('edit-budget-' + bankId)?.value || '0') || 0;
  bank.warning = parseFloat(document.getElementById('edit-warning-' + bankId)?.value || '0') || 0;
  bank.cardLimit = parseInt(document.getElementById('edit-card-limit-' + bankId)?.value || '0', 10) || 0;
  bank.creditCardLimit = parseFloat(document.getElementById('edit-credit-card-limit-' + bankId)?.value || '0') || 0;
  if (bankId === 'csob_cz_credit') {
    bank.cardLimit = 0;
    setCreditCardLimitForBank(bankId, bank.creditCardLimit, budgetMonth);
  }
  bank.balance = parseFloat(document.getElementById('edit-balance-' + bankId)?.value || '0') || 0;
  bank.incomingAlert = parseFloat(document.getElementById('edit-incoming-alert-' + bankId)?.value || '0') || 0;
  bank.outgoingAlert = parseFloat(document.getElementById('edit-outgoing-alert-' + bankId)?.value || '0') || 0;
  localStorage.setItem(`bank_card_limit_${bankId}_${normalizeMonthStr(budgetMonth)}`, String(bank.cardLimit));
  setBudgetSettingsForBank(bankId, bank.budget, bank.warning, budgetMonth);
  syncAccountBalanceBaseFromAbsoluteValue(bankId, budgetMonth, bank.balance);
  setTransactionAlertSettingsForBank(bankId, bank.incomingAlert, bank.outgoingAlert, budgetMonth);

  saveCustomBanks(banks);
  showSavedToast();
  // v50 hotfix: saveBank must only update the Banky tab.
  // Limits, budgets and balances are saved only via saveBankSettingsEndpoint below.
  const bankOk = await postToBankTrackerEndpoint('saveBank', { bank: getEndpointBankPayload(bankId, bank) });
  const settingsOk = await saveBankSettingsEndpoint(bankId, budgetMonth, bank.cardLimit, bank.budget, bank.warning, bank.balance, bank.incomingAlert, bank.outgoingAlert, bank.creditCardLimit);
  renderBankManager();
  renderAll();
  if (!(bankOk && settingsOk)) {
    const status = document.getElementById('limits-sync-status');
    if (status) status.textContent = 'Zmeny sú uložené lokálne. Google Sheets sync sa nepodaril - skontroluj Web App /exec a Apps Script Executions.';
  }
}


function handleTransactionSearch() {
  activeSearch = document.getElementById('txn-search')?.value || '';
  resetTxnVisibleLimit();
  updateTxnPage();
}

function getManagerSearchTerm() {
  return document.getElementById('manager-search')?.value.trim().toLowerCase() || '';
}

function handleManagerSearch() {
  renderBankManager();
}


function resetManagerFilters() {
  const search = document.getElementById('manager-search');
  if (search) search.value = '';

  const bankList = document.getElementById('bank-manager-list');
  if (bankList) bankList.style.display = 'block';

  document.querySelectorAll('.managed-bank-row.open').forEach(row => row.classList.remove('open'));
}

function switchManagementTab(tab) {
  const bankList = document.getElementById('bank-manager-list');
  const search = document.getElementById('manager-search');

  if (bankList) bankList.style.display = 'block';
  if (search) search.setAttribute('placeholder', t('searchBanks'));

  renderBankManager();
  applyLanguage();
}

function toggleTransactionEditFromButton(button) {
  const row = button.closest('.managed-tx-row');
  if (row) row.classList.toggle('open');
}

function renderTransactionManager() {
  const wrap = document.getElementById('transaction-manager-list');
  if (!wrap) return;

  const query = getManagerSearchTerm();
  const txns = sortTransactionsNewestFirst([...allTransactions])
    .filter(tx => transactionMatchesSearch(tx, query))
    .slice(0, 100);

  if (txns.length === 0) {
    wrap.innerHTML = `<div class="empty-state">${t('noTransactions')}</div>`;
    return;
  }

  wrap.innerHTML = txns.map(tx => {
    const txId = String(tx.id || tx.msgId || '');
    const amount = Number(tx.amount || 0);
    const direction = amount >= 0 ? 'incoming' : 'outgoing';
    const bankKey = getBankKey(tx);
    const amountClass = amount >= 0 ? 'amount-income' : 'amount-expense';
    const sign = amount >= 0 ? '+' : '-';

    return `
      <div class="managed-tx-row" data-managed-tx-id="${escapeAttr(txId)}">
        <div class="managed-tx-top">
          <div class="managed-tx-main">
            <div class="managed-tx-title">${escapeHtml(tx.merchant || '')}</div>
            <div class="managed-tx-sub">${escapeHtml(tx.date || '')} · ${escapeHtml(tx.bank || plainBankName(bankKey))} · <span class="${amountClass}">${sign}${formatCurrencyAmount(amount, tx.currency)}</span></div>
          </div>
          <div class="managed-tx-actions">
            <button class="icon-action-btn edit" onclick="toggleTransactionEditFromButton(this)" title="${t('edit')}" aria-label="${t('edit')}">✎</button>
            <button class="icon-action-btn delete" onclick="deleteManagedTransactionFromButton(this)" title="${t('delete')}" aria-label="${t('delete')}">×</button>
          </div>
        </div>

        <div class="managed-tx-form">
          <label>${t('date')}</label>
          <input class="config-input" data-field="date" value="${escapeAttr(tx.date || '')}" />

          <label>${t('merchantDescription')}</label>
          <input class="config-input" data-field="merchant" value="${escapeAttr(tx.merchant || '')}" />

          <div class="sheet-grid-2">
            <div>
              <label>${t('amount')}</label>
              <input class="config-input" data-field="amount" type="number" step="0.01" value="${Math.abs(amount)}" />
            </div>
            <div>
              <label>${t('direction')}</label>
              <select class="config-input" data-field="direction">
                <option value="outgoing" ${direction === 'outgoing' ? 'selected' : ''}>${t('outgoingOption')}</option>
                <option value="incoming" ${direction === 'incoming' ? 'selected' : ''}>${t('incomingOption')}</option>
              </select>
            </div>
          </div>

          <div class="sheet-grid-2">
            <div>
              <label>${t('currency')}</label>
              <select class="config-input" data-field="currency">
                ${getCurrencyOptionsHtml(tx.currency || 'CZK')}
              </select>
            </div>
            <div>
              <label>${t('category')}</label>
              <select class="config-input" data-field="category">
                ${getCategoryOptionsHtml(tx.category)}
              </select>
            </div>
          </div>

          <label>${t('bank')}</label>
          <select class="config-input" data-field="bank">
            ${getAllBankOptions(bankKey)}
          </select>

          <button class="config-save" onclick="updateManagedTransactionFromButton(this)">${t('saveTransaction')}</button>
          <button class="manager-danger-btn" onclick="deleteManagedTransactionFromButton(this)">${t('deleteTransaction')}</button>
        </div>
      </div>`;
  }).join('');
}

function getManagedTxFromButton(button) {
  const row = button.closest('.managed-tx-row');
  const txId = row?.dataset?.managedTxId || '';
  const tx = allTransactions.find(t => String(t.id || t.msgId || '') === String(txId));
  return { row, txId, tx };
}

function updateManagedTransactionFromButton(button) {
  const { row, tx } = getManagedTxFromButton(button);
  if (!row || !tx) return;

  const getField = (name) => row.querySelector(`[data-field="${name}"]`);
  const dateValue = getField('date')?.value || tx.date;
  const amountValue = parseFloat(getField('amount')?.value || '0') || 0;
  const direction = getField('direction')?.value || 'outgoing';
  const currency = normalizeCurrencyForStorage(getField('currency')?.value || tx.currency || 'Kč');
  const category = getField('category')?.value || tx.category || 'Ostatné';
  const merchant = getField('merchant')?.value.trim() || tx.merchant || '';
  const bankKey = getField('bank')?.value || getBankKey(tx);

  const parsedDate = parseCustomDateStr(dateValue);
  const finalAmount = direction === 'incoming' ? Math.abs(amountValue) : -Math.abs(amountValue);
  const oldTxSnapshot = { ...tx };

  tx.date = formatDate(parsedDate);
  tx.rawDate = parsedDate.toISOString();
  tx.timestamp = parsedDate.getTime();
  tx.month = getMonthFromDate(parsedDate); // v114 auto archive month after edit
  tx.amount = finalAmount;
  tx.currency = currency;
  tx.category = category;
  tx.merchant = merchant;
  tx.merchantRaw = merchant;
  tx.bank = getBankNameFromOption(bankKey);
  tx.bankId = bankKey;
  tx.card = tx.card || getBankAccountFromOption(bankKey);
  tx.type = direction === 'incoming' ? 'manual income' : 'manual expense';
  tx.msgId = tx.msgId || tx.id;

  showWorkingToast();
  allTransactions = sortTransactionsNewestFirst(allTransactions);
  applyLocalArchiveStatsFromTransaction(oldTxSnapshot, -1);
  applyLocalArchiveStatsFromTransaction(tx, 1);
  const oldMonth = normalizeMonthStr(oldTxSnapshot.month || getAktuálneMonth());
  const newMonth = normalizeMonthStr(tx.month || getAktuálneMonth());
  recomputeAccountBalancesForMonth(oldMonth);
  if (newMonth !== oldMonth) recomputeAccountBalancesForMonth(newMonth);
  saveCachedTransactionsSnapshot();

  postToBankTrackerEndpoint('saveTransaction', { transaction: extractTxnPayload(tx) });

  renderAll();
  renderTransactionManager();
  showSavedToast();
}

async function deleteManagedTransactionFromButton(button) {
  const { txId } = getManagedTxFromButton(button);
  if (!txId) return;

  if (!confirm(t('deleteTransactionConfirm'))) return;

  closeBottomSheets();
  const ok = await deleteSingleTransaction(txId);
  if (ok) {
    renderTransactionManager();
    showDeletedToast();
  } else {
    showLargeStatusToast(t('transactionDeleteFailed') || 'Transaction was not deleted.', 'error');
  }
}
function deleteCustomBank(bankId) {
  const banks = getCustomBanks();
  const bank = banks.find(b => b.id === bankId);
  if (!bank) return;

  if (!confirm(t('deleteBankConfirm'))) return;

  saveCustomBanks(banks.filter(b => b.id !== bankId));
  postToBankTrackerEndpoint('deleteBank', { bankId });

  renderBankManager();
  renderAll();
  showDeletedToast();
}

function openQuickAddSheet() {
  const sheet = document.getElementById('quick-add-sheet');
  sheet?.classList.remove('quick-add-animating');
  openSheet('quick-add-sheet');
  requestAnimationFrame(() => sheet?.classList.add('quick-add-animating'));
}

function openAddTransactionFromQuick() {
  closeBottomSheets();
  setTimeout(() => openAddTransactionSheet(), 80);
}

function openAddBankFromQuick() {
  closeBottomSheets();
  setTimeout(() => openAddBankSheet(), 80);
}

function openAddLoanFromQuick() {
  closeBottomSheets();
  setTimeout(() => {
    openAddLoanSheet();
  }, 90);
}

function openAddInvestmentFromQuick() {
  closeBottomSheets();
  setTimeout(() => {
    if (typeof window.openAddInvestmentSheet === 'function') window.openAddInvestmentSheet();
  }, 90);
}

function openAddInsuranceFromQuick() {
  closeBottomSheets();
  setTimeout(() => {
    if (typeof window.openAddInsuranceSheet === 'function') window.openAddInsuranceSheet();
  }, 90);
}

function openAddPropertyFromQuick() {
  closeBottomSheets();
  setTimeout(() => {
    if (typeof window.openAddPropertySheet === 'function') window.openAddPropertySheet();
  }, 90);
}

function openAddWidgetFromQuick() {
  closeBottomSheets();
  setTimeout(() => {
    if (typeof openCustomWidgetBuilder === 'function') openCustomWidgetBuilder();
  }, 90);
}

function refreshAddLoanSheetOptions() {
  const currencySelect = document.getElementById('add-loan-currency');
  if (currencySelect) currencySelect.innerHTML = getCurrencyOptionsHtml(currencySelect.value || 'CZK');
  const bankSelect = document.getElementById('add-loan-bank');
  if (bankSelect) {
    const selected = String(bankSelect.value || '');
    bankSelect.innerHTML = '<option value="">No linked bank</option>' + getAllBankOptions(selected);
    if (!bankSelect.value) bankSelect.value = '';
  }
}

function resetAddLoanSheetFields() {
  const defaults = {
    'add-loan-name': '',
    'add-loan-type': 'loan',
    'add-loan-status': 'active',
    'add-loan-account': '',
    'add-loan-original': '',
    'add-loan-current': '',
    'add-loan-payment': '',
    'add-loan-rate': '',
    'add-loan-period': '',
    'add-loan-period-1': '',
    'add-loan-period-unit': 'months',
    'add-loan-fixation': '',
    'add-loan-alert': '30',
    'add-loan-vs': '',
    'add-loan-text': ''
  };
  Object.keys(defaults).forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = defaults[id];
  });
}

function openAddLoanSheet() {
  refreshAddLoanSheetOptions();
  openSheet('add-loan-sheet');
  setTimeout(() => {
    const focusInput = document.getElementById('add-loan-name');
    if (focusInput && typeof focusInput.focus === 'function') {
      try { focusInput.focus(); } catch(_) {}
    }
  }, 80);
}

function parseLoanPeriodMonthsFromQuick(value, unit) {
  const raw = String(value || '').replace(',', '.').trim();
  const amount = Number(raw);
  if (!isFinite(amount) || amount <= 0) return 0;
  return unit === 'years' ? Math.round(amount * 12) : Math.round(amount);
}

async function saveLoanFromQuickSheet() {
  const name = String(document.getElementById('add-loan-name')?.value || '').trim();
  if (!name) {
    alert('Enter loan name.');
    document.getElementById('add-loan-name')?.focus?.();
    return;
  }

  const originalAmount = Math.abs(parseFloat(document.getElementById('add-loan-original')?.value || '0') || 0);
  if (!originalAmount) {
    alert('Enter original value.');
    document.getElementById('add-loan-original')?.focus?.();
    return;
  }

  const currentAmount = Math.abs(parseFloat(document.getElementById('add-loan-current')?.value || '0') || 0);
  const periodValue = String(document.getElementById('add-loan-period')?.value || '').trim();
  const period1Months = Math.max(0, Math.round(parseFloat(document.getElementById('add-loan-period-1')?.value || '0') || 0));
  const periodUnit = 'months';
  if (!Math.max(0, Math.round(parseFloat(periodValue) || 0))) {
    alert('Enter the total loan period in months.');
    document.getElementById('add-loan-period')?.focus?.();
    return;
  }
  if (!period1Months || period1Months > Math.round(parseFloat(periodValue) || 0)) {
    alert('Enter Period 1 in months. It cannot exceed the total period.');
    document.getElementById('add-loan-period-1')?.focus?.();
    return;
  }
  const linkedBankId = String(document.getElementById('add-loan-bank')?.value || '').trim();
  const account = cleanBankAccountValue(document.getElementById('add-loan-account')?.value || '');
  const rate = String(document.getElementById('add-loan-rate')?.value || '').trim();
  const vs = String(document.getElementById('add-loan-vs')?.value || '').replace(/\D/g, '').trim();
  const fixationAlertDays = Math.max(0, parseInt(document.getElementById('add-loan-alert')?.value || '0', 10) || 0);

  const loan = {
    id: 'loan_' + Date.now().toString(36),
    name,
    type: String(document.getElementById('add-loan-type')?.value || 'loan'),
    currency: normalizeCurrencyForStorage(document.getElementById('add-loan-currency')?.value || 'CZK'),
    linkedBankId,
    bankId: linkedBankId,
    account,
    originalAmount,
    currentBalance: -Math.abs(currentAmount),
    monthlyPayment: Math.abs(parseFloat(document.getElementById('add-loan-payment')?.value || '0') || 0),
    interestRate: rate,
    periodValue,
    periodUnit,
    periodMonths: parseLoanPeriodMonthsFromQuick(periodValue, periodUnit),
    fixationUntil: String(document.getElementById('add-loan-fixation')?.value || '').trim(),
    fixationPeriods: [
      {
        role: 'loan_term',
        rate: rate,
        periodValue: parseLoanPeriodMonthsFromQuick(periodValue, periodUnit),
        periodUnit: 'months',
        fixationMonths: period1Months,
        fixationUntil: String(document.getElementById('add-loan-fixation')?.value || '').trim(),
        color: '#388BFD'
      },
      { role: 'residual', rate: rate, color: '#94A3B8' }
    ],
    fixationAlertDays,
    variableSymbol: vs,
    vs: vs,
    matchText: String(document.getElementById('add-loan-text')?.value || '').trim(),
    repaymentText: String(document.getElementById('add-loan-text')?.value || '').trim(),
    status: String(document.getElementById('add-loan-status')?.value || 'active'),
    source: 'manual',
    active: true
  };

  try {
    if (typeof window.saveLoanLocalCanonical !== 'function') throw new Error('Canonical local loan save is unavailable.');
    const result = window.saveLoanLocalCanonical(loan);
    if (!result || !result.ok) throw new Error('Local loan save was not confirmed.');
    resetAddLoanSheetFields();
    closeBottomSheets();
    try { if (typeof renderLoanManager === 'function') renderLoanManager(); } catch(_) {}
    try { if (typeof renderCustomWidgets === 'function') renderCustomWidgets(); } catch(_) {}
    try { if (typeof renderAll === 'function') renderAll(); } catch(_) {}
    showSavedToast();
    const queuedLoan = Object.assign({}, result.loan);
    Promise.resolve().then(function(){
      return window.saveLoanCanonical(queuedLoan);
    }).catch(function(error){
        console.warn('Background Google Sheets new-loan sync pending:', error);
    });
  } catch (e) {
    console.warn('saveLoanFromQuickSheet failed:', e);
    alert('Loan could not be saved locally. Please check the entered values.');
  }
}

function openAddBankSheet(){initCurrencyDropdowns();openSheet('add-bank-sheet')}

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


function translateManualCategoryDropdown() {
  const select = document.getElementById('manual-tx-category');
  if (!select || typeof translateCategory !== 'function') return;

  Array.from(select.options).forEach(option => {
    option.textContent = translateCategory(option.value);
  });
}
function openAddTransactionSheet(){
  fillManualTransactionBanks();
  const dateInput = document.getElementById('manual-tx-date');
  if (dateInput && !dateInput.value) dateInput.value = toDateInputValue(new Date());
  const tagShape = document.getElementById('manual-tx-tag-shape');
  if (tagShape && !tagShape.value) tagShape.value = '';
  const tagColor = document.getElementById('manual-tx-tag-color');
  if (tagColor) {
    if (!tagColor.value) tagColor.value = '#58a6ff';
    tagColor.dataset.userPicked = '0';
  }

  // Keep opening animation light on Android/PWA. Currency and translated category labels can wait one frame.
  openSheet('add-transaction-sheet');

  requestAnimationFrame(() => {
    window.setTimeout(() => {
      initCurrencyDropdowns();
      translateManualCategoryDropdown();
    }, document.documentElement.classList.contains('android-pwa-perf') ? 80 : 20);
  });
}
function focusBankManagerRow(bankKey) {
  if (!bankKey) return;
  const row = document.getElementById('bank-row-' + bankKey);
  if (!row) return;
  document.querySelectorAll('#bank-manager-list .managed-bank-row.open').forEach((el) => {
    if (el !== row) el.classList.remove('open');
  });
  row.classList.add('open');
  try { row.scrollIntoView({ block: 'nearest', behavior: 'auto' }); } catch (_) {}
}

function openBankManagerSheet(bankKey) {
  const sheet = document.getElementById('bank-manager-sheet');
  const alreadyOpen = !!(sheet && sheet.classList.contains('open'));
  const bankList = document.getElementById('bank-manager-list');
  const search = document.getElementById('manager-search');
  if (bankList) bankList.style.display = 'block';
  if (search) search.setAttribute('placeholder', t('searchBanks'));

  const finishOpen = () => {
    try { renderBankManager(); } catch (_) {}
    try { applyLanguage(); } catch (_) {}
    if (bankKey) requestAnimationFrame(() => focusBankManagerRow(bankKey));
  };

  if (alreadyOpen) {
    finishOpen();
    return;
  }

  if (typeof openSheet === 'function') openSheet('bank-manager-sheet');
  requestAnimationFrame(() => requestAnimationFrame(finishOpen));
}

function openBankBudgetManager(bankKey) {
  openBankManagerSheet(bankKey);
}

async function saveNewBank(){
  const name=document.getElementById('new-bank-name')?.value.trim();
  if(!name){alert('Zadaj názov banky.');return}
  const banks=getCustomBanks();
  const bank={
    id:'custom_'+Date.now(),
    name,
    currency:normalizeCurrencyForStorage(document.getElementById('new-bank-currency')?.value||'Kč'),
    type:document.getElementById('new-bank-type')?.value||'card',
    account:cleanBankAccountValue(document.getElementById('new-bank-account')?.value||''),
    cards:removeAccountPartsFromCards(cleanBankCardsValue(document.getElementById('new-bank-cards')?.value||''), cleanBankAccountValue(document.getElementById('new-bank-account')?.value||'')),
    budget:parseFloat(document.getElementById('new-bank-budget')?.value||'0')||0,
    warning:parseFloat(document.getElementById('new-bank-warning')?.value||'0')||0,
    cardLimit:parseInt(document.getElementById('new-bank-card-limit')?.value||'0',10)||0,
    creditCardLimit:0,
    balance:0,
    incomingAlert:0,
    outgoingAlert:0,
    budgetMonth:getAktuálneMonth()
  };
  banks.push(bank);
  saveCustomBanks(banks);
  // v50 hotfix: send a clean Banky payload only.
  // Do not send budget/warning/cardLimit/balance through saveBank.
  const bankOk = await postToBankTrackerEndpoint('saveBank', { bank: getEndpointBankPayload(bank.id, bank) });
  const settingsOk = await saveBankSettingsEndpoint(bank.id, bank.budgetMonth, bank.cardLimit, bank.budget, bank.warning, bank.balance, bank.incomingAlert, bank.outgoingAlert, bank.creditCardLimit);
  alert(bankOk || settingsOk
    ? 'Banka bola uložená lokálne a odoslaná do Google Sheets endpointu.'
    : 'Banka bola uložená lokálne, ale Google Sheets zápis neprebehol. Skontroluj Web App /exec URL.');
  closeBottomSheets();
  renderAll();
}

function getBankDisplayOverride(bankKey) {
  return localStorage.getItem('bank_display_name_' + bankKey) || plainBankName(bankKey);
}

function setBankDisplayOverride(bankKey, value) {
  localStorage.setItem('bank_display_name_' + bankKey, String(value || '').trim() || plainBankName(bankKey));
}


function getBudgetMonthOptionsHtml(selectedMonth) {
  const current = getAktuálneMonth();
  const selected = normalizeMonthStr(selectedMonth || current);
  const months = new Set([current, selected]);
  allTransactions.forEach(t => { if (t.month) months.add(normalizeMonthStr(t.month)); });
  for (let i = -18; i <= 24; i++) months.add(addMonthsToMonthStr(current, i));
  const sorted = [...months].sort((a, b) => monthSortValue(b) - monthSortValue(a));
  return sorted.map(m => `<option value="${m}" ${m === selected ? 'selected' : ''}>${getMonthDisplayShort(m)}</option>`).join('');
}

function updateManagedBankBudgetFields(bankId) {
  const month = document.getElementById('edit-budget-month-' + bankId)?.value || '';
  const monthlyBox = document.getElementById('edit-monthly-settings-' + bankId);
  if (!month) {
    if (monthlyBox) monthlyBox.classList.remove('open');
    return;
  }
  const settings = getBudgetSettingsForBank(bankId, month);
  const budgetEl = document.getElementById('edit-budget-' + bankId);
  const warnEl = document.getElementById('edit-warning-' + bankId);
  const limitEl = document.getElementById('edit-card-limit-' + bankId);
  const creditLimitEl = document.getElementById('edit-credit-card-limit-' + bankId);
  const balanceEl = document.getElementById('edit-balance-' + bankId);
  const incomingEl = document.getElementById('edit-incoming-alert-' + bankId);
  const outgoingEl = document.getElementById('edit-outgoing-alert-' + bankId);
  const alerts = getTransactionAlertSettingsForBank(bankId, month);
  if (budgetEl) budgetEl.value = settings.budget || 0;
  if (warnEl) warnEl.value = settings.warning || 0;
  if (limitEl) limitEl.value = getArchiveCardLimitForMonth(bankId, month) || 0;
  if (creditLimitEl) creditLimitEl.value = getCreditCardLimitForBank(bankId, month) || 0;
  if (balanceEl) balanceEl.value = getAccountBalance(bankId, month) || 0;
  if (incomingEl) incomingEl.value = alerts.incoming || 0;
  if (outgoingEl) outgoingEl.value = alerts.outgoing || 0;
  if (monthlyBox) monthlyBox.classList.add('open');
}

function renderBankManager(){
  const wrap=document.getElementById('bank-manager-list');
  if(!wrap)return;

  const query = getManagerSearchTerm();
  const currentMonth = getAktuálneMonth();
  const currentLimits = getLimitsForMonth(currentMonth);

  const system=BANK_ORDER.map(k=>{
    const bank = getBankInfo(k);
    const budgetSettings = getBudgetSettingsForBank(k, currentMonth);
    return {
      id:k,
      name:getBankDisplayOverride(k),
      originalName: plainBankName(k),
      logo:bankLogoImg(k),
      currency:getBankBalanceCurrency(k),
      account: cleanBankAccountValue(localStorage.getItem('bank_account_' + k) || bank.account || ''),
      cards: cleanBankCardsValue(localStorage.getItem('bank_cards_' + k) || bank.cards || ''),
      cardLimit: getArchiveCardLimitForMonth(k, currentMonth) || getMonthlyCardLimitForBank(k, currentMonth) || (currentLimits[bank.limitKey] ?? bank.defaultLimit) || 0,
      creditCardLimit: getCreditCardLimitForBank(k, currentMonth),
      budget: budgetSettings.budget || 0,
      warning: budgetSettings.warning || 0,
      budgetMonth: currentMonth,
      balance: getAccountBalance(k, currentMonth),
      incomingAlert: getTransactionAlertSettingsForBank(k, currentMonth).incoming,
      outgoingAlert: getTransactionAlertSettingsForBank(k, currentMonth).outgoing,
      system:true
    };
  });

  const custom=getCustomBanks().map(b=>({
    id:b.id,
    name:b.name,
    originalName:b.name,
    logo:'🏦',
    currency:b.currency || 'CZK',
    account:b.account||'',
    cards: cleanBankCardsValue(b.cards || localStorage.getItem('bank_cards_' + b.id) || ''),
    cardLimit:getArchiveCardLimitForMonth(b.id, currentMonth) || b.cardLimit || 0,
    creditCardLimit:getCreditCardLimitForBank(b.id, currentMonth) || b.creditCardLimit || 0,
    budget:(getBudgetSettingsForBank(b.id, currentMonth).budget || b.budget || 0),
    warning:(getBudgetSettingsForBank(b.id, currentMonth).warning || b.warning || 0),
    budgetMonth: currentMonth,
    balance:getAccountBalance(b.id, currentMonth),
    incomingAlert:getTransactionAlertSettingsForBank(b.id, currentMonth).incoming || b.incomingAlert || 0,
    outgoingAlert:getTransactionAlertSettingsForBank(b.id, currentMonth).outgoing || b.outgoingAlert || 0,
    system:false
  }));

  const allBanks = [...system, ...custom].filter(b => {
    if (!query) return true;
    return [b.name, b.currency, b.account, b.cardLimit, b.creditCardLimit, b.budget, b.incomingAlert, b.outgoingAlert].some(v => matchesSearch(v, query));
  });

  const row = (b) => {
    const isCreditCardStandalone = b.id === 'csob_cz_credit';
    const monthlyLimitLabel = isCreditCardStandalone ? t('creditCardMonthlyLimitShort', 'monthly limit') : t('cardLimitShort');
    const creditLimitSummary = `${monthlyLimitLabel} ${formatCurrencyAmount(b.creditCardLimit || 0, b.currency || 'CZK')}`;
    const storedCards = normalizeBankStoredCards(getBankStoredCards(b.id));
    const storedCardRows = storedCards.map((card, index) => {
      const slot = index + 1;
      return `
        <div class="bank-card-slot-row-v286">
          <div class="bank-card-slot-title-v286">Card ${slot}</div>
          <div class="save-field-wrap bank-card-number-wrap-v286">
            <input class="config-input" id="${getManagedBankStoredCardInputId(b.id, slot, 'number')}" inputmode="numeric" autocomplete="off" value="${escapeAttr(formatBankStoredCardNumberForInput(card.number))}" placeholder="Card number" oninput="scheduleManagedBankCardAutoSave('${b.id}', ${slot}, 'number')" onchange="scheduleManagedBankCardAutoSave('${b.id}', ${slot}, 'number', true)" />
          </div>
          <div class="sheet-grid-2">
            <input class="config-input" id="${getManagedBankStoredCardInputId(b.id, slot, 'expiry')}" inputmode="numeric" autocomplete="off" value="${escapeAttr(formatBankStoredCardExpiryForInput(card.expiry))}" placeholder="MM/YY" oninput="scheduleManagedBankCardAutoSave('${b.id}', ${slot}, 'expiry')" onchange="scheduleManagedBankCardAutoSave('${b.id}', ${slot}, 'expiry', true)" />
            <input class="config-input" id="${getManagedBankStoredCardInputId(b.id, slot, 'cvc')}" inputmode="numeric" autocomplete="off" value="${escapeAttr(card.cvc)}" placeholder="CVC" oninput="scheduleManagedBankCardAutoSave('${b.id}', ${slot}, 'cvc')" onchange="scheduleManagedBankCardAutoSave('${b.id}', ${slot}, 'cvc', true)" />
          </div>
        </div>`;
    }).join('');
    const managedSubLine = `${escapeHtml(currencySymbol(b.currency))}${b.account ? ` · Účty ${escapeHtml(b.account)}` : ''}${b.cards ? ` · Karty ${escapeHtml(b.cards.split(',').map(v => v.trim().replace(/\D/g,'').slice(-4)).filter(Boolean).join(', '))}` : ''}${isCreditCardStandalone ? ` · ${creditLimitSummary}` : ` · ${monthlyLimitLabel} ${b.cardLimit || 0} · ${t('budgetLabel')} ${formatCurrencyAmount(b.budget || 0, b.currency || 'CZK')}`} · ${isCreditCardStandalone ? t('creditCardOutstandingBalance', 'Outstanding balance') : t('accountBalanceTitle')} ${escapeHtml(formatCurrencyAmount(b.balance || 0, b.currency || 'CZK'))}${getCzkEquivalentText(b.balance || 0, b.currency || 'CZK') ? ` · ${escapeHtml(getCzkEquivalentText(b.balance || 0, b.currency || 'CZK'))}` : ''} · ${escapeHtml(t('incomingAlertShort'))} ${formatCurrencyAmount(b.incomingAlert || 0, b.currency || 'CZK')} · ${escapeHtml(t('outgoingAlertShort'))} ${formatCurrencyAmount(b.outgoingAlert || 0, b.currency || 'CZK')}`;
    return `
    <div class="managed-bank-row" id="bank-row-${b.id}">
      <div class="managed-bank-top">
        <div class="managed-bank-left">
          <div class="managed-bank-icon">${b.logo}</div>
          <div style="min-width:0;">
            <div class="managed-bank-name">${escapeHtml(b.name)}</div>
            <div class="managed-bank-sub">${managedSubLine}</div>
          </div>
        </div>
        <div class="managed-bank-actions">
          <button class="icon-action-btn edit" onclick="toggleBankEdit('${b.id}')" title="${t('edit')}" aria-label="${t('edit')}">✎</button>
          ${b.system ? '' : `<button class="icon-action-btn delete" onclick="deleteCustomBank('${b.id}')" title="${t('delete')}" aria-label="${t('delete')}">×</button>`}
        </div>
      </div>

      <div class="managed-bank-form bank-manager-inline-form-v294">
        <div class="manager-editor-toolbar bank-manager-inline-toolbar-v294">
          <button class="sheet-close manager-sheet-back-btn" type="button" onclick="toggleBankEdit('${b.id}')" aria-label="Back">←</button>
          <div class="manager-editor-title">Edit bank</div>
          <span class="bank-manager-toolbar-spacer-v294" aria-hidden="true"></span>
        </div>
        <label>${t('bankName')}</label>
        <div class="save-field-wrap">
          <input class="config-input" id="edit-name-${b.id}" value="${escapeAttr(b.name)}" placeholder="${t('bankName')}" oninput="scheduleManagedBankDetailAutoSave('${b.id}', 'name')" onchange="scheduleManagedBankDetailAutoSave('${b.id}', 'name', true)" />
          <span class="field-save-check" id="save-check-name-${b.id}">✓</span>
        </div>

        <div class="sheet-grid-2">
          <div>
            <label>Accounts</label>
            <div class="save-field-wrap">
              <input class="config-input" id="edit-account-${b.id}" value="${escapeAttr(b.account||'')}" placeholder="1234/0000" oninput="scheduleManagedBankDetailAutoSave('${b.id}', 'account')" onchange="scheduleManagedBankDetailAutoSave('${b.id}', 'account', true)" />
              <span class="field-save-check" id="save-check-account-${b.id}">✓</span>
            </div>
          </div>
          <div>
            <label>Cards</label>
            <div class="save-field-wrap">
              <input class="config-input" id="edit-cards-${b.id}" value="${escapeAttr(b.cards||'')}" placeholder="1234,5678" oninput="scheduleManagedBankDetailAutoSave('${b.id}', 'cards')" onchange="scheduleManagedBankDetailAutoSave('${b.id}', 'cards', true)" />
              <span class="field-save-check" id="save-check-cards-${b.id}">✓</span>
            </div>
          </div>
        </div>

        <label>${t('currency')}</label>
        <div class="save-field-wrap">
          <select class="config-input" id="edit-currency-${b.id}" onchange="scheduleManagedBankDetailAutoSave('${b.id}', 'currency', true)">
            ${getCurrencyOptionsHtml(b.currency)}
          </select>
          <span class="field-save-check" id="save-check-currency-${b.id}">✓</span>
        </div>

        <label>${t('monthLabel', 'Mesiac')}</label>
        <select class="config-input" id="edit-budget-month-${b.id}" onchange="updateManagedBankBudgetFields('${b.id}'); autoSaveManagedBankMonthlyField('${b.id}', 'month')">
          ${getBudgetMonthOptionsHtml(b.budgetMonth || getAktuálneMonth())}
        </select>

        <div class="managed-bank-monthly-settings open" id="edit-monthly-settings-${b.id}">
          ${isCreditCardStandalone ? `<div class="budget-status-note" style="margin-bottom:8px;">${escapeHtml(t('creditCardBalanceAlertsOnly', 'Monthly limit, outstanding balance and push alerts are editable here.'))}</div>` : ''}
          ${isCreditCardStandalone ? `
          <label>${t('creditCardMonthlyLimit', 'Monthly limit')}</label>
          <div class="save-field-wrap">
            <input class="config-input" id="edit-credit-card-limit-${b.id}" type="number" value="${b.creditCardLimit||0}" placeholder="50000" oninput="scheduleManagedBankAutoSave('${b.id}', 'credit-card-limit')" onchange="scheduleManagedBankAutoSave('${b.id}', 'credit-card-limit', true)" />
            <span class="field-save-check" id="save-check-credit-card-limit-${b.id}">✓</span>
          </div>
          ` : `
          <label>${t('monthlyCardLimit')}</label>
          <div class="save-field-wrap">
            <input class="config-input" id="edit-card-limit-${b.id}" type="number" value="${b.cardLimit||0}" placeholder="10" oninput="scheduleManagedBankAutoSave('${b.id}', 'card-limit')" onchange="scheduleManagedBankAutoSave('${b.id}', 'card-limit', true)" />
            <span class="field-save-check" id="save-check-card-limit-${b.id}">✓</span>
          </div>
          `}

          ${isCreditCardStandalone ? '' : `
          <label>${t('budgetLabel')}</label>
          <div class="sheet-grid-2">
            <div class="save-field-wrap">
              <input class="config-input" id="edit-budget-${b.id}" type="number" value="${b.budget||0}" placeholder="${t('monthlyBudget')}" oninput="scheduleManagedBankAutoSave('${b.id}', 'budget')" onchange="scheduleManagedBankAutoSave('${b.id}', 'budget', true)" />
              <span class="field-save-check" id="save-check-budget-${b.id}">✓</span>
            </div>
            <div class="save-field-wrap">
              <input class="config-input" id="edit-warning-${b.id}" type="number" value="${b.warning||0}" placeholder="${t('warnWhenRemaining')}" oninput="scheduleManagedBankAutoSave('${b.id}', 'warning')" onchange="scheduleManagedBankAutoSave('${b.id}', 'warning', true)" />
              <span class="field-save-check" id="save-check-warning-${b.id}">✓</span>
            </div>
          </div>
          `}

          <label>${isCreditCardStandalone ? t('creditCardOutstandingBalance', 'Outstanding balance') : t('accountBalanceTitle')}</label>
          <div class="save-field-wrap">
            <input class="config-input" id="edit-balance-${b.id}" type="number" step="0.01" value="${b.balance||0}" placeholder="0" oninput="scheduleManagedBankAutoSave('${b.id}', 'balance')" onchange="scheduleManagedBankAutoSave('${b.id}', 'balance', true)" />
            <span class="field-save-check" id="save-check-balance-${b.id}">✓</span>
          </div>

          <label>${t('largeMovementAlerts')}</label>
          <div class="budget-status-note">${t('largeMovementAlertsHint')}</div>
          <div class="sheet-grid-2">
            <div>
              <label>Incoming alert</label>
              <div class="save-field-wrap">
                <input class="config-input" id="edit-incoming-alert-${b.id}" type="number" step="0.01" value="${b.incomingAlert||0}" placeholder="${t('incomingAlertPlaceholder')}" oninput="scheduleManagedBankAutoSave('${b.id}', 'incoming-alert')" onchange="scheduleManagedBankAutoSave('${b.id}', 'incoming-alert', true)" />
                <span class="field-save-check" id="save-check-incoming-alert-${b.id}">✓</span>
              </div>
            </div>
            <div>
              <label>Outgoing alert</label>
              <div class="save-field-wrap">
                <input class="config-input" id="edit-outgoing-alert-${b.id}" type="number" step="0.01" value="${b.outgoingAlert||0}" placeholder="${t('outgoingAlertPlaceholder')}" oninput="scheduleManagedBankAutoSave('${b.id}', 'outgoing-alert')" onchange="scheduleManagedBankAutoSave('${b.id}', 'outgoing-alert', true)" />
                <span class="field-save-check" id="save-check-outgoing-alert-${b.id}">✓</span>
              </div>
            </div>
          </div>
        </div>


        <div class="budget-status-note">${t('autosaveHint')}</div>
        ${b.system ? `<div class="budget-status-note">${t('defaultBankCannotDelete')}</div>` : `<button class="manager-danger-btn" onclick="deleteCustomBank('${b.id}')">${t('deleteBank')}</button>`}
      </div>
    </div>
  `;
  };

  wrap.innerHTML = allBanks.map(row).join('') || `<div class="empty-state">${t('noBanksAdded')}</div>`;
  try { initBtTouchFeedback('.manager-sheet-back-btn'); } catch (_) {}
}
function getManagedBankMonthlyValues(bankKey) {
  const budgetMonth = document.getElementById('edit-budget-month-' + bankKey)?.value || getAktuálneMonth();
  const month = normalizeMonthStr(budgetMonth);
  const isCreditCardBank = bankKey === 'csob_cz_credit';
  const rawCardLimit = parseInt(document.getElementById('edit-card-limit-' + bankKey)?.value || '0', 10) || 0;
  const rawCreditLimit = parseFloat(document.getElementById('edit-credit-card-limit-' + bankKey)?.value || '0') || 0;
  return {
    month,
    // Credit-card monthly limit is saved into Bank_Archive / Credit card limits.
    // Keep normal Card limits at 0 for credit-card banks so it never mixes with debit card-payment limits.
    cardLimit: isCreditCardBank ? 0 : rawCardLimit,
    creditCardLimit: isCreditCardBank ? rawCreditLimit : rawCreditLimit,
    budget: parseFloat(document.getElementById('edit-budget-' + bankKey)?.value || '0') || 0,
    warning: parseFloat(document.getElementById('edit-warning-' + bankKey)?.value || '0') || 0,
    balance: parseFloat(document.getElementById('edit-balance-' + bankKey)?.value || '0') || 0,
    incomingAlert: parseFloat(document.getElementById('edit-incoming-alert-' + bankKey)?.value || '0') || 0,
    outgoingAlert: parseFloat(document.getElementById('edit-outgoing-alert-' + bankKey)?.value || '0') || 0
  };
}

function setManagedSaveCheck(bankKey, fieldKey, state) {
  const el = document.getElementById(`save-check-${fieldKey}-${bankKey}`);
  if (!el) return;
  el.classList.remove('show', 'saving', 'error');
  if (state === 'saving') {
    el.textContent = '…';
    el.classList.add('saving');
    return;
  }
  if (state === 'error') {
    el.textContent = '✓';
    el.classList.add('show');
    window.setTimeout(() => el.classList.remove('show'), 1800);
    return;
  }
  if (state === 'saved') {
    el.textContent = '✓';
    el.classList.add('show');
    window.setTimeout(() => el.classList.remove('show'), 1800);
  }
}

function scheduleManagedBankAutoSave(bankKey, fieldKey, immediate = false) {
  const key = `${bankKey}:${fieldKey}`;
  window.clearTimeout(managedBankAutoSaveTimers[key]);
  setManagedSaveCheck(bankKey, fieldKey, 'saving');
  managedBankAutoSaveTimers[key] = window.setTimeout(() => {
    autoSaveManagedBankMonthlyField(bankKey, fieldKey);
  }, immediate ? 80 : 700);
}

function scheduleManagedBankDetailAutoSave(bankKey, fieldKey, immediate = false) {
  const key = `${bankKey}:detail:${fieldKey}`;
  window.clearTimeout(managedBankAutoSaveTimers[key]);
  setManagedSaveCheck(bankKey, fieldKey, 'saving');
  managedBankAutoSaveTimers[key] = window.setTimeout(() => {
    autoSaveManagedBankDetails(bankKey, fieldKey);
  }, immediate ? 80 : 700);
}

function scheduleManagedBankCardAutoSave(bankKey, slot, cardField, immediate = false) {
  window.pendingManagedBankCardEdit = {
    bankKey: String(bankKey || ''),
    slot: Number(slot || 0) || 0,
    field: String(cardField || '')
  };
  scheduleManagedBankDetailAutoSave(bankKey, 'cards', immediate);
}

function readManagedBankAccountsFromForm(bankKey) {
  const id = String(bankKey || '').trim();
  const rows = Array.from(document.querySelectorAll('[data-bank-account-row-v288]'))
    .filter(row => row.getAttribute('data-bank-account-row-v288') === id);
  if (!rows.length) {
    const visible = document.getElementById('edit-account-v286-' + id);
    const legacy = document.getElementById('edit-account-' + id);
    return cleanBankAccountValue(visible?.value || legacy?.value || '');
  }
  const values = rows
    .map(row => cleanBankAccountValue(row.querySelector('input')?.value || ''))
    .filter(Boolean);
  return normalizeIdentifierList(values.join(','));
}

function refreshBankIdentifierDependentViews() {
  try { __btTxnsTabDirty = true; } catch (_) {}
  try {
    if (activePageId === 'txns' && typeof renderTransactionsSection === 'function') renderTransactionsSection();
  } catch (_) {}
  try { renderBankCards(getTransactionsByBank(true, true)); } catch (_) {}
}

async function autoSaveManagedBankDetails(bankKey, fieldKey = 'name') {
  const base = getBankInfo(bankKey) || {};
  const newName = document.getElementById('edit-name-' + bankKey)?.value.trim() || plainBankName(bankKey);
  const newCurrency = normalizeCurrencyForStorage(document.getElementById('edit-currency-' + bankKey)?.value || base.primaryCurrency || 'Kč');
  const visibleAccount = document.getElementById('edit-account-v286-' + bankKey);
  const legacyAccount = document.getElementById('edit-account-' + bankKey);
  const accountFromForm = readManagedBankAccountsFromForm(bankKey);
  if (legacyAccount) legacyAccount.value = accountFromForm || visibleAccount?.value || legacyAccount.value || '';
  const hasStoredCardFields = !!document.getElementById(getManagedBankStoredCardInputId(bankKey, 1, 'number'));
  const storedCards = hasStoredCardFields ? readManagedBankStoredCardsFromForm(bankKey) : getBankStoredCards(bankKey);
  if (hasStoredCardFields) setBankStoredCards(bankKey, storedCards);
  const newAccount = cleanBankAccountValue(accountFromForm || document.getElementById('edit-account-' + bankKey)?.value || base.account || '');
  const newCards = removeAccountPartsFromCards(cleanBankCardsValue(document.getElementById('edit-cards-' + bankKey)?.value || base.cards || ''), newAccount);

  setBankDisplayOverride(bankKey, newName);
  localStorage.setItem('bank_currency_' + bankKey, newCurrency);
  localStorage.setItem('bank_account_' + bankKey, newAccount);
  localStorage.setItem('bank_cards_' + bankKey, newCards);

  const customBanks = getCustomBanks();
  const custom = customBanks.find(b => b.id === bankKey);
  if (custom) {
    custom.name = newName;
    custom.currency = newCurrency;
    custom.account = newAccount;
    custom.cards = newCards;
    custom.storedCards = storedCards;
    saveCustomBanks(customBanks);
  }

  const pendingCardEdit = fieldKey === 'cards' && window.pendingManagedBankCardEdit?.bankKey === String(bankKey)
    ? window.pendingManagedBankCardEdit
    : null;
  const bankSaveAction = fieldKey === 'cards' ? 'saveBankCards' : 'saveBank';
  const ok = await postToBankTrackerEndpoint(bankSaveAction, {
    bank: {
      id: bankKey,
      name: newName,
      currency: newCurrency,
      type: base.primaryType || custom?.type || 'card',
      account: newAccount,
      cards: newCards,
      storedCards,
      replaceIdentifiers: true,
      changedField: fieldKey,
      changedSlot: pendingCardEdit?.slot || 0,
      changedCardField: pendingCardEdit?.field || '',
      allowAppend: false,
      active: true
    }
  });

  if (!ok) {
    setManagedSaveCheck(bankKey, fieldKey, 'error');
    const status = document.getElementById('limits-sync-status');
    if (status) status.textContent = 'Zmeny sú uložené lokálne. Google Sheets sync sa nepodaril - skontroluj Web App /exec a Apps Script Executions.';
  }
  if (ok) {
    setManagedSaveCheck(bankKey, fieldKey, 'saved');
    showSavedToast();
  }
  if (fieldKey === 'account' || fieldKey === 'cards') refreshBankIdentifierDependentViews();
  renderOverview();
  renderArchive();
  return ok;
}

async function autoSaveManagedBankMonthlyField(bankKey, fieldKey = 'settings') {
  const values = getManagedBankMonthlyValues(bankKey);
  if (!values.month) return false;

  // Update local state first so the UI reacts immediately.
  localStorage.setItem(`bank_card_limit_${bankKey}_${values.month}`, String(values.cardLimit));
  if (bankKey === 'csob_cz_credit') {
    setCreditCardLimitForBank(bankKey, values.creditCardLimit, values.month);
    localStorage.setItem('bank_credit_card_limit_' + bankKey, String(values.creditCardLimit));
  }
  const banks = getCustomBanks();
  const custom = banks.find(b => b && b.id === bankKey);
  if (custom) {
    custom.cardLimit = values.cardLimit;
    custom.creditCardLimit = values.creditCardLimit;
    custom.balance = values.balance;
    custom.budget = values.budget;
    custom.warning = values.warning;
    custom.incomingAlert = values.incomingAlert;
    custom.outgoingAlert = values.outgoingAlert;
    custom.budgetMonth = values.month;
    saveCustomBanks(banks);
  }
  const limits = getLimitsForMonth(values.month);
  const bank = getBankInfo(bankKey);
  if (bank && bank.limitKey) {
    limits[bank.limitKey] = values.cardLimit;
    saveLimitsForMonth(values.month, limits);
  }
  setBudgetSettingsForBank(bankKey, values.budget, values.warning, values.month);
  syncAccountBalanceBaseFromAbsoluteValue(bankKey, values.month, values.balance);
  setTransactionAlertSettingsForBank(bankKey, values.incomingAlert, values.outgoingAlert, values.month);

  let ok = await saveBankSettingsEndpoint(bankKey, values.month, values.cardLimit, values.budget, values.warning, values.balance, values.incomingAlert, values.outgoingAlert, values.creditCardLimit);

  if (!ok) {
    setManagedSaveCheck(bankKey, fieldKey, 'error');
    const status = document.getElementById('limits-sync-status');
    if (status) status.textContent = 'Zmeny sú uložené lokálne. Google Sheets sync sa nepodaril - skontroluj Web App /exec a Apps Script Executions.';
  }
  if (ok) {
    setManagedSaveCheck(bankKey, fieldKey, 'saved');
    showSavedToast();
  }
  renderOverview();
  renderArchive();
  return ok;
}

async function updateSystemBankSettings(bankKey) {
  const bank = getBankInfo(bankKey);
  const budgetMonth = document.getElementById('edit-budget-month-' + bankKey)?.value || '';
  if (!budgetMonth) {
    alert(t('chooseMonth', 'Vyber mesiac'));
    document.getElementById('edit-budget-month-' + bankKey)?.focus();
    return;
  }
  const monthStr = normalizeMonthStr(budgetMonth);
  const limits = getLimitsForMonth(monthStr);

  const newName = document.getElementById('edit-name-' + bankKey)?.value.trim() || plainBankName(bankKey);
  const newCurrency = normalizeCurrencyForStorage(document.getElementById('edit-currency-' + bankKey)?.value || bank.primaryCurrency || 'Kč');
  const newAccount = cleanBankAccountValue(document.getElementById('edit-account-' + bankKey)?.value || bank.account || '');
  const newCards = removeAccountPartsFromCards(cleanBankCardsValue(document.getElementById('edit-cards-' + bankKey)?.value || bank.cards || ''), newAccount);
  const newLimit = parseInt(document.getElementById('edit-card-limit-' + bankKey)?.value || '0', 10) || 0;
  const newCreditCardLimit = parseFloat(document.getElementById('edit-credit-card-limit-' + bankKey)?.value || '0') || 0;
  const newBudget = parseFloat(document.getElementById('edit-budget-' + bankKey)?.value || '0') || 0;
  const newWarning = parseFloat(document.getElementById('edit-warning-' + bankKey)?.value || '0') || 0;
  const newBalance = parseFloat(document.getElementById('edit-balance-' + bankKey)?.value || '0') || 0;
  const newIncomingAlert = parseFloat(document.getElementById('edit-incoming-alert-' + bankKey)?.value || '0') || 0;
  const newOutgoingAlert = parseFloat(document.getElementById('edit-outgoing-alert-' + bankKey)?.value || '0') || 0;

  setBankDisplayOverride(bankKey, newName);
  localStorage.setItem('bank_currency_' + bankKey, newCurrency);
  localStorage.setItem('bank_account_' + bankKey, newAccount);
  localStorage.setItem('bank_cards_' + bankKey, newCards);

  if (bank && bank.limitKey) {
    limits[bank.limitKey] = newLimit;
    saveLimitsForMonth(monthStr, limits);
  }
  if (bankKey === 'csob_cz_credit') {
    setCreditCardLimitForBank(bankKey, newCreditCardLimit, monthStr);
    localStorage.setItem('bank_credit_card_limit_' + bankKey, String(newCreditCardLimit));
  }

  setBudgetSettingsForBank(bankKey, newBudget, newWarning, budgetMonth);
  syncAccountBalanceBaseFromAbsoluteValue(bankKey, monthStr, newBalance);
  setTransactionAlertSettingsForBank(bankKey, newIncomingAlert, newOutgoingAlert, monthStr);

  showSavedToast();

  const bankOk = await postToBankTrackerEndpoint('saveBank', {
    bank: {
      id: bankKey,
      name: newName,
      currency: newCurrency,
      type: bank?.primaryType || 'card',
      account: newAccount,
      cards: newCards,
      active: true
    }
  });
  const settingsOk = await saveBankSettingsEndpoint(bankKey, budgetMonth, newLimit, newBudget, newWarning, newBalance, newIncomingAlert, newOutgoingAlert, newCreditCardLimit);

  renderBankManager();
  renderAll();
  if (!(bankOk || settingsOk)) {
    const status = document.getElementById('limits-sync-status');
    if (status) status.textContent = 'Nastavenia banky sú uložené lokálne. Google Sheets zápis neprebehol - skontroluj Web App /exec URL.';
  }
}

function fillManualTransactionBanks(){const select=document.getElementById('manual-tx-bank');if(!select)return;select.innerHTML=BANK_ORDER.map(k=>`<option value="${k}">${plainBankName(k)}</option>`).join('')+getCustomBanks().map(b=>`<option value="${b.id}">${b.name}</option>`).join('')}

function getManualPaymentMeta(paymentKind, direction, bankKey, bankName, customBank) {
  const kind = paymentKind || 'card';
  const isIncoming = direction === 'incoming';

  if (kind === 'cash') {
    return {
      card: 'Cash',
      type: isIncoming ? t('cashPaymentKind') : t('cashPaymentKind')
    };
  }

  if (kind === 'account') {
    const info = BANKS[bankKey] || null;
    const account = customBank?.account || localStorage.getItem('bank_account_' + bankKey) || info?.account || '';
    const firstAccount = cleanBankAccountValue(account).split(',').map(v => v.trim()).filter(Boolean)[0] || '';
    return {
      card: firstAccount ? `Účet ${firstAccount}` : `Účet ${bankName}`,
      type: isIncoming ? 'príjem na účet' : 'odchod z účtu'
    };
  }

  const info = BANKS[bankKey] || null;
  const cards = customBank?.cards || localStorage.getItem('bank_cards_' + bankKey) || info?.cards || '';
  const firstCard = cleanBankCardsValue(cards).split(',').map(v => v.trim()).filter(Boolean)[0] || '';
  return {
    card: firstCard ? `Karta ****${firstCard}` : `Karta ${bankName}`,
    type: 'platba kartou'
  };
}

async function saveManualTransaction(){
  const bankKey=document.getElementById('manual-tx-bank')?.value||'rb_cz';
  const paymentKind=document.getElementById('manual-tx-kind')?.value||'card';
  const merchant=document.getElementById('manual-tx-merchant')?.value.trim()||t('manualTransaction');
  const amountRaw=parseFloat(document.getElementById('manual-tx-amount')?.value||'0')||0;
  const direction=document.getElementById('manual-tx-direction')?.value||'outgoing';
  const currency=normalizeCurrencyForStorage(document.getElementById('manual-tx-currency')?.value||'Kč');
  const category=document.getElementById('manual-tx-category')?.value||'Ostatné';
  const variableSymbol = String(document.getElementById('manual-tx-vs')?.value || '').replace(/\D/g, '').trim();
  const tagLabel = normalizeTransactionTagLabel(document.getElementById('manual-tx-tag')?.value || '');
  const tagColorInput = document.getElementById('manual-tx-tag-color');
  const tagShapeRaw = document.getElementById('manual-tx-tag-shape')?.value || '';
  const tagValidation = validateRequiredTagFields(
    tagLabel,
    tagShapeRaw,
    tagColorInput?.value || '#58A6FF',
    tagColorInput?.dataset?.userPicked || '0',
    'manual'
  );
  if (!tagValidation.ok) { alert(tagValidation.message); return; }
  const tagColor = tagLabel ? tagValidation.color : '';
  const tagShape = tagLabel ? tagValidation.shape : '';
  const txDate=parseManualDateInput(document.getElementById('manual-tx-date')?.value);
  const amount=direction==='incoming'?Math.abs(amountRaw):-Math.abs(amountRaw);
  const customBank=getCustomBanks().find(b=>b.id===bankKey);
  const bankName=customBank?customBank.name:plainBankName(bankKey);
  const paymentMeta = getManualPaymentMeta(paymentKind, direction, bankKey, bankName, customBank);

  const newTx = {
    id:'manual-'+Date.now(),
    date:formatDate(txDate),
    rawDate:txDate.toISOString(),
    amount,
    currency,
    merchant,
    category,
    card:paymentMeta.card,
    type:paymentMeta.type,
    paymentKind,
    variableSymbol,
    vs: variableSymbol,
    tagLabel,
    tagName: tagLabel,
    tagColor,
    tagShape,
    tagMeta: tagLabel ? { name: tagLabel, color: tagColor, shape: tagShape } : null,
    tag: tagLabel ? JSON.stringify({ name: tagLabel, color: tagColor, shape: tagShape }) : '',
    month:getMonthFromDate(txDate),
    bank:bankName,
    bankId: bankKey,
    timestamp:txDate.getTime(),
    /* v7330: okamih VZNIKU záznamu, nie dátum platby. Backend podľa neho
       zoradí dávku z viacerých zariadení pred prepočtom zostatkov. */
    created_at: new Date().toISOString()
  };

  allTransactions.unshift(newTx);
  allTransactions=sortTransactionsNewestFirst(allTransactions);
  seedAccountBalanceBasesForMonth(newTx.month);
  recomputeAccountBalancesForMonth(newTx.month);
  applyLocalArchiveStatsFromTransaction(newTx, 1);
  saveCachedTransactionsSnapshot();
  closeBottomSheets();
  renderAll();

  // v156: manual add feels instant because the transaction is added locally immediately.
  // Sync to Google Sheets in the background; do not block the UI with a loading spinner.
  showSavedToast();
  postToBankTrackerEndpoint('saveTransaction', { transaction: extractTxnPayload(newTx) }).then(ok => {
    if (ok) scheduleBackgroundMonthlyArchiveRepair('save_transaction_background_repair');
    if (!ok) {
      const status = document.getElementById('limits-sync-status');
      if (status) status.textContent = t('transactionSyncDelayed') || 'Saved locally. Google Sheets response was delayed.';
    }
  });

  document.getElementById('manual-tx-merchant').value='';
  document.getElementById('manual-tx-amount').value='';
  document.getElementById('manual-tx-category').value='Ostatné';
  const vsInput = document.getElementById('manual-tx-vs');
  if (vsInput) vsInput.value = '';
  const tagInput = document.getElementById('manual-tx-tag');
  if (tagInput) tagInput.value = '';
  if (tagColorInput) {
    tagColorInput.value = '#58a6ff';
    tagColorInput.dataset.userPicked = '0';
  }
  const tagShapeInput = document.getElementById('manual-tx-tag-shape');
  if (tagShapeInput) tagShapeInput.value = '';
  const kindInput = document.getElementById('manual-tx-kind');
  if (kindInput) kindInput.value = 'card';
  const dateInput = document.getElementById('manual-tx-date');
  if (dateInput) dateInput.value = toDateInputValue(new Date());
}
function filterDirection(direction){
  activeDirection=direction;
  clearDrilldownTransactionFilter();
  resetTxnVisibleLimit();
  document.getElementById('filter-dir-all')?.classList.toggle('active',direction==='all');
  document.getElementById('filter-dir-incoming')?.classList.toggle('active',direction==='incoming');
  document.getElementById('filter-dir-outgoing')?.classList.toggle('active',direction==='outgoing');
  updateTxnPage();
}
function getArchiveMonthlySeries() {
  const monthly = {};

  allTransactions.forEach(t => {
    if (!t.month) return;

    if (!monthly[t.month]) {
      monthly[t.month] = { month: t.month, incoming: 0, spent: 0 };
    }

    const currency = currencyCode(t.currency || 'CZK');
    const amount = Math.abs(Number(t.amount) || 0);
    const czkValue = currency === 'EUR' ? amount * 25 : amount;

    if (Number(t.amount) > 0) monthly[t.month].incoming += czkValue;
    if (Number(t.amount) < 0) monthly[t.month].spent += czkValue;
  });

  return Object.values(monthly)
    .sort((a, b) => monthSortValue(a.month) - monthSortValue(b.month))
    .slice(-8);
}






function getFxRateToEurBase(currency) {
  const curr = currencyCode(currency || 'CZK');
  if (curr === 'EUR') return 1;
  const rate = Number(fxRates?.[curr] || 0);
  if (rate > 0) return rate;
  if (curr === 'CZK') return 25;
  return 0;
}

function convertAmountCurrency(amount, fromCurrency, toCurrency) {
  const value = Math.abs(Number(amount) || 0);
  const from = currencyCode(fromCurrency || 'CZK');
  const to = currencyCode(toCurrency || 'CZK');

  if (from === to) return value;

  const fromRate = getFxRateToEurBase(from);
  const toRate = getFxRateToEurBase(to);
  if (!fromRate || !toRate) return value;

  const valueInEur = value / fromRate;
  return valueInEur * toRate;
}
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
  const breakdown = getMonthlyCashflowBreakdown([bankKey], normalizedMonth, target, { excludeCreditCards: false });
  const bank = breakdown.byBank?.[bankKey] || { spent: 0, income: 0 };
  if (field === 'spending') return Math.max(0, Number(bank.spent || 0) || 0);
  if (field === 'income') return Math.max(0, Number(bank.income || 0) || 0);
  if (field === 'net') return (Number(bank.income || 0) || 0) - (Number(bank.spent || 0) || 0);
  return 0;
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

  const stored = getStoredMonthlyCashflowStat(bankKey, normalizedMonth, field, target);
  if (stored != null) return stored;
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
  return getMonthlyCashflowBreakdown(bankKeys, monthStr, targetCurrency || getAppCurrency() || 'CZK', {
    excludeCreditCards: false
  });
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