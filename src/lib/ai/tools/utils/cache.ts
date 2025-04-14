/**
 * Cache Utility
 * This file contains a simple cache implementation for LLM responses
 */

/**
 * Simple cache for LLM responses
 */
export class LLMCache {
  private cache: Map<string, any>;
  private maxSize: number;
  private ttl: number;

  /**
   * Create a new LLM cache
   * @param maxSize - The maximum number of items to store in the cache
   * @param ttl - The time-to-live for cache items in milliseconds
   */
  constructor(maxSize = 100, ttl = 1000 * 60 * 5) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Get a value from the cache
   * @param key - The cache key
   * @returns The cached value, or undefined if not found
   */
  get(key: string): any {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }
    
    // Check if the item has expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  /**
   * Set a value in the cache
   * @param key - The cache key
   * @param value - The value to cache
   */
  set(key: string, value: any): void {
    // If the cache is full, remove the oldest item
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    // Add the new item
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl,
    });
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the number of items in the cache
   * @returns The number of items in the cache
   */
  size(): number {
    return this.cache.size;
  }
}
