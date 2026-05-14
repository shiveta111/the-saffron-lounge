# PowerShell script to create and apply media table migration

Write-Host "📦 Creating migration for Media table..." -ForegroundColor Cyan

# Navigate to backend directory
Set-Location $PSScriptRoot\..

# Create and apply migration
Write-Host "Creating migration..." -ForegroundColor Yellow
npx prisma migrate dev --name add_media_table

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
Write-Host "📝 Media table has been created in the database." -ForegroundColor Green
