// Generated app-core slice 7/34 (declarations).

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

  // Reduced-motion/fallback may already be frozen on a complete B. Normal
  // cold start remains a draw loop and reveals through animationiteration.
  if (session.kind === 'boot' && window.__btSplashDrawComplete) {
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
      reveal();
    };
    session.cycleEndLogo = cycleTarget;
    session.cycleEndHandler = onCycleEnd;
    cycleTarget.addEventListener('animationiteration', onCycleEnd);
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
  // Post-core feature modules are compiled and initialized progressively.
  // Data may finish first, but the overlay must remain until both gates settle.
  if (window.__btLazyStartupReady === false) return;
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