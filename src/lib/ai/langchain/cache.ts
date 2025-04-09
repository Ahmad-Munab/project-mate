/**
 * LLM Cache System
 * This file implements a caching system for LLM responses to reduce API calls
 */

import { BaseCache } from "@langchain/core/caches";

/**
 * In-memory cache for LLM responses
 * Implements the LangChain BaseCache interface
 */
export class LLMCache implements BaseCache {
  private cache: Map<string, { value: any; expires: number }>;
  
  constructor() {
    this.cache = new Map();
  }
  
  /**
   * Get a value from the cache
   * @param key - The cache key
   * @returns The cached value or null if not found
   */
  async lookup(key: string): Promise<any> {
    return this.get(key);
  }
  
  /**
   * Update the cache with a new value
   * @param key - The cache key
   * @param value - The value to cache
   */
  async update(key: string, value: any): Promise<void> {
    this.set(key, value, 3600); // Default TTL: 1 hour
  }
  
  /**
   * Get a value from the cache
   * @param key - The cache key
   * @returns The cached value or null if not found or expired
   */
  get(key: string): any {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    // Check if the item has expired
    if (item.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  /**
   * Set a value in the cache with a TTL
   * @param key - The cache key
   * @param value - The value to cache
   * @param ttl - Time to live in seconds
   */
  set(key: string, value: any, ttl: number): void {
    const expires = Date.now() + (ttl * 1000);
    this.cache.set(key, { value, expires });
  }
  
  /**
   * Delete a value from the cache
   * @param key - The cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * Clear all values from the cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Get all keys in the cache
   * @returns An array of cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
  
  /**
   * Get the number of items in the cache
   * @returns The number of items
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * Clean expired items from the cache
   */
  clean(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expires < now) {
        this.cache.delete(key);
      }
    }
  }
}
