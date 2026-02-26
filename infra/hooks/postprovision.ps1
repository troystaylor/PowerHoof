# Post-provision hook
# Runs after Azure resources are created

Write-Host "🔧 Post-provision: Configuring resources..." -ForegroundColor Cyan

# Get outputs from Bicep deployment
$outputs = azd env get-values

# Extract values
$acrServer = $outputs | Where-Object { $_ -match "AZURE_CONTAINER_REGISTRY_ENDPOINT" } | ForEach-Object { ($_ -split "=")[1].Trim('"') }
$openAiEndpoint = $outputs | Where-Object { $_ -match "AZURE_OPENAI_ENDPOINT" } | ForEach-Object { ($_ -split "=")[1].Trim('"') }
$cosmosEndpoint = $outputs | Where-Object { $_ -match "AZURE_COSMOS_ENDPOINT" } | ForEach-Object { ($_ -split "=")[1].Trim('"') }

Write-Host ""
Write-Host "📋 Provisioned Resources:" -ForegroundColor Yellow
Write-Host "   Container Registry: $acrServer" -ForegroundColor Gray
Write-Host "   Azure OpenAI: $openAiEndpoint" -ForegroundColor Gray
Write-Host "   Cosmos DB: $cosmosEndpoint" -ForegroundColor Gray

# Build and push Nushell container
Write-Host ""
Write-Host "🐳 Building Nushell session container..." -ForegroundColor Cyan

$nushellDockerfile = Join-Path $PSScriptRoot "..\containers\nushell\Dockerfile"
$nushellContext = Join-Path $PSScriptRoot "..\containers\nushell"

if (Test-Path $nushellDockerfile) {
    # Login to ACR
    az acr login --name ($acrServer -replace "\.azurecr\.io", "")
    
    # Build and push
    docker build -t "$acrServer/powerhoof-nushell:latest" -f $nushellDockerfile $nushellContext
    docker push "$acrServer/powerhoof-nushell:latest"
    
    Write-Host "✅ Nushell container pushed" -ForegroundColor Green
} else {
    Write-Host "⚠️ Nushell Dockerfile not found, skipping" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Post-provision complete" -ForegroundColor Green
