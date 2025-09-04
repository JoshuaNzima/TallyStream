# PTC Election System - Deployment Guide

This application is configured to deploy on multiple platforms. Choose the one that best fits your needs:

## 🚀 Quick Deploy Options

### Railway (Recommended for Fullstack)
1. Connect your GitHub repository to Railway
2. Set environment variables:
   - `DATABASE_URL` (Railway will provide PostgreSQL automatically)
   - `SESSION_SECRET` (generate with: `openssl rand -base64 32`)
   - `ENCRYPTION_KEY` (32-character string)
3. Deploy automatically builds and starts

### Render
1. Connect your GitHub repository to Render
2. Create a PostgreSQL database on Render
3. Set environment variables:
   - `DATABASE_URL` (from your Render PostgreSQL service)
   - `SESSION_SECRET`
   - `ENCRYPTION_KEY` 
4. Uses `render.yaml` configuration

### Netlify (Static + Functions)
1. Connect your GitHub repository to Netlify
2. Set environment variables in Netlify dashboard
3. Uses serverless functions for API endpoints
4. Frontend deployed as static files

### Heroku
1. Install Heroku CLI
2. Create app: `heroku create your-app-name`
3. Add PostgreSQL: `heroku addons:create heroku-postgresql:mini`
4. Set environment variables:
   ```bash
   heroku config:set SESSION_SECRET=your_secret_here
   heroku config:set ENCRYPTION_KEY=your_key_here
   ```
5. Deploy: `git push heroku main`

## 🗄️ Database Setup

The application uses PostgreSQL with Drizzle ORM. After deployment:

1. **Database Migration**: Run `npm run db:push` to create tables
2. **Seeding**: The app automatically seeds with:
   - Default admin user: `admin@ptcsystem.com` / `admin123!`
   - Sample political parties and candidates
   - Test polling centers

## 🔧 Environment Variables

### Required Variables:
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Random string for session security
- `ENCRYPTION_KEY`: 32-character key for data encryption

### Optional Variables:
- `NODE_ENV`: Set to "production" for live deployments
- `PORT`: Automatically set by hosting platforms

## 🔒 Security Notes

- Never commit `.env` files to version control
- Use strong, randomly generated secrets
- Enable HTTPS on your hosting platform
- Consider using environment-specific database URLs

## 📋 Build Process

The application builds both frontend and backend:
1. `vite build` - Builds React frontend to `dist/public/`
2. `esbuild` - Bundles server to `dist/index.js`
3. `npm start` - Runs the production server

## ✅ Health Check

All configurations include a health check endpoint at `/api/health` for monitoring deployment status.