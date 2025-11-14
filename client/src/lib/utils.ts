// Fix for Node.js environments with broken localStorage polyfill
// In some dev environments, Node injects a global localStorage object whose methods are not real functions.
// This breaks SSR when libraries attempt to use localStorage.
if (typeof window === 'undefined' && typeof globalThis.localStorage !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ls = (globalThis as { localStorage?: any }).localStorage;
  const isValid = ls && typeof ls.getItem === 'function' && typeof ls.setItem === 'function';

  if (!isValid) {
    try {
      // Remove the faulty localStorage so downstream code falls back gracefully
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (globalThis as { localStorage?: any }).localStorage;
    } catch {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as { localStorage?: any }).localStorage = undefined;
    }
  }
}

// Safe localStorage helper for SSR compatibility
export function safeLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  // Check if localStorage exists and is accessible
  try {
    // Some dev environments/polyfills might have localStorage but it's not a function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ls = (window as { localStorage?: any }).localStorage;
    if (!ls || typeof ls !== 'object') return null;

    // Verify all required methods exist and are functions
    if (typeof ls.getItem !== 'function' ||
        typeof ls.setItem !== 'function' ||
        typeof ls.removeItem !== 'function') {
      return null;
    }

    // Test if it's actually working by trying a simple operation
    // This will catch broken polyfills
    const testKey = '__localStorage_test__';
    ls.setItem(testKey, 'test');
    ls.getItem(testKey);
    ls.removeItem(testKey);

    return ls;
  } catch (error) {
    // Any error means localStorage is not available or broken
    console.warn('localStorage is not available or broken:', error);
    return null;
  }
}

