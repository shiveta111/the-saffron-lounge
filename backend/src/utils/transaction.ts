import prisma from '../config/prisma';
import * as winston from 'winston';

// Configure transaction logger
const transactionLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'transaction-handler' },
  transports: [
    new winston.transports.File({ filename: 'logs/transaction-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/transaction.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  transactionLogger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

/**
 * Execute a database transaction with automatic rollback on error
 * @param callback - Function containing transaction operations
 * @param context - Context information for logging
 * @returns Result of the transaction
 */
export async function executeTransaction<T>(
  callback: (tx: any) => Promise<T>,
  context: { operation: string; userId?: number; metadata?: any } = { operation: 'unknown' }
): Promise<T> {
  const startTime = Date.now();
  const transactionId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  transactionLogger.info('Transaction started', {
    transactionId,
    operation: context.operation,
    userId: context.userId,
    metadata: context.metadata,
  });

  try {
    // Execute transaction
    const result = await prisma.$transaction(async (tx) => {
      return await callback(tx);
    }, {
      maxWait: 5000, // Maximum time to wait for a transaction slot (5s)
      timeout: 10000, // Maximum time the transaction can run (10s)
    });

    const duration = Date.now() - startTime;

    transactionLogger.info('Transaction completed successfully', {
      transactionId,
      operation: context.operation,
      userId: context.userId,
      duration,
    });

    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    transactionLogger.error('Transaction failed and rolled back', {
      transactionId,
      operation: context.operation,
      userId: context.userId,
      duration,
      error: error.message,
      stack: error.stack,
      code: error.code,
    });

    // Re-throw the error to be handled by error middleware
    throw error;
  }
}

/**
 * Execute multiple operations in a transaction with retry logic
 * @param operations - Array of operations to execute
 * @param maxRetries - Maximum number of retry attempts
 * @param context - Context information for logging
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  context: { operation: string; userId?: number } = { operation: 'unknown' }
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      transactionLogger.info('Attempting operation', {
        operation: context.operation,
        attempt,
        maxRetries,
      });

      const result = await operation();

      if (attempt > 1) {
        transactionLogger.info('Operation succeeded after retry', {
          operation: context.operation,
          attempt,
        });
      }

      return result;
    } catch (error: any) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = 
        error.code === 'P2034' || // Transaction conflict
        error.code === 'P1001' || // Connection error
        error.code === 'P1002' || // Connection timeout
        error.message?.includes('timeout') ||
        error.message?.includes('deadlock');

      if (!isRetryable || attempt === maxRetries) {
        transactionLogger.error('Operation failed', {
          operation: context.operation,
          attempt,
          error: error.message,
          code: error.code,
          retryable: isRetryable,
        });
        throw error;
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      transactionLogger.warn('Operation failed, retrying', {
        operation: context.operation,
        attempt,
        nextAttempt: attempt + 1,
        delay,
        error: error.message,
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Batch operations with transaction support
 * Useful for bulk inserts/updates
 */
export async function batchOperation<T>(
  items: T[],
  operation: (item: T, tx: any) => Promise<any>,
  batchSize: number = 100,
  context: { operation: string; userId?: number } = { operation: 'batch' }
): Promise<any[]> {
  const results: any[] = [];
  
  // Process in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    transactionLogger.info('Processing batch', {
      operation: context.operation,
      batchNumber: Math.floor(i / batchSize) + 1,
      batchSize: batch.length,
      totalItems: items.length,
    });

    const transactionContext: any = {
      operation: `${context.operation}_batch_${Math.floor(i / batchSize) + 1}`,
      metadata: { batchSize: batch.length, totalItems: items.length },
    };

    if (context.userId !== undefined) {
      transactionContext.userId = context.userId;
    }

    const batchResults = await executeTransaction(async (tx) => {
      return await Promise.all(batch.map(item => operation(item, tx)));
    }, transactionContext);

    if (Array.isArray(batchResults)) {
      results.push(...batchResults);
    } else {
      results.push(batchResults);
    }
  }

  return results;
}

/**
 * Check database connection health
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error: any) {
    transactionLogger.error('Database connection check failed', {
      error: error.message,
      code: error.code,
    });
    return false;
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    transactionLogger.info('Database disconnected successfully');
  } catch (error: any) {
    transactionLogger.error('Error disconnecting from database', {
      error: error.message,
    });
  }
}
