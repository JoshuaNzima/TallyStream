-- Seed data for PTC Election System D1 Database

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (id, email, name, role, passwordHash, phoneNumber) VALUES 
(1, 'admin@election.gov', 'System Administrator', 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '+265991234567');

-- Insert political parties
INSERT OR IGNORE INTO political_parties (id, name, abbreviation, color) VALUES 
(1, 'Malawi Congress Party', 'MCP', '#FF0000'),
(2, 'Democratic Progressive Party', 'DPP', '#0066CC'),
(3, 'United Transformation Movement', 'UTM', '#FFD700'),
(4, 'Alliance for Democracy', 'AFORD', '#008000'),
(5, 'Peoples Party', 'PP', '#FFA500'),
(6, 'United Democratic Front', 'UDF', '#800080');

-- Insert sample candidates for Presidential election
INSERT OR IGNORE INTO candidates (id, name, position, politicalPartyId) VALUES 
(1, 'Lazarus Chakwera', 'president', 1),
(2, 'Peter Mutharika', 'president', 2),
(3, 'Saulos Chilima', 'president', 3),
(4, 'Enoch Chihana', 'president', 4);

-- Insert sample MP candidates
INSERT OR IGNORE INTO candidates (id, name, position, politicalPartyId, constituency) VALUES 
(5, 'John Banda', 'mp', 1, 'Lilongwe Central'),
(6, 'Mary Phiri', 'mp', 2, 'Lilongwe Central'),
(7, 'James Mwale', 'mp', 3, 'Blantyre City'),
(8, 'Grace Tembo', 'mp', 4, 'Blantyre City');

-- Insert sample Councilor candidates
INSERT OR IGNORE INTO candidates (id, name, position, politicalPartyId, constituency, ward) VALUES 
(9, 'Peter Kamanga', 'councilor', 1, 'Lilongwe Central', 'Area 3'),
(10, 'Susan Nyirenda', 'councilor', 2, 'Lilongwe Central', 'Area 3'),
(11, 'David Lungu', 'councilor', 3, 'Blantyre City', 'Limbe'),
(12, 'Ruth Mkandawire', 'councilor', 4, 'Blantyre City', 'Limbe');

-- Insert sample polling centers
INSERT OR IGNORE INTO polling_centers (id, name, code, constituency, ward, registeredVoters, location) VALUES 
(1, 'Lilongwe Primary School', 'LL001', 'Lilongwe Central', 'Area 3', 850, 'Area 3, Lilongwe'),
(2, 'Kamuzu Academy', 'LL002', 'Lilongwe Central', 'Area 47', 1200, 'Area 47, Lilongwe'),
(3, 'Blantyre Secondary School', 'BT001', 'Blantyre City', 'Limbe', 950, 'Limbe, Blantyre');

-- Insert USSD providers
INSERT OR IGNORE INTO ussd_providers (id, name, code, endpoint, isActive) VALUES 
(1, 'TNM USSD Service', '*150#', 'https://api.tnm.co.mw/ussd', 1),
(2, 'Airtel USSD Service', '*185#', 'https://api.airtel.mw/ussd', 1),
(3, 'Twilio USSD Global', '*888#', 'https://api.twilio.com/ussd', 1);

-- Insert WhatsApp providers
INSERT OR IGNORE INTO whatsapp_providers (id, name, apiKey, phoneNumber, webhookUrl, isActive) VALUES 
(1, 'WhatsApp Business API', 'demo-api-key', '+265999123456', 'https://api.whatsapp.com/webhook', 1),
(2, 'Twilio WhatsApp', 'twilio-demo-key', '+265888654321', 'https://api.twilio.com/whatsapp/webhook', 1),
(3, 'MessageBird WhatsApp', 'mb-demo-key', '+265777456789', 'https://api.messagebird.com/whatsapp/webhook', 1);

-- Insert sample supervisor user
INSERT OR IGNORE INTO users (id, email, name, role, passwordHash, phoneNumber) VALUES 
(2, 'supervisor@election.gov', 'Election Supervisor', 'supervisor', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '+265992234567');

-- Insert sample agent users
INSERT OR IGNORE INTO users (id, email, name, role, passwordHash, phoneNumber) VALUES 
(3, 'agent1@election.gov', 'Field Agent 1', 'agent', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '+265993234567'),
(4, 'agent2@election.gov', 'Field Agent 2', 'agent', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '+265994234567');