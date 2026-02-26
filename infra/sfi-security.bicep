/*
  PowerHoof SFI Security Module
  
  Implements Microsoft Secure Future Initiative requirements:
  - Application Insights (Monitor & Detect)
  - Virtual Network with Private Endpoints (Protect Networks)
  - Diagnostic Settings (Unified Telemetry)
*/

targetScope = 'resourceGroup'

@description('Environment name')
param environmentName string

@description('Primary location')
param location string

@description('Unique suffix for resource names')
param uniqueSuffix string

@description('Log Analytics Workspace ID')
param logAnalyticsWorkspaceId string

@description('Key Vault resource ID')
param keyVaultId string

@description('Cosmos DB resource ID')
param cosmosAccountId string

@description('OpenAI resource ID')
param openAiId string

@description('Key Vault name (for diagnostic settings)')
param keyVaultName string

@description('Enable Private Endpoints (production-recommended)')
param enablePrivateEndpoints bool = false

var tags = {
  'azd-env-name': environmentName
  project: 'PowerHoof'
  sfiCompliant: 'true'
}

// ============================================
// Application Insights (SFI: Monitor & Detect)
// ============================================

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'ai-powerhoof-${uniqueSuffix}'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Flow_Type: 'Bluefield'
    Request_Source: 'rest'
    WorkspaceResourceId: logAnalyticsWorkspaceId
    RetentionInDays: 90
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ============================================
// Virtual Network (SFI: Protect Networks)
// ============================================

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = if (enablePrivateEndpoints) {
  name: 'vnet-powerhoof-${uniqueSuffix}'
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
    subnets: [
      {
        name: 'snet-app'
        properties: {
          addressPrefix: '10.0.1.0/24'
          delegations: [
            {
              name: 'containerApps'
              properties: {
                serviceName: 'Microsoft.App/environments'
              }
            }
          ]
        }
      }
      {
        name: 'snet-pe'
        properties: {
          addressPrefix: '10.0.2.0/24'
          privateEndpointNetworkPolicies: 'Disabled'
        }
      }
    ]
  }
}

// ============================================
// Private DNS Zones (SFI: Protect Networks)
// ============================================

resource privateDnsZoneKeyVault 'Microsoft.Network/privateDnsZones@2020-06-01' = if (enablePrivateEndpoints) {
  name: 'privatelink.vaultcore.azure.net'
  location: 'global'
  tags: tags
}

resource privateDnsZoneCosmos 'Microsoft.Network/privateDnsZones@2020-06-01' = if (enablePrivateEndpoints) {
  name: 'privatelink.documents.azure.com'
  location: 'global'
  tags: tags
}

resource privateDnsZoneOpenAi 'Microsoft.Network/privateDnsZones@2020-06-01' = if (enablePrivateEndpoints) {
  name: 'privatelink.openai.azure.com'
  location: 'global'
  tags: tags
}

// Link DNS zones to VNet
resource vnetLinkKeyVault 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = if (enablePrivateEndpoints) {
  parent: privateDnsZoneKeyVault
  name: 'link-kv'
  location: 'global'
  properties: {
    virtualNetwork: {
      id: vnet!.id
    }
    registrationEnabled: false
  }
}

resource vnetLinkCosmos 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = if (enablePrivateEndpoints) {
  parent: privateDnsZoneCosmos
  name: 'link-cosmos'
  location: 'global'
  properties: {
    virtualNetwork: {
      id: vnet!.id
    }
    registrationEnabled: false
  }
}

resource vnetLinkOpenAi 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = if (enablePrivateEndpoints) {
  parent: privateDnsZoneOpenAi
  name: 'link-openai'
  location: 'global'
  properties: {
    virtualNetwork: {
      id: vnet!.id
    }
    registrationEnabled: false
  }
}

// ============================================
// Private Endpoints (SFI: Protect Networks)
// ============================================

resource privateEndpointKeyVault 'Microsoft.Network/privateEndpoints@2023-11-01' = if (enablePrivateEndpoints) {
  name: 'pe-kv-${uniqueSuffix}'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: vnet!.properties.subnets[1].id
    }
    privateLinkServiceConnections: [
      {
        name: 'plsc-kv'
        properties: {
          privateLinkServiceId: keyVaultId
          groupIds: ['vault']
        }
      }
    ]
  }
}

resource privateEndpointCosmos 'Microsoft.Network/privateEndpoints@2023-11-01' = if (enablePrivateEndpoints) {
  name: 'pe-cosmos-${uniqueSuffix}'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: vnet!.properties.subnets[1].id
    }
    privateLinkServiceConnections: [
      {
        name: 'plsc-cosmos'
        properties: {
          privateLinkServiceId: cosmosAccountId
          groupIds: ['Sql']
        }
      }
    ]
  }
}

resource privateEndpointOpenAi 'Microsoft.Network/privateEndpoints@2023-11-01' = if (enablePrivateEndpoints) {
  name: 'pe-openai-${uniqueSuffix}'
  location: location
  tags: tags
  properties: {
    subnet: {
      id: vnet!.properties.subnets[1].id
    }
    privateLinkServiceConnections: [
      {
        name: 'plsc-openai'
        properties: {
          privateLinkServiceId: openAiId
          groupIds: ['account']
        }
      }
    ]
  }
}

// Private DNS Zone Groups
resource peDnsGroupKeyVault 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = if (enablePrivateEndpoints) {
  parent: privateEndpointKeyVault
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'config'
        properties: {
          privateDnsZoneId: privateDnsZoneKeyVault.id
        }
      }
    ]
  }
}

resource peDnsGroupCosmos 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = if (enablePrivateEndpoints) {
  parent: privateEndpointCosmos
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'config'
        properties: {
          privateDnsZoneId: privateDnsZoneCosmos.id
        }
      }
    ]
  }
}

resource peDnsGroupOpenAi 'Microsoft.Network/privateEndpoints/privateDnsZoneGroups@2023-11-01' = if (enablePrivateEndpoints) {
  parent: privateEndpointOpenAi
  name: 'default'
  properties: {
    privateDnsZoneConfigs: [
      {
        name: 'config'
        properties: {
          privateDnsZoneId: privateDnsZoneOpenAi.id
        }
      }
    ]
  }
}

// ============================================
// Diagnostic Settings (SFI: Unified Telemetry)
// ============================================

// Reference existing Key Vault for diagnostic settings
resource existingKeyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource keyVaultDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'diag-kv'
  scope: existingKeyVault
  properties: {
    workspaceId: logAnalyticsWorkspaceId
    logs: [
      {
        category: 'AuditEvent'
        enabled: true
      }
    ]
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

// ============================================
// Outputs
// ============================================

output applicationInsightsConnectionString string = appInsights.properties.ConnectionString
output applicationInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
output vnetId string = enablePrivateEndpoints ? vnet!.id : ''
output appSubnetId string = enablePrivateEndpoints ? vnet!.properties.subnets[0].id : ''
