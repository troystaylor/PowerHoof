/**
 * Skill Cache Utility
 * 
 * Provides a simple TTL-based cache that skills can use to cache
 * API responses and reduce external calls.
 */

/**
 * Create a new cache instance
 * @param {Object} options - Cache options
 * @param {number} options.maxSize - Maximum number of entries (default: 100)
 * @param {number} options.defaultTTL - Default TTL in milliseconds (default: 5 min)
 * @returns {Object} Cache instance with get, set, has, delete, clear, stats methods
 */
export function createSkillCache(options = {}) {
  const { maxSize = 100, defaultTTL = 5 * 60 * 1000 } = options; // Default 5 min TTL
  
  const cache = new Map();
  let hits = 0;
  let misses = 0;
  
  function cleanup() {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt < now) {
        cache.delete(key);
      }
    }
  }
  
  // Run cleanup periodically
  const cleanupInterval = setInterval(cleanup, 60000);
  
  return {
    /**
     * Get a value from cache
     */
    get(key) {
      const entry = cache.get(key);
      
      if (!entry) {
        misses++;
        return undefined;
      }
      
      if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        misses++;
        return undefined;
      }
      
      hits++;
      return entry.value;
    },
    
    /**
     * Set a value in cache
     */
    set(key, value, ttl = defaultTTL) {
      // Enforce max size
      if (cache.size >= maxSize) {
        // Remove oldest entries
        const keysToDelete = Array.from(cache.keys()).slice(0, Math.ceil(maxSize * 0.2));
        keysToDelete.forEach(k => cache.delete(k));
      }
      
      cache.set(key, {
        value,
        expiresAt: Date.now() + ttl
      });
    },
    
    /**
     * Check if key exists and is not expired
     */
    has(key) {
      const entry = cache.get(key);
      if (!entry) return false;
      
      if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return false;
      }
      
      return true;
    },
    
    /**
     * Delete a key from cache
     */
    delete(key) {
      return cache.delete(key);
    },
    
    /**
     * Clear all entries
     */
    clear() {
      cache.clear();
    },
    
    /**
     * Get cache statistics
     */
    stats() {
      cleanup();
      const total = hits + misses;
      return {
        size: cache.size,
        hits,
        misses,
        hitRate: total > 0 ? (hits / total * 100).toFixed(1) + '%' : '0%'
      };
    },
    
    /**
     * Get or set pattern - fetch from cache or execute function
     */
    async getOrSet(key, fetcher, ttl) {
      const cached = this.get(key);
      if (cached !== undefined) {
        return cached;
      }
      
      const value = await fetcher();
      this.set(key, value, ttl);
      return value;
    },
    
    /**
     * Dispose of the cache (clear interval)
     */
    dispose() {
      clearInterval(cleanupInterval);
      cache.clear();
    }
  };
}

// Shared caches for common skill types
export const weatherCache = createSkillCache({ 
  defaultTTL: 10 * 60 * 1000,  // 10 min for weather
  maxSize: 50 
});

export const searchCache = createSkillCache({ 
  defaultTTL: 30 * 60 * 1000,  // 30 min for search results
  maxSize: 100 
});

export const newsCache = createSkillCache({ 
  defaultTTL: 15 * 60 * 1000,  // 15 min for news
  maxSize: 20 
});

export const definitionCache = createSkillCache({ 
  defaultTTL: 60 * 60 * 1000,  // 1 hour for definitions (they don't change)
  maxSize: 200 
});

export default { 
  createSkillCache, 
  weatherCache, 
  searchCache, 
  newsCache, 
  definitionCache 
};
