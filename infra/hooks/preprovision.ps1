# Pre-provision hook
# Runs before Azure resources are created

Write-Host "🔧 Pre-provision: Validating environment..." -ForegroundColor Cyan

# Check for required tools
$requiredTools = @("az", "docker")
foreach ($tool in $requiredTools) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Error "❌ Required tool not found: $tool"
        exit 1
    }
}

# Verify Azure CLI is logged in
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Error "❌ Not logged into Azure CLI. Run 'az login' first."
    exit 1
}

Write-Host "✅ Pre-provision checks passed" -ForegroundColor Green
Write-Host "   Subscription: $($account.name)" -ForegroundColor Gray
Write-Host "   Tenant: $($account.tenantId)" -ForegroundColor Gray
