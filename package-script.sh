#!/bin/bash

# Parallel Tally Center (PTC) System - Package Creation Script
# This script creates a complete installation package for the PTC system

set -e

echo "🚀 Creating PTC System Installation Package..."

# Create package directory
PACKAGE_DIR="ptc-installer-$(date +%Y%m%d)"
mkdir -p "$PACKAGE_DIR"

echo "📁 Creating package structure..."

# Copy main application files
echo "📋 Copying application files..."
cp -r client/ "$PACKAGE_DIR/"
cp -r server/ "$PACKAGE_DIR/"
cp -r shared/ "$PACKAGE_DIR/"
cp package.json "$PACKAGE_DIR/"
cp package-lock.json "$PACKAGE_DIR/"
cp tsconfig.json "$PACKAGE_DIR/"
cp vite.config.ts "$PACKAGE_DIR/"
cp drizzle.config.ts "$PACKAGE_DIR/"
cp tailwind.config.ts "$PACKAGE_DIR/"
cp postcss.config.js "$PACKAGE_DIR/"

# Copy installer files
echo "🔧 Copying installer files..."
cp -r installer/ "$PACKAGE_DIR/"

# Copy deployment configurations
echo "☁️ Copying deployment configurations..."
cp -r deployment/ "$PACKAGE_DIR/"
cp Dockerfile "$PACKAGE_DIR/" 2>/dev/null || echo "Dockerfile not found, skipping..."
cp docker-compose.yml "$PACKAGE_DIR/" 2>/dev/null || echo "docker-compose.yml not found, skipping..."

# Create environment template
echo "⚙️ Creating environment template..."
cat > "$PACKAGE_DIR/.env.example" << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/ptc_election
PGHOST=localhost
PGPORT=5432
PGDATABASE=ptc_election
PGUSER=postgres
PGPASSWORD=your_password

# Session Security
SESSION_SECRET=your-super-secure-session-secret-change-this

# Application Configuration
NODE_ENV=production
PORT=5000

# Optional: API Integrations
WHATSAPP_API_KEY=
WHATSAPP_PHONE_NUMBER=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
EOF

# Create startup scripts
echo "🚀 Creating startup scripts..."

# Windows startup script
cat > "$PACKAGE_DIR/start-ptc.bat" << 'EOF'
@echo off
echo Starting PTC System...
npm run build
npm start
pause
EOF

# Linux/Mac startup script
cat > "$PACKAGE_DIR/start-ptc.sh" << 'EOF'
#!/bin/bash
echo "Starting PTC System..."
npm run build
npm start
EOF

chmod +x "$PACKAGE_DIR/start-ptc.sh"

# Create installation script
cat > "$PACKAGE_DIR/install.sh" << 'EOF'
#!/bin/bash

echo "🏛️ PTC System Installation Script"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18 or higher is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Please ensure PostgreSQL is installed and accessible."
    echo "Visit: https://www.postgresql.org/download/"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🏗️  Building application..."
npm run build

# Set up environment
if [ ! -f .env ]; then
    echo "⚙️  Creating environment configuration..."
    cp .env.example .env
    echo "📝 Please edit .env file with your database configuration"
fi

echo ""
echo "✅ Installation completed!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your database configuration"
echo "2. Create PostgreSQL database: createdb ptc_election"
echo "3. Run database setup: npm run db:push"
echo "4. Start the application: npm start"
echo ""
echo "Or use the GUI installer: python3 installer/setup.py"
EOF

chmod +x "$PACKAGE_DIR/install.sh"

# Create Windows installation script
cat > "$PACKAGE_DIR/install.bat" << 'EOF'
@echo off
echo PTC System Installation Script
echo ==============================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js 18+ first.
    echo Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo Node.js found

REM Install dependencies
echo Installing dependencies...
npm install

REM Build the application
echo Building application...
npm run build

REM Set up environment
if not exist .env (
    echo Creating environment configuration...
    copy .env.example .env
    echo Please edit .env file with your database configuration
)

echo.
echo Installation completed!
echo.
echo Next steps:
echo 1. Edit .env file with your database configuration
echo 2. Create PostgreSQL database
echo 3. Run database setup: npm run db:push
echo 4. Start the application: npm start
echo.
echo Or use the GUI installer: python installer\setup.py
pause
EOF

# Create documentation
echo "📚 Creating documentation..."
cp installer/README.md "$PACKAGE_DIR/"

# Create version info
cat > "$PACKAGE_DIR/VERSION" << EOF
PTC System v1.0.0
Build Date: $(date)
Package Created: $(date +%Y-%m-%d)
Node.js Required: 18+
PostgreSQL Required: 13+
EOF

# Create package manifest
cat > "$PACKAGE_DIR/MANIFEST.txt" << 'EOF'
PTC System Installation Package Contents:

Application Files:
- client/          - React frontend application
- server/          - Express.js backend server
- shared/          - Shared schemas and types
- package.json     - Node.js dependencies
- *.config.*       - Build and configuration files

Installation Tools:
- installer/       - GUI installer (Python)
- install.sh       - Linux/Mac installation script
- install.bat      - Windows installation script
- start-ptc.sh     - Linux/Mac startup script
- start-ptc.bat    - Windows startup script

Configuration:
- .env.example     - Environment configuration template
- README.md        - Installation instructions
- VERSION          - Version information
- MANIFEST.txt     - This file

Quick Start:
1. Run GUI installer: python3 installer/setup.py
2. Or manual install: ./install.sh (Linux/Mac) or install.bat (Windows)
3. Configure database in .env file
4. Start system: ./start-ptc.sh or start-ptc.bat
EOF

# Create the final package
echo "📦 Creating compressed package..."
tar -czf "${PACKAGE_DIR}.tar.gz" "$PACKAGE_DIR"
zip -r "${PACKAGE_DIR}.zip" "$PACKAGE_DIR" > /dev/null

# Cleanup temporary directory
rm -rf "$PACKAGE_DIR"

echo ""
echo "✅ Package creation completed!"
echo ""
echo "📦 Created packages:"
echo "   - ${PACKAGE_DIR}.tar.gz (Linux/Mac)"
echo "   - ${PACKAGE_DIR}.zip (Windows/Universal)"
echo ""
echo "🚀 To distribute:"
echo "   1. Upload packages to your distribution server"
echo "   2. Provide download links to users"
echo "   3. Include installation instructions"
echo ""
echo "📋 Package contents:"
echo "   - Complete PTC application"
echo "   - GUI installer with configuration wizard"
echo "   - Command-line installation scripts"
echo "   - Documentation and setup guides"
echo "   - Startup scripts for easy deployment"