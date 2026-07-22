// Generated app-core slice 6/34 (declarations).

function getKnownCardFilters() {
  const items = [];
  const addBankCards = (bankKey, label) => {
    getVisibleCardsForBank(bankKey).forEach(card => items.push({ bankKey, label: label || plainBankName(bankKey), card }));
  };
  BANK_ORDER.filter(k => k !== 'csob_cz_credit').forEach(k => addBankCards(k, plainBankName(k)));
  getCustomBanks().forEach(bank => {
    if (!bank || bank.active === false || BANK_ORDER.includes(bank.id)) return;
    cleanBankCardsValue(bank.cards || '').split(',').map(v => v.trim()).filter(Boolean).forEach(card => {
      items.push({ bankKey: bank.id, label: bank.name || bank.id, card });
    });
  });
  (allTransactions || []).forEach(tx => {
    let kind = '';
    try { kind = getTransactionPaymentKind(tx); } catch (_) {}
    if (kind !== 'card') return;
    const card = String(tx?.card || '').replace(/\D/g, '').slice(-4);
    if (!card || card.length !== 4) return;
    const bankKey = typeof getArchiveBankKeyFromTransaction === 'function' ? getArchiveBankKeyFromTransaction(tx) : getBankKey(tx);
    if (!bankKey || bankKey === 'všetky') return;
    items.push({ bankKey, label: plainBankName(bankKey), card });
  });
  const seen = new Set();
  return items.filter(item => {
    const key = item.bankKey + '|' + item.card;
    if (!item.card || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => String(a.label).localeCompare(String(b.label)) || String(a.card).localeCompare(String(b.card)));
}
function updateCardSourceFiltersUi() {
  const wrap = document.getElementById('card-source-filters');
  const title = document.getElementById('card-source-filter-title');
  if (!wrap) return;
  const showCards = activePaymentKind === 'card';
  if (!showCards) {
    if (title) title.style.display = 'none';
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  const items = getKnownCardFilters();
  if (title) title.style.display = items.length ? '' : 'none';
  if (!items.length) {
    wrap.style.display = 'none';
    wrap.innerHTML = '';
    return;
  }
  wrap.style.display = 'flex';
  wrap.innerHTML = `<div class="txn-filter-pill ${!activeCardLast4 ? 'active' : ''}" onclick="filterCardSource('', '')">${escapeHtml(t('all'))}</div>` +
    items.map(item => `<div class="txn-filter-pill ${String(activeCardLast4) === item.card ? 'active' : ''}" onclick="filterCardSource('${escapeAttr(item.bankKey)}','${escapeAttr(item.card)}')">${escapeHtml(item.label)} · ${escapeHtml(item.card)}</div>`).join('');
}

function filterCardSource(bankKey, cardLast4) {
  activePaymentKind = 'card';
  activeCardLast4 = String(cardLast4 || '').replace(/\D/g, '').slice(-4);
  if (bankKey) activeBank = bankKey;
  resetTxnVisibleLimit();
  updatePaymentKindFilterUi();
  updateCardSourceFiltersUi();
  updateTxnPage();
}
function updateDirectionFilterUi() {
  document.getElementById('filter-dir-all')?.classList.toggle('active', activeDirection === 'all');
  document.getElementById('filter-dir-incoming')?.classList.toggle('active', activeDirection === 'incoming');
  document.getElementById('filter-dir-outgoing')?.classList.toggle('active', activeDirection === 'outgoing');
}

function filterPaymentKind(kind) {
  activePaymentKind = kind || 'all';
  clearDrilldownTransactionFilter();
  if (activePaymentKind !== 'card') activeCardLast4 = '';
  resetTxnVisibleLimit();
  updatePaymentKindFilterUi();
  updateCardSourceFiltersUi();
  updateTxnPage();
}

function getActivePageId() {
  const active = document.querySelector('.page.active');
  if (!active || !active.id) return activePageId || 'overview';
  return active.id.replace(/^page-/, '');
}

function initTabHistory() {
  if (window.__bankTrackerTabHistoryReady) return;
  window.__bankTrackerTabHistoryReady = true;

  activePageId = getActivePageId() || 'overview';
  window.__bankTrackerLastBackAt = 0;
  window.__bankTrackerBackToastTimer = null;
  window.__bankTrackerHistoryReadyAt = Date.now();
  dismissBackExitToast();

  const url = location.pathname + location.search + '#' + activePageId;

  try {
    history.replaceState({ bankTrackerRoot: true, bankTrackerPage: activePageId }, '', url);
    history.pushState({ bankTrackerPage: activePageId, bankTrackerExitGuard: true }, '', url);
  } catch (_) {}

  window.addEventListener('popstate', (event) => {
    const now = Date.now();
    const state = event.state || {};

    if (document.body.classList.contains('sheet-open') || document.querySelector('.bottom-sheet.open')) {
      closeBottomSheets();
      try {
        history.pushState({ bankTrackerPage: activePageId || 'overview', bankTrackerExitGuard: true }, '', location.pathname + location.search + '#' + (activePageId || 'overview'));
      } catch (_) {}
      return;
    }

    if (now - (window.__bankTrackerLastBackAt || 0) < 950) {
      exitBankTrackerApp();
      return;
    }

    window.__bankTrackerLastBackAt = now;

    if (state.bankTrackerRoot) {
      showBackExitToast();
      try {
        history.pushState({ bankTrackerPage: activePageId || 'overview', bankTrackerExitGuard: true }, '', location.pathname + location.search + '#' + (activePageId || 'overview'));
      } catch (_) {}
      return;
    }

    const pageId = state.bankTrackerPage;
    if (pageId && document.getElementById('page-' + pageId)) {
      showPage(pageId, { fromHistory: true });
      return;
    }

    showBackExitToast();
  });
}

function dismissBackExitToast() {
  const toast = document.getElementById('back-exit-toast');
  if (!toast) return;
  toast.classList.remove('show');
  if (window.__bankTrackerBackToastTimer) {
    clearTimeout(window.__bankTrackerBackToastTimer);
    window.__bankTrackerBackToastTimer = null;
  }
}

function showBackExitToast() {
  if (__appBootActive || document.body.classList.contains('app-boot-pending')) return;
  if (Date.now() - (window.__bankTrackerHistoryReadyAt || 0) < 1200) return;

  const toast = document.getElementById('back-exit-toast');
  if (!toast) return;

  toast.textContent = t('backAgainToExit');
  toast.classList.add('show');

  if (window.__bankTrackerBackToastTimer) {
    clearTimeout(window.__bankTrackerBackToastTimer);
  }

  window.__bankTrackerBackToastTimer = window.setTimeout(() => {
    dismissBackExitToast();
  }, 1300);
}


function dismissLargeStatusToast() {
  const toast = document.getElementById('large-status-toast');
  if (!toast) return;
  toast.classList.remove('show', 'error', 'loading', 'top-loading');
  if (window.__bankTrackerLargeToastTimer) {
    clearTimeout(window.__bankTrackerLargeToastTimer);
    window.__bankTrackerLargeToastTimer = null;
  }
}

function showLargeStatusToast(message, type) {
  let toast = document.getElementById('large-status-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'large-status-toast';
    toast.className = 'large-status-toast';
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  const isError = type === 'error';
  const isLoading = type === 'loading' || type === 'top-loading';
  const isTopLoading = type === 'top-loading';
  toast.classList.remove('show', 'error', 'loading', 'top-loading');
  toast.classList.toggle('error', isError);
  toast.classList.toggle('loading', isLoading);
  toast.classList.toggle('top-loading', isTopLoading);
  toast.innerHTML = `
    <div class="large-status-icon">${isError ? '!' : (isLoading ? getBtBrandLogoHtml(isTopLoading ? 'inline' : 'toast') : '✓')}</div>
    <div class="large-status-text">${escapeHtml(message || '')}</div>
  `;
  if (isLoading) {
    const svg = toast.querySelector('.bt-brand-logo-svg--draw-loop');
    if (svg) {
      setLogoAnimCycleMs(BT_LOGO_CYCLE_MS, svg);
      void svg.offsetWidth;
    }
  }
  // Restart the animation even when the same toast is shown twice in a row.
  void toast.offsetWidth;
  toast.classList.add('show');
  if (window.__bankTrackerLargeToastTimer) clearTimeout(window.__bankTrackerLargeToastTimer);
  if (isLoading) {
    // Keep the spinner visible while Apps Script is still working.
    // It will be replaced by Saved/Deleted/Error once the request finishes.
    window.__bankTrackerLargeToastTimer = null;
    return;
  }
  window.__bankTrackerLargeToastTimer = window.setTimeout(() => {
    dismissLargeStatusToast();
  }, 1650);
}

function getActionToastText(kind) {
  const lang = (typeof getLanguage === 'function' ? getLanguage() : 'en');
  const isSk = lang === 'sk';
  const isCs = lang === 'cs';
  if (kind === 'saved') return isSk ? 'Uložené' : (isCs ? 'Uloženo' : 'Saved');
  if (kind === 'deleted') return isSk ? 'Vymazané' : (isCs ? 'Smazáno' : 'Deleted');
  return String(kind || 'OK');
}

function showSavedToast() {
  showLargeStatusToast(getActionToastText('saved'));
}

function showDeletedToast() {
  showLargeStatusToast(getActionToastText('deleted'));
}

function showWorkingToast(message) {
  showTopWorkingToast(message);
}

function showTopWorkingToast(message) {
  const lang = (typeof getLanguage === 'function' ? getLanguage() : 'en');
  const fallback = lang === 'sk' ? 'Pracujem...' : (lang === 'cs' ? 'Pracuji...' : 'Working...');
  showLargeStatusToast(message || fallback, 'top-loading');
}

function isBtLightTheme() {
  return document.documentElement.getAttribute('data-theme') === 'light';
}

function getBtLogoCycleMs(ms) {
  // One canonical speed everywhere: splash, tabs, sync/header and inline loaders.
  return 2000;
}

function getBtLogoCssPenHtml() {
  return `<g class="bt-logo-dot-wrap"><circle class="bt-logo-dot bt-logo-dot-mover" cx="0" cy="0" r="18" fill="var(--logo-accent, #00e5ff)" stroke="none"></circle></g>`;
}

function getBtLogoInlineSvgHtml(options = {}) {
  const animated = !!options.animated;
  const viewBox = options.viewBox || '154 100 204 274';
  const dotHtml = animated ? getBtLogoCssPenHtml() : '';
  return `<svg class="bt-logo-inline-svg" viewBox="${viewBox}" aria-hidden="true" focusable="false">
      <g transform="translate(157, 76) scale(0.78)" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path class="bt-logo-stroke bt-logo-stem" pathLength="100" d="M 60 300 L 60 50" stroke="#ffffff" stroke-width="36"></path>
        <path class="bt-logo-stroke bt-logo-arrow" pathLength="100" d="M 20 90 L 60 50 L 100 90" stroke="#00e5ff" stroke-width="36"></path>
        <path class="bt-logo-stroke bt-logo-loop-top" pathLength="100" d="M 60 120 h 80 c 40 0, 60 30, 60 60 c 0 30, -20 60, -60 60 h -80" stroke="#ffffff" stroke-width="36"></path>
        <path class="bt-logo-stroke bt-logo-loop-bottom" pathLength="100" d="M 60 220 h 90 c 50 0, 80 35, 80 70 c 0 35, -30 70, -80 70 h -90" stroke="#00e5ff" stroke-width="36"></path>${dotHtml}
      </g>
    </svg>`;
}

function getBtLogoAnimationHtml(variant = 'loading', options = {}) {
  const sizes = { header: 38, loading: 72, toast: 34, inline: 28, badge: 22 };
  const size = Number(options.size || sizes[variant] || sizes.loading);
  const cycle = getBtLogoCycleMs(options.cycleMs);
  const idAttr = options.id ? ` id="${options.id}"` : '';
  const extraClass = options.extraClass ? ` ${options.extraClass}` : '';
  const viewBox = options.viewBox || (variant === 'loading' ? '0 0 512 512' : '154 100 204 274');
  // v4200: no bg tile rect / glow circle on loading logos — just the animated
  // strokes on the overlay background (user removed the blue square + circle).
  const bgLayer = '';
  return `<svg${idAttr} class="bt-logo-animation-host bt-brand-logo-svg bt-brand-logo-svg--${variant} bt-brand-logo-svg--draw-loop${extraClass}" style="--bt-logo-size:${size}px;width:${size}px;height:${size}px;--bt-logo-cycle-ms:${cycle}ms;" data-cycle-ms="${cycle}" data-logo-size="${size}" viewBox="${viewBox}" width="${size}" height="${size}" aria-hidden="true" focusable="false">${bgLayer}<g transform="translate(157, 76) scale(0.78)" fill="none" stroke-linecap="round" stroke-linejoin="round"><path class="bt-logo-stroke bt-logo-stem" pathLength="100" d="M 60 300 L 60 50" stroke="var(--logo-primary, #ffffff)" stroke-width="36"></path><path class="bt-logo-stroke bt-logo-arrow" pathLength="100" d="M 20 90 L 60 50 L 100 90" stroke="var(--logo-accent, #00e5ff)" stroke-width="36"></path><path class="bt-logo-stroke bt-logo-loop-top" pathLength="100" d="M 60 120 h 80 c 40 0, 60 30, 60 60 c 0 30, -20 60, -60 60 h -80" stroke="var(--logo-primary, #ffffff)" stroke-width="36"></path><path class="bt-logo-stroke bt-logo-loop-bottom" pathLength="100" d="M 60 220 h 90 c 50 0, 80 35, 80 70 c 0 35, -30 70, -80 70 h -90" stroke="var(--logo-accent, #00e5ff)" stroke-width="36"></path>${getBtLogoCssPenHtml()}</g></svg>`;
}

function getBtLoadingExportLogoHtml(options = {}) {
  // Unified inline splash replica (CSS variables) — no iframe dual-theme files.
  return getBtLogoAnimationHtml('loading', {
    cycleMs: options.cycleMs,
    size: Number(options.size || 150),
    extraClass: (options.extraClass || '') + ' bt-splash-logo-unified',
    viewBox: '0 0 512 512'
  });
}

function getBtLogoExportHtml(options = {}) {
  const size = Number(options.size || 72);
  const variant = options.crop === 'b' ? 'header' : 'loading';
  return getBtLogoAnimationHtml(variant, {
    id: options.id,
    size,
    cycleMs: 2000,
    extraClass: options.extraClass || '',
    viewBox: options.crop === 'b' ? '154 100 204 274' : '0 0 512 512'
  });
}

function getBtBrandLogoHeaderStaticHtml(size = 38) {
  return `<span id="header-brand-logo" class="bt-brand-logo bt-logo-inline-host bt-brand-logo--header bt-brand-logo--static bt-brand-logo-svg--header bt-brand-logo-svg--idle" style="width:${size}px;height:${size}px;" aria-hidden="true">${getBtLogoInlineSvgHtml()}</span>`;
}

function getBtBrandLogoHeaderAnimatedHtml(size = 38) {
  return getBtLogoExportHtml({
    id: 'header-brand-logo',
    size,
    cycleMs: BT_LOGO_HEADER_SYNC_CYCLE_MS,
    crop: 'b',
    extraClass: 'bt-brand-logo bt-brand-logo--header bt-brand-logo-svg--header is-header-sync-loop'
  });
}

function refreshBtBrandLogosForTheme() {
  document.querySelectorAll('.bt-logo-animation-host').forEach((logo) => {
    if (logo.hasAttribute('data-first-paint-loader') && document.body?.classList.contains('app-boot-pending')) return;
    setLogoAnimCycleMs(logo.dataset.cycleMs || BT_LOGO_CYCLE_MS, logo);
  });
}

function getBtBrandLogoHtml(variant = 'header') {
  if (variant === 'header') {
    return getBtBrandLogoHeaderStaticHtml(38);
  }
  if (variant === 'loading') {
    return getBtLoadingExportLogoHtml({
      cycleMs: BT_LOGO_CYCLE_BOOT_MS,
      size: 150
    });
  }
  return getBtLogoAnimationHtml(variant, {
    cycleMs: BT_LOGO_CYCLE_MS
  });
}

function getBtInlineLoadingHtml(message = '') {
  const text = (typeof escapeHtml === 'function') ? escapeHtml(message || '') : String(message || '');
  return `<span class="bt-inline-loader">${getBtBrandLogoHtml('inline')}<span>${text}</span></span>`;
}

function getHeaderBrandLogoEl() {
  return document.getElementById('header-brand-logo');
}

function ensureHeaderBrandLogoMarkup(options = {}) {
  const host = document.getElementById('header-brand-wrap');
  const existing = getHeaderBrandLogoEl();
  const wantAnimated = options.animated === true;
  if (!host) return existing;
  if (existing && wantAnimated && existing.classList.contains('bt-logo-animation-host')) {
    setLogoAnimCycleMs(BT_LOGO_HEADER_SYNC_CYCLE_MS, existing);
    return existing;
  }
  if (existing && !wantAnimated && existing.classList.contains('bt-brand-logo--static')) {
    return existing;
  }
  const titleHtml = '<span class="header-brand-title" id="header-brand-title">ank Tracker</span>';
  const logoHtml = wantAnimated ? getBtBrandLogoHeaderAnimatedHtml(38) : getBtBrandLogoHeaderStaticHtml(38);
  if (existing) {
    existing.outerHTML = logoHtml;
  } else {
    host.insertAdjacentHTML('afterbegin', logoHtml);
  }
  if (!document.getElementById('header-brand-title')) {
    host.insertAdjacentHTML('beforeend', titleHtml);
  }
  const logo = getHeaderBrandLogoEl();
  if (logo && wantAnimated) {
    setLogoAnimCycleMs(BT_LOGO_HEADER_SYNC_CYCLE_MS, logo);
  }
  return logo;
}

function finishHeaderBrandDrawAnimation() {
  if (__headerBrandAnimTimer) {
    clearTimeout(__headerBrandAnimTimer);
    __headerBrandAnimTimer = null;
  }
  const logo = getHeaderBrandLogoEl();
  if (logo) {
    logo.classList.remove('is-header-drawing', 'bt-brand-logo-svg--draw-loop', 'bt-brand-logo-svg--draw-once', 'is-header-sync-loop');
    logo.classList.add('bt-brand-logo-svg--idle');
  }
  ensureHeaderBrandLogoMarkup({ animated: false });
  __headerBrandAnimRunning = false;
  __headerBrandAnimQueued = false;
  window.__headerBrandReleaseAfterDraw = false;
}

function releaseHeaderBrandAfterSync() {
  setHeaderBrandSyncState(false);
}

function playHeaderBrandDraw() {}

function scheduleHeaderBrandDrawIsolated() {}

function setSyncBtnSpinning(active) {
  const btn = document.getElementById('sync-btn');
  if (!btn) return;
  const on = !!active;
  if (!btn.dataset.defaultHtml) btn.dataset.defaultHtml = btn.innerHTML;
  if (on) {
    if (__syncBtnSpinHideTimer) {
      clearTimeout(__syncBtnSpinHideTimer);
      __syncBtnSpinHideTimer = null;
    }
    __syncBtnSpinStartedAt = Date.now();
    btn.classList.add('spinning');
    const icon = btn.querySelector('.sync-btn-icon');
    if (!icon || icon.querySelector('.bt-logo-animation-host')) {
      btn.innerHTML = '<span class="sync-btn-icon" aria-hidden="true">↻</span>';
    }
    return;
  }
  const elapsed = Date.now() - (__syncBtnSpinStartedAt || 0);
  const waitMs = Math.max(0, getBtLogoCycleMs(BT_LOGO_CYCLE_MS) - elapsed);
  if (__syncBtnSpinHideTimer) clearTimeout(__syncBtnSpinHideTimer);
  __syncBtnSpinHideTimer = window.setTimeout(() => {
    __syncBtnSpinHideTimer = null;
    btn.classList.remove('spinning');
    if (btn.dataset.defaultHtml) btn.innerHTML = btn.dataset.defaultHtml;
  }, waitMs);
}

function setHeaderBrandSyncState(active) {
  const on = !!active;
  const logo = on ? ensureHeaderBrandLogoMarkup({ animated: true }) : getHeaderBrandLogoEl();
  const wrap = document.getElementById('header-brand-wrap');
  if (on && !logo) return;
  if (on) {
    if (__headerBrandSyncHideTimer) {
      clearTimeout(__headerBrandSyncHideTimer);
      __headerBrandSyncHideTimer = null;
    }
    __headerBrandSyncStartedAt = Date.now();
    if (wrap) wrap.classList.add('is-brand-syncing');
    if (__headerBrandAnimTimer) {
      clearTimeout(__headerBrandAnimTimer);
      __headerBrandAnimTimer = null;
    }
    __headerBrandAnimRunning = false;
    setLogoAnimCycleMs(BT_LOGO_HEADER_SYNC_CYCLE_MS, logo);
    return;
  }
  const elapsed = Date.now() - (__headerBrandSyncStartedAt || 0);
  const waitMs = Math.max(0, HEADER_BRAND_SYNC_MIN_MS - elapsed);
  if (__headerBrandSyncHideTimer) clearTimeout(__headerBrandSyncHideTimer);
  __headerBrandSyncHideTimer = window.setTimeout(() => {
    __headerBrandSyncHideTimer = null;
    const currentLogo = getHeaderBrandLogoEl();
    const currentWrap = document.getElementById('header-brand-wrap');
    if (currentWrap) currentWrap.classList.remove('is-brand-syncing');
    if (currentLogo && !currentLogo.classList.contains('bt-logo-animation-host')) {
      currentLogo.classList.remove('bt-brand-logo-svg--draw-loop', 'bt-brand-logo-svg--draw-once', 'is-header-sync-loop');
      currentLogo.classList.add('bt-brand-logo-svg--idle');
    }
    ensureHeaderBrandLogoMarkup({ animated: false });
  }, waitMs);
}

function getLoadingPresentationCycleMs(kind, tabId) {
  return 2000;
}

function getLoadingPresentationMinMs(kind, tabId) {
  return 2000;
}

function isPageLoadingOverlayBlocking() {
  try {
    const overlay = document.getElementById('page-loading-overlay');
    if (!overlay) return false;
    return overlay.classList.contains('show') || overlay.classList.contains('is-hiding');
  } catch (_) {
    return false;
  }
}