// Generated app-core slice 32/34 (declarations).

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