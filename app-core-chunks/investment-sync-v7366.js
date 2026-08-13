(function installInvestmentSafeSyncV7366() {
  'use strict';

  if (window.btInvestmentSafeSyncV7366) return;

  var OUTBOX_KEY = 'bt_investment_outbox_v7366';
  var QUARANTINE_KEY = 'quarantined_unsent_mutations';
  var LEGACY_QUEUE_KEY = 'bt_investment_backend_queue_v7205';
  var LEGACY_DELETE_QUEUE_KEY = 'bt_investment_delete_queue_v7234';
  var TRADES_KEY = 'bt_investment_trades_v7205';
  var LEGACY_TRADES_KEY = 'bank_tracker_investment_trades_v7205';
  var SYNC_KEY = 'bt_sync_mutations_v7241';
  var MAX_AGE_MS = 24 * 60 * 60 * 1000;
  var SESSION_ID = String(window.btSessionIdV7354 || sessionId());
  var running = false;
  var failureNotified = {};

  var INVESTMENT_ACTIONS = {
    saveInvestment: true,
    deleteInvestment: true,
    saveInvestmentTrades: true,
    upsertInvestmentTrades: true,
    deleteInvestmentTrades: true,
    deleteInvestmentImportBatch: true,
    deleteInvestmentEntity: true,
    applyInvestmentMutation: true
  };

  function sessionId() {
    try {
      var id = sessionStorage.getItem('bt_session_id_v7354');
      if (!id) {
        id = 'ses_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        sessionStorage.setItem('bt_session_id_v7354', id);
      }
      return id;
    } catch (_) {
      return 'ses_no_storage_' + Date.now().toString(36);
    }
  }

  function read(key, fallback) {
    try {
      var value = JSON.parse(localStorage.getItem(key) || 'null');
      return value == null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function rows() {
    var value = read(OUTBOX_KEY, []);
    return Array.isArray(value) ? value : [];
  }

  function saveRows(value) {
    write(OUTBOX_KEY, Array.isArray(value) ? value.slice(-500) : []);
  }

  function appVersion() {
    return String(window.APP_VERSION || document.documentElement.getAttribute('data-app-version') || '2.0.0');
  }

  function arrayValue(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        var parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) { return []; }
    }
    return [];
  }

  function unique(values) {
    var seen = {};
    return values.filter(function (value) {
      value = String(value || '').trim();
      if (!value || seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  function entityIds(payload) {
    payload = payload || {};
    var ids = arrayValue(payload.ids).concat(arrayValue(payload.tradeIds));
    if (!ids.length && typeof payload.ids === 'string') ids = payload.ids.split(',');
    if (typeof payload.tradeIds === 'string') ids = ids.concat(payload.tradeIds.split(','));
    arrayValue(payload.trades).forEach(function (trade) {
      ids.push(trade && (trade.id || trade.tradeId));
    });
    if (payload.id) ids.push(payload.id);
    if (payload.entityId) ids.push(payload.entityId);
    if (payload.investmentId) ids.push(payload.investmentId);
    if (payload.importBatchId) ids.push('batch:' + payload.importBatchId);
    return unique(ids);
  }

  function operationOf(action, payload) {
    var operation = String(payload && payload.operation || '').trim();
    if (operation) return operation;
    if (/delete/i.test(String(action || ''))) return 'delete_trades';
    return 'upsert_trades';
  }

  function isInvestmentAction(action) {
    return !!INVESTMENT_ACTIONS[String(action || '')];
  }

  function dataOf(detail) {
    var data = detail && detail.data;
    return data && typeof data === 'object' ? data : {};
  }

  function isAuthoritativeState(data) {
    return data && data.authoritative === true && Array.isArray(data.trades)
      && Array.isArray(data.investments) && Array.isArray(data.lots);
  }

  function quietToast(message) {
    if (!document.body) return;
    var old = document.getElementById('bt-invest-sync-toast-v7366');
    if (old) old.remove();
    var el = document.createElement('div');
    el.id = 'bt-invest-sync-toast-v7366';
    el.setAttribute('role', 'status');
    el.textContent = message;
    el.style.cssText = 'position:fixed;right:16px;bottom:20px;z-index:2147483000;max-width:min(360px,calc(100vw - 32px));padding:11px 14px;border:1px solid rgba(96,165,250,.42);border-radius:12px;background:#10213d;color:#e7f1ff;box-shadow:0 12px 32px rgba(0,0,0,.28);font:600 13px/1.35 system-ui,sans-serif;opacity:0;transform:translateY(8px);transition:opacity .2s ease,transform .2s ease;pointer-events:none';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
    window.setTimeout(function () {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      window.setTimeout(function () { try { el.remove(); } catch (_) {} }, 240);
    }, 3800);
  }

  function upsertFromDetail(detail) {
    var id = String(detail.mutationId || '').trim();
    if (!id) return null;
    var current = rows();
    var index = current.findIndex(function (item) { return String(item.mutationId || '') === id; });
    var old = index >= 0 ? current[index] : {};
    var payload = detail.payload && typeof detail.payload === 'object' ? detail.payload : (old.payload || {});
    var item = Object.assign({}, old, {
      mutationId: id,
      created_at: old.created_at || detail.at || new Date().toISOString(),
      updated_at: detail.at || new Date().toISOString(),
      domain: 'investments',
      action: String(detail.action || old.action || 'applyInvestmentMutation'),
      operation: operationOf(detail.action || old.action, payload),
      entityIds: entityIds(payload),
      appVersion: old.appVersion || appVersion(),
      sessionId: old.sessionId || SESSION_ID,
      payload: payload,
      state: String(detail.stage || old.state || 'syncing'),
      attempts: Number(old.attempts || 0) + (detail.stage === 'syncing' && old.state !== 'syncing' ? 1 : 0),
      lastError: detail.stage === 'failed' ? String(dataOf(detail).message || detail.message || 'Synchronizácia zlyhala.') : ''
    });
    if (index >= 0) current[index] = item;
    else current.push(item);
    saveRows(current);
    return item;
  }

  function removeMutation(id) {
    saveRows(rows().filter(function (item) { return String(item.mutationId || '') !== String(id || ''); }));
  }

  function syncRows() {
    var value = read(SYNC_KEY, []);
    return Array.isArray(value) ? value : [];
  }

  function removeSyncRows(ids) {
    var remove = {};
    (ids || []).forEach(function (id) { remove[String(id || '')] = true; });
    write(SYNC_KEY, syncRows().filter(function (row) { return !remove[String(row && row.mutationId || '')]; }));
  }

  function mutationConfirmed(item, data) {
    data = data || {};
    var payload = item.payload || {};
    var tradePresent = {}, investmentPresent = {};
    (data.trades || []).forEach(function (trade) { tradePresent[String(trade && (trade.id || trade.tradeId) || '')] = true; });
    (data.investments || []).forEach(function (investment) { investmentPresent[String(investment && investment.id || '')] = true; });
    var tradeIds = arrayValue(payload.ids).concat(arrayValue(payload.tradeIds));
    if (typeof payload.ids === 'string') tradeIds = tradeIds.concat(payload.ids.split(','));
    if (typeof payload.tradeIds === 'string') tradeIds = tradeIds.concat(payload.tradeIds.split(','));
    arrayValue(payload.trades).forEach(function (trade) { tradeIds.push(trade && (trade.id || trade.tradeId)); });
    tradeIds = unique(tradeIds);

    if (/delete/.test(String(item.operation || ''))) {
      var tradesGone = tradeIds.every(function (id) { return !tradePresent[String(id)]; });
      if (item.action === 'deleteInvestment' || item.action === 'deleteInvestmentEntity') {
        var investmentId = String(payload.investmentId || payload.entityId || payload.id || '');
        return tradesGone && (!investmentId || !investmentPresent[investmentId]);
      }
      return tradeIds.length > 0 && tradesGone;
    }
    if (item.action === 'saveInvestment') {
      var savedId = String(payload.investmentId || payload.id || '');
      return !!savedId && !!investmentPresent[savedId];
    }
    return tradeIds.length > 0 && tradeIds.every(function (id) { return !!tradePresent[String(id)]; });
  }

  function confirmAuthoritative(data) {
    if (!isAuthoritativeState(data)) return 0;
    var current = rows();
    var confirmed = [];
    current.forEach(function (item) {
      if (mutationConfirmed(item, data)) confirmed.push(String(item.mutationId || ''));
    });
    if (!confirmed.length) return 0;
    var done = {};
    confirmed.forEach(function (id) { done[id] = true; });
    saveRows(current.filter(function (item) { return !done[String(item.mutationId || '')]; }));
    return confirmed.length;
  }

  function handleMutation(event) {
    var detail = event && event.detail || {};
    if (!isInvestmentAction(detail.action) || !detail.mutationId) return;
    if (detail.payload && detail.payload.__btQuarantineReplayV7366) return;

    var item = upsertFromDetail(detail);
    if (!item) return;

    if (detail.stage === 'synced') {
      var data = dataOf(detail);
      if (isAuthoritativeState(data)) {
        if (mutationConfirmed(item, data)) {
          removeMutation(item.mutationId);
        } else {
          item.state = 'written';
          var authoritativeRows = rows();
          var authoritativeIndex = authoritativeRows.findIndex(function (row) { return String(row.mutationId || '') === item.mutationId; });
          if (authoritativeIndex >= 0) { authoritativeRows[authoritativeIndex] = item; saveRows(authoritativeRows); }
          window.setTimeout(function () { forceReadback('authoritative_unconfirmed'); }, 100);
        }
        return;
      }
      item.state = 'written';
      var current = rows();
      var index = current.findIndex(function (row) { return String(row.mutationId || '') === item.mutationId; });
      if (index >= 0) { current[index] = item; saveRows(current); }
      window.setTimeout(function () { forceReadback('write_confirmation'); }, 100);
      return;
    }

    if (detail.stage === 'failed' && !failureNotified[item.mutationId]) {
      failureNotified[item.mutationId] = true;
      quietToast('Investičná zmena je uložená v zariadení. Synchronizácia čaká na pripojenie.');
    }
  }

  function forceReadback(reason) {
    try {
      if (typeof window.btInvestmentSyncV7241 === 'function') {
        return Promise.resolve(window.btInvestmentSyncV7241({ force: true, allowPending: true, reason: reason || 'safe_sync' }));
      }
    } catch (_) {}
    return Promise.resolve({ ok: false, reason: 'no_reader' });
  }

  function flush() {
    if (running) return Promise.resolve({ ok: false, reason: 'running' });
    if (navigator.onLine === false) return Promise.resolve({ ok: false, reason: 'offline' });
    var pending = rows().filter(function (item) {
      return item.sessionId === SESSION_ID && item.appVersion === appVersion()
        && /^(failed|local|retrying|written|syncing)$/.test(String(item.state || ''));
    });
    if (!pending.length) return forceReadback('safe_reconcile_read_only');

    running = true;
    var chain = Promise.resolve();
    pending.forEach(function (item) {
      chain = chain.then(function () {
        if (item.state === 'written') return forceReadback('written_readback');
        var coordinator = window.btSyncCoordinatorV7241;
        if (coordinator && typeof coordinator.retry === 'function') return coordinator.retry(item.mutationId);
        return false;
      });
    });
    return chain.then(function () { return forceReadback('safe_reconcile_finished'); })
      .then(function (result) { running = false; return result; }, function (error) {
        running = false;
        return { ok: false, error: String(error && error.message || error) };
      });
  }

  function evaluate() {
    /* Legacy CSV fronta nemá sessionId, appVersion ani mutationId. Jej obsah
       preto nikdy neposielame naslepo; prevedieme ho na samopopisnú položku
       karantény, kde používateľ výslovne zvolí odoslať alebo zahodiť. */
    var legacy = read(LEGACY_QUEUE_KEY, []);
    if (Array.isArray(legacy) && legacy.length) {
      var legacyItem = {
        mutationId: 'mut_legacy_investment_queue_' + Date.now(),
        created_at: new Date().toISOString(),
        domain: 'investments',
        action: 'applyInvestmentMutation',
        operation: 'upsert_trades',
        entityIds: entityIds({ trades: legacy }),
        appVersion: 'legacy_unknown',
        sessionId: 'legacy_unknown',
        state: 'quarantined',
        attempts: 0,
        payload: { operation: 'upsert_trades', schemaVersion: 'v7366_legacy_quarantine', trades: legacy }
      };
      var legacyQuarantine = read(QUARANTINE_KEY, []);
      if (!Array.isArray(legacyQuarantine)) legacyQuarantine = [];
      write(QUARANTINE_KEY, legacyQuarantine.concat([legacyItem]).slice(-500));
      write(LEGACY_QUEUE_KEY, []);
      console.warn('[v7366] Legacy investičná fronta bola presunutá do karantény; nebola automaticky odoslaná.');
      try {
        if (window.btOfflineQuarantineV7354 && typeof window.btOfflineQuarantineV7354.showBanner === 'function') {
          window.btOfflineQuarantineV7354.showBanner();
        }
      } catch (_) {}
    }

    var legacyDeletes = read(LEGACY_DELETE_QUEUE_KEY, []);
    if (Array.isArray(legacyDeletes) && legacyDeletes.length) {
      var deleteQuarantine = read(QUARANTINE_KEY, []);
      if (!Array.isArray(deleteQuarantine)) deleteQuarantine = [];
      legacyDeletes.forEach(function (entry, index) {
        var action = entry.type === 'entity' ? 'deleteInvestmentEntity'
          : (entry.type === 'import' ? 'deleteInvestmentImportBatch' : 'deleteInvestmentTrades');
        var tradeIds = Array.isArray(entry.tradeIds) ? entry.tradeIds : [];
        deleteQuarantine.push({
          mutationId: 'mut_legacy_investment_delete_' + Date.now() + '_' + index,
          created_at: String(entry.createdAt || new Date().toISOString()),
          domain: 'investments', action: action, operation: 'delete_trades',
          entityIds: unique(tradeIds.concat(entry.investmentId || [])),
          appVersion: 'legacy_unknown', sessionId: 'legacy_unknown', state: 'quarantined', attempts: 0,
          payload: { id: entry.investmentId, investmentId: entry.investmentId, entityId: entry.investmentId,
            tradeIds: tradeIds.join(','), ids: tradeIds.join(','), importBatchId: entry.importBatchId || '',
            mode: entry.mode || '', reason: entry.reason || '', schemaVersion: 'v7366_legacy_quarantine' }
        });
      });
      write(QUARANTINE_KEY, deleteQuarantine.slice(-500));
      write(LEGACY_DELETE_QUEUE_KEY, []);
      console.warn('[v7366] Legacy investičná delete fronta bola presunutá do karantény; nebola automaticky odoslaná.');
      try {
        if (window.btOfflineQuarantineV7354 && typeof window.btOfflineQuarantineV7354.showBanner === 'function') {
          window.btOfflineQuarantineV7354.showBanner();
        }
      } catch (_) {}
    }

    var current = rows();
    if (!current.length) return { mode: 0, items: 0 };
    var currentVersion = appVersion();
    var quarantine = [], keep = [];
    current.forEach(function (item) {
      var age = Date.now() - (Date.parse(item.created_at || '') || Date.now());
      if (item.sessionId !== SESSION_ID || item.appVersion !== currentVersion || age > MAX_AGE_MS) quarantine.push(item);
      else keep.push(item);
    });
    if (!quarantine.length) return { mode: 1, items: keep.length };

    saveRows(keep);
    var shared = read(QUARANTINE_KEY, []);
    if (!Array.isArray(shared)) shared = [];
    write(QUARANTINE_KEY, shared.concat(quarantine).slice(-500));
    try {
      if (window.btOfflineQuarantineV7354 && typeof window.btOfflineQuarantineV7354.showBanner === 'function') {
        window.btOfflineQuarantineV7354.showBanner();
      }
    } catch (_) {}
    console.warn('[v7366] ' + quarantine.length + ' investičných mutácií presunutých do bezpečnostnej karantény.');
    return { mode: 2, items: quarantine.length };
  }

  function removeLocalTradeIds(ids) {
    var remove = {};
    (ids || []).forEach(function (id) { remove[String(id || '')] = true; });
    [TRADES_KEY, LEGACY_TRADES_KEY].forEach(function (key) {
      var current = read(key, []);
      if (!Array.isArray(current)) current = [];
      write(key, current.filter(function (trade) { return !remove[String(trade && (trade.id || trade.tradeId) || '')]; }));
    });
  }

  function afterQuarantineDiscard(items) {
    var investmentItems = (items || []).filter(function (item) { return item && item.domain === 'investments'; });
    var mutationIds = [];
    var optimisticIds = [];
    investmentItems.forEach(function (item) {
      mutationIds.push(item.mutationId);
      if (!/delete/.test(String(item.operation || ''))) {
        optimisticIds = optimisticIds.concat(item.entityIds || entityIds(item.payload || {}));
      }
    });
    removeLocalTradeIds(unique(optimisticIds));
    removeSyncRows(mutationIds);
    saveRows(rows().filter(function (item) { return mutationIds.indexOf(item.mutationId) < 0; }));
    return forceReadback('quarantine_discard');
  }

  function hasPending(entityId) {
    entityId = String(entityId || '');
    return rows().some(function (item) {
      if (!entityId) return true;
      return (item.entityIds || []).some(function (id) { return String(id) === entityId; });
    });
  }

  function hasMutation(mutationId) {
    mutationId = String(mutationId || '');
    return rows().some(function (item) { return String(item.mutationId || '') === mutationId; });
  }

  window.addEventListener('bt:endpoint-mutation', handleMutation);
  window.addEventListener('bt:investments-authoritative-synced', function (event) {
    var detail = event && event.detail || {};
    if (detail.state && isAuthoritativeState(detail.state)) confirmAuthoritative(detail.state);
  });
  window.addEventListener('online', function () { window.setTimeout(flush, 1200); });

  window.btInvestmentSafeSyncV7366 = {
    flush: flush,
    pending: rows,
    hasPending: hasPending,
    hasMutation: hasMutation,
    evaluate: evaluate,
    confirmAuthoritative: confirmAuthoritative,
    mutationConfirmed: mutationConfirmed,
    afterQuarantineDiscard: afterQuarantineDiscard,
    notifyIssue: quietToast
  };

  evaluate();
}());
