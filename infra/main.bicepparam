/*
  Main parameter file for PowerHoof deployment
*/

using './main.bicep'

param environmentName = readEnvironmentVariable('AZURE_ENV_NAME', 'dev')
param location = readEnvironmentVariable('AZURE_LOCATION', 'eastus2')
param enableDynamicSessions = true

param openAiModels = [
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
