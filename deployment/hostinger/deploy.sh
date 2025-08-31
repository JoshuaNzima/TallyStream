#!/bin/bash

# PTC System Deployment Script for Hostinger VPS
# This script automates deployment on Hostinger shared hosting or VPS

set -e

echo "🚀 PTC System - Hostinger Deployment Script"
echo "============================================="

# Configuration
DOMAIN="your-domain.com"
PROJECT_DIR="/home/username/domains/$DOMAIN/public_html"
DB_NAME="username_ptc_election"
DB_USER="username_ptc"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo_error "package.json not found. Please run this script from the project root directory."
fi

# Check Node.js version
echo "🔍 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo_error "Node.js is not installed. Please install Node.js 18+ first."
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo_error "Node.js version 18 or higher is required. Current version: $(node -v)"
fi

echo_success "Node.js $(node -v) found"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Build the application
echo "🏗️  Building application..."
npm run build

# Create deployment directory
echo "📁 Preparing deployment directory..."
mkdir -p "$PROJECT_DIR"

# Copy built files
echo "📋 Copying application files..."
cp -r dist/* "$PROJECT_DIR/"
cp -r server "$PROJECT_DIR/"
cp -r shared "$PROJECT_DIR/"
cp package.json "$PROJECT_DIR/"
cp package-lock.json "$PROJECT_DIR/"

# Create uploads directory
mkdir -p "$PROJECT_DIR/uploads"
chmod 755 "$PROJECT_DIR/uploads"

# Create environment file
echo "⚙️  Creating production environment file..."
cat > "$PROJECT_DIR/.env" << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3000

# Database Configuration (Update with your Hostinger database details)
DATABASE_URL=postgresql://$DB_USER:YOUR_DB_PASSWORD@localhost:5432/$DB_NAME
PGHOST=localhost
PGPORT=5432
PGDATABASE=$DB_NAME
PGUSER=$DB_USER
PGPASSWORD=YOUR_DB_PASSWORD

# Session Security (IMPORTANT: Change this!)
SESSION_SECRET=your-super-secure-session-secret-change-this

# Optional: API Integrations
WHATSAPP_API_KEY=
WHATSAPP_PHONE_NUMBER=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EOF

# Create start script for Hostinger
cat > "$PROJECT_DIR/start.js" << 'EOF'
#!/usr/bin/env node

// PTC System startup script for Hostinger
const { spawn } = require('child_process');
const path = require('path');

console.log('🏛️  Starting PTC System...');

// Change to project directory
process.chdir(__dirname);

// Start the application
const app = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

app.on('error', (err) => {
  console.error('Failed to start PTC System:', err);
  process.exit(1);
});

app.on('close', (code) => {
  console.log(`PTC System exited with code ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  app.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  app.kill('SIGINT');
});
EOF

chmod +x "$PROJECT_DIR/start.js"

# Create PM2 ecosystem file for process management
cat > "$PROJECT_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: 'ptc-system',
    script: './start.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF

# Create logs directory
mkdir -p "$PROJECT_DIR/logs"

# Create .htaccess for Apache (common on shared hosting)
cat > "$PROJECT_DIR/.htaccess" << 'EOF'
# PTC System Apache Configuration

# Redirect all requests to Node.js application
RewriteEngine On
RewriteRule ^(?!start\.js|server|shared|uploads|logs|node_modules).*$ /start.js [L,QSA]

# Security headers
Header always set X-Content-Type-Options nosniff
Header always set X-Frame-Options DENY
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"

# Cache static assets
<FilesMatch "\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$">
    ExpiresActive On
    ExpiresDefault "access plus 1 month"
    Header append Cache-Control "public, immutable"
</FilesMatch>

# Protect sensitive files
<FilesMatch "\.(env|log|json)$">
    Order allow,deny
    Deny from all
</FilesMatch>
EOF

echo_success "Application deployed to $PROJECT_DIR"

echo ""
echo "📋 Next Steps:"
echo "1. Update the .env file with your actual database credentials"
echo "2. Create the PostgreSQL database: $DB_NAME"
echo "3. Run database migrations: cd $PROJECT_DIR && npm run db:push"
echo "4. Configure your domain to point to the deployment directory"
echo "5. Start the application: cd $PROJECT_DIR && node start.js"
echo ""
echo "💡 For production with PM2:"
echo "   pm2 start ecosystem.config.js"
echo "   pm2 save"
echo "   pm2 startup"
echo ""
echo_warning "Remember to:"
echo "   - Change the default admin password after first login"
echo "   - Configure SSL/HTTPS for production"
echo "   - Set up regular database backups"
echo "   - Monitor logs in the logs/ directory"