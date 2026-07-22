// Generated app-core slice 1/34 (declarations).



function getAppCurrency() {
  return normalizeCurrencyForStorage(localStorage.getItem('app_currency') || 'Kč');
}

function setAppCurrency(currency) {
  const curr = normalizeCurrencyForStorage(currency || 'Kč');
  localStorage.setItem('app_currency', curr);
  const select = document.getElementById('app-currency-select');
  if (select) select.value = curr;
  renderAll();
  applyLanguage();
}

function updateAppCurrencySelect() {
  const select = document.getElementById('app-currency-select');
  if (!select) return;
  fillCurrencySelect(select, getAppCurrency());
  select.value = getAppCurrency();
}

function isGoogleSheetsConnected() {
  return !!String(SHEETS_URL || '').trim();
}

function isLocalEditMode() {
  // Lokálne pridávanie/mazanie je povolené iba v offline/test režime,
  // aby sa lokálne zmeny nemiešali s dátami načítanými z Google Sheets.
  return !isGoogleSheetsConnected();
}

function guardLocalEdit(actionText) {
  if (isLocalEditMode()) return true;
  alert(`${actionText} je vypnuté, pretože appka je pripojená na Google Sheets. Vymaž Google Sheets URL v nastaveniach a ulož zmeny pre offline/test režim.`);
  return false;
}

function updateEditModeUI() {
  const localMode = isLocalEditMode();
  const notice = document.getElementById('edit-mode-notice');
  if (notice) {
    notice.className = `edit-mode-notice ${localMode ? 'offline' : 'online'}`;
    notice.innerHTML = localMode
      ? 'OFFLINE / TEST REŽIM: pridávanie aj mazanie simulovaných platieb je povolené.'
      : 'GOOGLE SHEETS REŽIM: lokálne pridávanie a mazanie platieb je vypnuté, aby sa dáta nemiešali so Sheets.';
  }

  ['sim-date-rb','sim-merchant-rb','sim-amt-rb','sim-currency-rb','sim-date-csob','sim-merchant-csob','sim-amt-csob','sim-currency-csob','sim-date-csob-cz','sim-merchant-csob-cz','sim-amt-csob-cz','sim-currency-csob-cz','sim-date-moneta','sim-merchant-moneta','sim-amt-moneta','sim-currency-moneta'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !localMode;
  });
  document.querySelectorAll('[data-local-edit-only="true"]').forEach(btn => {
    btn.disabled = !localMode;
    btn.title = localMode ? (btn.dataset.defaultTitle || '') : 'Dostupné iba v offline/test režime';
  });
}

function catIcon(cat) { return CAT_ICONS[cat] || '💳'; }

function getCardColor(used, limit) {
  if (limit <= 0) return 'var(--ok)';
  if (used >= limit) return 'var(--ok)'; 
  const pct = used / limit;
  return pct < 0.4 ? 'var(--danger)' : 'var(--warn)'; 
}

function getAktuálneMonth() {
  const now = new Date();
  now.setMonth(now.getMonth() + activeOverviewMonthOffset);
  return `${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
}

function formatOverviewTopAmount(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const formatOneDecimal = (v) => {
    const rounded = Math.round(v * 10) / 10;
    const hasDecimal = Math.abs(rounded % 1) > 0.001;
    return rounded.toLocaleString('en-US', {
      minimumFractionDigits: hasDecimal ? 1 : 0,
      maximumFractionDigits: 1
    });
  };
  if (abs >= 1e9) return sign + formatOneDecimal(abs / 1e9) + 'B';
  if (abs >= 1e6) return sign + formatOneDecimal(abs / 1e6) + 'M';
  if (abs >= 1e3) return sign + formatOneDecimal(abs / 1e3) + 'K';
  return sign + Math.round(abs).toLocaleString('cs');
}

function formatOverviewTopAmountFull(value) {
  const n = Math.round(Number(value || 0));
  if (!Number.isFinite(n)) return '0 CZK';
  return n.toLocaleString('cs-CZ') + ' CZK';
}

function getOverviewMonthElapsedRatio() {
  const offset = Number(activeOverviewMonthOffset || 0);
  if (offset < 0) return 1;
  if (offset > 0) return 0;
  const now = new Date();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (!totalDays) return 0;
  return Math.min(1, Math.max(0, now.getDate() / totalDays));
}

function updateOverviewSummaryStrip(totalMonthSpent, monthAllTxnsCount) {
  const sumTxns = document.getElementById('sum-txns');
  if (sumTxns) sumTxns.textContent = monthAllTxnsCount;
  const sumAmount = document.getElementById('sum-amount');
  if (sumAmount) sumAmount.textContent = formatOverviewTopAmount(totalMonthSpent);
  const sumAmountFull = document.getElementById('sum-amount-full');
  if (sumAmountFull) sumAmountFull.textContent = formatOverviewTopAmountFull(totalMonthSpent);
  const sumDays = document.getElementById('sum-days');
  if (sumDays) sumDays.textContent = getDaysRemaining();
  const progressFill = document.getElementById('sum-days-progress-fill');
  if (progressFill) {
    progressFill.style.width = Math.round(getOverviewMonthElapsedRatio() * 100) + '%';
  }
}

function hasTransactionsForMonth(monthStr) {
  return allTransactions.some(t => normalizeMonthStr(t.month) === normalizeMonthStr(monthStr));
}

function shiftOverviewMonth(delta) {
  if (overviewMonthShiftInFlight) return;
  const requested = activeOverviewMonthOffset + Number(delta || 0);
  let nextOffset = requested;
  if (requested > 0) {
    nextOffset = 0;
  } else if (Number(delta || 0) < 0) {
    const targetMonth = addMonthsToMonthStr(getAktuálneMonth(), Number(delta || 0));
    if (!hasTransactionsForMonth(targetMonth)) return;
  }

  overviewMonthShiftInFlight = true;
  activeOverviewMonthOffset = nextOffset;
  const finishShift = () => { overviewMonthShiftInFlight = false; };
  if (activePageId === 'overview') {
    requestAnimationFrame(() => {
      try { renderOverviewAfterMonthShift(); }
      finally { finishShift(); }
    });
  } else {
    try { renderOverviewAfterMonthShift(); }
    finally { finishShift(); }
  }
}

function updateOverviewMonthNavState() {
  const currentMonth = getAktuálneMonth();
  const prevBtn = document.getElementById('overview-month-prev');
  const nextBtn = document.getElementById('overview-month-next');
  const prevMonth = addMonthsToMonthStr(currentMonth, -1);
  if (prevBtn) prevBtn.disabled = !hasTransactionsForMonth(prevMonth);
  if (nextBtn) nextBtn.disabled = activeOverviewMonthOffset >= 0;
}

function getSelectedPlan() {
  return localStorage.getItem('selected_plan') || 'free';
}

function updateUpgradePlanStatus() {
  const plan = getSelectedPlan();
  const pill = document.getElementById('upgrade-current-pill');
  const text = document.getElementById('upgrade-plan-status-text');
  const freeBadge = document.getElementById('upgrade-free-badge');
  const premiumBadge = document.getElementById('upgrade-premium-badge');
  const proBadge = document.getElementById('upgrade-pro-badge');
  if (freeBadge) freeBadge.style.display = plan === 'free' ? 'inline-flex' : 'none';
  if (premiumBadge) premiumBadge.style.display = plan === 'premium' ? 'inline-flex' : 'none';
  if (proBadge) proBadge.style.display = plan === 'pro' ? 'inline-flex' : 'none';
  if (pill) pill.textContent = plan === 'premium' ? 'Premium' : plan === 'pro' ? 'Pro' : 'Free';
  if (text) {
    if (plan === 'premium') text.textContent = t('upgradePageSubPremium');
    else if (plan === 'pro') text.textContent = t('upgradePageSubPro');
    else text.textContent = t('upgradePageSub');
  }
}

function getMonthLabel() {
  return getAktuálneMonth();
}

function formatMonthString(monthYearStr) {
  return normalizeMonthStr(monthYearStr);
}

function bankLogoImg(bankKey, className = 'bank-logo-mini') {
  const logo = BANK_LOGOS[bankKey];
  if (!logo) return '';
  if (!logo.src) {
    const label = String(logo.text || logo.alt || bankKey || '').trim();
    return `<span class="${className} bank-logo-text" aria-label="${escapeAttr(logo.alt || label)}">${escapeHtml(label.slice(0, 1))}</span>`;
  }
  return `<img class="${className}" src="${logo.src}" alt="${logo.alt}" loading="lazy">`;
}

function bankLabelWithLogo(bankKey) {
  const bank = getBankInfo(bankKey);
  return `<span class="bank-name-with-logo">${bankLogoImg(bankKey)}<span>${bank.label}</span></span>`;
}

function bankShortWithLogo(bankKey) {
  const bank = getBankInfo(bankKey);
  return `<span class="bank-name-with-logo">${bankLogoImg(bankKey)}<span>${bank.label}</span></span>`;
}


function getStoredSystemBankAccount(bankKey) {
  const custom = getCustomBanks().find(b => b && b.id === bankKey);
  return cleanBankAccountValue(custom?.account || localStorage.getItem('bank_account_' + bankKey) || '');
}

function getStoredSystemBankCards(bankKey, options = {}) {
  const includeCreditChild = options.includeCreditChild !== false;
  const values = [];
  const addCards = (raw) => {
    cleanBankCardsValue(raw).split(',').map(v => v.trim()).filter(Boolean).forEach(v => {
      const last4 = String(v || '').replace(/\D/g, '').slice(-4);
      if (last4 && !values.includes(last4)) values.push(last4);
    });
  };
  const custom = getCustomBanks().find(b => b && b.id === bankKey);
  addCards(custom?.cards || localStorage.getItem('bank_cards_' + bankKey) || getBankInfo(bankKey)?.cards || '');
  if (bankKey === 'csob_cz' && includeCreditChild) {
    const credit = getCustomBanks().find(b => b && b.id === 'csob_cz_credit');
    addCards(credit?.cards || localStorage.getItem('bank_cards_csob_cz_credit') || '');
  }
  return values;
}

function getStoredBankIdentifierText(bankKey) {
  return [
    getStoredSystemBankAccount(bankKey),
    getStoredSystemBankCards(bankKey).join(' '),
    localStorage.getItem('bank_cards_' + bankKey) || '',
    localStorage.getItem('bank_account_' + bankKey) || ''
  ].join(' ').toLowerCase();
}

function textContainsAnyIdentifier(text, identifiers) {
  const hay = String(text || '').toLowerCase();
  return (identifiers || []).some(v => {
    const needle = String(v || '').trim().toLowerCase();
    return needle && hay.includes(needle);
  });
}

function getTrackedBankAccountIdentifiers() {
  const ids = [];
  const add = (raw) => {
    const account = cleanBankAccountValue(raw || '');
    if (!account) return;
    const lower = account.toLowerCase();
    if (!ids.includes(lower)) ids.push(lower);
    const digits = lower.replace(/\D/g, '');
    if (digits.length >= 6 && !ids.includes(digits)) ids.push(digits);
  };

  (BANK_ORDER || []).forEach(bankKey => {
    if (bankKey === 'csob_cz_credit') return;
    add(getStoredSystemBankAccount(bankKey));
  });
  (getCustomBanks() || []).forEach(bank => {
    if (!bank || bank.active === false) return;
    add(bank.account || '');
  });
  return ids;
}

function getCsobCzCreditCardLast4() {
  const fromCreditRow = getStoredSystemBankCards('csob_cz_credit', { includeCreditChild: false })[0] || '';
  if (fromCreditRow) return fromCreditRow;
  const custom = getCustomBanks().find(b => b && b.id === 'csob_cz_credit');
  const explicit = cleanBankCardsValue(custom?.cardLast4 || localStorage.getItem('bank_card_last4_csob_cz_credit') || '').split(',')[0] || '';
  return explicit;
}

function getVisibleCardsForBank(bankKey) {
  return getStoredSystemBankCards(bankKey, { includeCreditChild: true });
}

function plainBankName(bankKey) {
  const names = {
    rb_cz: 'RB CZ',
    csob_sk: 'ČSOB SK',
    csob_cz: 'ČSOB CZ',
    csob_cz_credit: 'CSOB CZ credit card',
    moneta: 'Moneta',
    air_bank_cz: 'Air Bank',
    pluxee: 'Pluxee'
  };
  return names[bankKey] || 'Banka';
}


function getLimitsForMonth(monthStr) {
  const saved = limitsHistory[monthStr] || {};
  return {
    rbCz: saved.rbCz ?? saved.rb ?? RB_LIMIT,
    csobSk: saved.csobSk ?? saved.csob ?? CSOB_LIMIT,
    csobCz: saved.csobCz ?? 5,
    moneta: saved.moneta ?? 0,
    airBankCz: saved.airBankCz ?? 0,
    pluxee: saved.pluxee ?? 0
  };
}

function getMonthlyCardLimitStorageKey(bankKey, monthStr = getAktuálneMonth()) {
  return 'bank_card_limit_' + String(bankKey || '').trim() + '_' + normalizeMonthStr(monthStr || getAktuálneMonth());
}

function setMonthlyCardLimitForBank(bankKey, limit, monthStr = getAktuálneMonth()) {
  const id = String(bankKey || '').trim();
  if (!id) return false;
  const numeric = Number(limit || 0) || 0;
  localStorage.setItem(getMonthlyCardLimitStorageKey(id, monthStr), String(numeric));
  return true;
}

function getMonthlyCardLimitForBank(bankKey, monthStr = getAktuálneMonth()) {
  const id = String(bankKey || '').trim();
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const explicit = localStorage.getItem(getMonthlyCardLimitStorageKey(id, month));
  if (explicit !== null) return Number(explicit || 0) || 0;

  const bank = getBankInfo(id);
  const limits = getLimitsForMonth(month);
  if (bank && bank.limitKey) return Number(limits[bank.limitKey] ?? bank.defaultLimit ?? 0) || 0;

  const custom = getCustomBanks().find(b => b && b.id === id);
  return Number(custom?.cardLimit || custom?.limit || 0) || 0;
}

function getCreditCardLimitStorageKey(bankKey = 'csob_cz_credit', monthStr = getAktuálneMonth()) {
  return 'bank_credit_card_limit_' + String(bankKey || 'csob_cz_credit').trim() + '_' + normalizeMonthStr(monthStr || getAktuálneMonth());
}

function setCreditCardLimitForBank(bankKey, limit, monthStr = getAktuálneMonth()) {
  const id = String(bankKey || 'csob_cz_credit').trim();
  if (!id) return false;
  const numeric = Number(limit || 0) || 0;
  localStorage.setItem(getCreditCardLimitStorageKey(id, monthStr), String(numeric));
  return true;
}

function getCreditCardLimitForBank(bankKey = 'csob_cz_credit', monthStr = getAktuálneMonth()) {
  const id = String(bankKey || 'csob_cz_credit').trim();
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const testSetting = getLocalTestOverviewBankSetting(id, month);
  if (testSetting && testSetting.creditCardLimit !== undefined) return Number(testSetting.creditCardLimit || 0) || 0;
  const explicit = localStorage.getItem(getCreditCardLimitStorageKey(id, month));
  if (explicit !== null) return Number(explicit || 0) || 0;
  const legacy = localStorage.getItem('bank_credit_card_limit_' + id);
  if (legacy !== null) return Number(legacy || 0) || 0;
  const custom = getCustomBanks().find(b => b && b.id === id);
  return Number(custom?.creditCardLimit || custom?.creditLimit || 0) || 0;
}


function getMonthFromDate(dateObj) {
  return `${String(dateObj.getMonth()+1).padStart(2,'0')}/${dateObj.getFullYear()}`;
}

function ensureLimitHistoryForMonth(monthStr) {
  const existing = limitsHistory[monthStr] || {};
  limitsHistory[monthStr] = {
    rbCz: existing.rbCz ?? existing.rb ?? RB_LIMIT,
    csobSk: existing.csobSk ?? existing.csob ?? CSOB_LIMIT,
    csobCz: existing.csobCz ?? 5,
    moneta: existing.moneta ?? 0,
    airBankCz: existing.airBankCz ?? 0,
    pluxee: existing.pluxee ?? 0
  };
  return limitsHistory[monthStr];
}

function normalizeMonthStr(monthStr) {
  const value = String(monthStr || '').trim();
  const match = value.match(/^(\d{1,2})\/(\d{4})$/);
  if (!match) return getAktuálneMonth();
  return `${String(parseInt(match[1], 10)).padStart(2,'0')}/${match[2]}`;
}

function getMonthDisplayShort(monthStr) {
  return normalizeMonthStr(monthStr);
}

function monthSortValue(monthStr) {
  const [m, y] = normalizeMonthStr(monthStr).split('/').map(Number);
  return y * 12 + m;
}

function addMonthsToMonthStr(monthStr, offset) {
  const [m, y] = normalizeMonthStr(monthStr).split('/').map(Number);
  const d = new Date(y, m - 1 + offset, 1, 12, 0);
  return getMonthFromDate(d);
}

function getSimulatorLimitMonth() {
  const select = document.getElementById('sim-limit-month');
  return normalizeMonthStr(select?.value || getAktuálneMonth());
}

function populateSimulatorLimitMonthDropdown(selectedMonth) {
  const select = document.getElementById('sim-limit-month');
  if (!select) return;
  const current = getAktuálneMonth();
  const selected = normalizeMonthStr(selectedMonth || select.value || current);
  const months = new Set([current, selected]);
  allTransactions.forEach(t => { if (t.month) months.add(normalizeMonthStr(t.month)); });
  Object.keys(limitsHistory || {}).forEach(m => months.add(normalizeMonthStr(m)));
  for (let i = -18; i <= 18; i++) months.add(addMonthsToMonthStr(current, i));
  const sorted = [...months].sort((a, b) => monthSortValue(b) - monthSortValue(a));
  select.innerHTML = sorted.map(m => `<option value="${m}">${getMonthDisplayShort(m)}</option>`).join('');
  select.value = selected;
}



function fillSimulatorLimitInputs(monthStr) {
  const hist = getLimitsForMonth(monthStr);
  const map = {
    'sim-limit-rb': hist.rbCz,
    'sim-limit-csob-sk': hist.csobSk,
    'sim-limit-csob': hist.csobSk,
    'sim-limit-csob-cz': hist.csobCz,
    'sim-limit-moneta': hist.moneta
  };
  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}


function getSettingsLimitMonth() {
  const select = document.getElementById('settings-limit-month');
  return normalizeMonthStr(select?.value || getAktuálneMonth());
}

function populateSettingsLimitMonthDropdown(selectedMonth) {
  const select = document.getElementById('settings-limit-month');
  if (!select) return;
  const current = getAktuálneMonth();
  const selected = normalizeMonthStr(selectedMonth || select.value || current);
  const months = new Set([current, selected]);
  allTransactions.forEach(t => { if (t.month) months.add(normalizeMonthStr(t.month)); });
  Object.keys(limitsHistory || {}).forEach(m => months.add(normalizeMonthStr(m)));
  for (let i = -18; i <= 18; i++) months.add(addMonthsToMonthStr(current, i));
  const sorted = [...months].sort((a, b) => monthSortValue(b) - monthSortValue(a));
  select.innerHTML = sorted.map(m => `<option value="${m}">${getMonthDisplayShort(m)}</option>`).join('');
  select.value = selected;
}

function handleSettingsLimitMonthChange() {
  fillSettingsLimitInputs(getSettingsLimitMonth());
}

function fillSettingsLimitInputs(monthStr) {
  const hist = getLimitsForMonth(monthStr);
  const map = {
    'rb-limit': hist.rbCz,
    'csob-limit': hist.csobSk,
    'csob-cz-limit': hist.csobCz,
    'moneta-limit': hist.moneta
  };
  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}

function readSettingsLimitInputs() {
  return {
    rbCz: parseInt(document.getElementById('rb-limit')?.value, 10),
    csobSk: parseInt(document.getElementById('csob-limit')?.value, 10),
    csobCz: parseInt(document.getElementById('csob-cz-limit')?.value, 10),
    moneta: parseInt(document.getElementById('moneta-limit')?.value, 10)
  };
}

async function syncLimitsToGoogleSheets(monthStr, limits) {
  // Deprecated: Limity tab is no longer used.
  // Card limits are written only via saveBankSettingsEndpoint from Manage banks / Add bank.
  const status = document.getElementById('limits-sync-status');
  if (status) status.textContent = 'Limity sa už neposielajú do starého tabu. Zdroj pravdy je Bank_Settings.';
  return false;
}


function saveLimitsForMonth(monthStr, limits) {
  const existing = ensureLimitHistoryForMonth(monthStr);
  limitsHistory[monthStr] = {
    rbCz: Number.isFinite(limits.rbCz) ? limits.rbCz : existing.rbCz,
    csobSk: Number.isFinite(limits.csobSk) ? limits.csobSk : existing.csobSk,
    csobCz: Number.isFinite(limits.csobCz) ? limits.csobCz : existing.csobCz,
    moneta: Number.isFinite(limits.moneta) ? limits.moneta : existing.moneta,
    airBankCz: Number.isFinite(limits.airBankCz) ? limits.airBankCz : existing.airBankCz,
    pluxee: Number.isFinite(limits.pluxee) ? limits.pluxee : existing.pluxee
  };
  localStorage.setItem('limits_history', JSON.stringify(limitsHistory));
}

function readLimitInputs() {
  return {
    rbCz: parseInt(document.getElementById('sim-limit-rb')?.value, 10),
    csobSk: parseInt(document.getElementById('sim-limit-csob-sk')?.value ?? document.getElementById('sim-limit-csob')?.value, 10),
    csobCz: parseInt(document.getElementById('sim-limit-csob-cz')?.value, 10),
    moneta: parseInt(document.getElementById('sim-limit-moneta')?.value, 10)
  };
}