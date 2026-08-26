/* MediTrack - Centralized Smart Cache & Preload Manager */

const MEMORY_CACHE = new Map();
const CACHE_PREFIX = 'meditrack_cache_';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes default TTL

export class CacheManager {
  /**
   * Set a cached item in memory and sessionStorage
   * @param {string} key
   * @param {any} data
   * @param {number} [ttlMs=DEFAULT_TTL_MS]
   */
  static set(key, data, ttlMs = DEFAULT_TTL_MS) {
    if (!key || data === undefined) return;
    const entry = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttlMs
    };

    // 1. In-memory cache for instant zero-latency access within the page lifetime
    MEMORY_CACHE.set(key, entry);

    // 2. sessionStorage for persistence across page navigations within the session
    try {
      sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch (e) {
      console.warn('[CacheManager] sessionStorage quota exceeded or unavailable:', e);
    }
  }

  /**
   * Get a cached item.
   * Returns { data, isStale, exists }
   * @param {string} key
   * @returns {{ data: any, isStale: boolean, exists: boolean }}
   */
  static get(key) {
    if (!key) return { data: null, isStale: true, exists: false };

    // 1. Check memory cache first
    let entry = MEMORY_CACHE.get(key);

    // 2. Fallback to sessionStorage
    if (!entry) {
      try {
        const raw = sessionStorage.getItem(CACHE_PREFIX + key);
        if (raw) {
          entry = JSON.parse(raw);
          MEMORY_CACHE.set(key, entry);
        }
      } catch (e) {
        console.warn('[CacheManager] Error reading sessionStorage for key:', key, e);
      }
    }

    if (!entry) {
      return { data: null, isStale: true, exists: false };
    }

    const isStale = Date.now() > entry.expiresAt;
    return { data: entry.data, isStale, exists: true };
  }

  /**
   * Invalidate one or more cache keys
   * @param {...string} keys
   */
  static invalidate(...keys) {
    keys.forEach(key => {
      MEMORY_CACHE.delete(key);
      try {
        sessionStorage.removeItem(CACHE_PREFIX + key);
      } catch (e) {}
    });
  }

  /**
   * Invalidate all keys matching a regex or prefix
   * @param {RegExp|string} pattern
   */
  static invalidatePattern(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

    // Memory
    for (const key of MEMORY_CACHE.keys()) {
      if (regex.test(key)) {
        MEMORY_CACHE.delete(key);
      }
    }

    // sessionStorage
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const fullKey = sessionStorage.key(i);
        if (fullKey && fullKey.startsWith(CACHE_PREFIX)) {
          const rawKey = fullKey.substring(CACHE_PREFIX.length);
          if (regex.test(rawKey)) {
            sessionStorage.removeItem(fullKey);
          }
        }
      }
    } catch (e) {}
  }

  /**
   * Clear all MediTrack cache data (called on logout)
   */
  static clearAll() {
    MEMORY_CACHE.clear();
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const fullKey = sessionStorage.key(i);
        if (fullKey && fullKey.startsWith(CACHE_PREFIX)) {
          sessionStorage.removeItem(fullKey);
        }
      }
    } catch (e) {}
    console.log('[CacheManager] All application caches cleared successfully.');
  }

  /**
   * Stale-While-Revalidate (SWR) fetching helper
   * If cache exists, returns cached data immediately and revalidates in background if needed.
   * If cache does not exist, fetches fresh data, caches it, and returns.
   *
   * @param {string} key Cache key
   * @param {() => Promise<any>} fetchFn Function that fetches fresh data from Firestore
   * @param {Object} options
   * @param {boolean} [options.forceRefresh=false] Bypass cache and force network fetch
   * @param {number} [options.ttl=DEFAULT_TTL_MS] Time-to-live in milliseconds
   * @param {(freshData: any) => void} [options.onBackgroundUpdate] Callback if background sync gets new data
   * @returns {Promise<{ data: any, fromCache: boolean }>}
   */
  static async getOrFetch(key, fetchFn, options = {}) {
    const { forceRefresh = false, ttl = DEFAULT_TTL_MS, onBackgroundUpdate } = options;

    if (!forceRefresh) {
      const cached = this.get(key);
      if (cached.exists && cached.data !== null) {
        // Return cached immediately!
        if (cached.isStale || onBackgroundUpdate) {
          // Trigger background revalidation asynchronously
          this._revalidateInBackground(key, fetchFn, ttl, cached.data, onBackgroundUpdate);
        }
        return { data: cached.data, fromCache: true };
      }
    }

    // Cache miss or force refresh
    const freshData = await fetchFn();
    this.set(key, freshData, ttl);
    return { data: freshData, fromCache: false };
  }

  static async _revalidateInBackground(key, fetchFn, ttl, previousData, onBackgroundUpdate) {
    try {
      const freshData = await fetchFn();
      this.set(key, freshData, ttl);

      // Check if data actually changed before triggering UI update
      const hasChanged = JSON.stringify(previousData) !== JSON.stringify(freshData);
      if (hasChanged && typeof onBackgroundUpdate === 'function') {
        onBackgroundUpdate(freshData);
      }
    } catch (err) {
      console.warn(`[CacheManager] Background revalidation failed for ${key}:`, err);
    }
  }
}

/**
 * Background Preloader:
 * Safely preloads common module data during browser idle time so future page navigations are instantaneous.
 */
let isPreloading = false;
export async function preloadApplicationData(user, fbDb) {
  if (!user || isPreloading) return;
  isPreloading = true;

  const runIdle = (task) => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(task, { timeout: 2000 });
    } else {
      setTimeout(task, 150);
    }
  };

  runIdle(async () => {
    try {
      const isAdmin = user.role === 'admin' || user.role === 'supervisor';

      if (isAdmin) {
        // Preload core collections in parallel in background
        await Promise.allSettled([
          fbDb.getInterns({ backgroundSync: false }),
          fbDb.getMergedInternsAndStudents({ backgroundSync: false }),
          fbDb.getDoctors({ backgroundSync: false }),
          fbDb.getAttendance({ backgroundSync: false }),
          fbDb.getTraining({ backgroundSync: false }),
          fbDb.getUsers({ backgroundSync: false })
        ]);
        console.log('⚡ [MediTrack Preloader] Admin data successfully preloaded in background.');
      } else {
        // Preload student specific lightweight data
        await Promise.allSettled([
          fbDb.getInterns({ backgroundSync: false }),
          fbDb.getDoctors({ backgroundSync: false }),
          fbDb.getAttendance({ backgroundSync: false }),
          fbDb.getTraining({ backgroundSync: false })
        ]);
        console.log('⚡ [MediTrack Preloader] Student data successfully preloaded in background.');
      }
    } catch (error) {
      console.warn('[MediTrack Preloader] Preload encountered an issue:', error);
    } finally {
      isPreloading = false;
    }
  });
}
