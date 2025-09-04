import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';

// Define environment types
export interface Env {
  // Cloudflare services
  KV?: KVNamespace;
  FILES?: R2Bucket;
  DB?: D1Database;
  WEBSOCKET_DO?: DurableObjectNamespace;
  
  // Environment variables
  SESSION_SECRET?: string;
  DATABASE_URL?: string;
  ENCRYPTION_KEY?: string;
  NODE_ENV?: string;
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

// Basic API route for testing
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', message: 'PTC Election System API is running on Cloudflare Workers' });
});

// Serve static files (React app)
app.get('*', serveStatic({
  root: './dist/public',
  onNotFound: async (path, c) => {
    // For SPA routing, serve index.html for non-API routes
    if (!path.startsWith('/api')) {
      // Serve the built index.html file for client-side routing
      return c.html(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>PTC Election System</title>
    <link rel="stylesheet" href="/assets/index-BOIFX3lv.css">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/index-mZYcoRn4.js"></script>
  </body>
</html>`);
    }
    return c.text('Not Found', 404);
  },
}));

export default app;

// Export the Durable Object class for WebSocket functionality
// Note: Uncomment when WebSocket functionality is needed
// export { WebSocketDurableObject } from './websocket';