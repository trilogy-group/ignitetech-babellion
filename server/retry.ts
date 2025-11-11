import { logInfo, logError } from './vite';

interface RetryOptions {
  maxAttempts?: number;
  delays?: number[]; // Delays in milliseconds
  addJitter?: boolean; // Add randomness to prevent thundering herd
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delays: [5000, 10000, 10000], // 5s, 10s, 10s
  addJitter: true,
};

/**
 * Check if an error is a retryable database error
 */
function isRetryableDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as Record<string, unknown>;
  
  // PostgreSQL error codes for connection issues:
  // 57P01 - terminating connection due to administrator command
  // 57P02 - terminating connection due to crash
  // 57P03 - cannot connect now
  const retryableCodes = ['57P01', '57P02', '57P03'];
  
  if (err.code && typeof err.code === 'string') {
    if (retryableCodes.includes(err.code)) {
      return true;
    }
  }

  // Also check error messages for connection-related issues
  if (err.message && typeof err.message === 'string') {
    const message = err.message.toLowerCase();
    const connectionErrors = [
      'terminating connection',
      'connection terminated',
      'connection closed',
      'connection refused',
      'connection reset',
      'econnrefused',
      'econnreset',
    ];
    
    if (connectionErrors.some(msg => message.includes(msg))) {
      return true;
    }
  }

  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Apply jitter to a delay to prevent thundering herd
 * Adds ±25% randomness to the delay
 */
function applyJitter(delayMs: number): number {
  const jitterFactor = 0.25; // 25% jitter
  const jitter = delayMs * jitterFactor;
  const randomOffset = Math.random() * jitter * 2 - jitter;
  return Math.round(delayMs + randomOffset);
}

/**
 * Retry a database operation with exponential backoff
 * 
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns The result of the successful operation
 * @throws The last error if all retries are exhausted or if error is not retryable
 * 
 * @example
 * const result = await retryOnDatabaseError(
 *   async () => await db.query('SELECT * FROM users'),
 *   { maxAttempts: 3, delays: [5000, 10000, 10000] }
 * );
 */
export async function retryOnDatabaseError<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { maxAttempts, delays, addJitter } = config;

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Log success on retry (but not on first attempt)
      if (attempt > 0) {
        logInfo(`Database operation succeeded after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}`, "DB");
      }
      return await fn();
    } catch (error) {
      lastError = error;

      // If error is not retryable, throw immediately
      if (!isRetryableDatabaseError(error)) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxAttempts - 1) {
        logError(`Database operation failed after ${maxAttempts} attempts`, "DB", error);
        throw error;
      }

      // Calculate delay with optional jitter
      let delay = delays[attempt] || delays[delays.length - 1];
      if (addJitter) {
        delay = applyJitter(delay);
      }

      const errorCode = (error as Record<string, unknown>)?.code || 'unknown';
      logInfo(
        `Database error (${errorCode}), retrying in ${Math.round(delay / 1000)}s (attempt ${attempt + 1}/${maxAttempts})`,
        "DB"
      );

      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
