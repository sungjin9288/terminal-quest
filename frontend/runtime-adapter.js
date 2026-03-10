const runtimeWindow = typeof window !== 'undefined' ? window : globalThis;

if (typeof runtimeWindow.__TERMINAL_QUEST_RUNTIME_ADAPTER__ === 'undefined') {
  runtimeWindow.__TERMINAL_QUEST_RUNTIME_ADAPTER__ = null;
}
