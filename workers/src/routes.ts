import { Hono } from 'hono';
import type { Env } from './index';
import { setupStorage } from './storage';
import { hashPassword, verifyPassword } from './auth';
import { z } from 'zod';
import { insertResultSchema, insertPollingCenterSchema, insertCandidateSchema, insertPoliticalPartySchema } from '../../shared/schema';

export async function setupRoutes() {
  const app = new Hono<{ Bindings: Env }>();
  
  // Initialize storage
  app.use('*', async (c, next) => {
    c.set('storage', setupStorage(c.env));
    await next();
  });

  // Authentication routes
  app.post('/auth/login', async (c) => {
    try {
      const { email, password } = await c.req.json();
      const storage = c.get('storage');
      
      const user = await storage.getUserByEmail(email);
      if (!user || !await verifyPassword(password, user.passwordHash)) {
        return c.json({ message: 'Invalid credentials' }, 401);
      }

      // Create session in KV store
      const sessionId = crypto.randomUUID();
      const sessionData = {
        userId: user.id,
        email: user.email,
        role: user.role,
        createdAt: Date.now(),
      };
      
      await c.env.KV.put(`session:${sessionId}`, JSON.stringify(sessionData), {
        expirationTtl: 24 * 60 * 60, // 24 hours
      });

      // Set session cookie
      c.header('Set-Cookie', `session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`);
      
      return c.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return c.json({ message: 'Internal server error' }, 500);
    }
  });

  app.post('/auth/logout', async (c) => {
    try {
      const sessionCookie = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1];
      if (sessionCookie) {
        await c.env.KV.delete(`session:${sessionCookie}`);
      }
      
      c.header('Set-Cookie', 'session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/');
      return c.json({ message: 'Logout successful' });
    } catch (error) {
      console.error('Logout error:', error);
      return c.json({ message: 'Internal server error' }, 500);
    }
  });

  app.get('/auth/user', async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ message: 'Unauthorized' }, 401);
    }
    return c.json(user);
  });

  // Analytics routes
  app.get('/analytics', async (c) => {
    try {
      const storage = c.get('storage');
      const analytics = await getRealTimeAnalytics(storage);
      return c.json(analytics);
    } catch (error) {
      console.error('Analytics error:', error);
      return c.json({ message: 'Failed to fetch analytics' }, 500);
    }
  });

  // Party performance route
  app.get('/party-performance', async (c) => {
    try {
      const storage = c.get('storage');
      const partyData = await storage.getPartyPerformanceData();
      return c.json(partyData);
    } catch (error) {
      console.error('Party performance error:', error);
      return c.json({ message: 'Failed to fetch party performance' }, 500);
    }
  });

  // Results routes
  app.get('/results', async (c) => {
    try {
      const storage = c.get('storage');
      const results = await storage.getAllResults();
      return c.json(results);
    } catch (error) {
      console.error('Results error:', error);
      return c.json({ message: 'Failed to fetch results' }, 500);
    }
  });

  app.post('/results', async (c) => {
    try {
      const user = c.get('user');
      if (!user) {
        return c.json({ message: 'Unauthorized' }, 401);
      }

      const formData = await c.req.formData();
      const resultData = JSON.parse(formData.get('data') as string);
      
      // Handle file uploads to R2
      const files = formData.getAll('files') as File[];
      const uploadedFiles: string[] = [];
      
      for (const file of files) {
        if (file instanceof File) {
          const fileName = `${Date.now()}-${file.name}`;
          await c.env.FILES.put(fileName, await file.arrayBuffer(), {
            httpMetadata: {
              contentType: file.type,
            },
          });
          uploadedFiles.push(fileName);
        }
      }

      // Validate and save result
      const validatedData = insertResultSchema.parse({
        ...resultData,
        submittedBy: user.id,
        documents: uploadedFiles,
        submittedAt: new Date().toISOString(),
      });

      const storage = c.get('storage');
      const result = await storage.createResult(validatedData);
      
      return c.json(result, 201);
    } catch (error) {
      console.error('Create result error:', error);
      return c.json({ message: 'Failed to create result' }, 500);
    }
  });

  // Polling centers routes
  app.get('/polling-centers', async (c) => {
    try {
      const storage = c.get('storage');
      const centers = await storage.getAllPollingCenters();
      return c.json(centers);
    } catch (error) {
      console.error('Polling centers error:', error);
      return c.json({ message: 'Failed to fetch polling centers' }, 500);
    }
  });

  // Candidates routes
  app.get('/candidates', async (c) => {
    try {
      const storage = c.get('storage');
      const candidates = await storage.getAllCandidates();
      return c.json(candidates);
    } catch (error) {
      console.error('Candidates error:', error);
      return c.json({ message: 'Failed to fetch candidates' }, 500);
    }
  });

  // Political parties routes
  app.get('/political-parties', async (c) => {
    try {
      const storage = c.get('storage');
      const parties = await storage.getAllPoliticalParties();
      return c.json(parties);
    } catch (error) {
      console.error('Political parties error:', error);
      return c.json({ message: 'Failed to fetch political parties' }, 500);
    }
  });

  return app;
}

// Helper function for real-time analytics
async function getRealTimeAnalytics(storage: any) {
  try {
    const stats = await storage.getStats();
    const recentSubmissions = await storage.getRecentSubmissions(10);
    const verificationQueue = await storage.getPendingVerifications();
    const topPerformingCenters = await storage.getTopPerformingCenters(5);
    const hourlySubmissions = await storage.getHourlySubmissionTrends();

    return {
      overview: stats,
      recentActivity: recentSubmissions,
      pendingVerifications: verificationQueue.length,
      topCenters: topPerformingCenters,
      submissionTrends: hourlySubmissions,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error getting real-time analytics:', error);
    return null;
  }
}