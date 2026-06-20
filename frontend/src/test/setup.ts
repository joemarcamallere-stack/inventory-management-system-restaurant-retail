import '@testing-library/jest-dom/vitest';

// Under Node 24+ a partial global `localStorage` shadows jsdom's, so `clear`/`setItem`
// aren't reliably available in the test environment. Install a clean in-memory Storage
// on both globalThis and window so component/hook tests can use it consistently.
function createMemoryStorage(): Storage {
  let store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store = new Map();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  } as Storage;
}

const memoryStorage = createMemoryStorage();
Object.defineProperty(globalThis, 'localStorage', {
  value: memoryStorage,
  configurable: true,
  writable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
}
