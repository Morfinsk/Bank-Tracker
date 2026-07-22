// Generated app-core slice 21/34 (declarations).

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