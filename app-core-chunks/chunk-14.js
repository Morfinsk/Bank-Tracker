// Generated app-core slice 14/34 (declarations).

function reduceMotionCheck() {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
}

function getNetWorthTrendAnimRoot(card) {
  if (!card) return null;
  return card.querySelector('#overview-net-worth-trend-v238') || card.querySelector('.wealth-networth-trend-v238');
}

function stopNetWorthTrendAnimations(card) {
  const root = getNetWorthTrendAnimRoot(card);
  if (!root) return;
  root.querySelectorAll('.wealth-networth-trend-line-v238').forEach((line) => {
    try { (line.__btNetWorthLineAnim || []).forEach((anim) => anim.cancel()); } catch (_) {}
    line.__btNetWorthLineAnim = null;
    line.style.strokeDasharray = '';
    line.style.strokeDashoffset = '';
    line.style.animation = '';
  });
  revealOverviewLineAreas(root.querySelectorAll('.wealth-networth-trend-area-v238, .overview-line-area'), { animate: false });
}

function primeNetWorthTrendForIntro(root) {
  if (!root) return;
  root.querySelectorAll('.wealth-networth-trend-line-v238').forEach((line) => {
    try { (line.__btNetWorthLineAnim || []).forEach((anim) => anim.cancel()); } catch (_) {}
    line.__btNetWorthLineAnim = null;
    line.style.animation = 'none';
    let len = 0;
    try { len = line.getTotalLength(); } catch (_) {}
    if (!len || len < 1) len = 420;
    line.style.strokeDasharray = `${len}`;
    line.style.strokeDashoffset = `${len}`;
  });
}

function playNetWorthTrendChartIntro(card) {
  const root = getNetWorthTrendAnimRoot(card);
  if (!root || !root.querySelector('.wealth-networth-trend-line-v238')) return;
  if (activePageId !== 'overview') return;
  const reducedMotion = reduceMotionCheck();
  const areaNodes = root.querySelectorAll('.wealth-networth-trend-area-v238, .overview-line-area');
  if (reducedMotion) {
    root.querySelectorAll('.wealth-networth-trend-line-v238').forEach((line) => {
      line.style.strokeDashoffset = '0';
      line.style.animation = 'none';
    });
    revealOverviewLineAreas(areaNodes, { animate: false });
    return;
  }

  primeNetWorthTrendForIntro(root);
  hideOverviewLineAreas(areaNodes);
  void root.offsetWidth;

  const lines = Array.from(root.querySelectorAll('.wealth-networth-trend-line-v238'));
  let maxLineEndMs = 0;
  let finished = 0;
  const maybeRevealArea = () => {
    finished += 1;
    if (finished < lines.length) return;
    revealOverviewLineAreas(areaNodes, { animate: true });
  };
  lines.forEach((line, idx) => {
    let len = 0;
    try { len = line.getTotalLength(); } catch (_) {}
    if (!len || len < 1) len = 420;
    const duration = NET_WORTH_TREND_LINE_DRAW_MS;
    const delay = idx * 110;
    maxLineEndMs = Math.max(maxLineEndMs, delay + duration);
    try {
      const anim = line.animate(
        [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration, delay, easing: 'ease-out', fill: 'forwards' }
      );
      line.__btNetWorthLineAnim = [anim];
      anim.onfinish = () => {
        line.style.strokeDashoffset = '0';
        maybeRevealArea();
      };
      anim.oncancel = () => {
        line.style.strokeDashoffset = '0';
        maybeRevealArea();
      };
    } catch (_) {
      line.style.strokeDashoffset = '0';
      maybeRevealArea();
    }
  });
  if (!lines.length) revealOverviewLineAreas(areaNodes, { animate: false });
}

function runOverviewLineAnimations(card) {
  if (!card || typeof card.querySelectorAll !== 'function') return;
  const reduceMotion = reduceMotionCheck();
  const areaGroups = collectOverviewLineAreaGroups(card);

  // Cancel previous line anims without forcing fills visible first — we hide them below.
  card.querySelectorAll('.overview-widget-line, .wealth-spark-line, .wealth-networth-trend-line-v238').forEach((line) => {
    try {
      (line.__btLineAnim || []).forEach((anim) => {
        try { anim.onfinish = null; anim.oncancel = null; } catch (_) {}
        try { anim.cancel(); } catch (_) {}
      });
    } catch (_) {}
    line.__btLineAnim = null;
  });
  areaGroups.forEach((group) => {
    hideOverviewLineAreas(group.mainAreas.concat(group.projAreas));
    hideOverviewLineDots(group.dots);
  });
  void card.offsetWidth;

  const mainLines = card.querySelectorAll(
    '.overview-widget-line:not(.is-projection):not(.wealth-networth-trend-line-v238), .wealth-spark-line:not(.is-projection)'
  );
  const projLines = card.querySelectorAll('.overview-widget-line.is-projection, .wealth-spark-line.is-projection');
  const hasProjection = projLines.length > 0;
  const allMainAreas = areaGroups.flatMap((group) => group.mainAreas);
  const allProjAreas = areaGroups.flatMap((group) => group.projAreas);
  const allDots = areaGroups.flatMap((group) => group.dots || []);

  if (reduceMotion) {
    mainLines.forEach((line) => {
      line.style.strokeDasharray = '';
      line.style.strokeDashoffset = '';
    });
    projLines.forEach((line) => {
      const targetOpacity = parseFloat(line.getAttribute('opacity') || line.style.opacity || '0.94') || 0.94;
      line.style.strokeDasharray = '';
      line.style.strokeDashoffset = '';
      line.style.opacity = String(targetOpacity);
    });
    revealOverviewLineAreas(allMainAreas.concat(allProjAreas), { animate: false });
    revealOverviewLineDots(allDots, { animate: false });
    return;
  }

  let mainFinished = 0;
  const revealMainAreas = () => {
    mainFinished += 1;
    if (mainFinished < mainLines.length) return;
    revealOverviewLineAreas(allMainAreas, { animate: true });
    // Dot pops only after spent line finishes; projection stays without a ball.
    revealOverviewLineDots(allDots, { animate: true });
  };

  mainLines.forEach((line) => {
    line.removeAttribute('pathLength');
    const anim = runOverviewLineDrawAnimation(
      line,
      hasProjection ? OVERVIEW_LINE_DRAW_MS : OVERVIEW_LINE_SMOOTH_MS,
      OVERVIEW_CHART_ANIM_BEGIN_MS
    );
    if (anim) {
      anim.onfinish = () => {
        line.style.strokeDasharray = '';
        line.style.strokeDashoffset = '';
        revealMainAreas();
      };
      anim.oncancel = anim.onfinish;
      line.__btLineAnim = [anim];
    } else {
      revealMainAreas();
    }
  });
  if (!mainLines.length) {
    revealOverviewLineAreas(allMainAreas, { animate: false });
    revealOverviewLineDots(allDots, { animate: false });
  }

  let projFinished = 0;
  const revealProjAreas = () => {
    projFinished += 1;
    if (projFinished < projLines.length) return;
    revealOverviewLineAreas(allProjAreas, { animate: true });
  };

  projLines.forEach((line) => {
    line.removeAttribute('pathLength');
    const targetOpacity = parseFloat(line.getAttribute('opacity') || line.style.opacity || '0.94') || 0.94;
    line.style.opacity = '0';
    let pathLen = 1;
    try { pathLen = Math.max(1, line.getTotalLength()); } catch (_) {}
    const projDuration = Math.max(
      OVERVIEW_PROJECTION_DRAW_MS,
      Math.round(OVERVIEW_PROJECTION_DRAW_MS * (pathLen / 42))
    );
    const anim = runOverviewLineDrawAnimation(line, projDuration, OVERVIEW_PROJECTION_DELAY_MS + OVERVIEW_CHART_ANIM_BEGIN_MS);
    if (anim) {
      const opacityAnim = line.animate([
        { opacity: 0 },
        { opacity: targetOpacity }
      ], {
        duration: projDuration,
        delay: OVERVIEW_PROJECTION_DELAY_MS + OVERVIEW_CHART_ANIM_BEGIN_MS,
        easing: 'ease-out',
        fill: 'forwards'
      });
      anim.onfinish = () => {
        line.style.strokeDasharray = '';
        line.style.strokeDashoffset = '';
        line.style.opacity = String(targetOpacity);
        revealProjAreas();
      };
      anim.oncancel = anim.onfinish;
      line.__btLineAnim = [anim, opacityAnim];
    } else {
      line.style.opacity = String(targetOpacity);
      revealProjAreas();
    }
  });
  if (!projLines.length) revealOverviewLineAreas(allProjAreas, { animate: false });
}

function stopOverviewChartCardAnimations(card) {
  if (!card) return;
  const timerId = __overviewChartAnimTimers.get(card);
  if (timerId) {
    window.clearTimeout(timerId);
    __overviewChartAnimTimers.delete(card);
  }
  stopOverviewGaugeArcAnimations(card);
  stopOverviewLineAnimations(card);
  stopNetWorthTrendAnimations(card);
  card.classList.remove('overview-chart-animating');
}

function pauseOverviewChartAnimations() {
  const page = document.getElementById('page-overview');
  if (!page) return;
  getOverviewChartCards(page).forEach((card) => stopOverviewChartCardAnimations(card));
  page.classList.remove('overview-summary-revealing', 'summary-days-progress-animating');
}

function cancelOverviewChartsReplay() {
  if (__overviewChartReplayTimer) {
    window.clearTimeout(__overviewChartReplayTimer);
    __overviewChartReplayTimer = null;
  }
  __overviewChartReplayToken += 1;
}

function scheduleOverviewChartsReplay(fromDetailsReturn = false) {
  cancelOverviewChartsReplay();
  const token = __overviewChartReplayToken;
  const fire = () => {
    __overviewChartReplayTimer = null;
    if (token !== __overviewChartReplayToken || activePageId !== 'overview') return;
    const page = document.getElementById('page-overview');
    if (page) {
      getOverviewChartCards(page).forEach((card) => {
        if (!isOverviewChartCardVisible(card)) return;
        stopOverviewChartCardAnimations(card);
        try { delete card.dataset.btChartAnimSig; } catch (_) {}
      });
      page.classList.remove('overview-summary-revealing', 'summary-days-progress-animating');
    }
    try { animateOverviewChartsIntro({ mode: 'visible', force: true }); } catch (_) {}
  };
  if (fromDetailsReturn) {
    __overviewChartReplayTimer = window.setTimeout(fire, 280);
    return;
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(fire);
  });
}

function getOverviewChartCardAnimDuration(card) {
  const hasGauge = !!(card && card.querySelector('.overview-widget-arc:not(.is-empty-arc), .wealth-gauge-arc:not(.is-empty-arc)'));
  const hasProjection = !!(card && card.querySelector('.overview-widget-line.is-projection, .wealth-spark-line.is-projection'));
  let lineDuration = hasProjection
    ? (OVERVIEW_LINE_DRAW_MS + OVERVIEW_PROJECTION_DELAY_MS + OVERVIEW_PROJECTION_DRAW_MS + 450)
    : (OVERVIEW_LINE_SMOOTH_MS + 450);
  if (hasProjection) {
    let maxProjDuration = OVERVIEW_PROJECTION_DRAW_MS;
    card.querySelectorAll('.overview-widget-line.is-projection, .wealth-spark-line.is-projection').forEach((line) => {
      try {
        const pathLen = Math.max(1, line.getTotalLength());
        maxProjDuration = Math.max(maxProjDuration, Math.round(OVERVIEW_PROJECTION_DRAW_MS * (pathLen / 42)));
      } catch (_) {}
    });
    lineDuration = OVERVIEW_LINE_DRAW_MS + OVERVIEW_PROJECTION_DELAY_MS + maxProjDuration + 450;
  }
  const gaugeDuration = hasGauge ? (OVERVIEW_GAUGE_DRAW_MS + 450) : 0;
  return Math.max(lineDuration, gaugeDuration);
}

function animateOverviewChartCard(card) {
  if (!overviewChartCardHasGraphics(card)) return false;
  if (!canRunOverviewChartIntro()) return false;
  stopOverviewChartCardAnimations(card);
  void card.offsetWidth;
  card.classList.add('overview-chart-animating');
  card.dataset.btChartAnimSig = getOverviewChartCardSignature(card);
  __overviewChartIntroPlayed.add(card);

  const startDraw = () => {
    if (!card.isConnected || !canRunOverviewChartIntro()) {
      card.classList.remove('overview-chart-animating');
      return;
    }
    runOverviewGaugeArcAnimations(card);
    if (card.querySelector('.wealth-networth-trend-line-v238')) {
      playNetWorthTrendChartIntro(card);
    } else {
      runOverviewLineAnimations(card);
    }
  };
  // animationBegin: wait one frame + short delay so GAS data/layout can settle.
  window.setTimeout(() => {
    requestAnimationFrame(startDraw);
  }, OVERVIEW_CHART_ANIM_BEGIN_MS);

  const duration = getOverviewChartCardAnimDuration(card) + OVERVIEW_CHART_ANIM_BEGIN_MS;
  const timerId = window.setTimeout(() => {
    card.classList.remove('overview-chart-animating');
    finalizeOverviewGaugeArcs(card);
    finalizeOverviewChartLineStrokes(card);
    stopNetWorthTrendAnimations(card);
    __overviewChartAnimTimers.delete(card);
  }, duration);
  __overviewChartAnimTimers.set(card, timerId);
  return true;
}

function animateOverviewSummaryStripReveal() {
  const page = document.getElementById('page-overview');
  if (!page || activePageId !== 'overview') return;
  requestAnimationFrame(() => {
    animateOverviewDaysLeftProgress();
    page.classList.remove('overview-summary-revealing');
    void page.offsetWidth;
    page.classList.add('overview-summary-revealing');
    window.setTimeout(() => page.classList.remove('overview-summary-revealing'), OVERVIEW_LINE_SMOOTH_MS + 120);
  });
}

function playOverviewSummaryStripReveal() {
  animateOverviewSummaryStripReveal();
}

function animateOverviewDaysLeftProgress() {
  const page = document.getElementById('page-overview');
  const fill = document.getElementById('sum-days-progress-fill');
  if (!page || !fill) return;
  page.classList.remove('summary-days-progress-animating');
  void page.offsetWidth;
  page.classList.add('summary-days-progress-animating');
  window.setTimeout(() => page.classList.remove('summary-days-progress-animating'), OVERVIEW_PROGRESS_DRAW_MS + 120);
}

function animateOverviewChartsIntro(options = {}) {
  const page = document.getElementById('page-overview');
  if (!page || !canRunOverviewChartIntro()) return;
  const mode = options.mode || 'visible';
  const force = !!(options && options.force);
  const beforeSigs = mode === 'changed-visible'
    ? (options.beforeSigs || window.__overviewChartSigsBeforeSync || null)
    : null;

  const run = () => {
    let cards = getOverviewIntroCards(page, { mode, beforeSigs });
    if (mode === 'boot') {
      cards = cards.filter((card) => isOverviewChartCardVisible(card));
    } else if (mode !== 'changed-visible' && !force) {
      cards = cards.filter((card) => !overviewChartIntroIsCurrent(card));
    }
    cards.forEach((card) => animateOverviewChartCard(card));

    const summaryChanged = !beforeSigs || getOverviewSummarySignature() !== beforeSigs.__summary;
    if (cards.length && (mode === 'visible' || mode === 'boot' || summaryChanged)) {
      try { playOverviewSummaryStripReveal(); } catch (_) {}
    }

    if (mode === 'changed-visible') {
      window.__overviewSyncChangedChartKeys = new Set(cards.map(getOverviewChartCardKey).filter(Boolean));
      window.__overviewChartSigsBeforeSync = null;
    } else {
      window.__overviewSyncChangedChartKeys = null;
    }

    try { setupOverviewScrollChartAnimations(); } catch (_) {}
    return cards.length;
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const animated = run();
      if (mode !== 'changed-visible' && animated === 0) {
        const needsIntro = getOverviewChartCardsNeedingIntro(page).length > 0;
        if (needsIntro) {
          window.setTimeout(() => { try { run(); } catch (_) {} }, 80);
        }
      }
    });
  });
}

function animateVisibleOverviewChartCards() {
  animateOverviewChartsIntro();
}

function shouldWaitForOverviewDataSync() {
  try {
    return !!(SHEETS_URL && typeof isGoogleSheetsEnabled === 'function' && isGoogleSheetsEnabled());
  } catch (_) {
    return false;
  }
}

function markOverviewChartsAwaitingFreshData() {
  __overviewChartsDataSettled = false;
  __overviewChartBootIntroDone = false;
  __overviewChartScrollLive = false;
  if (__overviewBootScheduleTimer) {
    window.clearTimeout(__overviewBootScheduleTimer);
    __overviewBootScheduleTimer = null;
  }
  if (__overviewScrollLiveTimer) {
    window.clearTimeout(__overviewScrollLiveTimer);
    __overviewScrollLiveTimer = null;
  }
}

function resetOverviewPageBootAnimationState() {
  markOverviewChartsAwaitingFreshData();
  const page = document.getElementById('page-overview');
  if (!page) return;
  getOverviewChartCards(page).forEach((card) => {
    stopOverviewChartCardAnimations(card);
    try { delete card.dataset.btChartAnimSig; } catch (_) {}
  });
}

function isOverviewPageBootReady() {
  if (!canRunOverviewChartIntro()) return false;
  if (__bootPresentationPhase) return hasBootPresentableOverviewUi();
  if (typeof isSyncing !== 'undefined' && isSyncing) return false;
  if (shouldWaitForOverviewDataSync() && !__overviewChartsDataSettled) return false;
  return isOverviewPageDataReady();
}

function scheduleOverviewPageBootAnimation(options = {}) {
  if (__overviewChartBootIntroDone && !options.force) return;
  if (__overviewBootScheduleTimer) {
    window.clearTimeout(__overviewBootScheduleTimer);
  }
  const delayMs = options.delayMs != null ? options.delayMs : OVERVIEW_BOOT_DEBOUNCE_MS;
  __overviewBootScheduleTimer = window.setTimeout(() => {
    __overviewBootScheduleTimer = null;
    try { runOverviewPageBootAnimation(); } catch (_) {}
  }, Math.max(0, delayMs));
}

function runOverviewPageBootAnimation() {
  if (__overviewChartBootIntroDone) return;
  if (!canRunOverviewChartIntro()) {
    scheduleOverviewPageBootAnimation({ delayMs: 120 });
    return;
  }
  if (!isOverviewPageBootReady()) {
    scheduleOverviewPageBootAnimation({ delayMs: 100 });
    return;
  }

  __overviewChartBootIntroDone = true;
  window.__overviewPendingSyncChartAnim = false;
  window.__overviewChartSigsBeforeSync = null;

  const page = document.getElementById('page-overview');
  if (!page) return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const allCards = getOverviewChartCards(page).filter(overviewChartCardHasGraphics);
      const visibleCards = allCards.filter(isOverviewChartCardVisible);
      const hiddenCards = allCards.filter((card) => !isOverviewChartCardVisible(card));

      hiddenCards.forEach((card) => {
        try { delete card.dataset.btChartAnimSig; } catch (_) {}
      });

      visibleCards.forEach((card, index) => {
        window.setTimeout(() => {
          try { animateOverviewChartCard(card); } catch (_) {}
        }, index * OVERVIEW_BOOT_STAGGER_MS);
      });

      if (visibleCards.length || page.querySelector('.summary-days-progress')) {
        try { playOverviewSummaryStripReveal(); } catch (_) {}
      }

      const scrollLiveDelay = visibleCards.length
        ? Math.min(420, visibleCards.length * OVERVIEW_BOOT_STAGGER_MS + 160)
        : 80;
      try { setupOverviewScrollChartAnimations({ enableLiveDelayMs: scrollLiveDelay }); } catch (_) {}
    });
  });
}

function scheduleOverviewChartBootIntroOnce() {
  scheduleOverviewPageBootAnimation();
}

function animateOverviewChartsAfterSync() {
  if (activePageId !== 'overview') return;
  const beforeSigs = window.__overviewChartSigsBeforeSync || null;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (!__overviewChartBootIntroDone) {
        scheduleOverviewChartBootIntroOnce();
        return;
      }
      if (!beforeSigs) {
        animateOverviewChartsIntro({ mode: 'visible' });
        return;
      }
      const page = document.getElementById('page-overview');
      const chartChanged = !!(page && getOverviewChartCards(page).some((card) => overviewChartCardDataChanged(card, beforeSigs)));
      const summaryChanged = getOverviewSummarySignature() !== beforeSigs.__summary;
      if (!chartChanged && !summaryChanged) {
        window.__overviewChartSigsBeforeSync = null;
        window.__overviewSyncChangedChartKeys = null;
        try { setupOverviewScrollChartAnimations(); } catch (_) {}
        return;
      }
      animateOverviewChartsIntro({ mode: 'changed-visible', beforeSigs });
    });
  });
}