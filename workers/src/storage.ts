import type { Env } from './index';

// Storage interface adapted for Cloudflare Workers
export interface WorkersStorage {
  // User methods
  getUserByEmail(email: string): Promise<any>;
  getUserById(id: number): Promise<any>;
  createUser(userData: any): Promise<any>;

  // Results methods
  getAllResults(): Promise<any[]>;
  createResult(resultData: any): Promise<any>;
  getResultById(id: number): Promise<any>;
  updateResultStatus(id: number, status: string, reviewedBy?: number): Promise<any>;

  // Analytics methods
  getStats(): Promise<any>;
  getRecentSubmissions(limit: number): Promise<any[]>;
  getPendingVerifications(): Promise<any[]>;
  getTopPerformingCenters(limit: number): Promise<any[]>;
  getHourlySubmissionTrends(): Promise<any[]>;
  getPartyPerformanceData(): Promise<any[]>;

  // Master data methods
  getAllPollingCenters(): Promise<any[]>;
  getAllCandidates(): Promise<any[]>;
  getAllPoliticalParties(): Promise<any[]>;
  getAllUssdProviders(): Promise<any[]>;
  getAllWhatsappProviders(): Promise<any[]>;
}

export function setupStorage(env: Env): WorkersStorage {
  // If using D1 database (SQLite)
  if (env.DB) {
    return new D1Storage(env.DB);
  }
  
  // If using external PostgreSQL (would require connection pooling)
  if (env.DATABASE_URL) {
    return new PostgreSQLStorage(env.DATABASE_URL);
  }
  
  throw new Error('No database configuration found');
}

// D1 (SQLite) storage implementation
class D1Storage implements WorkersStorage {
  constructor(private db: D1Database) {}

  async getUserByEmail(email: string) {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .bind(email)
      .first();
    return result;
  }

  async getUserById(id: number) {
    const result = await this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first();
    return result;
  }

  async createUser(userData: any) {
    const result = await this.db
      .prepare('INSERT INTO users (email, name, role, passwordHash, phoneNumber, createdAt) VALUES (?, ?, ?, ?, ?, ?) RETURNING *')
      .bind(userData.email, userData.name, userData.role, userData.passwordHash, userData.phoneNumber, new Date().toISOString())
      .first();
    return result;
  }

  async getAllResults() {
    const results = await this.db
      .prepare('SELECT * FROM results ORDER BY submittedAt DESC')
      .all();
    return results.results || [];
  }

  async createResult(resultData: any) {
    const result = await this.db
      .prepare(`
        INSERT INTO results (
          pollingCenterId, submittedBy, presidentialVotes, mpVotes, 
          councilorVotes, invalidVotes, documents, submittedAt, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
      `)
      .bind(
        resultData.pollingCenterId,
        resultData.submittedBy,
        JSON.stringify(resultData.presidentialVotes),
        JSON.stringify(resultData.mpVotes),
        JSON.stringify(resultData.councilorVotes),
        resultData.invalidVotes,
        JSON.stringify(resultData.documents),
        resultData.submittedAt,
        'pending'
      )
      .first();
    return result;
  }

  async getResultById(id: number) {
    const result = await this.db
      .prepare('SELECT * FROM results WHERE id = ?')
      .bind(id)
      .first();
    return result;
  }

  async updateResultStatus(id: number, status: string, reviewedBy?: number) {
    const result = await this.db
      .prepare('UPDATE results SET status = ?, reviewedBy = ?, reviewedAt = ? WHERE id = ? RETURNING *')
      .bind(status, reviewedBy, new Date().toISOString(), id)
      .first();
    return result;
  }

  async getStats() {
    // Get basic statistics
    const totalCenters = await this.db
      .prepare('SELECT COUNT(*) as count FROM polling_centers')
      .first();
    
    const resultsReceived = await this.db
      .prepare('SELECT COUNT(*) as count FROM results')
      .first();
    
    const verifiedResults = await this.db
      .prepare('SELECT COUNT(*) as count FROM results WHERE status = ?')
      .bind('verified')
      .first();
    
    const pendingResults = await this.db
      .prepare('SELECT COUNT(*) as count FROM results WHERE status = ?')
      .bind('pending')
      .first();

    return {
      totalCenters: totalCenters?.count || 0,
      resultsReceived: resultsReceived?.count || 0,
      verificationRate: verifiedResults?.count || 0,
      pendingReview: pendingResults?.count || 0,
    };
  }

  async getRecentSubmissions(limit: number) {
    const results = await this.db
      .prepare(`
        SELECT r.*, p.name as pollingCenterName, u.name as submitterName
        FROM results r
        LEFT JOIN polling_centers p ON r.pollingCenterId = p.id
        LEFT JOIN users u ON r.submittedBy = u.id
        ORDER BY r.submittedAt DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();
    return results.results || [];
  }

  async getPendingVerifications() {
    const results = await this.db
      .prepare('SELECT * FROM results WHERE status = ?')
      .bind('pending')
      .all();
    return results.results || [];
  }

  async getTopPerformingCenters(limit: number) {
    const results = await this.db
      .prepare(`
        SELECT p.name, p.registeredVoters, COUNT(r.id) as submissionCount
        FROM polling_centers p
        LEFT JOIN results r ON p.id = r.pollingCenterId
        GROUP BY p.id
        ORDER BY submissionCount DESC
        LIMIT ?
      `)
      .bind(limit)
      .all();
    return results.results || [];
  }

  async getHourlySubmissionTrends() {
    // This would need to be adapted based on your specific needs
    return [];
  }

  async getPartyPerformanceData() {
    // This would aggregate votes by party across all results
    return [];
  }

  async getAllPollingCenters() {
    const results = await this.db
      .prepare('SELECT * FROM polling_centers ORDER BY name')
      .all();
    return results.results || [];
  }

  async getAllCandidates() {
    const results = await this.db
      .prepare('SELECT * FROM candidates ORDER BY name')
      .all();
    return results.results || [];
  }

  async getAllPoliticalParties() {
    const results = await this.db
      .prepare('SELECT * FROM political_parties ORDER BY name')
      .all();
    return results.results || [];
  }

  async getAllUssdProviders() {
    const results = await this.db
      .prepare('SELECT * FROM ussd_providers ORDER BY name')
      .all();
    return results.results || [];
  }

  async getAllWhatsappProviders() {
    const results = await this.db
      .prepare('SELECT * FROM whatsapp_providers ORDER BY name')
      .all();
    return results.results || [];
  }
}

// PostgreSQL storage implementation (for external database)
class PostgreSQLStorage implements WorkersStorage {
  constructor(private connectionString: string) {}

  // This would implement PostgreSQL queries using a connection pooling service
  // like Neon, Supabase, or PlanetScale for Cloudflare Workers
  async getUserByEmail(email: string) {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getUserById(id: number) {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async createUser(userData: any) {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getAllResults() {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async createResult(resultData: any) {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getResultById(id: number) {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async updateResultStatus(id: number, status: string, reviewedBy?: number) {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getStats() {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getRecentSubmissions(limit: number) {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getPendingVerifications() {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getTopPerformingCenters(limit: number) {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getHourlySubmissionTrends() {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getPartyPerformanceData() {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getAllPollingCenters() {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getAllCandidates() {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getAllPoliticalParties() {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getAllUssdProviders() {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }

  async getAllWhatsappProviders() {
    throw new Error('PostgreSQL storage not implemented yet - use D1 for now');
  }
}