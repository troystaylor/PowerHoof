# PowerHoof Azure Deployment Script
# Deploy to Azure Container Apps with Azure OpenAI (Managed Identity)

param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroup,
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "eastus2",
    
    [Parameter(Mandatory=$false)]
    [string]$AppName = "powerhoof",
    
    [Parameter(Mandatory=$false)]
    [string]$AzureOpenAIEndpoint,
    
    [Parameter(Mandatory=$false)]
    [string]$AzureOpenAIDeployment = "gpt-4o",
    
    [switch]$CreateOpenAI,
    [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"

Write-Host "=== PowerHoof Azure Deployment ===" -ForegroundColor Cyan

# Login check
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Please login to Azure..." -ForegroundColor Yellow
    az login
}
Write-Host "Using subscription: $($account.name)" -ForegroundColor Green

# Create resource group
Write-Host "`nCreating resource group '$ResourceGroup' in '$Location'..." -ForegroundColor Yellow
az group create --name $ResourceGroup --location $Location --output none

# Variables
$acrName = "$($AppName)acr".ToLower() -replace '[^a-z0-9]', ''
$envName = "$AppName-env"
$containerAppName = "$AppName-api"
$openaiName = "$AppName-openai"

# Create Azure Container Registry
Write-Host "`nCreating Azure Container Registry '$acrName'..." -ForegroundColor Yellow
az acr create `
    --resource-group $ResourceGroup `
    --name $acrName `
    --sku Basic `
    --admin-enabled true `
    --output none

$acrServer = az acr show --name $acrName --query loginServer -o tsv
$acrPassword = az acr credential show --name $acrName --query "passwords[0].value" -o tsv

Write-Host "ACR created: $acrServer" -ForegroundColor Green

# Create Azure OpenAI if requested
if ($CreateOpenAI -or -not $AzureOpenAIEndpoint) {
    Write-Host "`nCreating Azure OpenAI resource '$openaiName'..." -ForegroundColor Yellow
    az cognitiveservices account create `
        --name $openaiName `
        --resource-group $ResourceGroup `
        --location $Location `
        --kind OpenAI `
        --sku s0 `
        --custom-domain $openaiName `
        --output none 2>$null
    
    $AzureOpenAIEndpoint = "https://$openaiName.openai.azure.com"
    
    Write-Host "Deploying GPT-4o model..." -ForegroundColor Yellow
    az cognitiveservices account deployment create `
        --name $openaiName `
        --resource-group $ResourceGroup `
        --deployment-name $AzureOpenAIDeployment `
        --model-name gpt-4o `
        --model-version "2024-08-06" `
        --model-format OpenAI `
        --sku-capacity 10 `
        --sku-name Standard `
        --output none 2>$null
    
    Write-Host "Azure OpenAI endpoint: $AzureOpenAIEndpoint" -ForegroundColor Green
}

# Build and push Docker image using ACR Tasks (no Docker needed locally)
if (-not $SkipBuild) {
    Write-Host "`nBuilding Docker image using ACR Tasks..." -ForegroundColor Yellow
    
    az acr build `
        --registry $acrName `
        --resource-group $ResourceGroup `
        --image "${containerAppName}:latest" `
        --file Dockerfile `
        . 
    
    Write-Host "Image built and pushed: $acrServer/${containerAppName}:latest" -ForegroundColor Green
}

# Create Container Apps Environment
Write-Host "`nCreating Container Apps Environment '$envName'..." -ForegroundColor Yellow
az containerapp env create `
    --name $envName `
    --resource-group $ResourceGroup `
    --location $Location `
    --output none

# Deploy Container App with User-Assigned Managed Identity
Write-Host "`nDeploying Container App '$containerAppName' with Managed Identity..." -ForegroundColor Yellow

# Create the container app
az containerapp create `
    --name $containerAppName `
    --resource-group $ResourceGroup `
    --environment $envName `
    --image "$acrServer/${containerAppName}:latest" `
    --registry-server $acrServer `
    --registry-username $acrName `
    --registry-password $acrPassword `
    --target-port 3000 `
    --ingress external `
    --cpu 1 `
    --memory 2Gi `
    --min-replicas 1 `
    --max-replicas 3 `
    --system-assigned `
    --env-vars `
        "NODE_ENV=production" `
        "PORT=3000" `
        "AZURE_OPENAI_ENDPOINT=$AzureOpenAIEndpoint" `
        "AZURE_OPENAI_USE_MANAGED_IDENTITY=true" `
        "PRIMARY_MODEL=azure-openai/$AzureOpenAIDeployment" `
    --output none

# Get the Container App's principal ID and assign Cognitive Services role
Write-Host "`nAssigning Cognitive Services User role to Container App..." -ForegroundColor Yellow
$principalId = az containerapp show `
    --name $containerAppName `
    --resource-group $ResourceGroup `
    --query "identity.principalId" -o tsv

$openaiResourceId = az cognitiveservices account show `
    --name $openaiName `
    --resource-group $ResourceGroup `
    --query id -o tsv

az role assignment create `
    --assignee $principalId `
    --role "Cognitive Services OpenAI User" `
    --scope $openaiResourceId `
    --output none 2>$null

# Get the app URL
$appUrl = az containerapp show `
    --name $containerAppName `
    --resource-group $ResourceGroup `
    --query "properties.configuration.ingress.fqdn" -o tsv

Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
Write-Host "App URL: https://$appUrl" -ForegroundColor Cyan
Write-Host "`nTest endpoints:" -ForegroundColor Yellow
Write-Host "  Health:  https://$appUrl/health"
Write-Host "  Chat:    https://$appUrl/chat"
Write-Host "  Stream:  https://$appUrl/chat/stream"

Write-Host "`nExample test:" -ForegroundColor Yellow
Write-Host @"
Invoke-RestMethod -Uri "https://$appUrl/health" -Method GET

Invoke-RestMethod -Uri "https://$appUrl/chat" ``
    -Method POST ``
    -ContentType "application/json" ``
    -Body '{"message":"Hello, PowerHoof!"}'
"@

Write-Host "`n=== Resources Created ===" -ForegroundColor Cyan
Write-Host "  Resource Group:     $ResourceGroup"
Write-Host "  Container Registry: $acrName"
Write-Host "  Container App:      $containerAppName (with System Managed Identity)"
Write-Host "  Azure OpenAI:       $openaiName ($AzureOpenAIEndpoint)"
Write-Host "`nNote: Using Managed Identity for Azure OpenAI authentication (no API keys)."
