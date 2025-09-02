import bcrypt from "bcrypt";
import { Strategy as LocalStrategy } from "passport-local";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { loginSchema, registerUserSchema } from "@shared/schema";
import { z } from "zod";

const SALT_ROUNDS = 12;

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'dev-session-secret-key-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure local strategy
  passport.use(new LocalStrategy(
    {
      usernameField: 'identifier',
      passwordField: 'password'
    },
    async (identifier, password, done) => {
      try {
        const user = await storage.getUserByIdentifier(identifier);
        
        if (!user) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) {
          return done(null, false, { message: 'Invalid credentials' });
        }

        if (!user.isActive) {
          return done(null, false, { message: 'Account is disabled' });
        }

        if (!user.isApproved) {
          return done(null, false, { message: 'Account pending approval' });
        }

        // Update last login and establish session
        await storage.updateLastLogin(user.id);

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  ));

  passport.serializeUser((user: any, cb) => {
    cb(null, user.id);
  });

  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await storage.getUser(id);
      if (!user || !user.isActive) {
        return cb(null, false);
      }
      cb(null, user);
    } catch (error) {
      console.error('Error deserializing user:', error);
      cb(null, false);
    }
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  if (req.isAuthenticated()) {
    const user = req.user;
    const currentSessionId = req.sessionID;
    
    // Check for single session enforcement
    if (user.currentSessionId && user.currentSessionId !== currentSessionId) {
      // Check if the existing session is still valid
      const existingUser = await storage.getUserBySession(user.currentSessionId);
      if (existingUser) {
        // Another session exists, clear this one and require re-login
        await storage.clearUserSession(user.id);
        return res.status(401).json({ 
          message: "Your session was terminated due to a login from another device.",
          code: "SESSION_CONFLICT"
        });
      }
    }
    
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Validation schemas
export const validateRegister = (data: unknown) => {
  return registerUserSchema.parse(data);
};

export const validateLogin = (data: unknown) => {
  return loginSchema.parse(data);
};