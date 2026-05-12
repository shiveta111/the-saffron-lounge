#!/bin/bash

# The Saffron Lounge - Emergency Rollback Script
# This script performs an emergency rollback to the previous stable state

set -e

echo "🚨 The Saffron Lounge - Emergency Rollback Script"
echo "================================================="

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

# Check if running as appropriate user
check_permissions() {
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. This is not recommended for rollback operations."
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Get current environment
get_environment() {
    if [ -f .env ]; then
        ENV=$(grep "^NODE_ENV=" .env | cut -d '=' -f2)
        echo "$ENV"
    else
        echo "production"
    fi
}

# Backup current state before rollback
backup_current_state() {
    print_status "Creating backup of current state..."

    BACKUP_DIR="./emergency-backups"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_PATH="$BACKUP_DIR/rollback_$TIMESTAMP"

    mkdir -p "$BACKUP_PATH"

    # Backup application files
    cp -r dist "$BACKUP_PATH/" 2>/dev/null || true
    cp -r node_modules "$BACKUP_PATH/" 2>/dev/null || true
    cp .env "$BACKUP_PATH/" 2>/dev/null || true
    cp ecosystem.config.js "$BACKUP_PATH/" 2>/dev/null || true

    # Backup database schema
    if command -v mysqldump &> /dev/null; then
        mysqldump --no-data saffron_db > "$BACKUP_PATH/schema_backup.sql" 2>/dev/null || true
    fi

    print_success "Current state backed up to: $BACKUP_PATH"
}

# Stop application
stop_application() {
    print_status "Stopping application..."

    # Try PM2 first
    if command -v pm2 &> /dev/null; then
        pm2 stop thesaffronlounge-backend 2>/dev/null || true
        pm2 delete thesaffronlounge-backend 2>/dev/null || true
        print_success "Application stopped via PM2"
    else
        print_warning "PM2 not found, attempting manual process kill"

        # Find and kill Node.js processes
        pkill -f "node.*server.ts" || pkill -f "node.*dist/server.js" || true
        print_success "Application processes terminated"
    fi
}

# Rollback code
rollback_code() {
    print_status "Rolling back application code..."

    # Check if we have git
    if ! command -v git &> /dev/null; then
        print_error "Git not found. Cannot perform code rollback."
        return 1
    fi

    # Get current commit
    CURRENT_COMMIT=$(git rev-parse HEAD)
    print_status "Current commit: $CURRENT_COMMIT"

    # Reset to previous commit
    print_status "Resetting to previous commit..."
    git reset --hard HEAD~1

    PREVIOUS_COMMIT=$(git rev-parse HEAD)
    print_success "Rolled back from $CURRENT_COMMIT to $PREVIOUS_COMMIT"
}

# Restore dependencies
restore_dependencies() {
    print_status "Restoring dependencies..."

    if [ -f package.json ]; then
        # Clean install
        rm -rf node_modules package-lock.json
        npm ci --only=production
        print_success "Dependencies restored"
    else
        print_warning "package.json not found, skipping dependency restoration"
    fi
}

# Rebuild application
rebuild_application() {
    print_status "Rebuilding application..."

    if [ -f package.json ]; then
        # Generate Prisma client
        npx prisma generate 2>/dev/null || print_warning "Prisma generate failed"

        # Build if build script exists
        if npm run | grep -q "build"; then
            npm run build
            print_success "Application rebuilt"
        else
            print_warning "No build script found, assuming built application"
        fi
    else
        print_error "package.json not found, cannot rebuild"
        return 1
    fi
}

# Start application
start_application() {
    print_status "Starting application..."

    ENV=$(get_environment)

    if command -v pm2 &> /dev/null && [ -f ecosystem.config.js ]; then
        pm2 start ecosystem.config.js --env "$ENV"
        pm2 save
        print_success "Application started via PM2"
    else
        print_warning "PM2 or ecosystem.config.js not found, starting manually"

        # Start manually
        nohup node dist/server.js > app.log 2>&1 &
        echo $! > app.pid
        print_success "Application started manually (PID: $(cat app.pid))"
    fi
}

# Health check
perform_health_check() {
    print_status "Performing health check..."

    # Wait for application to start
    sleep 15

    # Get port from environment or default
    PORT=$(grep "^PORT=" .env 2>/dev/null | cut -d '=' -f2 || echo "8000")

    # Perform health check
    if curl -f -s "http://localhost:$PORT/api/health" > /dev/null; then
        print_success "Health check passed"
        return 0
    else
        print_error "Health check failed"
        return 1
    fi
}

# Notify about rollback
send_notification() {
    local success=$1

    if [ "$success" = true ]; then
        print_success "✅ Rollback completed successfully"
        echo
        echo "📋 Rollback Summary:"
        echo "  • Previous commit: $(git rev-parse HEAD~1 2>/dev/null || echo 'N/A')"
        echo "  • Current commit: $(git rev-parse HEAD 2>/dev/null || echo 'N/A')"
        echo "  • Environment: $(get_environment)"
        echo "  • Timestamp: $(date)"
        echo
        echo "🔍 Next Steps:"
        echo "  1. Monitor application logs"
        echo "  2. Test critical functionality"
        echo "  3. Notify team about rollback"
        echo "  4. Investigate root cause of original deployment"
    else
        print_error "❌ Rollback failed - manual intervention required"
        echo
        echo "🔧 Recovery Options:"
        echo "  1. Check emergency backup in ./emergency-backups/"
        echo "  2. Manually restore from backup"
        echo "  3. Contact development team"
        echo "  4. Check logs for error details"
    fi
}

# Main rollback function
main() {
    echo "Starting emergency rollback procedure..."
    echo

    check_permissions

    # Confirm rollback
    print_warning "This will rollback the application to the previous commit."
    read -p "Are you sure you want to proceed? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Rollback cancelled by user"
        exit 0
    fi

    local rollback_success=false

    # Execute rollback steps
    backup_current_state
    stop_application

    if rollback_code; then
        if restore_dependencies && rebuild_application; then
            if start_application; then
                if perform_health_check; then
                    rollback_success=true
                fi
            fi
        fi
    fi

    send_notification $rollback_success

    if [ "$rollback_success" = false ]; then
        exit 1
    fi
}

# Handle command line arguments
case "${1:-}" in
    "--help"|"-h")
        echo "The Saffron Lounge - Emergency Rollback Script"
        echo
        echo "Usage: $0 [options]"
        echo
        echo "Options:"
        echo "  --help, -h    Show this help message"
        echo "  --status      Show current application status"
        echo "  --backup      Create backup without rollback"
        echo
        echo "Description:"
        echo "  This script performs an emergency rollback of the application"
        echo "  to the previous git commit. Use with caution in production."
        ;;
    "--status")
        print_status "Checking application status..."
        if command -v pm2 &> /dev/null; then
            pm2 status
        else
            ps aux | grep -E "(node.*server|dist/server)" | grep -v grep || echo "No application processes found"
        fi
        ;;
    "--backup")
        backup_current_state
        ;;
    *)
        main
        ;;
esac