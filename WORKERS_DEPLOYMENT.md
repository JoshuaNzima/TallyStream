# Cloudflare Workers Deployment Guide

This guide explains how to deploy the PTC Election System to Cloudflare Workers.

## Prerequisites

1. Cloudflare account
2. Node.js 18+ installed
3. Wrangler CLI installed (`npm install -g wrangler`)

## Setup Steps

### 1. Install Dependencies

The following packages are already installed:
- `wrangler` - Cloudflare Workers CLI
- `hono` - Web framework for Workers
- `@hono/node-server` - Node.js adapter
- `@cloudflare/workers-types` - TypeScript types

### 2. Add Build Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "build:workers": "vite build && esbuild workers/src/index.ts --platform=browser --format=esm --bundle --outdir=workers/dist --external:__STATIC_CONTENT_MANIFEST",
    "workers:dev": "wrangler dev workers/src/index.ts --local",
    "workers:deploy": "npm run build:workers && wrangler publish",
    "workers:db:create": "wrangler d1 create ptc-election-db",
    "workers:db:migrate": "wrangler d1 execute ptc-election-db --file=workers/schema.sql",
    "workers:db:seed": "wrangler d1 execute ptc-election-db --file=workers/seed.sql"
  }
}
```

### 3. Configure Wrangler

The `wrangler.toml` file is already configured. Update these values:

```toml
# Update with your actual values
[[d1_databases]]
binding = "DB"
database_name = "ptc-election-db"
database_id = "your-actual-d1-database-id-here"

# Configure your R2 bucket names
[[r2_buckets]]
binding = "FILES"
bucket_name = "your-ptc-files-bucket"
preview_bucket_name = "your-ptc-files-preview-bucket"

# Update production environment variables
[env.production.vars]
SESSION_SECRET = "your-secure-session-secret-32-chars+"
ENCRYPTION_KEY = "your-32-character-encryption-key"
```

### 4. Create Resources

#### Create D1 Database
```bash
# Create the database
wrangler d1 create ptc-election-db

# Copy the database ID from the output and update wrangler.toml
```

#### Create R2 Buckets
```bash
# Create production bucket
wrangler r2 bucket create ptc-files

# Create preview bucket for development
wrangler r2 bucket create ptc-files-preview
```

#### Create KV Namespace
```bash
# Create KV namespace for sessions
wrangler kv:namespace create "KV"
wrangler kv:namespace create "KV" --preview

# Update wrangler.toml with the namespace IDs
```

### 5. Set up Database

```bash
# Run database migrations
npm run workers:db:migrate

# Seed with sample data
npm run workers:db:seed
```

### 6. Build and Deploy

```bash
# Build the Workers application
npm run build:workers

# Deploy to Cloudflare Workers
npm run workers:deploy
```

## Development

### Local Development
```bash
# Start local development server
npm run workers:dev
```

### Testing Database
```bash
# Query your D1 database
wrangler d1 execute ptc-election-db --command="SELECT * FROM users LIMIT 5"
```

## Configuration

### Environment Variables

Set these in your Cloudflare dashboard or via Wrangler:

```bash
# Set production secrets
wrangler secret put SESSION_SECRET
wrangler secret put ENCRYPTION_KEY
```

### Database Schema

The database schema is in `workers/schema.sql` with tables:
- `users` - User accounts and authentication
- `political_parties` - Political party information
- `candidates` - Election candidates
- `polling_centers` - Voting locations
- `results` - Election results submissions
- `audit_logs` - System audit trail
- `ussd_providers` - USSD service providers
- `whatsapp_providers` - WhatsApp integration providers

### File Uploads

Files are stored in Cloudflare R2:
- Images and PDFs up to 10MB
- Automatic content-type detection
- Secure file serving via R2 URLs

### Real-time Features

WebSocket functionality is implemented via Durable Objects:
- Real-time election updates
- Live dashboard statistics
- Result submission notifications
- Verification status updates

## Features Implemented

✅ **Authentication & Sessions**
- Secure login/logout with KV store sessions
- Role-based access control (admin, supervisor, agent)
- Password hashing using Web Crypto API

✅ **Database Operations**
- Full CRUD operations via D1 SQLite
- Support for PostgreSQL via external connections
- Prepared statements for security

✅ **File Management**
- R2 storage for document uploads
- File validation and type checking
- Secure file serving

✅ **Real-time Updates**
- WebSocket connections via Durable Objects
- Live analytics and statistics
- Broadcast election updates

✅ **API Endpoints**
- `/api/auth/*` - Authentication routes
- `/api/analytics` - Real-time statistics
- `/api/results` - Election results management
- `/api/candidates` - Candidate information
- `/api/polling-centers` - Polling center data
- `/api/political-parties` - Party information

## Default Credentials

After seeding the database:
- **Email**: admin@election.gov
- **Password**: admin123
- **Role**: admin

## Security Features

- CORS protection
- Input validation with Zod schemas
- SQL injection prevention via prepared statements
- Secure session management
- File type validation
- Role-based route protection

## Performance Considerations

- D1 database with optimized indexes
- Efficient SQL queries with JOINs
- Proper error handling and logging
- Request/response compression

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database status
   wrangler d1 info ptc-election-db
   ```

2. **R2 File Upload Issues**
   ```bash
   # Check bucket permissions
   wrangler r2 bucket list
   ```

3. **WebSocket Connection Problems**
   - Ensure Durable Objects are properly configured
   - Check wrangler.toml migrations section

### Debugging

```bash
# View real-time logs
wrangler tail

# Check specific function logs
wrangler tail --format=pretty
```

## Cost Estimation

Cloudflare Workers pricing:
- **Workers**: 100,000 requests/day free, then $0.50/million
- **D1**: 5 million reads/month free, then $0.001/1K reads
- **R2**: 10GB storage free, then $0.015/GB/month
- **KV**: 100,000 reads/day free, then $0.50/million

For a typical election system with moderate usage, expect costs under $10-50/month.

## Support

- Cloudflare Workers: https://developers.cloudflare.com/workers/
- D1 Database: https://developers.cloudflare.com/d1/
- R2 Storage: https://developers.cloudflare.com/r2/
- Durable Objects: https://developers.cloudflare.com/durable-objects/