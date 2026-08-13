(() => {
  'use strict';

  const PROTOCOL = 'zoinho-storage-v1';
  const cfg = window.ZOINHO_STORAGE_CONFIG;
  if (!cfg || !cfg.gameId || !Array.isArray(cfg.portalOrigins) || !Array.isArray(cfg.saveKeys)) {
    console.warn('[ZOINHO Bridge] Configuração ausente ou inválida; bridge desativada.');
    return;
  }

  const params = new URLSearchParams(location.search);
  const enabled = params.get('zoinhoBridge') === '1';
  const trustedOrigins = new Set(cfg.portalOrigins.map(origin => String(origin).replace(/\/$/, '')));
  let portalWindow = null;
  let portalOrigin = null;
  let pushTimer = 0;
  const META_KEY = `zoinhoBridgeMeta:${cfg.gameId}`;

  function isTrustedPortalEvent(event) {
    return enabled &&
      window.opener &&
      event.source === window.opener &&
      trustedOrigins.has(event.origin);
  }

  function readMeta() {
    try {
      const parsed = JSON.parse(localStorage.getItem(META_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function markLocalSave() {
    try {
      localStorage.setItem(META_KEY, JSON.stringify({ updatedAt: new Date().toISOString() }));
    } catch {}
  }

  function collectSnapshot() {
    const storage = {};
    for (const key of cfg.saveKeys) {
      const value = localStorage.getItem(key);
      if (value !== null) storage[key] = value;
    }
    return {
      gameId: cfg.gameId,
      storage,
      clientUpdatedAt: readMeta().updatedAt || new Date().toISOString()
    };
  }

  function snapshotsEqual(remoteStorage) {
    if (!remoteStorage || typeof remoteStorage !== 'object') return false;
    for (const key of cfg.saveKeys) {
      const remote = Object.prototype.hasOwnProperty.call(remoteStorage, key) ? remoteStorage[key] : null;
      const local = localStorage.getItem(key);
      if (remote !== local) return false;
    }
    return true;
  }

  function shouldApplyRemote(payload) {
    if (!payload || !payload.storage) return false;
    const hasLocalSave = cfg.saveKeys.some(key => localStorage.getItem(key) !== null);
    if (!hasLocalSave) return true;

    const localTime = Date.parse(readMeta().updatedAt || '');
    const remoteTime = Date.parse(payload.clientUpdatedAt || '');
    if (!Number.isFinite(localTime)) return false;
    if (!Number.isFinite(remoteTime)) return false;
    return remoteTime > localTime;
  }

  function applySnapshot(payload) {
    if (!payload || payload.gameId !== cfg.gameId || !payload.storage || typeof payload.storage !== 'object') return false;
    if (snapshotsEqual(payload.storage)) return false;

    for (const key of cfg.saveKeys) {
      if (!Object.prototype.hasOwnProperty.call(payload.storage, key)) continue;
      const value = payload.storage[key];
      if (typeof value === 'string') localStorage.setItem(key, value);
    }
    try {
      localStorage.setItem(META_KEY, JSON.stringify({ updatedAt: payload.clientUpdatedAt || new Date().toISOString() }));
    } catch {}

    // O jogo carrega o perfil muito cedo. Um reload único garante que o estado em memória
    // seja reconstruído a partir do save restaurado, sem acumular patches em subsistemas.
    sessionStorage.setItem('zoinhoBridgeRestored', '1');
    location.reload();
    return true;
  }

  function post(type, payload = {}) {
    if (!portalWindow || !portalOrigin) return false;
    portalWindow.postMessage({ protocol: PROTOCOL, type, gameId: cfg.gameId, ...payload }, portalOrigin);
    return true;
  }

  function pushNow(reason = 'save') {
    if (!portalWindow || !portalOrigin) return;
    post('snapshot', { reason, snapshot: collectSnapshot() });
  }

  function schedulePush(reason = 'save') {
    markLocalSave();
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => pushNow(reason), 120);
  }

  window.ZoinhoStorageBridge = Object.freeze({
    enabled,
    collectSnapshot,
    notifySave: schedulePush,
    pushNow
  });

  if (!enabled || !window.opener) return;

  addEventListener('message', event => {
    const message = event.data;
    if (!message || message.protocol !== PROTOCOL || message.gameId !== cfg.gameId) return;
    if (!isTrustedPortalEvent(event)) return;

    portalWindow = event.source;
    portalOrigin = event.origin;

    if (message.type === 'init') {
      const restoredThisLoad = sessionStorage.getItem('zoinhoBridgeRestored') === '1';
      if (restoredThisLoad) sessionStorage.removeItem('zoinhoBridgeRestored');

      if (!restoredThisLoad && message.snapshot && shouldApplyRemote(message.snapshot)) {
        if (applySnapshot(message.snapshot)) return;
      }
      pushNow('initial-sync');
    } else if (message.type === 'request-snapshot') {
      pushNow('requested');
    }
  });

  // READY não contém dados privados. O portal responde com INIT somente se reconhecer
  // https://blood-machine.vercel.app como origem cadastrada.
  window.opener.postMessage({ protocol: PROTOCOL, type: 'ready', gameId: cfg.gameId }, '*');
})();
