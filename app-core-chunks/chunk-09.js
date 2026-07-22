// Generated app-core slice 9/34 (declarations).

function getAccountBalanceBase(bankKey, monthStr = getAktuálneMonth()) {
  const raw = localStorage.getItem(getAccountBalanceBaseStorageKey(bankKey, monthStr));
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

function setAccountBalanceBase(bankKey, monthStr, value) {
  const parsed = Number(value);
  const amount = Number.isFinite(parsed) ? parsed : 0;
  localStorage.setItem(getAccountBalanceBaseStorageKey(bankKey, monthStr), String(amount));
}

function isCsobCzCreditCardLimitAdjustmentTx(tx) {
  const msgId = String(tx?.msgId || tx?.id || '');
  if (msgId.includes('_credit_repayment_adjustment')) return true;
  const text = [tx?.type, tx?.merchant, tx?.merchantRaw, tx?.category, tx?.msgId, tx?.id].join(' ').toLowerCase();
  return /credit card limit adjustment/i.test(text);
}
function getTransactionBalanceDeltaForBank(bankKey, tx) {
  const amount = Number(tx?.amount || 0);
  if (!tx || !Number.isFinite(amount) || amount === 0) return 0;
  if (isCsobCzCreditCardLimitAdjustmentTx(tx)) return 0;

  if (isCsobCzCreditCardRepaymentTx(tx)) {
    if (bankKey === 'csob_cz') {
      return canApplyBalanceDeltaForTx(bankKey, tx) ? amount : 0;
    }
    if (bankKey === 'csob_cz_credit') {
      // Repayment restores available credit on the credit subaccount.
      return canApplyBalanceDeltaForTx(bankKey, tx) ? Math.abs(amount) : 0;
    }
    return 0;
  }

  if (isCsobCzCreditCardBalanceTx(tx)) {
    if (bankKey === 'csob_cz_credit') {
      // Card spend reduces available credit; refunds increase it.
      return canApplyBalanceDeltaForTx(bankKey, tx) ? amount : 0;
    }
    return 0;
  }

  if (bankKey === 'csob_cz_credit' && amount > 0 && isCardTransaction(tx)) {
    const key = getBankKey(tx);
    if (key === 'csob_cz_credit' || key === 'csob_cz') {
      return canApplyBalanceDeltaForTx(bankKey, tx) ? amount : 0;
    }
  }

  if (getBankKey(tx) !== bankKey) return 0;
  if (!canApplyBalanceDeltaForTx(bankKey, tx)) return 0;
  return amount;
}

function sumTransactionBalanceDeltasForBank(bankKey, monthStr, txList = allTransactions) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  return (txList || []).reduce((sum, tx) => {
    if (!tx || normalizeMonthStr(tx.month) !== month) return sum;
    return sum + getTransactionBalanceDeltaForBank(bankKey, tx);
  }, 0);
}
function ensureAccountBalanceBase(bankKey, monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const creditLiability = isCreditLiabilityBankKey(bankKey);
  if (hasSheetAccountBalanceAuthority(bankKey, month) && !creditLiability) {
    const stored = localStorage.getItem(getSheetAccountBalanceValueKey(bankKey, month));
    if (stored !== null && Number.isFinite(Number(stored))) {
      syncAccountBalanceBaseFromAbsoluteValue(bankKey, month, Number(stored));
      return getAccountBalanceBase(bankKey, month);
    }
  }
  if (creditLiability && hasSheetAccountBalanceAuthority(bankKey, month) && getAccountBalanceBase(bankKey, month) === null) {
    const stored = localStorage.getItem(getSheetAccountBalanceValueKey(bankKey, month));
    if (stored !== null && Number.isFinite(Number(stored))) {
      syncAccountBalanceBaseFromAbsoluteValue(bankKey, month, Number(stored));
      return getAccountBalanceBase(bankKey, month);
    }
  }
  const stored = getAccountBalanceBase(bankKey, month);
  if (stored !== null) return stored;
  const current = getAccountBalance(bankKey, month);
  const txSum = sumTransactionBalanceDeltasForBank(bankKey, month);
  const base = Math.round((current - txSum) * 100) / 100;
  setAccountBalanceBase(bankKey, month, base);
  return base;
}

function syncAccountBalanceBaseFromAbsoluteValue(bankKey, monthStr, absoluteBalance) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const txSum = sumTransactionBalanceDeltasForBank(bankKey, month);
  const abs = Number(absoluteBalance || 0);
  const base = Math.round((abs - txSum) * 100) / 100;
  setAccountBalanceBase(bankKey, month, base);
  setAccountBalance(bankKey, Math.round((base + txSum) * 100) / 100, month);
}

function recomputeAccountBalanceForBank(bankKey, monthStr = getAktuálneMonth()) {
  const id = String(bankKey || '').trim();
  if (!id) return false;
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const creditLiability = isCreditLiabilityBankKey(id);

  if (hasSheetAccountBalanceAuthority(id, month) && !creditLiability) {
    const stored = localStorage.getItem(getSheetAccountBalanceValueKey(id, month));
    if (stored !== null && Number.isFinite(Number(stored))) {
      syncAccountBalanceBaseFromAbsoluteValue(id, month, Number(stored));
      return true;
    }
  }

  if (creditLiability && hasSheetAccountBalanceAuthority(id, month) && getAccountBalanceBase(id, month) === null) {
    const stored = localStorage.getItem(getSheetAccountBalanceValueKey(id, month));
    if (stored !== null && Number.isFinite(Number(stored))) {
      syncAccountBalanceBaseFromAbsoluteValue(id, month, Number(stored));
    }
  }

  const base = ensureAccountBalanceBase(id, month);
  const txSum = sumTransactionBalanceDeltasForBank(id, month);
  const next = Math.round((base + txSum) * 100) / 100;
  setAccountBalance(id, next, month);
  return true;
}

function recomputeAccountBalancesForMonth(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const seen = new Set();
  getAllManagedBanksForBalance(month).forEach(bank => {
    if (!bank?.id || seen.has(bank.id)) return;
    seen.add(bank.id);
    recomputeAccountBalanceForBank(bank.id, month);
  });
}

function seedAccountBalanceBasesForMonth(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  getAllManagedBanksForBalance(month).forEach(bank => {
    if (!bank?.id) return;
    if (hasSheetAccountBalanceAuthority(bank.id, month)) return;
    if (getAccountBalanceBase(bank.id, month) !== null) return;
    const txSum = sumTransactionBalanceDeltasForBank(bank.id, month);
    const current = getAccountBalance(bank.id, month);
    setAccountBalanceBase(bank.id, month, Math.round((current - txSum) * 100) / 100);
  });
}

function recomputeAccountBalancesForLoadedMonths() {
  const months = new Set([normalizeMonthStr(getAktuálneMonth())]);
  (allTransactions || []).forEach(tx => {
    if (tx?.month) months.add(normalizeMonthStr(tx.month));
  });
  months.forEach(month => {
    seedAccountBalanceBasesForMonth(month);
    recomputeAccountBalancesForMonth(month);
  });
}

function getSheetAccountBalanceAuthorityKey(bankKey, monthStr = getAktuálneMonth()) {
  return 'bank_account_balance_sheet_authority_' + String(bankKey || '').trim() + '_' + normalizeMonthStr(monthStr || getAktuálneMonth());
}

function getSheetAccountBalanceValueKey(bankKey, monthStr = getAktuálneMonth()) {
  return 'bank_sheet_balance_value_' + String(bankKey || '').trim() + '_' + normalizeMonthStr(monthStr || getAktuálneMonth());
}

function parseSheetAccountBalanceAuthorityKey(key) {
  const prefix = 'bank_account_balance_sheet_authority_';
  if (!String(key || '').startsWith(prefix)) return null;
  const rest = String(key).slice(prefix.length);
  const match = rest.match(/^(.+)_(\d{2}\/\d{4})$/);
  if (!match) return null;
  return { bankKey: match[1], month: match[2] };
}

function reapplySheetAccountBalancesFromStorage() {
  try {
    Object.keys(localStorage).forEach(key => {
      const parsed = parseSheetAccountBalanceAuthorityKey(key);
      if (!parsed) return;
      if (isCreditLiabilityBankKey(parsed.bankKey)) return;
      const stored = localStorage.getItem(getSheetAccountBalanceValueKey(parsed.bankKey, parsed.month));
      if (stored === null) return;
      const absolute = Number(stored);
      if (!Number.isFinite(absolute)) return;
      syncAccountBalanceBaseFromAbsoluteValue(parsed.bankKey, parsed.month, absolute);
    });
  } catch (e) {
    console.warn('Sheet account balance reapply failed:', e);
  }
}

function markSheetAccountBalanceAuthority(bankKey, monthStr = getAktuálneMonth()) {
  const id = String(bankKey || '').trim();
  if (!id) return false;
  localStorage.setItem(getSheetAccountBalanceAuthorityKey(id, monthStr), String(Date.now()));
  return true;
}

function hasSheetAccountBalanceAuthority(bankKey, monthStr = getAktuálneMonth()) {
  const id = String(bankKey || '').trim();
  if (!id) return false;
  return localStorage.getItem(getSheetAccountBalanceAuthorityKey(id, monthStr)) !== null;
}

function clearSheetAccountBalanceAuthorityMarkers() {
  const prefix = 'bank_account_balance_sheet_authority_';
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(prefix)) localStorage.removeItem(key);
  });
}

function clearSheetAccountBalanceValueKeys() {
  const prefix = 'bank_sheet_balance_value_';
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(prefix)) localStorage.removeItem(key);
  });
}

function clearSheetAccountBalanceStorage() {
  clearSheetAccountBalanceAuthorityMarkers();
  clearSheetAccountBalanceValueKeys();
}


function canApplyBalanceDeltaForTx(bankKey, tx) {
  const txCurrency = currencyCode(tx?.currency || '');
  const bankCurrency = String(getBankBalanceCurrency(bankKey) || '').toUpperCase();
  return !txCurrency || !bankCurrency || txCurrency === bankCurrency;
}

function isCreditLiabilityBankKey(bankKey) {
  const id = String(bankKey || '').trim();
  if (!id) return false;
  if (id === 'csob_cz_credit') return true;
  return !!(CREDIT_BALANCE_SUBACCOUNTS || []).some((item) => item && item.id === id);
}

function isCsobCzCreditCardRepaymentTx(tx) {
  if (isCsobCzCreditCardLimitAdjustmentTx(tx)) return false;
  const text = [tx?.merchant, tx?.merchantRaw, tx?.category, tx?.card, tx?.type, tx?.paymentKind, tx?.bank].join(' ').toLowerCase();
  const isCsobCz = text.includes('csob cz') || text.includes('čsob cz');
  const isRepayment = /splátka\s+kreditní\s+karty/i.test(text) || /splatka\s+kreditni\s+karty/i.test(text) || /credit\s*card\s*repayment/i.test(text) || (/kredit/i.test(text) && /splátka|splatka|repayment/i.test(text));
  return isCsobCz && isRepayment;
}

function isUserOwnedBankKey(bankKey) {
  const key = String(bankKey || '').trim();
  if (!key || key === 'všetky') return false;
  if (key === 'csob_cz_credit') return true;
  if ((BANK_ORDER || []).includes(key)) return true;
  return (getCustomBanks() || []).some(b => b && String(b.id || '') === key && b.active !== false);
}

function hasMirroredOwnBankTransfer(tx, pool) {
  if (!tx) return false;
  const amountAbs = Math.abs(Number(tx.amount || 0));
  if (!amountAbs) return false;
  const txBank = getArchiveBankKeyFromTransaction(tx);
  if (!isUserOwnedBankKey(txBank)) return false;
  const txMonth = normalizeMonthStr(tx.month || getAktuálneMonth());
  const txCurrency = currencyCode(tx.currency || 'CZK');
  const txTime = parseCustomDateStr(tx.rawDate || tx.date)?.getTime() || 0;
  const list = pool || allTransactions || [];
  return list.some(other => {
    if (!other || other === tx) return false;
    if (normalizeMonthStr(other.month || '') !== txMonth) return false;
    const otherBank = getArchiveBankKeyFromTransaction(other);
    if (!isUserOwnedBankKey(otherBank) || otherBank === txBank) return false;
    const otherAmount = Number(other.amount || 0);
    if (!otherAmount || (otherAmount > 0) === (Number(tx.amount || 0) > 0)) return false;
    if (currencyCode(other.currency || 'CZK') !== txCurrency) return false;
    if (Math.abs(Math.abs(otherAmount) - amountAbs) > 0.01) return false;
    if (!txTime) return true;
    const otherTime = parseCustomDateStr(other.rawDate || other.date)?.getTime() || 0;
    if (!otherTime) return true;
    return Math.abs(otherTime - txTime) <= 3 * 24 * 60 * 60 * 1000;
  });
}

function isTransactionManuallyExcludedFromSpent(tx) {
  return !!(tx && (tx.excludeFromSpent === true || String(tx.excludeFromSpent || '').toLowerCase() === 'yes' || String(tx.excludeFromSpent || '').toLowerCase() === 'true' || String(tx.excludeFromSpent || '') === '1'));
}

function isInternalTransferTransaction(tx) {
  if (!tx) return false;
  // ATM withdrawal can be non-spent, but it is physical cash rather than a
  // transfer between tracked bank accounts.
  if (isAtmCashWithdrawalTransaction(tx)) return false;
  const text = [
    tx.merchant, tx.merchantRaw, tx.category, tx.card, tx.type, tx.paymentKind, tx.bank, tx.msgId, tx.id
  ].join(' ').toLowerCase();
  if (/internal\s+transfer/i.test(text)) return true;
  if (/intern[yý]\s+transfer/i.test(text)) return true;
  if (/intern[ií]\s+p[řr]evod/i.test(text)) return true;
  if (/p[řr]evod\s+mezi\s+[uú]cty/i.test(text)) return true;
  if (/prevod\s+mezi\s+ucty/i.test(text)) return true;
  if (String(tx.category || '').trim().toLowerCase() === 'internal transfer') return true;

  if (hasMirroredOwnBankTransfer(tx)) return true;
  if (hasExactOppositeAccountTransfer(tx, allTransactions)) return true;

  // Heuristic for own-bank internal transfers:
  // account movement + tracked own account + generic transfer label or mirrored counterpart.
  let paymentKind = '';
  try { paymentKind = getTransactionPaymentKind(tx); } catch(_) {}
  if (paymentKind !== 'account') return false;

  const source = String(tx.card || tx.account || '').trim().toLowerCase();
  const trackedAccounts = getTrackedBankAccountIdentifiers();
  const hasTrackedSource = source && textContainsAnyIdentifier(source, trackedAccounts);
  if (!hasTrackedSource) return false;

  const merchant = String(tx.merchant || tx.merchantRaw || '').trim().toLowerCase();
  const typeText = String(tx.type || '').trim().toLowerCase();
  const isArrowLabel = /^[-–—>→<←\s.]+$/.test(merchant) || /^[-–—>→<←\s.]+$/.test(typeText);
  if (isArrowLabel) return true;

  const combined = (merchant + ' ' + typeText).trim();
  const mentionsOtherTracked = textContainsAnyIdentifier(combined, trackedAccounts.filter(id => !source.includes(id)));
  if (mentionsOtherTracked) return true;

  // Paired opposite-sign account movement in another tracked bank during the same month.
  const amountAbs = Math.abs(Number(tx.amount || 0));
  if (!amountAbs) return false;
  const txMonth = normalizeMonthStr(tx.month || getAktuálneMonth());
  const txBank = getArchiveBankKeyFromTransaction(tx);
  const txTime = parseCustomDateStr(tx.rawDate || tx.date)?.getTime() || 0;
  return (allTransactions || []).some(other => {
    if (!other || other === tx) return false;
    if (normalizeMonthStr(other.month || '') !== txMonth) return false;
    let otherKind = '';
    try { otherKind = getTransactionPaymentKind(other); } catch(_) {}
    if (otherKind !== 'account') return false;
    if (getArchiveBankKeyFromTransaction(other) === txBank) return false;
    const otherAmount = Number(other.amount || 0);
    if (!otherAmount || (otherAmount > 0) === (Number(tx.amount || 0) > 0)) return false;
    if (Math.abs(Math.abs(otherAmount) - amountAbs) > 0.01) return false;
    const otherSource = String(other.card || other.account || '').trim().toLowerCase();
    if (!otherSource || !textContainsAnyIdentifier(otherSource, trackedAccounts)) return false;
    if (!txTime) return true;
    const otherTime = parseCustomDateStr(other.rawDate || other.date)?.getTime() || 0;
    if (!otherTime) return true;
    return Math.abs(otherTime - txTime) <= 3 * 24 * 60 * 60 * 1000;
  });
}

function getDrilldownMonthSet() {
  const raw = String(activeMonthFilter || '').trim();
  if (raw) {
    return new Set(raw.split('|').map(m => normalizeMonthStr(m)).filter(Boolean));
  }
  return new Set([normalizeMonthStr(getAktuálneMonth())]);
}

function isExcludedFromSpendingStats(tx) {
  if (isTransactionManuallyExcludedFromSpent(tx)) return true;
  if (typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)) return true;
  if (typeof isInternalTransferTransaction === 'function' && isInternalTransferTransaction(tx)) return true;
  return false;
}

// Net opposite account movements before calculating spent/income. Example:
// -10,000 CZK and +6,000 CZK for the same account/counterparty becomes
// -4,000 CZK spent and 0 CZK income. Raw transaction amounts stay untouched.
function normalizeTransferNettingText(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(incoming|outgoing|prichozi|odchozi|prijata|prijaty|odoslana|odoslany|credit|debit)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getTransferNettingParty(tx) {
  const explicitFields = [
    tx?.counterpartyAccount, tx?.counterpartyIban, tx?.otherAccount,
    tx?.beneficiaryAccount, tx?.senderAccount, tx?.recipientAccount,
    tx?.partnerAccount, tx?.fromAccount, tx?.toAccount
  ].filter(Boolean);
  const searchable = explicitFields.concat([tx?.merchant, tx?.merchantRaw, tx?.type]).join(' ');
  const compact = String(searchable || '').toUpperCase().replace(/\s+/g, ' ');
  const iban = compact.match(/\b[A-Z]{2}\d{2}[A-Z0-9]{8,30}\b/);
  const localAccount = compact.match(/\b\d{2,16}\s*\/\s*\d{4}\b/);
  if (iban) return { key: 'account:' + iban[0].replace(/\s+/g, ''), generic: false };
  if (localAccount) return { key: 'account:' + localAccount[0].replace(/\s+/g, ''), generic: false };

  const party = normalizeTransferNettingText(tx?.merchant || tx?.merchantRaw || '');
  const genericLabels = new Set(['', 'payment', 'platba', 'uhrada', 'prevod', 'transfer', 'account payment', 'bank transfer']);
  return { key: 'party:' + (party || 'generic'), generic: genericLabels.has(party) };
}

function getTransferNettingIdentity(tx) {
  if (!tx || getTransactionPaymentKind(tx) !== 'account') return null;
  const amount = Number(tx.amount || 0);
  if (!Number.isFinite(amount) || !amount) return null;
  const source = normalizeTransferNettingText(tx.account || tx.card || '');
  if (!source || /\*{2,}/.test(String(tx.card || ''))) return null;
  const bank = String(getArchiveBankKeyFromTransaction(tx) || getBankKey(tx) || '').trim();
  const month = normalizeMonthStr(tx.month || '');
  const currency = currencyCode(tx.currency || 'CZK');
  const party = getTransferNettingParty(tx);
  return { key: [month, bank, currency, source, party.key].join('|'), generic: party.generic };
}

function hasExactOppositeAccountTransfer(tx, pool) {
  const identity = getTransferNettingIdentity(tx);
  if (!identity) return false;
  const amount = Number(tx.amount || 0);
  const matches = (pool || allTransactions || []).filter(other => {
    if (!other || other === tx) return false;
    const otherAmount = Number(other.amount || 0);
    if (!otherAmount || (otherAmount > 0) === (amount > 0)) return false;
    if (Math.abs(Math.abs(otherAmount) - Math.abs(amount)) > 0.01) return false;
    const otherIdentity = getTransferNettingIdentity(other);
    return !!otherIdentity && otherIdentity.key === identity.key;
  });
  return identity.generic ? matches.length === 1 : matches.length > 0;
}

function getTransferNettingGroup(tx) {
  if (!tx || isExcludedFromSpendingStats(tx)) return null;
  return getTransferNettingIdentity(tx);
}

function invalidateTransactionStatsAdjustments() {
  transactionStatsAdjustmentsCachePool = null;
  transactionStatsAdjustmentsCacheResult = null;
}