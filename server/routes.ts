import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, hashPassword, validateRegister, validateLogin } from "./auth";
import passport from "passport";
import { insertResultSchema, insertPollingCenterSchema, insertCandidateSchema } from "@shared/schema";
import { seedDatabase } from "./seed";

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

  // Seed database on startup
  await seedDatabase();

  // Admin routes
  app.get('/api/admin/pending-users', isAuthenticated, async (req: any, res) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const pendingUsers = await storage.getPendingUsers();
      res.json(pendingUsers);
    } catch (error) {
      console.error("Error fetching pending users:", error);
      res.status(500).json({ message: "Failed to fetch pending users" });
    }
  });

  app.post('/api/admin/approve-user/:userId', isAuthenticated, async (req: any, res) => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    try {
      const { userId } = req.params;
      const approvedUser = await storage.approveUser(userId);
      res.json(approvedUser);
    } catch (error) {
      console.error("Error approving user:", error);
      res.status(500).json({ message: "Failed to approve user" });
    }
  });

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
        email: userData.email || undefined,
        phone: userData.phone || undefined,
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
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

  // Profile management routes
  app.put("/api/auth/profile", isAuthenticated, async (req: any, res) => {
    try {
      const { firstName, lastName, email, phone } = req.body;
      
      const updatedUser = await storage.updateUser(req.user.id, {
        firstName,
        lastName,
        email,
        phone,
        updatedAt: new Date(),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(400).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/auth/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      // Verify current password
      const user = await storage.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isValidPassword) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 10);
      
      await storage.updateUser(req.user.id, {
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(400).json({ message: "Failed to change password" });
    }
  });

  // Password reset route (for future implementation)
  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const { identifier } = req.body; // email or phone
      
      // TODO: Implement password reset token generation and email/SMS sending
      res.json({ 
        message: "If an account with this email/phone exists, you will receive reset instructions.",
        implemented: false 
      });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
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

  // Get party performance data
  app.get("/api/party-performance", isAuthenticated, async (req, res) => {
    try {
      const { category } = req.query;
      const partyPerformance = await storage.getPartyPerformance(category as any);
      res.json(partyPerformance);
    } catch (error) {
      console.error("Error fetching party performance:", error);
      res.status(500).json({ message: "Failed to fetch party performance data" });
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
        presidentialVotes: req.body.presidentialVotes ? JSON.parse(req.body.presidentialVotes) : null,
        mpVotes: req.body.mpVotes ? JSON.parse(req.body.mpVotes) : null,
        councilorVotes: req.body.councilorVotes ? JSON.parse(req.body.councilorVotes) : null,
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

  // Review flagged/rejected results (reviewers and admins only)
  app.patch("/api/results/:id/review", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'reviewer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Reviewer or admin role required." });
      }

      const { action, comments } = req.body;
      const resultId = req.params.id;
      
      let status;
      switch (action) {
        case 'approve':
          status = 'verified';
          break;
        case 'reject':
          status = 'rejected';
          break;
        case 'flag_for_further_review':
          status = 'flagged';
          break;
        default:
          return res.status(400).json({ message: "Invalid action. Use 'approve', 'reject', or 'flag_for_further_review'." });
      }

      const updatedResult = await storage.updateResultStatus(
        resultId,
        status,
        user.id,
        comments
      );

      // Log audit
      await storage.createAuditLog({
        userId: user.id,
        action: "REVIEW",
        entityType: "result",
        entityId: resultId,
        newValues: { status, reviewedBy: user.id, reviewComments: comments, reviewAction: action },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Broadcast real-time updates
      broadcastUpdate("RESULT_REVIEWED", updatedResult);
      
      // Get and broadcast updated analytics
      const analytics = await getRealTimeAnalytics();
      if (analytics) {
        broadcastUpdate("ANALYTICS_UPDATE", analytics);
      }

      res.json(updatedResult);
    } catch (error) {
      console.error("Error reviewing result:", error);
      res.status(400).json({ message: "Failed to review result" });
    }
  });

  // Verify/approve results (supervisors and admins only)
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
      if (user?.role !== 'admin' && user?.role !== 'supervisor' && user?.role !== 'reviewer') {
        return res.status(403).json({ message: "Access denied" });
      }

      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Admin database management routes
  app.patch("/api/admin/users/:id/deactivate", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userId = req.params.id;
      const updatedUser = await storage.deactivateUser(userId);

      // Log audit
      await storage.createAuditLog({
        userId: currentUser.id,
        action: "UPDATE",
        entityType: "user",
        entityId: userId,
        newValues: { isActive: false },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error deactivating user:", error);
      res.status(400).json({ message: "Failed to deactivate user" });
    }
  });

  app.patch("/api/admin/users/:id/reactivate", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userId = req.params.id;
      const updatedUser = await storage.reactivateUser(userId);

      // Log audit
      await storage.createAuditLog({
        userId: currentUser.id,
        action: "UPDATE",
        entityType: "user",
        entityId: userId,
        newValues: { isActive: true },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error reactivating user:", error);
      res.status(400).json({ message: "Failed to reactivate user" });
    }
  });

  app.delete("/api/admin/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const userId = req.params.id;
      
      // Prevent admin from deleting themselves
      if (userId === currentUser.id) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      // Get user data before deletion for audit log
      const userToDelete = await storage.getUser(userId);
      if (!userToDelete) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteUser(userId);

      // Log audit (create after deletion since user audit logs are deleted)
      await storage.createAuditLog({
        userId: currentUser.id,
        action: "DELETE",
        entityType: "user",
        entityId: userId,
        oldValues: userToDelete,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(400).json({ message: "Failed to delete user" });
    }
  });

  app.post("/api/admin/archive-results", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const archivedCount = await storage.archiveResults();

      // Log audit
      await storage.createAuditLog({
        userId: currentUser.id,
        action: "UPDATE",
        entityType: "results",
        entityId: "bulk",
        newValues: { archivedCount },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ message: `${archivedCount} results archived successfully`, archivedCount });
    } catch (error) {
      console.error("Error archiving results:", error);
      res.status(500).json({ message: "Failed to archive results" });
    }
  });

  app.post("/api/admin/clean-database", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { users: cleanUsers, candidates, pollingCenters, results, keepAdmin } = req.body;

      const cleanupResult = await storage.cleanDatabase({
        users: cleanUsers,
        candidates,
        pollingCenters,
        results,
        keepAdmin,
      });

      // Log audit
      await storage.createAuditLog({
        userId: currentUser.id,
        action: "DELETE",
        entityType: "database",
        entityId: "bulk_cleanup",
        newValues: { cleanupOptions: req.body, results: cleanupResult },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ 
        message: "Database cleanup completed successfully", 
        results: cleanupResult 
      });
    } catch (error) {
      console.error("Error cleaning database:", error);
      res.status(500).json({ message: "Failed to clean database" });
    }
  });

  // API Settings endpoints
  app.post("/api/admin/api-settings", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const settings = req.body;
      
      // In a real implementation, you'd save these to a settings table
      // For now, we'll just validate and return success
      // You could store these in environment variables or a dedicated settings table
      
      // Log audit
      await storage.createAuditLog({
        userId: currentUser.id,
        action: "UPDATE",
        entityType: "settings",
        entityId: "api_settings",
        newValues: { settingsUpdated: true, whatsappEnabled: settings.whatsappEnabled },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ message: "API settings saved successfully" });
    } catch (error) {
      console.error("Error saving API settings:", error);
      res.status(500).json({ message: "Failed to save API settings" });
    }
  });

  // Profile management endpoints
  app.put("/api/auth/profile", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { firstName, lastName, email, phone } = req.body;

      // Update user profile
      const [updatedUser] = await db
        .update(users)
        .set({
          firstName,
          lastName,
          email: email || null,
          phone: phone || null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, currentUser.id))
        .returning();

      // Log audit
      await storage.createAuditLog({
        userId: currentUser.id,
        action: "UPDATE",
        entityType: "profile",
        entityId: currentUser.id,
        oldValues: { firstName: currentUser.firstName, lastName: currentUser.lastName },
        newValues: { firstName, lastName },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ message: "Profile updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/auth/change-password", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      const { currentPassword, newPassword } = req.body;

      // Get full user data to check current password
      const user = await storage.getUser(currentUser.id);
      if (!user || !user.passwordHash) {
        return res.status(400).json({ message: "User not found" });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await db
        .update(users)
        .set({
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, currentUser.id));

      // Log audit (without logging the actual password)
      await storage.createAuditLog({
        userId: currentUser.id,
        action: "UPDATE",
        entityType: "security",
        entityId: currentUser.id,
        newValues: { action: "password_changed" },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // WhatsApp webhook endpoints
  app.get("/api/whatsapp/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    // Verify the webhook (you'd use the actual verify token from settings)
    if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
      console.log("WhatsApp webhook verified successfully");
      res.status(200).send(challenge);
    } else {
      console.error("WhatsApp webhook verification failed");
      res.sendStatus(403);
    }
  });

  app.post("/api/whatsapp/webhook", async (req, res) => {
    try {
      const body = req.body;

      // Process incoming WhatsApp messages
      if (body.object === "whatsapp_business_account") {
        body.entry?.forEach((entry: any) => {
          entry.changes?.forEach((change: any) => {
            if (change.field === "messages") {
              const messages = change.value.messages;
              messages?.forEach(async (message: any) => {
                console.log("Received WhatsApp message:", message);
                
                // Here you would process the message and extract election data
                // For now, we'll just log it and send a response
                if (message.type === "text") {
                  const phoneNumber = message.from;
                  const messageText = message.text.body;
                  
                  // Process election results from message
                  // This is where you'd parse results and create database entries
                  
                  console.log(`Message from ${phoneNumber}: ${messageText}`);
                }
              });
            }
          });
        });
      }

      res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
      console.error("Error processing WhatsApp webhook:", error);
      res.status(500).json({ message: "Failed to process webhook" });
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
