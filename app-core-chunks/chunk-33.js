// Generated app-core slice 33/34 (declarations).

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

  const yieldStartupFrame = () => yieldStartupLogoFrames(2);

  const runStartupBootstrap = async () => {
  try {
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
  if (window.__btSplashInitialCycleComplete) {
    startAppBootAfterSplashCycle();
    return;
  }
  window.addEventListener('bt:splash-first-cycle-complete', startAppBootAfterSplashCycle, { once: true });
}