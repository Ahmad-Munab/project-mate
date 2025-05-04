/**
 * Rate Limiter
 * This utility helps manage API call rates to prevent rate limit errors
 * and provides a queue system for handling multiple requests
 */

type QueueItem<T> = {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  priority: number;
};

export class RateLimiter {
  private queue: Array<QueueItem<any>> = [];
  private processing = false;
  private lastCallTime = 0;
  private minTimeBetweenCalls: number;
  private maxConcurrent: number;
  private activeRequests = 0;
  private name: string;

  constructor(options: {
    minTimeBetweenCalls?: number;
    maxConcurrent?: number;
    name?: string;
  } = {}) {
    this.minTimeBetweenCalls = options.minTimeBetweenCalls || 1000; // Default: 1 second between calls
    this.maxConcurrent = options.maxConcurrent || 1; // Default: 1 concurrent request
    this.name = options.name || 'default';
  }

  /**
   * Add a function to the rate-limited queue
   * @param fn Function to execute
   * @param priority Priority level (higher numbers = higher priority)
   * @returns Promise that resolves with the function result
   */
  async enqueue<T>(fn: () => Promise<T>, priority = 0): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Add to queue with priority
      this.queue.push({ fn, resolve, reject, priority });
      
      // Sort queue by priority (higher numbers first)
      this.queue.sort((a, b) => b.priority - a.priority);
      
      // Start processing if not already
      this.processQueue();
    });
  }

  private async processQueue() {
    // If already processing or queue is empty, return
    if (this.processing || this.queue.length === 0) return;
    
    // If we've reached max concurrent requests, return
    if (this.activeRequests >= this.maxConcurrent) return;
    
    this.processing = true;
    
    try {
      // Calculate time to wait based on last call
      const timeSinceLastCall = Date.now() - this.lastCallTime;
      if (timeSinceLastCall < this.minTimeBetweenCalls) {
        const waitTime = this.minTimeBetweenCalls - timeSinceLastCall;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      
      // Get next item from queue
      const item = this.queue.shift();
      if (!item) {
        this.processing = false;
        return;
      }
      
      // Update tracking variables
      this.lastCallTime = Date.now();
      this.activeRequests++;
      
      try {
        // Execute the function
        const result = await item.fn();
        item.resolve(result);
      } catch (error) {
        // Handle errors
        console.error(`Rate limiter (${this.name}) error:`, error);
        item.reject(error);
      } finally {
        // Update tracking variables
        this.activeRequests--;
      }
    } finally {
      // Reset processing flag and continue with next item if available
      this.processing = false;
      
      // If there are more items in the queue, process them
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  /**
   * Get the current queue length
   * @returns Number of items in the queue
   */
  get queueLength(): number {
    return this.queue.length;
  }

  /**
   * Get the number of active requests
   * @returns Number of active requests
   */
  get activeRequestCount(): number {
    return this.activeRequests;
  }

  /**
   * Clear the queue
   */
  clearQueue(): void {
    // Reject all pending items
    for (const item of this.queue) {
      item.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }
}

// Create and export default instances for common use cases
export const groqRateLimiter = new RateLimiter({
  minTimeBetweenCalls: 1000, // 1 second between calls
  maxConcurrent: 2, // Allow 2 concurrent requests
  name: 'groq'
});

export const databaseRateLimiter = new RateLimiter({
  minTimeBetweenCalls: 100, // 100ms between calls
  maxConcurrent: 5, // Allow 5 concurrent requests
  name: 'database'
});
