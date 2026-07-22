// Generated app-core slice 15/34 (declarations).

function finishOverviewChartRenderCycle() {
  try {
    const page = document.getElementById('page-overview');
    const hasCharts = !!(page && getOverviewChartCards(page).some((card) => overviewChartCardHasGraphics(card)));
    const hasSummary = !!(page && page.querySelector('.summary-days-progress'));
    if (!hasCharts && !hasSummary) {
      if (activePageId === 'overview' && !__overviewChartBootIntroDone) {
        scheduleOverviewPageBootAnimation({ delayMs: 160 });
      }
      return;
    }

    if (typeof isSyncing !== 'undefined' && isSyncing) {
      scheduleOverviewPageBootAnimation({ delayMs: 180 });
      return;
    }

    if (shouldWaitForOverviewDataSync() && !__overviewChartsDataSettled) {
      scheduleOverviewPageBootAnimation({ delayMs: 160 });
      return;
    }

    if (!shouldWaitForOverviewDataSync() && !__overviewChartsDataSettled) {
      __overviewChartsDataSettled = true;
    }

    // v3910: Hypo/loan reveals deferred until data settled — flush pending plays now.
    try {
      if (typeof window.__btFlushPendingLoanRevealsV3910 === 'function') {
        window.__btFlushPendingLoanRevealsV3910();
      }
    } catch (_) {}

    if (!__overviewChartBootIntroDone) {
      if (!isOverviewPageBootReady()) {
        scheduleOverviewPageBootAnimation({ delayMs: 120 });
        return;
      }
      scheduleOverviewPageBootAnimation();
      return;
    }
    if (window.__overviewPendingSyncChartAnim) {
      window.__overviewPendingSyncChartAnim = false;
      animateOverviewChartsAfterSync();
      return;
    }
    setupOverviewScrollChartAnimations();
  } catch (_) {}
  try { tryCompleteAppBootFromOverviewRender(); } catch (_) {}
}

function animateOverviewChartsAfterMonthShift() {
  if (activePageId !== 'overview') return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animateOverviewChartsIntro();
    });
  });
}

function scheduleNetWorthTrendAnimation() {
  /* Net worth trend animates once with the overview boot pass. */
}

function setupOverviewScrollChartAnimations(options = {}) {
  const page = document.getElementById('page-overview');
  if (!page) return;
  try { if (__overviewChartScrollObserver) __overviewChartScrollObserver.disconnect(); } catch (_) {}
  __overviewChartScrollObserver = null;
  if (__overviewScrollLiveTimer) {
    window.clearTimeout(__overviewScrollLiveTimer);
    __overviewScrollLiveTimer = null;
  }
  if (!('IntersectionObserver' in window)) return;

  const watch = getOverviewChartCards(page).filter(overviewChartCardHasGraphics);
  const daysBar = page.querySelector('.summary-days-progress');
  if (daysBar) watch.push(daysBar);
  if (!watch.length) return;

  __overviewChartScrollLive = false;

  __overviewChartScrollObserver = new IntersectionObserver((entries) => {
    if (!__overviewChartScrollLive || activePageId !== 'overview') return;
    for (const entry of entries) {
      const target = entry.target;
      // Treat near-zero intersection as leave so leave→enter always re-arms animation.
      const nowVisible = !!(entry.isIntersecting && entry.intersectionRatio >= 0.08);
      const wasVisible = __overviewChartWasVisible.get(target) === true;
      if (!nowVisible) {
        __overviewChartWasVisible.set(target, false);
        if (!target.classList.contains('summary-days-progress')) {
          try { delete target.dataset.btChartAnimSig; } catch (_) {}
        }
        continue;
      }
      // Still in view — do not restart mid-scroll jitter.
      if (wasVisible) continue;

      const syncChangedOnly = window.__overviewSyncChangedChartKeys;
      const cardKey = target.classList.contains('summary-days-progress')
        ? null
        : getOverviewChartCardKey(target);
      // After a Sheets sync, only freshly-changed cards may auto-play once.
      // Never keep that filter forever or scroll replays stay broken.
      if (syncChangedOnly && cardKey && !syncChangedOnly.has(cardKey)) {
        __overviewChartWasVisible.set(target, true);
        continue;
      }
      if (target.classList.contains('summary-days-progress')) {
        animateOverviewDaysLeftProgress();
      } else {
        try { delete target.dataset.btChartAnimSig; } catch (_) {}
        animateOverviewChartCard(target);
      }
      __overviewChartWasVisible.set(target, true);
    }
  }, {
    root: null,
    rootMargin: '0px 0px -12% 0px',
    threshold: [0, 0.08, 0.2, 0.35, 0.5]
  });

  watch.forEach((el) => {
    try { __overviewChartScrollObserver.observe(el); } catch (_) {}
  });

  const enableLiveDelayMs = Math.max(0, Number(options.enableLiveDelayMs) || 0);
  const activateScrollObserver = () => {
    __overviewScrollLiveTimer = null;
    __overviewChartScrollLive = true;
    // Sync filter is only for the boot/sync intro window; clear so later scroll works.
    window.__overviewSyncChangedChartKeys = null;
    watch.forEach((el) => {
      const visible = isOverviewChartCardVisible(el);
      const primed = visible && (
        el.classList.contains('summary-days-progress') || overviewChartIntroIsCurrent(el)
      );
      __overviewChartWasVisible.set(el, primed);
    });
  };
  if (enableLiveDelayMs > 0) {
    __overviewScrollLiveTimer = window.setTimeout(activateScrollObserver, enableLiveDelayMs);
  } else {
    requestAnimationFrame(() => {
      requestAnimationFrame(activateScrollObserver);
    });
  }
}

function isOverviewDetailsElementVisible(el) {
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  return rect.bottom > 8 && rect.top < (viewportHeight - 8) && rect.width > 0;
}

function getOverviewDetailsBarFillFromRow(rowEl) {
  if (!rowEl) return null;
  if (rowEl.classList.contains('card-widget')) return rowEl.querySelector('.progress-fill');
  return rowEl.querySelector('.budget-progress-fill');
}

function getOverviewDetailsScrollRows(page = document.getElementById('page-overview-details')) {
  if (!page) return [];
  const rows = [];
  page.querySelectorAll('.card-widget').forEach((row) => {
    if (getOverviewDetailsBarFillFromRow(row)) rows.push(row);
  });
  page.querySelectorAll('.budget-bank-row').forEach((row) => {
    if (getOverviewDetailsBarFillFromRow(row)) rows.push(row);
  });
  return rows;
}

function getOverviewDetailsAnimatedElements(page = document.getElementById('page-overview-details')) {
  return getOverviewDetailsScrollRows(page)
    .map((row) => getOverviewDetailsBarFillFromRow(row))
    .filter(Boolean);
}

function clearOverviewDetailsBarFinishTimer(el) {
  const timerId = __overviewDetailsBarFinishTimers.get(el);
  if (timerId) {
    window.clearTimeout(timerId);
    __overviewDetailsBarFinishTimers.delete(el);
  }
}

function finishOverviewDetailsBar(el) {
  if (!el || el.classList.contains('overview-details-bar-show')) return;
  clearOverviewDetailsBarFinishTimer(el);
  el.classList.remove('overview-details-bar-animating');
  el.classList.add('overview-details-bar-show');
  el.style.animationDelay = '';
  el.style.animationDuration = '';
}

function resetOverviewDetailsBarAnimations(page = document.getElementById('page-overview-details')) {
  if (!page) return;
  page.classList.remove('overview-details-entering');
  getOverviewDetailsAnimatedElements(page).forEach((el) => {
    clearOverviewDetailsBarFinishTimer(el);
    el.classList.remove('overview-details-bar-animating', 'overview-details-bar-show');
    el.style.animationDelay = '';
    el.style.animationDuration = '';
  });
}

function prepareOverviewDetailsBars(page = document.getElementById('page-overview-details')) {
  if (!page) return;
  resetOverviewDetailsBarAnimations(page);
  page.classList.add('overview-details-entering');
}

function resetOverviewDetailsBarForScroll(el) {
  if (!el) return;
  clearOverviewDetailsBarFinishTimer(el);
  el.classList.remove('overview-details-bar-animating', 'overview-details-bar-show');
  el.style.animationDelay = '';
  el.style.animationDuration = '';
}

function onOverviewDetailsBarAnimEnd(ev) {
  const el = ev.target;
  const animName = String(ev.animationName || '');
  if (!el || (animName && animName !== 'btOverviewGrowX')) return;
  finishOverviewDetailsBar(el);
}

function animateOverviewDetailsElement(el, delayMs = 0) {
  if (!el || el.classList.contains('overview-details-bar-animating')) return false;
  clearOverviewDetailsBarFinishTimer(el);
  el.classList.remove('overview-details-bar-show');
  el.style.transition = 'none';
  const delay = Math.max(0, Number(delayMs) || 0);
  el.style.animationDelay = delay > 0 ? `${delay}ms` : '';
  el.style.animationDuration = `${OVERVIEW_DETAILS_BAR_DRAW_MS}ms`;
  el.addEventListener('animationend', onOverviewDetailsBarAnimEnd, { once: true });
  void el.offsetWidth;
  el.classList.add('overview-details-bar-animating');
  __overviewDetailsBarFinishTimers.set(
    el,
    window.setTimeout(() => finishOverviewDetailsBar(el), delay + OVERVIEW_DETAILS_BAR_DRAW_MS + 120)
  );
  return true;
}

function isOverviewDetailsRowVisible(rowEl) {
  return isOverviewDetailsElementVisible(rowEl || getOverviewDetailsBarFillFromRow(rowEl));
}

function startOverviewDetailsBarAnimations() {
  const page = document.getElementById('page-overview-details');
  if (!page || activePageId !== 'overview-details') return;
  if (typeof isPageLoadingOverlayBlocking === 'function' && isPageLoadingOverlayBlocking()) {
    window.setTimeout(() => {
      try { startOverviewDetailsBarAnimations(); } catch (_) {}
    }, 120);
    return;
  }
  page.classList.add('overview-details-entering');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const rows = getOverviewDetailsScrollRows(page);
        let stagger = 0;
        rows.forEach((row) => {
          const fill = getOverviewDetailsBarFillFromRow(row);
          if (!fill) return;
          if (!isOverviewDetailsRowVisible(row)) {
            __overviewDetailsWasVisible.set(row, false);
            return;
          }
          animateOverviewDetailsElement(fill, stagger);
          __overviewDetailsWasVisible.set(row, true);
          stagger += OVERVIEW_DETAILS_BAR_STAGGER_MS;
        });
        try { setupOverviewDetailsScrollAnimations(); } catch (_) {}
      });
    });
  });
}

function scheduleOverviewDetailsBarRefresh() {
  if (activePageId !== 'overview-details') return;
  if (window.__overviewDetailsBarRefreshQueued) return;
  window.__overviewDetailsBarRefreshQueued = true;
  requestAnimationFrame(() => {
    window.__overviewDetailsBarRefreshQueued = false;
    prepareOverviewDetailsBars();
    requestAnimationFrame(() => {
      try { startOverviewDetailsBarAnimations(); } catch (_) {}
    });
  });
}

function animateVisibleOverviewDetailsElements() {
  startOverviewDetailsBarAnimations();
}

function setupOverviewDetailsScrollAnimations() {
  const page = document.getElementById('page-overview-details');
  if (!page) return;
  try { if (__overviewDetailsScrollObserver) __overviewDetailsScrollObserver.disconnect(); } catch (_) {}
  __overviewDetailsScrollObserver = null;
  if (!('IntersectionObserver' in window)) return;

  const watchRows = getOverviewDetailsScrollRows(page);
  if (!watchRows.length) return;

  __overviewDetailsScrollLive = false;
  watchRows.forEach((row) => {
    __overviewDetailsWasVisible.set(row, false);
    const fill = getOverviewDetailsBarFillFromRow(row);
    if (fill) __overviewDetailsScrollFillByRow.set(row, fill);
  });

  __overviewDetailsScrollObserver = new IntersectionObserver((entries) => {
    if (!__overviewDetailsScrollLive || activePageId !== 'overview-details') return;
    for (const entry of entries) {
      const row = entry.target;
      const fill = __overviewDetailsScrollFillByRow.get(row) || getOverviewDetailsBarFillFromRow(row);
      if (!fill) continue;
      const nowVisible = !!entry.isIntersecting && entry.intersectionRatio >= 0.08;
      const wasVisible = !!__overviewDetailsWasVisible.get(row);
      __overviewDetailsWasVisible.set(row, nowVisible);
      if (nowVisible && !wasVisible) {
        animateOverviewDetailsElement(fill);
        continue;
      }
      if (!nowVisible && wasVisible) {
        if (fill.classList.contains('overview-details-bar-animating')) continue;
        resetOverviewDetailsBarForScroll(fill);
      }
    }
  }, {
    root: null,
    rootMargin: '0px 0px -4% 0px',
    threshold: [0, 0.08, 0.2, 0.45]
  });

  watchRows.forEach((row) => {
    try { __overviewDetailsScrollObserver.observe(row); } catch (_) {}
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      watchRows.forEach((row) => {
        const fill = getOverviewDetailsBarFillFromRow(row);
        __overviewDetailsWasVisible.set(
          row,
          isOverviewDetailsRowVisible(row)
            && !!(fill && (fill.classList.contains('overview-details-bar-show') || fill.classList.contains('overview-details-bar-animating')))
        );
      });
      __overviewDetailsScrollLive = true;
    });
  });
}

function scrollOverviewDetailsToTop() {
  try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (_) { try { window.scrollTo(0, 0); } catch (__) {} }
  try { document.documentElement.scrollTop = 0; } catch (_) {}
  try { document.body.scrollTop = 0; } catch (_) {}
  const page = document.getElementById('page-overview-details');
  if (page) page.scrollTop = 0;
}

function openOverviewDetailsSection(anchorId = '') {
  prepareOverviewDetailsBars();
  renderAccountBalanceWidget();
  renderBudgetStatus();
  renderBankCards(getTransactionsByBank(true, true));
  showPage('overview-details');
  scrollOverviewDetailsToTop();

  const normalized = String(anchorId || '').trim();
  // Net worth / available cash / generic top: stay on the header. Do not
  // scrollIntoView(account-balance) — that pushes the header off-screen.
  if (!normalized || normalized === 'overview-details-top' || normalized === 'account-balance-anchor') {
    requestAnimationFrame(() => scrollOverviewDetailsToTop());
    return;
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const anchor = document.getElementById(normalized);
      if (!anchor) {
        scrollOverviewDetailsToTop();
        return;
      }
      try {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (_) {
        try { anchor.scrollIntoView(true); } catch (__) {}
      }
    });
  });
}

function closeOverviewDetails() {
  showPage('overview');
}

function renderOverviewAfterMonthShift() {
  const month = getAktuálneMonth();
  try { reapplySheetAccountBalancesFromStorage(); } catch (_) {}
  try { recomputeAccountBalancesForMonth(month); } catch (_) {}
  const monthAllTxns = allTransactions.filter(t => normalizeMonthStr(t.month) === normalizeMonthStr(month));

  const headerMonth = document.getElementById('header-month');
  if (headerMonth) headerMonth.textContent = getMonthLabel();
  updateOverviewMonthNavState();
  updateUpgradePlanStatus();

  const txnMonthLabel = document.getElementById('txn-month');
  if (txnMonthLabel) txnMonthLabel.textContent = getMonthLabel();
  const txnAktuálneDate = document.getElementById('txn-current-date');
  if (txnAktuálneDate) txnAktuálneDate.textContent = `${t('todayPrefix')}: ${formatDate(new Date())}`;

  const archiveMonthSpent = getArchiveMonthSpentTotalCzk(month);
  const totalMonthSpent = archiveMonthSpent;
  updateOverviewSummaryStrip(totalMonthSpent, monthAllTxns.length);

  requestAnimationFrame(() => {
    try { renderBudgetStatus(); } catch (e) { console.error('Budget status render failed:', e); }
    try { renderAccountBalanceWidget(); } catch (e) { console.error('Account balance render failed:', e); }
    try { renderBankCards(getTransactionsByBank(true, true)); } catch (e) { console.error('Bank cards render failed:', e); }
    try { renderOverviewDashboard(); } catch (e) { console.error('Overview dashboard render failed:', e); }
    try { playOverviewSummaryStripReveal(); } catch (_) {}
    try { animateOverviewChartsAfterMonthShift(); } catch (_) {}
  });

  // Keep currently visible pages consistent without forcing full app re-render.
  try {
    if (activePageId === 'txns') {
      updateTxnPage();
    } else if (activePageId === 'archive') {
      renderArchive();
      renderArchiveTrendChart();
    }
  } catch (_) {}
  try { scheduleFloatingUtilityUpdate(); } catch(_) {}
}

function renderTransactionsSection(monthTxns) {
  try {
    updateTxnPage(monthTxns || getCurrentMonthOutgoingTransactions());
    bindTransactionDeleteGestures();
    __btTxnsTabDirty = false;
  } catch (e) {
    console.error('Transactions section render failed:', e);
  }
}

function renderArchiveSection() {
  try {
    renderArchive();
    renderArchiveTrendChart();
    __btArchiveTabDirty = false;
  } catch (e) {
    console.error('Archive section render failed:', e);
  }
}

// Render the heavy section for the currently active tab now; mark the others
// dirty so they render on first visit.
function renderDeferredTabSections(monthTxns) {
  if (activePageId === 'txns') renderTransactionsSection(monthTxns);
  else __btTxnsTabDirty = true;
  if (activePageId === 'archive') renderArchiveSection();
  else __btArchiveTabDirty = true;
}

function renderDirtyTabSection(pageId) {
  if (pageId === 'txns' && __btTxnsTabDirty) { renderTransactionsSection(); return true; }
  if (pageId === 'archive' && __btArchiveTabDirty) { renderArchiveSection(); return true; }
  return false;
}

function primeArchiveTrendLinesForIntro(wrap) {
  if (!wrap) return;
  wrap.querySelectorAll('.archive-bank-line').forEach((line) => {
    try { (line.__btArchiveLineAnim || []).forEach((anim) => anim.cancel()); } catch (_) {}
    line.__btArchiveLineAnim = null;
    line.style.animation = 'none';
    let len = 0;
    try { len = line.getTotalLength(); } catch (_) {}
    if (!len || len < 1) len = 420;
    line.style.strokeDasharray = `${len}`;
    line.style.strokeDashoffset = `${len}`;
  });
  wrap.querySelectorAll('.archive-bank-point').forEach((pt) => {
    pt.style.opacity = '0';
    pt.style.animation = 'none';
  });
}

function scheduleArchiveChartIntro(delayMs = 0) {
  const token = ++__archiveChartIntroToken;
  if (__archiveChartIntroObserver) {
    try { __archiveChartIntroObserver.disconnect(); } catch (_) {}
    __archiveChartIntroObserver = null;
  }
  window.setTimeout(() => {
    if (token !== __archiveChartIntroToken) return;
    requestAnimationFrame(() => {
      if (token !== __archiveChartIntroToken) return;
      requestAnimationFrame(() => {
        if (token !== __archiveChartIntroToken) return;
        const page = document.getElementById('page-archive');
        const wrap = document.getElementById('archive-trend-chart');
        if (!page || !wrap || !page.classList.contains('active')) return;
        const rect = wrap.getBoundingClientRect ? wrap.getBoundingClientRect() : null;
        const vh = window.innerHeight || document.documentElement.clientHeight || 0;
        const visible = !!(rect && rect.bottom > 24 && rect.top < (vh - 24) && rect.width > 0 && rect.height > 0);
        if (visible || !('IntersectionObserver' in window)) {
          try { playArchiveTrendChartIntro(); } catch (_) {}
          return;
        }
        __archiveChartIntroObserver = new IntersectionObserver((entries) => {
          if (token !== __archiveChartIntroToken) return;
          if (!entries.some((entry) => entry.isIntersecting)) return;
          try { __archiveChartIntroObserver.disconnect(); } catch (_) {}
          __archiveChartIntroObserver = null;
          try { playArchiveTrendChartIntro(); } catch (_) {}
        }, { root: null, rootMargin: '0px 0px -8% 0px', threshold: [0, 0.08, 0.2] });
        try { __archiveChartIntroObserver.observe(wrap); } catch (_) {}
      });
    });
  }, Math.max(0, Number(delayMs || 0)));
}