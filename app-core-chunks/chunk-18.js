// Generated app-core slice 18/34 (declarations).

function renderTransactionTotals(txns) {
  const totals = buildTransactionTotals(txns);
  const direction = activeDirection || 'all';

  const rows = [];

  if (direction === 'incoming') {
    rows.push(`
      <div class="txn-total-row">
        <div class="txn-total-label">${t('totalIncoming')}</div>
        <div class="txn-total-values">${renderTotalsValueLines(totals.incoming, 'income')}</div>
      </div>
    `);
  } else if (direction === 'outgoing') {
    rows.push(`
      <div class="txn-total-row">
        <div class="txn-total-label">${t('totalOutgoing')}</div>
        <div class="txn-total-values">${renderTotalsValueLines(totals.outgoing, 'expense')}</div>
      </div>
    `);
  } else {
    rows.push(`
      <div class="txn-total-row">
        <div class="txn-total-label">${t('totalIncoming')}</div>
        <div class="txn-total-values">${renderTotalsValueLines(totals.incoming, 'income')}</div>
      </div>
    `);

    rows.push(`
      <div class="txn-total-row">
        <div class="txn-total-label">${t('totalOutgoing')}</div>
        <div class="txn-total-values">${renderTotalsValueLines(totals.outgoing, 'expense')}</div>
      </div>
    `);

    rows.push(`
      <div class="txn-total-row">
        <div class="txn-total-label">${t('totalNet')}</div>
        <div class="txn-total-values">${renderTotalsValueLines(totals.net, 'neutral')}</div>
      </div>
    `);
  }

  return `
    <div class="txn-totals-card ${direction !== 'all' ? 'filtered-direction' : ''}">
      <div class="txn-totals-head">
        <div class="txn-totals-title">${t('transactionTotals')}</div>
        <div class="txn-totals-count">${t('filteredTransactions')}: ${totals.count}</div>
      </div>
      <div class="txn-totals-grid">
        ${rows.join('')}
      </div>
      <div class="txn-totals-hint">${t('totalsHint')}</div>
    </div>
  `;
}


function resetTxnVisibleLimit() {
  txnVisibleLimit = TXN_PAGE_SIZE;
}

function showMoreTransactions() {
  txnVisibleLimit += TXN_PAGE_SIZE;
  updateTxnPage();
}

function renderTransactionPagingInfo(visibleCount, totalCount) {
  if (totalCount === 0) return '';

  return `
    <div class="txn-list-counter">
      <span>${t('showingTransactions')} <strong>${visibleCount}</strong> ${t('ofTransactions')} ${totalCount}</span>
      <span>${t('transactionsCountLabel')}</span>
    </div>
    ${totalCount > TXN_PAGE_SIZE ? `<div class="txn-render-note">${t('renderedForSpeed')}</div>` : ''}
  `;
}

function renderShowMoreTransactionsButton(visibleCount, totalCount) {
  if (visibleCount >= totalCount) return '';

  const remaining = totalCount - visibleCount;
  const nextCount = Math.min(TXN_PAGE_SIZE, remaining);

  return `
    <div class="txn-show-more-wrap">
      <button class="txn-show-more-btn" onclick="showMoreTransactions()">${t('showMore')} +${nextCount}</button>
    </div>
  `;
}


function hasActiveTransactionDateRange() {
  return !!(activeDateFrom || activeDateTo);
}

function hasActiveTransactionMonthFilter() {
  return !!String(activeMonthFilter || '').trim();
}

function isCurrentTransactionMonth(tx) {
  return normalizeMonthStr(tx?.month || '') === normalizeMonthStr(getAktuálneMonth());
}

function filterTransactionsByHistoryScope(txns) {
  if (hasActiveTransactionDateRange() || hasActiveTransactionMonthFilter()) return txns;
  if (activeTxnHistoryScope === 'all') return txns;
  return txns.filter(isCurrentTransactionMonth);
}

function loadOlderTransactions() {
  activeTxnHistoryScope = 'all';
  resetTxnVisibleLimit();
  updateTxnPage();
}

function renderTransactionHistoryNote() {
  if (activeRecurringGroupFilter && typeof renderRecurringGroupFilterNote === 'function') {
    return renderRecurringGroupFilterNote();
  }
  if (hasActiveTransactionDateRange() || hasActiveTransactionMonthFilter()) {
    return `<div class="txn-history-note">${t('dateRangeOverridesMonth')}</div>`;
  }

  if (activeTxnHistoryScope === 'all') {
    return `<div class="txn-history-note">${t('olderDataLoaded')}</div>`;
  }

  return `<div class="txn-history-note">${t('currentMonthOnly')} ${t('olderDataHint')}</div>`;
}

function renderLoadOlderTransactionsButton(olderCount) {
  if (hasActiveTransactionDateRange() || hasActiveTransactionMonthFilter()) return '';
  if (activeTxnHistoryScope === 'all') return '';
  if (!olderCount) return '';

  return `
    <div class="txn-load-older-wrap">
      <button class="txn-load-older-btn" onclick="loadOlderTransactions()">${t('loadOlderData')} (${olderCount})</button>
    </div>
  `;
}

function toggleTransactionFilterPanel() {
  txnFilterPanelOpen = !txnFilterPanelOpen;
  if (txnFilterPanelOpen) openSheet('txn-filter-sheet');
  else closeBottomSheets();
  updateTransactionFilterPanelUi();
}

function collapseTransactionFilterPanel() {
  txnFilterPanelOpen = false;
  closeBottomSheets();
  updateTransactionFilterPanelUi();
}

function updateTransactionFilterPanelUi() {
  const sheet = document.getElementById('txn-filter-sheet');
  const isOpen = !!(sheet && sheet.classList.contains('open'));
  txnFilterPanelOpen = isOpen;
  const toggle = document.getElementById('txn-filter-toggle');
  if (toggle) toggle.classList.toggle('active', isOpen);
  updateTransactionFilterSummary();
}

function getBankFilterLabel(bankKey) {
  if (!bankKey || bankKey === 'všetky') return t('all');
  return getBankInfo(bankKey)?.label || bankKey;
}

function getPaymentKindFilterLabel(kind) {
  if (kind === 'card') return t('cardsOnly');
  if (kind === 'account') return t('accountsOnly');
  if (kind === 'cash') return t('cashOnly');
  if (kind === 'internal') return t('internalTransfers');
  return t('all');
}

function parseWidgetMultiSelectValue(value) {
  if (value === undefined || value === null || value === '') return [];
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  const raw = String(value).trim();
  if (!raw || raw === 'all') return [];
  return raw.split(/[,;|]+/).map(v => v.trim()).filter(Boolean);
}

function serializeWidgetMultiSelectValue(values) {
  const list = Array.isArray(values) ? values : parseWidgetMultiSelectValue(values);
  const unique = [...new Set(list.filter(Boolean))];
  return unique.length ? unique.join(',') : 'all';
}

function hasWidgetMultiFilter(value) {
  return parseWidgetMultiSelectValue(value).length > 0;
}

function getWidgetPaymentKindSummaryLabel(paymentKindValue) {
  const kinds = parseWidgetMultiSelectValue(paymentKindValue);
  if (!kinds.length) return '';
  return kinds.map(kind => getPaymentKindFilterLabel(kind === 'account' ? 'account' : kind)).join(', ');
}

function getWidgetAccountSummaryLabel(accountValue) {
  const accounts = parseWidgetMultiSelectValue(accountValue);
  if (!accounts.length) return '';
  return accounts.map(id => plainBankName(id) || id).join(', ');
}

function widgetPaymentKindMatches(tx, paymentKindValue) {
  const kinds = parseWidgetMultiSelectValue(paymentKindValue);
  if (!kinds.length) return true;
  return kinds.some(kind => {
    if (kind === 'card') return isCardTransaction(tx);
    if (kind === 'account') return isAccountTransaction(tx) && !isInternalTransferForFiltering(tx);
    if (kind === 'cash') return isCashTransaction(tx);
    if (kind === 'internal') return isInternalTransferForFiltering(tx);
    return false;
  });
}

function widgetAccountMatches(tx, accountValue) {
  const accounts = parseWidgetMultiSelectValue(accountValue);
  if (!accounts.length) return true;
  let bankKey = '';
  try { bankKey = getBudgetBankKeyFromTransaction(tx); } catch (_) {}
  if (!bankKey) {
    try { bankKey = getBankKey(tx); } catch (_) {}
  }
  return accounts.some(id => id === bankKey || id === tx?.bankId || id === tx?.bank);
}

function getCustomWidgetPaymentKindSelection() {
  return [...document.querySelectorAll('#cw-payment-kind-grid .custom-widget-choice.active')]
    .map(btn => String(btn.dataset.value || '').trim())
    .filter(Boolean);
}

function setCustomWidgetPaymentKindSelection(value) {
  const kinds = parseWidgetMultiSelectValue(value);
  document.querySelectorAll('#cw-payment-kind-grid .custom-widget-choice').forEach(btn => {
    btn.classList.toggle('active', kinds.length ? kinds.includes(btn.dataset.value) : false);
  });
  const hidden = document.getElementById('cw-payment-kind');
  if (hidden) hidden.value = serializeWidgetMultiSelectValue(kinds);
}

function toggleCustomWidgetPaymentKind(kind) {
  const btn = document.querySelector(`#cw-payment-kind-grid .custom-widget-choice[data-value="${kind}"]`);
  if (!btn) return;
  btn.classList.toggle('active');
  const hidden = document.getElementById('cw-payment-kind');
  if (hidden) hidden.value = serializeWidgetMultiSelectValue(getCustomWidgetPaymentKindSelection());
  if (typeof updateCustomWidgetBuilderPreview === 'function') updateCustomWidgetBuilderPreview();
}

function getCustomWidgetAccountSelection() {
  return [...document.querySelectorAll('#cw-account-grid .custom-widget-choice.active')]
    .map(btn => String(btn.dataset.value || '').trim())
    .filter(Boolean);
}

function setCustomWidgetAccountSelection(value) {
  const ids = parseWidgetMultiSelectValue(value);
  document.querySelectorAll('#cw-account-grid .custom-widget-choice').forEach(btn => {
    btn.classList.toggle('active', ids.length ? ids.includes(btn.dataset.value) : false);
  });
  const hidden = document.getElementById('cw-account');
  if (hidden) hidden.value = serializeWidgetMultiSelectValue(ids);
}

function toggleCustomWidgetAccount(bankId) {
  const btn = document.querySelector(`#cw-account-grid .custom-widget-choice[data-value="${bankId}"]`);
  if (!btn) return;
  btn.classList.toggle('active');
  const hidden = document.getElementById('cw-account');
  if (hidden) hidden.value = serializeWidgetMultiSelectValue(getCustomWidgetAccountSelection());
  if (typeof updateCustomWidgetBuilderPreview === 'function') updateCustomWidgetBuilderPreview();
}

function getCustomWidgetAccountStorageValue() {
  const hidden = document.getElementById('cw-account');
  if (hidden && hidden.value) return hidden.value;
  return serializeWidgetMultiSelectValue(getCustomWidgetAccountSelection());
}

function getCustomWidgetPaymentKindStorageValue() {
  const hidden = document.getElementById('cw-payment-kind');
  if (hidden && hidden.value) return hidden.value;
  return serializeWidgetMultiSelectValue(getCustomWidgetPaymentKindSelection());
}

function getDirectionFilterLabel(direction) {
  if (direction === 'incoming') return t('incoming');
  if (direction === 'outgoing') return t('outgoing');
  return t('all');
}

function updateTransactionFilterSummary() {
  const wrap = document.getElementById('txn-filter-summary');
  if (!wrap) return;
  // v291: keep header clean - summary chips are intentionally hidden.
  wrap.innerHTML = '';
  wrap.style.display = 'none';
  return;
  const chips = [];
  if (activeDateFrom || activeDateTo) chips.push(activeDateFrom && activeDateTo ? `${activeDateFrom}–${activeDateTo}` : (activeDateFrom || activeDateTo));
  if (activeDirection && activeDirection !== 'all') chips.push(getDirectionFilterLabel(activeDirection));
  if (activePaymentKind && activePaymentKind !== 'all') chips.push(getPaymentKindFilterLabel(activePaymentKind));
  if (activeCardLast4) chips.push(getCardSourceLabelByLast4(activeCardLast4) || activeCardLast4);
  if (activeTxnTag && activeTxnTag !== 'all') chips.push(txnTagKeyToLabel[activeTxnTag] || 'Tag');
  if (activeCategory && activeCategory !== 'všetky') chips.push(translateCategory(activeCategory));
  wrap.innerHTML = chips.slice(0, 4).map(label => `<span class="txn-filter-summary-chip">${escapeHtml(label)}</span>`).join('');
}

function getTxnDayDisplay(tx) {
  const parsed = parseCustomDateStr(tx?.rawDate || tx?.date);
  if (!parsed || isNaN(parsed.getTime())) {
    const fallback = (tx?.date || '').split(' ')[0] || '';
    return fallback.replace(/^0?(\d{1,2})\.0?(\d{1,2})\.(\d{4})$/, '$1.$2.$3');
  }
  return `${parsed.getDate()}.${parsed.getMonth() + 1}.${parsed.getFullYear()}`;
}

function getTxnTimeDisplay(tx) {
  const parsed = parseCustomDateStr(tx?.rawDate || tx?.date);
  if (!parsed || isNaN(parsed.getTime())) {
    const parts = String(tx?.date || '').split(' ');
    return parts[1] || '';
  }
  return `${String(parsed.getHours()).padStart(2,'0')}:${String(parsed.getMinutes()).padStart(2,'0')}`;
}

function getCardSourceLabelByLast4(last4) {
  const value = String(last4 || '').replace(/\D/g, '').slice(-4);
  return value || '';
}

function getPaymentSourceMasked(tx) {
  const raw = String(tx?.card || '').trim();
  if (!raw) return '';
  if (/cash/i.test(raw)) return raw;
  const accountMatch = raw.match(/(\d{1,10})\s*\/\s*(\d{4})/);
  if (accountMatch) return `${accountMatch[1]}/${accountMatch[2]}`;
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 4) return digits.slice(-4);
  return raw.replace(/^Karta\s*/i, '').replace(/^Card\s*/i, '').replace(/^Účet\s*/i, '').replace(/^Ucet\s*/i, '').trim() || raw;
}

function transactionMatchesCardLast4(tx, last4) {
  const target = String(last4 || '').replace(/\D/g, '').slice(-4);
  if (!target) return true;
  const cardText = String(tx?.card || '').toLowerCase();
  const typeText = String(tx?.type || '').toLowerCase();
  const merchantText = String(tx?.merchant || '').toLowerCase();
  const bankText = String(tx?.bank || tx?.banka || '').toLowerCase();
  const digits = cardText.replace(/\D/g, '');
  if (digits.endsWith(target) || cardText.includes(target)) return true;
  const creditCard = getCsobCzCreditCardLast4();
  if (creditCard && target === creditCard) {
    const combined = `${cardText} ${typeText} ${merchantText} ${bankText}`;
    return combined.includes('csob cz credit card') || combined.includes('splátka kredit') || combined.includes('splatka kredit') || combined.includes('kreditní kart') || combined.includes('kreditni kart');
  }
  return false;
}

function togglePaymentSourceDetail(el) {
  if (!el) return;
  const label = el.getAttribute('data-label') || el.textContent || '';
  const source = el.getAttribute('data-source') || '';
  const opened = el.classList.toggle('opened');
  el.textContent = opened && source ? `${label} ${source}` : label;
}

/* v4400: is this an account transfer (vs a card payment)? */
function txIsAccountTransferV4400(tx) {
  const k = String(tx && tx.paymentKind || '').toLowerCase();
  if (k === 'account' || k === 'transfer') return true;
  if (k === 'card') return false;
  const ty = String(tx && tx.type || '').toLowerCase();
  return /odchod\s*z|příjem\s*na|prijem\s*na|úhrada|uhrada|převod|prevod|transfer|trval|inkas|sepa/.test(ty);
}

function getTransactionCounterpartyAccountV4400(tx) {
  return String(
    (tx && (tx.counterpartyAccount || tx.counterpartyIban || tx.otherAccount
      || tx.beneficiaryAccount || tx.recipientAccount || tx.senderAccount
      || tx.toAccount || tx.fromAccount)) || ''
  ).trim().replace(/\s+/g, '');
}

/* The account shown under a transfer: recipient account for an outgoing
   payment, sender account for an incoming one. Returns { text, source } where
   `source` is the arrow-prefixed account for the toggled detail, or null when
   there is no counterparty account (falls back to the own payment source). */
function getTransactionTransferAccountDisplayV4400(tx) {
  if (!tx || !txIsAccountTransferV4400(tx)) return null;
  const acct = getTransactionCounterpartyAccountV4400(tx);
  if (!acct) return null;
  const incoming = Number(tx.amount) > 0;
  return { source: (incoming ? '← ' : '→ ') + acct, account: acct, incoming };
}

function matchesActiveBankFilter(tx, bankKey) {
  if (!bankKey || bankKey === 'všetky') return true;
  const key = typeof getArchiveBankKeyFromTransaction === 'function'
    ? getArchiveBankKeyFromTransaction(tx)
    : getBankKey(tx);
  if (bankKey === 'csob_cz') return key === 'csob_cz' || key === 'csob_cz_credit';
  if (key === bankKey) return true;
  try {
    const hay = [tx?.card, tx?.account, tx?.paymentSource, tx?.source, tx?.bank, tx?.type, tx?.merchant]
      .map(v => String(v || '').toLowerCase())
      .join(' ');
    const identifiers = [
      getStoredSystemBankAccount(bankKey),
      ...(getStoredSystemBankCards(bankKey, { includeCreditChild: false }) || [])
    ].map(v => String(v || '').trim()).filter(Boolean);
    return identifiers.some(raw => {
      const lower = raw.toLowerCase();
      const digits = raw.replace(/\D/g, '');
      if (lower && hay.includes(lower)) return true;
      if (/\/\s*\d{4}/.test(raw)) {
        const accountDigits = String(raw).split('/')[0].replace(/\D/g, '');
        return !!accountDigits && hay.includes(accountDigits);
      }
      return digits.length >= 4 && hay.includes(digits.slice(-4));
    });
  } catch (_) {
    return false;
  }
}

function makeCreditCardRepaymentDisplayTx(tx) {
  const creditCard = getCsobCzCreditCardLast4();
  if (!activeCardLast4 || !creditCard || String(activeCardLast4) !== creditCard) return tx;
  if (!transactionMatchesCardLast4(tx, creditCard) || !isCsobCzCreditCardRepaymentTx(tx)) return tx;
  const amount = Math.abs(Number(tx.amount || 0));
  return {
    ...tx,
    id: String(tx.id || tx.msgId || '') + '_credit_card_view',
    msgId: String(tx.msgId || tx.id || '') + '_credit_card_view',
    amount: amount,
    card: `${getLanguage() === 'en' ? 'Card' : 'Karta'} ${creditCard}`,
    paymentKind: 'card',
    type: 'credit card repayment to card',
    bank: 'ČSOB CZ credit card',
    bankId: 'csob_cz_credit'
  };
}

function prepareTransactionsForCurrentView(txns) {
  const creditCard = getCsobCzCreditCardLast4();
  if (activeBank === 'csob_cz' && creditCard && String(activeCardLast4 || '') === creditCard) {
    return (txns || []).map(makeCreditCardRepaymentDisplayTx);
  }
  return txns || [];
}

function normalizeTransactionDedupeDateKey(tx) {
  const raw = tx?.rawDate || tx?.date || '';
  const parsed = parseCustomDateStr(raw);
  if (parsed && !isNaN(parsed.getTime())) {
    return [
      parsed.getFullYear(),
      String(parsed.getMonth() + 1).padStart(2, '0'),
      String(parsed.getDate()).padStart(2, '0'),
      String(parsed.getHours()).padStart(2, '0'),
      String(parsed.getMinutes()).padStart(2, '0')
    ].join('-');
  }
  return String(raw || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeTransactionDedupeTextKey(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTransactionViewSemanticKey(tx, forceCardLast4) {
  const cardKey = String(forceCardLast4 || getPaymentSourceMasked(tx) || '').replace(/\D/g, '').slice(-4);
  const normalizedBank = getBankKey(tx) === 'csob_cz_credit' ? 'csob_cz' : getBankKey(tx);
  return [
    normalizeMonthStr(tx?.month || ''),
    normalizeTransactionDedupeDateKey(tx),
    normalizeTransactionDedupeTextKey(tx?.merchant || tx?.merchantRaw || ''),
    Math.abs(Number(tx?.amount || 0)).toFixed(2),
    currencyCode(tx?.currency || ''),
    normalizedBank,
    cardKey || getPaymentSourceMasked(tx)
  ].join('|');
}

function getTransactionViewDedupeKey(tx) {
  // In the ČSOB CZ card 9344 view the same credit-card repayment can enter the UI
  // through two representations: account-side row and credit-card-side display row.
  // Do not use msgId first here, because those two rows may have different IDs.
  const creditCard = getCsobCzCreditCardLast4();
  if (activeBank === 'csob_cz' && creditCard && String(activeCardLast4 || '') === creditCard) {
    return 'csob_credit:' + getTransactionViewSemanticKey(tx, creditCard);
  }

  const rawId = String(tx?.msgId || tx?.id || '').replace(/_credit_card_view$/, '').trim();
  if (rawId) return 'id:' + rawId;
  return 'semantic:' + getTransactionViewSemanticKey(tx);
}