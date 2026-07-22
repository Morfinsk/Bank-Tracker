// Generated app-core slice 28/34 (declarations).

function applyLanguage() {
  const lang = getLanguage();
  const dict = I18N[lang] || I18N.en;

  document.documentElement.lang = lang;

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (dict[key]) el.innerHTML = dict[key];
  });

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key]) el.setAttribute('title', dict[key]);
  });

  const select = document.getElementById('language-select');
  if (select) select.value = lang;
  updateAppCurrencySelect();
  if (typeof updateGoogleSheetsToggleUi === 'function') updateGoogleSheetsToggleUi();

  if (typeof applyAppTheme === 'function') applyAppTheme(getAppTheme());

  if (typeof initCurrencyDropdowns === 'function') initCurrencyDropdowns();
}





function isGoogleSheetsEnabled() {
  return localStorage.getItem('google_sheets_enabled') !== 'false';
}

function toggleGoogleSheetsMode() {
  const next = !isGoogleSheetsEnabled();
  localStorage.setItem('google_sheets_enabled', next ? 'true' : 'false');
  updateGoogleSheetsToggleUi();

  if (next) {
    syncData();
  } else {
    loadCachedOrDemoData();
    try {
      if (isLocalOfflineDemoMode() && (shouldAutoSeedLocalWidgetDemo() || !allTransactions.length)) {
        seedBankTrackerLocalTestData(true);
      } else if (isLocalOfflineDemoMode()) {
        applyLocalWidgetDemoAlertLimits(getAktuálneMonth());
      }
    } catch (_) {}
    renderAll();
    applyLanguage();
  }
}

function updateGoogleSheetsToggleUi() {
  const enabled = isGoogleSheetsEnabled();
  const toggle = document.getElementById('sheets-toggle');
  const sub = document.getElementById('sheets-toggle-sub');
  const dict = (typeof I18N !== 'undefined' && I18N[getLanguage ? getLanguage() : 'en']) || {};

  if (toggle) toggle.classList.toggle('on', enabled);
  if (sub) {
    sub.setAttribute('data-i18n', enabled ? 'googleSheetsToggleSubOn' : 'googleSheetsToggleSubOff');
    sub.textContent = enabled
      ? (dict.googleSheetsToggleSubOn || 'Enabled — app loads real transactions from Sheets.')
      : (dict.googleSheetsToggleSubOff || 'Disabled — app uses local cache only.');
  }

  const input = document.getElementById('sheets-url');
  if (input) input.disabled = !enabled;
}

function ensureDefaultConfig() {
  try {
    SHEETS_URL = localStorage.getItem('sheets_url') || DEFAULT_SHEETS_URL || '';
    LIMITS_WEBAPP_URL = localStorage.getItem('limits_webapp_url') || DEFAULT_LIMITS_WEBAPP_URL || '';
  } catch (err) {
    console.warn('Config storage unavailable:', err);
    SHEETS_URL = DEFAULT_SHEETS_URL || '';
    LIMITS_WEBAPP_URL = DEFAULT_LIMITS_WEBAPP_URL || '';
  }
}




function getTransactionAlertStorageKey(bankId, direction, monthStr) {
  return `bank_tx_alert_${direction}_${bankId}_${normalizeMonthStr(monthStr || getAktuálneMonth())}`;
}

function getTransactionAlertSettingsForBank(bankId, monthStr) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  return {
    incoming: parseFloat(localStorage.getItem(getTransactionAlertStorageKey(bankId, 'incoming', month)) || '0') || 0,
    outgoing: parseFloat(localStorage.getItem(getTransactionAlertStorageKey(bankId, 'outgoing', month)) || '0') || 0
  };
}

function setTransactionAlertSettingsForBank(bankId, incomingAlert, outgoingAlert, monthStr) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  localStorage.setItem(getTransactionAlertStorageKey(bankId, 'incoming', month), String(parseAmountValue(incomingAlert)));
  localStorage.setItem(getTransactionAlertStorageKey(bankId, 'outgoing', month), String(parseAmountValue(outgoingAlert)));
}

function getBankSettingsPayload(bankId, monthStr, cardLimit, budget, warning, accountBalance, incomingAlert, outgoingAlert, creditCardLimit = undefined) {
  const isCreditCardBank = String(bankId || '').trim() === 'csob_cz_credit';
  const parsedCardLimit = parseAmountValue(cardLimit);
  const parsedCreditCardLimit = parseAmountValue(creditCardLimit !== undefined ? creditCardLimit : (isCreditCardBank ? cardLimit : undefined));
  const hasCreditCardLimit = creditCardLimit !== undefined || isCreditCardBank;
  return {
    bankId,
    month: normalizeMonthStr(monthStr || getAktuálneMonth()),
    cardLimit: isCreditCardBank ? 0 : parsedCardLimit,
    creditCardLimit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    creditCardLimits: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    creditLimit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    credit_card_limit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    monthlyLimit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    monthly_limit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    creditMonthlyLimit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    credit_monthly_limit: hasCreditCardLimit ? parsedCreditCardLimit : undefined,
    budget: parseAmountValue(budget),
    warning: parseAmountValue(warning),
    accountBalance: parseAmountValue(accountBalance),
    incomingAlert: parseAmountValue(incomingAlert),
    outgoingAlert: parseAmountValue(outgoingAlert)
  };
}

async function saveBankSettingsEndpoint(bankId, monthStr, cardLimit, budget, warning, accountBalance, incomingAlert, outgoingAlert, creditCardLimit = undefined) {
  const payload = getBankSettingsPayload(bankId, monthStr, cardLimit, budget, warning, accountBalance, incomingAlert, outgoingAlert, creditCardLimit);
  return postToBankTrackerEndpoint('saveBankSettings', { ...payload, settings: payload });
}



function cleanBankAccountValue(value) {
  let text = String(value || '').trim();
  if (/^(true|false|null|undefined)$/i.test(text)) return '';
  text = text.replace(/^(karta|card)\s*/i, '').trim();
  text = text.replace(/^(účty|ucty|účet|ucet|accounts?|iban)\s*/i, '').trim();
  const accounts = [];
  const slashRe = /(\d{1,12})\s*\/\s*(\d{4})/g;
  let match;
  while ((match = slashRe.exec(text)) !== null) accounts.push(`${String(match[1])}/${match[2]}`);
  if (accounts.length) return normalizeIdentifierList(accounts.join(','));
  const compactText = text.replace(/\s+/g, '').toUpperCase();
  const ibanLike = compactText.match(/[A-Z]{2}\d{2}[A-Z0-9]{8,}/g) || [];
  if (ibanLike.length) return normalizeIdentifierList(ibanLike.join(','));
  const countryShortcut = text.match(/\b(SK|DE)\s*(\d{4})\b/i);
  if (countryShortcut) return `${countryShortcut[1].toUpperCase()} ${countryShortcut[2]}`;
  const digitGroups = text.match(/\d{4,}/g) || [];
  if (digitGroups.length) return normalizeIdentifierList(digitGroups.map(v => String(v).slice(-4)).join(','));
  return normalizeIdentifierList(text);
}

function formatBankAccountForInput(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const slash = text.match(/(\d{1,12})\s*\/\s*(\d{4})/);
  if (slash) return `${slash[1]}/${slash[2]}`;
  const compact = text.replace(/\s+/g, '').toUpperCase();
  if (/^[A-Z]{2}\d{4}$/.test(compact)) return compact.slice(0, 2) + ' ' + compact.slice(2);
  if (/^[A-Z]{2}\d{2}[A-Z0-9]{8,34}$/.test(compact)) {
    return compact.replace(/(.{4})/g, '$1 ').trim();
  }
  return text;
}

function cleanBankCardsValue(value) {
  let text = String(value || '').replace(/^(karta|card|cards?)\s*/i, '').trim();
  if (/^(true|false|null|undefined)$/i.test(text)) return '';
  text = text.replace(/\d{1,12}\s*\/\s*\d{4}/g, ' ');
  text = text.replace(/[A-Z]{2}\d{2}[A-Z0-9]{8,}/ig, ' ');
  const matches = text.match(/(?:\*{2,}|x{2,})\s*(\d{4})|\b(\d{4})\b/ig) || [];
  return [...new Set(matches.map(v => String(v).replace(/\D/g, '').slice(-4)).filter(Boolean))].join(',');
}

function removeAccountPartsFromCards(cards, account) {
  const accountParts = new Set();
  String(account || '').split(',').forEach(acc => {
    const text = String(acc || '').trim();
    const slash = text.match(/(\d{4})\s*\/\s*(\d{4})/);
    if (slash) { accountParts.add(slash[1]); accountParts.add(slash[2]); }
    const country = text.match(/^[A-Z]{2}\s*(\d{4})$/i);
    if (country) accountParts.add(country[1]);
  });
  return normalizeIdentifierList(String(cards || '').split(',').map(v => String(v || '').replace(/\D/g, '').slice(-4)).filter(v => v && !accountParts.has(v)).join(','));
}

function getBankStoredCardsStorageKey(bankKey) {
  return 'bank_stored_cards_' + String(bankKey || '').trim();
}

function emptyBankStoredCardSlot() {
  return { number: '', expiry: '', cvc: '' };
}

function normalizeBankStoredCardExpiry(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + '/' + digits.slice(2);
}

function formatBankStoredCardNumberForInput(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function formatBankStoredCardExpiryForInput(value) {
  return normalizeBankStoredCardExpiry(value);
}

function normalizeBankStoredCards(cards) {
  const list = Array.isArray(cards) ? cards : [];
  return Array.from({ length: BANK_STORED_CARD_SLOTS }, (_, index) => {
    const item = list[index] || {};
    return {
      number: String(item.number || '').replace(/\D/g, '').slice(0, 19),
      expiry: normalizeBankStoredCardExpiry(item.expiry),
      cvc: String(item.cvc || '').replace(/\D/g, '').slice(0, 4)
    };
  });
}

function getBankStoredCards(bankKey) {
  try {
    const raw = localStorage.getItem(getBankStoredCardsStorageKey(bankKey));
    if (raw) return normalizeBankStoredCards(JSON.parse(raw));
  } catch (_) {}
  const custom = getCustomBanks().find(b => b && b.id === bankKey);
  if (custom && Array.isArray(custom.storedCards)) return normalizeBankStoredCards(custom.storedCards);
  return normalizeBankStoredCards([]);
}

function setBankStoredCards(bankKey, cards) {
  const id = String(bankKey || '').trim();
  const normalized = normalizeBankStoredCards(cards);
  localStorage.setItem(getBankStoredCardsStorageKey(id), JSON.stringify(normalized));
  const last4s = [...new Set(normalized.map(card => String(card.number || '').slice(-4)).filter(v => v.length === 4))];
  localStorage.setItem('bank_cards_' + id, last4s.join(','));
  const banks = getCustomBanks();
  const custom = banks.find(b => b && b.id === id);
  if (custom) {
    custom.storedCards = normalized;
    custom.cards = last4s.join(',');
    saveCustomBanks(banks);
  }
  syncManagedBankCardsField(id, last4s.join(','));
  return normalized;
}

function getManagedBankStoredCardInputId(bankKey, slot, field) {
  return 'edit-card-' + field + '-' + String(slot) + '-' + String(bankKey || '').trim();
}

function readManagedBankStoredCardsFromForm(bankKey) {
  return normalizeBankStoredCards(Array.from({ length: BANK_STORED_CARD_SLOTS }, (_, index) => {
    const slot = index + 1;
    return {
      number: document.getElementById(getManagedBankStoredCardInputId(bankKey, slot, 'number'))?.value || '',
      expiry: document.getElementById(getManagedBankStoredCardInputId(bankKey, slot, 'expiry'))?.value || '',
      cvc: document.getElementById(getManagedBankStoredCardInputId(bankKey, slot, 'cvc'))?.value || ''
    };
  }));
}

function syncManagedBankCardsField(bankKey, cardsValue) {
  const id = String(bankKey || '').trim();
  if (!id) return;
  const cards = cleanBankCardsValue(cardsValue || localStorage.getItem('bank_cards_' + id) || '');
  const cardsInput = document.getElementById('edit-cards-' + id);
  if (cardsInput) cardsInput.value = cards;
}

function readBankStoredCardsFromSheetCells(cell, headers, accountValue = '') {
  const headerIndex = (name) => headers.findIndex(h => String(h || '').trim().toLowerCase() === String(name).toLowerCase());
  const stored = normalizeBankStoredCards(Array.from({ length: BANK_STORED_CARD_SLOTS }, (_, index) => {
    const slot = index + 1;
    const panIdx = headerIndex('Card ' + slot);
    const expIdx = headerIndex('Card ' + slot + ' expiry');
    const cvcIdx = headerIndex('Card ' + slot + ' cvc');
    return {
      number: panIdx >= 0 ? cell(panIdx) : '',
      expiry: expIdx >= 0 ? cell(expIdx) : '',
      cvc: cvcIdx >= 0 ? cell(cvcIdx) : ''
    };
  }));
  if (stored.some(card => card.number || card.expiry || card.cvc)) return stored;
  const cardsIdx = headerIndex('Cards');
  const legacyCards = cardsIdx >= 0 ? cleanBankCardsValue(cell(cardsIdx)) : '';
  if (!legacyCards) return stored;
  return normalizeBankStoredCards(legacyCards.split(',').slice(0, BANK_STORED_CARD_SLOTS).map(card => ({
    number: card,
    expiry: '',
    cvc: ''
  })));
}

function getEndpointBankPayload(bankId, bankData = {}) {
  const info = BANKS[bankId] || null;
  const isCustom = String(bankId || '').startsWith('custom_');
  const name = bankData.name || (isCustom ? bankData.name : getBankDisplayOverride(bankId)) || plainBankName(bankId);
  const savedCurrency = localStorage.getItem('bank_currency_' + bankId);
  let currency = bankData.currency || savedCurrency || info?.primaryCurrency || 'CZK';
  if (bankId === 'csob_sk') currency = 'EUR';
  const type = bankData.type || info?.primaryType || (isCustom ? 'account' : 'card');
  const account = cleanBankAccountValue(bankData.account || localStorage.getItem('bank_account_' + bankId) || info?.account || '');
  const cards = removeAccountPartsFromCards(cleanBankCardsValue(bankData.cards || localStorage.getItem('bank_cards_' + bankId) || info?.cards || ''), account);
  const storedCards = normalizeBankStoredCards(bankData.storedCards || getBankStoredCards(bankId));

  return {
    id: bankId,
    name: String(name || '').replace(/<[^>]+>/g, '').trim(),
    currency,
    type,
    account,
    cards,
    storedCards,
    active: bankData.active === false ? false : true
  };
}

async function syncAllBanksAndSettingsToEndpoint() {
  // Deprecated safety no-op.
  // This used to push local cached bank settings to Google Sheets and could overwrite
  // Bank_Settings with zeros after cookies/site-data reset. Do not use for refresh/config save.
  return 0;
}


function isValidCurrencyCode(code) {
  return /^[A-Z]{3}$/.test(String(code || '').trim().toUpperCase());
}

function parseBanksSheetData(raw) {
  const data = parseGvizJson(raw);
  const rows = data?.table?.rows || [];
  const cols = data?.table?.cols || [];
  const headerFromCols = cols.map(col => String(col?.label || '').trim());
  const firstRowHeaders = rows[0]?.c?.map(cell => String(cell?.v || cell?.f || '').trim()) || [];
  const looksLikeHeaderRow = firstRowHeaders.some(h => /bank id|currency|account|cards|active/i.test(h));
  const headers = (headerFromCols.some(Boolean) ? headerFromCols : firstRowHeaders).map(h => String(h || '').trim());
  const dataRows = looksLikeHeaderRow ? rows.slice(1) : rows;
  const headerIndex = (names, fallback) => {
    const list = Array.isArray(names) ? names : [names];
    for (const name of list) {
      const idx = headers.findIndex(h => h.toLowerCase() === String(name).toLowerCase());
      if (idx >= 0) return idx;
    }
    return fallback;
  };
  const idx = {
    id: headerIndex(['Bank ID','BankID'], 0),
    name: headerIndex('Name', 1),
    currency: headerIndex('Currency', 2),
    type: headerIndex('Type', 3),
    account: headerIndex(['Account','Account last 4','IBAN / Account','Account / Card last 4 digits'], 4),
    cards: headerIndex(['Cards','Card','Card last 4 digits'], 5),
    active: headerIndex('Active', headers.includes('Cards') ? 6 : 5)
  };
  const custom = [];
  const existingCustom = getCustomBanks();
  const existingById = Object.fromEntries(existingCustom.map(b => [b.id, b]));

  dataRows.forEach(row => {
    const c = row.c || [];
    const cell = (i) => String(c[i]?.v ?? c[i]?.f ?? '').trim();
    const id = cell(idx.id);
    const name = cell(idx.name);
    const rawCurrency = cell(idx.currency).toUpperCase();
    const type = cell(idx.type).toLowerCase() || 'account';
    let account = cleanBankAccountValue(cell(idx.account));
    let cards = cleanBankCardsValue(cell(idx.cards));
    const legacyAccountCards = cell(headerIndex('Account / Card last 4 digits', -1));
    if (!cards && /^\s*(karta|card)\b/i.test(legacyAccountCards)) cards = cleanBankCardsValue(legacyAccountCards);
    if (!account && !/^\s*(karta|card)\b/i.test(legacyAccountCards)) account = cleanBankAccountValue(legacyAccountCards);
    const activeRaw = String(c[idx.active]?.v ?? c[idx.active]?.f ?? 'TRUE').trim().toLowerCase();
    const active = !(activeRaw === 'false' || activeRaw === '0' || activeRaw === 'no');
    if (!id || !active) return;
    const canonicalId = canonicalBankIdFromSheetRow(id, name, [account, cards].filter(Boolean).join(' '));
    let currency = isValidCurrencyCode(rawCurrency) ? rawCurrency : '';
    if (canonicalId === 'csob_sk') currency = 'EUR';
    cards = removeAccountPartsFromCards(cards, account);

    if (['savings', 'credit', 'account', 'card'].includes(type)) {
      localStorage.setItem('bank_product_type_' + canonicalId, type === 'card' ? 'account' : type);
    }

    if (BANK_ORDER.includes(canonicalId)) {
      if (name) setBankDisplayOverride(canonicalId, name);
      if (currency) localStorage.setItem('bank_currency_' + canonicalId, currency);
      if (account) localStorage.setItem('bank_account_' + canonicalId, account);
      if (cards) localStorage.setItem('bank_cards_' + canonicalId, cards);
      const sheetStoredCards = readBankStoredCardsFromSheetCells(cell, headers, account);
      if (sheetStoredCards.some(card => card.number || card.expiry || card.cvc)) setBankStoredCards(canonicalId, sheetStoredCards);
      return;
    }

    const old = existingById[id] || existingById[canonicalId] || {};
    const storedCards = readBankStoredCardsFromSheetCells(cell, headers, account);
    custom.push({
      ...old,
      id: canonicalId,
      name: name || old.name || canonicalId,
      currency: currency || old.currency || 'CZK',
      type: type === 'credit' ? 'credit' : (type === 'savings' ? 'savings' : (type === 'card' ? 'card' : 'account')),
      account: account || old.account || '',
      cards: cards || old.cards || '',
      storedCards,
      active: true
    });
  });

  saveCustomBanks(custom);
  return custom.length;
}

async function syncBanksFromSheets(spreadsheetId) {
  try {
    if (!spreadsheetId) return false;
    saveCustomBanks([]);
    const gvizUrl = buildGvizUrl(spreadsheetId, 'Bank_Settings');
    const res = await fetchNoStore(gvizUrl);
    if (!res.ok) throw new Error('Bank_Settings fetch failed');
    const raw = await res.text();
    parseBanksSheetData(raw);
    return true;
  } catch (e) {
    console.warn('Bank_Settings sync skipped:', e);
    return false;
  }
}