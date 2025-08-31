#!/bin/bash

# PTC System Deployment Script for DigitalOcean Droplet
# This script automates deployment on DigitalOcean VPS

set -e

echo "🚀 PTC System - DigitalOcean Deployment Script"
echo "==============================================="

# Configuration
APP_NAME="ptc-system"
APP_USER="ptc"
APP_DIR="/opt/ptc-system"
NGINX_CONF="/etc/nginx/sites-available/ptc-system"
DOMAIN="your-domain.com"

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo_error "Please run this script as root (use sudo)"
fi

echo "🔄 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PostgreSQL
echo "🗄️  Installing PostgreSQL..."
apt-get install -y postgresql postgresql-contrib

# Install PM2 globally
echo "⚙️  Installing PM2..."
npm install -g pm2

# Install Nginx
echo "🌐 Installing Nginx..."
apt-get install -y nginx

# Install other dependencies
echo "📦 Installing additional packages..."
apt-get install -y git curl certbot python3-certbot-nginx ufw

# Create application user
echo "👤 Creating application user..."
if ! id "$APP_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$APP_USER"
    echo_success "User $APP_USER created"
else
    echo_warning "User $APP_USER already exists"
fi

# Create application directory
echo "📁 Creating application directory..."
mkdir -p "$APP_DIR"
chown "$APP_USER:$APP_USER" "$APP_DIR"

# Setup PostgreSQL
echo "🗄️  Setting up PostgreSQL..."
sudo -u postgres createuser --createdb "$APP_USER" || echo_warning "User $APP_USER may already exist in PostgreSQL"
sudo -u postgres createdb -O "$APP_USER" ptc_election || echo_warning "Database ptc_election may already exist"

# Generate random password for database
DB_PASSWORD=$(openssl rand -base64 32)
sudo -u postgres psql -c "ALTER USER $APP_USER PASSWORD '$DB_PASSWORD';"

echo_success "PostgreSQL configured"

# Copy application files
echo "📋 Copying application files..."
if [ -d "./dist" ]; then
    cp -r . "$APP_DIR/"
else
    echo_error "Application not built. Please run 'npm run build' first."
fi

# Set ownership
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# Create environment file
echo "⚙️  Creating environment configuration..."
cat > "$APP_DIR/.env" << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://$APP_USER:$DB_PASSWORD@localhost:5432/ptc_election
PGHOST=localhost
PGPORT=5432
PGDATABASE=ptc_election
PGUSER=$APP_USER
PGPASSWORD=$DB_PASSWORD

# Session Security
SESSION_SECRET=$(openssl rand -base64 64)

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

chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"

# Install application dependencies
echo "📦 Installing application dependencies..."
cd "$APP_DIR"
sudo -u "$APP_USER" npm ci --production

# Run database migrations
echo "🗄️  Running database migrations..."
sudo -u "$APP_USER" npm run db:push

# Create PM2 ecosystem file
echo "⚙️  Creating PM2 configuration..."
cat > "$APP_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [{
    name: 'ptc-system',
    script: './server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: './logs/combined.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_memory_restart: '1G'
  }]
};
EOF

# Create logs directory
mkdir -p "$APP_DIR/logs"
chown "$APP_USER:$APP_USER" "$APP_DIR/logs"

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > "$NGINX_CONF" << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static files
    location /uploads {
        alias $APP_DIR/uploads;
        expires 1M;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable Nginx site
ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t || echo_error "Nginx configuration test failed"

# Configure firewall
echo "🔥 Configuring firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Start and enable services
echo "🚀 Starting services..."
systemctl restart nginx
systemctl enable nginx

# Start application with PM2
cd "$APP_DIR"
sudo -u "$APP_USER" pm2 start ecosystem.config.js
sudo -u "$APP_USER" pm2 save
sudo -u "$APP_USER" pm2 startup systemd | grep -v "PM2" | bash

echo_success "PTC System deployed successfully!"

echo ""
echo "📋 Deployment Summary:"
echo "   - Application: $APP_DIR"
echo "   - User: $APP_USER"
echo "   - Database: ptc_election"
echo "   - Web server: Nginx (port 80)"
echo "   - Application: PM2 (port 3000)"
echo ""
echo "🔧 Next Steps:"
echo "1. Configure DNS for your domain: $DOMAIN"
echo "2. Set up SSL certificate:"
echo "   sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "3. Access your application at: http://$DOMAIN"
echo "4. Login with admin credentials and change password"
echo ""
echo "📊 Management Commands:"
echo "   - View logs: sudo -u $APP_USER pm2 logs"
echo "   - Restart app: sudo -u $APP_USER pm2 restart ptc-system"
echo "   - View status: sudo -u $APP_USER pm2 status"
echo ""
echo_warning "Important: Change the default admin password after first login!"