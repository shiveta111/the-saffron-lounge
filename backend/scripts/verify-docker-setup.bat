@echo off
REM Saffron Lounge - Docker Setup Verification Script (Windows)
REM This script verifies that Docker volumes are properly configured for database persistence

echo.
echo 🔍 Verifying Docker setup for database persistence...
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed or not in PATH
    echo    Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    exit /b 1
)

echo ✅ Docker is installed

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running
    echo    Please start Docker Desktop
    exit /b 1
)

echo ✅ Docker is running
echo.

REM Check for existing volume
echo 📦 Checking for existing MySQL volume...
docker volume ls | findstr "saffron_mysql_data" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Volume 'saffron_mysql_data' exists
    echo.
    echo 📊 Volume details:
    docker volume inspect saffron_mysql_data
    echo.
) else (
    echo ⚠️  Volume 'saffron_mysql_data' does not exist yet
    echo    It will be created when you run 'docker-compose up'
    echo.
)

REM Check if containers are running
echo 🐳 Checking Docker containers...
docker ps | findstr "mysql-saffron" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ MySQL container is running
    
    REM Check container health
    for /f "tokens=*" %%i in ('docker inspect --format="{{.State.Health.Status}}" mysql-saffron 2^>nul') do set HEALTH=%%i
    if "%HEALTH%"=="healthy" (
        echo ✅ MySQL container is healthy
    ) else (
        echo ⚠️  MySQL container health status: %HEALTH%
    )
) else (
    echo ⚠️  MySQL container is not running
    echo    Start it with: docker-compose up -d
)

echo.
echo 📋 Summary:
docker volume ls | findstr "saffron_mysql_data" >nul 2>&1
if %errorlevel% equ 0 (
    echo    - Volume: ✅ Exists
) else (
    echo    - Volume: ⚠️  Will be created
)

docker ps | findstr "mysql-saffron" >nul 2>&1
if %errorlevel% equ 0 (
    echo    - Container: ✅ Running
) else (
    echo    - Container: ⚠️  Not running
)
echo.

REM Provide next steps
docker ps | findstr "mysql-saffron" >nul 2>&1
if %errorlevel% neq 0 (
    echo 🚀 Next steps:
    echo    1. Start Docker containers: docker-compose up -d
    echo    2. Wait for MySQL to be healthy (30 seconds^)
    echo    3. Run database migrations: npm run db:push
    echo    4. Seed the database: npm run db:seed
    echo    5. Start the backend: npm run dev
) else (
    echo ✅ Setup looks good! Your database should persist across restarts.
    echo.
    echo 🧪 To test persistence:
    echo    1. Create some data in the database
    echo    2. Stop containers: docker-compose down
    echo    3. Start containers: docker-compose up -d
    echo    4. Verify data still exists
)

echo.
pause
