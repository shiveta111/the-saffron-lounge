#!/bin/bash

# Saffron Lounge - Docker Setup Verification Script
# This script verifies that Docker volumes are properly configured for database persistence

echo "🔍 Verifying Docker setup for database persistence..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed or not in PATH"
    echo "   Please install Docker Desktop from https://www.docker.com/products/docker-desktop"
    exit 1
fi

echo "✅ Docker is installed"

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running"
    echo "   Please start Docker Desktop"
    exit 1
fi

echo "✅ Docker is running"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "⚠️  docker-compose command not found, trying 'docker compose'"
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo "✅ Docker Compose is available"
echo ""

# Check for existing volume
echo "📦 Checking for existing MySQL volume..."
if docker volume ls | grep -q "saffron_mysql_data"; then
    echo "✅ Volume 'saffron_mysql_data' exists"
    
    # Inspect the volume
    echo ""
    echo "📊 Volume details:"
    docker volume inspect saffron_mysql_data
    echo ""
else
    echo "⚠️  Volume 'saffron_mysql_data' does not exist yet"
    echo "   It will be created when you run 'docker-compose up'"
    echo ""
fi

# Check if containers are running
echo "🐳 Checking Docker containers..."
if docker ps | grep -q "mysql-saffron"; then
    echo "✅ MySQL container is running"
    
    # Check container health
    HEALTH=$(docker inspect --format='{{.State.Health.Status}}' mysql-saffron 2>/dev/null)
    if [ "$HEALTH" = "healthy" ]; then
        echo "✅ MySQL container is healthy"
    else
        echo "⚠️  MySQL container health status: $HEALTH"
    fi
else
    echo "⚠️  MySQL container is not running"
    echo "   Start it with: docker-compose up -d"
fi

echo ""
echo "📋 Summary:"
echo "   - Docker: ✅ Installed and running"
echo "   - Volume: $(docker volume ls | grep -q 'saffron_mysql_data' && echo '✅ Exists' || echo '⚠️  Will be created')"
echo "   - Container: $(docker ps | grep -q 'mysql-saffron' && echo '✅ Running' || echo '⚠️  Not running')"
echo ""

# Provide next steps
if ! docker ps | grep -q "mysql-saffron"; then
    echo "🚀 Next steps:"
    echo "   1. Start Docker containers: docker-compose up -d"
    echo "   2. Wait for MySQL to be healthy (30 seconds)"
    echo "   3. Run database migrations: npm run db:push"
    echo "   4. Seed the database: npm run db:seed"
    echo "   5. Start the backend: npm run dev"
else
    echo "✅ Setup looks good! Your database should persist across restarts."
    echo ""
    echo "🧪 To test persistence:"
    echo "   1. Create some data in the database"
    echo "   2. Stop containers: docker-compose down"
    echo "   3. Start containers: docker-compose up -d"
    echo "   4. Verify data still exists"
fi

echo ""
