#!/bin/bash

# The Saffron Lounge - Production Deployment Script
# This script handles complete production deployment

set -e

echo "🍲 The Saffron Lounge - Production Deployment Script"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root (for production deployment)
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. This is not recommended for production."
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check system requirements
check_system() {
    print_status "Checking system requirements..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ is required. Current version: $(node -v)"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed."
        exit 1
    fi

    # Check MySQL
    if ! command -v mysql &> /dev/null; then
        print_error "MySQL client is not installed."
        exit 1
    fi

    print_success "System requirements met"
}

# Setup production environment
setup_environment() {
    print_status "Setting up production environment..."

    # Create .env.production if it doesn't exist
    if [ ! -f .env.production ]; then
        print_warning ".env.production not found. Creating from template..."

        cat > .env.production << EOF
# Production Environment Configuration
NODE_ENV=production
PORT=8000

# Database Configuration
DATABASE_URL="mysql://saffron_prod:secure_password_here@localhost:3306/saffron_db"

# JWT Configuration
JWT_SECRET="your-production-jwt-secret-change-this-in-production"
JWT_REFRESH_SECRET="your-production-refresh-jwt-secret-change-this-in-production"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_EXPIRES_IN="30d"

# Email Configuration (Configure with your SMTP provider)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="noreply@saffronlounge.com"
EMAIL_PASS="your-app-password"
EMAIL_FROM="noreply@saffronlounge.com"
EMAIL_USE_SSL="false"

# API Configuration
API_BASE_URL="https://api.saffronlounge.com"
FRONTEND_URL="https://saffronlounge.com"

# Security
ADMIN_CREATION_TOKEN="PRODUCTION_ADMIN_TOKEN_CHANGE_THIS"

# Logging
LOG_LEVEL="info"
EOF

        print_warning "Please update .env.production with your actual production values!"
        print_warning "Especially database credentials, JWT secrets, and email settings."
        read -p "Press Enter when ready to continue..."
    fi

    # Copy production env to .env
    cp .env.production .env
    print_success "Environment configured"
}

# Install dependencies
install_dependencies() {
    print_status "Installing production dependencies..."

    # Clean install for production
    rm -rf node_modules package-lock.json
    npm ci --only=production

    print_success "Dependencies installed"
}

# Setup database
setup_database() {
    print_status "Setting up production database..."

    # Check database connection
    if ! mysql -u root -p -e "SELECT 1;" &> /dev/null; then
        print_error "Cannot connect to MySQL. Please check your credentials."
        exit 1
    fi

    # Run database setup
    print_status "Running database migrations..."
    npx prisma generate
    npx prisma migrate deploy

    print_status "Seeding database..."
    node prisma/seed.js

    print_success "Database setup complete"
}

# Build application
build_application() {
    print_status "Building application..."

    # Install dev dependencies for build
    npm ci

    # Build if there's a build script
    if npm run | grep -q "build"; then
        npm run build
    fi

    # Generate Prisma client
    npx prisma generate

    print_success "Application built"
}

# Setup process manager (PM2)
setup_pm2() {
    print_status "Setting up PM2 process manager..."

    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        print_status "Installing PM2..."
        npm install -g pm2
    fi

    # Create ecosystem file if it doesn't exist
    if [ ! -f ecosystem.config.js ]; then
        cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'saffron-lounge-api',
    script: 'dist/server.js', // or 'src/server.ts' if using ts-node
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_memory_restart: '1G',
    restart_delay: 4000,
    autorestart: true,
    env_production: {
      NODE_ENV: 'production',
      PORT: 8000
    }
  }]
};
EOF
    fi

    print_success "PM2 configured"
}

# Setup nginx (optional)
setup_nginx() {
    print_status "Setting up Nginx reverse proxy..."

    if command -v nginx &> /dev/null; then
        sudo tee /etc/nginx/sites-available/saffron-lounge << EOF
server {
    listen 80;
    server_name api.saffronlounge.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

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
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
EOF

        sudo ln -sf /etc/nginx/sites-available/saffron-lounge /etc/nginx/sites-enabled/
        sudo nginx -t
        sudo systemctl reload nginx

        print_success "Nginx configured"
    else
        print_warning "Nginx not found. Skipping reverse proxy setup."
    fi
}

# Setup SSL with Let's Encrypt (optional)
setup_ssl() {
    print_status "Setting up SSL certificate..."

    if command -v certbot &> /dev/null; then
        sudo certbot --nginx -d api.saffronlounge.com
        print_success "SSL certificate installed"
    else
        print_warning "Certbot not found. Skipping SSL setup."
        print_warning "Install certbot: sudo apt install certbot python3-certbot-nginx"
    fi
}

# Start application
start_application() {
    print_status "Starting application..."

    # Stop existing PM2 processes
    pm2 delete saffron-lounge-api 2>/dev/null || true

    # Start with PM2
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup

    print_success "Application started"
}

# Setup monitoring
setup_monitoring() {
    print_status "Setting up monitoring..."

    # PM2 monitoring
    pm2 monit

    # Basic health check
    sleep 5
    if curl -f http://localhost:8000/api/health &> /dev/null; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        exit 1
    fi
}

# Create backup script
create_backup_script() {
    print_status "Creating backup script..."

    cat > backup.sh << 'EOF'
#!/bin/bash
# Database backup script for The Saffron Lounge

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/saffron_db_$DATE.sql"

mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u saffron_prod -p saffron_db > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

    chmod +x backup.sh

    # Setup cron job for daily backups
    (crontab -l ; echo "0 2 * * * $(pwd)/backup.sh") | crontab -

    print_success "Backup script created and scheduled"
}

# Display deployment summary
display_summary() {
    echo
    echo "🎉 Deployment Complete!"
    echo "======================"
    echo
    echo "Application Details:"
    echo "  • API URL: http://localhost:8000"
    echo "  • Health Check: http://localhost:8000/api/health"
    echo "  • API Docs: http://localhost:8000/api-docs"
    echo
    echo "Process Management:"
    echo "  • PM2 Status: pm2 status"
    echo "  • PM2 Logs: pm2 logs saffron-lounge-api"
    echo "  • PM2 Restart: pm2 restart saffron-lounge-api"
    echo
    echo "Database:"
    echo "  • Backup: ./backup.sh"
    echo "  • Manual Backup: mysqldump -u saffron_prod -p saffron_db > backup.sql"
    echo
    echo "Monitoring:"
    echo "  • PM2 Monitor: pm2 monit"
    echo "  • System Logs: tail -f logs/combined.log"
    echo
    echo "Next Steps:"
    echo "  1. Configure domain and DNS"
    echo "  2. Setup SSL certificate"
    echo "  3. Configure firewall"
    echo "  4. Setup log rotation"
    echo "  5. Configure monitoring alerts"
    echo
}

# Main deployment function
main() {
    echo "Starting production deployment for The Saffron Lounge..."
    echo

    check_permissions
    check_system
    setup_environment
    install_dependencies
    setup_database
    build_application
    setup_pm2

    read -p "Setup Nginx reverse proxy? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_nginx
    fi

    read -p "Setup SSL certificate? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        setup_ssl
    fi

    start_application
    setup_monitoring
    create_backup_script
    display_summary
}

# Handle command line arguments
case "${1:-}" in
    "start")
        print_status "Starting application..."
        pm2 start ecosystem.config.js --env production
        ;;
    "stop")
        print_status "Stopping application..."
        pm2 stop saffron-lounge-api
        ;;
    "restart")
        print_status "Restarting application..."
        pm2 restart saffron-lounge-api
        ;;
    "status")
        pm2 status
        ;;
    "logs")
        pm2 logs saffron-lounge-api
        ;;
    "backup")
        print_status "Running manual backup..."
        ./backup.sh
        ;;
    *)
        main
        ;;
esac