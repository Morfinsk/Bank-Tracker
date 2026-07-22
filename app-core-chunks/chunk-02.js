// Generated app-core slice 2/34 (declarations).

async function saveSimulatorMesačneLimits() {
  const monthStr = getSimulatorLimitMonth();
  const limits = readLimitInputs();
  saveLimitsForMonth(monthStr, limits);
  await syncLimitsToGoogleSheets(monthStr, getLimitsForMonth(monthStr));
  alert(`Limity pre ${formatMonthString(monthStr)} boli uložené.`);
  renderAll();
  updatePushStatus();
}

function applySimulatorLimitsForMonth(monthStr) {
  const values = readLimitInputs();
  const hasAny = Object.values(values).some(Number.isFinite);
  if (hasAny) saveLimitsForMonth(monthStr, values);
  else {
    ensureLimitHistoryForMonth(monthStr);
    localStorage.setItem('limits_history', JSON.stringify(limitsHistory));
  }
}


function isAirBankLikeValue(value) {
  const text = String(value || '').toLowerCase();
  return text.includes('air bank') || text.includes('airbank');
}

function canonicalBankIdFromSheetRow(id, name, account) {
  const rawId = String(id || '').trim();
  if (rawId === 'csob_cz_credit') return 'csob_cz_credit';
  if (rawId === 'air_bank_cz' || isAirBankLikeValue(name) || isAirBankLikeValue(account)) return 'air_bank_cz';
  if (rawId === 'pluxee' || String(name || '').toLowerCase().includes('pluxee') || String(name || '').toLowerCase().includes('stravenk')) return 'pluxee';
  return rawId;
}

function getBankKey(t) {
  const rawId = String(t?.bankId || t?.bankID || '').trim();
  if (rawId && BANKS[rawId]) return rawId;

  const cardLower = String(t?.card || '').toLowerCase();
  const bankLower = String(t?.bank || t?.banka || '').toLowerCase();
  const merchantLower = String(t?.merchant || '').toLowerCase();
  const typeLower = String(t?.type || '').toLowerCase();
  const categoryLower = String(t?.category || '').toLowerCase();
  const combined = `${bankLower} ${cardLower} ${merchantLower} ${typeLower} ${categoryLower}`;

  const csobCreditCard = getCsobCzCreditCardLast4();
  const rbCards = getVisibleCardsForBank('rb_cz');
  const csobSkCards = getVisibleCardsForBank('csob_sk');
  const csobCzCards = getVisibleCardsForBank('csob_cz').filter(v => v !== csobCreditCard);
  const airIds = [getStoredSystemBankAccount('air_bank_cz'), ...getVisibleCardsForBank('air_bank_cz')].filter(Boolean);
  const pluxeeCards = getVisibleCardsForBank('pluxee');

  if (combined.includes('air bank') || combined.includes('airbank') || textContainsAnyIdentifier(cardLower, airIds)) return 'air_bank_cz';
  if (combined.includes('pluxee') || combined.includes('stravenk') || textContainsAnyIdentifier(cardLower, pluxeeCards)) return 'pluxee';
  if (combined.includes('csob cz credit card') || (csobCreditCard && cardLower.includes(csobCreditCard))) return 'csob_cz_credit';
  if ((combined.includes('kredit') || combined.includes('credit card')) && (combined.includes('splátka') || combined.includes('splatka') || combined.includes('repayment') || (csobCreditCard && combined.includes(csobCreditCard)))) return 'csob_cz_credit';
  if (combined.includes('csob cz') || combined.includes('čsob cz') || combined.includes('csob česk') || combined.includes('čsob česk') || textContainsAnyIdentifier(cardLower, csobCzCards) || textContainsAnyIdentifier(cardLower, [getStoredSystemBankAccount('csob_cz')])) return 'csob_cz';
  if (combined.includes('moneta')) return 'moneta';
  if (combined.includes('csob sk') || combined.includes('čsob sk') || combined.includes('csob slov') || combined.includes('čsob slov') || textContainsAnyIdentifier(cardLower, csobSkCards) || textContainsAnyIdentifier(cardLower, [getStoredSystemBankAccount('csob_sk')])) return 'csob_sk';
  if (combined.includes('raiffeisen') || combined.includes('rb cz') || textContainsAnyIdentifier(cardLower, rbCards) || textContainsAnyIdentifier(cardLower, [getStoredSystemBankAccount('rb_cz')])) return 'rb_cz';
  if (merchantLower.includes('sup. maj')) return 'csob_sk';
  return 'rb_cz';
}

function getBankInfo(key) {
  return BANKS[key] || BANKS.rb_cz;
}

function isCsobTransaction(t) { return getBankKey(t) === 'csob_sk'; }

function getBankStatusText(count, limit, monthStr) {
  const dict = I18N[getLanguage()] || I18N.en;

  if (!limit || limit <= 0) {
    return `<span class="archive-bank-status" style="color:#8fbfff;">${dict.noLimit}</span>`;
  }

  if (count >= limit) {
    return `<span class="archive-bank-status" style="color:var(--ok);">${dict.completed}</span>`;
  }

  const normalizedMonth = normalizeMonthStr(monthStr || '');
  const currentMonth = normalizeMonthStr(getAktuálneMonth());
  const label = normalizedMonth && normalizedMonth === currentMonth
    ? (dict.missingCurrent || 'Missing')
    : (dict.notCompleted || 'Missed');

  return `<span class="archive-bank-status" style="color:var(--danger);">${label}</span>`;
}

function getDaysRemaining() {
  const offset = Number(activeOverviewMonthOffset || 0);
  if (offset < 0) return 0;
  if (offset > 0) {
    const viewDate = new Date();
    viewDate.setMonth(viewDate.getMonth() + offset);
    return new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  }
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(0, lastDay.getDate() - now.getDate());
}

function parseGSheetDate(val) {
  if (!val) return null;
  const m = String(val).match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+))?/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[4] ? parseInt(m[4]) : 0, m[5] ? parseInt(m[5]) : 0);
  return null;
}

function parseCustomDateStr(str) {
  if (!str) return new Date();
  try {
    const value = String(str).trim();
    if (!value) return new Date();

    // Podpora formátov:
    // 22.05.2026 11:18
    // 22.05.2026
    // 2026-05-22T11:18 / 2026-05-22 11:18
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2}))?/);
    if (isoMatch) {
      return new Date(
        parseInt(isoMatch[1], 10),
        parseInt(isoMatch[2], 10) - 1,
        parseInt(isoMatch[3], 10),
        isoMatch[4] ? parseInt(isoMatch[4], 10) : 12,
        isoMatch[5] ? parseInt(isoMatch[5], 10) : 0
      );
    }

    const skMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (skMatch) {
      return new Date(
        parseInt(skMatch[3], 10),
        parseInt(skMatch[2], 10) - 1,
        parseInt(skMatch[1], 10),
        skMatch[4] ? parseInt(skMatch[4], 10) : 12,
        skMatch[5] ? parseInt(skMatch[5], 10) : 0
      );
    }

    const fallback = new Date(value);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  } catch (e) {
    return new Date();
  }
}

function recalculateTransactionDateFields(t) {
  const parsedDate = parseCustomDateStr(t.date);
  const parsedTs = parsedDate.getTime();

  // Staršie demo/cache dáta mali timestamp 1000, 2000 atď.; tie potom padli až na spodok.
  // Preto timestamp vždy prerátame z textového dátumu, aby sa všetko radilo chronologicky.
  if (!isNaN(parsedTs)) {
    t.timestamp = parsedTs;
    t.month = getMonthFromDate(parsedDate);
    t.date = formatDate(parsedDate);
  }
  return t;
}

function sortTransactionsNewestFirst(txns) {
  return txns
    .map((tx) => {
      const row = recalculateTransactionDateFields(tx);
      return typeof normalizeTransactionRecurringFields === 'function'
        ? normalizeTransactionRecurringFields(row)
        : row;
    })
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}



function dedupeTransactionsForCloud(txns) {
  // Second-layer dedupe (Sheets remains source of truth; this cleans merge of
  // Transactions + Archive_Transactions + any local/cache rows before UI/totals).
  // Keep full msgId including ČSOB CZ suffixes (#csobcz-N) — those are distinct rows.
  const seen = new Set();
  const out = [];
  (txns || []).forEach((tx, index) => {
    if (!tx) return;
    const id = String(tx.msgId || tx.emailId || tx['Email ID'] || tx.id || '').trim();
    const vs = String(tx.vs || tx.variableSymbol || tx.reference || '').replace(/\D/g, '').trim();
    const fallbackKey = [
      tx.date || tx.rawDate || '',
      Number(tx.amount) || 0,
      tx.currency || '',
      tx.merchant || '',
      tx.card || '',
      tx.bank || '',
      vs
    ].join('|');
    const key = id && !/^demo/i.test(id) && !/^local-test/i.test(id)
      ? 'id:' + id
      : 'fb:' + fallbackKey;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...tx, id: id || tx.id || ('cloud_' + index), msgId: id || tx.msgId || tx.id || '' });
  });
  return out;
}

function clearDemoTransactionsCacheIfNeeded() {
  // Keep the last real cloud snapshot for instant startup, but remove old demo/test-only caches.
  try {
    localStorage.removeItem('demo_txns');
    localStorage.removeItem('test_txns');
    localStorage.removeItem('manual_demo_txns');
  } catch (e) {}
}

function clearCloudFirstLocalData() {
  // Keep user configuration and the last Google Sheets snapshot so the app can render instantly
  // before the fresh cloud sync finishes. Google Sheets remains the master after sync.
  try {
    localStorage.removeItem('demo_txns');
    localStorage.removeItem('test_txns');
    localStorage.removeItem('manual_demo_txns');
  } catch (e) {}
}

function normalizeTransactionCurrency(tx) {
  if (!tx) return tx;
  return {
    ...tx,
    currency: normalizeCurrencyForStorage(tx.currency || 'CZK')
  };
}


function loadCachedTransactionsSnapshot() {
  try {
    const cached = JSON.parse(localStorage.getItem('cached_txns') || '[]');
    if (!Array.isArray(cached) || !cached.length) return false;
    allTransactions = sortTransactionsNewestFirst(
      dedupeTransactionsForCloud(cached.map(tx => normalizeTransactionCurrency(tx)))
    );
    return true;
  } catch (e) {
    console.warn('Cached transactions snapshot could not be loaded:', e);
    return false;
  }
}

function getLocalCacheTimestamp(key) {
  try {
    const ts = Number(localStorage.getItem(key) || 0);
    return Number.isFinite(ts) && ts > 0 ? ts : 0;
  } catch (_) {
    return 0;
  }
}

function isLocalCacheFresh(key, ttlMs = LOCAL_PRECOMPUTE_CACHE_TTL_MS) {
  const ts = getLocalCacheTimestamp(key);
  if (!ts) return false;
  return (Date.now() - ts) < ttlMs;
}

function markLocalCacheTimestamp(key) {
  try { localStorage.setItem(key, String(Date.now())); } catch (_) {}
}

function shouldSkipStartupCloudSync() {
  return false;
}

function markCloudSyncCompleted() {
  markLocalCacheTimestamp('cached_cloud_sync_at');
}

function saveCachedTransactionsSnapshot() {
  try {
    localStorage.setItem('cached_txns', JSON.stringify(allTransactions || []));
    localStorage.setItem('cached_txns_updated_at', String(Date.now()));
  } catch (e) {
    console.warn('Cached transactions snapshot could not be saved:', e);
  }
}

function formatDate(d) {
  if (!d) return '';
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function parseAmountValue(value) {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;

  // Google Sheets niekedy vráti sumu ako text: -2 000,00 alebo -1 559,50.
  // Odstránime medzery vrátane NBSP a desatinnú čiarku prevedieme na bodku.
  const normalized = String(value)
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.\-]/g, '');

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

function formatMoney(amount, currency) {
  const curr = currencyCode(currency || getAppCurrency() || 'Kč');
  const value = Math.abs(Number(amount) || 0).toLocaleString('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return value;
}

function getCurrencySymbol(currency) {
  return currencySymbol(currency || 'Kč');
}

function formatCurrencyAmount(amount, currency) {
  const value = formatMoney(amount, currency).replace(/\s/g, ' ');
  const symbol = currencySymbol(currency || getAppCurrency() || 'Kč');
  if (symbol === '$' || symbol === '£') return `${symbol}${value}`;
  return `${value} ${symbol}`;
}


function formatSignedCurrencyAmount(amount, currency) {
  const numeric = Number(amount || 0);
  const sign = numeric < 0 ? '-' : '';
  return sign + formatCurrencyAmount(Math.abs(numeric), currency);
}

function getSignedAmountClass(value) {
  const numeric = Number(value || 0);
  if (numeric < 0) return 'amount-expense';
  if (numeric > 0) return 'amount-income';
  return '';
}

function getTransactionAccountCurrency(tx) {
  const bankKey = getBankKey(tx);
  const bankCurrency = getBankBalanceCurrency(bankKey) || getBankInfo(bankKey)?.primaryCurrency || tx?.currency || getAppCurrency() || 'CZK';
  return currencyCode(bankCurrency);
}

function shouldShowAccountCurrencyEquivalent(tx) {
  if (!tx) return false;
  const txCurrency = currencyCode(tx.currency || getAppCurrency() || 'CZK');
  const accountCurrency = getTransactionAccountCurrency(tx);
  if (!txCurrency || !accountCurrency || txCurrency === accountCurrency) return false;
  // Especially important for EUR accounts such as ČSOB SK where card tx can arrive in CZK.
  return true;
}

function renderAccountCurrencyEquivalent(tx, options = {}) {
  if (!shouldShowAccountCurrencyEquivalent(tx)) return '';
  const accountCurrency = getTransactionAccountCurrency(tx);
  const converted = convertTransactionAmount(tx, accountCurrency);
  const isIncome = Number(tx.amount) > 0;
  const sign = isIncome ? '+' : '-';
  const cls = isIncome ? 'amount-income' : 'amount-expense';
  const compact = options.compact === true;
  const label = '';
  const className = compact ? 'tx-account-equivalent-compact' : 'tx-account-equivalent';
  return `<div class="${className} ${cls}" title="Account currency: ${escapeAttr(accountCurrency)}">${label}${sign}${formatCurrencyAmount(converted, accountCurrency)}</div>`;
}

function getArchiveBankCurrency(bankKey) {
  const currency = getBankBalanceCurrency(bankKey) || getArchiveBankInfo(bankKey)?.primaryCurrency || 'CZK';
  return currencyCode(currency);
}

function formatFxDateShort(dateStr) {
  const value = String(dateStr || '').trim();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${Number(match[3])}.${Number(match[2])}.${String(match[1]).slice(-2)}`;
}

function updateAccountBalanceFxBadge() {
  const badge = document.getElementById('account-balance-fx-badge');
  if (!badge) return;
  const appCurr = currencyCode(getAppCurrency());
  const needsFxRows = appCurr === 'CZK' && getAllManagedBanksForBalance().some(bank => currencyCode(bank.currency || 'CZK') !== appCurr);
  if (!fxRatesDate || !needsFxRows) {
    badge.textContent = '';
    badge.classList.remove('show');
    return;
  }
  badge.textContent = `FX ${formatFxDateShort(fxRatesDate)}`;
  badge.classList.add('show');
}

function getCzkEquivalentText(amount, currency) {
  const bankCurr = currencyCode(currency || 'CZK');
  const appCurr = currencyCode(getAppCurrency());
  if (bankCurr === appCurr) return '';
  // Row-level conversion is shown only when app currency is CZK and the bank is foreign.
  // If app currency is EUR/USD/etc., keep each bank in its native currency without a second line.
  if (appCurr !== 'CZK') return '';
  const converted = convertSignedAmountCurrency(amount, bankCurr, appCurr);
  if (!converted) return '';
  return `≈ ${formatSignedCurrencyAmount(converted, getAppCurrency())}`;
}

function getCurrencyTotals(txns) {
  return txns.reduce((acc, t) => {
    const curr = currencyCode(t.currency || 'CZK');
    acc[curr] = (acc[curr] || 0) + Math.abs(Number(t.amount) || 0);
    return acc;
  }, {});
}

function renderCurrencyTotalLines(txns, primaryCurrency = 'CZK') {
  const totals = getCurrencyTotals(txns);
  const primary = String(primaryCurrency || 'CZK').toUpperCase();
  const currencies = [primary, ...Object.keys(totals).filter(c => c !== primary).sort()];
  const rows = currencies.filter(c => totals[c] > 0);

  if (rows.length === 0) return formatCurrencyAmount(0, primary);

  return rows.map((c, idx) => `
    <div style="${idx > 0 ? 'font-size:12px;color:var(--text);margin-top:3px;font-weight:600;' : ''}">${formatCurrencyAmount(totals[c], c)}</div>
  `).join('');
}