// Generated app-core slice 30/34 (declarations).

function flattenEndpointPayload(action, payload = {}) {
  const flat = { action };
  const add = (key, value) => {
    if (action === 'saveLoan' && /^(fixationPeriodsJson|fixationPeriodsJSON|simSettingsJson|simSettingsJSON)$/.test(key)) return;
    if (value === undefined || value === null) return;
    if (typeof value === 'object') return;
    flat[key] = String(value);
  };

  Object.keys(payload || {}).forEach(key => add(key, payload[key]));

  if (payload.bank) {
    add('bankId', payload.bank.id || payload.bank.bankId);
    add('id', payload.bank.id || payload.bank.bankId);
    add('name', payload.bank.name);
    add('currency', payload.bank.currency);
    add('type', payload.bank.type);
    add('account', payload.bank.account);
    add('cards', payload.bank.cards);
    add('active', payload.bank.active === false ? 'false' : 'true');
    add('changedField', payload.bank.changedField);
    add('changedSlot', payload.bank.changedSlot);
    add('changedCardField', payload.bank.changedCardField);
    add('replaceIdentifiers', payload.bank.replaceIdentifiers === true ? 'true' : (payload.bank.replaceIdentifiers === false ? 'false' : undefined));
    add('allowAppend', payload.bank.allowAppend === true ? 'true' : (payload.bank.allowAppend === false ? 'false' : undefined));
    if (Array.isArray(payload.bank.storedCards)) {
      payload.bank.storedCards.slice(0, 3).forEach((card, index) => {
        const slot = index + 1;
        add(`card${slot}`, card && card.number);
        add(`card${slot}Number`, card && card.number);
        add(`card${slot}Expiry`, card && card.expiry);
        add(`card${slot}Cvc`, card && card.cvc);
      });
    }
  }

  if (payload.loan) {
    add('loanId', payload.loan.id || payload.loan.loanId);
    add('id', payload.loan.id || payload.loan.loanId);
    add('name', payload.loan.name || payload.loan.loanName);
    add('loanName', payload.loan.name || payload.loan.loanName);
    add('type', payload.loan.type || payload.loan.loanType);
    add('currency', payload.loan.currency);
    add('originalAmount', payload.loan.originalAmount || payload.loan.originalValue || payload.loan.principal);
    add('originalValue', payload.loan.originalAmount || payload.loan.originalValue || payload.loan.principal);
    add('outstandingBalance', payload.loan.outstandingBalance || payload.loan.currentBalance || payload.loan.balance);
    add('currentBalance', payload.loan.currentBalance || payload.loan.outstandingBalance || payload.loan.balance);
    add('interestRate', payload.loan.interestRate || payload.loan.rate);
    add('period', payload.loan.periodValue || payload.loan.period || payload.loan.loanPeriod || payload.loan.periodMonths);
    add('periodValue', payload.loan.periodValue || payload.loan.period || payload.loan.loanPeriod);
    add('periodUnit', payload.loan.periodUnit);
    add('periodMonths', payload.loan.periodMonths);
    add('fixationUntil', payload.loan.fixationUntil || payload.loan.fixation);
    add('variableSymbol', payload.loan.variableSymbol || payload.loan.vs);
    add('vs', payload.loan.variableSymbol || payload.loan.vs);
    add('account', payload.loan.account);
    add('linkedBankId', payload.loan.linkedBankId || payload.loan.bankId);
    add('bankId', payload.loan.linkedBankId || payload.loan.bankId);
    add('amountOfRepayment', payload.loan.amountOfRepayment || payload.loan.monthlyPayment || payload.loan.repaymentAmount);
    add('repaymentAmount', payload.loan.repaymentAmount || payload.loan.amountOfRepayment || payload.loan.monthlyPayment);
    add('monthlyPayment', payload.loan.monthlyPayment || payload.loan.repaymentAmount || payload.loan.amountOfRepayment);
    add('matchText', payload.loan.matchText || payload.loan.repaymentText);
    add('repaymentText', payload.loan.repaymentText || payload.loan.matchText);
    add('status', payload.loan.status || 'active');
    add('active', payload.loan.status === 'closed' || payload.loan.active === false ? 'false' : 'true');
    const loanPeriods = Array.isArray(payload.loan.fixationPeriods) ? payload.loan.fixationPeriods : (Array.isArray(payload.fixationPeriods) ? payload.fixationPeriods : []);
    const loanTerm = loanPeriods.find(period => String(period && period.role || '') === 'loan_term') || null;
    const loanSegments = loanPeriods.filter(period => String(period && period.role || '') === 'period');
    const orderedPeriods = (loanTerm ? [loanTerm] : []).concat(loanSegments).slice(0, 10);
    orderedPeriods.forEach((period, index) => {
      const slot = index + 1;
      const rawMonths = index === 0
        ? (period && (period.fixationMonths ?? period.durationMonths))
        : (period && (period.periodUnit === 'years' ? Number(period.periodValue || 0) * 12 : period.periodValue));
      add(`period${slot}Months`, rawMonths);
      add(`period${slot}Rate`, period && (period.rate ?? period.interestRate));
      add(`period${slot}Color`, period && period.color);
    });
    const residual = loanPeriods.find(period => String(period && period.role || '') === 'residual') || null;
    add('residualRate', residual && (residual.rate ?? residual.interestRate) || payload.loan.residualRate);
    add('residualColor', residual && residual.color || payload.loan.residualColor);
    const sim = payload.loan.simSettings && typeof payload.loan.simSettings === 'object' ? payload.loan.simSettings : {};
    add('paidYears', payload.loan.paidYears ?? sim.paidYears);
    add('historicalRate', payload.loan.historicalRate ?? sim.histRate);
  }

  if (payload.settings) {
    add('bankId', payload.settings.bankId);
    add('month', payload.settings.month);
    add('cardLimit', payload.settings.cardLimit);
    add('creditCardLimit', payload.settings.creditCardLimit);
    add('creditCardLimits', payload.settings.creditCardLimits);
    add('creditLimit', payload.settings.creditLimit);
    add('credit_card_limit', payload.settings.credit_card_limit);
    add('monthlyLimit', payload.settings.monthlyLimit);
    add('monthly_limit', payload.settings.monthly_limit);
    add('creditMonthlyLimit', payload.settings.creditMonthlyLimit);
    add('budget', payload.settings.budget);
    add('warning', payload.settings.warning);
    add('accountBalance', payload.settings.accountBalance);
    add('incomingAlert', payload.settings.incomingAlert);
    add('outgoingAlert', payload.settings.outgoingAlert);
  }

  if (payload.transaction) {
    add('txId', payload.transaction.id || payload.transaction.msgId);
    add('msgId', payload.transaction.msgId || payload.transaction.id);
    add('date', payload.transaction.date);
    add('amount', payload.transaction.amount);
    add('currency', payload.transaction.currency);
    add('merchant', payload.transaction.merchant);
    add('category', payload.transaction.category);
    add('card', payload.transaction.card);
    add('txType', payload.transaction.type);
    add('month', payload.transaction.month);
    add('bank', payload.transaction.bank);
    add('bankId', payload.transaction.bankId || payload.transaction.bankID);
    add('paymentKind', payload.transaction.paymentKind);
    add('variableSymbol', payload.transaction.variableSymbol || payload.transaction.vs);
    add('vs', payload.transaction.variableSymbol || payload.transaction.vs);
    add('tag', payload.transaction.tag);
    add('tagLabel', payload.transaction.tagLabel || payload.transaction.tagName);
    add('tagName', payload.transaction.tagName || payload.transaction.tagLabel);
    add('tagColor', payload.transaction.tagColor);
    add('tagShape', payload.transaction.tagShape);
    add('excludeFromSpent', payload.transaction.excludeFromSpent ? 'yes' : '');
    add('returnForTransactionId', payload.transaction.returnForTransactionId || '');
    add('recurringGroupId', payload.transaction.recurring_group_id || '');
    add('recurring_group_id', payload.transaction.recurring_group_id || '');
  }

  return flat;
}

function buildEndpointMutationUrl(action, payload = {}, callbackName = '') {
  const url = getCurrentWebAppUrl();
  const params = new URLSearchParams();
  const flat = flattenEndpointPayload(action, payload);
  Object.keys(flat).forEach(key => params.set(key, flat[key]));
  if (callbackName) params.set('callback', callbackName);
  params.set('_ts', String(Date.now()));
  return `${url}?${params.toString()}`;
}

function isLikelyIOSWebKit() {
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function getEndpointFailureDetail(action, result) {
  const data = result && result.data || {};
  const message = String(data.message || '');
  if (/login page returned|Google login page/i.test(message)) {
    const iosHint = isLikelyIOSWebKit()
      ? ' iPhone PWA nema Google cookies zo Safari. V Apps Script nastav Deploy -> Web app -> Who has access: Anyone (nie Anyone with Google account).'
      : ' V Apps Script nastav Deploy -> Web app -> Who has access: Anyone.';
    return getEndpointStatusMessage(action, 'error') + iosHint;
  }
  const jsonpProblem = data.status === 'timeout' || /JSONP|callback|script load/i.test(message);
  const postProblem = /fetch-post|Invalid JSON from Apps Script POST|Empty Apps Script response/i.test(message);
  if (!jsonpProblem && !postProblem) return getEndpointStatusMessage(action, 'error');
  const iosHint = isLikelyIOSWebKit()
    ? ' iPhone/Safari: skontroluj Apps Script /exec URL a Deploy -> Anyone. Ak appku mas na Home Screen, otvor /exec raz v Safari.'
    : ' Apps Script nevratil odpoved. Skontroluj Web App deployment /exec a access Anyone.';
  const lengthHint = data.urlLength && data.urlLength > 1800
    ? ' URL payload je dlhy (' + data.urlLength + ' znakov).'
    : '';
  return getEndpointStatusMessage(action, 'error') + iosHint + lengthHint;
}

function buildEndpointMutationBody(action, payload = {}) {
  return flattenEndpointPayload(action, payload);
}

function parseEndpointResponseText(text) {
  const raw = String(text || '').trim();
  if (!raw) return { ok: false, data: { status: 'error', message: 'Empty Apps Script response' } };
  if (/^\s*<!doctype html/i.test(raw) || /accounts\.google\.com\/signin/i.test(raw) || /ServiceLogin/i.test(raw)) {
    return { ok: false, data: { status: 'error', message: 'Google login page returned instead of JSON', ios: isLikelyIOSWebKit() } };
  }
  try {
    const data = JSON.parse(raw);
    const ok = !!data && (data.status === 'success' || data.status === 'ok');
    return { ok, data };
  } catch (_) {
    return { ok: false, data: { status: 'error', message: 'Invalid JSON from Apps Script POST', preview: raw.slice(0, 160) } };
  }
}

async function fetchEndpointRequest(action, payload = {}, timeoutMs = 15000) {
  const url = getCurrentWebAppUrl();
  if (!url) return { ok: false, data: { status: 'error', message: 'Missing Web App URL' } };

  const body = JSON.stringify(buildEndpointMutationBody(action, payload));
  let controller;
  let timer;
  try {
    if (typeof AbortController !== 'undefined') {
      controller = new AbortController();
      timer = window.setTimeout(() => controller.abort(), timeoutMs);
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
      signal: controller ? controller.signal : undefined
    });
    if (timer) window.clearTimeout(timer);
    return parseEndpointResponseText(await res.text());
  } catch (err) {
    if (timer) window.clearTimeout(timer);
    return { ok: false, data: { status: 'error', message: String(err && err.message || err), transport: 'fetch-post', ios: isLikelyIOSWebKit() } };
  }
}

function estimateEndpointMutationUrlLength(action, payload = {}) {
  return buildEndpointMutationUrl(action, payload, '__cb__').length;
}

function endpointPostFallbackTimeout(timeoutMs) {
  const requested = Math.max(3000, Number(timeoutMs || 15000));
  return isLikelyIOSWebKit() ? Math.min(requested, 12000) : requested;
}

async function endpointMutationRequest(action, payload = {}, timeoutMs = 15000) {
  const urlLength = estimateEndpointMutationUrlLength(action, payload);
  const jsonpSafe = urlLength <= 1800;

  if (jsonpSafe) {
    // iPhone/PWA can stall on Apps Script POST. Desktop already succeeds through
    // JSONP GET, so use the same path first whenever the payload is URL-safe.
    const jsonpResult = await jsonpEndpointRequest(action, payload, Math.min(timeoutMs, 20000));
    if (jsonpResult.ok) return jsonpResult;
    const postResult = await fetchEndpointRequest(action, payload, endpointPostFallbackTimeout(timeoutMs));
    return postResult.ok ? postResult : jsonpResult;
  }

  const postTimeout = endpointPostFallbackTimeout(timeoutMs);
  const postResult = await fetchEndpointRequest(action, payload, postTimeout);
  if (postResult.ok) return postResult;
  const jsonpResult = await jsonpEndpointRequest(action, payload, Math.min(timeoutMs, 20000));
  return jsonpResult.ok ? jsonpResult : postResult;
}

function getEndpointMutationJobKey(action, payload = {}) {
  if (action === 'deleteTransaction') {
    const id = String(payload.id || payload.msgId || '').trim();
    return id ? `delete:${id}` : '';
  }
  if (action === 'saveTransaction') {
    const tx = payload.transaction || payload;
    const id = String(tx.msgId || tx.id || '').trim();
    return id ? `save:${id}` : '';
  }
  return '';
}

function enqueueEndpointMutation(action, payload = {}, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const jobKey = getEndpointMutationJobKey(action, payload);
    if (jobKey) {
      if (action === 'deleteTransaction') {
        const existing = endpointMutationQueue.find(job => job.key === jobKey);
        if (existing) {
          existing.waiters.push({ resolve, reject });
          return;
        }
      }
      if (action === 'saveTransaction') {
        const existingIdx = endpointMutationQueue.findIndex(job => job.key === jobKey);
        if (existingIdx >= 0) {
          const existing = endpointMutationQueue[existingIdx];
          existing.payload = payload;
          existing.timeoutMs = timeoutMs;
          existing.waiters.push({ resolve, reject });
          return;
        }
      }
    }

    endpointMutationQueue.push({
      action,
      payload,
      timeoutMs,
      key: jobKey,
      resolve,
      reject,
      waiters: []
    });
    drainEndpointMutationQueue();
  });
}

async function drainEndpointMutationQueue() {
  if (endpointMutationQueueRunning) return;
  endpointMutationQueueRunning = true;
  try {
    while (endpointMutationQueue.length) {
      const job = endpointMutationQueue.shift();
      const waiters = [{ resolve: job.resolve, reject: job.reject }, ...(job.waiters || [])];
      try {
        const result = await endpointMutationRequest(job.action, job.payload, job.timeoutMs);
        const ok = !!(result && result.ok);
        waiters.forEach(waiter => waiter.resolve(ok));
      } catch (err) {
        waiters.forEach(waiter => waiter.reject(err));
      }
    }
  } finally {
    endpointMutationQueueRunning = false;
  }
}

function queueParserRunAfterMutation(reason) {
  if (!isGoogleSheetsEnabled()) return;
  if (parserRunQueueTimer) clearTimeout(parserRunQueueTimer);
  parserRunQueueTimer = setTimeout(async () => {
    parserRunQueueTimer = null;
    const now = Date.now();
    if (parserRunInFlight) return;
    if ((now - Number(parserRunLastStartAt || 0)) < 12000) return;
    parserRunInFlight = true;
    parserRunLastStartAt = now;
    try {
      await endpointMutationRequest('runParser', {
        source: 'app_mutation',
        reason: String(reason || 'save'),
        requestedAt: new Date().toISOString()
      }, 65000);
    } catch (_) {
      // Fire-and-forget parser trigger should never block UI flows.
    } finally {
      parserRunInFlight = false;
    }
  }, 700);
}

function getEndpointStatusMessage(action, state) {
  const labels = {
    saveToken: {
      pending: 'Ukladám push token do Google Sheets...',
      success: 'Push token bol uložený do Google Sheets.',
      error: 'Push token ostal iba lokálne. Google Sheets zápis zlyhal.'
    },
    disableToken: {
      pending: 'Vypínam starý push token...',
      success: 'Starý push token bol označený ako neaktívny.',
      error: 'Starý push token sa nepodarilo označiť ako neaktívny.'
    },
    saveBank: {
      pending: 'Ukladám banku do Google Sheets...',
      success: 'Banka bola uložená do Google Sheets.',
      error: 'Banka ostala lokálne. Google Sheets zápis zlyhal.'
    },
    saveBankSettings: {
      pending: 'Ukladám nastavenia banky do Google Sheets...',
      success: 'Nastavenia banky boli uložené do Google Sheets.',
      error: 'Nastavenia banky ostali lokálne. Google Sheets zápis zlyhal.'
    },
    syncDetectedBanks: {
      pending: 'Synchronizujem zistené banky...',
      success: 'Zistené banky boli zosynchronizované.',
      error: 'Synchronizácia zistených bánk zlyhala.'
    },
    saveTransaction: {
      pending: 'Ukladám transakciu do Google Sheets...',
      success: 'Transakcia bola uložená do Google Sheets.',
      error: 'Transakcia ostala lokálne. Google Sheets odpoveď neprišla včas.'
    },
    deleteTransaction: {
      pending: 'Vymazávam transakciu z Google Sheets...',
      success: 'Transakcia bola vymazaná z Google Sheets.',
      error: 'Vymazanie transakcie z Google Sheets zlyhalo.'
    }
  };
  const fallback = {
    pending: 'Ukladám zmenu do Google Sheets...',
    success: 'Zmena bola uložená do Google Sheets.',
    error: 'Google Sheets zápis zlyhal. Skontroluj deployment /exec a Executions.'
  };
  return (labels[action] && labels[action][state]) || fallback[state] || '';
}

function jsonpEndpointRequest(action, payload = {}, timeoutMs = 15000) {
  return new Promise((resolve) => {
    const callbackName = `__btCloudCb_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const endpointUrl = buildEndpointMutationUrl(action, payload, callbackName);
    let done = false;
    const cleanup = () => {
      try { delete window[callbackName]; } catch (_) { window[callbackName] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    const finish = (ok, data) => {
      if (done) return;
      done = true;
      cleanup();
      resolve({ ok, data: data || null });
    };
    window[callbackName] = (data) => {
      const ok = !!data && (data.status === 'success' || data.status === 'ok');
      finish(ok, data);
    };
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.onerror = () => finish(false, { status: 'error', message: 'JSONP script load failed', action, urlLength: endpointUrl.length, ios: isLikelyIOSWebKit() });
    script.src = endpointUrl;
    (document.body || document.head || document.documentElement).appendChild(script);
    window.setTimeout(() => finish(false, { status: 'timeout', message: 'Google Sheets endpoint timeout or callback blocked', action, urlLength: endpointUrl.length, ios: isLikelyIOSWebKit() }), timeoutMs);
  });
}