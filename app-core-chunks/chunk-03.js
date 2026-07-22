// Generated app-core slice 3/34 (declarations).

function parseSheetData(raw) {
  const data = parseGvizJson(raw);
  const rows = data.table.rows;
  const columnLabels = (data.table.cols || []).map(col => String(col?.label || '').trim().toLowerCase());
  const columnIndex = (labels, fallback) => {
    const candidates = (Array.isArray(labels) ? labels : [labels]).map(label => String(label || '').trim().toLowerCase());
    for (const label of candidates) {
      const index = columnLabels.indexOf(label);
      if (index >= 0) return index;
    }
    return fallback;
  };
  const variableSymbolColumns = ['vs', 'variable symbol']
    .map(label => columnLabels.indexOf(label))
    .filter(index => index >= 0);
  if (!variableSymbolColumns.length) variableSymbolColumns.push(10);
  const tagColumn = columnIndex('Tag', 11);
  const excludeStatsColumn = columnIndex('Exclude stats', 12);
  const returnForColumn = columnIndex('Return for transaction ID', 13);
  const recurringGroupColumn = columnIndex('Recurring group ID', 14);
  const txns = [];
  
  let index = 0;
  for (const row of rows) {
    if (!row.c || !row.c[0]) continue;
    const firstCell = String(row.c[0]?.v ?? row.c[0]?.f ?? '').trim().toLowerCase();
    const merchantCell = String(row.c[3]?.v ?? row.c[3]?.f ?? '').trim().toLowerCase();
    const currencyCell = String(row.c[2]?.v ?? row.c[2]?.f ?? '').trim().toLowerCase();
    if (firstCell === 'dátum' || firstCell === 'datum' || merchantCell === 'obchodník' || merchantCell === 'obchodnik' || currencyCell === 'mena') continue;
    const txDate = parseGSheetDate(row.c[0]?.v);
    const dateStr = txDate ? formatDate(txDate) : String(row.c[0]?.f || '');
    const monthStr = txDate ? `${String(txDate.getMonth()+1).padStart(2,'0')}/${txDate.getFullYear()}` : String(row.c[7]?.v || '');
    const rawAmount = row.c[1]?.v ?? row.c[1]?.f ?? 0;
    const amount = parseAmountValue(rawAmount);

    const sheetEmailId = String(row.c[8]?.v || row.c[8]?.f || '').trim();
    const fallbackId = 'tx-' + (txDate ? txDate.getTime() : index) + '-' + Math.abs(amount) + '-' + index;
    const bankName = row.c[9]?.v || row.c[9]?.f || '';
    const variableSymbolValue = variableSymbolColumns
      .map(column => row.c[column]?.v ?? row.c[column]?.f ?? '')
      .find(value => String(value).trim() !== '') ?? '';
    const variableSymbol = String(variableSymbolValue).replace(/\D/g, '').trim();
    const tagRaw = String(row.c[tagColumn]?.v || row.c[tagColumn]?.f || '').trim();
    const excludeRaw = String(row.c[excludeStatsColumn]?.v || row.c[excludeStatsColumn]?.f || '').trim();
    const returnForTransactionId = String(row.c[returnForColumn]?.v || row.c[returnForColumn]?.f || '').trim();
    const recurringGroupId = String(row.c[recurringGroupColumn]?.v || row.c[recurringGroupColumn]?.f || '').trim();
    let parsedTag = null;
    if (tagRaw) {
      try { parsedTag = JSON.parse(tagRaw); } catch(_) {
        const legacy = tagRaw.split('|');
        if (legacy.length >= 3) parsedTag = { shape: legacy[0], color: legacy[1], name: legacy.slice(2).join('|') };
        else parsedTag = { name: tagRaw };
      }
    }
    const tagName = normalizeTransactionTagLabel(parsedTag?.name || parsedTag?.label || '');
    const tagColor = tagName ? normalizeTransactionTagColor(parsedTag?.color || '#58A6FF') : '';
    const tagShape = tagName ? normalizeTransactionTagShape(parsedTag?.shape || 'square') : '';
    let merchant = String(row.c[3]?.v || row.c[3]?.f || 'Neznámy').trim() || 'Neznámy';
    let category = row.c[4]?.v || 'Ostatné';
    if (merchant === 'B') {
      merchant = 'Action';
      category = 'Obchod';
    }
    txns.push({
      id: sheetEmailId || fallbackId,
      msgId: sheetEmailId || fallbackId,
      emailId: sheetEmailId || '',
      date: dateStr,
      amount: isNaN(amount) ? 0 : amount,
      currency: normalizeCurrencyForStorage(row.c[2]?.v || 'CZK'),
      merchant: merchant,
      category: category,
      card: row.c[5]?.v || '????',
      type: row.c[6]?.v || '',
      month: monthStr,
      bank: bankName,
      bankId: canonicalBankIdFromSheetRow('', bankName, row.c[5]?.v || ''),
      variableSymbol: variableSymbol,
      vs: variableSymbol,
      tagLabel: tagName,
      tagName: tagName,
      tagColor: tagColor,
      tagShape: tagShape,
      tagMeta: tagName ? { name: tagName, color: tagColor, shape: tagShape } : null,
      tag: tagName ? JSON.stringify({ name: tagName, color: tagColor, shape: tagShape }) : '',
      excludeFromSpent: /^(yes|true|1|on)$/i.test(excludeRaw),
      returnForTransactionId: returnForTransactionId,
      recurring_group_id: recurringGroupId || null,
      timestamp: txDate ? txDate.getTime() : parseCustomDateStr(dateStr).getTime()
    });
    index++;
  }
  return sortTransactionsNewestFirst(txns);
}


function parseGvizJson(raw) {
  const json = String(raw || '').replace(/^[^(]+\(/, '').replace(/\);?\s*$/, '');
  return JSON.parse(json);
}

function parseSheetNumber(value, formatted = '') {
  if (typeof value === 'number' && isFinite(value)) return value;
  const raw = value !== undefined && value !== null && value !== '' ? value : formatted;
  const text = String(raw || '')
    .replace(/\u00a0/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '.');
  const n = Number(text);
  return isNaN(n) ? 0 : n;
}


function buildGvizUrl(spreadsheetId, sheetName) {
  const cacheBust = String(Date.now()) + '_' + Math.random().toString(36).slice(2);
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json;reqId=${cacheBust}&headers=1&sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent('select *')}&cacheBust=${cacheBust}`;
}

function isGoogleSheetsGvizUrl(url) {
  return /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[^/]+\/gviz\/tq/i.test(String(url || ''));
}

function isMobileOrStandaloneClient() {
  try {
    if (document.documentElement.classList.contains('mobile-perf-mode')) return true;
    if (document.documentElement.classList.contains('pwa-standalone')) return true;
    if (typeof isLikelyIOSWebKit === 'function' && isLikelyIOSWebKit()) return true;
  } catch (_) {}
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

function getGvizFetchTimeoutMs() {
  return isMobileOrStandaloneClient() ? 45000 : 20000;
}

function getGvizSyncFailureHint() {
  if (!String(SHEETS_URL || '').trim()) {
    return ' V Settings skontroluj Google Sheets URL — na mobile sa ukladá zvlast pre kazde zariadenie.';
  }
  if (isMobileOrStandaloneClient()) {
    return ' Na mobile/PWA musi byt Sheet verejny (Share -> Anyone with the link / General access: Anyone). iPhone nema Google cookies zo Safari.';
  }
  return ' Skontroluj, ci je Google Sheet zdielany verejne a URL v Settings je spravna.';
}

function fetchGvizViaJsonp(url, timeoutMs) {
  const waitMs = Math.max(5000, Number(timeoutMs || getGvizFetchTimeoutMs()));
  return new Promise((resolve, reject) => {
    const callbackName = `__btGvizCb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    let done = false;
    let timer = null;
    const cleanup = () => {
      window.clearTimeout(timer);
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    const finish = (data, error = null) => {
      if (done) return;
      done = true;
      cleanup();
      if (error) {
        reject(error);
        return;
      }
      const gvizErrors = Array.isArray(data && data.errors) ? data.errors : [];
      const ok = !!data && data.status !== 'error' && !gvizErrors.length;
      const raw = `google.visualization.Query.setResponse(${JSON.stringify(data || {})});`;
      resolve({
        ok,
        status: ok ? 200 : 400,
        text: async () => raw,
        json: async () => data
      });
    };

    window[callbackName] = (data) => finish(data);
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.onerror = () => finish(null, new Error('Google Sheets JSONP script load failed'));

    try {
      const gvizUrl = new URL(url);
      const rawTqx = gvizUrl.searchParams.get('tqx') || 'out:json';
      const tqx = rawTqx
        .split(';')
        .map(part => part.trim())
        .filter(part => part && !/^responseHandler:/i.test(part))
        .join(';') || 'out:json';
      gvizUrl.searchParams.set('tqx', `${tqx};responseHandler:${callbackName}`);
      gvizUrl.searchParams.set('cacheBust', String(Date.now()) + '_' + Math.random().toString(36).slice(2));
      script.src = gvizUrl.toString();
      (document.body || document.head || document.documentElement).appendChild(script);
      timer = window.setTimeout(() => finish(null, new Error('Google Sheets JSONP timeout')), waitMs);
    } catch (e) {
      finish(null, e);
    }
  });
}

async function fetchNoStore(url) {
  if (isGoogleSheetsGvizUrl(url)) {
    const timeoutMs = getGvizFetchTimeoutMs();
    try {
      return await fetchGvizViaJsonp(url, timeoutMs);
    } catch (firstError) {
      await new Promise(resolve => window.setTimeout(resolve, isMobileOrStandaloneClient() ? 700 : 250));
      return fetchGvizViaJsonp(url, timeoutMs);
    }
  }
  return fetch(url, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
}

function normalizeFxSheetDate(value, formatted) {
  if (formatted) return String(formatted).substring(0, 10);
  if (value instanceof Date) return value.toISOString().substring(0, 10);
  const text = String(value || '');
  const dateCtor = text.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (dateCtor) {
    const y = Number(dateCtor[1]);
    const m = Number(dateCtor[2]) + 1;
    const d = Number(dateCtor[3]);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return text.substring(0, 10);
}

function parseFxRatesSheetData(raw) {
  const data = parseGvizJson(raw);
  const rows = data?.table?.rows || [];
  const parsedRows = rows.map(row => {
    const c = row.c || [];
    const date = normalizeFxSheetDate(c[0]?.v, c[0]?.f);
    const base = String(c[1]?.v || c[1]?.f || '').toUpperCase();
    const currency = currencyCode(c[2]?.v || c[2]?.f || '');
    const rate = Number(c[3]?.v ?? c[3]?.f ?? 0);
    return { date, base, currency, rate };
  }).filter(r => r.date && r.base === 'EUR' && r.currency && r.rate > 0);

  if (!parsedRows.length) return false;
  const latestDate = parsedRows.map(r => r.date).sort().pop();
  const latest = parsedRows.filter(r => r.date === latestDate);
  const nextRates = { EUR: 1 };
  latest.forEach(r => { nextRates[r.currency] = r.rate; });
  if (!nextRates.CZK) nextRates.CZK = 25;

  fxRates = nextRates;
  fxRatesDate = latestDate;
  localStorage.setItem('fx_rates', JSON.stringify(fxRates));
  localStorage.setItem('fx_rates_date', fxRatesDate);
  return true;
}

async function syncFxRatesFromSheets(spreadsheetId) {
  if (!spreadsheetId) return false;

  // v144: primary sheet is FX_Rates, but Martin also uses/mentioned FR_rates.
  // Try both names so app-currency conversion keeps working with either Google Sheets tab.
  const sheetNames = ['FX_Rates', 'FR_rates'];
  for (const sheetName of sheetNames) {
    try {
      const gvizUrl = buildGvizUrl(spreadsheetId, sheetName);
      const res = await fetchNoStore(gvizUrl);
      if (!res.ok) throw new Error(`${sheetName} fetch failed`);
      const raw = await res.text();
      const ok = parseFxRatesSheetData(raw);
      if (ok) {
        console.log(`FX rates loaded from ${sheetName}`);
        return true;
      }
    } catch (e) {
      console.warn(`${sheetName} rates sync skipped:`, e);
    }
  }

  console.warn('FX/FR rates sync skipped: no valid rates sheet found.');
  return false;
}


async function fetchSheetTransactions(spreadsheetId, sheetName) {
  const gvizUrl = buildGvizUrl(spreadsheetId, sheetName);
  const res = await fetchNoStore(gvizUrl);
  if (!res.ok) throw new Error(`${sheetName} fetch failed`);
  const raw = await res.text();
  return parseSheetData(raw);
}

async function syncArchivedTransactionsFromSheets(spreadsheetId) {
  try {
    if (!spreadsheetId) return [];
    const txns = await fetchSheetTransactions(spreadsheetId, 'Archive_Transactions');
    return txns.map(tx => ({ ...tx, archived: true }));
  } catch (e) {
    console.warn('Archive_Transactions sync skipped:', e);
    return [];
  }
}

function btPerfNow() {
  try { return (window.performance && typeof window.performance.now === 'function') ? window.performance.now() : Date.now(); }
  catch (_) { return Date.now(); }
}

function btPerfLog(name, durationMs, details = '') {
  const ms = Number(durationMs || 0);
  const item = {
    name: String(name || 'metric'),
    ms: Math.max(0, Math.round(ms * 10) / 10),
    at: new Date().toISOString(),
    details: details ? String(details) : ''
  };
  __btPerfState.samples.push(item);
  if (__btPerfState.samples.length > __btPerfState.maxSamples) {
    __btPerfState.samples.splice(0, __btPerfState.samples.length - __btPerfState.maxSamples);
  }
  try {
    const tail = item.details ? ` (${item.details})` : '';
    console.info(`[BT PERF] ${item.name}: ${item.ms}ms${tail}`);
  } catch (_) {}
}

function btPerfSummarize(samples, nameFilter) {
  const rows = (samples || []).filter((row) => !nameFilter || row.name === nameFilter);
  if (!rows.length) return null;
  const values = rows.map((row) => Number(row.ms || 0)).sort((a, b) => a - b);
  const total = values.reduce((sum, value) => sum + value, 0);
  const p95Index = Math.max(0, Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1));
  return {
    count: values.length,
    avgMs: Math.round((total / values.length) * 10) / 10,
    minMs: values[0],
    maxMs: values[values.length - 1],
    p95Ms: values[p95Index]
  };
}

async function syncData(options = {}) {
  const syncPerfStart = btPerfNow();
  const startupMode = !!(options && options.startupMode);
  const backgroundMode = !!(options && options.backgroundMode);
  const showFullScreenLoader = !!(options && options.showFullScreenLoader);
  let fullScreenLoaderClosed = false;
  const closeFullScreenLoader = () => {
    if (!showFullScreenLoader || fullScreenLoaderClosed) return;
    fullScreenLoaderClosed = true;
    finishAppBoot();
  };

  if (showFullScreenLoader) {
    startAppBootOverlay();
  }

  ensureDefaultConfig();
  clearCloudFirstLocalData();
  if (!isGoogleSheetsEnabled()) {
    console.log('Google Sheets disabled — showing last cached snapshot if available.');
    if (!allTransactions.length) loadCachedTransactionsSnapshot();
    renderAll();
    applyLanguage();
    updateGoogleSheetsToggleUi();
    closeFullScreenLoader(false);
    return;
  }

  if (!SHEETS_URL || isSyncing) {
    if (!SHEETS_URL) {
      const loadStatus = document.getElementById('limits-sync-status');
      if (loadStatus) loadStatus.textContent = 'Google Sheets URL is empty for this localhost origin. Paste/save the Sheets URL in Settings to load Overview details.';
      console.warn('Google Sheets sync skipped: missing sheets_url for this origin.');
    }
    if (!allTransactions.length) loadCachedTransactionsSnapshot();
    renderAll();
    applyLanguage();
    closeFullScreenLoader(false);
    return;
  }
  isSyncing = true;
  try { setSyncBtnSpinning(true); } catch (_) {}
  const loadStatus = document.getElementById('limits-sync-status');
  if (loadStatus && !backgroundMode) loadStatus.textContent = 'Načítavam dáta z Google Sheets...';
  try { lockOverviewBalanceDatasets(); setOverviewBalanceSyncState(true); setHeaderBrandSyncState(true); } catch (_) {}
  try {
    const match = SHEETS_URL.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) throw new Error('Neplatné URL');
    const spreadsheetId = match[1];

    if (loadStatus) loadStatus.textContent = 'Načítavam transakcie z Google Sheets...';
    const activeTxnsPromise = fetchSheetTransactions(spreadsheetId, 'Transactions');
    const archivedTxnsPromise = syncArchivedTransactionsFromSheets(spreadsheetId);
    // Bank_Archive is needed by the archive tab and overview balances. Start
    // its dependency immediately and load the archive as soon as Bank_Settings
    // supplies the canonical bank IDs, in parallel with both transaction tabs.
    const bankSettingsPromise = syncBanksFromSheets(spreadsheetId);
    const fxRatesPromise = syncFxRatesFromSheets(spreadsheetId);
    const bankArchivePromise = bankSettingsPromise.then(() => syncBankSettingsFromSheets(spreadsheetId));
    const activeTxns = await activeTxnsPromise;
    const archivedTxns = await archivedTxnsPromise;
    allTransactions = sortTransactionsNewestFirst(dedupeTransactionsForCloud([...activeTxns, ...archivedTxns]));
    saveCachedTransactionsSnapshot();

    if (loadStatus) loadStatus.textContent = 'Načítavam Bank_Archive, FX a zostatky...';
    await Promise.allSettled([
      bankArchivePromise,
      bankSettingsPromise,
      fxRatesPromise
    ]);
    await syncBalanceLogFromSheets(spreadsheetId);
    reapplySheetAccountBalancesFromStorage();

    if (!startupMode && !backgroundMode) {
      if (loadStatus) loadStatus.textContent = 'Dáta z Google Sheets sa načítali správne.';
    } else if (loadStatus && !backgroundMode) {
      loadStatus.textContent = 'Dáta z Google Sheets sa načítali správne.';
    } else if (loadStatus && backgroundMode) {
      loadStatus.textContent = 'Synchronizácia s Google Sheets dokončená.';
    }
  } catch(e) {
    console.error('Google Sheets transaction sync failed:', e);
    const syncHint = getGvizSyncFailureHint();
    if (loadStatus) {
      loadStatus.textContent = allTransactions.length
        ? ('Sync zlyhal — zobrazuje sa posledná cache.' + syncHint)
        : ('Dáta sa nepodarilo načítať.' + syncHint);
    }
    if (!allTransactions.length) loadCachedTransactionsSnapshot();
  } finally {
    isSyncing = false;
    try { setSyncBtnSpinning(false); } catch (_) {}
    try { reapplySheetAccountBalancesFromStorage(); } catch (e) { console.warn('Sheet balance reapply in finally failed:', e); }
    if (__appBootActive) await yieldStartupLogoFrames(2);
    try { recomputeAccountBalancesForLoadedMonths(); } catch (e) { console.warn('Account balance recompute after sync failed:', e); }
    if (backgroundMode || !startupMode) {
      if (activePageId === 'overview') {
        try { markOverviewChartsAwaitingFreshData(); } catch (_) {}
      }
      try { window.__overviewBalanceAnimateNext = true; } catch (_) {}
      await yieldStartupLogoFrames(__appBootActive ? 2 : 1);
      try { renderAll({ deferHeavy: true, visibleOnly: true }); } catch (_) {}
      await yieldStartupLogoFrames(__appBootActive ? 2 : 1);
      try { applyLanguage(); } catch (_) {}
      try { window.__overviewBalanceAnimateNext = false; } catch (_) {}
      if (activePageId === 'overview') {
        try { __overviewChartsDataSettled = true; } catch (_) {}
      }
    }
    try { setOverviewBalanceSyncState(false); setHeaderBrandSyncState(false); } catch (_) {}
    markCloudSyncCompleted();
    closeFullScreenLoader();
    const runSubscriptionDetection = () => {
      try { runSubscriptionDetectionPipeline({ reason: 'sync' }); } catch (e) { console.warn('Subscription detection failed:', e); }
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(runSubscriptionDetection, { timeout: 3000 });
    } else {
      window.setTimeout(runSubscriptionDetection, 900);
    }
    btPerfLog('syncData', btPerfNow() - syncPerfStart, [
      startupMode ? 'startup' : 'manual',
      backgroundMode ? 'background' : 'foreground',
      showFullScreenLoader ? 'overlay' : 'no-overlay'
    ].join(','));
  }
}

function loadDemoData() {
  // Cloud-first production build: no demo/test transactions.
  allTransactions = [];
}

function transactionToCzkEquivalent(tx) {
  return convertTransactionAmount(tx, 'CZK');
}