# PTC System Deployment Guide

This guide provides comprehensive instructions for deploying the Parallel Tally Center (PTC) System on various cloud platforms and hosting providers.

## Quick Start Options

### 🐳 Docker Deployment (Recommended)
```bash
# Clone and build
git clone <repository-url>
cd ptc-system

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Deploy with Docker Compose
docker-compose up -d
```

### ☁️ Cloud Platform Deployment

#### Google Cloud Platform
```bash
# Deploy to Google App Engine
gcloud app deploy deployment/google-cloud/app.yaml

# Or use Cloud Build
gcloud builds submit --config=deployment/google-cloud/cloudbuild.yaml
```

#### DigitalOcean Droplet
```bash
# Run the automated deployment script
sudo bash deployment/digitalocean/deploy.sh
```


## Deployment Options

### 1. Docker Deployment

**Pros:**
- Consistent environment
- Easy scaling
- Includes database and reverse proxy
- Production-ready configuration

**Requirements:**
- Docker & Docker Compose
- 2GB+ RAM
- 10GB+ storage

**Steps:**
1. Copy `docker-compose.yml` to your server
2. Create `.env` file with your configuration
3. Run: `docker-compose up -d`
4. Access at: `http://your-server-ip`

### 2. Google Cloud App Engine

**Pros:**
- Fully managed
- Auto-scaling
- Integrated with Google Cloud services

**Requirements:**
- Google Cloud account
- Cloud SQL instance for PostgreSQL
- Cloud Build API enabled

**Steps:**
1. Configure `deployment/google-cloud/app.yaml`
2. Set up Cloud SQL PostgreSQL instance
3. Deploy: `gcloud app deploy`

### 3. DigitalOcean Droplet

**Pros:**
- Full control over server
- Cost-effective
- SSD storage

**Requirements:**
- Ubuntu 20.04+ droplet
- 2GB+ RAM recommended
- Root access

**Steps:**
1. Create Ubuntu droplet
2. Run: `sudo bash deployment/digitalocean/deploy.sh`
3. Configure domain and SSL


## Environment Configuration

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database
PGHOST=localhost
PGPORT=5432
PGDATABASE=ptc_election
PGUSER=your_user
PGPASSWORD=your_password

# Security
SESSION_SECRET=your-super-secure-session-secret
NODE_ENV=production
PORT=5000
```

### Optional Integrations
```bash
# WhatsApp Business API
WHATSAPP_API_KEY=your_api_key
WHATSAPP_PHONE_NUMBER=your_phone_number

# Twilio SMS
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
```

## Security Considerations

### 🔒 Essential Security Steps

1. **Change Default Credentials**
   - Default admin: admin@election.gov / admin123
   - Change immediately after first login

2. **SSL/HTTPS Setup**
   ```bash
   # With Let's Encrypt (recommended)
   sudo certbot --nginx -d your-domain.com
   ```

3. **Firewall Configuration**
   ```bash
   # Allow only necessary ports
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```

4. **Database Security**
   - Use strong passwords
   - Restrict database access
   - Enable connection encryption

5. **Environment Variables**
   - Store secrets securely
   - Use different secrets for each environment
   - Never commit secrets to version control

### 🛡️ Additional Security Measures

- Enable 2FA for all admin users
- Regular security updates
- Monitor logs for suspicious activity
- Use intrusion detection systems
- Regular security audits

## Performance Optimization

### Database Optimization
```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_results_status ON results(status);
CREATE INDEX CONCURRENTLY idx_results_created_at ON results(created_at);
CREATE INDEX CONCURRENTLY idx_audit_logs_created_at ON audit_logs(created_at);
```

### Nginx Configuration
```nginx
# Enable caching for static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Enable gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

### PM2 Cluster Mode
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ptc-system',
    script: './server/index.js',
    instances: 'max', // Use all CPU cores
    exec_mode: 'cluster'
  }]
};
```

## Monitoring and Maintenance

### Health Checks
The application provides health check endpoints:
- `GET /health` - Basic health check
- `GET /api/stats` - System statistics

### Log Management
```bash
# View application logs
pm2 logs ptc-system

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View database logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Backup Strategy

#### Database Backups
```bash
# Daily backup script
pg_dump ptc_election > backup_$(date +%Y%m%d).sql

# Automated backup with cron
0 2 * * * pg_dump ptc_election > /backups/ptc_$(date +\%Y\%m\%d).sql
```

#### File Backups
```bash
# Backup uploads and configuration
tar -czf ptc_files_$(date +%Y%m%d).tar.gz uploads/ .env
```

### Update Procedure
1. **Backup current system**
2. **Test updates in staging**
3. **Deploy during maintenance window**
4. **Verify system functionality**
5. **Monitor for issues**

## Platform-Specific Notes

### Google Cloud
- Use Cloud SQL for PostgreSQL
- Enable Cloud Logging for monitoring
- Configure Cloud Storage for file uploads
- Use Cloud Load Balancing for high availability

### DigitalOcean
- Use managed PostgreSQL for production
- Configure monitoring and alerting
- Set up automated backups
- Use load balancers for scaling


## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Test connection
   psql -h localhost -U username -d ptc_election
   ```

2. **Application Won't Start**
   ```bash
   # Check logs
   pm2 logs ptc-system
   
   # Check environment
   node -v  # Should be 18+
   npm -v
   ```

3. **502 Bad Gateway**
   ```bash
   # Check if app is running
   pm2 status
   
   # Check nginx configuration
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **SSL Certificate Issues**
   ```bash
   # Renew Let's Encrypt certificate
   sudo certbot renew
   ```

### Getting Help

- **Documentation**: Check the installer/README.md
- **Logs**: Always check application and system logs
- **Community**: Search for similar issues online
- **Support**: Contact your hosting provider for infrastructure issues

## Cost Optimization

### Resource Planning
- **Small deployment**: 2GB RAM, 2 CPU cores
- **Medium deployment**: 4GB RAM, 4 CPU cores  
- **Large deployment**: 8GB+ RAM, 8+ CPU cores

### Cloud Cost Tips
- Use reserved instances for predictable workloads
- Enable auto-scaling to handle traffic spikes
- Monitor resource usage regularly
- Use managed databases to reduce operational overhead

---

**Note**: Always test deployments in a staging environment before deploying to production. Ensure you have proper backups and a rollback plan.