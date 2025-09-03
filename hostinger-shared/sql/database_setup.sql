-- PTC Election Management System Database Setup
-- MySQL/MariaDB Schema for Hostinger Shared Hosting

SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'NO_AUTO_VALUE_ON_ZERO';
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

-- --------------------------------------------------------

-- Table structure for table `users`
CREATE TABLE `users` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `email` varchar(255) DEFAULT NULL UNIQUE,
  `phone` varchar(20) DEFAULT NULL UNIQUE,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `profile_image_url` varchar(500) DEFAULT NULL,
  `role` enum('agent','supervisor','admin','reviewer') NOT NULL DEFAULT 'agent',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `phone_verified` tinyint(1) NOT NULL DEFAULT 0,
  `is_approved` tinyint(1) NOT NULL DEFAULT 0,
  `last_login_at` timestamp NULL DEFAULT NULL,
  `registration_channel` enum('whatsapp','portal','ussd','both') DEFAULT 'portal',
  `current_session_id` varchar(128) DEFAULT NULL,
  `session_expiry` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `political_parties`
CREATE TABLE `political_parties` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `name` varchar(255) NOT NULL,
  `abbreviation` varchar(10) DEFAULT NULL,
  `color` varchar(7) DEFAULT '#000000',
  `logo_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `constituencies`
CREATE TABLE `constituencies` (
  `id` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `code` varchar(20) NOT NULL UNIQUE,
  `district` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `total_voters` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `wards`
CREATE TABLE `wards` (
  `id` varchar(10) NOT NULL,
  `name` varchar(255) NOT NULL,
  `constituency_id` varchar(10) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `polling_centers`
CREATE TABLE `polling_centers` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `name` varchar(255) NOT NULL,
  `code` varchar(20) NOT NULL UNIQUE,
  `constituency_id` varchar(10) DEFAULT NULL,
  `ward_id` varchar(10) DEFAULT NULL,
  `district` varchar(100) NOT NULL,
  `state` varchar(100) NOT NULL,
  `registered_voters` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `candidates`
CREATE TABLE `candidates` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `name` varchar(255) NOT NULL,
  `political_party_id` varchar(36) NOT NULL,
  `category` enum('president','mp','councilor') NOT NULL,
  `constituency_id` varchar(10) DEFAULT NULL,
  `ward_id` varchar(10) DEFAULT NULL,
  `candidate_number` int(11) NOT NULL,
  `photo_url` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `results`
CREATE TABLE `results` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `polling_center_id` varchar(36) NOT NULL,
  `submitted_by` varchar(36) NOT NULL,
  `verified_by` varchar(36) DEFAULT NULL,
  `status` enum('pending','verified','flagged','rejected') NOT NULL DEFAULT 'pending',
  `flagged_reason` text DEFAULT NULL,
  `submission_channel` enum('whatsapp','portal','ussd','both') NOT NULL DEFAULT 'portal',
  `presidential_votes` json DEFAULT NULL,
  `mp_votes` json DEFAULT NULL,
  `councilor_votes` json DEFAULT NULL,
  `invalid_votes` int(11) NOT NULL DEFAULT 0,
  `total_votes_cast` int(11) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `result_files`
CREATE TABLE `result_files` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `result_id` varchar(36) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_size` bigint(20) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_type` enum('tally_sheet','photo','document','other') NOT NULL DEFAULT 'document',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `ussd_providers`
CREATE TABLE `ussd_providers` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `configuration` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `whatsapp_providers`
CREATE TABLE `whatsapp_providers` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `name` varchar(100) NOT NULL,
  `type` varchar(50) NOT NULL,
  `configuration` json DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Table structure for table `audit_logs`
CREATE TABLE `audit_logs` (
  `id` varchar(36) NOT NULL DEFAULT (UUID()),
  `user_id` varchar(36) NOT NULL,
  `action` varchar(50) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(36) NOT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

-- Primary Keys
ALTER TABLE `users` ADD PRIMARY KEY (`id`);
ALTER TABLE `political_parties` ADD PRIMARY KEY (`id`);
ALTER TABLE `constituencies` ADD PRIMARY KEY (`id`);
ALTER TABLE `wards` ADD PRIMARY KEY (`id`);
ALTER TABLE `polling_centers` ADD PRIMARY KEY (`id`);
ALTER TABLE `candidates` ADD PRIMARY KEY (`id`);
ALTER TABLE `results` ADD PRIMARY KEY (`id`);
ALTER TABLE `result_files` ADD PRIMARY KEY (`id`);
ALTER TABLE `ussd_providers` ADD PRIMARY KEY (`id`);
ALTER TABLE `whatsapp_providers` ADD PRIMARY KEY (`id`);
ALTER TABLE `audit_logs` ADD PRIMARY KEY (`id`);

-- --------------------------------------------------------

-- Indexes for better performance
ALTER TABLE `users` ADD INDEX `idx_email` (`email`);
ALTER TABLE `users` ADD INDEX `idx_phone` (`phone`);
ALTER TABLE `users` ADD INDEX `idx_role` (`role`);
ALTER TABLE `results` ADD INDEX `idx_status` (`status`);
ALTER TABLE `results` ADD INDEX `idx_polling_center` (`polling_center_id`);
ALTER TABLE `results` ADD INDEX `idx_submitted_by` (`submitted_by`);
ALTER TABLE `candidates` ADD INDEX `idx_category` (`category`);
ALTER TABLE `candidates` ADD INDEX `idx_party` (`political_party_id`);
ALTER TABLE `audit_logs` ADD INDEX `idx_user_action` (`user_id`, `action`);
ALTER TABLE `audit_logs` ADD INDEX `idx_created_at` (`created_at`);

-- --------------------------------------------------------

-- Foreign Key Constraints
ALTER TABLE `wards` ADD FOREIGN KEY (`constituency_id`) REFERENCES `constituencies` (`id`) ON DELETE CASCADE;
ALTER TABLE `polling_centers` ADD FOREIGN KEY (`constituency_id`) REFERENCES `constituencies` (`id`) ON DELETE SET NULL;
ALTER TABLE `polling_centers` ADD FOREIGN KEY (`ward_id`) REFERENCES `wards` (`id`) ON DELETE SET NULL;
ALTER TABLE `candidates` ADD FOREIGN KEY (`political_party_id`) REFERENCES `political_parties` (`id`) ON DELETE CASCADE;
ALTER TABLE `candidates` ADD FOREIGN KEY (`constituency_id`) REFERENCES `constituencies` (`id`) ON DELETE SET NULL;
ALTER TABLE `candidates` ADD FOREIGN KEY (`ward_id`) REFERENCES `wards` (`id`) ON DELETE SET NULL;
ALTER TABLE `results` ADD FOREIGN KEY (`polling_center_id`) REFERENCES `polling_centers` (`id`) ON DELETE CASCADE;
ALTER TABLE `results` ADD FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;
ALTER TABLE `results` ADD FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
ALTER TABLE `result_files` ADD FOREIGN KEY (`result_id`) REFERENCES `results` (`id`) ON DELETE CASCADE;
ALTER TABLE `audit_logs` ADD FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;