import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryOnDatabaseError } from '../retry';

// Mock the vite logging functions
vi.mock('../vite', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

describe('retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('retryOnDatabaseError', () => {
    it('should return result on first successful attempt', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');
      
      const result = await retryOnDatabaseError(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable database error codes', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce({ code: '57P01', message: 'terminating connection' })
        .mockResolvedValue('success after retry');

      const result = await retryOnDatabaseError(mockFn, { 
        maxAttempts: 3, 
        delays: [10, 10, 10],
        addJitter: false 
      });
      
      expect(result).toBe('success after retry');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 57P02 error code', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce({ code: '57P02', message: 'crash' })
        .mockResolvedValue('success');

      const result = await retryOnDatabaseError(mockFn, { 
        delays: [10],
        addJitter: false 
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 57P03 error code', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce({ code: '57P03', message: 'cannot connect' })
        .mockResolvedValue('success');

      const result = await retryOnDatabaseError(mockFn, { 
        delays: [10],
        addJitter: false 
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on connection error messages', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce({ message: 'Connection terminated unexpectedly' })
        .mockResolvedValue('success');

      const result = await retryOnDatabaseError(mockFn, { 
        delays: [10],
        addJitter: false 
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on ECONNREFUSED', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce({ message: 'connect ECONNREFUSED' })
        .mockResolvedValue('success');

      const result = await retryOnDatabaseError(mockFn, { 
        delays: [10],
        addJitter: false 
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should retry on ECONNRESET', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce({ message: 'read ECONNRESET' })
        .mockResolvedValue('success');

      const result = await retryOnDatabaseError(mockFn, { 
        delays: [10],
        addJitter: false 
      });
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should throw immediately on non-retryable errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Syntax error in SQL'));

      await expect(retryOnDatabaseError(mockFn, { delays: [10] }))
        .rejects.toThrow('Syntax error in SQL');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should throw immediately on unique constraint violations', async () => {
      const mockFn = vi.fn().mockRejectedValue({ 
        code: '23505', 
        message: 'duplicate key value violates unique constraint' 
      });

      await expect(retryOnDatabaseError(mockFn, { delays: [10] }))
        .rejects.toEqual({ 
          code: '23505', 
          message: 'duplicate key value violates unique constraint' 
        });
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw last error', async () => {
      const error = { code: '57P01', message: 'connection closed' };
      const mockFn = vi.fn().mockRejectedValue(error);

      await expect(retryOnDatabaseError(mockFn, { 
        maxAttempts: 3, 
        delays: [10, 10, 10],
        addJitter: false 
      })).rejects.toEqual(error);
      
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should use custom delays', async () => {
      const mockFn = vi.fn()
        .mockRejectedValueOnce({ code: '57P01' })
        .mockRejectedValueOnce({ code: '57P01' })
        .mockResolvedValue('success');

      const startTime = Date.now();
      
      await retryOnDatabaseError(mockFn, { 
        maxAttempts: 3, 
        delays: [50, 50, 50],
        addJitter: false 
      });
      
      const elapsed = Date.now() - startTime;
      // Should have waited approximately 100ms (2 retries x 50ms each)
      expect(elapsed).toBeGreaterThanOrEqual(90);
      expect(elapsed).toBeLessThan(200);
    });

    it('should handle null/undefined errors gracefully', async () => {
      const mockFn = vi.fn().mockRejectedValue(null);

      await expect(retryOnDatabaseError(mockFn, { delays: [10] }))
        .rejects.toBeNull();
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should not retry non-object errors', async () => {
      const mockFn = vi.fn().mockRejectedValue('string error');

      await expect(retryOnDatabaseError(mockFn, { delays: [10] }))
        .rejects.toBe('string error');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});

