import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import importExportRoutes from "./routes/importExport";
import { setupAuth, isAuthenticated, hashPassword, validateRegister, validateLogin } from "./auth";
import passport from "passport";
import { insertResultSchema, insertPollingCenterSchema, insertCandidateSchema, insertPoliticalPartySchema } from "@shared/schema";
import { seedDatabase } from "./seed";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Document validation function
async function validateDocumentData(submittedData: any, uploadedFiles: any[]): Promise<{isValid: boolean, reason?: string}> {
  // Basic validation checks
  const checks = [];
  
  // Check if total votes are reasonable (within 1-99% of registered voters × 3)
  const totalVotes = submittedData.presidentialVotes?.reduce((sum: number, vote: any) => sum + vote.votes, 0) +
    submittedData.mpVotes?.reduce((sum: number, vote: any) => sum + vote.votes, 0) +
    submittedData.councilorVotes?.reduce((sum: number, vote: any) => sum + vote.votes, 0) +
    submittedData.invalidVotes;
  
  // Check for suspicious patterns
  if (totalVotes < 10) {
    checks.push("Total votes unusually low (less than 10)");
  }
  
  // Check if uploaded files exist and have reasonable sizes
  if (uploadedFiles.length === 0) {
    checks.push("No supporting documents uploaded");
  } else {
    for (const file of uploadedFiles) {
      if (file.size < 1000) { // Less than 1KB
        checks.push(`Document ${file.originalname} appears to be too small`);
      }
      if (file.size > 8 * 1024 * 1024) { // Larger than 8MB
        checks.push(`Document ${file.originalname} appears to be unusually large`);
      }
    }
  }
  
  // Check for mismatched vote counts (simple validation)
  const hasPresidentialVotes = submittedData.presidentialVotes && submittedData.presidentialVotes.length > 0;
  const hasMpVotes = submittedData.mpVotes && submittedData.mpVotes.length > 0;
  const hasCouncilorVotes = submittedData.councilorVotes && submittedData.councilorVotes.length > 0;
  
  if (!hasPresidentialVotes || !hasMpVotes || !hasCouncilorVotes) {
    checks.push("Missing vote counts for one or more election categories (Presidential, MP, or Councilor)");
  }
  
  if (checks.length > 0) {
    return {
      isValid: false,
      reason: checks.join("; ")
    };
  }
  
  return { isValid: true };
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

  // Admin route to create users directly
  app.post('/api/admin/create-user', isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email, phone, firstName, lastName, role, password } = req.body;

      // Validate required fields
      if (!firstName || !lastName) {
        return res.status(400).json({ message: "First name and last name are required" });
      }

      if (!email && !phone) {
        return res.status(400).json({ message: "Either email or phone number is required" });
      }

      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByIdentifier(email || phone || '');
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email or phone" });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({
        email: email || undefined,
        phone: phone || undefined,
        firstName,
        lastName,
        passwordHash,
      });

      // Set role and approve user immediately (admin-created users are auto-approved)
      await storage.updateUserRole(user.id, role || 'agent');
      await storage.approveUser(user.id);

      // Log audit
      await storage.createAuditLog({
        userId: currentUser.id,
        action: "CREATE",
        entityType: "user",
        entityId: user.id,
        newValues: { firstName, lastName, email, phone, role: role || 'agent', isApproved: true },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      // Get updated user with role
      const updatedUser = await storage.getUser(user.id);
      
      // Remove password hash from response
      const { passwordHash: _, ...userResponse } = updatedUser || user;
      res.status(201).json(userResponse);
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: error.message || "Failed to create user" });
    }
  });

  // Bulk upload endpoints

  app.post('/api/admin/bulk-upload/candidates', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvData = fs.readFileSync(req.file.path, 'utf8');
      const lines = csvData.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV file must have header and at least one data row" });
      }

      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      const requiredHeaders = ['name', 'party', 'category'];
      const optionalHeaders = ['constituency', 'abbreviation'];
      
      const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));
      if (missingHeaders.length > 0) {
        return res.status(400).json({ 
          message: `Missing required headers: ${missingHeaders.join(', ')}. Required headers: ${requiredHeaders.join(', ')}. Optional: ${optionalHeaders.join(', ')}` 
        });
      }

      const results = { created: 0, errors: [] as any[] };
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < headers.length) continue;
        
        try {
          const candidateData: any = {};
          headers.forEach((header, index) => {
            candidateData[header] = values[index] || '';
          });

          // Validate required fields
          if (!candidateData.name || !candidateData.party || !candidateData.category) {
            results.errors.push({ row: i + 1, error: "Missing required fields (name, party, category)", data: candidateData });
            continue;
          }

          // Validate category
          if (!['president', 'mp', 'councilor'].includes(candidateData.category.toLowerCase())) {
            results.errors.push({ row: i + 1, error: "Invalid category. Must be: president, mp, or councilor", data: candidateData });
            continue;
          }

          // Find or create political party
          let party = await storage.getPoliticalPartyByName(candidateData.party);
          if (!party) {
            // Create new party with default color
            party = await storage.createPoliticalParty({
              name: candidateData.party,
              abbreviation: candidateData.party.substring(0, 3).toUpperCase(),
              color: '#6B7280', // Default gray color
            });
          }

          // Create candidate
          await storage.createCandidate({
            name: candidateData.name,
            partyId: party.id,
            category: candidateData.category.toLowerCase() as 'president' | 'mp' | 'councilor',
            constituency: candidateData.constituency || null,
            abbreviation: candidateData.abbreviation || candidateData.name.substring(0, 3).toUpperCase(),
          });

          results.created++;
        } catch (error: any) {
          results.errors.push({ row: i + 1, error: error.message, data: values });
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      // Log audit
      await storage.createAuditLog({
        userId: currentUser.id,
        action: "BULK_UPLOAD",
        entityType: "candidate",
        entityId: "bulk",
        newValues: { created: results.created, errors: results.errors.length },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(results);
    } catch (error: any) {
      console.error("Error processing candidate bulk upload:", error);
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ message: error.message || "Failed to process bulk upload" });
    }
  });

  // Import/Export routes
  app.use('/api', importExportRoutes);

  // Get hierarchical constituencies data
  app.get('/api/constituencies/hierarchy', isAuthenticated, async (req, res) => {
    try {
      const constituencies = await storage.getAllConstituenciesWithHierarchy();
      res.json(constituencies);
    } catch (error) {
      console.error('Error fetching constituencies hierarchy:', error);
      res.status(500).json({ error: 'Failed to fetch constituencies hierarchy' });
    }
  });

  // Get constituencies for dropdowns
  app.get('/api/constituencies', isAuthenticated, async (req, res) => {
    try {
      const constituencies = await storage.getConstituencies();
      res.json(constituencies);
    } catch (error) {
      console.error('Error fetching constituencies:', error);
      res.status(500).json({ error: 'Failed to fetch constituencies' });
    }
  });

  // Get wards for dropdowns
  app.get('/api/wards', isAuthenticated, async (req, res) => {
    try {
      const wards = await storage.getWards();
      res.json(wards);
    } catch (error) {
      console.error('Error fetching wards:', error);
      res.status(500).json({ error: 'Failed to fetch wards' });
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
      const user = req.user;
      
      // Check if last profile update was less than 30 days ago
      if (user.lastProfileUpdate) {
        const daysSinceLastUpdate = (new Date().getTime() - new Date(user.lastProfileUpdate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastUpdate < 30) {
          const daysRemaining = Math.ceil(30 - daysSinceLastUpdate);
          return res.status(400).json({ 
            message: `Profile can only be updated once per month. Please wait ${daysRemaining} more day${daysRemaining !== 1 ? 's' : ''}.` 
          });
        }
      }
      
      const updatedUser = await storage.updateUser(req.user.id, {
        firstName,
        lastName,
        email,
        phone,
        lastProfileUpdate: new Date(),
        updatedAt: new Date(),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(400).json({ message: "Failed to update profile" });
    }
  });

  // Email verification routes
  app.post("/api/auth/verify-email/send", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const verificationToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
      const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      
      await storage.updateUser(user.id, {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: expiry,
      });

      // In real implementation, send email with verification code
      console.log(`Email verification code for ${user.email}: ${verificationToken}`);
      
      res.json({ message: "Verification code sent to your email" });
    } catch (error) {
      console.error("Error sending email verification:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  app.post("/api/auth/verify-email/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.body;
      const user = req.user;
      
      if (!user.emailVerificationToken || !user.emailVerificationExpiry) {
        return res.status(400).json({ message: "No verification code pending" });
      }
      
      if (new Date() > new Date(user.emailVerificationExpiry)) {
        return res.status(400).json({ message: "Verification code expired" });
      }
      
      if (user.emailVerificationToken !== code) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
      });
      
      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Phone verification routes  
  app.post("/api/auth/verify-phone/send", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const verificationToken = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
      const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      
      await storage.updateUser(user.id, {
        phoneVerificationToken: verificationToken,
        phoneVerificationExpiry: expiry,
      });

      // In real implementation, send SMS with verification code
      console.log(`Phone verification code for ${user.phone}: ${verificationToken}`);
      
      res.json({ message: "Verification code sent to your phone" });
    } catch (error) {
      console.error("Error sending phone verification:", error);
      res.status(500).json({ message: "Failed to send verification code" });
    }
  });

  app.post("/api/auth/verify-phone/confirm", isAuthenticated, async (req: any, res) => {
    try {
      const { code } = req.body;
      const user = req.user;
      
      if (!user.phoneVerificationToken || !user.phoneVerificationExpiry) {
        return res.status(400).json({ message: "No verification code pending" });
      }
      
      if (new Date() > new Date(user.phoneVerificationExpiry)) {
        return res.status(400).json({ message: "Verification code expired" });
      }
      
      if (user.phoneVerificationToken !== code) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      
      await storage.updateUser(user.id, {
        phoneVerified: true,
        phoneVerificationToken: null,
        phoneVerificationExpiry: null,
      });
      
      res.json({ message: "Phone verified successfully" });
    } catch (error) {
      console.error("Error verifying phone:", error);
      res.status(500).json({ message: "Failed to verify phone" });
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

  // Polling centers with pagination
  app.get("/api/polling-centers", isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || undefined;
      const limit = parseInt(req.query.limit as string) || undefined;
      
      const result = await storage.getPollingCenters(page, limit);
      
      if (page && limit) {
        res.json({
          data: result.data,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        });
      } else {
        res.json(result.data);
      }
    } catch (error) {
      console.error("Error fetching polling centers:", error);
      res.status(500).json({ message: "Failed to fetch polling centers" });
    }
  });

  app.put("/api/polling-centers/:id/reactivate", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const center = await storage.reactivatePollingCenter(req.params.id);
      res.json(center);
    } catch (error) {
      console.error("Error reactivating polling center:", error);
      res.status(500).json({ message: "Failed to reactivate polling center" });
    }
  });

  app.put("/api/polling-centers/:id/deactivate", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const center = await storage.deactivatePollingCenter(req.params.id);
      res.json(center);
    } catch (error) {
      console.error("Error deactivating polling center:", error);
      res.status(500).json({ message: "Failed to deactivate polling center" });
    }
  });

  // Update polling center
  app.put("/api/polling-centers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { name, constituency, district, state, registeredVoters } = req.body;
      const center = await storage.updatePollingCenter(req.params.id, {
        name,
        constituency,
        district,
        state,
        registeredVoters: parseInt(registeredVoters),
      });
      res.json(center);
    } catch (error) {
      console.error("Error updating polling center:", error);
      res.status(500).json({ message: "Failed to update polling center" });
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
  // Political parties routes
  app.get("/api/political-parties", isAuthenticated, async (req, res) => {
    try {
      const parties = await storage.getAllPoliticalParties();
      res.json(parties);
    } catch (error) {
      console.error("Error fetching political parties:", error);
      res.status(500).json({ message: "Failed to fetch political parties" });
    }
  });

  app.post("/api/political-parties", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'supervisor') {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }

      const validatedData = insertPoliticalPartySchema.parse(req.body);
      const party = await storage.createPoliticalParty(validatedData);
      
      // Log the action
      await storage.createAuditLog({
        userId: user.id,
        action: 'create',
        entityType: 'political_party',
        entityId: party.id,
        newValues: JSON.stringify(party),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(201).json(party);
    } catch (error) {
      console.error("Error creating political party:", error);
      res.status(400).json({ message: "Failed to create political party" });
    }
  });

  app.put("/api/political-parties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'supervisor') {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }

      const { id } = req.params;
      const validatedData = insertPoliticalPartySchema.partial().parse(req.body);
      
      // Get current party for audit log
      const currentParties = await storage.getPoliticalParties();
      const currentParty = currentParties.find(p => p.id === id);
      
      const updatedParty = await storage.updatePoliticalParty(id, validatedData);
      
      // Log the action
      await storage.createAuditLog({
        userId: user.id,
        action: 'update',
        entityType: 'political_party',
        entityId: id,
        oldValues: JSON.stringify(currentParty),
        newValues: JSON.stringify(updatedParty),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json(updatedParty);
    } catch (error) {
      console.error("Error updating political party:", error);
      res.status(400).json({ message: "Failed to update political party" });
    }
  });

  app.put("/api/political-parties/:id/deactivate", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'supervisor') {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }

      const { id } = req.params;
      
      // Get current party for audit log
      const currentParties = await storage.getPoliticalParties();
      const currentParty = currentParties.find(p => p.id === id);
      
      const deactivatedParty = await storage.deactivatePoliticalParty(id);
      
      // Log the action
      await storage.createAuditLog({
        userId: user.id,
        action: 'deactivate',
        entityType: 'political_party',
        entityId: id,
        oldValues: JSON.stringify(currentParty),
        newValues: JSON.stringify(deactivatedParty),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json(deactivatedParty);
    } catch (error) {
      console.error("Error deactivating political party:", error);
      res.status(400).json({ message: "Failed to deactivate political party" });
    }
  });

  app.put("/api/political-parties/:id/reactivate", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin' && user?.role !== 'supervisor') {
        return res.status(403).json({ message: "Access denied. Admin or supervisor role required." });
      }

      const { id } = req.params;
      
      // Get current party for audit log
      const currentParties = await storage.getPoliticalParties();
      const currentParty = currentParties.find(p => p.id === id);
      
      const reactivatedParty = await storage.reactivatePoliticalParty(id);
      
      // Log the action
      await storage.createAuditLog({
        userId: user.id,
        action: 'reactivate',
        entityType: 'political_party',
        entityId: id,
        oldValues: JSON.stringify(currentParty),
        newValues: JSON.stringify(reactivatedParty),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json(reactivatedParty);
    } catch (error) {
      console.error("Error reactivating political party:", error);
      res.status(400).json({ message: "Failed to reactivate political party" });
    }
  });

  app.delete("/api/political-parties/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied. Admin role required." });
      }

      const { id } = req.params;
      
      // Get current party for audit log
      const currentParties = await storage.getPoliticalParties();
      const currentParty = currentParties.find(p => p.id === id);
      
      if (!currentParty) {
        return res.status(404).json({ message: "Political party not found" });
      }
      
      await storage.deletePoliticalParty(id);
      
      // Log the action
      await storage.createAuditLog({
        userId: user.id,
        action: 'DELETE',
        entityType: 'political_party',
        entityId: id,
        oldValues: JSON.stringify(currentParty),
        newValues: null,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting political party:", error);
      const message = error instanceof Error ? error.message : "Failed to delete political party";
      res.status(400).json({ message });
    }
  });

  app.get("/api/candidates", isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || undefined;
      const limit = parseInt(req.query.limit as string) || undefined;
      
      const result = await storage.getCandidates(page, limit);
      
      if (page && limit) {
        res.json({
          data: result.data,
          pagination: {
            page,
            limit,
            total: result.total,
            pages: Math.ceil(result.total / limit)
          }
        });
      } else {
        res.json(result.data);
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.put("/api/candidates/:id/reactivate", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const candidate = await storage.reactivateCandidate(req.params.id);
      res.json(candidate);
    } catch (error) {
      console.error("Error reactivating candidate:", error);
      res.status(500).json({ message: "Failed to reactivate candidate" });
    }
  });

  app.put("/api/candidates/:id/deactivate", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const candidate = await storage.deactivateCandidate(req.params.id);
      res.json(candidate);
    } catch (error) {
      console.error("Error deactivating candidate:", error);
      res.status(500).json({ message: "Failed to deactivate candidate" });
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
        submissionChannel: 'portal', // Default to portal since it's coming from the web interface
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

        // Perform document validation check
        const documentValidationResult = await validateDocumentData(validatedData, req.files);
        if (!documentValidationResult.isValid) {
          // Flag the result for document mismatch
          await storage.flagForDocumentMismatch(result.id, documentValidationResult.reason);
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
      if (user?.role !== 'supervisor' && user?.role !== 'admin' && user?.role !== 'reviewer') {
        return res.status(403).json({ message: "Access denied. Supervisor, admin, or reviewer role required." });
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

  app.patch("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { firstName, lastName, email, phone } = req.body;
      const userId = req.params.id;

      // Validate input
      if (firstName && firstName.length < 2) {
        return res.status(400).json({ message: "First name must be at least 2 characters" });
      }
      if (lastName && lastName.length < 2) {
        return res.status(400).json({ message: "Last name must be at least 2 characters" });
      }
      if (email && !/\S+@\S+\.\S+/.test(email)) {
        return res.status(400).json({ message: "Please enter a valid email" });
      }

      // Check if email already exists for another user
      if (email) {
        const existingUser = await storage.getUserByIdentifier(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email is already in use by another user" });
        }
      }

      // Check if phone already exists for another user
      if (phone) {
        const existingUser = await storage.getUserByIdentifier(phone);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Phone number is already in use by another user" });
        }
      }

      const updateData: any = { updatedAt: new Date() };
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (email !== undefined) updateData.email = email || null;
      if (phone !== undefined) updateData.phone = phone || null;

      const updatedUser = await storage.updateUser(userId, updateData);

      // Log audit
      await storage.createAuditLog({
        userId: req.user.id,
        action: "UPDATE",
        entityType: "user",
        entityId: userId,
        newValues: { firstName, lastName, email, phone },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Failed to update user" });
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
  // Get USSD providers
  app.get("/api/ussd-providers", isAuthenticated, async (req: any, res) => {
    try {
      const providers = await storage.getUssdProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching USSD providers:", error);
      res.status(500).json({ message: "Failed to fetch USSD providers" });
    }
  });

  // Get WhatsApp providers
  app.get("/api/whatsapp-providers", isAuthenticated, async (req: any, res) => {
    try {
      const providers = await storage.getWhatsappProviders();
      res.json(providers);
    } catch (error) {
      console.error("Error fetching WhatsApp providers:", error);
      res.status(500).json({ message: "Failed to fetch WhatsApp providers" });
    }
  });

  // Update USSD provider configuration
  app.put("/api/ussd-providers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { isActive, configuration } = req.body;
      
      // Update provider active status or configuration
      const updates: any = {};
      if (typeof isActive === 'boolean') updates.isActive = isActive;
      if (configuration) updates.configuration = configuration;
      
      // Update the provider
      await storage.updateUssdProvider(id, updates);

      // Log audit
      await storage.createAuditLog({
        userId: currentUser.id,
        action: "UPDATE",
        entityType: "ussd_provider",
        entityId: id,
        newValues: updates,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ message: "USSD provider updated successfully" });
    } catch (error) {
      console.error("Error updating USSD provider:", error);
      res.status(500).json({ message: "Failed to update USSD provider" });
    }
  });

  // Update WhatsApp provider configuration
  app.put("/api/whatsapp-providers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUser = req.user;
      if (currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const { isActive, configuration, isPrimary } = req.body;
      
      // Update provider
      const updates: any = {};
      if (typeof isActive === 'boolean') updates.isActive = isActive;
      if (typeof isPrimary === 'boolean') updates.isPrimary = isPrimary;
      if (configuration) updates.configuration = configuration;
      
      await storage.updateWhatsappProvider(id, updates);

      // Log audit
      await storage.createAuditLog({
        userId: currentUser.id,
        action: "UPDATE",
        entityType: "whatsapp_provider",
        entityId: id,
        newValues: updates,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json({ message: "WhatsApp provider updated successfully" });
    } catch (error) {
      console.error("Error updating WhatsApp provider:", error);
      res.status(500).json({ message: "Failed to update WhatsApp provider" });
    }
  });

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

  // Session management - enforce single session per user
  app.post("/api/auth/session/validate", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      const currentSessionId = req.sessionID;
      
      // Check if user has a different active session
      if (user.currentSessionId && user.currentSessionId !== currentSessionId) {
        // Check if the existing session is still valid
        const existingUser = await storage.getUserBySession(user.currentSessionId);
        if (existingUser) {
          // Another session exists, terminate this one
          await storage.clearUserSession(user.id);
          return res.status(409).json({ 
            message: "Another session is active. Please login again.",
            code: "MULTIPLE_SESSIONS"
          });
        }
      }
      
      // Update current session
      const sessionExpiry = new Date();
      sessionExpiry.setHours(sessionExpiry.getHours() + 24); // 24 hour session
      await storage.updateUserSession(user.id, currentSessionId, sessionExpiry);
      
      res.json({ message: "Session validated" });
    } catch (error) {
      console.error("Error validating session:", error);
      res.status(500).json({ message: "Session validation failed" });
    }
  });

  // USSD webhook endpoint for Twilio
  app.post("/api/ussd/twilio", async (req, res) => {
    try {
      const { From: phoneNumber, Body: text, SessionId: sessionId } = req.body;
      
      // Get or create USSD session
      let session = await storage.getUssdSession(sessionId);
      if (!session) {
        session = await storage.createUssdSession(phoneNumber, sessionId, "main_menu");
      }
      
      // Check if phone number is authenticated for protected operations
      const authenticatedUser = await storage.getUserByIdentifier(phoneNumber);
      
      let response = "";
      
      switch (session.currentStep) {
        case "main_menu":
          if (authenticatedUser?.isApproved) {
            response = `Welcome ${authenticatedUser.firstName}!\n1. Register as Agent\n2. Submit Results\n3. Check Status\n0. Exit`;
          } else {
            response = `Welcome to PTC Election System\n1. Register as Agent\n3. Check Status\n0. Exit\n\n(Submit Results requires verified account)`;
          }
          await storage.updateUssdSession(sessionId, "menu_selection", {});
          break;
          
        case "menu_selection":
          if (text === "1") {
            response = `Enter your first name:`;
            await storage.updateUssdSession(sessionId, "register_firstname", {});
          } else if (text === "2") {
            if (!authenticatedUser?.isApproved) {
              response = `You need a verified account to submit results. Please register first or contact admin.\n\n1. Register as Agent\n3. Check Status\n0. Exit`;
              await storage.updateUssdSession(sessionId, "menu_selection", {});
            } else {
              response = `Enter polling center code:`;
              await storage.updateUssdSession(sessionId, "submit_results_center", { userId: authenticatedUser.id });
            }
          } else if (text === "3") {
            response = `Enter polling center code to check status:`;
            await storage.updateUssdSession(sessionId, "check_status", {});
          } else if (text === "0") {
            response = `Thank you for using PTC System`;
            await storage.expireUssdSession(sessionId);
          } else {
            response = `Invalid option. Please try again.\n1. Register as Agent\n${authenticatedUser?.isApproved ? '2. Submit Results\n' : ''}3. Check Status\n0. Exit`;
          }
          break;
          
          
        case "register_firstname":
          const sessionData = { firstName: text };
          response = `Enter your last name:`;
          await storage.updateUssdSession(sessionId, "register_lastname", sessionData);
          break;
          
        case "register_lastname":
          const currentData = session.sessionData as any;
          response = `Registration submitted for approval.\nName: ${currentData.firstName} ${text}\nPhone: ${phoneNumber}\nYou will be notified when approved.`;
          
          // Create pending user for admin approval
          const hashedPassword = await hashPassword("temp123"); // Temporary password
          await storage.createUser({
            phone: phoneNumber,
            firstName: currentData.firstName,
            lastName: text,
            passwordHash: hashedPassword,
          });
          
          await storage.expireUssdSession(sessionId);
          break;
          
        case "submit_results_center":
          const centerCode = text.toUpperCase();
          const pollingCenter = await storage.getPollingCenterByCode(centerCode);
          
          if (!pollingCenter) {
            response = `Invalid polling center code. Please enter a valid code:`;
          } else {
            response = `Polling Center: ${pollingCenter.name}\nSelect category:\n1. Presidential\n2. Member of Parliament\n3. Councilor`;
            await storage.updateUssdSession(sessionId, "submit_results_category", { 
              ...session.sessionData, 
              pollingCenterId: pollingCenter.id,
              centerCode: pollingCenter.code,
              centerName: pollingCenter.name
            });
          }
          break;
          
        case "submit_results_category":
          const categoryMap = { "1": "president", "2": "mp", "3": "councilor" };
          const selectedCategory = categoryMap[text as "1" | "2" | "3"];
          
          if (!selectedCategory) {
            response = `Invalid option. Select category:\n1. Presidential\n2. Member of Parliament\n3. Councilor`;
          } else {
            const sessionData = session.sessionData as any;
            
            // Get candidates for this category and constituency (if applicable)
            let candidates;
            if (selectedCategory === "president") {
              candidates = await storage.getCandidatesByCategory("president");
            } else {
              // For MP/Councilor, filter by constituency
              const center = await storage.getPollingCenter(sessionData.pollingCenterId);
              candidates = await storage.getCandidatesByCategory(selectedCategory as "mp" | "councilor", center?.constituency);
            }
            
            if (!candidates || candidates.length === 0) {
              response = `No candidates found for this category. Returning to menu...`;
              await storage.updateUssdSession(sessionId, "main_menu", {});
            } else {
              // Display candidates with abbreviations
              let candidatesList = `Enter votes for each candidate using abbreviation:\n\n`;
              candidates.forEach((candidate, index) => {
                candidatesList += `${candidate.abbreviation || candidate.name.substring(0, 3).toUpperCase()}: ${candidate.name}\n`;
              });
              candidatesList += `\nFormat: ABB=123,XYZ=456\nOr type SKIP to skip this category`;
              
              response = candidatesList;
              await storage.updateUssdSession(sessionId, "submit_results_votes", {
                ...sessionData,
                category: selectedCategory,
                candidates: candidates.map(c => ({
                  id: c.id,
                  name: c.name,
                  abbreviation: c.abbreviation || c.name.substring(0, 3).toUpperCase()
                }))
              });
            }
          }
          break;
          
        case "submit_results_votes":
          const voteSessionData = session.sessionData as any;
          
          if (text.toUpperCase() === "SKIP") {
            response = `Category skipped. Select another category:\n1. Presidential\n2. Member of Parliament\n3. Councilor\n0. Finish submission`;
            await storage.updateUssdSession(sessionId, "submit_results_category", voteSessionData);
          } else {
            try {
              // Parse vote input: ABB=123,XYZ=456
              const voteEntries = text.split(',').map(entry => entry.trim());
              const candidateVotes: any[] = [];
              let totalVotes = 0;
              
              for (const entry of voteEntries) {
                const [abbr, voteStr] = entry.split('=');
                if (!abbr || !voteStr) continue;
                
                const votes = parseInt(voteStr.trim());
                if (isNaN(votes) || votes < 0) continue;
                
                const candidate = voteSessionData.candidates.find((c: any) => 
                  c.abbreviation.toLowerCase() === abbr.trim().toLowerCase()
                );
                
                if (candidate) {
                  candidateVotes.push({
                    candidateId: candidate.id,
                    candidateName: candidate.name,
                    votes: votes
                  });
                  totalVotes += votes;
                }
              }
              
              if (candidateVotes.length === 0) {
                response = `Invalid format. Use: ABB=123,XYZ=456\nTry again or type SKIP:`;
              } else {
                response = `Enter invalid votes (or 0):`;
                await storage.updateUssdSession(sessionId, "submit_results_invalid", {
                  ...voteSessionData,
                  candidateVotes,
                  totalVotes
                });
              }
            } catch (error) {
              response = `Invalid format. Use: ABB=123,XYZ=456\nTry again or type SKIP:`;
            }
          }
          break;
          
        case "submit_results_invalid":
          const invalidVotes = parseInt(text) || 0;
          const finalSessionData = session.sessionData as any;
          
          try {
            // Create results for each candidate
            const results = [];
            for (const candidateVote of finalSessionData.candidateVotes) {
              const result = await storage.createResult({
                userId: finalSessionData.userId,
                pollingCenterId: finalSessionData.pollingCenterId,
                candidateId: candidateVote.candidateId,
                votes: candidateVote.votes,
                invalidVotes: invalidVotes,
                totalVotes: finalSessionData.totalVotes + invalidVotes,
                submissionMethod: 'ussd',
              });
              results.push(result);
            }
            
            response = `Results submitted successfully!\n\nCenter: ${finalSessionData.centerName}\nCategory: ${finalSessionData.category}\nTotal Valid: ${finalSessionData.totalVotes}\nInvalid: ${invalidVotes}\n\nSubmit another category?\n1. Presidential\n2. MP\n3. Councilor\n0. Exit`;
            await storage.updateUssdSession(sessionId, "submit_results_category", {
              pollingCenterId: finalSessionData.pollingCenterId,
              centerCode: finalSessionData.centerCode,
              centerName: finalSessionData.centerName,
              userId: finalSessionData.userId
            });
          } catch (error) {
            response = `Error submitting results. Please try again.\nEnter invalid votes (or 0):`;
          }
          break;
          
        case "check_status":
          const statusCenterCode = text.toUpperCase();
          const statusCenter = await storage.getPollingCenterByCode(statusCenterCode);
          
          if (!statusCenter) {
            response = `Invalid polling center code. Please try again:`;
          } else {
            // Get results count for this center
            const centerResults = await storage.getResultsByPollingCenter(statusCenter.id);
            response = `${statusCenter.name}\nResults submitted: ${centerResults.length} categories\nStatus: ${centerResults.length > 0 ? 'Active' : 'No results yet'}`;
            await storage.expireUssdSession(sessionId);
          }
          break;
          
        default:
          response = `Welcome to PTC Election System\n1. Register as Agent\n2. Submit Results\n3. Check Status\n0. Exit`;
          await storage.updateUssdSession(sessionId, "main_menu", {});
      }
      
      res.type('text/plain').send(response);
    } catch (error) {
      console.error("Error processing USSD request:", error);
      res.type('text/plain').send("Service temporarily unavailable. Please try again later.");
    }
  });
  
  // Africa's Talking USSD webhook
  app.post("/api/ussd/africas-talking", async (req, res) => {
    try {
      const { phoneNumber, text, sessionId } = req.body;
      
      // Get or create USSD session
      let session = await storage.getUssdSession(sessionId);
      if (!session) {
        session = await storage.createUssdSession(phoneNumber, sessionId, "main_menu");
      }
      
      // Check if phone number is authenticated for protected operations
      const authenticatedUser = await storage.getUserByIdentifier(phoneNumber);
      
      let response = "";
      let continueSession = true;
      
      switch (session.currentStep) {
        case "main_menu":
          if (authenticatedUser?.isApproved) {
            response = `Welcome ${authenticatedUser.firstName}!\n1. Register as Agent\n2. Submit Results\n3. Check Status\n0. Exit`;
          } else {
            response = `Welcome to PTC Election System\n1. Register as Agent\n3. Check Status\n0. Exit\n\n(Submit Results requires verified account)`;
          }
          await storage.updateUssdSession(sessionId, "menu_selection", {});
          break;
          
        case "menu_selection":
          if (text === "1") {
            response = `Enter your first name:`;
            await storage.updateUssdSession(sessionId, "register_firstname", {});
          } else if (text === "2") {
            if (!authenticatedUser?.isApproved) {
              response = `You need a verified account to submit results. Please register first or contact admin.\n\n1. Register as Agent\n3. Check Status\n0. Exit`;
              await storage.updateUssdSession(sessionId, "menu_selection", {});
            } else {
              response = `Enter polling center code:`;
              await storage.updateUssdSession(sessionId, "submit_results_center", { userId: authenticatedUser.id });
            }
          } else if (text === "3") {
            response = `Enter polling center code to check status:`;
            await storage.updateUssdSession(sessionId, "check_status", {});
          } else if (text === "0") {
            response = `Thank you for using PTC System`;
            await storage.expireUssdSession(sessionId);
            continueSession = false;
          } else {
            response = `Invalid option. Please try again.\n1. Register as Agent\n${authenticatedUser?.isApproved ? '2. Submit Results\n' : ''}3. Check Status\n0. Exit`;
          }
          break;
          
        case "register_firstname":
          const sessionData = { firstName: text };
          response = `Enter your last name:`;
          await storage.updateUssdSession(sessionId, "register_lastname", sessionData);
          break;
          
        case "register_lastname":
          const currentData = session.sessionData as any;
          response = `Registration submitted for approval.\nName: ${currentData.firstName} ${text}\nPhone: ${phoneNumber}\nYou will be notified when approved.`;
          
          // Create pending user for admin approval
          const hashedPassword = await hashPassword("temp123"); // Temporary password
          await storage.createUser({
            phone: phoneNumber,
            firstName: currentData.firstName,
            lastName: text,
            passwordHash: hashedPassword,
          });
          
          await storage.expireUssdSession(sessionId);
          continueSession = false;
          break;
          
        case "submit_results_center":
          const centerCode = text.toUpperCase();
          const pollingCenter = await storage.getPollingCenterByCode(centerCode);
          
          if (!pollingCenter) {
            response = `Invalid polling center code. Please enter a valid code:`;
          } else {
            response = `Polling Center: ${pollingCenter.name}\nSelect category:\n1. Presidential\n2. Member of Parliament\n3. Councilor`;
            await storage.updateUssdSession(sessionId, "submit_results_category", { 
              ...session.sessionData, 
              pollingCenterId: pollingCenter.id,
              centerCode: pollingCenter.code,
              centerName: pollingCenter.name
            });
          }
          break;
          
        case "submit_results_category":
          const categoryMap = { "1": "president", "2": "mp", "3": "councilor" };
          const selectedCategory = categoryMap[text as "1" | "2" | "3"];
          
          if (!selectedCategory) {
            response = `Invalid option. Select category:\n1. Presidential\n2. Member of Parliament\n3. Councilor`;
          } else {
            const sessionData = session.sessionData as any;
            
            // Get candidates for this category and constituency (if applicable)
            let candidates;
            if (selectedCategory === "president") {
              candidates = await storage.getCandidatesByCategory("president");
            } else {
              // For MP/Councilor, filter by constituency
              const center = await storage.getPollingCenter(sessionData.pollingCenterId);
              candidates = await storage.getCandidatesByCategory(selectedCategory as "mp" | "councilor", center?.constituency);
            }
            
            if (!candidates || candidates.length === 0) {
              response = `No candidates found for this category. Returning to menu...`;
              await storage.updateUssdSession(sessionId, "main_menu", {});
            } else {
              // Display candidates with abbreviations
              let candidatesList = `Enter votes for each candidate using abbreviation:\n\n`;
              candidates.forEach((candidate, index) => {
                candidatesList += `${candidate.abbreviation || candidate.name.substring(0, 3).toUpperCase()}: ${candidate.name}\n`;
              });
              candidatesList += `\nFormat: ABB=123,XYZ=456\nOr type SKIP to skip this category`;
              
              response = candidatesList;
              await storage.updateUssdSession(sessionId, "submit_results_votes", {
                ...sessionData,
                category: selectedCategory,
                candidates: candidates.map(c => ({
                  id: c.id,
                  name: c.name,
                  abbreviation: c.abbreviation || c.name.substring(0, 3).toUpperCase()
                }))
              });
            }
          }
          break;
          
        case "submit_results_votes":
          const voteSessionData = session.sessionData as any;
          
          if (text.toUpperCase() === "SKIP") {
            response = `Category skipped. Select another category:\n1. Presidential\n2. Member of Parliament\n3. Councilor\n0. Finish submission`;
            await storage.updateUssdSession(sessionId, "submit_results_category", voteSessionData);
          } else {
            try {
              // Parse vote input: ABB=123,XYZ=456
              const voteEntries = text.split(',').map(entry => entry.trim());
              const candidateVotes: any[] = [];
              let totalVotes = 0;
              
              for (const entry of voteEntries) {
                const [abbr, voteStr] = entry.split('=');
                if (!abbr || !voteStr) continue;
                
                const votes = parseInt(voteStr.trim());
                if (isNaN(votes) || votes < 0) continue;
                
                const candidate = voteSessionData.candidates.find((c: any) => 
                  c.abbreviation.toLowerCase() === abbr.trim().toLowerCase()
                );
                
                if (candidate) {
                  candidateVotes.push({
                    candidateId: candidate.id,
                    candidateName: candidate.name,
                    votes: votes
                  });
                  totalVotes += votes;
                }
              }
              
              if (candidateVotes.length === 0) {
                response = `Invalid format. Use: ABB=123,XYZ=456\nTry again or type SKIP:`;
              } else {
                response = `Enter invalid votes (or 0):`;
                await storage.updateUssdSession(sessionId, "submit_results_invalid", {
                  ...voteSessionData,
                  candidateVotes,
                  totalVotes
                });
              }
            } catch (error) {
              response = `Invalid format. Use: ABB=123,XYZ=456\nTry again or type SKIP:`;
            }
          }
          break;
          
        case "submit_results_invalid":
          const invalidVotes = parseInt(text) || 0;
          const finalSessionData = session.sessionData as any;
          
          try {
            // Create results for each candidate
            const results = [];
            for (const candidateVote of finalSessionData.candidateVotes) {
              const result = await storage.createResult({
                userId: finalSessionData.userId,
                pollingCenterId: finalSessionData.pollingCenterId,
                candidateId: candidateVote.candidateId,
                votes: candidateVote.votes,
                invalidVotes: invalidVotes,
                totalVotes: finalSessionData.totalVotes + invalidVotes,
                submissionMethod: 'ussd',
              });
              results.push(result);
            }
            
            response = `Results submitted successfully!\n\nCenter: ${finalSessionData.centerName}\nCategory: ${finalSessionData.category}\nTotal Valid: ${finalSessionData.totalVotes}\nInvalid: ${invalidVotes}\n\nSubmit another category?\n1. Presidential\n2. MP\n3. Councilor\n0. Exit`;
            await storage.updateUssdSession(sessionId, "submit_results_category", {
              pollingCenterId: finalSessionData.pollingCenterId,
              centerCode: finalSessionData.centerCode,
              centerName: finalSessionData.centerName,
              userId: finalSessionData.userId
            });
          } catch (error) {
            response = `Error submitting results. Please try again.\nEnter invalid votes (or 0):`;
          }
          break;
          
        case "check_status":
          const statusCenterCode = text.toUpperCase();
          const statusCenter = await storage.getPollingCenterByCode(statusCenterCode);
          
          if (!statusCenter) {
            response = `Invalid polling center code. Please try again:`;
          } else {
            // Get results count for this center
            const centerResults = await storage.getResultsByPollingCenter(statusCenter.id);
            response = `${statusCenter.name}\nResults submitted: ${centerResults.length} categories\nStatus: ${centerResults.length > 0 ? 'Active' : 'No results yet'}`;
            await storage.expireUssdSession(sessionId);
            continueSession = false;
          }
          break;
          
        default:
          response = `Welcome to PTC Election System\n1. Register as Agent\n${authenticatedUser?.isApproved ? '2. Submit Results\n' : ''}3. Check Status\n0. Exit`;
          await storage.updateUssdSession(sessionId, "menu_selection", {});
      }
      
      // Africa's Talking expects CON for continue, END for terminate
      const prefix = continueSession ? "CON" : "END";
      res.type('text/plain').send(`${prefix} ${response}`);
    } catch (error) {
      console.error("Error processing Africa's Talking USSD:", error);
      res.type('text/plain').send("END Service temporarily unavailable. Please try again later.");
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

  // Flag result for document mismatch
  app.post("/api/results/:id/flag-document-mismatch", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'supervisor' && user?.role !== 'admin' && user?.role !== 'reviewer') {
        return res.status(403).json({ message: "Access denied. Supervisor, admin, or reviewer role required." });
      }

      const { reason } = req.body;
      const resultId = req.params.id;

      if (!reason) {
        return res.status(400).json({ message: "Reason for document mismatch is required" });
      }

      const updatedResult = await storage.flagForDocumentMismatch(resultId, reason);

      // Log audit
      await storage.createAuditLog({
        userId: user.id,
        action: "FLAG_DOCUMENT_MISMATCH",
        entityType: "result",
        entityId: resultId,
        newValues: { documentMismatch: true, documentMismatchReason: reason },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(updatedResult);
    } catch (error) {
      console.error("Error flagging document mismatch:", error);
      res.status(400).json({ message: "Failed to flag document mismatch" });
    }
  });

  // Edit result (reviewers can edit flagged results)
  app.patch("/api/results/:id/edit", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      if (user?.role !== 'supervisor' && user?.role !== 'admin' && user?.role !== 'reviewer') {
        return res.status(403).json({ message: "Access denied. Supervisor, admin, or reviewer role required." });
      }

      const resultId = req.params.id;
      const updates = req.body;

      // Get the current result to check if it's flagged
      const currentResult = await storage.getResult(resultId);
      if (!currentResult) {
        return res.status(404).json({ message: "Result not found" });
      }

      // Only allow editing flagged results
      if (currentResult.status !== 'flagged') {
        return res.status(400).json({ message: "Only flagged results can be edited" });
      }

      const updatedResult = await storage.updateResult(resultId, {
        ...updates,
        status: 'pending' // Reset status to pending after edit
      });

      // Log audit
      await storage.createAuditLog({
        userId: user.id,
        action: "EDIT_FLAGGED_RESULT",
        entityType: "result",
        entityId: resultId,
        oldValues: currentResult,
        newValues: updates,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      res.json(updatedResult);
    } catch (error) {
      console.error("Error editing result:", error);
      res.status(400).json({ message: "Failed to edit result" });
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
