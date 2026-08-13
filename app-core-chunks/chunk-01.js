// Generated app-core slice 1/6 (merged).



function getAppCurrency() {
  return normalizeCurrencyForStorage(localStorage.getItem('app_currency') || 'Kč');
}

function setAppCurrency(currency) {
  const curr = normalizeCurrencyForStorage(currency || 'Kč');
  localStorage.setItem('app_currency', curr);
  const select = document.getElementById('app-currency-select');
  if (select) select.value = curr;
  renderAll();
  applyLanguage();
}

function updateAppCurrencySelect() {
  const select = document.getElementById('app-currency-select');
  if (!select) return;
  fillCurrencySelect(select, getAppCurrency());
  select.value = getAppCurrency();
}

function isGoogleSheetsConnected() {
  return !!String(SHEETS_URL || '').trim();
}

function isLocalEditMode() {
  // Lokálne pridávanie/mazanie je povolené iba v offline/test režime,
  // aby sa lokálne zmeny nemiešali s dátami načítanými z Google Sheets.
  return !isGoogleSheetsConnected();
}

function guardLocalEdit(actionText) {
  if (isLocalEditMode()) return true;
  alert(`${actionText} je vypnuté, pretože appka je pripojená na Google Sheets. Vymaž Google Sheets URL v nastaveniach a ulož zmeny pre offline/test režim.`);
  return false;
}

function updateEditModeUI() {
  const localMode = isLocalEditMode();
  const notice = document.getElementById('edit-mode-notice');
  if (notice) {
    notice.className = `edit-mode-notice ${localMode ? 'offline' : 'online'}`;
    notice.innerHTML = localMode
      ? 'OFFLINE / TEST REŽIM: pridávanie aj mazanie simulovaných platieb je povolené.'
      : 'GOOGLE SHEETS REŽIM: lokálne pridávanie a mazanie platieb je vypnuté, aby sa dáta nemiešali so Sheets.';
  }

  ['sim-date-rb','sim-merchant-rb','sim-amt-rb','sim-currency-rb','sim-date-csob','sim-merchant-csob','sim-amt-csob','sim-currency-csob','sim-date-csob-cz','sim-merchant-csob-cz','sim-amt-csob-cz','sim-currency-csob-cz','sim-date-moneta','sim-merchant-moneta','sim-amt-moneta','sim-currency-moneta'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !localMode;
  });
  document.querySelectorAll('[data-local-edit-only="true"]').forEach(btn => {
    btn.disabled = !localMode;
    btn.title = localMode ? (btn.dataset.defaultTitle || '') : 'Dostupné iba v offline/test režime';
  });
}

function catIcon(cat) { return CAT_ICONS[cat] || '💳'; }

function getCardColor(used, limit) {
  if (limit <= 0) return 'var(--ok)';
  if (used >= limit) return 'var(--ok)'; 
  const pct = used / limit;
  return pct < 0.4 ? 'var(--danger)' : 'var(--warn)'; 
}

function getAktuálneMonth() {
  const now = new Date();
  now.setMonth(now.getMonth() + activeOverviewMonthOffset);
  return `${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
}

function formatOverviewTopAmount(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  const formatOneDecimal = (v) => {
    const rounded = Math.round(v * 10) / 10;
    const hasDecimal = Math.abs(rounded % 1) > 0.001;
    return rounded.toLocaleString('en-US', {
      minimumFractionDigits: hasDecimal ? 1 : 0,
      maximumFractionDigits: 1
    });
  };
  if (abs >= 1e9) return sign + formatOneDecimal(abs / 1e9) + 'B';
  if (abs >= 1e6) return sign + formatOneDecimal(abs / 1e6) + 'M';
  if (abs >= 1e3) return sign + formatOneDecimal(abs / 1e3) + 'K';
  return sign + Math.round(abs).toLocaleString('cs');
}

function formatOverviewTopAmountFull(value, currency = getAppCurrency()) {
  const n = Math.round(Number(value || 0));
  if (!Number.isFinite(n)) return formatCurrencyAmount(0, currency || getAppCurrency());
  return formatCurrencyAmount(n, currency || getAppCurrency());
}

function getGregorianMonthLength(year, monthNumber) {
  const safeYear = Math.trunc(Number(year));
  const safeMonth = Math.trunc(Number(monthNumber));
  if (!Number.isFinite(safeYear) || safeMonth < 1 || safeMonth > 12) return 0;
  return new Date(safeYear, safeMonth, 0).getDate();
}

function getOverviewMonthElapsedRatio() {
  const offset = Number(activeOverviewMonthOffset || 0);
  if (offset < 0) return 1;
  if (offset > 0) return 0;
  const now = new Date();
  const totalDays = getGregorianMonthLength(now.getFullYear(), now.getMonth() + 1);
  if (!totalDays) return 0;
  return Math.min(1, Math.max(0, now.getDate() / totalDays));
}

function getOverviewSummaryDayCount(monthStr = getAktuálneMonth()) {
  const normalized = normalizeMonthStr(monthStr || getAktuálneMonth());
  const match = normalized.match(/^(\d{2})\/(\d{4})$/);
  if (!match) return 1;
  const monthIndex = Math.max(0, Math.min(11, Number(match[1]) - 1));
  const year = Number(match[2]);
  const totalDays = getGregorianMonthLength(year, monthIndex + 1);
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && monthIndex === now.getMonth();
  return Math.max(1, isCurrentMonth ? Math.min(now.getDate(), totalDays) : totalDays);
}

function getOverviewBudgetBankKeysForMonth(monthStr = getAktuálneMonth()) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const inactiveKeys = new Set((getCustomBanks() || [])
    .filter(bank => bank && bank.active === false)
    .map(bank => String(bank.id || '').trim())
    .filter(Boolean));
  return Array.from(new Set(getArchiveTotalsBankKeys(month)))
    .filter(bankKey => bankKey && !isOverviewCreditBankKey(bankKey) && !inactiveKeys.has(bankKey));
}

function getOverviewBudgetBankPresentation(bankKey) {
  const info = getArchiveBankInfo(bankKey) || {};
  return {
    name: getArchiveBankName(bankKey) || info.label || plainBankName(bankKey),
    color: info.color || getCustomArchiveBankColor(bankKey) || 'var(--accent)'
  };
}

function getOverviewBudgetBankLabelHtml(bankKey) {
  const presentation = getOverviewBudgetBankPresentation(bankKey);
  return `<span class="bank-name-with-logo">${bankLogoImg(bankKey)}<span>${escapeHtml(presentation.name)}</span></span>`;
}

function getOverviewBudgetBreakdown(monthStr = getAktuálneMonth(), targetCurrency = getAppCurrency(), includeExcluded = false) {
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const currency = currencyCode(targetCurrency || getAppCurrency() || 'CZK');
  const bankKeys = getOverviewBudgetBankKeysForMonth(month);
  const cashflow = getOverviewQualifiedCashflowForBanks(bankKeys, month, currency);
  const banks = bankKeys.map(bankKey => {
    const budgetCurrency = getBankBudgetCurrency(bankKey) || currency;
    const limitRaw = Math.max(0, Number(getOverviewBudgetLimitForBank(bankKey, month) || 0) || 0);
    const limit = Math.max(0, Number(convertAmountCurrency(limitRaw, budgetCurrency, currency) || 0) || 0);
    const spent = Math.max(0, Number(cashflow.byBank?.[bankKey]?.spent || 0) || 0);
    return {
      key: bankKey,
      name: getOverviewBudgetBankPresentation(bankKey).name,
      limit,
      spent,
      remaining: limit - spent,
      hasBudget: limitRaw > 0
    };
  });

  const emptyExcluded = {
    internalTransfers: 0,
    creditCards: 0,
    manualSpent: 0,
    manualIncome: 0,
    manual: 0,
    inactiveBanks: 0,
    matchedOffsets: 0,
    spent: 0,
    income: 0,
    total: 0,
    byReason: createCashflowReasonTotals()
  };
  const excluded = includeExcluded ? cashflow.excluded : emptyExcluded;
  const exclusionTransactionsAvailable = includeExcluded && cashflow.exclusionTransactionsAvailable;

  const limit = banks.reduce((sum, bank) => sum + bank.limit, 0);
  const spent = banks.reduce((sum, bank) => sum + bank.spent, 0);
  return {
    month,
    currency,
    banks,
    limit,
    spent,
    income: Math.max(0, Number(cashflow.income || 0) || 0),
    rawSpent: Math.max(0, Number(cashflow.rawSpent || 0) || 0),
    rawIncome: Math.max(0, Number(cashflow.rawIncome || 0) || 0),
    turnover: Math.max(0, Number(cashflow.turnover || 0) || 0),
    remaining: limit - spent,
    excluded,
    exclusionTransactionsAvailable,
    excludesCreditPurchases: true
  };
}

function formatOverviewBudgetBreakdownAmount(value, currency, signed = false) {
  const numeric = Number(value || 0) || 0;
  const formatted = formatOverviewTopAmountFull(signed ? numeric : Math.abs(numeric), currency);
  return maskAccountBalanceValue(formatted);
}

function getOverviewMetricBreakdownHintKey(metricKey) {
  if (metricKey === 'daily-average') return 'overviewDailyAverageBreakdownHint';
  if (metricKey === 'net-flow') return 'overviewNetFlowBreakdownHint';
  return 'overviewBudgetBreakdownHint';
}

function getOverviewSpendingExclusionRows(breakdown, amount) {
  if (!breakdown.exclusionTransactionsAvailable) {
    return `<div class="overview-budget-breakdown-income" data-i18n="overviewBudgetBreakdownExclusionsUnavailable">${escapeHtml(t('overviewBudgetBreakdownExclusionsUnavailable'))}</div>`;
  }
  return [
    ['overviewBudgetBreakdownInternalTransfers', breakdown.excluded.internalTransfers],
    [breakdown.excludesCreditPurchases ? 'overviewBudgetBreakdownCreditCards' : 'overviewCashflowBreakdownCreditAdjustments', breakdown.excluded.creditCards],
    ['overviewBudgetBreakdownNonSpent', breakdown.excluded.manualSpent],
    ['overviewBudgetBreakdownNonIncome', breakdown.excluded.manualIncome],
    ['overviewBudgetBreakdownInactiveBanks', breakdown.excluded.inactiveBanks],
    ['overviewBudgetBreakdownMatchedOffsets', breakdown.excluded.matchedOffsets]
  ].map(([key, value]) => `
    <div class="overview-budget-breakdown-rule">
      <span data-i18n="${key}">${escapeHtml(t(key))}</span>
      <strong>${amount(value)}</strong>
    </div>`).join('');
}

function renderOverviewDailyAverageBreakdown(popover, breakdown) {
  const amount = value => escapeHtml(formatOverviewBudgetBreakdownAmount(value, breakdown.currency));
  const dayCount = getOverviewSummaryDayCount(breakdown.month);
  const dailyAverage = breakdown.spent / Math.max(1, dayCount);
  const monthParts = String(breakdown.month || '').match(/^(\d{2})\/(\d{4})$/);
  const now = new Date();
  const isCurrentMonth = !!monthParts
    && Number(monthParts[1]) === now.getMonth() + 1
    && Number(monthParts[2]) === now.getFullYear();
  const dayRuleKey = isCurrentMonth
    ? 'overviewDailyAverageCurrentMonthNote'
    : 'overviewDailyAverageFullMonthNote';
  const excludedRows = getOverviewSpendingExclusionRows(breakdown, amount);

  popover.innerHTML = `
    <div class="overview-budget-breakdown-title" data-i18n="overviewDailyAverageBreakdownTitle">${escapeHtml(t('overviewDailyAverageBreakdownTitle'))}</div>
    <div class="overview-budget-breakdown-formula" data-i18n="overviewDailyAverageBreakdownFormula">${escapeHtml(t('overviewDailyAverageBreakdownFormula'))}</div>
    <div class="overview-budget-breakdown-totals">
      <div><span data-i18n="overviewBudgetBreakdownSpent">${escapeHtml(t('overviewBudgetBreakdownSpent'))}</span><strong>${amount(breakdown.spent)}</strong></div>
      <div><span data-i18n="overviewDailyAverageDaysCounted">${escapeHtml(t('overviewDailyAverageDaysCounted'))}</span><strong>${dayCount}</strong></div>
      <div class="overview-budget-breakdown-result"><span data-i18n="overviewSummaryDailyAverage">${escapeHtml(t('overviewSummaryDailyAverage'))}</span><strong class="is-positive">${amount(dailyAverage)}</strong></div>
    </div>
    <div class="overview-budget-breakdown-income" data-i18n="${dayRuleKey}">${escapeHtml(t(dayRuleKey))}</div>
    <div class="overview-budget-breakdown-section" data-i18n="overviewBudgetBreakdownExcluded">${escapeHtml(t('overviewBudgetBreakdownExcluded'))}</div>
    <div class="overview-budget-breakdown-rules">${excludedRows}</div>`;
}

function renderOverviewNetFlowBreakdown(popover, breakdown) {
  const amount = value => escapeHtml(formatOverviewBudgetBreakdownAmount(value, breakdown.currency));
  const signedAmount = value => escapeHtml(formatOverviewBudgetBreakdownAmount(value, breakdown.currency, true));
  const netFlow = breakdown.income - breakdown.spent;
  const filterRows = getOverviewSpendingExclusionRows(breakdown, amount);
  const excludedIncome = Math.max(0, Number(breakdown.excluded?.income || 0) || 0);
  const excludedSpent = Math.max(0, Number(breakdown.excluded?.spent || 0) || 0);

  popover.innerHTML = `
    <div class="overview-budget-breakdown-title" data-i18n="overviewNetFlowBreakdownTitle">${escapeHtml(t('overviewNetFlowBreakdownTitle'))}</div>
    <div class="overview-budget-breakdown-formula" data-i18n="overviewNetFlowBreakdownFormula">${escapeHtml(t('overviewNetFlowBreakdownFormula'))}</div>
    <div class="overview-budget-breakdown-totals">
      <div><span data-i18n="overviewNetFlowBreakdownIncome">${escapeHtml(t('overviewNetFlowBreakdownIncome'))}</span><strong>+${amount(breakdown.income)}</strong></div>
      <div><span data-i18n="overviewBudgetBreakdownSpent">${escapeHtml(t('overviewBudgetBreakdownSpent'))}</span><strong>−${amount(breakdown.spent)}</strong></div>
      <div class="overview-budget-breakdown-result"><span data-i18n="overviewSummaryNetFlow">${escapeHtml(t('overviewSummaryNetFlow'))}</span><strong class="${netFlow < 0 ? 'is-negative' : 'is-positive'}">${signedAmount(netFlow)}</strong></div>
    </div>
    <div class="overview-budget-breakdown-section" data-i18n="overviewNetFlowBreakdownFilters">${escapeHtml(t('overviewNetFlowBreakdownFilters'))}</div>
    <div class="overview-budget-breakdown-totals overview-net-flow-excluded-totals">
      <div><span data-i18n="overviewNetFlowBreakdownExcludedIncome">${escapeHtml(t('overviewNetFlowBreakdownExcludedIncome'))}</span><strong>+${amount(excludedIncome)}</strong></div>
      <div><span data-i18n="overviewNetFlowBreakdownExcludedSpent">${escapeHtml(t('overviewNetFlowBreakdownExcludedSpent'))}</span><strong>−${amount(excludedSpent)}</strong></div>
    </div>
    <div class="overview-budget-breakdown-section" data-i18n="overviewNetFlowBreakdownExcludedDetails">${escapeHtml(t('overviewNetFlowBreakdownExcludedDetails'))}</div>
    <div class="overview-budget-breakdown-rules">${filterRows}</div>
    <div class="overview-budget-breakdown-income" data-i18n="overviewNetFlowBreakdownFilterNote">${escapeHtml(t('overviewNetFlowBreakdownFilterNote'))}</div>`;
}

function renderOverviewBudgetBreakdown() {
  const popover = document.getElementById('overview-budget-breakdown');
  if (!popover) return;
  const metricKey = document.getElementById('overview-summary-metric')?.dataset.summaryMetric || 'remaining-budget';
  const breakdown = metricKey === 'remaining-budget'
    ? getOverviewBudgetBreakdown(getAktuálneMonth(), getAppCurrency(), true)
    : getOverviewCashflowBreakdown(getAktuálneMonth(), getAppCurrency());
  if (metricKey === 'daily-average') {
    renderOverviewDailyAverageBreakdown(popover, breakdown);
    return;
  }
  if (metricKey === 'net-flow') {
    renderOverviewNetFlowBreakdown(popover, breakdown);
    return;
  }
  const amount = value => escapeHtml(formatOverviewBudgetBreakdownAmount(value, breakdown.currency));
  const signedAmount = value => escapeHtml(formatOverviewBudgetBreakdownAmount(value, breakdown.currency, true));

  const excludedRows = getOverviewSpendingExclusionRows(breakdown, amount);

  popover.innerHTML = `
    <div class="overview-budget-breakdown-title" data-i18n="overviewBudgetBreakdownTitle">${escapeHtml(t('overviewBudgetBreakdownTitle'))}</div>
    <div class="overview-budget-breakdown-formula" data-i18n="overviewBudgetBreakdownFormula">${escapeHtml(t('overviewBudgetBreakdownFormula'))}</div>
    <div class="overview-budget-breakdown-totals">
      <div><span data-i18n="overviewBudgetBreakdownLimits">${escapeHtml(t('overviewBudgetBreakdownLimits'))}</span><strong>${amount(breakdown.limit)}</strong></div>
      <div><span data-i18n="overviewBudgetBreakdownSpent">${escapeHtml(t('overviewBudgetBreakdownSpent'))}</span><strong>−${amount(breakdown.spent)}</strong></div>
      <div class="overview-budget-breakdown-result"><span data-i18n="overviewBudgetBreakdownRemaining">${escapeHtml(t('overviewBudgetBreakdownRemaining'))}</span><strong class="${breakdown.remaining < 0 ? 'is-negative' : 'is-positive'}">${signedAmount(breakdown.remaining)}</strong></div>
    </div>
    <button class="overview-budget-breakdown-cta" type="button" onclick="openOverviewBudgetDetailsFromBreakdown(event)">
      <span data-i18n="overviewBudgetBreakdownViewBankBudgets">${escapeHtml(t('overviewBudgetBreakdownViewBankBudgets'))}</span>
      <span aria-hidden="true">→</span>
    </button>
    <div class="overview-budget-breakdown-section" data-i18n="overviewBudgetBreakdownExcluded">${escapeHtml(t('overviewBudgetBreakdownExcluded'))}</div>
    <div class="overview-budget-breakdown-rules">${excludedRows}</div>
    <div class="overview-budget-breakdown-income" data-i18n="overviewBudgetBreakdownIncomeNote">${escapeHtml(t('overviewBudgetBreakdownIncomeNote'))}</div>`;
}

function ensureOverviewBudgetBreakdownPortal() {
  const popover = document.getElementById('overview-budget-breakdown');
  if (popover && popover.parentElement !== document.body) {
    document.body.appendChild(popover);
  }
  return popover;
}

function openOverviewBudgetBreakdown(pinned = false) {
  const item = document.getElementById('overview-summary-metric');
  const popover = ensureOverviewBudgetBreakdownPortal();
  const supportedMetrics = ['daily-average', 'net-flow', 'remaining-budget'];
  if (!item || !popover || !supportedMetrics.includes(item.dataset.summaryMetric)) return;
  renderOverviewBudgetBreakdown();
  if (pinned) item.__overviewBudgetBreakdownPinned = true;
  item.classList.add('budget-breakdown-open');
  popover.classList.add('is-open');
  item.setAttribute('aria-expanded', 'true');
  popover.setAttribute('aria-hidden', 'false');
  window.requestAnimationFrame(positionOverviewBudgetBreakdown);
}

function closeOverviewBudgetBreakdown(force = false) {
  const item = document.getElementById('overview-summary-metric');
  const popover = document.getElementById('overview-budget-breakdown');
  if (!item || !popover) return;
  if (!force && item.__overviewBudgetBreakdownPinned) return;
  item.__overviewBudgetBreakdownPinned = false;
  item.classList.remove('budget-breakdown-open');
  popover.classList.remove('is-open');
  item.setAttribute('aria-expanded', 'false');
  popover.setAttribute('aria-hidden', 'true');
}

function positionOverviewBudgetBreakdown() {
  const item = document.getElementById('overview-summary-metric');
  const info = document.getElementById('overview-budget-info-dot');
  const popover = document.getElementById('overview-budget-breakdown');
  if (!item || !popover || !popover.classList.contains('is-open')) return;
  const anchorElement = info && !info.hidden ? info : item;
  const anchor = anchorElement.getBoundingClientRect();
  const viewportWidth = Math.max(0, window.innerWidth || document.documentElement.clientWidth || 0);
  const viewportHeight = Math.max(0, window.innerHeight || document.documentElement.clientHeight || 0);
  const popoverWidth = Math.max(1, popover.offsetWidth || 0);
  const popoverHeight = Math.max(1, popover.offsetHeight || 0);
  const edge = 12;
  const gap = 10;
  const anchorCenter = anchor.left + anchor.width / 2;
  const maxLeft = Math.max(edge, viewportWidth - popoverWidth - edge);
  const left = Math.min(maxLeft, Math.max(edge, anchorCenter - popoverWidth / 2));
  const belowTop = anchor.bottom + gap;
  const aboveTop = anchor.top - popoverHeight - gap;
  const opensAbove = belowTop + popoverHeight > viewportHeight - edge && aboveTop >= edge;
  const maxTop = Math.max(edge, viewportHeight - popoverHeight - edge);
  const top = Math.min(maxTop, Math.max(edge, opensAbove ? aboveTop : belowTop));
  const arrowX = Math.min(popoverWidth - 16, Math.max(16, anchorCenter - left));
  popover.dataset.placement = opensAbove ? 'top' : 'bottom';
  popover.style.setProperty('--overview-budget-arrow-x', `${Math.round(arrowX)}px`);
  popover.style.left = `${Math.round(left)}px`;
  popover.style.top = `${Math.round(top)}px`;
}

function cancelOverviewBudgetBreakdownClose() {
  const item = document.getElementById('overview-summary-metric');
  if (!item?.__overviewBudgetCloseTimer) return;
  window.clearTimeout(item.__overviewBudgetCloseTimer);
  item.__overviewBudgetCloseTimer = null;
}

function scheduleOverviewBudgetBreakdownClose() {
  const item = document.getElementById('overview-summary-metric');
  if (!item || item.__overviewBudgetBreakdownPinned) return;
  cancelOverviewBudgetBreakdownClose();
  item.__overviewBudgetCloseTimer = window.setTimeout(() => {
    item.__overviewBudgetCloseTimer = null;
    closeOverviewBudgetBreakdown(false);
  }, 140);
}

function startOverviewBudgetBreakdownHold(event) {
  const item = document.getElementById('overview-summary-metric');
  if (!item || item.dataset.summaryMetric !== 'remaining-budget' || event?.pointerType === 'mouse') return;
  if (event?.button != null && event.button !== 0) return;
  if (item.__overviewBudgetHoldTimer) window.clearTimeout(item.__overviewBudgetHoldTimer);
  item.__overviewBudgetHoldTimer = window.setTimeout(() => {
    item.__overviewBudgetHoldTimer = null;
    item.dataset.suppressSummaryClickUntil = String(Date.now() + 700);
    openOverviewBudgetBreakdown(true);
    try { if (navigator.vibrate) navigator.vibrate(18); } catch (_) {}
  }, 420);
}

function cancelOverviewBudgetBreakdownHold() {
  const item = document.getElementById('overview-summary-metric');
  if (!item?.__overviewBudgetHoldTimer) return;
  window.clearTimeout(item.__overviewBudgetHoldTimer);
  item.__overviewBudgetHoldTimer = null;
}

function handleOverviewSummaryMetricClick(event) {
  const item = document.getElementById('overview-summary-metric');
  const suppressUntil = Number(item?.dataset.suppressSummaryClickUntil || 0);
  if (suppressUntil > Date.now()) {
    event?.preventDefault();
    event?.stopPropagation();
    return;
  }
  closeOverviewBudgetBreakdown(true);
  cycleOverviewSummaryMetric();
}

function handleOverviewBudgetInfoClick(event) {
  event?.preventDefault();
  event?.stopPropagation();
  openOverviewBudgetBreakdown(true);
}

function openOverviewBudgetDetailsFromBreakdown(event) {
  event?.preventDefault();
  event?.stopPropagation();
  closeOverviewBudgetBreakdown(true);
  openOverviewDetailsSection('bank-budget-anchor');
}

function ensureOverviewBudgetBreakdownInteractions() {
  const item = document.getElementById('overview-summary-metric');
  if (!item || item.__overviewBudgetInteractionsReady) return;
  const info = document.getElementById('overview-budget-info-dot');
  const popover = ensureOverviewBudgetBreakdownPortal();
  item.__overviewBudgetInteractionsReady = true;
  if (info && !info.__overviewBudgetInteractionsReady) {
    info.__overviewBudgetInteractionsReady = true;
    info.addEventListener('mouseenter', () => { cancelOverviewBudgetBreakdownClose(); openOverviewBudgetBreakdown(false); });
    info.addEventListener('mouseleave', scheduleOverviewBudgetBreakdownClose);
    info.addEventListener('focus', () => openOverviewBudgetBreakdown(false));
    info.addEventListener('blur', scheduleOverviewBudgetBreakdownClose);
  }
  if (popover && !popover.__overviewBudgetInteractionsReady) {
    popover.__overviewBudgetInteractionsReady = true;
    popover.addEventListener('mouseenter', cancelOverviewBudgetBreakdownClose);
    popover.addEventListener('mouseleave', scheduleOverviewBudgetBreakdownClose);
  }
  if (!document.__overviewBudgetOutsideListenerReady) {
    document.__overviewBudgetOutsideListenerReady = true;
    document.addEventListener('pointerdown', event => {
      const current = document.getElementById('overview-summary-metric');
      const currentPopover = document.getElementById('overview-budget-breakdown');
      if (current && !current.contains(event.target) && !currentPopover?.contains(event.target)) closeOverviewBudgetBreakdown(true);
    }, true);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeOverviewBudgetBreakdown(true);
    });
    window.addEventListener('resize', positionOverviewBudgetBreakdown, { passive: true });
    window.addEventListener('scroll', positionOverviewBudgetBreakdown, { passive: true, capture: true });
  }
}

function getOverviewSummaryMetrics() {
  const month = normalizeMonthStr(getAktuálneMonth());
  const currency = getAppCurrency() || 'CZK';
  const budgetBreakdown = getOverviewBudgetBreakdown(month, currency);
  const cashflowBreakdown = getOverviewCashflowBreakdown(month, currency);
  const spent = Math.max(0, Number(cashflowBreakdown.spent || 0) || 0);
  const income = Math.max(0, Number(cashflowBreakdown.income || 0) || 0);
  const budgetSpent = Math.max(0, Number(budgetBreakdown.spent || 0) || 0);
  const budgetLimit = Math.max(0, Number(budgetBreakdown.limit || 0) || 0);

  return [
    {
      key: 'daily-average',
      labelKey: 'overviewSummaryDailyAverage',
      value: spent / getOverviewSummaryDayCount(month),
      currency,
      available: true
    },
    {
      key: 'net-flow',
      labelKey: 'overviewSummaryNetFlow',
      value: income - spent,
      currency,
      available: true
    },
    {
      key: 'remaining-budget',
      labelKey: 'overviewSummaryRemainingBudget',
      value: budgetLimit - budgetSpent,
      currency,
      available: budgetLimit > 0
    }
  ];
}

function renderOverviewSummaryMetric() {
  const metrics = getOverviewSummaryMetrics();
  const safeIndex = ((Number(overviewSummaryMetricIndex || 0) % metrics.length) + metrics.length) % metrics.length;
  const metric = metrics[safeIndex];
  const label = document.getElementById('overview-summary-metric-label');
  const value = document.getElementById('sum-amount');
  const full = document.getElementById('sum-amount-full');
  const item = document.getElementById('overview-summary-metric');
  const infoDot = document.getElementById('overview-budget-info-dot');
  const fullValueText = metric.available
    ? formatOverviewTopAmountFull(metric.value, metric.currency)
    : t('budgetNotSet');
  const remainingBudgetSubKey = metric.value < 0
    ? 'overviewSummaryOverBudget'
    : 'overviewSummaryBudgetRemaining';
  if (label) {
    label.setAttribute('data-i18n', metric.labelKey);
    label.textContent = t(metric.labelKey);
  }
  if (value) value.textContent = metric.available ? formatOverviewTopAmount(metric.value) : '—';
  if (full) {
    if (metric.key === 'remaining-budget' && metric.available) {
      full.setAttribute('data-i18n', remainingBudgetSubKey);
      full.textContent = t(remainingBudgetSubKey);
    } else {
      full.removeAttribute('data-i18n');
      full.textContent = fullValueText;
    }
  }
  if (infoDot) {
    const breakdownHintKey = getOverviewMetricBreakdownHintKey(metric.key);
    infoDot.hidden = false;
    infoDot.classList.add('is-visible');
    infoDot.parentElement?.classList.add('has-metric-info');
    infoDot.setAttribute('data-i18n-title', breakdownHintKey);
    infoDot.setAttribute('data-i18n-aria-label', breakdownHintKey);
    infoDot.setAttribute('title', t(breakdownHintKey));
    infoDot.setAttribute('aria-label', t(breakdownHintKey));
  }
  if (item) {
    item.dataset.summaryMetric = metric.key;
    item.dataset.summaryState = !metric.available
      ? 'unavailable'
      : (metric.value < 0 ? 'negative' : 'positive');
    const breakdownHint = ` ${t(getOverviewMetricBreakdownHintKey(metric.key))}`;
    item.setAttribute('aria-label', `${t(metric.labelKey)}: ${fullValueText}. ${t('overviewSummaryCycleTitle')}.${breakdownHint}`);
    item.setAttribute('aria-haspopup', 'true');
    item.setAttribute('aria-describedby', 'overview-budget-breakdown');
    if (item.classList.contains('budget-breakdown-open')) renderOverviewBudgetBreakdown();
  }
  ensureOverviewBudgetBreakdownInteractions();
}

function cycleOverviewSummaryMetric() {
  overviewSummaryMetricIndex = (Number(overviewSummaryMetricIndex || 0) + 1) % 3;
  renderOverviewSummaryMetric();
  const item = document.getElementById('overview-summary-metric');
  if (!item || reduceMotionCheck()) return;
  item.classList.remove('summary-metric-changing');
  void item.offsetWidth;
  item.classList.add('summary-metric-changing');
  window.setTimeout(() => item.classList.remove('summary-metric-changing'), 220);
}

function updateOverviewSummaryStrip(totalMonthSpent, monthAllTxnsCount) {
  const sumTxns = document.getElementById('sum-txns');
  if (sumTxns) sumTxns.textContent = monthAllTxnsCount;
  renderOverviewSummaryMetric();
  const sumDays = document.getElementById('sum-days');
  if (sumDays) sumDays.textContent = getDaysRemaining();
  const progressFill = document.getElementById('sum-days-progress-fill');
  if (progressFill) {
    progressFill.style.width = Math.round(getOverviewMonthElapsedRatio() * 100) + '%';
  }
}

function hasTransactionsForMonth(monthStr) {
  return allTransactions.some(t => normalizeMonthStr(t.month) === normalizeMonthStr(monthStr));
}

function shiftOverviewMonth(delta) {
  if (overviewMonthShiftInFlight) return;
  const requested = activeOverviewMonthOffset + Number(delta || 0);
  let nextOffset = requested;
  if (requested > 0) {
    nextOffset = 0;
  } else if (Number(delta || 0) < 0) {
    const targetMonth = addMonthsToMonthStr(getAktuálneMonth(), Number(delta || 0));
    if (!hasTransactionsForMonth(targetMonth)) return;
  }

  overviewMonthShiftInFlight = true;
  activeOverviewMonthOffset = nextOffset;
  const finishShift = () => { overviewMonthShiftInFlight = false; };
  if (activePageId === 'overview') {
    requestAnimationFrame(() => {
      try { renderOverviewAfterMonthShift(); }
      finally { finishShift(); }
    });
  } else {
    try { renderOverviewAfterMonthShift(); }
    finally { finishShift(); }
  }
}

function updateOverviewMonthNavState() {
  const currentMonth = getAktuálneMonth();
  const prevBtn = document.getElementById('overview-month-prev');
  const nextBtn = document.getElementById('overview-month-next');
  const prevMonth = addMonthsToMonthStr(currentMonth, -1);
  if (prevBtn) prevBtn.disabled = !hasTransactionsForMonth(prevMonth);
  if (nextBtn) nextBtn.disabled = activeOverviewMonthOffset >= 0;
}

function getSelectedPlan() {
  return localStorage.getItem('selected_plan') || 'free';
}

function updateUpgradePlanStatus() {
  const plan = getSelectedPlan();
  const pill = document.getElementById('upgrade-current-pill');
  const text = document.getElementById('upgrade-plan-status-text');
  const freeBadge = document.getElementById('upgrade-free-badge');
  const premiumBadge = document.getElementById('upgrade-premium-badge');
  const proBadge = document.getElementById('upgrade-pro-badge');
  if (freeBadge) freeBadge.style.display = plan === 'free' ? 'inline-flex' : 'none';
  if (premiumBadge) premiumBadge.style.display = plan === 'premium' ? 'inline-flex' : 'none';
  if (proBadge) proBadge.style.display = plan === 'pro' ? 'inline-flex' : 'none';
  if (pill) pill.textContent = plan === 'premium' ? 'Premium' : plan === 'pro' ? 'Pro' : 'Free';
  if (text) {
    if (plan === 'premium') text.textContent = t('upgradePageSubPremium');
    else if (plan === 'pro') text.textContent = t('upgradePageSubPro');
    else text.textContent = t('upgradePageSub');
  }
}

function getMonthLabel() {
  return getAktuálneMonth();
}

function formatMonthString(monthYearStr) {
  return normalizeMonthStr(monthYearStr);
}

function bankLogoImg(bankKey, className = 'bank-logo-mini') {
  const logo = BANK_LOGOS[bankKey];
  if (!logo) return '';
  if (!logo.src) {
    const label = String(logo.text || logo.alt || bankKey || '').trim();
    return `<span class="${className} bank-logo-text" aria-label="${escapeAttr(logo.alt || label)}">${escapeHtml(label.slice(0, 1))}</span>`;
  }
  return `<img class="${className}" src="${logo.src}" alt="${logo.alt}" loading="lazy">`;
}

function bankLabelWithLogo(bankKey) {
  const bank = getBankInfo(bankKey);
  return `<span class="bank-name-with-logo">${bankLogoImg(bankKey)}<span>${bank.label}</span></span>`;
}

function bankShortWithLogo(bankKey) {
  const bank = getBankInfo(bankKey);
  return `<span class="bank-name-with-logo">${bankLogoImg(bankKey)}<span>${bank.label}</span></span>`;
}


function getStoredSystemBankAccount(bankKey) {
  const custom = getCustomBanks().find(b => b && b.id === bankKey);
  return cleanBankAccountValue(custom?.account || localStorage.getItem('bank_account_' + bankKey) || '');
}

function getStoredSystemBankCards(bankKey, options = {}) {
  const includeCreditChild = options.includeCreditChild !== false;
  const values = [];
  const addCards = (raw) => {
    cleanBankCardsValue(raw).split(',').map(v => v.trim()).filter(Boolean).forEach(v => {
      const last4 = String(v || '').replace(/\D/g, '').slice(-4);
      if (last4 && !values.includes(last4)) values.push(last4);
    });
  };
  const custom = getCustomBanks().find(b => b && b.id === bankKey);
  addCards(custom?.cards || localStorage.getItem('bank_cards_' + bankKey) || getBankInfo(bankKey)?.cards || '');
  if (bankKey === 'csob_cz' && includeCreditChild) {
    const credit = getCustomBanks().find(b => b && b.id === 'csob_cz_credit');
    addCards(credit?.cards || localStorage.getItem('bank_cards_csob_cz_credit') || '');
  }
  return values;
}

function getStoredBankIdentifierText(bankKey) {
  return [
    getStoredSystemBankAccount(bankKey),
    getStoredSystemBankCards(bankKey).join(' '),
    localStorage.getItem('bank_cards_' + bankKey) || '',
    localStorage.getItem('bank_account_' + bankKey) || ''
  ].join(' ').toLowerCase();
}

function textContainsAnyIdentifier(text, identifiers) {
  const hay = String(text || '').toLowerCase();
  return (identifiers || []).some(v => {
    const needle = String(v || '').trim().toLowerCase();
    return needle && hay.includes(needle);
  });
}

function getTrackedBankAccountIdentifiers() {
  const ids = [];
  const add = (raw) => {
    const account = cleanBankAccountValue(raw || '');
    if (!account) return;
    const lower = account.toLowerCase();
    if (!ids.includes(lower)) ids.push(lower);
    const digits = lower.replace(/\D/g, '');
    if (digits.length >= 6 && !ids.includes(digits)) ids.push(digits);
  };

  (BANK_ORDER || []).forEach(bankKey => {
    if (bankKey === 'csob_cz_credit') return;
    add(getStoredSystemBankAccount(bankKey));
  });
  (getCustomBanks() || []).forEach(bank => {
    if (!bank || bank.active === false) return;
    add(bank.account || '');
  });
  return ids;
}

function getCsobCzCreditCardLast4() {
  const fromCreditRow = getStoredSystemBankCards('csob_cz_credit', { includeCreditChild: false })[0] || '';
  if (fromCreditRow) return fromCreditRow;
  const custom = getCustomBanks().find(b => b && b.id === 'csob_cz_credit');
  const explicit = cleanBankCardsValue(custom?.cardLast4 || localStorage.getItem('bank_card_last4_csob_cz_credit') || '').split(',')[0] || '';
  return explicit;
}

function getVisibleCardsForBank(bankKey) {
  return getStoredSystemBankCards(bankKey, { includeCreditChild: true });
}

function plainBankName(bankKey) {
  const names = {
    rb_cz: 'RB CZ',
    csob_sk: 'ČSOB SK',
    csob_cz: 'ČSOB CZ',
    csob_cz_credit: 'CSOB CZ credit card',
    moneta: 'Moneta',
    air_bank_cz: 'Air Bank',
    pluxee: 'Pluxee'
  };
  return names[bankKey] || 'Banka';
}


function getLimitsForMonth(monthStr) {
  const saved = limitsHistory[monthStr] || {};
  return {
    rbCz: saved.rbCz ?? saved.rb ?? RB_LIMIT,
    csobSk: saved.csobSk ?? saved.csob ?? CSOB_LIMIT,
    csobCz: saved.csobCz ?? 5,
    moneta: saved.moneta ?? 0,
    airBankCz: saved.airBankCz ?? 0,
    pluxee: saved.pluxee ?? 0
  };
}

function getMonthlyCardLimitStorageKey(bankKey, monthStr = getAktuálneMonth()) {
  return 'bank_card_limit_' + String(bankKey || '').trim() + '_' + normalizeMonthStr(monthStr || getAktuálneMonth());
}

function setMonthlyCardLimitForBank(bankKey, limit, monthStr = getAktuálneMonth()) {
  const id = String(bankKey || '').trim();
  if (!id) return false;
  const numeric = Number(limit || 0) || 0;
  localStorage.setItem(getMonthlyCardLimitStorageKey(id, monthStr), String(numeric));
  return true;
}

function getMonthlyCardLimitForBank(bankKey, monthStr = getAktuálneMonth()) {
  const id = String(bankKey || '').trim();
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const explicit = localStorage.getItem(getMonthlyCardLimitStorageKey(id, month));
  if (explicit !== null) return Number(explicit || 0) || 0;

  const bank = getBankInfo(id);
  const limits = getLimitsForMonth(month);
  if (bank && bank.limitKey) return Number(limits[bank.limitKey] ?? bank.defaultLimit ?? 0) || 0;

  const custom = getCustomBanks().find(b => b && b.id === id);
  return Number(custom?.cardLimit || custom?.limit || 0) || 0;
}

function getCreditCardLimitStorageKey(bankKey = 'csob_cz_credit', monthStr = getAktuálneMonth()) {
  return 'bank_credit_card_limit_' + String(bankKey || 'csob_cz_credit').trim() + '_' + normalizeMonthStr(monthStr || getAktuálneMonth());
}

function setCreditCardLimitForBank(bankKey, limit, monthStr = getAktuálneMonth()) {
  const id = String(bankKey || 'csob_cz_credit').trim();
  if (!id) return false;
  const numeric = Number(limit || 0) || 0;
  localStorage.setItem(getCreditCardLimitStorageKey(id, monthStr), String(numeric));
  return true;
}

function getCreditCardLimitForBank(bankKey = 'csob_cz_credit', monthStr = getAktuálneMonth()) {
  const id = String(bankKey || 'csob_cz_credit').trim();
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const testSetting = getLocalTestOverviewBankSetting(id, month);
  if (testSetting && testSetting.creditCardLimit !== undefined) return Number(testSetting.creditCardLimit || 0) || 0;
  const explicit = localStorage.getItem(getCreditCardLimitStorageKey(id, month));
  if (explicit !== null) return Number(explicit || 0) || 0;
  const legacy = localStorage.getItem('bank_credit_card_limit_' + id);
  if (legacy !== null) return Number(legacy || 0) || 0;
  const custom = getCustomBanks().find(b => b && b.id === id);
  return Number(custom?.creditCardLimit || custom?.creditLimit || 0) || 0;
}


function getMonthFromDate(dateObj) {
  return `${String(dateObj.getMonth()+1).padStart(2,'0')}/${dateObj.getFullYear()}`;
}

function ensureLimitHistoryForMonth(monthStr) {
  const existing = limitsHistory[monthStr] || {};
  limitsHistory[monthStr] = {
    rbCz: existing.rbCz ?? existing.rb ?? RB_LIMIT,
    csobSk: existing.csobSk ?? existing.csob ?? CSOB_LIMIT,
    csobCz: existing.csobCz ?? 5,
    moneta: existing.moneta ?? 0,
    airBankCz: existing.airBankCz ?? 0,
    pluxee: existing.pluxee ?? 0
  };
  return limitsHistory[monthStr];
}

function normalizeMonthStr(monthStr) {
  const value = String(monthStr || '').trim();
  const match = value.match(/^(\d{1,2})\/(\d{4})$/);
  if (!match) return getAktuálneMonth();
  return `${String(parseInt(match[1], 10)).padStart(2,'0')}/${match[2]}`;
}

function getMonthDisplayShort(monthStr) {
  return normalizeMonthStr(monthStr);
}

function monthSortValue(monthStr) {
  const [m, y] = normalizeMonthStr(monthStr).split('/').map(Number);
  return y * 12 + m;
}

function addMonthsToMonthStr(monthStr, offset) {
  const [m, y] = normalizeMonthStr(monthStr).split('/').map(Number);
  const d = new Date(y, m - 1 + offset, 1, 12, 0);
  return getMonthFromDate(d);
}

function getSimulatorLimitMonth() {
  const select = document.getElementById('sim-limit-month');
  return normalizeMonthStr(select?.value || getAktuálneMonth());
}

function populateSimulatorLimitMonthDropdown(selectedMonth) {
  const select = document.getElementById('sim-limit-month');
  if (!select) return;
  const current = getAktuálneMonth();
  const selected = normalizeMonthStr(selectedMonth || select.value || current);
  const months = new Set([current, selected]);
  allTransactions.forEach(t => { if (t.month) months.add(normalizeMonthStr(t.month)); });
  Object.keys(limitsHistory || {}).forEach(m => months.add(normalizeMonthStr(m)));
  for (let i = -18; i <= 18; i++) months.add(addMonthsToMonthStr(current, i));
  const sorted = [...months].sort((a, b) => monthSortValue(b) - monthSortValue(a));
  select.innerHTML = sorted.map(m => `<option value="${m}">${getMonthDisplayShort(m)}</option>`).join('');
  select.value = selected;
}



function fillSimulatorLimitInputs(monthStr) {
  const hist = getLimitsForMonth(monthStr);
  const map = {
    'sim-limit-rb': hist.rbCz,
    'sim-limit-csob-sk': hist.csobSk,
    'sim-limit-csob': hist.csobSk,
    'sim-limit-csob-cz': hist.csobCz,
    'sim-limit-moneta': hist.moneta
  };
  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}


function getSettingsLimitMonth() {
  const select = document.getElementById('settings-limit-month');
  return normalizeMonthStr(select?.value || getAktuálneMonth());
}

function populateSettingsLimitMonthDropdown(selectedMonth) {
  const select = document.getElementById('settings-limit-month');
  if (!select) return;
  const current = getAktuálneMonth();
  const selected = normalizeMonthStr(selectedMonth || select.value || current);
  const months = new Set([current, selected]);
  allTransactions.forEach(t => { if (t.month) months.add(normalizeMonthStr(t.month)); });
  Object.keys(limitsHistory || {}).forEach(m => months.add(normalizeMonthStr(m)));
  for (let i = -18; i <= 18; i++) months.add(addMonthsToMonthStr(current, i));
  const sorted = [...months].sort((a, b) => monthSortValue(b) - monthSortValue(a));
  select.innerHTML = sorted.map(m => `<option value="${m}">${getMonthDisplayShort(m)}</option>`).join('');
  select.value = selected;
}

function handleSettingsLimitMonthChange() {
  fillSettingsLimitInputs(getSettingsLimitMonth());
}

function fillSettingsLimitInputs(monthStr) {
  const hist = getLimitsForMonth(monthStr);
  const map = {
    'rb-limit': hist.rbCz,
    'csob-limit': hist.csobSk,
    'csob-cz-limit': hist.csobCz,
    'moneta-limit': hist.moneta
  };
  Object.entries(map).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}

function readSettingsLimitInputs() {
  return {
    rbCz: parseInt(document.getElementById('rb-limit')?.value, 10),
    csobSk: parseInt(document.getElementById('csob-limit')?.value, 10),
    csobCz: parseInt(document.getElementById('csob-cz-limit')?.value, 10),
    moneta: parseInt(document.getElementById('moneta-limit')?.value, 10)
  };
}

async function syncLimitsToGoogleSheets(monthStr, limits) {
  // Deprecated: Limity tab is no longer used.
  // Card limits are written only via saveBankSettingsEndpoint from Manage banks / Add bank.
  const status = document.getElementById('limits-sync-status');
  if (status) status.textContent = 'Limity sa už neposielajú do starého tabu. Zdroj pravdy je Bank_Settings.';
  return false;
}


function saveLimitsForMonth(monthStr, limits) {
  const existing = ensureLimitHistoryForMonth(monthStr);
  limitsHistory[monthStr] = {
    rbCz: Number.isFinite(limits.rbCz) ? limits.rbCz : existing.rbCz,
    csobSk: Number.isFinite(limits.csobSk) ? limits.csobSk : existing.csobSk,
    csobCz: Number.isFinite(limits.csobCz) ? limits.csobCz : existing.csobCz,
    moneta: Number.isFinite(limits.moneta) ? limits.moneta : existing.moneta,
    airBankCz: Number.isFinite(limits.airBankCz) ? limits.airBankCz : existing.airBankCz,
    pluxee: Number.isFinite(limits.pluxee) ? limits.pluxee : existing.pluxee
  };
  localStorage.setItem('limits_history', JSON.stringify(limitsHistory));
}

function readLimitInputs() {
  return {
    rbCz: parseInt(document.getElementById('sim-limit-rb')?.value, 10),
    csobSk: parseInt(document.getElementById('sim-limit-csob-sk')?.value ?? document.getElementById('sim-limit-csob')?.value, 10),
    csobCz: parseInt(document.getElementById('sim-limit-csob-cz')?.value, 10),
    moneta: parseInt(document.getElementById('sim-limit-moneta')?.value, 10)
  };
}
async function saveSimulatorMesačneLimits() {
  const monthStr = getSimulatorLimitMonth();
  const limits = readLimitInputs();
  saveLimitsForMonth(monthStr, limits);
  await syncLimitsToGoogleSheets(monthStr, getLimitsForMonth(monthStr));
  alert(`Limity pre ${formatMonthString(monthStr)} boli uložené.`);
  renderAll();
  updatePushStatus();
}

function applySimulatorLimitsForMonth(monthStr) {
  const values = readLimitInputs();
  const hasAny = Object.values(values).some(Number.isFinite);
  if (hasAny) saveLimitsForMonth(monthStr, values);
  else {
    ensureLimitHistoryForMonth(monthStr);
    localStorage.setItem('limits_history', JSON.stringify(limitsHistory));
  }
}


function isAirBankLikeValue(value) {
  const text = String(value || '').toLowerCase();
  return text.includes('air bank') || text.includes('airbank');
}

function canonicalBankIdFromSheetRow(id, name, account) {
  const rawId = String(id || '').trim();
  if (rawId === 'csob_cz_credit') return 'csob_cz_credit';
  if (rawId === 'air_bank_cz' || isAirBankLikeValue(name) || isAirBankLikeValue(account)) return 'air_bank_cz';
  if (rawId === 'pluxee' || String(name || '').toLowerCase().includes('pluxee') || String(name || '').toLowerCase().includes('stravenk')) return 'pluxee';
  return rawId;
}

function getBankKey(t) {
  const rawId = String(t?.bankId || t?.bankID || '').trim();
  if (rawId && BANKS[rawId]) return rawId;

  const cardLower = String(t?.card || '').toLowerCase();
  const bankLower = String(t?.bank || t?.banka || '').toLowerCase();
  const merchantLower = String(t?.merchant || '').toLowerCase();
  const typeLower = String(t?.type || '').toLowerCase();
  const categoryLower = String(t?.category || '').toLowerCase();
  const combined = `${bankLower} ${cardLower} ${merchantLower} ${typeLower} ${categoryLower}`;

  const csobCreditCard = getCsobCzCreditCardLast4();
  const rbCards = getVisibleCardsForBank('rb_cz');
  const csobSkCards = getVisibleCardsForBank('csob_sk');
  const csobCzCards = getVisibleCardsForBank('csob_cz').filter(v => v !== csobCreditCard);
  const airIds = [getStoredSystemBankAccount('air_bank_cz'), ...getVisibleCardsForBank('air_bank_cz')].filter(Boolean);
  const pluxeeCards = getVisibleCardsForBank('pluxee');

  if (combined.includes('air bank') || combined.includes('airbank') || textContainsAnyIdentifier(cardLower, airIds)) return 'air_bank_cz';
  if (combined.includes('pluxee') || combined.includes('stravenk') || textContainsAnyIdentifier(cardLower, pluxeeCards)) return 'pluxee';
  if (combined.includes('csob cz credit card') || (csobCreditCard && cardLower.includes(csobCreditCard))) return 'csob_cz_credit';
  if ((combined.includes('kredit') || combined.includes('credit card')) && (combined.includes('splátka') || combined.includes('splatka') || combined.includes('repayment') || (csobCreditCard && combined.includes(csobCreditCard)))) return 'csob_cz_credit';
  if (combined.includes('csob cz') || combined.includes('čsob cz') || combined.includes('csob česk') || combined.includes('čsob česk') || textContainsAnyIdentifier(cardLower, csobCzCards) || textContainsAnyIdentifier(cardLower, [getStoredSystemBankAccount('csob_cz')])) return 'csob_cz';
  if (combined.includes('moneta')) return 'moneta';
  if (combined.includes('csob sk') || combined.includes('čsob sk') || combined.includes('csob slov') || combined.includes('čsob slov') || textContainsAnyIdentifier(cardLower, csobSkCards) || textContainsAnyIdentifier(cardLower, [getStoredSystemBankAccount('csob_sk')])) return 'csob_sk';
  if (combined.includes('raiffeisen') || combined.includes('rb cz') || textContainsAnyIdentifier(cardLower, rbCards) || textContainsAnyIdentifier(cardLower, [getStoredSystemBankAccount('rb_cz')])) return 'rb_cz';
  if (merchantLower.includes('sup. maj')) return 'csob_sk';
  return 'rb_cz';
}

function getBankInfo(key) {
  return BANKS[key] || BANKS.rb_cz;
}

function isCsobTransaction(t) { return getBankKey(t) === 'csob_sk'; }

function getBankStatusText(count, limit, monthStr) {
  const dict = I18N[getLanguage()] || I18N.en;

  if (!limit || limit <= 0) {
    return `<span class="archive-bank-status" style="color:#8fbfff;">${dict.noLimit}</span>`;
  }

  if (count >= limit) {
    return `<span class="archive-bank-status" style="color:var(--ok);">${dict.completed}</span>`;
  }

  const normalizedMonth = normalizeMonthStr(monthStr || '');
  const currentMonth = normalizeMonthStr(getAktuálneMonth());
  const label = normalizedMonth && normalizedMonth === currentMonth
    ? (dict.missingCurrent || 'Missing')
    : (dict.notCompleted || 'Missed');

  return `<span class="archive-bank-status" style="color:var(--danger);">${label}</span>`;
}

function getDaysRemaining(referenceDate = new Date(), monthStr = getAktuálneMonth()) {
  const currentDate = referenceDate instanceof Date ? referenceDate : new Date();
  const month = normalizeMonthStr(monthStr || getAktuálneMonth());
  const match = String(month || '').match(/^(\d{2})\/(\d{4})$/);
  if (!match) return 0;
  const selectedMonth = Number(match[1]);
  const selectedYear = Number(match[2]);
  const totalDays = getGregorianMonthLength(selectedYear, selectedMonth);
  const selectedIndex = selectedYear * 12 + selectedMonth;
  const currentIndex = currentDate.getFullYear() * 12 + currentDate.getMonth() + 1;
  if (selectedIndex < currentIndex) return 0;
  if (selectedIndex > currentIndex) return totalDays;
  // Dnešný deň sa počíta: 1. augusta zostáva 31, posledný deň zostáva 1.
  return Math.max(1, totalDays - currentDate.getDate() + 1);
}

function parseGSheetDate(val) {
  if (!val) return null;
  const m = String(val).match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+))?/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), m[4] ? parseInt(m[4]) : 0, m[5] ? parseInt(m[5]) : 0);
  return null;
}

function parseCustomDateStr(str) {
  if (!str) return new Date();
  try {
    const value = String(str).trim();
    if (!value) return new Date();

    // Podpora formátov:
    // 22.05.2026 11:18
    // 22.05.2026
    // 2026-05-22T11:18 / 2026-05-22 11:18
    const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2}))?/);
    if (isoMatch) {
      return new Date(
        parseInt(isoMatch[1], 10),
        parseInt(isoMatch[2], 10) - 1,
        parseInt(isoMatch[3], 10),
        isoMatch[4] ? parseInt(isoMatch[4], 10) : 12,
        isoMatch[5] ? parseInt(isoMatch[5], 10) : 0
      );
    }

    const skMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?/);
    if (skMatch) {
      return new Date(
        parseInt(skMatch[3], 10),
        parseInt(skMatch[2], 10) - 1,
        parseInt(skMatch[1], 10),
        skMatch[4] ? parseInt(skMatch[4], 10) : 12,
        skMatch[5] ? parseInt(skMatch[5], 10) : 0
      );
    }

    const fallback = new Date(value);
    return isNaN(fallback.getTime()) ? new Date() : fallback;
  } catch (e) {
    return new Date();
  }
}

function recalculateTransactionDateFields(t) {
  const parsedDate = parseCustomDateStr(t.date);
  const parsedTs = parsedDate.getTime();

  // Staršie demo/cache dáta mali timestamp 1000, 2000 atď.; tie potom padli až na spodok.
  // Preto timestamp vždy prerátame z textového dátumu, aby sa všetko radilo chronologicky.
  if (!isNaN(parsedTs)) {
    t.timestamp = parsedTs;
    t.month = getMonthFromDate(parsedDate);
    t.date = formatDate(parsedDate);
  }
  return t;
}

function sortTransactionsNewestFirst(txns) {
  return txns
    .map((tx) => {
      const row = recalculateTransactionDateFields(tx);
      return typeof normalizeTransactionRecurringFields === 'function'
        ? normalizeTransactionRecurringFields(row)
        : row;
    })
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}



function dedupeTransactionsForCloud(txns) {
  // Second-layer dedupe (Sheets remains source of truth; this cleans merge of
  // Transactions + Archive_Transactions + any local/cache rows before UI/totals).
  // Keep full msgId including ČSOB CZ suffixes (#csobcz-N) — those are distinct rows.
  const seen = new Set();
  const out = [];
  (txns || []).forEach((tx, index) => {
    if (!tx) return;
    const id = String(tx.msgId || tx.emailId || tx['Email ID'] || tx.id || '').trim();
    const vs = String(tx.vs || tx.variableSymbol || tx.reference || '').replace(/\D/g, '').trim();
    const fallbackKey = [
      tx.date || tx.rawDate || '',
      Number(tx.amount) || 0,
      tx.currency || '',
      tx.merchant || '',
      tx.card || '',
      tx.bank || '',
      vs
    ].join('|');
    const key = id && !/^demo/i.test(id) && !/^local-test/i.test(id)
      ? 'id:' + id
      : 'fb:' + fallbackKey;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ ...tx, id: id || tx.id || ('cloud_' + index), msgId: id || tx.msgId || tx.id || '' });
  });
  return out;
}

function clearDemoTransactionsCacheIfNeeded() {
  // Keep the last real cloud snapshot for instant startup, but remove old demo/test-only caches.
  try {
    localStorage.removeItem('demo_txns');
    localStorage.removeItem('test_txns');
    localStorage.removeItem('manual_demo_txns');
  } catch (e) {}
}

function clearCloudFirstLocalData() {
  // Keep user configuration and the last Google Sheets snapshot so the app can render instantly
  // before the fresh cloud sync finishes. Google Sheets remains the master after sync.
  try {
    localStorage.removeItem('demo_txns');
    localStorage.removeItem('test_txns');
    localStorage.removeItem('manual_demo_txns');
  } catch (e) {}
}

function normalizeTransactionCurrency(tx) {
  if (!tx) return tx;
  return {
    ...tx,
    currency: normalizeCurrencyForStorage(tx.currency || 'CZK')
  };
}


function loadCachedTransactionsSnapshot() {
  try {
    const cached = JSON.parse(localStorage.getItem('cached_txns') || '[]');
    if (!Array.isArray(cached) || !cached.length) return false;
    allTransactions = sortTransactionsNewestFirst(
      dedupeTransactionsForCloud(cached.map(tx => normalizeTransactionCurrency(tx)))
    );
    return true;
  } catch (e) {
    console.warn('Cached transactions snapshot could not be loaded:', e);
    return false;
  }
}

function getLocalCacheTimestamp(key) {
  try {
    const ts = Number(localStorage.getItem(key) || 0);
    return Number.isFinite(ts) && ts > 0 ? ts : 0;
  } catch (_) {
    return 0;
  }
}

function isLocalCacheFresh(key, ttlMs = LOCAL_PRECOMPUTE_CACHE_TTL_MS) {
  const ts = getLocalCacheTimestamp(key);
  if (!ts) return false;
  return (Date.now() - ts) < ttlMs;
}

function markLocalCacheTimestamp(key) {
  try { localStorage.setItem(key, String(Date.now())); } catch (_) {}
}

function shouldSkipStartupCloudSync() {
  return false;
}

function markCloudSyncCompleted() {
  const completedAt = Date.now();
  try { localStorage.setItem('cached_cloud_sync_at', String(completedAt)); } catch (_) {}
  try { localStorage.setItem('bank_tracker_last_sync_v1', String(completedAt)); } catch (_) {}
  try { if (typeof window.btRenderLastSyncV5200 === 'function') window.btRenderLastSyncV5200(); } catch (_) {}
}

function saveCachedTransactionsSnapshot() {
  try {
    localStorage.setItem('cached_txns', JSON.stringify(allTransactions || []));
    localStorage.setItem('cached_txns_updated_at', String(Date.now()));
  } catch (e) {
    console.warn('Cached transactions snapshot could not be saved:', e);
  }
}

function formatDate(d) {
  if (!d) return '';
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function parseAmountValue(value) {
  if (typeof value === 'number') return value;
  if (value === null || value === undefined) return 0;

  // Google Sheets niekedy vráti sumu ako text: -2 000,00 alebo -1 559,50.
  // Odstránime medzery vrátane NBSP a desatinnú čiarku prevedieme na bodku.
  const normalized = String(value)
    .replace(/[\s\u00A0\u202F]/g, '')
    .replace(/,/g, '.')
    .replace(/[^0-9.\-]/g, '');

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
}

function formatMoney(amount, currency) {
  const curr = currencyCode(currency || getAppCurrency() || 'Kč');
  const value = Math.abs(Number(amount) || 0).toLocaleString('cs-CZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return value;
}

function getCurrencySymbol(currency) {
  return currencySymbol(currency || 'Kč');
}

function formatCurrencyAmount(amount, currency) {
  const value = formatMoney(amount, currency).replace(/\s/g, ' ');
  const symbol = currencySymbol(currency || getAppCurrency() || 'Kč');
  if (symbol === '$' || symbol === '£') return `${symbol}${value}`;
  return `${value} ${symbol}`;
}


function formatSignedCurrencyAmount(amount, currency) {
  const numeric = Number(amount || 0);
  const sign = numeric < 0 ? '-' : '';
  return sign + formatCurrencyAmount(Math.abs(numeric), currency);
}

function getSignedAmountClass(value) {
  const numeric = Number(value || 0);
  if (numeric < 0) return 'amount-expense';
  if (numeric > 0) return 'amount-income';
  return '';
}

function getTransactionAccountCurrency(tx) {
  const bankKey = getBankKey(tx);
  const bankCurrency = getBankBalanceCurrency(bankKey) || getBankInfo(bankKey)?.primaryCurrency || tx?.currency || getAppCurrency() || 'CZK';
  return currencyCode(bankCurrency);
}

function shouldShowAccountCurrencyEquivalent(tx) {
  if (!tx) return false;
  const txCurrency = currencyCode(tx.currency || getAppCurrency() || 'CZK');
  const accountCurrency = getTransactionAccountCurrency(tx);
  if (!txCurrency || !accountCurrency || txCurrency === accountCurrency) return false;
  // Especially important for EUR accounts such as ČSOB SK where card tx can arrive in CZK.
  return true;
}

function renderAccountCurrencyEquivalent(tx, options = {}) {
  if (!shouldShowAccountCurrencyEquivalent(tx)) return '';
  const accountCurrency = getTransactionAccountCurrency(tx);
  const converted = convertTransactionAmount(tx, accountCurrency);
  const isIncome = Number(tx.amount) > 0;
  const sign = isIncome ? '+' : '-';
  const cls = isIncome ? 'amount-income' : 'amount-expense';
  const compact = options.compact === true;
  const label = '';
  const className = compact ? 'tx-account-equivalent-compact' : 'tx-account-equivalent';
  return `<div class="${className} ${cls}" title="Account currency: ${escapeAttr(accountCurrency)}">${label}${sign}${formatCurrencyAmount(converted, accountCurrency)}</div>`;
}

function getArchiveBankCurrency(bankKey) {
  const currency = getBankBalanceCurrency(bankKey) || getArchiveBankInfo(bankKey)?.primaryCurrency || 'CZK';
  return currencyCode(currency);
}

function formatFxDateShort(dateStr) {
  const value = String(dateStr || '').trim();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  return `${Number(match[3])}.${Number(match[2])}.${String(match[1]).slice(-2)}`;
}

function updateAccountBalanceFxBadge() {
  const badge = document.getElementById('account-balance-fx-badge');
  if (!badge) return;
  const appCurr = currencyCode(getAppCurrency());
  const needsFxRows = appCurr === 'CZK' && getAllManagedBanksForBalance().some(bank => currencyCode(bank.currency || 'CZK') !== appCurr);
  if (!fxRatesDate || !needsFxRows) {
    badge.textContent = '';
    badge.classList.remove('show');
    return;
  }
  badge.textContent = `FX ${formatFxDateShort(fxRatesDate)}`;
  badge.classList.add('show');
}

function getCzkEquivalentText(amount, currency) {
  const bankCurr = currencyCode(currency || 'CZK');
  const appCurr = currencyCode(getAppCurrency());
  if (bankCurr === appCurr) return '';
  // Row-level conversion is shown only when app currency is CZK and the bank is foreign.
  // If app currency is EUR/USD/etc., keep each bank in its native currency without a second line.
  if (appCurr !== 'CZK') return '';
  const converted = convertSignedAmountCurrency(amount, bankCurr, appCurr);
  if (!converted) return '';
  return `≈ ${formatSignedCurrencyAmount(converted, getAppCurrency())}`;
}

function getCurrencyTotals(txns) {
  return txns.reduce((acc, t) => {
    const curr = currencyCode(t.currency || 'CZK');
    acc[curr] = (acc[curr] || 0) + Math.abs(Number(t.amount) || 0);
    return acc;
  }, {});
}

function renderCurrencyTotalLines(txns, primaryCurrency = 'CZK') {
  const totals = getCurrencyTotals(txns);
  const primary = String(primaryCurrency || 'CZK').toUpperCase();
  const currencies = [primary, ...Object.keys(totals).filter(c => c !== primary).sort()];
  const rows = currencies.filter(c => totals[c] > 0);

  if (rows.length === 0) return formatCurrencyAmount(0, primary);

  return rows.map((c, idx) => `
    <div style="${idx > 0 ? 'font-size:12px;color:var(--text);margin-top:3px;font-weight:600;' : ''}">${formatCurrencyAmount(totals[c], c)}</div>
  `).join('');
}
function parseSheetData(raw) {
  const data = parseGvizJson(raw);
  const rows = data.table.rows;
  const columnLabels = (data.table.cols || []).map(col => String(col?.label || '').trim().toLowerCase());
  const columnIndex = (labels, fallback) => {
    const candidates = (Array.isArray(labels) ? labels : [labels]).map(label => String(label || '').trim().toLowerCase());
    for (const label of candidates) {
      const index = columnLabels.indexOf(label);
      if (index >= 0) return index;
    }
    return fallback;
  };
  const variableSymbolColumns = ['vs', 'variable symbol']
    .map(label => columnLabels.indexOf(label))
    .filter(index => index >= 0);
  if (!variableSymbolColumns.length) variableSymbolColumns.push(10);
  const tagColumn = columnIndex('Tag', 11);
  const excludeStatsColumn = columnIndex('Exclude stats', 12);
  const returnForColumn = columnIndex('Return for transaction ID', 13);
  const recurringGroupColumn = columnIndex('Recurring group ID', 14);
  const excludeIncomeColumn = columnIndex('Exclude income', 16);
  const txns = [];
  
  let index = 0;
  for (const row of rows) {
    if (!row.c || !row.c[0]) continue;
    const firstCell = String(row.c[0]?.v ?? row.c[0]?.f ?? '').trim().toLowerCase();
    const merchantCell = String(row.c[3]?.v ?? row.c[3]?.f ?? '').trim().toLowerCase();
    const currencyCell = String(row.c[2]?.v ?? row.c[2]?.f ?? '').trim().toLowerCase();
    if (firstCell === 'dátum' || firstCell === 'datum' || merchantCell === 'obchodník' || merchantCell === 'obchodnik' || currencyCell === 'mena') continue;
    const txDate = parseGSheetDate(row.c[0]?.v);
    const dateStr = txDate ? formatDate(txDate) : String(row.c[0]?.f || '');
    const monthStr = txDate ? `${String(txDate.getMonth()+1).padStart(2,'0')}/${txDate.getFullYear()}` : String(row.c[7]?.v || '');
    const rawAmount = row.c[1]?.v ?? row.c[1]?.f ?? 0;
    const amount = parseAmountValue(rawAmount);

    const sheetEmailId = String(row.c[8]?.v || row.c[8]?.f || '').trim();
    const fallbackId = 'tx-' + (txDate ? txDate.getTime() : index) + '-' + Math.abs(amount) + '-' + index;
    const bankName = row.c[9]?.v || row.c[9]?.f || '';
    const variableSymbolValue = variableSymbolColumns
      .map(column => row.c[column]?.v ?? row.c[column]?.f ?? '')
      .find(value => String(value).trim() !== '') ?? '';
    const variableSymbol = String(variableSymbolValue).replace(/\D/g, '').trim();
    const tagRaw = String(row.c[tagColumn]?.v || row.c[tagColumn]?.f || '').trim();
    const excludeRaw = String(row.c[excludeStatsColumn]?.v || row.c[excludeStatsColumn]?.f || '').trim();
    const excludeIncomeRaw = String(row.c[excludeIncomeColumn]?.v || row.c[excludeIncomeColumn]?.f || '').trim();
    const returnForTransactionId = String(row.c[returnForColumn]?.v || row.c[returnForColumn]?.f || '').trim();
    const recurringGroupId = String(row.c[recurringGroupColumn]?.v || row.c[recurringGroupColumn]?.f || '').trim();
    let parsedTag = null;
    if (tagRaw) {
      try { parsedTag = JSON.parse(tagRaw); } catch(_) {
        const legacy = tagRaw.split('|');
        if (legacy.length >= 3) parsedTag = { shape: legacy[0], color: legacy[1], name: legacy.slice(2).join('|') };
        else parsedTag = { name: tagRaw };
      }
    }
    const tagName = normalizeTransactionTagLabel(parsedTag?.name || parsedTag?.label || '');
    const tagColor = tagName ? normalizeTransactionTagColor(parsedTag?.color || '#58A6FF') : '';
    const tagShape = tagName ? normalizeTransactionTagShape(parsedTag?.shape || 'square') : '';
    let merchant = String(row.c[3]?.v || row.c[3]?.f || 'Neznámy').trim() || 'Neznámy';
    let category = row.c[4]?.v || 'Ostatné';
    if (merchant === 'B') {
      merchant = 'Action';
      category = 'Obchod';
    }
    txns.push({
      id: sheetEmailId || fallbackId,
      msgId: sheetEmailId || fallbackId,
      emailId: sheetEmailId || '',
      date: dateStr,
      amount: isNaN(amount) ? 0 : amount,
      currency: normalizeCurrencyForStorage(row.c[2]?.v || 'CZK'),
      merchant: merchant,
      category: category,
      card: row.c[5]?.v || '????',
      type: row.c[6]?.v || '',
      month: monthStr,
      bank: bankName,
      bankId: canonicalBankIdFromSheetRow('', bankName, row.c[5]?.v || ''),
      variableSymbol: variableSymbol,
      vs: variableSymbol,
      tagLabel: tagName,
      tagName: tagName,
      tagColor: tagColor,
      tagShape: tagShape,
      tagMeta: tagName ? { name: tagName, color: tagColor, shape: tagShape } : null,
      tag: tagName ? JSON.stringify({ name: tagName, color: tagColor, shape: tagShape }) : '',
      // Starý Exclude stats sa pri kladnej sume migruje na non-income.
      excludeFromSpent: amount < 0 && /^(yes|true|1|on)$/i.test(excludeRaw),
      excludeFromIncome: /^(yes|true|1|on)$/i.test(excludeIncomeRaw) || (amount > 0 && /^(yes|true|1|on)$/i.test(excludeRaw)),
      returnForTransactionId: returnForTransactionId,
      recurring_group_id: recurringGroupId || null,
      timestamp: txDate ? txDate.getTime() : parseCustomDateStr(dateStr).getTime()
    });
    index++;
  }
  return sortTransactionsNewestFirst(txns);
}


function parseGvizJson(raw) {
  const json = String(raw || '').replace(/^[^(]+\(/, '').replace(/\);?\s*$/, '');
  return JSON.parse(json);
}

function parseSheetNumber(value, formatted = '') {
  if (typeof value === 'number' && isFinite(value)) return value;
  const raw = value !== undefined && value !== null && value !== '' ? value : formatted;
  const text = String(raw || '')
    .replace(/\u00a0/g, '')
    .replace(/\s+/g, '')
    .replace(/,/g, '.');
  const n = Number(text);
  return isNaN(n) ? 0 : n;
}


function buildGvizUrl(spreadsheetId, sheetName) {
  const cacheBust = String(Date.now()) + '_' + Math.random().toString(36).slice(2);
  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json;reqId=${cacheBust}&headers=1&sheet=${encodeURIComponent(sheetName)}&tq=${encodeURIComponent('select *')}&cacheBust=${cacheBust}`;
}

function isGoogleSheetsGvizUrl(url) {
  return /^https:\/\/docs\.google\.com\/spreadsheets\/d\/[^/]+\/gviz\/tq/i.test(String(url || ''));
}

function isMobileOrStandaloneClient() {
  try {
    if (document.documentElement.classList.contains('mobile-perf-mode')) return true;
    if (document.documentElement.classList.contains('pwa-standalone')) return true;
    if (typeof isLikelyIOSWebKit === 'function' && isLikelyIOSWebKit()) return true;
  } catch (_) {}
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

function getGvizFetchTimeoutMs() {
  return isMobileOrStandaloneClient() ? 45000 : 20000;
}

function getGvizSyncFailureHint() {
  if (!String(SHEETS_URL || '').trim()) {
    return ' V Settings skontroluj Google Sheets URL — na mobile sa ukladá zvlast pre kazde zariadenie.';
  }
  if (isMobileOrStandaloneClient()) {
    return ' Na mobile/PWA musi byt Sheet verejny (Share -> Anyone with the link / General access: Anyone). iPhone nema Google cookies zo Safari.';
  }
  return ' Skontroluj, ci je Google Sheet zdielany verejne a URL v Settings je spravna.';
}

function fetchGvizViaJsonp(url, timeoutMs) {
  const waitMs = Math.max(5000, Number(timeoutMs || getGvizFetchTimeoutMs()));
  return new Promise((resolve, reject) => {
    const callbackName = `__btGvizCb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    let done = false;
    let timer = null;
    const cleanup = () => {
      window.clearTimeout(timer);
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    const finish = (data, error = null) => {
      if (done) return;
      done = true;
      cleanup();
      if (error) {
        reject(error);
        return;
      }
      const gvizErrors = Array.isArray(data && data.errors) ? data.errors : [];
      const ok = !!data && data.status !== 'error' && !gvizErrors.length;
      const raw = `google.visualization.Query.setResponse(${JSON.stringify(data || {})});`;
      resolve({
        ok,
        status: ok ? 200 : 400,
        text: async () => raw,
        json: async () => data
      });
    };

    window[callbackName] = (data) => finish(data);
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.onerror = () => finish(null, new Error('Google Sheets JSONP script load failed'));

    try {
      const gvizUrl = new URL(url);
      const rawTqx = gvizUrl.searchParams.get('tqx') || 'out:json';
      const tqx = rawTqx
        .split(';')
        .map(part => part.trim())
        .filter(part => part && !/^responseHandler:/i.test(part))
        .join(';') || 'out:json';
      gvizUrl.searchParams.set('tqx', `${tqx};responseHandler:${callbackName}`);
      gvizUrl.searchParams.set('cacheBust', String(Date.now()) + '_' + Math.random().toString(36).slice(2));
      script.src = gvizUrl.toString();
      (document.body || document.head || document.documentElement).appendChild(script);
      timer = window.setTimeout(() => finish(null, new Error('Google Sheets JSONP timeout')), waitMs);
    } catch (e) {
      finish(null, e);
    }
  });
}

async function fetchNoStore(url) {
  if (isGoogleSheetsGvizUrl(url)) {
    const timeoutMs = getGvizFetchTimeoutMs();
    try {
      return await fetchGvizViaJsonp(url, timeoutMs);
    } catch (firstError) {
      await new Promise(resolve => window.setTimeout(resolve, isMobileOrStandaloneClient() ? 700 : 250));
      return fetchGvizViaJsonp(url, timeoutMs);
    }
  }
  return fetch(url, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }
  });
}

function normalizeFxSheetDate(value, formatted) {
  if (formatted) return String(formatted).substring(0, 10);
  if (value instanceof Date) return value.toISOString().substring(0, 10);
  const text = String(value || '');
  const dateCtor = text.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (dateCtor) {
    const y = Number(dateCtor[1]);
    const m = Number(dateCtor[2]) + 1;
    const d = Number(dateCtor[3]);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return text.substring(0, 10);
}

function parseFxRatesSheetData(raw) {
  const data = parseGvizJson(raw);
  const rows = data?.table?.rows || [];
  const parsedRows = rows.map(row => {
    const c = row.c || [];
    const date = normalizeFxSheetDate(c[0]?.v, c[0]?.f);
    const base = String(c[1]?.v || c[1]?.f || '').toUpperCase();
    const currency = currencyCode(c[2]?.v || c[2]?.f || '');
    const rate = Number(c[3]?.v ?? c[3]?.f ?? 0);
    return { date, base, currency, rate };
  }).filter(r => r.date && r.base === 'EUR' && r.currency && r.rate > 0);

  if (!parsedRows.length) return false;
  const latestDate = parsedRows.map(r => r.date).sort().pop();
  const latest = parsedRows.filter(r => r.date === latestDate);
  const nextRates = { EUR: 1 };
  latest.forEach(r => { nextRates[r.currency] = r.rate; });
  if (!nextRates.CZK) nextRates.CZK = 25;

  fxRates = nextRates;
  fxRatesDate = latestDate;
  localStorage.setItem('fx_rates', JSON.stringify(fxRates));
  localStorage.setItem('fx_rates_date', fxRatesDate);
  return true;
}

async function syncFxRatesFromSheets(spreadsheetId) {
  if (!spreadsheetId) return false;

  // v144: primary sheet is FX_Rates, but Martin also uses/mentioned FR_rates.
  // Try both names so app-currency conversion keeps working with either Google Sheets tab.
  const sheetNames = ['FX_Rates', 'FR_rates'];
  for (const sheetName of sheetNames) {
    try {
      const gvizUrl = buildGvizUrl(spreadsheetId, sheetName);
      const res = await fetchNoStore(gvizUrl);
      if (!res.ok) throw new Error(`${sheetName} fetch failed`);
      const raw = await res.text();
      const ok = parseFxRatesSheetData(raw);
      if (ok) {
        console.log(`FX rates loaded from ${sheetName}`);
        return true;
      }
    } catch (e) {
      console.warn(`${sheetName} rates sync skipped:`, e);
    }
  }

  console.warn('FX/FR rates sync skipped: no valid rates sheet found.');
  return false;
}


async function fetchSheetTransactions(spreadsheetId, sheetName) {
  const gvizUrl = buildGvizUrl(spreadsheetId, sheetName);
  const res = await fetchNoStore(gvizUrl);
  if (!res.ok) throw new Error(`${sheetName} fetch failed`);
  const raw = await res.text();
  return parseSheetData(raw);
}

async function syncArchivedTransactionsFromSheets(spreadsheetId) {
  try {
    if (!spreadsheetId) return [];
    const txns = await fetchSheetTransactions(spreadsheetId, 'Archive_Transactions');
    return txns.map(tx => ({ ...tx, archived: true }));
  } catch (e) {
    console.warn('Archive_Transactions sync skipped:', e);
    return [];
  }
}

function btPerfNow() {
  try { return (window.performance && typeof window.performance.now === 'function') ? window.performance.now() : Date.now(); }
  catch (_) { return Date.now(); }
}

function btPerfLog(name, durationMs, details = '') {
  const ms = Number(durationMs || 0);
  const item = {
    name: String(name || 'metric'),
    ms: Math.max(0, Math.round(ms * 10) / 10),
    at: new Date().toISOString(),
    details: details ? String(details) : ''
  };
  __btPerfState.samples.push(item);
  if (__btPerfState.samples.length > __btPerfState.maxSamples) {
    __btPerfState.samples.splice(0, __btPerfState.samples.length - __btPerfState.maxSamples);
  }
  try {
    const tail = item.details ? ` (${item.details})` : '';
    console.info(`[BT PERF] ${item.name}: ${item.ms}ms${tail}`);
  } catch (_) {}
}

function btPerfSummarize(samples, nameFilter) {
  const rows = (samples || []).filter((row) => !nameFilter || row.name === nameFilter);
  if (!rows.length) return null;
  const values = rows.map((row) => Number(row.ms || 0)).sort((a, b) => a - b);
  const total = values.reduce((sum, value) => sum + value, 0);
  const p95Index = Math.max(0, Math.min(values.length - 1, Math.ceil(values.length * 0.95) - 1));
  return {
    count: values.length,
    avgMs: Math.round((total / values.length) * 10) / 10,
    minMs: values[0],
    maxMs: values[values.length - 1],
    p95Ms: values[p95Index]
  };
}

async function syncData(options = {}) {
  const syncPerfStart = btPerfNow();
  const startupMode = !!(options && options.startupMode);
  const backgroundMode = !!(options && options.backgroundMode);
  const showFullScreenLoader = !!(options && options.showFullScreenLoader);
  let syncSucceeded = false;
  try { window.__btLastCloudSyncSucceeded = false; } catch (_) {}
  let fullScreenLoaderClosed = false;
  const closeFullScreenLoader = () => {
    if (!showFullScreenLoader || fullScreenLoaderClosed) return;
    fullScreenLoaderClosed = true;
    finishAppBoot();
  };

  if (showFullScreenLoader) {
    startAppBootOverlay();
  }

  ensureDefaultConfig();
  clearCloudFirstLocalData();
  if (!isGoogleSheetsEnabled()) {
    console.log('Google Sheets disabled — showing last cached snapshot if available.');
    if (!allTransactions.length) loadCachedTransactionsSnapshot();
    renderAll();
    applyLanguage();
    updateGoogleSheetsToggleUi();
    closeFullScreenLoader(false);
    return false;
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const loadStatus = document.getElementById('limits-sync-status');
    if (loadStatus) loadStatus.textContent = t('offlineShowingCache');
    if (!allTransactions.length) loadCachedTransactionsSnapshot();
    renderAll();
    applyLanguage();
    closeFullScreenLoader(false);
    return false;
  }

  if (!SHEETS_URL || isSyncing) {
    if (!SHEETS_URL) {
      const loadStatus = document.getElementById('limits-sync-status');
      if (loadStatus) loadStatus.textContent = 'Google Sheets URL is empty for this localhost origin. Paste/save the Sheets URL in Settings to load Overview details.';
      console.warn('Google Sheets sync skipped: missing sheets_url for this origin.');
    }
    if (!allTransactions.length) loadCachedTransactionsSnapshot();
    renderAll();
    applyLanguage();
    closeFullScreenLoader(false);
    return false;
  }
  isSyncing = true;
  try { setSyncBtnSpinning(true); } catch (_) {}
  const loadStatus = document.getElementById('limits-sync-status');
  if (loadStatus && !backgroundMode) loadStatus.textContent = 'Načítavam dáta z Google Sheets...';
  try { lockOverviewBalanceDatasets(); setOverviewBalanceSyncState(true); setHeaderBrandSyncState(true); } catch (_) {}
  try {
    const match = SHEETS_URL.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) throw new Error('Neplatné URL');
    const spreadsheetId = match[1];

    if (loadStatus) loadStatus.textContent = 'Načítavam transakcie z Google Sheets...';
    const activeTxnsPromise = fetchSheetTransactions(spreadsheetId, 'Transactions');
    const archivedTxnsPromise = syncArchivedTransactionsFromSheets(spreadsheetId);
    // Bank_Archive is needed by the archive tab and overview balances. Start
    // its dependency immediately and load the archive as soon as Bank_Settings
    // supplies the canonical bank IDs, in parallel with both transaction tabs.
    const bankSettingsPromise = syncBanksFromSheets(spreadsheetId);
    const fxRatesPromise = syncFxRatesFromSheets(spreadsheetId);
    const bankArchivePromise = bankSettingsPromise.then(() => syncBankSettingsFromSheets(spreadsheetId));
    const activeTxns = await activeTxnsPromise;
    const archivedTxns = await archivedTxnsPromise;
    allTransactions = sortTransactionsNewestFirst(dedupeTransactionsForCloud([...activeTxns, ...archivedTxns]));
    saveCachedTransactionsSnapshot();

    if (loadStatus) loadStatus.textContent = 'Načítavam Bank_Archive, FX a zostatky...';
    await Promise.allSettled([
      bankArchivePromise,
      bankSettingsPromise,
      fxRatesPromise
    ]);
    await syncBalanceLogFromSheets(spreadsheetId);
    reapplySheetAccountBalancesFromStorage();
    syncSucceeded = true;
    try { window.__btLastCloudSyncSucceeded = true; } catch (_) {}

    if (!startupMode && !backgroundMode) {
      if (loadStatus) loadStatus.textContent = 'Dáta z Google Sheets sa načítali správne.';
    } else if (loadStatus && !backgroundMode) {
      loadStatus.textContent = 'Dáta z Google Sheets sa načítali správne.';
    } else if (loadStatus && backgroundMode) {
      loadStatus.textContent = 'Synchronizácia s Google Sheets dokončená.';
    }
  } catch(e) {
    console.error('Google Sheets transaction sync failed:', e);
    const syncHint = getGvizSyncFailureHint();
    if (loadStatus) {
      loadStatus.textContent = allTransactions.length
        ? ('Sync zlyhal — zobrazuje sa posledná cache.' + syncHint)
        : ('Dáta sa nepodarilo načítať.' + syncHint);
    }
    if (!allTransactions.length) loadCachedTransactionsSnapshot();
  } finally {
    isSyncing = false;
    try { setSyncBtnSpinning(false); } catch (_) {}
    try { reapplySheetAccountBalancesFromStorage(); } catch (e) { console.warn('Sheet balance reapply in finally failed:', e); }
    if (__appBootActive) await yieldStartupLogoFrames(2);
    try { recomputeAccountBalancesForLoadedMonths(); } catch (e) { console.warn('Account balance recompute after sync failed:', e); }
    if (backgroundMode || !startupMode) {
      if (activePageId === 'overview') {
        try { markOverviewChartsAwaitingFreshData(); } catch (_) {}
      }
      try { window.__overviewBalanceAnimateNext = true; } catch (_) {}
      await yieldStartupLogoFrames(__appBootActive ? 2 : 1);
      try { renderAll({ deferHeavy: true, visibleOnly: true }); } catch (_) {}
      await yieldStartupLogoFrames(__appBootActive ? 2 : 1);
      try { applyLanguage(); } catch (_) {}
      try { window.__overviewBalanceAnimateNext = false; } catch (_) {}
      if (activePageId === 'overview') {
        try { __overviewChartsDataSettled = true; } catch (_) {}
      }
    }
    try { setOverviewBalanceSyncState(false); setHeaderBrandSyncState(false); } catch (_) {}
    if (syncSucceeded) markCloudSyncCompleted();
    closeFullScreenLoader();
    const runSubscriptionDetection = () => {
      try { runSubscriptionDetectionPipeline({ reason: 'sync' }); } catch (e) { console.warn('Subscription detection failed:', e); }
    };
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(runSubscriptionDetection, { timeout: 3000 });
    } else {
      window.setTimeout(runSubscriptionDetection, 900);
    }
    btPerfLog('syncData', btPerfNow() - syncPerfStart, [
      startupMode ? 'startup' : 'manual',
      backgroundMode ? 'background' : 'foreground',
      showFullScreenLoader ? 'overlay' : 'no-overlay'
    ].join(','));
  }
  return syncSucceeded;
}

function loadDemoData() {
  // Cloud-first production build: no demo/test transactions.
  allTransactions = [];
}

function transactionToCzkEquivalent(tx) {
  return convertTransactionAmount(tx, 'CZK');
}
function getArchiveMonths() {
  return [...new Set(allTransactions.map(t => t.month).filter(Boolean))]
    .sort((a,b) => monthSortValue(b) - monthSortValue(a));
}
function updateArchivePaymentKindFilterUi() {
  document.getElementById('archive-kind-all')?.classList.toggle('active', archiveDetailPaymentKind === 'all');
  document.getElementById('archive-kind-card')?.classList.toggle('active', archiveDetailPaymentKind === 'card');
  document.getElementById('archive-kind-account')?.classList.toggle('active', archiveDetailPaymentKind === 'account');
  document.getElementById('archive-kind-cash')?.classList.toggle('active', archiveDetailPaymentKind === 'cash');
}

function filterArchivePaymentKind(kind) {
  archiveDetailPaymentKind = kind || 'all';
  archiveDetailFilter = null;
  resetArchiveDetailVisibleLimit();
  updateArchivePaymentKindFilterUi();
  renderArchiveBankDetail();
}

function filterArchiveDetailTransactionsByKind(txns) {
  if (archiveDetailPaymentKind === 'card') return txns.filter(tx => isCardTransaction(tx));
  if (archiveDetailPaymentKind === 'account') return txns.filter(tx => isAccountTransaction(tx) && !isExcludedFromSpendingStats(tx));
  if (archiveDetailPaymentKind === 'cash') return txns.filter(tx => isCashTransaction(tx));
  return txns;
}

function getPaymentKindLabel(tx) {
  if (typeof isInternalTransferTransaction === 'function' && isInternalTransferTransaction(tx)) return t('internalTransfers');
  const kind = getTransactionPaymentKind(tx);
  if (kind === 'internal') return t('internalTransfers');
  if (kind === 'account') return t('accountsOnly');
  if (kind === 'cash') return t('cashOnly');
  return t('cardsOnly');
}

function openArchiveBankDetail(bankKey, monthStr) {
  archiveDetailFilter = null;
  archiveDetailPaymentKind = 'all';
  resetArchiveDetailVisibleLimit();
  archiveDetailBankKey = bankKey || 'rb_cz';

  const monthSelect = document.getElementById('archive-detail-month');
  if (monthSelect) {
    const months = getArchiveMonths();
    const selected = normalizeMonthStr(monthStr || months[0] || getAktuálneMonth());
    monthSelect.innerHTML = months.map(m => `<option value="${m}" ${normalizeMonthStr(m) === selected ? 'selected' : ''}>${formatMonthString(m)}</option>`).join('');
    monthSelect.value = selected;
  }

  updateArchivePaymentKindFilterUi();

  const chartWrap = document.getElementById('archive-bank-detail-chart');
  const listWrap = document.getElementById('archive-bank-detail-list');
  if (chartWrap) chartWrap.innerHTML = `<div class="archive-detail-loader">${getBtInlineLoadingHtml(t('loading') + '...')}</div>`;
  if (listWrap) listWrap.innerHTML = '';

  openSheet('archive-bank-detail-sheet');

  requestAnimationFrame(() => {
    window.setTimeout(() => {
      renderArchiveBankDetail();
    }, document.documentElement.classList.contains('android-pwa-perf') ? 90 : 35);
  });
}

function clearArchiveDetailFilter() {
  archiveDetailFilter = null;
  resetArchiveDetailVisibleLimit();
  renderArchiveBankDetail();
}

function setArchiveDetailFilter(day, type) {
  archiveDetailFilter = { day: Number(day), type: String(type || 'all') };
  resetArchiveDetailVisibleLimit();
  renderArchiveBankDetail();
}


function resetArchiveDetailVisibleLimit() {
  archiveDetailVisibleLimit = ARCHIVE_DETAIL_PAGE_SIZE;
}

function loadMoreArchiveDetailTransactions() {
  archiveDetailVisibleLimit += ARCHIVE_DETAIL_PAGE_SIZE;
  renderArchiveBankDetail();
}

function renderArchiveDetailLoadMoreButton(visibleCount, totalCount) {
  if (visibleCount >= totalCount) return '';

  const nextCount = Math.min(ARCHIVE_DETAIL_PAGE_SIZE, totalCount - visibleCount);
  return `
    <div class="archive-detail-load-more-wrap">
      <button class="archive-detail-load-more-btn" onclick="loadMoreArchiveDetailTransactions()">${t('archiveLoadMore')} +${nextCount}</button>
    </div>
  `;
}

function renderArchiveBankDetail() {
  const chartWrap = document.getElementById('archive-bank-detail-chart');
  const listWrap = document.getElementById('archive-bank-detail-list');
  const title = document.getElementById('archive-bank-detail-title');
  const monthStr = normalizeMonthStr(document.getElementById('archive-detail-month')?.value || getAktuálneMonth());
  const bankKey = archiveDetailBankKey || 'rb_cz';
  const bankName = plainBankName(bankKey);
  const targetCurrency = getBankChartCurrency(bankKey);

  updateArchivePaymentKindFilterUi();

  if (title) title.innerHTML = `${bankLogoImg(bankKey)} ${bankName} — ${t('dailyArchive')}`;

  if (!chartWrap || !listWrap) return;

  const allBankMonthTxns = sortTransactionsNewestFirst(allTransactions.filter(tx => {
    return tx.month === monthStr && getBankKey(tx) === bankKey;
  }));

  const txns = filterArchiveDetailTransactionsByKind(allBankMonthTxns);

  if (txns.length === 0) {
    chartWrap.innerHTML = `<div class="empty-state" style="padding:22px 0;">${t('noDailyData')}</div>`;
    listWrap.innerHTML = `<div class="budget-status-note" style="margin:0 0 8px;">${t('showing')}: 0 / ${allBankMonthTxns.length}</div>`;
    return;
  }

  const [mm, yyyy] = normalizeMonthStr(monthStr).split('/').map(Number);
  const daysInMonth = getGregorianMonthLength(yyyy, mm);

  const daily = Array.from({ length: daysInMonth }, (_, idx) => ({
    day: idx + 1,
    income: 0,
    expense: 0,
    incomeCount: 0,
    expenseCount: 0
  }));

  const txnsWithDay = txns.map(tx => {
    const parsed = parseCustomDateStr(tx.date);
    const day = parsed && !isNaN(parsed.getTime()) ? parsed.getDate() : 1;
    const safeDay = Math.max(1, Math.min(daysInMonth, day));
    return { ...tx, __archiveDay: safeDay };
  });

  txnsWithDay.forEach(tx => {
    const idx = tx.__archiveDay - 1;
    const value = convertTransactionAmount(tx, targetCurrency);

    if (Number(tx.amount) > 0) {
      daily[idx].income += value;
      daily[idx].incomeCount += 1;
    }
    if (Number(tx.amount) < 0) {
      daily[idx].expense += value;
      daily[idx].expenseCount += 1;
    }
  });

  const max = Math.max(1, ...daily.map(d => Math.max(d.income, d.expense)));
  const niceMax = Math.ceil(max / 1000) * 1000 || max;
  const w = 360;
  const h = 210;
  const padL = 34;
  const padR = 10;
  const padT = 16;
  const axisY = 150;
  const chartW = w - padL - padR;
  const dayBand = chartW / daysInMonth;
  const barW = Math.max(2, Math.min(7, dayBand * 0.33));
  const barGap = Math.max(1, Math.min(3, dayBand * 0.08));
  const maxBarH = axisY - padT - 10;

  const barHeight = (value) => Math.max(value > 0 ? 2 : 0, (value / niceMax) * maxBarH);

  const selected = archiveDetailFilter;
  const selectedLabel = selected
    ? `${t('selectedDay')} ${String(selected.day).padStart(2, '0')} · ${selected.type === 'income' ? t('income') : t('expenses')}`
    : t('allDays');

  const totalIncome = daily.reduce((s,d) => s + d.income, 0);
  const totalExpense = daily.reduce((s,d) => s + d.expense, 0);

  const labelDays = [1, Math.ceil(daysInMonth / 3), Math.ceil(daysInMonth * 2 / 3), daysInMonth]
    .filter((v, i, arr) => arr.indexOf(v) === i);

  const bars = daily.map(d => {
    const xCenter = padL + (d.day - 0.5) * dayBand;
    const incomeH = barHeight(d.income);
    const expenseH = barHeight(d.expense);
    const depth = 4;
    const incomeX = xCenter - barW - barGap / 2;
    const expenseX = xCenter + barGap / 2;
    const incomeTopY = axisY - incomeH;
    const expenseTopY = axisY - expenseH;
    const incomeActive = selected && selected.day === d.day && selected.type === 'income';
    const expenseActive = selected && selected.day === d.day && selected.type === 'expense';
    const hasSelected = !!selected;
    const incomeMuted = hasSelected && !incomeActive ? ' daily-bar-muted' : '';
    const expenseMuted = hasSelected && !expenseActive ? ' daily-bar-muted' : '';

    return `
      ${incomeH > 0 ? `<polygon class="daily-bar-income-side daily-bar-face${incomeActive ? ' active' : ''}${incomeMuted}" points="${incomeX + barW},${axisY} ${incomeX + barW + depth},${axisY - depth} ${incomeX + barW + depth},${incomeTopY - depth} ${incomeX + barW},${incomeTopY}"></polygon>
      <polygon class="daily-bar-income-top daily-bar-face${incomeActive ? ' active' : ''}${incomeMuted}" points="${incomeX},${incomeTopY} ${incomeX + depth},${incomeTopY - depth} ${incomeX + barW + depth},${incomeTopY - depth} ${incomeX + barW},${incomeTopY}"></polygon>` : ''}
      <rect class="daily-bar-income${incomeActive ? ' active' : ''}${incomeMuted}" x="${incomeX}" y="${incomeTopY}" width="${barW}" height="${incomeH}" rx="2" onclick="setArchiveDetailFilter(${d.day}, 'income')"></rect>
      ${expenseH > 0 ? `<polygon class="daily-bar-expense-side daily-bar-face${expenseActive ? ' active' : ''}${expenseMuted}" points="${expenseX + barW},${axisY} ${expenseX + barW + depth},${axisY - depth} ${expenseX + barW + depth},${expenseTopY - depth} ${expenseX + barW},${expenseTopY}"></polygon>
      <polygon class="daily-bar-expense-top daily-bar-face${expenseActive ? ' active' : ''}${expenseMuted}" points="${expenseX},${expenseTopY} ${expenseX + depth},${expenseTopY - depth} ${expenseX + barW + depth},${expenseTopY - depth} ${expenseX + barW},${expenseTopY}"></polygon>` : ''}
      <rect class="daily-bar-expense${expenseActive ? ' active' : ''}${expenseMuted}" x="${expenseX}" y="${expenseTopY}" width="${barW}" height="${expenseH}" rx="2" onclick="setArchiveDetailFilter(${d.day}, 'expense')"></rect>
    `;
  }).join('');

  const kindLabel = archiveDetailPaymentKind === 'all'
    ? t('paymentKindAll')
    : archiveDetailPaymentKind === 'card'
      ? t('cardsOnly')
      : t('accountsOnly');

  chartWrap.innerHTML = `
    <div class="daily-chart-card">
      <div class="daily-chart-title">
        <strong>${t('dailyCashflow')} · ${formatMonthString(monthStr)}</strong>
        <span>${t('bankCurrencyNote')}: ${targetCurrency} · ${kindLabel}</span>
      </div>
      <div class="daily-legend">
        <span><i class="daily-dot" style="background:var(--ok);"></i>${t('income')}: ${Math.round(totalIncome).toLocaleString('cs-CZ')} ${targetCurrency}</span>
        <span><i class="daily-dot" style="background:var(--danger);"></i>${t('expenses')}: ${Math.round(totalExpense).toLocaleString('cs-CZ')} ${targetCurrency}</span>
      </div>
      <div class="daily-chart-help">${t('clickBarToFilter')}</div>
      <div class="daily-filter-chip">${selectedLabel}</div>
      ${selected ? `<button class="daily-reset-filter" onclick="clearArchiveDetailFilter()" style="margin-left:8px;">${t('allDays')}</button>` : ''}
      <svg class="daily-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
        <line class="daily-grid-line" x1="${padL}" y1="${axisY}" x2="${w - padR}" y2="${axisY}"></line>
        <line class="daily-grid-line" x1="${padL}" y1="${Math.round(axisY / 2)}" x2="${w - padR}" y2="${Math.round(axisY / 2)}"></line>
        <line class="daily-grid-line" x1="${padL}" y1="${padT}" x2="${w - padR}" y2="${padT}"></line>
        <text class="daily-axis-label" x="2" y="${padT + 4}">${formatCompactAmount(niceMax)}</text>
        <text class="daily-axis-label" x="2" y="${Math.round(axisY / 2) + 4}">${formatCompactAmount(niceMax / 2)}</text>
        <text class="daily-axis-label" x="2" y="${axisY + 4}">0</text>
        ${bars}
        ${labelDays.map(day => {
          const x = padL + (day - 0.5) * dayBand;
          return `<text class="daily-axis-label" x="${x - 5}" y="${axisY + 25}">${String(day).padStart(2,'0')}</text>`;
        }).join('')}
      </svg>
    </div>
  `;

  let visibleTxns = txnsWithDay;
  if (selected) {
    visibleTxns = visibleTxns.filter(tx => {
      const typeOk = selected.type === 'income' ? Number(tx.amount) > 0 : Number(tx.amount) < 0;
      return tx.__archiveDay === selected.day && typeOk;
    });
  }

  const totalVisibleTxns = visibleTxns.length;
  const renderedTxns = visibleTxns.slice(0, archiveDetailVisibleLimit);

  listWrap.innerHTML = `
    <div class="budget-status-note" style="margin:0 0 8px;">${t('showing')}: ${renderedTxns.length} / ${totalVisibleTxns}</div><div class="archive-edit-hint">${t('longPressToEdit')}</div>
    ${renderedTxns.map(tx => {
      const isIncome = Number(tx.amount) > 0;
      const amountClass = isIncome ? 'amount-income' : 'amount-expense';
      const sign = isIncome ? '+' : '-';
      return `
        <div class="daily-tx-row archive-edit-row" data-archive-tx-id="${escapeAttr(typeof getTransactionId === 'function' ? getTransactionId(tx) : (tx.id || tx.msgId || ''))}" title="${t('editTransaction')}">
          <div class="daily-tx-main">
            <div class="daily-tx-title">${escapeHtml(tx.merchant || '')}</div>
            <div class="daily-tx-sub">${escapeHtml(tx.date || '')} · ${translateCategory(tx.category || '')}<span class="daily-tx-kind">${getPaymentKindLabel(tx)}</span></div>
          </div>
          <div class="daily-tx-amount ${amountClass}">${sign}${formatCurrencyAmount(tx.amount, tx.currency)}</div>
        </div>`;
    }).join('')}
    ${renderArchiveDetailLoadMoreButton(renderedTxns.length, totalVisibleTxns)}
  `;
  bindArchiveTransactionEditGestures();
  scheduleFloatingUtilityUpdate();
}

// ── OPRAVENÉ MAZANIE JEDNEJ TRANSAKCIE ──────────────────────────

function bindArchiveTransactionEditGestures() {
  document.querySelectorAll('[data-archive-tx-id]').forEach(row => {
    if (row.dataset.archiveEditBound === 'true') return;
    row.dataset.archiveEditBound = 'true';

    let timer = null;
    let startX = 0;
    let startY = 0;
    let didOpen = false;

    const clear = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };

    const openEdit = () => {
      const txId = row.dataset.archiveTxId;
      if (!txId || didOpen) return;
      didOpen = true;
      row.classList.add('long-press-edit');
      navigator.vibrate?.(25);
      window.setTimeout(() => row.classList.remove('long-press-edit'), 350);
      openTransactionEditSheet(txId);
    };

    row.addEventListener('pointerdown', (event) => {
      if (event.target.closest && event.target.closest('button, input, select, textarea, a')) return;
      didOpen = false;
      startX = event.clientX || 0;
      startY = event.clientY || 0;
      timer = window.setTimeout(openEdit, 560);
    });

    row.addEventListener('pointermove', (event) => {
      const dx = Math.abs((event.clientX || 0) - startX);
      const dy = Math.abs((event.clientY || 0) - startY);
      if (dx > 12 || dy > 12) clear();
    });

    row.addEventListener('pointerup', clear);
    row.addEventListener('pointercancel', clear);
    row.addEventListener('pointerleave', clear);

    row.addEventListener('dblclick', (event) => {
      if (event.target.closest && event.target.closest('button, input, select, textarea, a')) return;
      event.preventDefault();
      openEdit();
    });
  });
}
function scheduleBackgroundMonthlyArchiveRepair(reason = 'mutation') {
  if (archiveRepairDebounce) clearTimeout(archiveRepairDebounce);
  archiveRepairDebounce = setTimeout(() => {
    runBackgroundMonthlyArchiveRepair(reason);
  }, 12000);
}

async function deleteSingleTransaction(txId) {
  if (!txId) return false;

  const targetId = String(txId);
  const tx = allTransactions.find(t => String(t.id || t.msgId || t.emailId || '') === targetId);
  const sheetId = String(tx?.msgId || tx?.emailId || tx?.id || targetId).trim();
  if (!sheetId) return false;

  // v158: optimistic delete UI. Do not keep the user waiting for the full Apps Script
  // response; remove locally immediately and let Google Sheets sync finish in background.
  showTopWorkingToast('Deleting...');

  const affectedMonths = new Set();
  if (tx?.month) affectedMonths.add(normalizeMonthStr(tx.month));

  if (tx) {
    applyLocalArchiveStatsFromTransaction(tx, -1);
    seedAccountBalanceBasesForMonth(tx.month || getAktuálneMonth());
  }
  allTransactions = allTransactions.filter(t => String(t.id || t.msgId || t.emailId || '') !== targetId && String(t.msgId || t.emailId || t.id || '') !== sheetId);
  affectedMonths.forEach(month => recomputeAccountBalancesForMonth(month));
  saveCachedTransactionsSnapshot();
  renderAll();

  // v159: local delete is instant; do not keep the top spinner visible while
  // Apps Script finishes balance/monthly/log updates in the background.
  window.setTimeout(() => showDeletedToast(), 450);

  postToBankTrackerEndpoint('deleteTransaction', { id: sheetId, msgId: sheetId }).then(ok => {
    if (ok) scheduleBackgroundMonthlyArchiveRepair('delete_transaction_background_repair');
    if (!ok) {
      const status = document.getElementById('limits-sync-status');
      if (status) status.textContent = 'Transakcia bola vymazaná lokálne. Google Sheets sync mešká alebo sa nepodaril - skontroluj Web App /exec a Apps Script Executions.';
    }
  }).catch(err => {
    const status = document.getElementById('limits-sync-status');
    if (status) status.textContent = 'Transakcia bola vymazaná lokálne. Google Sheets sync zlyhal: ' + String(err && err.message ? err.message : err);
  });

  return true;
}

// ── OPRAVENÉ KASKÁDOVÉ MAZANIE ARCHÍVU MESIACA ──────────────────
function deleteArchiveMonth(monthStr) {
  if (!guardLocalEdit('Mazanie mesiaca z archívu')) return;

  if (!confirm(`Naozaj chceš vymazať celý mesiac ${formatMonthString(monthStr)} z archívu vrátane všetkých jeho platieb?`)) {
    return;
  }

  // Odstráni všetky platby patriace pod vymazaný mesiac
  allTransactions = allTransactions.filter(t => t.month !== monthStr);

  if (limitsHistory[monthStr]) {
    delete limitsHistory[monthStr];
    localStorage.setItem('limits_history', JSON.stringify(limitsHistory));
  }

  renderAll();
}

function resetSimFields() {
  const now = new Date();
  const formattedNow = formatDate(now);
  const simDateRb = document.getElementById('sim-date-rb');
  const simDateCsob = document.getElementById('sim-date-csob');
  if (simDateRb) simDateRb.value = formattedNow;
  if (simDateCsob) simDateCsob.value = formattedNow;
  const simDateCsobCz = document.getElementById('sim-date-csob-cz');
  const simDateMoneta = document.getElementById('sim-date-moneta');
  if (simDateCsobCz) simDateCsobCz.value = formattedNow;
  if (simDateMoneta) simDateMoneta.value = formattedNow;
  populateSimulatorLimitMonthDropdown(getAktuálneMonth());
  fillSimulatorLimitInputs(getSimulatorLimitMonth());
}
function normalizeAtmCashWithdrawalText(value) {
  let text = String(value || '').toLowerCase().replace(/\u00a0/g, ' ');
  try { text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (_) {}
  return text.replace(/[^a-z0-9]+/g, ' ').trim();
}

function isAtmCashWithdrawalTransaction(tx) {
  if (!tx) return false;
  const text = normalizeAtmCashWithdrawalText([
    tx.type, tx.category, tx.merchant, tx.merchantRaw, tx.paymentKind
  ].join(' '));
  if (!text) return false;
  return /\bvyber\s+(?:hotovosti\s+)?z\s+bankomatu\b/.test(text) ||
    /\bvyber\s+hotovosti\b/.test(text) ||
    /\bcash\s+withdrawal\b/.test(text) ||
    /\batm\s+(?:cash\s+)?withdrawal\b/.test(text) ||
    /\bbankomat\b/.test(text);
}
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
  const titleHtml = '<span class="header-brand-title" id="header-brand-title">liss - Finance Tracker</span>';
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
  if (kind === 'boot' && window.__btBankStyleBoot) {
    return Math.max(2000, Number(window.__btSplashCycleMs) || 2200);
  }
  return 2000;
}

function getLoadingPresentationMinMs(kind, tabId) {
  if (kind === 'boot' && window.__btBankStyleBoot) {
    const cycles = Math.max(1, Number(window.__btSplashRequiredCycles) || 2);
    const cycleMs = getLoadingPresentationCycleMs(kind, tabId);
    return cycles * cycleMs;
  }
  if (kind === 'boot' && typeof isEarlyShellRevealEnabled === 'function' && isEarlyShellRevealEnabled()) {
    return 0;
  }
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