-- PTC Election Management System - Sample Data
-- Insert default admin user and sample data

-- Insert default admin user
INSERT INTO `users` (`id`, `email`, `first_name`, `last_name`, `password_hash`, `role`, `is_active`, `is_approved`, `email_verified`) 
VALUES 
(UUID(), 'admin@ptcsystem.com', 'System', 'Administrator', '$2y$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 1, 1, 1);
-- Default password: admin123!

-- Insert sample political parties
INSERT INTO `political_parties` (`id`, `name`, `abbreviation`, `color`) VALUES
(UUID(), 'Democratic Progressive Party', 'DPP', '#FF0000'),
(UUID(), 'Malawi Congress Party', 'MCP', '#0000FF'),
(UUID(), 'United Transformation Movement', 'UTM', '#FFFF00'),
(UUID(), 'Alliance for Democracy', 'AFORD', '#00FF00'),
(UUID(), 'United Democratic Front', 'UDF', '#FF00FF');

-- Insert sample USSD providers
INSERT INTO `ussd_providers` (`id`, `name`, `type`, `configuration`, `is_active`) VALUES
(UUID(), 'Twilio USSD Global', 'twilio', '{"description": "Global USSD service via Twilio", "supportedCountries": ["Global"], "webhookUrl": "", "features": ["SMS", "USSD", "Voice"]}', 1),
(UUID(), 'TNM Malawi USSD', 'tnm', '{"description": "Telekom Networks Malawi USSD service", "supportedCountries": ["Malawi"], "shortCode": "*123#", "features": ["USSD", "SMS"]}', 1),
(UUID(), 'Airtel Africa USSD', 'airtel', '{"description": "Airtel Africa USSD service", "supportedCountries": ["Malawi", "Zambia", "Kenya"], "shortCode": "*456#", "features": ["USSD", "SMS", "Mobile Money"]}', 1);

-- Insert sample WhatsApp providers  
INSERT INTO `whatsapp_providers` (`id`, `name`, `type`, `configuration`, `is_primary`, `is_active`) VALUES
(UUID(), 'Meta WhatsApp Business', 'meta', '{"description": "Official Meta WhatsApp Business Platform", "features": ["Messaging", "Media", "Templates", "Webhooks"], "pricing": "Pay per conversation"}', 1, 1),
(UUID(), 'Twilio WhatsApp API', 'twilio', '{"description": "WhatsApp Business via Twilio", "features": ["Messaging", "Media", "Templates"], "pricing": "Pay per message"}', 0, 1);