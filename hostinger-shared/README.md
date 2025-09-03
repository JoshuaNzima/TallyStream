# PTC Election Management System - PHP Version for Hostinger

## Overview
This is a PHP-based version of the Parallel Tally Center (PTC) Election Management System, specifically designed for Hostinger shared hosting environments.

## Requirements
- PHP 7.4 or higher
- MySQL 5.7 or MariaDB 10.2+
- PDO MySQL extension
- JSON extension
- File write permissions

## Installation

### Quick Setup
1. Upload all files to your Hostinger public_html directory
2. Create a MySQL database through Hostinger control panel
3. Visit `yourdomain.com/setup.php` and follow the setup wizard
4. Delete `setup.php` after installation

### Manual Setup
1. Copy `.env.example` to `.env` and configure:
   ```env
   DB_HOST=localhost
   DB_NAME=your_database_name
   DB_USER=your_database_user
   DB_PASS=your_secure_password
   APP_URL=https://yourdomain.com
   ```

2. Import database schema:
   ```bash
   mysql -u username -p database_name < sql/database_setup.sql
   mysql -u username -p database_name < sql/seed_data.sql
   ```

3. Set proper file permissions:
   ```bash
   chmod 755 uploads/
   chmod 644 .env
   chmod 644 .htaccess
   ```

## Default Credentials
- **Email:** admin@ptcsystem.com
- **Password:** admin123!

**⚠️ IMPORTANT:** Change these credentials immediately after first login!

## Features
- ✅ User authentication & role management
- ✅ Election result submission & verification
- ✅ Real-time dashboard & analytics
- ✅ WhatsApp & USSD provider integration
- ✅ File upload for result verification
- ✅ Audit logging & security features
- ✅ Mobile-responsive design

## File Structure
```
hostinger-shared/
├── api/                    # API endpoints
│   ├── auth/              # Authentication APIs
│   └── providers/         # Integration provider APIs
├── assets/                # Frontend assets
│   └── js/               # JavaScript files
├── config/               # Configuration files
├── includes/             # PHP includes
├── sql/                 # Database setup files
├── uploads/             # File upload directory
├── views/               # Frontend views
├── .env                 # Environment configuration
├── .htaccess           # Apache configuration
├── index.php           # Main application entry
└── setup.php           # Installation wizard
```

## API Endpoints
- `POST /api/auth/login` - User login
- `GET /api/auth/user` - Get current user
- `POST /api/auth/logout` - User logout
- `GET /api/ussd-providers` - List USSD providers
- `GET /api/whatsapp-providers` - List WhatsApp providers

## Security Features
- Password hashing with bcrypt
- Session security & CSRF protection
- File upload validation
- SQL injection prevention
- XSS protection headers
- Secure cookie settings

## Environment Variables
Key configuration options in `.env`:

```env
# Database
DB_HOST=localhost
DB_NAME=your_database
DB_USER=your_user
DB_PASS=your_password

# Security
SESSION_SECRET=your-32-character-secret
PASSWORD_HASH_COST=12
FORCE_HTTPS=true

# Application
APP_URL=https://yourdomain.com
APP_NAME="PTC Election System"
DEBUG_MODE=false
```

## Troubleshooting

### Database Connection Issues
1. Verify database credentials in `.env`
2. Ensure MySQL service is running
3. Check database user permissions

### File Permission Errors
```bash
chmod 755 uploads/
chmod 644 .env
chmod 755 setup.php
```

### Apache Rewrite Issues
Ensure `.htaccess` file is uploaded and mod_rewrite is enabled.

### PHP Version Issues
This system requires PHP 7.4+. Check your Hostinger PHP version setting.

## Support & Maintenance
- Regular backups recommended
- Monitor error logs in `logs/` directory
- Update credentials regularly
- Keep PHP version updated

## Deployment Notes
- Designed specifically for Hostinger shared hosting
- Uses MySQL instead of PostgreSQL
- Optimized for shared hosting limitations
- No Node.js or npm dependencies required

---

**Note:** This is the shared hosting version. For VPS/dedicated servers, consider the Node.js version for better performance.