// Generated app-core slice 24/34 (declarations).

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