// Generated app-core slice 10/34 (declarations).

function buildTransactionStatsAdjustments(pool) {
  const list = Array.isArray(pool) ? pool : (allTransactions || []);
  if (transactionStatsAdjustmentsCachePool === list && transactionStatsAdjustmentsCacheResult) {
    return transactionStatsAdjustmentsCacheResult;
  }
  const effective = new Map();
  const matched = new Map();
  const groups = new Map();

  list.forEach(tx => {
    const amount = Number(tx?.amount || 0);
    effective.set(tx, isExcludedFromSpendingStats(tx) ? 0 : (Number.isFinite(amount) ? amount : 0));
    matched.set(tx, 0);
  });

  const byId = new Map();
  list.forEach(tx => {
    const id = String(tx?.id || tx?.msgId || '').trim();
    if (id) byId.set(id, tx);
  });
  const manuallyLinked = new Set();
  list.forEach(incoming => {
    const targetId = String(incoming?.returnForTransactionId || incoming?.returnForId || '').trim();
    if (!targetId) return;
    const outgoing = byId.get(targetId);
    const incomingAmount = Number(effective.get(incoming) || 0);
    const outgoingAmount = Number(effective.get(outgoing) || 0);
    if (!outgoing || incomingAmount <= 0 || outgoingAmount >= 0) return;
    if (currencyCode(incoming.currency || 'CZK') !== currencyCode(outgoing.currency || 'CZK')) return;
    const amount = Math.min(incomingAmount, Math.abs(outgoingAmount));
    if (amount <= 0.005) return;
    effective.set(outgoing, outgoingAmount + amount);
    effective.set(incoming, incomingAmount - amount);
    matched.set(outgoing, Number(matched.get(outgoing) || 0) + amount);
    matched.set(incoming, Number(matched.get(incoming) || 0) + amount);
    manuallyLinked.add(outgoing);
    manuallyLinked.add(incoming);
  });

  list.forEach(tx => {
    if (manuallyLinked.has(tx)) return;
    const group = getTransferNettingGroup(tx);
    if (!group) return;
    if (!groups.has(group.key)) groups.set(group.key, { generic: group.generic, items: [] });
    groups.get(group.key).items.push(tx);
  });

  groups.forEach(group => {
    const items = group.items || [];
    // Generic bank labels are safe only for an unambiguous one-out/one-in pair.
    if (group.generic && (items.length !== 2 || !items.some(tx => Number(tx.amount) < 0) || !items.some(tx => Number(tx.amount) > 0))) return;
    const outgoing = items.filter(tx => Number(tx.amount) < 0).map(tx => ({ tx, left: Math.abs(Number(tx.amount)) }));
    const incoming = items.filter(tx => Number(tx.amount) > 0).map(tx => ({ tx, left: Math.abs(Number(tx.amount)) }));
    let oi = 0;
    let ii = 0;
    while (oi < outgoing.length && ii < incoming.length) {
      const out = outgoing[oi];
      const inc = incoming[ii];
      const amount = Math.min(out.left, inc.left);
      if (amount > 0.005) {
        effective.set(out.tx, Number(effective.get(out.tx) || 0) + amount);
        effective.set(inc.tx, Number(effective.get(inc.tx) || 0) - amount);
        matched.set(out.tx, Number(matched.get(out.tx) || 0) + amount);
        matched.set(inc.tx, Number(matched.get(inc.tx) || 0) + amount);
      }
      out.left -= amount;
      inc.left -= amount;
      if (out.left <= 0.005) oi++;
      if (inc.left <= 0.005) ii++;
    }
  });

  const result = { effective, matched };
  transactionStatsAdjustmentsCachePool = list;
  transactionStatsAdjustmentsCacheResult = result;
  return result;
}

function getTransactionStatsAmount(tx, pool) {
  return Number(buildTransactionStatsAdjustments(pool || allTransactions).effective.get(tx) || 0);
}

function getTransactionMatchedTransferAmount(tx, pool) {
  return Number(buildTransactionStatsAdjustments(pool || allTransactions).matched.get(tx) || 0);
}

function isInternalTransferForFiltering(tx) {
  return isExcludedFromSpendingStats(tx);
}

function convertTransactionStatsAmount(tx, effectiveAmount, targetCurrency) {
  const raw = Math.abs(Number(tx?.amount || 0));
  const adjusted = Math.abs(Number(effectiveAmount || 0));
  if (!raw || !adjusted) return 0;
  return Math.abs(Number(convertTransactionAmount(tx, targetCurrency) || 0)) * (adjusted / raw);
}

function transactionMatchesArchiveDrilldown(tx, type, bankKey) {
  if (!tx || !tx.month) return false;
  const month = normalizeMonthStr(tx.month);
  if (!getDrilldownMonthSet().has(month)) return false;
  if (isExcludedFromSpendingStats(tx)) return false;

  const bank = String(bankKey || 'všetky');
  if (type !== 'overview-spent' && bank !== 'všetky' && getArchiveBankKeyFromTransaction(tx) !== bank) return false;

  if (type === 'cards') return Number(tx.amount || 0) < 0 && isCardTransaction(tx);
  if (type === 'spent' || type === 'overview-spent') return Number(tx.amount || 0) < 0;
  if (type === 'income') return Number(tx.amount || 0) > 0;
  return true;
}

function applyDrilldownTransactionFilter(txns) {
  if (!activeDrilldownFilter) return txns;
  const { type, bankKey } = activeDrilldownFilter;
  return (txns || []).filter(tx => transactionMatchesArchiveDrilldown(tx, type, bankKey));
}

function clearDrilldownTransactionFilter() {
  activeDrilldownFilter = null;
}

function isCsobCzCreditCardBalanceTx(tx) {
  const text = [tx?.bank, tx?.card, tx?.type, tx?.category, tx?.merchant, tx?.merchantRaw].join(' ').toLowerCase();
  const creditCard = getCsobCzCreditCardLast4();
  const hasCreditCard = creditCard && text.includes(creditCard);
  return (text.includes('csob cz') || text.includes('čsob cz') || hasCreditCard || text.includes('kredit')) && (hasCreditCard || text.includes('credit card') || text.includes('kredit'));
}

function adjustLocalAccountBalance(bankKey, monthStr, delta, tx) {
  const amount = Number(delta || 0);
  if (!bankKey || !isFinite(amount) || amount === 0) return false;
  if (!canApplyBalanceDeltaForTx(bankKey, tx)) return false;
  const month = normalizeMonthStr(monthStr || tx?.month || getAktuálneMonth());
  const current = getAccountBalance(bankKey, month);
  const next = Math.round((current + amount) * 100) / 100;
  setAccountBalance(bankKey, next, month);
  return true;
}

function applyLocalAccountBalanceFromTransaction(tx, multiplier = 1) {
  if (!tx) return false;
  const month = normalizeMonthStr(tx.month || getAktuálneMonth());
  recomputeAccountBalancesForMonth(month);
  return true;
}

function getBankBalanceCurrency(bankKey) {
  if (String(bankKey || '').startsWith('custom_')) {
    const bank = getCustomBanks().find(b => b.id === bankKey);
    return bank?.currency || 'CZK';
  }
  const bank = getBankInfo(bankKey);
  const saved = localStorage.getItem('bank_currency_' + bankKey);
  if (bankKey === 'csob_sk' && (!saved || saved === 'CZK')) return 'EUR';
  return saved || bank.primaryCurrency || 'CZK';
}

function getAccountBalancePrivacyKey() {
  return 'account_balance_values_hidden';
}
function isAccountBalanceHidden() {
  return localStorage.getItem(getAccountBalancePrivacyKey()) === 'true';
}
function maskAccountBalanceValue(value) {
  return isAccountBalanceHidden() ? '••••••' : value;
}
function maskAccountBalanceNote(value) {
  return isAccountBalanceHidden() ? '' : value;
}
function accountBalanceEyeSvg(hidden) {
  if (hidden) {
    return `
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
        <path d="M10.7 5.1A10.7 10.7 0 0 1 12 5c5.2 0 8.7 4.4 10 7-0.5 1-1.5 2.3-2.8 3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M6.5 6.7C4.4 8.1 3 10.2 2 12c1.3 2.6 4.8 7 10 7 1.5 0 2.9-.4 4.1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`;
  }
  return `
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>
    </svg>`;
}
function updateAccountBalancePrivacyButton() {
  const btn = document.getElementById('account-balance-privacy-btn');
  if (!btn) return;
  const hidden = isAccountBalanceHidden();
  btn.classList.toggle('on', hidden);
  btn.innerHTML = accountBalanceEyeSvg(hidden);
  const label = hidden ? 'Show balances' : 'Hide balances';
  btn.title = label;
  btn.setAttribute('aria-label', label);
}
function toggleAccountBalancePrivacy() {
  localStorage.setItem(getAccountBalancePrivacyKey(), String(!isAccountBalanceHidden()));
  renderAccountBalanceWidget();
}
function getSheetCreditBankRows() {
  return getCustomBanks().filter(b => b && b.id === 'csob_cz_credit' && b.active !== false);
}
function getCreditBalanceSubaccountData(config) {
  const sheetRow = getSheetCreditBankRows().find(b => b.id === config.id) || {};
  const cardLast4 = cleanBankCardsValue(sheetRow.cards || sheetRow.cardLast4 || config.cardLast4 || '') || config.cardLast4 || '';
  const baseName = t('csobCzCreditOutstandingShort') || config.short || 'Credit card';
  return {
    ...config,
    // In Overview this is a child row under ČSOB CZ, so do not repeat the parent bank name.
    name: cardLast4 && !String(baseName).includes(cardLast4) ? `${baseName} ${cardLast4}` : baseName,
    currency: normalizeCurrencyForStorage(sheetRow.currency || config.currency || 'CZK'),
    cardLast4: cardLast4
  };
}

function getCreditBalanceSubaccount(id) {
  return CREDIT_BALANCE_SUBACCOUNTS.find(item => item.id === id) || null;
}

function getCreditBalanceSubaccountsForParent(parentId) {
  return CREDIT_BALANCE_SUBACCOUNTS
    .filter(item => item.parentId === parentId)
    .map(item => getCreditBalanceSubaccountData(item));
}

function getCreditSubaccountExpandedKey(id) {
  return 'credit_subaccount_expanded_' + id;
}

function isCreditSubaccountExpanded(id) {
  const saved = localStorage.getItem(getCreditSubaccountExpandedKey(id));
  return saved === null ? true : saved === 'true';
}

function toggleCreditSubaccount(id) {
  const next = !isCreditSubaccountExpanded(id);
  localStorage.setItem(getCreditSubaccountExpandedKey(id), String(next));
  renderAccountBalanceWidget();
}

function getCreditAvailableBalanceDisplay(raw) {
  return Math.max(0, Math.round((Number(raw || 0) || 0) * 100) / 100);
}

function formatCreditAvailableBalanceAmount(raw, currency) {
  return formatCurrencyAmount(getCreditAvailableBalanceDisplay(raw), currency || 'CZK');
}

function getCreditOutstandingBalance(id) {
  return Number(localStorage.getItem(getAccountBalanceStorageKey(id)) || '0') || 0;
}

function setCreditOutstandingBalance(id, value) {
  localStorage.setItem(getAccountBalanceStorageKey(id), String(Number(value || 0) || 0));
}

function getCreditOutstandingCurrency(id) {
  const config = getCreditBalanceSubaccount(id);
  return config ? getCreditBalanceSubaccountData(config).currency : 'CZK';
}

function getAllManagedBanksForBalance(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const system = BANK_ORDER.map(k => {
    const info = getBankInfo(k);
    return {
      id: k,
      name: plainBankName(k),
      logo: bankLogoImg(k),
      color: info?.color || 'var(--accent)',
      currency: getBankBalanceCurrency(k),
      balance: getLatestStoredAccountBalanceForBank(k, month),
      type: info?.primaryType || 'account',
      liability: info?.primaryType === 'credit' || k === 'csob_cz_credit'
    };
  });
  const systemIds = new Set(BANK_ORDER);
  const custom = getCustomBanks()
    .filter(b => b && b.active !== false && !systemIds.has(b.id))
    .map(b => ({
      id: b.id,
      name: b.name,
      logo: '🏦',
      color: 'var(--accent)',
      currency: b.currency || 'CZK',
      balance: getLatestStoredAccountBalanceForBank(b.id, month),
      type: b.type || 'account',
      liability: b.type === 'credit' || b.id === 'csob_cz_credit'
    }));
  return [...system, ...custom];
}

function renderAccountBalanceWidget() {
  updateAccountBalanceFxBadge();
  const wrap = document.getElementById('account-balance-widget');
  updateAccountBalancePrivacyButton();
  if (!wrap) return;

  const allBanks = getAllManagedBanksForBalance();
  const targetCurrency = getAppCurrency();
  const creditChildrenByParent = {};

  CREDIT_BALANCE_SUBACCOUNTS.forEach(config => {
    const item = getCreditBalanceSubaccountData(config);
    if (!item || !item.parentId) return;
    const balanceBank = allBanks.find(b => b.id === item.id);
    const child = {
      ...item,
      balance: balanceBank ? Number(balanceBank.balance || 0) : getCreditOutstandingBalance(item.id),
      currency: balanceBank?.currency || item.currency || 'CZK',
      liability: true
    };
    if (!creditChildrenByParent[item.parentId]) creditChildrenByParent[item.parentId] = [];
    creditChildrenByParent[item.parentId].push(child);
  });

  // Credit cards are rendered as child rows under their parent account, not as standalone banks.
  const parentedCreditIds = new Set(CREDIT_BALANCE_SUBACCOUNTS.map(item => item.id));
  const banks = allBanks.filter(bank => !parentedCreditIds.has(bank.id));

  const totalBalance = getAccountBalanceCashTotal(getAktuálneMonth(), targetCurrency);

  const renderSubaccountRow = (item) => {
    const currency = item.currency || 'CZK';
    const raw = getCreditAvailableBalanceDisplay(item.balance);
    const value = formatCreditAvailableBalanceAmount(item.balance, currency);
    const czkEquivalent = getCzkEquivalentText(raw, currency);
    const valueClass = raw > 0 ? 'amount-income' : '';
    return `
      <div class="budget-bank-row account-balance-row account-balance-sub-row account-balance-credit-available-row" data-bank-id="${escapeAttr(item.id || '')}" onclick="openAccountBalanceBankSheet('${escapeAttr(item.id || '')}')" style="padding:9px 0 9px 18px;border-bottom:1px solid var(--border);cursor:pointer;">
        <div class="budget-status-main">
          <div class="account-balance-name-wrap">
            <div class="budget-status-value account-balance-name" style="color:var(--accent);font-size:14px;">└ ${escapeHtml(item.name)}</div>
          </div>
          <div class="account-balance-value-wrap">
            <div class="budget-status-value account-balance-value ${valueClass}">${escapeHtml(maskAccountBalanceValue(value))}</div>
            ${maskAccountBalanceNote(czkEquivalent) ? `<div class="budget-status-note account-balance-equivalent">${escapeHtml(czkEquivalent)}</div>` : ''}
          </div>
        </div>
      </div>`;
  };

  const rows = banks.map(bank => {
    const currency = bank.currency || 'CZK';
    const raw = Number(bank.balance || 0);
    const value = formatSignedCurrencyAmount(raw, currency);
    const czkEquivalent = getCzkEquivalentText(raw, currency);
    const valueClass = getSignedAmountClass(raw);
    const children = creditChildrenByParent[bank.id] || [];
    const hasCreditChildren = children.length > 0;
    const creditExpanded = hasCreditChildren ? isCreditSubaccountExpanded(bank.id) : false;
    const creditToggle = hasCreditChildren ? `<button class="account-balance-rollup-btn ${creditExpanded ? 'is-expanded' : ''}" type="button" onclick="event.stopPropagation(); toggleCreditSubaccount('${escapeAttr(bank.id)}')" title="${creditExpanded ? 'Hide credit card' : 'Show credit card'}" aria-label="${creditExpanded ? 'Hide credit card' : 'Show credit card'}">${creditExpanded ? '⌄' : '›'}</button>` : '';
    const mainRow = `
      <div class="budget-bank-row account-balance-row" data-bank-id="${escapeAttr(bank.id)}" onclick="openAccountBalanceBankSheet('${escapeAttr(bank.id)}')" style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div class="budget-status-main">
          <div class="account-balance-name-wrap">
            <div class="budget-status-value account-balance-name" style="font-size:15px;display:flex;align-items:center;gap:7px;">${bank.logo}${bank.id === 'moneta' ? '<span class="moneta-gradient">Moneta</span>' : `<span style="color:${bank.color || 'var(--text)'};">${escapeHtml(bank.name)}</span>`}${creditToggle}</div>
          </div>
          <div class="account-balance-value-wrap">
            <div class="budget-status-value account-balance-value ${valueClass}">${escapeHtml(maskAccountBalanceValue(value))}</div>
            ${maskAccountBalanceNote(czkEquivalent) ? `<div class="budget-status-note account-balance-equivalent">${escapeHtml(czkEquivalent)}</div>` : ''}
          </div>
        </div>
      </div>`;
    const childRows = hasCreditChildren && creditExpanded ? children.map(renderSubaccountRow).join('') : '';
    return mainRow + childRows;
  }).join('');
  const totalClass = getSignedAmountClass(totalBalance);
  const totalRow = banks.length ? `
      <div class="budget-bank-row account-balance-row account-balance-total-row" title="${escapeAttr(t('accountBalanceTotal'))}">
        <div class="budget-status-main">
          <div class="account-balance-name-wrap">
            <div class="budget-status-value account-balance-name">Σ ${escapeHtml(t('accountBalanceTotal'))}</div>
            <div class="budget-status-note">${escapeHtml(t('accountBalanceTotalHint'))}</div>
          </div>
          <div class="account-balance-value-wrap">
            <div class="budget-status-value account-balance-value ${totalClass}">${escapeHtml(maskAccountBalanceValue(formatSignedCurrencyAmount(totalBalance, targetCurrency)))}</div>
          </div>
        </div>
      </div>` : '';
  wrap.innerHTML = banks.length ? (rows + totalRow) : `<div class="budget-status-note">${t('noBanksAdded')}</div>`;
}


function openBankBudgetTransactions(bankKey) {
  showPage('txns');
  activeCategory = 'všetky';
  activeCardLast4 = '';
  activePaymentKind = 'all';
  activeDirection = 'all';
  activeMonthFilter = '';
  activeTxnHistoryScope = 'all';
  setTransactionDateRangeFromMonth(getAktuálneMonth());
  updatePaymentKindFilterUi();
  updateTransactionDateInputs();
  document.getElementById('filter-dir-all')?.classList.toggle('active', true);
  document.getElementById('filter-dir-incoming')?.classList.toggle('active', false);
  document.getElementById('filter-dir-outgoing')?.classList.toggle('active', false);
  filterBank(bankKey);
}