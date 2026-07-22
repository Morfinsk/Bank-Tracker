// Generated app-core slice 29/34 (declarations).

function parseBankSettingsSheetData(raw) {
  const data = parseGvizJson(raw);
  const rows = data?.table?.rows || [];
  const cols = data?.table?.cols || [];
  const headerFromCols = cols.map(col => String(col?.label || '').trim());
  const firstRowHeaders = rows[0]?.c?.map(cell => String(cell?.v ?? cell?.f ?? '').trim()) || [];
  const normalizeHeader = (value) => String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_\-./()]+/g, ' ')
    .replace(/\s+/g, ' ');
  const hasHeaderLabels = headerFromCols.some(Boolean);
  const firstRowLooksLikeHeader = firstRowHeaders
    .map(normalizeHeader)
    .some(h => /month|mesiac|mesic|obdobi|bank|banka|budget|balance|zostatok|zustatek|limit|spending|spent|income|vydav|prijem/i.test(h));
  const headerMode = hasHeaderLabels || firstRowLooksLikeHeader;
  const headers = (hasHeaderLabels ? headerFromCols : firstRowHeaders).map(normalizeHeader);
  const dataRows = firstRowLooksLikeHeader && !hasHeaderLabels ? rows.slice(1) : rows;
  const headerIndex = (names, fallback) => {
    const list = (Array.isArray(names) ? names : [names]).map(normalizeHeader).filter(Boolean);
    const exact = headers.findIndex(h => list.includes(h));
    if (exact >= 0) return exact;
    const contains = headers.findIndex(h => list.some(name => {
      if (name.length < 8 || h.length < 8) return false;
      return h.includes(name) || name.includes(h);
    }));
    return contains >= 0 ? contains : (headerMode ? -1 : fallback);
  };
  const idx = {
    month: headerIndex(['Month', 'Mesiac', 'Mesic', 'Period', 'Obdobi', 'Obdobie'], 0),
    bank: headerIndex(['Bank ID', 'BankID', 'Bank', 'Banka'], 1),
    cardLimit: headerIndex(['Card limit', 'Card Limit', 'Cards limit', 'Limit', 'Payment limit', 'Limit karty', 'Kartovy limit', 'Limit kariet'], 2),
    creditCardLimit: headerIndex(['Credit card limits', 'Credit card limit', 'Credit limit', 'Monthly credit limit', 'Monthly limit', 'monthlyLimit', 'monthly_limit', 'creditMonthlyLimit', 'credit_monthly_limit', 'credit_card_limit', 'credit_card_limits', 'Limit kreditky', 'Limit kreditnej karty', 'Limit kreditni karty'], -1),
    budget: headerIndex(['Budget', 'Bank budget', 'Monthly budget', 'Mesacny budget', 'Mesicni budget', 'Rozpocet'], 3),
    warning: headerIndex(['Warning', 'Warn', 'Budget warning', 'Warning threshold', 'Upozornenie', 'Varovani'], 4),
    balance: headerIndex(['Balance', 'Account balance', 'Zostatok', 'Zustatek', 'Zostatok uctu', 'Zustatek uctu'], 5),
    incomingAlert: headerIndex(['Incoming alert', 'Income alert', 'Incoming limit', 'Prijem alert', 'Prichozi alert'], 6),
    outgoingAlert: headerIndex(['Outgoing alert', 'Spending alert', 'Outgoing limit', 'Vydavky alert', 'Odchozi alert'], 7),
    monthlySpending: headerIndex(['Monthly spending', 'Spending', 'Spent', 'Monthly spent', 'Mesacne vydavky', 'Mesicni vydaje', 'Vydavky', 'Vydaje', 'Minute'], 8),
    monthlyIncome: headerIndex(['Monthly income', 'Income', 'Mesacny prijem', 'Mesicni prijem', 'Prijem', 'Prijmy'], 9),
    monthlyNet: headerIndex(['Monthly net', 'Net', 'Cisty vysledok', 'Netto'], -1)
  };
  const cellText = (cells, i) => i >= 0 ? String(cells[i]?.v ?? cells[i]?.f ?? '').trim() : '';
  const hasCell = (cells, i) => i >= 0 && !!cells[i] && String(cells[i].v ?? cells[i].f ?? '').trim() !== '';
  const hasNumericCell = (cells, i) => {
    if (i < 0 || !cells[i]) return false;
    const raw = cells[i].v ?? cells[i].f;
    if (raw === 0) return true;
    if (raw === null || raw === undefined) return false;
    return String(raw).trim() !== '';
  };
  const cellNumber = (cells, i) => parseSheetNumber(cells[i]?.v, cells[i]?.f);
  const parseSheetMonth = (cells, i) => {
    const raw = cells[i]?.v ?? cells[i]?.f ?? '';
    if (!String(raw || '').trim()) return '';
    const date = parseGSheetDate(raw);
    if (date) return getMonthFromDate(date);
    const text = String(raw || '').trim();
    const iso = text.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?/);
    if (iso) return `${String(Number(iso[2])).padStart(2, '0')}/${iso[1]}`;
    // Strict MM/YYYY (or M/YYYY) only. Do NOT fall back to the current month for
    // ambiguous values like "6.26" – a stray row like that would otherwise map to
    // the current month and overwrite the real balance (e.g. ČSOB SK) with 0.
    const mmYyyy = text.match(/^(\d{1,2})\/(\d{4})$/);
    if (mmYyyy) return `${String(parseInt(mmYyyy[1], 10)).padStart(2, '0')}/${mmYyyy[2]}`;
    return '';
  };
  if (!dataRows.length) return 0;
  clearSheetAccountBalanceStorage();
  let count = 0;
  dataRows.forEach(row => {
    const c = row.c || [];
    const firstCell = cellText(c, idx.month).toLowerCase();
    const secondCell = cellText(c, idx.bank).toLowerCase();
    if (/^(month|mesiac|mesic|period)$/.test(firstCell) || /^(bank|banka|bank id|bankid)$/.test(secondCell)) return;
    const month = parseSheetMonth(c, idx.month);
    const rawBankId = cellText(c, idx.bank);
    const relatedCustom = getCustomBanks().find(b => b.id === rawBankId) || {};
    const bankId = canonicalBankIdFromSheetRow(rawBankId, relatedCustom.name, relatedCustom.account);
    if (!bankId || !month) return;
    const hasCardLimit = hasCell(c, idx.cardLimit);
    const hasCreditCardLimit = hasCell(c, idx.creditCardLimit);
    const hasBudget = hasCell(c, idx.budget);
    const hasWarning = hasCell(c, idx.warning);
    const hasBalance = idx.balance >= 0 && hasNumericCell(c, idx.balance);
    const hasIncomingAlert = hasCell(c, idx.incomingAlert);
    const hasOutgoingAlert = hasCell(c, idx.outgoingAlert);
    const hasSpending = hasCell(c, idx.monthlySpending);
    const hasIncome = hasCell(c, idx.monthlyIncome);
    const hasNet = hasCell(c, idx.monthlyNet);
    const hasOverviewDetailValue = hasCardLimit || hasCreditCardLimit || hasBudget || hasWarning || hasBalance || hasIncomingAlert || hasOutgoingAlert || hasSpending || hasIncome || hasNet;
    if (!hasOverviewDetailValue) return;

    const cardLimit = hasCardLimit ? cellNumber(c, idx.cardLimit) : null;
    const creditCardLimit = hasCreditCardLimit ? cellNumber(c, idx.creditCardLimit) : null;
    const budget = hasBudget ? cellNumber(c, idx.budget) : null;
    const warning = hasWarning ? cellNumber(c, idx.warning) : null;
    const balance = hasBalance ? cellNumber(c, idx.balance) : null;
    const incomingAlert = hasIncomingAlert ? cellNumber(c, idx.incomingAlert) : null;
    const outgoingAlert = hasOutgoingAlert ? cellNumber(c, idx.outgoingAlert) : null;
    const monthlySpending = hasSpending ? cellNumber(c, idx.monthlySpending) : null;
    const monthlyIncome = hasIncome ? cellNumber(c, idx.monthlyIncome) : null;
    const monthlyNet = hasNet
      ? cellNumber(c, idx.monthlyNet)
      : Math.round(((monthlyIncome || 0) - (monthlySpending || 0)) * 100) / 100;

    if (hasCardLimit) setMonthlyCardLimitForBank(bankId, cardLimit, month);
    if (hasCreditCardLimit) setCreditCardLimitForBank(bankId, creditCardLimit, month);
    if (hasSpending) {
      setOverviewMonthlyStat(bankId, month, 'spending', monthlySpending);
      localStorage.setItem(getArchiveMonthlyStatKey(bankId, month, 'spending'), String(monthlySpending));
    }
    if (hasIncome) {
      setOverviewMonthlyStat(bankId, month, 'income', monthlyIncome);
      localStorage.setItem(getArchiveMonthlyStatKey(bankId, month, 'income'), String(monthlyIncome));
    }
    if (hasSpending || hasIncome || hasNet) {
      setOverviewMonthlyStat(bankId, month, 'net', monthlyNet);
      localStorage.setItem(getArchiveMonthlyStatKey(bankId, month, 'net'), String(monthlyNet));
    }
    if (hasBudget) localStorage.setItem(getBudgetStorageKey(bankId, 'limit', month), String(budget));
    if (hasWarning) localStorage.setItem(getBudgetStorageKey(bankId, 'warn', month), String(warning));
    if (hasBalance && Number.isFinite(balance)) {
      localStorage.setItem(getSheetAccountBalanceValueKey(bankId, month), String(balance));
      markSheetAccountBalanceAuthority(bankId, month);
      if (isCreditLiabilityBankKey(bankId)) {
        if (getAccountBalanceBase(bankId, month) === null) {
          syncAccountBalanceBaseFromAbsoluteValue(bankId, month, balance);
        } else {
          recomputeAccountBalanceForBank(bankId, month);
        }
      } else {
        syncAccountBalanceBaseFromAbsoluteValue(bankId, month, balance);
      }
    }
    if (hasIncomingAlert || hasOutgoingAlert) {
      const currentAlerts = getTransactionAlertSettingsForBank(bankId, month);
      setTransactionAlertSettingsForBank(
        bankId,
        hasIncomingAlert ? incomingAlert : currentAlerts.incoming,
        hasOutgoingAlert ? outgoingAlert : currentAlerts.outgoing,
        month
      );
    }

    const limits = getLimitsForMonth(month);
    const info = getBankInfo(bankId);
    if (hasCardLimit && BANK_ORDER.includes(bankId) && info?.limitKey) {
      limits[info.limitKey] = cardLimit;
      saveLimitsForMonth(month, limits);
    }

    const banks = getCustomBanks();
    const custom = banks.find(b => b.id === bankId);
    if (custom) {
      if (hasCardLimit) custom.cardLimit = cardLimit;
      if (hasCreditCardLimit) custom.creditCardLimit = creditCardLimit;
      if (hasBudget) custom.budget = budget;
      if (hasWarning) custom.warning = warning;
      if (hasBalance) custom.balance = balance;
      if (hasIncomingAlert) custom.incomingAlert = incomingAlert;
      if (hasOutgoingAlert) custom.outgoingAlert = outgoingAlert;
      if (hasSpending) custom.monthlySpending = monthlySpending;
      if (hasIncome) custom.monthlyIncome = monthlyIncome;
      if (hasSpending || hasIncome || hasNet) custom.monthlyNet = monthlyNet;
      custom.budgetMonth = month;
      saveCustomBanks(banks);
    }
    count++;
  });
  return count;
}


function parseBalanceLogSheetData(raw) {
  const data = parseGvizJson(raw);
  const rows = data?.table?.rows || [];
  const cols = data?.table?.cols || [];
  const headerFromCols = cols.map(col => String(col?.label || '').trim());
  const firstRowHeaders = rows[0]?.c?.map(cell => String(cell?.v ?? cell?.f ?? '').trim()) || [];
  const normalizeHeader = (value) => String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s_\-./()]+/g, ' ')
    .replace(/\s+/g, ' ');
  const hasHeaderLabels = headerFromCols.some(Boolean);
  const firstRowLooksLikeHeader = firstRowHeaders.map(normalizeHeader).some(h => /created|source|bank|month|balance|delta|currency|reason/.test(h));
  const headers = (hasHeaderLabels ? headerFromCols : firstRowHeaders).map(normalizeHeader);
  const dataRows = firstRowLooksLikeHeader && !hasHeaderLabels ? rows.slice(1) : rows;
  const headerIndex = (names, fallback) => {
    const list = (Array.isArray(names) ? names : [names]).map(normalizeHeader).filter(Boolean);
    const exact = headers.findIndex(h => list.includes(h));
    if (exact >= 0) return exact;
    const contains = headers.findIndex(h => list.some(name => h.includes(name) || name.includes(h)));
    return contains >= 0 ? contains : (headers.length ? -1 : fallback);
  };
  const idx = {
    created: headerIndex(['Created', 'Timestamp', 'Date', 'Datum'], 0),
    bank: headerIndex(['Bank ID', 'BankID', 'Bank', 'Banka'], 2),
    month: headerIndex(['Month', 'Mesiac', 'Mesic', 'Period'], 3),
    newBalance: headerIndex(['New balance', 'Balance', 'Account balance', 'Novy balance', 'Novy zostatok', 'Novy zustatek'], 6),
    currency: headerIndex(['Currency', 'Mena'], 7)
  };
  const cellRaw = (cells, i) => i >= 0 ? (cells[i]?.v ?? cells[i]?.f ?? '') : '';
  const cellText = (cells, i) => String(cellRaw(cells, i) ?? '').trim();
  const parseCreated = (cells, i) => {
    const raw = cellRaw(cells, i);
    const date = parseGSheetDate(raw);
    if (date) return date.getTime();
    const t = Date.parse(String(raw || ''));
    return Number.isFinite(t) ? t : 0;
  };
  const parseLogMonth = (cells, i, createdTime) => {
    const raw = cellRaw(cells, i);
    if (String(raw || '').trim()) {
      const date = parseGSheetDate(raw);
      if (date) return getMonthFromDate(date);
      const text = String(raw || '').trim();
      const iso = text.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?/);
      if (iso) return `${String(Number(iso[2])).padStart(2, '0')}/${iso[1]}`;
      // Strict MM/YYYY only; ambiguous values must not snap to the current month.
      const mmYyyy = text.match(/^(\d{1,2})\/(\d{4})$/);
      if (mmYyyy) return `${String(parseInt(mmYyyy[1], 10)).padStart(2, '0')}/${mmYyyy[2]}`;
    }
    if (createdTime) return getMonthFromDate(new Date(createdTime));
    return '';
  };

  const latest = new Map();
  dataRows.forEach(row => {
    const c = row.c || [];
    const rawBankId = cellText(c, idx.bank);
    if (!rawBankId || /^(bank|banka|bank id|bankid)$/i.test(rawBankId)) return;
    const bankId = canonicalBankIdFromSheetRow(rawBankId, '', '');
    if (!bankId) return;
    const created = parseCreated(c, idx.created);
    const month = parseLogMonth(c, idx.month, created);
    if (!month) return;
    const newBalance = parseSheetNumber(cellRaw(c, idx.newBalance), cellText(c, idx.newBalance));
    if (!Number.isFinite(newBalance)) return;
    const key = bankId + '|' + month;
    const prev = latest.get(key);
    if (!prev || created >= prev.created) latest.set(key, { bankId, month, created, newBalance, currency: cellText(c, idx.currency) });
  });

  let applied = 0;
  let skippedByArchive = 0;
  latest.forEach(item => {
    if (hasSheetAccountBalanceAuthority(item.bankId, item.month)) {
      skippedByArchive++;
      return;
    }
    if (isCreditLiabilityBankKey(item.bankId)) {
      localStorage.setItem(getSheetAccountBalanceValueKey(item.bankId, item.month), String(item.newBalance));
      markSheetAccountBalanceAuthority(item.bankId, item.month);
      if (getAccountBalanceBase(item.bankId, item.month) === null) {
        syncAccountBalanceBaseFromAbsoluteValue(item.bankId, item.month, item.newBalance);
      } else {
        recomputeAccountBalanceForBank(item.bankId, item.month);
      }
    } else {
      syncAccountBalanceBaseFromAbsoluteValue(item.bankId, item.month, item.newBalance);
    }
    if (item.currency) localStorage.setItem('bank_currency_' + item.bankId, normalizeCurrencyForStorage(item.currency));
    applied++;
  });
  if (skippedByArchive > 0) console.log(`Balance_Log skipped ${skippedByArchive} balances because Bank_Archive has explicit Account balance.`);
  return applied;
}

async function syncBalanceLogFromSheets(spreadsheetId) {
  try {
    if (!spreadsheetId) return false;
    const gvizUrl = buildGvizUrl(spreadsheetId, 'Balance_Log');
    const res = await fetchNoStore(gvizUrl);
    if (!res.ok) throw new Error('Balance_Log fetch failed');
    const raw = await res.text();
    const count = parseBalanceLogSheetData(raw);
    if (count > 0) console.log(`Balance_Log sync loaded ${count} latest balances.`);
    return count > 0;
  } catch (e) {
    console.warn('Balance_Log sync skipped:', e);
    return false;
  }
}

async function syncBankSettingsFromSheets(spreadsheetId) {
  if (!spreadsheetId) return false;
  const sheetNames = [
    'Bank_Archive',
    'Overview details',
    'Overview Details',
    'overview details',
    'Overview_Details',
    'overview_details',
    'Bank_Overview'
  ];
  let lastError = null;
  for (const sheetName of sheetNames) {
    try {
      const gvizUrl = buildGvizUrl(spreadsheetId, sheetName);
      const res = await fetchNoStore(gvizUrl);
      if (!res.ok) throw new Error(`${sheetName} fetch failed`);
      const raw = await res.text();
      const count = parseBankSettingsSheetData(raw);
      if (count > 0) {
        console.log(`${sheetName} sync loaded ${count} overview detail rows.`);
        return true;
      }
      console.warn(`${sheetName} sync returned no overview detail rows.`);
    } catch (e) {
      lastError = e;
    }
  }
  console.warn('Overview details sync skipped:', lastError);
  return false;
}


function isValidAppsScriptExecUrl(url) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^\s]+\/exec(?:\?.*)?$/i.test(String(url || '').trim());
}

function showInvalidWebAppUrlWarning() {
  alert('Používaš Google Apps Script editor URL, nie Web App URL. Potrebuješ Deploy → New deployment → Web app → skopírovať /exec URL. Editor URL typu script.google.com/home/projects/.../edit nebude zapisovať do Sheets.');
}

async function syncDetectedBanksToSheets() {
  LIMITS_WEBAPP_URL = localStorage.getItem('limits_webapp_url') || LIMITS_WEBAPP_URL || '';
  if (!LIMITS_WEBAPP_URL || !isValidAppsScriptExecUrl(LIMITS_WEBAPP_URL)) {
    showInvalidWebAppUrlWarning();
    return false;
  }
  const ok = await postToBankTrackerEndpoint('syncDetectedBanks', { month: getAktuálneMonth() });
  alert(ok
    ? 'Sync detected banks dokončený. Aktualizovaný bol iba tab Bank_Settings; Bank_Archive sa nemenil.'
    : 'Sync sa nepodarilo odoslať. Skontroluj Web App URL a deployment access.');
  return ok;
}


function getCurrentWebAppUrl() {
  const inputUrl = document.getElementById('limits-webapp-url')?.value?.trim() || '';
  const storedUrl = localStorage.getItem('limits_webapp_url') || '';
  LIMITS_WEBAPP_URL = (inputUrl || storedUrl || LIMITS_WEBAPP_URL || '').trim();
  if (LIMITS_WEBAPP_URL) localStorage.setItem('limits_webapp_url', LIMITS_WEBAPP_URL);
  return LIMITS_WEBAPP_URL;
}