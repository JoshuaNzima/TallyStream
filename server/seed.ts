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

    // Check if political parties already exist
    const existingParties = await storage.getPoliticalParties();
    
    if (existingParties.length === 0) {
      await storage.createPoliticalParty({
        name: "Democratic Progressive Party (DPP)",
        abbreviation: "DPP",
        color: "#1D4ED8", 
        description: "Progressive political party focused on democratic values and development"
      });

      await storage.createPoliticalParty({
        name: "People's Party (PP)",
        abbreviation: "PP",
        color: "#DC2626",
        description: "Liberation movement focused on social justice and equality"
      });

      await storage.createPoliticalParty({
        name: "Unity Development Alliance (UDA)",
        abbreviation: "UDA",
        color: "#059669",
        description: "Alliance promoting national unity and development"
      });

      await storage.createPoliticalParty({
        name: "Malawi Congress Party (MCP)",
        abbreviation: "MCP",
        color: "#7C3AED",
        description: "Malawi's oldest political party with focus on national development"
      });

      await storage.createPoliticalParty({
        name: "United Democratic Front (UDF)",
        abbreviation: "UDF",
        color: "#EA580C",
        description: "Democratic front promoting multiparty governance"
      });

      console.log("✓ Created political parties");
    } else {
      console.log("✓ Political parties already exist");
    }

    // Check if candidates already exist
    const existingCandidates = await storage.getCandidates();
    
    if (existingCandidates.data.length === 0) {
      // Get parties for candidate seeding
      const parties = await storage.getPoliticalParties();
      const dppParty = parties.find(p => p.abbreviation === "DPP");
      const ppParty = parties.find(p => p.abbreviation === "PP");
      const udaParty = parties.find(p => p.abbreviation === "UDA");
      const mcpParty = parties.find(p => p.abbreviation === "MCP");
      const udfParty = parties.find(p => p.abbreviation === "UDF");
      // Create presidential candidates
      await storage.createCandidate({
        name: "John Presidential",
        abbreviation: "JP",
        party: "Democratic Progressive Party (DPP)",
        partyId: dppParty?.id,
        category: "president",
      });

      await storage.createCandidate({
        name: "Joyce Banda", 
        abbreviation: "JB",
        party: "People's Party (PP)",
        partyId: ppParty?.id,
        category: "president",
      });

      await storage.createCandidate({
        name: "Samuel Unity",
        abbreviation: "SU",
        party: "Unity Development Alliance (UDA)",
        partyId: udaParty?.id, 
        category: "president",
      });

      // Create MP candidates
      await storage.createCandidate({
        name: "David Mchazime",
        abbreviation: "DM",
        party: "Malawi Congress Party (MCP)",
        partyId: mcpParty?.id,
        category: "mp",
        constituency: "Lilongwe City Centre",
      });

      await storage.createCandidate({
        name: "Sarah Banda",
        abbreviation: "SB",
        party: "Democratic Progressive Party (DPP)",
        partyId: dppParty?.id,
        category: "mp",
        constituency: "Lilongwe City Centre", 
      });

      await storage.createCandidate({
        name: "Michael Phiri",
        abbreviation: "MP",
        party: "United Democratic Front (UDF)",
        partyId: udfParty?.id,
        category: "mp",
        constituency: "Blantyre City South",
      });

      // Create Councilor candidates
      await storage.createCandidate({
        name: "Grace Mwale",
        abbreviation: "GM",
        party: "Malawi Congress Party (MCP)",
        partyId: mcpParty?.id, 
        category: "councilor",
        constituency: "Lilongwe Ward 1",
      });

      await storage.createCandidate({
        name: "Peter Kachali",
        abbreviation: "PK",
        party: "Democratic Progressive Party (DPP)",
        partyId: dppParty?.id,
        category: "councilor",
        constituency: "Blantyre Ward 2",
      });

      await storage.createCandidate({
        name: "Ruth Ngwira",
        abbreviation: "RN",
        party: "United Democratic Front (UDF)",
        partyId: udfParty?.id,
        category: "councilor", 
        constituency: "Mzuzu Ward 3",
      });

      console.log("✓ Created candidates for President, MP, and Councilor positions");
    } else {
      console.log("✓ Candidates already exist");
    }

    // Check if polling centers exist
    const existingCenters = await storage.getPollingCenters();
    
    if (existingCenters.data.length === 0) {
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

    // Check if USSD providers already exist
    const existingProviders = await storage.getUssdProviders();
    
    if (existingProviders.length === 0) {
      // Create Twilio USSD provider
      await storage.createUssdProvider({
        name: "Twilio",
        type: "twilio",
        configuration: {
          webhookUrl: "/api/ussd/twilio",
          description: "Twilio USSD service for global reach",
          supportedCountries: ["US", "UK", "MW", "KE", "TZ"],
          responseFormat: "plain_text",
          sessionTimeout: 600
        }
      });

      // Create Africa's Talking USSD provider
      await storage.createUssdProvider({
        name: "Africa's Talking",
        type: "africas_talking",
        configuration: {
          webhookUrl: "/api/ussd/africas-talking",
          description: "Africa's Talking USSD service for African markets",
          supportedCountries: ["KE", "TZ", "UG", "MW", "RW", "BF"],
          responseFormat: "CON/END",
          sessionTimeout: 180
        }
      });

      // Create Infobip USSD provider (expanded to Malawi 2023)
      await storage.createUssdProvider({
        name: "Infobip",
        type: "infobip",
        configuration: {
          webhookUrl: "/api/ussd/infobip",
          description: "Infobip enterprise USSD platform with Malawi coverage",
          supportedCountries: ["MW", "KE", "NA", "ZM", "ZW"],
          responseFormat: "json",
          sessionTimeout: 300,
          features: ["shortcode_registration", "enterprise_platform"]
        }
      });

      // Create HelloDuty USSD provider (Malawi-specific)
      await storage.createUssdProvider({
        name: "HelloDuty",
        type: "helloduty",
        configuration: {
          webhookUrl: "/api/ussd/helloduty",
          description: "HelloDuty USSD services with Malawi-specific pricing",
          supportedCountries: ["MW"],
          responseFormat: "session_based",
          sessionTimeout: 240,
          features: ["malawi_pricing", "whatsapp_integration", "sms_integration"]
        }
      });

      // Create Telerivet USSD provider (visual development tools)
      await storage.createUssdProvider({
        name: "Telerivet",
        type: "telerivet",
        configuration: {
          webhookUrl: "/api/ussd/telerivet",
          description: "Telerivet USSD API with visual development tools for 20+ African countries",
          supportedCountries: ["MW", "KE", "TZ", "UG", "ZM", "ZW", "BW", "MZ"],
          responseFormat: "json_api",
          sessionTimeout: 180,
          features: ["visual_development", "no_code_tools", "javascript_support"]
        }
      });

      // Create TNM Direct USSD provider (Telekom Networks Malawi)
      await storage.createUssdProvider({
        name: "TNM Direct",
        type: "tnm_direct",
        configuration: {
          webhookUrl: "/api/ussd/tnm",
          description: "Direct integration with Telekom Networks Malawi (oldest telecom in Malawi)",
          supportedCountries: ["MW"],
          responseFormat: "laravel_php",
          sessionTimeout: 300,
          features: ["mno_direct", "4m_customers", "90_percent_coverage", "laravel_adapter"]
        }
      });

      console.log("✓ Created USSD providers");
    } else {
      console.log("✓ USSD providers already exist");
    }

    // Check if WhatsApp providers already exist
    const existingWhatsappProviders = await storage.getWhatsappProviders();
    
    if (existingWhatsappProviders.length === 0) {
      // Create Meta WhatsApp Business API provider (set as primary)
      await storage.createWhatsappProvider({
        name: "Meta WhatsApp Business API",
        type: "meta",
        isPrimary: true,
        configuration: {
          webhookUrl: "/api/whatsapp/webhook",
          description: "Official Meta WhatsApp Business Platform API",
          apiVersion: "v19.0",
          features: ["business_messaging", "media_upload", "webhooks", "templates"],
          supportedCountries: ["global"],
          pricing: "conversation_based"
        }
      });

      // Create Wati provider
      await storage.createWhatsappProvider({
        name: "Wati",
        type: "wati",
        configuration: {
          webhookUrl: "/api/whatsapp/wati",
          description: "Wati WhatsApp Business API - Small-medium business focused",
          apiVersion: "v1",
          features: ["broadcasting", "automation_workflows", "chatbots", "crm_integrations", "analytics"],
          supportedCountries: ["global"],
          pricing: "subscription_based",
          targetMarket: "SMB"
        }
      });

      // Create Interakt provider
      await storage.createWhatsappProvider({
        name: "Interakt",
        type: "interakt",
        configuration: {
          webhookUrl: "/api/whatsapp/interakt",
          description: "Interakt multi-industry WhatsApp Business solutions",
          apiVersion: "v2",
          features: ["promotional_messages", "abandoned_cart_recovery", "hubspot_integration", "e_commerce"],
          supportedCountries: ["global"],
          pricing: "₹9,588-₹33,588/year + Meta fees",
          integrations: ["HubSpot", "Shopify", "WooCommerce"]
        }
      });

      // Create AiSensy provider
      await storage.createWhatsappProvider({
        name: "AiSensy",
        type: "aisensy",
        configuration: {
          webhookUrl: "/api/whatsapp/aisensy",
          description: "AiSensy marketing automation for WhatsApp",
          apiVersion: "v1",
          features: ["no_code_chatbot", "click_to_whatsapp_ads", "built_in_crm", "marketing_automation"],
          supportedCountries: ["global"],
          pricing: "transparent_pricing",
          speciality: "marketing_automation"
        }
      });

      // Create Twilio WhatsApp provider
      await storage.createWhatsappProvider({
        name: "Twilio WhatsApp",
        type: "twilio",
        configuration: {
          webhookUrl: "/api/whatsapp/twilio",
          description: "Twilio WhatsApp Business API for developers and enterprise",
          apiVersion: "v2",
          features: ["robust_api", "pay_as_you_use", "extensive_integrations", "global_reach"],
          supportedCountries: ["global"],
          pricing: "pay_per_message + Meta fees",
          targetMarket: "developers_enterprise"
        }
      });

      // Create Infobip WhatsApp provider
      await storage.createWhatsappProvider({
        name: "Infobip WhatsApp",
        type: "infobip",
        configuration: {
          webhookUrl: "/api/whatsapp/infobip",
          description: "Infobip enterprise WhatsApp communications platform",
          apiVersion: "v1",
          features: ["enterprise_communications", "web_interface", "media_files", "cloud_api_integration"],
          supportedCountries: ["global"],
          pricing: "enterprise_pricing",
          targetMarket: "enterprise"
        }
      });

      console.log("✓ Created WhatsApp providers");
    } else {
      console.log("✓ WhatsApp providers already exist");
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