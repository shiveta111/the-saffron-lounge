# Fix Prisma Client for Promotions Module
# IMPORTANT: Stop the backend server before running this script!

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Fixing Prisma Client for Promotions Module       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  IMPORTANT: Make sure the backend server is STOPPED!" -ForegroundColor Yellow
Write-Host "   If you see 'EPERM' errors, stop the server and try again." -ForegroundColor Yellow
Write-Host ""

# Step 1: Generate Prisma Client
Write-Host "📦 Step 1: Regenerating Prisma Client..." -ForegroundColor Cyan
try {
    npx prisma generate
    Write-Host "✅ Prisma client regenerated successfully" -ForegroundColor Green
    Write-Host ""
} catch {
    if ($_.Exception.Message -like "*EPERM*" -or $_.Exception.Message -like "*locked*") {
        Write-Host ""
        Write-Host "❌ ERROR: Prisma client files are locked!" -ForegroundColor Red
        Write-Host "   The backend server is still running." -ForegroundColor Red
        Write-Host "   Please stop the server (Ctrl+C) and run this script again." -ForegroundColor Red
        Write-Host ""
        exit 1
    }
    throw
}

# Step 2: Run migrations
Write-Host "🚀 Step 2: Running database migrations..." -ForegroundColor Cyan
try {
    npx prisma migrate dev --name add_promotions_module
    Write-Host "✅ Migrations completed successfully" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host ""
    Write-Host "⚠️  Migration failed. Trying to push schema directly..." -ForegroundColor Yellow
    Write-Host ""
    
    try {
        npx prisma db push --skip-generate
        Write-Host "✅ Schema pushed successfully" -ForegroundColor Green
        Write-Host ""
    } catch {
        Write-Host ""
        Write-Host "❌ Schema push also failed." -ForegroundColor Red
        Write-Host "   Please check your database connection and try again." -ForegroundColor Red
        Write-Host ""
        exit 1
    }
}

Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║              ✅ Fix Complete!                          ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Start the backend server: npm start"
Write-Host "   2. Try creating a promotion again"
Write-Host ""




















