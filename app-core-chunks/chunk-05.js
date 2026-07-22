// Generated app-core slice 5/34 (declarations).

function getTransactionPaymentKind(tx) {
  if (isAtmCashWithdrawalTransaction(tx)) return 'cash';
  const explicitKind = normalizePaymentKindValue(tx?.paymentKind || '');
  if (explicitKind === 'card' || explicitKind === 'account' || explicitKind === 'cash' || explicitKind === 'internal') return explicitKind;
  const card = String(tx?.card || '');
  const type = String(tx?.type || '');
  const category = String(tx?.category || '');
  const merchant = String(tx?.merchant || '');

  const cardLower = card.toLowerCase();
  const typeLower = type.toLowerCase();
  const categoryLower = category.toLowerCase();
  const merchantLower = merchant.toLowerCase();

  if (typeLower.includes('internal transfer') || categoryLower === 'internal transfer') {
    return 'internal';
  }

  if (
    cardLower.includes('cash') ||
    cardLower.includes('hotov') ||
    typeLower.includes('cash') ||
    typeLower.includes('hotov') ||
    categoryLower.includes('hotov') ||
    merchantLower === 'cash'
  ) {
    return 'cash';
  }

  if (
    /^\d{4}\/\d{4}$/.test(card.trim()) ||
    cardLower.includes('účet') ||
    cardLower.includes('ucet') ||
    typeLower.includes('účtu') ||
    typeLower.includes('uctu') ||
    typeLower.includes('repayment from account') ||
    typeLower.includes('splátka kreditní karty') ||
    typeLower.includes('splatka kreditni karty') ||
    categoryLower === 'účet' ||
    categoryLower === 'ucet'
  ) {
    return 'account';
  }

  if (
    cardLower.includes('karta') ||
    cardLower.includes('card') ||
    card.includes('****') ||
    typeLower.includes('platba kartou') ||
    typeLower.includes('card')
  ) {
    return 'card';
  }

  return 'card';
}
function normalizePaymentKindValue(value) {
  const text = String(value || '').trim().toLowerCase();
  if (!text || text === 'all') return text;
  if (text.includes('bankomat') || text.includes('withdrawal') || text.includes('vyber hotovosti') || text.includes('vyber z bankomatu')) return 'cash';
  if (text.includes('internal') || text.includes('interny') || text.includes('interný') || text.includes('interni') || text.includes('interní')) return 'internal';
  if (text.includes('cash') || text.includes('hotov')) return 'cash';
  if (text.includes('account') || text.includes('transfer') || text.includes('ucet') || text.includes('uctu')) return 'account';
  if (text.includes('card') || text.includes('karta')) return 'card';
  return text === 'cash' || text === 'account' || text === 'card' || text === 'internal' ? text : 'card';
}

function isCardTransaction(tx) {
  return getTransactionPaymentKind(tx) === 'card';
}

function isAccountTransaction(tx) {
  return getTransactionPaymentKind(tx) === 'account';
}

function isCashTransaction(tx) {
  return getTransactionPaymentKind(tx) === 'cash';
}

function normalizeTransactionTagShape(shape) {
  const raw = String(shape || '').trim().toLowerCase();
  if (raw === 'triangle' || raw === 'circle' || raw === 'square') return raw;
  return 'square';
}

function normalizeTransactionTagColor(color) {
  const text = String(color || '').trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) return text.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(text)) {
    const hex = text.slice(1).split('').map(ch => ch + ch).join('');
    return ('#' + hex).toUpperCase();
  }
  return '#58A6FF';
}

function normalizeTransactionTagLabel(label) {
  return String(label || '').trim().slice(0, 24);
}

function parseTransactionTagMeta(tx) {
  const raw = tx?.tagMeta || tx?.tag;
  let parsed = null;
  if (raw && typeof raw === 'object') parsed = raw;
  if (!parsed && typeof raw === 'string') {
    const text = String(raw).trim();
    if (text.startsWith('{') && text.endsWith('}')) {
      try { parsed = JSON.parse(text); } catch(_) {}
    } else if (text.includes('|')) {
      const parts = text.split('|');
      parsed = { shape: parts[0], color: parts[1], name: parts.slice(2).join('|') };
    } else if (text) {
      parsed = { name: text };
    }
  }
  const name = normalizeTransactionTagLabel(
    tx?.tagLabel || tx?.tagName || parsed?.name || parsed?.label || ''
  );
  if (!name) return null;
  const color = normalizeTransactionTagColor(tx?.tagColor || parsed?.color || '#58A6FF');
  const shape = normalizeTransactionTagShape(tx?.tagShape || parsed?.shape || 'square');
  return { name, color, shape };
}

function applyTransactionTagMeta(tx, meta) {
  if (!tx) return;
  const normalized = meta && meta.name ? {
    name: normalizeTransactionTagLabel(meta.name),
    color: normalizeTransactionTagColor(meta.color),
    shape: normalizeTransactionTagShape(meta.shape)
  } : null;
  if (!normalized || !normalized.name) {
    tx.tag = '';
    tx.tagLabel = '';
    tx.tagName = '';
    tx.tagColor = '';
    tx.tagShape = '';
    tx.tagMeta = null;
    return;
  }
  tx.tagLabel = normalized.name;
  tx.tagName = normalized.name;
  tx.tagColor = normalized.color;
  tx.tagShape = normalized.shape;
  tx.tagMeta = normalized;
  tx.tag = JSON.stringify(normalized);
}

function markTagColorPicked(inputId, picked) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.dataset.userPicked = picked ? '1' : '0';
}

function validateRequiredTagFields(tagLabel, shapeValue, colorValue, colorPicked, mode = 'manual') {
  if (!tagLabel) return { ok: true };
  const shape = normalizeTransactionTagShape(shapeValue || '');
  if (!shapeValue) {
    return { ok: false, message: t('tagShapeRequired') || 'Select Tag shape.' };
  }
  const color = normalizeTransactionTagColor(colorValue || '');
  if (!color || String(colorPicked) !== '1') {
    return { ok: false, message: t('tagColorRequired') || 'Select Tag color.' };
  }
  return { ok: true, shape, color };
}

function transactionTagKey(meta) {
  if (!meta || !meta.name) return '';
  const normalized = String(meta.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  return `${meta.shape}|${meta.color}|${normalized}`;
}

function renderTransactionTagIcon(meta) {
  if (!meta || !meta.name) return '';
  const cls = `tx-tag-badge shape-${normalizeTransactionTagShape(meta.shape)}`;
  const color = normalizeTransactionTagColor(meta.color);
  return `<span class="${cls}" style="--tx-tag-color:${escapeAttr(color)};" title="${escapeAttr(meta.name)}"></span>`;
}

function getInternalTransferDetectionSource(tx) {
  const category = String(tx?.category || '').trim().toLowerCase();
  const type = String(tx?.type || '').trim().toLowerCase();
  if (category === 'internal transfer' || type === 'internal transfer') return 'P';
  try {
    if (typeof isInternalTransferTransaction === 'function' && isInternalTransferTransaction(tx)) return 'F';
  } catch(_) {}
  return '';
}

function renderDetectionSourceBadge(source) {
  const s = String(source || '').trim().toUpperCase();
  if (s !== 'P' && s !== 'F') return '';
  const cls = s === 'P' ? 'source-parser' : 'source-fallback';
  const title = s === 'P' ? 'Parser-detected internal transfer' : 'Fallback-detected internal transfer';
  return `<span class="tx-detect-source-pill ${cls}" title="${escapeAttr(title)}">${s}</span>`;
}

function updateTagFiltersUi(tagItems) {
  const wrap = document.getElementById('tag-filters');
  if (!wrap) return;
  const items = Array.isArray(tagItems) ? tagItems : [];
  txnTagKeyToLabel = {};
  const options = [
    { key: 'all', label: t('all'), meta: null },
    { key: 'none', label: t('txnTagNone') || 'No tag', meta: null, isNone: true }
  ].concat(items.map(item => ({
    key: item.key,
    label: item.meta.name,
    meta: item.meta
  })));
  options.forEach(opt => { txnTagKeyToLabel[opt.key] = opt.label; });
  if (activeTxnTag !== 'all' && activeTxnTag !== 'none' && !options.some(opt => opt.key === activeTxnTag)) {
    activeTxnTag = 'all';
  }
  wrap.innerHTML = options.map(opt => {
    const icon = opt.isNone
      ? '<span class="txn-tag-none-icon" aria-hidden="true">∅</span>'
      : (opt.meta ? renderTransactionTagIcon(opt.meta) : '');
    const active = activeTxnTag === opt.key ? ' active' : '';
    return `<div class="txn-filter-pill tag-filter-pill${active}" onclick="filterTransactionTag('${escapeAttr(opt.key)}')">${icon}<span>${escapeHtml(opt.label)}</span></div>`;
  }).join('');
}

function filterTransactionTag(tagKey) {
  activeTxnTag = String(tagKey || 'all') || 'all';
  clearDrilldownTransactionFilter();
  resetTxnVisibleLimit();
  updateTxnPage();
}

function collectKnownTransactionTags() {
  const map = {};
  (allTransactions || []).forEach((tx) => {
    const meta = parseTransactionTagMeta(tx);
    if (!meta || !meta.name) return;
    const key = transactionTagKey(meta);
    if (!key || map[key]) return;
    map[key] = { key, meta };
  });
  return Object.values(map).sort((a, b) => String(a.meta.name).localeCompare(String(b.meta.name), 'sk'));
}

function getMassTagExistingMeta() {
  const key = document.getElementById('mass-tag-existing')?.value || '';
  if (!key) return null;
  const found = collectKnownTransactionTags().find((item) => item.key === key);
  return found ? { ...found.meta } : null;
}

function getMassTagSelectedTransactions() {
  if (!massTagSelectedIds.size) return [];
  return (allTransactions || []).filter((tx) => {
    const id = getTransactionId(tx);
    return id && massTagSelectedIds.has(id);
  });
}

function isMassTagSelectModeActive() {
  return !!massTagSelectMode;
}

function renderMassTagRowSelectUi(txId) {
  if (!isMassTagSelectModeActive() || !txId) return '';
  const selected = massTagSelectedIds.has(String(txId).trim());
  return `<div class="tx-mass-select-box${selected ? ' is-checked' : ''}" aria-hidden="true"></div>`;
}

function toggleMassTagSelection(txId, rowEl) {
  const id = String(txId || '').trim();
  if (!id || !massTagSelectMode) return;
  if (massTagSelectedIds.has(id)) {
    massTagSelectedIds.delete(id);
    rowEl?.classList.remove('is-mass-selected');
    rowEl?.querySelector('.tx-mass-select-box')?.classList.remove('is-checked');
  } else {
    massTagSelectedIds.add(id);
    rowEl?.classList.add('is-mass-selected');
    rowEl?.querySelector('.tx-mass-select-box')?.classList.add('is-checked');
  }
  updateMassTagBarUi();
}

function isMassTagRowSelected(txId) {
  return massTagSelectedIds.has(String(txId || '').trim());
}

function populateMassTagExistingSelect() {
  const existing = document.getElementById('mass-tag-existing');
  const tags = collectKnownTransactionTags();
  if (existing) {
    existing.innerHTML = tags.length
      ? tags.map((item) => `<option value="${escapeAttr(item.key)}">${escapeHtml(item.meta.name)}</option>`).join('')
      : `<option value="">${escapeHtml(t('massTagNoExisting') || 'No tags yet')}</option>`;
    if (activeTxnTag !== 'all' && activeTxnTag !== 'none' && tags.some((item) => item.key === activeTxnTag)) {
      existing.value = activeTxnTag;
    }
  }
  const nameInput = document.getElementById('mass-tag-name');
  const shapeInput = document.getElementById('mass-tag-shape');
  const colorInput = document.getElementById('mass-tag-color');
  if (nameInput) nameInput.value = '';
  if (shapeInput) shapeInput.value = '';
  if (colorInput) {
    colorInput.value = '#58a6ff';
    colorInput.dataset.userPicked = '0';
  }
}

function updateMassTagActionPanelUi() {
  const panel = document.getElementById('mass-tag-action-panel');
  const existingPanel = document.getElementById('mass-tag-panel-existing');
  const newPanel = document.getElementById('mass-tag-panel-new');
  const clearPanel = document.getElementById('mass-tag-panel-clear');
  const preview = document.getElementById('mass-tag-existing-preview');
  const existingBtn = document.getElementById('mass-tag-act-existing');
  const hasTags = collectKnownTransactionTags().length > 0;

  if (existingBtn) existingBtn.disabled = !hasTags;
  if (!hasTags && massTagPendingAction === 'existing') massTagPendingAction = 'new';

  const showPanel = !!massTagPendingAction;
  if (panel) panel.hidden = !showPanel;
  if (existingPanel) existingPanel.hidden = massTagPendingAction !== 'existing';
  if (newPanel) newPanel.hidden = massTagPendingAction !== 'new';
  if (clearPanel) clearPanel.hidden = massTagPendingAction !== 'clear';

  document.querySelectorAll('.mass-tag-act-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.action === massTagPendingAction);
  });

  if (massTagPendingAction === 'existing') {
    const meta = getMassTagExistingMeta();
    if (preview) {
      preview.innerHTML = meta
        ? `${renderTransactionTagIcon(meta)}<span>${escapeHtml(meta.name)} · ${escapeHtml(meta.shape)} · ${escapeHtml(meta.color)}</span>`
        : `<span>${escapeHtml(t('massTagPickExisting') || 'Choose an existing tag.')}</span>`;
    }
  } else if (preview) {
    preview.innerHTML = '';
  }

  updateMassTagBarUi();
}

function setMassTagPendingAction(action) {
  massTagPendingAction = String(action || '');
  updateMassTagActionPanelUi();
}

function updateMassTagBarUi() {
  const bar = document.getElementById('mass-tag-bar');
  const countEl = document.getElementById('mass-tag-bar-count');
  const saveBtn = document.getElementById('mass-tag-save-btn');
  const hint = document.getElementById('mass-tag-select-hint');
  const count = massTagSelectedIds.size;

  if (countEl) {
    const label = t('massTagMatches') || 'Selected';
    countEl.textContent = `${label}: ${count}`;
  }
  if (saveBtn) {
    saveBtn.disabled = !(count > 0 && massTagPendingAction);
  }
  if (bar) {
    const visible = !!massTagSelectMode;
    bar.hidden = !visible;
    bar.setAttribute('aria-hidden', visible ? 'false' : 'true');
    bar.classList.toggle('is-visible', visible);
  }
  if (hint) hint.hidden = !massTagSelectMode;
  try { scheduleFloatingUtilityUpdate(); } catch (_) {}
}

function enterMassTagSelectMode() {
  massTagSelectMode = true;
  massTagSelectedIds.clear();
  massTagPendingAction = collectKnownTransactionTags().length ? 'existing' : 'new';
  closeBottomSheets();
  populateMassTagExistingSelect();
  document.getElementById('page-txns')?.classList.add('mass-tag-select-mode');
  document.body.classList.add('mass-tag-select-active');
  document.getElementById('txn-list')?.removeAttribute('data-rendered-key');
  showPage('txns', { preserveFilters: true });
  updateMassTagActionPanelUi();
  try { updateTxnPage(true); } catch (_) {}
  try { initMassTagSelectDelegation(); } catch (_) {}
  try { initBtTouchFeedback('.mass-tag-bar-cancel, .mass-tag-act-btn, .mass-tag-save-btn'); } catch (_) {}
}

function exitMassTagSelectMode() {
  if (!massTagSelectMode) return;
  massTagSelectMode = false;
  massTagSelectedIds.clear();
  massTagPendingAction = '';
  document.getElementById('page-txns')?.classList.remove('mass-tag-select-mode');
  document.body.classList.remove('mass-tag-select-active');
  document.getElementById('mass-tag-action-panel')?.setAttribute('hidden', '');
  document.getElementById('txn-list')?.removeAttribute('data-rendered-key');
  updateMassTagBarUi();
  try { updateTxnPage(true); } catch (_) {}
}

function openTagMassUpdateSheet() {
  enterMassTagSelectMode();
}

function initMassTagSelectDelegation() {
  if (window.__massTagSelectDelegationReady) return;
  window.__massTagSelectDelegationReady = true;
  document.getElementById('txn-list')?.addEventListener('click', (event) => {
    if (!massTagSelectMode) return;
    const row = event.target.closest('.tx-item[data-tx-id]');
    if (!row) return;
    if (event.target.closest('.tx-payment-source')) return;
    event.preventDefault();
    event.stopPropagation();
    toggleMassTagSelection(row.dataset.txId, row);
  }, true);
}

async function saveMassTagSelection() {
  if (window.__massTagUpdateRunning) return;
  const mode = massTagPendingAction;
  const targets = getMassTagSelectedTransactions();
  if (!targets.length) {
    alert(t('massTagNoSelection') || 'Select at least one transaction.');
    return;
  }
  if (!mode) {
    alert(t('massTagPickAction') || 'Choose what to do with the tag.');
    return;
  }

  let tagMeta = null;
  if (mode === 'clear') {
    const confirmText = (t('massTagClearConfirm') || 'Remove tag from {n} transactions?')
      .replace('{n}', String(targets.length));
    if (!confirm(confirmText)) return;
  } else if (mode === 'existing') {
    tagMeta = getMassTagExistingMeta();
    if (!tagMeta) {
      alert(t('massTagPickExisting') || 'Choose an existing tag.');
      return;
    }
  } else {
    const newName = normalizeTransactionTagLabel(document.getElementById('mass-tag-name')?.value || '');
    const shapeRaw = document.getElementById('mass-tag-shape')?.value || '';
    const colorInput = document.getElementById('mass-tag-color');
    if (!newName) {
      alert(t('massTagNameRequired') || 'Enter a tag name.');
      return;
    }
    const validation = validateRequiredTagFields(
      newName,
      shapeRaw,
      colorInput?.value || '#58A6FF',
      colorInput?.dataset?.userPicked || '1',
      'manual'
    );
    if (!validation.ok) {
      alert(validation.message);
      return;
    }
    tagMeta = { name: newName, color: validation.color, shape: validation.shape };
  }

  window.__massTagUpdateRunning = true;
  const btn = document.getElementById('mass-tag-save-btn');
  const btnLabel = btn ? btn.textContent : '';
  if (btn) {
    btn.disabled = true;
    btn.textContent = '…';
  }

  for (const tx of targets) {
    const oldSnapshot = { ...tx };
    if (mode === 'clear') {
      applyTransactionTagMeta(tx, null);
    } else {
      applyTransactionTagMeta(tx, tagMeta);
    }
    applyLocalArchiveStatsFromTransaction(oldSnapshot, -1);
    applyLocalArchiveStatsFromTransaction(tx, 1);
    saveCachedTransactionsSnapshot();
    try {
      await postToBankTrackerEndpoint('saveTransaction', { transaction: extractTxnPayload(tx) });
    } catch (_) {}
  }

  allTransactions = sortTransactionsNewestFirst(allTransactions);
  saveCachedTransactionsSnapshot();
  window.__massTagUpdateRunning = false;
  if (btn) {
    btn.disabled = false;
    btn.textContent = btnLabel || (t('save') || 'Save');
  }
  showSavedToast();
  exitMassTagSelectMode();
  renderAll();
}

function updatePaymentKindFilterUi() {
  document.getElementById('filter-kind-all')?.classList.toggle('active', activePaymentKind === 'all');
  document.getElementById('filter-kind-card')?.classList.toggle('active', activePaymentKind === 'card');
  document.getElementById('filter-kind-account')?.classList.toggle('active', activePaymentKind === 'account');
  document.getElementById('filter-kind-cash')?.classList.toggle('active', activePaymentKind === 'cash');
  document.getElementById('filter-kind-internal')?.classList.toggle('active', activePaymentKind === 'internal');
}