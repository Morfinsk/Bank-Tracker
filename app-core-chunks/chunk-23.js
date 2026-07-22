// Generated app-core slice 23/34 (declarations).

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