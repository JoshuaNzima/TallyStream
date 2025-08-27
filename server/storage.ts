import {
  users,
  pollingCenters,
  candidates,
  results,
  resultFiles,
  auditLogs,
  type User,
  type UpsertUser,
  type PollingCenter,
  type InsertPollingCenter,
  type Candidate,
  type InsertCandidate,
  type Result,
  type InsertResult,
  type ResultWithRelations,
  type ResultFile,
  type InsertResultFile,
  type AuditLog,
  type InsertAuditLog,
  type UserRole,
  type ResultStatus,
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
  
  // Polling center operations
  getPollingCenters(): Promise<PollingCenter[]>;
  getPollingCenter(id: string): Promise<PollingCenter | undefined>;
  createPollingCenter(center: InsertPollingCenter): Promise<PollingCenter>;
  
  // Candidate operations
  getCandidates(): Promise<Candidate[]>;
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  
  // Result operations
  getResults(): Promise<ResultWithRelations[]>;
  getResultsByStatus(status: ResultStatus): Promise<ResultWithRelations[]>;
  getResultsByPollingCenter(pollingCenterId: string): Promise<ResultWithRelations[]>;
  createResult(result: InsertResult): Promise<Result>;
  updateResultStatus(resultId: string, status: ResultStatus, verifiedBy?: string, flaggedReason?: string): Promise<Result>;
  
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
  
  // Audit operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
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
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Polling center operations
  async getPollingCenters(): Promise<PollingCenter[]> {
    return await db.select().from(pollingCenters).where(eq(pollingCenters.isActive, true));
  }

  async getPollingCenter(id: string): Promise<PollingCenter | undefined> {
    const [center] = await db.select().from(pollingCenters).where(eq(pollingCenters.id, id));
    return center;
  }

  async createPollingCenter(center: InsertPollingCenter): Promise<PollingCenter> {
    const [newCenter] = await db.insert(pollingCenters).values(center).returning();
    return newCenter;
  }

  // Candidate operations
  async getCandidates(): Promise<Candidate[]> {
    return await db.select().from(candidates).where(eq(candidates.isActive, true));
  }

  async createCandidate(candidate: InsertCandidate): Promise<Candidate> {
    const [newCandidate] = await db.insert(candidates).values(candidate).returning();
    return newCandidate;
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
    const totalVotes = result.candidateAVotes + result.candidateBVotes + result.candidateCVotes + result.invalidVotes;
    const [newResult] = await db
      .insert(results)
      .values({ ...result, totalVotes })
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
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }

  // Analytics operations for real-time dashboard
  async getRecentSubmissions(limit: number): Promise<ResultWithRelations[]> {
    return await db.select()
      .from(results)
      .leftJoin(pollingCenters, eq(results.pollingCenterId, pollingCenters.id))
      .leftJoin(users, eq(results.submittedBy, users.id))
      .orderBy(desc(results.createdAt))
      .limit(limit) as any[];
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
}

export const storage = new DatabaseStorage();
