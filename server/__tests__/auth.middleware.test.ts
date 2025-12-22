import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createMockRequest, createMockResponse, createMockNext } from '../../test/utils/request.mock';
import { createMockUser } from '../../test/mocks/storage.mock';

// Use vi.hoisted to create mock before vi.mock hoists
const { mockGetUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
}));

// Mock the storage module
vi.mock('../storage', () => ({
  storage: {
    getUser: mockGetUser,
  },
}));

// Import the middleware after mocking
import { isAuthenticated, isAdmin } from '../replitAuth';

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockReset();
  });

  describe('isAuthenticated', () => {
    it('should return 401 when not authenticated', async () => {
      const req = createMockRequest({
        isAuthenticated: vi.fn(() => false),
      });
      const res = createMockResponse();
      const next = createMockNext();

      await isAuthenticated(req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when authenticated', async () => {
      const req = createMockRequest({
        isAuthenticated: vi.fn(() => true),
        user: { id: 'user-123' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await isAuthenticated(req as Request, res as Response, next as NextFunction);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('isAdmin', () => {
    it('should return 401 when no user', async () => {
      const req = createMockRequest({
        user: undefined,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await isAdmin(req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user has no id', async () => {
      const req = createMockRequest({
        user: {} as { id: string },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await isAdmin(req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not admin', async () => {
      const req = createMockRequest({
        user: { id: 'user-123' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockGetUser.mockResolvedValue(createMockUser({ isAdmin: false }));

      await isAdmin(req as Request, res as Response, next as NextFunction);

      expect(mockGetUser).toHaveBeenCalledWith('user-123');
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden - Admin access required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user not found in database', async () => {
      const req = createMockRequest({
        user: { id: 'user-123' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockGetUser.mockResolvedValue(undefined);

      await isAdmin(req as Request, res as Response, next as NextFunction);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden - Admin access required' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() when user is admin', async () => {
      const req = createMockRequest({
        user: { id: 'admin-123' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      mockGetUser.mockResolvedValue(createMockUser({ id: 'admin-123', isAdmin: true }));

      await isAdmin(req as Request, res as Response, next as NextFunction);

      expect(mockGetUser).toHaveBeenCalledWith('admin-123');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

