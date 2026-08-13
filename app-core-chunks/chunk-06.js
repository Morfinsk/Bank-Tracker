// Generated app-core slice 6/6 (merged).
// ── CONFIG & HISTÓRIA LIMITOV ──────────────────────────────
const DEFAULT_SHEETS_URL = '';
const DEFAULT_LIMITS_WEBAPP_URL = '';
let SHEETS_URL = localStorage.getItem('sheets_url') || DEFAULT_SHEETS_URL || '';
let LIMITS_WEBAPP_URL = localStorage.getItem('limits_webapp_url') || DEFAULT_LIMITS_WEBAPP_URL || '';
let RB_LIMIT = parseInt(localStorage.getItem('rb_limit') || '10');
let CSOB_LIMIT = parseInt(localStorage.getItem('csob_limit') || '5');
let limitsHistory = JSON.parse(localStorage.getItem('limits_history') || '{}');
let fxRates = JSON.parse(localStorage.getItem('fx_rates') || '{"EUR":1,"CZK":25}');
let fxRatesDate = localStorage.getItem('fx_rates_date') || '';


// ── STATE ───────────────────────────────────────────────────
let allTransactions = [];
let activeCategory = 'všetky';
let activeTxnTag = 'all';
let massTagSelectMode = false;
const massTagSelectedIds = new Set();
let massTagPendingAction = '';
let txnTagKeyToLabel = {};
let txnCategoryFiltersExpanded = false;
let activeBank = 'všetky';
let activeDirection = 'all';
let activeSearch = '';
let activePaymentKind = 'all';
let activeCardLast4 = '';
let activeDateFrom = '';
let activeDateTo = '';
let activeMonthFilter = '';
let activeDrilldownFilter = null; // { type: cards|spent|income|overview-spent|internal|excluded|excluded-reason|raw-income|raw-spent, bankKey, reason? }
let activeRecurringGroupFilter = null; // { label, transaction_ids[], strict_ids_only?, recurring_group_id?, ... }
let activeAlertsHistoryFilter = 'new';
let activeTxnHistoryScope = 'current';
let txnCashflowChartType = localStorage.getItem('txn_cashflow_chart_type') || 'bar';
let archiveTrendChartType = localStorage.getItem('archive_trend_chart_type') || 'line';
let archiveTrendChartCache = { signature: '', html: '' };
const TXN_PAGE_SIZE = 20;
let txnVisibleLimit = TXN_PAGE_SIZE;
let autoSyncTimer = null;
let isSyncing = false;
let startupCloudSyncPromise = null;
let activePageId = 'overview';
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minút
const LOCAL_PRECOMPUTE_CACHE_TTL_MS = 5 * 60 * 1000;
const LOCAL_SYNC_CACHE_TTL_MS = 5 * 60 * 1000;

const CAT_ICONS = {
  'Potraviny': '🛒',
  'Elektronika': '💻',
  'Pohonné hmoty': '⛽',
  'Auto': '🚗',
  'Reštaurácie': '🍽',
  'Káva': '☕',
  'Doprava': '🚕',
  'Drogéria': '🧴',
  'Dom': '🏠',
  'Úver': '🏦',
  'Obuv': '👟',
  'Oblečenie': '👕',
  'Obchod': '🛍️',
  'Bývanie': '🏡',
  'Lekáreň': '🏥',
  'Kvety': '💐',
  'Šport': '🏃',
  'Výplata': '💰',
  'Bankomat': '🏧',
  'Zdravie': '💊',
  'Zábava': '🎬',
  'Predplatné': '📱',
  'Jedlo': '🍕',
  'Ostatné': '💳'
};

const MONTH_NAMES_SK = {
  '01': 'január', '02': 'február', '03': 'marec', '04': 'apríl', '05': 'máj', '06': 'jún',
  '07': 'júl', '08': 'august', '09': 'september', '10': 'október', '11': 'november', '12': 'december'
};

let activeOverviewMonthOffset = 0;
let overviewMonthShiftInFlight = false;
let overviewSummaryMetricIndex = 0;

const BANKS = {
  rb_cz: { label: 'RB CZ', short: 'RB', color: 'var(--rb-color)', limitKey: 'rbCz', defaultLimit: 10, primaryCurrency: 'CZK', primaryType: 'card', account: '', cards: '', aliases: ['rb cz','raiffeisen','raiffeisen cz'] },
  csob_sk: { label: 'ČSOB SK', short: 'ČSOB SK', color: 'var(--csob-color)', limitKey: 'csobSk', defaultLimit: 5, primaryCurrency: 'EUR', primaryType: 'card', account: '', cards: '', aliases: ['csob sk','čsob sk','csob slov','čsob slov'] ,
    googleSheetsToggleTitle: 'Google Sheets sync',
    googleSheetsToggleSubOn: 'Zapnuté — appka načíta reálne transakcie zo Sheets.',
    googleSheetsToggleSubOff: 'Vypnuté — appka používa iba lokálnu cache.',
    googleSheetsLocalStatus: 'Google Sheets connection is saved locally. Apps Script URL will be used to save limits, budgets and tokens.'},
  csob_cz: { label: 'ČSOB CZ', short: 'ČSOB CZ', color: '#8fbfff', limitKey: 'csobCz', defaultLimit: 5, primaryCurrency: 'CZK', primaryType: 'card', account: '', cards: '', aliases: ['csob cz','čsob cz','csob česk','čsob česk'] },
  csob_cz_credit: { label: 'ČSOB CZ credit card', short: 'Credit card', color: '#8fbfff', limitKey: null, defaultLimit: 0, primaryCurrency: 'CZK', primaryType: 'credit', account: '', cards: '', cardLast4: '', aliases: ['csob cz credit card','csob cz kreditka','čsob cz kreditka','kreditní karta čsob','kreditna karta csob'] },
  moneta: { label: '<span class="moneta-gradient">Moneta</span>', short: '<span class="moneta-gradient">Moneta</span>', color: 'var(--moneta-color)', limitKey: 'moneta', defaultLimit: 0, primaryCurrency: 'CZK', primaryType: 'card', account: '', cards: '', aliases: ['moneta','moneta money','moneta bank'] },
  air_bank_cz: { label: 'Air Bank', short: 'Air Bank', color: '#b8ff2f', limitKey: 'airBankCz', defaultLimit: 0, primaryCurrency: 'CZK', primaryType: 'account', account: '', cards: '', aliases: ['air bank','airbank','air bank cz'] },
  pluxee: { label: 'Pluxee', short: 'Pluxee', color: '#009B77', limitKey: 'pluxee', defaultLimit: 0, primaryCurrency: 'CZK', primaryType: 'card', account: '', cards: '5310', aliases: ['pluxee','stravenkovy ucet','stravenkový účet','sodexo'] }
};
const BANK_ORDER = ['rb_cz','csob_sk','csob_cz','csob_cz_credit','moneta','air_bank_cz','pluxee'];

const BT_LOGO_SRC = './Logos/bank-tracker-logo.svg';
const BT_LOGO_SRC_FALLBACK = './Logos/bank-tracker-logo.svg';
const BT_LOGO_ANIMATION_SRC = './Logos/logo-animation-export final.html';
const BT_BANK_LOGOS_BASE = 'https://raw.githubusercontent.com/Morfinsk/Bank-Tracker/main/bank-logos/';

const BANK_LOGOS = {
  rb_cz: {
    src: BT_BANK_LOGOS_BASE + 'RB.png',
    alt: 'RB CZ'
  },
  csob_sk: {
    src: BT_BANK_LOGOS_BASE + 'CSOB-SK.png',
    alt: 'ČSOB SK'
  },
  csob_cz: {
    src: BT_BANK_LOGOS_BASE + 'CSOB-CZ.jpg',
    alt: 'ČSOB CZ'
  },
  csob_cz_credit: {
    src: BT_BANK_LOGOS_BASE + 'CSOB-CZ.jpg',
    alt: 'CSOB CZ credit card'
  },
  moneta: {
    src: BT_BANK_LOGOS_BASE + 'Moneta-CZ.png',
    alt: 'Moneta'
  },
  air_bank_cz: {
    src: BT_BANK_LOGOS_BASE + 'Airbank.jpg',
    alt: 'Air Bank'
  },
  pluxee: {
    src: BT_BANK_LOGOS_BASE + 'Pluxee.jpg',
    alt: 'Pluxee'
  }
};

const __btPerfState = {
  samples: [],
  maxSamples: 60
};

window.getBankTrackerPerfSummary = function() {
  const samples = (__btPerfState.samples || []).slice();
  const names = [...new Set(samples.map((row) => row.name))];
  const summary = {};
  names.forEach((name) => {
    summary[name] = btPerfSummarize(samples, name);
  });
  summary.all = btPerfSummarize(samples);
  return summary;
};

window.printBankTrackerPerfMetrics = function() {
  try {
    const rows = (__btPerfState.samples || []).slice(-25);
    if (!rows.length) {
      console.info('[BT PERF] No samples yet.');
      return null;
    }
    console.table(rows);
    const summary = window.getBankTrackerPerfSummary();
    console.info('[BT PERF] Summary (avg / p95 ms):');
    Object.keys(summary).forEach((key) => {
      if (key === 'all' || !summary[key]) return;
      const item = summary[key];
      console.info(`  ${key}: avg ${item.avgMs}ms, p95 ${item.p95Ms}ms (${item.count} samples)`);
    });
    if (summary.all) {
      console.info(`  all: avg ${summary.all.avgMs}ms, p95 ${summary.all.p95Ms}ms (${summary.all.count} samples)`);
    }
    return { rows, summary };
  } catch (_) {
    console.info('[BT PERF] print failed');
    return null;
  }
};

window.runBankTrackerPerfSmokeTest = async function(options = {}) {
  const tabIds = ['overview', 'txns', 'archive', 'settings'];
  const tabSwitches = Math.max(3, Number(options && options.tabSwitches) || 5);
  const syncRuns = Math.max(0, Number(options && options.syncRuns) || 1);
  const includeSync = !(options && options.includeSync === false);
  const originalTab = String(activePageId || 'overview');
  const startedAt = btPerfNow();

  console.info(`[BT PERF] Smoke test started (tabs=${tabSwitches}, sync=${includeSync ? syncRuns : 0})`);

  for (let i = 0; i < tabSwitches; i += 1) {
    const tabId = tabIds[i % tabIds.length];
    try { showPage(tabId); } catch (e) { console.warn('[BT PERF] showPage failed:', tabId, e); }
    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
    await new Promise((resolve) => window.setTimeout(resolve, 140));
  }

  try { showPage(originalTab); } catch (_) {}

  if (includeSync && syncRuns > 0 && typeof syncData === 'function' && SHEETS_URL) {
    for (let i = 0; i < syncRuns; i += 1) {
      try {
        await syncData({ backgroundMode: true });
      } catch (e) {
        console.warn('[BT PERF] syncData smoke run failed:', e);
      }
    }
  }

  btPerfLog('perfSmokeTest', btPerfNow() - startedAt, `tabs=${tabSwitches},sync=${includeSync ? syncRuns : 0}`);
  return window.printBankTrackerPerfMetrics();
};



// ── ARCHIVE DAILY BANK DETAIL ──────────────────────────────
let archiveDetailBankKey = 'rb_cz';
let archiveDetailPaymentKind = 'all';
const ARCHIVE_DETAIL_PAGE_SIZE = 30;
let archiveDetailVisibleLimit = ARCHIVE_DETAIL_PAGE_SIZE;

let archiveDetailFilter = null;

let archiveRepairDebounce = null;
try { window.isMassTagSelectModeActive = isMassTagSelectModeActive; } catch (_) {}
try { window.renderMassTagRowSelectUi = renderMassTagRowSelectUi; } catch (_) {}
try { window.toggleMassTagSelection = toggleMassTagSelection; } catch (_) {}
try { window.isMassTagRowSelected = isMassTagRowSelected; } catch (_) {}
try { window.setMassTagPendingAction = setMassTagPendingAction; } catch (_) {}
try { window.updateMassTagActionPanelUi = updateMassTagActionPanelUi; } catch (_) {}
try { window.enterMassTagSelectMode = enterMassTagSelectMode; } catch (_) {}
try { window.exitMassTagSelectMode = exitMassTagSelectMode; } catch (_) {}
try { window.openTagMassUpdateSheet = openTagMassUpdateSheet; } catch (_) {}
try { window.saveMassTagSelection = saveMassTagSelection; } catch (_) {}
try { window.applyMassTagUpdate = saveMassTagSelection; } catch (_) {}
try { window.dismissLargeStatusToast = dismissLargeStatusToast; } catch (_) {}

const BT_LOGO_CYCLE_MS = 2000;
const BT_LOGO_CYCLE_BOOT_MS = 2000;
const TAB_LOADING_MIN_MS = 2000;
const BT_LOGO_HEADER_SYNC_CYCLE_MS = 2000;
/* Same cycle as boot so Archive overlay does not retune mid-loop vs strokes/pen. */
const BT_ARCHIVE_TAB_LOADING_CYCLE_MS = BT_LOGO_CYCLE_BOOT_MS;

const BT_LOGO_EXPORT_DOT_PATH = 'M 60 300 L 60 50 L 20 90 L 60 50 L 100 90 L 60 50 L 60 120 h 80 c 40 0, 60 30, 60 60 c 0 30, -20 60, -60 60 h -80 L 60 220 h 90 c 50 0, 80 35, 80 70 c 0 35, -30 70, -80 70 h -90';
try { window.refreshBtBrandLogosForTheme = refreshBtBrandLogosForTheme; } catch (_) {}
try { window.getBtBrandLogoHtml = getBtBrandLogoHtml; } catch (_) {}
try { window.getBtInlineLoadingHtml = getBtInlineLoadingHtml; } catch (_) {}

const HEADER_BRAND_DRAW_MS = BT_LOGO_HEADER_SYNC_CYCLE_MS;
let __headerBrandAnimTimer = null;
let __headerBrandAnimRunning = false;
let __headerBrandAnimQueued = false;
let __headerBrandSyncPendingAfterBoot = false;
try { window.ensureHeaderBrandLogoMarkup = ensureHeaderBrandLogoMarkup; } catch (_) {}
try { window.attemptEarlyShellReveal = attemptEarlyShellReveal; } catch (_) {}
try { window.isEarlyShellRevealEnabled = isEarlyShellRevealEnabled; } catch (_) {}
try { window.releaseHeaderBrandAfterSync = releaseHeaderBrandAfterSync; } catch (_) {}
try { window.playHeaderBrandDraw = playHeaderBrandDraw; } catch (_) {}

const HEADER_BRAND_SYNC_MIN_MS = BT_LOGO_HEADER_SYNC_CYCLE_MS;
let __headerBrandSyncStartedAt = 0;
let __headerBrandSyncHideTimer = null;
let __syncBtnSpinStartedAt = 0;
let __syncBtnSpinHideTimer = null;
try { window.setSyncBtnSpinning = setSyncBtnSpinning; } catch (_) {}
try { window.setHeaderBrandSyncState = setHeaderBrandSyncState; } catch (_) {}
try { window.isPageLoadingOverlayBlocking = isPageLoadingOverlayBlocking; } catch (_) {}
try { window.flushChartsAfterOverlayHide = flushChartsAfterOverlayHide; } catch (_) {}

let __loadingPresentation = null;
try { window.restartBtLogoDrawLoop = restartBtLogoDrawLoop; } catch (_) {}
try { window.restartBtLogoSmilDraw = restartBtLogoSmilDraw; } catch (_) {}
try { window.startBtLogoAnimationObserver = startBtLogoAnimationObserver; } catch (_) {}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startBtLogoAnimationObserverAfterSplash, { once: true });
} else {
  startBtLogoAnimationObserverAfterSplash();
}
try { window.presentWidgetSectionLoadingIfNeeded = presentWidgetSectionLoadingIfNeeded; } catch (_) {}

const APP_BOOT_OVERLAY_FADE_MS = 300;
const APP_BOOT_PAGE_REVEAL_MS = 380;
const APP_BOOT_POST_REVEAL_MS = 220;
const APP_BOOT_MAX_MS = 15000;
let __appBootActive = false;
let __appBootStartedAt = 0;
let __appBootCompleteTimer = null;
let __appBootSequenceRunning = false;
let __bootPresentationPhase = false;
let __tabLoadingDepth = 0;
let __btBootDataReady = false;
try { window.completeAppBootSequence = completeAppBootSequence; } catch (_) {}

let pageLoadingTimer = null;

let transactionStatsAdjustmentsCachePool = null;
let transactionStatsAdjustmentsCacheResult = null;

const CREDIT_BALANCE_SUBACCOUNTS = [
  { id: 'csob_cz_credit', parentId: 'csob_cz', nameKey: 'csobCzCreditOutstandingName', currency: 'CZK', cardLast4: '', liability: true }
];
const HALF_GAUGE_VIEWBOX = '0 0 200 100';
const HALF_GAUGE_ARC_PATH = 'M10 88 A90 90 0 0 1 190 88';
try { window.updateGlobalSyncIndicator = updateGlobalSyncIndicator; } catch (_) {}
try { window.setOverviewBalanceSyncState = setOverviewBalanceSyncState; } catch (_) {}

let __overviewBalanceSyncDepth = 0;

let __overviewChartBootIntroDone = false;
let __overviewChartScrollObserver = null;
let __overviewChartScrollLive = false;
let __overviewChartReplayTimer = null;
let __overviewChartReplayToken = 0;
let __overviewBootScheduleTimer = null;
let __overviewScrollLiveTimer = null;
let __overviewChartsDataSettled = false;
const OVERVIEW_BOOT_DEBOUNCE_MS = 140;
const OVERVIEW_BOOT_STAGGER_MS = 90;
const __overviewChartWasVisible = new WeakMap();
const __overviewChartIntroPlayed = new WeakSet();
const OVERVIEW_LINE_DRAW_MS = 800;
const OVERVIEW_PROJECTION_DELAY_MS = 600;
const OVERVIEW_PROJECTION_DRAW_MS = 700;
const OVERVIEW_LINE_SMOOTH_MS = 1500;
const OVERVIEW_LINE_SEQUENCE_MS = OVERVIEW_LINE_DRAW_MS + OVERVIEW_PROJECTION_DELAY_MS + OVERVIEW_PROJECTION_DRAW_MS;
/* v3910: short animationBegin so layout/GAS data can settle before the line draw starts. */
const OVERVIEW_CHART_ANIM_BEGIN_MS = 120;
const OVERVIEW_CHART_CARD_ANIM_MS = OVERVIEW_PROJECTION_DELAY_MS + OVERVIEW_PROJECTION_DRAW_MS + 450;
const OVERVIEW_PROGRESS_DRAW_MS = 2800;
const OVERVIEW_DETAILS_BAR_DRAW_MS = 3500;
const OVERVIEW_GAUGE_DRAW_MS = OVERVIEW_LINE_DRAW_MS + OVERVIEW_PROJECTION_DRAW_MS;
const NET_WORTH_TREND_LINE_DRAW_MS = 720;
const NET_WORTH_TREND_POINT_POP_MS = 420;
const NET_WORTH_TREND_POINT_BASE_DELAY_MS = 260;
const NET_WORTH_TREND_POINT_STAGGER_MS = 45;
const ARCHIVE_LINE_DRAW_MS = 4500;
const OVERVIEW_DETAILS_BAR_STAGGER_MS = 100;

try { window.primeNetWorthTrendForIntro = primeNetWorthTrendForIntro; } catch (_) {}

const __overviewChartAnimTimers = new WeakMap();
try { window.playOverviewSummaryStripReveal = playOverviewSummaryStripReveal; } catch (_) {}
try { window.finishOverviewChartRenderCycle = finishOverviewChartRenderCycle; } catch (_) {}
try { window.scheduleNetWorthTrendAnimation = scheduleNetWorthTrendAnimation; } catch (_) {}
try { window.setupOverviewScrollChartAnimations = setupOverviewScrollChartAnimations; } catch (_) {}
try { window.scheduleOverviewPageBootAnimation = scheduleOverviewPageBootAnimation; } catch (_) {}
try { window.animateVisibleOverviewChartCards = animateVisibleOverviewChartCards; } catch (_) {}
try { window.animateOverviewChartsIntro = animateOverviewChartsIntro; } catch (_) {}
try { window.playOverviewChartIntro = animateOverviewChartsIntro; } catch (_) {}

let __overviewDetailsScrollObserver = null;
let __overviewDetailsScrollLive = false;
const __overviewDetailsWasVisible = new WeakMap();
const __overviewDetailsScrollFillByRow = new WeakMap();
const __overviewDetailsBarFinishTimers = new WeakMap();
try { window.setupOverviewDetailsScrollAnimations = setupOverviewDetailsScrollAnimations; } catch (_) {}

// A (perf): lazy per-tab rendering. The heavy tabs (Transactions, Archive) are
// only rendered when their tab is actually visited, instead of during the
// startup render burst. They are flagged "dirty" whenever underlying data
// changes so the next visit re-renders fresh content.
let __btTxnsTabDirty = true;
let __btArchiveTabDirty = true;
try { window.renderDirtyTabSection = renderDirtyTabSection; } catch (_) {}

let __archiveChartIntroToken = 0;
let __archiveChartIntroObserver = null;

const BT_TOUCH_TARGET_SELECTOR = [
  'button:not([disabled])',
  '.bottom-nav .nav-item',
  '.cat-chip',
  '.txn-filter-pill',
  '.sync-btn',
  '.fab',
  '.scroll-top-fab',
  '.config-save',
  '.sheet-close',
  '.summary-item-clickable',
  '.custom-widget-choice',
  '.custom-widget-type-btn',
  '.custom-widget-icon-btn',
  '.custom-widget-add-btn',
  '.manager-tab',
  '.icon-action-btn',
  '.billing-toggle button',
  '.language-switch button',
  '.dev-toggle-btn',
  '.top-upgrade-btn',
  '.account-balance-rollup-btn',
  '.bank-card-clickable',
  '.card-widget',
  '.tx-item[data-tx-id]',
  '.tx-item-compact[data-tx-id]',
  '.tx-item-compact[onclick]',
  '.archive-bank-spent-cell',
  '.archive-bank-income-cell',
  '.archive-bank-limit-cell',
  '.archive-bank-legend-item',
  '.archive-trend-bar-segment',
  '.archive-bank-point',
  '.archive-bank-line-hit',
  '.card-widget[onclick]',
  '.budget-bank-row[onclick]',
  '.tx-col-title[onclick]',
  '.toggle-switch',
  '.sheets-toggle-switch',
  '.tx-payment-source',
  '.settings-plan-row',
  '.add-bank-btn',
  '.mini-action-btn',
  '.overview-details-back',
  '.txn-filter-toggle-btn',
  '.txn-chart-toggle-btn',
  '.managed-bank-edit-btn',
  '.mass-tag-act-btn',
  '.mass-tag-save-btn',
  '.mass-tag-bar-cancel',
  '.bt-touch-btn',
  '.overview-month-nav',
  '.account-balance-privacy-btn',
  '.overview-privacy-btn',
  '.manager-sheet-back-btn',
  '.sim-submit',
  '.archive-delete-btn'
].join(', ');

let __btActiveTouchEl = null;
try { window.initNavTouchFeedback = initNavTouchFeedback; window.initGlobalTouchFeedback = initGlobalTouchFeedback; window.initBtTouchFeedback = initBtTouchFeedback; } catch (_) {}
try { window.bootstrapUiFromCache = bootstrapUiFromCache; } catch (_) {}


let txnFilterPanelOpen = false;


const CATEGORY_I18N = {
  en: {
    'všetky': 'All',
    'potraviny': 'Groceries',
    'elektronika': 'Electronics',
    'pohonné hmoty': 'Fuel',
    'pohonne hmoty': 'Fuel',
    'auto': 'Car',
    'úver': 'Loan',
    'uver': 'Loan',
    'obchod': 'Shop',
    'kvety': 'Flowers',
    'výplata': 'Salary',
    'vyplata': 'Salary',
    'bankomat': 'ATM',
    'reštaurácie': 'Restaurants',
    'restauracie': 'Restaurants',
    'káva': 'Coffee',
    'kava': 'Coffee',
    'doprava': 'Transport',
    'zdravie': 'Health',
    'drogéria': 'Drugstore',
    'drogeria': 'Drugstore',
    'dom': 'Home',
    'šport': 'Sport',
    'sport': 'Sport',
    'zábava': 'Entertainment',
    'zabava': 'Entertainment',
    'predplatné': 'Subscriptions',
    'predplatne': 'Subscriptions',
    'ostatné': 'Other',
    'ostatne': 'Other',
    'oblečenie': 'Clothing',
    'oblecenie': 'Clothing',
    'obuv': 'Shoes',
    'jedlo': 'Food',
    'bývanie': 'Housing',
    'byvanie': 'Housing',
    'lekáreň': 'Pharmacy',
    'lekaren': 'Pharmacy',
    'účet': 'Account',
    'ucet': 'Account',
    'domácnosť': 'Household',
    'domacnost': 'Household'
  ,
    googleSheetsLocalStatus: 'Google Sheets connection is saved locally. Apps Script URL will be used to save limits, budgets and tokens.'},
  sk: {
    'všetky': 'Všetky',
    'potraviny': 'Potraviny',
    'elektronika': 'Elektronika',
    'pohonné hmoty': 'Pohonné hmoty',
    'pohonne hmoty': 'Pohonné hmoty',
    'auto': 'Auto',
    'úver': 'Úver',
    'uver': 'Úver',
    'obchod': 'Obchod',
    'kvety': 'Kvety',
    'výplata': 'Výplata',
    'vyplata': 'Výplata',
    'bankomat': 'Bankomat',
    'reštaurácie': 'Reštaurácie',
    'restauracie': 'Reštaurácie',
    'káva': 'Káva',
    'kava': 'Káva',
    'doprava': 'Doprava',
    'zdravie': 'Zdravie',
    'drogéria': 'Drogéria',
    'drogeria': 'Drogéria',
    'dom': 'Dom',
    'šport': 'Šport',
    'sport': 'Šport',
    'zábava': 'Zábava',
    'zabava': 'Zábava',
    'predplatné': 'Predplatné',
    'predplatne': 'Predplatné',
    'ostatné': 'Ostatné',
    'ostatne': 'Ostatné',
    'oblečenie': 'Oblečenie',
    'oblecenie': 'Oblečenie',
    'obuv': 'Obuv',
    'jedlo': 'Jedlo',
    'bývanie': 'Bývanie',
    'byvanie': 'Bývanie',
    'lekáreň': 'Lekáreň',
    'lekaren': 'Lekáreň',
    'účet': 'Účet',
    'ucet': 'Účet',
    'domácnosť': 'Domácnosť',
    'domacnost': 'Domácnosť'
  },
  cs: {
    'všetky': 'Vše',
    'potraviny': 'Potraviny',
    'elektronika': 'Elektronika',
    'pohonné hmoty': 'Pohonné hmoty',
    'pohonne hmoty': 'Pohonné hmoty',
    'auto': 'Auto',
    'úver': 'Úvěr',
    'uver': 'Úvěr',
    'obchod': 'Obchod',
    'kvety': 'Květiny',
    'výplata': 'Výplata',
    'vyplata': 'Výplata',
    'bankomat': 'Bankomat',
    'reštaurácie': 'Restaurace',
    'restauracie': 'Restaurace',
    'káva': 'Káva',
    'kava': 'Káva',
    'doprava': 'Doprava',
    'zdravie': 'Zdraví',
    'drogéria': 'Drogerie',
    'drogeria': 'Drogerie',
    'dom': 'Domov',
    'šport': 'Sport',
    'sport': 'Sport',
    'zábava': 'Zábava',
    'zabava': 'Zábava',
    'predplatné': 'Předplatné',
    'predplatne': 'Předplatné',
    'ostatné': 'Ostatní',
    'ostatne': 'Ostatní',
    'oblečenie': 'Oblečení',
    'oblecenie': 'Oblečení',
    'obuv': 'Obuv',
    'jedlo': 'Jídlo',
    'bývanie': 'Bydlení',
    'byvanie': 'Bydlení',
    'lekáreň': 'Lékárna',
    'lekaren': 'Lékárna',
    'účet': 'Účet',
    'ucet': 'Účet',
    'domácnosť': 'Domácnost',
    'domacnost': 'Domácnost'
  ,
    googleSheetsLocalStatus: 'Google Sheets připojení je uložené lokálně. Apps Script URL použijeme k zápisu limitů, budgetů a tokenů.'}
};


const connectionAutoSaveTimers = {};

const LOCAL_TEST_DATA_VERSION = 'local-test-v3-alerts';
let localTestOverviewDetails = null;
try { window.seedBankTrackerLocalTestData = seedBankTrackerLocalTestData; } catch (_) {}
try { window.resetLocalWidgetDemoStores = resetLocalWidgetDemoStores; } catch (_) {}

let monthlyRepairTimer = null;
let monthlyRepairInFlight = false;

// Keď sa vrátiš do appky po uzamknutí mobilu / prepnutí tabu,
// appka sa hneď pokúsi natiahnuť aktuálne dáta.
let lastHiddenAtMs = 0;
let lastResumeSyncAtMs = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    lastHiddenAtMs = Date.now();
    return;
  }
  if (!SHEETS_URL) return;
  var now = Date.now();
  var hiddenForMs = now - Number(lastHiddenAtMs || 0);
  var sinceLastResumeSync = now - Number(lastResumeSyncAtMs || 0);
  // Resume sync only after meaningful background time to avoid noisy refreshes.
  if (hiddenForMs < 4000) return;
  if (sinceLastResumeSync < 120000) return;
  lastResumeSyncAtMs = now;
  setTimeout(function(){
    if (!document.hidden && !isSyncing && SHEETS_URL) {
      syncData({ backgroundMode: true });
    }
  }, 650);
});

const MANAGER_CATEGORY_OPTIONS = [
  'Domácnosť',
  'Potraviny',
  'Pohonné hmoty',
  'Reštaurácie',
  'Káva',
  'Doprava',
  'Zdravie',
  'Drogéria',
  'Dom',
  'Šport',
  'Zábava',
  'Predplatné',
  'Oblečenie',
  'Obuv',
  'Jedlo',
  'Bývanie',
  'Lekáreň',
  'Účet',
  'Bankomat',
  'Ostatné'
];


const COMMON_CURRENCIES = [
  ['CZK', 'Czech koruna'],
  ['EUR', 'Euro'],
  ['USD', 'US dollar'],
  ['GBP', 'British pound'],
  ['PLN', 'Polish zloty'],
  ['HUF', 'Hungarian forint'],
  ['RON', 'Romanian leu'],
  ['BGN', 'Bulgarian lev'],
  ['CHF', 'Swiss franc'],
  ['SEK', 'Swedish krona'],
  ['NOK', 'Norwegian krone'],
  ['DKK', 'Danish krone'],
  ['ISK', 'Icelandic krona'],
  ['TRY', 'Turkish lira'],
  ['UAH', 'Ukrainian hryvnia'],
  ['AUD', 'Australian dollar'],
  ['CAD', 'Canadian dollar'],
  ['NZD', 'New Zealand dollar'],
  ['JPY', 'Japanese yen'],
  ['CNY', 'Chinese yuan'],
  ['HKD', 'Hong Kong dollar'],
  ['SGD', 'Singapore dollar'],
  ['KRW', 'South Korean won'],
  ['INR', 'Indian rupee'],
  ['THB', 'Thai baht'],
  ['MYR', 'Malaysian ringgit'],
  ['IDR', 'Indonesian rupiah'],
  ['PHP', 'Philippine peso'],
  ['VND', 'Vietnamese dong'],
  ['AED', 'UAE dirham'],
  ['SAR', 'Saudi riyal'],
  ['QAR', 'Qatari riyal'],
  ['KWD', 'Kuwaiti dinar'],
  ['ILS', 'Israeli shekel'],
  ['ZAR', 'South African rand'],
  ['MXN', 'Mexican peso'],
  ['BRL', 'Brazilian real'],
  ['ARS', 'Argentine peso'],
  ['CLP', 'Chilean peso'],
  ['COP', 'Colombian peso'],
  ['PEN', 'Peruvian sol'],
  ['EGP', 'Egyptian pound'],
  ['MAD', 'Moroccan dirham']
];

const CURRENCY_SYMBOLS = {
  CZK: 'Kč',
  EUR: '€',
  USD: '$',
  GBP: '£',
  PLN: 'zł',
  HUF: 'Ft',
  RON: 'lei',
  BGN: 'лв',
  CHF: 'CHF',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  ISK: 'kr',
  TRY: '₺',
  UAH: '₴',
  AUD: 'A$',
  CAD: 'C$',
  NZD: 'NZ$',
  JPY: '¥',
  CNY: '¥',
  HKD: 'HK$',
  SGD: 'S$',
  KRW: '₩',
  INR: '₹',
  THB: '฿',
  MYR: 'RM',
  IDR: 'Rp',
  PHP: '₱',
  VND: '₫',
  AED: 'د.إ',
  SAR: '﷼',
  QAR: 'ر.ق',
  KWD: 'د.ك',
  ILS: '₪',
  ZAR: 'R',
  MXN: 'Mex$',
  BRL: 'R$',
  ARS: 'AR$',
  CLP: 'CLP$',
  COP: 'COL$',
  PEN: 'S/',
  EGP: 'E£',
  MAD: 'DH'
};

const CURRENCY_CODES_BY_SYMBOL = {
  'Kč': 'CZK',
  'KC': 'CZK',
  'KČ': 'CZK',
  'CZK': 'CZK',
  '€': 'EUR',
  'EUR': 'EUR',
  '$': 'USD',
  'USD': 'USD',
  '£': 'GBP',
  'GBP': 'GBP',
  'zł': 'PLN',
  'ZŁ': 'PLN',
  'zl': 'PLN',
  'ZL': 'PLN',
  'PLN': 'PLN'
};
try { window.initPullToRefresh = initPullToRefresh; } catch (_) {}


let __sheetScrollLockY = 0;
let __sheetScrollLockMode = 'none';

let upgradeReturnPageId = 'settings';


const managedBankAutoSaveTimers = {};


let archiveRenderState = { months: [], rendered: 0, monthlyCounts: {}, visibleBankKeys: [] };
let archiveScrollQueued = false;




const I18N = {
  en: {
    appTitle: 'Bliss - Finance Tracker',
    overview: 'Overview',
    transactions: 'Transactions',
    archiveTitle: 'Archive',
    settings: 'Settings',
    language: 'Language',
    appCurrency: 'App currency',
    payments: 'payments',
    daysLeft: 'days left',
    totalTransactions: 'transactions',
    overviewSummaryTransactions: 'Transactions',
    overviewSummaryDailyAverage: 'Daily avg',
    overviewSummaryNetFlow: 'Net flow',
    overviewSummaryRemainingBudget: 'Budget',
    overviewSummaryBudgetRemaining: 'remaining',
    overviewSummaryOverBudget: 'over budget',
    overviewSummaryCycleTitle: 'Click for the next metric',
    overviewDailyAverageBreakdownHint: 'Hover or tap the info icon for the Daily average calculation.',
    overviewNetFlowBreakdownHint: 'Hover or tap the info icon for the Net flow calculation.',
    overviewBudgetBreakdownHint: 'Hover the info icon or hold Budget for the calculation.',
    overviewDailyAverageBreakdownTitle: 'Daily average calculation',
    overviewDailyAverageBreakdownFormula: 'Daily average = counted spending ÷ calendar days counted',
    overviewDailyAverageDaysCounted: 'Calendar days counted',
    overviewDailyAverageCurrentMonthNote: 'The current month counts calendar days from day 1 through today.',
    overviewDailyAverageFullMonthNote: 'A selected past month counts every calendar day in that month.',
    overviewNetFlowBreakdownTitle: 'Net flow calculation',
    overviewNetFlowBreakdownFormula: 'Net flow = counted income − counted spending',
    overviewNetFlowBreakdownIncome: 'Counted income',
    overviewNetFlowBreakdownFilters: 'Not counted in income or spending',
    overviewNetFlowBreakdownExcludedIncome: 'Excluded income',
    overviewNetFlowBreakdownExcludedSpent: 'Excluded spending',
    overviewNetFlowBreakdownExcludedDetails: 'Breakdown by reason',
    overviewNetFlowBreakdownFilterNote: 'Counted Income and Spent match Available cash. Excluded amounts are shown only for transparency.',
    offlineShowingCache: 'Offline — showing the last saved data.',
    overviewBudgetBreakdownTitle: 'Budget calculation',
    overviewBudgetBreakdownFormula: 'Remaining = limits − counted spending',
    overviewBudgetBreakdownLimits: 'Budget limits',
    overviewBudgetBreakdownSpent: 'Counted spending',
    overviewBudgetBreakdownRemaining: 'Remaining',
    overviewBudgetBreakdownViewBankBudgets: 'Show bank budgets in details',
    overviewBudgetBreakdownExcluded: 'Cashflow exclusions',
    overviewBudgetBreakdownInternalTransfers: 'Internal transfers',
    overviewBudgetBreakdownCreditCards: 'Credit card transactions excluded from bank budgets',
    overviewCashflowBreakdownCreditAdjustments: 'Credit-card repayments and limit adjustments',
    overviewBudgetBreakdownManualExclusions: 'Manually excluded',
    overviewBudgetBreakdownNonSpent: 'Non-spent expenses',
    overviewBudgetBreakdownNonIncome: 'Non-income receipts',
    overviewBudgetBreakdownInactiveBanks: 'Inactive banks',
    overviewBudgetBreakdownMatchedOffsets: 'Matched refunds and reversals',
    overviewBudgetBreakdownExclusionsUnavailable: 'Excluded amounts will appear after transactions finish loading.',
    overviewBudgetBreakdownIncomeNote: 'Income does not increase the budget; it is included in Net flow.',
    cashflowBreakdownTitle: 'Monthly cashflow breakdown',
    cashflowBreakdownCta: 'Show cashflow breakdown',
    cashflowCountedIncome: 'Real income',
    cashflowCountedSpent: 'Real spending',
    cashflowExcludedIncome: 'Excluded incoming',
    cashflowExcludedSpent: 'Excluded outgoing',
    cashflowRawIncome: 'All incoming movement',
    cashflowRawSpent: 'All outgoing movement',
    cashflowGrossTurnover: 'Gross account turnover',
    cashflowTurnoverNote: 'Real cashflow excludes internal transfers, card repayments and adjustments, non-spent/non-income entries, and matched refunds. All movement shows how much money actually passed through your accounts.',
    cashflowReasonsTitle: 'What was excluded',
    cashflowIncomingShort: 'Incoming',
    cashflowOutgoingShort: 'Outgoing',
    cashflowNoExclusions: 'No excluded movements in this month.',
    cashflowStoredExclusionsUnavailable: 'Only saved monthly totals are available offline. The excluded-movement detail will appear after transactions sync.',
    cashflowOpenIncomeBreakdown: 'Show income breakdown',
    cashflowOpenSpentBreakdown: 'Show spending breakdown',
    wealthManagementTitle: 'Wealth management',
    wealthManagementHint: 'Manage every financial source and add new records from one place.',
    wealthAssets: 'Assets',
    wealthLiabilitiesProtection: 'Liabilities & protection',
    wealthBanks: 'Banks',
    wealthInvestments: 'Investments',
    wealthProperties: 'Properties',
    wealthLoans: 'Loans',
    wealthInsurance: 'Insurance',
    manageAction: 'Manage',
    manageLoans: 'Manage loans',
    manageInvestments: 'Manage investments',
    manageProperties: 'Manage properties',
    manageInsurance: 'Manage insurance',
    totalNetWorth: 'Total net worth',
    availableCash: 'Available cash - Banks',
    tapForNetWorthBreakdown: 'Click or tap to see the breakdown',
    showBankDetails: 'Show bank details',
    showOverviewDetails: 'Show overview details',
    netWorthBreakdownTitle: 'Net worth breakdown',
    netWorthAssets: 'Assets',
    netWorthCash: 'Cash',
    netWorthInvestments: 'Investments',
    netWorthProperties: 'Properties',
    netWorthLiabilities: 'Liabilities',
    netWorthCreditCards: 'Credit cards',
    netWorthLoans: 'Loans',
    netWorthTotal: 'Net worth',
    netWorthMeasuredAt: 'Measured',
    netWorthFormula: 'Cash + investments + properties − liabilities',
    netWorthUnavailable: 'The breakdown will appear after the next successful sync.',
    overviewSummaryThisMonth: 'this month',
    recentTransactions: 'recent transactions',
    spentByCurrency: 'spent by currency',
    spentByBank: 'spent by bank',
    budgetByBank: 'budget by bank',
    type: 'Type',
    bankTypeCard: 'Card',
    bankTypeAccount: 'Account',
    bank: 'Bank',
    category: 'Category',
    all: 'All',
    incoming: 'Incoming',
    outgoing: 'Outgoing',
    outgoingOption: 'Expense (-)',
    incomingOption: 'Income (+)',
    spent: 'Spent',
    income: 'Income',
    archiveSubtitle: 'Monthly trends',
    spendingTrend: 'Spending trend',
    lastMonthsHint: 'Last 8 months · tap point to inspect',
    noHistoryYet: 'No history yet',
    noHistoryText: 'Past months with transactions will appear here once a full month has passed.',
    monthlyArchive: 'Monthly archive',
    archiveMonthlyTotalsHint: 'Card payments, spending and income totals by bank.',
    plan: 'plan',
    freePlan: 'Free plan',
    freePlanSub: 'Manual entry · upgrade for auto-sync',
    upgradePageSub: 'Manual entry · upgrade for auto-sync',
    upgradePageSubPremium: 'Auto-sync enabled',
    upgradePageSubPro: 'All premium features enabled',
    upgrade: 'Upgrade',
    enableNotifications: 'Enable notifications',
    notificationsOff: 'Push notifications are not enabled yet.',
    copyFcmToken: 'Copy FCM token',
    myBanks: 'My banks',
    manageBanks: 'Manage banks',
    syncDetectedBanks: 'Sync detected banks',
    googleSheetsConnection: 'Google Sheets connection',
    aboutApp: 'about app',
    appInfoSub: 'Version v2 · bank overview, budgets, archive and push notifications ⚙️🔥',
    sync: 'Sync',
    syncValue: 'Auto every 5 min',
    mode: 'Mode',
    modeValue: 'PWA / Google Sheets',
    quickAdd: 'Quick add',
    addTransaction: 'Add transaction',
    addTransactionHint: 'Manually add a new payment or income.',
    addBank: 'Add bank',
    addBankHint: 'Add a new bank, currency, budget and card limit.',
    addLoan: 'Add loan',
    addLoanHint: 'Create a new loan/mortgage account.',
    addInvestment: 'Add investment',
    addInvestmentHint: 'Create a new investment in the same Investments settings.',
    addInsurance: 'Add insurance',
    addInsuranceHint: 'Create a new policy in the same Insurance settings.',
    addProperty: 'Add property',
    addPropertyHint: 'Create a new property in the same Properties settings.',
    addWidget: 'Add widget',
    addWidgetHint: 'Create a dashboard graph from your data or a manual value.',
    completed: 'Completed',
    notCompleted: 'Missed',
    missingCurrent: 'Missing',
    switchToStackedBarChart: 'Switch to stacked bar chart',
    switchToLineChart: 'Switch to line chart',
    stackedByBank: 'stacked by bank',
    noLimit: 'no limit',
    monthArchive: 'Monthly archive',
    saveChanges: 'Save changes',
    autosaveHint: 'Changes are saved automatically. A green check means Google Sheets confirmed the save.',
    saveBank: 'Save bank',
    saveTransaction: 'Save transaction',
    countAsNonSpent: 'Count as non-spent',
    nonSpentHint: 'Excluded from spending totals. Applies instantly and syncs to Google Sheets in the background.',
    countAsNonIncome: 'Count as non-income',
    nonIncomeHint: 'Excluded from income and Net flow totals. Applies instantly and syncs to Google Sheets in the background.',
    returnedAmountFor: 'Returned amount for',
    notLinkedToPayment: 'Not linked to an outgoing payment',
    returnedAmountHint: 'Select the original outgoing bank transfer. This incoming amount reduces its spent value instead of counting as income.',
    done: 'Done',
    current: 'Current',
    monthly: 'Monthly',
    yearly: 'Yearly',
    bankName: 'Bank name',
    accountLast4: 'Account / Card last 4 digits',
    currency: 'Currency',
    monthlyBudget: 'Monthly budget',
    warnWhenRemaining: 'Warn when remaining',
    monthlyCardLimit: 'Monthly card limit',
    monthlyBalanceLimit: 'Monthly balance limit',
    monthlyBalanceLimitShort: 'balance limit',
    creditCardMonthlyLimit: 'Monthly limit',
    creditCardMonthlyLimitShort: 'monthly limit',
    creditCardOutstandingBalance: 'Outstanding balance',
    monthLabel: 'Month',
    chooseMonth: 'Choose month',
    merchantDescription: 'Merchant / description',
    reference: 'Reference',
    referencePlaceholder: 'optional',
    tagShapeRequired: 'Select Tag shape.',
    tagColorRequired: 'Select Tag color.',
    massTagUpdate: 'Mass tag update',
    txnTagNone: 'No tag',
    massTagSelectHint: 'Tap transactions to select them, then choose an action below.',
    massTagSourceHint: 'First filter transactions in the list, then assign them to a tag here.',
    massTagOnlyUntagged: 'Only transactions without tag',
    massTagMode: 'Action',
    massTagModeExisting: 'Assign to existing tag',
    massTagModeNew: 'Create / edit tag',
    massTagModeClear: 'Remove tag',
    massTagExisting: 'Existing tag',
    massTagPickExisting: 'Choose an existing tag.',
    massTagPickAction: 'Choose what to do with the tag.',
    massTagNoExisting: 'No tags yet',
    massTagNoSelection: 'Select at least one transaction.',
    massTagNameRequired: 'Enter a tag name.',
    massTagClearHint: 'Selected transactions will lose their tag.',
    massTagMatches: 'Selected',
    massTagEmptyHint: 'Leave Tag empty to remove it from selected transactions.',
    massTagApply: 'Apply to all',
    massTagNoTargets: 'No transactions match this scope.',
    massTagClearConfirm: 'Remove tag from {n} transactions?',
    amount: 'Amount',
    devSimulator: 'Developer simulator',
    expand: 'Expand ↓',
    collapse: 'Collapse ↑'
  ,
    googleSheetsToggleTitle: 'Google Sheets sync',
    googleSheetsToggleSubOn: 'Enabled — app loads real transactions from Sheets.',
    googleSheetsToggleSubOff: 'Disabled — app uses local cache only.',
    bankBudgetTitle: 'Bank budget',
    progress: 'progress',
    usedThisMonth: 'used this month',
    paymentsLeft: 'payments left',
    paymentsWord: 'payments',
    leftWord: 'left',
    paymentLimitReached: 'payment limit reached',
    withoutMonthlyLimit: 'without monthly limit',
    budgetNotSet: 'Budget is not set yet.',
    budgetStatusTitle: 'Bank budget',
    accountBalanceTitle: 'Account balance',
    accountBalanceManageHint: 'Edit balance in Settings · Manage banks',
    accountBalanceTotal: 'Total',
    accountBalanceTotalHint: 'Converted using app FX rates',
    csobCzCreditOutstandingName: 'CSOB CZ credit card',
    csobCzCreditOutstandingShort: 'Credit card',
    csobCzCreditOutstandingHint: '',
    csobCzCreditOutstandingManageHint: 'Shown as a subaccount under ČSOB CZ. Enter remaining credit limit (e.g. 50 000). Card spend subtracts; repayment adds back. Not included in Total cash.',
    switchToPieChart: 'Switch to pie chart',
    switchToBarChart: 'Switch to bar chart',
    pieChart: 'Pie chart',
    remaining: 'remaining',
    budgetOverBy: 'over by',
    overBudget: 'over budget',
    nearLimit: 'near limit',
    normal: 'normal',
    noTransactionsForFilters: 'No transactions match the selected filters.',
    emptyMovements: 'No movements',
    todayPrefix: 'Today',
    syncTitle: 'Sync',
    googleSheetsConnectionHint: 'Edit Google Sheets connection. Card limits and budgets are managed below via Manage banks.',
    monthlyTrends: 'Monthly trends',
    archiveEmpty: 'Archive is empty for now.',
    noTrendData: 'No trend data yet.',
    monthlyBankTrendNote: 'Monthly spending trend by bank. FX rates are loaded from Google Sheets when available.',
    googleSheetsLocalStatus: 'Google Sheets connection is saved locally. Apps Script URL will be used to save limits, budgets and tokens.',
    upgradeHeroTitle: 'All your banks,<br>one place — automatically.',
    upgradeHeroText: 'EU law (PSD2) gives you the right to your own bank data. We make it seamless across 2,300+ banks in 31 countries.',
    yearlySave: 'Yearly <span class="year-save-badge">Save 37%</span>',
    perMonth: '/ month',
    perYearPremium: '/ month · €14.99/year',
    perYearPro: '/ month · €39.99/year',
    mostPopular: '⭐ Most Popular',
    upgradeFreeBanks: 'Up to 2 banks',
    upgradeManualEntry: 'Manual transaction entry',
    upgradeMonthlyBudget: 'Monthly budget tracking',
    upgradeArchive3m: '3 months of archive',
    upgradeBasicPush: 'Basic push notifications',
    upgradeUnlimitedBanks: 'Unlimited banks',
    upgradeAutoSync: 'Auto-sync via Open Banking (PSD2)',
    upgradeAutoImport: 'Transactions imported automatically',
    upgradeFullArchive: 'Full archive history',
    upgradeAdvancedAlerts: 'Advanced budget & target alerts',
    upgradeCsvExport: 'CSV export',
    upgradeMultiCurrency: 'Multi-currency support',
    upgradePrioritySupport: 'Priority support',
    upgradeEverythingPremium: 'Everything in Premium',
    upgradeAiInsights: 'AI spending insights',
    upgradeFamilySharing: 'Family sharing (up to 5 people)',
    upgradeCustomCategories: 'Custom categories',
    upgradeForecasts: 'Spending forecasts',
    upgradeTaxExport: 'Tax report export',
    joinWaitlistFree: 'Join Waitlist — Free',
    joinProWaitlist: 'Join Pro Waitlist',
    planSavedAlertPrefix: 'Plan',
    planSavedAlertSuffix: 'is saved locally for now. Payments/upgrades will be connected later.',
    searchTransactions: 'Search transactions',
    searchBanksTransactions: 'Search banks or transactions',
    searchBanks: 'Search banks',
    manageBanksTransactions: 'Manage banks and transactions',
    banksTab: 'Banks',
    transactionsTab: 'Transactions',
    edit: 'Edit',
    delete: 'Delete',
    deleteBank: 'Delete bank',
    deleteBankConfirm: 'Delete this bank?',
    bankDeleted: 'Bank deleted.',
    defaultBankCannotDelete: 'Default parser banks cannot be deleted, but you can edit their settings.',
    deleteTransaction: 'Delete transaction',
    deleteTransactionConfirm: 'Delete this transaction?',
    transactionSaved: 'Transaction saved.',
    noTransactions: 'No transactions yet.',
    date: 'Date',
    direction: 'Direction',
    cardLimitShort: 'card limit',
    incomingAlertShort: 'incoming from',
    outgoingAlertShort: 'outgoing from',
    largeMovementAlerts: 'Push alerts',
    largeMovementAlertsHint: '0 = off. The alert is checked per single transaction for the selected month.',
    incomingAlertPlaceholder: 'Incoming from',
    outgoingAlertPlaceholder: 'Outgoing from',
    budgetLabel: 'budget',
    noBanksAdded: 'No banks added yet.',
    cardPayments: 'card payments',
    limitReached: 'limit reached',
    dailyArchive: 'Daily archive',
    dailyCashflow: 'Daily cashflow',
    expenses: 'Expenses',
    selectMonth: 'Month',
    dailyTotal: 'Daily total',
    noDailyData: 'No daily data for this bank and month.',
    tapBankForDaily: 'Tap a bank to see daily income and expenses.',
    czkEquivalent: 'CZK equivalent',
    trendCurrencyNote: 'All currencies are converted to CZK for comparison.',
    bankCurrencyNote: 'Converted to bank currency',
    amountAxis: 'Amount',
    clickBarToFilter: 'Tap a bar to filter transactions.',
    allDays: 'All days',
    selectedDay: 'Selected day',
    showing: 'Showing',
    manualTransaction: 'Manual transaction',
    selectArchiveDate: 'Select date to place this transaction into the correct archive month.',
    editTransaction: 'Edit transaction',
    transactionDeleted: 'Transaction deleted.',
    transactionDeleteFailed: 'Transaction was not deleted.',
    doubleTapToEdit: 'Mobile: long press to edit. PC: double click to edit.',
    appearance: 'Appearance',
    themeMode: 'Theme mode',
    darkTheme: 'Dark',
    lightTheme: 'White',
    themeModeHint: 'Choose the app theme. It also updates the browser/PWA system bars where supported.',
    bankCardLimitsTitle: 'Bank card limits',
    manageThisBank: 'Manage this bank',
    tapRecentBank: 'Tap a bank name to open its transactions.',
    dateRange: 'Date range',
    fromDate: 'From',
    toDate: 'To',
    clearDateFilter: 'Clear date filter',
    allMonths: 'All months',
    transactionTotals: 'Totals',
    filteredTransactions: 'Filtered transactions',
    totalIncoming: 'Incoming',
    totalOutgoing: 'Outgoing',
    totalNet: 'Net',
    noTotalValue: '0.00',
    totalsHint: 'Calculated from the currently visible filters.',
    showMore: 'Load more',
    showingTransactions: 'Showing',
    ofTransactions: 'of',
    transactionsCountLabel: 'transactions',
    renderedForSpeed: 'Only part of the list is rendered for mobile speed. Totals use all filtered transactions.',
    transactionKind: 'Payment type',
    cardsOnly: 'Cards',
    cardSourceFilter: 'Card',
    bankCardsSheetTitle: 'Cards',
    bankCardSlotLabel: 'Card',
    bankCardNumber: 'Card number',
    bankCardExpiry: 'Expiry',
    bankCardCvc: 'CVC',
    copyCard: 'Copy card',
    copyCardShort: 'Copy',
    saveCards: 'Save cards',
    cardCopied: 'Card copied',
    bankCardCopyEmpty: 'Card is empty.',
    bankCardsNoneConfigured: 'No cards configured for this bank in Manage banks.',
    accountsOnly: 'Transfers',
    internalTransfers: 'Internal transfers',
    cardVsAccountHint: 'Card payments count towards bank benefits. Account payments are separated.',
    spent: 'Spent',
    income: 'Income',
    archiveCardsOnlyHint: 'Monthly archive and trend count card payments only.',
    archivePaymentTypeHint: 'Filter this bank detail by all payments, card payments or account payments.',
    paymentKindAll: 'All payments',
    cashOnly: 'Cash',
    manualKindHint: 'Cards count towards bank benefits. Account and cash payments are tracked separately.',
    accountPaymentKind: 'Bank transfer',
    cashPaymentKind: 'Cash payment',
    cardPaymentKind: 'Card payment',
    longPressToEdit: 'Long press a transaction to edit it.',
    backAgainToExit: 'Press Back again to exit',
    dragSheetHint: 'Drag here',
    scrollToLatest: 'Back to latest',
    editKindHint: 'Changing payment type also updates whether the transaction counts as card, account or cash.',
    budgetAllPaymentsHint: 'Bank budget includes cards, account payments and cash.',
    loadOlderData: 'Load older data',
    currentMonthOnly: 'Showing current month only.',
    olderDataHint: 'Older transactions are hidden by default for speed.',
    olderDataLoaded: 'Older data loaded',
    dateRangeOverridesMonth: 'Date range filter can show older months.',
    loading: 'Loading',
    mobilePerfMode: 'Mobile performance mode',
    archiveLoadMore: 'Load more'},
  sk: {
    appTitle: 'Bliss - Finance Tracker',
    overview: 'Prehľad',
    transactions: 'Transakcie',
    archiveTitle: 'Archív',
    settings: 'Nastavenia',
    language: 'Jazyk',
    appCurrency: 'Měna appky',
    appCurrency: 'Mena appky',
    payments: 'platieb',
    daysLeft: 'dní zostáva',
    totalTransactions: 'transakcie',
    overviewSummaryTransactions: 'Transakcie',
    overviewSummaryDailyAverage: 'Denný priemer',
    overviewSummaryNetFlow: 'Čistý tok',
    overviewSummaryRemainingBudget: 'Budget',
    overviewSummaryBudgetRemaining: 'zostáva',
    overviewSummaryOverBudget: 'nad budgetom',
    overviewSummaryCycleTitle: 'Klikni pre ďalšiu metriku',
    overviewDailyAverageBreakdownHint: 'Pre výpočet Denného priemeru prejdi myšou na ikonu „i“ alebo na ňu ťukni.',
    overviewNetFlowBreakdownHint: 'Pre výpočet Čistého toku prejdi myšou na ikonu „i“ alebo na ňu ťukni.',
    overviewBudgetBreakdownHint: 'Pre výpočet prejdi myšou na informačnú ikonu alebo podrž Budget.',
    overviewDailyAverageBreakdownTitle: 'Výpočet denného priemeru',
    overviewDailyAverageBreakdownFormula: 'Denný priemer = započítané výdavky ÷ započítané kalendárne dni',
    overviewDailyAverageDaysCounted: 'Započítané kalendárne dni',
    overviewDailyAverageCurrentMonthNote: 'V aktuálnom mesiaci sa počítajú kalendárne dni od prvého dňa po dnešok.',
    overviewDailyAverageFullMonthNote: 'Vo vybranom minulom mesiaci sa počítajú všetky jeho kalendárne dni.',
    overviewNetFlowBreakdownTitle: 'Výpočet čistého toku',
    overviewNetFlowBreakdownFormula: 'Čistý tok = započítané príjmy − započítané výdavky',
    overviewNetFlowBreakdownIncome: 'Započítané príjmy',
    overviewNetFlowBreakdownFilters: 'Nezapočítané do príjmov ani výdavkov',
    overviewNetFlowBreakdownExcludedIncome: 'Vylúčené príjmy',
    overviewNetFlowBreakdownExcludedSpent: 'Vylúčené výdavky',
    overviewNetFlowBreakdownExcludedDetails: 'Rozpis podľa dôvodu',
    overviewNetFlowBreakdownFilterNote: 'Započítané Príjmy a Výdavky sa zhodujú s kartou Dostupná hotovosť. Vylúčené sumy sú zobrazené iba pre prehľad.',
    offlineShowingCache: 'Offline — zobrazujú sa posledné uložené dáta.',
    overviewBudgetBreakdownTitle: 'Výpočet budgetu',
    overviewBudgetBreakdownFormula: 'Zostatok = limity − započítané výdavky',
    overviewBudgetBreakdownLimits: 'Súčet limitov',
    overviewBudgetBreakdownSpent: 'Započítané výdavky',
    overviewBudgetBreakdownRemaining: 'Zostatok',
    overviewBudgetBreakdownViewBankBudgets: 'Zobraziť bankové budgety v detailnom prehľade',
    overviewBudgetBreakdownExcluded: 'Vylúčené z cashflow',
    overviewBudgetBreakdownInternalTransfers: 'Interné prevody',
    overviewBudgetBreakdownCreditCards: 'Transakcie kreditných kariet vylúčené z bankových budgetov',
    overviewCashflowBreakdownCreditAdjustments: 'Splátky kreditnej karty a úpravy limitu',
    overviewBudgetBreakdownManualExclusions: 'Ručne vylúčené',
    overviewBudgetBreakdownNonSpent: 'Non-spent výdavky',
    overviewBudgetBreakdownNonIncome: 'Non-income príjmy',
    overviewBudgetBreakdownInactiveBanks: 'Neaktívne banky',
    overviewBudgetBreakdownMatchedOffsets: 'Spárované vratky a storna',
    overviewBudgetBreakdownExclusionsUnavailable: 'Vylúčené sumy sa zobrazia po úplnom načítaní transakcií.',
    overviewBudgetBreakdownIncomeNote: 'Príjmy budget nezvyšujú; sú zahrnuté v Čistom toku.',
    cashflowBreakdownTitle: 'Rozpis mesačného cashflow',
    cashflowBreakdownCta: 'Zobraziť rozpis cashflow',
    cashflowCountedIncome: 'Reálny príjem',
    cashflowCountedSpent: 'Reálne výdavky',
    cashflowExcludedIncome: 'Vylúčené príjmy',
    cashflowExcludedSpent: 'Vylúčené výdavky',
    cashflowRawIncome: 'Všetky prichádzajúce pohyby',
    cashflowRawSpent: 'Všetky odchádzajúce pohyby',
    cashflowGrossTurnover: 'Celkový obrat na účtoch',
    cashflowTurnoverNote: 'Reálny cashflow vynecháva interné prevody, splátky a úpravy kreditnej karty, non-spent/non-income položky a spárované vratky. Všetky pohyby ukazujú, koľko peňazí sa skutočne pretočilo cez účty.',
    cashflowReasonsTitle: 'Čo sa nezapočítalo',
    cashflowIncomingShort: 'Príjem',
    cashflowOutgoingShort: 'Výdavok',
    cashflowNoExclusions: 'V tomto mesiaci nie sú žiadne vylúčené pohyby.',
    cashflowStoredExclusionsUnavailable: 'Offline sú dostupné iba uložené mesačné súčty. Detail vylúčených pohybov sa zobrazí po synchronizácii transakcií.',
    cashflowOpenIncomeBreakdown: 'Zobraziť rozpis príjmov',
    cashflowOpenSpentBreakdown: 'Zobraziť rozpis výdavkov',
    wealthManagementTitle: 'Správa majetku',
    wealthManagementHint: 'Spravuj všetky finančné zdroje a pridávaj nové záznamy na jednom mieste.',
    wealthAssets: 'Aktíva',
    wealthLiabilitiesProtection: 'Záväzky a ochrana',
    wealthBanks: 'Banky',
    wealthInvestments: 'Investície',
    wealthProperties: 'Nehnuteľnosti',
    wealthLoans: 'Úvery',
    wealthInsurance: 'Poistenie',
    manageAction: 'Spravovať',
    manageLoans: 'Správa úverov',
    manageInvestments: 'Spravovať investície',
    manageProperties: 'Spravovať nehnuteľnosti',
    manageInsurance: 'Spravovať poistenie',
    totalNetWorth: 'Celková čistá hodnota',
    availableCash: 'Dostupná hotovosť - Banky',
    tapForNetWorthBreakdown: 'Klikni alebo ťukni pre zobrazenie rozpisu',
    showBankDetails: 'Zobraziť detaily bánk',
    showOverviewDetails: 'Zobraziť detailný prehľad',
    netWorthBreakdownTitle: 'Zloženie čistej hodnoty',
    netWorthAssets: 'Majetok',
    netWorthCash: 'Hotovosť',
    netWorthInvestments: 'Investície',
    netWorthProperties: 'Nehnuteľnosti',
    netWorthLiabilities: 'Záväzky',
    netWorthCreditCards: 'Kreditné karty',
    netWorthLoans: 'Úvery',
    netWorthTotal: 'Čistá hodnota',
    netWorthMeasuredAt: 'Zmerané',
    netWorthFormula: 'Hotovosť + investície + nehnuteľnosti − záväzky',
    netWorthUnavailable: 'Zloženie sa zobrazí po najbližšej úspešnej synchronizácii.',
    overviewSummaryThisMonth: 'tento mesiac',
    recentTransactions: 'posledné transakcie',
    spentByCurrency: 'minuté podľa meny',
    spentByBank: 'minuté podľa banky',
    budgetByBank: 'budget podľa banky',
    type: 'Typ',
    bankTypeCard: 'Karta',
    bankTypeAccount: 'Účet',
    bank: 'Banka',
    category: 'Kategória',
    all: 'Všetky',
    incoming: 'Príjem',
    outgoing: 'Výdaj',
    outgoingOption: 'Výdaj (-)',
    incomingOption: 'Príjem (+)',
    spent: 'Výdavky',
    income: 'Príjmy',
    archiveSubtitle: 'Mesačné trendy',
    spendingTrend: 'Trend výdavkov',
    lastMonthsHint: 'Posledných 8 mesiacov · klikni na bod pre detail',
    noHistoryYet: 'Zatiaľ žiadna história',
    noHistoryText: 'Minulé mesiace s transakciami sa zobrazia po uzavretí celého mesiaca.',
    monthlyArchive: 'Archív mesiacov',
    archiveMonthlyTotalsHint: 'Kartové platby, výdavky a príjmy spolu podľa banky.',
    plan: 'plán',
    freePlan: 'Bezplatný plán',
    freePlanSub: 'Ručné zadávanie · upgrade pre auto-sync',
    upgradePageSub: 'Ručné zadávanie · upgrade pre auto-sync',
    upgradePageSubPremium: 'Auto-sync je zapnutý',
    upgradePageSubPro: 'Všetky premium funkcie sú zapnuté',
    upgrade: 'Upgrade',
    enableNotifications: 'Povoliť upozornenia',
    notificationsOff: 'Push notifications are not enabled yet.',
    copyFcmToken: 'Copy FCM token',
    myBanks: 'Moje banky',
    manageBanks: 'Spravovať banky',
    syncDetectedBanks: 'Synchronizovať nájdené banky',
    googleSheetsConnection: 'Pripojenie k Google Sheets',
    aboutApp: 'o appke',
    appInfoSub: 'Verzia 3.0.2 · bankové prehľady, budgety, archív a push notifikácie ⚙️🔥',
    sync: 'Sync',
    syncValue: 'Auto každých 5 min',
    mode: 'Režim',
    modeValue: 'PWA / Google Sheets',
    quickAdd: 'Rýchle pridanie',
    addTransaction: 'Pridať transakciu',
    addTransactionHint: 'Manuálne zadaj novú platbu alebo príjem.',
    addBank: 'Pridať banku',
    addBankHint: 'Pridaj novú banku, menu, budget a limit karty.',
    addLoan: 'Pridať úver',
    addLoanHint: 'Vytvor nový úver/hypotéku.',
    addInvestment: 'Pridať investíciu',
    addInvestmentHint: 'Vytvor novú investíciu v rovnakých nastaveniach Investícií.',
    addInsurance: 'Pridať poistenie',
    addInsuranceHint: 'Vytvor nové poistenie v rovnakých nastaveniach Poistenia.',
    addProperty: 'Pridať nehnuteľnosť',
    addPropertyHint: 'Vytvor novú nehnuteľnosť v rovnakých nastaveniach Nehnuteľností.',
    addWidget: 'Pridať widget',
    addWidgetHint: 'Vytvor graf na nástenku z dát alebo z ručne zadanej hodnoty.',
    completed: 'splnené',
    notCompleted: 'nesplnené',
    missingCurrent: 'chýba',
    switchToStackedBarChart: 'Prepnúť na stĺpcový skladaný graf',
    switchToLineChart: 'Prepnúť na čiarový graf',
    stackedByBank: 'podľa banky',
    noLimit: 'bez limitu',
    monthArchive: 'Archív mesiacov',
    saveChanges: 'Uložiť zmeny',
    autosaveHint: 'Zmeny sa ukladajú automaticky. Zelená fajka znamená, že Google Sheets potvrdil uloženie.',
    saveBank: 'Uložiť banku',
    saveTransaction: 'Uložiť transakciu',
    countAsNonSpent: 'Počítať ako non-spent',
    nonSpentHint: 'Nezapočítava sa do výdavkových metrík. Platí hneď a na pozadí sa uloží do Google Sheets.',
    countAsNonIncome: 'Počítať ako non-income',
    nonIncomeHint: 'Nezapočítava sa do príjmov ani čistého toku. Platí hneď a na pozadí sa uloží do Google Sheets.',
    returnedAmountFor: 'Vrátená suma k platbe',
    notLinkedToPayment: 'Nie je prepojená s odchádzajúcou platbou',
    returnedAmountHint: 'Vyber pôvodný odchádzajúci bankový prevod. Táto prijatá suma zníži spent namiesto započítania do income.',
    done: 'Hotovo',
    current: 'Aktuálne',
    monthly: 'Mesačne',
    yearly: 'Ročne',
    bankName: 'Názov banky',
    accountLast4: 'Účet / Karta posledné 4 čísla',
    currency: 'Mena',
    monthlyBudget: 'Mesačný budget',
    warnWhenRemaining: 'Upozorniť keď zostáva',
    monthlyCardLimit: 'Mesačný limit karty',
    monthlyBalanceLimit: 'Mesačný limit zostatku',
    monthlyBalanceLimitShort: 'limit zostatku',
    creditCardMonthlyLimit: 'Mesačný limit',
    creditCardMonthlyLimitShort: 'mesačný limit',
    creditCardOutstandingBalance: 'Dlžný zostatok',
    monthLabel: 'Mesiac',
    chooseMonth: 'Vyber mesiac',
    merchantDescription: 'Obchodník / popis',
    reference: 'Variabilný symbol (VS)',
    referencePlaceholder: 'voliteľné',
    tagShapeRequired: 'Vyber tvar tagu.',
    tagColorRequired: 'Vyber farbu tagu.',
    massTagUpdate: 'Hromadná úprava tagov',
    txnTagNone: 'Bez tagu',
    massTagSelectHint: 'Klikni na transakcie a vyber ich, potom zvoľ akciu nižšie.',
    massTagSourceHint: 'Najprv vyfiltruj transakcie v zozname, potom im tu priraď tag.',
    massTagOnlyUntagged: 'Len transakcie bez tagu',
    massTagMode: 'Akcia',
    massTagModeExisting: 'Priradiť existujúci tag',
    massTagModeNew: 'Vytvoriť / upraviť tag',
    massTagModeClear: 'Odstrániť tag',
    massTagExisting: 'Existujúci tag',
    massTagPickExisting: 'Vyber existujúci tag.',
    massTagPickAction: 'Vyber, čo urobiť s tagom.',
    massTagNoExisting: 'Zatiaľ žiadne tagy',
    massTagNoSelection: 'Vyber aspoň jednu transakciu.',
    massTagNameRequired: 'Zadaj názov tagu.',
    massTagClearHint: 'Vybrané transakcie prídu o tag.',
    massTagMatches: 'Vybrané',
    massTagEmptyHint: 'Nechaj Tag prázdny pre odstránenie tagu z vybraných transakcií.',
    massTagApply: 'Použiť na všetky',
    massTagNoTargets: 'V tomto rozsahu nie sú žiadne transakcie.',
    massTagClearConfirm: 'Odstrániť tag z {n} transakcií?',
    amount: 'Suma',
    devSimulator: 'Vývojársky simulátor',
    expand: 'Rozbaliť ↓',
    collapse: 'Zbaliť ↑'
  ,
    bankBudgetTitle: 'Budget podľa banky',
    progress: 'pokrok',
    usedThisMonth: 'použité tento mesiac',
    paymentsLeft: 'zostáva platieb',
    paymentsWord: 'platieb',
    leftWord: 'zostáva',
    paymentLimitReached: 'limit platieb naplnený',
    withoutMonthlyLimit: 'bez mesačného limitu',
    budgetNotSet: 'Budget zatiaľ nie je nastavený.',
    budgetStatusTitle: 'Bankový budget',
    accountBalanceTitle: 'Zostatok na účte',
    accountBalanceManageHint: 'Zostatok upravíš v Nastavenia · Spravovať banky',
    accountBalanceTotal: 'Spolu',
    accountBalanceTotalHint: 'Prepočítané cez FX kurzy v appke',
    csobCzCreditOutstandingName: 'CSOB CZ credit card',
    csobCzCreditOutstandingShort: 'Credit card',
    csobCzCreditOutstandingHint: '',
    csobCzCreditOutstandingManageHint: 'Zobrazí sa ako podúčet pod ČSOB CZ. Zadaj zostatok limitu (napr. 50 000). Nákup kartou odpočíta, splátka pripočíta. Nie je v Total hotovosti.',
    switchToPieChart: 'Prepnúť na koláčový graf',
    switchToBarChart: 'Prepnúť na stĺpcový graf',
    pieChart: 'Koláčový graf',
    remaining: 'zostáva',
    budgetOverBy: 'prekročené o',
    overBudget: 'prekročený',
    nearLimit: 'blízko limitu',
    normal: 'v norme',
    noTransactionsForFilters: 'Žiadne transakcie neodpovedajú zvoleným filtrom.',
    emptyMovements: 'Žiadne pohyby',
    todayPrefix: 'Dnes',
    syncTitle: 'Synchronizovať',
    googleSheetsConnectionHint: 'Uprav Google Sheets pripojenie. Limity kariet a budgety sa nastavujú nižšie cez Spravovať banky.',
    monthlyTrends: 'Mesačné trendy',
    archiveEmpty: 'Archív je zatiaľ prázdny.',
    noTrendData: 'Zatiaľ nie sú dáta pre trend.',
    monthlyBankTrendNote: 'Mesačný trend výdavkov podľa banky. Kurzy sa načítajú z Google Sheets, keď sú dostupné.',
    googleSheetsLocalStatus: 'Google Sheets pripojenie je uložené lokálne. Apps Script URL použijeme na zápis limitov, budgetov a tokenov.',
    upgradeHeroTitle: 'Všetky tvoje banky,<br>na jednom mieste — automaticky.',
    upgradeHeroText: 'Európske pravidlá PSD2 ti dávajú právo na vlastné bankové dáta. My z nich robíme jednoduchý prehľad bánk, budgetov a transakcií.',
    yearlySave: 'Ročne <span class="year-save-badge">Ušetri 37%</span>',
    perMonth: '/ mesiac',
    perYearPremium: '/ mesiac · €14.99/rok',
    perYearPro: '/ mesiac · €39.99/rok',
    mostPopular: '⭐ Najobľúbenejšie',
    upgradeFreeBanks: 'Do 2 bánk',
    upgradeManualEntry: 'Ručné zadávanie transakcií',
    upgradeMonthlyBudget: 'Mesačné sledovanie budgetu',
    upgradeArchive3m: '3 mesiace archívu',
    upgradeBasicPush: 'Základné push upozornenia',
    upgradeUnlimitedBanks: 'Neobmedzený počet bánk',
    upgradeAutoSync: 'Auto-sync cez Open Banking (PSD2)',
    upgradeAutoImport: 'Transakcie importované automaticky',
    upgradeFullArchive: 'Celá história archívu',
    upgradeAdvancedAlerts: 'Pokročilé budget a cieľové upozornenia',
    upgradeCsvExport: 'CSV export',
    upgradeMultiCurrency: 'Podpora viacerých mien',
    upgradePrioritySupport: 'Prioritná podpora',
    upgradeEverythingPremium: 'Všetko z Premium',
    upgradeAiInsights: 'AI prehľad výdavkov',
    upgradeFamilySharing: 'Rodinné zdieľanie až pre 5 ľudí',
    upgradeCustomCategories: 'Vlastné kategórie',
    upgradeForecasts: 'Predpovede výdavkov',
    upgradeTaxExport: 'Export daňového reportu',
    joinWaitlistFree: 'Pridať sa na waitlist — zdarma',
    joinProWaitlist: 'Pridať sa na Pro waitlist',
    planSavedAlertPrefix: 'Plán',
    planSavedAlertSuffix: 'je zatiaľ uložený len lokálne. Platby/upgrade napojíme neskôr.',
    searchTransactions: 'Hľadať transakcie',
    searchBanksTransactions: 'Hľadať banky alebo transakcie',
    searchBanks: 'Hľadať banky',
    manageBanksTransactions: 'Spravovať banky a transakcie',
    banksTab: 'Banky',
    transactionsTab: 'Transakcie',
    edit: 'Upraviť',
    delete: 'Vymazať',
    deleteBank: 'Vymazať banku',
    deleteBankConfirm: 'Vymazať túto banku?',
    bankDeleted: 'Banka bola vymazaná.',
    defaultBankCannotDelete: 'Predvolené parser banky sa nedajú vymazať, ale vieš upraviť ich nastavenia.',
    deleteTransaction: 'Vymazať transakciu',
    deleteTransactionConfirm: 'Vymazať túto transakciu?',
    transactionSaved: 'Transakcia bola uložená.',
    noTransactions: 'Zatiaľ žiadne transakcie.',
    date: 'Dátum',
    direction: 'Typ',
    cardLimitShort: 'limit karty',
    incomingAlertShort: 'príjem od',
    outgoingAlertShort: 'odchod od',
    largeMovementAlerts: 'Push alerts',
    largeMovementAlertsHint: '0 = vypnuté. Kontroluje sa každá jedna transakcia vo vybranom mesiaci.',
    incomingAlertPlaceholder: 'Prijatá platba od',
    outgoingAlertPlaceholder: 'Odoslaná platba od',
    budgetLabel: 'budget',
    noBanksAdded: 'Nemáš pridané banky.',
    cardPayments: 'platby kartou',
    limitReached: 'limit naplnený',
    dailyArchive: 'Denný archív',
    dailyCashflow: 'Denný cashflow',
    expenses: 'Výdavky',
    selectMonth: 'Mesiac',
    dailyTotal: 'Denný súčet',
    noDailyData: 'Pre túto banku a mesiac nie sú denné dáta.',
    tapBankForDaily: 'Klikni na banku pre denné príjmy a výdavky.',
    czkEquivalent: 'CZK ekvivalent',
    trendCurrencyNote: 'Všetky meny sú pre porovnanie prepočítané na CZK.',
    bankCurrencyNote: 'Prepočítané do meny banky',
    amountAxis: 'Suma',
    clickBarToFilter: 'Klikni na stĺpec pre filtrovanie transakcií.',
    allDays: 'Všetky dni',
    selectedDay: 'Vybraný deň',
    showing: 'Zobrazené',
    manualTransaction: 'Manuálna transakcia',
    selectArchiveDate: 'Vyber dátum, aby sa transakcia zaradila do správneho mesiaca v archíve.',
    editTransaction: 'Upraviť transakciu',
    transactionDeleted: 'Transakcia bola vymazaná.',
    transactionDeleteFailed: 'Transakciu sa nepodarilo vymazať.',
    doubleTapToEdit: 'Dvojklik / dvojité ťuknutie pre úpravu.',
    appearance: 'Vzhľad',
    themeMode: 'Režim témy',
    darkTheme: 'Tmavá',
    lightTheme: 'Biela',
    themeModeHint: 'Vyber tému appky. Kde to systém dovolí, zmení sa aj horná/spodná systémová lišta.',
    bankCardLimitsTitle: 'Limity platieb kartou',
    manageThisBank: 'Spravovať túto banku',
    tapRecentBank: 'Klikni na názov banky pre jej transakcie.',
    dateRange: 'Rozsah dátumov',
    fromDate: 'Od',
    toDate: 'Do',
    clearDateFilter: 'Vymazať dátumový filter',
    allMonths: 'Všetky mesiace',
    transactionTotals: 'Súčty',
    filteredTransactions: 'Vyfiltrované transakcie',
    totalIncoming: 'Príjmy',
    totalOutgoing: 'Výdavky',
    totalNet: 'Rozdiel',
    noTotalValue: '0,00',
    totalsHint: 'Vypočítané podľa aktuálne nastavených filtrov.',
    showMore: 'Načítať ďalšie',
    showingTransactions: 'Zobrazené',
    ofTransactions: 'z',
    transactionsCountLabel: 'transakcií',
    renderedForSpeed: 'Kvôli rýchlosti na mobile sa zobrazuje len časť zoznamu. Súčty počítajú všetky vyfiltrované transakcie.',
    transactionKind: 'Typ platby',
    cardsOnly: 'Karty',
    cardSourceFilter: 'Karta',
    bankCardsSheetTitle: 'Karty',
    bankCardSlotLabel: 'Karta',
    bankCardNumber: 'Číslo karty',
    bankCardExpiry: 'Platnosť',
    bankCardCvc: 'CVC',
    copyCard: 'Kopírovať kartu',
    copyCardShort: 'Kopírovať',
    saveCards: 'Uložiť karty',
    cardCopied: 'Karta skopírovaná',
    bankCardCopyEmpty: 'Karta je prázdna.',
    bankCardsNoneConfigured: 'Pre túto banku nie sú v Manage banks nastavené žiadne karty.',
    accountsOnly: 'Transfers',
    internalTransfers: 'Interné transfery',
    cardVsAccountHint: 'Kartové platby sa počítajú do bankových benefitov. Účtové platby sú oddelené.',
    archiveCardsOnlyHint: 'Mesačný archív a trend počítajú iba kartové platby.',
    archivePaymentTypeHint: 'Detail banky môžeš filtrovať podľa všetkých platieb, kariet alebo účtov.',
    paymentKindAll: 'Všetky platby',
    cashOnly: 'Hotovosť',
    manualKindHint: 'Kartové platby sa počítajú do bankových benefitov. Účtové a hotovostné platby sú oddelené.',
    accountPaymentKind: 'Bankový prevod',
    cashPaymentKind: 'Hotovostná platba',
    cardPaymentKind: 'Platba kartou',
    longPressToEdit: 'Dlhým podržaním upravíš transakciu.',
    backAgainToExit: 'Stlač späť ešte raz pre ukončenie',
    dragSheetHint: 'Potiahni tu',
    scrollToLatest: 'Späť hore',
    editKindHint: 'Zmena typu platby upraví, či sa transakcia počíta ako karta, účet alebo hotovosť.',
    budgetAllPaymentsHint: 'Bankový budget počíta karty, účtové platby aj hotovosť.',
    loadOlderData: 'Načítať staršie dáta',
    currentMonthOnly: 'Zobrazuje sa iba aktuálny mesiac.',
    olderDataHint: 'Staršie transakcie sú kvôli rýchlosti skryté.',
    olderDataLoaded: 'Staršie dáta načítané',
    dateRangeOverridesMonth: 'Dátumový filter môže zobraziť aj staršie mesiace.',
    loading: 'Načítavam',
    mobilePerfMode: 'Mobilný rýchly režim',
    archiveLoadMore: 'Načítať ďalšie'},
  cs: {
    appTitle: 'Bliss - Finance Tracker',
    overview: 'Přehled',
    transactions: 'Transakce',
    archiveTitle: 'Archiv',
    settings: 'Nastavení',
    language: 'Jazyk',
    payments: 'plateb',
    daysLeft: 'dní zbývá',
    totalTransactions: 'transakce',
    overviewSummaryTransactions: 'Transakce',
    overviewSummaryDailyAverage: 'Denní průměr',
    overviewSummaryNetFlow: 'Čistý tok',
    overviewSummaryRemainingBudget: 'Rozpočet',
    overviewSummaryBudgetRemaining: 'zbývá',
    overviewSummaryOverBudget: 'nad rozpočtem',
    overviewSummaryCycleTitle: 'Klikni pro další metriku',
    overviewDailyAverageBreakdownHint: 'Pro výpočet Denního průměru najeď myší na ikonu „i“ nebo na ni klepni.',
    overviewNetFlowBreakdownHint: 'Pro výpočet Čistého toku najeď myší na ikonu „i“ nebo na ni klepni.',
    overviewBudgetBreakdownHint: 'Pro výpočet najeď myší na informační ikonu nebo podrž Rozpočet.',
    overviewDailyAverageBreakdownTitle: 'Výpočet denního průměru',
    overviewDailyAverageBreakdownFormula: 'Denní průměr = započtené výdaje ÷ započtené kalendářní dny',
    overviewDailyAverageDaysCounted: 'Započtené kalendářní dny',
    overviewDailyAverageCurrentMonthNote: 'V aktuálním měsíci se počítají kalendářní dny od prvního dne do dneška.',
    overviewDailyAverageFullMonthNote: 'Ve vybraném minulém měsíci se počítají všechny jeho kalendářní dny.',
    overviewNetFlowBreakdownTitle: 'Výpočet čistého toku',
    overviewNetFlowBreakdownFormula: 'Čistý tok = započtené příjmy − započtené výdaje',
    overviewNetFlowBreakdownIncome: 'Započtené příjmy',
    overviewNetFlowBreakdownFilters: 'Nezapočtené do příjmů ani výdajů',
    overviewNetFlowBreakdownExcludedIncome: 'Vyloučené příjmy',
    overviewNetFlowBreakdownExcludedSpent: 'Vyloučené výdaje',
    overviewNetFlowBreakdownExcludedDetails: 'Rozpis podle důvodu',
    overviewNetFlowBreakdownFilterNote: 'Započtené Příjmy a Výdaje se shodují s kartou Dostupná hotovost. Vyloučené částky jsou zobrazené pouze pro přehled.',
    offlineShowingCache: 'Offline — zobrazují se poslední uložená data.',
    overviewBudgetBreakdownTitle: 'Výpočet rozpočtu',
    overviewBudgetBreakdownFormula: 'Zůstatek = limity − započtené výdaje',
    overviewBudgetBreakdownLimits: 'Součet limitů',
    overviewBudgetBreakdownSpent: 'Započtené výdaje',
    overviewBudgetBreakdownRemaining: 'Zůstatek',
    overviewBudgetBreakdownViewBankBudgets: 'Zobrazit bankovní rozpočty v detailním přehledu',
    overviewBudgetBreakdownExcluded: 'Vyloučené z cashflow',
    overviewBudgetBreakdownInternalTransfers: 'Interní převody',
    overviewBudgetBreakdownCreditCards: 'Transakce kreditních karet vyloučené z bankovních rozpočtů',
    overviewCashflowBreakdownCreditAdjustments: 'Splátky kreditní karty a úpravy limitu',
    overviewBudgetBreakdownManualExclusions: 'Ručně vyloučené',
    overviewBudgetBreakdownNonSpent: 'Non-spent výdaje',
    overviewBudgetBreakdownNonIncome: 'Non-income příjmy',
    overviewBudgetBreakdownInactiveBanks: 'Neaktivní banky',
    overviewBudgetBreakdownMatchedOffsets: 'Spárované vratky a storna',
    overviewBudgetBreakdownExclusionsUnavailable: 'Vyloučené částky se zobrazí po úplném načtení transakcí.',
    overviewBudgetBreakdownIncomeNote: 'Příjmy rozpočet nezvyšují; jsou zahrnuté v Čistém toku.',
    cashflowBreakdownTitle: 'Rozpis měsíčního cashflow',
    cashflowBreakdownCta: 'Zobrazit rozpis cashflow',
    cashflowCountedIncome: 'Reálný příjem',
    cashflowCountedSpent: 'Reálné výdaje',
    cashflowExcludedIncome: 'Vyloučené příjmy',
    cashflowExcludedSpent: 'Vyloučené výdaje',
    cashflowRawIncome: 'Všechny příchozí pohyby',
    cashflowRawSpent: 'Všechny odchozí pohyby',
    cashflowGrossTurnover: 'Celkový obrat na účtech',
    cashflowTurnoverNote: 'Reálný cashflow vynechává interní převody, splátky a úpravy kreditní karty, non-spent/non-income položky a spárované vratky. Všechny pohyby ukazují, kolik peněz skutečně proteklo přes účty.',
    cashflowReasonsTitle: 'Co se nezapočítalo',
    cashflowIncomingShort: 'Příjem',
    cashflowOutgoingShort: 'Výdaj',
    cashflowNoExclusions: 'V tomto měsíci nejsou žádné vyloučené pohyby.',
    cashflowStoredExclusionsUnavailable: 'Offline jsou dostupné jen uložené měsíční součty. Detail vyloučených pohybů se zobrazí po synchronizaci transakcí.',
    cashflowOpenIncomeBreakdown: 'Zobrazit rozpis příjmů',
    cashflowOpenSpentBreakdown: 'Zobrazit rozpis výdajů',
    wealthManagementTitle: 'Správa majetku',
    wealthManagementHint: 'Spravuj všechny finanční zdroje a přidávej nové záznamy na jednom místě.',
    wealthAssets: 'Aktiva',
    wealthLiabilitiesProtection: 'Závazky a ochrana',
    wealthBanks: 'Banky',
    wealthInvestments: 'Investice',
    wealthProperties: 'Nemovitosti',
    wealthLoans: 'Úvěry',
    wealthInsurance: 'Pojištění',
    manageAction: 'Spravovat',
    manageLoans: 'Správa úvěrů',
    manageInvestments: 'Spravovat investice',
    manageProperties: 'Spravovat nemovitosti',
    manageInsurance: 'Spravovat pojištění',
    totalNetWorth: 'Celková čistá hodnota',
    availableCash: 'Dostupná hotovost - Banky',
    tapForNetWorthBreakdown: 'Klikni nebo klepni pro zobrazení rozpisu',
    showBankDetails: 'Zobrazit detaily bank',
    showOverviewDetails: 'Zobrazit podrobný přehled',
    netWorthBreakdownTitle: 'Složení čisté hodnoty',
    netWorthAssets: 'Majetek',
    netWorthCash: 'Hotovost',
    netWorthInvestments: 'Investice',
    netWorthProperties: 'Nemovitosti',
    netWorthLiabilities: 'Závazky',
    netWorthCreditCards: 'Kreditní karty',
    netWorthLoans: 'Úvěry',
    netWorthTotal: 'Čistá hodnota',
    netWorthMeasuredAt: 'Změřeno',
    netWorthFormula: 'Hotovost + investice + nemovitosti − závazky',
    netWorthUnavailable: 'Složení se zobrazí po nejbližší úspěšné synchronizaci.',
    overviewSummaryThisMonth: 'tento měsíc',
    recentTransactions: 'poslední transakce',
    spentByCurrency: 'utraceno podle měny',
    spentByBank: 'utraceno podle banky',
    budgetByBank: 'budget podle banky',
    type: 'Typ',
    bankTypeCard: 'Karta',
    bankTypeAccount: 'Účet',
    bank: 'Banka',
    category: 'Kategorie',
    all: 'Vše',
    incoming: 'Příjem',
    outgoing: 'Výdaj',
    outgoingOption: 'Výdaj (-)',
    incomingOption: 'Příjem (+)',
    spent: 'Výdaje',
    income: 'Příjmy',
    archiveSubtitle: 'Měsíční trendy',
    spendingTrend: 'Trend výdajů',
    lastMonthsHint: 'Posledních 8 měsíců · klikni na bod pro detail',
    noHistoryYet: 'Zatím žádná historie',
    noHistoryText: 'Minulé měsíce s transakcemi se zobrazí po uzavření celého měsíce.',
    monthlyArchive: 'Archiv měsíců',
    archiveMonthlyTotalsHint: 'Karetní platby, výdaje a příjmy celkem podle banky.',
    plan: 'plán',
    freePlan: 'Bezplatný plán',
    freePlanSub: 'Ruční zadávání · upgrade pro auto-sync',
    upgradePageSub: 'Ruční zadávání · upgrade pro auto-sync',
    upgradePageSubPremium: 'Auto-sync je zapnutý',
    upgradePageSubPro: 'Všechny premium funkce jsou zapnuté',
    upgrade: 'Upgrade',
    enableNotifications: 'Povolit upozornění',
    notificationsOff: 'Push notifikace zatím nejsou zapnuté.',
    copyFcmToken: 'Kopírovat FCM token',
    myBanks: 'Moje banky',
    manageBanks: 'Spravovat banky',
    syncDetectedBanks: 'Synchronizovat nalezené banky',
    googleSheetsConnection: 'Připojení ke Google Sheets',
    aboutApp: 'o aplikaci',
    appInfoSub: 'Verze 3.0.2 · bankovní přehledy, budgety, archiv a push notifikace ⚙️🔥',
    sync: 'Sync',
    syncValue: 'Auto každých 5 min',
    mode: 'Režim',
    modeValue: 'PWA / Google Sheets',
    quickAdd: 'Rychlé přidání',
    addTransaction: 'Přidat transakci',
    addTransactionHint: 'Ručně zadej novou platbu nebo příjem.',
    addBank: 'Přidat banku',
    addBankHint: 'Přidej novou banku, měnu, budget a limit karty.',
    addLoan: 'Přidat úvěr',
    addLoanHint: 'Vytvoř nový úvěr/hypotéku.',
    addInvestment: 'Přidat investici',
    addInvestmentHint: 'Vytvoř novou investici ve stejném nastavení Investic.',
    addInsurance: 'Přidat pojištění',
    addInsuranceHint: 'Vytvoř nové pojištění ve stejném nastavení Pojištění.',
    addProperty: 'Přidat nemovitost',
    addPropertyHint: 'Vytvoř novou nemovitost ve stejném nastavení Nemovitostí.',
    addWidget: 'Přidat widget',
    addWidgetHint: 'Vytvoř graf na přehled z dat nebo z ručně zadané hodnoty.',
    completed: 'splněno',
    notCompleted: 'nesplněno',
    missingCurrent: 'chybí',
    switchToStackedBarChart: 'Přepnout na skládaný sloupcový graf',
    switchToLineChart: 'Přepnout na čárový graf',
    stackedByBank: 'podle banky',
    noLimit: 'bez limitu',
    monthArchive: 'Archiv měsíců',
    saveChanges: 'Uložit změny',
    autosaveHint: 'Změny se ukládají automaticky. Zelená fajfka znamená, že Google Sheets potvrdil uložení.',
    saveBank: 'Uložit banku',
    saveTransaction: 'Uložit transakci',
    countAsNonSpent: 'Počítat jako non-spent',
    nonSpentHint: 'Nezapočítává se do výdajových metrik. Platí hned a na pozadí se uloží do Google Sheets.',
    countAsNonIncome: 'Počítat jako non-income',
    nonIncomeHint: 'Nezapočítává se do příjmů ani čistého toku. Platí hned a na pozadí se uloží do Google Sheets.',
    returnedAmountFor: 'Vrácená částka k platbě',
    notLinkedToPayment: 'Není propojena s odchozí platbou',
    returnedAmountHint: 'Vyber původní odchozí bankovní převod. Přijatá částka sníží spent místo započítání do income.',
    done: 'Hotovo',
    current: 'Aktuální',
    monthly: 'Měsíčně',
    yearly: 'Ročně',
    bankName: 'Název banky',
    accountLast4: 'Účet / Karta poslední 4 čísla',
    currency: 'Měna',
    monthlyBudget: 'Měsíční budget',
    warnWhenRemaining: 'Upozornit když zbývá',
    monthlyCardLimit: 'Měsíční limit karty',
    monthlyBalanceLimit: 'Měsíční limit zůstatku',
    monthlyBalanceLimitShort: 'limit zůstatku',
    creditCardMonthlyLimit: 'Měsíční limit',
    creditCardMonthlyLimitShort: 'měsíční limit',
    creditCardOutstandingBalance: 'Dlužný zůstatek',
    monthLabel: 'Měsíc',
    chooseMonth: 'Vyber měsíc',
    merchantDescription: 'Obchodník / popis',
    reference: 'Variabilní symbol (VS)',
    referencePlaceholder: 'volitelné',
    tagShapeRequired: 'Vyber tvar tagu.',
    tagColorRequired: 'Vyber barvu tagu.',
    massTagUpdate: 'Hromadná úprava tagů',
    txnTagNone: 'Bez tagu',
    massTagSelectHint: 'Klikni na transakce a vyber je, pak zvol akci níže.',
    massTagSourceHint: 'Nejdřív vyfiltruj transakce v seznamu, pak jim tu přiřaď tag.',
    massTagOnlyUntagged: 'Jen transakce bez tagu',
    massTagMode: 'Akce',
    massTagModeExisting: 'Přiřadit existující tag',
    massTagModeNew: 'Vytvořit / upravit tag',
    massTagModeClear: 'Odstranit tag',
    massTagExisting: 'Existující tag',
    massTagPickExisting: 'Vyber existující tag.',
    massTagPickAction: 'Vyber, co udělat s tagem.',
    massTagNoExisting: 'Zatím žádné tagy',
    massTagNoSelection: 'Vyber alespoň jednu transakci.',
    massTagNameRequired: 'Zadej název tagu.',
    massTagClearHint: 'Vybrané transakce přijdou o tag.',
    massTagMatches: 'Vybrané',
    massTagEmptyHint: 'Nech Tag prázdný pro odstranění tagu z vybraných transakcí.',
    massTagApply: 'Použít na všechny',
    massTagNoTargets: 'V tomto rozsahu nejsou žádné transakce.',
    massTagClearConfirm: 'Odstranit tag z {n} transakcí?',
    amount: 'Částka',
    devSimulator: 'Vývojářský simulátor',
    expand: 'Rozbalit ↓',
    collapse: 'Sbalit ↑'
  ,
    googleSheetsToggleTitle: 'Google Sheets sync',
    googleSheetsToggleSubOn: 'Zapnuto — appka načítá reálné transakce ze Sheets.',
    googleSheetsToggleSubOff: 'Vypnuto — appka používá jen lokální cache.',
    bankBudgetTitle: 'Budget podle banky',
    progress: 'pokrok',
    usedThisMonth: 'použito tento měsíc',
    paymentsLeft: 'zbývá plateb',
    paymentsWord: 'plateb',
    leftWord: 'zbývá',
    paymentLimitReached: 'limit plateb splněn',
    withoutMonthlyLimit: 'bez měsíčního limitu',
    budgetNotSet: 'Budget zatím není nastavený.',
    budgetStatusTitle: 'Bankovní budget',
    accountBalanceTitle: 'Zůstatek na účtu',
    accountBalanceManageHint: 'Zůstatek upravíš v Nastavení · Spravovat banky',
    accountBalanceTotal: 'Celkem',
    accountBalanceTotalHint: 'Přepočteno přes FX kurzy v appce',
    csobCzCreditOutstandingName: 'CSOB CZ credit card',
    csobCzCreditOutstandingShort: 'Credit card',
    csobCzCreditOutstandingHint: '',
    csobCzCreditOutstandingManageHint: 'Zobrazí se jako podúčet pod ČSOB CZ. Zadej zůstatek limitu (např. 50 000). Nákup kartou odečte, splátka přičte. Není v Total hotovosti.',
    switchToPieChart: 'Přepnout na koláčový graf',
    switchToBarChart: 'Přepnout na sloupcový graf',
    pieChart: 'Koláčový graf',
    remaining: 'zbývá',
    budgetOverBy: 'překročeno o',
    overBudget: 'překročený',
    nearLimit: 'blízko limitu',
    normal: 'v normě',
    noTransactionsForFilters: 'Žádné transakce neodpovídají zvoleným filtrům.',
    emptyMovements: 'Žádné pohyby',
    todayPrefix: 'Dnes',
    syncTitle: 'Synchronizovat',
    googleSheetsConnectionHint: 'Uprav Google Sheets připojení. Limity karet a budgety se nastavují níže přes Spravovat banky.',
    monthlyTrends: 'Měsíční trendy',
    archiveEmpty: 'Archiv je zatím prázdný.',
    noTrendData: 'Zatím nejsou data pro trend.',
    monthlyBankTrendNote: 'Měsíční trend výdajů podle banky. Kurzy se načítají z Google Sheets, když jsou dostupné.',
    googleSheetsLocalStatus: 'Google Sheets připojení je uložené lokálně. Apps Script URL použijeme k zápisu limitů, budgetů a tokenů.',
    upgradeHeroTitle: 'Všechny tvoje banky,<br>na jednom místě — automaticky.',
    upgradeHeroText: 'Evropská pravidla PSD2 ti dávají právo na vlastní bankovní data. My z nich děláme jednoduchý přehled bank, budgetů a transakcí.',
    yearlySave: 'Ročně <span class="year-save-badge">Ušetři 37%</span>',
    perMonth: '/ měsíc',
    perYearPremium: '/ měsíc · €14.99/rok',
    perYearPro: '/ měsíc · €39.99/rok',
    mostPopular: '⭐ Nejoblíbenější',
    upgradeFreeBanks: 'Až 2 banky',
    upgradeManualEntry: 'Ruční zadávání transakcí',
    upgradeMonthlyBudget: 'Měsíční sledování budgetu',
    upgradeArchive3m: '3 měsíce archivu',
    upgradeBasicPush: 'Základní push upozornění',
    upgradeUnlimitedBanks: 'Neomezený počet bank',
    upgradeAutoSync: 'Auto-sync přes Open Banking (PSD2)',
    upgradeAutoImport: 'Transakce importované automaticky',
    upgradeFullArchive: 'Celá historie archivu',
    upgradeAdvancedAlerts: 'Pokročilá budget a cílová upozornění',
    upgradeCsvExport: 'CSV export',
    upgradeMultiCurrency: 'Podpora více měn',
    upgradePrioritySupport: 'Prioritní podpora',
    upgradeEverythingPremium: 'Vše z Premium',
    upgradeAiInsights: 'AI přehled výdajů',
    upgradeFamilySharing: 'Rodinné sdílení až pro 5 lidí',
    upgradeCustomCategories: 'Vlastní kategorie',
    upgradeForecasts: 'Předpovědi výdajů',
    upgradeTaxExport: 'Export daňového reportu',
    joinWaitlistFree: 'Přidat se na waitlist — zdarma',
    joinProWaitlist: 'Přidat se na Pro waitlist',
    planSavedAlertPrefix: 'Plán',
    planSavedAlertSuffix: 'je zatím uložený jen lokálně. Platby/upgrade napojíme později.',
    searchTransactions: 'Hledat transakce',
    searchBanksTransactions: 'Hledat banky nebo transakce',
    searchBanks: 'Hledat banky',
    manageBanksTransactions: 'Spravovat banky a transakce',
    banksTab: 'Banky',
    transactionsTab: 'Transakce',
    edit: 'Upravit',
    delete: 'Smazat',
    deleteBank: 'Smazat banku',
    deleteBankConfirm: 'Smazat tuto banku?',
    bankDeleted: 'Banka byla smazána.',
    defaultBankCannotDelete: 'Výchozí parser banky nejdou smazat, ale můžeš upravit jejich nastavení.',
    deleteTransaction: 'Smazat transakci',
    deleteTransactionConfirm: 'Smazat tuto transakci?',
    transactionSaved: 'Transakce byla uložena.',
    noTransactions: 'Zatím žádné transakce.',
    date: 'Datum',
    direction: 'Typ',
    cardLimitShort: 'limit karty',
    incomingAlertShort: 'příjem od',
    outgoingAlertShort: 'odchod od',
    largeMovementAlerts: 'Push alerts',
    largeMovementAlertsHint: '0 = vypnuto. Kontroluje se každá jednotlivá transakce ve vybraném měsíci.',
    incomingAlertPlaceholder: 'Příchozí platba od',
    outgoingAlertPlaceholder: 'Odchozí platba od',
    budgetLabel: 'budget',
    noBanksAdded: 'Nemáš přidané banky.',
    cardPayments: 'platby kartou',
    limitReached: 'limit splněn',
    dailyArchive: 'Denní archiv',
    dailyCashflow: 'Denní cashflow',
    expenses: 'Výdaje',
    selectMonth: 'Měsíc',
    dailyTotal: 'Denní součet',
    noDailyData: 'Pro tuto banku a měsíc nejsou denní data.',
    tapBankForDaily: 'Klikni na banku pro denní příjmy a výdaje.',
    czkEquivalent: 'CZK ekvivalent',
    trendCurrencyNote: 'Všechny měny jsou pro porovnání přepočítané na CZK.',
    bankCurrencyNote: 'Přepočteno do měny banky',
    amountAxis: 'Částka',
    clickBarToFilter: 'Klikni na sloupec pro filtrování transakcí.',
    allDays: 'Všechny dny',
    selectedDay: 'Vybraný den',
    showing: 'Zobrazeno',
    manualTransaction: 'Manuální transakce',
    selectArchiveDate: 'Vyber datum, aby se transakce zařadila do správného měsíce v archivu.',
    editTransaction: 'Upravit transakci',
    transactionDeleted: 'Transakce byla smazána.',
    transactionDeleteFailed: 'Transakci se nepodařilo smazat.',
    doubleTapToEdit: 'Dvojklik / dvojité klepnutí pro úpravu.',
    appearance: 'Vzhled',
    themeMode: 'Režim tématu',
    darkTheme: 'Tmavá',
    lightTheme: 'Bílá',
    themeModeHint: 'Vyber téma appky. Kde to systém dovolí, změní se i horní/spodní systémová lišta.',
    bankCardLimitsTitle: 'Limity plateb kartou',
    manageThisBank: 'Spravovat tuto banku',
    tapRecentBank: 'Klikni na název banky pro její transakce.',
    dateRange: 'Rozsah datumů',
    fromDate: 'Od',
    toDate: 'Do',
    clearDateFilter: 'Smazat datumový filtr',
    allMonths: 'Všechny měsíce',
    transactionTotals: 'Součty',
    filteredTransactions: 'Vyfiltrované transakce',
    totalIncoming: 'Příjmy',
    totalOutgoing: 'Výdaje',
    totalNet: 'Rozdíl',
    noTotalValue: '0,00',
    totalsHint: 'Vypočtené podle aktuálně nastavených filtrů.',
    showMore: 'Načíst další',
    showingTransactions: 'Zobrazeno',
    ofTransactions: 'z',
    transactionsCountLabel: 'transakcí',
    renderedForSpeed: 'Kvůli rychlosti na mobilu se zobrazuje jen část seznamu. Součty počítají všechny vyfiltrované transakce.',
    transactionKind: 'Typ platby',
    cardsOnly: 'Karty',
    cardSourceFilter: 'Karta',
    bankCardsSheetTitle: 'Karty',
    bankCardSlotLabel: 'Karta',
    bankCardNumber: 'Číslo karty',
    bankCardExpiry: 'Platnosť',
    bankCardCvc: 'CVC',
    copyCard: 'Kopírovať kartu',
    copyCardShort: 'Kopírovať',
    saveCards: 'Uložiť karty',
    cardCopied: 'Karta skopírovaná',
    bankCardCopyEmpty: 'Karta je prázdna.',
    bankCardsNoneConfigured: 'Pro tuto banku nejsou v Manage banks nastavené žádné karty.',
    accountsOnly: 'Transfers',
    internalTransfers: 'Interní transfery',
    cardVsAccountHint: 'Kartové platby se počítají do bankovních benefitů. Účtové platby jsou oddělené.',
    archiveCardsOnlyHint: 'Měsíční archiv a trend počítají jen karetní platby.',
    archivePaymentTypeHint: 'Detail banky můžeš filtrovat podle všech plateb, karet nebo účtů.',
    paymentKindAll: 'Všechny platby',
    cashOnly: 'Hotovost',
    manualKindHint: 'Karetní platby se počítají do bankovních benefitů. Účtové a hotovostní platby jsou oddělené.',
    accountPaymentKind: 'Bankovní převod',
    cashPaymentKind: 'Hotovostní platba',
    cardPaymentKind: 'Platba kartou',
    longPressToEdit: 'Dlouhým podržením upravíš transakci.',
    backAgainToExit: 'Stiskni zpět ještě jednou pro ukončení',
    dragSheetHint: 'Potáhni zde',
    scrollToLatest: 'Zpět nahoru',
    editKindHint: 'Změna typu platby upraví, zda se transakce počítá jako karta, účet nebo hotovost.',
    budgetAllPaymentsHint: 'Bankovní budget počítá karty, účtové platby i hotovost.',
    loadOlderData: 'Načíst starší data',
    currentMonthOnly: 'Zobrazuje se jen aktuální měsíc.',
    olderDataHint: 'Starší transakce jsou kvůli rychlosti skryté.',
    olderDataLoaded: 'Starší data načtena',
    dateRangeOverridesMonth: 'Datumový filtr může zobrazit i starší měsíce.',
    loading: 'Načítám',
    mobilePerfMode: 'Mobilní rychlý režim',
    archiveLoadMore: 'Načíst další'}
};

const BANK_STORED_CARD_SLOTS = 3;

let parserRunQueueTimer = null;
let parserRunInFlight = false;
let parserRunLastStartAt = 0;

const ENDPOINT_SERIALIZED_ACTIONS = new Set([
  'saveTransaction',
  'deleteTransaction',
  'saveBankSettings',
  'saveBank',
  'saveBankCards',
  'saveLoan'
]);

let endpointMutationQueue = [];
let endpointMutationQueueRunning = false;

// ── TRANSACTION DELETE GESTURES ────────────────────────────
let txLongPressTimer = null;
let txLongPressTargetId = null;

// ── CARD-LIKE PAGE SWIPE NAVIGATION — MOBILE OPTIMIZED ─────
const PAGE_SWIPE_ORDER = ['overview', 'txns', 'archive', 'settings'];


// ── APP LIGHT / DARK THEME SWITCH ──────────────────────────
const APP_THEMES = {
  dark: {
    themeColor: '#08111f',
    backgroundColor: '#08111f',
    colorScheme: 'dark'
  },
  light: {
    themeColor: '#f8fafc',
    backgroundColor: '#f8fafc',
    colorScheme: 'light'
  }
};

// Keep system bars synced after Chrome/PWA focus changes.
(function keepThemeSystemBarsSynced() {
  let repaintQueued = false;
  let lastMetaSyncAt = 0;
  const repaint = (force = false) => {
    if (repaintQueued) return;
    repaintQueued = true;
    requestAnimationFrame(() => {
      repaintQueued = false;
      const now = Date.now();
      // Skip noisy updates; only keep meta in sync occasionally unless forced.
      if (!force && (now - lastMetaSyncAt) < 900) return;
      lastMetaSyncAt = now;
      const theme = getAppTheme();
      updateThemeMeta(theme);
      const darkBtn = document.getElementById('theme-dark-btn');
      const lightBtn = document.getElementById('theme-light-btn');
      if (darkBtn) darkBtn.classList.toggle('active', theme === 'dark');
      if (lightBtn) lightBtn.classList.toggle('active', theme === 'light');
    });
  };

  repaint(true);
  ['pageshow', 'focus', 'orientationchange'].forEach(eventName => {
    window.addEventListener(eventName, () => repaint(true), { passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) repaint(true);
  }, { passive: true });
  window.addEventListener('resize', () => repaint(false), { passive: true });
  if (window.visualViewport) {
    visualViewport.addEventListener('resize', () => repaint(false), { passive: true });
  }
})();

// ── INICIALIZÁCIA A ŠTART APLIKÁCIE ──────────────────────────────
let startupWarmCachesDone = false;
try { window.warmHeavyTabCachesSync = warmHeavyTabCachesSync; } catch (_) {}

// C (perf): coalesce the startup burst of renderAll() calls.
// During the first few seconds after load, multiple modules + the background
// sync can each trigger a full renderAll (which re-renders every tab). This
// collapses repeated calls within the same frame into a single render, so the
// heavy work runs once instead of many times. After the startup window,
// renderAll behaves synchronously again to preserve existing semantics.
(function setupStartupRenderCoalescer(){
  if (typeof renderAll !== 'function' || renderAll.__btCoalesced) return;
  const originalRenderAll = renderAll;
  const STARTUP_COALESCE_UNTIL = Date.now() + 3000;
  let scheduled = false;
  let queuedOptions = { deferHeavy: false, eagerAllTabs: false, forceArchiveRebuild: false };

  const mergeQueuedRenderAllOptions = (options = {}) => {
    if (options.deferHeavy) queuedOptions.deferHeavy = true;
    if (options.eagerAllTabs) queuedOptions.eagerAllTabs = true;
    if (options.forceArchiveRebuild) queuedOptions.forceArchiveRebuild = true;
  };

  const runQueuedRender = () => {
    scheduled = false;
    const opts = {
      deferHeavy: !!queuedOptions.deferHeavy,
      eagerAllTabs: !!queuedOptions.eagerAllTabs,
      forceArchiveRebuild: !!queuedOptions.forceArchiveRebuild
    };
    queuedOptions = { deferHeavy: false, eagerAllTabs: false, forceArchiveRebuild: false };
    try { originalRenderAll.call(window, opts); }
    catch (e) { console.warn('Coalesced renderAll failed:', e); }
  };

  const coalescedRenderAll = function(options = {}) {
    // After the startup window, keep the original synchronous behavior.
    if (Date.now() > STARTUP_COALESCE_UNTIL) return originalRenderAll.call(this, options);
    mergeQueuedRenderAllOptions(options || {});
    if (scheduled) return;
    scheduled = true;
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(runQueuedRender);
    else window.setTimeout(runQueuedRender, 16);
  };
  coalescedRenderAll.__btCoalesced = true;

  renderAll = coalescedRenderAll;
  try { window.renderAll = coalescedRenderAll; } catch (_) {}
})();

let __btColdBootStarted = false;

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', scheduleAppBootAfterDomReady, { once: true });
} else {
  scheduleAppBootAfterDomReady();
}

window.addEventListener('pageshow', (event) => {
  if (activePageId !== 'overview') return;
  resetOverviewPageBootAnimationState();
  if (event.persisted) {
    __appBootStartedAt = Date.now();
    startAppBootOverlay();
  }
  if (!shouldWaitForOverviewDataSync()) {
    __overviewChartsDataSettled = true;
  }
  if (__appBootActive) {
    finalizeAppBootPresentation();
    return;
  }
  scheduleOverviewPageBootAnimation({ delayMs: 200, force: true });
}, { passive: true });
