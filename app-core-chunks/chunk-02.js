// Generated app-core slice 2/6 (merged).

function flushChartsAfterOverlayHide() {
  // Only resume deferred chart reveals that were blocked while the logo overlay
  // was visible. Tab-specific intros (archive / details) are started from their
  // finishLoadingPresentation onReveal callbacks — do not double-fire them here.
  try {
    if (typeof window.__btFlushPendingLoanRevealsV3910 === 'function') {
      window.__btFlushPendingLoanRevealsV3910();
    }
  } catch (_) {}
  try {
    if (activePageId === 'overview' && typeof canRunOverviewChartIntro === 'function' && canRunOverviewChartIntro()) {
      const needing = (typeof getOverviewChartCardsNeedingIntro === 'function')
        ? getOverviewChartCardsNeedingIntro()
        : [];
      if (needing && needing.length && typeof animateOverviewChartsIntro === 'function') {
        animateOverviewChartsIntro({ mode: 'visible' });
      }
    }
  } catch (_) {}
}
function restartBtLogoDrawAnimation(overlayEl, options = {}) {
  const force = !!(options && options.force);
  const overlay = overlayEl || document.getElementById('page-loading-overlay') || ensurePageLoadingOverlay();
  let brand = overlay.querySelector('.page-loading-brand');
  if (!brand) {
    brand = document.createElement('div');
    brand.className = 'page-loading-brand';
    brand.setAttribute('aria-hidden', 'true');
    overlay.appendChild(brand);
  }
  const cycleMs = (__loadingPresentation && __loadingPresentation.cycleMs) || BT_LOGO_CYCLE_MS;
  overlay.classList.remove('is-cycle-complete');
  const theme = document.documentElement.classList.contains('light') || document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  overlay.classList.remove('dark', 'light');
  overlay.classList.add(theme);

  // Keep unified CSS-var splash; never swap back to iframe mid-boot.
  let logo = brand.querySelector('.bt-splash-logo-unified, .bt-logo-animation-host.bt-brand-logo-svg--draw-loop');
  if (!logo || force && !brand.querySelector('.bt-splash-logo-unified')) {
    if (!logo || force) {
      brand.innerHTML = getBtLoadingExportLogoHtml({ cycleMs, size: 150 });
      logo = brand.querySelector('.bt-splash-logo-unified, .bt-logo-animation-host');
    }
  }
  if (logo) {
    const prevCycle = String(logo.dataset.cycleMs || '');
    const nextCycle = String(getBtLogoCycleMs(cycleMs));
    setLogoAnimCycleMs(cycleMs, logo);
    // Force re-show (e.g. Archive): atomic CSS restart when cycle did not change.
    if (force && prevCycle === nextCycle) restartBtLogoDrawLoop(logo);
  }
}
function computeLoadingRevealPlan(session) {
  const minMs = getLoadingPresentationMinMs(session.kind, session.tabId);
  const cycleMs = getLoadingPresentationCycleMs(session.kind, session.tabId);
  const readyAt = Math.max(session.startedAt + minMs, session.dataReadyAt || Date.now());
  const elapsed = Math.max(0, readyAt - session.startedAt);
  const cycles = Math.max(1, Math.ceil(elapsed / cycleMs));
  return {
    // Data may settle at any point in the loop. Reveal only on the next exact
    // 2000 ms boundary so the B is never cut halfway through its draw.
    revealAt: session.startedAt + cycles * cycleMs,
    cycleMs,
  };
}

function clearLoadingPresentationCycleWait(session) {
  if (!session) return;
  if (session.cycleEndLogo && session.cycleEndHandler) {
    try { session.cycleEndLogo.removeEventListener('animationiteration', session.cycleEndHandler); } catch (_) {}
  }
  session.cycleEndLogo = null;
  session.cycleEndHandler = null;
}

function freezeLoadingLogoAtCycleEnd() {
  const overlay = document.getElementById('page-loading-overlay');
  if (overlay) overlay.classList.add('is-cycle-complete');
}

function getLoadingLogoRemainingCycleMs(logo, cycleMs) {
  const cycle = getBtLogoCycleMs(cycleMs);
  const cycleTarget = logo && logo.querySelector
    ? (logo.querySelector('.bt-splash-sprite-y') || logo.querySelector('.bt-logo-stem'))
    : null;
  if (!cycleTarget || typeof cycleTarget.getAnimations !== 'function') return cycle;
  try {
    const animation = cycleTarget.getAnimations().find((item) => (
      !item.animationName ||
      item.animationName === 'btSplashSpriteRows' ||
      item.animationName === 'btLogoDrawStem'
    ));
    const current = animation ? Number(animation.currentTime) : NaN;
    if (!Number.isFinite(current)) return cycle;
    const position = ((current % cycle) + cycle) % cycle;
    return position < 12 ? cycle : Math.max(24, cycle - position);
  } catch (_) {
    return cycle;
  }
}

function setLogoAnimCycleMs(ms, svgEl) {
  const cycle = getBtLogoCycleMs(ms);
  const logo = svgEl || document.querySelector('#page-loading-overlay .bt-logo-animation-host, #page-loading-overlay .bt-brand-logo-svg--draw-once, #page-loading-overlay .bt-brand-logo-svg--draw-loop');
  if (!logo) return;
  logo.style.setProperty('--bt-logo-cycle-ms', cycle + 'ms');
  if (logo.classList && logo.classList.contains('bt-logo-animation-host')) {
    const prev = String(logo.dataset.cycleMs || '');
    logo.dataset.cycleMs = String(cycle);
    // Atomic restart only when cycle changes — strokes + CSS pen share one timeline.
    if (prev !== String(cycle)) restartBtLogoDrawLoop(logo);
  }
}

function restartBtLogoDrawLoop(logoEl) {
  const logo = logoEl || document.querySelector('.bt-logo-animation-host');
  if (!logo) return;
  const restart = () => {
    try {
      if (logo.classList && (logo.classList.contains('bt-brand-logo-svg--draw-loop') || logo.classList.contains('bt-brand-logo-svg--draw-once'))) {
        const loop = logo.classList.contains('bt-brand-logo-svg--draw-loop');
        const once = logo.classList.contains('bt-brand-logo-svg--draw-once');
        if (loop) logo.classList.remove('bt-brand-logo-svg--draw-loop');
        if (once) logo.classList.remove('bt-brand-logo-svg--draw-once');
        void logo.offsetWidth;
        if (loop) logo.classList.add('bt-brand-logo-svg--draw-loop');
        if (once) logo.classList.add('bt-brand-logo-svg--draw-once');
      }
    } catch (_) {}
  };
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(restart);
  } else {
    restart();
  }
}
/* Back-compat alias — SMIL restart removed; CSS loop restart only. */
function restartBtLogoSmilDraw(logoEl) { restartBtLogoDrawLoop(logoEl); }

function startBtLogoAnimationObserver() {
  if (window.__btLogoAnimationObserverStarted) return;
  window.__btLogoAnimationObserverStarted = true;
  const startLogo = (logo) => {
    if (!logo || !logo.classList || !logo.classList.contains('bt-logo-animation-host')) return;
    if (logo.hasAttribute('data-first-paint-loader')) return;
    setLogoAnimCycleMs(logo.dataset.cycleMs || BT_LOGO_CYCLE_MS, logo);
  };
  document.querySelectorAll('.bt-logo-animation-host').forEach(startLogo);
  if (typeof MutationObserver !== 'function') return;
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      record.addedNodes && record.addedNodes.forEach((node) => {
        if (!node || node.nodeType !== 1) return;
        if (node.matches && node.matches('.bt-logo-animation-host')) startLogo(node);
        if (node.querySelectorAll) node.querySelectorAll('.bt-logo-animation-host').forEach(startLogo);
      });
    });
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
  window.__btLogoAnimationObserver = observer;
}
function startBtLogoAnimationObserverAfterSplash() {
  if (window.__btSplashInitialCycleComplete) {
    startBtLogoAnimationObserver();
    return;
  }
  window.addEventListener('bt:splash-first-cycle-complete', startBtLogoAnimationObserver, { once: true });
}

function cancelLoadingPresentation() {
  const session = __loadingPresentation;
  if (!session || session.done) return;
  if (session.revealTimer) window.clearTimeout(session.revealTimer);
  clearLoadingPresentationCycleWait(session);
  session.done = true;
  if (session.kind === 'tab') {
    __tabLoadingDepth = 0;
    if (!__appBootActive && !document.body.classList.contains('app-boot-pending')) {
      hidePageLoadingOverlay();
    }
  }
  if (session.tabId) {
    const page = document.getElementById('page-' + session.tabId);
    if (page) page.classList.remove('is-tab-presenting');
  }
  document.body.classList.remove('bt-tab-presenting');
  __loadingPresentation = null;
}

function beginLoadingPresentation(options = {}) {
  cancelLoadingPresentation();
  const kind = options.kind || 'tab';
  const tabId = options.tabId || null;
  const cycleMs = getLoadingPresentationCycleMs(kind, tabId);
  const session = {
    kind,
    tabId,
    cycleMs,
    startedAt: Date.now(),
    dataReadyAt: null,
    revealTimer: null,
    done: false,
  };
  __loadingPresentation = session;

  if (tabId) {
    document.body.classList.add('bt-tab-presenting');
    const page = document.getElementById('page-' + tabId);
    if (page) page.classList.add('is-tab-presenting');
  }

  if (kind === 'boot') {
    __appBootStartedAt = session.startedAt;
    const overlay = ensurePageLoadingOverlay();
    overlay.classList.add('show');
    overlay.classList.remove('is-hiding');
    // Bank-style: never retune/restart the first-paint splash — that restarts
    // the sprite timeline and looks like a cut 3rd cycle.
    if (window.__btBankStyleBoot) {
      if (window.__btSplashBrandCyclesComplete || window.__btSplashDrawComplete) {
        overlay.classList.add('is-cycle-complete');
      }
      overlay.setAttribute('aria-busy', 'true');
      const firstPaintLogo = overlay.querySelector('.bt-splash-logo-unified[data-first-paint-loader="true"], [data-first-paint-loader="true"]');
      if (firstPaintLogo) firstPaintLogo.dataset.bootAttached = 'true';
      return session;
    }
    // App-core starts on the first exact cycle boundary. The cold-start logo
    // keeps looping while data and feature modules initialize.
    if (!window.__btSplashDrawComplete) overlay.classList.remove('is-cycle-complete');
    overlay.setAttribute('aria-busy', 'true');
    // Stage 1: keep the first-paint unified SVG draw-loop running.
    // Never swap to iframe; only retune cycle / restart if logo is missing.
    const firstPaintLogo = overlay.querySelector('.bt-splash-logo-unified[data-first-paint-loader="true"], [data-first-paint-loader="true"]');
    if (firstPaintLogo) {
      firstPaintLogo.dataset.bootAttached = 'true';
      setLogoAnimCycleMs(cycleMs, firstPaintLogo);
    } else {
      restartBtLogoDrawAnimation(overlay, { force: true });
    }
    return session;
  }

  if (!__appBootActive && !document.body.classList.contains('app-boot-pending')) {
    __tabLoadingDepth = 0;
    showTabPageLoadingOverlay();
  } else {
    restartBtLogoDrawAnimation(null, { force: true });
  }
  return session;
}

function markLoadingPresentationDataReady() {
  if (!__loadingPresentation || __loadingPresentation.dataReadyAt != null) return;
  __loadingPresentation.dataReadyAt = Date.now();
}

function endLoadingPresentationVisuals(session) {
  if (session.tabId) {
    const page = document.getElementById('page-' + session.tabId);
    if (page) page.classList.remove('is-tab-presenting');
  }
  document.body.classList.remove('bt-tab-presenting');
  if (session.kind === 'tab' && !__appBootActive && !document.body.classList.contains('app-boot-pending')) {
    hideTabPageLoadingOverlay();
  }
}

function finishLoadingPresentation(onReveal) {
  const session = __loadingPresentation;
  if (!session || session.done) {
    if (typeof onReveal === 'function') onReveal();
    return;
  }
  if (!session.dataReadyAt) markLoadingPresentationDataReady();
  if (session.finishRequested) return;
  session.finishRequested = true;

  if (session.revealTimer) window.clearTimeout(session.revealTimer);

  const { revealAt, cycleMs } = computeLoadingRevealPlan(session);
  session.cycleMs = cycleMs;

  const reveal = () => {
    if (session.done) return;
    if (session.revealTimer) window.clearTimeout(session.revealTimer);
    session.revealTimer = null;
    clearLoadingPresentationCycleWait(session);
    session.done = true;
    freezeLoadingLogoAtCycleEnd();
    endLoadingPresentationVisuals(session);
    __loadingPresentation = null;
    if (typeof onReveal === 'function') onReveal();
  };

  // Completed / frozen draw (incl. bank-style after exactly 2 cycles): fade now.
  if (session.kind === 'boot' && (
    window.__btSplashDrawComplete
    || (window.__btBankStyleBoot && window.__btSplashBrandCyclesComplete)
  )) {
    window.__btSplashRevealOnBoundary = false;
    reveal();
    return;
  }

  // Early shell (non-bank) may fade as soon as data is ready.
  if (session.kind === 'boot'
      && !window.__btBankStyleBoot
      && typeof isEarlyShellRevealEnabled === 'function'
      && isEarlyShellRevealEnabled()) {
    reveal();
    return;
  }

  const overlay = document.getElementById('page-loading-overlay');
  const logo = overlay && overlay.querySelector('.bt-splash-logo-unified.bt-brand-logo-svg--draw-loop');
  const cycleTarget = logo && (
    logo.querySelector('.bt-splash-sprite-y') ||
    logo.querySelector('.bt-logo-stem')
  );
  if (logo && cycleTarget) {
    const onCycleEnd = (event) => {
      if (event.target !== cycleTarget) return;
      if (event.animationName !== 'btSplashSpriteRows' && event.animationName !== 'btLogoDrawStem') return;
      // Bank-style: never reveal from a mid/3rd cycle — wait until brand freeze.
      if (session.kind === 'boot' && window.__btBankStyleBoot && !window.__btSplashBrandCyclesComplete) {
        return;
      }
      reveal();
    };
    session.cycleEndLogo = cycleTarget;
    session.cycleEndHandler = onCycleEnd;
    cycleTarget.addEventListener('animationiteration', onCycleEnd);
    // Bank-style: do not use remaining-ms timeout (it cuts a started 3rd cycle).
    // Wait only for animationiteration, with a long failsafe.
    if (session.kind === 'boot' && window.__btBankStyleBoot) {
      session.revealTimer = window.setTimeout(reveal, ((Number(window.__btSplashRequiredCycles) || 2) * cycleMs) + 800);
      return;
    }
    const remaining = getLoadingLogoRemainingCycleMs(logo, cycleMs);
    session.revealTimer = window.setTimeout(reveal, remaining + 120);
    return;
  }

  const remaining = Math.max(0, revealAt - Date.now());
  session.revealTimer = window.setTimeout(reveal, remaining);
}

function sectionDatasetStillLoading() {
  if (typeof isSyncing !== 'undefined' && isSyncing) return true;
  try {
    if (typeof shouldWaitForOverviewDataSync === 'function' && shouldWaitForOverviewDataSync()
        && typeof __overviewChartsDataSettled !== 'undefined' && !__overviewChartsDataSettled) {
      return true;
    }
  } catch (_) {}
  return false;
}

function shouldPresentTabOnSwitch(pageId) {
  if (__appBootActive || document.body.classList.contains('app-boot-pending')) return false;
  if (pageId === 'txns') return txnsTabNeedsHeavyPresentation();
  if (pageId === 'archive') return archiveTabNeedsHeavyPresentation();
  if (pageId === 'overview-details') return overviewDetailsNeedsHeavyPresentation();
  if (pageId === 'settings') return settingsTabNeedsHeavyPresentation();
  return false;
}

function hasCachedTxnUi() {
  const list = document.getElementById('txn-list');
  const cashflowSlot = document.getElementById('txn-cashflow-slot');
  if (!list || !cashflowSlot) return false;
  const hasListBody = list.children.length > 0;
  const hasCashflow = !!cashflowSlot.querySelector('.txn-cashflow-card, .txn-cashflow-svg');
  return hasListBody && hasCashflow;
}

function txnsTabNeedsHeavyPresentation() {
  if ((allTransactions || []).length > 0 || hasCachedTxnUi()) return false;
  return !!isSyncing;
}

function archiveTabNeedsHeavyPresentation() {
  const list = document.getElementById('archive-months-list');
  return !!__btArchiveTabDirty || !(list && list.children && list.children.length);
}

function overviewDetailsNeedsHeavyPresentation() {
  return sectionDatasetStillLoading();
}

function settingsTabNeedsHeavyPresentation() {
  return sectionDatasetStillLoading();
}

function presentWidgetSectionLoadingIfNeeded() {
  if (__appBootActive || document.body.classList.contains('app-boot-pending')) return false;
  if (!sectionDatasetStillLoading()) return false;
  beginLoadingPresentation({ kind: 'tab', tabId: activePageId || 'overview' });
  const startedAt = Date.now();
  const poll = () => {
    if (!__loadingPresentation || __loadingPresentation.done) return;
    if (!sectionDatasetStillLoading() || (Date.now() - startedAt) > 12000) {
      markLoadingPresentationDataReady();
      finishLoadingPresentation(() => {
        try {
          if (typeof window.scheduleLoanWidgetChartDecorate === 'function') {
            window.scheduleLoanWidgetChartDecorate();
          }
        } catch (_) {}
      });
      return;
    }
    window.setTimeout(poll, 120);
  };
  window.setTimeout(poll, 80);
  return true;
}

function syncPageLoadingOverlayTheme(overlayEl) {
  const overlay = overlayEl || document.getElementById('page-loading-overlay');
  if (!overlay) return;
  const theme = document.documentElement.classList.contains('light')
    || document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  overlay.classList.remove('dark', 'light');
  overlay.classList.add(theme);
}

function ensurePageLoadingOverlay() {
  let overlay = document.getElementById('page-loading-overlay');
  if (overlay) {
    syncPageLoadingOverlayTheme(overlay);
    return overlay;
  }
  const theme = document.documentElement.classList.contains('light')
    || document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  overlay = document.createElement('div');
  overlay.id = 'page-loading-overlay';
  overlay.className = 'page-loading-overlay ' + theme;
  overlay.innerHTML = `<div class="page-loading-brand" aria-hidden="true">${getBtLoadingExportLogoHtml({ cycleMs: BT_LOGO_CYCLE_BOOT_MS, size: 150 })}</div>`;
  if (document.body.firstChild) document.body.insertBefore(overlay, document.body.firstChild);
  else document.body.appendChild(overlay);
  return overlay;
}

function finalizeAppBootPresentation() {
  if (!__appBootActive || __appBootSequenceRunning) return;
  __btBootDataReady = true;
  // Bank-style: show shell without waiting for lazy feature modules.
  // Classic mode keeps the overlay until both data and lazy gates settle.
  if (!window.__btBankStyleBoot && window.__btLazyStartupReady === false) return;
  if (__appBootCompleteTimer) {
    window.clearTimeout(__appBootCompleteTimer);
    __appBootCompleteTimer = null;
  }
  markLoadingPresentationDataReady();
  finishLoadingPresentation(() => {
    try { completeAppBootSequence(); } catch (_) {}
  });
}

function scheduleAppBootCompletion() {
  finalizeAppBootPresentation();
}

function hasBootPresentableOverviewUi() {
  const page = document.getElementById('page-overview');
  if (!page) return false;
  if (page.querySelector('.summary-days-progress')) return true;
  if (page.querySelector('#overview-net-worth')) return true;
  return getOverviewChartCards(page).some((card) => overviewChartCardHasGraphics(card));
}

function isOverviewPageDataReady() {
  const page = document.getElementById('page-overview');
  if (!page) return false;
  const chartCards = getOverviewChartCards(page).filter(overviewChartCardHasGraphics);
  const netCard = document.getElementById('overview-net-worth')?.closest('.wealth-card-net');
  const netTrendPending = !!(netCard && !netCard.querySelector('.wealth-networth-trend-line-v238'));
  const hasSummary = !!page.querySelector('.summary-days-progress');
  if (netTrendPending) return false;
  return chartCards.length > 0 || hasSummary;
}

function startAppBootOverlay() {
  if (__appBootActive) {
    const overlay = ensurePageLoadingOverlay();
    overlay.classList.add('show');
    overlay.classList.remove('is-hiding');
    overlay.setAttribute('aria-busy', 'true');
    restartBtLogoDrawAnimation(overlay, { force: true });
    return;
  }
  __appBootActive = true;
  __bootPresentationPhase = true;
  document.body.classList.add('app-boot-pending');
  try { ensureHeaderBrandLogoMarkup(); } catch (_) {}
  beginLoadingPresentation({ kind: 'boot' });
}

function fadeOutBootOverlay(done) {
  const overlay = document.getElementById('page-loading-overlay');
  if (!overlay || !overlay.classList.contains('show')) {
    if (typeof done === 'function') done();
    return;
  }
  overlay.classList.add('is-hiding');
  overlay.classList.remove('show');
  overlay.removeAttribute('aria-busy');
  window.setTimeout(() => {
    overlay.classList.remove('is-hiding');
    if (typeof done === 'function') done();
  }, APP_BOOT_OVERLAY_FADE_MS);
}

function revealBootPageContent(done) {
  __appBootActive = false;
  document.body.classList.remove('app-boot-pending');
  document.body.classList.add('app-boot-reveal');
  try { dismissLargeStatusToast(); } catch (_) {}
  try { dismissBackExitToast(); } catch (_) {}
  try { closeBottomSheets(); } catch (_) {}
  window.setTimeout(() => {
    if (typeof done === 'function') done();
  }, APP_BOOT_PAGE_REVEAL_MS);
}

function schedulePostBootPresentations() {
  window.setTimeout(() => {
    if (activePageId === 'overview') {
      try { scheduleOverviewPageBootAnimation({ delayMs: 0 }); } catch (_) {}
    }
    try { finishOverviewChartRenderCycle(); } catch (_) {}
    window.setTimeout(() => {
      __bootPresentationPhase = false;
      __appBootSequenceRunning = false;
    }, 480);
  }, APP_BOOT_POST_REVEAL_MS + 140);
}

function completeAppBootSequence() {
  if (__appBootSequenceRunning || !__appBootActive) return;
  if (__appBootCompleteTimer) {
    window.clearTimeout(__appBootCompleteTimer);
    __appBootCompleteTimer = null;
  }
  __appBootSequenceRunning = true;
  fadeOutBootOverlay(() => {
    revealBootPageContent(() => {
      schedulePostBootPresentations();
    });
  });
}

function showTabPageLoadingOverlay() {
  __tabLoadingDepth++;
  const overlay = ensurePageLoadingOverlay();
  overlay.classList.add('show');
  overlay.classList.remove('is-hiding', 'is-cycle-complete');
  overlay.setAttribute('aria-busy', 'true');
  restartBtLogoDrawAnimation(overlay, { force: true });
}

function hideTabPageLoadingOverlay() {
  __tabLoadingDepth = Math.max(0, __tabLoadingDepth - 1);
  if (__tabLoadingDepth <= 0 && !__appBootActive && !document.body.classList.contains('app-boot-pending')) {
    hidePageLoadingOverlay();
  }
}
function showPageLoadingOverlayDelayed(delayMs = 100) {
  if (pageLoadingTimer) clearTimeout(pageLoadingTimer);
  pageLoadingTimer = setTimeout(() => {
    showTabPageLoadingOverlay();
  }, Math.max(0, Number(delayMs || 0)));
}

function showPageLoadingOverlayNow() {
  if (pageLoadingTimer) { clearTimeout(pageLoadingTimer); pageLoadingTimer = null; }
  if (__appBootActive || document.body.classList.contains('app-boot-pending')) {
    const overlay = ensurePageLoadingOverlay();
    overlay.classList.add('show');
    overlay.classList.remove('is-hiding');
    overlay.setAttribute('aria-busy', 'true');
    return;
  }
  showTabPageLoadingOverlay();
}

function hidePageLoadingOverlay() {
  if (pageLoadingTimer) {
    clearTimeout(pageLoadingTimer);
    pageLoadingTimer = null;
  }
  if (__appBootActive || __tabLoadingDepth > 0) return;
  const overlay = document.getElementById('page-loading-overlay');
  if (!overlay || !overlay.classList.contains('show')) return;
  overlay.classList.add('is-hiding');
  overlay.classList.remove('show');
  overlay.removeAttribute('aria-busy');
  overlay.style.removeProperty('will-change');
  window.setTimeout(() => {
    overlay.classList.remove('is-hiding');
    try { flushChartsAfterOverlayHide(); } catch (_) {}
  }, APP_BOOT_OVERLAY_FADE_MS);
}
function finishAppBoot() {
  if (__appBootActive) {
    finalizeAppBootPresentation();
    return;
  }
  hideAppBootChrome();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      try { finishOverviewChartRenderCycle(); } catch (_) {}
    });
  });
}
function hideAppBootChrome() {
  __appBootActive = false;
  document.body.classList.remove('app-boot-pending');
  document.body.classList.add('app-boot-reveal');
  if (__tabLoadingDepth <= 0) hidePageLoadingOverlay();
  const overlay = document.getElementById('page-loading-overlay');
  if (overlay) {
    overlay.classList.remove('show', 'is-hiding');
    overlay.removeAttribute('aria-busy');
  }
  try { dismissLargeStatusToast(); } catch (_) {}
  try { dismissBackExitToast(); } catch (_) {}
  try { closeBottomSheets(); } catch (_) {}
  __bootPresentationPhase = false;
}

function tryCompleteAppBootFromOverviewRender() {
  if (!__appBootActive || __appBootSequenceRunning) return;
  if (SHEETS_URL && isGoogleSheetsEnabled()) return;
  finalizeAppBootPresentation();
}

function exitBankTrackerApp() {
  dismissBackExitToast();

  try { window.close(); } catch (_) {}

  window.setTimeout(() => {
    try { history.back(); } catch (_) {}
  }, 60);
}

function pushTabHistory(pageId) {
  if (!window.__bankTrackerTabHistoryReady) return;
  if (!pageId || activePageId === pageId) return;

  try {
    history.pushState({ bankTrackerPage: pageId }, '', location.pathname + location.search + '#' + pageId);
  } catch (_) {}
}

function getTransactionsByBank(monthOnly = true, cardOnly = false, includeIncoming = false) {
  const month = getAktuálneMonth();
  let base = allTransactions.filter(t => (includeIncoming || Number(t.amount) < 0) && (!monthOnly || normalizeMonthStr(t.month) === normalizeMonthStr(month)));

  if (cardOnly) {
    base = base.filter(t => isCardTransaction(t));
  }

  return BANK_ORDER.reduce((acc, key) => {
    acc[key] = base.filter(t => getBankKey(t) === key);
    return acc;
  }, {});
}

function getBudgetBankKeyFromTransaction(tx) {
  const key = getBankKey(tx);
  // ČSOB CZ credit card repayments/usage belong to the ČSOB CZ monthly budget.
  if (key === 'csob_cz_credit') return 'csob_cz';
  return key;
}

function getAktuálneMonthCzkSpent(bankKey = null) {
  const month = normalizeMonthStr(getAktuálneMonth());
  const adjustments = buildTransactionStatsAdjustments(allTransactions);

  // Bank budget must include every outgoing payment kind:
  // card payments, account payments and manual cash payments.
  // ČSOB CZ credit card is budgeted under ČSOB CZ, not as a separate bank budget row.
  return allTransactions
    .filter(t => normalizeMonthStr(t.month) === month && Number(adjustments.effective.get(t) || 0) < 0)
    .filter(t => !bankKey || getBudgetBankKeyFromTransaction(t) === bankKey)
    .reduce((sum, t) => sum + convertTransactionStatsAmount(t, adjustments.effective.get(t), 'CZK'), 0);
}

function getArchiveTotalsBankKeys(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const keys = new Set((BANK_ORDER || []).filter(k => k && k !== 'csob_cz_credit'));
  (getCustomBanks() || []).forEach(b => {
    const id = String(b?.id || '').trim();
    if (id) keys.add(id);
  });
  (allTransactions || []).forEach(tx => {
    if (!tx || normalizeMonthStr(tx.month) !== month) return;
    let key = String(getArchiveBankKeyFromTransaction(tx) || '').trim();
    if (!key || key === 'csob_cz_credit') key = 'csob_cz';
    if (key) keys.add(key);
  });
  return Array.from(keys);
}

function getArchiveMonthSpentTotalCzk(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const bankKeys = getArchiveTotalsBankKeys(month);
  const totals = getArchiveMonthTotalsForBanks(bankKeys, month, 'CZK');
  return Number(totals?.spent || 0) || 0;
}

function debugOverviewArchiveSpentDiff(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const overviewCzk = (allTransactions || []).reduce((sum, tx) => {
    if (!tx || normalizeMonthStr(tx.month) !== month) return sum;
    if (Number(tx.amount || 0) >= 0) return sum;
    if (isExcludedFromSpendingStats(tx)) return sum;
    return sum + Math.abs(convertTransactionAmount(tx, 'CZK'));
  }, 0);
  const archiveCzk = Number(getArchiveMonthSpentTotalCzk(month) || 0);
  const bankKeys = getArchiveTotalsBankKeys(month);

  const byBank = bankKeys.map(bankKey => {
    const archiveBankCurrency = getArchiveBankCurrency(bankKey);
    const archiveBankSpent = Number(getMonthlyArchiveSpentForBank(bankKey, month) || 0);
    const archiveBankCzk = Number(convertAmountCurrency(archiveBankSpent, archiveBankCurrency, 'CZK') || 0);
    const txBankCzk = (allTransactions || []).reduce((sum, tx) => {
      if (!tx || normalizeMonthStr(tx.month) !== month) return sum;
      if (Number(tx.amount || 0) >= 0) return sum;
      if (isExcludedFromSpendingStats(tx)) return sum;
      if (getArchiveBankKeyFromTransaction(tx) !== bankKey) return sum;
      return sum + Math.abs(convertTransactionAmount(tx, 'CZK'));
    }, 0);
    const delta = archiveBankCzk - txBankCzk;
    return {
      bankKey,
      bankName: getArchiveBankName(bankKey),
      archiveBankCurrency,
      archiveBankSpent,
      archiveBankCzk,
      txBankCzk,
      deltaCzk: delta
    };
  }).filter(row => Math.abs(Number(row.deltaCzk || 0)) > 0.01);

  const rawMonthMismatchTx = (allTransactions || []).filter(tx => {
    if (!tx) return false;
    if (normalizeMonthStr(tx.month) !== month) return false;
    if (String(tx.month || '') === month) return false;
    if (Number(tx.amount || 0) >= 0) return false;
    if (isExcludedFromSpendingStats(tx)) return false;
    return true;
  }).map(tx => ({
    monthRaw: String(tx.month || ''),
    date: tx.date || '',
    merchant: tx.merchant || '',
    amount: Number(tx.amount || 0),
    currency: tx.currency || 'CZK',
    amountCzk: Math.abs(convertTransactionAmount(tx, 'CZK')),
    bank: tx.bank || '',
    msgId: tx.msgId || tx.id || ''
  }));

  const result = {
    month,
    overviewCzk,
    archiveCzk,
    diffCzk: archiveCzk - overviewCzk,
    byBank,
    rawMonthMismatchTx
  };
  try { console.table(byBank); } catch (_) {}
  try { console.table(rawMonthMismatchTx); } catch (_) {}
  console.log('[debugOverviewArchiveSpentDiff]', result);
  return result;
}

function debugOverviewArchiveMonthDiff(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const strictOverviewTx = (allTransactions || []).filter(tx => {
    if (!tx) return false;
    if (String(tx.month || '') !== month) return false;
    if (Number(tx.amount || 0) >= 0) return false;
    if (typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)) return false;
    if (typeof isInternalTransferTransaction === 'function' && isInternalTransferTransaction(tx)) return false;
    return true;
  });
  const normalizedOverviewTx = (allTransactions || []).filter(tx => {
    if (!tx) return false;
    if (normalizeMonthStr(tx.month) !== month) return false;
    if (Number(tx.amount || 0) >= 0) return false;
    if (typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)) return false;
    if (typeof isInternalTransferTransaction === 'function' && isInternalTransferTransaction(tx)) return false;
    return true;
  });
  const onlyNormalized = normalizedOverviewTx.filter(tx => String(tx.month || '') !== month);
  const strictSum = strictOverviewTx.reduce((sum, tx) => sum + Math.abs(convertTransactionAmount(tx, 'CZK')), 0);
  const normalizedSum = normalizedOverviewTx.reduce((sum, tx) => sum + Math.abs(convertTransactionAmount(tx, 'CZK')), 0);
  const diff = normalizedSum - strictSum;

  const details = onlyNormalized.map(tx => ({
    monthRaw: String(tx.month || ''),
    date: tx.date || '',
    merchant: tx.merchant || '',
    amount: Number(tx.amount || 0),
    currency: tx.currency || 'CZK',
    amountCzk: Math.abs(convertTransactionAmount(tx, 'CZK')),
    bank: tx.bank || '',
    msgId: tx.msgId || tx.id || ''
  }));
  try {
    console.table(details);
  } catch (_) {}
  console.log('[debugOverviewArchiveMonthDiff]', { month, strictSum, normalizedSum, diff, countOnlyNormalized: details.length, details });
  return { month, strictSum, normalizedSum, diff, countOnlyNormalized: details.length, details };
}

function getBudgetStorageKey(bankKey, type, monthStr = '') {
  const month = monthStr ? '_' + normalizeMonthStr(monthStr) : '';
  return `budget_${type}_${bankKey}${month}`;
}

function hasMonthlyBudgetSettings(bankKey, monthStr) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  return localStorage.getItem(getBudgetStorageKey(bankKey, 'limit', month)) !== null ||
         localStorage.getItem(getBudgetStorageKey(bankKey, 'warn', month)) !== null;
}

function getLegacyBudgetSettingsForBank(bankKey) {
  const custom = String(bankKey || '').startsWith('custom_')
    ? getCustomBanks().find(b => b.id === bankKey)
    : null;
  return {
    budget: parseFloat(localStorage.getItem(getBudgetStorageKey(bankKey, 'limit')) || custom?.budget || '0') || 0,
    warning: parseFloat(localStorage.getItem(getBudgetStorageKey(bankKey, 'warn')) || custom?.warning || '0') || 0
  };
}

function getBudgetSettingsForBank(bankKey, monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());

  for (let i = 0; i >= -36; i--) {
    const candidate = addMonthsToMonthStr(month, i);
    if (hasMonthlyBudgetSettings(bankKey, candidate)) {
      return {
        budget: parseFloat(localStorage.getItem(getBudgetStorageKey(bankKey, 'limit', candidate)) || '0') || 0,
        warning: parseFloat(localStorage.getItem(getBudgetStorageKey(bankKey, 'warn', candidate)) || '0') || 0,
        month: candidate
      };
    }
  }

  return {
    ...getLegacyBudgetSettingsForBank(bankKey),
    month: ''
  };
}

function setBudgetSettingsForBank(bankKey, budget, warning, monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  localStorage.setItem(getBudgetStorageKey(bankKey, 'limit', month), String(Number(budget || 0) || 0));
  localStorage.setItem(getBudgetStorageKey(bankKey, 'warn', month), String(Number(warning || 0) || 0));
}


function readBudgetSettingsInputs() {
  return {
    rbCzBudget: parseFloat(document.getElementById('budget-rb-cz')?.value || '0') || 0,
    rbCzWarning: parseFloat(document.getElementById('budget-warn-rb-cz')?.value || '0') || 0,
    csobSkBudget: parseFloat(document.getElementById('budget-csob-sk')?.value || '0') || 0,
    csobSkWarning: parseFloat(document.getElementById('budget-warn-csob-sk')?.value || '0') || 0,
    csobCzBudget: parseFloat(document.getElementById('budget-csob-cz')?.value || '0') || 0,
    csobCzWarning: parseFloat(document.getElementById('budget-warn-csob-cz')?.value || '0') || 0,
    monetaBudget: parseFloat(document.getElementById('budget-moneta')?.value || '0') || 0,
    monetaWarning: parseFloat(document.getElementById('budget-warn-moneta')?.value || '0') || 0
  };
}

async function syncBudgetToGoogleSheets(monthStr, budgetValues) {
  // Deprecated: Budgety/Budget tab is no longer used.
  // Budgets and warnings are written only via saveBankSettingsEndpoint from Manage banks / Add bank.
  const status = document.getElementById('budget-sync-status');
  if (status) status.textContent = 'Budgety sa už neposielajú do starého tabu. Zdroj pravdy je Bank_Settings.';
  return false;
}


async function saveBudgetSettings() {
  try {
    const inputMap = {
      rb_cz: ['budget-rb-cz', 'budget-warn-rb-cz'],
      csob_sk: ['budget-csob-sk', 'budget-warn-csob-sk'],
      csob_cz: ['budget-csob-cz', 'budget-warn-csob-cz'],
      moneta: ['budget-moneta', 'budget-warn-moneta']
    };

    Object.entries(inputMap).forEach(([bankKey, ids]) => {
      const budget = parseFloat(document.getElementById(ids[0])?.value || '0') || 0;
      const warning = parseFloat(document.getElementById(ids[1])?.value || '0') || 0;

      setBudgetSettingsForBank(bankKey, budget, warning, getSettingsLimitMonth());
    });

    const monthStr = getSettingsLimitMonth();
    const budgetValues = readBudgetSettingsInputs();

    await syncBudgetToGoogleSheets(monthStr, budgetValues);

    renderAll();
    alert('Budgety podľa bánk boli uložené.');
  } catch (err) {
    console.error('Budget save error:', err);
    alert('Budgety sa nepodarilo uložiť. Pošli mi screenshot chyby z konzoly.');
  }
}

function renderBudgetStatus() {
  const wrap = document.getElementById('budget-status');
  if (!wrap) return;

  function getBudgetPercentColor(pctRaw) {
    const pct = Math.max(0, Math.min(100, Number(pctRaw || 0)));
    if (pct >= 100) return '#E5005F'; // red
    if (pct >= 76) return '#FF8A3D';  // strong orange
    if (pct >= 51) return '#FFB86B';  // orange
    if (pct >= 26) return '#FFE033';  // yellow
    return '#72F0C8';                 // green
  }

  const rows = BANK_ORDER
    .filter(bankKey => bankKey !== 'csob_cz_credit')
    .map(bankKey => {
    const bank = BANKS[bankKey];
    const month = getAktuálneMonth();
    const budget = getOverviewBudgetLimitForBank(bankKey, month);
    const warning = getOverviewBudgetWarningForBank(bankKey, month);
    const budgetCurrency = getBankBudgetCurrency(bankKey);
    const spent = getOverviewBudgetSpentForBank(bankKey, month);

    if (!budget) {
      return `
        <div class="budget-bank-row" onclick="openBankBudgetManager('${bankKey}')" title="${t('filteredTransactions')}" style="padding:10px 0;border-bottom:1px solid var(--border);">
          <div class="budget-status-main">
            <div>
              <div class="budget-status-value" style="color:${bank.color};font-size:15px;">${bankLabelWithLogo(bankKey)}</div>
              <div class="budget-status-note">${t('budgetNotSet')}</div>
            </div>
          </div>
        </div>`;
    }

    const remaining = Math.max(budget - spent, 0);
    const pct = Math.min(spent / budget, 1) * 100;
    const status = remaining <= 0 ? t('overBudget') : (warning && remaining <= warning ? t('nearLimit') : t('normal'));
    const statusColor = getBudgetPercentColor(pct);

    maybeSendBudgetLocalNotification(bankKey, plainBankName(bankKey), spent, budget, remaining, warning);

    return `
      <div class="budget-bank-row" onclick="openBankBudgetManager('${bankKey}')" title="${t('filteredTransactions')}" style="padding:10px 0;border-bottom:1px solid var(--border);">
        <div class="budget-status-main">
          <div>
            <div class="budget-status-value" style="color:${bank.color};font-size:15px;">${bankLabelWithLogo(bankKey)}</div>
            <div class="budget-status-note">${formatCurrencyAmount(spent, budgetCurrency)} / ${formatCurrencyAmount(budget, budgetCurrency)} · ${t('remaining')} ${formatCurrencyAmount(remaining, budgetCurrency)} · <span style="color:${statusColor};font-weight:700;">${status}</span></div>
          </div>
        </div>
        <div class="budget-progress"><div class="budget-progress-fill" style="width:${pct}%;background:${statusColor};"></div></div>
      </div>`;
  }).join('');

  wrap.innerHTML = `
    <div class="budget-status-title">${t('budgetStatusTitle')}</div>
    <div class="budget-status-note" style="margin:-4px 0 10px;">${t('budgetAllPaymentsHint')}</div>
    ${rows}
  `;
  try { scheduleOverviewDetailsBarRefresh(); } catch (_) {}
}

function getAccountBalanceStorageKey(bankKey, monthStr = '') {
  const month = monthStr ? '_' + normalizeMonthStr(monthStr) : '';
  return 'bank_account_balance_' + bankKey + month;
}

function getAccountBalance(bankKey, monthStr = getAktuálneMonth()) {
  const monthKey = getAccountBalanceStorageKey(bankKey, monthStr);
  const monthly = localStorage.getItem(monthKey);
  if (monthly !== null) return Number(monthly || 0) || 0;

  if (String(bankKey || '').startsWith('custom_')) {
    const bank = getCustomBanks().find(b => b.id === bankKey);
    return Number(bank?.balance || 0);
  }
  return Number(localStorage.getItem(getAccountBalanceStorageKey(bankKey)) || '0') || 0;
}

function setAccountBalance(bankKey, value, monthStr = getAktuálneMonth()) {
  const parsed = Number(value);
  const amount = Number.isFinite(parsed) ? parsed : 0;
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  localStorage.setItem(getAccountBalanceStorageKey(bankKey, month), String(amount));

  if (month === normalizeMonthStr(getAktuálneMonth())) {
    if (String(bankKey || '').startsWith('custom_')) {
      const banks = getCustomBanks();
      const bank = banks.find(b => b.id === bankKey);
      if (bank) {
        bank.balance = amount;
        saveCustomBanks(banks);
      }
      return;
    }
    localStorage.setItem(getAccountBalanceStorageKey(bankKey), String(amount));
  }
}

function getAccountBalanceBaseStorageKey(bankKey, monthStr = getAktuálneMonth()) {
  return 'bank_account_balance_base_' + String(bankKey || '').trim() + '_' + normalizeMonthStr(monthStr || getAktuálneMonth());
}

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

function maybeSendBudgetLocalNotification(bankKey, bankLabel, spent, budget, remaining, warning) {
  if (!budget || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const month = getAktuálneMonth();

  // Bezpečná funkcia na odoslanie notifikácie, ktorá nezabije appku na Androide
  const sendSafeNotification = (bodyText) => {
    try {
      if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistration().then(reg => {
          if (reg && reg.showNotification) {
            reg.showNotification('Bank Tracker', { body: bodyText, icon: '/icon.png' });
          } else {
            new Notification('Bank Tracker', { body: bodyText });
          }
        }).catch(() => {
          new Notification('Bank Tracker', { body: bodyText });
        });
      } else {
        new Notification('Bank Tracker', { body: bodyText });
      }
    } catch (e) {
      console.warn("Local notification skipped:", e);
    }
  };

  if (warning && remaining > 0 && remaining <= warning) {
    const key = `budget_warn_${bankKey}_${month}_${budget}_${warning}`;
    if (localStorage.getItem(key) !== 'sent') {
      sendSafeNotification(`${bankLabel}: minuté ${formatCurrencyAmount(spent, getBankBudgetCurrency(bankKey))}. Ostáva ${formatCurrencyAmount(remaining, getBankBudgetCurrency(bankKey))} do konca mesačného budgetu.`);
      localStorage.setItem(key, 'sent');
    }
  }
  if (remaining <= 0) {
    const key = `budget_over_${bankKey}_${month}_${budget}`;
    if (localStorage.getItem(key) !== 'sent') {
      sendSafeNotification(`${bankLabel}: mesačný budget ${formatCurrencyAmount(budget, getBankBudgetCurrency(bankKey))} bol prekročený.`);
      localStorage.setItem(key, 'sent');
    }
  }
}

function getCurrentMonthOutgoingTransactions() {
  const month = getAktuálneMonth();
  return allTransactions.filter(t => t.month === month && Number(t.amount) < 0);
}

function getCurrentMonthCardTransactions() {
  return getCurrentMonthOutgoingTransactions().filter(t => isCardTransaction(t));
}

function getTransactionsCzkEquivalentTotal(txns) {
  return txns.reduce((sum, tx) => {
    return sum + Math.abs(convertTransactionAmount(tx, 'CZK'));
  }, 0);
}



function getLatestStoredAccountBalanceForBank(bankKey, selectedMonth = getAktuálneMonth()) {
  const id = String(bankKey || '').trim();
  if (!id) return 0;
  const normalizedSelected = normalizeMonthStr(selectedMonth || getAktuálneMonth());
  const testSetting = getLocalTestOverviewBankSetting(id, normalizedSelected);
  if (testSetting && testSetting.balance !== undefined) return Number(testSetting.balance || 0) || 0;
  if (hasSheetAccountBalanceAuthority(id, normalizedSelected)) {
    const sheetStored = localStorage.getItem(getSheetAccountBalanceValueKey(id, normalizedSelected));
    if (sheetStored !== null && Number.isFinite(Number(sheetStored))) {
      return Number(sheetStored);
    }
    const exactKey = getAccountBalanceStorageKey(id, normalizedSelected);
    const exact = localStorage.getItem(exactKey);
    if (exact !== null) return Number(exact || 0) || 0;
    return 0;
  }
  const exactKey = getAccountBalanceStorageKey(id, normalizedSelected);
  const exact = localStorage.getItem(exactKey);
  if (exact !== null) return Number(exact || 0) || 0;

  const base = localStorage.getItem(getAccountBalanceStorageKey(id));
  if (base !== null) return Number(base || 0) || 0;

  const prefix = 'bank_account_balance_' + id + '_';
  const rows = [];
  Object.keys(localStorage).forEach(key => {
    if (!key.startsWith(prefix)) return;
    const month = normalizeMonthStr(key.slice(prefix.length));
    const value = Number(localStorage.getItem(key) || 0) || 0;
    if (month) rows.push({ month, value });
  });
  rows.sort((a, b) => monthSortValue(b.month) - monthSortValue(a.month));
  const selectedSort = monthSortValue(normalizedSelected);
  const sameOrOlder = rows.find(r => monthSortValue(r.month) <= selectedSort);
  if (sameOrOlder) return sameOrOlder.value;
  return rows[0]?.value || 0;
}

function getOverviewBankCardLimitForBank(bankKey, monthStr = getAktuálneMonth()) {
  const testSetting = getLocalTestOverviewBankSetting(bankKey, monthStr);
  if (testSetting && testSetting.cardLimit !== undefined) return Number(testSetting.cardLimit || 0) || 0;
  const fromArchive = Number(getArchiveCardLimitForMonth(bankKey, monthStr) || 0) || 0;
  if (fromArchive) return fromArchive;
  return Number(getMonthlyCardLimitForBank(bankKey, monthStr) || 0) || 0;
}

function getOverviewBudgetLimitForBank(bankKey, monthStr = getAktuálneMonth()) {
  const testSetting = getLocalTestOverviewBankSetting(bankKey, monthStr);
  if (testSetting && testSetting.budget !== undefined) return Number(testSetting.budget || 0) || 0;
  const settings = getBudgetSettingsForBank(bankKey, monthStr);
  return Number(settings?.budget || 0) || 0;
}

function getOverviewBudgetWarningForBank(bankKey, monthStr = getAktuálneMonth()) {
  const testSetting = getLocalTestOverviewBankSetting(bankKey, monthStr);
  if (testSetting && testSetting.warning !== undefined) return Number(testSetting.warning || 0) || 0;
  const settings = getBudgetSettingsForBank(bankKey, monthStr);
  return Number(settings?.warning || 0) || 0;
}

function getOverviewBudgetSpentForBank(bankKey, monthStr = getAktuálneMonth()) {
  const overviewStored = getStoredOverviewMonthlyStat(bankKey, monthStr, 'spending');
  if (overviewStored !== null) return overviewStored;
  const archive = Number(getMonthlyArchiveSpentForBank(bankKey, monthStr) || 0) || 0;
  if (archive) return archive;
  return Number(getCurrentMonthSpentInBankCurrency(bankKey) || 0) || 0;
}

function getOverviewBudgetDailySeries(monthStr = getAktuálneMonth(), currency = getAppCurrency()) {
  const normalizedMonth = normalizeMonthStr(monthStr || getAktuálneMonth());
  const [month, year] = normalizedMonth.split('/').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const targetCurrency = currencyCode(currency || getAppCurrency() || 'CZK');
  const daily = Array.from({ length: daysInMonth }, (_, idx) => ({ day: idx + 1, value: 0 }));

  (allTransactions || []).forEach(tx => {
    if (normalizeMonthStr(tx.month) !== normalizedMonth) return;
    if (Number(tx.amount || 0) >= 0) return;
    if (typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)) return;
    const parsed = parseCustomDateStr(tx.rawDate || tx.date);
    if (!parsed || isNaN(parsed.getTime())) return;
    const day = parsed.getDate();
    if (day < 1 || day > daysInMonth) return;
    daily[day - 1].value += Math.abs(convertTransactionAmount(tx, targetCurrency));
  });

  let cumulative = 0;
  return daily.map(item => {
    cumulative += item.value;
    return { day: item.day, value: cumulative };
  });
}

function getOverviewMonthSpentInCurrency(targetCurrency = getAppCurrency(), bankKey = null) {
  const month = normalizeMonthStr(getAktuálneMonth());
  const target = currencyCode(targetCurrency || getAppCurrency());
  return (allTransactions || [])
    .filter(tx => normalizeMonthStr(tx.month) === month && Number(tx.amount || 0) < 0)
    .filter(tx => !(typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)))
    .filter(tx => !(typeof isInternalTransferTransaction === 'function' && isInternalTransferTransaction(tx)))
    .filter(tx => !bankKey || getBudgetBankKeyFromTransaction(tx) === bankKey)
    .reduce((sum, tx) => sum + Math.abs(convertTransactionAmount(tx, target)), 0);
}

function getOverviewBudgetTransactionSeries(monthStr = getAktuálneMonth(), currency = getAppCurrency()) {
  const normalizedMonth = normalizeMonthStr(monthStr || getAktuálneMonth());
  const targetCurrency = currencyCode(currency || getAppCurrency() || 'CZK');
  const monthStart = new Date(normalizedMonth.split('/')[1], Number(normalizedMonth.split('/')[0]) - 1, 1, 0, 0, 0, 0).getTime();
  const monthEnd = new Date(normalizedMonth.split('/')[1], Number(normalizedMonth.split('/')[0]), 0, 23, 59, 59, 999).getTime();

  const txns = (allTransactions || [])
    .filter(tx => normalizeMonthStr(tx.month) === normalizedMonth)
    .filter(tx => Number(tx.amount || 0) < 0)
    .filter(tx => !(typeof isCsobCzCreditCardRepaymentTx === 'function' && isCsobCzCreditCardRepaymentTx(tx)))
    .map(tx => ({
      tx,
      date: parseCustomDateStr(tx.rawDate || tx.date)
    }))
    .filter(item => item.date && !isNaN(item.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let cumulative = 0;
  return txns.map(item => {
    cumulative += Math.abs(convertTransactionAmount(item.tx, targetCurrency));
    const time = Math.min(Math.max(item.date.getTime(), monthStart), monthEnd);
    return {
      timestamp: time,
      value: cumulative
    };
  });
}

function getOverviewCardUsedCountForBank(bankKey, monthStr = getAktuálneMonth()) {
  const normalizedMonth = normalizeMonthStr(monthStr || getAktuálneMonth());
  return (allTransactions || []).filter(tx => {
    if (normalizeMonthStr(tx.month) !== normalizedMonth) return false;
    if (Number(tx.amount || 0) >= 0) return false;
    if (!isCardTransaction(tx)) return false;
    const key = getBankKey(tx);
    if (bankKey === 'csob_cz') return key === 'csob_cz' || key === 'csob_cz_credit';
    return key === bankKey;
  }).length;
}

function getOverviewCreditCardLimit(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const testSetting = getLocalTestOverviewBankSetting('csob_cz_credit', month);
  if (testSetting && testSetting.creditCardLimit !== undefined) return Number(testSetting.creditCardLimit || 0) || 0;
  const explicit = localStorage.getItem(getCreditCardLimitStorageKey('csob_cz_credit', month));
  if (explicit !== null) return Number(explicit || 0) || 0;
  const custom = getCustomBanks().find(b => b && b.id === 'csob_cz_credit');
  if (custom && (custom.creditCardLimit !== undefined || custom.creditLimit !== undefined)) {
    return Number(custom.creditCardLimit || custom.creditLimit || 0) || 0;
  }
  const legacyMonthly = localStorage.getItem(getMonthlyCardLimitStorageKey('csob_cz_credit', month));
  if (legacyMonthly !== null) return Number(legacyMonthly || 0) || 0;
  const legacyArchive = Number(getArchiveCardLimitForMonth('csob_cz_credit', month) || 0) || 0;
  return legacyArchive;
}

function getOverviewStoredAssetValue(keys) {
  const list = Array.isArray(keys) ? keys : [keys];
  for (const key of list) {
    const raw = localStorage.getItem(String(key || ''));
    if (raw !== null && String(raw).trim() !== '') {
      const n = Number(String(raw).replace(/[^0-9,.-]/g, '').replace(',', '.'));
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function getOverviewInvestmentsValue(appCurrency) {
  return getOverviewStoredAssetValue([
    'overview_investments_value_' + appCurrency,
    'overview_assets_investments_' + appCurrency,
    'overview_investments_value',
    'overview_assets_investments',
    'investments_value',
    'asset_investments_value'
  ]);
}

function getOverviewPropertiesValue(appCurrency) {
  return getOverviewStoredAssetValue([
    'overview_properties_value_' + appCurrency,
    'overview_assets_properties_' + appCurrency,
    'overview_properties_value',
    'overview_assets_properties',
    'properties_value',
    'property_value',
    'asset_properties_value'
  ]);
}

function getAccountBalanceCashTotal(monthStr = getAktuálneMonth(), targetCurrency = getAppCurrency()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const target = targetCurrency || getAppCurrency();
  const parentedCreditIds = new Set(CREDIT_BALANCE_SUBACCOUNTS.map(item => item.id));
  return getAllManagedBanksForBalance(month).reduce((sum, bank) => {
    if (!bank || parentedCreditIds.has(bank.id) || bank.liability) return sum;
    return sum + convertSignedAmountCurrency(Number(bank.balance || 0), bank.currency || target, target);
  }, 0);
}

function getOverviewDetailsAccountBalanceTotal(monthStr = getAktuálneMonth(), appCurrency = getAppCurrency()) {
  return getAccountBalanceCashTotal(monthStr, appCurrency || getAppCurrency());
}

function getOverviewDashboardMetrics() {
  const appCurrency = getAppCurrency();
  const month = normalizeMonthStr(getAktuálneMonth());
  const allBanks = getAllManagedBanksForBalance(month);
  const creditChildrenByParent = {};
  CREDIT_BALANCE_SUBACCOUNTS.forEach(config => {
    const item = getCreditBalanceSubaccountData(config);
    if (!item || !item.parentId) return;
    const balanceBank = allBanks.find(b => b.id === item.id);
    const child = {
      ...item,
      balance: balanceBank ? getLatestStoredAccountBalanceForBank(item.id, month) : getCreditOutstandingBalance(item.id),
      currency: balanceBank?.currency || item.currency || 'CZK',
      liability: true
    };
    if (!creditChildrenByParent[item.parentId]) creditChildrenByParent[item.parentId] = [];
    creditChildrenByParent[item.parentId].push(child);
  });
  const parentedCreditIds = new Set(CREDIT_BALANCE_SUBACCOUNTS.map(item => item.id));
  const banks = allBanks.filter(bank => !parentedCreditIds.has(bank.id));

  const creditChildren = Object.values(creditChildrenByParent).flat();
  const creditAvailable = creditChildren.reduce((sum, child) => {
    return sum + Math.max(0, convertAmountCurrency(getCreditAvailableBalanceDisplay(child.balance || 0), child.currency || appCurrency, appCurrency));
  }, 0);
  const creditMonthlyUsed = getCreditCardMonthlyUsedAmount(appCurrency);
  const creditLimitRaw = getOverviewCreditCardLimit(month);
  const creditLimit = convertAmountCurrency(creditLimitRaw || 0, getCreditOutstandingCurrency('csob_cz_credit') || appCurrency, appCurrency);
  const creditUsed = creditMonthlyUsed > 0 ? creditMonthlyUsed : Math.max(0, (Number(creditLimit || 0) || 0) - (Number(creditAvailable || 0) || 0));
  const creditOutstanding = creditUsed;
  const creditPct = creditLimit > 0 ? Math.min(creditUsed / creditLimit, 1) : 0;
  const hasCreditWidget = creditLimit > 0 || creditUsed > 0 || creditAvailable > 0 || getSheetCreditBankRows().length > 0;

  // The Overview cash number must mirror "Total balance" in Overview details.
  // Available credit is not cash and must not inflate cash/net worth.
  const availableCash = getOverviewDetailsAccountBalanceTotal(month, appCurrency);
  const investmentsValue = getOverviewInvestmentsValue(appCurrency);
  const propertiesValue = getOverviewPropertiesValue(appCurrency);
  const totalNetWorth = availableCash + investmentsValue + propertiesValue;

  const visibleBankKeys = BANK_ORDER.filter(bankKey => bankKey !== 'csob_cz_credit');
  const byBankMonth = getTransactionsByBank(true, true);
  const mergedCardTxns = { ...(byBankMonth || {}) };
  mergedCardTxns.csob_cz = [ ...(mergedCardTxns.csob_cz || []), ...(mergedCardTxns.csob_cz_credit || []) ];
  const cardUsed = visibleBankKeys.reduce((sum, bankKey) => sum + ((mergedCardTxns[bankKey] || []).length), 0);
  const cardLimit = visibleBankKeys.reduce((sum, bankKey) => sum + Math.max(0, getOverviewBankCardLimitForBank(bankKey, month)), 0);
  const cardPct = cardLimit > 0 ? Math.min(cardUsed / cardLimit, 1) : 0;

  let budgetSpent = 0;
  let budgetLimit = 0;
  visibleBankKeys.forEach(bankKey => {
    const bankCurrency = getBankBudgetCurrency(bankKey);
    const spent = getOverviewBudgetSpentForBank(bankKey, month);
    const budget = getOverviewBudgetLimitForBank(bankKey, month);
    budgetSpent += convertAmountCurrency(spent || 0, bankCurrency || appCurrency, appCurrency);
    budgetLimit += convertAmountCurrency(budget || 0, bankCurrency || appCurrency, appCurrency);
  });
  // Keep Bank budget "spent" aligned with the Overview top bar (real monthly spent).
  try {
    const topBarSpentCzk = Number(getArchiveMonthSpentTotalCzk(month) || 0);
    const topBarSpentInAppCurrency = Number(convertAmountCurrency(topBarSpentCzk, 'CZK', appCurrency) || 0);
    if (isFinite(topBarSpentInAppCurrency) && topBarSpentInAppCurrency >= 0) {
      budgetSpent = topBarSpentInAppCurrency;
    }
  } catch (_) {}
  const budgetPct = budgetLimit > 0 ? Math.min(budgetSpent / budgetLimit, 1) : 0;
  const budgetTransactionSeries = getOverviewBudgetTransactionSeries(month, appCurrency);

  const monthTxns = allTransactions.filter(t => normalizeMonthStr(t.month) === month);
  const cashTxns = monthTxns.filter(t => normalizePaymentKindValue(t.paymentKind || t.type) === 'cash' && Number(t.amount || 0) < 0);
  const cashSpent = cashTxns.reduce((sum, tx) => sum + Math.abs(convertTransactionAmount(tx, appCurrency)), 0);

  return { appCurrency, totalNetWorth, availableCash, investmentsValue, propertiesValue, cardUsed, cardLimit, cardPct, budgetSpent, budgetLimit, budgetPct, budgetTransactionSeries, budgetDailySeries: budgetTransactionSeries, cashSpent, creditOutstanding, creditUsed, creditLimit, creditAvailable, creditPct, hasCreditWidget };
}

function createOverviewHalfGauge(percent, caption, mainText = '') {
  const pct = Math.max(0, Math.min(100, Math.round((Number(percent || 0) || 0) * 100)));
  const isEmpty = pct < 1;
  const centerText = mainText ? escapeHtml(String(mainText)) : `${pct}%`;
  const arcStroke = isEmpty
    ? 'stroke-dasharray="0 100" opacity="0" stroke-linecap="butt"'
    : `stroke-dasharray="100 100" stroke-dashoffset="${100 - pct}" stroke-linecap="round" data-gauge-pct="${pct}" style="--gauge-pct:${pct}"`;
  const arcClass = isEmpty ? 'wealth-gauge-arc is-empty-arc' : 'wealth-gauge-arc';
  return `
    <div class="mini-half-gauge">
      <svg viewBox="${HALF_GAUGE_VIEWBOX}" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="wealthGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#00E5A0"></stop>
            <stop offset="100%" stop-color="#58cfff"></stop>
          </linearGradient>
        </defs>
        <path d="${HALF_GAUGE_ARC_PATH}" fill="none" stroke="rgba(112,145,204,.18)" stroke-width="12" stroke-linecap="round"></path>
        <path class="${arcClass}" pathLength="100" d="${HALF_GAUGE_ARC_PATH}" fill="none" stroke="url(#wealthGaugeGrad)" stroke-width="12" ${arcStroke}></path>
      </svg>
      <div class="mini-half-gauge-center">
        <span class="pct">${centerText}</span>
        <span class="caption">${escapeHtml(caption || '')}</span>
      </div>
    </div>`;
}

function createOverviewInlineProgress(leftText, rightText, ratio, statusText, statusClass) {
  const width = Math.max(0, Math.min(100, Math.round((Number(ratio || 0) || 0) * 100)));
  const noStatus = !String(statusText || '').trim();
  return `
    <div class="wealth-inline-progress-labels ${noStatus ? 'no-status' : ''}">
      <span>${escapeHtml(String(leftText || '0'))}</span>
      <span class="wealth-inline-progress-status ${escapeAttr(statusClass || '')}">${escapeHtml(String(statusText || ''))}</span>
      <span>${escapeHtml(String(rightText || '0'))}</span>
    </div>
    <div class="wealth-inline-progress-track">
      <div class="wealth-inline-progress-fill wealth-anim-fill ${escapeAttr(statusClass || '')}" style="width:${Math.max(width, statusClass === 'is-empty' ? 4 : 0)}%;"></div>
    </div>`;
}

function createCreditCardLimitProgress(used, limit, available, currency) {
  const usedNum = Math.max(0, Number(used || 0) || 0);
  const limitNum = Math.max(0, Number(limit || 0) || 0);
  const availableNum = Math.max(0, Number(available || 0) || 0);
  const ratio = limitNum > 0 ? Math.min(1, usedNum / limitNum) : 0;
  const width = Math.round(ratio * 100);
  const isCompleted = limitNum > 0 && usedNum >= limitNum;
  const isEmpty = usedNum <= 0 || limitNum <= 0;
  const pairText = formatOverviewCompactCurrencyPair(usedNum, limitNum, currency);
  const usedText = formatOverviewCompactCurrency(usedNum, currency);
  const limitText = formatOverviewCompactCurrency(limitNum, currency);
  const fillClass = isCompleted ? 'is-ok' : (isEmpty ? 'is-empty' : '');
  const fillWidth = Math.max(width, !isEmpty ? 3 : 0);
  return `
    <div class="wealth-credit-progress-summary">
      <span class="wealth-credit-progress-pair">${escapeHtml(pairText)}</span>
    </div>
    <div class="wealth-credit-progress-track" title="${escapeAttr(`${usedText} / ${limitText}`)}">
      <div class="wealth-credit-progress-used wealth-anim-fill ${escapeAttr(fillClass)}" style="width:${fillWidth}%;"></div>
    </div>`;
}

function formatOverviewCompactCurrency(value, currency) {
  const symbol = currencySymbol(currency || getAppCurrency());
  const n = Math.abs(Number(value || 0));
  const sign = Number(value || 0) < 0 ? '-' : '';
  let out;
  if (n >= 1000000) out = (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace('.', ',') + 'M';
  else if (n >= 1000) out = Math.round(n / 1000).toLocaleString('cs-CZ') + 'k';
  else out = Math.round(n).toLocaleString('cs-CZ');
  return `${sign}${out} ${symbol}`;
}

function formatOverviewCompactNumber(value) {
  const n = Math.abs(Number(value || 0));
  const sign = Number(value || 0) < 0 ? '-' : '';
  if (n >= 1000000) return sign + (n / 1000000).toFixed(n >= 10000000 ? 0 : 1).replace('.', ',') + 'M';
  if (n >= 1000) return sign + Math.round(n / 1000).toLocaleString('cs-CZ') + 'k';
  return sign + Math.round(n).toLocaleString('cs-CZ');
}

function formatOverviewCompactCurrencyPair(leftValue, rightValue, currency) {
  return `${formatOverviewCompactNumber(leftValue)} / ${formatOverviewCompactNumber(rightValue)} ${currencySymbol(currency || getAppCurrency())}`;
}

function getCreditCardMonthlyUsedAmount(appCurrency) {
  const month = normalizeMonthStr(getAktuálneMonth());
  const target = appCurrency || getAppCurrency();
  const last4 = typeof getCsobCzCreditCardLast4 === 'function' ? getCsobCzCreditCardLast4() : '';
  const creditTxns = (allTransactions || []).filter(tx => {
    if (normalizeMonthStr(tx.month) !== month) return false;
    if (Number(tx.amount || 0) >= 0) return false;
    if (!isCardTransaction(tx)) return false;
    const bankKey = getBankKey(tx);
    if (bankKey === 'csob_cz_credit') return true;
    const text = [tx.bank, tx.card, tx.type, tx.category, tx.merchant, tx.merchantRaw, tx.paymentKind].join(' ').toLowerCase();
    if (last4 && text.includes(String(last4).toLowerCase())) return true;
    return bankKey === 'csob_cz' && (text.includes('credit') || text.includes('kredit'));
  });
  return creditTxns.reduce((sum, tx) => sum + Math.abs(convertTransactionAmount(tx, target)), 0);
}

function createWealthTrendSvg() {
  return `
    <svg viewBox="0 0 180 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="wealthLineGradient" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#00E5A0"></stop>
          <stop offset="100%" stop-color="#56b6ff"></stop>
        </linearGradient>
        <linearGradient id="wealthAreaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="rgba(114,246,165,.45)"></stop>
          <stop offset="100%" stop-color="rgba(86,182,255,.06)"></stop>
        </linearGradient>
      </defs>
      <path d="M8 56 C22 50, 34 46, 44 32 S72 8, 89 12 S121 30, 137 26 S160 16, 172 12 L172 64 L8 64 Z" fill="url(#wealthAreaGradient)"></path>
      <path d="M8 56 C22 50, 34 46, 44 32 S72 8, 89 12 S121 30, 137 26 S160 16, 172 12" fill="none" stroke="url(#wealthLineGradient)" stroke-width="4" stroke-linecap="round"></path>
    </svg>`;
}

function createSmoothSvgPath(points) {
  const safePoints = (points || []).filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!safePoints.length) return '';
  if (safePoints.length === 1) return `M${safePoints[0].x.toFixed(2)} ${safePoints[0].y.toFixed(2)}`;

  let d = `M${safePoints[0].x.toFixed(2)} ${safePoints[0].y.toFixed(2)}`;
  for (let i = 0; i < safePoints.length - 1; i += 1) {
    const p0 = safePoints[Math.max(0, i - 1)];
    const p1 = safePoints[i];
    const p2 = safePoints[i + 1];
    const p3 = safePoints[Math.min(safePoints.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    let cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    let cp2y = p2.y - (p3.y - p1.y) / 6;
    const yMin = Math.min(p1.y, p2.y);
    const yMax = Math.max(p1.y, p2.y);
    cp1y = Math.max(yMin, Math.min(yMax, cp1y));
    cp2y = Math.max(yMin, Math.min(yMax, cp2y));
    d += ` C${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}


function createLinearSvgPath(points) {
  const safePoints = (points || []).filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!safePoints.length) return '';
  if (safePoints.length === 1) return `M${safePoints[0].x.toFixed(2)} ${safePoints[0].y.toFixed(2)}`;
  let d = `M${safePoints[0].x.toFixed(2)} ${safePoints[0].y.toFixed(2)}`;
  for (let i = 1; i < safePoints.length; i += 1) {
    d += ` L${safePoints[i].x.toFixed(2)} ${safePoints[i].y.toFixed(2)}`;
  }
  return d;
}


function createBudgetWavySvgPath(points, amplitude = 2.1) {
  const safePoints = (points || []).filter(p => p && Number.isFinite(p.x) && Number.isFinite(p.y));
  if (!safePoints.length) return '';
  if (safePoints.length === 1) return `M${safePoints[0].x.toFixed(2)} ${safePoints[0].y.toFixed(2)}`;

  const clampY = value => Math.max(3, Math.min(61, Number(value || 0)));
  const waveStrength = Math.max(0.18, Number(amplitude || 0) * 0.32);
  let d = `M${safePoints[0].x.toFixed(2)} ${safePoints[0].y.toFixed(2)}`;

  for (let i = 0; i < safePoints.length - 1; i += 1) {
    const p0 = safePoints[Math.max(0, i - 1)];
    const p1 = safePoints[i];
    const p2 = safePoints[i + 1];
    const p3 = safePoints[Math.min(safePoints.length - 1, i + 2)];

    const segDx = p2.x - p1.x;
    const segDy = p2.y - p1.y;
    const segLen = Math.max(1, Math.hypot(segDx, segDy));
    const sign = i % 2 === 0 ? -1 : 1;
    const gentleWave = sign * Math.min(waveStrength, Math.max(0.12, segLen * 0.02));

    const baseCp1x = p1.x + (p2.x - p0.x) / 6;
    const baseCp1y = p1.y + (p2.y - p0.y) / 6;
    const baseCp2x = p2.x - (p3.x - p1.x) / 6;
    const baseCp2y = p2.y - (p3.y - p1.y) / 6;

    const cp1x = p1.x + ((baseCp1x - p1.x) * 0.92);
    const cp2x = p2.x + ((baseCp2x - p2.x) * 0.92);
    const cp1y = clampY(baseCp1y + gentleWave);
    const cp2y = clampY(baseCp2y - gentleWave);

    d += ` C${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}

function createOverviewBudgetSparkline(used = 0, limit = 0, currency, txSeries = []) {
  const usedNum = Math.max(0, Number(used || 0) || 0);
  const limitNum = Math.max(0, Number(limit || 0) || 0);
  const series = Array.isArray(txSeries) ? txSeries.filter(p => p && Number.isFinite(Number(p.value))) : [];
  const normalizedMonth = normalizeMonthStr(getAktuálneMonth());
  const [monthNum, yearNum] = normalizedMonth.split('/').map(Number);
  const monthStart = new Date(yearNum, monthNum - 1, 1, 0, 0, 0, 0).getTime();
  const monthEnd = new Date(yearNum, monthNum, 0, 23, 59, 59, 999).getTime();
  const today = new Date();
  const todayInSelectedMonth = today.getFullYear() === yearNum && (today.getMonth() + 1) === monthNum;
  const nowInMonth = todayInSelectedMonth ? Math.min(Math.max(today.getTime(), monthStart), monthEnd) : monthEnd;

  const startX = 7;
  const startY = 61;
  const endX = 107;
  const endY = 5;
  const width = endX - startX;
  const height = startY - endY;
  const finalSpent = series.length ? Math.max(usedNum, Number(series[series.length - 1].value || 0) || 0) : usedNum;

  const dayMs = 24 * 60 * 60 * 1000;
  const remainingDaysRaw = Math.max(0, Math.ceil((monthEnd - nowInMonth) / dayMs));
  const projectedDailyStepValue = Math.max(0, Number(convertAmountCurrency(2000, 'CZK', currency || getAppCurrency())) || 2000);
  const projectionCycles = Math.max(0, Math.ceil(remainingDaysRaw / 7));
  const projectedFinalValue = Math.max(finalSpent, finalSpent + (projectedDailyStepValue * 3 * projectionCycles));
  const maxValue = Math.max(limitNum, finalSpent, projectedFinalValue, 1) * 1.04;

  let rawSpentPoints = [{ timestamp: monthStart, value: 0 }];
  if (series.length) {
    rawSpentPoints = rawSpentPoints.concat(series.map(point => ({
      timestamp: Math.min(Math.max(Number(point.timestamp || monthStart), monthStart), monthEnd),
      value: Math.max(0, Number(point.value || 0) || 0)
    })));
  } else {
    rawSpentPoints.push({ timestamp: nowInMonth, value: finalSpent });
  }

  rawSpentPoints.sort((a, b) => a.timestamp - b.timestamp);
  const deduped = [];
  rawSpentPoints.forEach(point => {
    const last = deduped[deduped.length - 1];
    if (last && Math.abs(last.timestamp - point.timestamp) < 60000) {
      last.value = Math.max(last.value, point.value);
      return;
    }
    deduped.push(point);
  });

  const spentPoints = deduped.map(point => {
    const x = startX + ((point.timestamp - monthStart) / Math.max(1, monthEnd - monthStart)) * width;
    const y = startY - (point.value / maxValue) * height;
    return { x, y, value: point.value, timestamp: point.timestamp };
  });
  const monthHasEnded = !todayInSelectedMonth && today.getTime() > monthEnd;
  if (monthHasEnded) {
    const finalY = startY - (usedNum / maxValue) * height;
    const last = spentPoints[spentPoints.length - 1];
    if (!last || last.x < endX - 0.5) {
      spentPoints.push({ x: endX, y: finalY, value: usedNum, timestamp: monthEnd });
    } else {
      last.x = endX;
      last.y = finalY;
      last.value = usedNum;
      last.timestamp = monthEnd;
    }
  } else {
    const nowX = startX + ((nowInMonth - monthStart) / Math.max(1, monthEnd - monthStart)) * width;
    const last = spentPoints[spentPoints.length - 1];
    if (last && nowX > last.x + 0.5) {
      const flatY = startY - (usedNum / maxValue) * height;
      spentPoints.push({ x: nowX, y: flatY, value: usedNum, timestamp: nowInMonth });
    }
  }
  let currentPoint = spentPoints[spentPoints.length - 1] || { x: startX, y: startY, value: 0, timestamp: monthStart };
  if (spentPoints.length) {
    const last = spentPoints[spentPoints.length - 1];
    last.value = usedNum;
    last.y = startY - (usedNum / maxValue) * height;
    currentPoint = last;
  }

  let spentLinePath = '';
  let flatTailIdx = -1;
  if (spentPoints.length >= 2) {
    const lastPt = spentPoints[spentPoints.length - 1];
    const prevPt = spentPoints[spentPoints.length - 2];
    if (Math.abs(lastPt.value - prevPt.value) < 0.01 && lastPt.x > prevPt.x + 0.5) {
      flatTailIdx = spentPoints.length - 1;
    }
  }
  if (flatTailIdx > 0) {
    const mainPts = spentPoints.slice(0, flatTailIdx);
    const anchor = mainPts[mainPts.length - 1] || spentPoints[0];
    const tail = spentPoints[flatTailIdx];
    spentLinePath = createLinearSvgPath(mainPts);
    if (spentLinePath) {
      spentLinePath += ` L${anchor.x.toFixed(2)} ${anchor.y.toFixed(2)} L${tail.x.toFixed(2)} ${tail.y.toFixed(2)}`;
    } else {
      spentLinePath = `M${tail.x.toFixed(2)} ${tail.y.toFixed(2)}`;
    }
  } else {
    spentLinePath = createLinearSvgPath(spentPoints);
  }
  let hasFlatTail = flatTailIdx > 0;
  if (monthHasEnded && spentPoints.length >= 1) {
    let mainPts = spentPoints.slice();
    const tail = mainPts[mainPts.length - 1];
    if (tail && tail.x >= endX - 0.5) mainPts = mainPts.slice(0, -1);
    const anchor = mainPts[mainPts.length - 1] || { x: startX, y: startY };
    spentLinePath = createLinearSvgPath(mainPts);
    if (spentLinePath) {
      spentLinePath += ` L${anchor.x.toFixed(2)} ${anchor.y.toFixed(2)} L${endX.toFixed(2)} ${anchor.y.toFixed(2)}`;
      hasFlatTail = true;
    }
  }
  if (spentLinePath && currentPoint && !hasFlatTail) {
    spentLinePath += ` L${currentPoint.x.toFixed(2)} ${currentPoint.y.toFixed(2)}`;
  }
  const spentAreaPath = spentLinePath
    ? `${spentLinePath} L${currentPoint.x.toFixed(2)} ${startY} L${startX} ${startY} Z`
    : '';

  const valueToY = value => startY - (Math.max(0, Number(value || 0) || 0) / maxValue) * height;
  let remainingLinePath = '';
  let remainingAreaPath = '';
  if (!monthHasEnded && currentPoint && monthEnd > currentPoint.timestamp + 60000) {
    const projValue = Math.min(projectedFinalValue, maxValue * 0.98);
    const projY = valueToY(projValue);
    remainingLinePath = `M${currentPoint.x.toFixed(2)} ${currentPoint.y.toFixed(2)} L${endX} ${projY.toFixed(2)}`;
    remainingAreaPath = `${remainingLinePath} L${endX} ${startY} L${currentPoint.x.toFixed(2)} ${startY} Z`;
  }

  return `
    <div class="wealth-budget-sparkline" aria-label="Bank budget ${escapeAttr(formatOverviewCompactCurrencyPair(usedNum, limitNum, currency))}">
      <div class="wealth-budget-sparkline-label">${escapeHtml(formatOverviewCompactCurrencyPair(usedNum, limitNum, currency))}</div>
      <svg viewBox="0 0 114 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="budgetUsedAreaV190" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(0,229,160,0.44)"></stop>
            <stop offset="72%" stop-color="rgba(0,229,160,0.07)"></stop>
            <stop offset="100%" stop-color="rgba(0,229,160,0)"></stop>
          </linearGradient>
          <linearGradient id="budgetRemainAreaV190" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="rgba(56,139,253,0.44)"></stop>
            <stop offset="72%" stop-color="rgba(56,139,253,0.07)"></stop>
            <stop offset="100%" stop-color="rgba(56,139,253,0)"></stop>
          </linearGradient>
        </defs>
        ${spentAreaPath ? `<path class="overview-line-area" d="${spentAreaPath}" fill="url(#budgetUsedAreaV190)"></path>` : ''}
        ${remainingAreaPath ? `<path class="overview-line-area is-projection" d="${remainingAreaPath}" fill="url(#budgetRemainAreaV190)"></path>` : ''}
        ${spentLinePath ? `<path class="wealth-spark-line overview-widget-line" d="${spentLinePath}" fill="none" stroke="#00E5A0" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round"></path>` : ''}
        ${remainingLinePath ? `<path class="wealth-spark-line overview-widget-line is-projection" d="${remainingLinePath}" fill="none" stroke="#388bfd" stroke-width="2.15" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"></path>` : ''}
        <circle class="overview-line-dot" cx="${currentPoint.x.toFixed(2)}" cy="${currentPoint.y.toFixed(2)}" r="1.55" fill="#ffffff" opacity="0.95"></circle>
        <circle class="overview-line-dot" cx="${currentPoint.x.toFixed(2)}" cy="${currentPoint.y.toFixed(2)}" r="0.92" fill="#00E5A0"></circle>
      </svg>
    </div>`;
}
function updateGlobalSyncIndicator(_active) {
  const el = document.getElementById('global-sync-indicator');
  if (!el) return;
  el.classList.remove('show');
  el.hidden = true;
}

function setOverviewBalanceSyncState(active) {
  if (active) beginOverviewBalanceSyncUI();
  else endOverviewBalanceSyncUI();
}

function getOverviewBalanceSyncCards() {
  return Array.from(document.querySelectorAll('.wealth-card-net, .wealth-card-cash'));
}

function beginOverviewBalanceSyncUI() {
  __overviewBalanceSyncDepth++;
  if (__overviewBalanceSyncDepth > 1) return;
  getOverviewBalanceSyncCards().forEach((card) => {
    card.classList.add('is-balance-syncing');
  });
}

function endOverviewBalanceSyncUI() {
  __overviewBalanceSyncDepth = Math.max(0, __overviewBalanceSyncDepth - 1);
  if (__overviewBalanceSyncDepth > 0) return;
  getOverviewBalanceSyncCards().forEach((card) => {
    card.classList.remove('is-balance-syncing');
  });
}

function lockOverviewBalanceDatasets() {
  try {
    const metrics = typeof getOverviewDashboardMetrics === 'function' ? getOverviewDashboardMetrics() : null;
    if (!metrics) return;
    const net = document.getElementById('overview-net-worth');
    const cash = document.getElementById('overview-available-cash');
    if (net && net.dataset.balanceValue == null) {
      net.dataset.balanceValue = String(Number(metrics.totalNetWorth || 0));
    }
    if (cash && cash.dataset.balanceValue == null) {
      cash.dataset.balanceValue = String(Number(metrics.availableCash || 0));
    }
  } catch (_) {}
}

function applyOverviewBalanceEl(el, amount, currency, options = {}) {
  if (!el) return;
  const target = Number(amount || 0);
  const curr = currency || getAppCurrency();
  const animate = !!(options && options.animate);
  const from = Number(el.dataset.balanceValue ?? target);
  el.dataset.balanceValue = String(target);

  const paint = (value) => {
    el.textContent = formatSignedCurrencyAmount(value, curr);
  };

  if (!animate || Math.abs(from - target) < 0.5 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    paint(target);
    return;
  }

  const start = performance.now();
  const duration = 420;
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    paint(from + (target - from) * eased);
    if (t < 1) requestAnimationFrame(step);
    else paint(target);
  };
  requestAnimationFrame(step);
}