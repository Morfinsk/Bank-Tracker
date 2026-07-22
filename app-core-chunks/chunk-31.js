// Generated app-core slice 31/34 (declarations).

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