/**
 * Authentication middleware
 * Validates API keys and sets user context
 */

import type { Context, Next } from 'hono';
import { config } from '../utils/config';

/**
 * API key types and their rate limits
 */
export enum ApiKeyType {
  Internal = 'internal',
  Public = 'public',
  Admin = 'admin',
}

/**
 * Auth context added to Hono context
 */
export interface AuthContext {
  apiKeyType: ApiKeyType;
  apiKey: string;
  rateLimit: number;
}

/**
 * Extract API key from request
 * Supports: Authorization header (Bearer token) or query parameter
 */
function extractApiKey(c: Context): string | null {
  // Try Authorization header first
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fall back to query parameter (for WebSocket connections)
  const queryKey = c.req.query('key');
  if (queryKey) {
    return queryKey;
  }

  return null;
}

/**
 * Determine API key type and rate limit
 */
function getApiKeyType(apiKey: string): AuthContext | null {
  // Check internal keys
  if (config.INTERNAL_API_KEYS.includes(apiKey)) {
    return {
      apiKeyType: ApiKeyType.Internal,
      apiKey,
      rateLimit: config.RATE_LIMIT_INTERNAL,
    };
  }

  // Check public keys
  if (config.PUBLIC_API_KEYS.includes(apiKey)) {
    return {
      apiKeyType: ApiKeyType.Public,
      apiKey,
      rateLimit: config.RATE_LIMIT_PUBLIC_FREE,
    };
  }

  // Check admin keys
  if (config.ADMIN_API_KEYS.includes(apiKey)) {
    return {
      apiKeyType: ApiKeyType.Admin,
      apiKey,
      rateLimit: config.RATE_LIMIT_ADMIN, // 0 = unlimited
    };
  }

  return null;
}

/**
 * Authentication middleware
 * Validates API key and adds auth context to request
 */
export async function authMiddleware(c: Context, next: Next) {
  const apiKey = extractApiKey(c);

  if (!apiKey) {
    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing API key. Provide via Authorization header or ?key= query parameter',
          request_id: c.get('requestId'),
        },
        status: 401,
      },
      401
    );
  }

  const authContext = getApiKeyType(apiKey);

  if (!authContext) {
    return c.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid API key',
          request_id: c.get('requestId'),
        },
        status: 401,
      },
      401
    );
  }

  // Add auth context to request
  c.set('auth', authContext);

  await next();
}

/**
 * Require specific API key type
 * Use after authMiddleware
 */
export function requireApiKeyType(...allowedTypes: ApiKeyType[]) {
  return async (c: Context, next: Next) => {
    const auth = c.get('auth') as AuthContext | undefined;

    if (!auth) {
      return c.json(
        {
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            request_id: c.get('requestId'),
          },
          status: 401,
        },
        401
      );
    }

    if (!allowedTypes.includes(auth.apiKeyType)) {
      return c.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: `This endpoint requires ${allowedTypes.join(' or ')} API key`,
            request_id: c.get('requestId'),
          },
          status: 403,
        },
        403
      );
    }

    await next();
  };
}
