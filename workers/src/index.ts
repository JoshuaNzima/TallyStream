import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';
import { setupRoutes } from './routes';
import { setupAuth } from './auth';

// Define environment types
export interface Env {
  KV: KVNamespace;
  FILES: R2Bucket;
  DB: D1Database;
  SESSION_SECRET: string;
  DATABASE_URL?: string;
  ENCRYPTION_KEY: string;
  WEBSOCKET_DO: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', cors({
  origin: ['http://localhost:5173', 'https://*.workers.dev', 'https://*.pages.dev'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

// Request logging middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  const path = c.req.path;
  
  await next();
  
  const duration = Date.now() - start;
  if (path.startsWith('/api')) {
    console.log(`${c.req.method} ${path} ${c.res.status} in ${duration}ms`);
  }
});

// Set up authentication
app.use('*', setupAuth);

// Set up API routes
app.route('/api', await setupRoutes());

// Serve static files (React app)
app.get('*', serveStatic({
  root: './',
  onNotFound: (path, c) => {
    // For SPA routing, serve index.html for non-API routes
    if (!path.startsWith('/api')) {
      return c.text('<!DOCTYPE html><html><head><title>PTC Election System</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>', 200, {
        'Content-Type': 'text/html',
      });
    }
    return c.text('Not Found', 404);
  },
}));

export default app;

// Export the Durable Object class for WebSocket functionality
export { WebSocketDurableObject } from './websocket';