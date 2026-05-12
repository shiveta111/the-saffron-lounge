@echo off
REM The Saffron Lounge - MySQL Database Setup Script (Windows)
REM This script sets up the complete MySQL database environment

echo 🍲 The Saffron Lounge - MySQL Database Setup
echo ==============================================

REM Colors for Windows CMD (limited support)
REM We'll use simple text indicators

echo [INFO] Checking prerequisites...

REM Check if MySQL is installed
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] MySQL is not installed or not in PATH.
    echo Please install MySQL Server and ensure it's in your PATH.
    echo Download from: https://dev.mysql.com/downloads/mysql/
    pause
    exit /b 1
)

echo [SUCCESS] MySQL is installed

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed.
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [SUCCESS] Node.js is installed

REM Create database
echo [INFO] Creating database...
mysql -u root -p < setup-mysql.sql
if %errorlevel% neq 0 (
    echo [ERROR] Failed to create database. Please check your MySQL credentials.
    pause
    exit /b 1
)

echo [SUCCESS] Database created successfully

REM Generate Prisma client
echo [INFO] Generating Prisma client...
npx prisma generate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to generate Prisma client
    pause
    exit /b 1
)

echo [SUCCESS] Prisma client generated

REM Run migrations
echo [INFO] Running database migrations...
npx prisma migrate deploy
if %errorlevel% neq 0 (
    echo [ERROR] Failed to run migrations
    pause
    exit /b 1
)

echo [SUCCESS] Migrations completed

REM Seed database
echo [INFO] Seeding database with initial data...
node prisma/seed.js
if %errorlevel% neq 0 (
    echo [ERROR] Failed to seed database
    pause
    exit /b 1
)

echo [SUCCESS] Database seeded

REM Test connection
echo [INFO] Testing database connection...
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.count().then(count => {
    console.log('✅ Database connection successful. Users count:', count);
    process.exit(0);
}).catch(error => {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
});
"
if %errorlevel% neq 0 (
    echo [ERROR] Database connection test failed
    pause
    exit /b 1
)

echo [SUCCESS] Database connection test passed

REM Setup complete
echo.
echo 🎉 Setup Complete!
echo ==================
echo.
echo Database Details:
echo   • Database: saffron_db
echo   • Host: localhost:3306
echo   • Root User: root
echo   • Root Password: [your MySQL root password]
echo.
echo Test Users:
echo   • Admin: admin@saffronlounge.com / admin123
echo   • Manager: manager@saffronlounge.com / manager123
echo   • Customer: customer@test.com / customer123
echo.
echo Next Steps:
echo   1. Start the backend server: npm start
echo   2. Access API docs: http://localhost:8000/api-docs
echo   3. Test the application
echo.
echo Press any key to continue...
pause >nul