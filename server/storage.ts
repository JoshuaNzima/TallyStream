import {
  users,
  pollingCenters,
  constituencies,
  wards,
  centres,
  candidates,
  results,
  resultFiles,
  auditLogs,
  politicalParties,
  ussdSessions,
  ussdProviders,
  whatsappProviders,
  type User,
  type UpsertUser,
  type PollingCenter,
  type InsertPollingCenter,
  type Constituency,
  type InsertConstituency,
  type Ward,
  type InsertWard,
  type Centre,
  type InsertCentre,
  type PoliticalParty,
  type InsertPoliticalParty,
  type Candidate,
  type InsertCandidate,
  type Result,
  type InsertResult,
  type ResultWithRelations,
  type ResultFile,
  type InsertResultFile,
  type AuditLog,
  type InsertAuditLog,
  type UssdSession,
  type UssdProvider,
  type WhatsappProvider,
  type UserRole,
  type ResultStatus,
  type CandidateCategory,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByIdentifier(identifier: string): Promise<User | undefined>;
  createUser(user: { email?: string; phone?: string; firstName: string; lastName: string; passwordHash: string }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: UserRole): Promise<User>;
  updateLastLogin(userId: string): Promise<void>;
  
  // Hierarchical location operations
  getAllConstituenciesWithHierarchy(): Promise<(Constituency & { wards: (Ward & { centres: Centre[] })[] })[]>;
  getConstituencies(): Promise<Constituency[]>;
  getWards(): Promise<Ward[]>;
  upsertConstituency(constituency: InsertConstituency): Promise<Constituency>;
  upsertWard(ward: InsertWard): Promise<Ward>;
  upsertCentre(centre: InsertCentre): Promise<Centre>;
  
  // Polling center operations
  getPollingCenters(page?: number, limit?: number): Promise<{ data: PollingCenter[]; total: number; }>;
  getPollingCenter(id: string): Promise<PollingCenter | undefined>;
  createPollingCenter(center: InsertPollingCenter): Promise<PollingCenter>;
  updatePollingCenter(id: string, data: Partial<PollingCenter>): Promise<PollingCenter>;
  reactivatePollingCenter(id: string): Promise<PollingCenter>;
  deactivatePollingCenter(id: string): Promise<PollingCenter>;
  
  // Political party operations
  getPoliticalParties(): Promise<PoliticalParty[]>;
  createPoliticalParty(party: InsertPoliticalParty): Promise<PoliticalParty>;
  updatePoliticalParty(id: string, party: Partial<InsertPoliticalParty>): Promise<PoliticalParty>;
  deactivatePoliticalParty(id: string): Promise<PoliticalParty>;
  
  // Candidate operations
  getCandidates(page?: number, limit?: number): Promise<{ data: Candidate[]; total: number; }>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  
  // Session management
  updateUserSession(userId: string, sessionId: string, expiryTime: Date): Promise<User>;
  clearUserSession(userId: string): Promise<User>;
  getUserBySession(sessionId: string): Promise<User | undefined>;
  
  // USSD operations
  createUssdSession(phoneNumber: string, sessionId: string, currentStep: string): Promise<UssdSession>;
  getUssdSession(sessionId: string): Promise<UssdSession | undefined>;
  updateUssdSession(sessionId: string, currentStep: string, sessionData: any): Promise<UssdSession>;
  expireUssdSession(sessionId: string): Promise<void>;
  
  // USSD Provider management
  getUssdProviders(): Promise<UssdProvider[]>;
  createUssdProvider(provider: { name: string; type: string; configuration: any }): Promise<UssdProvider>;
  updateUssdProvider(id: string, updates: { isActive?: boolean; configuration?: any }): Promise<UssdProvider>;
  
  // WhatsApp Provider management
  getWhatsappProviders(): Promise<WhatsappProvider[]>;
  createWhatsappProvider(provider: { name: string; type: string; configuration: any; isPrimary?: boolean }): Promise<WhatsappProvider>;
  updateWhatsappProvider(id: string, updates: { isActive?: boolean; configuration?: any; isPrimary?: boolean }): Promise<WhatsappProvider>;
  setPrimaryWhatsappProvider(id: string): Promise<WhatsappProvider>;
  
  // Result operations
  getResults(): Promise<ResultWithRelations[]>;
  getAllResultsWithDetails(): Promise<ResultWithRelations[]>;
  getResult(id: string): Promise<Result | undefined>;
  getResultsByStatus(status: ResultStatus): Promise<ResultWithRelations[]>;
  getResultsByPollingCenter(pollingCenterId: string): Promise<ResultWithRelations[]>;
  createResult(result: InsertResult): Promise<Result>;
  updateResultStatus(resultId: string, status: ResultStatus, verifiedBy?: string, flaggedReason?: string): Promise<Result>;
  flagForDocumentMismatch(resultId: string, reason: string): Promise<Result>;
  updateResult(resultId: string, updates: Partial<InsertResult>): Promise<Result>;
  updateUser(userId: string, updates: Partial<UpsertUser>): Promise<User>;
  getUserById(userId: string): Promise<User | undefined>;
  
  // Result file operations
  createResultFile(file: InsertResultFile): Promise<ResultFile>;
  getResultFiles(resultId: string): Promise<ResultFile[]>;
  
  // Statistics
  getStats(): Promise<{
    totalCenters: number;
    resultsReceived: number;
    verified: number;
    flagged: number;
    completionRate: number;
    verificationRate: number;
  }>;

  // Analytics operations for real-time dashboard
  getRecentSubmissions(limit: number): Promise<any[]>;
  getPendingVerifications(): Promise<any[]>;
  getTopPerformingCenters(limit: number): Promise<Array<{
    pollingCenter: PollingCenter;
    submissionCount: number;
    verificationRate: number;
  }>>;
  getHourlySubmissionTrends(): Promise<Array<{
    hour: string;
    submissions: number;
    verifications: number;
  }>>;
  
  // Party performance data for dashboard charts
  getPartyPerformance(category?: CandidateCategory): Promise<Array<{
    party: string;
    totalVotes: number;
    percentage: number;
    candidates: number;
    category: CandidateCategory;
  }>>;
  
  // Audit operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;

  // Admin database management operations
  deactivateUser(userId: string): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  archiveResults(): Promise<number>;
  cleanDatabase(options: {
    users?: boolean;
    candidates?: boolean;
    pollingCenters?: boolean;
    results?: boolean;
    keepAdmin?: boolean;
  }): Promise<{
    usersDeleted: number;
    candidatesDeleted: number;
    pollingCentersDeleted: number;
    resultsDeleted: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByIdentifier(identifier: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      or(eq(users.email, identifier), eq(users.phone, identifier))
    );
    return user;
  }

  async createUser(userData: { email?: string; phone?: string; firstName: string; lastName: string; passwordHash: string }): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, userId));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async approveUser(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isApproved: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getPendingUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isApproved, false));
  }

  // Polling center operations
  async getPollingCenters(page?: number, limit?: number): Promise<{ data: PollingCenter[]; total: number; }> {
    // Get total count of active polling centers
    const totalResult = await db.select({ count: count() }).from(pollingCenters).where(eq(pollingCenters.isActive, true));
    const total = totalResult[0].count;

    // Apply pagination if specified
    let query = db.select().from(pollingCenters).where(eq(pollingCenters.isActive, true)).orderBy(desc(pollingCenters.createdAt));
    
    if (page !== undefined && limit !== undefined) {
      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset) as any;
    }

    const data = await query;
    return { data, total };
  }

  async getPollingCenter(id: string): Promise<PollingCenter | undefined> {
    const [center] = await db.select().from(pollingCenters).where(eq(pollingCenters.id, id));
    return center;
  }

  async getPollingCenterByCode(code: string): Promise<PollingCenter | undefined> {
    const [center] = await db.select().from(pollingCenters).where(eq(pollingCenters.code, code));
    return center;
  }

  async createPollingCenter(center: InsertPollingCenter): Promise<PollingCenter> {
    const [newCenter] = await db.insert(pollingCenters).values(center).returning();
    return newCenter;
  }

  async reactivatePollingCenter(id: string): Promise<PollingCenter> {
    const [reactivatedCenter] = await db
      .update(pollingCenters)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(pollingCenters.id, id))
      .returning();
    return reactivatedCenter;
  }

  async deactivatePollingCenter(id: string): Promise<PollingCenter> {
    const [deactivatedCenter] = await db
      .update(pollingCenters)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(pollingCenters.id, id))
      .returning();
    return deactivatedCenter;
  }

  async updatePollingCenter(id: string, data: Partial<PollingCenter>): Promise<PollingCenter> {
    const [updatedCenter] = await db
      .update(pollingCenters)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pollingCenters.id, id))
      .returning();
    return updatedCenter;
  }

  // Political party operations
  async getPoliticalParties(): Promise<PoliticalParty[]> {
    return await db.select().from(politicalParties).where(eq(politicalParties.isActive, true)).orderBy(politicalParties.name);
  }

  async getAllPoliticalParties(): Promise<PoliticalParty[]> {
    return await db.select().from(politicalParties).orderBy(politicalParties.name);
  }

  async getPoliticalPartyByName(name: string): Promise<PoliticalParty | undefined> {
    const [party] = await db.select().from(politicalParties).where(eq(politicalParties.name, name));
    return party;
  }

  async createPoliticalParty(party: InsertPoliticalParty): Promise<PoliticalParty> {
    const [newParty] = await db.insert(politicalParties).values({
      ...party,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return newParty;
  }

  async updatePoliticalParty(id: string, party: Partial<InsertPoliticalParty>): Promise<PoliticalParty> {
    const [updatedParty] = await db
      .update(politicalParties)
      .set({ ...party, updatedAt: new Date() })
      .where(eq(politicalParties.id, id))
      .returning();
    return updatedParty;
  }

  async deactivatePoliticalParty(id: string): Promise<PoliticalParty> {
    const [deactivatedParty] = await db
      .update(politicalParties)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(politicalParties.id, id))
      .returning();
    return deactivatedParty;
  }

  async reactivatePoliticalParty(id: string): Promise<PoliticalParty> {
    const [reactivatedParty] = await db
      .update(politicalParties)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(politicalParties.id, id))
      .returning();
    return reactivatedParty;
  }

  async deletePoliticalParty(id: string): Promise<void> {
    // First check if the party is used by any candidates
    const candidatesUsingParty = await db.select().from(candidates).where(eq(candidates.partyId, id));
    
    if (candidatesUsingParty.length > 0) {
      throw new Error("Cannot delete political party as it is being used by existing candidates");
    }

    // Delete the political party
    await db.delete(politicalParties).where(eq(politicalParties.id, id));
  }

  // Candidate operations
  async getCandidates(page?: number, limit?: number): Promise<{ data: Candidate[]; total: number; }> {
    // Get total count
    const totalResult = await db.select({ count: count() }).from(candidates);
    const total = totalResult[0].count;

    // Apply pagination if specified
    let query = db.select().from(candidates).orderBy(desc(candidates.createdAt));
    
    if (page !== undefined && limit !== undefined) {
      const offset = (page - 1) * limit;
      query = query.limit(limit).offset(offset) as any;
    }

    const data = await query;
    return { data, total };
  }

  async getCandidatesByCategory(category: 'president' | 'mp' | 'councilor', constituency?: string): Promise<Candidate[]> {
    let query = db.select().from(candidates)
      .where(and(
        eq(candidates.category, category),
        eq(candidates.isActive, true)
      ));

    // For MP and Councilor, filter by constituency if provided
    if ((category === 'mp' || category === 'councilor') && constituency) {
      query = query.where(and(
        eq(candidates.category, category),
        eq(candidates.isActive, true),
        eq(candidates.constituency, constituency)
      )) as any;
    }

    return await query.orderBy(candidates.name);
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db.insert(candidates).values(candidate).returning();
    return newCandidate;
  }

  async reactivateCandidate(id: string): Promise<Candidate> {
    const [reactivatedCandidate] = await db
      .update(candidates)
      .set({ isActive: true })
      .where(eq(candidates.id, id))
      .returning();
    return reactivatedCandidate;
  }

  async deactivateCandidate(id: string): Promise<Candidate> {
    const [deactivatedCandidate] = await db
      .update(candidates)
      .set({ isActive: false })
      .where(eq(candidates.id, id))
      .returning();
    return deactivatedCandidate;
  }

  // Result operations
  async getResults(): Promise<ResultWithRelations[]> {
    return await db
      .select()
      .from(results)
      .leftJoin(pollingCenters, eq(results.pollingCenterId, pollingCenters.id))
      .leftJoin(users, eq(results.submittedBy, users.id))
      .orderBy(desc(results.createdAt))
      .then(rows => 
        rows.map(row => ({
          ...row.results,
          pollingCenter: row.polling_centers!,
          submitter: row.users!,
          verifier: undefined,
          files: []
        }))
      );
  }

  async getResultsByStatus(status: ResultStatus): Promise<ResultWithRelations[]> {
    return await db
      .select()
      .from(results)
      .leftJoin(pollingCenters, eq(results.pollingCenterId, pollingCenters.id))
      .leftJoin(users, eq(results.submittedBy, users.id))
      .where(eq(results.status, status))
      .orderBy(desc(results.createdAt))
      .then(rows => 
        rows.map(row => ({
          ...row.results,
          pollingCenter: row.polling_centers!,
          submitter: row.users!,
          verifier: undefined,
          files: []
        }))
      );
  }

  async getResultsByPollingCenter(pollingCenterId: string): Promise<ResultWithRelations[]> {
    return await db
      .select()
      .from(results)
      .leftJoin(pollingCenters, eq(results.pollingCenterId, pollingCenters.id))
      .leftJoin(users, eq(results.submittedBy, users.id))
      .where(eq(results.pollingCenterId, pollingCenterId))
      .orderBy(desc(results.createdAt))
      .then(rows => 
        rows.map(row => ({
          ...row.results,
          pollingCenter: row.polling_centers!,
          submitter: row.users!,
          verifier: undefined,
          files: []
        }))
      );
  }

  async createResult(result: InsertResult): Promise<Result> {
    // Get polling center details to check registered voters
    const pollingCenter = await this.getPollingCenter(result.pollingCenterId);
    if (!pollingCenter) {
      throw new Error("Polling center not found");
    }

    // Calculate votes for each category
    const presidentialTotal = result.presidentialVotes ? 
      Object.values(result.presidentialVotes as Record<string, number>).reduce((sum, votes) => sum + votes, 0) : 0;
    
    const mpTotal = result.mpVotes ? 
      Object.values(result.mpVotes as Record<string, number>).reduce((sum, votes) => sum + votes, 0) : 0;
    
    const councilorTotal = result.councilorVotes ? 
      Object.values(result.councilorVotes as Record<string, number>).reduce((sum, votes) => sum + votes, 0) : 0;

    // Calculate total votes from all categories plus invalid votes
    const totalVotes = presidentialTotal + mpTotal + councilorTotal + result.invalidVotes;

    // Validation logic for tripartite election
    // Each voter votes 3 times (once for each category), so max valid votes per category = registered voters
    // Total votes across all categories should not exceed registered voters * 3
    const maxTotalVotes = pollingCenter.registeredVoters * 3;
    const maxVotesPerCategory = pollingCenter.registeredVoters;
    
    let status = result.status || 'pending';
    let flaggedReason = result.flaggedReason;

    // Flag if any individual category exceeds registered voters
    if (presidentialTotal > maxVotesPerCategory || mpTotal > maxVotesPerCategory || councilorTotal > maxVotesPerCategory) {
      status = 'flagged';
      flaggedReason = `Votes in one or more categories exceed registered voters (${maxVotesPerCategory}). Presidential: ${presidentialTotal}, MP: ${mpTotal}, Councilor: ${councilorTotal}`;
    }
    
    // Flag if total votes across all categories exceed theoretical maximum
    else if (totalVotes > maxTotalVotes) {
      status = 'flagged';
      flaggedReason = `Total votes (${totalVotes}) exceed maximum possible for tripartite election (${maxTotalVotes} = ${pollingCenter.registeredVoters} registered voters × 3 categories)`;
    }

    const [newResult] = await db
      .insert(results)
      .values({ 
        ...result, 
        totalVotes, 
        status,
        flaggedReason,
        documentMismatch: false,
        documentMismatchReason: null
      })
      .returning();
    return newResult;
  }

  async updateResultStatus(
    resultId: string, 
    status: ResultStatus, 
    verifiedBy?: string, 
    flaggedReason?: string
  ): Promise<Result> {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (verifiedBy) {
      updateData.verifiedBy = verifiedBy;
      updateData.verifiedAt = new Date();
    }
    
    if (flaggedReason) {
      updateData.flaggedReason = flaggedReason;
    }

    const [updatedResult] = await db
      .update(results)
      .set(updateData)
      .where(eq(results.id, resultId))
      .returning();
    return updatedResult;
  }

  async flagForDocumentMismatch(resultId: string, reason: string): Promise<Result> {
    const [updatedResult] = await db
      .update(results)
      .set({ 
        status: 'flagged',
        documentMismatch: true,
        documentMismatchReason: reason,
        flaggedReason: `Document data mismatch: ${reason}`,
        updatedAt: new Date()
      })
      .where(eq(results.id, resultId))
      .returning();
    return updatedResult;
  }

  async updateResult(resultId: string, updates: Partial<InsertResult>): Promise<Result> {
    const [updatedResult] = await db
      .update(results)
      .set({ 
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(results.id, resultId))
      .returning();
    return updatedResult;
  }

  async getResult(id: string): Promise<Result | undefined> {
    const [result] = await db.select().from(results).where(eq(results.id, id));
    return result;
  }

  async updateUser(userId: string, updates: Partial<UpsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getUserById(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user;
  }

  // Result file operations
  async createResultFile(file: InsertResultFile): Promise<ResultFile> {
    const [newFile] = await db.insert(resultFiles).values(file).returning();
    return newFile;
  }

  async getResultFiles(resultId: string): Promise<ResultFile[]> {
    return await db.select().from(resultFiles).where(eq(resultFiles.resultId, resultId));
  }

  // Statistics
  async getStats(): Promise<{
    totalCenters: number;
    resultsReceived: number;
    verified: number;
    flagged: number;
    completionRate: number;
    verificationRate: number;
  }> {
    const [totalCentersResult] = await db
      .select({ count: count() })
      .from(pollingCenters)
      .where(eq(pollingCenters.isActive, true));

    const [resultsReceivedResult] = await db
      .select({ count: count() })
      .from(results);

    const [verifiedResult] = await db
      .select({ count: count() })
      .from(results)
      .where(eq(results.status, 'verified'));

    const [flaggedResult] = await db
      .select({ count: count() })
      .from(results)
      .where(eq(results.status, 'flagged'));

    const totalCenters = totalCentersResult.count;
    const resultsReceived = resultsReceivedResult.count;
    const verified = verifiedResult.count;
    const flagged = flaggedResult.count;

    return {
      totalCenters,
      resultsReceived,
      verified,
      flagged,
      completionRate: totalCenters > 0 ? (resultsReceived / totalCenters) * 100 : 0,
      verificationRate: resultsReceived > 0 ? (verified / resultsReceived) * 100 : 0,
    };
  }

  // Audit operations
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogs(limit = 100): Promise<AuditLog[]> {
    return await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        oldValues: auditLogs.oldValues,
        newValues: auditLogs.newValues,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        // Join with users table to get user name
        userName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        userEmail: users.email
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // Analytics operations for real-time dashboard
  async getRecentSubmissions(limit: number): Promise<Array<{
    id: string;
    status: string;
    pollingCenter: { name: string };
    submitter: { firstName: string; lastName: string };
    totalVotes: number;
    createdAt: Date;
  }>> {
    const submissions = await db.select({
      id: results.id,
      status: results.status,
      totalVotes: results.totalVotes,
      createdAt: results.createdAt,
      pollingCenterName: pollingCenters.name,
      submitterFirstName: users.firstName,
      submitterLastName: users.lastName,
    })
      .from(results)
      .leftJoin(pollingCenters, eq(results.pollingCenterId, pollingCenters.id))
      .leftJoin(users, eq(results.submittedBy, users.id))
      .orderBy(desc(results.createdAt))
      .limit(limit);

    return submissions.map(submission => ({
      id: submission.id,
      status: submission.status,
      pollingCenter: { name: submission.pollingCenterName || 'Unknown Center' },
      submitter: { 
        firstName: submission.submitterFirstName || 'Unknown', 
        lastName: submission.submitterLastName || 'User' 
      },
      totalVotes: submission.totalVotes || 0,
      createdAt: submission.createdAt || new Date(),
    }));
  }

  async getPendingVerifications(): Promise<ResultWithRelations[]> {
    return await db.select()
      .from(results)
      .leftJoin(pollingCenters, eq(results.pollingCenterId, pollingCenters.id))
      .leftJoin(users, eq(results.submittedBy, users.id))
      .where(eq(results.status, 'pending'))
      .orderBy(desc(results.createdAt)) as any[];
  }

  async getTopPerformingCenters(limit: number): Promise<Array<{
    pollingCenter: PollingCenter;
    submissionCount: number;
    verificationRate: number;
  }>> {
    const centerStats = await db.select({
      pollingCenter: pollingCenters,
      submissionCount: count(results.id).as('submissionCount'),
      verifiedCount: sql<number>`COUNT(CASE WHEN ${results.status} = 'verified' THEN 1 END)`.as('verifiedCount'),
    })
      .from(pollingCenters)
      .leftJoin(results, eq(pollingCenters.id, results.pollingCenterId))
      .groupBy(pollingCenters.id)
      .orderBy(desc(count(results.id)))
      .limit(limit);

    return centerStats.map(stat => ({
      pollingCenter: stat.pollingCenter,
      submissionCount: stat.submissionCount,
      verificationRate: stat.submissionCount > 0 ? (stat.verifiedCount / stat.submissionCount) * 100 : 0,
    }));
  }

  async getHourlySubmissionTrends(): Promise<Array<{
    hour: string;
    submissions: number;
    verifications: number;
  }>> {
    const trends = await db.select({
      hour: sql<string>`TO_CHAR(${results.createdAt}, 'YYYY-MM-DD HH24:00')`.as('hour'),
      submissions: count(results.id).as('submissions'),
      verifications: sql<number>`COUNT(CASE WHEN ${results.status} = 'verified' THEN 1 END)`.as('verifications'),
    })
      .from(results)
      .where(sql`${results.createdAt} >= NOW() - INTERVAL '24 hours'`)
      .groupBy(sql`TO_CHAR(${results.createdAt}, 'YYYY-MM-DD HH24:00')`)
      .orderBy(sql`TO_CHAR(${results.createdAt}, 'YYYY-MM-DD HH24:00')`);

    return trends;
  }

  // Party performance data for dashboard charts
  async getPartyPerformance(category?: CandidateCategory): Promise<Array<{
    party: string;
    totalVotes: number;
    percentage: number;
    candidates: number;
    category: CandidateCategory;
    categoryBreakdown?: {
      president?: number;
      mp?: number;
      councilor?: number;
    };
  }>> {
    try {
      // Get all verified results
      const verifiedResults = await db
        .select()
        .from(results)
        .where(eq(results.status, 'verified'));

      // Get all candidates to match parties with categories
      const allCandidates = await db.select().from(candidates);
      
      if (category) {
        // Category-specific data (existing logic)
        const partyPerformance = new Map<string, {
          party: string;
          totalVotes: number;
          candidates: number;
          category: CandidateCategory;
        }>();

        // Process each verified result
        for (const result of verifiedResults) {
          const resultData = result;
          
          // Process each category's votes
          const categories: { votes: any; category: CandidateCategory }[] = [
            { votes: resultData.presidentialVotes, category: 'president' },
            { votes: resultData.mpVotes, category: 'mp' },
            { votes: resultData.councilorVotes, category: 'councilor' }
          ];

          for (const { votes, category: resultCategory } of categories) {
            if (category !== resultCategory) continue;
            
            if (votes && typeof votes === 'object') {
              for (const [candidateId, voteCount] of Object.entries(votes)) {
                const candidate = allCandidates.find(c => c.id === candidateId);
                if (candidate && candidate.category === resultCategory) {
                  const key = `${candidate.party}-${resultCategory}`;
                  
                  if (!partyPerformance.has(key)) {
                    partyPerformance.set(key, {
                      party: candidate.party,
                      totalVotes: 0,
                      candidates: 0,
                      category: resultCategory
                    });
                  }
                  
                  const partyData = partyPerformance.get(key)!;
                  partyData.totalVotes += Number(voteCount) || 0;
                }
              }
            }
          }
        }

        // Count candidates per party-category combination
        for (const candidate of allCandidates) {
          if (candidate.category !== category) continue;
          
          const key = `${candidate.party}-${candidate.category}`;
          if (partyPerformance.has(key)) {
            partyPerformance.get(key)!.candidates++;
          }
        }

        // Convert to array and calculate percentages
        const performanceArray = Array.from(partyPerformance.values());
        const totalVotes = performanceArray.reduce((sum, party) => sum + party.totalVotes, 0);

        return performanceArray.map(party => ({
          ...party,
          percentage: totalVotes > 0 ? (party.totalVotes / totalVotes) * 100 : 0
        })).sort((a, b) => b.totalVotes - a.totalVotes);
      } else {
        // All categories - aggregate by party
        const partyTotals = new Map<string, {
          party: string;
          totalVotes: number;
          candidates: number;
          categoryBreakdown: { president: number; mp: number; councilor: number };
        }>();

        // Process each verified result
        for (const result of verifiedResults) {
          const resultData = result;
          
          // Process each category's votes
          const categories: { votes: any; category: CandidateCategory }[] = [
            { votes: resultData.presidentialVotes, category: 'president' },
            { votes: resultData.mpVotes, category: 'mp' },
            { votes: resultData.councilorVotes, category: 'councilor' }
          ];

          for (const { votes, category: resultCategory } of categories) {
            if (votes && typeof votes === 'object') {
              for (const [candidateId, voteCount] of Object.entries(votes)) {
                const candidate = allCandidates.find(c => c.id === candidateId);
                if (candidate && candidate.category === resultCategory) {
                  if (!partyTotals.has(candidate.party)) {
                    partyTotals.set(candidate.party, {
                      party: candidate.party,
                      totalVotes: 0,
                      candidates: 0,
                      categoryBreakdown: { president: 0, mp: 0, councilor: 0 }
                    });
                  }
                  
                  const partyData = partyTotals.get(candidate.party)!;
                  const votes = Number(voteCount) || 0;
                  partyData.totalVotes += votes;
                  partyData.categoryBreakdown[resultCategory] += votes;
                }
              }
            }
          }
        }

        // Count candidates per party across all categories
        for (const candidate of allCandidates) {
          if (partyTotals.has(candidate.party)) {
            partyTotals.get(candidate.party)!.candidates++;
          }
        }

        // Convert to array and calculate percentages
        const performanceArray = Array.from(partyTotals.values());
        const totalVotes = performanceArray.reduce((sum, party) => sum + party.totalVotes, 0);

        return performanceArray.map(party => ({
          ...party,
          category: 'all' as CandidateCategory,
          categoryBreakdown: party.categoryBreakdown,
          percentage: totalVotes > 0 ? (party.totalVotes / totalVotes) * 100 : 0
        })).sort((a, b) => b.totalVotes - a.totalVotes);
      }
      
    } catch (error) {
      console.error('Error calculating party performance:', error);
      return [];
    }
  }

  // Admin database management operations
  async deactivateUser(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async reactivateUser(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    // Delete user's audit logs first to avoid foreign key constraint issues
    await db.delete(auditLogs).where(eq(auditLogs.userId, userId));
    
    // Delete user's result files
    const userResults = await db.select({ id: results.id }).from(results).where(eq(results.submittedBy, userId));
    for (const result of userResults) {
      await db.delete(resultFiles).where(eq(resultFiles.resultId, result.id));
    }
    
    // Delete user's results
    await db.delete(results).where(eq(results.submittedBy, userId));
    
    // Finally delete the user
    await db.delete(users).where(eq(users.id, userId));
  }

  async archiveResults(): Promise<number> {
    // For now, we'll mark old results as archived by updating their status
    // In a full implementation, you might move them to a separate archive table
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const archivedResults = await db
      .update(results)
      .set({ status: 'archived' as any })
      .where(sql`${results.createdAt} < ${oneYearAgo}`)
      .returning();
    
    return archivedResults.length;
  }

  async cleanDatabase(options: {
    users?: boolean;
    candidates?: boolean;
    pollingCenters?: boolean;
    results?: boolean;
    keepAdmin?: boolean;
  }): Promise<{
    usersDeleted: number;
    candidatesDeleted: number;
    pollingCentersDeleted: number;
    resultsDeleted: number;
  }> {
    let usersDeleted = 0;
    let candidatesDeleted = 0;
    let pollingCentersDeleted = 0;
    let resultsDeleted = 0;

    // Clean results first to avoid foreign key issues
    if (options.results) {
      // Delete result files first
      await db.delete(resultFiles);
      const deletedResults = await db.delete(results).returning();
      resultsDeleted = deletedResults.length;
    }

    // Clean candidates
    if (options.candidates) {
      const deletedCandidates = await db.delete(candidates).returning();
      candidatesDeleted = deletedCandidates.length;
    }

    // Clean polling centers
    if (options.pollingCenters) {
      const deletedCenters = await db.delete(pollingCenters).returning();
      pollingCentersDeleted = deletedCenters.length;
    }

    // Clean users (except admin if specified)
    if (options.users) {
      // Delete audit logs first
      await db.delete(auditLogs);
      
      let deletedUsers;
      if (options.keepAdmin) {
        deletedUsers = await db.delete(users).where(sql`${users.role} != 'admin'`).returning();
      } else {
        deletedUsers = await db.delete(users).returning();
      }
      
      usersDeleted = deletedUsers.length;
    }

    return {
      usersDeleted,
      candidatesDeleted,
      pollingCentersDeleted,
      resultsDeleted,
    };
  }

  // Session management functions
  async updateUserSession(userId: string, sessionId: string, expiryTime: Date): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        currentSessionId: sessionId, 
        sessionExpiry: expiryTime,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async clearUserSession(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        currentSessionId: null, 
        sessionExpiry: null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserBySession(sessionId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.currentSessionId, sessionId),
        sql`${users.sessionExpiry} > NOW()`
      ));
    return user;
  }

  // USSD Session management
  async createUssdSession(phoneNumber: string, sessionId: string, currentStep: string): Promise<UssdSession> {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiry

    const [session] = await db
      .insert(ussdSessions)
      .values({
        phoneNumber,
        sessionId,
        currentStep,
        expiresAt,
        sessionData: {},
      })
      .returning();
    return session;
  }

  async getUssdSession(sessionId: string): Promise<UssdSession | undefined> {
    const [session] = await db
      .select()
      .from(ussdSessions)
      .where(and(
        eq(ussdSessions.sessionId, sessionId),
        eq(ussdSessions.isActive, true),
        sql`${ussdSessions.expiresAt} > NOW()`
      ));
    return session;
  }

  async updateUssdSession(sessionId: string, currentStep: string, sessionData: any): Promise<UssdSession> {
    const [session] = await db
      .update(ussdSessions)
      .set({ 
        currentStep, 
        sessionData,
        updatedAt: new Date() 
      })
      .where(eq(ussdSessions.sessionId, sessionId))
      .returning();
    return session;
  }

  async expireUssdSession(sessionId: string): Promise<void> {
    await db
      .update(ussdSessions)
      .set({ 
        isActive: false,
        updatedAt: new Date() 
      })
      .where(eq(ussdSessions.sessionId, sessionId));
  }

  // USSD Provider management
  async getUssdProviders(): Promise<UssdProvider[]> {
    return await db.select().from(ussdProviders).where(eq(ussdProviders.isActive, true));
  }

  async createUssdProvider(provider: { name: string; type: string; configuration: any }): Promise<UssdProvider> {
    const [newProvider] = await db
      .insert(ussdProviders)
      .values(provider)
      .returning();
    return newProvider;
  }

  async updateUssdProvider(id: string, updates: { isActive?: boolean; configuration?: any }): Promise<UssdProvider> {
    const updateData: any = { updatedAt: new Date() };
    if (typeof updates.isActive === 'boolean') updateData.isActive = updates.isActive;
    if (updates.configuration) updateData.configuration = updates.configuration;
    
    const [provider] = await db
      .update(ussdProviders)
      .set(updateData)
      .where(eq(ussdProviders.id, id))
      .returning();
    return provider;
  }

  // WhatsApp Provider management
  async getWhatsappProviders(): Promise<WhatsappProvider[]> {
    return await db.select().from(whatsappProviders).where(eq(whatsappProviders.isActive, true));
  }

  async createWhatsappProvider(provider: { name: string; type: string; configuration: any; isPrimary?: boolean }): Promise<WhatsappProvider> {
    // If setting as primary, first unset all other primary providers
    if (provider.isPrimary) {
      await db
        .update(whatsappProviders)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(eq(whatsappProviders.isPrimary, true));
    }
    
    const [newProvider] = await db
      .insert(whatsappProviders)
      .values(provider)
      .returning();
    return newProvider;
  }

  async updateWhatsappProvider(id: string, updates: { isActive?: boolean; configuration?: any; isPrimary?: boolean }): Promise<WhatsappProvider> {
    const updateData: any = { updatedAt: new Date() };
    if (typeof updates.isActive === 'boolean') updateData.isActive = updates.isActive;
    if (typeof updates.isPrimary === 'boolean') {
      // If setting as primary, first unset all other primary providers
      if (updates.isPrimary) {
        await db
          .update(whatsappProviders)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(eq(whatsappProviders.isPrimary, true));
      }
      updateData.isPrimary = updates.isPrimary;
    }
    if (updates.configuration) updateData.configuration = updates.configuration;
    
    const [provider] = await db
      .update(whatsappProviders)
      .set(updateData)
      .where(eq(whatsappProviders.id, id))
      .returning();
    return provider;
  }

  async setPrimaryWhatsappProvider(id: string): Promise<WhatsappProvider> {
    // First unset all primary providers
    await db
      .update(whatsappProviders)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(whatsappProviders.isPrimary, true));
    
    // Then set the specified provider as primary
    const [provider] = await db
      .update(whatsappProviders)
      .set({ 
        isPrimary: true,
        updatedAt: new Date() 
      })
      .where(eq(whatsappProviders.id, id))
      .returning();
    return provider;
  }

  // Hierarchical location operations
  async getAllConstituenciesWithHierarchy(): Promise<(Constituency & { wards: (Ward & { centres: Centre[] })[] })[]> {
    const constituencyData = await db.select().from(constituencies).where(eq(constituencies.isActive, true));
    const wardData = await db.select().from(wards).where(eq(wards.isActive, true));
    const centreData = await db.select().from(centres).where(eq(centres.isActive, true));

    return constituencyData.map(constituency => ({
      ...constituency,
      wards: wardData
        .filter(ward => ward.constituencyId === constituency.id)
        .map(ward => ({
          ...ward,
          centres: centreData.filter(centre => centre.wardId === ward.id)
        }))
    }));
  }

  async getConstituencies(): Promise<Constituency[]> {
    return await db.select().from(constituencies).where(eq(constituencies.isActive, true));
  }

  async getWards(): Promise<Ward[]> {
    return await db.select().from(wards).where(eq(wards.isActive, true));
  }

  async getConstituency(id: string): Promise<Constituency | null> {
    const [existing] = await db.select().from(constituencies).where(eq(constituencies.id, id));
    return existing || null;
  }

  async getWard(id: string): Promise<Ward | null> {
    const [existing] = await db.select().from(wards).where(eq(wards.id, id));
    return existing || null;
  }

  async getCentre(id: string): Promise<Centre | null> {
    const [existing] = await db.select().from(centres).where(eq(centres.id, id));
    return existing || null;
  }

  async upsertConstituency(constituency: InsertConstituency): Promise<Constituency> {
    const [existing] = await db.select().from(constituencies).where(eq(constituencies.id, constituency.id));
    
    if (existing) {
      const [updated] = await db
        .update(constituencies)
        .set({ ...constituency, updatedAt: new Date() })
        .where(eq(constituencies.id, constituency.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(constituencies).values(constituency).returning();
      return created;
    }
  }

  async upsertWard(ward: InsertWard): Promise<Ward> {
    const [existing] = await db.select().from(wards).where(eq(wards.id, ward.id));
    
    if (existing) {
      const [updated] = await db
        .update(wards)
        .set({ ...ward, updatedAt: new Date() })
        .where(eq(wards.id, ward.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(wards).values(ward).returning();
      return created;
    }
  }

  async upsertCentre(centre: InsertCentre): Promise<Centre> {
    const [existing] = await db.select().from(centres).where(eq(centres.id, centre.id));
    
    if (existing) {
      const [updated] = await db
        .update(centres)
        .set({ ...centre, updatedAt: new Date() })
        .where(eq(centres.id, centre.id))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(centres).values(centre).returning();
      return created;
    }
  }

  // Enhanced result operations
  async getAllResultsWithDetails(): Promise<ResultWithRelations[]> {
    return await db.query.results.findMany({
      with: {
        pollingCenter: true,
        submitter: true,
        verifier: true,
        files: true
      }
    });
  }
}

export const storage = new DatabaseStorage();
