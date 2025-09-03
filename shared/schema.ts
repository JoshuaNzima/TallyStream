import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum('user_role', ['agent', 'supervisor', 'admin', 'reviewer']);

// Result status enum  
export const resultStatusEnum = pgEnum('result_status', ['pending', 'verified', 'flagged', 'rejected']);

// Submission channel enum
export const submissionChannelEnum = pgEnum('submission_channel', ['whatsapp', 'portal', 'ussd', 'both']);

// Candidate category enum
export const candidateCategoryEnum = pgEnum('candidate_category', ['president', 'mp', 'councilor']);

// User storage table.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  phone: varchar("phone").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  passwordHash: varchar("password_hash").notNull(),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").default('agent').notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  phoneVerified: boolean("phone_verified").default(false).notNull(),
  isApproved: boolean("is_approved").default(false).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  lastProfileUpdate: timestamp("last_profile_update"),
  emailVerificationToken: varchar("email_verification_token"),
  phoneVerificationToken: varchar("phone_verification_token"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  phoneVerificationExpiry: timestamp("phone_verification_expiry"),
  registrationChannel: submissionChannelEnum("registration_channel").default('portal'),
  currentSessionId: varchar("current_session_id"),
  sessionExpiry: timestamp("session_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Constituencies table
export const constituencies = pgTable("constituencies", {
  id: varchar("id").primaryKey(), // e.g., "107"
  name: varchar("name").notNull(), // e.g., "LILONGWE CITY"
  code: varchar("code").unique().notNull(),
  district: varchar("district").notNull(),
  state: varchar("state").notNull(),
  totalVoters: integer("total_voters").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wards table
export const wards = pgTable("wards", {
  id: varchar("id").primaryKey(), // e.g., "10701"
  constituencyId: varchar("constituency_id").references(() => constituencies.id).notNull(),
  name: varchar("name").notNull(), // e.g., "MTANDIRE"
  code: varchar("code").unique().notNull(),
  totalVoters: integer("total_voters").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Centres table
export const centres = pgTable("centres", {
  id: varchar("id").primaryKey(), // e.g., "1070101"
  wardId: varchar("ward_id").references(() => wards.id).notNull(),
  name: varchar("name").notNull(), // e.g., "KANKODOLA L.E.A. SCHOOL"
  code: varchar("code").unique().notNull(),
  registeredVoters: integer("registered_voters").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Polling centers table (legacy - keeping for backward compatibility)
export const pollingCenters = pgTable("polling_centers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").unique().notNull(),
  name: varchar("name").notNull(),
  constituency: varchar("constituency").notNull(),
  district: varchar("district").notNull(),
  state: varchar("state").notNull(),
  registeredVoters: integer("registered_voters").notNull(),
  centreId: varchar("centre_id").references(() => centres.id), // Link to new structure
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Political parties table
export const politicalParties = pgTable("political_parties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").unique().notNull(),
  abbreviation: varchar("abbreviation").unique(),
  color: varchar("color"), // Hex color code for UI
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Candidates table
export const candidates = pgTable("candidates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  abbreviation: varchar("abbreviation").unique(), // For USSD quick submissions
  partyId: varchar("party_id").references(() => politicalParties.id),
  party: varchar("party").notNull(), // Keep for backward compatibility
  category: candidateCategoryEnum("category").notNull(),
  constituency: varchar("constituency"), // For MPs and Councilors
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Results table
export const results = pgTable("results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  pollingCenterId: varchar("polling_center_id").references(() => pollingCenters.id).notNull(),
  submittedBy: varchar("submitted_by").references(() => users.id).notNull(),
  verifiedBy: varchar("verified_by").references(() => users.id),
  category: candidateCategoryEnum("category").notNull(),
  
  // Presidential votes
  presidentialVotes: jsonb("presidential_votes"), // {candidateId: votes}
  
  // MP votes  
  mpVotes: jsonb("mp_votes"), // {candidateId: votes}
  
  // Councilor votes
  councilorVotes: jsonb("councilor_votes"), // {candidateId: votes}
  
  invalidVotes: integer("invalid_votes").notNull(),
  totalVotes: integer("total_votes").notNull(),
  status: resultStatusEnum("status").default('pending').notNull(),
  submissionChannel: submissionChannelEnum("submission_channel").notNull(),
  comments: text("comments"),
  flaggedReason: text("flagged_reason"),
  documentMismatch: boolean("document_mismatch").default(false).notNull(),
  documentMismatchReason: text("document_mismatch_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  verifiedAt: timestamp("verified_at"),
});

// Result files table (for uploaded photos)
export const resultFiles = pgTable("result_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resultId: varchar("result_id").references(() => results.id).notNull(),
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Audit logs table
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: varchar("action").notNull(),
  entityType: varchar("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  oldValues: jsonb("old_values"),
  newValues: jsonb("new_values"),
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  submittedResults: many(results, { relationName: "submittedBy" }),
  verifiedResults: many(results, { relationName: "verifiedBy" }),
  auditLogs: many(auditLogs),
}));

// New hierarchical relations
export const constituenciesRelations = relations(constituencies, ({ many }) => ({
  wards: many(wards),
}));

export const wardsRelations = relations(wards, ({ one, many }) => ({
  constituency: one(constituencies, {
    fields: [wards.constituencyId],
    references: [constituencies.id],
  }),
  centres: many(centres),
}));

export const centresRelations = relations(centres, ({ one, many }) => ({
  ward: one(wards, {
    fields: [centres.wardId],
    references: [wards.id],
  }),
  pollingCenters: many(pollingCenters),
}));

export const pollingCentersRelations = relations(pollingCenters, ({ one, many }) => ({
  centre: one(centres, {
    fields: [pollingCenters.centreId],
    references: [centres.id],
  }),
  results: many(results),
}));

// Political parties relations
export const politicalPartiesRelations = relations(politicalParties, ({ many }) => ({
  candidates: many(candidates),
}));

// Candidates relations
export const candidatesRelations = relations(candidates, ({ one }) => ({
  party: one(politicalParties, {
    fields: [candidates.partyId],
    references: [politicalParties.id],
  }),
}));

export const resultsRelations = relations(results, ({ one, many }) => ({
  pollingCenter: one(pollingCenters, {
    fields: [results.pollingCenterId],
    references: [pollingCenters.id],
  }),
  submitter: one(users, {
    fields: [results.submittedBy],
    references: [users.id],
    relationName: "submittedBy",
  }),
  verifier: one(users, {
    fields: [results.verifiedBy],
    references: [users.id],
    relationName: "verifiedBy",
  }),
  files: many(resultFiles),
}));

export const resultFilesRelations = relations(resultFiles, ({ one }) => ({
  result: one(results, {
    fields: [resultFiles.resultId],
    references: [results.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const insertPoliticalPartySchema = createInsertSchema(politicalParties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
  createdAt: true,
  updatedAt: true,
});

export const registerUserSchema = createInsertSchema(users).pick({
  email: true,
  phone: true,
  firstName: true,
  lastName: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

export const upsertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertConstituencySchema = createInsertSchema(constituencies).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertWardSchema = createInsertSchema(wards).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCentreSchema = createInsertSchema(centres).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertPollingCenterSchema = createInsertSchema(pollingCenters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCandidateSchema = createInsertSchema(candidates).omit({
  id: true,
  createdAt: true,
});

export const insertResultSchema = createInsertSchema(results).omit({
  id: true,
  totalVotes: true, // This is calculated in the backend
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
});

export const insertResultFileSchema = createInsertSchema(resultFiles).omit({
  id: true,
  uploadedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// USSD Sessions table for tracking multi-step interactions
export const ussdSessions = pgTable("ussd_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phoneNumber: varchar("phone_number").notNull(),
  sessionId: varchar("session_id").unique().notNull(),
  currentStep: varchar("current_step").notNull(),
  sessionData: jsonb("session_data").default('{}'),
  expiresAt: timestamp("expires_at").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// USSD Provider configurations
export const ussdProviders = pgTable("ussd_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").unique().notNull(),
  type: varchar("type").notNull(), // 'twilio', 'africas_talking', 'custom'
  isActive: boolean("is_active").default(true).notNull(),
  configuration: jsonb("configuration").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// WhatsApp Provider configurations
export const whatsappProviders = pgTable("whatsapp_providers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").unique().notNull(),
  type: varchar("type").notNull(), // 'meta', 'wati', 'interakt', 'aisensy', 'twilio', 'infobip', 'custom'
  isActive: boolean("is_active").default(true).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(), // Only one primary provider
  configuration: jsonb("configuration").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Types
export type User = typeof users.$inferSelect;
export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Constituency = typeof constituencies.$inferSelect;
export type InsertConstituency = z.infer<typeof insertConstituencySchema>;
export type Ward = typeof wards.$inferSelect;
export type InsertWard = z.infer<typeof insertWardSchema>;
export type Centre = typeof centres.$inferSelect;
export type InsertCentre = z.infer<typeof insertCentreSchema>;
export type PollingCenter = typeof pollingCenters.$inferSelect;
export type InsertPollingCenter = z.infer<typeof insertPollingCenterSchema>;
export type PoliticalParty = typeof politicalParties.$inferSelect;
export type InsertPoliticalParty = z.infer<typeof insertPoliticalPartySchema>;
export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;
export type Result = typeof results.$inferSelect;
export type InsertResult = z.infer<typeof insertResultSchema>;
export type ResultFile = typeof resultFiles.$inferSelect;
export type InsertResultFile = z.infer<typeof insertResultFileSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type UssdSession = typeof ussdSessions.$inferSelect;
export type UssdProvider = typeof ussdProviders.$inferSelect;
export type WhatsappProvider = typeof whatsappProviders.$inferSelect;

// Extended types with relations
export type ResultWithRelations = Result & {
  pollingCenter: PollingCenter;
  submitter: User;
  verifier?: User;
  files: ResultFile[];
};

export type UserRole = 'agent' | 'supervisor' | 'admin' | 'reviewer';
export type ResultStatus = 'pending' | 'verified' | 'flagged' | 'rejected';
export type SubmissionChannel = 'whatsapp' | 'portal' | 'ussd' | 'both';
export type CandidateCategory = 'president' | 'mp' | 'councilor';
