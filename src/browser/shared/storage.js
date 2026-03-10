const FALLBACK_STORAGE_KEY = '__terminal_quest_browser_storage__';

function createMemoryStorage() {
  const store = new Map();

  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
}

function resolveMemoryStorage() {
  const scope = globalThis;
  if (!scope[FALLBACK_STORAGE_KEY]) {
    scope[FALLBACK_STORAGE_KEY] = createMemoryStorage();
  }

  return scope[FALLBACK_STORAGE_KEY];
}

export function getBrowserStorage() {
  try {
    if (typeof globalThis.localStorage !== 'undefined') {
      const probe = '__terminal_quest_probe__';
      globalThis.localStorage.setItem(probe, '1');
      globalThis.localStorage.removeItem(probe);
      return globalThis.localStorage;
    }
  } catch {
    // Fall through to in-memory storage.
  }

  return resolveMemoryStorage();
}

export function readJsonStorage(key, fallbackValue) {
  const storage = getBrowserStorage();
  const raw = storage.getItem(key);
  if (!raw) {
    return fallbackValue;
  }

  try {
    return JSON.parse(raw);
  } catch {
    storage.removeItem(key);
    return fallbackValue;
  }
}

export function writeJsonStorage(key, value) {
  const storage = getBrowserStorage();
  storage.setItem(key, JSON.stringify(value));
}

export function removeStorageKey(key) {
  const storage = getBrowserStorage();
  storage.removeItem(key);
}
