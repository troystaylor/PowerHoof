/**
 * Azure DevOps Skill
 * Pipelines, repos, work items, and boards assistance.
 */

export const skill = {
  manifest: {
    id: "azure-devops-skill",
    name: "AzureDevOps",
    description: "Azure DevOps assistant - Pipelines, repos, work items, boards",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/devops pipeline yaml",
      "/ado work item query",
      "/pipeline trigger on PR"
    ],
    tags: ["azure-devops", "pipelines", "git", "work-items", "ci-cd"]
  },

  knowledge: {
    pipelines: {
      yaml: `trigger:
  - main
pool:
  vmImage: 'ubuntu-latest'
stages:
  - stage: Build
    jobs:
      - job: BuildJob
        steps:
          - task: NodeTool@0
            inputs: { versionSpec: '18.x' }
          - script: npm ci && npm run build`,
      triggers: ['trigger: [main]', 'pr: [main, develop]', 'schedules: - cron: "0 0 * * *"'],
      variables: ['$(Build.SourceBranch)', '$(System.TeamProject)', '$(Build.BuildId)']
    },
    workItems: {
      wiql: `SELECT [System.Id], [System.Title], [System.State]
FROM WorkItems
WHERE [System.TeamProject] = @project
  AND [System.WorkItemType] = 'Bug'
  AND [System.State] <> 'Closed'
ORDER BY [System.CreatedDate] DESC`,
      types: ['Epic', 'Feature', 'User Story', 'Bug', 'Task']
    },
    git: {
      policies: ['Require PR reviewers', 'Build validation', 'Comment resolution', 'Work item linking']
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    return ['/devops', '/ado', '/pipeline', 'azure devops', 'yaml pipeline'].some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content.toLowerCase();
    
    if (content.includes('pipeline') || content.includes('yaml') || content.includes('ci')) {
      return {
        success: true,
        content: `**YAML Pipeline:**\n\`\`\`yaml\n${this.knowledge.pipelines.yaml}\n\`\`\`\n\n**Variables:** ${this.knowledge.pipelines.variables.join(', ')}`
      };
    }
    
    if (content.includes('work item') || content.includes('wiql') || content.includes('query')) {
      return {
        success: true,
        content: `**Work Item Query (WIQL):**\n\`\`\`sql\n${this.knowledge.workItems.wiql}\n\`\`\`\n\n**Types:** ${this.knowledge.workItems.types.join(', ')}`
      };
    }
    
    if (content.includes('branch') || content.includes('policy') || content.includes('pr')) {
      return {
        success: true,
        content: `**Branch Policies:**\n${this.knowledge.git.policies.map(p => `- ${p}`).join('\n')}\n\n**Triggers:**\n${this.knowledge.pipelines.triggers.map(t => `- \`${t}\``).join('\n')}`
      };
    }
    
    return {
      success: true,
      content: `**Azure DevOps Assistant**\n\n- Pipeline YAML syntax\n- Work item queries (WIQL)\n- Branch policies & PR triggers\n\nTry: "/devops pipeline yaml" or "/ado work item query"`
    };
  }
};
