import { beforeAll, afterAll, afterEach, vi } from 'vitest';

// Mock environment variables before any imports
beforeAll(() => {
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
  process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars!!!';
  process.env.SESSION_SECRET = 'test-session-secret-for-testing';
  process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
});

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Cleanup
afterAll(() => {
  vi.restoreAllMocks();
});

