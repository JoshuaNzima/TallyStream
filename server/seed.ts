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
      
      // Set admin role
      await storage.updateUserRole(adminUser.id, "admin");
      console.log("✓ Created default admin user: admin@ptcsystem.com / admin123!");
    } else {
      console.log("✓ Admin user already exists");
    }

    // Check if candidates already exist
    const existingCandidates = await storage.getCandidates();
    
    if (existingCandidates.length === 0) {
      // Create default candidates
      await storage.createCandidate({
        name: "John Presidential",
        party: "Democratic Progressive Party (DPP)",
        position: "President",
      });

      await storage.createCandidate({
        name: "Mary National",
        party: "People's Liberation Party (PLP)",
        position: "President",
      });

      await storage.createCandidate({
        name: "Samuel Unity",
        party: "Unity Development Alliance (UDA)",
        position: "President",
      });

      console.log("✓ Created default presidential candidates");
    } else {
      console.log("✓ Candidates already exist");
    }

    // Check if polling centers exist
    const existingCenters = await storage.getPollingCenters();
    
    if (existingCenters.length === 0) {
      // Create sample polling centers
      await storage.createPollingCenter({
        code: "PC001",
        name: "Central Primary School",
        constituency: "Lagos Central",
        district: "Lagos Island",
        state: "Lagos",
        registeredVoters: 1250,
      });

      await storage.createPollingCenter({
        code: "PC002", 
        name: "Community Hall Ikeja",
        constituency: "Ikeja Federal",
        district: "Ikeja",
        state: "Lagos",
        registeredVoters: 980,
      });

      await storage.createPollingCenter({
        code: "PC003",
        name: "St. Mary's Secondary School",
        constituency: "Surulere East",
        district: "Surulere",
        state: "Lagos",
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