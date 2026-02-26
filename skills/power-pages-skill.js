/**
 * Power Pages Skill
 * Portal authoring, Liquid templates, and web API patterns.
 */

export const skill = {
  manifest: {
    id: "power-pages-skill",
    name: "PowerPages",
    description: "Power Pages assistant - Liquid templates, portals, Web API",
    version: "1.0.0",
    author: "PowerHoof",
    permissions: ["read-context"],
    examples: [
      "/powerpages liquid if condition",
      "/portal entity list",
      "/liquid fetch records"
    ],
    tags: ["power-pages", "portal", "liquid", "web-api"]
  },

  knowledge: {
    liquid: {
      objects: ['{{ page.title }}', '{{ user.fullname }}', '{{ request.params.id }}', '{{ now }}', '{{ sitemarkers.home.url }}'],
      tags: {
        control: ['{% if %}', '{% elsif %}', '{% else %}', '{% endif %}', '{% case %}', '{% when %}'],
        iteration: ['{% for item in collection %}', '{% endfor %}', '{% break %}', '{% continue %}'],
        variable: ['{% assign var = value %}', '{% capture %}', '{% increment %}'],
        fetchxml: `{% fetchxml contacts %}
<fetch>
  <entity name="contact">
    <attribute name="fullname" />
    <filter><condition attribute="statecode" operator="eq" value="0" /></filter>
  </entity>
</fetch>
{% endfetchxml %}
{% for contact in contacts.results.entities %}
  {{ contact.fullname }}
{% endfor %}`
      },
      filters: ['| escape', '| date: "format"', '| append: "text"', '| downcase', '| upcase', '| size', '| first', '| last']
    },
    webApi: {
      endpoints: '/api/data/v9.2/{entityname}',
      auth: 'Bearer token from portal session',
      example: `webapi.safeAjax({
  type: "GET",
  url: "/_api/contacts?$select=fullname,emailaddress1",
  success: function(data) { console.log(data.value); }
});`
    },
    entityLists: {
      attributes: ['view', 'entity-form', 'create-enabled', 'detail-page', 'filter-enabled'],
      example: '{% include "entity_list" key: "active-contacts" %}'
    }
  },

  async canHandle(context) {
    const content = context.message.content?.toLowerCase() || "";
    return ['/powerpages', '/portal', '/liquid', 'power pages', 'liquid template'].some(t => content.includes(t));
  },

  async execute(context) {
    const content = context.message.content.toLowerCase();
    
    if (content.includes('fetchxml') || content.includes('fetch records')) {
      return { success: true, content: `**Liquid FetchXML:**\n\`\`\`liquid\n${this.knowledge.liquid.tags.fetchxml}\n\`\`\`` };
    }
    
    if (content.includes('web api') || content.includes('webapi') || content.includes('ajax')) {
      return { success: true, content: `**Web API Call:**\n\`\`\`javascript\n${this.knowledge.webApi.example}\n\`\`\`` };
    }
    
    if (content.includes('entity list')) {
      return {
        success: true,
        content: `**Entity List:**\n\`\`\`liquid\n${this.knowledge.entityLists.example}\n\`\`\`\n\n**Attributes:** ${this.knowledge.entityLists.attributes.join(', ')}`
      };
    }
    
    if (content.includes('if') || content.includes('condition')) {
      return {
        success: true,
        content: `**Liquid Conditionals:**\n\`\`\`liquid\n{% if user %}\n  Hello {{ user.fullname }}\n{% else %}\n  Please sign in\n{% endif %}\n\`\`\`\n\n**Control Tags:** ${this.knowledge.liquid.tags.control.join(', ')}`
      };
    }
    
    return {
      success: true,
      content: `**Power Pages Assistant**\n\n**Liquid Objects:** ${this.knowledge.liquid.objects.join(', ')}\n**Filters:** ${this.knowledge.liquid.filters.join(', ')}\n\nTry: "/portal fetchxml" or "/liquid if condition"`
    };
  }
};
