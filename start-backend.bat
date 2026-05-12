@echo off
cd /d "%~dp0backend"

if not exist "node_modules" (
    echo Installing backend dependencies...
    npm install
)

if not exist "node_modules\.bin\ts-node-dev.cmd" (
    echo Installing missing dev tools...
    npm install
)

echo Generating Prisma client...
npx prisma generate

echo Starting backend...
npm run dev
