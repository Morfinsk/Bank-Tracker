// Generated app-core slice 25/34 (declarations).

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