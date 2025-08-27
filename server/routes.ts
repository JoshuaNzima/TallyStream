import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword, validateRegister, validateLogin } from "./auth";
import passport from "passport";
import { insertResultSchema, insertPollingCenterSchema, insertCandidateSchema } from "@shared/schema";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images (JPEG, JPG, PNG) and PDF files are allowed"));
    }
  },
});

// WebSocket connections store
const wsConnections = new Set<WebSocket>();

// Broadcast real-time updates to all connected clients
function broadcastUpdate(type: string, data: any) {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  wsConnections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Analytics helper to get real-time stats
async function getRealTimeAnalytics() {
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.post('/api/register', async (req, res) => {
    try {
      const userData = validateRegister(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByIdentifier(userData.email || userData.phone || '');
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email or phone" });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(userData.password);
      const user = await storage.createUser({
        email: userData.email,
        phone: userData.phone,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash,
      });

      // Remove password hash from response
      const { passwordHash: _, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post('/api/login', (req, res, next) => {
    try {
      validateLogin(req.body);
      
      passport.authenticate('local', (err: any, user: any, info: any) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        if (!user) {
          return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }
        
        req.logIn(user, (err) => {
          if (err) {
            return res.status(500).json({ message: "Login failed" });
          }
          // Remove password hash from response
          const { passwordHash, ...userResponse } = user;
          res.json(userResponse);
        });
      })(req, res, next);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Invalid request" });
    }
  });

  app.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Remove password hash from response
      const { passwordHash, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard stats
  app.get("/api/stats", isAuthenticated, async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Real-time analytics endpoint
  app.get("/api/analytics", isAuthenticated, async (req, res) => {
    try {
      const analytics = await getRealTimeAnalytics();
      if (analytics) {
        res.json(analytics);
      } else {
        res.status(500).json({ message: "Failed to fetch analytics" });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Polling centers
  app.get("/api/polling-centers", isAuthenticated, async (req, res) => {
    try {
      const centers = await storage.getPollingCenters();
      res.json(centers);
    } catch (error) {
      console.error("Error fetching polling centers:", error);
      res.status(500).json({ message: "Failed to fetch polling centers" });
    }
  });

  app.post("/api/polling-centers", isAuthenticated, async (req: any, res) => {
    try {
      // Only admins can create polling centers
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertPollingCenterSchema.parse(req.body);
      const center = await storage.createPollingCenter(validatedData);
      
      // Log audit
      await storage.createAuditLog({
        userId: req.user.id,
        action: "CREATE",
        entityType: "polling_center",
        entityId: center.id,
        newValues: center,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.status(201).json(center);
    } catch (error) {
      console.error("Error creating polling center:", error);
      res.status(400).json({ message: "Failed to create polling center" });
    }
  });

  // Candidates
  app.get("/api/candidates", isAuthenticated, async (req, res) => {
    try {
      const candidates = await storage.getCandidates();
      res.json(candidates);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.post("/api/candidates", isAuthenticated, async (req: any, res) => {
    try {
      // Only admins can create candidates
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const validatedData = insertCandidateSchema.parse(req.body);
      const candidate = await storage.createCandidate(validatedData);
      res.status(201).json(candidate);
    } catch (error) {
      console.error("Error creating candidate:", error);
      res.status(400).json({ message: "Failed to create candidate" });
    }
  });

  // Results
  app.get("/api/results", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      let results;
      
      if (status) {
        results = await storage.getResultsByStatus(status as any);
      } else {
        results = await storage.getResults();
      }
      
      res.json(results);
    } catch (error) {
      console.error("Error fetching results:", error);
      res.status(500).json({ message: "Failed to fetch results" });
    }
  });

  app.post("/api/results", isAuthenticated, upload.array('files', 10), async (req: any, res) => {
    try {
      const validatedData = insertResultSchema.parse({
        ...req.body,
        candidateAVotes: parseInt(req.body.candidateAVotes),
        candidateBVotes: parseInt(req.body.candidateBVotes),
        candidateCVotes: parseInt(req.body.candidateCVotes),
        invalidVotes: parseInt(req.body.invalidVotes),
        submittedBy: req.user.id,
      });

      const result = await storage.createResult(validatedData);

      // Handle file uploads
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await storage.createResultFile({
            resultId: result.id,
            fileName: file.originalname,
            filePath: file.path,
            fileSize: file.size,
            mimeType: file.mimetype,
          });
        }
      }

      // Log audit
      await storage.createAuditLog({
        userId: req.user.id,
        action: "CREATE",
        entityType: "result",
        entityId: result.id,
        newValues: result,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Broadcast real-time updates
      broadcastUpdate("NEW_RESULT", result);
      
      // Get and broadcast updated analytics
      const analytics = await getRealTimeAnalytics();
      if (analytics) {
        broadcastUpdate("ANALYTICS_UPDATE", analytics);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error("Error creating result:", error);
      res.status(400).json({ message: "Failed to create result" });
    }
  });

  // Verify/approve results
  app.patch("/api/results/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'supervisor' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Supervisor or admin role required." });
      }

      const { status, flaggedReason } = req.body;
      const resultId = req.params.id;

      const updatedResult = await storage.updateResultStatus(
        resultId,
        status,
        req.user.id,
        flaggedReason
      );

      // Log audit
      await storage.createAuditLog({
        userId: req.user.id,
        action: "UPDATE",
        entityType: "result",
        entityId: resultId,
        newValues: { status, verifiedBy: req.user.id, flaggedReason },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Broadcast real-time updates
      broadcastUpdate("RESULT_STATUS_CHANGED", updatedResult);
      
      // Get and broadcast updated analytics
      const analytics = await getRealTimeAnalytics();
      if (analytics) {
        broadcastUpdate("ANALYTICS_UPDATE", analytics);
      }

      res.json(updatedResult);
    } catch (error) {
      console.error("Error updating result status:", error);
      res.status(400).json({ message: "Failed to update result status" });
    }
  });

  // User management (admin only)
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { role } = req.body;
      const userId = req.params.id;

      const updatedUser = await storage.updateUserRole(userId, role);

      // Log audit
      await storage.createAuditLog({
        userId: req.user.id,
        action: "UPDATE",
        entityType: "user",
        entityId: userId,
        newValues: { role },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(400).json({ message: "Failed to update user role" });
    }
  });

  // Audit logs
  app.get("/api/audit-logs", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'supervisor') {
        return res.status(403).json({ message: "Access denied" });
      }

      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // File serving
  app.get("/api/files/:filename", isAuthenticated, (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "File not found" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Periodic analytics broadcast (every 30 seconds)
  setInterval(async () => {
    if (wsConnections.size > 0) {
      const analytics = await getRealTimeAnalytics();
      if (analytics) {
        broadcastUpdate('ANALYTICS_UPDATE', analytics);
      }
    }
  }, 30000);

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');
    wsConnections.add(ws);

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'REQUEST_ANALYTICS') {
          const analytics = await getRealTimeAnalytics();
          if (analytics && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ANALYTICS_UPDATE',
              data: analytics,
              timestamp: new Date().toISOString(),
            }));
          }
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      wsConnections.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      wsConnections.delete(ws);
    });

    // Send initial analytics
    getRealTimeAnalytics().then(analytics => {
      if (analytics && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "ANALYTICS_UPDATE",
          data: analytics,
          timestamp: new Date().toISOString(),
        }));
      }
    });
  });

  return httpServer;
}
