import { storage } from "./storage";
import { hashPassword } from "./auth";

export async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Check if admin user already exists
    const existingAdmin = await storage.getUserByIdentifier("admin@ptcsystem.com");
    
    if (!existingAdmin) {
      // Create default admin user
      const adminPasswordHash = await hashPassword("admin123!");
      
      const adminUser = await storage.createUser({
        email: "admin@ptcsystem.com",
        firstName: "System",
        lastName: "Administrator",
        passwordHash: adminPasswordHash,
      });
      
      // Set admin role and approve user
      await storage.updateUserRole(adminUser.id, "admin");
      await storage.approveUser(adminUser.id);
      console.log("✓ Created default admin user: admin@ptcsystem.com / admin123!");
    } else {
      console.log("✓ Admin user already exists");
    }

    // Check if candidates already exist
    const existingCandidates = await storage.getCandidates();
    
    if (existingCandidates.length === 0) {
      // Create presidential candidates
      await storage.createCandidate({
        name: "John Presidential",
        party: "Democratic Progressive Party (DPP)",
        category: "president",
      });

      await storage.createCandidate({
        name: "Mary National", 
        party: "People's Liberation Party (PLP)",
        category: "president",
      });

      await storage.createCandidate({
        name: "Samuel Unity",
        party: "Unity Development Alliance (UDA)", 
        category: "president",
      });

      // Create MP candidates
      await storage.createCandidate({
        name: "David Mchazime",
        party: "Malawi Congress Party (MCP)",
        category: "mp",
        constituency: "Lilongwe City Centre",
      });

      await storage.createCandidate({
        name: "Sarah Banda",
        party: "Democratic Progressive Party (DPP)",
        category: "mp",
        constituency: "Lilongwe City Centre", 
      });

      await storage.createCandidate({
        name: "Michael Phiri",
        party: "United Democratic Front (UDF)",
        category: "mp",
        constituency: "Blantyre City South",
      });

      // Create Councilor candidates
      await storage.createCandidate({
        name: "Grace Mwale",
        party: "Malawi Congress Party (MCP)", 
        category: "councilor",
        constituency: "Lilongwe Ward 1",
      });

      await storage.createCandidate({
        name: "Peter Kachali",
        party: "Democratic Progressive Party (DPP)",
        category: "councilor",
        constituency: "Blantyre Ward 2",
      });

      await storage.createCandidate({
        name: "Ruth Ngwira",
        party: "United Democratic Front (UDF)",
        category: "councilor", 
        constituency: "Mzuzu Ward 3",
      });

      console.log("✓ Created candidates for President, MP, and Councilor positions");
    } else {
      console.log("✓ Candidates already exist");
    }

    // Check if polling centers exist
    const existingCenters = await storage.getPollingCenters();
    
    if (existingCenters.length === 0) {
      // Create sample polling centers
      await storage.createPollingCenter({
        code: "PC001",
        name: "Lilongwe Primary School",
        constituency: "Lilongwe City Centre",
        district: "Lilongwe",
        state: "Central Region",
        registeredVoters: 1250,
      });

      await storage.createPollingCenter({
        code: "PC002", 
        name: "Blantyre Community Hall",
        constituency: "Blantyre City South",
        district: "Blantyre",
        state: "Southern Region",
        registeredVoters: 980,
      });

      await storage.createPollingCenter({
        code: "PC003",
        name: "Mzuzu Secondary School",
        constituency: "Mzuzu City",
        district: "Mzuzu",
        state: "Northern Region",
        registeredVoters: 1450,
      });

      console.log("✓ Created sample polling centers");
    } else {
      console.log("✓ Polling centers already exist");
    }

    console.log("🎉 Database seeding completed successfully!");
    
    return {
      success: true,
      message: "Database seeded successfully",
      adminCredentials: {
        email: "admin@ptcsystem.com",
        password: "admin123!"
      }
    };
    
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    throw error;
  }
}

// Auto-seed if this file is run directly
if (process.argv[1].includes('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}