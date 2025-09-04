/// <reference types="@cloudflare/workers-types" />

// Global WebSocket constants for Cloudflare Workers
declare const WebSocket: {
  readonly READY_STATE_OPEN: number;
  new(url: string): WebSocket;
};

// Extended environment interface
export interface CloudflareEnv {
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