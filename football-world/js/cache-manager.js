/**
 * Ultra Score / Football World - Cache Manager
 * Intelligent client-side caching with configurable TTL, in-memory store,
 * and localStorage persistence for offline tolerance & API rate-limit protection.
 */

class CacheManager {
  constructor(prefix = 'fw_cache_') {
    this.prefix = prefix;
    this.memoryCache = new Map();

    // Default Time-To-Live in milliseconds
    this.TTL = {
      LIVE_MATCHES: 30 * 1000,          // 30 seconds for live updates
      TODAY_MATCHES: 3 * 60 * 1000,      // 3 minutes for current fixtures
      HISTORICAL_MATCHES: 24 * 60 * 60 * 1000, // 24 hours for past dates
      UPCOMING_MATCHES: 30 * 60 * 1000,  // 30 minutes for future fixtures
      MATCH_DETAILS_LIVE: 30 * 1000,     // 30 seconds while match is active
      MATCH_DETAILS_FINAL: 24 * 60 * 60 * 1000, // 24 hours once full-time
      STANDINGS: 15 * 60 * 1000,         // 15 minutes for league tables
      COMPETITIONS: 24 * 60 * 60 * 1000, // 24 hours for competition metadata
      TEAMS: 12 * 60 * 60 * 1000         // 12 hours for team profiles
    };

    // Auto-clean expired items periodically
    this.cleanExpired();
  }

  /**
   * Generate namespaced key
   */
  _getKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * Set item in memory and localStorage with TTL
   */
  set(key, data, ttlMs = this.TTL.TODAY_MATCHES) {
    if (!key || data === undefined) return;

    const expiry = Date.now() + ttlMs;
    const cacheEntry = {
      data,
      expiry,
      timestamp: Date.now()
    };

    // Set in-memory
    this.memoryCache.set(key, cacheEntry);

    // Persist to localStorage if possible
    try {
      localStorage.setItem(this._getKey(key), JSON.stringify(cacheEntry));
    } catch (e) {
      // Storage might be full, prune oldest items
      this.pruneOldestStorage();
    }
  }

  /**
   * Get cached item if valid; otherwise return null
   */
  get(key) {
    if (!key) return null;

    const now = Date.now();

    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const entry = this.memoryCache.get(key);
      if (entry && entry.expiry > now) {
        return entry.data;
      }
      this.memoryCache.delete(key);
    }

    // Check localStorage
    try {
      const raw = localStorage.getItem(this._getKey(key));
      if (!raw) return null;

      const entry = JSON.parse(raw);
      if (entry && entry.expiry > now) {
        // Hydrate memory cache
        this.memoryCache.set(key, entry);
        return entry.data;
      } else {
        localStorage.removeItem(this._getKey(key));
      }
    } catch (e) {
      // Corrupt data
    }

    return null;
  }

  /**
   * Check if valid cached entry exists
   */
  has(key) {
    return this.get(key) !== null;
  }

  /**
   * Invalidate specific key
   */
  invalidate(key) {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(this._getKey(key));
    } catch (e) {}
  }

  /**
   * Invalidate all keys matching a prefix or pattern
   */
  invalidatePattern(pattern) {
    // Memory
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Storage
    try {
      const fullPattern = this._getKey(pattern);
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes(fullPattern)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  }

  /**
   * Clear all app caches
   */
  clear() {
    this.memoryCache.clear();
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  }

  /**
   * Clean expired entries from localStorage
   */
  cleanExpired() {
    try {
      const now = Date.now();
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) {
          try {
            const entry = JSON.parse(localStorage.getItem(k));
            if (entry && entry.expiry <= now) {
              keysToRemove.push(k);
            }
          } catch (e) {
            keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {}
  }

  /**
   * Prune oldest entries when storage quota is reached
   */
  pruneOldestStorage() {
    try {
      const entries = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(this.prefix)) {
          try {
            const val = JSON.parse(localStorage.getItem(k));
            entries.push({ key: k, timestamp: val.timestamp || 0 });
          } catch (e) {
            entries.push({ key: k, timestamp: 0 });
          }
        }
      }
      entries.sort((a, b) => a.timestamp - b.timestamp);
      // Remove oldest 25% of entries
      const toRemove = entries.slice(0, Math.max(1, Math.floor(entries.length / 4)));
      toRemove.forEach(item => localStorage.removeItem(item.key));
    } catch (e) {}
  }
}

// Global instance
window.appCache = new CacheManager();
