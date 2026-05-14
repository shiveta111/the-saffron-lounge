#!/bin/bash

# The Saffron Lounge - MySQL Database Setup Script
# This script sets up the complete MySQL database environment

set -e

echo "🍲 The Saffron Lounge - MySQL Database Setup"
echo "=============================================="

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

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi

    print_success "Docker and Docker Compose are installed"
}

# Start MySQL container
start_mysql() {
    print_status "Starting MySQL container..."

    if docker ps | grep -q mysql-saffron; then
        print_warning "MySQL container is already running"
        return
    fi

    docker-compose up -d mysql

    print_status "Waiting for MySQL to be ready..."
    sleep 30

    # Wait for MySQL to be healthy
    max_attempts=30
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if docker exec mysql-saffron mysqladmin ping -h localhost --silent; then
            print_success "MySQL is ready!"
            break
        fi
        print_status "Waiting for MySQL... (attempt $attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done

    if [ $attempt -gt $max_attempts ]; then
        print_error "MySQL failed to start properly"
        exit 1
    fi
}

# Setup database and run migrations
setup_database() {
    print_status "Setting up database schema and running migrations..."

    # Generate Prisma client
    npx prisma generate

    # Run migrations
    npx prisma migrate deploy

    print_success "Database schema created successfully"
}

# Seed database with initial data
seed_database() {
    print_status "Seeding database with initial data..."

    # Run the seed script
    node prisma/seed.js

    print_success "Database seeded successfully"
}

# Test database connection
test_connection() {
    print_status "Testing database connection..."

    # Test with a simple query
    if npx ts-node -e "
        import { PrismaClient } from '@prisma/client';
        const prisma = new PrismaClient();
        prisma.user.count().then(count => {
            console.log('✅ Database connection successful. Users count:', count);
            process.exit(0);
        }).catch(error => {
            console.error('❌ Database connection failed:', error);
            process.exit(1);
        });
    "; then
        print_success "Database connection test passed"
    else
        print_error "Database connection test failed"
        exit 1
    fi
}

# Start PHPMyAdmin (optional)
start_phpmyadmin() {
    print_status "Starting PHPMyAdmin..."

    docker-compose up -d phpmyadmin

    print_success "PHPMyAdmin started at http://localhost:8080"
    print_status "  Username: root"
    print_status "  Password: password"
    print_status "  Database: saffron_db"
}

# Display setup summary
display_summary() {
    echo ""
    echo "🎉 Setup Complete!"
    echo "=================="
    echo ""
    echo "Database Details:"
    echo "  • Database: saffron_db"
    echo "  • Host: localhost:3306"
    echo "  • Root User: root"
    echo "  • Root Password: password"
    echo "  • App User: saffron_user"
    echo "  • App Password: saffron_pass"
    echo ""
    echo "Services:"
    echo "  • MySQL: localhost:3306"
    echo "  • PHPMyAdmin: http://localhost:8080"
    echo ""
    echo "Test Users:"
    echo "  • Admin: admin@saffronlounge.com / admin123"
    echo "  • Manager: manager@saffronlounge.com / manager123"
    echo "  • Customer: customer@test.com / customer123"
    echo ""
    echo "Next Steps:"
    echo "  1. Start the backend server: npm start"
    echo "  2. Access API docs: http://localhost:8000/api-docs"
    echo "  3. Test the application"
    echo ""
}

# Main setup function
main() {
    echo "Starting MySQL database setup for The Saffron Lounge..."
    echo ""

    check_docker
    start_mysql
    setup_database
    seed_database
    test_connection

    echo ""
    read -p "Do you want to start PHPMyAdmin? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_phpmyadmin
    fi

    display_summary
}

# Handle command line arguments
case "${1:-}" in
    "start")
        print_status "Starting existing MySQL container..."
        docker-compose up -d mysql
        ;;
    "stop")
        print_status "Stopping MySQL container..."
        docker-compose down
        ;;
    "restart")
        print_status "Restarting MySQL container..."
        docker-compose restart mysql
        ;;
    "logs")
        print_status "Showing MySQL logs..."
        docker-compose logs -f mysql
        ;;
    "shell")
        print_status "Connecting to MySQL shell..."
        docker exec -it mysql-saffron mysql -u root -p saffron_db
        ;;
    "backup")
        print_status "Creating database backup..."
        docker exec mysql-saffron mysqldump -u root -p saffron_db > "backup_$(date +%Y%m%d_%H%M%S).sql"
        print_success "Backup created: backup_$(date +%Y%m%d_%H%M%S).sql"
        ;;
    "reset")
        print_warning "This will reset the entire database. Are you sure? (y/n): "
        read -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_status "Resetting database..."
            docker-compose down -v
            docker-compose up -d mysql
            sleep 30
            setup_database
            seed_database
            print_success "Database reset complete"
        fi
        ;;
    *)
        main
        ;;
esac