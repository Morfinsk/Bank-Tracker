// Generated app-core slice 5/6 (merged).

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
    timestamp:txDate.getTime()
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
  const adjustments = buildTransactionStatsAdjustments(allTransactions);
  return allTransactions.reduce((sum, tx) => {
    if (normalizeMonthStr(tx.month) !== normalizedMonth) return sum;
    if (getArchiveBankKeyFromTransaction(tx) !== bankKey) return sum;
    const amount = Number(adjustments.effective.get(tx) || 0);
    const converted = convertTransactionStatsAmount(tx, amount, target);
    if (field === 'spending' && amount < 0) return sum + Math.abs(converted);
    if (field === 'income' && amount > 0) return sum + Math.abs(converted);
    if (field === 'net') return sum + (amount < 0 ? -Math.abs(converted) : Math.abs(converted));
    return sum;
  }, 0);
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

  let total = 0;
  let hasStored = false;
  const stored = localStorage.getItem(getArchiveMonthlyStatKey(bankKey, normalizedMonth, field));
  if (stored !== null) {
    const n = Number(stored || 0);
    if (Number.isFinite(n)) { total += n; hasStored = true; }
  }
  if (bankKey === 'csob_cz') {
    const creditStored = localStorage.getItem(getArchiveMonthlyStatKey('csob_cz_credit', normalizedMonth, field));
    if (creditStored !== null) {
      const n = Number(creditStored || 0);
      if (Number.isFinite(n)) { total += n; hasStored = true; }
    }
  }
  if (!hasStored) {
    const overviewStored = localStorage.getItem(getOverviewMonthlyStatKey(bankKey, normalizedMonth, field));
    if (overviewStored !== null) {
      const n = Number(overviewStored || 0);
      if (Number.isFinite(n)) { total += n; hasStored = true; }
    }
    if (bankKey === 'csob_cz') {
      const overviewCreditStored = localStorage.getItem(getOverviewMonthlyStatKey('csob_cz_credit', normalizedMonth, field));
      if (overviewCreditStored !== null) {
        const n = Number(overviewCreditStored || 0);
        if (Number.isFinite(n)) { total += n; hasStored = true; }
      }
    }
  }
  if (hasStored) {
    // Bank_Settings monthly archive totals were historically stored in CZK.
    // Display them in the bank account currency, e.g. ČSOB SK in EUR.
    return target === 'CZK' ? total : convertAmountCurrency(total, 'CZK', target);
  }
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
  const currency = currencyCode(targetCurrency || getAppCurrency() || 'CZK');
  let spent = 0;
  let income = 0;
  (bankKeys || []).forEach(bankKey => {
    const sourceCurrency = getArchiveBankCurrency(bankKey);
    const bankSpent = Number(getMonthlyArchiveSpentForBank(bankKey, monthStr) || 0);
    const bankIncome = Number(getMonthlyArchiveIncomeForBank(bankKey, monthStr) || 0);
    if (bankSpent > 0) spent += Math.max(0, Number(convertAmountCurrency(bankSpent, sourceCurrency, currency) || 0));
    if (bankIncome > 0) income += Math.max(0, Number(convertAmountCurrency(bankIncome, sourceCurrency, currency) || 0));
  });
  return { spent, income, currency };
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

function getArchiveTrendMonths() {
  const months = new Set();
  (allTransactions || []).forEach(tx => {
    const m = normalizeMonthStr(tx && tx.month);
    if (m) months.add(m);
  });
  try {
    Object.keys(localStorage || {}).forEach(key => {
      const match = String(key || '').match(/^(?:bank|overview)_monthly_(?:spending|income|net)_.+_(\d{2}\/\d{4})$/);
      if (match) months.add(normalizeMonthStr(match[1]));
    });
  } catch (_) {}
  return [...months]
    .filter(Boolean)
    .sort((a, b) => monthSortValue(a) - monthSortValue(b))
    .slice(-8);
}

function getArchiveTrendValueCzk(bankKey, monthStr) {
  const value = Number(getArchiveMonthlyStat(bankKey, monthStr, 'spending', 'CZK') || 0);
  return Number.isFinite(value) ? Math.abs(value) : 0;
}

function buildArchiveTrendMonthlyData(months) {
  const monthly = {};
  months.forEach(month => { monthly[month] = {}; });

  const bankKeys = getDynamicArchiveBankKeys(monthly).filter(bankKey => bankKey !== 'csob_cz_credit');
  bankKeys.forEach(bankKey => {
    months.forEach(month => {
      const value = getArchiveTrendValueCzk(bankKey, month);
      if (value > 0) monthly[month][bankKey] = value;
    });
  });

  // Include any bank keys that exist only in loaded transactions/custom data.
  (allTransactions || []).forEach(tx => {
    const month = normalizeMonthStr(tx && tx.month);
    if (!month || !monthly[month]) return;
    const bankKey = getArchiveBankKeyFromTransaction(tx);
    if (!bankKey || bankKey === 'csob_cz_credit') return;
    if (!bankKeys.includes(bankKey)) bankKeys.push(bankKey);
  });

  bankKeys.forEach(bankKey => {
    months.forEach(month => {
      if (monthly[month][bankKey] === undefined) {
        const value = getArchiveTrendValueCzk(bankKey, month);
        if (value > 0) monthly[month][bankKey] = value;
      }
    });
  });

  return monthly;
}

function getArchiveTrendChartCacheSignature() {
  const months = getArchiveTrendMonths();
  const chartType = archiveTrendChartType === 'bars' ? 'bars' : 'line';
  const txStamp = getLocalCacheTimestamp('cached_txns_updated_at');
  return `${chartType}|${txStamp}|${months.join('|')}`;
}

function renderArchiveTrendChart() {
  const wrap = document.getElementById('archive-trend-chart');
  if (!wrap) return;

  const months = getArchiveTrendMonths();
  if (months.length === 0) {
    wrap.innerHTML = `<div class="empty-state" style="padding:22px 0;">${t('noTrendData')}</div>`;
    archiveTrendChartCache = { signature: getArchiveTrendChartCacheSignature(), html: wrap.innerHTML };
    return;
  }

  const cacheSignature = getArchiveTrendChartCacheSignature();
  if (archiveTrendChartCache.signature === cacheSignature && archiveTrendChartCache.html) {
    wrap.innerHTML = archiveTrendChartCache.html;
    const chartType = archiveTrendChartType === 'bars' ? 'bars' : 'line';
    const toggle = document.getElementById('archive-trend-toggle');
    const toggleIcon = document.getElementById('archive-trend-toggle-icon');
    const toggleTitle = chartType === 'bars' ? t('switchToLineChart', 'Switch to line chart') : t('switchToStackedBarChart', 'Switch to stacked bar chart');
    if (toggle) {
      toggle.title = toggleTitle;
      toggle.setAttribute('aria-label', toggleTitle);
    }
    if (toggleIcon) {
      toggleIcon.className = chartType === 'bars' ? 'txn-chart-toggle-icon' : 'txn-chart-toggle-icon bar';
    }
    return;
  }

  const monthly = buildArchiveTrendMonthlyData(months);
  const dynamicBankKeys = getDynamicArchiveBankKeys(monthly).filter(bankKey => bankKey !== 'csob_cz_credit');
  const activeBankKeys = dynamicBankKeys.filter(bankKey => months.some(month => (monthly[month]?.[bankKey] || 0) > 0));
  const chartBanks = activeBankKeys.length ? activeBankKeys : dynamicBankKeys;

  if (!chartBanks.length) {
    wrap.innerHTML = `<div class="empty-state" style="padding:22px 0;">${t('noTrendData')}</div>`;
    return;
  }

  const chartType = archiveTrendChartType === 'bars' ? 'bars' : 'line';
  const toggle = document.getElementById('archive-trend-toggle');
  const toggleIcon = document.getElementById('archive-trend-toggle-icon');
  const toggleTitle = chartType === 'bars' ? t('switchToLineChart', 'Switch to line chart') : t('switchToStackedBarChart', 'Switch to stacked bar chart');
  if (toggle) {
    toggle.title = toggleTitle;
    toggle.setAttribute('aria-label', toggleTitle);
  }
  if (toggleIcon) {
    toggleIcon.className = chartType === 'bars' ? 'txn-chart-toggle-icon' : 'txn-chart-toggle-icon bar';
  }

  const monthLabel = (mStr) => shortArchiveMonthLabel(mStr);
  const monthsArg = months.join('|');
  const legend = chartBanks.map(bankKey => {
    const bank = getArchiveBankInfo(bankKey);
    return `<span class="archive-bank-legend-item" onclick="openArchiveBankRangeFilter('${bankKey}','${monthsArg}','spent')" title="${escapeAttr(getArchiveBankName(bankKey))} · ${escapeAttr(t('spent'))}"><span class="archive-bank-legend-dot" style="background:${bank.color};"></span>${escapeHtml(getArchiveBankName(bankKey))}</span>`;
  }).join('');

  if (chartType === 'bars') {
    const totalsByMonth = {};
    months.forEach(month => {
      totalsByMonth[month] = chartBanks.reduce((sum, bankKey) => sum + (monthly[month]?.[bankKey] || 0), 0);
    });

    const w = Math.max(320, Math.min(520, 58 * months.length + 72));
    const h = 205;
    const padL = 36;
    const padR = 8;
    const padT = 16;
    const bottom = 44;
    const chartW = w - padL - padR;
    const axisY = h - bottom;
    const chartH = axisY - padT - 10;
    const step = chartW / Math.max(1, months.length);
    const maxValue = Math.max(1, ...months.flatMap(month => [totalsByMonth[month] || 0, ...chartBanks.map(bankKey => monthly[month]?.[bankKey] || 0)]));
    const magnitude = maxValue >= 100000 ? 10000 : 1000;
    const niceMax = Math.ceil(maxValue / magnitude) * magnitude || maxValue;

    const axisLabels = [
      { value: niceMax, y: padT + 7 },
      { value: niceMax / 2, y: padT + chartH / 2 + 3 },
      { value: 0, y: axisY - 2 }
    ].map(item => `<text class="archive-y-label" x="2" y="${item.y.toFixed(1)}">${formatCompactAmount(item.value)}</text>`).join('');

    const bars = months.map((month, idx) => {
      const slotX = padL + idx * step;
      const values = chartBanks.map(bankKey => ({ bankKey, value: monthly[month]?.[bankKey] || 0 })).filter(item => item.value > 0);
      const total = totalsByMonth[month] || 0;
      const totalH = Math.max(0, (total / niceMax) * chartH);
      const groupW = Math.min(step * 0.62, Math.max(18, values.length * 9));
      const miniGap = values.length > 1 ? 2 : 0;
      const miniW = values.length > 0 ? Math.max(5, Math.min(9, (groupW - miniGap * (values.length - 1)) / values.length)) : 8;
      const startX = slotX + (step - groupW) / 2;
      const bankBars = values.map((item, bankIdx) => {
        const bank = getArchiveBankInfo(item.bankKey);
        const barH = Math.max(2, (item.value / niceMax) * chartH);
        const x = startX + bankIdx * (miniW + miniGap);
        return `<rect class="archive-trend-bar-segment archive-trend-bar-animate" x="${x.toFixed(1)}" y="${(axisY - barH).toFixed(1)}" width="${miniW.toFixed(1)}" height="${barH.toFixed(1)}" rx="3" style="fill:${bank.color};animation-delay:${(idx * 80 + bankIdx * 35).toFixed(0)}ms" onclick="openArchiveMonthFilter('${item.bankKey}','${month}','spent')"><title>${escapeHtml(getArchiveBankName(item.bankKey))} · ${escapeHtml(formatMonthString(month))} · ${escapeHtml(formatCurrencyAmount(item.value, 'CZK'))}</title></rect>`;
      }).join('');
      return `
        ${bankBars}
        ${total > 0 ? `<text class="archive-trend-bar-total" x="${(slotX + step / 2).toFixed(1)}" y="${Math.max(10, axisY - totalH - 5).toFixed(1)}" text-anchor="middle">${formatCompactAmount(total)}</text>` : ''}
        <text class="archive-axis-label" x="${(slotX + step / 2).toFixed(1)}" y="${axisY + 24}" text-anchor="middle">${monthLabel(month)}</text>`;
    }).join('');

    wrap.innerHTML = `
      <div class="archive-bank-legend">${legend}</div>
      <div class="archive-chart-note">CZK · ${escapeHtml(t('spent'))}</div>
      <svg class="archive-trend-bars-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <line class="archive-grid-line" x1="${padL}" y1="${axisY}" x2="${w - padR}" y2="${axisY}"></line>
        <line class="archive-grid-line" x1="${padL}" y1="${padT + chartH / 2}" x2="${w - padR}" y2="${padT + chartH / 2}"></line>
        <line class="archive-grid-line" x1="${padL}" y1="${padT}" x2="${w - padR}" y2="${padT}"></line>
        ${axisLabels}
        <text class="archive-axis-unit" x="${padL}" y="${h - 6}">CZK</text>
        ${bars}
      </svg>
    `;
    archiveTrendChartCache = { signature: cacheSignature, html: wrap.innerHTML };
    return;
  }

  const w = Math.max(320, Math.min(520, 58 * months.length + 72));
  const h = 190;
  const padL = 36;
  const padR = 12;
  const padT = 16;
  const axisY = 134;
  const step = months.length === 1 ? 0 : (w - padL - padR) / (months.length - 1);

  let max = 1;
  months.forEach(month => {
    chartBanks.forEach(bankKey => {
      max = Math.max(max, monthly[month]?.[bankKey] || 0);
    });
  });

  const magnitude = max >= 100000 ? 10000 : 1000;
  const niceMax = Math.ceil(max / magnitude) * magnitude || max;
  const halfLabel = formatCompactAmount(niceMax / 2);
  const maxLabel = formatCompactAmount(niceMax);

  const getPoint = (month, bankKey, index) => {
    const value = monthly[month]?.[bankKey] || 0;
    const x = padL + index * step;
    const y = axisY - (value / niceMax) * (axisY - padT - 14);
    return { x, y, value };
  };

  const linePoints = (bankKey) => months.map((m, i) => {
    const p = getPoint(m, bankKey, i);
    return `${p.x},${p.y}`;
  }).join(' ');

  const lines = chartBanks.map(bankKey => {
    const bank = getArchiveBankInfo(bankKey);
    const points = months.map((m, i) => getPoint(m, bankKey, i));
    const visiblePoints = points.filter(p => p.value > 0);
    const title = `${getArchiveBankName(bankKey)} · ${t('spent')} · ${months[0]}–${months[months.length - 1]}`;
    return `
      <polyline class="archive-bank-line" style="stroke:${bank.color};" points="${linePoints(bankKey)}" onclick="openArchiveBankRangeFilter('${bankKey}','${monthsArg}','spent')"><title>${escapeHtml(title)}</title></polyline>
      <polyline class="archive-bank-line-hit" points="${linePoints(bankKey)}" onclick="openArchiveBankRangeFilter('${bankKey}','${monthsArg}','spent')"><title>${escapeHtml(title)}</title></polyline>
      ${visiblePoints.map(p => {
        const idx = points.indexOf(p);
        return `<circle class="archive-bank-point" cx="${p.x}" cy="${p.y}" r="3.2" style="fill:${bank.color};" onclick="openArchiveMonthFilter('${bankKey}','${months[idx]}','spent')"><title>${escapeHtml(getArchiveBankName(bankKey))} · ${escapeHtml(formatMonthString(months[idx]))} · ${escapeHtml(formatCurrencyAmount(p.value, 'CZK'))}</title></circle>`;
      }).join('')}
    `;
  }).join('');

  wrap.innerHTML = `
    <div class="archive-bank-legend">${legend}</div>
    <div class="archive-chart-note">CZK · ${escapeHtml(t('spent'))}</div>
    <svg class="archive-multiline-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      <line class="archive-grid-line" x1="${padL}" y1="${axisY}" x2="${w - padR}" y2="${axisY}"></line>
      <line class="archive-grid-line" x1="${padL}" y1="${Math.round(axisY / 2)}" x2="${w - padR}" y2="${Math.round(axisY / 2)}"></line>
      <line class="archive-grid-line" x1="${padL}" y1="${padT}" x2="${w - padR}" y2="${padT}"></line>

      <text class="archive-y-label" x="2" y="${padT + 4}">${maxLabel}</text>
      <text class="archive-y-label" x="2" y="${Math.round(axisY / 2) + 4}">${halfLabel}</text>
      <text class="archive-y-label" x="2" y="${axisY + 4}">0</text>
      <text class="archive-axis-unit" x="${padL}" y="${h - 6}">CZK</text>

      ${lines}
      ${months.map((m, i) => {
        const x = padL + i * step;
        return `<text class="archive-axis-label" x="${x - 13}" y="${axisY + 24}">${monthLabel(m)}</text>`;
      }).join('')}
    </svg>
  `;
  primeArchiveTrendLinesForIntro(wrap);
  archiveTrendChartCache = { signature: cacheSignature, html: wrap.innerHTML };
}

function renderArchiveMonthCardHtml(mStr, visibleBankKeys, monthlyCounts) {
  const rows = visibleBankKeys.map(bankKey => {
    const bank = getArchiveBankInfo(bankKey);
    const count = monthlyCounts[mStr]?.[bankKey] || 0;
    const limit = getArchiveCardLimitForMonth(bankKey, mStr);
    const logo = bankLogoImg(bankKey);
    const title = escapeAttr(getArchiveBankName(bankKey));
    const spent = renderMonthlyArchiveSpentCellHtml(bankKey, mStr);
    const income = renderMonthlyArchiveIncomeCellHtml(bankKey, mStr);
    return `<div class="archive-bank-spent-row" title="${title} · ${formatMonthString(mStr)}">
      <div class="archive-bank-limit-cell" onclick="event.stopPropagation(); openArchiveMonthFilter('${bankKey}','${mStr}','cards')" style="color:${bank.color};" title="${title} · ${t('cardsOnly')} · ${t('transactions')}"><span class="bank-inline-logo">${logo}<span>${count}/${limit}</span></span><div>${getBankStatusText(count, limit, mStr)}</div></div>
      <div class="archive-bank-spent-cell" onclick="event.stopPropagation(); openArchiveMonthFilter('${bankKey}','${mStr}','spent')" title="${title} · ${t('spent')} · ${t('outgoing')}">${spent}</div>
      <div class="archive-bank-income-cell" onclick="event.stopPropagation(); openArchiveMonthFilter('${bankKey}','${mStr}','income')" title="${title} · ${t('income')} · ${t('incoming')}">${income}</div>
    </div>`;
  }).join('');
  const totalsRow = renderArchiveMonthTotalsRowHtml(visibleBankKeys, mStr);
  const header = `<div class="archive-bank-spent-header"><div>${t('bank')}</div><div>${t('spent')}</div><div>${t('income')}</div></div>`;
  return `<div class="archive-item archive-item-spent-layout"><div class="archive-month-top">${formatMonthString(mStr)}</div><div class="archive-spent-table">${header}${rows}${totalsRow}</div></div>`;
}

function appendArchiveMonthsChunk(count) {
  const container = document.getElementById('archive-months-list');
  const page = document.getElementById('page-archive');
  if (!container) return;
  const state = archiveRenderState || {};
  const months = Array.isArray(state.months) ? state.months : [];
  const start = Number(state.rendered || 0);
  if (start >= months.length) return;
  const end = Math.min(months.length, start + Math.max(1, Number(count || 1)));
  const html = months.slice(start, end).map(mStr => {
    return renderArchiveMonthCardHtml(mStr, state.visibleBankKeys || [], state.monthlyCounts || {});
  }).join('');
  container.insertAdjacentHTML('beforeend', html);
  state.rendered = end;
  archiveRenderState = state;
  if (page && page.classList.contains('active') && state.rendered < months.length) {
    if (page.scrollHeight <= (page.clientHeight + 60)) {
      // Keep filling just enough cards so user always gets a scroll target.
      requestAnimationFrame(() => appendArchiveMonthsChunk(1));
    }
  }
}

function maybeLoadMoreArchiveMonths() {
  const page = document.getElementById('page-archive');
  const container = document.getElementById('archive-months-list');
  if (!page || !container || !page.classList.contains('active')) return;
  const state = archiveRenderState || {};
  if (!Array.isArray(state.months) || state.rendered >= state.months.length) return;
  if (archiveScrollQueued) return;
  archiveScrollQueued = true;
  requestAnimationFrame(() => {
    archiveScrollQueued = false;
    const nearPageBottom = (page.scrollTop + page.clientHeight) >= (page.scrollHeight - 220);
    if (!nearPageBottom) return;
    appendArchiveMonthsChunk(2);
  });
}

function renderArchive() {
  const container = document.getElementById('archive-months-list');
  if (!container) return;

  const txnsAll = allTransactions.filter(t => t.month);
  const storedStatMonths = Object.keys(localStorage)
    .map(k => String(k || '').match(/^bank_monthly_(?:spending|income|net)_.+_(\d{2}\/\d{4})$/))
    .filter(Boolean)
    .map(m => normalizeMonthStr(m[1]));
  const monthsInSpecs = [...new Set([...txnsAll.map(t => normalizeMonthStr(t.month)).filter(Boolean), ...storedStatMonths])]
    .sort((a,b) => monthSortValue(b) - monthSortValue(a));

  if (monthsInSpecs.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:20px 0;">${t('archiveEmpty')}</div>`;
    archiveRenderState = { months: [], rendered: 0, monthlyCounts: {}, visibleBankKeys: [] };
    return;
  }

  const monthlyCounts = {};
  monthsInSpecs.forEach(month => { monthlyCounts[month] = {}; });
  allTransactions.forEach(tx => {
    if (!tx.month || Number(tx.amount || 0) >= 0 || !isCardTransaction(tx)) return;
    if (typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)) return;
    const month = normalizeMonthStr(tx.month);
    const bankKey = getArchiveBankKeyFromTransaction(tx);
    if (!monthlyCounts[month]) monthlyCounts[month] = {};
    monthlyCounts[month][bankKey] = (monthlyCounts[month][bankKey] || 0) + 1;
  });

  const visibleBankKeys = getDynamicArchiveBankKeys(monthlyCounts)
    .filter(bankKey => bankKey !== 'csob_cz_credit');

  archiveRenderState = {
    months: monthsInSpecs,
    rendered: 0,
    monthlyCounts: monthlyCounts,
    visibleBankKeys: visibleBankKeys
  };

  // Fast first paint: latest month first, older months on-demand while scrolling.
  container.innerHTML = '';
  appendArchiveMonthsChunk(1);
}


function selectPlan(plan) {
  localStorage.setItem('selected_plan', plan);
  updateUpgradePlanStatus();
  alert(t('planSavedAlertPrefix') + ' "' + plan + '" ' + t('planSavedAlertSuffix'));
}
async function togglePushNotifications(){const isEnabled=localStorage.getItem('push_enabled')==='true';if(isEnabled){localStorage.setItem('push_enabled','false');updatePushStatus();alert('Push notifikácie sú lokálne vypnuté. V ďalšom kroku token označíme ako neaktívny v Google Sheets.');return}await enableNotifications();if(localStorage.getItem('fcm_token'))localStorage.setItem('push_enabled','true');updatePushStatus()}

function getLanguage() {
  return localStorage.getItem('app_language') || 'en';
}


function t(key, fallback) {
  const lang = getLanguage ? getLanguage() : 'en';
  const dict = (typeof I18N !== 'undefined' && I18N[lang]) || (typeof I18N !== 'undefined' && I18N.en) || {};
  return dict[key] || fallback || key;
}

function setLanguage(lang) {
  localStorage.setItem('app_language', lang);
  renderAll();
  applyLanguage();

  setBillingMode(document.getElementById('billing-yearly')?.classList.contains('active') ? 'yearly' : 'monthly');

  if (document.getElementById('bank-manager-sheet')?.classList.contains('open')) { renderBankManager(); }

  translateManualCategoryDropdown();
}

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

function flattenEndpointPayload(action, payload = {}) {
  const flat = { action };
  const add = (key, value) => {
    if (action === 'saveLoan' && /^(fixationPeriodsJson|fixationPeriodsJSON|simSettingsJson|simSettingsJSON)$/.test(key)) return;
    if (value === undefined || value === null) return;
    if (typeof value === 'object') return;
    flat[key] = String(value);
  };

  Object.keys(payload || {}).forEach(key => add(key, payload[key]));

  if (payload.bank) {
    add('bankId', payload.bank.id || payload.bank.bankId);
    add('id', payload.bank.id || payload.bank.bankId);
    add('name', payload.bank.name);
    add('currency', payload.bank.currency);
    add('type', payload.bank.type);
    add('account', payload.bank.account);
    add('cards', payload.bank.cards);
    add('active', payload.bank.active === false ? 'false' : 'true');
    add('changedField', payload.bank.changedField);
    add('changedSlot', payload.bank.changedSlot);
    add('changedCardField', payload.bank.changedCardField);
    add('replaceIdentifiers', payload.bank.replaceIdentifiers === true ? 'true' : (payload.bank.replaceIdentifiers === false ? 'false' : undefined));
    add('allowAppend', payload.bank.allowAppend === true ? 'true' : (payload.bank.allowAppend === false ? 'false' : undefined));
    if (Array.isArray(payload.bank.storedCards)) {
      payload.bank.storedCards.slice(0, 3).forEach((card, index) => {
        const slot = index + 1;
        add(`card${slot}`, card && card.number);
        add(`card${slot}Number`, card && card.number);
        add(`card${slot}Expiry`, card && card.expiry);
        add(`card${slot}Cvc`, card && card.cvc);
      });
    }
  }

  if (payload.loan) {
    add('loanId', payload.loan.id || payload.loan.loanId);
    add('id', payload.loan.id || payload.loan.loanId);
    add('name', payload.loan.name || payload.loan.loanName);
    add('loanName', payload.loan.name || payload.loan.loanName);
    add('type', payload.loan.type || payload.loan.loanType);
    add('currency', payload.loan.currency);
    add('originalAmount', payload.loan.originalAmount || payload.loan.originalValue || payload.loan.principal);
    add('originalValue', payload.loan.originalAmount || payload.loan.originalValue || payload.loan.principal);
    add('outstandingBalance', payload.loan.outstandingBalance || payload.loan.currentBalance || payload.loan.balance);
    add('currentBalance', payload.loan.currentBalance || payload.loan.outstandingBalance || payload.loan.balance);
    add('interestRate', payload.loan.interestRate || payload.loan.rate);
    add('period', payload.loan.periodValue || payload.loan.period || payload.loan.loanPeriod || payload.loan.periodMonths);
    add('periodValue', payload.loan.periodValue || payload.loan.period || payload.loan.loanPeriod);
    add('periodUnit', payload.loan.periodUnit);
    add('periodMonths', payload.loan.periodMonths);
    add('fixationUntil', payload.loan.fixationUntil || payload.loan.fixation);
    add('variableSymbol', payload.loan.variableSymbol || payload.loan.vs);
    add('vs', payload.loan.variableSymbol || payload.loan.vs);
    add('account', payload.loan.account);
    add('linkedBankId', payload.loan.linkedBankId || payload.loan.bankId);
    add('bankId', payload.loan.linkedBankId || payload.loan.bankId);
    add('amountOfRepayment', payload.loan.amountOfRepayment || payload.loan.monthlyPayment || payload.loan.repaymentAmount);
    add('repaymentAmount', payload.loan.repaymentAmount || payload.loan.amountOfRepayment || payload.loan.monthlyPayment);
    add('monthlyPayment', payload.loan.monthlyPayment || payload.loan.repaymentAmount || payload.loan.amountOfRepayment);
    add('matchText', payload.loan.matchText || payload.loan.repaymentText);
    add('repaymentText', payload.loan.repaymentText || payload.loan.matchText);
    add('status', payload.loan.status || 'active');
    add('active', payload.loan.status === 'closed' || payload.loan.active === false ? 'false' : 'true');
    const loanPeriods = Array.isArray(payload.loan.fixationPeriods) ? payload.loan.fixationPeriods : (Array.isArray(payload.fixationPeriods) ? payload.fixationPeriods : []);
    const loanTerm = loanPeriods.find(period => String(period && period.role || '') === 'loan_term') || null;
    const loanSegments = loanPeriods.filter(period => String(period && period.role || '') === 'period');
    const orderedPeriods = (loanTerm ? [loanTerm] : []).concat(loanSegments).slice(0, 10);
    orderedPeriods.forEach((period, index) => {
      const slot = index + 1;
      const rawMonths = index === 0
        ? (period && (period.fixationMonths ?? period.durationMonths))
        : (period && (period.periodUnit === 'years' ? Number(period.periodValue || 0) * 12 : period.periodValue));
      add(`period${slot}Months`, rawMonths);
      add(`period${slot}Rate`, period && (period.rate ?? period.interestRate));
      add(`period${slot}Color`, period && period.color);
    });
    const residual = loanPeriods.find(period => String(period && period.role || '') === 'residual') || null;
    add('residualRate', residual && (residual.rate ?? residual.interestRate) || payload.loan.residualRate);
    add('residualColor', residual && residual.color || payload.loan.residualColor);
    const sim = payload.loan.simSettings && typeof payload.loan.simSettings === 'object' ? payload.loan.simSettings : {};
    add('paidYears', payload.loan.paidYears ?? sim.paidYears);
    add('historicalRate', payload.loan.historicalRate ?? sim.histRate);
  }

  if (payload.settings) {
    add('bankId', payload.settings.bankId);
    add('month', payload.settings.month);
    add('cardLimit', payload.settings.cardLimit);
    add('creditCardLimit', payload.settings.creditCardLimit);
    add('creditCardLimits', payload.settings.creditCardLimits);
    add('creditLimit', payload.settings.creditLimit);
    add('credit_card_limit', payload.settings.credit_card_limit);
    add('monthlyLimit', payload.settings.monthlyLimit);
    add('monthly_limit', payload.settings.monthly_limit);
    add('creditMonthlyLimit', payload.settings.creditMonthlyLimit);
    add('budget', payload.settings.budget);
    add('warning', payload.settings.warning);
    add('accountBalance', payload.settings.accountBalance);
    add('incomingAlert', payload.settings.incomingAlert);
    add('outgoingAlert', payload.settings.outgoingAlert);
  }

  if (payload.transaction) {
    add('txId', payload.transaction.id || payload.transaction.msgId);
    add('msgId', payload.transaction.msgId || payload.transaction.id);
    add('date', payload.transaction.date);
    add('amount', payload.transaction.amount);
    add('currency', payload.transaction.currency);
    add('merchant', payload.transaction.merchant);
    add('category', payload.transaction.category);
    add('card', payload.transaction.card);
    add('txType', payload.transaction.type);
    add('month', payload.transaction.month);
    add('bank', payload.transaction.bank);
    add('bankId', payload.transaction.bankId || payload.transaction.bankID);
    add('paymentKind', payload.transaction.paymentKind);
    add('variableSymbol', payload.transaction.variableSymbol || payload.transaction.vs);
    add('vs', payload.transaction.variableSymbol || payload.transaction.vs);
    add('tag', payload.transaction.tag);
    add('tagLabel', payload.transaction.tagLabel || payload.transaction.tagName);
    add('tagName', payload.transaction.tagName || payload.transaction.tagLabel);
    add('tagColor', payload.transaction.tagColor);
    add('tagShape', payload.transaction.tagShape);
    add('excludeFromSpent', payload.transaction.excludeFromSpent ? 'yes' : '');
    add('returnForTransactionId', payload.transaction.returnForTransactionId || '');
    add('recurringGroupId', payload.transaction.recurring_group_id || '');
    add('recurring_group_id', payload.transaction.recurring_group_id || '');
  }

  return flat;
}

function buildEndpointMutationUrl(action, payload = {}, callbackName = '') {
  const url = getCurrentWebAppUrl();
  const params = new URLSearchParams();
  const flat = flattenEndpointPayload(action, payload);
  Object.keys(flat).forEach(key => params.set(key, flat[key]));
  if (callbackName) params.set('callback', callbackName);
  params.set('_ts', String(Date.now()));
  return `${url}?${params.toString()}`;
}

function isLikelyIOSWebKit() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function getEndpointFailureDetail(action, result) {
  const data = result && result.data || {};
  const message = String(data.message || '');
  if (/login page returned|Google login page/i.test(message)) {
    const iosHint = isLikelyIOSWebKit()
      ? ' iPhone PWA nema Google cookies zo Safari. V Apps Script nastav Deploy -> Web app -> Who has access: Anyone (nie Anyone with Google account).'
      : ' V Apps Script nastav Deploy -> Web app -> Who has access: Anyone.';
    return getEndpointStatusMessage(action, 'error') + iosHint;
  }
  const jsonpProblem = data.status === 'timeout' || /JSONP|callback|script load/i.test(message);
  const postProblem = /fetch-post|Invalid JSON from Apps Script POST|Empty Apps Script response/i.test(message);
  if (!jsonpProblem && !postProblem) return getEndpointStatusMessage(action, 'error');
  const iosHint = isLikelyIOSWebKit()
    ? ' iPhone/Safari: skontroluj Apps Script /exec URL a Deploy -> Anyone. Ak appku mas na Home Screen, otvor /exec raz v Safari.'
    : ' Apps Script nevratil odpoved. Skontroluj Web App deployment /exec a access Anyone.';
  const lengthHint = data.urlLength && data.urlLength > 1800
    ? ' URL payload je dlhy (' + data.urlLength + ' znakov).'
    : '';
  return getEndpointStatusMessage(action, 'error') + iosHint + lengthHint;
}

function buildEndpointMutationBody(action, payload = {}) {
  return flattenEndpointPayload(action, payload);
}

function parseEndpointResponseText(text) {
  const raw = String(text || '').trim();
  if (!raw) return { ok: false, data: { status: 'error', message: 'Empty Apps Script response' } };
  if (/^\s*<!doctype html/i.test(raw) || /accounts\.google\.com\/signin/i.test(raw) || /ServiceLogin/i.test(raw)) {
    return { ok: false, data: { status: 'error', message: 'Google login page returned instead of JSON', ios: isLikelyIOSWebKit() } };
  }
  try {
    const data = JSON.parse(raw);
    const ok = !!data && (data.status === 'success' || data.status === 'ok');
    return { ok, data };
  } catch (_) {
    return { ok: false, data: { status: 'error', message: 'Invalid JSON from Apps Script POST', preview: raw.slice(0, 160) } };
  }
}

async function fetchEndpointRequest(action, payload = {}, timeoutMs = 15000) {
  const url = getCurrentWebAppUrl();
  if (!url) return { ok: false, data: { status: 'error', message: 'Missing Web App URL' } };

  const body = JSON.stringify(buildEndpointMutationBody(action, payload));
  let controller;
  let timer;
  try {
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      timer = window.setTimeout(() => controller.abort(), timeoutMs);
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
      signal: controller ? controller.signal : undefined
    });
    if (timer) window.clearTimeout(timer);
    return parseEndpointResponseText(await res.text());
  } catch (err) {
    if (timer) window.clearTimeout(timer);
    return { ok: false, data: { status: 'error', message: String(err && err.message || err), transport: 'fetch-post', ios: isLikelyIOSWebKit() } };
  }
}

function estimateEndpointMutationUrlLength(action, payload = {}) {
  return buildEndpointMutationUrl(action, payload, '__cb__').length;
}

function endpointPostFallbackTimeout(timeoutMs) {
  const requested = Math.max(3000, Number(timeoutMs || 15000));
  return isLikelyIOSWebKit() ? Math.min(requested, 12000) : requested;
}

async function endpointMutationRequest(action, payload = {}, timeoutMs = 15000) {
  const urlLength = estimateEndpointMutationUrlLength(action, payload);
  const jsonpSafe = urlLength <= 1800;

  if (jsonpSafe) {
    // iPhone/PWA can stall on Apps Script POST. Desktop already succeeds through
    // JSONP GET, so use the same path first whenever the payload is URL-safe.
    const jsonpResult = await jsonpEndpointRequest(action, payload, Math.min(timeoutMs, 20000));
    if (jsonpResult.ok) return jsonpResult;
    const postResult = await fetchEndpointRequest(action, payload, endpointPostFallbackTimeout(timeoutMs));
    return postResult.ok ? postResult : jsonpResult;
  }

  const postTimeout = endpointPostFallbackTimeout(timeoutMs);
  const postResult = await fetchEndpointRequest(action, payload, postTimeout);
  if (postResult.ok) return postResult;
  const jsonpResult = await jsonpEndpointRequest(action, payload, Math.min(timeoutMs, 20000));
  return jsonpResult.ok ? jsonpResult : postResult;
}

function getEndpointMutationJobKey(action, payload = {}) {
  if (action === 'deleteTransaction') {
    const id = String(payload.id || payload.msgId || '').trim();
    return id ? `delete:${id}` : '';
  }
  if (action === 'saveTransaction') {
    const tx = payload.transaction || payload;
    const id = String(tx.msgId || tx.id || '').trim();
    return id ? `save:${id}` : '';
  }
  return '';
}

function enqueueEndpointMutation(action, payload = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const jobKey = getEndpointMutationJobKey(action, payload);
    if (jobKey) {
      if (action === 'deleteTransaction') {
        const existing = endpointMutationQueue.find(job => job.key === jobKey);
        if (existing) {
          existing.waiters.push({ resolve, reject });
          return;
        }
      }
      if (action === 'saveTransaction') {
        const existingIdx = endpointMutationQueue.findIndex(job => job.key === jobKey);
        if (existingIdx >= 0) {
          const existing = endpointMutationQueue[existingIdx];
          existing.payload = payload;
          existing.timeoutMs = timeoutMs;
          existing.waiters.push({ resolve, reject });
          return;
        }
      }
    }

    endpointMutationQueue.push({
      action,
      payload,
      timeoutMs,
      key: jobKey,
      resolve,
      reject,
      waiters: []
    });
    drainEndpointMutationQueue();
  });
}

async function drainEndpointMutationQueue() {
  if (endpointMutationQueueRunning) return;
  endpointMutationQueueRunning = true;
  try {
    while (endpointMutationQueue.length) {
      const job = endpointMutationQueue.shift();
      const waiters = [{ resolve: job.resolve, reject: job.reject }, ...(job.waiters || [])];
      try {
        const result = await endpointMutationRequest(job.action, job.payload, job.timeoutMs);
        const ok = !!(result && result.ok);
        waiters.forEach(waiter => waiter.resolve(ok));
      } catch (err) {
        waiters.forEach(waiter => waiter.reject(err));
      }
    }
  } finally {
    endpointMutationQueueRunning = false;
  }
}

function queueParserRunAfterMutation(reason) {
  if (!isGoogleSheetsEnabled()) return;
  if (parserRunQueueTimer) clearTimeout(parserRunQueueTimer);
  parserRunQueueTimer = setTimeout(async () => {
    parserRunQueueTimer = null;
    const now = Date.now();
    if (parserRunInFlight) return;
    if ((now - Number(parserRunLastStartAt || 0)) < 12000) return;
    parserRunInFlight = true;
    parserRunLastStartAt = now;
    try {
      await endpointMutationRequest('runParser', {
        source: 'app_mutation',
        reason: String(reason || 'save'),
        requestedAt: new Date().toISOString()
      }, 65000);
    } catch (_) {
      // Fire-and-forget parser trigger should never block UI flows.
    } finally {
      parserRunInFlight = false;
    }
  }, 700);
}

function getEndpointStatusMessage(action, state) {
  const labels = {
    saveToken: {
      pending: 'Ukladám push token do Google Sheets...',
      success: 'Push token bol uložený do Google Sheets.',
      error: 'Push token ostal iba lokálne. Google Sheets zápis zlyhal.'
    },
    disableToken: {
      pending: 'Vypínam starý push token...',
      success: 'Starý push token bol označený ako neaktívny.',
      error: 'Starý push token sa nepodarilo označiť ako neaktívny.'
    },
    saveBank: {
      pending: 'Ukladám banku do Google Sheets...',
      success: 'Banka bola uložená do Google Sheets.',
      error: 'Banka ostala lokálne. Google Sheets zápis zlyhal.'
    },
    saveBankSettings: {
      pending: 'Ukladám nastavenia banky do Google Sheets...',
      success: 'Nastavenia banky boli uložené do Google Sheets.',
      error: 'Nastavenia banky ostali lokálne. Google Sheets zápis zlyhal.'
    },
    syncDetectedBanks: {
      pending: 'Synchronizujem zistené banky...',
      success: 'Zistené banky boli zosynchronizované.',
      error: 'Synchronizácia zistených bánk zlyhala.'
    },
    saveTransaction: {
      pending: 'Ukladám transakciu do Google Sheets...',
      success: 'Transakcia bola uložená do Google Sheets.',
      error: 'Transakcia ostala lokálne. Google Sheets odpoveď neprišla včas.'
    },
    deleteTransaction: {
      pending: 'Vymazávam transakciu z Google Sheets...',
      success: 'Transakcia bola vymazaná z Google Sheets.',
      error: 'Vymazanie transakcie z Google Sheets zlyhalo.'
    }
  };
  const fallback = {
    pending: 'Ukladám zmenu do Google Sheets...',
    success: 'Zmena bola uložená do Google Sheets.',
    error: 'Google Sheets zápis zlyhal. Skontroluj deployment /exec a Executions.'
  };
  return (labels[action] && labels[action][state]) || fallback[state] || '';
}

function jsonpEndpointRequest(action, payload = {}, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const callbackName = `__btCloudCb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const endpointUrl = buildEndpointMutationUrl(action, payload, callbackName);
    let done = false;
    const cleanup = () => {
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    const finish = (ok, data) => {
      if (done) return;
      done = true;
      cleanup();
      resolve({ ok, data: data || null });
    };
    window[callbackName] = (data) => {
      const ok = !!data && (data.status === 'success' || data.status === 'ok');
      finish(ok, data);
    };
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.onerror = () => finish(false, { status: 'error', message: 'JSONP script load failed', action, urlLength: endpointUrl.length, ios: isLikelyIOSWebKit() });
    script.src = endpointUrl;
    (document.body || document.head || document.documentElement).appendChild(script);
    window.setTimeout(() => finish(false, { status: 'timeout', message: 'Google Sheets endpoint timeout or callback blocked', action, urlLength: endpointUrl.length, ios: isLikelyIOSWebKit() }), timeoutMs);
  });
}