-- D1 Database Schema for PTC Election System

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'supervisor', 'agent')),
    passwordHash TEXT NOT NULL,
    phoneNumber TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Political parties table
CREATE TABLE IF NOT EXISTS political_parties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    abbreviation TEXT,
    color TEXT,
    logo TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    position TEXT NOT NULL CHECK(position IN ('president', 'mp', 'councilor')),
    politicalPartyId INTEGER,
    constituency TEXT,
    ward TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (politicalPartyId) REFERENCES political_parties(id)
);

-- Polling centers table
CREATE TABLE IF NOT EXISTS polling_centers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    constituency TEXT NOT NULL,
    ward TEXT,
    registeredVoters INTEGER NOT NULL DEFAULT 0,
    location TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Results table
CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pollingCenterId INTEGER NOT NULL,
    submittedBy INTEGER NOT NULL,
    presidentialVotes TEXT, -- JSON array of votes per candidate
    mpVotes TEXT, -- JSON array of votes per candidate
    councilorVotes TEXT, -- JSON array of votes per candidate
    invalidVotes INTEGER NOT NULL DEFAULT 0,
    documents TEXT, -- JSON array of document file names
    submittedAt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'rejected', 'flagged')),
    reviewedBy INTEGER,
    reviewedAt TEXT,
    notes TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pollingCenterId) REFERENCES polling_centers(id),
    FOREIGN KEY (submittedBy) REFERENCES users(id),
    FOREIGN KEY (reviewedBy) REFERENCES users(id)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    action TEXT NOT NULL,
    tableName TEXT NOT NULL,
    recordId INTEGER,
    oldValues TEXT, -- JSON
    newValues TEXT, -- JSON
    ipAddress TEXT,
    userAgent TEXT,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (userId) REFERENCES users(id)
);

-- USSD providers table
CREATE TABLE IF NOT EXISTS ussd_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    isActive INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- WhatsApp providers table
CREATE TABLE IF NOT EXISTS whatsapp_providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    apiKey TEXT NOT NULL,
    phoneNumber TEXT NOT NULL,
    webhookUrl TEXT,
    isActive INTEGER NOT NULL DEFAULT 1,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_results_polling_center ON results(pollingCenterId);
CREATE INDEX IF NOT EXISTS idx_results_submitted_by ON results(submittedBy);
CREATE INDEX IF NOT EXISTS idx_results_status ON results(status);
CREATE INDEX IF NOT EXISTS idx_results_submitted_at ON results(submittedAt);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(userId);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(createdAt);
CREATE INDEX IF NOT EXISTS idx_candidates_position ON candidates(position);
CREATE INDEX IF NOT EXISTS idx_candidates_party ON candidates(politicalPartyId);