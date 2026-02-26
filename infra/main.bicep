/*
  PowerHoof Infrastructure
  
  Deploys all Azure resources for the PowerHoof AI agent:
  - Azure Container Apps (with Dynamic Sessions)
  - Azure OpenAI
  - Azure Cosmos DB
  - Azure Key Vault
  - Container Registry
  - Log Analytics
*/

targetScope = 'resourceGroup'

@description('Environment name (e.g., dev, staging, prod)')
param environmentName string

@description('Primary location for all resources')
param location string = resourceGroup().location

@description('Azure OpenAI model deployments')
param openAiModels array = [
  {
    name: 'gpt-4o'
    modelName: 'gpt-4o'
    version: '2024-08-06'
    capacity: 30
  }
  {
    name: 'o3'
    modelName: 'o3'
    version: '2025-01-31'
    capacity: 10
  }
]

@description('Enable Nushell Dynamic Sessions (requires specific regions)')
param enableDynamicSessions bool = true

// Tags applied to all resources
var tags = {
  'azd-env-name': environmentName
  project: 'PowerHoof'
}

// Unique suffix for globally unique names
var uniqueSuffix = uniqueString(resourceGroup().id, environmentName)

// ============================================
// Log Analytics Workspace
// ============================================

resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-powerhoof-${uniqueSuffix}'
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// ============================================
// Container Registry
// ============================================

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: 'crpowerhoof${uniqueSuffix}'
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
  }
}

// ============================================
// Key Vault
// ============================================

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: 'kv-powerhoof-${uniqueSuffix}'
  location: location
  tags: tags
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
  }
}

// ============================================
// Azure OpenAI
// ============================================

resource openAi 'Microsoft.CognitiveServices/accounts@2024-04-01-preview' = {
  name: 'oai-powerhoof-${uniqueSuffix}'
  location: location
  tags: tags
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: 'oai-powerhoof-${uniqueSuffix}'
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: true // Use Managed Identity only
  }
}

// Deploy OpenAI models
resource openAiDeployments 'Microsoft.CognitiveServices/accounts/deployments@2024-04-01-preview' = [for model in openAiModels: {
  parent: openAi
  name: model.name
  sku: {
    name: 'Standard'
    capacity: model.capacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: model.modelName
      version: model.version
    }
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
  }
}]

// ============================================
// Cosmos DB
// ============================================

resource cosmosAccount 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: 'cosmos-powerhoof-${uniqueSuffix}'
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    enableAutomaticFailover: false
    enableMultipleWriteLocations: false
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: true // Use Managed Identity only
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless' // Cost-effective for development
      }
    ]
  }
}

resource cosmosDatabase 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmosAccount
  name: 'powerhoof'
  properties: {
    resource: {
      id: 'powerhoof'
    }
  }
}

resource conversationsContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'conversations'
  properties: {
    resource: {
      id: 'conversations'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [{ path: '/*' }]
      }
    }
  }
}

resource memosContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'memos'
  properties: {
    resource: {
      id: 'memos'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
    }
  }
}

resource preferencesContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: cosmosDatabase
  name: 'preferences'
  properties: {
    resource: {
      id: 'preferences'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
    }
  }
}

// ============================================
// Container Apps Environment
// ============================================

resource containerAppEnv 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-powerhoof-${uniqueSuffix}'
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Dynamic Sessions Pool for Nushell execution
resource sessionPool 'Microsoft.App/sessionPools@2024-02-02-preview' = if (enableDynamicSessions) {
  name: 'sp-nushell-${uniqueSuffix}'
  location: location
  tags: tags
  properties: {
    environmentId: containerAppEnv.id
    poolManagementType: 'Dynamic'
    scaleConfiguration: {
      maxConcurrentSessions: 20
      readySessionInstances: 2
    }
    containerType: 'CustomContainer'
    dynamicPoolConfiguration: {
      executionType: 'Timed'
      cooldownPeriodInSeconds: 300
    }
    customContainerTemplate: {
      containers: [
        {
          name: 'nushell'
          image: '${containerRegistry.properties.loginServer}/powerhoof-nushell:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          command: [
            '/bin/sh'
            '-c'
            'while true; do sleep 3600; done'
          ]
        }
      ]
    }
  }
}

// ============================================
// Container App - PowerHoof API
// ============================================

resource containerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-powerhoof-${uniqueSuffix}'
  location: location
  tags: tags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        corsPolicy: {
          allowedOrigins: ['*']
          allowedMethods: ['GET', 'POST', 'DELETE', 'OPTIONS']
          allowedHeaders: ['*']
        }
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          identity: 'system'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'powerhoof'
          image: '${containerRegistry.properties.loginServer}/powerhoof:latest'
          resources: {
            cpu: json('1.0')
            memory: '2Gi'
          }
          env: [
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'AZURE_OPENAI_ENDPOINT'
              value: openAi.properties.endpoint
            }
            {
              name: 'AZURE_OPENAI_USE_MANAGED_IDENTITY'
              value: 'true'
            }
            {
              name: 'COSMOS_ENDPOINT'
              value: cosmosAccount.properties.documentEndpoint
            }
            {
              name: 'COSMOS_DATABASE'
              value: 'powerhoof'
            }
            {
              name: 'KEY_VAULT_URL'
              value: keyVault.properties.vaultUri
            }
            {
              name: 'NUSHELL_EXECUTOR_TYPE'
              value: enableDynamicSessions ? 'session' : 'mock'
            }
            {
              name: 'NUSHELL_SESSION_POOL_ENDPOINT'
              value: enableDynamicSessions ? 'https://${sessionPool!.properties.poolManagementEndpoint}' : ''
            }
            {
              name: 'PRIMARY_MODEL'
              value: 'azure-openai/gpt-4o'
            }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 5
        rules: [
          {
            name: 'http-scaling'
            http: {
              metadata: {
                concurrentRequests: '10'
              }
            }
          }
        ]
      }
    }
  }
}

// ============================================
// Role Assignments (Managed Identity)
// ============================================

// Azure OpenAI Cognitive Services User
resource openAiRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: openAi
  name: guid(openAi.id, containerApp.id, 'Cognitive Services OpenAI User')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd')
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Cosmos DB Data Contributor
resource cosmosRoleAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = {
  parent: cosmosAccount
  name: guid(cosmosAccount.id, containerApp.id, 'Cosmos DB Built-in Data Contributor')
  properties: {
    roleDefinitionId: '${cosmosAccount.id}/sqlRoleDefinitions/00000000-0000-0000-0000-000000000002'
    principalId: containerApp.identity.principalId
    scope: cosmosAccount.id
  }
}

// Key Vault Secrets User
resource keyVaultRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: keyVault
  name: guid(keyVault.id, containerApp.id, 'Key Vault Secrets User')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Container Registry AcrPull
resource acrPullRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: containerRegistry
  name: guid(containerRegistry.id, containerApp.id, 'AcrPull')
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: containerApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// ============================================
// Outputs
// ============================================

output containerAppFqdn string = containerApp.properties.configuration.ingress.fqdn
output containerAppUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
output containerRegistryLoginServer string = containerRegistry.properties.loginServer
output openAiEndpoint string = openAi.properties.endpoint
output cosmosEndpoint string = cosmosAccount.properties.documentEndpoint
output keyVaultUri string = keyVault.properties.vaultUri
output sessionPoolEndpoint string = enableDynamicSessions ? sessionPool!.properties.poolManagementEndpoint : ''
