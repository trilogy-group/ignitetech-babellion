import { vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

export interface MockRequest extends Partial<Request> {
  user?: {
    id: string;
    [key: string]: unknown;
  };
  isAuthenticated?: () => boolean;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}

export interface MockResponse extends Partial<Response> {
  statusCode?: number;
  jsonData?: unknown;
}

/**
 * Creates a mock Express request object
 */
export function createMockRequest(overrides: MockRequest = {}): MockRequest {
  return {
    user: undefined,
    isAuthenticated: vi.fn(() => false),
    params: {},
    query: {},
    body: {},
    get: vi.fn(),
    ...overrides,
  };
}

/**
 * Creates a mock Express response object with chainable methods
 */
export function createMockResponse() {
  const res = {
    statusCode: 200,
    jsonData: undefined as unknown,
    status: vi.fn(),
    json: vi.fn(),
    send: vi.fn(),
    redirect: vi.fn(),
  };

  // Make methods chainable by returning the response object
  res.status.mockImplementation((code: number) => {
    res.statusCode = code;
    return res;
  });

  res.json.mockImplementation((data: unknown) => {
    res.jsonData = data;
    return res;
  });

  res.send.mockImplementation((data: unknown) => {
    res.jsonData = data;
    return res;
  });

  return res;
}

/**
 * Creates a mock next function
 */
export function createMockNext(): NextFunction & ReturnType<typeof vi.fn> {
  return vi.fn() as NextFunction & ReturnType<typeof vi.fn>;
}

/**
 * Helper to create authenticated request
 */
export function createAuthenticatedRequest(
  userId: string,
  overrides: MockRequest = {}
): MockRequest {
  return createMockRequest({
    user: { id: userId },
    isAuthenticated: vi.fn(() => true),
    ...overrides,
  });
}

/**
 * Helper to create admin request
 */
export function createAdminRequest(
  userId: string,
  overrides: MockRequest = {}
): MockRequest {
  return createMockRequest({
    user: { id: userId, isAdmin: true },
    isAuthenticated: vi.fn(() => true),
    ...overrides,
  });
}

