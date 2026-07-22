// Generated app-core slice 16/34 (declarations).

function playArchiveTrendChartIntro() {
  const page = document.getElementById('page-archive');
  const wrap = document.getElementById('archive-trend-chart');
  if (!page || !wrap || !page.classList.contains('active')) return;
  if (typeof isPageLoadingOverlayBlocking === 'function' && isPageLoadingOverlayBlocking()) {
    scheduleArchiveChartIntro(120);
    return;
  }
  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (reducedMotion) {
    wrap.querySelectorAll('.archive-bank-line').forEach((line) => {
      line.style.strokeDashoffset = '0';
      line.style.animation = 'none';
    });
    wrap.querySelectorAll('.archive-bank-point').forEach((pt) => {
      pt.style.opacity = '1';
      pt.style.animation = 'none';
    });
    return;
  }

  wrap.querySelectorAll('.archive-trend-bar-animate').forEach((el) => {
    el.style.removeProperty('transform');
    el.style.removeProperty('opacity');
    el.style.removeProperty('animation');
    el.style.removeProperty('animation-delay');
  });
  void wrap.offsetWidth;

  wrap.querySelectorAll('.archive-trend-bar-animate').forEach((el, idx) => {
    el.style.animation = 'archiveBarGrow .9s cubic-bezier(.22,.72,.22,1) both';
    el.style.animationDelay = `${idx * 35}ms`;
  });

  primeArchiveTrendLinesForIntro(wrap);
  void wrap.offsetWidth;

  const lines = Array.from(wrap.querySelectorAll('.archive-bank-line'));
  let maxLineEndMs = 0;
  lines.forEach((line, idx) => {
    let len = 0;
    try { len = line.getTotalLength(); } catch (_) {}
    if (!len || len < 1) len = 420;
    const duration = 1400;
    const delay = idx * 140;
    maxLineEndMs = Math.max(maxLineEndMs, delay + duration);
    try {
      const anim = line.animate(
        [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration, delay, easing: 'ease-out', fill: 'forwards' }
      );
      line.__btArchiveLineAnim = [anim];
      anim.onfinish = () => {
        line.style.strokeDashoffset = '0';
      };
    } catch (_) {
      line.style.strokeDashoffset = '0';
    }
  });

  wrap.querySelectorAll('.archive-bank-point').forEach((pt, idx) => {
    pt.style.opacity = '0';
    pt.style.animation = 'none';
    const delay = Math.min(maxLineEndMs, 260 + idx * 45);
    try {
      const anim = pt.animate(
        [{ opacity: 0, transform: 'scale(0.74)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 420, delay, easing: 'ease-out', fill: 'forwards' }
      );
      pt.__btPointAnim = [anim];
      anim.onfinish = () => {
        pt.style.opacity = '1';
        pt.style.transform = '';
      };
    } catch (_) {
      pt.style.opacity = '1';
    }
  });
}

function finishArchiveTabPresentation() {
  markLoadingPresentationDataReady();
  finishLoadingPresentation(() => {
    scheduleArchiveChartIntro(60);
    window.setTimeout(() => {
      try { maybeLoadMoreArchiveMonths(); } catch (_) {}
    }, 20);
  });
}

function scheduleArchiveTabRender() {
  const list = document.getElementById('archive-months-list');
  const needsRender = !!__btArchiveTabDirty || !(list && list.children && list.children.length);

  if (!needsRender) {
    scheduleArchiveChartIntro(60);
    window.setTimeout(() => {
      try { maybeLoadMoreArchiveMonths(); } catch (_) {}
    }, 20);
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        const run = () => {
          try { renderArchive(); } catch (e) { console.error('Archive list render failed:', e); }

          // Yield after the archive list so the compositor can present another
          // smooth loader frame before the heavier trend SVG is calculated.
          requestAnimationFrame(() => {
            const finishTrend = () => {
              try { renderArchiveTrendChart(); } catch (e) { console.error('Archive chart render failed:', e); }
              __btArchiveTabDirty = false;
              finishArchiveTabPresentation();
            };
            if (typeof requestIdleCallback === 'function') {
              requestIdleCallback(finishTrend, { timeout: 240 });
            } else {
              window.setTimeout(finishTrend, 16);
            }
          });
        };
        if (typeof requestIdleCallback === 'function') {
          requestIdleCallback(run, { timeout: 320 });
        } else {
          window.setTimeout(run, 16);
        }
      }, 32);
    });
  });
}

function playTxnCashflowIntro() {
  const page = document.getElementById('page-txns');
  if (!page || !page.classList.contains('active')) return;
  if (typeof isPageLoadingOverlayBlocking === 'function' && isPageLoadingOverlayBlocking()) {
    scheduleTxnCashflowIntro(120);
    return;
  }
  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  page.classList.remove('txn-cashflow-intro-pending');
  if (reducedMotion) return;
  const slot = document.getElementById('txn-cashflow-slot');
  if (!slot) return;
  const bars = slot.querySelectorAll('.txn-cashflow-bar-in, .txn-cashflow-bar-out');
  if (!bars.length) return;
  bars.forEach((el) => {
    el.style.animation = 'none';
    el.style.removeProperty('animation-delay');
    el.style.transform = 'scaleY(0.16)';
    el.style.opacity = '0.55';
  });
  void slot.offsetWidth;
  bars.forEach((el) => {
    el.style.removeProperty('transform');
    el.style.removeProperty('opacity');
    el.style.animation = 'barGrowSoft 0.72s cubic-bezier(.18,.78,.24,1) both';
    el.style.animationDelay = el.classList.contains('txn-cashflow-bar-out') ? '0.12s' : '0ms';
  });
}

function scheduleTxnCashflowIntro(delayMs = 0) {
  window.setTimeout(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try { playTxnCashflowIntro(); } catch (_) {}
      });
    });
  }, Math.max(0, Number(delayMs || 0)));
}

function presentTxnsTab(options = {}) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.setTimeout(() => {
        const run = () => {
          document.getElementById('page-txns')?.classList.add('txn-cashflow-intro-pending');
          try {
            renderTransactionsSection();
            if (massTagSelectMode) {
              document.getElementById('txn-list')?.removeAttribute('data-rendered-key');
              try { updateTxnPage(true); } catch (_) {}
              updateMassTagBarUi();
            }
          } catch (_) {}
          markLoadingPresentationDataReady();
          finishLoadingPresentation(() => {
            scheduleTxnCashflowIntro(0);
          });
        };
        if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 320 });
        else window.setTimeout(run, 16);
      }, 32);
    });
  });
}

function shouldInsertWidgetAfterTarget(targetEl, clientX, clientY) {
  if (!targetEl || typeof clientX !== 'number' || typeof clientY !== 'number') return false;
  const rect = targetEl.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  const midX = rect.left + rect.width / 2;
  const midY = rect.top + rect.height / 2;
  const dx = clientX - midX;
  const dy = clientY - midY;
  if (Math.abs(dy) > Math.abs(dx) * 0.6) return dy > 0;
  return dx > 0;
}

function reorderListRelative(list, sourceId, targetId, clientX, clientY, getId, getTargetEl) {
  getId = getId || ((item) => item?.id);
  const sourceIndex = list.findIndex((item) => getId(item) === sourceId);
  const targetIndex = list.findIndex((item) => getId(item) === targetId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceId === targetId) return null;
  const targetEl = typeof getTargetEl === 'function' ? getTargetEl(targetId) : null;
  const insertAfter = shouldInsertWidgetAfterTarget(targetEl, clientX, clientY);
  const next = list.slice();
  const [item] = next.splice(sourceIndex, 1);
  const adjustedTarget = next.findIndex((entry) => getId(entry) === targetId);
  if (adjustedTarget < 0) return null;
  const insertAt = insertAfter ? adjustedTarget + 1 : adjustedTarget;
  next.splice(insertAt, 0, item);
  return next;
}

function initBtTouchFeedback(selector) {
  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  document.querySelectorAll(selector).forEach((el) => bindBtTouchElement(el, reducedMotion));
}

function resolveBtTouchTarget(node) {
  if (!node || typeof node.closest !== 'function') return null;
  if (node.closest('#page-overview .custom-widget-add-btn')) return null;
  if (node.closest('#page-overview-details')) return null;
  if (node.closest('input, textarea, select, label, .bottom-sheet-backdrop')) return null;
  if (node.closest('.wealth-card, .custom-widget-card')) {
    const menuBtn = node.closest('.custom-widget-menu button, .custom-widget-manual-controls button');
    return menuBtn || null;
  }
  const menuBtn = node.closest('.custom-widget-menu button, .custom-widget-manual-controls button');
  if (menuBtn) return menuBtn;
  return node.closest(BT_TOUCH_TARGET_SELECTOR);
}

function isBtSvgTouchTarget(el) {
  return !!(el && el.namespaceURI === 'http://www.w3.org/2000/svg');
}

function markBtTouchRippleHost(el) {
  if (!el || isBtSvgTouchTarget(el)) return;
  if (el.classList.contains('fab') || el.classList.contains('scroll-top-fab')) {
    el.classList.add('bt-touch-ripple-host-fixed');
  } else {
    el.classList.add('bt-touch-ripple-host');
  }
}

function spawnBtTouchRipple(el, event, reducedMotion) {
  if (!el || el.disabled || reducedMotion || isBtSvgTouchTarget(el)) return;
  const rect = el.getBoundingClientRect();
  const pointX = (event && typeof event.clientX === 'number') ? event.clientX : (rect.left + rect.width / 2);
  const pointY = (event && typeof event.clientY === 'number') ? event.clientY : (rect.top + rect.height / 2);
  const size = Math.max(rect.width, rect.height) * 2.2;
  const ripple = document.createElement('span');
  ripple.className = 'bt-touch-ripple';
  ripple.style.width = size + 'px';
  ripple.style.height = size + 'px';
  ripple.style.left = (pointX - rect.left - size / 2) + 'px';
  ripple.style.top = (pointY - rect.top - size / 2) + 'px';
  el.appendChild(ripple);
  const cleanup = () => { try { ripple.remove(); } catch (_) {} };
  ripple.addEventListener('animationend', cleanup, { once: true });
  window.setTimeout(cleanup, 520);
}

function bindBtTouchElement(el, reducedMotion) {
  if (!el || el.dataset.btTouchReady === '1') return;
  if (el.matches && el.matches('#page-overview .custom-widget-add-btn')) return;
  el.dataset.btTouchReady = '1';
  markBtTouchRippleHost(el);
  const press = (event) => {
    if (el.disabled) return;
    el.classList.add('is-touch-pressed');
    spawnBtTouchRipple(el, event, reducedMotion);
  };
  const release = () => el.classList.remove('is-touch-pressed');
  el.addEventListener('pointerdown', press, { passive: true });
  el.addEventListener('pointerup', release, { passive: true });
  el.addEventListener('pointercancel', release, { passive: true });
  el.addEventListener('pointerleave', release, { passive: true });
}

function releaseBtActiveTouch() {
  if (!__btActiveTouchEl) return;
  __btActiveTouchEl.classList.remove('is-touch-pressed');
  __btActiveTouchEl = null;
}

function initGlobalTouchFeedback() {
  if (window.__btGlobalTouchBound) return;
  window.__btGlobalTouchBound = true;
  const reducedMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  document.addEventListener('pointerdown', (event) => {
    const el = resolveBtTouchTarget(event.target);
    if (!el || el.disabled) return;
    releaseBtActiveTouch();
    __btActiveTouchEl = el;
    markBtTouchRippleHost(el);
    el.classList.add('is-touch-pressed');
    spawnBtTouchRipple(el, event, reducedMotion);
  }, { passive: true });
  document.addEventListener('pointerup', releaseBtActiveTouch, { passive: true });
  document.addEventListener('pointercancel', releaseBtActiveTouch, { passive: true });
}

function initNavTouchFeedback() {
  initGlobalTouchFeedback();
}

function bootstrapUiFromCache(options = {}) {
  const bootstrapPerfStart = btPerfNow();
  const deferHeavy = options.deferHeavy !== false;
  const shouldRender = options.render !== false;
  if (!options.skipHideBoot) {
    try { hideAppBootChrome(); } catch (_) {}
  }
  try { loadCachedTransactionsSnapshot(); } catch (_) {}
  try { reapplySheetAccountBalancesFromStorage(); } catch (_) {}
  try {
    const headerMonth = document.getElementById('header-month');
    if (headerMonth) headerMonth.textContent = getMonthLabel();
    updateOverviewMonthNavState();
  } catch (_) {}
  btPerfLog('bootstrapShell', btPerfNow() - bootstrapPerfStart, 'cache+header');
  if (shouldRender) {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => {
        try { recomputeAccountBalancesForLoadedMonths(); } catch (_) {}
      }, { timeout: 1200 });
    } else {
      window.setTimeout(() => { try { recomputeAccountBalancesForLoadedMonths(); } catch (_) {} }, 0);
    }
  }
  if (shouldRender) {
    try { renderAll({ visibleOnly: true, deferHeavy }); } catch (_) {}
    try { applyLanguage(); } catch (_) {}
  }
  if (activePageId === 'overview' || document.getElementById('page-overview')?.classList.contains('active')) {
    /* Chart + summary intro runs after dashboard render via finishOverviewChartRenderCycle. */
  }
  btPerfLog('bootstrapCache', btPerfNow() - bootstrapPerfStart, deferHeavy ? 'defer-heavy' : 'eager-heavy');
}

function renderAll(options = {}) {
  const renderAllPerfStart = btPerfNow();
  invalidateTransactionStatsAdjustments();
  const forceArchiveRebuild = !!(options && options.forceArchiveRebuild);
  const renderVisibleOnly = options.eagerAllTabs !== true;
  const deferHeavy = !!(options && options.deferHeavy);
  allTransactions = sortTransactionsNewestFirst(allTransactions);
  if (!(deferHeavy && !forceArchiveRebuild)) {
    rebuildLocalArchiveStatsFromTransactions({ force: forceArchiveRebuild });
  }

  const month = getAktuálneMonth();
  const monthTxns = getCurrentMonthOutgoingTransactions();
  const monthAllTxns = allTransactions.filter(t => normalizeMonthStr(t.month) === normalizeMonthStr(month));
  const monthCardTxns = getCurrentMonthCardTransactions();

  document.getElementById('header-month').textContent = getMonthLabel();
  updateOverviewMonthNavState();
  updateUpgradePlanStatus();
  const txnMonthLabel = document.getElementById('txn-month');
  if (txnMonthLabel) txnMonthLabel.textContent = getMonthLabel();
  const txnAktuálneDate = document.getElementById('txn-current-date');
  if (txnAktuálneDate) txnAktuálneDate.textContent = `${t('todayPrefix')}: ${formatDate(new Date())}`;

  // Overview headline must stay consistent with archive monthly spent total.
  const archiveMonthSpent = getArchiveMonthSpentTotalCzk(month);
  const totalMonthSpent = archiveMonthSpent;
  updateOverviewSummaryStrip(totalMonthSpent, monthAllTxns.length);

  const renderHeavyOverviewSections = () => {
    try {
      renderBudgetStatus();
    } catch (e) {
      document.documentElement.setAttribute('data-render-budget-error', String(e && e.message ? e.message : e));
      console.error('Budget status render failed:', e);
    }
    try {
      renderAccountBalanceWidget();
    } catch (e) {
      document.documentElement.setAttribute('data-render-balance-error', String(e && e.message ? e.message : e));
      console.error('Account balance render failed:', e);
    }
    let byBankMonth = {};
    try {
      byBankMonth = getTransactionsByBank(true, true);
      renderBankCards(byBankMonth);
    } catch (e) {
      document.documentElement.setAttribute('data-render-cards-error', String(e && e.message ? e.message : e));
      console.error('Bank cards render failed:', e);
    }
    try { renderOverviewDashboard(); } catch (e) {
      document.documentElement.setAttribute('data-render-overview-error', String(e && e.message ? e.message : e));
      console.error('Overview dashboard render failed:', e);
    }
    try { renderOverviewFixedWidgets(); } catch (e) { console.warn('Overview fixed widgets render failed:', e); }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try { finishOverviewChartRenderCycle(); } catch (_) {}
      });
    });
  };

  const shouldDeferHeavy = deferHeavy && renderVisibleOnly && (activePageId === 'overview' || !!document.getElementById('page-overview')?.classList.contains('active'));
  if (shouldDeferHeavy) {
    const runDeferredHeavy = () => {
      try { renderHeavyOverviewSections(); } catch (e) { console.error('Deferred overview render failed:', e); }
    };
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(runDeferredHeavy, { timeout: 350 });
    } else {
      requestAnimationFrame(runDeferredHeavy);
    }
  } else {
    renderHeavyOverviewSections();
  }

  // Default: render only the visible tab eagerly and mark the rest dirty.
  if (renderVisibleOnly) {
    renderDeferredTabSections(monthTxns);
  } else {
    renderTransactionsSection(monthTxns);
    renderArchiveSection();
  }
  populateSimulatorLimitMonthDropdown(getSimulatorLimitMonth());
  populateSettingsLimitMonthDropdown(getSettingsLimitMonth());

  applyLanguage();
  btPerfLog('renderAll', btPerfNow() - renderAllPerfStart, [
    renderVisibleOnly ? 'visible-only' : 'full',
    shouldDeferHeavy ? 'defer-heavy' : 'eager-heavy'
  ].join(','));
}

function renderBankCards(byBank) {
  const main = document.getElementById('cards-container');
  const extra = document.getElementById('csob-container');
  if (!main || !extra) return;

  // ČSOB CZ debit and credit card limits are merged under the parent bank; identifiers come from Google Sheets.
  const mergedByBank = { ...(byBank || {}) };
  mergedByBank.csob_cz = [
    ...(mergedByBank.csob_cz || []),
    ...(mergedByBank.csob_cz_credit || [])
  ];

  main.innerHTML = renderBankCard('rb_cz', mergedByBank.rb_cz || []);
  extra.innerHTML = BANK_ORDER
    .filter(k => k !== 'rb_cz' && k !== 'csob_cz_credit')
    .map(k => renderBankCard(k, mergedByBank[k] || []))
    .join('');
  try { scheduleOverviewDetailsBarRefresh(); } catch (_) {}
}


function getBankCardDisplayLabel(bankKey, txns) {
  const lang = getLanguage();
  const prefix = lang === 'en' ? 'Card' : 'Karta';
  const joiner = lang === 'en' ? ' and ' : ' a ';
  const numbers = [];
  const names = [];

  (txns || []).forEach(tx => {
    const raw = String(tx?.card || '').replace(/\*/g, '').trim();
    if (!raw || /^cash$/i.test(raw) || /^účet\b/i.test(raw) || /^ucet\b/i.test(raw)) return;

    const digitGroups = raw.match(/\d{3,}/g);
    if (digitGroups && digitGroups.length) {
      const last = digitGroups[digitGroups.length - 1].slice(-4);
      if (last && !numbers.includes(last)) numbers.push(last);
      return;
    }

    const cleaned = raw.replace(/^karta\s*/i, '').replace(/^card\s*/i, '').trim();
    if (cleaned && !names.includes(cleaned)) names.push(cleaned);
  });

  getVisibleCardsForBank(bankKey).forEach(cardNo => {
    if (cardNo && !numbers.includes(cardNo)) numbers.push(cardNo);
  });

  if (numbers.length) {
    const list = numbers.length === 1
      ? numbers[0]
      : `${numbers.slice(0, -1).join(', ')}${joiner}${numbers[numbers.length - 1]}`;
    return `${prefix} ${list}`;
  }

  if (names.length) {
    const list = names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(', ')}${joiner}${names[names.length - 1]}`;
    return `${prefix} ${list}`;
  }

  return prefix;
}