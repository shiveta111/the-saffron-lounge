# Script to restart backend server with Prisma client regeneration
Write-Host "Stopping backend server processes..." -ForegroundColor Yellow

# Find and stop Node processes running the backend
$backendProcesses = Get-Process node -ErrorAction SilentlyContinue | Where-Object {
    $_.Path -like "*SAFFRON_FULLSTACK*"
}

if ($backendProcesses) {
    Write-Host "Found $($backendProcesses.Count) Node processes. Please stop them manually or use Ctrl+C in the terminal where backend is running."
    Write-Host "After stopping, run: npx prisma generate" -ForegroundColor Green
    Write-Host "Then restart with: npm run dev" -ForegroundColor Green
} else {
    Write-Host "No backend processes found. Regenerating Prisma client..." -ForegroundColor Green
    npx prisma generate
    Write-Host "Prisma client regenerated. You can now start the backend with: npm run dev" -ForegroundColor Green
}

























