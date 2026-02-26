# Pre-deploy hook
# Runs before app deployment

Write-Host "🔧 Pre-deploy: Building application..." -ForegroundColor Cyan

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Gray
npm ci

# Build TypeScript
Write-Host "🔨 Building TypeScript..." -ForegroundColor Gray
npm run build

# Run linting
Write-Host "🔍 Running lints..." -ForegroundColor Gray
npm run lint --if-present

# Run tests (optional, can be skipped in CI)
if ($env:RUN_TESTS -eq "true") {
    Write-Host "🧪 Running tests..." -ForegroundColor Gray
    npm run test:run
}

Write-Host ""
Write-Host "✅ Pre-deploy complete" -ForegroundColor Green
