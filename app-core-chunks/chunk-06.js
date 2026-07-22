// Generated app-core slice 6/6 (merged).

async function testGoogleSheetsEndpointFromApp() {
  const status = document.getElementById('limits-sync-status');
  getCurrentWebAppUrl();
  if (!LIMITS_WEBAPP_URL || !isValidAppsScriptExecUrl(LIMITS_WEBAPP_URL)) {
    if (status) status.textContent = 'Najprv ulož platnú Apps Script /exec URL (zelená fajka pri poli).';
    return false;
  }
  const where = isLikelyIOSWebKit() ? 'iPhone WebKit' : 'tento prehliadač';
  if (status) status.textContent = 'Testujem Apps Script cez ' + where + '...';
  const result = await endpointMutationRequest('debugEcho', { probe: 'bank-tracker', from: where }, 20000);
  const data = result && result.data || {};
  const version = String(data.version || '').trim();
  const shortVersion = version ? version.split('_')[0] : '';
  if (result.ok) {
    if (status) {
      status.textContent = shortVersion
        ? ('Server OK (' + shortVersion + ' = verzia parsera, nie chyba). Z appky sa Apps Script dá volať — skús uložiť transakciu.')
        : ('Test OK z ' + where + '. Skús uložiť transakciu.');
    }
    return true;
  }
  if (status) status.textContent = getEndpointFailureDetail('debugEcho', result);
  return false;
}

async function postToBankTrackerEndpoint(action, payload = {}) {
  const url = getCurrentWebAppUrl();
  const status = document.getElementById('limits-sync-status');
  const confirmWrite = !!(payload && payload._confirmWrite);
  const fireAndForgetSave = !confirmWrite && (action === 'saveTransaction' || action === 'saveBank' || action === 'saveLoan');
  const useSerializedQueue = ENDPOINT_SERIALIZED_ACTIONS.has(action);
  const runMutation = async (mutationTimeoutMs) => {
    if (useSerializedQueue) {
      const ok = await enqueueEndpointMutation(action, payload, mutationTimeoutMs);
      return { ok, result: { ok, data: ok ? { status: 'success' } : { status: 'error' } } };
    }
    const result = await endpointMutationRequest(action, payload, mutationTimeoutMs);
    return { ok: !!(result && result.ok), result };
  };

  if (!url) {
    console.warn('Apps Script Web App URL is not configured.');
    if (status && !fireAndForgetSave) status.textContent = 'Web App URL nie je nastavená. Dáta sú uložené iba lokálne.';
    return false;
  }
  if (!isValidAppsScriptExecUrl(url)) {
    console.warn('Invalid Apps Script Web App URL. Use /exec deployment URL, not editor URL.');
    if (status && !fireAndForgetSave) status.textContent = 'Používaš nesprávnu Apps Script URL. Potrebuješ Web App /exec URL.';
    return false;
  }

  if (status && !fireAndForgetSave) status.textContent = getEndpointStatusMessage(action, 'pending');

  // v155: save/delete transaction can take longer because the backend now also
  // updates balance, monthly stats, notification logs and FCM token cleanup.
  // A short timeout made the app show "transaction failed" even when Apps Script
  // had already written the row to Google Sheets successfully.
  const mutationTimeoutMs = isLikelyIOSWebKit() || confirmWrite || ['saveTransaction', 'deleteTransaction', 'saveBankSettings'].includes(action) ? 60000 : 15000;
  if (fireAndForgetSave) {
    runMutation(mutationTimeoutMs).then(({ ok, result }) => {
      if (ok) {
        console.log('Google Sheets async mutation OK:', action, result && result.data);
        queueParserRunAfterMutation(action);
      } else {
        console.warn('Google Sheets async mutation failed:', action, result && result.data ? result.data : {});
      }
    }).catch(err => {
      console.warn('Google Sheets async mutation error:', action, err);
    });
    return true;
  }

  const { ok, result } = await runMutation(mutationTimeoutMs);
  if (ok) {
    if (status) status.textContent = getEndpointStatusMessage(action, 'success');
    console.log('Google Sheets mutation OK:', action, result && result.data);
    if (action === 'saveTransaction' || action === 'saveBank' || action === 'saveLoan') {
      queueParserRunAfterMutation(action);
    }
    return true;
  }

  console.error('Google Sheets mutation failed:', action, JSON.stringify(result && result.data || {}));
  if (status) status.textContent = getEndpointFailureDetail(action, result);
  return false;
}

function extractTxnPayload(tx) {
  const variableSymbol = String(tx.variableSymbol || tx.vs || tx.specificSymbol || '').replace(/\D/g, '').trim();
  const tagMeta = parseTransactionTagMeta(tx);
  return {
    id: tx.id || '',
    date: tx.date || '',
    amount: Number(tx.amount || 0),
    currency: tx.currency || 'CZK',
    merchant: tx.merchant || '',
    category: tx.category || '',
    card: tx.card || '',
    type: tx.type || '',
    month: tx.month || '',
    bank: tx.bank || '',
    bankId: tx.bankId || getBankKey(tx) || '',
    rawDate: tx.rawDate || '',
    paymentKind: tx.paymentKind || getTransactionPaymentKind(tx),
    msgId: tx.msgId || tx.id || '',
    variableSymbol: variableSymbol,
    vs: variableSymbol,
    tag: tagMeta ? JSON.stringify(tagMeta) : '',
    tagLabel: tagMeta ? tagMeta.name : '',
    tagName: tagMeta ? tagMeta.name : '',
    tagColor: tagMeta ? tagMeta.color : '',
    tagShape: tagMeta ? tagMeta.shape : '',
    excludeFromSpent: !!tx.excludeFromSpent,
    returnForTransactionId: String(tx.returnForTransactionId || tx.returnForId || '').trim(),
    recurring_group_id: String(tx.recurring_group_id || '').trim() || null,
    counterpartyAccount: String(tx.counterpartyAccount || '').trim()
  };
}

function askDeleteTransaction(txId) {
  if (!txId) return;

  const lang = getLanguage ? getLanguage() : 'en';
  const message = lang === 'sk'
    ? 'Vymazať túto transakciu?'
    : (lang === 'cs' ? 'Smazat tuto transakci?' : 'Delete this transaction?');

  if (confirm(message)) {
    deleteSingleTransaction(txId).then(ok => {
      if (ok) showDeletedToast();
    });
  }
}


function txEditEscapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

function getTxEditCategoryOptions(selectedCategory = '') {
  if (typeof getCategoryOptionsHtml === 'function') {
    return getCategoryOptionsHtml(selectedCategory);
  }

  const categories = ['Domácnosť','Potraviny','Pohonné hmoty','Reštaurácie','Káva','Doprava','Zdravie','Drogéria','Dom','Šport','Zábava','Predplatné','Oblečenie','Obuv','Jedlo','Bývanie','Lekáreň','Účet','Bankomat','Ostatné'];
  return categories.map(category => {
    const label = typeof translateCategory === 'function' ? translateCategory(category) : category;
    return `<option value="${txEditEscapeHtml(category)}" ${selectedCategory === category ? 'selected' : ''}>${txEditEscapeHtml(label)}</option>`;
  }).join('');
}

function getTxEditBankOptions(selectedValue = '') {
  if (typeof getAllBankOptions === 'function') {
    return getAllBankOptions(selectedValue);
  }

  return BANK_ORDER.map(key => {
    const name = plainBankName(key);
    return `<option value="${key}" ${selectedValue === key ? 'selected' : ''}>${txEditEscapeHtml(name)}</option>`;
  }).join('');
}

function getTxEditBankName(bankKey) {
  if (typeof getBankNameFromOption === 'function') return getBankNameFromOption(bankKey);
  return plainBankName(bankKey);
}

function getTxEditBankAccount(bankKey) {
  if (typeof getBankAccountFromOption === 'function') return getBankAccountFromOption(bankKey);
  return plainBankName(bankKey);
}


// ── SAFE TRANSACTION EDIT FROM TRANSACTIONS + RECENT LISTS ──
function getTransactionId(tx) {
  return String(tx?.id || tx?.msgId || '');
}

function findTransactionById(txId) {
  return allTransactions.find(tx => String(tx.id || tx.msgId || '') === String(txId));
}


function getEditedPaymentMeta(tx, paymentKind, direction, bankKey, bankName) {
  const kind = paymentKind || 'card';
  const isIncoming = direction === 'incoming';
  const previousKind = getTransactionPaymentKind(tx);
  const existingCard = String(tx?.card || '').trim();

  if (kind === 'cash') {
    if (isAtmCashWithdrawalTransaction(tx)) {
      const existingType = String(tx?.type || '').trim();
      const safeType = normalizePaymentKindValue(existingType) === 'internal'
        ? 'ATM cash withdrawal'
        : (existingType || 'ATM cash withdrawal');
      return {
        card: existingCard || 'Cash',
        type: safeType
      };
    }
    return {
      card: 'Cash',
      type: t('cashPaymentKind')
    };
  }

  if (kind === 'internal') {
    return {
      card: existingCard || getTxEditBankAccount(bankKey) || `Account ${bankName}`,
      type: 'Internal transfer'
    };
  }

  if (kind === 'account') {
    const customBank = getCustomBanks().find(b => b.id === bankKey);
    const account = customBank?.account || '';

    return {
      card: previousKind === 'account' && existingCard ? existingCard : (account || `Účet ${bankName}`),
      type: isIncoming ? 'príjem na účet' : 'odchod z účtu'
    };
  }

  return {
    card: previousKind === 'card' && existingCard ? existingCard : `Karta ${bankName}`,
    type: 'platba kartou'
  };
}

function hasScrolledPastNthItem(containerSelector, itemSelector, index = 19, rootElement = null) {
  const container = document.querySelector(containerSelector);
  if (!container) return false;

  const items = container.querySelectorAll(itemSelector);
  if (items.length <= index) return false;

  const target = items[index];
  const targetRect = target.getBoundingClientRect();

  if (rootElement) {
    const rootRect = rootElement.getBoundingClientRect();
    return targetRect.top < rootRect.top + 72;
  }

  return targetRect.top < 110;
}

function shouldShowScrollToLatestButton() {
  const archiveSheet = document.querySelector('#archive-bank-detail-sheet.open');
  if (archiveSheet) {
    return hasScrolledPastNthItem('#archive-bank-detail-sheet', '[data-archive-tx-id]', 19, archiveSheet);
  }

  const pageId = getActivePageId ? getActivePageId() : activePageId;

  if (pageId === 'txns') {
    return hasScrolledPastNthItem('#txn-list', '.tx-item', 19);
  }

  if (pageId === 'archive') {
    return hasScrolledPastNthItem('#archive-months-list', '.archive-item', 9);
  }

  return false;
}

function isActivePageBottomContentVisible() {
  const activePage = document.querySelector('.page.active');
  if (!activePage) return false;
  const vh = window.innerHeight || document.documentElement.clientHeight || 0;
  const doc = document.documentElement;
  const body = document.body;
  const scrollTop = window.scrollY || doc.scrollTop || body.scrollTop || 0;
  const fullHeight = Math.max(body.scrollHeight || 0, doc.scrollHeight || 0, body.offsetHeight || 0, doc.offsetHeight || 0);
  if (!fullHeight || fullHeight <= vh + 80) return false;
  return (scrollTop + vh) >= (fullHeight - 220);
}

function isTransactionBottomContentVisible() {
  // Kept for compatibility with older calls; now dims the utility buttons near the bottom of any tab.
  return isActivePageBottomContentVisible();
}

function updateFloatingUtilityButtons() {
  const btn = document.getElementById('scroll-top-fab');
  const fab = document.getElementById('global-fab');
  const activeSheet = document.body?.dataset?.activeSheet || '';
  const hasSheetOpen = document.body.classList.contains('sheet-open') || !!document.querySelector('.bottom-sheet.open');
  const hideUtilities = hasSheetOpen || activeSheet === 'bank-manager-sheet' || !!massTagSelectMode;
  const showScroll = !hideUtilities && shouldShowScrollToLatestButton();
  const dimUtilities = !hideUtilities && isActivePageBottomContentVisible();

  if (btn) {
    btn.classList.toggle('visible', showScroll);
    btn.classList.toggle('utility-hidden', hideUtilities);
  }
  if (fab) {
    fab.classList.toggle('utility-dim', dimUtilities);
    fab.classList.toggle('utility-hidden', hideUtilities);
  }
}

function scheduleFloatingUtilityUpdate() {
  if (window.__floatingUtilityUpdateRaf) return;

  window.__floatingUtilityUpdateRaf = requestAnimationFrame(() => {
    window.__floatingUtilityUpdateRaf = null;
    updateFloatingUtilityButtons();
  });
}

function bindFloatingUtilityScrollWatchers() {
  if (window.__floatingUtilityScrollWatchersReady) return;
  window.__floatingUtilityScrollWatchersReady = true;

  window.addEventListener('scroll', scheduleFloatingUtilityUpdate, { passive: true });
  document.addEventListener('scroll', scheduleFloatingUtilityUpdate, { passive: true, capture: true });
  window.addEventListener('resize', scheduleFloatingUtilityUpdate, { passive: true });

  if (window.visualViewport) {
    visualViewport.addEventListener('resize', scheduleFloatingUtilityUpdate, { passive: true });
    visualViewport.addEventListener('scroll', scheduleFloatingUtilityUpdate, { passive: true });
  }
}


function easeOutCubicScroll(t) {
  return 1 - Math.pow(1 - t, 3);
}

function getWindowScrollTopValue() {
  return window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function setWindowScrollTopValue(value) {
  window.scrollTo(0, value);
  document.documentElement.scrollTop = value;
  document.body.scrollTop = value;
}

function smoothScrollContainerToTop(target, duration = 360) {
  const isWindow = target === window || target === document || target === document.documentElement || target === document.body;
  const start = isWindow ? getWindowScrollTopValue() : Number(target?.scrollTop || 0);

  if (start <= 1) {
    if (isWindow) setWindowScrollTopValue(0);
    else if (target) target.scrollTop = 0;
    scheduleFloatingUtilityUpdate();
    return;
  }

  const startTime = performance.now();

  const step = (now) => {
    const progress = Math.min((now - startTime) / duration, 1);
    const next = Math.round(start * (1 - easeOutCubicScroll(progress)));

    if (isWindow) setWindowScrollTopValue(next);
    else target.scrollTop = next;

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      if (isWindow) setWindowScrollTopValue(0);
      else target.scrollTop = 0;
      scheduleFloatingUtilityUpdate();
    }
  };

  requestAnimationFrame(step);
}

function scrollToLatestVisibleTransaction() {
  const archiveSheet = document.querySelector('#archive-bank-detail-sheet.open');
  const anyOpenSheet = document.querySelector('.bottom-sheet.open');

  if (archiveSheet) {
    smoothScrollContainerToTop(archiveSheet, 360);
    return;
  }

  if (anyOpenSheet) {
    smoothScrollContainerToTop(anyOpenSheet, 360);
    return;
  }

  const pageId = getActivePageId ? getActivePageId() : activePageId;
  const activePage = document.getElementById('page-' + pageId);

  if (activePage && activePage.scrollTop > 2) {
    smoothScrollContainerToTop(activePage, 360);
  }

  smoothScrollContainerToTop(window, 380);
}

function fillEditTransactionSheet(txId) {
  const tx = findTransactionById(txId);
  if (!tx) return false;

  const amount = Number(tx.amount || 0);
  const parsed = parseCustomDateStr(tx.rawDate || tx.date);
  const bankKey = getBankKey(tx);

  document.getElementById('edit-tx-id').value = getTransactionId(tx);
  document.getElementById('edit-tx-date').value = toDateInputValue(parsed);
  document.getElementById('edit-tx-merchant').value = tx.merchant || '';
  const txVs = String(tx.variableSymbol || tx.vs || '').replace(/\D/g, '').trim();
  const editVsInput = document.getElementById('edit-tx-vs');
  if (editVsInput) editVsInput.value = txVs;
  const txTag = parseTransactionTagMeta(tx);
  const editTagInput = document.getElementById('edit-tx-tag');
  if (editTagInput) editTagInput.value = txTag?.name || '';
  const editTagColor = document.getElementById('edit-tx-tag-color');
  if (editTagColor) {
    editTagColor.value = (txTag?.color || '#58A6FF').toLowerCase();
    editTagColor.dataset.userPicked = txTag?.name ? '1' : '0';
  }
  const editTagShape = document.getElementById('edit-tx-tag-shape');
  if (editTagShape) editTagShape.value = txTag?.shape || '';
  const sourceBadge = document.getElementById('edit-tx-detect-source');
  if (sourceBadge) {
    const source = getInternalTransferDetectionSource(tx);
    sourceBadge.style.display = source ? 'inline-flex' : 'none';
    sourceBadge.textContent = source || '';
    sourceBadge.classList.toggle('source-parser', source === 'P');
    sourceBadge.classList.toggle('source-fallback', source === 'F');
    sourceBadge.title = source === 'P' ? 'Parser-detected internal transfer' : (source === 'F' ? 'Fallback-detected internal transfer' : '');
  }
  document.getElementById('edit-tx-amount').value = Math.abs(amount);
  document.getElementById('edit-tx-direction').value = amount >= 0 ? 'incoming' : 'outgoing';
  fillCurrencySelect(document.getElementById('edit-tx-currency'), tx.currency || 'CZK');

  const catSelect = document.getElementById('edit-tx-category');
  if (catSelect) {
    catSelect.innerHTML = getTxEditCategoryOptions(tx.category || 'Ostatné');
    if ([...catSelect.options].some(option => option.value === tx.category)) catSelect.value = tx.category;
  }

  const bankSelect = document.getElementById('edit-tx-bank');
  if (bankSelect) {
    bankSelect.innerHTML = getTxEditBankOptions(bankKey);
    bankSelect.value = bankKey;
  }

  const kindSelect = document.getElementById('edit-tx-kind');
  if (kindSelect) {
    kindSelect.value = isInternalTransferTransaction(tx) ? 'internal' : getTransactionPaymentKind(tx);
  }

  updateEditTransactionExcludeSpentUi(isTransactionManuallyExcludedFromSpent(tx));
  updateEditReturnOffsetUi(tx);

  return true;
}

function getReturnOffsetCandidates(tx) {
  if (!tx || Number(tx.amount || 0) <= 0) return [];
  const incomingAmount = Math.abs(Number(tx.amount || 0));
  const currency = currencyCode(tx.currency || 'CZK');
  const txTime = parseCustomDateStr(tx.rawDate || tx.date)?.getTime() || Date.now();
  return (allTransactions || []).filter(other => {
    if (!other || other === tx || Number(other.amount || 0) >= 0) return false;
    if (getTransactionPaymentKind(other) !== 'account') return false;
    if (isExcludedFromSpendingStats(other)) return false;
    if (currencyCode(other.currency || 'CZK') !== currency) return false;
    if (Math.abs(Number(other.amount || 0)) + 0.01 < incomingAmount) return false;
    const otherTime = parseCustomDateStr(other.rawDate || other.date)?.getTime() || txTime;
    return Math.abs(txTime - otherTime) <= 120 * 24 * 60 * 60 * 1000;
  }).sort((a, b) => {
    const at = parseCustomDateStr(a.rawDate || a.date)?.getTime() || 0;
    const bt = parseCustomDateStr(b.rawDate || b.date)?.getTime() || 0;
    return Math.abs(txTime - at) - Math.abs(txTime - bt);
  });
}

function updateEditReturnOffsetUi(tx) {
  const wrap = document.getElementById('edit-tx-return-offset-wrap');
  const select = document.getElementById('edit-tx-return-for');
  if (!wrap || !select) return;
  const isIncomingAccount = Number(tx?.amount || 0) > 0 && getTransactionPaymentKind(tx) === 'account';
  wrap.style.display = isIncomingAccount ? '' : 'none';
  if (!isIncomingAccount) {
    select.innerHTML = `<option value="">${escapeHtml(t('notLinkedToPayment') || 'Not linked to an outgoing payment')}</option>`;
    return;
  }
  const selected = String(tx.returnForTransactionId || tx.returnForId || '').trim();
  const options = getReturnOffsetCandidates(tx);
  select.innerHTML = `<option value="">${escapeHtml(t('notLinkedToPayment') || 'Not linked to an outgoing payment')}</option>` + options.map(other => {
    const id = getTransactionId(other);
    const label = `${other.date || ''} · ${other.merchant || t('transaction')} · -${formatCurrencyAmount(Math.abs(Number(other.amount || 0)), other.currency || 'CZK')}`;
    return `<option value="${escapeAttr(id)}" ${id === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
  if (selected && [...select.options].some(option => option.value === selected)) select.value = selected;
}

function refreshEditReturnOffsetCandidates() {
  const txId = document.getElementById('edit-tx-id')?.value || '';
  const tx = findTransactionById(txId);
  if (!tx) return;
  const direction = document.getElementById('edit-tx-direction')?.value || (Number(tx.amount || 0) >= 0 ? 'incoming' : 'outgoing');
  const amount = Math.abs(Number(document.getElementById('edit-tx-amount')?.value || tx.amount || 0));
  const kind = document.getElementById('edit-tx-kind')?.value || getTransactionPaymentKind(tx);
  const currency = document.getElementById('edit-tx-currency')?.value || tx.currency || 'CZK';
  updateEditReturnOffsetUi({ ...tx, amount: direction === 'incoming' ? amount : -amount, paymentKind: kind, currency });
}

function updateEditTransactionExcludeSpentUi(excluded) {
  const toggle = document.getElementById('edit-tx-exclude-spent-switch');
  const card = document.querySelector('#transaction-edit-sheet .tx-non-spent-toggle-card');
  if (!toggle) return;
  const active = !!excluded;
  toggle.classList.toggle('on', active);
  toggle.dataset.excluded = active ? '1' : '0';
  toggle.setAttribute('aria-checked', active ? 'true' : 'false');
  if (card) card.classList.toggle('on', active);
}

function applyTransactionExcludedVisualState(tx) {
  if (!tx) return;
  const txId = String(tx.id || tx.msgId || '').trim();
  if (!txId) return;
  const excluded = isExcludedFromSpendingStats(tx);
  const manualNonSpent = isTransactionManuallyExcludedFromSpent(tx);
  document.querySelectorAll('.tx-item[data-tx-id]').forEach(row => {
    if (String(row.dataset.txId || '').trim() !== txId) return;
    row.classList.toggle('tx-credit-repayment', excluded);
    row.classList.toggle('tx-manual-non-spent', manualNonSpent);
    const amount = row.querySelector('.tx-amount');
    if (amount) {
      amount.classList.toggle('amount-neutral', excluded && !manualNonSpent);
      amount.classList.toggle('amount-income', (!excluded || manualNonSpent) && Number(tx.amount || 0) > 0);
      amount.classList.toggle('amount-expense', (!excluded || manualNonSpent) && Number(tx.amount || 0) < 0);
    }
  });
}

function syncEditTransactionExcludeSpentToBackend(tx) {
  if (!tx) return;
  postToBankTrackerEndpoint('saveTransaction', { transaction: extractTxnPayload(tx) });
}

function applyEditTransactionExcludeSpent(excluded) {
  const txId = document.getElementById('edit-tx-id')?.value || '';
  const tx = findTransactionById(txId);
  if (!tx) return;

  const next = !!excluded;
  const prev = isTransactionManuallyExcludedFromSpent(tx);
  updateEditTransactionExcludeSpentUi(next);
  if (prev === next) return;

  const oldSnapshot = { ...tx, excludeFromSpent: prev };
  tx.excludeFromSpent = next;
  const kindSelect = document.getElementById('edit-tx-kind');
  if (kindSelect) kindSelect.value = getTransactionPaymentKind(tx);

  invalidateTransactionStatsAdjustments();
  applyLocalArchiveStatsFromTransaction(oldSnapshot, -1);
  applyLocalArchiveStatsFromTransaction(tx, 1);
  rebuildLocalArchiveStatsFromTransactions({ force: true });
  saveCachedTransactionsSnapshot();
  renderAll();
  applyTransactionExcludedVisualState(tx);

  syncEditTransactionExcludeSpentToBackend(tx);
}

function toggleEditTransactionExcludeSpent() {
  const toggle = document.getElementById('edit-tx-exclude-spent-switch');
  if (!toggle) return;
  const next = toggle.dataset.excluded !== '1';
  applyEditTransactionExcludeSpent(next);
}

function openTransactionEditSheet(txId) {
  if (!fillEditTransactionSheet(txId)) return;
  openSheet('transaction-edit-sheet');
}

async function saveEditedTransaction() {
  const txId = document.getElementById('edit-tx-id')?.value || '';
  const tx = findTransactionById(txId);
  if (!tx) return;

  const parsedDate = parseManualDateInput(document.getElementById('edit-tx-date')?.value || '');
  const amountRaw = parseFloat(document.getElementById('edit-tx-amount')?.value || '0') || 0;
  const direction = document.getElementById('edit-tx-direction')?.value || 'outgoing';
  const currency = normalizeCurrencyForStorage(document.getElementById('edit-tx-currency')?.value || tx.currency || 'Kč');
  const category = document.getElementById('edit-tx-category')?.value || tx.category || 'Ostatné';
  const merchant = document.getElementById('edit-tx-merchant')?.value.trim() || tx.merchant || '';
  const bankKey = document.getElementById('edit-tx-bank')?.value || getBankKey(tx);
  const returnForTransactionId = direction === 'incoming' ? String(document.getElementById('edit-tx-return-for')?.value || '').trim() : '';
  const excludeFromSpent = !returnForTransactionId && document.getElementById('edit-tx-exclude-spent-switch')?.dataset?.excluded === '1';
  const paymentKind = returnForTransactionId ? 'account' : (document.getElementById('edit-tx-kind')?.value || getTransactionPaymentKind(tx));
  const variableSymbol = String(document.getElementById('edit-tx-vs')?.value || tx.variableSymbol || tx.vs || '').replace(/\D/g, '').trim();
  const tagLabel = normalizeTransactionTagLabel(document.getElementById('edit-tx-tag')?.value || tx.tagLabel || tx.tagName || '');
  const editTagColorInput = document.getElementById('edit-tx-tag-color');
  const tagShapeRaw = document.getElementById('edit-tx-tag-shape')?.value || '';
  const tagValidation = validateRequiredTagFields(
    tagLabel,
    tagShapeRaw,
    editTagColorInput?.value || tx.tagColor || '#58A6FF',
    editTagColorInput?.dataset?.userPicked || (tx.tagLabel ? '1' : '0'),
    'edit'
  );
  if (!tagValidation.ok) { alert(tagValidation.message); return; }
  const tagColor = tagLabel ? tagValidation.color : '';
  const tagShape = tagLabel ? tagValidation.shape : '';
  const finalAmount = direction === 'incoming' ? Math.abs(amountRaw) : -Math.abs(amountRaw);
  const oldTxSnapshot = { ...tx };
  const bankName = getTxEditBankName(bankKey);
  const paymentMeta = getEditedPaymentMeta({ ...tx, category }, paymentKind, direction, bankKey, bankName);

  tx.date = formatDate(parsedDate);
  tx.rawDate = parsedDate.toISOString();
  tx.timestamp = parsedDate.getTime();
  tx.month = getMonthFromDate(parsedDate); // v115 auto archive month after edit
  tx.amount = finalAmount;
  tx.currency = currency;
  tx.category = category;
  tx.merchant = merchant;
  tx.merchantRaw = merchant;
  tx.bank = bankName;
  tx.bankId = bankKey;
  tx.card = paymentMeta.card;
  tx.type = paymentMeta.type;
  tx.paymentKind = paymentKind;
  tx.variableSymbol = variableSymbol;
  tx.vs = variableSymbol;
  tx.tagLabel = tagLabel;
  tx.tagName = tagLabel;
  tx.tagColor = tagColor;
  tx.tagShape = tagShape;
  tx.tagMeta = tagLabel ? { name: tagLabel, color: tagColor, shape: tagShape } : null;
  tx.tag = tagLabel ? JSON.stringify({ name: tagLabel, color: tagColor, shape: tagShape }) : '';
  tx.excludeFromSpent = excludeFromSpent;
  tx.returnForTransactionId = returnForTransactionId;
  tx.msgId = tx.msgId || tx.id;

  invalidateTransactionStatsAdjustments();
  allTransactions = sortTransactionsNewestFirst(allTransactions);
  applyLocalArchiveStatsFromTransaction(oldTxSnapshot, -1);
  applyLocalArchiveStatsFromTransaction(tx, 1);
  const oldMonth = normalizeMonthStr(oldTxSnapshot.month || getAktuálneMonth());
  const newMonth = normalizeMonthStr(tx.month || getAktuálneMonth());
  recomputeAccountBalancesForMonth(oldMonth);
  if (newMonth !== oldMonth) recomputeAccountBalancesForMonth(newMonth);
  rebuildLocalArchiveStatsFromTransactions({ force: true });
  saveCachedTransactionsSnapshot();

  closeBottomSheets();
  renderAll();
  applyTransactionExcludedVisualState(tx);
  const ok = await postToBankTrackerEndpoint('saveTransaction', { transaction: extractTxnPayload(tx) });
  if (ok) {
    showSavedToast();
  } else {
    showLargeStatusToast(t('transactionSyncDelayed') || 'Saved locally. Google Sheets response was delayed.', 'warning');
  }
}

async function deleteEditedTransaction() {
  const txId = document.getElementById('edit-tx-id')?.value || '';
  if (!txId) return;
  if (!confirm(t('deleteTransactionConfirm'))) return;

  closeBottomSheets();
  const ok = await deleteSingleTransaction(txId);
  if (ok) {
    showDeletedToast();
  } else {
    showLargeStatusToast(t('transactionDeleteFailed') || 'Transaction was not deleted.', 'error');
  }
}
function isTouchLikeDevice() {
  return !!(window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches) || ('ontouchstart' in window);
}

function bindTransactionDeleteGestures() {
  document.querySelectorAll('[data-tx-id]').forEach(el => {
    if (el.dataset.deleteBound === 'true') return;
    el.dataset.deleteBound = 'true';
    el.classList.add('long-press-ready');

    el.addEventListener('touchstart', (event) => {
      if (massTagSelectMode) return;
      if (event.target.closest && event.target.closest('button')) return;
      txLongPressTargetId = el.dataset.txId;
      txLongPressTimer = setTimeout(() => {
        el.classList.add('tx-open-hint');
        navigator.vibrate?.(35);
        openTransactionEditSheet(txLongPressTargetId);
        setTimeout(() => el.classList.remove('tx-open-hint'), 500);
      }, 650);
    }, { passive: true });

    el.addEventListener('touchend', () => {
      clearTimeout(txLongPressTimer);
      txLongPressTimer = null;
    }, { passive: true });

    el.addEventListener('touchcancel', () => {
      clearTimeout(txLongPressTimer);
      txLongPressTimer = null;
    }, { passive: true });

    el.addEventListener('touchmove', () => {
      clearTimeout(txLongPressTimer);
      txLongPressTimer = null;
    }, { passive: true });

    el.addEventListener('dblclick', (e) => {
      if (massTagSelectMode) return;
      if (isTouchLikeDevice()) return;
      if (e.target.closest && e.target.closest('button')) return;
      e.preventDefault();
      el.classList.add('tx-open-hint');
      setTimeout(() => el.classList.remove('tx-open-hint'), 220);
      openTransactionEditSheet(el.dataset.txId);
    });
  });
}

function getActivePageId() {
  const active = document.querySelector('.page.active');
  return active ? active.id.replace('page-', '') : 'overview';
}

function navigateBySwipe(deltaX) {
  // v78: swipe navigation disabled.
}

function shouldIgnorePageSwipeTarget(target) {
  if (!target) return false;
  return !!target.closest(
    'button, input, select, textarea, a, .bottom-sheet, .bottom-nav, .cat-chip, .txn-filter-pill, .sync-btn, .fab, .top-upgrade-btn, .sheet-close, .tx-item, .tx-item-compact'
  );
}

function initPageSwipeNavigation() {
  // v89: swipe navigation remains disabled for smooth mobile performance.
}

function getAppTheme() {
  const saved = localStorage.getItem('app_theme');
  return saved === 'light' ? 'light' : 'dark';
}

function updateThemeMeta(theme) {
  const config = APP_THEMES[theme] || APP_THEMES.dark;

  let metas = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
  if (!metas.length) {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
    metas = [meta];
  }

  metas.forEach(meta => {
    meta.setAttribute('content', config.themeColor);
  });

  let navMeta = document.querySelector('meta[name="msapplication-navbutton-color"]');
  if (!navMeta) {
    navMeta = document.createElement('meta');
    navMeta.setAttribute('name', 'msapplication-navbutton-color');
    document.head.appendChild(navMeta);
  }
  navMeta.setAttribute('content', config.themeColor);

  let colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (!colorSchemeMeta) {
    colorSchemeMeta = document.createElement('meta');
    colorSchemeMeta.setAttribute('name', 'color-scheme');
    document.head.appendChild(colorSchemeMeta);
  }
  colorSchemeMeta.setAttribute('content', config.colorScheme);

  document.documentElement.style.colorScheme = config.colorScheme;
  document.body.style.colorScheme = config.colorScheme;
  document.documentElement.style.backgroundColor = config.backgroundColor;
  document.body.style.backgroundColor = config.backgroundColor;
  document.documentElement.style.setProperty('--system-bar-color', config.backgroundColor);
  document.documentElement.style.setProperty('--status-bar-color', config.backgroundColor);

  const statusOverlay = document.getElementById('bt-status-bar-overlay');
  if (statusOverlay) statusOverlay.style.background = config.backgroundColor;

  const androidBarBg = document.querySelector('.android-system-bar-bg');
  if (androidBarBg) androidBarBg.style.background = config.backgroundColor;
}

function applyAppTheme(theme = getAppTheme()) {
  const normalized = theme === 'light' ? 'light' : 'dark';
  localStorage.setItem('app_theme', normalized);
  document.documentElement.setAttribute('data-theme', normalized);
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(normalized);
  const overlay = document.getElementById('page-loading-overlay');
  if (overlay) {
    overlay.classList.remove('dark', 'light');
    overlay.classList.add(normalized);
  }
  updateThemeMeta(normalized);

  const darkBtn = document.getElementById('theme-dark-btn');
  const lightBtn = document.getElementById('theme-light-btn');
  if (darkBtn) darkBtn.classList.toggle('active', normalized === 'dark');
  if (lightBtn) lightBtn.classList.toggle('active', normalized === 'light');
  try { refreshBtBrandLogosForTheme(); } catch (_) {}
}

function setAppTheme(theme) {
  localStorage.setItem('app_theme_user_selected', 'true');
  applyAppTheme(theme);
  // Avoid full renderAll() on every theme click (heavy on mobile).
  requestAnimationFrame(() => {
    try {
      if (activePageId === 'txns') {
        updateTxnPage();
      } else if (activePageId === 'archive') {
        renderArchive();
        renderArchiveTrendChart();
      } else if (activePageId === 'overview' || activePageId === 'overview-details') {
        renderOverviewDashboard();
        renderBudgetStatus();
        renderAccountBalanceWidget();
      }
      scheduleFloatingUtilityUpdate();
    } catch (_) {}
  });
}

function warmHeavyTabCachesSync(options = {}) {
  startupWarmCachesDone = true;
  // B (perf): only force a full archive-stats rebuild when explicitly requested.
  // On a normal refresh the cached stats are reused (rebuild self-skips when fresh),
  // which removes a large synchronous localStorage scan + per-transaction conversion pass.
  try { rebuildLocalArchiveStatsFromTransactions({ force: !!(options && options.force) }); } catch (e) {
    console.warn('Archive stats warm-up failed:', e);
  }
  try {
    markLocalCacheTimestamp('cached_archive_stats_updated_at');
    markLocalCacheTimestamp('cached_archive_chart_updated_at');
  } catch (_) {}
}

function warmStartupCachesDeferred(options = {}) {
  warmHeavyTabCachesSync(options);
}

function yieldStartupLogoFrames(frameCount = 2) {
  if (typeof window.__btYieldLogoFrames === 'function') {
    return window.__btYieldLogoFrames(frameCount);
  }
  return new Promise((resolve) => {
    const count = Math.max(1, Number(frameCount) || 1);
    let remaining = count;
    const next = () => requestAnimationFrame(() => window.setTimeout(() => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else next();
    }, 0));
    next();
  });
}

function scheduleStartupCacheWarmup() {
  const run = () => {
    try { warmHeavyTabCachesSync({ force: false }); } catch (_) {}
  };
  // Never let cache warm-up steal the final visible logo cycle. Start looking
  // for idle time only after the overlay fade and page reveal have completed.
  window.setTimeout(() => {
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(run, { timeout: 4000 });
    } else {
      window.setTimeout(run, 600);
    }
  }, 1200);
}

const BT_EARLY_SHELL_REVEAL = true;
let __btBootDataHydrating = false;
let __btEarlyShellRevealed = false;
let __btBootNumbersReady = false;

function isBankStyleBootEnabled() {
  return window.__btBankStyleBoot === true;
}

function isEarlyShellRevealEnabled() {
  return BT_EARLY_SHELL_REVEAL === true || window.__btBankStyleBoot === true;
}

function areBootOverviewNumbersReady() {
  if (__btBootNumbersReady) return true;
  try {
    const header = document.getElementById('header-month');
    const net = document.getElementById('overview-net-worth');
    const cash = document.getElementById('overview-available-cash');
    if (!header || !net || !cash) return false;
    if (!String(header.textContent || '').trim()) return false;
    // Painted once applyOverviewBalanceEl wrote dataset.balanceValue.
    if (net.dataset.balanceValue == null || cash.dataset.balanceValue == null) return false;
    return true;
  } catch (_) {
    return false;
  }
}

function paintBootOverviewNumbers() {
  try {
    const headerMonth = document.getElementById('header-month');
    if (headerMonth) headerMonth.textContent = getMonthLabel();
    updateOverviewMonthNavState();
  } catch (_) {}
  try {
    window.__overviewBalanceAnimateNext = false;
    renderOverviewDashboard();
  } catch (e) {
    document.documentElement.setAttribute('data-render-overview-error', String(e && e.message ? e.message : e));
    console.error('Boot overview numbers render failed:', e);
  }
  __btBootNumbersReady = areBootOverviewNumbersReady();
  if (__btBootNumbersReady) {
    document.documentElement.setAttribute('data-boot-numbers', 'ready');
  }
  return __btBootNumbersReady;
}

function isEarlyShellRevealReady() {
  if (!isEarlyShellRevealEnabled()) return false;
  if (__btEarlyShellRevealed || !__appBootActive || __appBootSequenceRunning) return false;
  // Bank-style: do not block shell on lazy feature modules.
  if (!isBankStyleBootEnabled() && window.__btLazyStartupReady === false) return false;
  if (!document.getElementById('header-month') || !document.getElementById('page-overview')) return false;
  // Bank-style: wait for 2 complete logo cycles AND stable overview numbers.
  if (isBankStyleBootEnabled()) {
    if (!window.__btSplashBrandCyclesComplete) return false;
    if (!areBootOverviewNumbersReady()) return false;
  }
  return true;
}

function attemptEarlyShellReveal() {
  if (!isEarlyShellRevealReady()) {
    // Stale boundary hint must not force a mid-cycle cut later.
    if (window.__btSplashRevealOnBoundary) window.__btSplashRevealOnBoundary = false;
    if (isBankStyleBootEnabled() && !window.__btSplashBrandCyclesComplete) {
      window.addEventListener('bt:splash-brand-cycles-complete', () => {
        try { attemptEarlyShellReveal(); } catch (_) {}
      }, { once: true });
    }
    return false;
  }
  __btEarlyShellRevealed = true;
  document.documentElement.setAttribute('data-boot-mode', isBankStyleBootEnabled() ? 'bank-style' : 'early-shell');
  try { finalizeAppBootPresentation(); } catch (_) {}
  return true;
}

async function runBootDataHydration(ctx = {}) {
  const { loaderFailSafe } = ctx;
  try {
    document.body.classList.add('app-boot-hydrating');
    if (SHEETS_URL && isGoogleSheetsEnabled()) {
      startAutoSync();
      await new Promise((resolve) => {
        window.setTimeout(() => {
          syncData({ backgroundMode: true })
            .catch((e) => {
              console.warn('Startup cloud sync failed:', e);
            })
            .finally(resolve);
        }, 180);
      });
    } else {
      if (!SHEETS_URL) {
        const loadStatus = document.getElementById('limits-sync-status');
        if (loadStatus) {
          loadStatus.textContent = isLocalOfflineDemoMode()
            ? 'Local demo mode — widget test data loaded from localhost seed.'
            : (isMobileOrStandaloneClient()
              ? 'Na mobile treba v Settings zadať Google Sheets URL (ukladá sa zvlášť pre každé zariadenie).'
              : 'Google Sheets URL is empty. Paste/save the Sheets URL in Settings to load Overview details.');
        }
      }
      try {
        if (isLocalOfflineDemoMode()) {
          const seeded = seedBankTrackerLocalTestData(shouldAutoSeedLocalWidgetDemo() || !allTransactions.length);
          if (!seeded) {
            applyLocalWidgetDemoAlertLimits(getAktuálneMonth());
            window.setTimeout(() => {
              try {
                if (typeof runSubscriptionDetectionPipeline === 'function') runSubscriptionDetectionPipeline({ reason: 'local-boot' });
              } catch (_) {}
            }, 1400);
          }
        }
      } catch (e) {
        document.documentElement.setAttribute('data-local-test-seed', 'error');
        document.documentElement.setAttribute('data-local-test-seed-error', String(e && e.message ? e.message : e));
        console.error('Local test data seed failed:', e);
      }
    }
    try { prepareUiAfterDataLoad({ render: false }); } catch (_) {}
    // Paint header + net worth + cash behind the splash so reveal has no number jumps.
    try {
      paintBootOverviewNumbers();
      renderAll({
        visibleOnly: true,
        deferHeavy: true,
        overviewMode: 'numbers-first',
      });
      paintBootOverviewNumbers();
    } catch (_) {}
    try { applyLanguage(); } catch (_) {}
    try { attemptEarlyShellReveal(); } catch (_) {}

    // Charts/widgets only after the shell is visible (or after a short wait if reveal is gated on cycles).
    const runCharts = () => {
      try {
        renderAll({
          visibleOnly: true,
          deferHeavy: false,
          overviewMode: 'charts',
        });
      } catch (_) {}
    };
    if (__btEarlyShellRevealed) {
      await yieldStartupLogoFrames(1);
      runCharts();
    } else {
      window.addEventListener('bt:splash-brand-cycles-complete', () => {
        window.setTimeout(runCharts, 80);
      }, { once: true });
      window.setTimeout(() => {
        if (!__btEarlyShellRevealed) runCharts();
      }, 5200);
    }
  } catch (e) {
    console.error('Boot data hydration failed:', e);
    try {
      if (!allTransactions.length) loadCachedTransactionsSnapshot();
    } catch (_) {}
    try {
      paintBootOverviewNumbers();
      renderAll({ visibleOnly: true, deferHeavy: false });
    } catch (_) {}
  } finally {
    if (loaderFailSafe) clearTimeout(loaderFailSafe);
    document.body.classList.remove('app-boot-hydrating');
    try { __overviewChartsDataSettled = true; } catch (_) {}
    try { finishOverviewChartRenderCycle(); } catch (_) {}
    __btBootDataHydrating = false;
    document.documentElement.setAttribute('data-boot-hydration', 'done');
    scheduleStartupCacheWarmup();
    if (!__btEarlyShellRevealed) {
      try { attemptEarlyShellReveal(); } catch (_) {}
      try { finalizeAppBootPresentation(); } catch (_) {}
    }
    if (!SHEETS_URL) {
      const loadStatus = document.getElementById('limits-sync-status');
      if (loadStatus) loadStatus.textContent = 'Google Sheets URL is empty for this localhost origin. Paste/save the Sheets URL in Settings to load Overview details.';
      console.warn('Google Sheets sync skipped on startup: missing sheets_url for this origin.');
    }
  }
}

function startAppBootAfterSplashCycle() {
  if (__btColdBootStarted) return;
  __btColdBootStarted = true;
  __appBootActive = true;
  __bootPresentationPhase = true;
  beginLoadingPresentation({ kind: 'boot' });

  const loaderFailSafe = setTimeout(() => {
    try { finalizeAppBootPresentation(); } catch (_) {}
    scheduleStartupCacheWarmup();
  }, APP_BOOT_MAX_MS);

  const yieldStartupFrame = () => yieldStartupLogoFrames(isBankStyleBootEnabled() ? 1 : 2);

  const runStartupBootstrap = async () => {
  try {
    // Bank-style: hydrate numbers behind the 2 logo cycles, then reveal on cycle boundary.
    if (isBankStyleBootEnabled()) {
      try { ensureHeaderBrandLogoMarkup(); } catch (_) {}
      try { initBottomSheetDragToClose(); } catch (_) {}
      try { initGlobalPullDownControl(); } catch (_) {}
      try { initPullToRefresh(); } catch (_) {}
      try { initTabHistory(); } catch (_) {}
      try { initNavTouchFeedback(); } catch (_) {}
      try { initMassTagSelectDelegation(); } catch (_) {}
      try { updateFloatingUtilityButtons(); } catch (_) {}
      try { bindFloatingUtilityScrollWatchers(); } catch (_) {}
      applyAppTheme(getAppTheme());
      clearDemoTransactionsCacheIfNeeded();
      migrateCurrencyStorageToSymbols();
      updateGoogleSheetsToggleUi();
      ensureDefaultConfig();
      clearCloudFirstLocalData();
      try { markOverviewChartsAwaitingFreshData(); } catch (_) {}
      bootstrapUiFromCache({ deferHeavy: true, skipHideBoot: true, render: false });
      try { paintBootOverviewNumbers(); } catch (_) {}
      __btBootDataHydrating = true;
      document.documentElement.setAttribute('data-boot-hydration', 'pending');
      window.addEventListener('bt:splash-brand-cycles-complete', () => {
        try { attemptEarlyShellReveal(); } catch (_) {}
      }, { once: true });
      runBootDataHydration({ loaderFailSafe });
      return;
    }

    // Every startup group enters through the shared logo-frame queue. Core,
    // feature modules and data bootstrap can no longer bunch into one frame.
    await yieldStartupFrame();
    try { ensureHeaderBrandLogoMarkup(); } catch (_) {}
    try { initBottomSheetDragToClose(); } catch (_) {}
    try { initGlobalPullDownControl(); } catch (_) {}
    await yieldStartupFrame();
    try { initPullToRefresh(); } catch (_) {}
    try { initTabHistory(); } catch (_) {}
    await yieldStartupFrame();
    try { initNavTouchFeedback(); } catch (_) {}
    try { initMassTagSelectDelegation(); } catch (_) {}
    await yieldStartupFrame();
    try { updateFloatingUtilityButtons(); } catch (_) {}
    try { bindFloatingUtilityScrollWatchers(); } catch (_) {}
    await yieldStartupFrame();
    applyAppTheme(getAppTheme());
    clearDemoTransactionsCacheIfNeeded();
    await yieldStartupFrame();
    migrateCurrencyStorageToSymbols();
    updateGoogleSheetsToggleUi();
    ensureDefaultConfig();
    clearCloudFirstLocalData();
    try { markOverviewChartsAwaitingFreshData(); } catch (_) {}
    await yieldStartupFrame();
    // Load the cached model only. Rendering it behind the splash and then
    // rendering fresh data again caused the visible second-cycle hitch.
    bootstrapUiFromCache({ deferHeavy: true, skipHideBoot: true, render: false });
    await yieldStartupFrame();

    if (isEarlyShellRevealEnabled()) {
      __btBootDataHydrating = true;
      document.documentElement.setAttribute('data-boot-hydration', 'pending');
      if (!attemptEarlyShellReveal()) {
        window.addEventListener('bt:lazy-startup-ready', () => {
          try { attemptEarlyShellReveal(); } catch (_) {}
        }, { once: true });
      }
      runBootDataHydration({ loaderFailSafe });
      return;
    }

    if (SHEETS_URL && isGoogleSheetsEnabled()) {
      startAutoSync();
      window.setTimeout(() => {
        syncData({ backgroundMode: true })
          .catch((e) => {
            console.warn('Startup cloud sync failed:', e);
          })
          .finally(() => {
            if (!__appBootActive) clearTimeout(loaderFailSafe);
            else finalizeAppBootPresentation();
            scheduleStartupCacheWarmup();
          });
      }, 180);
      return;
    }

    clearTimeout(loaderFailSafe);

    if (!SHEETS_URL) {
      const loadStatus = document.getElementById('limits-sync-status');
      if (loadStatus) {
        loadStatus.textContent = isLocalOfflineDemoMode()
          ? 'Local demo mode — widget test data loaded from localhost seed.'
          : (isMobileOrStandaloneClient()
            ? 'Na mobile treba v Settings zadať Google Sheets URL (ukladá sa zvlášť pre každé zariadenie).'
            : 'Google Sheets URL is empty. Paste/save the Sheets URL in Settings to load Overview details.');
      }
    }

    try {
      if (isLocalOfflineDemoMode()) {
        const seeded = seedBankTrackerLocalTestData(shouldAutoSeedLocalWidgetDemo() || !allTransactions.length);
        if (!seeded) {
          applyLocalWidgetDemoAlertLimits(getAktuálneMonth());
          window.setTimeout(() => {
            try {
              if (typeof runSubscriptionDetectionPipeline === 'function') runSubscriptionDetectionPipeline({ reason: 'local-boot' });
            } catch (_) {}
          }, 1400);
        }
      }
    } catch (e) {
      document.documentElement.setAttribute('data-local-test-seed', 'error');
      document.documentElement.setAttribute('data-local-test-seed-error', String(e && e.message ? e.message : e));
      console.error('Local test data seed failed:', e);
    }
    await yieldStartupFrame();
    try { prepareUiAfterDataLoad({ render: false }); } catch (_) {}
    await yieldStartupFrame();
    try { renderAll({ visibleOnly: true, deferHeavy: true }); } catch (_) {}
    await yieldStartupFrame();
    try { applyLanguage(); } catch (_) {}
    try { __overviewChartsDataSettled = true; } catch (_) {}
    finalizeAppBootPresentation();
    scheduleStartupCacheWarmup();
    if (!SHEETS_URL) {
      const loadStatus = document.getElementById('limits-sync-status');
      if (loadStatus) loadStatus.textContent = 'Google Sheets URL is empty for this localhost origin. Paste/save the Sheets URL in Settings to load Overview details.';
      console.warn('Google Sheets sync skipped on startup: missing sheets_url for this origin.');
    }
  } catch (e) {
    console.error('Startup bootstrap failed:', e);
    try {
      if (!allTransactions.length) loadCachedTransactionsSnapshot();
    } catch (_) {}
    try { __overviewChartsDataSettled = true; } catch (_) {}
    finalizeAppBootPresentation();
    scheduleStartupCacheWarmup();
  }
  };

  runStartupBootstrap();
}

function scheduleAppBootAfterDomReady() {
  // Bank-style: hydrate behind the logo as soon as core is ready.
  if (window.__btBankStyleBoot || window.__btSplashInitialCycleComplete) {
    startAppBootAfterSplashCycle();
    return;
  }
  window.addEventListener('bt:splash-first-cycle-complete', startAppBootAfterSplashCycle, { once: true });
}
// ── CONFIG & HISTÓRIA LIMITOV ──────────────────────────────
const DEFAULT_SHEETS_URL = '';
const DEFAULT_LIMITS_WEBAPP_URL = '';
let SHEETS_URL = localStorage.getItem('sheets_url') || DEFAULT_SHEETS_URL || '';
let LIMITS_WEBAPP_URL = localStorage.getItem('limits_webapp_url') || DEFAULT_LIMITS_WEBAPP_URL || '';
let RB_LIMIT = parseInt(localStorage.getItem('rb_limit') || '10');
let CSOB_LIMIT = parseInt(localStorage.getItem('csob_limit') || '5');
let limitsHistory = JSON.parse(localStorage.getItem('limits_history') || '{}');
let fxRates = JSON.parse(localStorage.getItem('fx_rates') || '{"EUR":1,"CZK":25}');
let fxRatesDate = localStorage.getItem('fx_rates_date') || '';


// ── STATE ───────────────────────────────────────────────────
let allTransactions = [];
let activeCategory = 'všetky';
let activeTxnTag = 'all';
let massTagSelectMode = false;
const massTagSelectedIds = new Set();
let massTagPendingAction = '';
let txnTagKeyToLabel = {};
let txnCategoryFiltersExpanded = false;
let activeBank = 'všetky';
let activeDirection = 'all';
let activeSearch = '';
let activePaymentKind = 'all';
let activeCardLast4 = '';
let activeDateFrom = '';
let activeDateTo = '';
let activeMonthFilter = '';
let activeDrilldownFilter = null; // { type: 'cards'|'spent'|'income'|'overview-spent', bankKey: 'rb_cz'|'všetky' }
let activeRecurringGroupFilter = null; // { label, transaction_ids[], strict_ids_only?, recurring_group_id?, ... }
let activeAlertsHistoryFilter = 'new';
let activeTxnHistoryScope = 'current';
let txnCashflowChartType = localStorage.getItem('txn_cashflow_chart_type') || 'bar';
let archiveTrendChartType = localStorage.getItem('archive_trend_chart_type') || 'line';
let archiveTrendChartCache = { signature: '', html: '' };
const TXN_PAGE_SIZE = 20;
let txnVisibleLimit = TXN_PAGE_SIZE;
let autoSyncTimer = null;
let isSyncing = false;
let activePageId = 'overview';
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minút
const LOCAL_PRECOMPUTE_CACHE_TTL_MS = 5 * 60 * 1000;
const LOCAL_SYNC_CACHE_TTL_MS = 5 * 60 * 1000;

const CAT_ICONS = {
  'Potraviny': '🛒',
  'Elektronika': '💻',
  'Pohonné hmoty': '⛽',
  'Auto': '🚗',
  'Reštaurácie': '🍽',
  'Káva': '☕',
  'Doprava': '🚕',
  'Drogéria': '🧴',
  'Dom': '🏠',
  'Úver': '🏦',
  'Obuv': '👟',
  'Oblečenie': '👕',
  'Obchod': '🛍️',
  'Bývanie': '🏡',
  'Lekáreň': '🏥',
  'Kvety': '💐',
  'Šport': '🏃',
  'Výplata': '💰',
  'Bankomat': '🏧',
  'Zdravie': '💊',
  'Zábava': '🎬',
  'Predplatné': '📱',
  'Jedlo': '🍕',
  'Ostatné': '💳'
};

const MONTH_NAMES_SK = {
  '01': 'január', '02': 'február', '03': 'marec', '04': 'apríl', '05': 'máj', '06': 'jún',
  '07': 'júl', '08': 'august', '09': 'september', '10': 'október', '11': 'november', '12': 'december'
};

let activeOverviewMonthOffset = 0;
let overviewMonthShiftInFlight = false;

const BANKS = {
  rb_cz: { label: 'RB CZ', short: 'RB', color: 'var(--rb-color)', limitKey: 'rbCz', defaultLimit: 10, primaryCurrency: 'CZK', primaryType: 'card', account: '', cards: '', aliases: ['rb cz','raiffeisen','raiffeisen cz'] },
  csob_sk: { label: 'ČSOB SK', short: 'ČSOB SK', color: 'var(--csob-color)', limitKey: 'csobSk', defaultLimit: 5, primaryCurrency: 'EUR', primaryType: 'card', account: '', cards: '', aliases: ['csob sk','čsob sk','csob slov','čsob slov'] ,
    googleSheetsToggleTitle: 'Google Sheets sync',
    googleSheetsToggleSubOn: 'Zapnuté — appka načíta reálne transakcie zo Sheets.',
    googleSheetsToggleSubOff: 'Vypnuté — appka používa iba lokálnu cache.',
    googleSheetsLocalStatus: 'Google Sheets connection is saved locally. Apps Script URL will be used to save limits, budgets and tokens.'},
  csob_cz: { label: 'ČSOB CZ', short: 'ČSOB CZ', color: '#8fbfff', limitKey: 'csobCz', defaultLimit: 5, primaryCurrency: 'CZK', primaryType: 'card', account: '', cards: '', aliases: ['csob cz','čsob cz','csob česk','čsob česk'] },
  csob_cz_credit: { label: 'ČSOB CZ credit card', short: 'Credit card', color: '#8fbfff', limitKey: null, defaultLimit: 0, primaryCurrency: 'CZK', primaryType: 'credit', account: '', cards: '', cardLast4: '', aliases: ['csob cz credit card','csob cz kreditka','čsob cz kreditka','kreditní karta čsob','kreditna karta csob'] },
  moneta: { label: '<span class="moneta-gradient">Moneta</span>', short: '<span class="moneta-gradient">Moneta</span>', color: 'var(--moneta-color)', limitKey: 'moneta', defaultLimit: 0, primaryCurrency: 'CZK', primaryType: 'card', account: '', cards: '', aliases: ['moneta','moneta money','moneta bank'] },
  air_bank_cz: { label: 'Air Bank', short: 'Air Bank', color: '#b8ff2f', limitKey: 'airBankCz', defaultLimit: 0, primaryCurrency: 'CZK', primaryType: 'account', account: '', cards: '', aliases: ['air bank','airbank','air bank cz'] },
  pluxee: { label: 'Pluxee', short: 'Pluxee', color: '#009B77', limitKey: 'pluxee', defaultLimit: 0, primaryCurrency: 'CZK', primaryType: 'card', account: '', cards: '5310', aliases: ['pluxee','stravenkovy ucet','stravenkový účet','sodexo'] }
};
const BANK_ORDER = ['rb_cz','csob_sk','csob_cz','csob_cz_credit','moneta','air_bank_cz','pluxee'];

const BT_LOGO_SRC = './Logos/bank-tracker-logo.svg';
const BT_LOGO_SRC_FALLBACK = './Logos/bank-tracker-logo.svg';
const BT_LOGO_ANIMATION_SRC = './Logos/logo-animation-export final.html';
const BT_BANK_LOGOS_BASE = 'https://raw.githubusercontent.com/Morfinsk/Bank-Tracker/main/bank-logos/';

const BANK_LOGOS = {
  rb_cz: {
    src: BT_BANK_LOGOS_BASE + 'RB.png',
    alt: 'RB CZ'
  },
  csob_sk: {
    src: BT_BANK_LOGOS_BASE + 'CSOB-SK.png',
    alt: 'ČSOB SK'
  },
  csob_cz: {
    src: BT_BANK_LOGOS_BASE + 'CSOB-CZ.jpg',
    alt: 'ČSOB CZ'
  },
  csob_cz_credit: {
    src: BT_BANK_LOGOS_BASE + 'CSOB-CZ.jpg',
    alt: 'CSOB CZ credit card'
  },
  moneta: {
    src: BT_BANK_LOGOS_BASE + 'Moneta-CZ.png',
    alt: 'Moneta'
  },
  air_bank_cz: {
    src: BT_BANK_LOGOS_BASE + 'Airbank.jpg',
    alt: 'Air Bank'
  },
  pluxee: {
    src: BT_BANK_LOGOS_BASE + 'Pluxee.jpg',
    alt: 'Pluxee'
  }
};

const __btPerfState = {
  samples: [],
  maxSamples: 60
};

window.getBankTrackerPerfSummary = function() {
  const samples = (__btPerfState.samples || []).slice();
  const names = [...new Set(samples.map((row) => row.name))];
  const summary = {};
  names.forEach((name) => {
    summary[name] = btPerfSummarize(samples, name);
  });
  summary.all = btPerfSummarize(samples);
  return summary;
};

window.printBankTrackerPerfMetrics = function() {
  try {
    const rows = (__btPerfState.samples || []).slice(-25);
    if (!rows.length) {
      console.info('[BT PERF] No samples yet.');
      return null;
    }
    console.table(rows);
    const summary = window.getBankTrackerPerfSummary();
    console.info('[BT PERF] Summary (avg / p95 ms):');
    Object.keys(summary).forEach((key) => {
      if (key === 'all' || !summary[key]) return;
      const item = summary[key];
      console.info(`  ${key}: avg ${item.avgMs}ms, p95 ${item.p95Ms}ms (${item.count} samples)`);
    });
    if (summary.all) {
      console.info(`  all: avg ${summary.all.avgMs}ms, p95 ${summary.all.p95Ms}ms (${summary.all.count} samples)`);
    }
    return { rows, summary };
  } catch (_) {
    console.info('[BT PERF] print failed');
    return null;
  }
};

window.runBankTrackerPerfSmokeTest = async function(options = {}) {
  const tabIds = ['overview', 'txns', 'archive', 'settings'];
  const tabSwitches = Math.max(3, Number(options && options.tabSwitches) || 5);
  const syncRuns = Math.max(0, Number(options && options.syncRuns) || 1);
  const includeSync = !(options && options.includeSync === false);
  const originalTab = String(activePageId || 'overview');
  const startedAt = btPerfNow();

  console.info(`[BT PERF] Smoke test started (tabs=${tabSwitches}, sync=${includeSync ? syncRuns : 0})`);

  for (let i = 0; i < tabSwitches; i += 1) {
    const tabId = tabIds[i % tabIds.length];
    try { showPage(tabId); } catch (e) { console.warn('[BT PERF] showPage failed:', tabId, e); }
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    await new Promise((resolve) => window.setTimeout(resolve, 140));
  }

  try { showPage(originalTab); } catch (_) {}

  if (includeSync && syncRuns > 0 && typeof syncData === 'function' && SHEETS_URL) {
    for (let i = 0; i < syncRuns; i += 1) {
      try {
        await syncData({ backgroundMode: true });
      } catch (e) {
        console.warn('[BT PERF] syncData smoke run failed:', e);
      }
    }
  }

  btPerfLog('perfSmokeTest', btPerfNow() - startedAt, `tabs=${tabSwitches},sync=${includeSync ? syncRuns : 0}`);
  return window.printBankTrackerPerfMetrics();
};



// ── ARCHIVE DAILY BANK DETAIL ──────────────────────────────
let archiveDetailBankKey = 'rb_cz';
let archiveDetailPaymentKind = 'all';
const ARCHIVE_DETAIL_PAGE_SIZE = 30;
let archiveDetailVisibleLimit = ARCHIVE_DETAIL_PAGE_SIZE;

let archiveDetailFilter = null;

let archiveRepairDebounce = null;
try { window.isMassTagSelectModeActive = isMassTagSelectModeActive; } catch (_) {}
try { window.renderMassTagRowSelectUi = renderMassTagRowSelectUi; } catch (_) {}
try { window.toggleMassTagSelection = toggleMassTagSelection; } catch (_) {}
try { window.isMassTagRowSelected = isMassTagRowSelected; } catch (_) {}
try { window.setMassTagPendingAction = setMassTagPendingAction; } catch (_) {}
try { window.updateMassTagActionPanelUi = updateMassTagActionPanelUi; } catch (_) {}
try { window.enterMassTagSelectMode = enterMassTagSelectMode; } catch (_) {}
try { window.exitMassTagSelectMode = exitMassTagSelectMode; } catch (_) {}
try { window.openTagMassUpdateSheet = openTagMassUpdateSheet; } catch (_) {}
try { window.saveMassTagSelection = saveMassTagSelection; } catch (_) {}
try { window.applyMassTagUpdate = saveMassTagSelection; } catch (_) {}
try { window.dismissLargeStatusToast = dismissLargeStatusToast; } catch (_) {}

const BT_LOGO_CYCLE_MS = 2000;
const BT_LOGO_CYCLE_BOOT_MS = 2000;
const TAB_LOADING_MIN_MS = 2000;
const BT_LOGO_HEADER_SYNC_CYCLE_MS = 2000;
/* Same cycle as boot so Archive overlay does not retune mid-loop vs strokes/pen. */
const BT_ARCHIVE_TAB_LOADING_CYCLE_MS = BT_LOGO_CYCLE_BOOT_MS;

const BT_LOGO_EXPORT_DOT_PATH = 'M 60 300 L 60 50 L 20 90 L 60 50 L 100 90 L 60 50 L 60 120 h 80 c 40 0, 60 30, 60 60 c 0 30, -20 60, -60 60 h -80 L 60 220 h 90 c 50 0, 80 35, 80 70 c 0 35, -30 70, -80 70 h -90';
try { window.refreshBtBrandLogosForTheme = refreshBtBrandLogosForTheme; } catch (_) {}
try { window.getBtBrandLogoHtml = getBtBrandLogoHtml; } catch (_) {}
try { window.getBtInlineLoadingHtml = getBtInlineLoadingHtml; } catch (_) {}

const HEADER_BRAND_DRAW_MS = BT_LOGO_HEADER_SYNC_CYCLE_MS;
let __headerBrandAnimTimer = null;
let __headerBrandAnimRunning = false;
let __headerBrandAnimQueued = false;
let __headerBrandSyncPendingAfterBoot = false;
try { window.ensureHeaderBrandLogoMarkup = ensureHeaderBrandLogoMarkup; } catch (_) {}
try { window.attemptEarlyShellReveal = attemptEarlyShellReveal; } catch (_) {}
try { window.isEarlyShellRevealEnabled = isEarlyShellRevealEnabled; } catch (_) {}
try { window.releaseHeaderBrandAfterSync = releaseHeaderBrandAfterSync; } catch (_) {}
try { window.playHeaderBrandDraw = playHeaderBrandDraw; } catch (_) {}

const HEADER_BRAND_SYNC_MIN_MS = BT_LOGO_HEADER_SYNC_CYCLE_MS;
let __headerBrandSyncStartedAt = 0;
let __headerBrandSyncHideTimer = null;
let __syncBtnSpinStartedAt = 0;
let __syncBtnSpinHideTimer = null;
try { window.setSyncBtnSpinning = setSyncBtnSpinning; } catch (_) {}
try { window.setHeaderBrandSyncState = setHeaderBrandSyncState; } catch (_) {}
try { window.isPageLoadingOverlayBlocking = isPageLoadingOverlayBlocking; } catch (_) {}
try { window.flushChartsAfterOverlayHide = flushChartsAfterOverlayHide; } catch (_) {}

let __loadingPresentation = null;
try { window.restartBtLogoDrawLoop = restartBtLogoDrawLoop; } catch (_) {}
try { window.restartBtLogoSmilDraw = restartBtLogoSmilDraw; } catch (_) {}
try { window.startBtLogoAnimationObserver = startBtLogoAnimationObserver; } catch (_) {}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBtLogoAnimationObserverAfterSplash, { once: true });
} else {
  startBtLogoAnimationObserverAfterSplash();
}
try { window.presentWidgetSectionLoadingIfNeeded = presentWidgetSectionLoadingIfNeeded; } catch (_) {}

const APP_BOOT_OVERLAY_FADE_MS = 300;
const APP_BOOT_PAGE_REVEAL_MS = 380;
const APP_BOOT_POST_REVEAL_MS = 220;
const APP_BOOT_MAX_MS = 15000;
let __appBootActive = false;
let __appBootStartedAt = 0;
let __appBootCompleteTimer = null;
let __appBootSequenceRunning = false;
let __bootPresentationPhase = false;
let __tabLoadingDepth = 0;
let __btBootDataReady = false;
try { window.completeAppBootSequence = completeAppBootSequence; } catch (_) {}

let pageLoadingTimer = null;

let transactionStatsAdjustmentsCachePool = null;
let transactionStatsAdjustmentsCacheResult = null;

const CREDIT_BALANCE_SUBACCOUNTS = [
  { id: 'csob_cz_credit', parentId: 'csob_cz', nameKey: 'csobCzCreditOutstandingName', currency: 'CZK', cardLast4: '', liability: true }
];
const HALF_GAUGE_VIEWBOX = '0 0 200 100';
const HALF_GAUGE_ARC_PATH = 'M10 88 A90 90 0 0 1 190 88';
try { window.updateGlobalSyncIndicator = updateGlobalSyncIndicator; } catch (_) {}
try { window.setOverviewBalanceSyncState = setOverviewBalanceSyncState; } catch (_) {}

let __overviewBalanceSyncDepth = 0;

let __overviewChartBootIntroDone = false;
let __overviewChartScrollObserver = null;
let __overviewChartScrollLive = false;
let __overviewChartReplayTimer = null;
let __overviewChartReplayToken = 0;
let __overviewBootScheduleTimer = null;
let __overviewScrollLiveTimer = null;
let __overviewChartsDataSettled = false;
const OVERVIEW_BOOT_DEBOUNCE_MS = 140;
const OVERVIEW_BOOT_STAGGER_MS = 90;
const __overviewChartWasVisible = new WeakMap();
const __overviewChartIntroPlayed = new WeakSet();
const OVERVIEW_LINE_DRAW_MS = 800;
const OVERVIEW_PROJECTION_DELAY_MS = 600;
const OVERVIEW_PROJECTION_DRAW_MS = 700;
const OVERVIEW_LINE_SMOOTH_MS = 1500;
const OVERVIEW_LINE_SEQUENCE_MS = OVERVIEW_LINE_DRAW_MS + OVERVIEW_PROJECTION_DELAY_MS + OVERVIEW_PROJECTION_DRAW_MS;
/* v3910: short animationBegin so layout/GAS data can settle before the line draw starts. */
const OVERVIEW_CHART_ANIM_BEGIN_MS = 120;
const OVERVIEW_CHART_CARD_ANIM_MS = OVERVIEW_PROJECTION_DELAY_MS + OVERVIEW_PROJECTION_DRAW_MS + 450;
const OVERVIEW_PROGRESS_DRAW_MS = 2800;
const OVERVIEW_DETAILS_BAR_DRAW_MS = 3500;
const OVERVIEW_GAUGE_DRAW_MS = OVERVIEW_LINE_DRAW_MS + OVERVIEW_PROJECTION_DRAW_MS;
const NET_WORTH_TREND_LINE_DRAW_MS = 720;
const NET_WORTH_TREND_POINT_POP_MS = 420;
const NET_WORTH_TREND_POINT_BASE_DELAY_MS = 260;
const NET_WORTH_TREND_POINT_STAGGER_MS = 45;
const ARCHIVE_LINE_DRAW_MS = 4500;
const OVERVIEW_DETAILS_BAR_STAGGER_MS = 100;

try { window.primeNetWorthTrendForIntro = primeNetWorthTrendForIntro; } catch (_) {}

const __overviewChartAnimTimers = new WeakMap();
try { window.playOverviewSummaryStripReveal = playOverviewSummaryStripReveal; } catch (_) {}
try { window.finishOverviewChartRenderCycle = finishOverviewChartRenderCycle; } catch (_) {}
try { window.scheduleNetWorthTrendAnimation = scheduleNetWorthTrendAnimation; } catch (_) {}
try { window.setupOverviewScrollChartAnimations = setupOverviewScrollChartAnimations; } catch (_) {}
try { window.scheduleOverviewPageBootAnimation = scheduleOverviewPageBootAnimation; } catch (_) {}
try { window.animateVisibleOverviewChartCards = animateVisibleOverviewChartCards; } catch (_) {}
try { window.animateOverviewChartsIntro = animateOverviewChartsIntro; } catch (_) {}
try { window.playOverviewChartIntro = animateOverviewChartsIntro; } catch (_) {}

let __overviewDetailsScrollObserver = null;
let __overviewDetailsScrollLive = false;
const __overviewDetailsWasVisible = new WeakMap();
const __overviewDetailsScrollFillByRow = new WeakMap();
const __overviewDetailsBarFinishTimers = new WeakMap();
try { window.setupOverviewDetailsScrollAnimations = setupOverviewDetailsScrollAnimations; } catch (_) {}

// A (perf): lazy per-tab rendering. The heavy tabs (Transactions, Archive) are
// only rendered when their tab is actually visited, instead of during the
// startup render burst. They are flagged "dirty" whenever underlying data
// changes so the next visit re-renders fresh content.
let __btTxnsTabDirty = true;
let __btArchiveTabDirty = true;
try { window.renderDirtyTabSection = renderDirtyTabSection; } catch (_) {}

let __archiveChartIntroToken = 0;
let __archiveChartIntroObserver = null;

const BT_TOUCH_TARGET_SELECTOR = [
  'button:not([disabled])',
  '.bottom-nav .nav-item',
  '.cat-chip',
  '.txn-filter-pill',
  '.sync-btn',
  '.fab',
  '.scroll-top-fab',
  '.config-save',
  '.sheet-close',
  '.summary-item-clickable',
  '.custom-widget-choice',
  '.custom-widget-type-btn',
  '.custom-widget-icon-btn',
  '.custom-widget-add-btn',
  '.manager-tab',
  '.icon-action-btn',
  '.billing-toggle button',
  '.language-switch button',
  '.dev-toggle-btn',
  '.top-upgrade-btn',
  '.account-balance-rollup-btn',
  '.bank-card-clickable',
  '.card-widget',
  '.tx-item[data-tx-id]',
  '.tx-item-compact[data-tx-id]',
  '.tx-item-compact[onclick]',
  '.archive-bank-spent-cell',
  '.archive-bank-income-cell',
  '.archive-bank-limit-cell',
  '.archive-bank-legend-item',
  '.archive-trend-bar-segment',
  '.archive-bank-point',
  '.archive-bank-line-hit',
  '.card-widget[onclick]',
  '.budget-bank-row[onclick]',
  '.tx-col-title[onclick]',
  '.toggle-switch',
  '.sheets-toggle-switch',
  '.tx-payment-source',
  '.settings-plan-row',
  '.add-bank-btn',
  '.mini-action-btn',
  '.overview-details-back',
  '.txn-filter-toggle-btn',
  '.txn-chart-toggle-btn',
  '.managed-bank-edit-btn',
  '.mass-tag-act-btn',
  '.mass-tag-save-btn',
  '.mass-tag-bar-cancel',
  '.bt-touch-btn',
  '.overview-month-nav',
  '.account-balance-privacy-btn',
  '.overview-privacy-btn',
  '.manager-sheet-back-btn',
  '.sim-submit',
  '.archive-delete-btn'
].join(', ');

let __btActiveTouchEl = null;
try { window.initNavTouchFeedback = initNavTouchFeedback; window.initGlobalTouchFeedback = initGlobalTouchFeedback; window.initBtTouchFeedback = initBtTouchFeedback; } catch (_) {}
try { window.bootstrapUiFromCache = bootstrapUiFromCache; } catch (_) {}


let txnFilterPanelOpen = false;


const CATEGORY_I18N = {
  en: {
    'všetky': 'All',
    'potraviny': 'Groceries',
    'elektronika': 'Electronics',
    'pohonné hmoty': 'Fuel',
    'pohonne hmoty': 'Fuel',
    'auto': 'Car',
    'úver': 'Loan',
    'uver': 'Loan',
    'obchod': 'Shop',
    'kvety': 'Flowers',
    'výplata': 'Salary',
    'vyplata': 'Salary',
    'bankomat': 'ATM',
    'reštaurácie': 'Restaurants',
    'restauracie': 'Restaurants',
    'káva': 'Coffee',
    'kava': 'Coffee',
    'doprava': 'Transport',
    'zdravie': 'Health',
    'drogéria': 'Drugstore',
    'drogeria': 'Drugstore',
    'dom': 'Home',
    'šport': 'Sport',
    'sport': 'Sport',
    'zábava': 'Entertainment',
    'zabava': 'Entertainment',
    'predplatné': 'Subscriptions',
    'predplatne': 'Subscriptions',
    'ostatné': 'Other',
    'ostatne': 'Other',
    'oblečenie': 'Clothing',
    'oblecenie': 'Clothing',
    'obuv': 'Shoes',
    'jedlo': 'Food',
    'bývanie': 'Housing',
    'byvanie': 'Housing',
    'lekáreň': 'Pharmacy',
    'lekaren': 'Pharmacy',
    'účet': 'Account',
    'ucet': 'Account',
    'domácnosť': 'Household',
    'domacnost': 'Household'
  ,
    googleSheetsLocalStatus: 'Google Sheets connection is saved locally. Apps Script URL will be used to save limits, budgets and tokens.'},
  sk: {
    'všetky': 'Všetky',
    'potraviny': 'Potraviny',
    'elektronika': 'Elektronika',
    'pohonné hmoty': 'Pohonné hmoty',
    'pohonne hmoty': 'Pohonné hmoty',
    'auto': 'Auto',
    'úver': 'Úver',
    'uver': 'Úver',
    'obchod': 'Obchod',
    'kvety': 'Kvety',
    'výplata': 'Výplata',
    'vyplata': 'Výplata',
    'bankomat': 'Bankomat',
    'reštaurácie': 'Reštaurácie',
    'restauracie': 'Reštaurácie',
    'káva': 'Káva',
    'kava': 'Káva',
    'doprava': 'Doprava',
    'zdravie': 'Zdravie',
    'drogéria': 'Drogéria',
    'drogeria': 'Drogéria',
    'dom': 'Dom',
    'šport': 'Šport',
    'sport': 'Šport',
    'zábava': 'Zábava',
    'zabava': 'Zábava',
    'predplatné': 'Predplatné',
    'predplatne': 'Predplatné',
    'ostatné': 'Ostatné',
    'ostatne': 'Ostatné',
    'oblečenie': 'Oblečenie',
    'oblecenie': 'Oblečenie',
    'obuv': 'Obuv',
    'jedlo': 'Jedlo',
    'bývanie': 'Bývanie',
    'byvanie': 'Bývanie',
    'lekáreň': 'Lekáreň',
    'lekaren': 'Lekáreň',
    'účet': 'Účet',
    'ucet': 'Účet',
    'domácnosť': 'Domácnosť',
    'domacnost': 'Domácnosť'
  },
  cs: {
    'všetky': 'Vše',
    'potraviny': 'Potraviny',
    'elektronika': 'Elektronika',
    'pohonné hmoty': 'Pohonné hmoty',
    'pohonne hmoty': 'Pohonné hmoty',
    'auto': 'Auto',
    'úver': 'Úvěr',
    'uver': 'Úvěr',
    'obchod': 'Obchod',
    'kvety': 'Květiny',
    'výplata': 'Výplata',
    'vyplata': 'Výplata',
    'bankomat': 'Bankomat',
    'reštaurácie': 'Restaurace',
    'restauracie': 'Restaurace',
    'káva': 'Káva',
    'kava': 'Káva',
    'doprava': 'Doprava',
    'zdravie': 'Zdraví',
    'drogéria': 'Drogerie',
    'drogeria': 'Drogerie',
    'dom': 'Domov',
    'šport': 'Sport',
    'sport': 'Sport',
    'zábava': 'Zábava',
    'zabava': 'Zábava',
    'predplatné': 'Předplatné',
    'predplatne': 'Předplatné',
    'ostatné': 'Ostatní',
    'ostatne': 'Ostatní',
    'oblečenie': 'Oblečení',
    'oblecenie': 'Oblečení',
    'obuv': 'Obuv',
    'jedlo': 'Jídlo',
    'bývanie': 'Bydlení',
    'byvanie': 'Bydlení',
    'lekáreň': 'Lékárna',
    'lekaren': 'Lékárna',
    'účet': 'Účet',
    'ucet': 'Účet',
    'domácnosť': 'Domácnost',
    'domacnost': 'Domácnost'
  ,
    googleSheetsLocalStatus: 'Google Sheets připojení je uložené lokálně. Apps Script URL použijeme k zápisu limitů, budgetů a tokenů.'}
};


const connectionAutoSaveTimers = {};

const LOCAL_TEST_DATA_VERSION = 'local-test-v3-alerts';
let localTestOverviewDetails = null;
try { window.seedBankTrackerLocalTestData = seedBankTrackerLocalTestData; } catch (_) {}
try { window.resetLocalWidgetDemoStores = resetLocalWidgetDemoStores; } catch (_) {}

let monthlyRepairTimer = null;
let monthlyRepairInFlight = false;

// Keď sa vrátiš do appky po uzamknutí mobilu / prepnutí tabu,
// appka sa hneď pokúsi natiahnuť aktuálne dáta.
let lastHiddenAtMs = 0;
let lastResumeSyncAtMs = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    lastHiddenAtMs = Date.now();
    return;
  }
  if (!SHEETS_URL) return;
  var now = Date.now();
  var hiddenForMs = now - Number(lastHiddenAtMs || 0);
  var sinceLastResumeSync = now - Number(lastResumeSyncAtMs || 0);
  // Resume sync only after meaningful background time to avoid noisy refreshes.
  if (hiddenForMs < 4000) return;
  if (sinceLastResumeSync < 120000) return;
  lastResumeSyncAtMs = now;
  setTimeout(function(){
    if (!document.hidden && !isSyncing && SHEETS_URL) {
      syncData({ backgroundMode: true });
    }
  }, 650);
});

const MANAGER_CATEGORY_OPTIONS = [
  'Domácnosť',
  'Potraviny',
  'Pohonné hmoty',
  'Reštaurácie',
  'Káva',
  'Doprava',
  'Zdravie',
  'Drogéria',
  'Dom',
  'Šport',
  'Zábava',
  'Predplatné',
  'Oblečenie',
  'Obuv',
  'Jedlo',
  'Bývanie',
  'Lekáreň',
  'Účet',
  'Bankomat',
  'Ostatné'
];


const COMMON_CURRENCIES = [
  ['CZK', 'Czech koruna'],
  ['EUR', 'Euro'],
  ['USD', 'US dollar'],
  ['GBP', 'British pound'],
  ['PLN', 'Polish zloty'],
  ['HUF', 'Hungarian forint'],
  ['RON', 'Romanian leu'],
  ['BGN', 'Bulgarian lev'],
  ['CHF', 'Swiss franc'],
  ['SEK', 'Swedish krona'],
  ['NOK', 'Norwegian krone'],
  ['DKK', 'Danish krone'],
  ['ISK', 'Icelandic krona'],
  ['TRY', 'Turkish lira'],
  ['UAH', 'Ukrainian hryvnia'],
  ['AUD', 'Australian dollar'],
  ['CAD', 'Canadian dollar'],
  ['NZD', 'New Zealand dollar'],
  ['JPY', 'Japanese yen'],
  ['CNY', 'Chinese yuan'],
  ['HKD', 'Hong Kong dollar'],
  ['SGD', 'Singapore dollar'],
  ['KRW', 'South Korean won'],
  ['INR', 'Indian rupee'],
  ['THB', 'Thai baht'],
  ['MYR', 'Malaysian ringgit'],
  ['IDR', 'Indonesian rupiah'],
  ['PHP', 'Philippine peso'],
  ['VND', 'Vietnamese dong'],
  ['AED', 'UAE dirham'],
  ['SAR', 'Saudi riyal'],
  ['QAR', 'Qatari riyal'],
  ['KWD', 'Kuwaiti dinar'],
  ['ILS', 'Israeli shekel'],
  ['ZAR', 'South African rand'],
  ['MXN', 'Mexican peso'],
  ['BRL', 'Brazilian real'],
  ['ARS', 'Argentine peso'],
  ['CLP', 'Chilean peso'],
  ['COP', 'Colombian peso'],
  ['PEN', 'Peruvian sol'],
  ['EGP', 'Egyptian pound'],
  ['MAD', 'Moroccan dirham']
];

const CURRENCY_SYMBOLS = {
  CZK: 'Kč',
  EUR: '€',
  USD: '$',
  GBP: '£',
  PLN: 'zł',
  HUF: 'Ft',
  RON: 'lei',
  BGN: 'лв',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  ISK: 'kr',
  TRY: '₺',
  UAH: '₴',
  AUD: 'A$',
  CAD: 'C$',
  NZD: 'NZ$',
  JPY: '¥',
  CNY: '¥',
  HKD: 'HK$',
  SGD: 'S$',
  KRW: '₩',
  INR: '₹',
  THB: '฿',
  MYR: 'RM',
  IDR: 'Rp',
  PHP: '₱',
  VND: '₫',
  AED: 'د.إ',
  SAR: '﷼',
  QAR: 'ر.ق',
  KWD: 'د.ك',
  ILS: '₪',
  ZAR: 'R',
  MXN: 'Mex$',
  BRL: 'R$',
  ARS: 'AR$',
  CLP: 'CLP$',
  COP: 'COL$',
  PEN: 'S/',
  EGP: 'E£',
  MAD: 'DH'
};

const CURRENCY_CODES_BY_SYMBOL = {
  'Kč': 'CZK',
  'KC': 'CZK',
  'KČ': 'CZK',
  'CZK': 'CZK',
  '€': 'EUR',
  'EUR': 'EUR',
  '$': 'USD',
  'USD': 'USD',
  '£': 'GBP',
  'GBP': 'GBP',
  'zł': 'PLN',
  'ZŁ': 'PLN',
  'zl': 'PLN',
  'ZL': 'PLN',
  'PLN': 'PLN'
};
try { window.initPullToRefresh = initPullToRefresh; } catch (_) {}


let __sheetScrollLockY = 0;
let __sheetScrollLockMode = 'none';

let upgradeReturnPageId = 'settings';


const managedBankAutoSaveTimers = {};


let archiveRenderState = { months: [], rendered: 0, monthlyCounts: {}, visibleBankKeys: [] };
let archiveScrollQueued = false;




const I18N = {
  en: {
    appTitle: 'Bank Tracker',
    overview: 'Overview',
    transactions: 'Transactions',
    archiveTitle: 'Archive',
    settings: 'Settings',
    language: 'Language',
    appCurrency: 'App currency',
    payments: 'payments',
    daysLeft: 'days left',
    totalTransactions: 'transactions',
    overviewSummaryTransactions: 'Transactions',
    overviewSummaryTotalCzk: 'Total (CZK)',
    overviewSummaryThisMonth: 'this month',
    recentTransactions: 'recent transactions',
    spentByCurrency: 'spent by currency',
    spentByBank: 'spent by bank',
    budgetByBank: 'budget by bank',
    type: 'Type',
    bankTypeCard: 'Card',
    bankTypeAccount: 'Account',
    bank: 'Bank',
    category: 'Category',
    all: 'All',
    incoming: 'Incoming',
    outgoing: 'Outgoing',
    outgoingOption: 'Expense (-)',
    incomingOption: 'Income (+)',
    spent: 'Spent',
    income: 'Income',
    archiveSubtitle: 'Monthly trends',
    spendingTrend: 'Spending trend',
    lastMonthsHint: 'Last 8 months · tap point to inspect',
    noHistoryYet: 'No history yet',
    noHistoryText: 'Past months with transactions will appear here once a full month has passed.',
    monthlyArchive: 'Monthly archive',
    archiveMonthlyTotalsHint: 'Card payments, spending and income totals by bank.',
    plan: 'plan',
    freePlan: 'Free plan',
    freePlanSub: 'Manual entry · upgrade for auto-sync',
    upgradePageSub: 'Manual entry · upgrade for auto-sync',
    upgradePageSubPremium: 'Auto-sync enabled',
    upgradePageSubPro: 'All premium features enabled',
    upgrade: 'Upgrade',
    enableNotifications: 'Enable notifications',
    notificationsOff: 'Push notifications are not enabled yet.',
    copyFcmToken: 'Copy FCM token',
    myBanks: 'My banks',
    manageBanks: 'Manage banks',
    syncDetectedBanks: 'Sync detected banks',
    googleSheetsConnection: 'Google Sheets connection',
    aboutApp: 'about app',
    appInfoSub: 'Version v2 · bank overview, budgets, archive and push notifications ⚙️🔥',
    sync: 'Sync',
    syncValue: 'Auto every 5 min',
    mode: 'Mode',
    modeValue: 'PWA / Google Sheets',
    quickAdd: 'Quick add',
    addTransaction: 'Add transaction',
    addTransactionHint: 'Manually add a new payment or income.',
    addBank: 'Add bank',
    addBankHint: 'Add a new bank, currency, budget and card limit.',
    addLoan: 'Add loan',
    addLoanHint: 'Create a new loan/mortgage account.',
    addWidget: 'Add widget',
    addWidgetHint: 'Create a dashboard graph from your data or a manual value.',
    completed: 'Completed',
    notCompleted: 'Missed',
    missingCurrent: 'Missing',
    switchToStackedBarChart: 'Switch to stacked bar chart',
    switchToLineChart: 'Switch to line chart',
    stackedByBank: 'stacked by bank',
    noLimit: 'no limit',
    monthArchive: 'Monthly archive',
    saveChanges: 'Save changes',
    autosaveHint: 'Changes are saved automatically. A green check means Google Sheets confirmed the save.',
    saveBank: 'Save bank',
    saveTransaction: 'Save transaction',
    countAsNonSpent: 'Count as non-spent',
    nonSpentHint: 'Excluded from spent, income and net totals. Applies instantly and syncs to Google Sheets in the background.',
    returnedAmountFor: 'Returned amount for',
    notLinkedToPayment: 'Not linked to an outgoing payment',
    returnedAmountHint: 'Select the original outgoing bank transfer. This incoming amount reduces its spent value instead of counting as income.',
    done: 'Done',
    current: 'Current',
    monthly: 'Monthly',
    yearly: 'Yearly',
    bankName: 'Bank name',
    accountLast4: 'Account / Card last 4 digits',
    currency: 'Currency',
    monthlyBudget: 'Monthly budget',
    warnWhenRemaining: 'Warn when remaining',
    monthlyCardLimit: 'Monthly card limit',
    monthlyBalanceLimit: 'Monthly balance limit',
    monthlyBalanceLimitShort: 'balance limit',
    creditCardMonthlyLimit: 'Monthly limit',
    creditCardMonthlyLimitShort: 'monthly limit',
    creditCardOutstandingBalance: 'Outstanding balance',
    monthLabel: 'Month',
    chooseMonth: 'Choose month',
    merchantDescription: 'Merchant / description',
    reference: 'Reference',
    referencePlaceholder: 'optional',
    tagShapeRequired: 'Select Tag shape.',
    tagColorRequired: 'Select Tag color.',
    massTagUpdate: 'Mass tag update',
    txnTagNone: 'No tag',
    massTagSelectHint: 'Tap transactions to select them, then choose an action below.',
    massTagSourceHint: 'First filter transactions in the list, then assign them to a tag here.',
    massTagOnlyUntagged: 'Only transactions without tag',
    massTagMode: 'Action',
    massTagModeExisting: 'Assign to existing tag',
    massTagModeNew: 'Create / edit tag',
    massTagModeClear: 'Remove tag',
    massTagExisting: 'Existing tag',
    massTagPickExisting: 'Choose an existing tag.',
    massTagPickAction: 'Choose what to do with the tag.',
    massTagNoExisting: 'No tags yet',
    massTagNoSelection: 'Select at least one transaction.',
    massTagNameRequired: 'Enter a tag name.',
    massTagClearHint: 'Selected transactions will lose their tag.',
    massTagMatches: 'Selected',
    massTagEmptyHint: 'Leave Tag empty to remove it from selected transactions.',
    massTagApply: 'Apply to all',
    massTagNoTargets: 'No transactions match this scope.',
    massTagClearConfirm: 'Remove tag from {n} transactions?',
    amount: 'Amount',
    devSimulator: 'Developer simulator',
    expand: 'Expand ↓',
    collapse: 'Collapse ↑'
  ,
    googleSheetsToggleTitle: 'Google Sheets sync',
    googleSheetsToggleSubOn: 'Enabled — app loads real transactions from Sheets.',
    googleSheetsToggleSubOff: 'Disabled — app uses local cache only.',
    bankBudgetTitle: 'Bank budget',
    progress: 'progress',
    usedThisMonth: 'used this month',
    paymentsLeft: 'payments left',
    paymentsWord: 'payments',
    leftWord: 'left',
    paymentLimitReached: 'payment limit reached',
    withoutMonthlyLimit: 'without monthly limit',
    budgetNotSet: 'Budget is not set yet.',
    budgetStatusTitle: 'Bank budget',
    accountBalanceTitle: 'Account balance',
    accountBalanceManageHint: 'Edit balance in Settings · Manage banks',
    accountBalanceTotal: 'Total',
    accountBalanceTotalHint: 'Converted using app FX rates',
    csobCzCreditOutstandingName: 'CSOB CZ credit card',
    csobCzCreditOutstandingShort: 'Credit card',
    csobCzCreditOutstandingHint: '',
    csobCzCreditOutstandingManageHint: 'Shown as a subaccount under ČSOB CZ. Enter remaining credit limit (e.g. 50 000). Card spend subtracts; repayment adds back. Not included in Total cash.',
    switchToPieChart: 'Switch to pie chart',
    switchToBarChart: 'Switch to bar chart',
    pieChart: 'Pie chart',
    remaining: 'remaining',
    overBudget: 'over budget',
    nearLimit: 'near limit',
    normal: 'normal',
    noTransactionsForFilters: 'No transactions match the selected filters.',
    emptyMovements: 'No movements',
    todayPrefix: 'Today',
    syncTitle: 'Sync',
    googleSheetsConnectionHint: 'Edit Google Sheets connection. Card limits and budgets are managed below via Manage banks.',
    monthlyTrends: 'Monthly trends',
    archiveEmpty: 'Archive is empty for now.',
    noTrendData: 'No trend data yet.',
    monthlyBankTrendNote: 'Monthly spending trend by bank. FX rates are loaded from Google Sheets when available.',
    googleSheetsLocalStatus: 'Google Sheets connection is saved locally. Apps Script URL will be used to save limits, budgets and tokens.',
    upgradeHeroTitle: 'All your banks,<br>one place — automatically.',
    upgradeHeroText: 'EU law (PSD2) gives you the right to your own bank data. We make it seamless across 2,300+ banks in 31 countries.',
    yearlySave: 'Yearly <span class="year-save-badge">Save 37%</span>',
    perMonth: '/ month',
    perYearPremium: '/ month · €14.99/year',
    perYearPro: '/ month · €39.99/year',
    mostPopular: '⭐ Most Popular',
    upgradeFreeBanks: 'Up to 2 banks',
    upgradeManualEntry: 'Manual transaction entry',
    upgradeMonthlyBudget: 'Monthly budget tracking',
    upgradeArchive3m: '3 months of archive',
    upgradeBasicPush: 'Basic push notifications',
    upgradeUnlimitedBanks: 'Unlimited banks',
    upgradeAutoSync: 'Auto-sync via Open Banking (PSD2)',
    upgradeAutoImport: 'Transactions imported automatically',
    upgradeFullArchive: 'Full archive history',
    upgradeAdvancedAlerts: 'Advanced budget & target alerts',
    upgradeCsvExport: 'CSV export',
    upgradeMultiCurrency: 'Multi-currency support',
    upgradePrioritySupport: 'Priority support',
    upgradeEverythingPremium: 'Everything in Premium',
    upgradeAiInsights: 'AI spending insights',
    upgradeFamilySharing: 'Family sharing (up to 5 people)',
    upgradeCustomCategories: 'Custom categories',
    upgradeForecasts: 'Spending forecasts',
    upgradeTaxExport: 'Tax report export',
    joinWaitlistFree: 'Join Waitlist — Free',
    joinProWaitlist: 'Join Pro Waitlist',
    planSavedAlertPrefix: 'Plan',
    planSavedAlertSuffix: 'is saved locally for now. Payments/upgrades will be connected later.',
    searchTransactions: 'Search transactions',
    searchBanksTransactions: 'Search banks or transactions',
    searchBanks: 'Search banks',
    manageBanksTransactions: 'Manage banks and transactions',
    banksTab: 'Banks',
    transactionsTab: 'Transactions',
    edit: 'Edit',
    delete: 'Delete',
    deleteBank: 'Delete bank',
    deleteBankConfirm: 'Delete this bank?',
    bankDeleted: 'Bank deleted.',
    defaultBankCannotDelete: 'Default parser banks cannot be deleted, but you can edit their settings.',
    deleteTransaction: 'Delete transaction',
    deleteTransactionConfirm: 'Delete this transaction?',
    transactionSaved: 'Transaction saved.',
    noTransactions: 'No transactions yet.',
    date: 'Date',
    direction: 'Direction',
    cardLimitShort: 'card limit',
    incomingAlertShort: 'incoming from',
    outgoingAlertShort: 'outgoing from',
    largeMovementAlerts: 'Push alerts',
    largeMovementAlertsHint: '0 = off. The alert is checked per single transaction for the selected month.',
    incomingAlertPlaceholder: 'Incoming from',
    outgoingAlertPlaceholder: 'Outgoing from',
    budgetLabel: 'budget',
    noBanksAdded: 'No banks added yet.',
    cardPayments: 'card payments',
    limitReached: 'limit reached',
    dailyArchive: 'Daily archive',
    dailyCashflow: 'Daily cashflow',
    expenses: 'Expenses',
    selectMonth: 'Month',
    dailyTotal: 'Daily total',
    noDailyData: 'No daily data for this bank and month.',
    tapBankForDaily: 'Tap a bank to see daily income and expenses.',
    czkEquivalent: 'CZK equivalent',
    trendCurrencyNote: 'All currencies are converted to CZK for comparison.',
    bankCurrencyNote: 'Converted to bank currency',
    amountAxis: 'Amount',
    clickBarToFilter: 'Tap a bar to filter transactions.',
    allDays: 'All days',
    selectedDay: 'Selected day',
    showing: 'Showing',
    manualTransaction: 'Manual transaction',
    selectArchiveDate: 'Select date to place this transaction into the correct archive month.',
    editTransaction: 'Edit transaction',
    transactionDeleted: 'Transaction deleted.',
    transactionDeleteFailed: 'Transaction was not deleted.',
    doubleTapToEdit: 'Mobile: long press to edit. PC: double click to edit.',
    appearance: 'Appearance',
    themeMode: 'Theme mode',
    darkTheme: 'Dark',
    lightTheme: 'White',
    themeModeHint: 'Choose the app theme. It also updates the browser/PWA system bars where supported.',
    bankCardLimitsTitle: 'Bank card limits',
    manageThisBank: 'Manage this bank',
    tapRecentBank: 'Tap a bank name to open its transactions.',
    dateRange: 'Date range',
    fromDate: 'From',
    toDate: 'To',
    clearDateFilter: 'Clear date filter',
    allMonths: 'All months',
    transactionTotals: 'Totals',
    filteredTransactions: 'Filtered transactions',
    totalIncoming: 'Incoming',
    totalOutgoing: 'Outgoing',
    totalNet: 'Net',
    noTotalValue: '0.00',
    totalsHint: 'Calculated from the currently visible filters.',
    showMore: 'Load more',
    showingTransactions: 'Showing',
    ofTransactions: 'of',
    transactionsCountLabel: 'transactions',
    renderedForSpeed: 'Only part of the list is rendered for mobile speed. Totals use all filtered transactions.',
    transactionKind: 'Payment type',
    cardsOnly: 'Cards',
    cardSourceFilter: 'Card',
    bankCardsSheetTitle: 'Cards',
    bankCardSlotLabel: 'Card',
    bankCardNumber: 'Card number',
    bankCardExpiry: 'Expiry',
    bankCardCvc: 'CVC',
    copyCard: 'Copy card',
    copyCardShort: 'Copy',
    saveCards: 'Save cards',
    cardCopied: 'Card copied',
    bankCardCopyEmpty: 'Card is empty.',
    bankCardsNoneConfigured: 'No cards configured for this bank in Manage banks.',
    accountsOnly: 'Transfers',
    internalTransfers: 'Internal transfers',
    cardVsAccountHint: 'Card payments count towards bank benefits. Account payments are separated.',
    spent: 'Spent',
    income: 'Income',
    archiveCardsOnlyHint: 'Monthly archive and trend count card payments only.',
    archivePaymentTypeHint: 'Filter this bank detail by all payments, card payments or account payments.',
    paymentKindAll: 'All payments',
    cashOnly: 'Cash',
    manualKindHint: 'Cards count towards bank benefits. Account and cash payments are tracked separately.',
    accountPaymentKind: 'Bank transfer',
    cashPaymentKind: 'Cash payment',
    cardPaymentKind: 'Card payment',
    longPressToEdit: 'Long press a transaction to edit it.',
    backAgainToExit: 'Press Back again to exit',
    dragSheetHint: 'Drag here',
    scrollToLatest: 'Back to latest',
    editKindHint: 'Changing payment type also updates whether the transaction counts as card, account or cash.',
    budgetAllPaymentsHint: 'Bank budget includes cards, account payments and cash.',
    loadOlderData: 'Load older data',
    currentMonthOnly: 'Showing current month only.',
    olderDataHint: 'Older transactions are hidden by default for speed.',
    olderDataLoaded: 'Older data loaded',
    dateRangeOverridesMonth: 'Date range filter can show older months.',
    loading: 'Loading',
    mobilePerfMode: 'Mobile performance mode',
    archiveLoadMore: 'Load more'},
  sk: {
    appTitle: 'Bank Tracker',
    overview: 'Prehľad',
    transactions: 'Transakcie',
    archiveTitle: 'Archív',
    settings: 'Nastavenia',
    language: 'Jazyk',
    appCurrency: 'Měna appky',
    appCurrency: 'Mena appky',
    payments: 'platieb',
    daysLeft: 'dní zostáva',
    totalTransactions: 'transakcie',
    overviewSummaryTransactions: 'Transakcie',
    overviewSummaryTotalCzk: 'Spolu (CZK)',
    overviewSummaryThisMonth: 'tento mesiac',
    recentTransactions: 'posledné transakcie',
    spentByCurrency: 'minuté podľa meny',
    spentByBank: 'minuté podľa banky',
    budgetByBank: 'budget podľa banky',
    type: 'Typ',
    bankTypeCard: 'Karta',
    bankTypeAccount: 'Účet',
    bank: 'Banka',
    category: 'Kategória',
    all: 'Všetky',
    incoming: 'Príjem',
    outgoing: 'Výdaj',
    outgoingOption: 'Výdaj (-)',
    incomingOption: 'Príjem (+)',
    spent: 'Výdavky',
    income: 'Príjmy',
    archiveSubtitle: 'Mesačné trendy',
    spendingTrend: 'Trend výdavkov',
    lastMonthsHint: 'Posledných 8 mesiacov · klikni na bod pre detail',
    noHistoryYet: 'Zatiaľ žiadna história',
    noHistoryText: 'Minulé mesiace s transakciami sa zobrazia po uzavretí celého mesiaca.',
    monthlyArchive: 'Archív mesiacov',
    archiveMonthlyTotalsHint: 'Kartové platby, výdavky a príjmy spolu podľa banky.',
    plan: 'plán',
    freePlan: 'Bezplatný plán',
    freePlanSub: 'Ručné zadávanie · upgrade pre auto-sync',
    upgradePageSub: 'Ručné zadávanie · upgrade pre auto-sync',
    upgradePageSubPremium: 'Auto-sync je zapnutý',
    upgradePageSubPro: 'Všetky premium funkcie sú zapnuté',
    upgrade: 'Upgrade',
    enableNotifications: 'Povoliť upozornenia',
    notificationsOff: 'Push notifications are not enabled yet.',
    copyFcmToken: 'Copy FCM token',
    myBanks: 'Moje banky',
    manageBanks: 'Spravovať banky',
    syncDetectedBanks: 'Synchronizovať nájdené banky',
    googleSheetsConnection: 'Pripojenie k Google Sheets',
    aboutApp: 'o appke',
    appInfoSub: 'Verzia 3.0.2 · bankové prehľady, budgety, archív a push notifikácie ⚙️🔥',
    sync: 'Sync',
    syncValue: 'Auto každých 5 min',
    mode: 'Režim',
    modeValue: 'PWA / Google Sheets',
    quickAdd: 'Rýchle pridanie',
    addTransaction: 'Pridať transakciu',
    addTransactionHint: 'Manuálne zadaj novú platbu alebo príjem.',
    addBank: 'Pridať banku',
    addBankHint: 'Pridaj novú banku, menu, budget a limit karty.',
    addLoan: 'Pridať úver',
    addLoanHint: 'Vytvor nový úver/hypotéku.',
    addWidget: 'Pridať widget',
    addWidgetHint: 'Vytvor graf na nástenku z dát alebo z ručne zadanej hodnoty.',
    completed: 'splnené',
    notCompleted: 'nesplnené',
    missingCurrent: 'chýba',
    switchToStackedBarChart: 'Prepnúť na stĺpcový skladaný graf',
    switchToLineChart: 'Prepnúť na čiarový graf',
    stackedByBank: 'podľa banky',
    noLimit: 'bez limitu',
    monthArchive: 'Archív mesiacov',
    saveChanges: 'Uložiť zmeny',
    autosaveHint: 'Zmeny sa ukladajú automaticky. Zelená fajka znamená, že Google Sheets potvrdil uloženie.',
    saveBank: 'Uložiť banku',
    saveTransaction: 'Uložiť transakciu',
    countAsNonSpent: 'Počítať ako non-spent',
    nonSpentHint: 'Nezapočítava sa do spent, income ani net. Platí hneď a na pozadí sa uloží do Google Sheets.',
    returnedAmountFor: 'Vrátená suma k platbe',
    notLinkedToPayment: 'Nie je prepojená s odchádzajúcou platbou',
    returnedAmountHint: 'Vyber pôvodný odchádzajúci bankový prevod. Táto prijatá suma zníži spent namiesto započítania do income.',
    done: 'Hotovo',
    current: 'Aktuálne',
    monthly: 'Mesačne',
    yearly: 'Ročne',
    bankName: 'Názov banky',
    accountLast4: 'Účet / Karta posledné 4 čísla',
    currency: 'Mena',
    monthlyBudget: 'Mesačný budget',
    warnWhenRemaining: 'Upozorniť keď zostáva',
    monthlyCardLimit: 'Mesačný limit karty',
    monthlyBalanceLimit: 'Mesačný limit zostatku',
    monthlyBalanceLimitShort: 'limit zostatku',
    creditCardMonthlyLimit: 'Mesačný limit',
    creditCardMonthlyLimitShort: 'mesačný limit',
    creditCardOutstandingBalance: 'Dlžný zostatok',
    monthLabel: 'Mesiac',
    chooseMonth: 'Vyber mesiac',
    merchantDescription: 'Obchodník / popis',
    reference: 'Variabilný symbol (VS)',
    referencePlaceholder: 'voliteľné',
    tagShapeRequired: 'Vyber tvar tagu.',
    tagColorRequired: 'Vyber farbu tagu.',
    massTagUpdate: 'Hromadná úprava tagov',
    txnTagNone: 'Bez tagu',
    massTagSelectHint: 'Klikni na transakcie a vyber ich, potom zvoľ akciu nižšie.',
    massTagSourceHint: 'Najprv vyfiltruj transakcie v zozname, potom im tu priraď tag.',
    massTagOnlyUntagged: 'Len transakcie bez tagu',
    massTagMode: 'Akcia',
    massTagModeExisting: 'Priradiť existujúci tag',
    massTagModeNew: 'Vytvoriť / upraviť tag',
    massTagModeClear: 'Odstrániť tag',
    massTagExisting: 'Existujúci tag',
    massTagPickExisting: 'Vyber existujúci tag.',
    massTagPickAction: 'Vyber, čo urobiť s tagom.',
    massTagNoExisting: 'Zatiaľ žiadne tagy',
    massTagNoSelection: 'Vyber aspoň jednu transakciu.',
    massTagNameRequired: 'Zadaj názov tagu.',
    massTagClearHint: 'Vybrané transakcie prídu o tag.',
    massTagMatches: 'Vybrané',
    massTagEmptyHint: 'Nechaj Tag prázdny pre odstránenie tagu z vybraných transakcií.',
    massTagApply: 'Použiť na všetky',
    massTagNoTargets: 'V tomto rozsahu nie sú žiadne transakcie.',
    massTagClearConfirm: 'Odstrániť tag z {n} transakcií?',
    amount: 'Suma',
    devSimulator: 'Vývojársky simulátor',
    expand: 'Rozbaliť ↓',
    collapse: 'Zbaliť ↑'
  ,
    bankBudgetTitle: 'Budget podľa banky',
    progress: 'pokrok',
    usedThisMonth: 'použité tento mesiac',
    paymentsLeft: 'zostáva platieb',
    paymentsWord: 'platieb',
    leftWord: 'zostáva',
    paymentLimitReached: 'limit platieb naplnený',
    withoutMonthlyLimit: 'bez mesačného limitu',
    budgetNotSet: 'Budget zatiaľ nie je nastavený.',
    budgetStatusTitle: 'Bankový budget',
    accountBalanceTitle: 'Zostatok na účte',
    accountBalanceManageHint: 'Zostatok upravíš v Nastavenia · Spravovať banky',
    accountBalanceTotal: 'Spolu',
    accountBalanceTotalHint: 'Prepočítané cez FX kurzy v appke',
    csobCzCreditOutstandingName: 'CSOB CZ credit card',
    csobCzCreditOutstandingShort: 'Credit card',
    csobCzCreditOutstandingHint: '',
    csobCzCreditOutstandingManageHint: 'Zobrazí sa ako podúčet pod ČSOB CZ. Zadaj zostatok limitu (napr. 50 000). Nákup kartou odpočíta, splátka pripočíta. Nie je v Total hotovosti.',
    switchToPieChart: 'Prepnúť na koláčový graf',
    switchToBarChart: 'Prepnúť na stĺpcový graf',
    pieChart: 'Koláčový graf',
    remaining: 'zostáva',
    overBudget: 'prekročený',
    nearLimit: 'blízko limitu',
    normal: 'v norme',
    noTransactionsForFilters: 'Žiadne transakcie neodpovedajú zvoleným filtrom.',
    emptyMovements: 'Žiadne pohyby',
    todayPrefix: 'Dnes',
    syncTitle: 'Synchronizovať',
    googleSheetsConnectionHint: 'Uprav Google Sheets pripojenie. Limity kariet a budgety sa nastavujú nižšie cez Spravovať banky.',
    monthlyTrends: 'Mesačné trendy',
    archiveEmpty: 'Archív je zatiaľ prázdny.',
    noTrendData: 'Zatiaľ nie sú dáta pre trend.',
    monthlyBankTrendNote: 'Mesačný trend výdavkov podľa banky. Kurzy sa načítajú z Google Sheets, keď sú dostupné.',
    googleSheetsLocalStatus: 'Google Sheets pripojenie je uložené lokálne. Apps Script URL použijeme na zápis limitov, budgetov a tokenov.',
    upgradeHeroTitle: 'Všetky tvoje banky,<br>na jednom mieste — automaticky.',
    upgradeHeroText: 'Európske pravidlá PSD2 ti dávajú právo na vlastné bankové dáta. My z nich robíme jednoduchý prehľad bánk, budgetov a transakcií.',
    yearlySave: 'Ročne <span class="year-save-badge">Ušetri 37%</span>',
    perMonth: '/ mesiac',
    perYearPremium: '/ mesiac · €14.99/rok',
    perYearPro: '/ mesiac · €39.99/rok',
    mostPopular: '⭐ Najobľúbenejšie',
    upgradeFreeBanks: 'Do 2 bánk',
    upgradeManualEntry: 'Ručné zadávanie transakcií',
    upgradeMonthlyBudget: 'Mesačné sledovanie budgetu',
    upgradeArchive3m: '3 mesiace archívu',
    upgradeBasicPush: 'Základné push upozornenia',
    upgradeUnlimitedBanks: 'Neobmedzený počet bánk',
    upgradeAutoSync: 'Auto-sync cez Open Banking (PSD2)',
    upgradeAutoImport: 'Transakcie importované automaticky',
    upgradeFullArchive: 'Celá história archívu',
    upgradeAdvancedAlerts: 'Pokročilé budget a cieľové upozornenia',
    upgradeCsvExport: 'CSV export',
    upgradeMultiCurrency: 'Podpora viacerých mien',
    upgradePrioritySupport: 'Prioritná podpora',
    upgradeEverythingPremium: 'Všetko z Premium',
    upgradeAiInsights: 'AI prehľad výdavkov',
    upgradeFamilySharing: 'Rodinné zdieľanie až pre 5 ľudí',
    upgradeCustomCategories: 'Vlastné kategórie',
    upgradeForecasts: 'Predpovede výdavkov',
    upgradeTaxExport: 'Export daňového reportu',
    joinWaitlistFree: 'Pridať sa na waitlist — zdarma',
    joinProWaitlist: 'Pridať sa na Pro waitlist',
    planSavedAlertPrefix: 'Plán',
    planSavedAlertSuffix: 'je zatiaľ uložený len lokálne. Platby/upgrade napojíme neskôr.',
    searchTransactions: 'Hľadať transakcie',
    searchBanksTransactions: 'Hľadať banky alebo transakcie',
    searchBanks: 'Hľadať banky',
    manageBanksTransactions: 'Spravovať banky a transakcie',
    banksTab: 'Banky',
    transactionsTab: 'Transakcie',
    edit: 'Upraviť',
    delete: 'Vymazať',
    deleteBank: 'Vymazať banku',
    deleteBankConfirm: 'Vymazať túto banku?',
    bankDeleted: 'Banka bola vymazaná.',
    defaultBankCannotDelete: 'Predvolené parser banky sa nedajú vymazať, ale vieš upraviť ich nastavenia.',
    deleteTransaction: 'Vymazať transakciu',
    deleteTransactionConfirm: 'Vymazať túto transakciu?',
    transactionSaved: 'Transakcia bola uložená.',
    noTransactions: 'Zatiaľ žiadne transakcie.',
    date: 'Dátum',
    direction: 'Typ',
    cardLimitShort: 'limit karty',
    incomingAlertShort: 'príjem od',
    outgoingAlertShort: 'odchod od',
    largeMovementAlerts: 'Push alerts',
    largeMovementAlertsHint: '0 = vypnuté. Kontroluje sa každá jedna transakcia vo vybranom mesiaci.',
    incomingAlertPlaceholder: 'Prijatá platba od',
    outgoingAlertPlaceholder: 'Odoslaná platba od',
    budgetLabel: 'budget',
    noBanksAdded: 'Nemáš pridané banky.',
    cardPayments: 'platby kartou',
    limitReached: 'limit naplnený',
    dailyArchive: 'Denný archív',
    dailyCashflow: 'Denný cashflow',
    expenses: 'Výdavky',
    selectMonth: 'Mesiac',
    dailyTotal: 'Denný súčet',
    noDailyData: 'Pre túto banku a mesiac nie sú denné dáta.',
    tapBankForDaily: 'Klikni na banku pre denné príjmy a výdavky.',
    czkEquivalent: 'CZK ekvivalent',
    trendCurrencyNote: 'Všetky meny sú pre porovnanie prepočítané na CZK.',
    bankCurrencyNote: 'Prepočítané do meny banky',
    amountAxis: 'Suma',
    clickBarToFilter: 'Klikni na stĺpec pre filtrovanie transakcií.',
    allDays: 'Všetky dni',
    selectedDay: 'Vybraný deň',
    showing: 'Zobrazené',
    manualTransaction: 'Manuálna transakcia',
    selectArchiveDate: 'Vyber dátum, aby sa transakcia zaradila do správneho mesiaca v archíve.',
    editTransaction: 'Upraviť transakciu',
    transactionDeleted: 'Transakcia bola vymazaná.',
    transactionDeleteFailed: 'Transakciu sa nepodarilo vymazať.',
    doubleTapToEdit: 'Dvojklik / dvojité ťuknutie pre úpravu.',
    appearance: 'Vzhľad',
    themeMode: 'Režim témy',
    darkTheme: 'Tmavá',
    lightTheme: 'Biela',
    themeModeHint: 'Vyber tému appky. Kde to systém dovolí, zmení sa aj horná/spodná systémová lišta.',
    bankCardLimitsTitle: 'Limity platieb kartou',
    manageThisBank: 'Spravovať túto banku',
    tapRecentBank: 'Klikni na názov banky pre jej transakcie.',
    dateRange: 'Rozsah dátumov',
    fromDate: 'Od',
    toDate: 'Do',
    clearDateFilter: 'Vymazať dátumový filter',
    allMonths: 'Všetky mesiace',
    transactionTotals: 'Súčty',
    filteredTransactions: 'Vyfiltrované transakcie',
    totalIncoming: 'Príjmy',
    totalOutgoing: 'Výdavky',
    totalNet: 'Rozdiel',
    noTotalValue: '0,00',
    totalsHint: 'Vypočítané podľa aktuálne nastavených filtrov.',
    showMore: 'Načítať ďalšie',
    showingTransactions: 'Zobrazené',
    ofTransactions: 'z',
    transactionsCountLabel: 'transakcií',
    renderedForSpeed: 'Kvôli rýchlosti na mobile sa zobrazuje len časť zoznamu. Súčty počítajú všetky vyfiltrované transakcie.',
    transactionKind: 'Typ platby',
    cardsOnly: 'Karty',
    cardSourceFilter: 'Karta',
    bankCardsSheetTitle: 'Karty',
    bankCardSlotLabel: 'Karta',
    bankCardNumber: 'Číslo karty',
    bankCardExpiry: 'Platnosť',
    bankCardCvc: 'CVC',
    copyCard: 'Kopírovať kartu',
    copyCardShort: 'Kopírovať',
    saveCards: 'Uložiť karty',
    cardCopied: 'Karta skopírovaná',
    bankCardCopyEmpty: 'Karta je prázdna.',
    bankCardsNoneConfigured: 'Pre túto banku nie sú v Manage banks nastavené žiadne karty.',
    accountsOnly: 'Transfers',
    internalTransfers: 'Interné transfery',
    cardVsAccountHint: 'Kartové platby sa počítajú do bankových benefitov. Účtové platby sú oddelené.',
    archiveCardsOnlyHint: 'Mesačný archív a trend počítajú iba kartové platby.',
    archivePaymentTypeHint: 'Detail banky môžeš filtrovať podľa všetkých platieb, kariet alebo účtov.',
    paymentKindAll: 'Všetky platby',
    cashOnly: 'Hotovosť',
    manualKindHint: 'Kartové platby sa počítajú do bankových benefitov. Účtové a hotovostné platby sú oddelené.',
    accountPaymentKind: 'Bankový prevod',
    cashPaymentKind: 'Hotovostná platba',
    cardPaymentKind: 'Platba kartou',
    longPressToEdit: 'Dlhým podržaním upravíš transakciu.',
    backAgainToExit: 'Stlač späť ešte raz pre ukončenie',
    dragSheetHint: 'Potiahni tu',
    scrollToLatest: 'Späť hore',
    editKindHint: 'Zmena typu platby upraví, či sa transakcia počíta ako karta, účet alebo hotovosť.',
    budgetAllPaymentsHint: 'Bankový budget počíta karty, účtové platby aj hotovosť.',
    loadOlderData: 'Načítať staršie dáta',
    currentMonthOnly: 'Zobrazuje sa iba aktuálny mesiac.',
    olderDataHint: 'Staršie transakcie sú kvôli rýchlosti skryté.',
    olderDataLoaded: 'Staršie dáta načítané',
    dateRangeOverridesMonth: 'Dátumový filter môže zobraziť aj staršie mesiace.',
    loading: 'Načítavam',
    mobilePerfMode: 'Mobilný rýchly režim',
    archiveLoadMore: 'Načítať ďalšie'},
  cs: {
    appTitle: 'Bank Tracker',
    overview: 'Přehled',
    transactions: 'Transakce',
    archiveTitle: 'Archiv',
    settings: 'Nastavení',
    language: 'Jazyk',
    payments: 'plateb',
    daysLeft: 'dní zbývá',
    totalTransactions: 'transakce',
    overviewSummaryTransactions: 'Transakce',
    overviewSummaryTotalCzk: 'Celkem (CZK)',
    overviewSummaryThisMonth: 'tento měsíc',
    recentTransactions: 'poslední transakce',
    spentByCurrency: 'utraceno podle měny',
    spentByBank: 'utraceno podle banky',
    budgetByBank: 'budget podle banky',
    type: 'Typ',
    bankTypeCard: 'Karta',
    bankTypeAccount: 'Účet',
    bank: 'Banka',
    category: 'Kategorie',
    all: 'Vše',
    incoming: 'Příjem',
    outgoing: 'Výdaj',
    outgoingOption: 'Výdaj (-)',
    incomingOption: 'Příjem (+)',
    spent: 'Výdaje',
    income: 'Příjmy',
    archiveSubtitle: 'Měsíční trendy',
    spendingTrend: 'Trend výdajů',
    lastMonthsHint: 'Posledních 8 měsíců · klikni na bod pro detail',
    noHistoryYet: 'Zatím žádná historie',
    noHistoryText: 'Minulé měsíce s transakcemi se zobrazí po uzavření celého měsíce.',
    monthlyArchive: 'Archiv měsíců',
    archiveMonthlyTotalsHint: 'Karetní platby, výdaje a příjmy celkem podle banky.',
    plan: 'plán',
    freePlan: 'Bezplatný plán',
    freePlanSub: 'Ruční zadávání · upgrade pro auto-sync',
    upgradePageSub: 'Ruční zadávání · upgrade pro auto-sync',
    upgradePageSubPremium: 'Auto-sync je zapnutý',
    upgradePageSubPro: 'Všechny premium funkce jsou zapnuté',
    upgrade: 'Upgrade',
    enableNotifications: 'Povolit upozornění',
    notificationsOff: 'Push notifikace zatím nejsou zapnuté.',
    copyFcmToken: 'Kopírovat FCM token',
    myBanks: 'Moje banky',
    manageBanks: 'Spravovat banky',
    syncDetectedBanks: 'Synchronizovat nalezené banky',
    googleSheetsConnection: 'Připojení ke Google Sheets',
    aboutApp: 'o aplikaci',
    appInfoSub: 'Verze 3.0.2 · bankovní přehledy, budgety, archiv a push notifikace ⚙️🔥',
    sync: 'Sync',
    syncValue: 'Auto každých 5 min',
    mode: 'Režim',
    modeValue: 'PWA / Google Sheets',
    quickAdd: 'Rychlé přidání',
    addTransaction: 'Přidat transakci',
    addTransactionHint: 'Ručně zadej novou platbu nebo příjem.',
    addBank: 'Přidat banku',
    addBankHint: 'Přidej novou banku, měnu, budget a limit karty.',
    addLoan: 'Přidat úvěr',
    addLoanHint: 'Vytvoř nový úvěr/hypotéku.',
    addWidget: 'Přidat widget',
    addWidgetHint: 'Vytvoř graf na přehled z dat nebo z ručně zadané hodnoty.',
    completed: 'splněno',
    notCompleted: 'nesplněno',
    missingCurrent: 'chybí',
    switchToStackedBarChart: 'Přepnout na skládaný sloupcový graf',
    switchToLineChart: 'Přepnout na čárový graf',
    stackedByBank: 'podle banky',
    noLimit: 'bez limitu',
    monthArchive: 'Archiv měsíců',
    saveChanges: 'Uložit změny',
    autosaveHint: 'Změny se ukládají automaticky. Zelená fajfka znamená, že Google Sheets potvrdil uložení.',
    saveBank: 'Uložit banku',
    saveTransaction: 'Uložit transakci',
    countAsNonSpent: 'Počítat jako non-spent',
    nonSpentHint: 'Nezapočítává se do spent, income ani net. Platí hned a na pozadí se uloží do Google Sheets.',
    returnedAmountFor: 'Vrácená částka k platbě',
    notLinkedToPayment: 'Není propojena s odchozí platbou',
    returnedAmountHint: 'Vyber původní odchozí bankovní převod. Přijatá částka sníží spent místo započítání do income.',
    done: 'Hotovo',
    current: 'Aktuální',
    monthly: 'Měsíčně',
    yearly: 'Ročně',
    bankName: 'Název banky',
    accountLast4: 'Účet / Karta poslední 4 čísla',
    currency: 'Měna',
    monthlyBudget: 'Měsíční budget',
    warnWhenRemaining: 'Upozornit když zbývá',
    monthlyCardLimit: 'Měsíční limit karty',
    monthlyBalanceLimit: 'Měsíční limit zůstatku',
    monthlyBalanceLimitShort: 'limit zůstatku',
    creditCardMonthlyLimit: 'Měsíční limit',
    creditCardMonthlyLimitShort: 'měsíční limit',
    creditCardOutstandingBalance: 'Dlužný zůstatek',
    monthLabel: 'Měsíc',
    chooseMonth: 'Vyber měsíc',
    merchantDescription: 'Obchodník / popis',
    reference: 'Variabilní symbol (VS)',
    referencePlaceholder: 'volitelné',
    tagShapeRequired: 'Vyber tvar tagu.',
    tagColorRequired: 'Vyber barvu tagu.',
    massTagUpdate: 'Hromadná úprava tagů',
    txnTagNone: 'Bez tagu',
    massTagSelectHint: 'Klikni na transakce a vyber je, pak zvol akci níže.',
    massTagSourceHint: 'Nejdřív vyfiltruj transakce v seznamu, pak jim tu přiřaď tag.',
    massTagOnlyUntagged: 'Jen transakce bez tagu',
    massTagMode: 'Akce',
    massTagModeExisting: 'Přiřadit existující tag',
    massTagModeNew: 'Vytvořit / upravit tag',
    massTagModeClear: 'Odstranit tag',
    massTagExisting: 'Existující tag',
    massTagPickExisting: 'Vyber existující tag.',
    massTagPickAction: 'Vyber, co udělat s tagem.',
    massTagNoExisting: 'Zatím žádné tagy',
    massTagNoSelection: 'Vyber alespoň jednu transakci.',
    massTagNameRequired: 'Zadej název tagu.',
    massTagClearHint: 'Vybrané transakce přijdou o tag.',
    massTagMatches: 'Vybrané',
    massTagEmptyHint: 'Nech Tag prázdný pro odstranění tagu z vybraných transakcí.',
    massTagApply: 'Použít na všechny',
    massTagNoTargets: 'V tomto rozsahu nejsou žádné transakce.',
    massTagClearConfirm: 'Odstranit tag z {n} transakcí?',
    amount: 'Částka',
    devSimulator: 'Vývojářský simulátor',
    expand: 'Rozbalit ↓',
    collapse: 'Sbalit ↑'
  ,
    googleSheetsToggleTitle: 'Google Sheets sync',
    googleSheetsToggleSubOn: 'Zapnuto — appka načítá reálné transakce ze Sheets.',
    googleSheetsToggleSubOff: 'Vypnuto — appka používá jen lokální cache.',
    bankBudgetTitle: 'Budget podle banky',
    progress: 'pokrok',
    usedThisMonth: 'použito tento měsíc',
    paymentsLeft: 'zbývá plateb',
    paymentsWord: 'plateb',
    leftWord: 'zbývá',
    paymentLimitReached: 'limit plateb splněn',
    withoutMonthlyLimit: 'bez měsíčního limitu',
    budgetNotSet: 'Budget zatím není nastavený.',
    budgetStatusTitle: 'Bankovní budget',
    accountBalanceTitle: 'Zůstatek na účtu',
    accountBalanceManageHint: 'Zůstatek upravíš v Nastavení · Spravovat banky',
    accountBalanceTotal: 'Celkem',
    accountBalanceTotalHint: 'Přepočteno přes FX kurzy v appce',
    csobCzCreditOutstandingName: 'CSOB CZ credit card',
    csobCzCreditOutstandingShort: 'Credit card',
    csobCzCreditOutstandingHint: '',
    csobCzCreditOutstandingManageHint: 'Zobrazí se jako podúčet pod ČSOB CZ. Zadej zůstatek limitu (např. 50 000). Nákup kartou odečte, splátka přičte. Není v Total hotovosti.',
    switchToPieChart: 'Přepnout na koláčový graf',
    switchToBarChart: 'Přepnout na sloupcový graf',
    pieChart: 'Koláčový graf',
    remaining: 'zbývá',
    overBudget: 'překročený',
    nearLimit: 'blízko limitu',
    normal: 'v normě',
    noTransactionsForFilters: 'Žádné transakce neodpovídají zvoleným filtrům.',
    emptyMovements: 'Žádné pohyby',
    todayPrefix: 'Dnes',
    syncTitle: 'Synchronizovat',
    googleSheetsConnectionHint: 'Uprav Google Sheets připojení. Limity karet a budgety se nastavují níže přes Spravovat banky.',
    monthlyTrends: 'Měsíční trendy',
    archiveEmpty: 'Archiv je zatím prázdný.',
    noTrendData: 'Zatím nejsou data pro trend.',
    monthlyBankTrendNote: 'Měsíční trend výdajů podle banky. Kurzy se načítají z Google Sheets, když jsou dostupné.',
    googleSheetsLocalStatus: 'Google Sheets připojení je uložené lokálně. Apps Script URL použijeme k zápisu limitů, budgetů a tokenů.',
    upgradeHeroTitle: 'Všechny tvoje banky,<br>na jednom místě — automaticky.',
    upgradeHeroText: 'Evropská pravidla PSD2 ti dávají právo na vlastní bankovní data. My z nich děláme jednoduchý přehled bank, budgetů a transakcí.',
    yearlySave: 'Ročně <span class="year-save-badge">Ušetři 37%</span>',
    perMonth: '/ měsíc',
    perYearPremium: '/ měsíc · €14.99/rok',
    perYearPro: '/ měsíc · €39.99/rok',
    mostPopular: '⭐ Nejoblíbenější',
    upgradeFreeBanks: 'Až 2 banky',
    upgradeManualEntry: 'Ruční zadávání transakcí',
    upgradeMonthlyBudget: 'Měsíční sledování budgetu',
    upgradeArchive3m: '3 měsíce archivu',
    upgradeBasicPush: 'Základní push upozornění',
    upgradeUnlimitedBanks: 'Neomezený počet bank',
    upgradeAutoSync: 'Auto-sync přes Open Banking (PSD2)',
    upgradeAutoImport: 'Transakce importované automaticky',
    upgradeFullArchive: 'Celá historie archivu',
    upgradeAdvancedAlerts: 'Pokročilá budget a cílová upozornění',
    upgradeCsvExport: 'CSV export',
    upgradeMultiCurrency: 'Podpora více měn',
    upgradePrioritySupport: 'Prioritní podpora',
    upgradeEverythingPremium: 'Vše z Premium',
    upgradeAiInsights: 'AI přehled výdajů',
    upgradeFamilySharing: 'Rodinné sdílení až pro 5 lidí',
    upgradeCustomCategories: 'Vlastní kategorie',
    upgradeForecasts: 'Předpovědi výdajů',
    upgradeTaxExport: 'Export daňového reportu',
    joinWaitlistFree: 'Přidat se na waitlist — zdarma',
    joinProWaitlist: 'Přidat se na Pro waitlist',
    planSavedAlertPrefix: 'Plán',
    planSavedAlertSuffix: 'je zatím uložený jen lokálně. Platby/upgrade napojíme později.',
    searchTransactions: 'Hledat transakce',
    searchBanksTransactions: 'Hledat banky nebo transakce',
    searchBanks: 'Hledat banky',
    manageBanksTransactions: 'Spravovat banky a transakce',
    banksTab: 'Banky',
    transactionsTab: 'Transakce',
    edit: 'Upravit',
    delete: 'Smazat',
    deleteBank: 'Smazat banku',
    deleteBankConfirm: 'Smazat tuto banku?',
    bankDeleted: 'Banka byla smazána.',
    defaultBankCannotDelete: 'Výchozí parser banky nejdou smazat, ale můžeš upravit jejich nastavení.',
    deleteTransaction: 'Smazat transakci',
    deleteTransactionConfirm: 'Smazat tuto transakci?',
    transactionSaved: 'Transakce byla uložena.',
    noTransactions: 'Zatím žádné transakce.',
    date: 'Datum',
    direction: 'Typ',
    cardLimitShort: 'limit karty',
    incomingAlertShort: 'příjem od',
    outgoingAlertShort: 'odchod od',
    largeMovementAlerts: 'Push alerts',
    largeMovementAlertsHint: '0 = vypnuto. Kontroluje se každá jednotlivá transakce ve vybraném měsíci.',
    incomingAlertPlaceholder: 'Příchozí platba od',
    outgoingAlertPlaceholder: 'Odchozí platba od',
    budgetLabel: 'budget',
    noBanksAdded: 'Nemáš přidané banky.',
    cardPayments: 'platby kartou',
    limitReached: 'limit splněn',
    dailyArchive: 'Denní archiv',
    dailyCashflow: 'Denní cashflow',
    expenses: 'Výdaje',
    selectMonth: 'Měsíc',
    dailyTotal: 'Denní součet',
    noDailyData: 'Pro tuto banku a měsíc nejsou denní data.',
    tapBankForDaily: 'Klikni na banku pro denní příjmy a výdaje.',
    czkEquivalent: 'CZK ekvivalent',
    trendCurrencyNote: 'Všechny měny jsou pro porovnání přepočítané na CZK.',
    bankCurrencyNote: 'Přepočteno do měny banky',
    amountAxis: 'Částka',
    clickBarToFilter: 'Klikni na sloupec pro filtrování transakcí.',
    allDays: 'Všechny dny',
    selectedDay: 'Vybraný den',
    showing: 'Zobrazeno',
    manualTransaction: 'Manuální transakce',
    selectArchiveDate: 'Vyber datum, aby se transakce zařadila do správného měsíce v archivu.',
    editTransaction: 'Upravit transakci',
    transactionDeleted: 'Transakce byla smazána.',
    transactionDeleteFailed: 'Transakci se nepodařilo smazat.',
    doubleTapToEdit: 'Dvojklik / dvojité klepnutí pro úpravu.',
    appearance: 'Vzhled',
    themeMode: 'Režim tématu',
    darkTheme: 'Tmavá',
    lightTheme: 'Bílá',
    themeModeHint: 'Vyber téma appky. Kde to systém dovolí, změní se i horní/spodní systémová lišta.',
    bankCardLimitsTitle: 'Limity plateb kartou',
    manageThisBank: 'Spravovat tuto banku',
    tapRecentBank: 'Klikni na název banky pro její transakce.',
    dateRange: 'Rozsah datumů',
    fromDate: 'Od',
    toDate: 'Do',
    clearDateFilter: 'Smazat datumový filtr',
    allMonths: 'Všechny měsíce',
    transactionTotals: 'Součty',
    filteredTransactions: 'Vyfiltrované transakce',
    totalIncoming: 'Příjmy',
    totalOutgoing: 'Výdaje',
    totalNet: 'Rozdíl',
    noTotalValue: '0,00',
    totalsHint: 'Vypočtené podle aktuálně nastavených filtrů.',
    showMore: 'Načíst další',
    showingTransactions: 'Zobrazeno',
    ofTransactions: 'z',
    transactionsCountLabel: 'transakcí',
    renderedForSpeed: 'Kvůli rychlosti na mobilu se zobrazuje jen část seznamu. Součty počítají všechny vyfiltrované transakce.',
    transactionKind: 'Typ platby',
    cardsOnly: 'Karty',
    cardSourceFilter: 'Karta',
    bankCardsSheetTitle: 'Karty',
    bankCardSlotLabel: 'Karta',
    bankCardNumber: 'Číslo karty',
    bankCardExpiry: 'Platnosť',
    bankCardCvc: 'CVC',
    copyCard: 'Kopírovať kartu',
    copyCardShort: 'Kopírovať',
    saveCards: 'Uložiť karty',
    cardCopied: 'Karta skopírovaná',
    bankCardCopyEmpty: 'Karta je prázdna.',
    bankCardsNoneConfigured: 'Pro tuto banku nejsou v Manage banks nastavené žádné karty.',
    accountsOnly: 'Transfers',
    internalTransfers: 'Interní transfery',
    cardVsAccountHint: 'Kartové platby se počítají do bankovních benefitů. Účtové platby jsou oddělené.',
    archiveCardsOnlyHint: 'Měsíční archiv a trend počítají jen karetní platby.',
    archivePaymentTypeHint: 'Detail banky můžeš filtrovat podle všech plateb, karet nebo účtů.',
    paymentKindAll: 'Všechny platby',
    cashOnly: 'Hotovost',
    manualKindHint: 'Karetní platby se počítají do bankovních benefitů. Účtové a hotovostní platby jsou oddělené.',
    accountPaymentKind: 'Bankovní převod',
    cashPaymentKind: 'Hotovostní platba',
    cardPaymentKind: 'Platba kartou',
    longPressToEdit: 'Dlouhým podržením upravíš transakci.',
    backAgainToExit: 'Stiskni zpět ještě jednou pro ukončení',
    dragSheetHint: 'Potáhni zde',
    scrollToLatest: 'Zpět nahoru',
    editKindHint: 'Změna typu platby upraví, zda se transakce počítá jako karta, účet nebo hotovost.',
    budgetAllPaymentsHint: 'Bankovní budget počítá karty, účtové platby i hotovost.',
    loadOlderData: 'Načíst starší data',
    currentMonthOnly: 'Zobrazuje se jen aktuální měsíc.',
    olderDataHint: 'Starší transakce jsou kvůli rychlosti skryté.',
    olderDataLoaded: 'Starší data načtena',
    dateRangeOverridesMonth: 'Datumový filtr může zobrazit i starší měsíce.',
    loading: 'Načítám',
    mobilePerfMode: 'Mobilní rychlý režim',
    archiveLoadMore: 'Načíst další'}
};

const BANK_STORED_CARD_SLOTS = 3;

let parserRunQueueTimer = null;
let parserRunInFlight = false;
let parserRunLastStartAt = 0;

const ENDPOINT_SERIALIZED_ACTIONS = new Set([
  'saveTransaction',
  'deleteTransaction',
  'saveBankSettings',
  'saveBank',
  'saveBankCards',
  'saveLoan'
]);

let endpointMutationQueue = [];
let endpointMutationQueueRunning = false;

// ── TRANSACTION DELETE GESTURES ────────────────────────────
let txLongPressTimer = null;
let txLongPressTargetId = null;

// ── CARD-LIKE PAGE SWIPE NAVIGATION — MOBILE OPTIMIZED ─────
const PAGE_SWIPE_ORDER = ['overview', 'txns', 'archive', 'settings'];


// ── APP LIGHT / DARK THEME SWITCH ──────────────────────────
const APP_THEMES = {
  dark: {
    themeColor: '#08111f',
    backgroundColor: '#08111f',
    colorScheme: 'dark'
  },
  light: {
    themeColor: '#f8fafc',
    backgroundColor: '#f8fafc',
    colorScheme: 'light'
  }
};

// Keep system bars synced after Chrome/PWA focus changes.
(function keepThemeSystemBarsSynced() {
  let repaintQueued = false;
  let lastMetaSyncAt = 0;
  const repaint = (force = false) => {
    if (repaintQueued) return;
    repaintQueued = true;
    requestAnimationFrame(() => {
      repaintQueued = false;
      const now = Date.now();
      // Skip noisy updates; only keep meta in sync occasionally unless forced.
      if (!force && (now - lastMetaSyncAt) < 900) return;
      lastMetaSyncAt = now;
      const theme = getAppTheme();
      updateThemeMeta(theme);
      const darkBtn = document.getElementById('theme-dark-btn');
      const lightBtn = document.getElementById('theme-light-btn');
      if (darkBtn) darkBtn.classList.toggle('active', theme === 'dark');
      if (lightBtn) lightBtn.classList.toggle('active', theme === 'light');
    });
  };

  repaint(true);
  ['pageshow', 'focus', 'orientationchange'].forEach(eventName => {
    window.addEventListener(eventName, () => repaint(true), { passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) repaint(true);
  }, { passive: true });
  window.addEventListener('resize', () => repaint(false), { passive: true });
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', () => repaint(false), { passive: true });
  }
})();

// ── INICIALIZÁCIA A ŠTART APLIKÁCIE ──────────────────────────────
let startupWarmCachesDone = false;
try { window.warmHeavyTabCachesSync = warmHeavyTabCachesSync; } catch (_) {}

// C (perf): coalesce the startup burst of renderAll() calls.
// During the first few seconds after load, multiple modules + the background
// sync can each trigger a full renderAll (which re-renders every tab). This
// collapses repeated calls within the same frame into a single render, so the
// heavy work runs once instead of many times. After the startup window,
// renderAll behaves synchronously again to preserve existing semantics.
(function setupStartupRenderCoalescer(){
  if (typeof renderAll !== 'function' || renderAll.__btCoalesced) return;
  const originalRenderAll = renderAll;
  const STARTUP_COALESCE_UNTIL = Date.now() + 3000;
  let scheduled = false;
  let queuedOptions = { deferHeavy: false, eagerAllTabs: false, forceArchiveRebuild: false };

  const mergeQueuedRenderAllOptions = (options = {}) => {
    if (options.deferHeavy) queuedOptions.deferHeavy = true;
    if (options.eagerAllTabs) queuedOptions.eagerAllTabs = true;
    if (options.forceArchiveRebuild) queuedOptions.forceArchiveRebuild = true;
  };

  const runQueuedRender = () => {
    scheduled = false;
    const opts = {
      deferHeavy: !!queuedOptions.deferHeavy,
      eagerAllTabs: !!queuedOptions.eagerAllTabs,
      forceArchiveRebuild: !!queuedOptions.forceArchiveRebuild
    };
    queuedOptions = { deferHeavy: false, eagerAllTabs: false, forceArchiveRebuild: false };
    try { originalRenderAll.call(window, opts); }
    catch (e) { console.warn('Coalesced renderAll failed:', e); }
  };

  const coalescedRenderAll = function(options = {}) {
    // After the startup window, keep the original synchronous behavior.
    if (Date.now() > STARTUP_COALESCE_UNTIL) return originalRenderAll.call(this, options);
    mergeQueuedRenderAllOptions(options || {});
    if (scheduled) return;
    scheduled = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(runQueuedRender);
    else window.setTimeout(runQueuedRender, 16);
  };
  coalescedRenderAll.__btCoalesced = true;

  renderAll = coalescedRenderAll;
  try { window.renderAll = coalescedRenderAll; } catch (_) {}
})();

let __btColdBootStarted = false;

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', scheduleAppBootAfterDomReady, { once: true });
} else {
  scheduleAppBootAfterDomReady();
}

window.addEventListener('pageshow', (event) => {
  if (activePageId !== 'overview') return;
  resetOverviewPageBootAnimationState();
  if (event.persisted) {
    __appBootStartedAt = Date.now();
    startAppBootOverlay();
  }
  if (!shouldWaitForOverviewDataSync()) {
    __overviewChartsDataSettled = true;
  }
  if (__appBootActive) {
    finalizeAppBootPresentation();
    return;
  }
  scheduleOverviewPageBootAnimation({ delayMs: 200, force: true });
}, { passive: true });
