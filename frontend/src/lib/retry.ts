/**
 * Retry utilities for failed operations
 */

interface RetryOptions {
  maxAttempts?: number;
  delay?: number;
  backoff?: 'linear' | 'exponential';
  onRetry?: (attempt: number, error: any) => void;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 'exponential',
    onRetry,
    shouldRetry = () => true,
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!shouldRetry(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        throw error;
      }

      // Call onRetry callback
      if (onRetry) {
        onRetry(attempt, error);
      }

      // Calculate delay
      const retryDelay =
        backoff === 'exponential'
          ? delay * Math.pow(2, attempt - 1)
          : delay * attempt;

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable (network errors, 5xx errors)
 */
export function isRetryableError(error: any): boolean {
  // Network errors (no response)
  if (!error.response) {
    return true;
  }

  const status = error.response?.status;

  // Retry on server errors (5xx)
  if (status >= 500 && status < 600) {
    return true;
  }

  // Retry on specific status codes
  if (status === 408 || status === 429) {
    // Request Timeout or Too Many Requests
    return true;
  }

  return false;
}

/**
 * Retry with specific error handling
 */
export async function retryWithErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage: string = 'Operation failed',
  options: RetryOptions = {}
): Promise<T> {
  return retry(fn, {
    ...options,
    shouldRetry: isRetryableError,
    onRetry: (attempt, error) => {
      console.warn(`${errorMessage} - Retry attempt ${attempt}`, error);
      if (options.onRetry) {
        options.onRetry(attempt, error);
      }
    },
  });
}

/**
 * Create a retryable version of an async function
 */
export function makeRetryable<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: any[]) => {
    return retry(() => fn(...args), options);
  }) as T;
}

/**
 * Retry queue for batch operations
 */
export class RetryQueue<T> {
  private queue: Array<() => Promise<T>> = [];
  private processing = false;
  private results: T[] = [];
  private errors: any[] = [];

  constructor(private options: RetryOptions = {}) {}

  /**
   * Add operation to queue
   */
  add(operation: () => Promise<T>): void {
    this.queue.push(operation);
  }

  /**
   * Process all operations in queue
   */
  async process(): Promise<{ results: T[]; errors: any[] }> {
    if (this.processing) {
      throw new Error('Queue is already being processed');
    }

    this.processing = true;
    this.results = [];
    this.errors = [];

    for (const operation of this.queue) {
      try {
        const result = await retry(operation, this.options);
        this.results.push(result);
      } catch (error) {
        this.errors.push(error);
      }
    }

    this.processing = false;
    this.queue = [];

    return {
      results: this.results,
      errors: this.errors,
    };
  }

  /**
   * Get queue status
   */
  getStatus(): {
    pending: number;
    completed: number;
    failed: number;
    processing: boolean;
  } {
    return {
      pending: this.queue.length,
      completed: this.results.length,
      failed: this.errors.length,
      processing: this.processing,
    };
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
    this.results = [];
    this.errors = [];
  }
}

/**
 * Circuit breaker pattern for preventing cascading failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private options: {
      failureThreshold?: number;
      resetTimeout?: number;
      onStateChange?: (state: 'CLOSED' | 'OPEN' | 'HALF_OPEN') => void;
    } = {}
  ) {
    this.options.failureThreshold = options.failureThreshold || 5;
    this.options.resetTimeout = options.resetTimeout || 60000; // 1 minute
  }

  /**
   * Execute function with circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - (this.lastFailureTime || 0);
      
      if (timeSinceLastFailure < this.options.resetTimeout!) {
        throw new Error('Circuit breaker is OPEN');
      }
      
      // Try to close circuit
      this.setState('HALF_OPEN');
    }

    try {
      const result = await fn();
      
      // Success - reset failure count
      if (this.state === 'HALF_OPEN') {
        this.setState('CLOSED');
      }
      this.failureCount = 0;
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      // Open circuit if threshold reached
      if (this.failureCount >= this.options.failureThreshold!) {
        this.setState('OPEN');
      }
      
      throw error;
    }
  }

  /**
   * Get circuit state
   */
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.setState('CLOSED');
  }

  private setState(state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
    this.state = state;
    if (this.options.onStateChange) {
      this.options.onStateChange(state);
    }
  }
}
