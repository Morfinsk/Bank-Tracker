// Generated app-core slice 22/34 (declarations).

function initPullToRefresh() {
  if (window.__btPullToRefreshReady) return;
  window.__btPullToRefreshReady = true;
  ensurePullToRefreshUi();

  const THRESHOLD = 72;
  const MAX_PULL = 118;
  let startY = 0;
  let startX = 0;
  let tracking = false;
  let pulling = false;
  let pull = 0;

  const isBlockedTarget = (target) => {
    return !!(target && target.closest && target.closest('input, textarea, select, .bottom-sheet, .bottom-sheet-backdrop'));
  };

  const canPullToRefresh = () => {
    if (window.__btPullRefreshRunning || isSyncing) return false;
    if (document.body.classList.contains('sheet-open')) return false;
    if (document.querySelector('.bottom-sheet.open')) return false;
    return isAppScrollAtTopForPullRefresh();
  };

  const resetPull = (animateBack) => {
    tracking = false;
    pulling = false;
    pull = 0;
    const el = document.getElementById('bt-pull-refresh');
    if (el && !window.__btPullRefreshRunning) {
      el.style.transition = animateBack ? 'transform .22s ease, opacity .22s ease' : 'none';
      el.style.transform = 'translate3d(-50%, -140%, 0)';
      if (animateBack) el.classList.remove('is-visible');
      const icon = el.querySelector('.bt-pull-refresh-icon');
      if (icon) icon.style.transform = '';
    }
    setPullToRefreshPageOffset(0, animateBack);
  };

  window.addEventListener('touchstart', (event) => {
    if (!event.touches || event.touches.length !== 1) return;
    if (!canPullToRefresh()) return;
    if (isBlockedTarget(event.target)) return;
    startY = event.touches[0].clientY;
    startX = event.touches[0].clientX;
    tracking = true;
    pulling = false;
    pull = 0;
  }, { passive: true });

  window.addEventListener('touchmove', (event) => {
    if (!tracking || !event.touches || event.touches.length !== 1) return;
    if (!canPullToRefresh()) {
      resetPull(true);
      return;
    }

    const touch = event.touches[0];
    const deltaY = touch.clientY - startY;
    const deltaX = touch.clientX - startX;
    if (deltaY <= 0) {
      if (pulling) resetPull(false);
      return;
    }
    if (Math.abs(deltaY) <= Math.abs(deltaX) * 1.15) return;

    pulling = true;
    pull = Math.min(deltaY * 0.5, MAX_PULL);
    if (event.cancelable) event.preventDefault();

    const el = ensurePullToRefreshUi();
    el.style.transition = 'none';
    el.style.transform = `translate3d(-50%, ${Math.max(0, pull - 18)}px, 0)`;
    el.classList.add('is-visible');
    const text = el.querySelector('.bt-pull-refresh-text');
    if (text) text.textContent = '';
    const icon = el.querySelector('.bt-pull-refresh-icon');
    if (icon) icon.style.transform = `rotate(${Math.min(pull / THRESHOLD, 1) * 180}deg)`;
    setPullToRefreshPageOffset(Math.round(pull * 0.34), false);
  }, { passive: false });

  window.addEventListener('touchend', () => {
    if (!tracking) return;
    const shouldRefresh = pulling && pull >= THRESHOLD;
    tracking = false;
    pulling = false;
    pull = 0;
    if (shouldRefresh) runPullToRefresh();
    else resetPull(true);
  }, { passive: true });

  window.addEventListener('touchcancel', () => resetPull(true), { passive: true });
}

// ── BOTTOM SHEET DRAG DOWN TO CLOSE — LARGE TOUCH ZONE ─────
function initBottomSheetDragToClose() {
  // v9: Drag/pull-down-to-close enabled again, using the proven v4 handler.

  document.querySelectorAll('.bottom-sheet').forEach(sheet => {
    if (sheet.id === 'custom-widget-sheet' || sheet.classList.contains('custom-widget-fullpage') || sheet.classList.contains('bottom-sheet-widget')) return;
    if (sheet.dataset.dragToCloseBound === 'true') return;
    sheet.dataset.dragToCloseBound = 'true';

    let startY = 0;
    let currentY = 0;
    let pointerId = null;
    let isTracking = false;
    let isDragging = false;
    let rafId = null;
    let pendingY = 0;
    let startScrollTop = 0;
    let sheetHeight = 0;
    let startedOnStrongHandle = false;

    const isInteractiveTarget = (target) => {
      return !!(target && target.closest && target.closest(
        'button, input, select, textarea, a, .txn-filter-pill, .cat-chip, .sync-btn, .top-upgrade-btn, .settings-plan-upgrade, .waitlist-btn, .mini-action-btn, .config-save, .date-range-clear-btn, .txn-show-more-btn'
      ));
    };

    const getYInsideSheet = (event) => {
      const rect = sheet.getBoundingClientRect();
      return {
        rect,
        yInside: event.clientY - rect.top
      };
    };

    const getDragZoneHeight = () => {
      const rect = sheet.getBoundingClientRect();
      const titleRow = sheet.querySelector('.sheet-title-row');
      const handle = sheet.querySelector('.sheet-handle');
      const managerHeaderExtra = sheet.querySelector('.manager-search-wrap, .loan-manager-sheet-note');

      let height = 138;

      if (titleRow) {
        const titleBottom = titleRow.getBoundingClientRect().bottom - rect.top;
        height = Math.max(height, titleBottom + 22);
      }

      if (handle) {
        const handleBottom = handle.getBoundingClientRect().bottom - rect.top;
        height = Math.max(height, handleBottom + 82);
      }

      if (managerHeaderExtra) {
        const extraBottom = managerHeaderExtra.getBoundingClientRect().bottom - rect.top;
        height = Math.max(height, extraBottom + 12);
      }

      if (sheet.id === 'bank-manager-sheet' || sheet.id === 'loan-manager-sheet') {
        height = Math.max(height, 188);
      }

      return Math.min(Math.max(height, 132), 260);
    };

    const canTrack = (event) => {
      if (!sheet.classList.contains('open')) return false;
      if (isInteractiveTarget(event.target)) return false;

      // v11: Upgrade has heavy scrollable content. Keep drag-to-close enabled,
      // but only from the handle/header so normal scrolling cannot fight the sheet drag.
      if (sheet.id === 'upgrade-sheet') {
        return !!(event.target && event.target.closest && event.target.closest('.sheet-handle, .sheet-title-row'));
      }

      // Manager sheets should scroll smoothly without accidental drag-close from content.
      // Allow drag-close only from the top handle/title row.
      if (sheet.id === 'bank-manager-sheet' || sheet.id === 'loan-manager-sheet') {
        return !!(event.target && event.target.closest && event.target.closest('.sheet-handle, .sheet-title-row'));
      }

      return true;
    };

    const setSheetY = (y) => {
      sheet.style.setProperty('transform', `translate3d(-50%, ${Math.max(0, y)}px, 0)`, 'important');
    };

    const applyTransform = () => {
      rafId = null;
      setSheetY(pendingY);
    };

    const scheduleTransform = (deltaY) => {
      pendingY = Math.max(0, deltaY);
      if (rafId) return;
      rafId = requestAnimationFrame(applyTransform);
    };

    const clearRaf = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const resetState = () => {
      clearRaf();
      isTracking = false;
      isDragging = false;
      pointerId = null;
      startY = 0;
      currentY = 0;
      pendingY = 0;
      startScrollTop = 0;
      sheetHeight = 0;
      startedOnStrongHandle = false;
      sheet.dataset.dragActive = 'false';
      sheet.classList.remove('dragging', 'sheet-snapping');
      sheet.style.removeProperty('transform');
      sheet.style.removeProperty('transition');
    };

    const snapOpen = () => {
      clearRaf();
      sheet.classList.remove('dragging');
      sheet.classList.add('sheet-snapping');
      const managerSheet = sheet.id === 'bank-manager-sheet' || sheet.id === 'loan-manager-sheet';
      const snapMs = managerSheet ? '0s' : '.20s';
      sheet.style.setProperty('transition', `transform ${snapMs} cubic-bezier(.22,.72,.23,1)`, 'important');
      setSheetY(0);

      window.setTimeout(() => {
        if (sheet.classList.contains('open')) {
          sheet.classList.remove('sheet-snapping');
          sheet.style.removeProperty('transition');
          sheet.style.removeProperty('transform');
        }
        resetState();
      }, managerSheet ? 24 : 220);
    };

    const beginTracking = (event) => {
      if (!canTrack(event)) return;

      const { rect, yInside } = getYInsideSheet(event);
      const dragZoneHeight = getDragZoneHeight();

      startY = event.clientY;
      currentY = startY;
      pointerId = event.pointerId;
      isTracking = true;
      isDragging = false;
      startScrollTop = sheet.scrollTop || 0;
      sheetHeight = Math.max(rect.height, 1);

      // FULL MOBILE TOUCH ZONE:
      // Everything from the top edge through the title/header area is a strong drag surface.
      startedOnStrongHandle =
        yInside >= 0 &&
        yInside <= dragZoneHeight;

      if (startedOnStrongHandle) {
        try { sheet.setPointerCapture(pointerId); } catch (_) {}
        if (event.cancelable) event.preventDefault();
      }
    };

    const startDrag = (event) => {
      isDragging = true;
      sheet.dataset.dragActive = 'true';
      sheet.classList.remove('sheet-snapping');
      sheet.classList.add('dragging');
      sheet.style.setProperty('transition', 'none', 'important');

      try { sheet.setPointerCapture(pointerId); } catch (_) {}
      if (event && event.cancelable) event.preventDefault();
    };

    const moveDrag = (event) => {
      if (!isTracking || event.pointerId !== pointerId) return;

      currentY = event.clientY;
      const deltaY = currentY - startY;

      if (!isDragging) {
        if (deltaY < -8) {
          resetState();
          return;
        }

        if (deltaY < 5) return;

        // Top/header zone can always drag down.
        // Below header, only drag when sheet content was already at top.
        if (!startedOnStrongHandle && startScrollTop > 0) return;

        startDrag(event);
      }

      const dragY = Math.max(0, deltaY);
      scheduleTransform(dragY);

      if (event.cancelable) event.preventDefault();
    };

    const finishDrag = (event) => {
      if (!isTracking || (event && event.pointerId !== undefined && event.pointerId !== pointerId)) return;

      const deltaY = Math.max(0, currentY - startY);
      const closeThreshold = (sheet.id === 'bank-manager-sheet' || sheet.id === 'loan-manager-sheet')
        ? Math.max(96, sheetHeight * 0.34)
        : Math.max(120, sheetHeight * 0.5);

      try { sheet.releasePointerCapture(pointerId); } catch (_) {}

      if (!isDragging) {
        resetState();
        return;
      }

      if (deltaY >= closeThreshold) {
        resetState();
        closeBottomSheets();
      } else {
        snapOpen();
      }
    };

    sheet.addEventListener('pointerdown', beginTracking);
    sheet.addEventListener('pointermove', moveDrag, { passive: false });
    sheet.addEventListener('pointerup', finishDrag);
    sheet.addEventListener('pointercancel', resetState);
    sheet.addEventListener('lostpointercapture', () => {
      if (!isTracking) return;
      resetState();
    });
  });
}

function lockPageScrollForSheet() {
  if (document.body.dataset.sheetScrollLocked === 'true') return;
  const activeSheetId = String(document.body.dataset.activeSheet || '');
  const lightweightLock = activeSheetId === 'bank-manager-sheet' || activeSheetId === 'loan-manager-sheet';
  __sheetScrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
  __sheetScrollLockMode = lightweightLock ? 'light' : 'fixed';
  document.body.dataset.sheetScrollLocked = 'true';
  // v3000: html has scroll-behavior:smooth — without this override the browser
  // visibly animates the scroll clamp on open and the restore on close.
  document.documentElement.style.scrollBehavior = 'auto';
  if (lightweightLock) return;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${__sheetScrollLockY}px`;
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
}

function unlockPageScrollForSheet() {
  if (document.body.dataset.sheetScrollLocked !== 'true') return;
  document.body.dataset.sheetScrollLocked = 'false';
  document.body.style.removeProperty('position');
  document.body.style.removeProperty('top');
  document.body.style.removeProperty('left');
  document.body.style.removeProperty('right');
  document.body.style.removeProperty('width');
  // v3000: restore the page position instantly for BOTH lock modes. The light
  // mode (Manage banks / Manage loans) never restored, so any scroll-chaining
  // behind the sheet left the page somewhere else after closing.
  window.scrollTo(0, __sheetScrollLockY || 0);
  document.documentElement.style.removeProperty('scroll-behavior');
  __sheetScrollLockMode = 'none';
}

function shouldAnimateBottomSheet(sheetId) {
  return ['upgrade-sheet', 'quick-add-sheet', 'txn-filter-sheet', 'custom-widget-sheet'].includes(String(sheetId || ''));
}

function isCustomWidgetFullpageSheet(sheetId) {
  return String(sheetId || '') === 'custom-widget-sheet';
}

function openSheet(id){
  document.body.classList.add('sheet-open');
  document.body.dataset.activeSheet = id || '';
  lockPageScrollForSheet();

  const customWidgetFullpage = isCustomWidgetFullpageSheet(id);
  const shouldAnimate = shouldAnimateBottomSheet(id);

  const backdrop = document.getElementById('bottom-sheet-backdrop');
  if (backdrop) {
    backdrop.classList.toggle('fullpage-fade-backdrop', !!customWidgetFullpage);
    backdrop.classList.add('open');
  }

  if (customWidgetFullpage) document.body.classList.add('custom-widget-editor-open');

  document.querySelectorAll('.bottom-sheet').forEach(sheet => {
    sheet.classList.remove('open', 'dragging', 'sheet-snapping', 'sheet-no-animation', 'custom-widget-fullpage', 'custom-widget-fullpage-open', 'bottom-sheet-widget');
    sheet.style.removeProperty('transition');
    sheet.style.removeProperty('animation');
    sheet.style.removeProperty('transform');
    sheet.dataset.dragActive = 'false';
  });

  const sheet = document.getElementById(id);
  if (sheet) {
    sheet.scrollTop = 0;

    if (customWidgetFullpage) {
      sheet.classList.add('custom-widget-fullpage');
      requestAnimationFrame(() => {
        sheet.classList.add('open', 'custom-widget-fullpage-open');
        scheduleFloatingUtilityUpdate();
      });
    } else if (!shouldAnimate) {
      sheet.classList.add('sheet-no-animation', 'open');
      scheduleFloatingUtilityUpdate();
      window.setTimeout(scheduleFloatingUtilityUpdate, 80);
    } else {
      requestAnimationFrame(() => {
        sheet.classList.add('open');
        scheduleFloatingUtilityUpdate();
        window.setTimeout(scheduleFloatingUtilityUpdate, 180);
      });
    }
  }

  if (!customWidgetFullpage) {
    initBottomSheetDragToClose();
    if (typeof initGlobalPullDownControl === 'function') initGlobalPullDownControl();
    if (typeof initPullToRefresh === 'function') initPullToRefresh();
    if (typeof initSheetPullRefreshGuard === 'function') initSheetPullRefreshGuard();
  }
  scheduleFloatingUtilityUpdate();
}
function closeBottomSheets(){
  document.body.classList.remove('sheet-open', 'custom-widget-editor-open');
  document.body.removeAttribute('data-active-sheet');
  unlockPageScrollForSheet();

  const backdrop = document.getElementById('bottom-sheet-backdrop');
  if (backdrop) {
    backdrop.classList.remove('open', 'fullpage-fade-backdrop');
  }

  document.querySelectorAll('.bottom-sheet').forEach(sheet => {
    sheet.classList.remove('open', 'dragging', 'sheet-snapping', 'sheet-no-animation', 'custom-widget-fullpage', 'custom-widget-fullpage-open', 'bottom-sheet-widget');
    sheet.style.removeProperty('transition');
    sheet.style.removeProperty('animation');
    sheet.style.removeProperty('transform');
    sheet.dataset.dragActive = 'false';
  });

  if (typeof resetManagerFilters === 'function') resetManagerFilters();
  if (typeof updateTransactionFilterPanelUi === 'function') updateTransactionFilterPanelUi();
  try {
    const stuckToast = document.getElementById('large-status-toast');
    if (stuckToast && stuckToast.classList.contains('loading')) dismissLargeStatusToast();
  } catch (_) {}
  scheduleFloatingUtilityUpdate();
}



function initSheetPullRefreshGuard() {
  if (window.__sheetPullRefreshGuardReady) return;
  window.__sheetPullRefreshGuardReady = true;
  let startY = 0;
  let startX = 0;

  window.addEventListener('touchstart', function(event) {
    if (!event.touches || event.touches.length !== 1) return;
    startY = event.touches[0].clientY || 0;
    startX = event.touches[0].clientX || 0;
  }, { passive: true, capture: true });

  window.addEventListener('touchmove', function(event) {
    const openSheet = document.querySelector('.bottom-sheet.open');
    if (!openSheet || !document.body.classList.contains('sheet-open')) return;
    if (!event.touches || event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaY = (touch.clientY || 0) - startY;
    const deltaX = (touch.clientX || 0) - startX;
    const pullingDown = deltaY > 0;
    const mostlyVertical = Math.abs(deltaY) > Math.abs(deltaX) * 1.1;
    if (!pullingDown || !mostlyVertical) return;

    const insideSheet = !!(event.target && event.target.closest && event.target.closest('.bottom-sheet.open'));
    const sheetAtTop = openSheet.scrollTop <= 0;
    const pageAtTop = window.scrollY <= 0 && (document.documentElement.scrollTop || 0) <= 0 && (document.body.scrollTop || 0) <= 0;

    if ((!insideSheet && pageAtTop) || (insideSheet && sheetAtTop)) {
      if (event.cancelable) event.preventDefault();
    }
  }, { passive: false, capture: true });
}
function openUpgradeSheet() {
  upgradeReturnPageId = getActivePageId ? getActivePageId() : (activePageId || 'settings');
  closeBottomSheets();
  showPage('upgrade');
}

function closeUpgradePage() {
  const fallback = upgradeReturnPageId && upgradeReturnPageId !== 'upgrade' ? upgradeReturnPageId : 'settings';
  showPage(fallback);
}

function setBillingMode(mode) {
  document.getElementById('billing-monthly')?.classList.toggle('active', mode === 'monthly');
  document.getElementById('billing-yearly')?.classList.toggle('active', mode === 'yearly');

  const free = document.getElementById('free-price');
  const premium = document.getElementById('premium-price');
  const pro = document.getElementById('pro-price');

  if (mode === 'yearly') {
    if (free) free.innerHTML = '€0 <span>' + t('perMonth') + '</span>';
    if (premium) premium.innerHTML = '€1.25 <span>' + t('perYearPremium') + '</span>';
    if (pro) pro.innerHTML = '€3.33 <span>' + t('perYearPro') + '</span>';
  } else {
    if (free) free.innerHTML = '€0 <span>' + t('perMonth') + '</span>';
    if (premium) premium.innerHTML = '€1.99 <span>' + t('perMonth') + '</span>';
    if (pro) pro.innerHTML = '€4.99 <span>' + t('perMonth') + '</span>';
  }
}

function normalizeIdentifierList(value) {
  const parts = String(value || '')
    .split(/[;,\n]+/)
    .map(v => String(v || '').trim())
    .filter(Boolean);
  const seen = new Set();
  const out = [];
  parts.forEach(v => {
    const key = v.toLowerCase();
    if (!seen.has(key)) { seen.add(key); out.push(v); }
  });
  return out.join(',');
}

function mergeIdentifierList(a, b) {
  return normalizeIdentifierList([a, b].filter(Boolean).join(','));
}

function normalizeAccountMask(value) {
  return cleanBankAccountValue(value);
}