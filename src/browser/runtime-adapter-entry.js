import { createFrontendSession, getFrontendSnapshot, performFrontendAction } from '../frontend/runtime.ts';
import { readJsonStorage, writeJsonStorage, removeStorageKey } from './shared/storage.js';

const SESSION_STORAGE_KEY = 'terminal-quest/browser-session-v1';

function createPersistedSession() {
  const session = createFrontendSession();
  const persisted = readJsonStorage(SESSION_STORAGE_KEY, null);

  if (persisted && typeof persisted === 'object') {
    session.gameState = persisted.gameState ?? null;
    session.battle = persisted.battle ?? null;
    session.feed = Array.isArray(persisted.feed) ? persisted.feed : [];
    session.nextFeedId = typeof persisted.nextFeedId === 'number' ? persisted.nextFeedId : 1;
  }

  return session;
}

function persistSession(session) {
  if (!session.gameState && session.feed.length === 0 && !session.battle) {
    removeStorageKey(SESSION_STORAGE_KEY);
    return;
  }

  writeJsonStorage(SESSION_STORAGE_KEY, {
    gameState: session.gameState,
    battle: session.battle,
    feed: session.feed,
    nextFeedId: session.nextFeedId
  });
}

const session = createPersistedSession();

const adapter = {
  async getState() {
    return getFrontendSnapshot(session);
  },
  async performAction(action) {
    const snapshot = performFrontendAction(session, action);
    persistSession(session);
    return snapshot;
  }
};

globalThis.__TERMINAL_QUEST_RUNTIME_ADAPTER__ = adapter;
globalThis.__TERMINAL_QUEST_RUNTIME_ADAPTER_READY__ = Promise.resolve(adapter);
