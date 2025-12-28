import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * CacheService
 *
 * Simple caching layer for API responses with:
 * - Memory cache for fast access
 * - AsyncStorage for persistent cache
 * - TTL (Time To Live) support
 * - Cache invalidation
 */
class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.cachePrefix = '@hipo_cache:';
  }

  /**
   * Generate cache key
   */
  generateKey(key) {
    return `${this.cachePrefix}${key}`;
  }

  /**
   * Set cache entry
   * @param {string} key - Cache key
   * @param {any} data - Data to cache
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
   * @param {boolean} persistent - Save to AsyncStorage (default: false)
   */
  async set(key, data, ttl = 5 * 60 * 1000, persistent = false) {
    const cacheKey = this.generateKey(key);
    const expiresAt = Date.now() + ttl;

    const cacheEntry = {
      data,
      expiresAt,
      cachedAt: Date.now(),
    };

    // Store in memory cache
    this.memoryCache.set(cacheKey, cacheEntry);

    // Store in persistent cache if requested
    if (persistent) {
      try {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      } catch (error) {
        console.error('Error saving to persistent cache:', error);
      }
    }
  }

  /**
   * Get cache entry
   * @param {string} key - Cache key
   * @param {boolean} checkPersistent - Check AsyncStorage if not in memory (default: true)
   */
  async get(key, checkPersistent = true) {
    const cacheKey = this.generateKey(key);

    // Check memory cache first
    if (this.memoryCache.has(cacheKey)) {
      const entry = this.memoryCache.get(cacheKey);

      // Check if expired
      if (entry.expiresAt > Date.now()) {
        return entry.data;
      } else {
        // Remove expired entry
        this.memoryCache.delete(cacheKey);
      }
    }

    // Check persistent cache
    if (checkPersistent) {
      try {
        const cached = await AsyncStorage.getItem(cacheKey);

        if (cached) {
          const entry = JSON.parse(cached);

          // Check if expired
          if (entry.expiresAt > Date.now()) {
            // Restore to memory cache
            this.memoryCache.set(cacheKey, entry);
            return entry.data;
          } else {
            // Remove expired entry
            await AsyncStorage.removeItem(cacheKey);
          }
        }
      } catch (error) {
        console.error('Error reading from persistent cache:', error);
      }
    }

    return null;
  }

  /**
   * Check if cache has valid entry
   */
  async has(key) {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Remove cache entry
   */
  async remove(key) {
    const cacheKey = this.generateKey(key);

    // Remove from memory cache
    this.memoryCache.delete(cacheKey);

    // Remove from persistent cache
    try {
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Error removing from persistent cache:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear() {
    // Clear memory cache
    this.memoryCache.clear();

    // Clear persistent cache
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.cachePrefix));

      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Error clearing persistent cache:', error);
    }
  }

  /**
   * Clear expired entries
   */
  async clearExpired() {
    const now = Date.now();

    // Clear expired memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }

    // Clear expired persistent cache
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.cachePrefix));

      for (const key of cacheKeys) {
        const cached = await AsyncStorage.getItem(key);

        if (cached) {
          const entry = JSON.parse(cached);

          if (entry.expiresAt <= now) {
            await AsyncStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error clearing expired persistent cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memoryCacheSize = this.memoryCache.size;
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;

    for (const entry of this.memoryCache.values()) {
      if (entry.expiresAt > now) {
        validCount++;
      } else {
        expiredCount++;
      }
    }

    return {
      total: memoryCacheSize,
      valid: validCount,
      expired: expiredCount,
    };
  }

  /**
   * Cached fetch wrapper
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Function that returns a Promise with data
   * @param {object} options - Cache options { ttl, persistent, forceRefresh }
   */
  async cachedFetch(key, fetchFn, options = {}) {
    const { ttl = 5 * 60 * 1000, persistent = false, forceRefresh = false } = options;

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await this.get(key);

      if (cached !== null) {
        return cached;
      }
    }

    // Fetch fresh data
    try {
      const data = await fetchFn();

      // Cache the result
      await this.set(key, data, ttl, persistent);

      return data;
    } catch (error) {
      console.error('Error in cachedFetch:', error);

      // If fetch fails, try to return stale cache
      const stale = await this.get(key, true);

      if (stale !== null) {
        console.log('Returning stale cache due to fetch error');
        return stale;
      }

      throw error;
    }
  }
}

// Singleton instance
const cacheService = new CacheService();

// Clear expired entries every 10 minutes
setInterval(() => {
  cacheService.clearExpired();
}, 10 * 60 * 1000);

export default cacheService;
