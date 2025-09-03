import { createMiddleware } from 'hono/factory';
import type { Env } from './index';

// Password hashing utilities using Web Crypto API
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'salt-ptc-system'); // Add salt
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computedHash = await hashPassword(password);
  return computedHash === hash;
}

// Authentication middleware
export const setupAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  // Skip auth for login route
  if (c.req.path === '/api/auth/login' || !c.req.path.startsWith('/api/')) {
    return next();
  }

  try {
    // Get session from cookie
    const sessionCookie = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
    
    if (!sessionCookie) {
      c.set('user', null);
      return next();
    }

    // Get session data from KV store
    const sessionDataStr = await c.env.KV.get(`session:${sessionCookie}`);
    
    if (!sessionDataStr) {
      c.set('user', null);
      return next();
    }

    const sessionData = JSON.parse(sessionDataStr);
    
    // Check if session is still valid (not expired)
    if (Date.now() - sessionData.createdAt > 24 * 60 * 60 * 1000) {
      // Session expired, delete it
      await c.env.KV.delete(`session:${sessionCookie}`);
      c.set('user', null);
      return next();
    }

    // Set user data in context
    c.set('user', {
      id: sessionData.userId,
      email: sessionData.email,
      role: sessionData.role,
    });

  } catch (error) {
    console.error('Auth middleware error:', error);
    c.set('user', null);
  }

  return next();
});

// Role-based authorization middleware
export const requireAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ message: 'Unauthorized' }, 401);
  }
  return next();
});

export const requireRole = (role: string) => {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const user = c.get('user');
    if (!user || user.role !== role) {
      return c.json({ message: 'Forbidden' }, 403);
    }
    return next();
  });
};