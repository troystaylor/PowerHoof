/**
 * Dataverse Skill
 * Query and manipulate Dataverse data with Web API, FetchXML, and OData.
 */

export const skill = {
  manifest: {
    id: "dataverse-skill",
    name: "Dataverse",
    description: "Dataverse assistant - Web API, FetchXML, OData queries",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/dataverse fetchxml example",
      "/dv odata query",
      "/dataverse create record"
    ],
    tags: ["dataverse", "cds", "fetchxml", "odata", "web-api"]
  },

  knowledge: {
    webApi: {
      base: '/api/data/v9.2',
      query: '$select=col1,col2&$filter=statecode eq 0&$orderby=name&$top=50',
      expand: '$expand=primarycontactid($select=fullname)'
    },
    fetchXml: {
      basic: `<fetch top="50">
  <entity name="contact">
    <attribute name="fullname" />
    <attribute name="emailaddress1" />
    <filter><condition attribute="statecode" operator="eq" value="0" /></filter>
    <order attribute="fullname" />
  </entity>
</fetch>`,
      aggregate: `<fetch aggregate="true">
  <entity name="opportunity">
    <attribute name="estimatedvalue" alias="total" aggregate="sum" />
    <attribute name="ownerid" groupby="true" alias="owner" />
  </entity>
</fetch>`
    },
    operators: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'like', 'not-like', 'in', 'not-in', 'null', 'not-null'],
    tables: { account: 'accounts', contact: 'contacts', lead: 'leads', opportunity: 'opportunities', incident: 'incidents' }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    return ['/dataverse', '/dv', '/cds', '/fetchxml', 'dataverse', 'fetchxml'].some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content.toLowerCase();
    
    if (content.includes('fetchxml') || content.includes('fetch xml')) {
      if (content.includes('aggregate') || content.includes('sum')) {
        return { success: true, content: `**FetchXML Aggregation:**\n\`\`\`xml\n${this.knowledge.fetchXml.aggregate}\n\`\`\`` };
      }
      return { success: true, content: `**FetchXML Query:**\n\`\`\`xml\n${this.knowledge.fetchXml.basic}\n\`\`\`\n\n**Operators:** ${this.knowledge.operators.join(', ')}` };
    }
    
    if (content.includes('odata') || content.includes('$') || content.includes('webapi') || content.includes('web api')) {
      return {
        success: true,
        content: `**Web API / OData Query:**\n\`\`\`\nGET ${this.knowledge.webApi.base}/contacts?${this.knowledge.webApi.query}\n\`\`\`\n\n**Expand Related:**\n\`\`\`\n${this.knowledge.webApi.expand}\n\`\`\``
      };
    }
    
    if (content.includes('create')) {
      return {
        success: true,
        content: `**Create Record:**\n\`\`\`javascript\nfetch(url + '/accounts', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json', 'OData-Version': '4.0' },\n  body: JSON.stringify({ name: 'Contoso', 'primarycontactid@odata.bind': '/contacts(guid)' })\n});\n\`\`\``
      };
    }
    
    return {
      success: true,
      content: `**Dataverse Assistant**\n\n**Common Tables:** ${Object.entries(this.knowledge.tables).map(([k,v]) => `${k} → ${v}`).join(', ')}\n\n**Operators:** ${this.knowledge.operators.slice(0,6).join(', ')}\n\nTry: "/dataverse fetchxml" or "/dv odata query"`
    };
  }
};
